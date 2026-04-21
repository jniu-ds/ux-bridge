import { getRedisConfig } from "./config.js";

export function isRedisConfigured() {
  return getRedisConfig().configured;
}

export function isRedisRecoverableError(error) {
  const message = error instanceof Error ? error.message : String(error || "");
  const status = Number(error?.status || 0);

  if (status === 401 || status === 403 || status === 408 || status === 429) {
    return true;
  }

  return [
    "Redis request failed with 401",
    "Redis request failed with 403",
    "Redis request failed with 408",
    "Redis request failed with 429",
    "Redis request failed with 500",
    "Redis request failed with 502",
    "Redis request failed with 503",
    "Redis request failed with 504",
    "Unable to connect to Redis",
    "fetch failed",
    "ECONNRESET",
    "ETIMEDOUT",
    "ENOTFOUND",
  ].some((needle) => message.includes(needle));
}

function getRedisRuntimeConfig() {
  const config = getRedisConfig();
  const url =
    String(process.env.UPSTASH_REDIS_REST_URL || "").trim() ||
    String(process.env.KV_REST_API_URL || "").trim();
  const token =
    String(process.env.UPSTASH_REDIS_REST_TOKEN || "").trim() ||
    String(process.env.KV_REST_API_TOKEN || "").trim();

  return {
    ...config,
    url,
    token,
  };
}

export async function redisCommand(command) {
  const config = getRedisRuntimeConfig();

  if (!config.configured || !config.url || !config.token) {
    return null;
  }

  const response = await fetch(config.url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(command),
  });

  if (!response.ok) {
    const error = new Error(`Redis request failed with ${response.status}`);
    error.status = response.status;
    throw error;
  }

  const payload = await response.json();

  if (payload.error) {
    throw new Error(payload.error);
  }

  return payload.result;
}

export async function readRedisJson(key) {
  if (!isRedisConfigured()) {
    return null;
  }

  const value = await redisCommand(["GET", key]);
  return value ? JSON.parse(value) : null;
}

export async function writeRedisJson(key, value, ttlSeconds = 0) {
  if (!isRedisConfigured()) {
    return;
  }

  if (ttlSeconds > 0) {
    await redisCommand(["SETEX", key, String(ttlSeconds), JSON.stringify(value)]);
    return;
  }

  await redisCommand(["SET", key, JSON.stringify(value)]);
}

export async function deleteRedisKeys(...keys) {
  const nextKeys = keys.flat().map((key) => String(key || "").trim()).filter(Boolean);

  if (!isRedisConfigured() || !nextKeys.length) {
    return;
  }

  await redisCommand(["DEL", ...nextKeys]);
}

export async function scanRedisKeys(matchPattern, count = 200) {
  if (!isRedisConfigured()) {
    return [];
  }

  let cursor = "0";
  const matches = [];

  do {
    const result = await redisCommand(["SCAN", cursor, "MATCH", matchPattern, "COUNT", String(count)]);
    cursor = Array.isArray(result) ? String(result[0] || "0") : "0";
    const keys = Array.isArray(result?.[1]) ? result[1] : [];
    matches.push(...keys.map((key) => String(key || "")));
  } while (cursor !== "0");

  return matches.filter(Boolean);
}

export async function checkRedisConnection() {
  if (!isRedisConfigured()) {
    return {
      configured: false,
      connected: false,
      error: "Redis is not configured.",
    };
  }

  try {
    await redisCommand(["PING"]);
    return {
      configured: true,
      connected: true,
      error: "",
    };
  } catch (error) {
    return {
      configured: true,
      connected: false,
      error: error instanceof Error ? error.message : "Unable to connect to Redis.",
    };
  }
}
