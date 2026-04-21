import { getPostgresClient, isPostgresConfigured } from "./db/postgres.js";
import { listCommentRecordsByProject } from "./db/comments.js";
import {
  listIntegrationSecretRecords,
  listUserRecords,
} from "./db/users.js";
import { listProjectRecords } from "./db/projects.js";
import { scaffoldProjectWorkspace, syncProjectWorkspaceMetadata } from "./project-files.js";

const BACKUP_VERSION = 1;

function cloneJson(value) {
  return JSON.parse(JSON.stringify(value));
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

function normalizeText(value) {
  return String(value || "").trim();
}

function normalizeNumber(value, fallback = 0) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function asBigIntString(value, fallback = 0) {
  return String(Math.trunc(normalizeNumber(value, fallback)));
}

function normalizeUser(user = {}) {
  return {
    ...cloneJson(user || {}),
    email: normalizeEmail(user.email),
  };
}

function normalizeIntegrationSecret(record = {}) {
  return {
    ...cloneJson(record || {}),
    email: normalizeEmail(record.email),
    providerId: normalizeText(record.providerId).toLowerCase(),
    encryptedSecret: normalizeText(record.encryptedSecret),
    updatedAt: normalizeNumber(record.updatedAt, Date.now()),
  };
}

function normalizeCommentThread(thread = {}) {
  return {
    projectId: normalizeText(thread.projectId),
    pageId: normalizeText(thread.pageId),
    comments: cloneJson(asArray(thread.comments)),
  };
}

function normalizeBackupPayload(payload = {}) {
  return {
    version: normalizeNumber(payload.version, BACKUP_VERSION),
    exportedAt: normalizeText(payload.exportedAt),
    users: asArray(payload.users).map(normalizeUser).filter((user) => user.email),
    integrationSecrets: asArray(payload.integrationSecrets)
      .map(normalizeIntegrationSecret)
      .filter((record) => record.email && record.providerId),
    projects: asArray(payload.projects).map((project) => cloneJson(project)).filter((project) => normalizeText(project.id)),
    commentThreads: asArray(payload.commentThreads)
      .map(normalizeCommentThread)
      .filter((thread) => thread.projectId && thread.pageId),
  };
}

export function canUseAdminRecovery() {
  return isPostgresConfigured();
}

export async function exportAdminRecoverySnapshot() {
  if (!canUseAdminRecovery()) {
    throw new Error("Postgres is required to export recovery data.");
  }

  const [users, integrationSecrets, projects] = await Promise.all([
    listUserRecords(),
    listIntegrationSecretRecords(),
    listProjectRecords(),
  ]);

  const commentThreads = [];

  for (const project of projects) {
    const projectId = normalizeText(project?.id);

    if (!projectId) {
      continue;
    }

    const pages = project?.hasOverview
      ? ["overview", ...asArray(project.pages).map((page) => normalizeText(page?.id)).filter(Boolean)]
      : asArray(project.pages).map((page) => normalizeText(page?.id)).filter(Boolean);

    const commentsByPage = await listCommentRecordsByProject(projectId, pages);

    for (const [pageId, comments] of commentsByPage.entries()) {
      commentThreads.push({
        projectId,
        pageId,
        comments: cloneJson(comments),
      });
    }
  }

  return {
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    users: cloneJson(users),
    integrationSecrets: cloneJson(integrationSecrets),
    projects: cloneJson(projects),
    commentThreads,
  };
}

async function restoreProjectWorkspaces(projects = []) {
  for (const project of projects) {
    await scaffoldProjectWorkspace(project);
    await syncProjectWorkspaceMetadata(project);
  }
}

export async function restoreAdminRecoverySnapshot(rawPayload = {}) {
  if (!canUseAdminRecovery()) {
    throw new Error("Postgres is required to restore recovery data.");
  }

  const snapshot = normalizeBackupPayload(rawPayload);
  const sql = getPostgresClient();

  await sql.begin(async (tx) => {
    await tx`delete from ux_comments`;
    await tx`delete from ux_edit_sessions`;
    await tx`delete from ux_page_locks`;
    await tx`delete from ux_prototype_links`;
    await tx`delete from ux_pages`;
    await tx`delete from ux_project_members`;
    await tx`delete from ux_projects`;
    await tx`delete from ux_user_integration_secrets`;
    await tx`delete from ux_password_reset_tokens`;
    await tx`delete from ux_auth_sessions`;
    await tx`delete from ux_users`;

    for (const user of snapshot.users) {
      await tx`
        insert into ux_users (
          email,
          first_name,
          last_name,
          role,
          avatar_url,
          avatar_color,
          integrations,
          payload,
          created_at,
          updated_at
        ) values (
          ${user.email},
          ${normalizeText(user.firstName)},
          ${normalizeText(user.lastName)},
          ${normalizeText(user.role)},
          ${normalizeText(user.avatarUrl)},
          ${normalizeText(user.avatarColor)},
          ${tx.json(user.integrations || {})},
          ${tx.json(user)},
          to_timestamp(${normalizeNumber(user.createdAt, Date.now())} / 1000.0),
          to_timestamp(${normalizeNumber(user.updatedAt || user.createdAt, Date.now())} / 1000.0)
        )
      `;
    }

    for (const secret of snapshot.integrationSecrets) {
      await tx`
        insert into ux_user_integration_secrets (
          email,
          provider_id,
          encrypted_secret,
          payload,
          updated_at
        ) values (
          ${secret.email},
          ${secret.providerId},
          ${secret.encryptedSecret},
          ${tx.json(secret)},
          ${asBigIntString(secret.updatedAt, Date.now())}::bigint
        )
      `;
    }

    for (const project of snapshot.projects) {
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
          ${normalizeText(project.id)},
          ${normalizeText(project.name)},
          ${normalizeEmail(project.ownerEmail)},
          ${normalizeText(project.description)},
          ${normalizeText(project.visibility || "private")},
          ${normalizeText(project.sharingMode || "invited")},
          ${normalizeText(project.codexAccessMode || "contributors")},
          ${normalizeText(project.codexContextId)},
          ${normalizeText(project.shareToken)},
          ${tx.json(project.designTokens || {})},
          ${tx.json(project)},
          ${normalizeText(project.thumbnailDataUrl)},
          ${normalizeText(project.thumbnailSourceUrl)},
          ${asBigIntString(project.thumbnailUpdatedAt)}::bigint,
          ${asBigIntString(project.thumbnailRefreshedAt)}::bigint,
          ${asBigIntString(project.createdAt, Date.now())}::bigint,
          ${asBigIntString(project.updatedAt || project.createdAt, Date.now())}::bigint
        )
      `;

      for (const member of asArray(project.projectMembers)) {
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
            ${normalizeText(project.id)},
            ${normalizeEmail(member.email)},
            ${normalizeText(member.role)},
            ${normalizeText(member.status)},
            ${normalizeText(member.addedBy)},
            ${asBigIntString(member.joinedAt)}::bigint,
            ${asBigIntString(member.invitedAt)}::bigint,
            ${asBigIntString(member.requestedAt)}::bigint
          )
        `;
      }

      for (const [index, page] of asArray(project.pages).entries()) {
        const sortOrder = normalizeNumber(page.sortOrder, normalizeNumber(page.createdAt, index));
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
            ${normalizeText(page.id)},
            ${normalizeText(project.id)},
            ${normalizeText(page.name)},
            ${normalizeText(page.fileSlug)},
            ${normalizeText(page.launchUrl)},
            ${Boolean(page.hasContent)},
            ${asBigIntString(page.createdAt)}::bigint,
            ${asBigIntString(sortOrder, index)}::bigint,
            ${tx.json(page.preview || null)},
            ${tx.json(page.vibe || null)},
            ${tx.json(page.files || null)},
            ${tx.json(page.pageLock || null)}
          )
        `;
      }

      for (const prototypeLink of asArray(project.prototypeLinks)) {
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
            ${normalizeText(prototypeLink.id)},
            ${normalizeText(project.id)},
            ${normalizeText(prototypeLink.label)},
            ${normalizeText(prototypeLink.url)},
            ${normalizeText(prototypeLink.pageId)},
            ${normalizeText(prototypeLink.createdBy)},
            ${asBigIntString(prototypeLink.createdAt)}::bigint
          )
        `;
      }

      for (const session of asArray(project.editSessions)) {
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
            ${normalizeText(session.id)},
            ${normalizeText(project.id)},
            ${normalizeEmail(session.userId)},
            ${normalizeText(session.pageId)},
            ${normalizeText(session.sessionCodexThreadId)},
            ${normalizeText(session.branchName)},
            ${normalizeText(session.worktreePath)},
            ${normalizeText(session.baseBranch || "main")},
            ${normalizeText(session.executionMode || "metadata-only")},
            ${normalizeText(session.status)},
            ${normalizeText(session.source || "scaffold")},
            ${asBigIntString(session.mergedAt)}::bigint,
            ${normalizeText(session.lastGitError)},
            ${asBigIntString(session.createdAt, Date.now())}::bigint,
            ${asBigIntString(session.updatedAt || session.createdAt, Date.now())}::bigint
          )
        `;
      }

      for (const lock of asArray(project.pageLocks)) {
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
            ${normalizeText(lock.id)},
            ${normalizeText(project.id)},
            ${normalizeText(lock.pageId)},
            ${normalizeEmail(lock.lockedBy)},
            ${normalizeText(lock.sessionId)},
            ${normalizeText(lock.mode || "soft")},
            ${asBigIntString(lock.acquiredAt)}::bigint,
            ${asBigIntString(lock.expiresAt)}::bigint
          )
        `;
      }
    }

    for (const thread of snapshot.commentThreads) {
      for (const comment of asArray(thread.comments)) {
        await tx`
          insert into ux_comments (
            id,
            project_id,
            page_id,
            payload,
            created_at,
            updated_at
          ) values (
            ${normalizeText(comment.id)},
            ${thread.projectId},
            ${thread.pageId},
            ${tx.json(comment)},
            ${asBigIntString(comment.createdAt, Date.now())}::bigint,
            ${asBigIntString(comment.editedAt || comment.createdAt, Date.now())}::bigint
          )
        `;
      }
    }
  });

  await restoreProjectWorkspaces(snapshot.projects);

  return {
    ok: true,
    restored: {
      users: snapshot.users.length,
      integrationSecrets: snapshot.integrationSecrets.length,
      projects: snapshot.projects.length,
      commentThreads: snapshot.commentThreads.length,
    },
  };
}
