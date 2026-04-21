import { getPostgresClient, isPostgresConfigured } from "./postgres.js";

function commentTimestamp(value, fallback = 0) {
  const asNumber = Number(value);

  if (Number.isFinite(asNumber) && asNumber > 0) {
    return asNumber;
  }

  const parsed = Date.parse(String(value || ""));
  return Number.isFinite(parsed) ? parsed : fallback;
}

function asBigIntString(value, fallback = 0) {
  const numeric = Number(value);
  return String(Number.isFinite(numeric) ? Math.trunc(numeric) : fallback);
}

function readCommentPayload(row) {
  return row?.payload && typeof row.payload === "object" ? row.payload : null;
}

function readMentionEmails(row) {
  const mentions = Array.isArray(row?.mentions) ? row.mentions : [];

  return mentions
    .map((mention) => normalizeEmail(mention?.email))
    .filter(Boolean);
}

function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

function isMissingCommentViewsTableError(error) {
  return (
    error &&
    typeof error === "object" &&
    (error.code === "42P01" || String(error.message || "").includes('relation "ux_comment_views" does not exist'))
  );
}

export function canUsePostgresCommentStore() {
  return isPostgresConfigured();
}

export async function readCommentRecords(projectId, pageId) {
  if (!canUsePostgresCommentStore()) {
    return [];
  }

  const sql = getPostgresClient();
  const rows = await sql`
    select payload
    from ux_comments
    where project_id = ${String(projectId || "")}
      and page_id = ${String(pageId || "")}
    order by created_at asc, id asc
  `;

  return rows.map((row) => readCommentPayload(row)).filter(Boolean);
}

export async function writeCommentRecords(projectId, pageId, comments) {
  if (!canUsePostgresCommentStore()) {
    return;
  }

  const normalizedProjectId = String(projectId || "").trim();
  const normalizedPageId = String(pageId || "").trim();

  if (!normalizedProjectId || !normalizedPageId) {
    return;
  }

  const nextComments = Array.isArray(comments) ? comments : [];
  const sql = getPostgresClient();

  await sql.begin(async (tx) => {
    await tx`
      delete from ux_comments
      where project_id = ${normalizedProjectId}
        and page_id = ${normalizedPageId}
    `;

    for (const comment of nextComments) {
      const createdAt = commentTimestamp(comment?.createdAt, Date.now());
      const updatedAt = commentTimestamp(comment?.editedAt, createdAt);

      await tx`
        insert into ux_comments (
          id,
          project_id,
          page_id,
          payload,
          created_at,
          updated_at
        ) values (
          ${String(comment?.id || "")},
          ${normalizedProjectId},
          ${normalizedPageId},
          ${tx.json(comment)},
          ${asBigIntString(createdAt)}::bigint,
          ${asBigIntString(updatedAt)}::bigint
        )
      `;
    }
  });
}

export async function insertCommentRecord(projectId, pageId, comment) {
  if (!canUsePostgresCommentStore()) {
    return;
  }

  const normalizedProjectId = String(projectId || "").trim();
  const normalizedPageId = String(pageId || "").trim();
  const normalizedCommentId = String(comment?.id || "").trim();

  if (!normalizedProjectId || !normalizedPageId || !normalizedCommentId) {
    return;
  }

  const createdAt = commentTimestamp(comment?.createdAt, Date.now());
  const updatedAt = commentTimestamp(comment?.editedAt, createdAt);
  const sql = getPostgresClient();

  await sql`
    insert into ux_comments (
      id,
      project_id,
      page_id,
      payload,
      created_at,
      updated_at
    ) values (
      ${normalizedCommentId},
      ${normalizedProjectId},
      ${normalizedPageId},
      ${sql.json(comment)},
      ${asBigIntString(createdAt)}::bigint,
      ${asBigIntString(updatedAt)}::bigint
    )
    on conflict (id) do update
    set project_id = excluded.project_id,
        page_id = excluded.page_id,
        payload = excluded.payload,
        created_at = excluded.created_at,
        updated_at = excluded.updated_at
  `;
}

export async function updateCommentRecord(projectId, pageId, comment) {
  if (!canUsePostgresCommentStore()) {
    return;
  }

  const normalizedProjectId = String(projectId || "").trim();
  const normalizedPageId = String(pageId || "").trim();
  const normalizedCommentId = String(comment?.id || "").trim();

  if (!normalizedProjectId || !normalizedPageId || !normalizedCommentId) {
    return;
  }

  const createdAt = commentTimestamp(comment?.createdAt, Date.now());
  const updatedAt = commentTimestamp(comment?.editedAt, createdAt);
  const sql = getPostgresClient();

  await sql`
    update ux_comments
    set payload = ${sql.json(comment)},
        created_at = ${asBigIntString(createdAt)}::bigint,
        updated_at = ${asBigIntString(updatedAt)}::bigint
    where id = ${normalizedCommentId}
      and project_id = ${normalizedProjectId}
      and page_id = ${normalizedPageId}
  `;
}

export async function deleteCommentRecord(projectId, pageId, commentId) {
  if (!canUsePostgresCommentStore()) {
    return;
  }

  const normalizedProjectId = String(projectId || "").trim();
  const normalizedPageId = String(pageId || "").trim();
  const normalizedCommentId = String(commentId || "").trim();

  if (!normalizedProjectId || !normalizedPageId || !normalizedCommentId) {
    return;
  }

  const sql = getPostgresClient();

  await sql`
    delete from ux_comments
    where id = ${normalizedCommentId}
      and project_id = ${normalizedProjectId}
      and page_id = ${normalizedPageId}
  `;
}

export async function listCommentRecordsByProject(projectId, pageIds = []) {
  if (!canUsePostgresCommentStore()) {
    return new Map();
  }

  const normalizedProjectId = String(projectId || "").trim();
  const normalizedPageIds = Array.from(
    new Set((Array.isArray(pageIds) ? pageIds : []).map((pageId) => String(pageId || "").trim()).filter(Boolean)),
  );

  if (!normalizedProjectId || !normalizedPageIds.length) {
    return new Map();
  }

  const sql = getPostgresClient();
  const rows = await sql`
    select page_id, payload
    from ux_comments
    where project_id = ${normalizedProjectId}
      and page_id = any(${normalizedPageIds})
    order by page_id asc, created_at asc, id asc
  `;

  const result = new Map(normalizedPageIds.map((pageId) => [pageId, []]));

  rows.forEach((row) => {
    const pageId = String(row?.page_id || "").trim();

    if (!pageId) {
      return;
    }

    if (!result.has(pageId)) {
      result.set(pageId, []);
    }

    const payload = readCommentPayload(row);

    if (payload) {
      result.get(pageId).push(payload);
    }
  });

  return result;
}

export async function listCommentSummaryRowsByProject(projectId, pageIds = []) {
  if (!canUsePostgresCommentStore()) {
    return new Map();
  }

  const normalizedProjectId = String(projectId || "").trim();
  const normalizedPageIds = Array.from(
    new Set((Array.isArray(pageIds) ? pageIds : []).map((pageId) => String(pageId || "").trim()).filter(Boolean)),
  );

  if (!normalizedProjectId || !normalizedPageIds.length) {
    return new Map();
  }

  const sql = getPostgresClient();
  const rows = await sql`
    select
      page_id,
      id,
      greatest(created_at, updated_at) as activity_at,
      coalesce(payload->'mentions', '[]'::jsonb) as mentions
    from ux_comments
    where project_id = ${normalizedProjectId}
      and page_id = any(${normalizedPageIds})
    order by page_id asc, created_at asc, id asc
  `;

  const result = new Map(normalizedPageIds.map((pageId) => [pageId, []]));

  rows.forEach((row) => {
    const pageId = String(row?.page_id || "").trim();

    if (!pageId) {
      return;
    }

    if (!result.has(pageId)) {
      result.set(pageId, []);
    }

    result.get(pageId).push({
      id: String(row?.id || "").trim(),
      activityAt: Number(row?.activity_at) || 0,
      mentionEmails: readMentionEmails(row),
    });
  });

  return result;
}

export async function readCommentViewRecord(projectId, pageId, email) {
  if (!canUsePostgresCommentStore()) {
    return {
      lastSeenCommentId: "",
      lastSeenAt: 0,
    };
  }

  const normalizedProjectId = String(projectId || "").trim();
  const normalizedPageId = String(pageId || "").trim();
  const normalizedEmail = normalizeEmail(email);

  if (!normalizedProjectId || !normalizedPageId || !normalizedEmail) {
    return {
      lastSeenCommentId: "",
      lastSeenAt: 0,
    };
  }

  const sql = getPostgresClient();
  let row;

  try {
    [row] = await sql`
      select last_seen_comment_id, last_seen_at
      from ux_comment_views
      where project_id = ${normalizedProjectId}
        and page_id = ${normalizedPageId}
        and email = ${normalizedEmail}
      limit 1
    `;
  } catch (error) {
    if (!isMissingCommentViewsTableError(error)) {
      throw error;
    }

    return {
      lastSeenCommentId: "",
      lastSeenAt: 0,
    };
  }

  return {
    lastSeenCommentId: String(row?.last_seen_comment_id || "").trim(),
    lastSeenAt: Number(row?.last_seen_at) || 0,
  };
}

export async function listCommentViewRecordsByProject(projectId, pageIds = [], email = "") {
  if (!canUsePostgresCommentStore()) {
    return new Map();
  }

  const normalizedProjectId = String(projectId || "").trim();
  const normalizedPageIds = Array.from(
    new Set((Array.isArray(pageIds) ? pageIds : []).map((pageId) => String(pageId || "").trim()).filter(Boolean)),
  );
  const normalizedEmail = normalizeEmail(email);

  if (!normalizedProjectId || !normalizedPageIds.length || !normalizedEmail) {
    return new Map();
  }

  const sql = getPostgresClient();
  let rows = [];

  try {
    rows = await sql`
      select page_id, last_seen_comment_id, last_seen_at
      from ux_comment_views
      where project_id = ${normalizedProjectId}
        and page_id = any(${normalizedPageIds})
        and email = ${normalizedEmail}
    `;
  } catch (error) {
    if (!isMissingCommentViewsTableError(error)) {
      throw error;
    }

    return new Map();
  }

  return new Map(
    rows.map((row) => [
      String(row?.page_id || "").trim(),
      {
        lastSeenCommentId: String(row?.last_seen_comment_id || "").trim(),
        lastSeenAt: Number(row?.last_seen_at) || 0,
      },
    ]),
  );
}

export async function writeCommentViewRecord(projectId, pageId, email, record = {}) {
  if (!canUsePostgresCommentStore()) {
    return;
  }

  const normalizedProjectId = String(projectId || "").trim();
  const normalizedPageId = String(pageId || "").trim();
  const normalizedEmail = normalizeEmail(email);

  if (!normalizedProjectId || !normalizedPageId || !normalizedEmail) {
    return;
  }

  const sql = getPostgresClient();
  const normalizedRecord = {
    lastSeenCommentId: String(record?.lastSeenCommentId || "").trim(),
    lastSeenAt: Number(record?.lastSeenAt) || 0,
    updatedAt: Number(record?.updatedAt) || Date.now(),
  };

  try {
    await sql`
      insert into ux_comment_views (
        project_id,
        page_id,
        email,
        last_seen_comment_id,
        last_seen_at,
        updated_at
      ) values (
        ${normalizedProjectId},
        ${normalizedPageId},
        ${normalizedEmail},
        ${normalizedRecord.lastSeenCommentId},
        ${String(normalizedRecord.lastSeenAt)}::bigint,
        ${String(normalizedRecord.updatedAt)}::bigint
      )
      on conflict (project_id, page_id, email) do update
      set last_seen_comment_id = excluded.last_seen_comment_id,
          last_seen_at = excluded.last_seen_at,
          updated_at = excluded.updated_at
    `;
  } catch (error) {
    if (!isMissingCommentViewsTableError(error)) {
      throw error;
    }
  }
}
