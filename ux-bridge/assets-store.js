import crypto from "node:crypto";
import { del, get, put } from "@vercel/blob";
import { getAuthenticatedUser, readJsonBody, sendJson } from "./auth-store.js";
import { getBlobConfig, isBlobConfigured } from "./db/config.js";
import { deleteAssetRecord, listAssetRecords, readAssetRecord, writeAssetRecord } from "./db/assets.js";
import { captureOperationalEvent } from "./db/observability.js";
import { userHasPermission } from "./permissions-store.js";
import { getProjectStructureById, projectHasPage, userCanAccessProject } from "./projects-store.js";

const MAX_SERVER_UPLOAD_BYTES = 4 * 1024 * 1024;
const ASSET_KIND_IMAGE = "image";
const ASSET_KIND_VIDEO = "video";
const ASSET_KIND_PDF = "pdf";
const ASSET_KIND_FILE = "file";

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
