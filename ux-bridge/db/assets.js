import { getPostgresClient, isPostgresConfigured } from "./postgres.js";

function readAssetPayload(row) {
  return row?.payload && typeof row.payload === "object" ? row.payload : null;
}

function asBigIntString(value, fallback = 0) {
  const numeric = Number(value);
  return String(Number.isFinite(numeric) ? Math.trunc(numeric) : fallback);
}

export function canUsePostgresAssetStore() {
  return isPostgresConfigured();
}

export async function listAssetRecords({ projectId = "", pageId = "", commentId = "" } = {}) {
  if (!canUsePostgresAssetStore()) {
    return [];
  }

  const normalizedProjectId = String(projectId || "").trim();
  const normalizedPageId = String(pageId || "").trim();
  const normalizedCommentId = String(commentId || "").trim();

  if (!normalizedProjectId) {
    return [];
  }

  const sql = getPostgresClient();
  const rows =
    normalizedPageId && normalizedCommentId
      ? await sql`
          select payload
          from ux_assets
          where project_id = ${normalizedProjectId}
            and page_id = ${normalizedPageId}
            and comment_id = ${normalizedCommentId}
          order by created_at desc, id desc
        `
      : normalizedPageId
      ? await sql`
          select payload
          from ux_assets
          where project_id = ${normalizedProjectId}
            and page_id = ${normalizedPageId}
          order by created_at desc, id desc
        `
      : await sql`
          select payload
          from ux_assets
          where project_id = ${normalizedProjectId}
          order by created_at desc, id desc
        `;

  return rows.map((row) => readAssetPayload(row)).filter(Boolean);
}

export async function readAssetRecord(assetId) {
  if (!canUsePostgresAssetStore()) {
    return null;
  }

  const normalizedAssetId = String(assetId || "").trim();

  if (!normalizedAssetId) {
    return null;
  }

  const sql = getPostgresClient();
  const rows = await sql`
    select payload
    from ux_assets
    where id = ${normalizedAssetId}
    limit 1
  `;

  return readAssetPayload(rows[0]);
}

export async function writeAssetRecord(asset) {
  if (!canUsePostgresAssetStore()) {
    return;
  }

  const nextAsset = asset && typeof asset === "object" ? { ...asset } : null;

  if (!nextAsset?.id || !nextAsset?.projectId || !nextAsset?.pageId) {
    return;
  }

  const sql = getPostgresClient();
  const createdAt = Number(nextAsset.createdAt) || Date.now();
  const updatedAt = Number(nextAsset.updatedAt) || createdAt;

  await sql`
    insert into ux_assets (
      id,
      project_id,
      page_id,
      comment_id,
      uploaded_by,
      file_name,
      kind,
      content_type,
      size_bytes,
      blob_pathname,
      blob_url,
      blob_download_url,
      payload,
      created_at,
      updated_at
    ) values (
      ${String(nextAsset.id)},
      ${String(nextAsset.projectId)},
      ${String(nextAsset.pageId)},
      ${String(nextAsset.commentId || "")},
      ${String(nextAsset.uploadedBy || "")},
      ${String(nextAsset.fileName || "")},
      ${String(nextAsset.kind || "file")},
      ${String(nextAsset.contentType || "application/octet-stream")},
      ${asBigIntString(nextAsset.sizeBytes)}::bigint,
      ${String(nextAsset.blobPathname || "")},
      ${String(nextAsset.blobUrl || "")},
      ${String(nextAsset.downloadUrl || "")},
      ${sql.json(nextAsset)},
      ${asBigIntString(createdAt)}::bigint,
      ${asBigIntString(updatedAt)}::bigint
    )
    on conflict (id) do update set
      project_id = excluded.project_id,
      page_id = excluded.page_id,
      comment_id = excluded.comment_id,
      uploaded_by = excluded.uploaded_by,
      file_name = excluded.file_name,
      kind = excluded.kind,
      content_type = excluded.content_type,
      size_bytes = excluded.size_bytes,
      blob_pathname = excluded.blob_pathname,
      blob_url = excluded.blob_url,
      blob_download_url = excluded.blob_download_url,
      payload = excluded.payload,
      updated_at = excluded.updated_at
  `;
}

export async function deleteAssetRecord(assetId) {
  if (!canUsePostgresAssetStore()) {
    return;
  }

  const normalizedAssetId = String(assetId || "").trim();

  if (!normalizedAssetId) {
    return;
  }

  const sql = getPostgresClient();
  await sql`
    delete from ux_assets
    where id = ${normalizedAssetId}
  `;
}
