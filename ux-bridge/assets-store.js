import crypto from "node:crypto";
import { del, get, put } from "@vercel/blob";
import { handleUpload } from "@vercel/blob/client";
import { getAuthenticatedUser, readJsonBody, sendJson } from "./auth-store.js";
import { removeAssetReferencesFromProjectComments } from "./comments-store.js";
import { getBlobConfig, isBlobConfigured } from "./db/config.js";
import { deleteAssetRecord, listAssetRecords, readAssetRecord, writeAssetRecord } from "./db/assets.js";
import { captureOperationalEvent } from "./db/observability.js";
import { userHasPermission } from "./permissions-store.js";
import { getProjectStructureById, projectHasPage, removeAssetReferencesFromProjectPages, userCanAccessProject } from "./projects-store.js";

const MAX_SERVER_UPLOAD_BYTES = 4 * 1024 * 1024;
const MAX_CLIENT_UPLOAD_BYTES = 250 * 1024 * 1024;
const MAX_IMAGE_UPLOAD_BYTES = 10 * 1024 * 1024;
const MAX_VIDEO_UPLOAD_BYTES = 10 * 1024 * 1024;
const ASSET_KIND_IMAGE = "image";
const ASSET_KIND_VIDEO = "video";
const ASSET_KIND_PDF = "pdf";
const ASSET_KIND_FILE = "file";
const ASSET_SCOPE_LAYER_BACKGROUND = "layer-background";

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

function buildBlobPathPrefix(projectId, pageId) {
  return `projects/${projectId}/pages/${pageId}/`;
}

function parseClientUploadPayload(value) {
  if (!value) {
    return {};
  }

  try {
    const parsed = JSON.parse(String(value));
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function isMp4AssetInput(contentType = "", fileName = "") {
  const normalizedContentType = normalizeContentType(contentType);
  const lowerFileName = String(fileName || "").trim().toLowerCase();
  return normalizedContentType === "video/mp4" || lowerFileName.endsWith(".mp4");
}

function isAllowedBackgroundImageAssetInput(contentType = "", fileName = "") {
  const normalizedContentType = normalizeContentType(contentType);
  const lowerFileName = String(fileName || "").trim().toLowerCase();
  return (
    normalizedContentType === "image/webp" ||
    normalizedContentType === "image/avif" ||
    normalizedContentType === "image/jpeg" ||
    normalizedContentType === "image/png" ||
    normalizedContentType === "image/svg+xml" ||
    lowerFileName.endsWith(".webp") ||
    lowerFileName.endsWith(".avif") ||
    lowerFileName.endsWith(".jpg") ||
    lowerFileName.endsWith(".jpeg") ||
    lowerFileName.endsWith(".png") ||
    lowerFileName.endsWith(".svg")
  );
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
    scope: String(asset.scope || ""),
    layerPath: String(asset.layerPath || ""),
    backgroundMode: String(asset.backgroundMode || ""),
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

function extractBackgroundAssetIdsFromHtml(html = "") {
  const input = String(html || "");

  if (!input) {
    return new Set();
  }

  const decoded = input
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
  const assetIds = new Set();
  const patterns = [
    /data-ux-background-config=(["'])([\s\S]*?)\1/gi,
    /data-ux-background-media-memory=(["'])([\s\S]*?)\1/gi,
  ];

  for (const source of [input, decoded]) {
    for (const pattern of patterns) {
      let match = pattern.exec(source);
      while (match) {
        try {
          const parsed = JSON.parse(String(match[2] || ""));
          const candidates = parsed && typeof parsed === "object" ? parsed : {};
          const values = Array.isArray(candidates)
            ? candidates
            : [candidates, candidates.image, candidates.video].filter(Boolean);

          for (const value of values) {
            const assetId = String(value?.assetId || "").trim();
            if (assetId) {
              assetIds.add(assetId);
            }
          }
        } catch {
          // Ignore malformed background config fragments.
        }
        match = pattern.exec(source);
      }
      pattern.lastIndex = 0;
    }
  }

  return assetIds;
}

function collectProjectBackgroundAssetIds(project) {
  const assetIds = new Set();
  const pages = Array.isArray(project?.pages) ? project.pages : [];

  const collectFromDraft = (draft) => {
    const html = String(draft?.html || "").trim();
    if (!html) {
      return;
    }
    extractBackgroundAssetIdsFromHtml(html).forEach((assetId) => assetIds.add(assetId));
  };

  for (const page of pages) {
    const previewHtml = String(page?.preview?.html || "").trim();
    if (previewHtml) {
      extractBackgroundAssetIdsFromHtml(previewHtml).forEach((assetId) => assetIds.add(assetId));
    }

    collectFromDraft(page?.vibe?.appliedDraft);
    collectFromDraft(page?.vibe?.lastDraft);

    const draftHistory = Array.isArray(page?.vibe?.draftHistory) ? page.vibe.draftHistory : [];
    draftHistory.forEach((draft) => collectFromDraft(draft));
  }

  return assetIds;
}

async function uploadPrivateAsset({
  projectId,
  pageId,
  uploadedBy,
  fileName,
  contentType,
  dataBase64,
  commentId = "",
  scope = "",
  layerPath = "",
  backgroundMode = "",
}) {
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
    scope: String(scope || "").trim(),
    layerPath: String(layerPath || "").trim(),
    backgroundMode: String(backgroundMode || "").trim().toLowerCase(),
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

async function finalizeUploadedBlobAsset({
  projectId,
  pageId,
  uploadedBy,
  fileName,
  contentType,
  pathname,
  blobUrl,
  downloadUrl,
  sizeBytes,
  commentId = "",
  scope = "",
  layerPath = "",
  backgroundMode = "",
}) {
  if (!isBlobConfigured()) {
    throw new Error("Blob storage is not configured.");
  }

  const normalizedProjectId = String(projectId || "").trim();
  const normalizedPageId = String(pageId || "").trim();
  const normalizedUploadedBy = String(uploadedBy || "").trim().toLowerCase();
  const normalizedFileName = sanitizeFileName(fileName);
  const normalizedContentType = normalizeContentType(contentType);
  const normalizedPathname = String(pathname || "").trim();
  const normalizedBlobUrl = String(blobUrl || "").trim();
  const normalizedDownloadUrl = String(downloadUrl || "").trim();
  const normalizedSizeBytes = Math.max(0, Number(sizeBytes) || 0);

  if (!normalizedProjectId || !normalizedPageId || !normalizedUploadedBy) {
    throw new Error("Choose a valid upload target.");
  }

  if (!normalizedPathname || !normalizedBlobUrl) {
    throw new Error("Uploaded blob details are incomplete.");
  }

  if (!normalizedPathname.startsWith(buildBlobPathPrefix(normalizedProjectId, normalizedPageId))) {
    throw new Error("Uploaded blob path is invalid for this page.");
  }

  const now = Date.now();
  const asset = {
    id: crypto.randomUUID(),
    projectId: normalizedProjectId,
    pageId: normalizedPageId,
    commentId: String(commentId || "").trim(),
    scope: String(scope || "").trim(),
    layerPath: String(layerPath || "").trim(),
    backgroundMode: String(backgroundMode || "").trim().toLowerCase(),
    uploadedBy: normalizedUploadedBy,
    fileName: normalizedFileName,
    kind: inferAssetKind(normalizedContentType, normalizedFileName),
    contentType: normalizedContentType,
    sizeBytes: normalizedSizeBytes,
    blobPathname: normalizedPathname,
    blobUrl: normalizedBlobUrl,
    downloadUrl: normalizedDownloadUrl,
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
    const backgroundAssetIds = !commentId ? collectProjectBackgroundAssetIds(project) : new Set();
    return {
      status: 200,
      payload: {
        ok: true,
        assets: assets
          .map((asset) => sanitizeAssetRecord(asset))
          .filter(Boolean)
          .filter((asset) => String(asset?.scope || "").trim() !== ASSET_SCOPE_LAYER_BACKGROUND)
          .filter((asset) => !(asset && backgroundAssetIds.has(String(asset.id || "").trim()))),
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

  if (payload?.type === "blob.generate-client-token") {
    try {
      const result = await handleUpload({
        token: getBlobConfig().token || process.env.BLOB_READ_WRITE_TOKEN,
        request: req,
        body: payload,
        onBeforeGenerateToken: async (pathname, clientPayload) => {
          const details = parseClientUploadPayload(clientPayload);
          const projectId = String(details.project || "").trim();
          const pageId = String(details.page || "").trim();
          const fileName = String(details.fileName || "").trim();
          const contentType = normalizeContentType(details.contentType);
          const maxSizeInBytes = Number(details.maxSizeInBytes) || 0;
          const scope = String(details.scope || "").trim();

          if (!projectId || !pageId || !fileName) {
            throw new Error("Choose a valid upload target.");
          }

          if (!(await userCanAccessProject(user, projectId))) {
            throw new Error("You do not have access to this project.");
          }

          if (!projectHasPage(projectId, pageId)) {
            throw new Error("Page not found.");
          }

          if (!String(pathname || "").startsWith(buildBlobPathPrefix(projectId, pageId))) {
            throw new Error("Upload path does not match the selected page.");
          }

          if (contentType.startsWith("video/")) {
            if (!isMp4AssetInput(contentType, fileName)) {
              throw new Error("Video backgrounds currently need to be uploaded as .mp4 files.");
            }

            if (maxSizeInBytes > MAX_VIDEO_UPLOAD_BYTES) {
              throw new Error("Video backgrounds currently need to be 10 MB or smaller.");
            }
          }

          if (scope === ASSET_SCOPE_LAYER_BACKGROUND && contentType.startsWith("image/")) {
            if (!isAllowedBackgroundImageAssetInput(contentType, fileName)) {
              throw new Error("Image backgrounds currently need to be uploaded as WebP, AVIF, JPEG, PNG, or SVG files.");
            }

            if (maxSizeInBytes > MAX_IMAGE_UPLOAD_BYTES) {
              throw new Error("Image backgrounds currently need to be 10 MB or smaller.");
            }
          }

          return {
            allowedContentTypes: [contentType],
            maximumSizeInBytes:
              contentType.startsWith("video/")
                ? MAX_VIDEO_UPLOAD_BYTES
                : scope === ASSET_SCOPE_LAYER_BACKGROUND && contentType.startsWith("image/")
                ? MAX_IMAGE_UPLOAD_BYTES
                : MAX_CLIENT_UPLOAD_BYTES,
            addRandomSuffix: false,
            allowOverwrite: false,
          };
        },
      });

      return {
        status: 200,
        payload: {
          clientToken: result.clientToken,
        },
      };
    } catch (error) {
      return {
        status: 400,
        payload: {
          ok: false,
          error: error instanceof Error ? error.message : "Unable to authorize upload.",
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
        scope: payload.scope,
        layerPath: payload.layerPath,
        backgroundMode: payload.backgroundMode,
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
      if (
        String(payload.scope || "").trim() === ASSET_SCOPE_LAYER_BACKGROUND &&
        String(payload.contentType || "").trim().toLowerCase().startsWith("image/")
      ) {
        if (!isAllowedBackgroundImageAssetInput(payload.contentType, payload.fileName)) {
          throw new Error("Image backgrounds currently need to be uploaded as WebP, AVIF, JPEG, PNG, or SVG files.");
        }

        if ((Number(payload.sizeBytes) || 0) > MAX_IMAGE_UPLOAD_BYTES) {
          throw new Error("Image backgrounds currently need to be 10 MB or smaller.");
        }
      }

      if (String(payload.contentType || "").trim().toLowerCase().startsWith("video/")) {
        if (!isMp4AssetInput(payload.contentType, payload.fileName)) {
          throw new Error("Video backgrounds currently need to be uploaded as .mp4 files.");
        }

        if ((Number(payload.sizeBytes) || 0) > MAX_VIDEO_UPLOAD_BYTES) {
          throw new Error("Video backgrounds currently need to be 10 MB or smaller.");
        }
      }

      const asset = await finalizeUploadedBlobAsset({
        projectId,
        pageId,
        uploadedBy: user.email,
        fileName: payload.fileName,
        contentType: payload.contentType,
        pathname: payload.pathname,
        blobUrl: payload.url,
        downloadUrl: payload.downloadUrl,
        sizeBytes: payload.sizeBytes,
        commentId: payload.commentId,
        scope: payload.scope,
        layerPath: payload.layerPath,
        backgroundMode: payload.backgroundMode,
      });

      await captureOperationalEvent({
        name: "asset.finalized",
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
          error: error instanceof Error ? error.message : "Unable to finalize asset.",
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

    await removeAssetReferencesFromProjectComments(asset.projectId, assetId);
    await removeAssetReferencesFromProjectPages(asset.projectId, asset);
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
