import crypto from "node:crypto";
import { del, get, put } from "@vercel/blob";
import { handleUpload } from "@vercel/blob/client";
import { getAuthenticatedUser, readJsonBody, sendJson } from "./auth-store.js";
import { getBlobConfig, isBlobConfigured } from "./db/config.js";
import { deleteAssetRecord, listAssetRecords, readAssetRecord, writeAssetRecord } from "./db/assets.js";
import { captureOperationalEvent } from "./db/observability.js";
import { userHasPermission } from "./permissions-store.js";
import { getProjectStructureById, projectHasPage, userCanAccessProject } from "./projects-store.js";

const MAX_SERVER_UPLOAD_BYTES = 4 * 1024 * 1024;
const MAX_DIRECT_UPLOAD_BYTES = 10 * 1024 * 1024;
const ASSET_KIND_IMAGE = "image";
const ASSET_KIND_VIDEO = "video";
const ASSET_KIND_PDF = "pdf";
const ASSET_KIND_FILE = "file";
const CLIENT_UPLOAD_EVENT_GENERATE_TOKEN = "blob.generate-client-token";
const CLIENT_UPLOAD_EVENT_COMPLETED = "blob.upload-completed";

function sanitizeFileName(value = "") {
  const input = String(value || "").trim();
  const collapsed = input.replace(/\s+/g, " ");
  const safe = collapsed.replace(/[^a-zA-Z0-9._ -]/g, "").trim();
  return safe || `upload-${crypto.randomUUID().slice(0, 8)}`;
}

function normalizeContentType(value = "") {
  const input = String(value || "").trim().toLowerCase();
  return input || "application/octet-stream";
}

function inferAssetKind(contentType = "", fileName = "") {
  const normalizedContentType = normalizeContentType(contentType);
  const lowerFileName = String(fileName || "").trim().toLowerCase();

  if (normalizedContentType.startsWith("image/")) {
    return ASSET_KIND_IMAGE;
  }

  if (normalizedContentType.startsWith("video/")) {
    return ASSET_KIND_VIDEO;
  }

  if (normalizedContentType === "application/pdf" || lowerFileName.endsWith(".pdf")) {
    return ASSET_KIND_PDF;
  }

  return ASSET_KIND_FILE;
}

function decodeAssetBody(dataBase64 = "") {
  const normalized = String(dataBase64 || "").trim();

  if (!normalized) {
    throw new Error("Choose a file to upload.");
  }

  const buffer = Buffer.from(normalized, "base64");

  if (!buffer.length) {
    throw new Error("Choose a valid file.");
  }

  if (buffer.byteLength > MAX_SERVER_UPLOAD_BYTES) {
    throw new Error("Files larger than 4 MB need the later direct-upload pass.");
  }

  return buffer;
}

function buildBlobPathname(projectId, pageId, fileName) {
  const safeFileName = sanitizeFileName(fileName);
  const stamp = Date.now();
  const token = crypto.randomUUID().slice(0, 8);
  return `projects/${projectId}/pages/${pageId}/${stamp}-${token}-${safeFileName}`;
}

function parseClientUploadPayload(clientPayload = "") {
  if (!clientPayload) {
    return {};
  }

  try {
    const parsed = JSON.parse(String(clientPayload || ""));
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function normalizeClientUploadMaxBytes(value, contentType = "") {
  const requested = Math.max(0, Number(value) || 0);
  const lowerContentType = normalizeContentType(contentType);
  const defaultMax = lowerContentType.startsWith("video/") ? MAX_DIRECT_UPLOAD_BYTES : MAX_DIRECT_UPLOAD_BYTES;
  return Math.max(1, Math.min(requested || defaultMax, MAX_DIRECT_UPLOAD_BYTES));
}

function allowedClientUploadContentTypes(contentType = "") {
  const normalized = normalizeContentType(contentType);

  if (normalized && normalized !== "application/octet-stream") {
    return [normalized];
  }

  return [
    "image/webp",
    "image/avif",
    "image/jpeg",
    "image/png",
    "image/svg+xml",
    "video/mp4",
    "application/pdf",
    "application/octet-stream",
  ];
}

async function handleClientUploadRequest({ req, user, body }) {
  if (!isBlobConfigured()) {
    throw new Error("Blob storage is not configured.");
  }

  const result = await handleUpload({
    request: req,
    body,
    token: getBlobConfig().token || process.env.BLOB_READ_WRITE_TOKEN,
    onBeforeGenerateToken: async (pathname, clientPayload) => {
      const payload = parseClientUploadPayload(clientPayload);
      const projectId = String(payload.project || "").trim();
      const pageId = String(payload.page || "").trim();
      const contentType = normalizeContentType(payload.contentType);
      const expectedPrefix = projectId && pageId ? `projects/${projectId}/pages/${pageId}/` : "";

      if (!projectId || !pageId || !expectedPrefix || !String(pathname || "").startsWith(expectedPrefix)) {
        throw new Error("Choose a valid upload target.");
      }

      if (!(await userCanAccessProject(user, projectId))) {
        throw new Error("You do not have access to this project.");
      }

      if (!projectHasPage(projectId, pageId)) {
        throw new Error("Page not found.");
      }

      return {
        addRandomSuffix: false,
        allowOverwrite: false,
        allowedContentTypes: allowedClientUploadContentTypes(contentType),
        maximumSizeInBytes: normalizeClientUploadMaxBytes(payload.maxSizeInBytes, contentType),
        tokenPayload: JSON.stringify({
          project: projectId,
          page: pageId,
          fileName: sanitizeFileName(payload.fileName),
          contentType,
          commentId: String(payload.commentId || "").trim(),
          scope: String(payload.scope || "").trim(),
          layerPath: String(payload.layerPath || "").trim(),
          backgroundMode: String(payload.backgroundMode || "").trim().toLowerCase(),
        }),
      };
    },
  });

  return {
    status: 200,
    payload: result,
  };
}

function sanitizeAssetRecord(asset) {
  if (!asset || typeof asset !== "object") {
    return null;
  }

  return {
    id: String(asset.id || ""),
    projectId: String(asset.projectId || ""),
    pageId: String(asset.pageId || ""),
    commentId: String(asset.commentId || ""),
    uploadedBy: String(asset.uploadedBy || ""),
    fileName: String(asset.fileName || ""),
    kind: String(asset.kind || ASSET_KIND_FILE),
    contentType: String(asset.contentType || "application/octet-stream"),
    sizeBytes: Number(asset.sizeBytes) || 0,
    blobPathname: String(asset.blobPathname || ""),
    blobUrl: String(asset.blobUrl || ""),
    downloadUrl: String(asset.downloadUrl || ""),
    createdAt: Number(asset.createdAt) || 0,
    updatedAt: Number(asset.updatedAt) || 0,
  };
}

async function uploadPrivateAsset({ projectId, pageId, uploadedBy, fileName, contentType, dataBase64, commentId = "" }) {
  if (!isBlobConfigured()) {
    throw new Error("Blob storage is not configured.");
  }

  const normalizedProjectId = String(projectId || "").trim();
  const normalizedPageId = String(pageId || "").trim();
  const normalizedUploadedBy = String(uploadedBy || "").trim().toLowerCase();
  const normalizedFileName = sanitizeFileName(fileName);
  const normalizedContentType = normalizeContentType(contentType);

  if (!normalizedProjectId || !normalizedPageId || !normalizedUploadedBy) {
    throw new Error("Choose a valid upload target.");
  }

  const body = decodeAssetBody(dataBase64);
  const pathname = buildBlobPathname(normalizedProjectId, normalizedPageId, normalizedFileName);
  const blob = await put(pathname, body, {
    access: "private",
    token: getBlobConfig().token || process.env.BLOB_READ_WRITE_TOKEN,
    addRandomSuffix: false,
    contentType: normalizedContentType,
  });
  const now = Date.now();
  const asset = {
    id: crypto.randomUUID(),
    projectId: normalizedProjectId,
    pageId: normalizedPageId,
    commentId: String(commentId || "").trim(),
    uploadedBy: normalizedUploadedBy,
    fileName: normalizedFileName,
    kind: inferAssetKind(normalizedContentType, normalizedFileName),
    contentType: normalizedContentType,
    sizeBytes: body.byteLength,
    blobPathname: String(blob.pathname || pathname),
    blobUrl: String(blob.url || ""),
    downloadUrl: String(blob.downloadUrl || ""),
    createdAt: now,
    updatedAt: now,
  };

  await writeAssetRecord(asset);
  return sanitizeAssetRecord(asset);
}

async function finalizeDirectUploadedAsset({
  projectId,
  pageId,
  uploadedBy,
  fileName,
  contentType,
  pathname,
  url,
  downloadUrl,
  sizeBytes,
  commentId = "",
}) {
  const normalizedProjectId = String(projectId || "").trim();
  const normalizedPageId = String(pageId || "").trim();
  const normalizedUploadedBy = String(uploadedBy || "").trim().toLowerCase();
  const normalizedFileName = sanitizeFileName(fileName);
  const normalizedContentType = normalizeContentType(contentType);
  const normalizedPathname = String(pathname || "").trim();
  const expectedPrefix = normalizedProjectId && normalizedPageId ? `projects/${normalizedProjectId}/pages/${normalizedPageId}/` : "";

  if (!normalizedProjectId || !normalizedPageId || !normalizedUploadedBy || !normalizedPathname || !String(normalizedPathname).startsWith(expectedPrefix)) {
    throw new Error("Choose a valid upload target.");
  }

  const asset = {
    id: crypto.randomUUID(),
    projectId: normalizedProjectId,
    pageId: normalizedPageId,
    commentId: String(commentId || "").trim(),
    uploadedBy: normalizedUploadedBy,
    fileName: normalizedFileName,
    kind: inferAssetKind(normalizedContentType, normalizedFileName),
    contentType: normalizedContentType,
    sizeBytes: Math.max(0, Number(sizeBytes) || 0),
    blobPathname: normalizedPathname,
    blobUrl: String(url || "").trim(),
    downloadUrl: String(downloadUrl || "").trim(),
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  await writeAssetRecord(asset);
  return sanitizeAssetRecord(asset);
}

async function deletePrivateAsset(asset) {
  if (!asset?.blobUrl) {
    return;
  }

  if (!isBlobConfigured()) {
    return;
  }

  await del(asset.blobUrl, {
    token: getBlobConfig().token || process.env.BLOB_READ_WRITE_TOKEN,
  });
}

async function loadPrivateAsset(asset) {
  if (!isBlobConfigured()) {
    throw new Error("Blob storage is not configured.");
  }

  const source = String(asset?.blobPathname || asset?.blobUrl || "").trim();

  if (!source) {
    throw new Error("Asset source is missing.");
  }

  return get(source, {
    access: "private",
    token: getBlobConfig().token || process.env.BLOB_READ_WRITE_TOKEN,
    useCache: true,
  });
}

export async function handleAssetContentRequest(req) {
  const user = await getAuthenticatedUser(req);

  if (!user) {
    return {
      status: 401,
      payload: { ok: false, error: "Unauthorized." },
    };
  }

  const requestUrl = new URL(req.url || "/", `http://${req.headers.host || "127.0.0.1"}`);
  const assetId = String(requestUrl.searchParams.get("assetId") || "").trim();
  const asDownload = requestUrl.searchParams.get("download") === "1";

  if (!assetId) {
    return {
      status: 400,
      payload: { ok: false, error: "Choose a valid asset." },
    };
  }

  const asset = await readAssetRecord(assetId);

  if (!asset) {
    return {
      status: 404,
      payload: { ok: false, error: "Asset not found." },
    };
  }

  if (!(await userCanAccessProject(user, asset.projectId))) {
    return {
      status: 403,
      payload: { ok: false, error: "You do not have access to this asset." },
    };
  }

  const blobResult = await loadPrivateAsset(asset);

  if (!blobResult || blobResult.statusCode !== 200 || !blobResult.stream) {
    return {
      status: 404,
      payload: { ok: false, error: "Asset contents are unavailable." },
    };
  }

  return {
    status: 200,
    assetStream: blobResult.stream,
    assetHeaders: {
      "Content-Type": blobResult.blob.contentType || asset.contentType || "application/octet-stream",
      "Content-Disposition": `${asDownload ? "attachment" : "inline"}; filename="${String(asset.fileName || "asset").replaceAll('"', "")}"`,
      "Cache-Control": "private, max-age=60",
    },
  };
}

export async function handleAssetsRequest(req) {
  const user = await getAuthenticatedUser(req);

  if (!user) {
    return {
      status: 401,
      payload: {
        ok: false,
        error: "Unauthorized.",
      },
    };
  }

  if (req.method === "GET") {
    const requestUrl = new URL(req.url || "/", `http://${req.headers.host || "127.0.0.1"}`);
    const projectId = String(requestUrl.searchParams.get("project") || "").trim();
    const pageId = String(requestUrl.searchParams.get("page") || "").trim();
    const commentId = String(requestUrl.searchParams.get("commentId") || "").trim();

    if (!projectId) {
      return {
        status: 400,
        payload: {
          ok: false,
          error: "Choose a valid project.",
        },
      };
    }

    if (!(await userCanAccessProject(user, projectId))) {
      return {
        status: 403,
        payload: {
          ok: false,
          error: "You do not have access to this project.",
        },
      };
    }

    const project = await getProjectStructureById(projectId);

    if (!project) {
      return {
        status: 404,
        payload: {
          ok: false,
          error: "Project not found.",
        },
      };
    }

    if (pageId && !projectHasPage(projectId, pageId)) {
      return {
        status: 404,
        payload: {
          ok: false,
          error: "Page not found.",
        },
      };
    }

    const assets = await listAssetRecords({ projectId, pageId, commentId });
    return {
      status: 200,
      payload: {
        ok: true,
        assets: assets.map((asset) => sanitizeAssetRecord(asset)).filter(Boolean),
      },
    };
  }

  if (req.method !== "POST") {
    return {
      status: 405,
      payload: {
        ok: false,
        error: "Method not allowed.",
      },
    };
  }

  const payload = await readJsonBody(req);

  if (payload?.type === CLIENT_UPLOAD_EVENT_GENERATE_TOKEN || payload?.type === CLIENT_UPLOAD_EVENT_COMPLETED) {
    try {
      return await handleClientUploadRequest({
        req,
        user,
        body: payload,
      });
    } catch (error) {
      return {
        status: 400,
        payload: {
          ok: false,
          error: error instanceof Error ? error.message : "Unable to prepare upload.",
        },
      };
    }
  }

  const action = String(payload?.action || "").trim();

  if (action === "uploadAsset") {
    const projectId = String(payload.project || "").trim();
    const pageId = String(payload.page || "").trim();

    if (!projectId || !pageId) {
      return {
        status: 400,
        payload: {
          ok: false,
          error: "Choose a valid upload target.",
        },
      };
    }

    if (!(await userCanAccessProject(user, projectId))) {
      return {
        status: 403,
        payload: {
          ok: false,
          error: "You do not have access to this project.",
        },
      };
    }

    if (!projectHasPage(projectId, pageId)) {
      return {
        status: 404,
        payload: {
          ok: false,
          error: "Page not found.",
        },
      };
    }

    try {
      const asset = await uploadPrivateAsset({
        projectId,
        pageId,
        uploadedBy: user.email,
        fileName: payload.fileName,
        contentType: payload.contentType,
        dataBase64: payload.dataBase64,
        commentId: payload.commentId,
      });

      await captureOperationalEvent({
        name: "asset.uploaded",
        level: "info",
        context: {
          projectId,
          pageId,
          assetId: asset.id,
          contentType: asset.contentType,
          sizeBytes: asset.sizeBytes,
        },
      });

      return {
        status: 200,
        payload: {
          ok: true,
          asset,
        },
      };
    } catch (error) {
      return {
        status: 400,
        payload: {
          ok: false,
          error: error instanceof Error ? error.message : "Unable to upload asset.",
        },
      };
    }
  }

  if (action === "finalizeUploadedAsset") {
    const projectId = String(payload.project || "").trim();
    const pageId = String(payload.page || "").trim();

    if (!projectId || !pageId) {
      return {
        status: 400,
        payload: {
          ok: false,
          error: "Choose a valid upload target.",
        },
      };
    }

    if (!(await userCanAccessProject(user, projectId))) {
      return {
        status: 403,
        payload: {
          ok: false,
          error: "You do not have access to this project.",
        },
      };
    }

    if (!projectHasPage(projectId, pageId)) {
      return {
        status: 404,
        payload: {
          ok: false,
          error: "Page not found.",
        },
      };
    }

    try {
      const asset = await finalizeDirectUploadedAsset({
        projectId,
        pageId,
        uploadedBy: user.email,
        fileName: payload.fileName,
        contentType: payload.contentType,
        pathname: payload.pathname,
        url: payload.url,
        downloadUrl: payload.downloadUrl,
        sizeBytes: payload.sizeBytes,
        commentId: payload.commentId,
      });

      await captureOperationalEvent({
        name: "asset.uploaded",
        level: "info",
        context: {
          projectId,
          pageId,
          assetId: asset.id,
          contentType: asset.contentType,
          sizeBytes: asset.sizeBytes,
          uploadMode: "direct",
        },
      });

      return {
        status: 200,
        payload: {
          ok: true,
          asset,
        },
      };
    } catch (error) {
      return {
        status: 400,
        payload: {
          ok: false,
          error: error instanceof Error ? error.message : "Unable to finalize upload.",
        },
      };
    }
  }

  if (action === "deleteAsset") {
    const assetId = String(payload.assetId || "").trim();

    if (!assetId) {
      return {
        status: 400,
        payload: {
          ok: false,
          error: "Choose a valid asset.",
        },
      };
    }

    const asset = await readAssetRecord(assetId);

    if (!asset) {
      return {
        status: 404,
        payload: {
          ok: false,
          error: "Asset not found.",
        },
      };
    }

    if (!(await userCanAccessProject(user, asset.projectId))) {
      return {
        status: 403,
        payload: {
          ok: false,
          error: "You do not have access to this project.",
        },
      };
    }

    const isOwner = String(asset.uploadedBy || "").trim().toLowerCase() === String(user.email || "").trim().toLowerCase();
    const canDeleteAnyAsset = await userHasPermission(user, "assets.delete_any");

    if (!isOwner && !canDeleteAnyAsset) {
      return {
        status: 403,
        payload: {
          ok: false,
          error: "You do not have permission to delete this asset.",
        },
      };
    }

    await deletePrivateAsset(asset);
    await deleteAssetRecord(assetId);

    return {
      status: 200,
      payload: {
        ok: true,
      },
    };
  }

  return {
    status: 400,
    payload: {
      ok: false,
      error: "Unknown action.",
    },
  };
}

export { sendJson };
