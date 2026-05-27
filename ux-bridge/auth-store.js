import crypto from "node:crypto";
import { exportAdminRecoverySnapshot, restoreAdminRecoverySnapshot } from "./admin-recovery.js";
import { ensureDurableStoreAvailable } from "./db/config.js";
import { captureOperationalEvent, listRecentAuditEvents, listRecentOperationalEvents, recordAuditEvent } from "./db/observability.js";
import {
  deleteRedisKeys,
  isRedisConfigured,
  isRedisRecoverableError,
  readRedisJson,
  redisCommand,
  scanRedisKeys,
  writeRedisJson,
} from "./db/redis.js";
import {
  canUsePostgresAuthStore,
  canUsePostgresUserStore,
  deleteAuthSessionRecord,
  deleteAuthSessionsForEmail,
  deleteIntegrationSecretRecord,
  deletePasswordResetTokenRecord,
  deleteUserRecord,
  listUserRecords,
  listAuthSessionRecordsForEmail,
  readAuthSessionRecord,
  readIntegrationSecretRecord,
  readPasswordResetTokenRecord,
  readUserRecord,
  writeAuthSessionRecord,
  writeIntegrationSecretRecord,
  writePasswordResetTokenRecord,
  writeUserRecord,
} from "./db/users.js";
import {
  buildDefaultRolePermissionMap,
  getRolePermissionCatalog,
  readRolePermissionMap,
  resetRolePermissionMap,
  writeRolePermissionMap,
} from "./permissions-store.js";
import { ADMIN_ROLE, DEFAULT_ROLE, USER_ROLES, VIEW_ONLY_ROLE, normalizeRole } from "./roles.js";
import {
  deleteSecretFromVault,
  isSecretVaultConfigured,
  readSecretFromVault,
  writeSecretToVault,
} from "./secret-vault.js";
import { listVibeProviders } from "./vibe-providers.js";

const USER_STORE_KEY = "__brandAffiliateUserStore__";
const SESSION_STORE_KEY = "__brandAffiliateSessionStore__";
const SESSION_INDEX_STORE_KEY = "__brandAffiliateSessionIndexStore__";
const RESET_STORE_KEY = "__brandAffiliateResetStore__";
const INTEGRATION_SECRET_STORE_KEY = "__brandAffiliateIntegrationSecretStore__";
const SESSION_COOKIE = "brand_affiliate_session";
const SSO_STATE_COOKIE = "brand_affiliate_sso_state";
const SSO_CONTEXT_COOKIE = "brand_affiliate_sso_context";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 12;
const RESET_TOKEN_MAX_AGE_SECONDS = 60 * 60;
const SSO_STATE_MAX_AGE_SECONDS = 60 * 10;
const VALID_EMAIL_DOMAINS = ["@nuskin.com", "@nuskin.onmicrosoft.com"];
const USER_KEY_PREFIX = "brand-affiliate:user:";
const SESSION_KEY_PREFIX = "brand-affiliate:session:";
const SESSION_INDEX_KEY_PREFIX = "brand-affiliate:user-sessions:";
const RESET_KEY_PREFIX = "brand-affiliate:reset:";
const INTEGRATION_SECRET_KEY_PREFIX = "brand-affiliate:integration-secret:";
const USER_INDEX_KEY = "brand-affiliate:user-index";
const RESEND_API_URL = "https://api.resend.com/emails";
const RESEND_API_KEY = process.env.RESEND_API_KEY || "";
const EMAIL_FROM = process.env.EMAIL_FROM || "UX Bridge <onboarding@resend.dev>";
const EMAIL_REPLY_TO = process.env.EMAIL_REPLY_TO || "";
const MICROSOFT_ENTRA_TENANT_ID = String(process.env.MICROSOFT_ENTRA_TENANT_ID || "common").trim() || "common";
const MICROSOFT_ENTRA_CLIENT_ID = String(process.env.MICROSOFT_ENTRA_CLIENT_ID || "").trim();
const MICROSOFT_ENTRA_CLIENT_SECRET = String(process.env.MICROSOFT_ENTRA_CLIENT_SECRET || "").trim();
const MICROSOFT_SSO_ENABLED = Boolean(MICROSOFT_ENTRA_CLIENT_ID && MICROSOFT_ENTRA_CLIENT_SECRET);
const INTEGRATION_ENCRYPTION_SECRET =
  process.env.UX_BRIDGE_INTEGRATION_SECRET ||
  process.env.RESEND_API_KEY ||
  process.env.UPSTASH_REDIS_REST_TOKEN ||
  process.env.KV_REST_API_TOKEN ||
  "ux-bridge-local-dev-integration-secret";
const AUTH_CACHE_KEY = "__uxBridgeAuthCache__";
const USER_CACHE_TTL_MS = 30000;
const SESSION_CACHE_TTL_MS = 30000;
const USER_INDEX_CACHE_TTL_MS = 30000;
const USER_LIST_CACHE_TTL_MS = 30000;
const USER_DIRECTORY_CACHE_TTL_MS = 30000;
const MENTIONABLE_USERS_CACHE_TTL_MS = 30000;
const AVATAR_COLOR_PALETTE = [
  "#F6D7D2",
  "#F8DFC6",
  "#F5E7BC",
  "#DCEBC8",
  "#CDEBDD",
  "#D4E7F8",
  "#DCDCF8",
  "#E8D7F6",
  "#F4D9EA",
  "#E4E2DC",
];
const TOOL_PROVIDER_CREDENTIAL_MODE = {
  codex: "user-session",
  claude: "connector",
  generic: "token-managed",
};

const REDIS_ENABLED = isRedisConfigured();
const EMAIL_ENABLED = Boolean(RESEND_API_KEY);

function getUserStore() {
  if (!globalThis[USER_STORE_KEY]) {
    globalThis[USER_STORE_KEY] = new Map();
  }

  return globalThis[USER_STORE_KEY];
}

function getSessionStore() {
  if (!globalThis[SESSION_STORE_KEY]) {
    globalThis[SESSION_STORE_KEY] = new Map();
  }

  return globalThis[SESSION_STORE_KEY];
}

function getSessionIndexStore() {
  if (!globalThis[SESSION_INDEX_STORE_KEY]) {
    globalThis[SESSION_INDEX_STORE_KEY] = new Map();
  }

  return globalThis[SESSION_INDEX_STORE_KEY];
}

function getResetStore() {
  if (!globalThis[RESET_STORE_KEY]) {
    globalThis[RESET_STORE_KEY] = new Map();
  }

  return globalThis[RESET_STORE_KEY];
}

function getIntegrationSecretStore() {
  if (!globalThis[INTEGRATION_SECRET_STORE_KEY]) {
    globalThis[INTEGRATION_SECRET_STORE_KEY] = new Map();
  }

  return globalThis[INTEGRATION_SECRET_STORE_KEY];
}

function getAuthCache() {
  if (!globalThis[AUTH_CACHE_KEY]) {
    globalThis[AUTH_CACHE_KEY] = {
      users: new Map(),
      sessions: new Map(),
      sessionIdsByEmail: new Map(),
      userIndex: null,
      userList: null,
      userDirectory: null,
      mentionableUsers: new Map(),
    };
  }

  return globalThis[AUTH_CACHE_KEY];
}

export function clearAuthRuntimeState() {
  globalThis[USER_STORE_KEY] = new Map();
  globalThis[SESSION_STORE_KEY] = new Map();
  globalThis[SESSION_INDEX_STORE_KEY] = new Map();
  globalThis[RESET_STORE_KEY] = new Map();
  globalThis[INTEGRATION_SECRET_STORE_KEY] = new Map();
  globalThis[AUTH_CACHE_KEY] = {
    users: new Map(),
    sessions: new Map(),
    sessionIdsByEmail: new Map(),
    userIndex: null,
    userList: null,
    userDirectory: null,
    mentionableUsers: new Map(),
  };
}

function readCacheEntry(entry) {
  if (!entry || entry.expiresAt <= Date.now()) {
    return null;
  }

  return entry.value;
}

function writeCacheEntry(map, key, value, ttlMs) {
  map.set(key, {
    value,
    expiresAt: Date.now() + ttlMs,
  });
}

function invalidateUserCaches(email = "") {
  const cache = getAuthCache();
  const normalizedEmail = normalizeEmail(email);

  if (normalizedEmail) {
    cache.users.delete(normalizedEmail);
    cache.sessionIdsByEmail.delete(normalizedEmail);
  } else {
    cache.users.clear();
    cache.sessionIdsByEmail.clear();
  }

  cache.userIndex = null;
  cache.userList = null;
  cache.userDirectory = null;
  cache.mentionableUsers.clear();
}

function invalidateSessionCaches(sessionId = "", email = "") {
  const cache = getAuthCache();
  const normalizedSessionId = String(sessionId || "").trim();
  const normalizedEmail = normalizeEmail(email);

  if (normalizedSessionId) {
    cache.sessions.delete(normalizedSessionId);
  } else {
    cache.sessions.clear();
  }

  if (normalizedEmail) {
    cache.sessionIdsByEmail.delete(normalizedEmail);
  } else if (!normalizedSessionId) {
    cache.sessionIdsByEmail.clear();
  }
}

function warnRedisFallback(scope, error) {
  console.warn(`[auth] redis unavailable during ${scope}; falling back to memory`, {
    message: error instanceof Error ? error.message : String(error),
  });
}

async function withRedisFallback(scope, fallbackValue, operation) {
  try {
    return await operation();
  } catch (error) {
    if (!isRedisRecoverableError(error)) {
      throw error;
    }

    warnRedisFallback(scope, error);
    return typeof fallbackValue === "function" ? await fallbackValue() : fallbackValue;
  }
}

function userKey(email) {
  return `${USER_KEY_PREFIX}${email}`;
}

function sessionKey(sessionId) {
  return `${SESSION_KEY_PREFIX}${sessionId}`;
}

function sessionIndexKey(email) {
  return `${SESSION_INDEX_KEY_PREFIX}${email}`;
}

function resetKey(token) {
  return `${RESET_KEY_PREFIX}${token}`;
}

function integrationSecretKey(email, providerId) {
  return `${INTEGRATION_SECRET_KEY_PREFIX}${normalizeEmail(email)}:${String(providerId || "").trim().toLowerCase()}`;
}

export { ADMIN_ROLE, DEFAULT_ROLE, USER_ROLES, VIEW_ONLY_ROLE, normalizeRole } from "./roles.js";

function hashAvatarSeed(value) {
  const input = String(value || "");
  let hash = 0;

  for (let index = 0; index < input.length; index += 1) {
    hash = (hash * 31 + input.charCodeAt(index)) >>> 0;
  }

  return hash;
}

export function pickAvatarColor(seed) {
  const normalizedSeed = String(seed || "").trim().toLowerCase() || "ux-bridge";
  return AVATAR_COLOR_PALETTE[hashAvatarSeed(normalizedSeed) % AVATAR_COLOR_PALETTE.length];
}

function resolveAvatarColor(user = {}) {
  return (
    String(user.avatarColor || "").trim() ||
    pickAvatarColor(normalizeEmail(user.email) || `${String(user.firstName || "").trim()} ${String(user.lastName || "").trim()}`)
  );
}

function buildDefaultIntegrations() {
  return listVibeProviders().reduce((accumulator, provider) => {
    accumulator[provider.id] = {
      providerId: provider.id,
      label: provider.label,
      connected: false,
      accountLabel: "",
      connectedAt: 0,
      credentialMode: provider.credentialMode || TOOL_PROVIDER_CREDENTIAL_MODE[provider.id] || "user-session",
      connectionType: "scaffold",
      lastVerifiedAt: 0,
    };
    return accumulator;
  }, {});
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function normalizeUserIntegrations(integrations) {
  const defaults = buildDefaultIntegrations();
  const input = integrations && typeof integrations === "object" ? integrations : {};

  return Object.fromEntries(
    Object.entries(defaults).map(([providerId, fallback]) => {
      const existing = input[providerId] && typeof input[providerId] === "object" ? input[providerId] : {};
      return [
        providerId,
        {
          ...fallback,
          providerId,
          label: String(existing.label || fallback.label).trim() || fallback.label,
          connected: Boolean(existing.connected),
          accountLabel: String(existing.accountLabel || "").trim(),
          connectedAt: Number(existing.connectedAt) || 0,
          credentialMode:
            String(existing.credentialMode || fallback.credentialMode).trim().toLowerCase() || fallback.credentialMode,
          connectionType: String(existing.connectionType || fallback.connectionType).trim().toLowerCase() || fallback.connectionType,
          lastVerifiedAt: Number(existing.lastVerifiedAt) || 0,
        },
      ];
    }),
  );
}

async function readStoredUser(email) {
  ensureDurableStoreAvailable("auth user records");
  const normalizedEmail = normalizeEmail(email);

  if (!normalizedEmail) {
    return null;
  }

  const cachedUser = readCacheEntry(getAuthCache().users.get(normalizedEmail));

  if (cachedUser) {
    return cachedUser;
  }

  if (canUsePostgresUserStore()) {
    const value = await readUserRecord(normalizedEmail);

    if (value) {
      writeCacheEntry(getAuthCache().users, normalizedEmail, value, USER_CACHE_TTL_MS);
      return value;
    }
  }

  if (!REDIS_ENABLED) {
    const value = getUserStore().get(normalizedEmail) || null;
    if (value) {
      writeCacheEntry(getAuthCache().users, normalizedEmail, value, USER_CACHE_TTL_MS);
    }
    return value;
  }

  const value = await withRedisFallback(
    "readStoredUser",
    () => getUserStore().get(normalizedEmail) || null,
    () => readRedisJson(userKey(normalizedEmail)),
  );

  if (value) {
    writeCacheEntry(getAuthCache().users, normalizedEmail, value, USER_CACHE_TTL_MS);
  }

  return value;
}

async function writeStoredUser(email, user) {
  ensureDurableStoreAvailable("auth user records");
  const normalizedEmail = normalizeEmail(email);

  if (canUsePostgresUserStore()) {
    await writeUserRecord({
      ...user,
      email: normalizedEmail,
    });
    invalidateUserCaches(normalizedEmail);
    return;
  }

  if (!REDIS_ENABLED) {
    getUserStore().set(normalizedEmail, user);
    invalidateUserCaches(normalizedEmail);
    return;
  }

  await withRedisFallback("writeStoredUser", null, async () => {
    await writeRedisJson(userKey(normalizedEmail), user);
    await addUserToIndex(normalizedEmail);
  });
  getUserStore().set(normalizedEmail, user);
  invalidateUserCaches(normalizedEmail);
}

async function addUserToIndex(email) {
  const normalizedEmail = normalizeEmail(email);

  if (!normalizedEmail || canUsePostgresUserStore()) {
    return;
  }

  if (!REDIS_ENABLED) {
    return;
  }

  const existing = await withRedisFallback(
    "addUserToIndex:read",
    () => Array.from(getUserStore().keys()),
    async () => (await readRedisJson(USER_INDEX_KEY)) || [],
  );
  const next = Array.from(new Set([...existing, normalizedEmail]));
  await withRedisFallback("addUserToIndex:write", null, () => writeRedisJson(USER_INDEX_KEY, next));
  invalidateUserCaches();
}

async function readIndexedUserEmails() {
  ensureDurableStoreAvailable("auth user directory");
  const cache = getAuthCache();
  const cachedIndex = readCacheEntry(cache.userIndex);

  if (cachedIndex) {
    return cachedIndex;
  }

  if (canUsePostgresUserStore()) {
    const users = await listUserRecords();
    const emails = users.map((user) => normalizeEmail(user?.email)).filter(Boolean);
    cache.userIndex = {
      value: emails,
      expiresAt: Date.now() + USER_INDEX_CACHE_TTL_MS,
    };
    return emails;
  }

  if (!REDIS_ENABLED) {
    const emails = Array.from(getUserStore().keys());
    cache.userIndex = {
      value: emails,
      expiresAt: Date.now() + USER_INDEX_CACHE_TTL_MS,
    };
    return emails;
  }

  const emails = await withRedisFallback(
    "readIndexedUserEmails",
    () => Array.from(getUserStore().keys()),
    async () => (await readRedisJson(USER_INDEX_KEY)) || [],
  );
  cache.userIndex = {
    value: emails,
    expiresAt: Date.now() + USER_INDEX_CACHE_TTL_MS,
  };
  return emails;
}

async function scanRedisUserEmails() {
  const matches = await withRedisFallback("scanRedisUserEmails", [], () => scanRedisKeys(`${USER_KEY_PREFIX}*`));

  return matches
    .map((key) => String(key).replace(USER_KEY_PREFIX, ""))
    .filter(Boolean);
}

async function listStoredUsers() {
  ensureDurableStoreAvailable("auth user directory");
  const cache = getAuthCache();
  const cachedUsers = readCacheEntry(cache.userList);

  if (cachedUsers) {
    return cachedUsers;
  }

  const users = [];
  const seenEmails = new Set();
  const pgUsers = canUsePostgresUserStore() ? await listUserRecords() : [];

  for (const user of pgUsers) {
    const normalizedEmail = normalizeEmail(user?.email);

    if (!normalizedEmail || seenEmails.has(normalizedEmail)) {
      continue;
    }

    seenEmails.add(normalizedEmail);
    users.push(user);
  }

  const fallbackEmails = REDIS_ENABLED
    ? Array.from(new Set([...(await readIndexedUserEmails()), ...(await scanRedisUserEmails())]))
    : Array.from(getUserStore().keys());

  for (const email of fallbackEmails) {
    const normalizedEmail = normalizeEmail(email);

    if (!normalizedEmail || seenEmails.has(normalizedEmail)) {
      continue;
    }

    const user = canUsePostgresUserStore()
      ? !REDIS_ENABLED
        ? getUserStore().get(normalizedEmail) || null
        : await withRedisFallback(
            "listStoredUsers:readFallbackUser",
            () => getUserStore().get(normalizedEmail) || null,
            () => readRedisJson(userKey(normalizedEmail)),
          )
      : await readStoredUser(normalizedEmail);

    if (user) {
      seenEmails.add(normalizedEmail);
      users.push(user);
    }
  }

  cache.userList = {
    value: users,
    expiresAt: Date.now() + USER_LIST_CACHE_TTL_MS,
  };

  return users;
}

async function inferRoleForUser(email) {
  const users = await listStoredUsers();

  if (users.length <= 1) {
    return ADMIN_ROLE;
  }

  const normalizedEmail = normalizeEmail(email);
  const hasAdmin = users.some((user) => normalizeRole(user.role) === ADMIN_ROLE);

  if (!hasAdmin) {
    const firstUser = [...users]
      .sort((left, right) => Number(left.createdAt || 0) - Number(right.createdAt || 0))[0];

    if (normalizeEmail(firstUser?.email) === normalizedEmail) {
      return ADMIN_ROLE;
    }
  }

  return DEFAULT_ROLE;
}

export async function readUser(email) {
  const user = await readStoredUser(email);

  if (!user) {
    return null;
  }

  const normalizedRole = normalizeRole(user.role) || (await inferRoleForUser(user.email));
  const normalizedAvatarColor = resolveAvatarColor(user);
  const normalizedIntegrations = normalizeUserIntegrations(user.integrations);
  const hasUpToDateAvatarColor = normalizedAvatarColor === String(user.avatarColor || "").trim();
  const hasNormalizedIntegrations =
    JSON.stringify(normalizedIntegrations) === JSON.stringify(user.integrations || {});

  if (normalizedRole === user.role && hasUpToDateAvatarColor && hasNormalizedIntegrations) {
    return user;
  }

  const upgradedUser = {
    ...user,
    role: normalizedRole,
    avatarColor: normalizedAvatarColor,
    integrations: normalizedIntegrations,
    updatedAt: Date.now(),
  };

  await writeStoredUser(upgradedUser.email, upgradedUser);
  return upgradedUser;
}

export async function writeUser(email, user) {
  const nextUser = {
    ...user,
    email,
    role: normalizeRole(user.role) || DEFAULT_ROLE,
    avatarColor: resolveAvatarColor({ ...user, email }),
    integrations: normalizeUserIntegrations(user.integrations),
  };

  await writeStoredUser(email, nextUser);
}

async function removeUserFromIndex(email) {
  const normalizedEmail = normalizeEmail(email);

  if (!normalizedEmail || !REDIS_ENABLED || canUsePostgresUserStore()) {
    return;
  }

  const existing = await withRedisFallback(
    "removeUserFromIndex:read",
    () => Array.from(getUserStore().keys()),
    async () => (await readRedisJson(USER_INDEX_KEY)) || [],
  );
  const next = existing.filter((value) => normalizeEmail(value) !== normalizedEmail);
  await withRedisFallback("removeUserFromIndex:write", null, () => writeRedisJson(USER_INDEX_KEY, next));
  invalidateUserCaches();
}

export async function deleteUser(email) {
  ensureDurableStoreAvailable("auth user records");
  const normalizedEmail = normalizeEmail(email);

  if (!normalizedEmail) {
    return;
  }

  if (canUsePostgresUserStore()) {
    await deleteUserRecord(normalizedEmail);
  } else if (!REDIS_ENABLED) {
    getUserStore().delete(normalizedEmail);
  } else {
    await withRedisFallback("deleteUser", null, async () => {
      await deleteRedisKeys(userKey(normalizedEmail));
      await removeUserFromIndex(normalizedEmail);
    });
    getUserStore().delete(normalizedEmail);
  }

  for (const provider of listVibeProviders()) {
    await deleteStoredIntegrationSecret(normalizedEmail, provider.id);
  }

  invalidateUserCaches(normalizedEmail);
}

export async function listMentionableUsers(query = "") {
  const normalizedQuery = String(query || "").trim().toLowerCase();
  const cache = getAuthCache();
  const cachedUsers = readCacheEntry(cache.mentionableUsers.get(normalizedQuery));

  if (cachedUsers) {
    return cachedUsers;
  }

  const emails = REDIS_ENABLED
    ? Array.from(new Set([...(await readIndexedUserEmails()), ...(await scanRedisUserEmails())]))
    : Array.from(getUserStore().keys());

  const users = [];

  for (const email of emails) {
    const user = await readUser(email);

    if (user) {
      users.push(buildUserPayload(user));
    }
  }

  const filteredUsers = normalizedQuery
    ? users.filter((user) => {
        const haystack = [user.firstName, user.lastName, user.fullName, user.email]
          .join(" ")
          .toLowerCase();
        return haystack.includes(normalizedQuery);
      })
    : users;

  const result = filteredUsers
    .sort((left, right) => left.fullName.localeCompare(right.fullName))
    .slice(0, 50);

  writeCacheEntry(cache.mentionableUsers, normalizedQuery, result, MENTIONABLE_USERS_CACHE_TTL_MS);
  return result;
}

async function readSessionRecord(sessionId) {
  const normalizedSessionId = String(sessionId || "").trim();
  const cache = getAuthCache();
  const cachedSession = readCacheEntry(cache.sessions.get(normalizedSessionId));

  if (cachedSession) {
    return cachedSession;
  }

  if (canUsePostgresAuthStore()) {
    const record = await readAuthSessionRecord(normalizedSessionId);

    if (!record) {
      return null;
    }

    if (Number(record.expiresAt || 0) <= Date.now()) {
      await deleteAuthSessionRecord(normalizedSessionId);
      return null;
    }

    writeCacheEntry(cache.sessions, normalizedSessionId, record, SESSION_CACHE_TTL_MS);
    return record;
  }

  if (!REDIS_ENABLED) {
    const email = getSessionStore().get(normalizedSessionId);
    const record = email ? { email } : null;
    if (record) {
      writeCacheEntry(cache.sessions, normalizedSessionId, record, SESSION_CACHE_TTL_MS);
    }
    return record;
  }

  try {
    const record = await readRedisJson(sessionKey(normalizedSessionId));
    if (record) {
      writeCacheEntry(cache.sessions, normalizedSessionId, record, SESSION_CACHE_TTL_MS);
    }
    return record;
  } catch (error) {
    if (!isRedisRecoverableError(error)) {
      throw error;
    }

    warnRedisFallback("readSessionRecord", error);
    const email = getSessionStore().get(normalizedSessionId);
    const record = email ? { email } : null;
    if (record) {
      writeCacheEntry(cache.sessions, normalizedSessionId, record, SESSION_CACHE_TTL_MS);
    }
    return record;
  }
}

async function readSessionIdsForEmail(email) {
  const normalizedEmail = normalizeEmail(email);
  const cache = getAuthCache();
  const cachedSessionIds = readCacheEntry(cache.sessionIdsByEmail.get(normalizedEmail));

  if (cachedSessionIds) {
    return cachedSessionIds;
  }

  if (canUsePostgresAuthStore()) {
    const records = await listAuthSessionRecordsForEmail(normalizedEmail);
    const now = Date.now();
    const activeSessionIds = [];

    for (const record of records) {
      const sessionId = String(record?.sessionId || "").trim();
      const expiresAt = Number(record?.expiresAt || 0);

      if (!sessionId) {
        continue;
      }

      if (expiresAt > 0 && expiresAt <= now) {
        await deleteAuthSessionRecord(sessionId);
        continue;
      }

      activeSessionIds.push(sessionId);
    }

    writeCacheEntry(cache.sessionIdsByEmail, normalizedEmail, activeSessionIds, SESSION_CACHE_TTL_MS);
    return activeSessionIds;
  }

  if (!REDIS_ENABLED) {
    const sessionIds = Array.from(getSessionIndexStore().get(normalizedEmail) || []);
    writeCacheEntry(cache.sessionIdsByEmail, normalizedEmail, sessionIds, SESSION_CACHE_TTL_MS);
    return sessionIds;
  }

  try {
    const sessionIds = (await readRedisJson(sessionIndexKey(normalizedEmail))) || [];
    writeCacheEntry(cache.sessionIdsByEmail, normalizedEmail, sessionIds, SESSION_CACHE_TTL_MS);
    return sessionIds;
  } catch (error) {
    if (!isRedisRecoverableError(error)) {
      throw error;
    }

    warnRedisFallback("readSessionIdsForEmail", error);
    const sessionIds = Array.from(getSessionIndexStore().get(normalizedEmail) || []);
    writeCacheEntry(cache.sessionIdsByEmail, normalizedEmail, sessionIds, SESSION_CACHE_TTL_MS);
    return sessionIds;
  }
}

async function writeSessionIdsForEmail(email, sessionIds) {
  const next = Array.from(new Set(sessionIds));
  const normalizedEmail = normalizeEmail(email);

  if (canUsePostgresAuthStore()) {
    invalidateSessionCaches("", normalizedEmail);
    return;
  }

  if (!REDIS_ENABLED) {
    getSessionIndexStore().set(normalizedEmail, new Set(next));
    invalidateSessionCaches("", normalizedEmail);
    return;
  }

  try {
    if (!next.length) {
      await deleteRedisKeys(sessionIndexKey(normalizedEmail));
      invalidateSessionCaches("", normalizedEmail);
      return;
    }

    await writeRedisJson(sessionIndexKey(normalizedEmail), next, SESSION_MAX_AGE_SECONDS);
  } catch (error) {
    if (!isRedisRecoverableError(error)) {
      throw error;
    }

    warnRedisFallback("writeSessionIdsForEmail", error);
    getSessionIndexStore().set(normalizedEmail, new Set(next));
  }
  invalidateSessionCaches("", normalizedEmail);
}

async function addSessionForEmail(email, sessionId) {
  const sessionIds = await readSessionIdsForEmail(email);
  sessionIds.push(sessionId);
  await writeSessionIdsForEmail(email, sessionIds);
}

async function removeSessionForEmail(email, sessionId) {
  const sessionIds = await readSessionIdsForEmail(email);
  await writeSessionIdsForEmail(
    email,
    sessionIds.filter((value) => value !== sessionId),
  );
}

export async function migrateSessionsToEmail(fromEmail, toEmail) {
  const previousEmail = normalizeEmail(fromEmail);
  const nextEmail = normalizeEmail(toEmail);

  if (!previousEmail || !nextEmail || previousEmail === nextEmail) {
    return;
  }

  const sessionIds = await readSessionIdsForEmail(previousEmail);

  for (const sessionId of sessionIds) {
    if (!REDIS_ENABLED) {
      getSessionStore().set(sessionId, nextEmail);
    } else {
      try {
        await writeRedisJson(sessionKey(sessionId), { email: nextEmail }, SESSION_MAX_AGE_SECONDS);
      } catch (error) {
        if (!isRedisRecoverableError(error)) {
          throw error;
        }

        warnRedisFallback("migrateSessionsToEmail", error);
        getSessionStore().set(sessionId, nextEmail);
      }
    }
  }

  await writeSessionIdsForEmail(nextEmail, [...(await readSessionIdsForEmail(nextEmail)), ...sessionIds]);
  await writeSessionIdsForEmail(previousEmail, []);
}

async function writeSessionRecord(sessionId, email) {
  const normalizedEmail = normalizeEmail(email);
  const normalizedSessionId = String(sessionId || "").trim();
  const now = Date.now();
  const expiresAt = now + SESSION_MAX_AGE_SECONDS * 1000;

  if (canUsePostgresAuthStore()) {
    await writeAuthSessionRecord(normalizedSessionId, {
      email: normalizedEmail,
      createdAt: now,
      updatedAt: now,
      expiresAt,
    });
    invalidateSessionCaches(normalizedSessionId, normalizedEmail);
    await addSessionForEmail(normalizedEmail, normalizedSessionId);
    return;
  }

  if (!REDIS_ENABLED) {
    getSessionStore().set(normalizedSessionId, normalizedEmail);
  } else {
    try {
      await writeRedisJson(sessionKey(normalizedSessionId), { email: normalizedEmail }, SESSION_MAX_AGE_SECONDS);
    } catch (error) {
      if (!isRedisRecoverableError(error)) {
        throw error;
      }

      warnRedisFallback("writeSessionRecord", error);
      getSessionStore().set(normalizedSessionId, normalizedEmail);
    }
  }

  invalidateSessionCaches(normalizedSessionId, normalizedEmail);
  await addSessionForEmail(normalizedEmail, normalizedSessionId);
}

async function deleteSessionRecord(sessionId, email = "") {
  const normalizedEmail = email || (await readSessionRecord(sessionId))?.email || "";
  const normalizedSessionId = String(sessionId || "").trim();

  if (canUsePostgresAuthStore()) {
    await deleteAuthSessionRecord(normalizedSessionId);
    invalidateSessionCaches(normalizedSessionId, normalizedEmail);
    if (normalizedEmail) {
      await removeSessionForEmail(normalizedEmail, normalizedSessionId);
    }
    return;
  }

  if (!REDIS_ENABLED) {
    getSessionStore().delete(normalizedSessionId);
  } else {
    try {
      await deleteRedisKeys(sessionKey(normalizedSessionId));
    } catch (error) {
      if (!isRedisRecoverableError(error)) {
        throw error;
      }

      warnRedisFallback("deleteSessionRecord", error);
      getSessionStore().delete(normalizedSessionId);
    }
  }

  invalidateSessionCaches(normalizedSessionId, normalizedEmail);
  if (normalizedEmail) {
    await removeSessionForEmail(normalizedEmail, normalizedSessionId);
  }
}

async function destroyAllSessionsForEmail(email) {
  if (canUsePostgresAuthStore()) {
    await deleteAuthSessionsForEmail(email);
    invalidateSessionCaches("", normalizeEmail(email));
    await writeSessionIdsForEmail(email, []);
    return;
  }

  const sessionIds = await readSessionIdsForEmail(email);

  for (const sessionId of sessionIds) {
    if (!REDIS_ENABLED) {
      getSessionStore().delete(sessionId);
    } else {
      try {
        await deleteRedisKeys(sessionKey(sessionId));
      } catch (error) {
        if (!isRedisRecoverableError(error)) {
          throw error;
        }

        warnRedisFallback("destroyAllSessionsForEmail", error);
        getSessionStore().delete(sessionId);
      }
    }
  }

  await writeSessionIdsForEmail(email, []);
}

async function readResetRecord(token) {
  if (canUsePostgresAuthStore()) {
    const record = await readPasswordResetTokenRecord(token);

    if (!record) {
      return null;
    }

    if (Number(record.expiresAt || 0) <= Date.now()) {
      await deletePasswordResetTokenRecord(token);
      return null;
    }

    return record;
  }

  if (!REDIS_ENABLED) {
    const record = getResetStore().get(token);

    if (!record) {
      return null;
    }

    if (record.expiresAt <= Date.now()) {
      getResetStore().delete(token);
      return null;
    }

    return record;
  }

  let record = null;
  try {
    record = await readRedisJson(resetKey(token));
  } catch (error) {
    if (!isRedisRecoverableError(error)) {
      throw error;
    }

    warnRedisFallback("readResetRecord", error);
    record = getResetStore().get(token) || null;
  }

  if (!record) {
    return null;
  }

  if (record.expiresAt <= Date.now()) {
    try {
      await deleteRedisKeys(resetKey(token));
    } catch (error) {
      if (!isRedisRecoverableError(error)) {
        throw error;
      }

      warnRedisFallback("readResetRecord cleanup", error);
      getResetStore().delete(token);
    }
    return null;
  }

  return record;
}

async function writeResetRecord(token, record) {
  if (canUsePostgresAuthStore()) {
    await writePasswordResetTokenRecord(token, {
      ...record,
      token,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    return;
  }

  if (!REDIS_ENABLED) {
    getResetStore().set(token, record);
    return;
  }

  try {
    await writeRedisJson(resetKey(token), record, RESET_TOKEN_MAX_AGE_SECONDS);
  } catch (error) {
    if (!isRedisRecoverableError(error)) {
      throw error;
    }

    warnRedisFallback("writeResetRecord", error);
    getResetStore().set(token, record);
  }
}

async function deleteResetRecord(token) {
  if (canUsePostgresAuthStore()) {
    await deletePasswordResetTokenRecord(token);
    return;
  }

  if (!REDIS_ENABLED) {
    getResetStore().delete(token);
    return;
  }

  try {
    await deleteRedisKeys(resetKey(token));
  } catch (error) {
    if (!isRedisRecoverableError(error)) {
      throw error;
    }

    warnRedisFallback("deleteResetRecord", error);
    getResetStore().delete(token);
  }
}

async function readStoredIntegrationSecret(email, providerId) {
  ensureDurableStoreAvailable("tool integration secrets");
  const key = integrationSecretKey(email, providerId);

  if (!key) {
    return null;
  }

  if (canUsePostgresUserStore()) {
    return readIntegrationSecretRecord(email, providerId);
  }

  if (!REDIS_ENABLED) {
    return getIntegrationSecretStore().get(key) || null;
  }

  return readJsonValue(key);
}

async function writeStoredIntegrationSecret(email, providerId, secretRecord) {
  ensureDurableStoreAvailable("tool integration secrets");
  const key = integrationSecretKey(email, providerId);

  if (!key) {
    return;
  }

  if (canUsePostgresUserStore()) {
    await writeIntegrationSecretRecord(email, providerId, secretRecord);
    return;
  }

  if (!REDIS_ENABLED) {
    getIntegrationSecretStore().set(key, secretRecord);
    return;
  }

  await writeJsonValue(key, secretRecord);
}

async function cloneStoredIntegrationSecret(fromEmail, toEmail, providerId) {
  const record = await readStoredIntegrationSecret(fromEmail, providerId);

  if (!record) {
    return;
  }

  await writeStoredIntegrationSecret(toEmail, providerId, record);
  await deleteStoredIntegrationSecret(fromEmail, providerId, { deleteVaultSecret: false });
}

async function deleteStoredIntegrationSecret(email, providerId, { deleteVaultSecret = true } = {}) {
  ensureDurableStoreAvailable("tool integration secrets");
  const key = integrationSecretKey(email, providerId);

  if (!key) {
    return;
  }

  const existingRecord = await readStoredIntegrationSecret(email, providerId);
  const vaultSecretName = String(existingRecord?.vaultSecretName || "").trim();

  if (deleteVaultSecret && vaultSecretName && isSecretVaultConfigured()) {
    try {
      await deleteSecretFromVault(vaultSecretName);
    } catch (error) {
      console.error("[auth] failed to delete vault integration secret", {
        email: normalizeEmail(email),
        providerId: String(providerId || "").trim().toLowerCase(),
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  if (canUsePostgresUserStore()) {
    await deleteIntegrationSecretRecord(email, providerId);
    return;
  }

  if (!REDIS_ENABLED) {
    getIntegrationSecretStore().delete(key);
    return;
  }

  await deleteRedisKeys(key);
}

export function normalizeEmail(email) {
  return String(email ?? "").trim().toLowerCase();
}

export function isAllowedNuSkinEmail(email) {
  const normalized = normalizeEmail(email);

  return (
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized) &&
    VALID_EMAIL_DOMAINS.some((domain) => normalized.endsWith(domain))
  );
}

function validatePassword(password) {
  const value = String(password ?? "");

  if (value.length < 8) {
    return "Password must be at least 8 characters.";
  }

  if (!/[A-Z]/.test(value)) {
    return "Password must include at least one uppercase letter.";
  }

  if (!/[a-z]/.test(value)) {
    return "Password must include at least one lowercase letter.";
  }

  if (!/[0-9]/.test(value)) {
    return "Password must include at least one number.";
  }

  if (!/[^A-Za-z0-9]/.test(value)) {
    return "Password must include at least one special character.";
  }

  return "";
}

function hashPassword(password, salt = crypto.randomBytes(16).toString("hex")) {
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return { salt, hash };
}

function verifyPassword(password, passwordHash, salt) {
  const candidateHash = crypto.scryptSync(password, salt, 64);
  const storedHash = Buffer.from(passwordHash, "hex");

  if (candidateHash.length !== storedHash.length) {
    return false;
  }

  return crypto.timingSafeEqual(candidateHash, storedHash);
}

function getIntegrationCipherKey() {
  return crypto.scryptSync(INTEGRATION_ENCRYPTION_SECRET, "ux-bridge-integrations", 32);
}

function encryptIntegrationSecret(secretValue) {
  const plainText = String(secretValue || "").trim();

  if (!plainText) {
    return "";
  }

  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", getIntegrationCipherKey(), iv);
  const encrypted = Buffer.concat([cipher.update(plainText, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return `${iv.toString("base64")}.${authTag.toString("base64")}.${encrypted.toString("base64")}`;
}

function decryptIntegrationSecret(encryptedValue) {
  const input = String(encryptedValue || "").trim();

  if (!input) {
    return "";
  }

  const [ivBase64, authTagBase64, payloadBase64] = input.split(".");

  if (!ivBase64 || !authTagBase64 || !payloadBase64) {
    throw new Error("Invalid encrypted integration secret.");
  }

  const decipher = crypto.createDecipheriv(
    "aes-256-gcm",
    getIntegrationCipherKey(),
    Buffer.from(ivBase64, "base64"),
  );
  decipher.setAuthTag(Buffer.from(authTagBase64, "base64"));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(payloadBase64, "base64")),
    decipher.final(),
  ]);

  return decrypted.toString("utf8");
}

function parseCookies(req) {
  const raw = req.headers.cookie || "";

  return raw.split(";").reduce((cookies, part) => {
    const [name, ...rest] = part.trim().split("=");

    if (!name) {
      return cookies;
    }

    cookies[name] = decodeURIComponent(rest.join("="));
    return cookies;
  }, {});
}

function getRequestOrigin(req) {
  const protocolHeader = String(req.headers["x-forwarded-proto"] || "");
  const protocol = protocolHeader.includes("https") ? "https" : "http";
  const host = String(req.headers["x-forwarded-host"] || req.headers.host || "localhost:4173");
  return `${protocol}://${host}`;
}

function buildAbsoluteUrl(req, path) {
  return new URL(path, getRequestOrigin(req)).toString();
}

function getMicrosoftAuthorityBase() {
  return `https://login.microsoftonline.com/${encodeURIComponent(MICROSOFT_ENTRA_TENANT_ID)}/oauth2/v2.0`;
}

function getMicrosoftCallbackUrl(req) {
  return buildAbsoluteUrl(req, "/api/auth/sso/callback");
}

function resolveSafeNextPath(candidate = "") {
  const nextPath = String(candidate || "").trim();
  return nextPath.startsWith("/") ? nextPath : "/projects.html";
}

function encodeSsoContext(context) {
  return Buffer.from(JSON.stringify(context), "utf8").toString("base64url");
}

function decodeSsoContext(value = "") {
  try {
    const payload = Buffer.from(String(value || ""), "base64url").toString("utf8");
    return JSON.parse(payload);
  } catch {
    return null;
  }
}

function parseJwtPayload(token = "") {
  const [, payload] = String(token || "").split(".");

  if (!payload) {
    return {};
  }

  try {
    return JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
  } catch {
    return {};
  }
}

function deriveUserNames(email, claims = {}) {
  const givenName = String(claims.given_name || "").trim();
  const familyName = String(claims.family_name || "").trim();

  if (givenName && familyName) {
    return { firstName: givenName, lastName: familyName };
  }

  const fullName = String(claims.name || "").trim();

  if (fullName) {
    const parts = fullName.split(/\s+/).filter(Boolean);
    if (parts.length > 1) {
      return {
        firstName: parts.shift() || "Nu",
        lastName: parts.join(" ") || "Skin",
      };
    }

    return {
      firstName: parts[0] || "Nu",
      lastName: "Skin",
    };
  }

  const fallback = String(email || "").split("@")[0].replace(/[._-]+/g, " ").trim();
  const parts = fallback.split(/\s+/).filter(Boolean);
  return {
    firstName: parts[0] || "Nu",
    lastName: parts.slice(1).join(" ") || "Skin",
  };
}

function resolveMicrosoftSsoEmail(claims = {}) {
  return normalizeEmail(claims.email || claims.preferred_username || claims.upn || "");
}

function createTemporaryCookie(req, name, value, maxAgeSeconds = SSO_STATE_MAX_AGE_SECONDS) {
  const secure = isSecureRequest(req) ? "; Secure" : "";
  return `${name}=${encodeURIComponent(value)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAgeSeconds}${secure}`;
}

function clearTemporaryCookie(req, name) {
  const secure = isSecureRequest(req) ? "; Secure" : "";
  return `${name}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure}`;
}

function buildRedirectResponse(status, location, headers = {}) {
  return {
    status,
    headers: {
      Location: location,
      "Cache-Control": "no-store",
      ...headers,
    },
    payload: null,
  };
}

function buildAuthPageRedirect(req, { next = "/projects.html", share = "", error = "" } = {}) {
  const authUrl = new URL(buildAbsoluteUrl(req, "/index.html"));
  const safeNext = resolveSafeNextPath(next);

  if (safeNext && safeNext !== "/projects.html") {
    authUrl.searchParams.set("next", safeNext);
  } else if (safeNext === "/projects.html" && share) {
    authUrl.searchParams.set("next", safeNext);
  }

  if (share) {
    authUrl.searchParams.set("share", String(share || "").trim());
  }

  if (error) {
    authUrl.searchParams.set("authError", error);
  }

  return authUrl.toString();
}

async function sendEmail({ to, subject, html, text }) {
  if (!EMAIL_ENABLED) {
    console.warn("[email] RESEND_API_KEY is not configured. Skipping email send.", { to, subject });
    return { ok: false, skipped: true };
  }

  const response = await fetch(RESEND_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: EMAIL_FROM,
      to,
      subject,
      html,
      text,
      ...(EMAIL_REPLY_TO ? { reply_to: EMAIL_REPLY_TO } : {}),
    }),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`Email request failed with ${response.status}: ${message}`);
  }

  return response.json();
}

async function sendWelcomeEmail(req, user) {
  const homeUrl = buildAbsoluteUrl(req, "/projects.html");

  await sendEmail({
    to: user.email,
    subject: "Welcome to UX Bridge",
    text: `Hi ${user.firstName}, welcome to UX Bridge. You can access the app here: ${homeUrl}`,
    html: `
      <div style="font-family: Inter, Arial, sans-serif; color: #1f2430; line-height: 1.5;">
        <p style="margin: 0 0 16px;">Hi ${user.firstName},</p>
        <p style="margin: 0 0 16px;">Welcome to UX Bridge. Your account is ready and you can access the app anytime using your Nu Skin email.</p>
        <p style="margin: 0 0 24px;">
          <a href="${homeUrl}" style="display: inline-block; padding: 12px 18px; border-radius: 999px; background: #2a2a2a; color: #ffffff; text-decoration: none; font-weight: 600;">Open UX Bridge</a>
        </p>
        <p style="margin: 0; color: #5f6783;">If you did not expect this email, please contact the UX Bridge team.</p>
      </div>
    `,
  });
}

async function sendPasswordResetEmail(req, user, token) {
  const resetUrl = buildAbsoluteUrl(req, `/reset-password.html?token=${encodeURIComponent(token)}`);

  await sendEmail({
    to: user.email,
    subject: "UX Bridge password reset request",
    text: `Hi ${user.firstName},

We received a request to reset the password for your UX Bridge account (${user.email}).

Reset your password here:
${resetUrl}

This link expires in 1 hour.

If you did not request this change, you can ignore this email and your password will remain unchanged.

UX Bridge`,
    html: `
      <div style="font-family: Inter, Arial, sans-serif; color: #1f2430; line-height: 1.5;">
        <div style="max-width: 560px;">
          <p style="margin: 0 0 16px; font-size: 14px; letter-spacing: 0.08em; text-transform: uppercase; color: #6b7288; font-weight: 700;">UX Bridge</p>
          <h1 style="margin: 0 0 20px; font-size: 28px; line-height: 1.15; color: #1f2430;">Password reset request</h1>
          <p style="margin: 0 0 16px;">Hi ${user.firstName},</p>
          <p style="margin: 0 0 16px;">We received a request to reset the password for your UX Bridge account <strong>${user.email}</strong>.</p>
          <p style="margin: 0 0 24px;">
            <a href="${resetUrl}" style="display: inline-block; padding: 12px 18px; border-radius: 999px; background: #2a2a2a; color: #ffffff; text-decoration: none; font-weight: 600;">Reset your password</a>
          </p>
          <p style="margin: 0 0 12px; color: #5f6783;">This link expires in 1 hour.</p>
          <p style="margin: 0 0 16px; color: #5f6783;">If you did not request this change, you can ignore this email and your password will remain unchanged.</p>
          <p style="margin: 0; color: #5f6783; font-size: 13px;">If the button does not work, copy and paste this URL into your browser:</p>
          <p style="margin: 8px 0 0; color: #425184; font-size: 13px; word-break: break-word;">${resetUrl}</p>
        </div>
      </div>
    `,
  });
}

export async function sendProjectInvitationEmail(req, {
  to,
  projectName,
  inviterName,
  inviterEmail,
  shareToken,
} = {}) {
  const recipientEmail = normalizeEmail(to);
  const normalizedProjectName = String(projectName || "UX Bridge project").trim() || "UX Bridge project";
  const normalizedInviterName = String(inviterName || inviterEmail || "A UX Bridge teammate").trim() || "A UX Bridge teammate";
  const normalizedInviterEmail = normalizeEmail(inviterEmail);
  const inviteUrl = buildAbsoluteUrl(req, `/?share=${encodeURIComponent(String(shareToken || "").trim())}`);

  if (!recipientEmail || !String(shareToken || "").trim()) {
    throw new Error("A valid invite email and share token are required.");
  }

  await sendEmail({
    to: recipientEmail,
    subject: `${normalizedInviterName} invited you to ${normalizedProjectName}`,
    text: `Hi,

${normalizedInviterName}${normalizedInviterEmail ? ` (${normalizedInviterEmail})` : ""} invited you to collaborate on "${normalizedProjectName}" in UX Bridge.

Create your account or sign in here:
${inviteUrl}

If you did not expect this invitation, you can ignore this email.

UX Bridge`,
    html: `
      <div style="font-family: Inter, Arial, sans-serif; color: #1f2430; line-height: 1.5;">
        <div style="max-width: 560px;">
          <p style="margin: 0 0 16px; font-size: 14px; letter-spacing: 0.08em; text-transform: uppercase; color: #6b7288; font-weight: 700;">UX Bridge</p>
          <h1 style="margin: 0 0 20px; font-size: 28px; line-height: 1.15; color: #1f2430;">You’ve been invited</h1>
          <p style="margin: 0 0 16px;">${escapeHtml(normalizedInviterName)}${normalizedInviterEmail ? ` (<a href="mailto:${escapeHtml(normalizedInviterEmail)}" style="color:#425184;text-decoration:none;">${escapeHtml(normalizedInviterEmail)}</a>)` : ""} invited you to collaborate on <strong>${escapeHtml(normalizedProjectName)}</strong> in UX Bridge.</p>
          <p style="margin: 0 0 24px;">
            <a href="${inviteUrl}" style="display: inline-block; padding: 12px 18px; border-radius: 999px; background: #2a2a2a; color: #ffffff; text-decoration: none; font-weight: 600;">Open invitation</a>
          </p>
          <p style="margin: 0 0 16px; color: #5f6783;">You can create your account or sign in with your Nu Skin email to access the project.</p>
          <p style="margin: 0; color: #5f6783; font-size: 13px;">If the button does not work, copy and paste this URL into your browser:</p>
          <p style="margin: 8px 0 0; color: #425184; font-size: 13px; word-break: break-word;">${inviteUrl}</p>
        </div>
      </div>
    `,
  });
}

function getFriendlyEmailSendError(error) {
  const message = error instanceof Error ? error.message : String(error || "");

  if (
    message.includes("You can only send testing emails to your own email address") ||
    message.includes("please verify a domain at resend.com/domains")
  ) {
    return "Resend is still in testing mode. It can only send to jniu@nuskin.com until you verify a sending domain and set EMAIL_FROM to use that domain.";
  }

  return "Failed to send password reset email.";
}

async function getProjectInviteModule() {
  return import("./projects-store.js");
}

export async function getSession(req) {
  const sessionId = parseCookies(req)[SESSION_COOKIE];

  if (!sessionId) {
    return null;
  }

  const sessionRecord = await readSessionRecord(sessionId);

  if (!sessionRecord?.email) {
    return null;
  }

  const user = await readUser(sessionRecord.email);

  if (!user) {
    await deleteSessionRecord(sessionId, sessionRecord.email);
    return null;
  }

  return {
    sessionId,
    user,
  };
}

export async function getAuthenticatedUser(req) {
  const session = await getSession(req);
  return session ? buildUserPayload(session.user) : null;
}

export async function getAuthenticatedUserRecord(req) {
  const session = await getSession(req);
  return session?.user || null;
}

async function createSession(email) {
  const sessionId = crypto.randomUUID();
  await writeSessionRecord(sessionId, email);
  return sessionId;
}

async function destroySession(req) {
  const sessionId = parseCookies(req)[SESSION_COOKIE];

  if (sessionId) {
    const sessionRecord = await readSessionRecord(sessionId);
    await deleteSessionRecord(sessionId, sessionRecord?.email);
  }
}

export function buildUserPayload(user) {
  return {
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    fullName: `${user.firstName} ${user.lastName}`.trim(),
    createdAt: Number(user.createdAt) || 0,
    role: normalizeRole(user.role) || DEFAULT_ROLE,
    avatarUrl: String(user.avatarUrl || ""),
    avatarColor: resolveAvatarColor(user),
    integrations: normalizeUserIntegrations(user.integrations),
  };
}

export async function writeUserIntegrationSecret(email, providerId, secretValue, metadata = {}) {
  const normalizedEmail = normalizeEmail(email);
  const normalizedProviderId = String(providerId || "").trim().toLowerCase();

  if (!normalizedEmail || !normalizedProviderId) {
    return;
  }

  const existingRecord = await readStoredIntegrationSecret(normalizedEmail, normalizedProviderId);
  const nextMetadata = {
    updatedAt: Date.now(),
    ...metadata,
  };

  if (isSecretVaultConfigured()) {
    try {
      const vaultRecord = await writeSecretToVault(secretValue, {
        providerId: normalizedProviderId,
        secretName: existingRecord?.vaultSecretName,
        tags: {
          app: "ux-bridge",
          type: "integration-secret",
          providerId: normalizedProviderId,
          emailHash: crypto.createHash("sha256").update(normalizedEmail).digest("hex").slice(0, 12),
        },
      });

      await writeStoredIntegrationSecret(normalizedEmail, normalizedProviderId, {
        ...existingRecord,
        ...nextMetadata,
        encryptedSecret: "",
        storageMode: "vault",
        vaultProvider: vaultRecord?.provider || "azure-key-vault",
        vaultSecretName: vaultRecord?.secretName || existingRecord?.vaultSecretName || "",
        vaultSecretVersion: vaultRecord?.secretVersion || "",
        vaultSecretId: vaultRecord?.secretId || "",
        vaultUrl: vaultRecord?.vaultUrl || existingRecord?.vaultUrl || "",
      });
      return;
    } catch (error) {
      console.error("[auth] failed to write vault integration secret; falling back to encrypted record", {
        email: normalizedEmail,
        providerId: normalizedProviderId,
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  const encryptedSecret = encryptIntegrationSecret(secretValue);
  await writeStoredIntegrationSecret(normalizedEmail, normalizedProviderId, {
    ...existingRecord,
    ...nextMetadata,
    encryptedSecret,
    storageMode: "encrypted-record",
    vaultProvider: "",
    vaultSecretName: "",
    vaultSecretVersion: "",
    vaultSecretId: "",
    vaultUrl: "",
  });
}

export async function readUserIntegrationSecret(email, providerId) {
  const normalizedEmail = normalizeEmail(email);
  const normalizedProviderId = String(providerId || "").trim().toLowerCase();

  if (!normalizedEmail || !normalizedProviderId) {
    return "";
  }

  const record = await readStoredIntegrationSecret(normalizedEmail, normalizedProviderId);

  if (String(record?.vaultSecretName || "").trim() && isSecretVaultConfigured()) {
    try {
      return await readSecretFromVault(record.vaultSecretName, record.vaultSecretVersion);
    } catch (error) {
      console.error("[auth] failed to read vault integration secret", {
        email: normalizedEmail,
        providerId: normalizedProviderId,
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  if (!record?.encryptedSecret) {
    return "";
  }

  try {
    return decryptIntegrationSecret(record.encryptedSecret);
  } catch (error) {
    console.error("[auth] failed to decrypt integration secret", {
      email: normalizedEmail,
      providerId: normalizedProviderId,
      message: error instanceof Error ? error.message : String(error),
    });
    return "";
  }
}

export async function deleteUserIntegrationSecret(email, providerId) {
  await deleteStoredIntegrationSecret(email, providerId);
}

export async function migrateUserIntegrationSecrets(fromEmail, toEmail) {
  const previousEmail = normalizeEmail(fromEmail);
  const nextEmail = normalizeEmail(toEmail);

  if (!previousEmail || !nextEmail || previousEmail === nextEmail) {
    return;
  }

  for (const provider of listVibeProviders()) {
    await cloneStoredIntegrationSecret(previousEmail, nextEmail, provider.id);
  }
}

export async function backfillUserIntegrationSecretsToVault() {
  if (!isSecretVaultConfigured()) {
    return {
      ok: false,
      skipped: true,
      reason: "Secret vault is not configured.",
    };
  }

  const users = await listStoredUsers();
  let migrated = 0;
  let skipped = 0;
  let failed = 0;

  for (const user of users) {
    const email = normalizeEmail(user?.email);

    if (!email) {
      continue;
    }

    for (const provider of listVibeProviders()) {
      const record = await readStoredIntegrationSecret(email, provider.id);

      if (!record?.encryptedSecret || String(record?.vaultSecretName || "").trim()) {
        skipped += 1;
        continue;
      }

      try {
        const secretValue = await readUserIntegrationSecret(email, provider.id);

        if (!secretValue) {
          skipped += 1;
          continue;
        }

        await writeUserIntegrationSecret(email, provider.id, secretValue, {
          ...record,
          providerLabel: record.providerLabel || provider.label,
        });
        migrated += 1;
      } catch (error) {
        failed += 1;
        console.error("[auth] failed to backfill integration secret to vault", {
          email,
          providerId: provider.id,
          message: error instanceof Error ? error.message : String(error),
        });
      }
    }
  }

  return {
    ok: true,
    migrated,
    skipped,
    failed,
  };
}

export async function listUserDirectory() {
  const cache = getAuthCache();
  const cachedDirectory = readCacheEntry(cache.userDirectory);

  if (cachedDirectory) {
    return cachedDirectory;
  }

  const users = await listStoredUsers();

  const directory = users
    .map((user) => buildUserPayload(user))
    .sort((left, right) => left.fullName.localeCompare(right.fullName));

  cache.userDirectory = {
    value: directory,
    expiresAt: Date.now() + USER_DIRECTORY_CACHE_TTL_MS,
  };

  return directory;
}

export async function requireAdminSession(req) {
  const session = await getSession(req);

  if (!session) {
    return {
      ok: false,
      status: 401,
      payload: {
        ok: false,
        error: "Authentication required.",
      },
    };
  }

  if ((normalizeRole(session.user.role) || DEFAULT_ROLE) !== ADMIN_ROLE) {
    return {
      ok: false,
      status: 403,
      payload: {
        ok: false,
        error: "Admin access required.",
      },
    };
  }

  return {
    ok: true,
    session,
  };
}

export async function countAdmins() {
  const users = await listStoredUsers();
  return users.filter((user) => (normalizeRole(user.role) || DEFAULT_ROLE) === ADMIN_ROLE).length;
}

export async function issuePasswordResetForUser(req, user) {
  if (!EMAIL_ENABLED) {
    return {
      ok: false,
      status: 503,
      payload: {
        ok: false,
        error: "Password reset email is not configured yet.",
      },
    };
  }

  const token = crypto.randomUUID();
  const expiresAt = Date.now() + RESET_TOKEN_MAX_AGE_SECONDS * 1000;
  await writeResetRecord(token, {
    email: user.email,
    expiresAt,
  });

  try {
    await sendPasswordResetEmail(req, user, token);
  } catch (error) {
    console.error("[auth] failed to send admin password reset email", {
      email: user.email,
      message: error instanceof Error ? error.message : String(error),
    });
    return {
      ok: false,
      status: 500,
      payload: {
        ok: false,
        error: getFriendlyEmailSendError(error),
      },
    };
  }

  return {
    ok: true,
    status: 200,
    payload: {
      ok: true,
      message: `Password reset email sent to ${user.email}.`,
    },
  };
}

export async function handleAdminUsersRequest(req) {
  const admin = await requireAdminSession(req);

  if (!admin.ok) {
    return {
      status: admin.status,
      payload: admin.payload,
    };
  }

  if (req.method === "GET") {
    const payloadUsers = await listUserDirectory();
    const [recentAuditEvents, recentOperationalEvents, rolePermissions] = await Promise.all([
      listRecentAuditEvents(20),
      listRecentOperationalEvents(20),
      readRolePermissionMap(),
    ]);

    return {
      status: 200,
      payload: {
        ok: true,
        users: payloadUsers,
        roles: USER_ROLES,
        rolePermissions,
        permissionCatalog: getRolePermissionCatalog(),
        defaultRolePermissions: buildDefaultRolePermissionMap(),
        currentUserEmail: admin.session.user.email,
        recentAuditEvents,
        recentOperationalEvents,
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

  if (requestUrl.pathname !== "/api/auth") {
    return {
      status: 404,
      payload: {
        ok: false,
        error: "Not found",
      },
    };
  }

  const payload = await readJsonBody(req);
  const action = String(payload.action ?? "").trim();

  if (action === "exportRecoveryData") {
    const snapshot = await exportAdminRecoverySnapshot();
    await recordAuditEvent({
      actorEmail: admin.session.user.email,
      actorRole: admin.session.user.role,
      action: "admin.export_recovery_data",
      resourceType: "recovery_snapshot",
      resourceId: "global",
      metadata: {
        users: Array.isArray(snapshot.users) ? snapshot.users.length : 0,
        projects: Array.isArray(snapshot.projects) ? snapshot.projects.length : 0,
        commentThreads: Array.isArray(snapshot.commentThreads) ? snapshot.commentThreads.length : 0,
      },
    });

    return {
      status: 200,
      payload: {
        ok: true,
        snapshot,
      },
    };
  }

  if (action === "restoreRecoveryData") {
    const snapshot = payload.snapshot && typeof payload.snapshot === "object" ? payload.snapshot : null;

    if (!snapshot) {
      return {
        status: 400,
        payload: {
          ok: false,
          error: "Paste a valid recovery snapshot to restore.",
        },
      };
    }

    const result = await restoreAdminRecoverySnapshot(snapshot);
    clearAuthRuntimeState();
    const [{ clearProjectRuntimeState }, { clearCommentsRuntimeState }] = await Promise.all([
      import("./projects-store.js"),
      import("./comments-store.js"),
    ]);
    clearProjectRuntimeState();
    clearCommentsRuntimeState();
    await recordAuditEvent({
      actorEmail: admin.session.user.email,
      actorRole: admin.session.user.role,
      action: "admin.restore_recovery_data",
      resourceType: "recovery_snapshot",
      resourceId: "global",
      metadata: result.restored,
    });

    return {
      status: 200,
      payload: {
        ok: true,
        restored: result.restored,
        message: "Recovery snapshot restored.",
      },
    };
  }

  if (action === "updateRolePermissions") {
    const nextPermissions = await writeRolePermissionMap(payload.rolePermissions);
    await recordAuditEvent({
      actorEmail: admin.session.user.email,
      actorRole: admin.session.user.role,
      action: "admin.update_role_permissions",
      resourceType: "role_permissions",
      resourceId: "global",
      metadata: {
        rolePermissions: nextPermissions,
      },
    });

    return {
      status: 200,
      payload: {
        ok: true,
        rolePermissions: nextPermissions,
      },
    };
  }

  if (action === "resetRolePermissions") {
    const nextPermissions = await resetRolePermissionMap();
    await recordAuditEvent({
      actorEmail: admin.session.user.email,
      actorRole: admin.session.user.role,
      action: "admin.reset_role_permissions",
      resourceType: "role_permissions",
      resourceId: "global",
      metadata: {
        rolePermissions: nextPermissions,
      },
    });

    return {
      status: 200,
      payload: {
        ok: true,
        rolePermissions: nextPermissions,
      },
    };
  }

  const email = normalizeEmail(payload.email);

  if (!email) {
    return {
      status: 400,
      payload: {
        ok: false,
        error: "A user email is required.",
      },
    };
  }

  const user = await readUser(email);

  if (!user) {
    return {
      status: 404,
      payload: {
        ok: false,
        error: "User not found.",
      },
    };
  }

  if (action === "updateRole") {
    const nextRole = normalizeRole(payload.role);

    if (!nextRole) {
      return {
        status: 400,
        payload: {
          ok: false,
          error: "Choose a valid role.",
        },
      };
    }

    const adminCount = await countAdmins();
    const currentRole = normalizeRole(user.role) || DEFAULT_ROLE;
    const isLastAdmin = currentRole === ADMIN_ROLE && adminCount <= 1;

    if (isLastAdmin && nextRole !== ADMIN_ROLE) {
      return {
        status: 400,
        payload: {
          ok: false,
          error: "You must keep at least one Admin in the application.",
        },
      };
    }

    const updatedUser = {
      ...user,
      role: nextRole,
      updatedAt: Date.now(),
    };

    await writeUser(updatedUser.email, updatedUser);
    await recordAuditEvent({
      actorEmail: admin.session.user.email,
      actorRole: admin.session.user.role,
      action: "admin.update_user_role",
      resourceType: "user",
      resourceId: updatedUser.email,
      metadata: {
        previousRole: currentRole,
        nextRole,
      },
    });

    return {
      status: 200,
      payload: {
        ok: true,
        user: buildUserPayload(updatedUser),
      },
    };
  }

  if (action === "resetPassword") {
    return issuePasswordResetForUser(req, user);
  }

  if (action === "deleteUser") {
    if (email === normalizeEmail(admin.session.user.email)) {
      return {
        status: 400,
        payload: {
          ok: false,
          error: "You can't delete your own account from the Admin page.",
        },
      };
    }

    const adminCount = await countAdmins();
    const isLastAdmin = (normalizeRole(user.role) || DEFAULT_ROLE) === ADMIN_ROLE && adminCount <= 1;

    if (isLastAdmin) {
      return {
        status: 400,
        payload: {
          ok: false,
          error: "You must keep at least one Admin in the application.",
        },
      };
    }

    await destroyAllSessionsForEmail(email);
    await deleteUser(email);
    await recordAuditEvent({
      actorEmail: admin.session.user.email,
      actorRole: admin.session.user.role,
      action: "admin.delete_user",
      resourceType: "user",
      resourceId: email,
      metadata: {
        deletedRole: normalizeRole(user.role) || DEFAULT_ROLE,
      },
    });

    return {
      status: 200,
      payload: {
        ok: true,
        deletedEmail: email,
      },
    };
  }

  return {
    status: 400,
    payload: {
      ok: false,
      error: "Unsupported admin action.",
    },
  };
}

export function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";

    req.on("data", (chunk) => {
      body += chunk;
    });

    req.on("end", () => {
      if (!body) {
        resolve({});
        return;
      }

      try {
        resolve(JSON.parse(body));
      } catch (error) {
        reject(error);
      }
    });

    req.on("error", reject);
  });
}

export function sendJson(res, status, payload, extraHeaders = {}) {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    ...extraHeaders,
  });
  res.end(JSON.stringify(payload));
}

function isSecureRequest(req) {
  const forwardedProto = req.headers["x-forwarded-proto"];
  const host = String(req.headers.host || "");

  if (String(forwardedProto).includes("https")) {
    return true;
  }

  return !host.includes("localhost") && !host.includes("127.0.0.1");
}

export function createSessionCookie(req, sessionId) {
  const secure = isSecureRequest(req) ? "; Secure" : "";
  return `${SESSION_COOKIE}=${encodeURIComponent(sessionId)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${SESSION_MAX_AGE_SECONDS}${secure}`;
}

export function clearSessionCookie(req) {
  const secure = isSecureRequest(req) ? "; Secure" : "";
  return `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure}`;
}

function successPayload(user, req, sessionId) {
  return {
    status: 200,
    headers: {
      "Set-Cookie": createSessionCookie(req, sessionId),
    },
    payload: {
      ok: true,
      authenticated: true,
      user: buildUserPayload(user),
    },
  };
}

function genericResetResponse() {
  return {
    status: 200,
    payload: {
      ok: true,
      message: "If that account exists, a password reset email is on the way.",
    },
  };
}

async function redeemMicrosoftAuthorizationCode(req, code) {
  const tokenResponse = await fetch(`${getMicrosoftAuthorityBase()}/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      client_id: MICROSOFT_ENTRA_CLIENT_ID,
      client_secret: MICROSOFT_ENTRA_CLIENT_SECRET,
      code: String(code || "").trim(),
      grant_type: "authorization_code",
      redirect_uri: getMicrosoftCallbackUrl(req),
      scope: "openid profile email",
    }).toString(),
  });

  const tokenPayload = await tokenResponse.json().catch(() => ({}));

  if (!tokenResponse.ok) {
    throw new Error(String(tokenPayload?.error_description || tokenPayload?.error || "Microsoft sign-in failed."));
  }

  return tokenPayload;
}

async function completeMicrosoftSso(req, requestUrl) {
  if (!MICROSOFT_SSO_ENABLED) {
    return buildRedirectResponse(
      302,
      buildAuthPageRedirect(req, {
        error: "Microsoft sign-in is not configured yet.",
      }),
    );
  }

  const cookies = parseCookies(req);
  const expectedState = String(cookies[SSO_STATE_COOKIE] || "").trim();
  const context = decodeSsoContext(cookies[SSO_CONTEXT_COOKIE] || "") || {};
  const nextPath = resolveSafeNextPath(context.next);
  const inviteToken = String(context.share || "").trim();
  const clearCookies = [
    clearTemporaryCookie(req, SSO_STATE_COOKIE),
    clearTemporaryCookie(req, SSO_CONTEXT_COOKIE),
  ];
  const callbackError = String(requestUrl.searchParams.get("error") || "").trim();

  if (callbackError) {
    return buildRedirectResponse(
      302,
      buildAuthPageRedirect(req, {
        next: nextPath,
        share: inviteToken,
        error: String(requestUrl.searchParams.get("error_description") || callbackError),
      }),
      {
        "Set-Cookie": clearCookies,
      },
    );
  }

  const state = String(requestUrl.searchParams.get("state") || "").trim();
  const code = String(requestUrl.searchParams.get("code") || "").trim();

  if (!expectedState || !state || expectedState !== state || !code) {
    return buildRedirectResponse(
      302,
      buildAuthPageRedirect(req, {
        next: nextPath,
        share: inviteToken,
        error: "Microsoft sign-in could not be verified. Please try again.",
      }),
      {
        "Set-Cookie": clearCookies,
      },
    );
  }

  try {
    const tokenPayload = await redeemMicrosoftAuthorizationCode(req, code);
    const claims = parseJwtPayload(tokenPayload.id_token);
    const email = resolveMicrosoftSsoEmail(claims);

    if (!isAllowedNuSkinEmail(email)) {
      return buildRedirectResponse(
        302,
        buildAuthPageRedirect(req, {
          next: nextPath,
          share: inviteToken,
          error: "Use a valid Nu Skin email ending in @nuskin.com or @NuSkin.onmicrosoft.com.",
        }),
        {
          "Set-Cookie": clearCookies,
        },
      );
    }

    let user = await readUser(email);

    if (!user) {
      const existingUsers = await listStoredUsers();
      let invitation = { allowed: false, reason: "", projectId: "" };

      if (existingUsers.length > 0) {
        const { getSignupInvitationContext } = await getProjectInviteModule();
        invitation = await getSignupInvitationContext(email, inviteToken);

        if (!invitation.allowed) {
          return buildRedirectResponse(
            302,
            buildAuthPageRedirect(req, {
              next: nextPath,
              share: inviteToken,
              error: "UX Bridge is invitation-only right now. You’ll need a project invitation or share link to continue.",
            }),
            {
              "Set-Cookie": clearCookies,
            },
          );
        }
      }

      const assignedRole =
        existingUsers.length === 0
          ? ADMIN_ROLE
          : invitation.reason === "email-invite"
            ? VIEW_ONLY_ROLE
            : DEFAULT_ROLE;
      const generatedPassword = `${crypto.randomUUID()}!Aa1`;
      const { firstName, lastName } = deriveUserNames(email, claims);
      const { salt, hash } = hashPassword(generatedPassword);

      user = {
        firstName,
        lastName,
        email,
        role: assignedRole,
        avatarColor: pickAvatarColor(email),
        salt,
        passwordHash: hash,
        authProvider: "microsoft-sso",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      await writeUser(email, user);
    }

    const { acceptPendingProjectInvitesForEmail, acceptShareLinkForUser } = await getProjectInviteModule();
    await acceptPendingProjectInvitesForEmail(email);
    if (inviteToken) {
      await acceptShareLinkForUser(email, inviteToken);
    }

    const sessionId = await createSession(email);
    return buildRedirectResponse(302, buildAbsoluteUrl(req, nextPath), {
      "Set-Cookie": [...clearCookies, createSessionCookie(req, sessionId)],
    });
  } catch (error) {
    return buildRedirectResponse(
      302,
      buildAuthPageRedirect(req, {
        next: nextPath,
        share: inviteToken,
        error: error instanceof Error ? error.message : "Unable to complete Microsoft sign-in.",
      }),
      {
        "Set-Cookie": clearCookies,
      },
    );
  }
}

export async function handleAuthRequest(req) {
  const requestUrl = new URL(req.url || "/api/auth", getRequestOrigin(req));

  if (req.method === "GET") {
    if (requestUrl.pathname === "/api/auth/sso/start") {
      if (!MICROSOFT_SSO_ENABLED) {
        return buildRedirectResponse(
          302,
          buildAuthPageRedirect(req, {
            error: "Microsoft sign-in is not configured yet.",
          }),
        );
      }

      const nextPath = resolveSafeNextPath(requestUrl.searchParams.get("next") || "/projects.html");
      const inviteToken = String(requestUrl.searchParams.get("share") || "").trim();
      const state = crypto.randomUUID();
      const authorizeUrl = new URL(`${getMicrosoftAuthorityBase()}/authorize`);
      authorizeUrl.searchParams.set("client_id", MICROSOFT_ENTRA_CLIENT_ID);
      authorizeUrl.searchParams.set("response_type", "code");
      authorizeUrl.searchParams.set("redirect_uri", getMicrosoftCallbackUrl(req));
      authorizeUrl.searchParams.set("response_mode", "query");
      authorizeUrl.searchParams.set("scope", "openid profile email");
      authorizeUrl.searchParams.set("state", state);

      return buildRedirectResponse(302, authorizeUrl.toString(), {
        "Set-Cookie": [
          createTemporaryCookie(req, SSO_STATE_COOKIE, state),
          createTemporaryCookie(
            req,
            SSO_CONTEXT_COOKIE,
            encodeSsoContext({
              next: nextPath,
              share: inviteToken,
            }),
          ),
        ],
      });
    }

    if (requestUrl.pathname === "/api/auth/sso/callback") {
      return completeMicrosoftSso(req, requestUrl);
    }

    if (requestUrl.pathname !== "/api/auth") {
      return {
        status: 404,
        payload: {
          ok: false,
          error: "Not found",
        },
      };
    }

    const session = await getSession(req);

    if (!session) {
      return {
        status: 401,
        payload: {
          ok: false,
          authenticated: false,
        },
      };
    }

    return {
      status: 200,
      payload: {
        ok: true,
        authenticated: true,
        user: buildUserPayload(session.user),
      },
    };
  }

  if (req.method !== "POST") {
    return {
      status: 405,
      payload: {
        ok: false,
        error: "Method not allowed",
      },
    };
  }

  const payload = await readJsonBody(req);
  const action = String(payload.action ?? "").trim();

  if (action === "logout") {
    await destroySession(req);
    return {
      status: 200,
      headers: {
        "Set-Cookie": clearSessionCookie(req),
      },
      payload: {
        ok: true,
      },
    };
  }

  if (action === "session") {
    const session = await getSession(req);

    if (!session) {
      return {
        status: 401,
        payload: {
          ok: false,
          authenticated: false,
        },
      };
    }

    return {
      status: 200,
      payload: {
        ok: true,
        authenticated: true,
        user: buildUserPayload(session.user),
      },
    };
  }

  if (action === "requestPasswordReset") {
    const email = normalizeEmail(payload.email);

    if (!EMAIL_ENABLED) {
      return {
        status: 503,
        payload: {
          ok: false,
          error: "Password reset email is not configured yet.",
        },
      };
    }

    if (!isAllowedNuSkinEmail(email)) {
      return {
        status: 400,
        payload: {
          ok: false,
          error: "Use a valid Nu Skin email ending in @nuskin.com or @NuSkin.onmicrosoft.com.",
        },
      };
    }

    const user = await readUser(email);

    if (!user) {
      return genericResetResponse();
    }

    const token = crypto.randomUUID();
    const expiresAt = Date.now() + RESET_TOKEN_MAX_AGE_SECONDS * 1000;
    await writeResetRecord(token, {
      email,
      expiresAt,
    });

    try {
      await sendPasswordResetEmail(req, user, token);
    } catch (error) {
      console.error("[auth] failed to send password reset email", {
        email,
        message: error instanceof Error ? error.message : String(error),
      });
    }

    return genericResetResponse();
  }

  if (action === "resetPassword") {
    const token = String(payload.token ?? "").trim();
    const password = String(payload.password ?? "");

    if (!token) {
      return {
        status: 400,
        payload: {
          ok: false,
          error: "Password reset link is missing or invalid.",
        },
      };
    }

    const passwordError = validatePassword(password);

    if (passwordError) {
      return {
        status: 400,
        payload: {
          ok: false,
          error: passwordError,
        },
      };
    }

    const resetRecord = await readResetRecord(token);

    if (!resetRecord?.email) {
      return {
        status: 400,
        payload: {
          ok: false,
          error: "This password reset link is invalid or has expired.",
        },
      };
    }

    const user = await readUser(resetRecord.email);

    if (!user) {
      await deleteResetRecord(token);
      return {
        status: 400,
        payload: {
          ok: false,
          error: "This password reset link is invalid or has expired.",
        },
      };
    }

    const { salt, hash } = hashPassword(password);
    const updatedUser = {
      ...user,
      salt,
      passwordHash: hash,
      updatedAt: Date.now(),
    };

    await writeUser(updatedUser.email, updatedUser);
    await destroyAllSessionsForEmail(updatedUser.email);
    await deleteResetRecord(token);

    const sessionId = await createSession(updatedUser.email);
    return successPayload(updatedUser, req, sessionId);
  }

  const email = normalizeEmail(payload.email);

  if (!isAllowedNuSkinEmail(email)) {
    return {
      status: 400,
      payload: {
        ok: false,
        error: "Use a valid Nu Skin email ending in @nuskin.com or @NuSkin.onmicrosoft.com.",
      },
    };
  }

  if (action === "signup") {
    const password = String(payload.password ?? "");
    const passwordError = validatePassword(password);

    if (passwordError) {
      return {
        status: 400,
        payload: {
          ok: false,
          error: passwordError,
        },
      };
    }

    const firstName = String(payload.firstName ?? "").trim();
    const lastName = String(payload.lastName ?? "").trim();

    if (!firstName || !lastName) {
      return {
        status: 400,
        payload: {
          ok: false,
          error: "First and last name are required.",
        },
      };
    }

    const existingUser = await readUser(email);

    if (existingUser) {
      return {
        status: 409,
        payload: {
          ok: false,
          error: "That account already exists. Sign in instead.",
        },
      };
    }

    const existingUsers = await listStoredUsers();
    const inviteToken = String(payload.inviteToken ?? "").trim();

    let invitation = { allowed: false, projectId: "", reason: "" };

    if (existingUsers.length > 0) {
      const { getSignupInvitationContext } = await getProjectInviteModule();
      invitation = await getSignupInvitationContext(email, inviteToken);

      if (!invitation.allowed) {
        return {
          status: 403,
          payload: {
            ok: false,
            error: "UX Bridge is invitation-only right now. You’ll need a project invitation or share link to create an account.",
          },
        };
      }
    }

    const assignedRole =
      existingUsers.length === 0
        ? ADMIN_ROLE
        : invitation.reason === "email-invite"
          ? VIEW_ONLY_ROLE
          : DEFAULT_ROLE;
    const { salt, hash } = hashPassword(password);
    const user = {
      firstName,
      lastName,
      email,
      role: assignedRole,
      avatarColor: pickAvatarColor(email),
      salt,
      passwordHash: hash,
      createdAt: Date.now(),
    };

    await writeUser(email, user);
    if (existingUsers.length > 0) {
      const { acceptPendingProjectInvitesForEmail, acceptShareLinkForUser } = await getProjectInviteModule();
      await acceptPendingProjectInvitesForEmail(email);
      if (inviteToken) {
        await acceptShareLinkForUser(email, inviteToken);
      }
    }
    const sessionId = await createSession(email);

    try {
      await sendWelcomeEmail(req, user);
    } catch (error) {
      console.error("[auth] failed to send welcome email", {
        email,
        message: error instanceof Error ? error.message : String(error),
      });
    }

    return successPayload(user, req, sessionId);
  }

  if (action === "login") {
    const password = String(payload.password ?? "");
    const inviteToken = String(payload.inviteToken ?? "").trim();
    const user = await readUser(email);

    if (!user || !verifyPassword(password, user.passwordHash, user.salt)) {
      return {
        status: 401,
        payload: {
          ok: false,
          error: "Invalid email or password.",
        },
      };
    }

    const { acceptPendingProjectInvitesForEmail, acceptShareLinkForUser } = await getProjectInviteModule();
    await acceptPendingProjectInvitesForEmail(email);
    if (inviteToken) {
      await acceptShareLinkForUser(email, inviteToken);
    }

    const sessionId = await createSession(email);
    return successPayload(user, req, sessionId);
  }

  return {
    status: 400,
    payload: {
      ok: false,
      error: "Unsupported auth action.",
    },
  };
}
