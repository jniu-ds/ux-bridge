import crypto from "node:crypto";
import { getAuthenticatedUser, listMentionableUsers, readJsonBody, sendJson } from "./auth-store.js";
import {
  canUsePostgresCommentStore,
  deleteCommentRecord,
  insertCommentRecord,
  listCommentViewRecordsByProject,
  listCommentSummaryRowsByProject,
  readCommentRecords,
  readCommentViewRecord,
  updateCommentRecord,
  writeCommentRecords,
  writeCommentViewRecord,
} from "./db/comments.js";
import { ensureDurableStoreAvailable } from "./db/config.js";
import { isRedisConfigured, isRedisRecoverableError, readRedisJson, redisCommand, writeRedisJson } from "./db/redis.js";
import { userHasPermission } from "./permissions-store.js";
import { getProjectStructureById, listAllProjectsForMaintenance, projectHasPage, userCanAccessProject } from "./projects-store.js";

const COMMENTS_STORE_KEY = "__uxBridgeCommentsStore__";
const COMMENTS_PREFIX = "ux-bridge:comments:";
const COMMENTS_PROJECT_SUMMARY_PREFIX = "ux-bridge:comments-summary:";
const COMMENTS_VIEW_PREFIX = "ux-bridge:comment-views:";

const REDIS_ENABLED = isRedisConfigured();

function warnCommentsRedisFallback(scope, error) {
  console.warn(`[comments] redis unavailable during ${scope}; falling back`, {
    message: error instanceof Error ? error.message : String(error),
  });
}

async function withCommentsRedisFallback(scope, fallbackValue, operation) {
  try {
    return await operation();
  } catch (error) {
    if (!isRedisRecoverableError(error)) {
      throw error;
    }

    warnCommentsRedisFallback(scope, error);
    return typeof fallbackValue === "function" ? await fallbackValue() : fallbackValue;
  }
}

function getMemoryStore() {
  if (!globalThis[COMMENTS_STORE_KEY]) {
    globalThis[COMMENTS_STORE_KEY] = new Map();
  }

  return globalThis[COMMENTS_STORE_KEY];
}

export function clearCommentsRuntimeState() {
  globalThis[COMMENTS_STORE_KEY] = new Map();
}

function commentsKey(project, page) {
  return `${COMMENTS_PREFIX}${project}:${page}`;
}

function commentsProjectSummaryKey(project) {
  return `${COMMENTS_PROJECT_SUMMARY_PREFIX}${project}`;
}

function commentsViewKey(email, project) {
  return `${COMMENTS_VIEW_PREFIX}${String(email || "").trim().toLowerCase()}:${project}`;
}

function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

function commentSeenTimestamp(comment) {
  const createdAt = Date.parse(String(comment?.createdAt || ""));
  if (Number.isFinite(createdAt)) {
    return createdAt;
  }

  const editedAt = Date.parse(String(comment?.editedAt || ""));
  return Number.isFinite(editedAt) ? editedAt : 0;
}

function countUnseenComments(comments = [], lastSeenAt = 0) {
  return (Array.isArray(comments) ? comments : []).reduce(
    (count, comment) => count + (commentSeenTimestamp(comment) > Number(lastSeenAt || 0) ? 1 : 0),
    0,
  );
}

function countUnseenMentionComments(comments = [], mentionCommentIds = [], lastSeenAt = 0) {
  const mentionSet = new Set((Array.isArray(mentionCommentIds) ? mentionCommentIds : []).map((value) => String(value || "").trim()));

  if (!mentionSet.size) {
    return 0;
  }

  return (Array.isArray(comments) ? comments : []).reduce((count, comment) => {
    const commentId = String(comment?.id || "").trim();
    return count + (mentionSet.has(commentId) && commentSeenTimestamp(comment) > Number(lastSeenAt || 0) ? 1 : 0);
  }, 0);
}

async function readCommentViewState(project, page, email) {
  const normalizedProject = normalizeProject(project);
  const normalizedPage = normalizePage(page);
  const normalizedEmail = normalizeEmail(email);

  if (!normalizedProject || !normalizedPage || !normalizedEmail) {
    return {
      lastSeenCommentId: "",
      lastSeenAt: 0,
    };
  }

  if (canUsePostgresCommentStore()) {
    return await readCommentViewRecord(normalizedProject, normalizedPage, normalizedEmail);
  }

  const key = commentsViewKey(normalizedEmail, normalizedProject);

  if (!REDIS_ENABLED) {
    const record = getMemoryStore().get(key) || {};
    return record[normalizedPage] || { lastSeenCommentId: "", lastSeenAt: 0 };
  }

  const record = await withCommentsRedisFallback(
    "readCommentViewState",
    () => getMemoryStore().get(key) || {},
    async () => (await readRedisJson(key)) || {},
  );

  return record[normalizedPage] || { lastSeenCommentId: "", lastSeenAt: 0 };
}

async function readCommentViewStateByPages(project, pages = [], email = "") {
  const normalizedProject = normalizeProject(project);
  const normalizedPages = Array.from(
    new Set((Array.isArray(pages) ? pages : []).map((page) => normalizePage(page)).filter(Boolean)),
  );
  const normalizedEmail = normalizeEmail(email);

  if (!normalizedProject || !normalizedPages.length || !normalizedEmail) {
    return new Map();
  }

  if (canUsePostgresCommentStore()) {
    return await listCommentViewRecordsByProject(normalizedProject, normalizedPages, normalizedEmail);
  }

  const key = commentsViewKey(normalizedEmail, normalizedProject);

  let record = {};

  if (!REDIS_ENABLED) {
    record = getMemoryStore().get(key) || {};
  } else {
    record = await withCommentsRedisFallback(
      "readCommentViewStateByPages",
      () => getMemoryStore().get(key) || {},
      async () => (await readRedisJson(key)) || {},
    );
  }

  return new Map(
    normalizedPages.map((page) => [
      page,
      record[page] || {
        lastSeenCommentId: "",
        lastSeenAt: 0,
      },
    ]),
  );
}

async function writeCommentViewState(project, page, email, record = {}) {
  const normalizedProject = normalizeProject(project);
  const normalizedPage = normalizePage(page);
  const normalizedEmail = normalizeEmail(email);

  if (!normalizedProject || !normalizedPage || !normalizedEmail) {
    return;
  }

  const normalizedRecord = {
    lastSeenCommentId: String(record?.lastSeenCommentId || "").trim(),
    lastSeenAt: Number(record?.lastSeenAt) || 0,
    updatedAt: Number(record?.updatedAt) || Date.now(),
  };

  if (canUsePostgresCommentStore()) {
    await writeCommentViewRecord(normalizedProject, normalizedPage, normalizedEmail, normalizedRecord);
    return;
  }

  const key = commentsViewKey(normalizedEmail, normalizedProject);
  const currentRecord = REDIS_ENABLED
    ? await withCommentsRedisFallback(
        "readCommentViewStateForWrite",
        () => getMemoryStore().get(key) || {},
        async () => (await readRedisJson(key)) || {},
      )
    : getMemoryStore().get(key) || {};
  const nextRecord = {
    ...currentRecord,
    [normalizedPage]: normalizedRecord,
  };

  if (!REDIS_ENABLED) {
    getMemoryStore().set(key, nextRecord);
    return;
  }

  await withCommentsRedisFallback("writeCommentViewState", null, async () => {
    await writeRedisJson(key, nextRecord);
  });
  getMemoryStore().set(key, nextRecord);
}

async function readComments(project, page) {
  ensureDurableStoreAvailable("project comments");
  if (canUsePostgresCommentStore()) {
    const comments = await readCommentRecords(project, page);

    if (comments.length) {
      return comments;
    }
  }

  const key = commentsKey(project, page);

  if (!REDIS_ENABLED) {
    return getMemoryStore().get(key) || [];
  }

  return await withCommentsRedisFallback(
    "readComments",
    () => getMemoryStore().get(key) || [],
    async () => (await readRedisJson(key)) || [],
  );
}

function summarizeComments(comments = []) {
  const latestActivityAt = comments.reduce((latest, comment) => {
    const timestamp = new Date(comment.editedAt || comment.createdAt || 0).getTime();
    return Number.isNaN(timestamp) ? latest : Math.max(latest, timestamp);
  }, 0);
  const mentionCommentIdsByEmail = {};

  comments.forEach((comment) => {
    const commentId = String(comment?.id || "").trim();

    if (!commentId) {
      return;
    }

    const mentions = Array.isArray(comment?.mentions) ? comment.mentions : [];

    mentions.forEach((mention) => {
      const email = String(mention?.email || "")
        .trim()
        .toLowerCase();

      if (!email) {
        return;
      }

      if (!Array.isArray(mentionCommentIdsByEmail[email])) {
        mentionCommentIdsByEmail[email] = [];
      }

      mentionCommentIdsByEmail[email].push(commentId);
    });
  });

  return {
    count: comments.length,
    latestCommentId: comments.at(-1)?.id || "",
    commentIds: comments.map((comment) => comment.id),
    latestActivityAt: latestActivityAt ? new Date(latestActivityAt).toISOString() : "",
    mentionCommentIdsByEmail,
  };
}

async function readProjectCommentsSummary(project) {
  ensureDurableStoreAvailable("project comments");
  if (canUsePostgresCommentStore()) {
    const structure = await getProjectStructureById(project);

    if (!structure) {
      return {};
    }

    const pageIds = structure.hasOverview
      ? ["overview", ...structure.pages.map((page) => page.id)]
      : structure.pages.map((page) => page.id);
    const rowsByPage = await listCommentSummaryRowsByProject(project, pageIds);
    const summary = {};

    pageIds.forEach((pageId) => {
      const rows = rowsByPage.get(pageId) || [];
      const mentionCommentIdsByEmail = {};
      let latestActivityAt = 0;

      rows.forEach((row) => {
        latestActivityAt = Math.max(latestActivityAt, Number(row?.activityAt) || 0);
        (Array.isArray(row?.mentionEmails) ? row.mentionEmails : []).forEach((email) => {
          if (!Array.isArray(mentionCommentIdsByEmail[email])) {
            mentionCommentIdsByEmail[email] = [];
          }

          mentionCommentIdsByEmail[email].push(String(row?.id || "").trim());
        });
      });

      summary[pageId] = {
        count: rows.length,
        latestCommentId: rows.at(-1)?.id || "",
        commentIds: rows.map((row) => row.id),
        latestActivityAt: latestActivityAt ? new Date(latestActivityAt).toISOString() : "",
        mentionCommentIdsByEmail,
      };
    });

    return summary;
  }

  const key = commentsProjectSummaryKey(project);

  if (!REDIS_ENABLED) {
    return getMemoryStore().get(key) || {};
  }

  return await withCommentsRedisFallback(
    "readProjectCommentsSummary",
    () => getMemoryStore().get(key) || {},
    async () => (await readRedisJson(key)) || {},
  );
}

async function readProjectsCommentsSummary(projects) {
  const uniqueProjects = [...new Set((projects || []).map((project) => normalizeProject(project)).filter(Boolean))];

  if (!uniqueProjects.length) {
    return new Map();
  }

  if (canUsePostgresCommentStore()) {
    const result = new Map();

    for (const project of uniqueProjects) {
      result.set(project, await readProjectCommentsSummary(project));
    }

    return result;
  }

  if (!REDIS_ENABLED) {
    const store = getMemoryStore();
    return new Map(uniqueProjects.map((project) => [project, store.get(commentsProjectSummaryKey(project)) || {}]));
  }

  const values = await withCommentsRedisFallback(
    "readProjectsCommentsSummary",
    null,
    () => redisCommand(["MGET", ...uniqueProjects.map((project) => commentsProjectSummaryKey(project))]),
  );
  const result = new Map();

  uniqueProjects.forEach((project, index) => {
    const value = Array.isArray(values) ? values[index] : null;
    result.set(project, value ? JSON.parse(value) : {});
  });

  return result;
}

async function writeProjectCommentsSummary(project, summaryByPage) {
  ensureDurableStoreAvailable("project comments");
  if (canUsePostgresCommentStore()) {
    return;
  }

  const key = commentsProjectSummaryKey(project);

  if (!REDIS_ENABLED) {
    getMemoryStore().set(key, summaryByPage);
    return;
  }

  await withCommentsRedisFallback("writeProjectCommentsSummary", null, async () => {
    await writeRedisJson(key, summaryByPage);
  });
  getMemoryStore().set(key, summaryByPage);
}

async function updateProjectCommentsSummaryPage(project, page, comments) {
  if (canUsePostgresCommentStore()) {
    return;
  }

  const summaryByPage = await readProjectCommentsSummary(project);
  summaryByPage[page] = summarizeComments(comments);
  await writeProjectCommentsSummary(project, summaryByPage);
}

async function writeComments(project, page, comments) {
  ensureDurableStoreAvailable("project comments");
  if (canUsePostgresCommentStore()) {
    await writeCommentRecords(project, page, comments);
    return;
  }

  const key = commentsKey(project, page);

  if (!REDIS_ENABLED) {
    getMemoryStore().set(key, comments);
    await updateProjectCommentsSummaryPage(project, page, comments);
    return;
  }

  await withCommentsRedisFallback("writeComments", null, async () => {
    await writeRedisJson(key, comments);
  });
  getMemoryStore().set(key, comments);
  await updateProjectCommentsSummaryPage(project, page, comments);
}

export async function migrateCommentAuthorProfile(previousEmail, nextUserPayload = {}) {
  const fromEmail = String(previousEmail || "").trim().toLowerCase();
  const toEmail = String(nextUserPayload.email || "").trim().toLowerCase();

  if (!fromEmail || !toEmail) {
    return;
  }

  const projects = await listAllProjectsForMaintenance();

  for (const project of projects) {
    const pages = project.hasOverview
      ? ["overview", ...project.pages.map((page) => page.id)]
      : project.pages.map((page) => page.id);

    for (const pageId of pages) {
      const comments = await readComments(project.id, pageId);

      if (!comments.length) {
        continue;
      }

      let changed = false;
      const nextComments = comments.map((comment) => {
        if (String(comment.author?.email || "").trim().toLowerCase() !== fromEmail) {
          return comment;
        }

        changed = true;

        return {
          ...comment,
          author: {
            ...comment.author,
            email: toEmail,
            firstName: nextUserPayload.firstName || comment.author?.firstName || "",
            lastName: nextUserPayload.lastName || comment.author?.lastName || "",
            fullName:
              nextUserPayload.fullName ||
              `${nextUserPayload.firstName || comment.author?.firstName || ""} ${nextUserPayload.lastName || comment.author?.lastName || ""}`.trim(),
            avatarUrl: String(nextUserPayload.avatarUrl || ""),
          },
        };
      });

      if (changed) {
        await writeComments(project.id, pageId, nextComments);
      }
    }
  }
}

function normalizeProject(project) {
  return String(project || "")
    .trim()
    .toLowerCase();
}

function normalizePage(page) {
  return String(page || "")
    .trim()
    .toLowerCase();
}

function sanitizeCommentBody(value) {
  return String(value || "")
    .replace(/\r\n/g, "\n")
    .trim()
    .slice(0, 4000);
}

function sanitizeCommentAssets(value) {
  const assets = Array.isArray(value) ? value : [];

  return assets
    .map((asset) => {
      if (!asset || typeof asset !== "object") {
        return null;
      }

      return {
        id: String(asset.id || "").trim(),
        projectId: String(asset.projectId || "").trim(),
        pageId: String(asset.pageId || "").trim(),
        commentId: String(asset.commentId || "").trim(),
        uploadedBy: String(asset.uploadedBy || "").trim().toLowerCase(),
        fileName: String(asset.fileName || "").trim(),
        kind: String(asset.kind || "file").trim(),
        contentType: String(asset.contentType || "application/octet-stream").trim(),
        sizeBytes: Number(asset.sizeBytes) || 0,
        blobPathname: String(asset.blobPathname || "").trim(),
        blobUrl: String(asset.blobUrl || "").trim(),
        downloadUrl: String(asset.downloadUrl || "").trim(),
        createdAt: Number(asset.createdAt) || 0,
        updatedAt: Number(asset.updatedAt) || 0,
      };
    })
    .filter((asset) => asset && asset.id && asset.fileName);
}

function extractMentions(body, users) {
  return users
    .filter((candidate) => body.toLowerCase().includes(`@${candidate.fullName.toLowerCase()}`))
    .map((candidate) => ({
      email: candidate.email,
      fullName: candidate.fullName,
    }));
}

async function buildCommentsPayload(project, page, user) {
  const normalizedUserEmail = normalizeEmail(user?.email);
  const [comments, users, seenState] = await Promise.all([
    readComments(project, page),
    listMentionableUsers(),
    normalizedUserEmail ? readCommentViewState(project, page, normalizedUserEmail) : { lastSeenCommentId: "", lastSeenAt: 0 },
  ]);

  return {
    ok: true,
    project,
    page,
    comments,
    users,
    canDeleteAnyComment: await userHasPermission(user, "comments.delete_any"),
    lastSeenCommentId: String(seenState?.lastSeenCommentId || ""),
    lastSeenAt: Number(seenState?.lastSeenAt) || 0,
  };
}

async function buildCommentsSummary(project, pageKeys, user) {
  const targetProject = await getProjectStructureById(project);

  if (!targetProject) {
    return [];
  }

  const normalizedPages = Array.isArray(pageKeys)
    ? pageKeys.map((page) => normalizePage(page)).filter(Boolean)
    : [];

  const uniquePages = normalizedPages.filter((page, index) => normalizedPages.indexOf(page) === index);
  const normalizedUserEmail = normalizeEmail(user?.email);

  if (canUsePostgresCommentStore()) {
    const [summaryRowsByPage, seenStateByPage] = await Promise.all([
      listCommentSummaryRowsByProject(project, uniquePages),
      normalizedUserEmail ? readCommentViewStateByPages(project, uniquePages, normalizedUserEmail) : new Map(),
    ]);

    return uniquePages.map((page) => {
      const rows = summaryRowsByPage.get(page) || [];
      const lastSeenState = seenStateByPage.get(page) || { lastSeenCommentId: "", lastSeenAt: 0 };
      let latestActivityAt = 0;
      const mentionCommentIds = [];
      let unreadCount = 0;
      let unreadMentionCount = 0;

      rows.forEach((row) => {
        const activityAt = Number(row?.activityAt) || 0;
        latestActivityAt = Math.max(latestActivityAt, activityAt);

        const isMention = normalizedUserEmail
          ? (Array.isArray(row?.mentionEmails) ? row.mentionEmails : []).includes(normalizedUserEmail)
          : false;

        if (isMention) {
          mentionCommentIds.push(String(row?.id || "").trim());
        }

        if (activityAt > Number(lastSeenState.lastSeenAt || 0)) {
          unreadCount += 1;
          if (isMention) {
            unreadMentionCount += 1;
          }
        }
      });

      return {
        page,
        count: rows.length,
        latestCommentId: rows.at(-1)?.id || "",
        commentIds: rows.map((row) => row.id),
        latestActivityAt: latestActivityAt ? new Date(latestActivityAt).toISOString() : "",
        mentionCommentIdsByEmail: normalizedUserEmail ? { [normalizedUserEmail]: mentionCommentIds } : {},
        lastSeenCommentId: String(lastSeenState.lastSeenCommentId || ""),
        lastSeenAt: Number(lastSeenState.lastSeenAt) || 0,
        unreadCount,
        unreadMentionCount,
        mentionCommentIds,
      };
    });
  }

  const storedSummaryByPage = await readProjectCommentsSummary(project);
  const missingPages = uniquePages.filter((page) => !storedSummaryByPage[page]);

  if (missingPages.length) {
    const missingCommentsByPage = await Promise.all(
      missingPages.map(async (page) => ({
        page,
        comments: await readComments(project, page),
      })),
    );

    missingCommentsByPage.forEach(({ page, comments }) => {
      storedSummaryByPage[page] = summarizeComments(comments);
    });

    await writeProjectCommentsSummary(project, storedSummaryByPage);
  }

  const seenStateByPage = normalizedUserEmail
    ? await readCommentViewStateByPages(project, uniquePages, normalizedUserEmail)
    : new Map();
  const commentsByPage = await Promise.all(
    uniquePages.map(async (page) => ({
      page,
      comments: await readComments(project, page),
    })),
  );
  const commentsByPageMap = new Map(commentsByPage.map((entry) => [entry.page, entry.comments]));

  const summary = uniquePages.map((page) => {
    const baseSummary = storedSummaryByPage[page] || summarizeComments([]);
    const lastSeenState = seenStateByPage.get(page) || { lastSeenCommentId: "", lastSeenAt: 0 };
    const comments = commentsByPageMap.get(page) || [];
    const mentionCommentIds = normalizedUserEmail
      ? Array.isArray(baseSummary.mentionCommentIdsByEmail?.[normalizedUserEmail])
        ? baseSummary.mentionCommentIdsByEmail[normalizedUserEmail]
        : []
      : [];

    return {
      page,
      ...baseSummary,
      lastSeenCommentId: String(lastSeenState.lastSeenCommentId || ""),
      lastSeenAt: Number(lastSeenState.lastSeenAt) || 0,
      unreadCount: countUnseenComments(comments, lastSeenState.lastSeenAt),
      unreadMentionCount: countUnseenMentionComments(comments, mentionCommentIds, lastSeenState.lastSeenAt),
      mentionCommentIds,
    };
  });

  return summary;
}

async function buildProjectsCommentsSummary(specs, user) {
  if (canUsePostgresCommentStore()) {
    return await Promise.all(
      specs.map(async ({ project, pages }) => ({
        project,
        summary: await buildCommentsSummary(project, pages, user),
      })),
    );
  }

  const summaryStoreByProject = await readProjectsCommentsSummary(specs.map((spec) => spec.project));
  const missingProjects = specs.filter(({ project, pages }) => {
    const summary = summaryStoreByProject.get(project);
    if (!summary || typeof summary !== "object") {
      return true;
    }

    return pages.some((page) => {
      const pageSummary = summary[page];
      return !pageSummary || typeof pageSummary.mentionCommentIdsByEmail !== "object";
    });
  });

  if (missingProjects.length) {
    await Promise.all(
      missingProjects.map(async ({ project, pages }) => {
        await buildCommentsSummary(project, pages);
      }),
    );
  }

  const refreshedSummaryStoreByProject =
    missingProjects.length > 0 ? await readProjectsCommentsSummary(specs.map((spec) => spec.project)) : summaryStoreByProject;

  const summaries = specs.map(({ project, pages }) => {
    const projectSummaryStore = refreshedSummaryStoreByProject.get(project) || {};
    return {
      project,
      summary: [],
    };
  });

  await Promise.all(
    summaries.map(async (entry) => {
      entry.summary = await buildCommentsSummary(entry.project, specs.find((spec) => spec.project === entry.project)?.pages || [], user);
    }),
  );

  return summaries;
}

function getProjectPageSet(projectRecord) {
  const pageIds = Array.isArray(projectRecord?.pages) ? projectRecord.pages.map((page) => normalizePage(page.id)) : [];

  if (projectRecord?.hasOverview) {
    pageIds.unshift("overview");
  }

  return new Set(pageIds.filter(Boolean));
}

async function isValidCommentContext(project, page) {
  const foundProject = await getProjectStructureById(project);

  if (!foundProject) {
    return false;
  }

  return projectHasPage(project, page);
}

export async function handleCommentsRequest(req) {
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
    const project = normalizeProject(requestUrl.searchParams.get("project"));
    const page = normalizePage(requestUrl.searchParams.get("page"));
    const summaryMode = String(requestUrl.searchParams.get("summary") || "").trim().toLowerCase();
    const requestedPages = String(requestUrl.searchParams.get("pages") || "")
      .split(",")
      .map((value) => normalizePage(value))
      .filter(Boolean);
    const requestedProjects = (() => {
      try {
        const raw = String(requestUrl.searchParams.get("projects") || "").trim();

        if (!raw) {
          return [];
        }

        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    })();

    if (summaryMode === "projects") {
      const validSpecs = [];

      for (const spec of requestedProjects) {
        const specProject = normalizeProject(spec?.project);
        const validProject = await getProjectStructureById(specProject);

        if (!specProject || !validProject) {
          continue;
        }

        const validPageSet = getProjectPageSet(validProject);
        const normalizedPages = Array.isArray(spec?.pages)
          ? spec.pages.map((value) => normalizePage(value)).filter(Boolean)
          : [];
        const validPages = normalizedPages.filter((candidatePage) => validPageSet.has(candidatePage));

        validSpecs.push({
          project: specProject,
          pages: validPages,
        });
      }

      return {
        status: 200,
        payload: {
          ok: true,
          projects: await buildProjectsCommentsSummary(validSpecs, user),
        },
      };
    }

    if (summaryMode === "pages") {
      const validProject = await getProjectStructureById(project);

      if (!validProject) {
        return {
          status: 404,
          payload: {
            ok: false,
            error: "Unknown comment context.",
          },
        };
      }

      const validPageSet = getProjectPageSet(validProject);
      const validPages = requestedPages.filter((candidatePage) => validPageSet.has(candidatePage));

      return {
        status: 200,
        payload: {
          ok: true,
          project,
          summary: await buildCommentsSummary(project, validPages, user),
        },
      };
    }

    if (!(await isValidCommentContext(project, page))) {
      return {
        status: 404,
        payload: {
          ok: false,
          error: "Unknown comment context.",
        },
      };
    }

    if (!(await userCanAccessProject(user, project))) {
      return {
        status: 403,
        payload: {
          ok: false,
          error: "You do not have access to this project.",
        },
      };
    }

    return {
      status: 200,
      payload: await buildCommentsPayload(project, page, user),
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
  const project = normalizeProject(payload.project);
  const page = normalizePage(payload.page);
  const action = String(payload.action || "create").trim().toLowerCase();

  if (!(await isValidCommentContext(project, page))) {
    return {
      status: 404,
      payload: {
        ok: false,
        error: "Unknown comment context.",
      },
    };
  }

  if (!(await userCanAccessProject(user, project))) {
    return {
      status: 403,
      payload: {
        ok: false,
        error: "You do not have access to this project.",
      },
    };
  }

  const users = await listMentionableUsers();

  if (action === "edit") {
    const commentId = String(payload.commentId || "").trim();
    const body = sanitizeCommentBody(payload.body);

    if (!commentId) {
      return {
        status: 400,
        payload: {
          ok: false,
          error: "Comment ID is required.",
        },
      };
    }

    if (!body) {
      return {
        status: 400,
        payload: {
          ok: false,
          error: "Comment body is required.",
        },
      };
    }

    const comments = await readComments(project, page);
    const commentIndex = comments.findIndex((comment) => comment.id === commentId);

    if (commentIndex < 0) {
      return {
        status: 404,
        payload: {
          ok: false,
          error: "Comment not found.",
        },
      };
    }

    const targetComment = comments[commentIndex];

    if (String(targetComment.author?.email || "").toLowerCase() !== user.email) {
      return {
        status: 403,
        payload: {
          ok: false,
          error: "You can only edit your own comments.",
        },
      };
    }

    const mentions = extractMentions(body, users);
    const nextComments = comments.map((comment, index) =>
      index === commentIndex
        ? {
            ...comment,
            body,
            mentions,
            assets: sanitizeCommentAssets(comment.assets),
            editedAt: new Date().toISOString(),
          }
        : comment,
    );

    if (canUsePostgresCommentStore()) {
      await updateCommentRecord(project, page, nextComments[commentIndex]);
    } else {
      await writeComments(project, page, nextComments);
    }

    return {
      status: 200,
      payload: await buildCommentsPayload(project, page, user),
    };
  }

  if (action === "delete") {
    const commentId = String(payload.commentId || "").trim();

    if (!commentId) {
      return {
        status: 400,
        payload: {
          ok: false,
          error: "Comment ID is required.",
        },
      };
    }

    const comments = await readComments(project, page);
    const targetComment = comments.find((comment) => comment.id === commentId);

    if (!targetComment) {
      return {
        status: 404,
        payload: {
          ok: false,
          error: "Comment not found.",
        },
      };
    }

    const isOwner = String(targetComment.author?.email || "").toLowerCase() === user.email;
    const canDeleteAnyComment = await userHasPermission(user, "comments.delete_any");

    if (!isOwner && !canDeleteAnyComment) {
      return {
        status: 403,
        payload: {
          ok: false,
          error: "You do not have permission to delete this comment.",
        },
      };
    }

    const nextComments = comments.filter((comment) => comment.id !== commentId);
    if (canUsePostgresCommentStore()) {
      await deleteCommentRecord(project, page, commentId);
    } else {
      await writeComments(project, page, nextComments);
    }

    return {
      status: 200,
      payload: await buildCommentsPayload(project, page, user),
    };
  }

  if (action === "markseen") {
    const comments = await readComments(project, page);
    const requestedCommentId = String(payload.commentId || "").trim();
    const targetComment =
      comments.find((comment) => String(comment?.id || "").trim() === requestedCommentId) || comments.at(-1) || null;
    const seenState = {
      lastSeenCommentId: String(targetComment?.id || "").trim(),
      lastSeenAt: commentSeenTimestamp(targetComment),
      updatedAt: Date.now(),
    };

    await writeCommentViewState(project, page, user.email, seenState);

    return {
      status: 200,
      payload: {
        ok: true,
        project,
        page,
        ...seenState,
      },
    };
  }

  const body = sanitizeCommentBody(payload.body);

  const assets = sanitizeCommentAssets(payload.assets);

  if (!body && !assets.length) {
    return {
      status: 400,
      payload: {
        ok: false,
        error: "Add a comment or attach at least one file.",
      },
    };
  }

  const mentions = extractMentions(body, users);

  const nextComment = {
    id: crypto.randomUUID(),
    body,
    createdAt: new Date().toISOString(),
    author: {
      email: user.email,
      fullName: user.fullName,
      firstName: user.firstName,
      lastName: user.lastName,
    },
    mentions,
    assets,
  };

  const comments = await readComments(project, page);
  const nextComments = [...comments, nextComment];
  if (canUsePostgresCommentStore()) {
    await insertCommentRecord(project, page, nextComment);
  } else {
    await writeComments(project, page, nextComments);
  }
  await writeCommentViewState(project, page, user.email, {
    lastSeenCommentId: nextComment.id,
    lastSeenAt: commentSeenTimestamp(nextComment),
    updatedAt: Date.now(),
  });

  return {
    status: 200,
    payload: {
      ...(await buildCommentsPayload(project, page, user)),
      newCommentId: nextComment.id,
    },
  };
}

export { sendJson };
