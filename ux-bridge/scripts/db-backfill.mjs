import { writeCommentRecords } from "../db/comments.js";
import { getRedisConfig } from "../db/config.js";
import { writeProjectRecord } from "../db/projects.js";
import { writeIntegrationSecretRecord, writeUserRecord } from "../db/users.js";

const USER_KEY_PREFIX = "brand-affiliate:user:";
const USER_INDEX_KEY = "brand-affiliate:user-index";
const INTEGRATION_SECRET_KEY_PREFIX = "brand-affiliate:integration-secret:";
const PROJECTS_INDEX_KEY = "ux-bridge:projects:index";
const PROJECT_KEY_PREFIX = "ux-bridge:project:";
const COMMENTS_PREFIX = "ux-bridge:comments:";

function parseJson(value, fallback = null) {
  if (!value) {
    return fallback;
  }

  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function normalizeEmail(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

function normalizePageId(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

function readRedisSettings() {
  const redis = getRedisConfig();

  if (!redis.configured) {
    throw new Error("Redis is not configured. Add Upstash/KV env vars before running db:backfill.");
  }

  return {
    url:
      String(process.env.UPSTASH_REDIS_REST_URL || "").trim() ||
      String(process.env.KV_REST_API_URL || "").trim(),
    token:
      String(process.env.UPSTASH_REDIS_REST_TOKEN || "").trim() ||
      String(process.env.KV_REST_API_TOKEN || "").trim(),
  };
}

async function redisCommand(command) {
  const redis = readRedisSettings();
  const response = await fetch(redis.url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${redis.token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(command),
  });

  if (!response.ok) {
    throw new Error(`Redis request failed with ${response.status}`);
  }

  const payload = await response.json();

  if (payload.error) {
    throw new Error(payload.error);
  }

  return payload.result;
}

async function readRedisJson(key) {
  const value = await redisCommand(["GET", key]);
  return parseJson(value, null);
}

async function scanRedisKeys(prefix) {
  let cursor = "0";
  const results = [];

  do {
    const payload = await redisCommand(["SCAN", cursor, "MATCH", `${prefix}*`, "COUNT", "200"]);
    cursor = Array.isArray(payload) ? String(payload[0] || "0") : "0";
    const keys = Array.isArray(payload?.[1]) ? payload[1] : [];
    results.push(...keys.map((key) => String(key || "")));
  } while (cursor !== "0");

  return results.filter(Boolean);
}

async function backfillUsers() {
  const indexedEmails = parseJson(await redisCommand(["GET", USER_INDEX_KEY]), []) || [];
  const scanKeys = await scanRedisKeys(USER_KEY_PREFIX);
  const scanEmails = scanKeys.map((key) => key.replace(USER_KEY_PREFIX, ""));
  const emails = [...new Set([...indexedEmails, ...scanEmails].map((email) => normalizeEmail(email)).filter(Boolean))];
  let count = 0;

  for (const email of emails) {
    const user = await readRedisJson(`${USER_KEY_PREFIX}${email}`);

    if (!user) {
      continue;
    }

    await writeUserRecord({
      ...user,
      email,
    });
    count += 1;
  }

  return count;
}

async function backfillIntegrationSecrets() {
  const keys = await scanRedisKeys(INTEGRATION_SECRET_KEY_PREFIX);
  let count = 0;

  for (const key of keys) {
    const record = await readRedisJson(key);

    if (!record) {
      continue;
    }

    const remainder = key.replace(INTEGRATION_SECRET_KEY_PREFIX, "");
    const separatorIndex = remainder.lastIndexOf(":");

    if (separatorIndex <= 0) {
      continue;
    }

    const email = normalizeEmail(remainder.slice(0, separatorIndex));
    const providerId = String(remainder.slice(separatorIndex + 1) || "")
      .trim()
      .toLowerCase();

    if (!email || !providerId) {
      continue;
    }

    await writeIntegrationSecretRecord(email, providerId, record);
    count += 1;
  }

  return count;
}

async function backfillProjects() {
  const indexedIds = parseJson(await redisCommand(["GET", PROJECTS_INDEX_KEY]), []) || [];
  const scanKeys = await scanRedisKeys(PROJECT_KEY_PREFIX);
  const scanIds = scanKeys.map((key) => key.replace(PROJECT_KEY_PREFIX, ""));
  const projectIds = [...new Set([...indexedIds, ...scanIds].map((projectId) => String(projectId || "").trim()).filter(Boolean))];
  let count = 0;

  for (const projectId of projectIds) {
    const project = await readRedisJson(`${PROJECT_KEY_PREFIX}${projectId}`);

    if (!project) {
      continue;
    }

    await writeProjectRecord(project);
    count += 1;
  }

  return count;
}

async function backfillComments() {
  const keys = await scanRedisKeys(COMMENTS_PREFIX);
  let count = 0;

  for (const key of keys) {
    if (key.startsWith("ux-bridge:comments-summary:")) {
      continue;
    }

    const payload = await readRedisJson(key);
    const comments = Array.isArray(payload) ? payload : null;

    if (!comments) {
      continue;
    }

    const remainder = key.replace(COMMENTS_PREFIX, "");
    const separatorIndex = remainder.indexOf(":");

    if (separatorIndex <= 0) {
      continue;
    }

    const projectId = String(remainder.slice(0, separatorIndex) || "").trim();
    const pageId = normalizePageId(remainder.slice(separatorIndex + 1));

    if (!projectId || !pageId) {
      continue;
    }

    await writeCommentRecords(projectId, pageId, comments);
    count += 1;
  }

  return count;
}

async function main() {
  const summary = {
    users: await backfillUsers(),
    integrationSecrets: await backfillIntegrationSecrets(),
    projects: await backfillProjects(),
    commentThreads: await backfillComments(),
  };

  console.log(JSON.stringify({ ok: true, summary }, null, 2));
}

main().catch((error) => {
  console.error("[db:backfill] failed", error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
