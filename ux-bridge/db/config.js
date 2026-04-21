const NODE_ENV = String(process.env.NODE_ENV || "").trim().toLowerCase();

export function isProductionLikeRuntime() {
  return NODE_ENV === "production" || String(process.env.VERCEL || "").trim() === "1";
}

export function allowDurableMemoryFallback() {
  return !isProductionLikeRuntime();
}

export function getPostgresConfig() {
  const url =
    String(process.env.POSTGRES_URL_NON_POOLING || "").trim() ||
    String(process.env.POSTGRES_URL || "").trim() ||
    String(process.env.DATABASE_URL || "").trim();

  return {
    url,
    configured: Boolean(url),
    source:
      (process.env.POSTGRES_URL_NON_POOLING && "POSTGRES_URL_NON_POOLING") ||
      (process.env.POSTGRES_URL && "POSTGRES_URL") ||
      (process.env.DATABASE_URL && "DATABASE_URL") ||
      "",
  };
}

export function getRedisConfig() {
  const upstashUrl = String(process.env.UPSTASH_REDIS_REST_URL || "").trim();
  const upstashToken = String(process.env.UPSTASH_REDIS_REST_TOKEN || "").trim();

  if (upstashUrl && upstashToken) {
    return {
      provider: "upstash",
      configured: true,
      source: ["UPSTASH_REDIS_REST_URL", "UPSTASH_REDIS_REST_TOKEN"],
    };
  }

  const kvUrl = String(process.env.KV_REST_API_URL || "").trim();
  const kvToken = String(process.env.KV_REST_API_TOKEN || "").trim();

  if (kvUrl && kvToken) {
    return {
      provider: "kv-rest",
      configured: true,
      source: ["KV_REST_API_URL", "KV_REST_API_TOKEN"],
    };
  }

  return {
    provider: "memory",
    configured: false,
    source: [],
  };
}

export function getBlobConfig() {
  const token = String(process.env.BLOB_READ_WRITE_TOKEN || "").trim();

  return {
    token,
    configured: Boolean(token),
    source: token ? "BLOB_READ_WRITE_TOKEN" : "",
  };
}

export function isBlobConfigured() {
  return getBlobConfig().configured;
}

export function getSecretVaultConfig() {
  const apiUrl = String(process.env.INFISICAL_API_URL || "https://us.infisical.com").trim();
  const projectId = String(process.env.INFISICAL_PROJECT_ID || "").trim();
  const environment = String(process.env.INFISICAL_ENVIRONMENT || "").trim();
  const clientId = String(process.env.INFISICAL_CLIENT_ID || "").trim();
  const clientSecret = String(process.env.INFISICAL_CLIENT_SECRET || "").trim();

  return {
    provider: projectId ? "infisical" : "none",
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

export function getGitWorkerConfig() {
  const executionMode = String(process.env.UX_BRIDGE_GIT_EXECUTION_MODE || "local").trim().toLowerCase() || "local";
  const remoteUrl = String(process.env.UX_BRIDGE_GIT_WORKER_URL || "").trim();
  const remoteToken = String(process.env.UX_BRIDGE_GIT_WORKER_TOKEN || "").trim();

  return {
    executionMode,
    configured: executionMode === "remote" ? Boolean(remoteUrl && remoteToken) : true,
    source: [
      process.env.UX_BRIDGE_GIT_EXECUTION_MODE ? "UX_BRIDGE_GIT_EXECUTION_MODE" : "",
      remoteUrl ? "UX_BRIDGE_GIT_WORKER_URL" : "",
      remoteToken ? "UX_BRIDGE_GIT_WORKER_TOKEN" : "",
    ].filter(Boolean),
  };
}

export function getStorageHealthSnapshot() {
  const postgres = getPostgresConfig();
  const redis = getRedisConfig();
  const blob = getBlobConfig();
  const secretVault = getSecretVaultConfig();
  const gitWorker = getGitWorkerConfig();
  const productionLike = isProductionLikeRuntime();

  return {
    productionLike,
    postgres: {
      configured: postgres.configured,
      source: postgres.source,
      durable: postgres.configured,
    },
    redis: {
      configured: redis.configured,
      provider: redis.provider,
      source: redis.source,
      durable: redis.configured,
    },
    blob: {
      configured: blob.configured,
      source: blob.source,
      durable: blob.configured,
    },
    secretVault: {
      configured: secretVault.configured,
      provider: secretVault.provider,
      source: secretVault.source,
      durable: secretVault.configured,
    },
    gitWorker: {
      configured: gitWorker.configured,
      executionMode: gitWorker.executionMode,
      source: gitWorker.source,
    },
    warnings: [
      !postgres.configured ? "Postgres is not configured yet." : "",
      productionLike && !postgres.configured ? "Production should not rely on memory for durable records." : "",
      !redis.configured ? "Redis is not configured yet. Sessions/cache/presence will fall back to memory." : "",
      !blob.configured ? "Blob storage is not configured yet. Asset uploads are unavailable." : "",
      !secretVault.configured ? "Secret vault is not configured yet. Integration secrets still use app-managed encryption." : "",
      productionLike && gitWorker.executionMode !== "remote"
        ? "Git/worktree execution still runs inside the app process. A dedicated remote git worker is the safer production setup."
        : "",
      gitWorker.executionMode === "remote" && !gitWorker.configured
        ? "Git/worktree execution is set to remote mode, but the remote worker URL or token is missing."
        : "",
    ].filter(Boolean),
  };
}

export function ensureDurableStoreAvailable(storeLabel = "durable records") {
  const postgres = getPostgresConfig();

  if (postgres.configured || allowDurableMemoryFallback()) {
    return;
  }

  throw new Error(`Postgres is required for ${storeLabel} in production. Configure POSTGRES_URL first.`);
}
