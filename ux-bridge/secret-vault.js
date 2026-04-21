import crypto from "node:crypto";

const SECRET_VAULT_TOKEN_CACHE_KEY = "__uxBridgeSecretVaultTokenCache__";

function normalizeUrl(value, fallback = "") {
  return String(value || fallback).trim().replace(/\/+$/, "");
}

function getInfisicalConfig() {
  const apiUrl = normalizeUrl(process.env.INFISICAL_API_URL, "https://us.infisical.com");
  const projectId = String(process.env.INFISICAL_PROJECT_ID || "").trim();
  const environment = String(process.env.INFISICAL_ENVIRONMENT || "").trim();
  const clientId = String(process.env.INFISICAL_CLIENT_ID || "").trim();
  const clientSecret = String(process.env.INFISICAL_CLIENT_SECRET || "").trim();
  const secretPath = String(process.env.INFISICAL_SECRET_PATH || "/").trim() || "/";

  return {
    provider: "infisical",
    apiUrl,
    projectId,
    environment,
    clientId,
    clientSecret,
    secretPath,
    configured: Boolean(apiUrl && projectId && environment && clientId && clientSecret),
    source: [
      "INFISICAL_API_URL",
      projectId ? "INFISICAL_PROJECT_ID" : "",
      environment ? "INFISICAL_ENVIRONMENT" : "",
      clientId ? "INFISICAL_CLIENT_ID" : "",
      clientSecret ? "INFISICAL_CLIENT_SECRET" : "",
      process.env.INFISICAL_SECRET_PATH ? "INFISICAL_SECRET_PATH" : "",
    ].filter(Boolean),
  };
}

export function getSecretVaultConfig() {
  return getInfisicalConfig();
}

export function isSecretVaultConfigured() {
  return getInfisicalConfig().configured;
}

function getTokenCache() {
  return globalThis[SECRET_VAULT_TOKEN_CACHE_KEY] || null;
}

function setTokenCache(accessToken, expiresInSeconds) {
  globalThis[SECRET_VAULT_TOKEN_CACHE_KEY] = {
    accessToken,
    expiresAt: Date.now() + Math.max(30, Number(expiresInSeconds) || 300) * 1000 - 60_000,
  };
}

async function getInfisicalAccessToken() {
  const config = getInfisicalConfig();

  if (!config.configured) {
    throw new Error("Infisical is not configured.");
  }

  const cached = getTokenCache();

  if (cached?.accessToken && Number(cached.expiresAt) > Date.now()) {
    return cached.accessToken;
  }

  const response = await fetch(`${config.apiUrl}/api/v1/auth/universal-auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      clientId: config.clientId,
      clientSecret: config.clientSecret,
    }),
  });

  if (!response.ok) {
    throw new Error(`Infisical auth request failed with ${response.status}: ${await response.text()}`);
  }

  const payload = await response.json();
  const accessToken = String(payload?.accessToken || "").trim();

  if (!accessToken) {
    throw new Error("Infisical auth response did not include an access token.");
  }

  setTokenCache(accessToken, payload?.expiresIn);
  return accessToken;
}

function sanitizeSecretNamePart(value) {
  const normalized = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 24);

  return normalized || "secret";
}

function buildSecretName(providerId = "", existingSecretName = "") {
  const normalizedExisting = String(existingSecretName || "").trim();

  if (normalizedExisting) {
    return normalizedExisting;
  }

  const providerSegment = sanitizeSecretNamePart(providerId);
  const randomSegment = crypto.randomUUID().replaceAll("-", "");
  return `ux-bridge-${providerSegment}-${randomSegment}`.slice(0, 127);
}

async function infisicalRequest(pathname, init = {}) {
  const config = getInfisicalConfig();
  const token = await getInfisicalAccessToken();
  const response = await fetch(`${config.apiUrl}${pathname}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
  });

  if (!response.ok) {
    throw new Error(`Infisical request failed with ${response.status}: ${await response.text()}`);
  }

  return response.status === 204 ? null : response.json();
}

export async function writeSecretToVault(secretValue, { providerId = "", secretName = "", tags = {} } = {}) {
  if (!isSecretVaultConfigured()) {
    return null;
  }

  const config = getInfisicalConfig();
  const value = String(secretValue || "").trim();

  if (!value) {
    return null;
  }

  const nextSecretName = buildSecretName(providerId, secretName);
  const payload = await infisicalRequest("/api/v4/secrets/raw", {
    method: "POST",
    body: JSON.stringify({
      secretName: nextSecretName,
      secretValue: value,
      projectId: config.projectId,
      environment: config.environment,
      secretPath: config.secretPath,
      type: "shared",
      metadata: tags,
      skipMultilineEncoding: true,
    }),
  });

  return {
    provider: "infisical",
    secretName: nextSecretName,
    secretVersion: String(payload?.secret?.version || payload?.version || "").trim(),
    secretId: String(payload?.secret?.id || payload?.id || "").trim(),
    vaultUrl: config.apiUrl,
    updatedAt: Date.now(),
  };
}

export async function readSecretFromVault(secretName = "") {
  if (!isSecretVaultConfigured()) {
    return "";
  }

  const config = getInfisicalConfig();
  const normalizedSecretName = String(secretName || "").trim();

  if (!normalizedSecretName) {
    return "";
  }

  const query = new URLSearchParams({
    secretName: normalizedSecretName,
    projectId: config.projectId,
    environment: config.environment,
    secretPath: config.secretPath,
    type: "shared",
  });

  const payload = await infisicalRequest(`/api/v4/secrets/raw?${query.toString()}`, {
    method: "GET",
  });

  return String(payload?.secret?.secretValue || payload?.secretValue || "");
}

export async function deleteSecretFromVault(secretName = "") {
  if (!isSecretVaultConfigured()) {
    return;
  }

  const config = getInfisicalConfig();
  const normalizedSecretName = String(secretName || "").trim();

  if (!normalizedSecretName) {
    return;
  }

  const query = new URLSearchParams({
    secretName: normalizedSecretName,
    projectId: config.projectId,
    environment: config.environment,
    secretPath: config.secretPath,
    type: "shared",
  });

  await infisicalRequest(`/api/v4/secrets/raw?${query.toString()}`, {
    method: "DELETE",
  });
}
