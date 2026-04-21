import { getAuthenticatedUser, readJsonBody, sendJson } from "./auth-store.js";
import { isRedisConfigured, isRedisRecoverableError, readRedisJson, writeRedisJson } from "./db/redis.js";
import { getProjectById } from "./projects-store.js";

const PROJECT_NAV_STORE_KEY = "__uxBridgeProjectNavStore__";
const PROJECT_NAV_PREFIX = "ux-bridge:project-nav:";
const DEFAULT_PROJECT_ORDERS = {
  "brand-affiliate-mobile": ["building", "l1-bonus", "l1-l2-bonus"],
};

const REDIS_ENABLED = isRedisConfigured();

function getMemoryStore() {
  if (!globalThis[PROJECT_NAV_STORE_KEY]) {
    globalThis[PROJECT_NAV_STORE_KEY] = new Map();
  }

  return globalThis[PROJECT_NAV_STORE_KEY];
}

function getProjectOrderKey(email, project) {
  return `${PROJECT_NAV_PREFIX}${email}:${project}`;
}

async function readStoredOrder(email, project) {
  const key = getProjectOrderKey(email, project);

  if (!REDIS_ENABLED) {
    return getMemoryStore().get(key) || null;
  }

  try {
    return await readRedisJson(key);
  } catch (error) {
    if (!isRedisRecoverableError(error)) {
      throw error;
    }

    return getMemoryStore().get(key) || null;
  }
}

async function writeStoredOrder(email, project, order) {
  const key = getProjectOrderKey(email, project);

  if (!REDIS_ENABLED) {
    getMemoryStore().set(key, order);
    return;
  }

  try {
    await writeRedisJson(key, order);
  } catch (error) {
    if (!isRedisRecoverableError(error)) {
      throw error;
    }

    getMemoryStore().set(key, order);
  }
}

function normalizeProject(project) {
  return String(project || "").trim().toLowerCase();
}

async function resolveDefaultOrder(project) {
  if (DEFAULT_PROJECT_ORDERS[project]) {
    return DEFAULT_PROJECT_ORDERS[project];
  }

  const projectRecord = await getProjectById(project);
  return Array.isArray(projectRecord?.pages) ? projectRecord.pages.map((page) => page.id).filter(Boolean) : [];
}

function sanitizeOrder(order, defaults) {
  const incoming = Array.isArray(order) ? order.map((value) => String(value)) : [];
  const deduped = incoming.filter((value, index) => defaults.includes(value) && incoming.indexOf(value) === index);

  return [...deduped, ...defaults.filter((value) => !deduped.includes(value))];
}

export async function handleProjectNavRequest(req) {
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
    const defaults = await resolveDefaultOrder(project);

    if (!defaults.length) {
      return {
        status: 404,
        payload: {
          ok: false,
          error: "Unknown project.",
        },
      };
    }

    const savedOrder = await readStoredOrder(user.email, project);
    const order = sanitizeOrder(savedOrder || defaults, defaults);

    return {
      status: 200,
      payload: {
        ok: true,
        project,
        order,
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
  const project = normalizeProject(payload.project);
  const defaults = await resolveDefaultOrder(project);

  if (!defaults.length) {
    return {
      status: 404,
      payload: {
        ok: false,
        error: "Unknown project.",
      },
    };
  }

  const order = sanitizeOrder(payload.order, defaults);
  await writeStoredOrder(user.email, project, order);

  return {
    status: 200,
    payload: {
      ok: true,
      project,
      order,
    },
  };
}

export { sendJson };
