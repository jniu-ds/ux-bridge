import crypto from "node:crypto";
import * as parse5 from "parse5";
import { ensureDurableStoreAvailable } from "./db/config.js";
import {
  canUsePostgresProjectStore,
  deleteProjectRecord,
  listProjectRecords,
  readProjectRecord,
  writeProjectRecord,
} from "./db/projects.js";
import {
  deleteRedisKeys,
  isRedisConfigured,
  isRedisRecoverableError,
  readRedisJson,
  redisCommand,
  writeRedisJson,
} from "./db/redis.js";
import { recordAuditEvent } from "./db/observability.js";
import {
  getAuthenticatedUser,
  getAuthenticatedUserRecord,
  isAllowedNuSkinEmail,
  listUserDirectory,
  normalizeEmail,
  readJsonBody,
  readUser,
  sendProjectInvitationEmail,
  sendJson,
  writeUser,
} from "./auth-store.js";
import { userHasPermission } from "./permissions-store.js";
import { ADMIN_ROLE } from "./roles.js";
import {
  buildPageFileMetadata,
  buildPagePreview,
  hydrateProjectPreviewFiles,
  normalizePagePreview,
  scaffoldProjectWorkspace,
  syncProjectWorkspaceMetadata,
} from "./project-files.js";
import {
  createProjectEditSessionWorkspace,
  ensureProjectWorkspaceRepository,
  getProjectEditSessionReview,
  mergeProjectEditSessionWorkspace,
} from "./project-session-worker.js";
import { generateVibePageResult, listVibeProviders, validateGeneratedVibePayload } from "./vibe-providers.js";

const PROJECTS_STORE_KEY = "__uxBridgeProjectsStore__";
const PROJECTS_INDEX_KEY = "ux-bridge:projects:index";
const PROJECT_KEY_PREFIX = "ux-bridge:project:";
const COMMENTS_KEY_PREFIX = "ux-bridge:comments:";
const LEGACY_BRAND_AFFILIATE_PROJECT_ID = "brand-affiliate-mobile";
const MAX_THUMBNAIL_LENGTH = 2_500_000;
const SHARE_MODE_INVITED = "invited";
const SHARE_MODE_ALL_USERS = "all-users";
const SHARE_MODE_LINK = "link";
const PROJECT_SHARE_MODES = [SHARE_MODE_INVITED, SHARE_MODE_ALL_USERS, SHARE_MODE_LINK];
const PROJECT_VISIBILITY_PRIVATE = "private";
const PROJECT_VISIBILITY_SHARED = "shared";
const PROJECT_VISIBILITIES = [PROJECT_VISIBILITY_PRIVATE, PROJECT_VISIBILITY_SHARED];
const PROJECT_ROLE_OWNER = "owner";
const PROJECT_ROLE_ADMIN = "admin";
const PROJECT_ROLE_CONTRIBUTOR = "contributor";
const PROJECT_ROLE_VIEWER = "viewer";
const PROJECT_MEMBER_ROLES = [PROJECT_ROLE_OWNER, PROJECT_ROLE_ADMIN, PROJECT_ROLE_CONTRIBUTOR, PROJECT_ROLE_VIEWER];
const PROJECT_MEMBER_STATUS_ACTIVE = "active";
const PROJECT_MEMBER_STATUS_PENDING = "pending";
const PROJECT_MEMBER_STATUS_REQUESTED = "requested";
const PROJECT_MEMBER_STATUSES = [
  PROJECT_MEMBER_STATUS_ACTIVE,
  PROJECT_MEMBER_STATUS_PENDING,
  PROJECT_MEMBER_STATUS_REQUESTED,
];
const CODEX_ACCESS_OWNER_ADMIN_ONLY = "owner_admin_only";
const CODEX_ACCESS_CONTRIBUTORS = "contributors";
const CODEX_ACCESS_ALL_MEMBERS = "all_members";
const PROJECT_CODEX_ACCESS_MODES = [
  CODEX_ACCESS_OWNER_ADMIN_ONLY,
  CODEX_ACCESS_CONTRIBUTORS,
  CODEX_ACCESS_ALL_MEMBERS,
];
const EDIT_SESSION_STATUS_ACTIVE = "active";
const EDIT_SESSION_STATUS_READY_FOR_REVIEW = "ready_for_review";
const EDIT_SESSION_STATUS_MERGED = "merged";
const EDIT_SESSION_STATUS_ARCHIVED = "archived";
const PROJECT_EDIT_SESSION_STATUSES = [
  EDIT_SESSION_STATUS_ACTIVE,
  EDIT_SESSION_STATUS_READY_FOR_REVIEW,
  EDIT_SESSION_STATUS_MERGED,
  EDIT_SESSION_STATUS_ARCHIVED,
];
const PAGE_LOCK_MODE_SOFT = "soft";
const DEFAULT_VIBE_PROVIDER_ID = "codex";
const VIBE_PROVIDER_IDS = new Set(["codex", "claude"]);
const MAX_CODEX_THREAD_MESSAGES = 120;
const VIBE_PRICING_BY_PROVIDER = {
  codex: {
    modelLabel: "gpt-5.1-codex",
    inputPerMillionUsd: 1.25,
    outputPerMillionUsd: 10.0,
  },
};
const DEFAULT_PROTOTYPE_LINK_TRANSITION = "dissolve";
const DEFAULT_PROTOTYPE_LINK_MATCHING_LAYER_EASING = "standard";
const DEFAULT_PROTOTYPE_LINK_MATCHING_LAYER_DURATION = 360;
const PROTOTYPE_LINK_MATCHING_LAYER_DURATION_MIN = 100;
const PROTOTYPE_LINK_MATCHING_LAYER_DURATION_MAX = 2000;
const PROTOTYPE_LINK_TRANSITIONS = new Set([
  "none",
  "dissolve",
  "slide-in-left",
  "slide-in-right",
  "slide-in-up",
  "slide-in-down",
  "slide-out-left",
  "slide-out-right",
  "slide-out-up",
  "slide-out-down",
  "push-left",
  "push-right",
  "push-up",
  "push-down",
  "scale",
]);
const PROTOTYPE_LINK_MATCHING_LAYER_EASINGS = new Set([
  "standard",
  "decelerate",
  "accelerate",
  "ease-in-out",
  "linear",
]);

function normalizePrototypeLinkTransition(value) {
  const normalized = String(value || "").trim().toLowerCase();
  if (normalized === "slide-left" || normalized === "slide-right" || normalized === "slide-up" || normalized === "slide-down") {
    return `slide-in-${normalized.slice("slide-".length)}`;
  }
  return PROTOTYPE_LINK_TRANSITIONS.has(normalized) ? normalized : DEFAULT_PROTOTYPE_LINK_TRANSITION;
}

function normalizePrototypeLinkAnimateMatchingLayers(value) {
  return value === true || String(value || "").trim().toLowerCase() === "true";
}

function normalizePrototypeLinkAnimateMatchingLayersEasing(value) {
  const normalized = String(value || "").trim().toLowerCase();
  return PROTOTYPE_LINK_MATCHING_LAYER_EASINGS.has(normalized)
    ? normalized
    : DEFAULT_PROTOTYPE_LINK_MATCHING_LAYER_EASING;
}

function normalizePrototypeLinkAnimateMatchingLayersDuration(value) {
  const numeric = Number.parseFloat(String(value ?? "").trim());
  if (!Number.isFinite(numeric)) {
    return DEFAULT_PROTOTYPE_LINK_MATCHING_LAYER_DURATION;
  }
  const clamped = Math.max(
    PROTOTYPE_LINK_MATCHING_LAYER_DURATION_MIN,
    Math.min(PROTOTYPE_LINK_MATCHING_LAYER_DURATION_MAX, numeric),
  );
  return Math.round(clamped);
}

function normalizeVibeProviderId(value) {
  const normalized = String(value || "").trim().toLowerCase();
  return VIBE_PROVIDER_IDS.has(normalized) ? normalized : DEFAULT_VIBE_PROVIDER_ID;
}

const LEGACY_BRAND_AFFILIATE_PROJECT = {
  id: LEGACY_BRAND_AFFILIATE_PROJECT_ID,
  name: "Brand Affiliate Mobile",
  kind: "dynamic",
  ownerEmail: "",
  ownerNameOverride: "UX Bridge",
  description:
    "Explore the Brand Affiliate mobile project, including the detailed page previews with live customizer controls.",
  hasOverview: true,
  sharingMode: SHARE_MODE_INVITED,
  shareToken: "brand-affiliate-share-token",
  memberEmails: [],
  pendingInviteEmails: [],
  accessRequestEmails: [],
  createdAt: 0,
  updatedAt: 0,
  launchUrl: "/project-overview.html",
  pages: [
    { id: "building", name: "Building", hasContent: true, launchUrl: "/building-preview.html" },
    { id: "l1-bonus", name: "L1 Bonus", hasContent: true, launchUrl: "/l1-bonus-preview.html" },
    { id: "l1-l2-bonus", name: "L1/L2 Bonus", hasContent: true, launchUrl: "/l1-l2-bonus-preview.html" },
  ],
};

const LEGACY_BRAND_AFFILIATE_PAGE_ROUTES = {
  building: "/building-preview.html",
  "l1-bonus": "/l1-bonus-preview.html",
  "l1-l2-bonus": "/l1-l2-bonus-preview.html",
};

const REDIS_ENABLED = isRedisConfigured();

function warnRedisProjectFallback(scope, error) {
  console.warn(`[projects] redis unavailable during ${scope}; falling back`, {
    message: error instanceof Error ? error.message : String(error),
  });
}

async function withRedisProjectFallback(scope, fallbackValue, operation) {
  try {
    return await operation();
  } catch (error) {
    if (!isRedisRecoverableError(error)) {
      throw error;
    }

    warnRedisProjectFallback(scope, error);
    return typeof fallbackValue === "function" ? await fallbackValue() : fallbackValue;
  }
}

function getMemoryStore() {
  if (!globalThis[PROJECTS_STORE_KEY]) {
    globalThis[PROJECTS_STORE_KEY] = new Map();
  }

  return globalThis[PROJECTS_STORE_KEY];
}

export function clearProjectRuntimeState() {
  globalThis[PROJECTS_STORE_KEY] = new Map();
}

function projectStoreKey(projectId) {
  return `${PROJECT_KEY_PREFIX}${projectId}`;
}

function normalizeLegacyProjectRecord(project) {
  if (!project || typeof project !== "object") {
    return project;
  }

  if (project.id !== LEGACY_BRAND_AFFILIATE_PROJECT_ID) {
    return project;
  }

  if (String(project.kind || "").trim().toLowerCase() === "dynamic") {
    return project;
  }

  return normalizeProjectRecord({
    ...project,
    kind: "dynamic",
    pages: Array.isArray(project.pages)
      ? project.pages.map((page) => {
          const pageId = String(page?.id || "").trim();
          if (!pageId || page.launchUrl) {
            return page;
          }

          const launchUrl = LEGACY_BRAND_AFFILIATE_PAGE_ROUTES[pageId];
          return launchUrl ? { ...page, launchUrl } : page;
        })
      : project.pages,
  });
}

function normalizeSharingMode(value) {
  const normalized = String(value || "").trim().toLowerCase();
  return PROJECT_SHARE_MODES.includes(normalized) ? normalized : SHARE_MODE_INVITED;
}

function normalizeEmailList(values) {
  const emails = Array.isArray(values) ? values : [];
  return [...new Set(emails.map((value) => normalizeEmail(value)).filter(Boolean))];
}

function normalizeProjectVisibility(value, sharingMode = SHARE_MODE_INVITED) {
  const normalized = String(value || "").trim().toLowerCase();

  if (PROJECT_VISIBILITIES.includes(normalized)) {
    return normalized;
  }

  return normalizeSharingMode(sharingMode) === SHARE_MODE_INVITED ? PROJECT_VISIBILITY_PRIVATE : PROJECT_VISIBILITY_SHARED;
}

function normalizeProjectRole(value, fallback = PROJECT_ROLE_VIEWER) {
  const normalized = String(value || "").trim().toLowerCase();
  return PROJECT_MEMBER_ROLES.includes(normalized) ? normalized : fallback;
}

function normalizeProjectMemberStatus(value, fallback = PROJECT_MEMBER_STATUS_ACTIVE) {
  const normalized = String(value || "").trim().toLowerCase();
  return PROJECT_MEMBER_STATUSES.includes(normalized) ? normalized : fallback;
}

function normalizeCodexAccessMode(value) {
  const normalized = String(value || "").trim().toLowerCase();
  return PROJECT_CODEX_ACCESS_MODES.includes(normalized) ? normalized : CODEX_ACCESS_CONTRIBUTORS;
}

function normalizeEditSessionStatus(value) {
  const normalized = String(value || "").trim().toLowerCase();
  return PROJECT_EDIT_SESSION_STATUSES.includes(normalized) ? normalized : EDIT_SESSION_STATUS_ACTIVE;
}

function createProjectCodexContext(projectId = "") {
  const base = normalizeProjectId(projectId) || crypto.randomUUID().slice(0, 8);
  return `codexctx_${base}_${crypto.randomUUID().slice(0, 8)}`;
}

function normalizeCodexThreadMessage(message) {
  const createdAt = Number(message?.createdAt) || Date.now();
  const role = String(message?.role || "system").trim().toLowerCase() || "system";
  const kind = String(message?.kind || role).trim().toLowerCase() || role;

  return {
    id: String(message?.id || crypto.randomUUID()).trim(),
    role,
    kind,
    userId: normalizeEmail(message?.userId),
    pageId: normalizePageId(message?.pageId),
    sessionId: String(message?.sessionId || "").trim(),
    content: String(message?.content || "").trim(),
    createdAt,
    metadata: message?.metadata && typeof message.metadata === "object" ? message.metadata : {},
  };
}

function createProjectCodexThread(project) {
  const normalizedProjectId = normalizeProjectId(project?.id) || crypto.randomUUID().slice(0, 8);
  const firstPageId = normalizePageId(project?.pages?.[0]?.id);

  return {
    id: `codexthread_${normalizedProjectId}`,
    activePageId: firstPageId,
    updatedAt: Number(project?.updatedAt || project?.createdAt) || Date.now(),
    messages: [],
  };
}

function normalizeProjectCodexThread(project) {
  const input = project?.codexThread && typeof project.codexThread === "object" ? project.codexThread : {};
  const fallback = createProjectCodexThread(project);
  const messages = Array.isArray(input.messages) ? input.messages.map((entry) => normalizeCodexThreadMessage(entry)).filter((entry) => entry.content) : [];

  return {
    id: String(input.id || fallback.id).trim() || fallback.id,
    activePageId: normalizePageId(input.activePageId) || fallback.activePageId,
    updatedAt: Number(input.updatedAt) || fallback.updatedAt,
    messages: messages
      .sort((left, right) => Number(left.createdAt || 0) - Number(right.createdAt || 0))
      .slice(-MAX_CODEX_THREAD_MESSAGES),
  };
}

function appendProjectCodexThreadMessage(project, message) {
  const nextThread = normalizeProjectCodexThread(project);
  const nextMessage = normalizeCodexThreadMessage(message);

  if (!nextMessage.content) {
    project.codexThread = nextThread;
    return nextThread;
  }

  nextThread.messages = [...nextThread.messages, nextMessage]
    .sort((left, right) => Number(left.createdAt || 0) - Number(right.createdAt || 0))
    .slice(-MAX_CODEX_THREAD_MESSAGES);
  nextThread.updatedAt = Number(nextMessage.createdAt || Date.now()) || Date.now();

  if (nextMessage.pageId) {
    nextThread.activePageId = nextMessage.pageId;
  }

  project.codexThread = nextThread;
  return nextThread;
}

function setProjectCodexActivePage(project, pageId) {
  const nextThread = normalizeProjectCodexThread(project);
  const normalizedPageId = normalizePageId(pageId);

  if (!normalizedPageId) {
    project.codexThread = nextThread;
    return nextThread;
  }

  nextThread.activePageId = normalizedPageId;
  nextThread.updatedAt = Date.now();
  project.codexThread = nextThread;
  return nextThread;
}

function createCodexThreadContent(message = "", pageName = "") {
  const trimmedMessage = String(message || "").trim();
  const trimmedPageName = String(pageName || "").trim();

  if (trimmedPageName && trimmedMessage) {
    return `${trimmedMessage} (${trimmedPageName})`;
  }

  return trimmedMessage || trimmedPageName;
}

function summarizeDesignTokenGroup(value) {
  if (!value || typeof value !== "object") {
    return 0;
  }

  return Object.keys(/** @type {Record<string, unknown>} */ (value)).length;
}

function buildProjectDesignSystemContext(project) {
  const designTokens = project?.designTokens && typeof project.designTokens === "object" ? project.designTokens : {};
  const tokenGroups = Object.entries(designTokens)
    .map(([group, value]) => ({
      group,
      count: summarizeDesignTokenGroup(value),
    }))
    .filter((entry) => entry.count > 0);
  const referencePages = (Array.isArray(project?.pages) ? project.pages : [])
    .map((page) => {
      const preview = normalizePagePreview(page?.preview || page?.vibe?.appliedDraft || page?.vibe?.lastDraft);

      if (!preview) {
        return null;
      }

      return {
        id: page.id,
        name: page.name,
        summary: preview.summary,
        providerLabel: preview.providerLabel,
      };
    })
    .filter(Boolean)
    .slice(0, 6);

  return {
    tokenGroups,
    prototypeLinkCount: Array.isArray(project?.prototypeLinks) ? project.prototypeLinks.length : 0,
    referencePages,
    guidance: [
      "Prefer existing UX Bridge patterns over inventing a brand-new visual language.",
      tokenGroups.length
        ? "Use the available design-token groups when deciding on color, spacing, and typography."
        : "No formal token groups are registered yet, so keep the styling restrained and consistent with existing applied pages.",
      referencePages.length
        ? "Match the visual tone and component rhythm of the reference pages already in this project."
        : "There are no applied reference pages yet, so keep the page structure mobile-first and lightweight.",
    ],
  };
}

function buildRecentCodexThreadContext(project, pageId = "") {
  const normalizedPageId = normalizePageId(pageId);
  const thread = normalizeProjectCodexThread(project);
  const recentMessages = thread.messages.slice(-16);
  const prioritized = [
    ...recentMessages.filter((message) => normalizedPageId && message.pageId === normalizedPageId),
    ...recentMessages.filter((message) => !normalizedPageId || message.pageId !== normalizedPageId),
  ];

  return prioritized.slice(-10).map((message) => ({
    role: message.role,
    kind: message.kind,
    pageId: message.pageId,
    sessionId: message.sessionId,
    userId: message.userId,
    content: message.content,
    createdAt: message.createdAt,
    assets: Array.isArray(message?.metadata?.assets)
      ? message.metadata.assets.map((asset) => ({
          id: String(asset?.id || "").trim(),
          fileName: String(asset?.fileName || "").trim(),
          kind: String(asset?.kind || "").trim(),
          contentType: String(asset?.contentType || "").trim(),
          sizeBytes: Number(asset?.sizeBytes || 0) || 0,
        }))
      : [],
  }));
}

function normalizeProjectMembers(project) {
  const members = new Map();
  const explicitMembers = Array.isArray(project?.projectMembers) ? project.projectMembers : [];

  for (const member of explicitMembers) {
    const email = normalizeEmail(member?.email);

    if (!email) {
      continue;
    }

    members.set(email, {
      email,
      role: normalizeProjectRole(member?.role),
      status: normalizeProjectMemberStatus(member?.status),
      joinedAt: Number(member?.joinedAt) || 0,
      invitedAt: Number(member?.invitedAt) || 0,
      requestedAt: Number(member?.requestedAt) || 0,
      addedBy: normalizeEmail(member?.addedBy),
    });
  }

  for (const email of normalizeEmailList(project?.memberEmails)) {
    if (!members.has(email)) {
      members.set(email, {
        email,
        role: PROJECT_ROLE_CONTRIBUTOR,
        status: PROJECT_MEMBER_STATUS_ACTIVE,
        joinedAt: Number(project?.updatedAt || project?.createdAt) || Date.now(),
        invitedAt: 0,
        requestedAt: 0,
        addedBy: normalizeEmail(project?.ownerEmail),
      });
    }
  }

  for (const email of normalizeEmailList(project?.pendingInviteEmails)) {
    if (!members.has(email)) {
      members.set(email, {
        email,
        role: PROJECT_ROLE_VIEWER,
        status: PROJECT_MEMBER_STATUS_PENDING,
        joinedAt: 0,
        invitedAt: Number(project?.updatedAt || project?.createdAt) || Date.now(),
        requestedAt: 0,
        addedBy: normalizeEmail(project?.ownerEmail),
      });
    }
  }

  for (const email of normalizeEmailList(project?.accessRequestEmails)) {
    if (!members.has(email)) {
      members.set(email, {
        email,
        role: PROJECT_ROLE_VIEWER,
        status: PROJECT_MEMBER_STATUS_REQUESTED,
        joinedAt: 0,
        invitedAt: 0,
        requestedAt: Number(project?.updatedAt || project?.createdAt) || Date.now(),
        addedBy: "",
      });
    }
  }

  const ownerEmail = normalizeEmail(project?.ownerEmail);

  if (ownerEmail) {
    members.set(ownerEmail, {
      email: ownerEmail,
      role: PROJECT_ROLE_OWNER,
      status: PROJECT_MEMBER_STATUS_ACTIVE,
      joinedAt: Number(project?.createdAt) || Date.now(),
      invitedAt: 0,
      requestedAt: 0,
      addedBy: ownerEmail,
    });
  }

  return Array.from(members.values()).sort((left, right) => {
    if (left.role === PROJECT_ROLE_OWNER) {
      return -1;
    }

    if (right.role === PROJECT_ROLE_OWNER) {
      return 1;
    }

    return left.email.localeCompare(right.email);
  });
}

function deriveLegacyMemberLists(projectMembers = [], ownerEmail = "") {
  const normalizedOwner = normalizeEmail(ownerEmail);
  const active = [];
  const pending = [];
  const requested = [];

  for (const member of projectMembers) {
    const email = normalizeEmail(member?.email);

    if (!email || email === normalizedOwner) {
      continue;
    }

    const status = normalizeProjectMemberStatus(member?.status);

    if (status === PROJECT_MEMBER_STATUS_ACTIVE) {
      active.push(email);
    } else if (status === PROJECT_MEMBER_STATUS_PENDING) {
      pending.push(email);
    } else if (status === PROJECT_MEMBER_STATUS_REQUESTED) {
      requested.push(email);
    }
  }

  return {
    memberEmails: normalizeEmailList(active),
    pendingInviteEmails: normalizeEmailList(pending),
    accessRequestEmails: normalizeEmailList(requested),
  };
}

function normalizePrototypeLinks(value) {
  const input = Array.isArray(value) ? value : [];

  return input
    .map((entry) => ({
      id: String(entry?.id || crypto.randomUUID()).trim(),
      label: String(entry?.label || "").trim() || "Prototype link",
      url: String(entry?.url || "").trim(),
      pageId: normalizePageId(entry?.pageId),
      sourcePageId: normalizePageId(entry?.sourcePageId),
      sourceLayerPath: String(entry?.sourceLayerPath || "").trim(),
      sourceLayerLabel: String(entry?.sourceLayerLabel || "").trim(),
      targetPageId: normalizePageId(entry?.targetPageId),
      targetPageName: String(entry?.targetPageName || "").trim(),
      transition: normalizePrototypeLinkTransition(entry?.transition),
      animateMatchingLayers: normalizePrototypeLinkAnimateMatchingLayers(entry?.animateMatchingLayers),
      animateMatchingLayersEasing: normalizePrototypeLinkAnimateMatchingLayersEasing(
        entry?.animateMatchingLayersEasing,
      ),
      animateMatchingLayersDuration: normalizePrototypeLinkAnimateMatchingLayersDuration(
        entry?.animateMatchingLayersDuration,
      ),
      createdAt: Number(entry?.createdAt) || 0,
      createdBy: normalizeEmail(entry?.createdBy),
    }))
    .filter((entry) => entry.url);
}

function normalizeEditSessions(value) {
  const input = Array.isArray(value) ? value : [];

  return input
    .map((entry) => ({
      id: String(entry?.id || crypto.randomUUID()).trim(),
      projectId: normalizeProjectId(entry?.projectId),
      userId: normalizeEmail(entry?.userId),
      pageId: normalizePageId(entry?.pageId),
      sessionCodexThreadId: String(entry?.sessionCodexThreadId || "").trim(),
      branchName: String(entry?.branchName || "").trim(),
      worktreePath: String(entry?.worktreePath || "").trim(),
      baseBranch: String(entry?.baseBranch || "main").trim() || "main",
      status: normalizeEditSessionStatus(entry?.status),
      createdAt: Number(entry?.createdAt) || 0,
      updatedAt: Number(entry?.updatedAt) || 0,
      source: String(entry?.source || "scaffold").trim().toLowerCase(),
      executionMode: String(entry?.executionMode || "metadata-only").trim().toLowerCase() || "metadata-only",
      mergedAt: Number(entry?.mergedAt) || 0,
      lastGitError: String(entry?.lastGitError || "").trim(),
    }))
    .filter((entry) => entry.id && entry.projectId && entry.userId);
}

function normalizePageLocks(value) {
  const input = Array.isArray(value) ? value : [];

  return input
    .map((entry) => ({
      id: String(entry?.id || crypto.randomUUID()).trim(),
      pageId: normalizePageId(entry?.pageId),
      lockedBy: normalizeEmail(entry?.lockedBy),
      sessionId: String(entry?.sessionId || "").trim(),
      mode: String(entry?.mode || PAGE_LOCK_MODE_SOFT).trim().toLowerCase() || PAGE_LOCK_MODE_SOFT,
      acquiredAt: Number(entry?.acquiredAt) || 0,
      expiresAt: Number(entry?.expiresAt) || 0,
    }))
    .filter((entry) => entry.pageId && entry.lockedBy);
}

function normalizeProjectRecord(project) {
  if (!project || typeof project !== "object") {
    return project;
  }

  const projectMembers = normalizeProjectMembers(project);
  const legacyMemberLists = deriveLegacyMemberLists(projectMembers, project.ownerEmail);
  const sharingMode = normalizeSharingMode(project.sharingMode);
  const visibility = normalizeProjectVisibility(project.visibility, sharingMode);
  const pageLocks = normalizePageLocks(project.pageLocks);
  const normalizedPages = Array.isArray(project.pages)
    ? project.pages.map((page) => {
        const normalizedPage = normalizeProjectPage(page, project.id);
        const pageLock = pageLocks.find((entry) => entry.pageId === normalizedPage.id) || null;
        return {
          ...normalizedPage,
          pageLock,
        };
      })
    : [];

  return {
    ...project,
    kind: String(project.kind || "dynamic").trim().toLowerCase() || "dynamic",
    sharingMode,
    visibility,
    codexContextId: String(project.codexContextId || createProjectCodexContext(project.id)).trim(),
    codexThread: normalizeProjectCodexThread(project),
    codexAccessMode: normalizeCodexAccessMode(project.codexAccessMode),
    shareToken: String(project.shareToken || crypto.randomUUID()).trim(),
    memberEmails: legacyMemberLists.memberEmails,
    pendingInviteEmails: legacyMemberLists.pendingInviteEmails,
    accessRequestEmails: legacyMemberLists.accessRequestEmails,
    ownerEmail: normalizeEmail(project.ownerEmail),
    projectMembers,
    prototypeLinks: normalizePrototypeLinks(project.prototypeLinks),
    editSessions: normalizeEditSessions(project.editSessions),
    pageLocks,
    designTokens: project.designTokens && typeof project.designTokens === "object" ? project.designTokens : {},
    pages: normalizedPages,
  };
}

function createDefaultVibeState() {
  return {
    providerId: DEFAULT_VIBE_PROVIDER_ID,
    viewportPreset: "mobile",
    prompt: "",
    includeProjectContext: true,
    includePageContext: true,
    status: "idle",
    summary: "",
    error: "",
    generatedAt: 0,
    appliedAt: 0,
    credentialMode: "organization-managed",
    availableVia: "server",
    lastDraft: null,
    appliedDraft: null,
    draftHistory: [],
  };
}

function normalizeVibeViewportPreset(value) {
  const normalized = String(value || "").trim().toLowerCase();

  if (
    normalized === "mobile" ||
    normalized === "tablet-portrait" ||
    normalized === "tablet-landscape" ||
    normalized === "desktop" ||
    normalized === "responsive"
  ) {
    return normalized;
  }

  return "mobile";
}

function buildVibeViewportContext(viewportPreset = "mobile") {
  const normalizedPreset = normalizeVibeViewportPreset(viewportPreset);

  if (normalizedPreset === "tablet-portrait") {
    return {
      id: normalizedPreset,
      label: "Tablet portrait",
      width: 768,
      height: 1024,
      orientation: "portrait",
    };
  }

  if (normalizedPreset === "tablet-landscape") {
    return {
      id: normalizedPreset,
      label: "Tablet landscape",
      width: 1024,
      height: 768,
      orientation: "landscape",
    };
  }

  if (normalizedPreset === "desktop") {
    return {
      id: normalizedPreset,
      label: "Desktop",
      width: 1440,
      height: 1024,
      orientation: "landscape",
    };
  }

  if (normalizedPreset === "responsive") {
    return {
      id: normalizedPreset,
      label: "Responsive",
      width: 1440,
      height: 900,
      orientation: "landscape",
      responsive: true,
    };
  }

  return {
    id: "mobile",
    label: "Mobile",
    width: 375,
    height: 812,
    orientation: "portrait",
  };
}

function normalizeVibeDraft(draft) {
  if (!draft || typeof draft !== "object") {
    return null;
  }

  return {
    providerId: normalizeVibeProviderId(draft.providerId || DEFAULT_VIBE_PROVIDER_ID),
    providerLabel: String(draft.providerLabel || "").trim(),
    summary: String(draft.summary || "").trim(),
    assistantMessage: String(draft.assistantMessage || "").trim(),
    html: String(draft.html || "").trim(),
    css: String(draft.css || "").trim(),
    stageStyle: String(draft.stageStyle || "").trim(),
    breakpointOverrides:
      draft.breakpointOverrides && typeof draft.breakpointOverrides === "object"
        ? { ...draft.breakpointOverrides }
        : {},
    generatedAt: Number(draft.generatedAt) || 0,
    assets: Array.isArray(draft.assets) ? draft.assets : [],
    credentialMode: String(draft.credentialMode || "organization-managed").trim().toLowerCase() || "organization-managed",
  };
}

function normalizeVibeState(vibe) {
  const base = createDefaultVibeState();
  const input = vibe && typeof vibe === "object" ? vibe : {};

  return {
    ...base,
    providerId: normalizeVibeProviderId(input.providerId || base.providerId),
    viewportPreset: normalizeVibeViewportPreset(input.viewportPreset || base.viewportPreset),
    prompt: String(input.prompt || "").trim(),
    includeProjectContext: input.includeProjectContext !== false,
    includePageContext: input.includePageContext !== false,
    status: String(input.status || base.status).trim().toLowerCase() || base.status,
    summary: String(input.summary || "").trim(),
    error: String(input.error || "").trim(),
    generatedAt: Number(input.generatedAt) || 0,
    appliedAt: Number(input.appliedAt) || 0,
    credentialMode: String(input.credentialMode || base.credentialMode).trim().toLowerCase() || base.credentialMode,
    availableVia: String(input.availableVia || base.availableVia).trim().toLowerCase() || base.availableVia,
    lastDraft: normalizeVibeDraft(input.lastDraft),
    appliedDraft: normalizeVibeDraft(input.appliedDraft),
    draftHistory: Array.isArray(input.draftHistory)
      ? input.draftHistory.map((entry) => normalizeVibeDraft(entry)).filter(Boolean)
      : [],
  };
}

function normalizeSelectedLayerContext(input) {
  const pathKey = String(input?.pathKey || "").trim();

  if (!pathKey || pathKey === "__screen__") {
    return null;
  }

  return {
    pageId: String(input?.pageId || "").trim(),
    pathKey,
    label: String(input?.label || "").trim(),
    tagName: String(input?.tagName || "").trim().toLowerCase(),
    textSummary: String(input?.textSummary || "").trim(),
    html: String(input?.html || "").trim(),
  };
}

function parseLayerPathKey(value = "") {
  return String(value || "")
    .split(".")
    .map((segment) => Number.parseInt(segment, 10))
    .filter((segment) => Number.isInteger(segment) && segment >= 0);
}

function isParse5ElementNode(node) {
  return Boolean(node && typeof node.nodeName === "string" && !String(node.nodeName).startsWith("#"));
}

function getParse5ElementChildren(node) {
  return Array.isArray(node?.childNodes) ? node.childNodes.filter((child) => isParse5ElementNode(child)) : [];
}

function getMeaningfulFragmentChildNodes(fragment) {
  return Array.isArray(fragment?.childNodes)
    ? fragment.childNodes.filter((child) => {
        if (isParse5ElementNode(child)) {
          return true;
        }

        if (child?.nodeName === "#text") {
          return String(child.value || "").trim().length > 0;
        }

        return false;
      })
    : [];
}

function resolveParse5NodeByLayerPath(fragment, pathKey = "") {
  const path = parseLayerPathKey(pathKey);
  let parent = fragment;
  let current = null;

  for (const segment of path) {
    const children = getParse5ElementChildren(parent);
    current = children[segment] || null;

    if (!current) {
      return null;
    }

    parent = current;
  }

  if (!current) {
    return null;
  }

  return {
    node: current,
    parent: current.parentNode || null,
  };
}

function replaceSelectedLayerHtmlByPath(currentHtml = "", pathKey = "", replacementHtml = "", layerLabel = "selected layer") {
  const html = String(currentHtml || "").trim();
  const replacement = String(replacementHtml || "").trim();

  if (!html || !pathKey || !replacement) {
    throw new Error(`Unable to update the ${layerLabel}.`);
  }

  const fragment = parse5.parseFragment(html);
  const target = resolveParse5NodeByLayerPath(fragment, pathKey);

  if (!target?.node || !target?.parent || !Array.isArray(target.parent.childNodes)) {
    throw new Error(`The saved page source no longer matches the selected ${layerLabel}. Try refreshing and selecting the layer again.`);
  }

  const replacementFragment = parse5.parseFragment(replacement);
  const replacementNodes = getMeaningfulFragmentChildNodes(replacementFragment);
  const replacementElementNodes = replacementNodes.filter((node) => isParse5ElementNode(node));

  if (replacementElementNodes.length !== 1) {
    throw new Error(`The generated ${layerLabel} update must return exactly one root element.`);
  }

  const targetIndex = target.parent.childNodes.indexOf(target.node);

  if (targetIndex < 0) {
    throw new Error(`Unable to replace the selected ${layerLabel} in the current page source.`);
  }

  replacementNodes.forEach((node) => {
    node.parentNode = target.parent;
  });
  target.parent.childNodes.splice(targetIndex, 1, ...replacementNodes);
  return parse5.serialize(fragment).trim();
}

function mergeSelectedLayerCssPatch(currentCss = "", cssPatch = "", pathKey = "") {
  const baseCss = String(currentCss || "").trim();
  const patchCss = String(cssPatch || "").trim();
  const normalizedPathKey = String(pathKey || "").trim();

  if (!normalizedPathKey) {
    return patchCss || baseCss;
  }

  const startMarker = `/* uxbridge-vibe-layer:${normalizedPathKey}:start */`;
  const endMarker = `/* uxbridge-vibe-layer:${normalizedPathKey}:end */`;
  const markerPattern = new RegExp(`${escapeRegExp(startMarker)}[\\s\\S]*?${escapeRegExp(endMarker)}\\s*`, "g");
  const cleanedBase = baseCss.replace(markerPattern, "").trim();

  if (!patchCss) {
    return cleanedBase;
  }

  return [cleanedBase, `${startMarker}\n${patchCss}\n${endMarker}`].filter(Boolean).join("\n\n");
}

function countHtmlFragmentRoots(html = "") {
  const fragment = parse5.parseFragment(String(html || "").trim());
  return getMeaningfulFragmentChildNodes(fragment).filter((node) => isParse5ElementNode(node)).length;
}

function buildVibeVerificationSummary({
  selectedLayer = null,
  currentPreviewSource = null,
  generatedHtml = "",
  generatedCss = "",
  appliedHtml = "",
  appliedCss = "",
  includeProjectContext = true,
  includePageContext = true,
  providerId = DEFAULT_VIBE_PROVIDER_ID,
} = {}) {
  const inputHtml = selectedLayer ? String(selectedLayer?.html || "").trim() : String(currentPreviewSource?.html || "").trim();
  const inputCss = String(currentPreviewSource?.css || "").trim();
  const returnedHtml = String(generatedHtml || "").trim();
  const returnedCss = String(generatedCss || "").trim();
  const nextAppliedHtml = String(appliedHtml || "").trim();
  const nextAppliedCss = String(appliedCss || "").trim();
  const normalizedProviderId = normalizeVibeProviderId(providerId);
  const pricing = VIBE_PRICING_BY_PROVIDER[normalizedProviderId] || null;
  const estimatedInputTokens = Math.max(0, Math.round((inputHtml.length + inputCss.length) / 4));
  const estimatedOutputTokens = Math.max(0, Math.round((returnedHtml.length + returnedCss.length) / 4));
  const estimatedInputCostUsd = pricing
    ? (estimatedInputTokens / 1_000_000) * Number(pricing.inputPerMillionUsd || 0)
    : null;
  const estimatedOutputCostUsd = pricing
    ? (estimatedOutputTokens / 1_000_000) * Number(pricing.outputPerMillionUsd || 0)
    : null;
  const estimatedTotalCostUsd =
    estimatedInputCostUsd !== null && estimatedOutputCostUsd !== null
      ? estimatedInputCostUsd + estimatedOutputCostUsd
      : null;

  return {
    mode: selectedLayer ? "selected-layer" : "page",
    providerId: normalizedProviderId,
    providerModel: pricing?.modelLabel || "",
    targetLabel: selectedLayer ? String(selectedLayer?.label || "Selected layer").trim() || "Selected layer" : "Full page",
    targetPath: selectedLayer ? String(selectedLayer?.pathKey || "").trim() : "",
    includeProjectContext: includeProjectContext !== false,
    includePageContext: includePageContext !== false,
    inputHtmlChars: inputHtml.length,
    inputCssChars: inputCss.length,
    returnedHtmlChars: returnedHtml.length,
    returnedCssChars: returnedCss.length,
    returnedRootElements: returnedHtml ? countHtmlFragmentRoots(returnedHtml) : 0,
    appliedHtmlChars: nextAppliedHtml.length,
    appliedCssChars: nextAppliedCss.length,
    htmlDeltaChars: returnedHtml.length - inputHtml.length,
    cssDeltaChars: returnedCss.length - inputCss.length,
    estimatedInputTokens,
    estimatedOutputTokens,
    estimatedInputCostUsd,
    estimatedOutputCostUsd,
    estimatedTotalCostUsd,
  };
}

function mergeVibeDraftHistory(currentHistory, lastDraft, nextDraft) {
  const history = [nextDraft, lastDraft, ...(Array.isArray(currentHistory) ? currentHistory : [])]
    .map((entry) => normalizeVibeDraft(entry))
    .filter((entry) => entry?.html && entry?.css);
  const deduped = [];
  const seen = new Set();

  for (const entry of history) {
    const signature = `${entry.generatedAt}:${entry.providerId}:${entry.summary}`;

    if (seen.has(signature)) {
      continue;
    }

    seen.add(signature);
    deduped.push(entry);
  }

  return deduped
    .sort((left, right) => Number(right.generatedAt || 0) - Number(left.generatedAt || 0))
    .slice(0, 12);
}

function findVibeDraftByGeneratedAt(vibe, generatedAt) {
  const target = Number(generatedAt) || 0;
  const drafts = [normalizeVibeDraft(vibe?.lastDraft), ...(Array.isArray(vibe?.draftHistory) ? vibe.draftHistory : [])]
    .map((entry) => normalizeVibeDraft(entry))
    .filter(Boolean);

  return drafts.find((entry) => Number(entry.generatedAt || 0) === target) || null;
}

function normalizeProjectPage(page, projectId = "") {
  const normalizedPage = page && typeof page === "object" ? { ...page } : {};
  const pageId = String(normalizedPage.id || "").trim();
  const fileSlug = String(normalizedPage.fileSlug || "").trim();
  const files = buildPageFileMetadata(projectId, {
    ...normalizedPage,
    id: pageId,
    fileSlug,
  });

  return {
    ...normalizedPage,
    id: pageId,
    name: String(normalizedPage.name || "").trim() || "Untitled Page",
    hasContent: Boolean(normalizedPage.hasContent || normalizedPage?.vibe?.appliedDraft?.html),
    createdAt: Number(normalizedPage.createdAt) || 0,
    fileSlug: files.fileSlug,
    files,
    preview: normalizePagePreview(normalizedPage.preview),
    launchUrl:
      String(normalizedPage.launchUrl || "").trim() ||
      (projectId && pageId ? buildDynamicPageLaunchUrl(projectId, pageId) : ""),
    vibe: normalizeVibeState(normalizedPage.vibe),
  };
}

async function readIndex() {
  ensureDurableStoreAvailable("project records");
  if (canUsePostgresProjectStore()) {
    const projectIds = new Set(
      (await listProjectRecords())
        .map((project) => String(project?.id || "").trim())
        .filter(Boolean),
    );

    if (!REDIS_ENABLED) {
      Array.from(getMemoryStore().keys()).forEach((projectId) => {
        if (projectId) {
          projectIds.add(projectId);
        }
      });
    } else {
      const fallbackIndex = await withRedisProjectFallback(
        "readIndex:fallbackIndex",
        [],
        async () => (await readRedisJson(PROJECTS_INDEX_KEY)) || [],
      );
      fallbackIndex.forEach((projectId) => {
        const normalizedProjectId = String(projectId || "").trim();
        if (normalizedProjectId) {
          projectIds.add(normalizedProjectId);
        }
      });
    }

    return Array.from(projectIds);
  }

  if (!REDIS_ENABLED) {
    return Array.from(getMemoryStore().keys());
  }

  return await withRedisProjectFallback(
    "readIndex",
    () => Array.from(getMemoryStore().keys()),
    async () => (await readRedisJson(PROJECTS_INDEX_KEY)) || [],
  );
}

async function writeIndex(projectIds) {
  ensureDurableStoreAvailable("project records");
  if (canUsePostgresProjectStore()) {
    return;
  }

  const next = Array.from(new Set(projectIds));

  if (!REDIS_ENABLED) {
    const store = getMemoryStore();
    Array.from(store.keys()).forEach((key) => {
      if (!next.includes(key)) {
        store.delete(key);
      }
    });
    return;
  }

  await withRedisProjectFallback("writeIndex", null, () => writeRedisJson(PROJECTS_INDEX_KEY, next));
}

async function readDynamicProject(projectId) {
  ensureDurableStoreAvailable("project records");
  if (canUsePostgresProjectStore()) {
    const project = await readProjectRecord(projectId);

    if (project) {
      return hydrateProjectPreviewFiles(normalizeProjectRecord(normalizeLegacyProjectRecord(project)));
    }
  }

  if (!REDIS_ENABLED) {
    return hydrateProjectPreviewFiles(normalizeProjectRecord(normalizeLegacyProjectRecord(getMemoryStore().get(projectId) || null)));
  }

  const value = await withRedisProjectFallback(
    "readDynamicProject",
    () => getMemoryStore().get(projectId) || null,
    () => readRedisJson(projectStoreKey(projectId)),
  );
  return value ? hydrateProjectPreviewFiles(normalizeProjectRecord(normalizeLegacyProjectRecord(value))) : null;
}

async function writeDynamicProject(project) {
  ensureDurableStoreAvailable("project records");
  const normalizedProject = normalizeProjectRecord(project);

  if (canUsePostgresProjectStore()) {
    await writeProjectRecord(normalizedProject);
    return;
  }

  if (!REDIS_ENABLED) {
    getMemoryStore().set(normalizedProject.id, normalizedProject);
  } else {
    await withRedisProjectFallback(
      "writeDynamicProject",
      null,
      () => writeRedisJson(projectStoreKey(normalizedProject.id), normalizedProject),
    );
    getMemoryStore().set(normalizedProject.id, normalizedProject);
  }

  const index = await readIndex();
  await writeIndex([...index, normalizedProject.id]);
}

async function deleteDynamicProject(project) {
  ensureDurableStoreAvailable("project records");
  if (!project) {
    return;
  }

  if (canUsePostgresProjectStore()) {
    await deleteProjectRecord(project.id);
  }

  if (!REDIS_ENABLED) {
    const store = getMemoryStore();
    store.delete(project.id);
  } else {
    await withRedisProjectFallback("deleteDynamicProject", null, async () => {
      await deleteRedisKeys(projectStoreKey(project.id));

      const commentKeys = Array.isArray(project.pages)
        ? project.pages.map((page) => `${COMMENTS_KEY_PREFIX}${project.id}:${page.id}`)
        : [];

      if (commentKeys.length) {
        await deleteRedisKeys(...commentKeys);
      }
    });
  }

  const index = await readIndex();
  await writeIndex(index.filter((projectId) => projectId !== project.id));
}

function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

function normalizeProjectId(value) {
  return slugify(value);
}

function normalizePageId(value) {
  return slugify(value);
}

function buildDynamicPageLaunchUrl(projectId, pageId) {
  const params = new URLSearchParams({
    project: projectId,
    page: pageId,
  });

  return `/workspace-page.html?${params.toString()}`;
}

function buildThumbnailUrl(url) {
  const nextUrl = new URL(url, "http://uxbridge.local");
  nextUrl.searchParams.set("table-thumb", "1");
  return `${nextUrl.pathname}${nextUrl.search}`;
}

function sanitizeThumbnailDataUrl(value) {
  const input = String(value || "").trim();

  if (!input) {
    throw new Error("Thumbnail image data is required.");
  }

  if (input.length > MAX_THUMBNAIL_LENGTH) {
    throw new Error("Thumbnail image is too large.");
  }

  if (!/^data:image\/(?:png|jpeg|jpg|webp);base64,[a-z0-9+/=]+$/i.test(input)) {
    throw new Error("Choose a valid thumbnail image.");
  }

  return input;
}

function getRequestOrigin(req) {
  const protocolHeader = String(req.headers["x-forwarded-proto"] || "");
  const protocol = protocolHeader.includes("https") ? "https" : "http";
  const host = String(req.headers["x-forwarded-host"] || req.headers.host || "localhost:4173");
  return `${protocol}://${host}`;
}

export async function getProjectStructureById(projectId) {
  const normalizedProjectId = normalizeProjectId(projectId) || projectId;
  return readDynamicProject(normalizedProjectId);
}

async function userHasGlobalProjectAccess(user) {
  return userHasPermission(user, "projects.access_all");
}

function userIsAdmin(user) {
  return String(user?.role || "").trim() === ADMIN_ROLE;
}

async function userCanManageProjectIdentity(user, project) {
  const email = normalizeEmail(user?.email);

  if (!project || !email) {
    return false;
  }

  return (await userHasPermission(user, "projects.manage_identity_all")) || email === normalizeEmail(project.ownerEmail);
}

async function userCanManageProjectSharing(user, project) {
  const email = normalizeEmail(user?.email);
  if (!email || !project) {
    return false;
  }

  const memberRole = normalizeProjectRole(findProjectMember(project, email)?.role, PROJECT_ROLE_VIEWER);
  return (
    (await userHasPermission(user, "projects.manage_sharing_all")) ||
    email === normalizeEmail(project.ownerEmail) ||
    memberRole === PROJECT_ROLE_ADMIN
  );
}

async function userCanInviteToProject(user, project) {
  const email = normalizeEmail(user?.email);

  if (!email || !project) {
    return false;
  }

  return (await computeProjectAccess(user, project)).hasAccess;
}

async function userCanManageProjectPages(user, project) {
  const access = await computeProjectAccess(user, project);

  if (!access.hasAccess) {
    return false;
  }

  if (access.hasGlobalAccess || access.isOwner) {
    return true;
  }

  return access.projectRole === PROJECT_ROLE_ADMIN || access.projectRole === PROJECT_ROLE_CONTRIBUTOR;
}

function findProjectMember(project, email) {
  const normalizedEmail = normalizeEmail(email);

  if (!normalizedEmail) {
    return null;
  }

  return normalizeProjectMembers(project).find((member) => member.email === normalizedEmail) || null;
}

function syncProjectMembershipState(project) {
  const normalizedMembers = normalizeProjectMembers(project);
  const legacyMemberLists = deriveLegacyMemberLists(normalizedMembers, project.ownerEmail);

  project.projectMembers = normalizedMembers;
  project.memberEmails = legacyMemberLists.memberEmails;
  project.pendingInviteEmails = legacyMemberLists.pendingInviteEmails;
  project.accessRequestEmails = legacyMemberLists.accessRequestEmails;
  return project;
}

function upsertProjectMember(project, email, updates = {}) {
  const normalizedEmail = normalizeEmail(email);

  if (!normalizedEmail) {
    return project;
  }

  const members = normalizeProjectMembers(project);
  const existing = members.find((member) => member.email === normalizedEmail);
  const now = Date.now();
  const nextMember = {
    email: normalizedEmail,
    role: normalizeProjectRole(updates.role, existing?.role || PROJECT_ROLE_VIEWER),
    status: normalizeProjectMemberStatus(updates.status, existing?.status || PROJECT_MEMBER_STATUS_ACTIVE),
    joinedAt: Number(updates.joinedAt) || existing?.joinedAt || 0,
    invitedAt: Number(updates.invitedAt) || existing?.invitedAt || 0,
    requestedAt: Number(updates.requestedAt) || existing?.requestedAt || 0,
    addedBy: normalizeEmail(updates.addedBy) || existing?.addedBy || "",
  };

  if (nextMember.status === PROJECT_MEMBER_STATUS_ACTIVE && !nextMember.joinedAt) {
    nextMember.joinedAt = now;
  }

  if (nextMember.status === PROJECT_MEMBER_STATUS_PENDING && !nextMember.invitedAt) {
    nextMember.invitedAt = now;
  }

  if (nextMember.status === PROJECT_MEMBER_STATUS_REQUESTED && !nextMember.requestedAt) {
    nextMember.requestedAt = now;
  }

  project.projectMembers = [
    ...members.filter((member) => member.email !== normalizedEmail),
    nextMember,
  ];
  return syncProjectMembershipState(project);
}

function removeProjectMember(project, email) {
  const normalizedEmail = normalizeEmail(email);

  if (!normalizedEmail) {
    return project;
  }

  project.projectMembers = normalizeProjectMembers(project).filter((member) => member.email !== normalizedEmail);
  return syncProjectMembershipState(project);
}

async function computeProjectAccess(user, project) {
  const email = normalizeEmail(user?.email);
  const isOwner = email && email === normalizeEmail(project.ownerEmail);
  const hasGlobalAccess = await userHasGlobalProjectAccess(user);
  const sharingMode = normalizeSharingMode(project.sharingMode);
  const memberRecord = email ? findProjectMember(project, email) : null;
  const isMember = Boolean(memberRecord?.status === PROJECT_MEMBER_STATUS_ACTIVE);
  const isPendingInvite = Boolean(memberRecord?.status === PROJECT_MEMBER_STATUS_PENDING);
  const requestPending = Boolean(memberRecord?.status === PROJECT_MEMBER_STATUS_REQUESTED);
  const allCurrentUsers = sharingMode === SHARE_MODE_ALL_USERS;
  const hasAccess = Boolean(hasGlobalAccess || isOwner || isMember || allCurrentUsers);
  const projectRole = isOwner
    ? PROJECT_ROLE_OWNER
    : hasGlobalAccess
      ? PROJECT_ROLE_ADMIN
      : normalizeProjectRole(memberRecord?.role, PROJECT_ROLE_VIEWER);

  return {
    sharingMode,
    hasAccess,
    isOwner,
    hasGlobalAccess,
    isMember,
    isPendingInvite,
    requestPending,
    projectRole,
    canInvite: hasAccess,
    canManageSharing: await userCanManageProjectSharing(user, project),
  };
}

async function userCanCreateEditSession(user, project) {
  const access = await computeProjectAccess(user, project);

  if (!access.hasAccess) {
    return false;
  }

  if (access.hasGlobalAccess || access.isOwner) {
    return true;
  }

  const codexAccessMode = normalizeCodexAccessMode(project.codexAccessMode);
  const role = access.projectRole;

  if (codexAccessMode === CODEX_ACCESS_OWNER_ADMIN_ONLY) {
    return role === PROJECT_ROLE_ADMIN;
  }

  if (codexAccessMode === CODEX_ACCESS_CONTRIBUTORS) {
    return role === PROJECT_ROLE_ADMIN || role === PROJECT_ROLE_CONTRIBUTOR;
  }

  return access.hasAccess;
}

function createEditSessionRecord(project, user, pageId = "", source = "scaffold") {
  const timestamp = Date.now();
  const userSlug = slugify(String(user?.fullName || user?.email || "editor").split("@")[0]) || "editor";
  const pageSlug = normalizePageId(pageId) || "project";
  const branchSuffix = `${timestamp}-${crypto.randomUUID().slice(0, 6)}`;

  return {
    id: crypto.randomUUID(),
    projectId: project.id,
    userId: normalizeEmail(user?.email),
    pageId: normalizePageId(pageId),
    sessionCodexThreadId: `codexthread_${project.id}_${crypto.randomUUID().slice(0, 8)}`,
    branchName: `codex/${project.id}/${pageSlug}/${userSlug}-${branchSuffix}`,
    worktreePath: "",
    baseBranch: "main",
    status: EDIT_SESSION_STATUS_ACTIVE,
    createdAt: timestamp,
    updatedAt: timestamp,
    source: String(source || "scaffold").trim().toLowerCase() || "scaffold",
    executionMode: "metadata-only",
    mergedAt: 0,
    lastGitError: "",
  };
}

function createPageLockRecord(pageId, user, sessionId) {
  const acquiredAt = Date.now();

  return {
    id: crypto.randomUUID(),
    pageId: normalizePageId(pageId),
    lockedBy: normalizeEmail(user?.email),
    sessionId: String(sessionId || "").trim(),
    mode: PAGE_LOCK_MODE_SOFT,
    acquiredAt,
    expiresAt: acquiredAt + 1000 * 60 * 30,
  };
}

function isOpenEditSessionStatus(value) {
  const status = normalizeEditSessionStatus(value);
  return status === EDIT_SESSION_STATUS_ACTIVE || status === EDIT_SESSION_STATUS_READY_FOR_REVIEW;
}

async function userCanManageEditSession(user, project, session) {
  if (!session) {
    return false;
  }

  if (await userCanManageProjectSharing(user, project)) {
    return true;
  }

  return normalizeEmail(session.userId) === normalizeEmail(user?.email);
}

function isRecoverableWorkspaceError(error) {
  const errorCode = typeof error?.code === "string" ? error.code : "";
  return errorCode === "ENOENT" || errorCode === "EROFS" || errorCode === "EPERM" || errorCode === "EACCES";
}

async function persistProject(project, options = {}) {
  let nextProject = normalizeProjectRecord(project);

  try {
    if (options.scaffoldWorkspace) {
      nextProject = normalizeProjectRecord(
        await scaffoldProjectWorkspace(nextProject, {
          overwrite: options.overwriteWorkspaceFiles === true,
        }),
      );
    } else if (options.syncWorkspace) {
      nextProject = normalizeProjectRecord(await syncProjectWorkspaceMetadata(nextProject));
    }
  } catch (error) {
    if (!isRecoverableWorkspaceError(error)) {
      throw error;
    }
  }

  await writeDynamicProject(nextProject);
  return nextProject;
}

function decodeHtmlAttributeEntities(value = "") {
  return String(value || "")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

function encodeHtmlAttributeEntities(value = "") {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function doesBackgroundConfigReferenceAsset(config, asset) {
  if (!config || typeof config !== "object" || !asset) {
    return false;
  }

  const normalizedAssetId = String(asset.id || "").trim();
  const normalizedBlobUrl = String(asset.blobUrl || "").trim();
  const normalizedDownloadUrl = String(asset.downloadUrl || "").trim();
  const normalizedConfigAssetId = String(config.assetId || "").trim();
  const normalizedConfigUrl = String(config.url || "").trim();

  return Boolean(
    (normalizedAssetId && normalizedConfigAssetId === normalizedAssetId) ||
      (normalizedBlobUrl && normalizedConfigUrl === normalizedBlobUrl) ||
      (normalizedDownloadUrl && normalizedConfigUrl === normalizedDownloadUrl),
  );
}

function scrubAssetFromBackgroundMemoryValue(value = "", asset) {
  const decoded = decodeHtmlAttributeEntities(value);

  try {
    const parsed = JSON.parse(decoded);

    if (!parsed || typeof parsed !== "object") {
      return { value, changed: false };
    }

    const nextParsed = { ...parsed };
    let changed = false;

    for (const key of ["image", "video"]) {
      if (doesBackgroundConfigReferenceAsset(nextParsed[key], asset)) {
        delete nextParsed[key];
        changed = true;
      }
    }

    if (!changed) {
      return { value, changed: false };
    }

    if (!Object.keys(nextParsed).length) {
      return { value: "", changed: true };
    }

    return { value: encodeHtmlAttributeEntities(JSON.stringify(nextParsed)), changed: true };
  } catch {
    return { value, changed: false };
  }
}

function scrubAssetFromBackgroundConfigValue(value = "", asset) {
  const decoded = decodeHtmlAttributeEntities(value);

  try {
    const parsed = JSON.parse(decoded);
    if (!doesBackgroundConfigReferenceAsset(parsed, asset)) {
      return { value, changed: false };
    }

    return { value: "", changed: true };
  } catch {
    return { value, changed: false };
  }
}

function escapeRegExp(value = "") {
  return String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function scrubAssetReferencesFromHtml(html = "", asset) {
  const input = String(html || "");

  if (!input) {
    return { html: input, changed: false };
  }

  let nextHtml = input;
  let changed = false;

  nextHtml = nextHtml.replace(/\sdata-ux-background-config=(["'])([\s\S]*?)\1/gi, (match, quote, value) => {
    const scrubbed = scrubAssetFromBackgroundConfigValue(value, asset);
    if (!scrubbed.changed) {
      return match;
    }
    changed = true;
    return scrubbed.value ? ` data-ux-background-config=${quote}${scrubbed.value}${quote}` : "";
  });

  nextHtml = nextHtml.replace(/\sdata-ux-background-media-memory=(["'])([\s\S]*?)\1/gi, (match, quote, value) => {
    const scrubbed = scrubAssetFromBackgroundMemoryValue(value, asset);
    if (!scrubbed.changed) {
      return match;
    }
    changed = true;
    return scrubbed.value ? ` data-ux-background-media-memory=${quote}${scrubbed.value}${quote}` : "";
  });

  const assetUrls = [String(asset?.blobUrl || "").trim(), String(asset?.downloadUrl || "").trim()].filter(Boolean);

  for (const assetUrl of assetUrls) {
    const escapedUrl = escapeRegExp(assetUrl);
    nextHtml = nextHtml.replace(
      new RegExp(`<div[^>]*data-ux-background-video-wrap[^>]*>[\\s\\S]*?<video[^>]*src=(["'])${escapedUrl}\\1[^>]*>[\\s\\S]*?<\\/video>[\\s\\S]*?<\\/div>`, "gi"),
      () => {
        changed = true;
        return "";
      },
    );

    nextHtml = nextHtml.replace(/\sdata-ux-background-video(?:=(["']).*?\1)?/gi, (match) => {
      changed = true;
      return "";
    });

    nextHtml = nextHtml.replace(/\sstyle=(["'])([\s\S]*?)\1/gi, (match, quote, value) => {
      if (!value.includes(assetUrl)) {
        return match;
      }

      let nextStyle = String(value || "");
      const styleBefore = nextStyle;
      nextStyle = nextStyle.replace(new RegExp(`background-image\\s*:\\s*url\\((["'])?${escapedUrl}\\1?\\)\\s*;?`, "gi"), "");
      nextStyle = nextStyle.replace(new RegExp(`background\\s*:\\s*url\\((["'])?${escapedUrl}\\1?\\)\\s*[^;"']*;?`, "gi"), "");
      nextStyle = nextStyle.trim().replace(/;;+/g, ";").replace(/^\s*;\s*|\s*;\s*$/g, "");

      if (nextStyle === styleBefore) {
        return match;
      }

      changed = true;
      return nextStyle ? ` style=${quote}${nextStyle}${quote}` : "";
    });
  }

  return { html: nextHtml, changed };
}

function scrubAssetReferencesFromDraft(draft, asset, updatedAt) {
  const normalizedDraft = normalizeVibeDraft(draft);

  if (!normalizedDraft?.html) {
    return { draft: normalizedDraft, changed: false };
  }

  const scrubbed = scrubAssetReferencesFromHtml(normalizedDraft.html, asset);

  if (!scrubbed.changed) {
    return { draft: normalizedDraft, changed: false };
  }

  return {
    draft: normalizeVibeDraft({
      ...normalizedDraft,
      html: scrubbed.html,
      generatedAt: Number(normalizedDraft.generatedAt) || updatedAt,
    }),
    changed: true,
  };
}

export async function removeAssetReferencesFromProjectPages(projectId, asset) {
  const normalizedProjectId = normalizeProjectId(projectId);
  const normalizedAssetId = String(asset?.id || "").trim();

  if (!normalizedProjectId || !normalizedAssetId) {
    return false;
  }

  const project = await readDynamicProject(normalizedProjectId);

  if (!project) {
    return false;
  }

  let changed = false;
  const updatedAt = Date.now();

  for (const page of Array.isArray(project.pages) ? project.pages : []) {
    let pageChanged = false;
    const preview = normalizePagePreview(page.preview);
    if (preview?.html) {
      const scrubbedPreview = scrubAssetReferencesFromHtml(preview.html, asset);
      if (scrubbedPreview.changed) {
        page.preview = normalizePagePreview({
          ...preview,
          html: scrubbedPreview.html,
          updatedAt,
          appliedAt: Number(preview.appliedAt) || updatedAt,
        });
        page.previewUpdatedAt = updatedAt;
        pageChanged = true;
      }
    }

    const currentVibe = normalizeVibeState(page.vibe);
    const nextVibe = { ...currentVibe };

    const appliedDraftResult = scrubAssetReferencesFromDraft(currentVibe.appliedDraft, asset, updatedAt);
    if (appliedDraftResult.changed) {
      nextVibe.appliedDraft = appliedDraftResult.draft;
      pageChanged = true;
    }

    const lastDraftResult = scrubAssetReferencesFromDraft(currentVibe.lastDraft, asset, updatedAt);
    if (lastDraftResult.changed) {
      nextVibe.lastDraft = lastDraftResult.draft;
      pageChanged = true;
    }

    const nextDraftHistory = [];
    let draftHistoryChanged = false;
    for (const draft of Array.isArray(currentVibe.draftHistory) ? currentVibe.draftHistory : []) {
      const result = scrubAssetReferencesFromDraft(draft, asset, updatedAt);
      nextDraftHistory.push(result.draft);
      draftHistoryChanged ||= result.changed;
    }
    if (draftHistoryChanged) {
      nextVibe.draftHistory = nextDraftHistory.filter(Boolean);
      pageChanged = true;
    }

    if (pageChanged) {
      page.vibe = normalizeVibeState(nextVibe);
      page.previewUpdatedAt = updatedAt;
      changed = true;
    }
  }

  if (!changed) {
    return false;
  }

  project.updatedAt = updatedAt;
  await persistProject(project, { syncWorkspace: true });
  return true;
}

function buildShareUrl(project, launchUrl, origin = "") {
  const token = String(project?.shareToken || "").trim();

  if (!token) {
    return "";
  }

  const base = origin || "http://uxbridge.local";
  const nextUrl = new URL(launchUrl || project?.launchUrl || "/projects.html", base);
  nextUrl.searchParams.set("share", token);
  return origin ? nextUrl.toString() : `${nextUrl.pathname}${nextUrl.search}`;
}

function serializeAvailableUsers(ownerDirectory = new Map()) {
  return Array.from(ownerDirectory.values())
    .map((candidate) => ({
      email: candidate.email,
      fullName: candidate.fullName,
      avatarUrl: String(candidate.avatarUrl || ""),
      avatarColor: String(candidate.avatarColor || ""),
      role: String(candidate.role || ""),
    }))
    .sort((left, right) =>
      String(left.fullName || left.email || "").localeCompare(String(right.fullName || right.email || ""), undefined, {
        sensitivity: "base",
      }),
    );
}

async function buildProjectPayload(project, ownerDirectory = new Map(), user = null, origin = "", options = {}) {
  const includePageContent = options.includePageContent !== false;
  const viewerPreferenceSource =
    options.userRecord ||
    (user?.preferences ? user : (user?.email ? await readUser(user.email) : null));
  const viewerViewportPreset = resolveProjectViewportPresetForUser(viewerPreferenceSource, project.id);
  const viewerInspectorPinned = resolveInspectorPinnedPreferenceForUser(viewerPreferenceSource);
  const ownerEmail = String(project.ownerEmail || "").trim().toLowerCase();
  const ownerRecord = ownerDirectory.get(ownerEmail) || null;
  const ownerName = project.ownerNameOverride || ownerRecord?.fullName || ownerEmail || "Unknown";
  const kind = String(project.kind || "dynamic").trim().toLowerCase() || "dynamic";
  const hasOverview = Boolean(project.hasOverview);
  const launchUrl = String(
    project.launchUrl || (hasOverview ? "/project-overview.html" : buildDynamicPageLaunchUrl(project.id, project.pages[0]?.id || "")),
  );
  const firstPageId = String(project.pages[0]?.id || "").trim();
  const legacyFirstPageLaunchUrl =
    project.id === LEGACY_BRAND_AFFILIATE_PROJECT_ID ? LEGACY_BRAND_AFFILIATE_PAGE_ROUTES[firstPageId] || "" : "";
  const firstPageLaunchUrl = String(
    project.pages[0]?.launchUrl || legacyFirstPageLaunchUrl || buildDynamicPageLaunchUrl(project.id, project.pages[0]?.id || ""),
  );
  const thumbnailUrl = buildThumbnailUrl(firstPageLaunchUrl || launchUrl);
  const access = await computeProjectAccess(user, project);
  const projectMembers = normalizeProjectMembers(project).map((member) => {
    const directoryMember = ownerDirectory.get(member.email);

    return {
      email: member.email,
      fullName: directoryMember?.fullName || member.email,
      avatarUrl: String(directoryMember?.avatarUrl || ""),
      avatarColor: String(directoryMember?.avatarColor || ""),
      role: member.role,
      status: member.status,
      joinedAt: member.joinedAt,
      invitedAt: member.invitedAt,
      requestedAt: member.requestedAt,
      addedBy: member.addedBy,
    };
  });
  const members = projectMembers.filter((member) => member.status === PROJECT_MEMBER_STATUS_ACTIVE);
  const accessRequests = projectMembers
    .filter((member) => member.status === PROJECT_MEMBER_STATUS_REQUESTED)
    .map((requester) => ({
      email: requester.email,
      fullName: requester.fullName,
      avatarUrl: requester.avatarUrl,
      avatarColor: requester.avatarColor,
      role: requester.role,
    }));
  const availableUsers = serializeAvailableUsers(ownerDirectory);
  const codexThread = normalizeProjectCodexThread(project);

  return {
    id: project.id,
    name: project.name,
    kind,
    description: project.description || "A custom mobile project inside UX Bridge.",
    hasOverview,
    createdAt: project.createdAt,
    updatedAt: project.updatedAt || project.createdAt,
    ownerEmail: project.ownerEmail,
    ownerName,
    ownerAvatarUrl: String(project.ownerAvatarUrl || ownerRecord?.avatarUrl || ""),
    ownerAvatarColor: String(project.ownerAvatarColor || ownerRecord?.avatarColor || ""),
    launchUrl,
    thumbnailUrl,
    thumbnailDataUrl: String(project.thumbnailDataUrl || ""),
    thumbnailUpdatedAt: Number(project.thumbnailUpdatedAt) || 0,
    thumbnailRefreshedAt: Number(project.thumbnailRefreshedAt) || 0,
    thumbnailSourceUrl: String(project.thumbnailSourceUrl || thumbnailUrl),
    sharingMode: access.sharingMode,
    visibility: normalizeProjectVisibility(project.visibility, project.sharingMode),
    codexContextId: String(project.codexContextId || ""),
    codexAccessMode: normalizeCodexAccessMode(project.codexAccessMode),
    shareUrl: buildShareUrl(project, firstPageLaunchUrl || launchUrl, origin),
    hasAccess: access.hasAccess,
    isLocked: !access.hasAccess,
    isOwner: access.isOwner,
    projectRole: access.projectRole,
    canManageIdentity: await userCanManageProjectIdentity(user, project),
    canCreateEditSession: await userCanCreateEditSession(user, project),
    canInvite: access.canInvite,
    canManageSharing: access.canManageSharing,
    requestPending: access.requestPending,
    members,
    projectMembers,
    pendingInviteEmails: normalizeEmailList(project.pendingInviteEmails),
    accessRequests,
    availableUsers,
    codexThread,
    prototypeLinks: normalizePrototypeLinks(project.prototypeLinks),
    editSessions: normalizeEditSessions(project.editSessions),
    pageLocks: normalizePageLocks(project.pageLocks),
    inspectorBreakpoints: normalizeProjectInspectorBreakpoints(project.inspectorBreakpoints),
    viewerState: {
      viewportPreset: viewerViewportPreset,
      inspectorPinned: viewerInspectorPinned,
    },
    pageCount: project.pages.length,
    pages: project.pages.map((page) => {
      const basePage = {
        id: page.id,
        name: page.name,
        hasContent: Boolean(page.hasContent),
        launchUrl: String(page.launchUrl || buildDynamicPageLaunchUrl(project.id, page.id)),
        createdAt: Number(page.createdAt) || 0,
        previewUpdatedAt: Number(page?.previewUpdatedAt || page?.preview?.updatedAt || page?.preview?.appliedAt || 0),
        fileSlug: String(page.fileSlug || ""),
        files: page.files || buildPageFileMetadata(project.id, page),
        pageLock: page.pageLock || null,
      };

      if (!includePageContent) {
        return basePage;
      }

      return {
        ...basePage,
        vibe: normalizeVibeState(page.vibe),
        preview: buildPagePreview(page),
      };
    }),
  };
}

function syncAppliedPreviewIntoPage(page, appliedDraft, appliedAt = Date.now()) {
  const normalizedAppliedDraft = normalizeVibeDraft(appliedDraft);
  page.preview = normalizePagePreview(
    normalizedAppliedDraft
      ? {
          ...normalizedAppliedDraft,
          appliedAt,
          updatedAt: appliedAt,
          source: "page-files",
        }
      : null,
  );
  page.hasContent = Boolean(page.preview?.html);
  return page;
}

async function listProjects() {
  const index = await readIndex();
  const projects = [];

  for (const projectId of index) {
    const project = await readDynamicProject(projectId);

    if (project) {
      projects.push(project);
    }
  }

  return projects;
}

export async function listAllProjectsForMaintenance() {
  return listProjects();
}

export async function reassignOwnedProjectsEmail(previousEmail, nextEmail) {
  const fromEmail = String(previousEmail || "").trim().toLowerCase();
  const toEmail = String(nextEmail || "").trim().toLowerCase();

  if (!fromEmail || !toEmail || fromEmail === toEmail) {
    return;
  }

  const projects = await listProjects();

  for (const project of projects) {
    let changed = false;

    if (String(project.ownerEmail || "").trim().toLowerCase() === fromEmail) {
      project.ownerEmail = toEmail;
      changed = true;
    }

    if (findProjectMember(project, fromEmail)) {
      removeProjectMember(project, fromEmail);
      upsertProjectMember(project, toEmail, {
        role: PROJECT_ROLE_OWNER,
        status: PROJECT_MEMBER_STATUS_ACTIVE,
        joinedAt: Number(project.createdAt) || Date.now(),
        addedBy: toEmail,
      });
      changed = true;
    }

    if (Array.isArray(project.editSessions)) {
      for (const session of project.editSessions) {
        if (normalizeEmail(session.userId) === fromEmail) {
          session.userId = toEmail;
          session.updatedAt = Date.now();
          changed = true;
        }
      }
    }

    if (Array.isArray(project.pageLocks)) {
      for (const lock of project.pageLocks) {
        if (normalizeEmail(lock.lockedBy) === fromEmail) {
          lock.lockedBy = toEmail;
          changed = true;
        }
      }
    }

    if (changed) {
      project.updatedAt = Date.now();
      await persistProject(project, { syncWorkspace: true });
    }
  }
}

async function buildOwnerDirectory() {
  const users = await listUserDirectory();
  return new Map(users.map((user) => [String(user.email || "").trim().toLowerCase(), user]));
}

export async function getProjectById(projectId) {
  const ownerDirectory = await buildOwnerDirectory();
  const project = await getProjectStructureById(projectId);
  return project ? await buildProjectPayload(project, ownerDirectory) : null;
}

export async function userCanAccessProject(user, projectId) {
  const project = await getProjectStructureById(projectId);

  if (!project) {
    return false;
  }

  return (await computeProjectAccess(user, project)).hasAccess;
}

export async function acceptPendingProjectInvitesForEmail(email) {
  const normalizedEmail = normalizeEmail(email);

  if (!normalizedEmail) {
    return [];
  }

  const projects = await listProjects();
  const acceptedProjectIds = [];

  for (const project of projects) {
    const pendingInvite = findProjectMember(project, normalizedEmail);

    if (pendingInvite?.status !== PROJECT_MEMBER_STATUS_PENDING) {
      continue;
    }

    upsertProjectMember(project, normalizedEmail, {
      role: pendingInvite.role || PROJECT_ROLE_CONTRIBUTOR,
      status: PROJECT_MEMBER_STATUS_ACTIVE,
      joinedAt: Date.now(),
      addedBy: pendingInvite.addedBy || normalizeEmail(project.ownerEmail),
    });
    project.updatedAt = Date.now();
    await persistProject(project, { syncWorkspace: true });
    acceptedProjectIds.push(project.id);
  }

  return acceptedProjectIds;
}

export async function getSignupInvitationContext(email, shareToken = "") {
  const normalizedEmail = normalizeEmail(email);
  const normalizedToken = String(shareToken || "").trim();
  const projects = await listProjects();

  const pendingProject = projects.find((project) => normalizeEmailList(project.pendingInviteEmails).includes(normalizedEmail));
  if (pendingProject) {
    return { allowed: true, projectId: pendingProject.id, reason: "email-invite" };
  }

  if (normalizedToken) {
    const shareProject = projects.find((project) => String(project.shareToken || "").trim() === normalizedToken);
    if (shareProject && normalizeSharingMode(shareProject.sharingMode) === SHARE_MODE_LINK) {
      return { allowed: true, projectId: shareProject.id, reason: "share-link" };
    }
  }

  return { allowed: false, projectId: "", reason: "" };
}

export async function acceptShareLinkForUser(email, shareToken = "") {
  const normalizedEmail = normalizeEmail(email);
  const normalizedToken = String(shareToken || "").trim();

  if (!normalizedEmail || !normalizedToken) {
    return null;
  }

  const projects = await listProjects();
  const project = projects.find((entry) => String(entry.shareToken || "").trim() === normalizedToken);

  if (!project || normalizeSharingMode(project.sharingMode) !== SHARE_MODE_LINK) {
    return null;
  }

  upsertProjectMember(project, normalizedEmail, {
    role: PROJECT_ROLE_CONTRIBUTOR,
    status: PROJECT_MEMBER_STATUS_ACTIVE,
    joinedAt: Date.now(),
    addedBy: normalizeEmail(project.ownerEmail),
  });
  project.updatedAt = Date.now();
  await persistProject(project, { syncWorkspace: true });
  return project.id;
}

export async function projectHasPage(projectId, pageId) {
  const project = await getProjectStructureById(projectId);

  if (!project) {
    return false;
  }

  if (project.hasOverview) {
    return pageId === "overview" || project.pages.some((page) => page.id === pageId);
  }

  return project.pages.some((page) => page.id === pageId);
}

function createPage(project, name = "", options = {}) {
  const nextIndex = project.pages.length + 1;
  const pageName = String(name || "").trim() || `Page ${nextIndex}`;
  const baseId = normalizePageId(pageName) || `page-${nextIndex}`;
  const taken = new Set(project.pages.map((page) => page.id));
  let pageId = baseId;
  let suffix = 2;

  while (taken.has(pageId)) {
    pageId = `${baseId}-${suffix}`;
    suffix += 1;
  }

  return normalizeProjectPage(
    {
      id: pageId,
      name: pageName,
      hasContent: false,
      createdAt: Date.now(),
      createdFrom: String(options.source || "ui").trim().toLowerCase() || "ui",
      vibe: createDefaultVibeState(),
    },
    project.id,
  );
}

function duplicatePageName(project, sourcePageName = "") {
  const baseName = `${String(sourcePageName || "").trim() || "Untitled Page"} Copy`;
  const existingNames = new Set(
    (Array.isArray(project?.pages) ? project.pages : [])
      .map((page) => String(page?.name || "").trim().toLowerCase())
      .filter(Boolean),
  );

  if (!existingNames.has(baseName.toLowerCase())) {
    return baseName;
  }

  let suffix = 2;

  while (existingNames.has(`${baseName} ${suffix}`.trim().toLowerCase())) {
    suffix += 1;
  }

  return `${baseName} ${suffix}`;
}

function duplicateProjectPage(project, sourcePage, options = {}) {
  const insertIndex = Math.max(0, Number(options.insertIndex) || 0);
  const nextName = String(options.name || "").trim() || duplicatePageName(project, sourcePage?.name);
  const nextPage = normalizeProjectPage(
    {
      ...structuredClone(sourcePage || {}),
      id: normalizePageId(`${nextName}-${crypto.randomUUID().slice(0, 8)}`),
      name: nextName,
      fileSlug: "",
      files: null,
      launchUrl: "",
      pageLock: null,
      createdAt: Date.now(),
      createdFrom: String(options.source || "duplicate").trim().toLowerCase() || "duplicate",
    },
    project.id,
  );

  project.pages.splice(insertIndex, 0, nextPage);
  return nextPage;
}

function duplicateProjectName(name) {
  const baseName = String(name || "").trim() || "Untitled Project";
  return `${baseName} Copy`;
}

function createDefaultProjectName(existingProjects = []) {
  const existingNames = new Set(
    (Array.isArray(existingProjects) ? existingProjects : [])
      .map((project) => String(project?.name || "").trim().toLowerCase())
      .filter(Boolean),
  );

  if (!existingNames.has("project awesome!")) {
    return "Project Awesome!";
  }

  let version = 2;

  while (existingNames.has(`project awesome ${version}.0`)) {
    version += 1;
  }

  return `Project Awesome ${version}.0`;
}

const DEFAULT_PROJECT_INSPECTOR_BREAKPOINTS = Object.freeze([
  { id: "mobile-xs", label: "Mobile & Extra Small", start: 320, end: 480 },
  { id: "tablet-sm", label: "Tablet & Small", start: 481, end: 768 },
  { id: "laptop-md", label: "Laptop & Medium", start: 769, end: 1024 },
  { id: "desktop-lg", label: "Large Desktop", start: 1025, end: null },
]);

function normalizeProjectInspectorBreakpoints(value) {
  const input = Array.isArray(value) ? value : [];

  return DEFAULT_PROJECT_INSPECTOR_BREAKPOINTS.map((entry, index) => {
    const candidate = input[index] && typeof input[index] === "object" ? input[index] : {};
    const start = Number.parseInt(String(candidate.start ?? entry.start), 10);
    const endCandidate = candidate.end;
    const end =
      endCandidate === null ||
      endCandidate === undefined ||
      String(endCandidate).trim() === "" ||
      String(endCandidate).trim().toLowerCase() === "none"
        ? null
        : Number.parseInt(String(endCandidate), 10);
    const normalizedEnd = Number.isFinite(end) ? Math.max(0, end) : null;

    return {
      id: entry.id,
      label: entry.label,
      start: Number.isFinite(start) ? Math.max(0, start) : entry.start,
      end: normalizedEnd && normalizedEnd > 0 ? normalizedEnd : null,
    };
  });
}

function createProjectRecord(user, name, firstPageName = "") {
  const createdAt = Date.now();
  const project = {
    id: "",
    name,
    ownerEmail: user.email,
    sharingMode: SHARE_MODE_INVITED,
    visibility: PROJECT_VISIBILITY_PRIVATE,
    codexAccessMode: CODEX_ACCESS_CONTRIBUTORS,
    codexContextId: "",
    shareToken: crypto.randomUUID(),
    memberEmails: [],
    pendingInviteEmails: [],
    accessRequestEmails: [],
    projectMembers: [],
    prototypeLinks: [],
    editSessions: [],
    pageLocks: [],
    designTokens: {},
    inspectorBreakpoints: normalizeProjectInspectorBreakpoints(),
    createdAt,
    updatedAt: createdAt,
    description: "Great things come to those who use awesome tools!",
    pages: [],
  };

  const firstPage = createPage(project, firstPageName, { source: "default" });
  project.pages.push(firstPage);
  return syncProjectMembershipState(project);
}

function createProjectContextPayload(project) {
  const codexThread = normalizeProjectCodexThread(project);

  return {
    codexContextId: String(project.codexContextId || createProjectCodexContext(project.id)).trim(),
    codexThreadId: codexThread.id,
    activePageId: codexThread.activePageId,
  };
}

function createPrototypeLinkRecord(project, payload, user) {
  const targetPageId = normalizePageId(payload.targetPageId || payload.pageId);
  const targetPage =
    (Array.isArray(project?.pages) ? project.pages : []).find((entry) => normalizePageId(entry?.id) === targetPageId) || null;

  return {
    id: crypto.randomUUID(),
    label: String(payload.label || "").trim() || targetPage?.name || project.name || "Prototype link",
    url:
      String(payload.url || "").trim() ||
      String(targetPage?.launchUrl || buildDynamicPageLaunchUrl(project.id, targetPageId)).trim(),
    pageId: targetPageId,
    sourcePageId: normalizePageId(payload.sourcePageId),
    sourceLayerPath: String(payload.sourceLayerPath || "").trim(),
    sourceLayerLabel: String(payload.sourceLayerLabel || "").trim(),
    targetPageId,
    targetPageName: String(targetPage?.name || "").trim(),
    transition: normalizePrototypeLinkTransition(payload.transition),
    animateMatchingLayers: normalizePrototypeLinkAnimateMatchingLayers(payload.animateMatchingLayers),
    animateMatchingLayersEasing: normalizePrototypeLinkAnimateMatchingLayersEasing(
      payload.animateMatchingLayersEasing,
    ),
    animateMatchingLayersDuration: normalizePrototypeLinkAnimateMatchingLayersDuration(
      payload.animateMatchingLayersDuration,
    ),
    createdAt: Date.now(),
    createdBy: normalizeEmail(user?.email),
  };
}

function matchesPrototypeLinkSource(entry, payload) {
  return (
    normalizePageId(entry?.sourcePageId) === normalizePageId(payload.sourcePageId) &&
    String(entry?.sourceLayerPath || "").trim() === String(payload.sourceLayerPath || "").trim()
  );
}

function updateProjectPrivacySettings(project, payload) {
  const requestedSharingMode = payload.sharingMode
    ? normalizeSharingMode(payload.sharingMode)
    : normalizeSharingMode(project.sharingMode);
  const requestedVisibility = normalizeProjectVisibility(payload.visibility, requestedSharingMode);

  project.sharingMode = requestedSharingMode;
  project.visibility = requestedVisibility;
  project.codexAccessMode = normalizeCodexAccessMode(payload.codexAccessMode || project.codexAccessMode);
  return project;
}

function listProjectPages(project) {
  return project.pages.map((page) => ({
    id: page.id,
    name: page.name,
    createdAt: page.createdAt,
    fileSlug: page.fileSlug,
    launchUrl: page.launchUrl || buildDynamicPageLaunchUrl(project.id, page.id),
    files: page.files || buildPageFileMetadata(project.id, page),
  }));
}

function createPageResponse(project, page) {
  return {
    id: page.id,
    name: page.name,
    launchUrl: buildDynamicPageLaunchUrl(project.id, page.id),
    fileSlug: page.fileSlug,
    files: page.files || buildPageFileMetadata(project.id, page),
  };
}

function normalizeRecentProjectOpenMap(value = {}) {
  if (!value || typeof value !== "object") {
    return {};
  }

  return Object.fromEntries(
    Object.entries(value)
      .map(([projectId, timestamp]) => [normalizeProjectId(projectId), Number(timestamp) || 0])
      .filter(([projectId, timestamp]) => projectId && timestamp > 0),
  );
}

function normalizeProjectViewportPreferenceMap(value = {}) {
  if (!value || typeof value !== "object") {
    return {};
  }

  return Object.fromEntries(
    Object.entries(value)
      .map(([projectId, viewportPreset]) => [normalizeProjectId(projectId), normalizeVibeViewportPreset(viewportPreset)])
      .filter(([projectId]) => projectId),
  );
}

function normalizeInspectorPinnedPreference(value) {
  return value === true;
}

async function readRecentProjectOpenMapForUser(userOrEmail = "") {
  if (userOrEmail && typeof userOrEmail === "object") {
    return normalizeRecentProjectOpenMap(userOrEmail.preferences?.projects?.recentOpenById);
  }

  const email = typeof userOrEmail === "string" ? userOrEmail : userOrEmail?.email;
  const user = email ? await readUser(email) : null;
  return normalizeRecentProjectOpenMap(user?.preferences?.projects?.recentOpenById);
}

async function writeRecentProjectOpenMapForUser(userOrEmail = "", recentOpenById = {}) {
  const user = userOrEmail && typeof userOrEmail === "object" ? userOrEmail : await readUser(userOrEmail);

  if (!user?.email) {
    return {};
  }

  const normalizedMap = normalizeRecentProjectOpenMap(recentOpenById);
  const nextUser = {
    ...user,
    preferences: {
      ...(user.preferences && typeof user.preferences === "object" ? user.preferences : {}),
      projects: {
        ...(user.preferences?.projects && typeof user.preferences.projects === "object" ? user.preferences.projects : {}),
        recentOpenById: normalizedMap,
      },
    },
    updatedAt: Date.now(),
  };

  await writeUser(user.email, nextUser);
  return normalizedMap;
}

function resolveInspectorPinnedPreferenceForUser(userOrRecord = null) {
  return normalizeInspectorPinnedPreference(userOrRecord?.preferences?.projects?.inspectorPinned);
}

async function writeInspectorPinnedPreferenceForUser(userOrEmail = "", inspectorPinned = false) {
  const user = userOrEmail && typeof userOrEmail === "object" ? userOrEmail : await readUser(userOrEmail);

  if (!user?.email) {
    return false;
  }

  const normalizedPinned = normalizeInspectorPinnedPreference(inspectorPinned);
  const nextUser = {
    ...user,
    preferences: {
      ...(user.preferences && typeof user.preferences === "object" ? user.preferences : {}),
      projects: {
        ...(user.preferences?.projects && typeof user.preferences.projects === "object" ? user.preferences.projects : {}),
        inspectorPinned: normalizedPinned,
      },
    },
    updatedAt: Date.now(),
  };

  await writeUser(user.email, nextUser);
  return normalizedPinned;
}

function resolveProjectViewportPresetForUser(userOrRecord = null, projectId = "") {
  const normalizedProjectId = normalizeProjectId(projectId);

  if (!normalizedProjectId) {
    return "mobile";
  }

  const preferenceMap = normalizeProjectViewportPreferenceMap(userOrRecord?.preferences?.projects?.viewportPresetByProjectId);
  return normalizeVibeViewportPreset(preferenceMap[normalizedProjectId]);
}

async function writeProjectViewportPresetForUser(userOrEmail = "", projectId = "", viewportPreset = "mobile") {
  const user = userOrEmail && typeof userOrEmail === "object" ? userOrEmail : await readUser(userOrEmail);
  const normalizedProjectId = normalizeProjectId(projectId);

  if (!user?.email || !normalizedProjectId) {
    return {};
  }

  const normalizedPreset = normalizeVibeViewportPreset(viewportPreset);
  const currentMap = normalizeProjectViewportPreferenceMap(user.preferences?.projects?.viewportPresetByProjectId);
  const nextMap = {
    ...currentMap,
    [normalizedProjectId]: normalizedPreset,
  };
  const nextUser = {
    ...user,
    preferences: {
      ...(user.preferences && typeof user.preferences === "object" ? user.preferences : {}),
      projects: {
        ...(user.preferences?.projects && typeof user.preferences.projects === "object" ? user.preferences.projects : {}),
        viewportPresetByProjectId: nextMap,
      },
    },
    updatedAt: Date.now(),
  };

  await writeUser(user.email, nextUser);
  return nextMap;
}

async function createProjectPage(project, user, name = "", options = {}) {
  const page = createPage(project, name, options);
  project.pages.push(page);
  project.updatedAt = Date.now();
  const persistedProject = await persistProject(project, { syncWorkspace: true });
  const persistedPage = persistedProject.pages.find((entry) => entry.id === page.id) || page;

  return {
    project: persistedProject,
    page: persistedPage,
  };
}

async function ensureProjectCodexContext(project) {
  if (!String(project.codexContextId || "").trim()) {
    project.codexContextId = createProjectCodexContext(project.id);
    project.updatedAt = Date.now();
    return persistProject(project, { syncWorkspace: true });
  }

  return project;
}

export async function handleProjectsRequest(req) {
  const user = await getAuthenticatedUser(req);
  const authenticatedUserRecord = await getAuthenticatedUserRecord(req);

  if (!user) {
    return {
      status: 401,
      payload: {
        ok: false,
        error: "Unauthorized.",
      },
    };
  }

  const requestUrl = new URL(req.url || "/", `http://${req.headers.host || "127.0.0.1"}`);
  const requestedProjectId = normalizeProjectId(requestUrl.searchParams.get("project"));
  const requestedMode = String(requestUrl.searchParams.get("mode") || "").trim().toLowerCase();
  const origin = getRequestOrigin(req);

  if (req.method === "GET") {
    if (requestedProjectId) {
      const projectRecord = await getProjectStructureById(requestedProjectId);

      if (!projectRecord) {
        return {
          status: 404,
          payload: {
            ok: false,
            error: "Project not found.",
          },
        };
      }

      const access = await computeProjectAccess(user, projectRecord);

      if (!access.hasAccess) {
        return {
          status: 403,
          payload: {
            ok: false,
            error: "You do not have access to this project.",
          },
        };
      }

      const ownerDirectory = await buildOwnerDirectory();
      const project = await buildProjectPayload(projectRecord, ownerDirectory, user, origin);

      if (requestedMode === "runtime-sync") {
        return {
          status: 200,
          payload: {
            ok: true,
            project: {
              id: project.id,
              name: project.name,
              pages: project.pages.map((page) => ({
                id: page.id,
                name: page.name,
                launchUrl: page.launchUrl,
                pageLock: page.pageLock || null,
                previewUpdatedAt: Number(page?.previewUpdatedAt || page?.preview?.updatedAt || page?.preview?.appliedAt || 0),
              })),
            },
          },
        };
      }

      return {
        status: 200,
        payload: {
          ok: true,
          project,
          vibeProviders: listVibeProviders(),
          currentUser: user,
          canCreateProjects: await canCreateProjects(user),
          canDuplicateProjects: await canDuplicateProjects(user),
          canCreatePages: project.kind === "dynamic" && (await userCanManageProjectPages(user, projectRecord)),
        },
      };
    }

    const projects = await listProjects();
    const ownerDirectory = await buildOwnerDirectory();
    const projectPayloads = await Promise.all(projects.map(async (project) => {
      const payload = await buildProjectPayload(project, ownerDirectory, user, origin, { includePageContent: false });
      delete payload.availableUsers;
      delete payload.accessRequests;
      delete payload.members;
      delete payload.pendingInviteEmails;
      delete payload.shareUrl;
      return payload;
    }));

    return {
      status: 200,
      payload: {
        ok: true,
        projects: projectPayloads,
        availableUsers: serializeAvailableUsers(ownerDirectory),
        canCreateProjects: await canCreateProjects(user),
        canDuplicateProjects: await canDuplicateProjects(user),
        recentProjectOpenById: normalizeRecentProjectOpenMap(authenticatedUserRecord?.preferences?.projects?.recentOpenById),
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
  const action = String(payload.action || "").trim();

  if (action === "markRecentOpen") {
    const projectId = normalizeProjectId(payload.project);
    const openedAt = Number(payload.openedAt) || Date.now();

    if (!projectId) {
      return {
        status: 400,
        payload: {
          ok: false,
          error: "Choose a valid project.",
        },
      };
    }

    const currentMap = normalizeRecentProjectOpenMap(authenticatedUserRecord?.preferences?.projects?.recentOpenById);
    const nextMap = {
      ...currentMap,
      [projectId]: Math.max(Number(currentMap[projectId]) || 0, openedAt),
    };

    return {
      status: 200,
      payload: {
        ok: true,
        recentProjectOpenById: await writeRecentProjectOpenMapForUser(authenticatedUserRecord, nextMap),
      },
    };
  }

  if (action === "syncRecentOpenMap") {
    const inputMap = normalizeRecentProjectOpenMap(payload.recentProjectOpenById);
    const currentMap = normalizeRecentProjectOpenMap(authenticatedUserRecord?.preferences?.projects?.recentOpenById);
    const mergedMap = { ...currentMap };

    Object.entries(inputMap).forEach(([projectId, timestamp]) => {
      mergedMap[projectId] = Math.max(Number(mergedMap[projectId]) || 0, Number(timestamp) || 0);
    });

    return {
      status: 200,
      payload: {
        ok: true,
        recentProjectOpenById: await writeRecentProjectOpenMapForUser(authenticatedUserRecord, mergedMap),
      },
    };
  }

  if (action === "updateInspectorBreakpoints") {
    const projectId = normalizeProjectId(payload.project);

    if (!projectId) {
      return {
        status: 400,
        payload: {
          ok: false,
          error: "Choose a valid project.",
        },
      };
    }

    const project = await readDynamicProject(projectId);

    if (!project) {
      return {
        status: 404,
        payload: {
          ok: false,
          error: "Project not found.",
        },
      };
    }

    if (!(await userCanManageProjectPages(user, project))) {
      return {
        status: 403,
        payload: {
          ok: false,
          error: "You do not have permission to update breakpoint settings for this project.",
        },
      };
    }

    project.inspectorBreakpoints = normalizeProjectInspectorBreakpoints(payload.inspectorBreakpoints);
    const persistedProject = await persistProject(project, { syncWorkspace: false });

    return {
      status: 200,
      payload: {
        ok: true,
        project: await buildProjectPayload(persistedProject, await buildOwnerDirectory(), user, origin),
      },
    };
  }

  if (action === "createProject") {
    if (!(await canCreateProjects(user))) {
      return {
        status: 403,
        payload: {
          ok: false,
          error: "Only Designers and Admins can create projects right now.",
        },
      };
    }

    const existingProjects = await listProjects();
    const name = String(payload.name || "").trim() || createDefaultProjectName(existingProjects);

    const baseId = normalizeProjectId(name) || `project-${crypto.randomUUID().slice(0, 8)}`;
    let projectId = baseId;
    let suffix = 2;

    while (await readDynamicProject(projectId)) {
      projectId = `${baseId}-${suffix}`;
      suffix += 1;
    }

    const project = createProjectRecord(user, name, payload.firstPageName);
    project.id = projectId;
    project.codexContextId = createProjectCodexContext(projectId);
    upsertProjectMember(project, user.email, {
      role: PROJECT_ROLE_OWNER,
      status: PROJECT_MEMBER_STATUS_ACTIVE,
      joinedAt: Number(project.createdAt) || Date.now(),
      addedBy: user.email,
    });
    const persistedProject = await persistProject(project, { scaffoldWorkspace: true });
    try {
      await ensureProjectWorkspaceRepository(persistedProject.id);
    } catch (error) {
      if (!isRecoverableWorkspaceError(error)) {
        throw error;
      }
    }
    const firstPage = persistedProject.pages[0];

    return {
      status: 200,
      payload: {
        ok: true,
        project: await buildProjectPayload(persistedProject, await buildOwnerDirectory(), user, origin),
        vibeProviders: listVibeProviders(),
        launchUrl: buildDynamicPageLaunchUrl(persistedProject.id, firstPage.id),
        codexContext: createProjectContextPayload(persistedProject),
      },
    };
  }

  if (action === "createPage") {
    const projectId = normalizeProjectId(payload.project);

    if (!projectId) {
      return {
        status: 400,
        payload: {
          ok: false,
          error: "Choose a valid project.",
        },
      };
    }

    const project = await readDynamicProject(projectId);

    if (!project) {
      return {
        status: 404,
        payload: {
          ok: false,
          error: "Project not found.",
        },
      };
    }

    if (!(await userCanManageProjectPages(user, project))) {
      return {
        status: 403,
        payload: {
          ok: false,
          error: "You do not have permission to add pages to this project.",
        },
      };
    }

    const { project: persistedProject, page } = await createProjectPage(project, user, payload.name, { source: "ui" });

    return {
      status: 200,
      payload: {
        ok: true,
        page: createPageResponse(persistedProject, page),
        project: await buildProjectPayload(persistedProject, await buildOwnerDirectory(), user, origin),
        vibeProviders: listVibeProviders(),
      },
    };
  }

  if (action === "duplicatePage") {
    const projectId = normalizeProjectId(payload.project);
    const pageId = normalizePageId(payload.page);
    const beforePageId = normalizePageId(payload.beforePageId);
    const requestedInsertIndex = Number.isFinite(Number(payload.insertIndex)) ? Math.trunc(Number(payload.insertIndex)) : null;

    if (!projectId || !pageId) {
      return {
        status: 400,
        payload: {
          ok: false,
          error: "Choose a valid project page.",
        },
      };
    }

    const project = await readDynamicProject(projectId);

    if (!project) {
      return {
        status: 404,
        payload: {
          ok: false,
          error: "Project not found.",
        },
      };
    }

    if (!(await userCanManageProjectPages(user, project))) {
      return {
        status: 403,
        payload: {
          ok: false,
          error: "You do not have permission to duplicate pages in this project.",
        },
      };
    }

    const sourceIndex = project.pages.findIndex((entry) => entry.id === pageId);
    const sourcePage = sourceIndex >= 0 ? project.pages[sourceIndex] : null;

    if (!sourcePage) {
      return {
        status: 404,
        payload: {
          ok: false,
          error: "Page not found.",
        },
      };
    }

    const beforeIndex = beforePageId ? project.pages.findIndex((entry) => entry.id === beforePageId) : -1;
    const duplicatedPage = duplicateProjectPage(project, sourcePage, {
      insertIndex:
        beforeIndex >= 0
          ? beforeIndex
          : requestedInsertIndex === null
          ? sourceIndex + 1
          : Math.min(Math.max(requestedInsertIndex, 0), project.pages.length),
      source: "duplicate",
    });
    project.updatedAt = Date.now();
    const persistedProject = await persistProject(project, { syncWorkspace: true });
    const persistedPage = persistedProject.pages.find((entry) => entry.id === duplicatedPage.id) || duplicatedPage;

    return {
      status: 200,
      payload: {
        ok: true,
        page: createPageResponse(persistedProject, persistedPage),
        project: await buildProjectPayload(persistedProject, await buildOwnerDirectory(), user, origin),
      },
    };
  }

  if (action === "duplicateProject") {
    const projectId = normalizeProjectId(payload.project);

    if (!(await canDuplicateProjects(user))) {
      return {
        status: 403,
        payload: {
          ok: false,
          error: "Only Designers and Admins can duplicate projects right now.",
        },
      };
    }

    if (!projectId) {
      return {
        status: 400,
        payload: {
          ok: false,
          error: "Choose a valid project.",
        },
      };
    }

    const sourceProject = await readDynamicProject(projectId);

    if (!sourceProject) {
      return {
        status: 404,
        payload: {
          ok: false,
          error: "Project not found.",
        },
      };
    }

    const baseName = duplicateProjectName(sourceProject.name);
    let projectName = baseName;
    let suffix = 2;
    const existingProjects = await listProjects();
    const existingNames = new Set(existingProjects.map((project) => String(project.name || "").trim().toLowerCase()));

    while (existingNames.has(projectName.trim().toLowerCase())) {
      projectName = `${baseName} ${suffix}`;
      suffix += 1;
    }

    const baseId = normalizeProjectId(projectName) || `project-${crypto.randomUUID().slice(0, 8)}`;
    let nextProjectId = baseId;
    let idSuffix = 2;

    while (await readDynamicProject(nextProjectId)) {
      nextProjectId = `${baseId}-${idSuffix}`;
      idSuffix += 1;
    }

    const nextProject = createProjectRecord(user, projectName);
    nextProject.id = nextProjectId;
    nextProject.description = sourceProject.description || "A custom mobile project inside UX Bridge.";
    nextProject.codexContextId = createProjectCodexContext(nextProjectId);
    nextProject.prototypeLinks = normalizePrototypeLinks(sourceProject.prototypeLinks);
    nextProject.designTokens =
      sourceProject.designTokens && typeof sourceProject.designTokens === "object" ? sourceProject.designTokens : {};
    nextProject.pages = [];

    nextProject.pages = (sourceProject.pages || []).map((page) => ({
      ...normalizeProjectPage(
        {
          id: page.id,
          name: page.name,
          hasContent: Boolean(page.hasContent),
          createdAt: Date.now(),
          fileSlug: page.fileSlug,
          vibe: normalizeVibeState(page.vibe),
        },
        nextProject.id,
      ),
    }));

    if (!nextProject.pages.length) {
      nextProject.pages.push(createPage(nextProject));
    }

    upsertProjectMember(nextProject, user.email, {
      role: PROJECT_ROLE_OWNER,
      status: PROJECT_MEMBER_STATUS_ACTIVE,
      joinedAt: Number(nextProject.createdAt) || Date.now(),
      addedBy: user.email,
    });
    const persistedProject = await persistProject(nextProject, { scaffoldWorkspace: true });
    try {
      await ensureProjectWorkspaceRepository(persistedProject.id);
    } catch (error) {
      if (!isRecoverableWorkspaceError(error)) {
        throw error;
      }
    }

    return {
      status: 200,
      payload: {
        ok: true,
        project: await buildProjectPayload(persistedProject, await buildOwnerDirectory(), user, origin),
        vibeProviders: listVibeProviders(),
      },
    };
  }

  if (action === "renameProject") {
    const projectId = normalizeProjectId(payload.project);
    const nextName = String(payload.name || "").trim();
    const nextDescription = String(payload.description || "").trim();

    if (!projectId) {
      return {
        status: 400,
        payload: {
          ok: false,
          error: "Choose a valid project.",
        },
      };
    }

    if (!nextName) {
      return {
        status: 400,
        payload: {
          ok: false,
          error: "Project name is required.",
        },
      };
    }

    const project = await readDynamicProject(projectId);

    if (!project) {
      return {
        status: 404,
        payload: {
          ok: false,
          error: "Project not found.",
        },
      };
    }

    if (!(await userCanManageProjectIdentity(user, project))) {
      return {
        status: 403,
        payload: {
          ok: false,
          error: "Only the project owner or an Admin can edit this project.",
        },
      };
    }

    project.name = nextName;
    project.description = nextDescription;
    project.updatedAt = Date.now();
    const persistedProject = await persistProject(project, { syncWorkspace: true });

    return {
      status: 200,
      payload: {
        ok: true,
        project: await buildProjectPayload(persistedProject, await buildOwnerDirectory(), user, origin),
      },
    };
  }

  if (action === "updateProjectOwner") {
    const projectId = normalizeProjectId(payload.project);
    const nextOwnerEmail = normalizeEmail(payload.ownerEmail);

    if (!projectId) {
      return {
        status: 400,
        payload: {
          ok: false,
          error: "Choose a valid project.",
        },
      };
    }

    if (!nextOwnerEmail) {
      return {
        status: 400,
        payload: {
          ok: false,
          error: "Choose a valid owner.",
        },
      };
    }

    const project = await readDynamicProject(projectId);

    if (!project) {
      return {
        status: 404,
        payload: {
          ok: false,
          error: "Project not found.",
        },
      };
    }

    if (!(await userCanManageProjectIdentity(user, project))) {
      return {
        status: 403,
        payload: {
          ok: false,
          error: "Only the project owner or an Admin can change the project owner.",
        },
      };
    }

    const ownerDirectory = await buildOwnerDirectory();
    const nextOwner = ownerDirectory.get(nextOwnerEmail);

    if (!nextOwner) {
      return {
        status: 400,
        payload: {
          ok: false,
          error: "That user is not available to become the project owner.",
        },
      };
    }

    const previousOwnerEmail = normalizeEmail(project.ownerEmail);

    if (previousOwnerEmail && previousOwnerEmail !== nextOwnerEmail) {
      const previousOwnerMember = findProjectMember(project, previousOwnerEmail);
      upsertProjectMember(project, previousOwnerEmail, {
        role: PROJECT_ROLE_ADMIN,
        status: PROJECT_MEMBER_STATUS_ACTIVE,
        joinedAt: Number(previousOwnerMember?.joinedAt) || Number(project.createdAt) || Date.now(),
        addedBy: normalizeEmail(user.email),
      });
    }

    const nextOwnerMember = findProjectMember(project, nextOwnerEmail);
    upsertProjectMember(project, nextOwnerEmail, {
      role: PROJECT_ROLE_OWNER,
      status: PROJECT_MEMBER_STATUS_ACTIVE,
      joinedAt: Number(nextOwnerMember?.joinedAt) || Number(project.createdAt) || Date.now(),
      addedBy: normalizeEmail(user.email),
    });

    project.ownerEmail = nextOwnerEmail;
    project.ownerNameOverride = "";
    project.ownerAvatarUrl = "";
    project.ownerAvatarColor = "";
    project.updatedAt = Date.now();
    const persistedProject = await persistProject(project, { syncWorkspace: true });

    await recordAuditEvent({
      actorEmail: normalizeEmail(user.email),
      actorRole: user.role,
      action: "project.update_owner",
      resourceType: "project",
      resourceId: persistedProject.id,
      metadata: {
        previousOwnerEmail,
        nextOwnerEmail,
      },
    });

    return {
      status: 200,
      payload: {
        ok: true,
        project: await buildProjectPayload(persistedProject, ownerDirectory, user, origin),
      },
    };
  }

  if (action === "deleteProject") {
    const projectId = normalizeProjectId(payload.project);

    if (!projectId) {
      return {
        status: 400,
        payload: {
          ok: false,
          error: "Choose a valid project.",
        },
      };
    }

    const project = await readDynamicProject(projectId);

    if (!project) {
      return {
        status: 404,
        payload: {
          ok: false,
          error: "Project not found.",
        },
      };
    }

    if (!(await userCanManageProjectIdentity(user, project))) {
      return {
        status: 403,
        payload: {
          ok: false,
          error: "Only the project owner or an Admin can delete this project.",
        },
      };
    }

    await deleteDynamicProject(project);

    return {
      status: 200,
      payload: {
        ok: true,
      },
    };
  }

  if (action === "updateThumbnail") {
    const projectId = normalizeProjectId(payload.project);

    if (!projectId) {
      return {
        status: 400,
        payload: {
          ok: false,
          error: "Choose a valid project.",
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

    const ownerDirectory = await buildOwnerDirectory();
    const currentPayload = await buildProjectPayload(project, ownerDirectory);
    const expectedThumbnailSourceUrl = String(currentPayload.thumbnailUrl || "").trim();
    const requestedSourceUrl = String(payload.sourceUrl || "").trim();

    if (!expectedThumbnailSourceUrl || requestedSourceUrl !== expectedThumbnailSourceUrl) {
      return {
        status: 409,
        payload: {
          ok: false,
          error: "That thumbnail is out of date for the current first page.",
          project: currentPayload,
        },
      };
    }

    let thumbnailDataUrl = "";

    try {
      thumbnailDataUrl = sanitizeThumbnailDataUrl(payload.imageDataUrl);
    } catch (error) {
      return {
        status: 400,
        payload: {
          ok: false,
          error: error instanceof Error ? error.message : "Choose a valid thumbnail image.",
        },
      };
    }

    const updateMode = String(payload.mode || "auto").trim().toLowerCase();
    const refreshedAt = Date.now();

    project.thumbnailDataUrl = thumbnailDataUrl;
    project.thumbnailRefreshedAt = refreshedAt;
    if (updateMode !== "manual") {
      project.thumbnailUpdatedAt = refreshedAt;
    }
    project.thumbnailSourceUrl = expectedThumbnailSourceUrl;
    project.updatedAt = refreshedAt;
    await writeDynamicProject(project);

    return {
      status: 200,
      payload: {
        ok: true,
        project: await buildProjectPayload(project, ownerDirectory, user, origin),
      },
    };
  }

  if (action === "generateVibeContent") {
    const projectId = normalizeProjectId(payload.project);
    const pageId = normalizePageId(payload.page);
    const providerId = normalizeVibeProviderId(payload.providerId || DEFAULT_VIBE_PROVIDER_ID);
    const requestedViewportPreset = String(payload.viewportPreset || "").trim();
    const prompt = String(payload.prompt || "").trim();
    const includeProjectContext = payload.includeProjectContext !== false;
    const includePageContext = payload.includePageContext !== false;
    const selectedLayer = normalizeSelectedLayerContext(payload.selectedLayer);
    const attachmentPayloads = Array.isArray(payload.attachmentPayloads)
      ? payload.attachmentPayloads
          .map((asset) => ({
            fileName: String(asset?.fileName || "").trim(),
            kind: String(asset?.kind || "").trim(),
            contentType: String(asset?.contentType || "").trim(),
            sizeBytes: Number(asset?.sizeBytes || 0) || 0,
            previewUrl: String(asset?.previewUrl || "").trim(),
            dataBase64: String(asset?.dataBase64 || "").trim(),
          }))
          .filter((asset) => asset.fileName && asset.dataBase64)
      : [];

    if (!projectId || !pageId) {
      return {
        status: 400,
        payload: { ok: false, error: "Choose a valid project page." },
      };
    }

    if (!prompt) {
      return {
        status: 400,
        payload: { ok: false, error: "Add a prompt to generate page content." },
      };
    }

    const project = await readDynamicProject(projectId);

    if (!project) {
      return {
        status: 404,
        payload: { ok: false, error: "Project not found." },
      };
    }

    const access = await computeProjectAccess(user, project);

    if (!access.hasAccess) {
      return {
        status: 403,
        payload: { ok: false, error: "You do not have access to this project." },
      };
    }

    const page = project.pages.find((entry) => entry.id === pageId);

    if (!page) {
      return {
        status: 404,
        payload: { ok: false, error: "Page not found." },
      };
    }

    const generatedAt = Date.now();
    setProjectCodexActivePage(project, page.id);
    const currentVibe = normalizeVibeState(page.vibe);
    const preferredViewportPreset = resolveProjectViewportPresetForUser(authenticatedUserRecord, project.id);
    const activeViewportPreset = normalizeVibeViewportPreset(requestedViewportPreset || preferredViewportPreset);
    const currentPreviewSource = normalizePagePreview(page?.preview || page?.vibe?.appliedDraft || page?.vibe?.lastDraft);
    let generated;
    let verification = null;

    try {
      generated = await generateVibePageResult({
        providerId,
        prompt,
        promptAssets: attachmentPayloads,
        attachmentPayloads,
        projectId: project.id,
        projectName: project.name,
        pageId: page.id,
        pageName: page.name,
        includeProjectContext,
        includePageContext,
        currentPageSummary: String(currentPreviewSource?.summary || "").trim(),
        currentPageHtml: String(currentPreviewSource?.html || "").trim(),
        currentPageCss: String(currentPreviewSource?.css || "").trim(),
        selectedLayer,
        recentThreadMessages: buildRecentCodexThreadContext(project, page.id),
        designSystem: buildProjectDesignSystemContext(project),
        viewport: buildVibeViewportContext(activeViewportPreset),
        currentUser: {
          email: user.email,
          fullName: user.fullName,
          role: user.role,
        },
      });
    } catch (error) {
      return {
        status: 400,
        payload: {
          ok: false,
          error: error instanceof Error ? error.message : "Unable to generate page content.",
        },
      };
    }

    if (selectedLayer) {
      if (!String(currentPreviewSource?.html || "").trim()) {
        return {
          status: 400,
          payload: {
            ok: false,
            error: "The selected layer can only be edited after the page has saved preview content.",
          },
        };
      }

      try {
        const generatedFragmentHtml = String(generated.html || "");
        const generatedFragmentCss = String(generated.css || "");
        const appliedHtml = replaceSelectedLayerHtmlByPath(
          String(currentPreviewSource?.html || ""),
          selectedLayer.pathKey,
          generatedFragmentHtml,
          selectedLayer.label || "selected layer",
        );
        const appliedCss = mergeSelectedLayerCssPatch(
          String(currentPreviewSource?.css || ""),
          generatedFragmentCss,
          selectedLayer.pathKey,
        );

        verification = buildVibeVerificationSummary({
          selectedLayer,
          currentPreviewSource,
          generatedHtml: generatedFragmentHtml,
          generatedCss: generatedFragmentCss,
          appliedHtml,
          appliedCss,
          includeProjectContext,
          includePageContext,
          providerId,
        });

        generated = {
          ...generated,
          html: appliedHtml,
          css: appliedCss,
        };
      } catch (error) {
        return {
          status: 400,
          payload: {
            ok: false,
            error: error instanceof Error ? error.message : "Unable to apply the selected layer update.",
          },
        };
      }
    } else {
      verification = buildVibeVerificationSummary({
        selectedLayer: null,
        currentPreviewSource,
        generatedHtml: generated.html,
        generatedCss: generated.css,
        appliedHtml: generated.html,
        appliedCss: generated.css,
        includeProjectContext,
        includePageContext,
        providerId,
      });
    }

    const nextDraft = {
      providerId,
      providerLabel: generated.providerLabel,
      assistantMessage: generated.assistantMessage,
      summary: generated.summary,
      html: generated.html,
      css: generated.css,
      generatedAt,
      assets: generated.assets,
      credentialMode: generated.credentialMode,
    };

    page.vibe = {
      ...currentVibe,
      providerId,
      viewportPreset: activeViewportPreset,
      prompt: "",
      includeProjectContext,
      includePageContext,
      status: "ready",
      summary: generated.summary,
      error: "",
      generatedAt,
      credentialMode: generated.credentialMode,
      availableVia: generated.availableVia,
      lastDraft: nextDraft,
      appliedDraft: normalizeVibeDraft(currentVibe.appliedDraft),
      draftHistory: mergeVibeDraftHistory(currentVibe.draftHistory, currentVibe.lastDraft, nextDraft),
    };
    appendProjectCodexThreadMessage(project, {
      role: "user",
      kind: "prompt",
      userId: user.email,
      pageId: page.id,
      sessionId: String(payload.sessionId || "").trim(),
      content: prompt,
      metadata: {
        providerId,
        providerLabel: generated.providerLabel,
        includeProjectContext,
        includePageContext,
        viewportPreset: activeViewportPreset,
      },
      createdAt: generatedAt,
    });
    appendProjectCodexThreadMessage(project, {
      role: "assistant",
      kind: "generation",
      userId: user.email,
      pageId: page.id,
      sessionId: String(payload.sessionId || "").trim(),
      content: createCodexThreadContent(generated.assistantMessage || generated.summary, page.name),
      metadata: {
        providerId,
        providerLabel: generated.providerLabel,
        viewportPreset: activeViewportPreset,
        verification,
      },
      createdAt: generatedAt + 1,
    });
    project.updatedAt = generatedAt;
    await writeDynamicProject(project);

    return {
      status: 200,
      payload: {
        ok: true,
        project: await buildProjectPayload(project, await buildOwnerDirectory(), user, origin),
        vibeProviders: listVibeProviders(),
      },
    };
  }

  if (action === "saveVibeDraft") {
    const projectId = normalizeProjectId(payload.project);
    const pageId = normalizePageId(payload.page);
    const providerId = normalizeVibeProviderId(payload.providerId || DEFAULT_VIBE_PROVIDER_ID);
    const requestedViewportPreset = String(payload.viewportPreset || "").trim();
    const prompt = String(payload.prompt || "").trim();
    const includeProjectContext = payload.includeProjectContext !== false;
    const includePageContext = payload.includePageContext !== false;

    if (!projectId || !pageId) {
      return {
        status: 400,
        payload: { ok: false, error: "Choose a valid project page." },
      };
    }

    const project = await readDynamicProject(projectId);

    if (!project) {
      return {
        status: 404,
        payload: { ok: false, error: "Project not found." },
      };
    }

    const access = await computeProjectAccess(user, project);

    if (!access.hasAccess) {
      return {
        status: 403,
        payload: { ok: false, error: "You do not have access to this project." },
      };
    }

    const page = project.pages.find((entry) => entry.id === pageId);

    if (!page) {
      return {
        status: 404,
        payload: { ok: false, error: "Page not found." },
      };
    }

    let generated;

    try {
      generated = validateGeneratedVibePayload({
        providerId,
        providerLabel: payload.generated?.providerLabel,
        summary: payload.generated?.summary,
        html: payload.generated?.html,
        css: payload.generated?.css,
        assets: payload.generated?.assets,
        credentialMode: payload.generated?.credentialMode,
        availableVia: payload.generated?.availableVia,
      });
    } catch (error) {
      return {
        status: 400,
        payload: {
          ok: false,
          error: error instanceof Error ? error.message : "Choose a valid generated draft payload.",
        },
      };
    }

    const generatedAt = Number(payload.generated?.generatedAt) || Date.now();
    setProjectCodexActivePage(project, page.id);
    const nextDraft = {
      providerId: generated.providerId,
      providerLabel: generated.providerLabel,
      assistantMessage: generated.assistantMessage,
      summary: generated.summary,
      html: generated.html,
      css: generated.css,
      generatedAt,
      assets: generated.assets,
      credentialMode: generated.credentialMode,
    };
    const currentVibe = normalizeVibeState(page.vibe);
    const preferredViewportPreset = resolveProjectViewportPresetForUser(authenticatedUserRecord, project.id);
    const activeViewportPreset = normalizeVibeViewportPreset(requestedViewportPreset || preferredViewportPreset);

    page.vibe = {
      ...currentVibe,
      providerId: generated.providerId,
      viewportPreset: activeViewportPreset,
      prompt: "",
      includeProjectContext,
      includePageContext,
      status: "ready",
      summary: generated.summary,
      error: "",
      generatedAt,
      credentialMode: generated.credentialMode,
      availableVia: generated.availableVia,
      lastDraft: nextDraft,
      appliedDraft: normalizeVibeDraft(currentVibe.appliedDraft),
      draftHistory: mergeVibeDraftHistory(currentVibe.draftHistory, currentVibe.lastDraft, nextDraft),
    };
    if (prompt) {
      appendProjectCodexThreadMessage(project, {
        role: "user",
        kind: "prompt",
        userId: user.email,
        pageId: page.id,
        sessionId: String(payload.sessionId || "").trim(),
        content: prompt,
        metadata: {
          providerId: generated.providerId,
          providerLabel: generated.providerLabel,
          includeProjectContext,
          includePageContext,
          viewportPreset: activeViewportPreset,
        },
        createdAt: generatedAt,
      });
    }
    appendProjectCodexThreadMessage(project, {
      role: "assistant",
      kind: "generation",
      userId: user.email,
      pageId: page.id,
      sessionId: String(payload.sessionId || "").trim(),
      content: createCodexThreadContent(generated.assistantMessage || generated.summary, page.name),
      metadata: {
        providerId: generated.providerId,
        providerLabel: generated.providerLabel,
        viewportPreset: activeViewportPreset,
      },
      createdAt: generatedAt + 1,
    });
    project.updatedAt = generatedAt;
    await writeDynamicProject(project);

    return {
      status: 200,
      payload: {
        ok: true,
        project: await buildProjectPayload(project, await buildOwnerDirectory(), user, origin),
        vibeProviders: listVibeProviders(),
      },
    };
  }

  if (action === "applyVibeContent") {
    const projectId = normalizeProjectId(payload.project);
    const pageId = normalizePageId(payload.page);

    if (!projectId || !pageId) {
      return {
        status: 400,
        payload: { ok: false, error: "Choose a valid project page." },
      };
    }

    const project = await readDynamicProject(projectId);

    if (!project) {
      return {
        status: 404,
        payload: { ok: false, error: "Project not found." },
      };
    }

    const access = await computeProjectAccess(user, project);

    if (!access.hasAccess) {
      return {
        status: 403,
        payload: { ok: false, error: "You do not have access to this project." },
      };
    }

    const page = project.pages.find((entry) => entry.id === pageId);

    if (!page) {
      return {
        status: 404,
        payload: { ok: false, error: "Page not found." },
      };
    }

    const currentVibe = normalizeVibeState(page.vibe);
    const requestedDraftGeneratedAt = Number(payload.draftGeneratedAt) || 0;
    const targetDraft = requestedDraftGeneratedAt
      ? findVibeDraftByGeneratedAt(currentVibe, requestedDraftGeneratedAt)
      : normalizeVibeDraft(currentVibe.lastDraft);

    if (!targetDraft?.html) {
      return {
        status: 400,
        payload: { ok: false, error: "Generate content before applying it." },
      };
    }

    const appliedAt = Date.now();
    page.vibe = {
      ...currentVibe,
      status: "applied",
      appliedAt,
      appliedDraft: {
        ...targetDraft,
        generatedAt: targetDraft.generatedAt || appliedAt,
      },
    };
    syncAppliedPreviewIntoPage(page, page.vibe.appliedDraft, appliedAt);
    project.updatedAt = appliedAt;
    const persistedProject = await persistProject(project, { syncWorkspace: true });

    return {
      status: 200,
      payload: {
        ok: true,
        project: await buildProjectPayload(persistedProject, await buildOwnerDirectory(), user, origin),
        vibeProviders: listVibeProviders(),
      },
    };
  }

  if (action === "savePreviewContentEdits") {
    const projectId = normalizeProjectId(payload.project);
    const pageId = normalizePageId(payload.page);
    const submittedHtml = String(payload.html || "").trim();
    const submittedCss = String(payload.css || "").trim();
    const submittedStageStyle = String(payload.stageStyle || "").trim();
    const nextSummary = String(payload.summary || "").trim();
    const shouldSyncBasePreview = payload.syncBase !== false;
    const nextBreakpointOverrides =
      payload.breakpointOverrides && typeof payload.breakpointOverrides === "object"
        ? payload.breakpointOverrides
        : {};

    if (!projectId || !pageId || !submittedHtml) {
      return {
        status: 400,
        payload: { ok: false, error: "Choose a valid project page and preview content." },
      };
    }

    const project = await readDynamicProject(projectId);

    if (!project) {
      return {
        status: 404,
        payload: { ok: false, error: "Project not found." },
      };
    }

    const access = await computeProjectAccess(user, project);

    if (!access.hasAccess) {
      return {
        status: 403,
        payload: { ok: false, error: "You do not have access to this project." },
      };
    }

    const page = project.pages.find((entry) => entry.id === pageId);

    if (!page) {
      return {
        status: 404,
        payload: { ok: false, error: "Page not found." },
      };
    }

    const currentVibe = normalizeVibeState(page.vibe);
    const existingPreview = normalizePagePreview(page.preview || currentVibe.appliedDraft || currentVibe.lastDraft);
    const nextHtml = shouldSyncBasePreview
      ? submittedHtml
      : String(existingPreview?.html || submittedHtml || "").trim();
    const nextCss = shouldSyncBasePreview
      ? submittedCss
      : String(existingPreview?.css || submittedCss || "").trim();
    const nextStageStyle = shouldSyncBasePreview
      ? submittedStageStyle
      : String(existingPreview?.stageStyle || submittedStageStyle || "").trim();
    const updatedAt = Date.now();
    const providerId = existingPreview?.providerId || currentVibe.providerId || DEFAULT_VIBE_PROVIDER_ID;
    const providerLabel =
      existingPreview?.providerLabel ||
      currentVibe.appliedDraft?.providerLabel ||
      currentVibe.lastDraft?.providerLabel ||
      "";
    const generatedAt =
      Number(existingPreview?.generatedAt) ||
      Number(currentVibe.appliedDraft?.generatedAt) ||
      Number(currentVibe.lastDraft?.generatedAt) ||
      updatedAt;
    const summary = nextSummary || existingPreview?.summary || currentVibe.summary || "";
    const assets = Array.isArray(currentVibe.appliedDraft?.assets)
      ? currentVibe.appliedDraft.assets
      : Array.isArray(currentVibe.lastDraft?.assets)
        ? currentVibe.lastDraft.assets
        : [];

    const nextDraft = normalizeVibeDraft({
      providerId,
      providerLabel,
      summary,
      assistantMessage:
        String(currentVibe.appliedDraft?.assistantMessage || "").trim() ||
        String(currentVibe.lastDraft?.assistantMessage || "").trim(),
      html: nextHtml,
      css: nextCss,
      stageStyle: nextStageStyle,
      breakpointOverrides: nextBreakpointOverrides,
      generatedAt,
      assets,
      credentialMode: currentVibe.credentialMode,
    });

    page.vibe = {
      ...currentVibe,
      status: "applied",
      summary,
      error: "",
      appliedAt: updatedAt,
      appliedDraft: nextDraft,
      lastDraft: currentVibe.lastDraft && Number(currentVibe.lastDraft.generatedAt || 0) === generatedAt ? nextDraft : currentVibe.lastDraft,
    };

    page.preview = normalizePagePreview({
      providerId,
      providerLabel,
      summary,
      assistantMessage: nextDraft?.assistantMessage || "",
      html: nextHtml,
      css: nextCss,
      stageStyle: nextStageStyle,
      breakpointOverrides: nextBreakpointOverrides,
      generatedAt,
      appliedAt: updatedAt,
      updatedAt,
      source: "manual-edit",
    });
    page.hasContent = true;
    project.updatedAt = updatedAt;
    const persistedProject = await persistProject(project, { syncWorkspace: true });

    return {
      status: 200,
      payload: {
        ok: true,
        project: await buildProjectPayload(persistedProject, await buildOwnerDirectory(), user, origin),
        vibeProviders: listVibeProviders(),
      },
    };
  }

  if (action === "clearVibeContent") {
    const projectId = normalizeProjectId(payload.project);
    const pageId = normalizePageId(payload.page);

    if (!projectId || !pageId) {
      return {
        status: 400,
        payload: { ok: false, error: "Choose a valid project page." },
      };
    }

    const project = await readDynamicProject(projectId);

    if (!project) {
      return {
        status: 404,
        payload: { ok: false, error: "Project not found." },
      };
    }

    const access = await computeProjectAccess(user, project);

    if (!access.hasAccess) {
      return {
        status: 403,
        payload: { ok: false, error: "You do not have access to this project." },
      };
    }

    const page = project.pages.find((entry) => entry.id === pageId);

    if (!page) {
      return {
        status: 404,
        payload: { ok: false, error: "Page not found." },
      };
    }

    const currentVibe = normalizeVibeState(page.vibe);
    const clearedAt = Date.now();

    page.vibe = {
      ...createDefaultVibeState(),
      providerId: currentVibe.providerId || DEFAULT_VIBE_PROVIDER_ID,
      includeProjectContext: currentVibe.includeProjectContext !== false,
      includePageContext: currentVibe.includePageContext !== false,
    };
    syncAppliedPreviewIntoPage(page, null, clearedAt);
    project.updatedAt = clearedAt;
    const persistedProject = await persistProject(project, { syncWorkspace: true });

    return {
      status: 200,
      payload: {
        ok: true,
        project: await buildProjectPayload(persistedProject, await buildOwnerDirectory(), user, origin),
        vibeProviders: listVibeProviders(),
      },
    };
  }

  if (action === "restorePageSnapshot") {
    const projectId = normalizeProjectId(payload.project);
    const snapshotValue = payload.pageSnapshot && typeof payload.pageSnapshot === "object" ? payload.pageSnapshot : null;
    const pageSnapshot = snapshotValue ? normalizeProjectPage(snapshotValue, projectId) : null;
    const pageId = normalizePageId(pageSnapshot?.id || payload.page);
    const requestedIndex = Number(payload.pageIndex);
    const prototypeLinksSnapshot = Array.isArray(payload.prototypeLinksSnapshot)
      ? normalizePrototypeLinks(payload.prototypeLinksSnapshot)
      : null;
    const pageLocksSnapshot = Array.isArray(payload.pageLocksSnapshot)
      ? normalizePageLocks(payload.pageLocksSnapshot)
      : null;

    if (!projectId || !pageId || !pageSnapshot) {
      return {
        status: 400,
        payload: { ok: false, error: "Choose a valid project page snapshot." },
      };
    }

    const project = await readDynamicProject(projectId);

    if (!project) {
      return {
        status: 404,
        payload: { ok: false, error: "Project not found." },
      };
    }

    if (!(await userCanManageProjectPages(user, project))) {
      return {
        status: 403,
        payload: { ok: false, error: "You do not have permission to restore pages in this project." },
      };
    }

    const existingIndex = project.pages.findIndex((entry) => entry.id === pageId);

    if (existingIndex >= 0) {
      project.pages.splice(existingIndex, 1, pageSnapshot);
    } else {
      const insertIndex = Number.isFinite(requestedIndex)
        ? Math.min(Math.max(Math.trunc(requestedIndex), 0), project.pages.length)
        : project.pages.length;
      project.pages.splice(insertIndex, 0, pageSnapshot);
    }

    if (prototypeLinksSnapshot) {
      project.prototypeLinks = prototypeLinksSnapshot;
    }

    if (pageLocksSnapshot) {
      project.pageLocks = pageLocksSnapshot;
    }

    project.updatedAt = Date.now();
    const persistedProject = await persistProject(project, { syncWorkspace: true });
    const persistedPage = persistedProject.pages.find((entry) => entry.id === pageSnapshot.id) || pageSnapshot;

    return {
      status: 200,
      payload: {
        ok: true,
        page: createPageResponse(persistedProject, persistedPage),
        project: await buildProjectPayload(persistedProject, await buildOwnerDirectory(), user, origin),
      },
    };
  }

  if (action === "restoreVibeDraft") {
    const projectId = normalizeProjectId(payload.project);
    const pageId = normalizePageId(payload.page);
    const draftGeneratedAt = Number(payload.draftGeneratedAt) || 0;

    if (!projectId || !pageId || !draftGeneratedAt) {
      return {
        status: 400,
        payload: { ok: false, error: "Choose a valid project page version." },
      };
    }

    const project = await readDynamicProject(projectId);

    if (!project) {
      return {
        status: 404,
        payload: { ok: false, error: "Project not found." },
      };
    }

    const access = await computeProjectAccess(user, project);

    if (!access.hasAccess) {
      return {
        status: 403,
        payload: { ok: false, error: "You do not have access to this project." },
      };
    }

    const page = project.pages.find((entry) => entry.id === pageId);

    if (!page) {
      return {
        status: 404,
        payload: { ok: false, error: "Page not found." },
      };
    }

    const currentVibe = normalizeVibeState(page.vibe);
    const targetDraft = findVibeDraftByGeneratedAt(currentVibe, draftGeneratedAt);

    if (!targetDraft) {
      return {
        status: 404,
        payload: { ok: false, error: "Version not found." },
      };
    }

    const restoredAt = Date.now();
    page.vibe = {
      ...currentVibe,
      status: "ready",
      summary: targetDraft.summary,
      error: "",
      generatedAt: targetDraft.generatedAt || restoredAt,
      providerId: targetDraft.providerId || currentVibe.providerId,
      credentialMode: targetDraft.credentialMode || currentVibe.credentialMode,
      lastDraft: targetDraft,
      draftHistory: mergeVibeDraftHistory(currentVibe.draftHistory, currentVibe.lastDraft, targetDraft),
    };
    project.updatedAt = restoredAt;
    await writeDynamicProject(project);

    return {
      status: 200,
      payload: {
        ok: true,
        project: await buildProjectPayload(project, await buildOwnerDirectory(), user, origin),
        vibeProviders: listVibeProviders(),
      },
    };
  }

  if (action === "renamePage") {
    const projectId = normalizeProjectId(payload.project);
    const pageId = normalizePageId(payload.page);
    const nextName = String(payload.name || "").trim();

    if (!projectId || !pageId) {
      return {
        status: 400,
        payload: {
          ok: false,
          error: "Choose a valid project page.",
        },
      };
    }

    if (!nextName) {
      return {
        status: 400,
        payload: {
          ok: false,
          error: "Page name is required.",
        },
      };
    }

    const project = await readDynamicProject(projectId);

    if (!project) {
      return {
        status: 404,
        payload: {
          ok: false,
          error: "Project not found.",
        },
      };
    }

    const access = await computeProjectAccess(user, project);

    if (!(await userCanManageProjectPages(user, project))) {
      return {
        status: 403,
        payload: {
          ok: false,
          error: "You do not have permission to rename pages in this project.",
        },
      };
    }

    const page = project.pages.find((entry) => entry.id === pageId);

    if (!page) {
      return {
        status: 404,
        payload: {
          ok: false,
          error: "Page not found.",
        },
      };
    }

    page.name = nextName;
    project.updatedAt = Date.now();
    const persistedProject = await persistProject(project, { syncWorkspace: true });
    const persistedPage = persistedProject.pages.find((entry) => entry.id === page.id) || page;

    return {
      status: 200,
      payload: {
        ok: true,
        page: createPageResponse(persistedProject, persistedPage),
        project: await buildProjectPayload(persistedProject, await buildOwnerDirectory(), user, origin),
      },
    };
  }

  if (action === "deletePage") {
    const projectId = normalizeProjectId(payload.project);
    const pageId = normalizePageId(payload.page);

    if (!projectId || !pageId) {
      return {
        status: 400,
        payload: { ok: false, error: "Choose a valid project page." },
      };
    }

    const project = await readDynamicProject(projectId);

    if (!project) {
      return {
        status: 404,
        payload: { ok: false, error: "Project not found." },
      };
    }

    if (!(await userCanManageProjectPages(user, project))) {
      return {
        status: 403,
        payload: { ok: false, error: "You do not have permission to delete pages in this project." },
      };
    }

    if (project.pages.length <= 1) {
      return {
        status: 400,
        payload: { ok: false, error: "Projects must keep at least one page." },
      };
    }

    const pageIndex = project.pages.findIndex((entry) => entry.id === pageId);

    if (pageIndex < 0) {
      return {
        status: 404,
        payload: { ok: false, error: "Page not found." },
      };
    }

    project.pages.splice(pageIndex, 1);
    project.pageLocks = normalizePageLocks(project.pageLocks).filter((lock) => lock.pageId !== pageId);
    project.prototypeLinks = normalizePrototypeLinks(project.prototypeLinks).filter(
      (entry) => entry.pageId !== pageId && entry.targetPageId !== pageId,
    );
    project.updatedAt = Date.now();
    const persistedProject = await persistProject(project, { syncWorkspace: true });
    const nextPage = persistedProject.pages[Math.max(0, pageIndex - 1)] || persistedProject.pages[0] || null;

    return {
      status: 200,
      payload: {
        ok: true,
        nextPageId: nextPage?.id || "",
        project: await buildProjectPayload(persistedProject, await buildOwnerDirectory(), user, origin),
      },
    };
  }

  if (action === "reorderPages") {
    const projectId = normalizeProjectId(payload.project);
    const requestedOrder = Array.isArray(payload.order) ? payload.order.map((value) => String(value)) : [];

    if (!projectId) {
      return {
        status: 400,
        payload: {
          ok: false,
          error: "Choose a valid project.",
        },
      };
    }

    const project = await readDynamicProject(projectId);

    if (!project) {
      return {
        status: 404,
        payload: {
          ok: false,
          error: "Project not found.",
        },
      };
    }

    const access = await computeProjectAccess(user, project);

    if (!(await userCanManageProjectPages(user, project))) {
      return {
        status: 403,
        payload: {
          ok: false,
          error: "You do not have permission to reorder pages in this project.",
        },
      };
    }

    const pageMap = new Map(project.pages.map((page) => [page.id, page]));
    const validIds = project.pages.map((page) => page.id);
    const dedupedOrder = requestedOrder.filter(
      (value, index) => validIds.includes(value) && requestedOrder.indexOf(value) === index,
    );
    const finalOrder = [...dedupedOrder, ...validIds.filter((value) => !dedupedOrder.includes(value))];

    project.pages = finalOrder.map((pageId) => pageMap.get(pageId)).filter(Boolean);
    project.updatedAt = Date.now();
    const persistedProject = await persistProject(project, { syncWorkspace: true });

    return {
      status: 200,
      payload: {
        ok: true,
        project: await buildProjectPayload(persistedProject, await buildOwnerDirectory(), user, origin),
      },
    };
  }

  if (action === "listPages") {
    const projectId = normalizeProjectId(payload.project);

    if (!projectId) {
      return {
        status: 400,
        payload: { ok: false, error: "Choose a valid project." },
      };
    }

    const project = await readDynamicProject(projectId);

    if (!project) {
      return {
        status: 404,
        payload: { ok: false, error: "Project not found." },
      };
    }

    const access = await computeProjectAccess(user, project);

    if (!access.hasAccess) {
      return {
        status: 403,
        payload: { ok: false, error: "You do not have access to this project." },
      };
    }

    return {
      status: 200,
      payload: {
        ok: true,
        pages: listProjectPages(project),
      },
    };
  }

  if (action === "createProjectCodexContext") {
    const projectId = normalizeProjectId(payload.project);

    if (!projectId) {
      return {
        status: 400,
        payload: { ok: false, error: "Choose a valid project." },
      };
    }

    const project = await readDynamicProject(projectId);

    if (!project) {
      return {
        status: 404,
        payload: { ok: false, error: "Project not found." },
      };
    }

    if (!(await userCanManageProjectSharing(user, project))) {
      return {
        status: 403,
        payload: { ok: false, error: "Only the Project Owner or Admin can manage the Codex project context." },
      };
    }

    const persistedProject = await ensureProjectCodexContext(project);

    return {
      status: 200,
      payload: {
        ok: true,
        codexContext: createProjectContextPayload(persistedProject),
        project: await buildProjectPayload(persistedProject, await buildOwnerDirectory(), user, origin),
      },
    };
  }

  if (action === "setCodexActivePage") {
    const projectId = normalizeProjectId(payload.project);
    const pageId = normalizePageId(payload.page);

    if (!projectId || !pageId) {
      return {
        status: 400,
        payload: { ok: false, error: "Choose a valid project page." },
      };
    }

    const project = await readDynamicProject(projectId);

    if (!project) {
      return {
        status: 404,
        payload: { ok: false, error: "Project not found." },
      };
    }

    const access = await computeProjectAccess(user, project);

    if (!access.hasAccess) {
      return {
        status: 403,
        payload: { ok: false, error: "You do not have access to this project." },
      };
    }

    if (!project.pages.some((page) => page.id === pageId)) {
      return {
        status: 404,
        payload: { ok: false, error: "Page not found." },
      };
    }

    const currentThread = normalizeProjectCodexThread(project);

    if (currentThread.activePageId === pageId) {
      return {
        status: 200,
        payload: {
          ok: true,
          project: await buildProjectPayload(project, await buildOwnerDirectory(), user, origin),
        },
      };
    }

    setProjectCodexActivePage(project, pageId);
    project.updatedAt = Date.now();
    const persistedProject = await persistProject(project, { syncWorkspace: false });

    return {
      status: 200,
      payload: {
        ok: true,
        project: await buildProjectPayload(persistedProject, await buildOwnerDirectory(), user, origin),
      },
    };
  }

  if (action === "setVibeViewport") {
    const projectId = normalizeProjectId(payload.project);
    const viewportPreset = normalizeVibeViewportPreset(payload.viewportPreset);

    if (!projectId) {
      return {
        status: 400,
        payload: { ok: false, error: "Choose a valid project." },
      };
    }

    const project = await readDynamicProject(projectId);

    if (!project) {
      return {
        status: 404,
        payload: { ok: false, error: "Project not found." },
      };
    }

    const access = await computeProjectAccess(user, project);

    if (!access.hasAccess) {
      return {
        status: 403,
        payload: { ok: false, error: "You do not have access to this project." },
      };
    }

    const currentViewportPreset = resolveProjectViewportPresetForUser(authenticatedUserRecord, project.id);
    const ownerDirectory = await buildOwnerDirectory();

    if (currentViewportPreset === viewportPreset) {
      return {
        status: 200,
        payload: {
          ok: true,
          project: await buildProjectPayload(project, ownerDirectory, user, origin, {
            userRecord: authenticatedUserRecord,
          }),
        },
      };
    }

    await writeProjectViewportPresetForUser(authenticatedUserRecord, project.id, viewportPreset);
    const updatedUserRecord = authenticatedUserRecord?.email ? await readUser(authenticatedUserRecord.email) : authenticatedUserRecord;

    return {
      status: 200,
      payload: {
        ok: true,
        project: await buildProjectPayload(project, ownerDirectory, user, origin, {
          userRecord: updatedUserRecord || authenticatedUserRecord,
        }),
      },
    };
  }

  if (action === "setInspectorPinnedPreference") {
    const projectId = normalizeProjectId(payload.project);
    const inspectorPinned = normalizeInspectorPinnedPreference(payload.inspectorPinned);

    if (!projectId) {
      return {
        status: 400,
        payload: { ok: false, error: "Choose a valid project." },
      };
    }

    const project = await readDynamicProject(projectId);

    if (!project) {
      return {
        status: 404,
        payload: { ok: false, error: "Project not found." },
      };
    }

    const access = await computeProjectAccess(user, project);

    if (!access.hasAccess) {
      return {
        status: 403,
        payload: { ok: false, error: "You do not have access to this project." },
      };
    }

    const currentInspectorPinned = resolveInspectorPinnedPreferenceForUser(authenticatedUserRecord);

    if (currentInspectorPinned !== inspectorPinned) {
      await writeInspectorPinnedPreferenceForUser(authenticatedUserRecord, inspectorPinned);
    }

    return {
      status: 200,
      payload: {
        ok: true,
        project: await buildProjectPayload(project, await buildOwnerDirectory(), user, origin),
      },
    };
  }

  if (action === "appendCodexThreadMessage") {
    const projectId = normalizeProjectId(payload.project);
    const pageId = normalizePageId(payload.page);
    const sessionId = String(payload.sessionId || "").trim();
    const role = String(payload.role || "user").trim().toLowerCase() || "user";
    const kind = String(payload.kind || role).trim().toLowerCase() || role;
    const content = String(payload.content || "").trim();

    if (!projectId || !content) {
      return {
        status: 400,
        payload: { ok: false, error: "Choose a valid project and message." },
      };
    }

    const project = await readDynamicProject(projectId);

    if (!project) {
      return {
        status: 404,
        payload: { ok: false, error: "Project not found." },
      };
    }

    const access = await computeProjectAccess(user, project);

    if (!access.hasAccess) {
      return {
        status: 403,
        payload: { ok: false, error: "You do not have access to this project." },
      };
    }

    if (pageId && !project.pages.some((page) => page.id === pageId)) {
      return {
        status: 404,
        payload: { ok: false, error: "Page not found." },
      };
    }

    appendProjectCodexThreadMessage(project, {
      role,
      kind,
      userId: user.email,
      pageId,
      sessionId,
      content,
      metadata: payload.metadata,
      createdAt: Date.now(),
    });
    project.updatedAt = Date.now();
    const persistedProject = await persistProject(project, { syncWorkspace: false });

    return {
      status: 200,
      payload: {
        ok: true,
        project: await buildProjectPayload(persistedProject, await buildOwnerDirectory(), user, origin),
      },
    };
  }

  if (action === "createPageFromCodex") {
    const projectId = normalizeProjectId(payload.project);
    const name = String(payload.name || "").trim();
    const pageId = normalizePageId(payload.pageId);

    if (!projectId || !name) {
      return {
        status: 400,
        payload: { ok: false, error: "Provide a project and page name." },
      };
    }

    const project = await readDynamicProject(projectId);

    if (!project) {
      return {
        status: 404,
        payload: { ok: false, error: "Project not found." },
      };
    }

    if (!(await userCanCreateEditSession(user, project))) {
      return {
        status: 403,
        payload: { ok: false, error: "You do not have permission to create pages through Codex for this project." },
      };
    }

    const { project: persistedProject, page } = await createProjectPage(project, user, name, { source: "codex" });
    const nextPageId = pageId || page.id;

    return {
      status: 200,
      payload: {
        ok: true,
        page: createPageResponse(persistedProject, page),
        project: await buildProjectPayload(persistedProject, await buildOwnerDirectory(), user, origin),
        launchUrl: buildDynamicPageLaunchUrl(persistedProject.id, nextPageId),
      },
    };
  }

  if (action === "createEditSession") {
    const projectId = normalizeProjectId(payload.project);
    const pageId = normalizePageId(payload.page);

    if (!projectId) {
      return {
        status: 400,
        payload: { ok: false, error: "Choose a valid project." },
      };
    }

    const project = await readDynamicProject(projectId);

    if (!project) {
      return {
        status: 404,
        payload: { ok: false, error: "Project not found." },
      };
    }

    if (!(await userCanCreateEditSession(user, project))) {
      return {
        status: 403,
        payload: { ok: false, error: "You do not have permission to create a Codex edit session for this project." },
      };
    }

    if (pageId && !project.pages.some((page) => page.id === pageId)) {
      return {
        status: 404,
        payload: { ok: false, error: "Page not found." },
      };
    }

    let session = createEditSessionRecord(project, user, pageId, payload.source || "scaffold");

    try {
      const gitWorkspace = await createProjectEditSessionWorkspace({
        projectId: project.id,
        branchName: session.branchName,
        sessionId: session.id,
      });

      session = {
        ...session,
        worktreePath: gitWorkspace.worktreePath,
        baseBranch: gitWorkspace.baseBranch,
        executionMode: gitWorkspace.executionMode,
        lastGitError: "",
      };
    } catch (error) {
      return {
        status: 400,
        payload: {
          ok: false,
          error: error instanceof Error ? error.message : "Unable to create an isolated edit-session worktree.",
        },
      };
    }

    project.editSessions = [...normalizeEditSessions(project.editSessions), session];

    if (pageId) {
      setProjectCodexActivePage(project, pageId);
      project.pageLocks = normalizePageLocks(project.pageLocks).filter((lock) => lock.pageId !== pageId);
      project.pageLocks.push(createPageLockRecord(pageId, user, session.id));
    }

    project.updatedAt = Date.now();
    const sessionPage = project.pages.find((page) => page.id === pageId) || null;
    appendProjectCodexThreadMessage(project, {
      role: "assistant",
      kind: "session",
      userId: user.email,
      pageId,
      sessionId: session.id,
      content: createCodexThreadContent(
        `Started an edit session on branch ${session.branchName || "codex branch"}.`,
        sessionPage?.name || "",
      ),
      metadata: {
        status: session.status,
        branchName: session.branchName,
      },
      createdAt: project.updatedAt,
    });
    const persistedProject = await persistProject(project, { syncWorkspace: true });

    return {
      status: 200,
      payload: {
        ok: true,
        session,
        project: await buildProjectPayload(persistedProject, await buildOwnerDirectory(), user, origin),
      },
    };
  }

  if (action === "mergeEditSession") {
    const projectId = normalizeProjectId(payload.project);
    const sessionId = String(payload.sessionId || "").trim();

    if (!projectId || !sessionId) {
      return {
        status: 400,
        payload: { ok: false, error: "Choose a valid edit session." },
      };
    }

    const project = await readDynamicProject(projectId);

    if (!project) {
      return {
        status: 404,
        payload: { ok: false, error: "Project not found." },
      };
    }

    if (!(await userCanManageProjectSharing(user, project))) {
      return {
        status: 403,
        payload: { ok: false, error: "Only the Project Owner or Admin can merge edit sessions." },
      };
    }

    const session = normalizeEditSessions(project.editSessions).find((entry) => entry.id === sessionId);

    if (!session) {
      return {
        status: 404,
        payload: { ok: false, error: "Edit session not found." },
      };
    }

    let mergedAt = Date.now();

    try {
      await mergeProjectEditSessionWorkspace({
        projectId: project.id,
        branchName: session.branchName,
        worktreePath: session.worktreePath,
        baseBranch: session.baseBranch,
      });
    } catch (error) {
      return {
        status: 400,
        payload: {
          ok: false,
          error: error instanceof Error ? error.message : "Unable to merge this edit session.",
        },
      };
    }

    project.editSessions = normalizeEditSessions(project.editSessions).map((entry) =>
      entry.id === sessionId
        ? {
            ...entry,
            status: EDIT_SESSION_STATUS_MERGED,
            updatedAt: mergedAt,
            mergedAt,
            lastGitError: "",
          }
        : entry,
    );
    project.pageLocks = normalizePageLocks(project.pageLocks).filter((lock) => lock.sessionId !== sessionId);
    project.updatedAt = mergedAt;
    const sessionPage = project.pages.find((page) => page.id === session.pageId) || null;
    appendProjectCodexThreadMessage(project, {
      role: "assistant",
      kind: "merge",
      userId: user.email,
      pageId: session.pageId,
      sessionId,
      content: createCodexThreadContent("Merged the edit session into the project.", sessionPage?.name || ""),
      metadata: {
        branchName: session.branchName,
        status: EDIT_SESSION_STATUS_MERGED,
      },
      createdAt: mergedAt,
    });
    const persistedProject = await persistProject(project, { syncWorkspace: true });
    await recordAuditEvent({
      actorEmail: user.email,
      actorRole: user.role,
      action: "project.merge_edit_session",
      resourceType: "project",
      resourceId: persistedProject.id,
      metadata: {
        sessionId,
        branchName: session.branchName,
        pageId: session.pageId,
      },
    });

    return {
      status: 200,
      payload: {
        ok: true,
        session: {
          ...session,
          status: EDIT_SESSION_STATUS_MERGED,
          updatedAt: mergedAt,
          mergedAt,
          lastGitError: "",
        },
        project: await buildProjectPayload(persistedProject, await buildOwnerDirectory(), user, origin),
      },
    };
  }

  if (action === "getEditSessionReview") {
    const projectId = normalizeProjectId(payload.project);
    const sessionId = String(payload.sessionId || "").trim();

    if (!projectId || !sessionId) {
      return {
        status: 400,
        payload: { ok: false, error: "Choose a valid edit session." },
      };
    }

    const project = await readDynamicProject(projectId);

    if (!project) {
      return {
        status: 404,
        payload: { ok: false, error: "Project not found." },
      };
    }

    if (!(await userCanManageProjectSharing(user, project)) && !(await userCanCreateEditSession(user, project))) {
      return {
        status: 403,
        payload: { ok: false, error: "You do not have permission to review this edit session." },
      };
    }

    const session = normalizeEditSessions(project.editSessions).find((entry) => entry.id === sessionId);

    if (!session) {
      return {
        status: 404,
        payload: { ok: false, error: "Edit session not found." },
      };
    }

    try {
      const review = await getProjectEditSessionReview({
        projectId: project.id,
        branchName: session.branchName,
        baseBranch: session.baseBranch,
      });

      return {
        status: 200,
        payload: {
          ok: true,
          session,
          review,
        },
      };
    } catch (error) {
      return {
        status: 400,
        payload: {
          ok: false,
          error: error instanceof Error ? error.message : "Unable to load the edit-session review.",
        },
      };
    }
  }

  if (action === "updateEditSessionStatus") {
    const projectId = normalizeProjectId(payload.project);
    const sessionId = String(payload.sessionId || "").trim();
    const nextStatus = normalizeEditSessionStatus(payload.status);

    if (!projectId || !sessionId) {
      return {
        status: 400,
        payload: { ok: false, error: "Choose a valid edit session." },
      };
    }

    if (![EDIT_SESSION_STATUS_ACTIVE, EDIT_SESSION_STATUS_READY_FOR_REVIEW, EDIT_SESSION_STATUS_ARCHIVED].includes(nextStatus)) {
      return {
        status: 400,
        payload: { ok: false, error: "Choose a supported session status." },
      };
    }

    const project = await readDynamicProject(projectId);

    if (!project) {
      return {
        status: 404,
        payload: { ok: false, error: "Project not found." },
      };
    }

    const session = normalizeEditSessions(project.editSessions).find((entry) => entry.id === sessionId);

    if (!session) {
      return {
        status: 404,
        payload: { ok: false, error: "Edit session not found." },
      };
    }

    if (!(await userCanManageEditSession(user, project, session))) {
      return {
        status: 403,
        payload: { ok: false, error: "You do not have permission to update this edit session." },
      };
    }

    project.editSessions = normalizeEditSessions(project.editSessions).map((entry) =>
      entry.id === sessionId
        ? {
            ...entry,
            status: nextStatus,
            updatedAt: Date.now(),
          }
        : entry,
    );

    if (!isOpenEditSessionStatus(nextStatus)) {
      project.pageLocks = normalizePageLocks(project.pageLocks).filter((lock) => lock.sessionId !== sessionId);
    }

    project.updatedAt = Date.now();
    const sessionPage = project.pages.find((page) => page.id === session.pageId) || null;
    appendProjectCodexThreadMessage(project, {
      role: "assistant",
      kind: "session-status",
      userId: user.email,
      pageId: session.pageId,
      sessionId,
      content: createCodexThreadContent(
        nextStatus === EDIT_SESSION_STATUS_READY_FOR_REVIEW
          ? "Marked the current edit session ready for review."
          : nextStatus === EDIT_SESSION_STATUS_ACTIVE
            ? "Resumed editing for the current page session."
            : "Archived the current edit session.",
        sessionPage?.name || "",
      ),
      metadata: {
        status: nextStatus,
        branchName: session.branchName,
      },
      createdAt: project.updatedAt,
    });
    const persistedProject = await persistProject(project, { syncWorkspace: true });
    await recordAuditEvent({
      actorEmail: user.email,
      actorRole: user.role,
      action: "project.update_edit_session_status",
      resourceType: "project",
      resourceId: persistedProject.id,
      metadata: {
        sessionId,
        nextStatus,
        pageId: session.pageId,
      },
    });

    return {
      status: 200,
      payload: {
        ok: true,
        session: {
          ...session,
          status: nextStatus,
          updatedAt: project.updatedAt,
        },
        project: await buildProjectPayload(persistedProject, await buildOwnerDirectory(), user, origin),
      },
    };
  }

  if (action === "createPrototypeLink") {
    const projectId = normalizeProjectId(payload.project);

    if (!projectId) {
      return {
        status: 400,
        payload: { ok: false, error: "Choose a valid project." },
      };
    }

    const project = await readDynamicProject(projectId);

    if (!project) {
      return {
        status: 404,
        payload: { ok: false, error: "Project not found." },
      };
    }

    const access = await computeProjectAccess(user, project);

    if (!access.hasAccess) {
      return {
        status: 403,
        payload: { ok: false, error: "You do not have access to this project." },
      };
    }

    const prototypeLink = createPrototypeLinkRecord(project, payload, user);

    if (!prototypeLink.url) {
      return {
        status: 400,
        payload: { ok: false, error: "Prototype link URL is required." },
      };
    }

    project.prototypeLinks = [
      ...normalizePrototypeLinks(project.prototypeLinks).filter((entry) => !matchesPrototypeLinkSource(entry, payload)),
      prototypeLink,
    ];
    project.updatedAt = Date.now();
    const persistedProject = await persistProject(project, { syncWorkspace: true });
    await recordAuditEvent({
      actorEmail: user.email,
      actorRole: user.role,
      action: "project.create_prototype_link",
      resourceType: "project",
      resourceId: persistedProject.id,
      metadata: {
        prototypeLinkId: prototypeLink.id,
        pageId: prototypeLink.pageId,
        label: prototypeLink.label,
      },
    });

    return {
      status: 200,
      payload: {
        ok: true,
        prototypeLink,
        project: await buildProjectPayload(persistedProject, await buildOwnerDirectory(), user, origin),
      },
    };
  }

  if (action === "removePrototypeLink") {
    const projectId = normalizeProjectId(payload.project);

    if (!projectId) {
      return {
        status: 400,
        payload: { ok: false, error: "Choose a valid project." },
      };
    }

    const project = await readDynamicProject(projectId);

    if (!project) {
      return {
        status: 404,
        payload: { ok: false, error: "Project not found." },
      };
    }

    const access = await computeProjectAccess(user, project);

    if (!access.hasAccess) {
      return {
        status: 403,
        payload: { ok: false, error: "You do not have access to this project." },
      };
    }

    const existingLinks = normalizePrototypeLinks(project.prototypeLinks);
    const nextLinks = existingLinks.filter((entry) => !matchesPrototypeLinkSource(entry, payload));

    if (nextLinks.length === existingLinks.length) {
      return {
        status: 404,
        payload: { ok: false, error: "Prototype link not found." },
      };
    }

    project.prototypeLinks = nextLinks;
    project.updatedAt = Date.now();
    const persistedProject = await persistProject(project, { syncWorkspace: true });
    await recordAuditEvent({
      actorEmail: user.email,
      actorRole: user.role,
      action: "project.remove_prototype_link",
      resourceType: "project",
      resourceId: persistedProject.id,
      metadata: {
        sourcePageId: normalizePageId(payload.sourcePageId),
        sourceLayerPath: String(payload.sourceLayerPath || "").trim(),
      },
    });

    return {
      status: 200,
      payload: {
        ok: true,
        project: await buildProjectPayload(persistedProject, await buildOwnerDirectory(), user, origin),
      },
    };
  }

  if (action === "updateProjectPrivacy") {
    const projectId = normalizeProjectId(payload.project);

    if (!projectId) {
      return {
        status: 400,
        payload: { ok: false, error: "Choose a valid project." },
      };
    }

    const project = await readDynamicProject(projectId);

    if (!project) {
      return {
        status: 404,
        payload: { ok: false, error: "Project not found." },
      };
    }

    if (!(await userCanManageProjectSharing(user, project))) {
      return {
        status: 403,
        payload: { ok: false, error: "Only the Project Owner or Admin can update project privacy." },
      };
    }

    updateProjectPrivacySettings(project, payload);
    project.updatedAt = Date.now();
    const persistedProject = await persistProject(project, { syncWorkspace: true });
    await recordAuditEvent({
      actorEmail: user.email,
      actorRole: user.role,
      action: "project.update_privacy",
      resourceType: "project",
      resourceId: persistedProject.id,
      metadata: {
        visibility: persistedProject.visibility,
        sharingMode: persistedProject.sharingMode,
        codexAccessMode: persistedProject.codexAccessMode,
      },
    });

    return {
      status: 200,
      payload: {
        ok: true,
        message: "Project privacy updated.",
        project: await buildProjectPayload(persistedProject, await buildOwnerDirectory(), user, origin),
      },
    };
  }

  if (action === "requestAccess") {
    const projectId = normalizeProjectId(payload.project);

    if (!projectId) {
      return {
        status: 400,
        payload: { ok: false, error: "Choose a valid project." },
      };
    }

    const project = await readDynamicProject(projectId);

    if (!project) {
      return {
        status: 404,
        payload: { ok: false, error: "Project not found." },
      };
    }

    const access = await computeProjectAccess(user, project);

    if (access.hasAccess) {
      return {
        status: 200,
        payload: {
          ok: true,
          message: "You already have access to this project.",
          project: await buildProjectPayload(project, await buildOwnerDirectory(), user, origin),
        },
      };
    }

    upsertProjectMember(project, user.email, {
      role: PROJECT_ROLE_VIEWER,
      status: PROJECT_MEMBER_STATUS_REQUESTED,
      requestedAt: Date.now(),
      addedBy: "",
    });
    project.updatedAt = Date.now();
    const persistedProject = await persistProject(project, { syncWorkspace: true });
    await recordAuditEvent({
      actorEmail: user.email,
      actorRole: user.role,
      action: "project.request_access",
      resourceType: "project",
      resourceId: persistedProject.id,
      metadata: {
        requestedBy: user.email,
      },
    });

    return {
      status: 200,
      payload: {
        ok: true,
        message: "Access request sent.",
        project: await buildProjectPayload(persistedProject, await buildOwnerDirectory(), user, origin),
      },
    };
  }

  if (action === "approveAccessRequest") {
    const projectId = normalizeProjectId(payload.project);
    const targetEmail = normalizeEmail(payload.email);

    if (!projectId || !targetEmail) {
      return {
        status: 400,
        payload: { ok: false, error: "Choose a valid request." },
      };
    }

    const project = await readDynamicProject(projectId);

    if (!project) {
      return {
        status: 404,
        payload: { ok: false, error: "Project not found." },
      };
    }

    if (!(await userCanManageProjectSharing(user, project))) {
      return {
        status: 403,
        payload: { ok: false, error: "Only the Project Owner can manage project access." },
      };
    }

    upsertProjectMember(project, targetEmail, {
      role: PROJECT_ROLE_CONTRIBUTOR,
      status: PROJECT_MEMBER_STATUS_ACTIVE,
      joinedAt: Date.now(),
      addedBy: normalizeEmail(user.email),
    });
    project.updatedAt = Date.now();
    const persistedProject = await persistProject(project, { syncWorkspace: true });
    await recordAuditEvent({
      actorEmail: user.email,
      actorRole: user.role,
      action: "project.approve_access_request",
      resourceType: "project",
      resourceId: persistedProject.id,
      metadata: {
        approvedEmail: targetEmail,
      },
    });

    return {
      status: 200,
      payload: {
        ok: true,
        message: "Project access granted.",
        project: await buildProjectPayload(persistedProject, await buildOwnerDirectory(), user, origin),
      },
    };
  }

  if (action === "inviteUsers") {
    const projectId = normalizeProjectId(payload.project);
    const emails = normalizeEmailList(payload.emails);

    if (!projectId || !emails.length) {
      return {
        status: 400,
        payload: { ok: false, error: "Add at least one email address." },
      };
    }

    const project = await readDynamicProject(projectId);

    if (!project) {
      return {
        status: 404,
        payload: { ok: false, error: "Project not found." },
      };
    }

    if (!(await userCanInviteToProject(user, project))) {
      return {
        status: 403,
        payload: { ok: false, error: "You do not have permission to share this project." },
      };
    }

    const ownerDirectory = await buildOwnerDirectory();
    const knownEmails = new Set(ownerDirectory.keys());
    let invitedCount = 0;
    const pendingInviteRecipients = [];

    for (const email of emails) {
      if (!isAllowedNuSkinEmail(email) || email === normalizeEmail(project.ownerEmail)) {
        continue;
      }

      const existingMember = findProjectMember(project, email);
      const isKnownUser = knownEmails.has(email) || (await userHasGlobalProjectAccess(ownerDirectory.get(email)));
      const wasRequested = existingMember?.status === PROJECT_MEMBER_STATUS_REQUESTED;

      if (isKnownUser) {

        if (existingMember?.status !== PROJECT_MEMBER_STATUS_ACTIVE) {
          upsertProjectMember(project, email, {
            role: existingMember?.role || PROJECT_ROLE_CONTRIBUTOR,
            status: PROJECT_MEMBER_STATUS_ACTIVE,
            joinedAt: Date.now(),
            addedBy: normalizeEmail(user.email),
          });
          invitedCount += 1;
        }
      } else {
        const existingMember = findProjectMember(project, email);

        if (existingMember?.status !== PROJECT_MEMBER_STATUS_PENDING) {
          upsertProjectMember(project, email, {
            role: existingMember?.role || PROJECT_ROLE_VIEWER,
            status: PROJECT_MEMBER_STATUS_PENDING,
            invitedAt: Date.now(),
            addedBy: normalizeEmail(user.email),
          });
          invitedCount += 1;
          pendingInviteRecipients.push(email);
        }
      }

      if (wasRequested && existingMember?.status !== PROJECT_MEMBER_STATUS_ACTIVE && !isKnownUser) {
        upsertProjectMember(project, email, {
          role: PROJECT_ROLE_CONTRIBUTOR,
          status: PROJECT_MEMBER_STATUS_PENDING,
          invitedAt: Date.now(),
          requestedAt: 0,
          addedBy: normalizeEmail(user.email),
        });
      }
    }

    project.updatedAt = Date.now();
    const persistedProject = await persistProject(project, { syncWorkspace: true });
    const inviteSenderName = String(user.fullName || `${user.firstName || ""} ${user.lastName || ""}` || user.email).trim();
    const emailResults = await Promise.allSettled(
      pendingInviteRecipients.map((email) =>
        sendProjectInvitationEmail(req, {
          to: email,
          projectName: persistedProject.name,
          inviterName: inviteSenderName,
          inviterEmail: user.email,
          shareToken: persistedProject.shareToken,
        }),
      ),
    );
    let emailedCount = 0;
    const emailFailures = [];

    emailResults.forEach((result, index) => {
      const email = pendingInviteRecipients[index];

      if (result.status === "fulfilled") {
        emailedCount += 1;
        return;
      }

      console.error("[projects] failed to send project invitation email", {
        projectId: persistedProject.id,
        email,
        message: result.reason instanceof Error ? result.reason.message : String(result.reason),
      });
      emailFailures.push(email);
    });

    await recordAuditEvent({
      actorEmail: user.email,
      actorRole: user.role,
      action: "project.invite_users",
      resourceType: "project",
      resourceId: persistedProject.id,
      metadata: {
        invitedCount,
        emails,
        emailedCount,
        emailFailures,
      },
    });

    const invitationMessage =
      invitedCount === 1 ? "1 invitation added." : `${invitedCount} invitations added.`;
    const emailMessage =
      pendingInviteRecipients.length === 0
        ? ""
        : emailFailures.length
          ? emailedCount
            ? ` ${emailedCount} invitation email${emailedCount === 1 ? "" : "s"} sent, ${emailFailures.length} failed.`
            : " Invitation emails could not be sent."
          : ` ${emailedCount} invitation email${emailedCount === 1 ? "" : "s"} sent.`;

    return {
      status: 200,
      payload: {
        ok: true,
        invitedCount,
        emailedCount,
        emailFailures,
        message: `${invitationMessage}${emailMessage}`.trim(),
        project: await buildProjectPayload(persistedProject, ownerDirectory, user, origin),
      },
    };
  }

  if (action === "updateSharingMode") {
    const projectId = normalizeProjectId(payload.project);
    const sharingMode = normalizeSharingMode(payload.sharingMode);

    if (!projectId) {
      return {
        status: 400,
        payload: { ok: false, error: "Choose a valid project." },
      };
    }

    const project = await readDynamicProject(projectId);

    if (!project) {
      return {
        status: 404,
        payload: { ok: false, error: "Project not found." },
      };
    }

    if (!(await userCanManageProjectSharing(user, project))) {
      return {
        status: 403,
        payload: { ok: false, error: "Only the Project Owner can change sharing settings." },
      };
    }

    project.sharingMode = sharingMode;
    project.visibility = normalizeProjectVisibility(project.visibility, sharingMode);
    project.updatedAt = Date.now();
    const persistedProject = await persistProject(project, { syncWorkspace: true });

    return {
      status: 200,
      payload: {
        ok: true,
        message: "Sharing settings updated.",
        project: await buildProjectPayload(persistedProject, await buildOwnerDirectory(), user, origin),
      },
    };
  }

  if (action === "acceptShareLink") {
    const shareToken = String(payload.shareToken || "").trim();
    const projectId = await acceptShareLinkForUser(user.email, shareToken);

    if (!projectId) {
      return {
        status: 404,
        payload: { ok: false, error: "That share link is invalid or no longer active." },
      };
    }

    const project = await readDynamicProject(projectId);
    return {
      status: 200,
      payload: {
        ok: true,
        message: "Project access granted from share link.",
        project: await buildProjectPayload(project, await buildOwnerDirectory(), user, origin),
      },
    };
  }

  return {
    status: 400,
    payload: {
      ok: false,
      error: "Unsupported project action.",
    },
  };
}

export { sendJson, canCreateProjects };
async function canCreateProjects(user) {
  return userHasPermission(user, "projects.create");
}

async function canDuplicateProjects(user) {
  return userHasPermission(user, "projects.duplicate");
}
