import { isRedisConfigured, isRedisRecoverableError, redisCommand } from "./db/redis.js";

const ACTIVE_WINDOW_MS = 30000;
const STORE_KEY = "__brandAffiliatePresenceStore__";
const PRESENCE_PREFIX = "ux-bridge:presence:";
const PRESENCE_TTL_SECONDS = Math.ceil(ACTIVE_WINDOW_MS / 1000) + 5;
const REDIS_ENABLED = isRedisConfigured();

function getStore() {
  if (!globalThis[STORE_KEY]) {
    globalThis[STORE_KEY] = new Map();
  }

  return globalThis[STORE_KEY];
}

function buildPresenceKey(scope = {}, sessionId = "") {
  const path = normalizeScopeValue(scope.path, "-");
  const projectKey = normalizeScopeValue(scope.projectKey, "-");
  const pageKey = normalizeScopeValue(scope.pageKey, "-");
  return `${PRESENCE_PREFIX}${projectKey}:${pageKey}:${path}:${sessionId}`;
}

async function listRedisScopeEntries(scope = {}) {
  let cursor = "0";
  const matches = [];
  const scopePrefix = `${PRESENCE_PREFIX}${normalizeScopeValue(scope.projectKey, "-")}:${normalizeScopeValue(scope.pageKey, "-")}:${normalizeScopeValue(scope.path, "-")}:*`;

  do {
    const result = await redisCommand(["SCAN", cursor, "MATCH", scopePrefix, "COUNT", "200"]);
    cursor = Array.isArray(result) ? String(result[0] || "0") : "0";
    const keys = Array.isArray(result?.[1]) ? result[1] : [];
    matches.push(...keys);
  } while (cursor !== "0");

  if (!matches.length) {
    return [];
  }

  const values = [];

  for (const key of matches) {
    const value = await redisCommand(["GET", key]);

    if (value) {
      try {
        values.push(JSON.parse(value));
      } catch {
        // Ignore malformed values.
      }
    }
  }

  return values;
}

function cleanExpired(now = Date.now()) {
  const store = getStore();

  for (const [sessionId, entry] of store.entries()) {
    if (now - entry.lastSeen > ACTIVE_WINDOW_MS) {
      store.delete(sessionId);
    }
  }

  return store;
}

function countActive(now = Date.now()) {
  return cleanExpired(now).size;
}

function buildPresenceSnapshot(store) {
  const viewers = Array.from(store.entries())
    .sort(([leftSessionId, left], [rightSessionId, right]) => {
      const leftName = String(left.fullName || "").trim().toLowerCase();
      const rightName = String(right.fullName || "").trim().toLowerCase();

      if (leftName && rightName && leftName !== rightName) {
        return leftName.localeCompare(rightName);
      }

      if (left.lastSeen !== right.lastSeen) {
        return right.lastSeen - left.lastSeen;
      }

      return String(leftSessionId).localeCompare(String(rightSessionId));
    })
    .map(([sessionId, entry]) => ({
      sessionId,
      fullName: entry.fullName || "",
      initials: entry.initials || "",
      avatarUrl: entry.avatarUrl || "",
    }));

  return {
    ok: true,
    count: viewers.length,
    viewers,
    activeWindowMs: ACTIVE_WINDOW_MS,
  };
}

function normalizeScopeValue(value, fallback = "") {
  return typeof value === "string" ? value.trim().toLowerCase() : fallback;
}

function filterStoreByScope(store, scope = {}) {
  const path = normalizeScopeValue(scope.path);
  const projectKey = normalizeScopeValue(scope.projectKey);
  const pageKey = normalizeScopeValue(scope.pageKey);

  if (!path && !projectKey && !pageKey) {
    return store;
  }

  const filtered = new Map();

  for (const [sessionId, entry] of store.entries()) {
    const entryPath = normalizeScopeValue(entry.path);
    const entryProjectKey = normalizeScopeValue(entry.projectKey);
    const entryPageKey = normalizeScopeValue(entry.pageKey);

    if (path && entryPath !== path) {
      continue;
    }

    if (projectKey && entryProjectKey !== projectKey) {
      continue;
    }

    if (pageKey && entryPageKey !== pageKey) {
      continue;
    }

    filtered.set(sessionId, entry);
  }

  return filtered;
}

export function processPresenceAction(action, payload = {}) {
  const now = Date.now();
  const store = cleanExpired(now);
  const sessionId = typeof payload.sessionId === "string" ? payload.sessionId.trim() : "";
  const scope = {
    path: payload.path,
    projectKey: payload.projectKey,
    pageKey: payload.pageKey,
  };
  const scopedStore = filterStoreByScope(store, scope);

  if (!action || action === "status") {
    return buildPresenceSnapshot(scopedStore);
  }

  if (!sessionId) {
    return {
      ok: false,
      status: 400,
      error: "sessionId is required",
      count: countActive(now),
      viewers: buildPresenceSnapshot(store).viewers,
      activeWindowMs: ACTIVE_WINDOW_MS,
    };
  }

  if (action === "heartbeat") {
    store.set(sessionId, {
      lastSeen: now,
      path: typeof payload.path === "string" ? payload.path : "/",
      projectKey: typeof payload.projectKey === "string" ? payload.projectKey : "",
      pageKey: typeof payload.pageKey === "string" ? payload.pageKey : "",
      title: typeof payload.title === "string" ? payload.title : "",
      fullName: typeof payload.fullName === "string" ? payload.fullName.trim() : "",
      initials: typeof payload.initials === "string" ? payload.initials.trim().slice(0, 2).toUpperCase() : "",
      avatarUrl: typeof payload.avatarUrl === "string" ? payload.avatarUrl.trim() : "",
    });
  } else if (action === "leave") {
    store.delete(sessionId);
  } else {
    return {
      ok: false,
      status: 400,
      error: "Unsupported presence action",
      count: countActive(now),
      viewers: buildPresenceSnapshot(store).viewers,
      activeWindowMs: ACTIVE_WINDOW_MS,
    };
  }

  return buildPresenceSnapshot(filterStoreByScope(store, scope));
}

export async function processPresenceActionAsync(action, payload = {}) {
  if (!REDIS_ENABLED) {
    return processPresenceAction(action, payload);
  }

  try {
    const now = Date.now();
    const sessionId = typeof payload.sessionId === "string" ? payload.sessionId.trim() : "";
    const scope = {
      path: payload.path,
      projectKey: payload.projectKey,
      pageKey: payload.pageKey,
    };

    if (!action || action === "status") {
      const entries = await listRedisScopeEntries(scope);
      const store = new Map(
        entries
          .filter((entry) => now - Number(entry.lastSeen || 0) <= ACTIVE_WINDOW_MS)
          .map((entry) => [entry.sessionId, entry]),
      );
      return buildPresenceSnapshot(store);
    }

    if (!sessionId) {
      return {
        ok: false,
        status: 400,
        error: "sessionId is required",
        count: 0,
        viewers: [],
        activeWindowMs: ACTIVE_WINDOW_MS,
      };
    }

    const key = buildPresenceKey(scope, sessionId);

    if (action === "heartbeat") {
      await redisCommand([
        "SETEX",
        key,
        String(PRESENCE_TTL_SECONDS),
        JSON.stringify({
          sessionId,
          lastSeen: now,
          path: typeof payload.path === "string" ? payload.path : "/",
          projectKey: typeof payload.projectKey === "string" ? payload.projectKey : "",
          pageKey: typeof payload.pageKey === "string" ? payload.pageKey : "",
          title: typeof payload.title === "string" ? payload.title : "",
          fullName: typeof payload.fullName === "string" ? payload.fullName.trim() : "",
          initials: typeof payload.initials === "string" ? payload.initials.trim().slice(0, 2).toUpperCase() : "",
          avatarUrl: typeof payload.avatarUrl === "string" ? payload.avatarUrl.trim() : "",
        }),
      ]);
    } else if (action === "leave") {
      await redisCommand(["DEL", key]);
    } else {
      return {
        ok: false,
        status: 400,
        error: "Unsupported presence action",
        count: 0,
        viewers: [],
        activeWindowMs: ACTIVE_WINDOW_MS,
      };
    }

    return processPresenceActionAsync("status", payload);
  } catch (error) {
    if (!isRedisRecoverableError(error)) {
      throw error;
    }

    return processPresenceAction(action, payload);
  }
}

export function getPresenceCount() {
  return countActive();
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

export function sendJson(res, status, payload) {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  });
  res.end(JSON.stringify(payload));
}
