import { getPostgresClient, isPostgresConfigured } from "./postgres.js";

function normalizeProjectPayload(row) {
  if (!row) {
    return null;
  }

  return row.payload && typeof row.payload === "object" ? row.payload : null;
}

function pageSortOrder(page = {}, index = 0) {
  const createdAt = Number(page.createdAt);
  return Number.isFinite(createdAt) && createdAt > 0 ? createdAt : index;
}

function asBigIntString(value, fallback = 0) {
  const numeric = Number(value);
  return String(Number.isFinite(numeric) ? Math.trunc(numeric) : fallback);
}

async function deleteMissingRows(tx, tableName, projectId, columnName, values = []) {
  if (!Array.isArray(values) || !values.length) {
    await tx.unsafe(`delete from ${tableName} where project_id = $1`, [projectId]);
    return;
  }

  await tx.unsafe(`delete from ${tableName} where project_id = $1 and not (${columnName} = any($2))`, [projectId, values]);
}

export function canUsePostgresProjectStore() {
  return isPostgresConfigured();
}

export async function readProjectRecord(projectId) {
  if (!canUsePostgresProjectStore()) {
    return null;
  }

  const normalizedProjectId = String(projectId || "").trim();

  if (!normalizedProjectId) {
    return null;
  }

  const sql = getPostgresClient();
  const rows = await sql`
    select payload
    from ux_projects
    where id = ${normalizedProjectId}
    limit 1
  `;
  return normalizeProjectPayload(rows[0]);
}

export async function listProjectRecords() {
  if (!canUsePostgresProjectStore()) {
    return [];
  }

  const sql = getPostgresClient();
  const rows = await sql`
    select payload
    from ux_projects
    order by created_at desc, id asc
  `;

  return rows.map((row) => normalizeProjectPayload(row)).filter(Boolean);
}

export async function writeProjectRecord(project) {
  if (!canUsePostgresProjectStore()) {
    return;
  }

  const nextProject = project && typeof project === "object" ? { ...project } : null;

  if (!nextProject?.id) {
    return;
  }

  const sql = getPostgresClient();

  await sql.begin(async (tx) => {
    await tx`
      insert into ux_projects (
        id,
        name,
        owner_email,
        description,
        visibility,
        sharing_mode,
        codex_access_mode,
        codex_context_id,
        share_token,
        design_tokens,
        payload,
        thumbnail_data_url,
        thumbnail_source_url,
        thumbnail_updated_at,
        thumbnail_refreshed_at,
        created_at,
        updated_at
      ) values (
        ${String(nextProject.id)},
        ${String(nextProject.name || "")},
        ${String(nextProject.ownerEmail || "")},
        ${String(nextProject.description || "")},
        ${String(nextProject.visibility || "private")},
        ${String(nextProject.sharingMode || "invited")},
        ${String(nextProject.codexAccessMode || "contributors")},
        ${String(nextProject.codexContextId || "")},
        ${String(nextProject.shareToken || "")},
        ${tx.json(nextProject.designTokens || {})},
        ${tx.json(nextProject)},
        ${String(nextProject.thumbnailDataUrl || "")},
        ${String(nextProject.thumbnailSourceUrl || "")},
        ${asBigIntString(nextProject.thumbnailUpdatedAt)}::bigint,
        ${asBigIntString(nextProject.thumbnailRefreshedAt)}::bigint,
        ${asBigIntString(nextProject.createdAt, Date.now())}::bigint,
        ${asBigIntString(nextProject.updatedAt || nextProject.createdAt, Date.now())}::bigint
      )
      on conflict (id) do update set
        name = excluded.name,
        owner_email = excluded.owner_email,
        description = excluded.description,
        visibility = excluded.visibility,
        sharing_mode = excluded.sharing_mode,
        codex_access_mode = excluded.codex_access_mode,
        codex_context_id = excluded.codex_context_id,
        share_token = excluded.share_token,
        design_tokens = excluded.design_tokens,
        payload = excluded.payload,
        thumbnail_data_url = excluded.thumbnail_data_url,
        thumbnail_source_url = excluded.thumbnail_source_url,
        thumbnail_updated_at = excluded.thumbnail_updated_at,
        thumbnail_refreshed_at = excluded.thumbnail_refreshed_at,
        updated_at = excluded.updated_at
    `;

    const projectMembers = Array.isArray(nextProject.projectMembers) ? nextProject.projectMembers : [];
    const pages = Array.isArray(nextProject.pages) ? nextProject.pages : [];
    const prototypeLinks = Array.isArray(nextProject.prototypeLinks) ? nextProject.prototypeLinks : [];
    const editSessions = Array.isArray(nextProject.editSessions) ? nextProject.editSessions : [];
    const pageLocks = Array.isArray(nextProject.pageLocks) ? nextProject.pageLocks : [];

    await deleteMissingRows(
      tx,
      "ux_project_members",
      String(nextProject.id),
      "email",
      projectMembers.map((member) => String(member?.email || "")).filter(Boolean),
    );
    await deleteMissingRows(
      tx,
      "ux_pages",
      String(nextProject.id),
      "id",
      pages.map((page) => String(page?.id || "")).filter(Boolean),
    );
    await deleteMissingRows(
      tx,
      "ux_prototype_links",
      String(nextProject.id),
      "id",
      prototypeLinks.map((prototypeLink) => String(prototypeLink?.id || "")).filter(Boolean),
    );
    await deleteMissingRows(
      tx,
      "ux_edit_sessions",
      String(nextProject.id),
      "id",
      editSessions.map((session) => String(session?.id || "")).filter(Boolean),
    );
    await deleteMissingRows(
      tx,
      "ux_page_locks",
      String(nextProject.id),
      "id",
      pageLocks.map((lock) => String(lock?.id || "")).filter(Boolean),
    );

    for (const member of projectMembers) {
      await tx`
        insert into ux_project_members (
          project_id,
          email,
          role,
          status,
          added_by,
          joined_at,
          invited_at,
          requested_at
        ) values (
          ${String(nextProject.id)},
          ${String(member?.email || "")},
          ${String(member?.role || "")},
          ${String(member?.status || "")},
          ${String(member?.addedBy || "")},
          ${asBigIntString(member?.joinedAt)}::bigint,
          ${asBigIntString(member?.invitedAt)}::bigint,
          ${asBigIntString(member?.requestedAt)}::bigint
        )
        on conflict (project_id, email) do update set
          role = excluded.role,
          status = excluded.status,
          added_by = excluded.added_by,
          joined_at = excluded.joined_at,
          invited_at = excluded.invited_at,
          requested_at = excluded.requested_at
      `;
    }

    for (const [index, page] of pages.entries()) {
      await tx`
        insert into ux_pages (
          id,
          project_id,
          name,
          file_slug,
          launch_url,
          has_content,
          created_at,
          sort_order,
          preview,
          vibe,
          files,
          page_lock
        ) values (
          ${String(page?.id || "")},
          ${String(nextProject.id)},
          ${String(page?.name || "")},
          ${String(page?.fileSlug || "")},
          ${String(page?.launchUrl || "")},
          ${Boolean(page?.hasContent)},
          ${asBigIntString(page?.createdAt)}::bigint,
          ${asBigIntString(pageSortOrder(page, index), index)}::bigint,
          ${tx.json(page?.preview || null)},
          ${tx.json(page?.vibe || null)},
          ${tx.json(page?.files || null)},
          ${tx.json(page?.pageLock || null)}
        )
        on conflict (project_id, id) do update set
          name = excluded.name,
          file_slug = excluded.file_slug,
          launch_url = excluded.launch_url,
          has_content = excluded.has_content,
          created_at = excluded.created_at,
          sort_order = excluded.sort_order,
          preview = excluded.preview,
          vibe = excluded.vibe,
          files = excluded.files,
          page_lock = excluded.page_lock
      `;
    }

    for (const prototypeLink of prototypeLinks) {
      await tx`
        insert into ux_prototype_links (
          id,
          project_id,
          label,
          url,
          page_id,
          created_by,
          created_at
        ) values (
          ${String(prototypeLink?.id || "")},
          ${String(nextProject.id)},
          ${String(prototypeLink?.label || "")},
          ${String(prototypeLink?.url || "")},
          ${String(prototypeLink?.pageId || "")},
          ${String(prototypeLink?.createdBy || "")},
          ${asBigIntString(prototypeLink?.createdAt)}::bigint
        )
        on conflict (id) do update set
          project_id = excluded.project_id,
          label = excluded.label,
          url = excluded.url,
          page_id = excluded.page_id,
          created_by = excluded.created_by,
          created_at = excluded.created_at
      `;
    }

    for (const session of editSessions) {
      await tx`
        insert into ux_edit_sessions (
          id,
          project_id,
          user_id,
          page_id,
          session_codex_thread_id,
          branch_name,
          worktree_path,
          base_branch,
          execution_mode,
          status,
          source,
          merged_at,
          last_git_error,
          created_at,
          updated_at
        ) values (
          ${String(session?.id || "")},
          ${String(nextProject.id)},
          ${String(session?.userId || "")},
          ${String(session?.pageId || "")},
          ${String(session?.sessionCodexThreadId || "")},
          ${String(session?.branchName || "")},
          ${String(session?.worktreePath || "")},
          ${String(session?.baseBranch || "main")},
          ${String(session?.executionMode || "metadata-only")},
          ${String(session?.status || "")},
          ${String(session?.source || "scaffold")},
          ${asBigIntString(session?.mergedAt)}::bigint,
          ${String(session?.lastGitError || "")},
          ${asBigIntString(session?.createdAt)}::bigint,
          ${asBigIntString(session?.updatedAt)}::bigint
        )
        on conflict (id) do update set
          project_id = excluded.project_id,
          user_id = excluded.user_id,
          page_id = excluded.page_id,
          session_codex_thread_id = excluded.session_codex_thread_id,
          branch_name = excluded.branch_name,
          worktree_path = excluded.worktree_path,
          base_branch = excluded.base_branch,
          execution_mode = excluded.execution_mode,
          status = excluded.status,
          source = excluded.source,
          merged_at = excluded.merged_at,
          last_git_error = excluded.last_git_error,
          created_at = excluded.created_at,
          updated_at = excluded.updated_at
      `;
    }

    for (const lock of pageLocks) {
      await tx`
        insert into ux_page_locks (
          id,
          project_id,
          page_id,
          locked_by,
          session_id,
          mode,
          acquired_at,
          expires_at
        ) values (
          ${String(lock?.id || "")},
          ${String(nextProject.id)},
          ${String(lock?.pageId || "")},
          ${String(lock?.lockedBy || "")},
          ${String(lock?.sessionId || "")},
          ${String(lock?.mode || "soft")},
          ${asBigIntString(lock?.acquiredAt)}::bigint,
          ${asBigIntString(lock?.expiresAt)}::bigint
        )
        on conflict (id) do update set
          project_id = excluded.project_id,
          page_id = excluded.page_id,
          locked_by = excluded.locked_by,
          session_id = excluded.session_id,
          mode = excluded.mode,
          acquired_at = excluded.acquired_at,
          expires_at = excluded.expires_at
      `;
    }
  });
}

export async function deleteProjectRecord(projectId) {
  if (!canUsePostgresProjectStore()) {
    return;
  }

  const normalizedProjectId = String(projectId || "").trim();

  if (!normalizedProjectId) {
    return;
  }

  const sql = getPostgresClient();
  await sql`delete from ux_projects where id = ${normalizedProjectId}`;
}
