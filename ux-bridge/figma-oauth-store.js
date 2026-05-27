import crypto from "node:crypto";
import {
  deleteUserIntegrationSecret,
  getSession,
  readUserIntegrationSecret,
  sendJson,
  writeUserIntegrationSecret,
} from "./auth-store.js";

const FIGMA_PROVIDER_ID = "figma";
const FIGMA_API_BASE_URL = "https://api.figma.com/v1";
const FIGMA_AUTH_URL = "https://www.figma.com/oauth";
const FIGMA_TOKEN_URL = "https://api.figma.com/v1/oauth/token";
const FIGMA_SCOPE = "file_read";
const OAUTH_COOKIE = "ux_bridge_figma_oauth";
const OAUTH_COOKIE_MAX_AGE = 60 * 10;
const OAUTH_STATE_SECRET =
  process.env.UX_BRIDGE_INTEGRATION_SECRET ||
  process.env.RESEND_API_KEY ||
  process.env.UPSTASH_REDIS_REST_TOKEN ||
  process.env.KV_REST_API_TOKEN ||
  "ux-bridge-local-dev-figma-oauth-secret";

function readFigmaOauthConfig() {
  return {
    clientId: String(process.env.UX_BRIDGE_FIGMA_CLIENT_ID || process.env.FIGMA_OAUTH_CLIENT_ID || "").trim(),
    clientSecret: String(process.env.UX_BRIDGE_FIGMA_CLIENT_SECRET || process.env.FIGMA_OAUTH_CLIENT_SECRET || "").trim(),
  };
}

function isConfigured() {
  return true;
}

function isOauthConfigured() {
  const config = readFigmaOauthConfig();
  return Boolean(config.clientId && config.clientSecret);
}

function getOrigin(req) {
  const proto = String(req.headers["x-forwarded-proto"] || "").split(",")[0].trim() || "http";
  const host = String(req.headers["x-forwarded-host"] || req.headers.host || "").split(",")[0].trim();
  return `${proto}://${host || "127.0.0.1"}`;
}

function getDefaultRedirectUri(req) {
  return new URL("/api/figma?action=oauth-callback", getOrigin(req)).toString();
}

function getCookie(req, name) {
  const cookies = String(req.headers.cookie || "").split(/;\s*/);
  const prefix = `${name}=`;
  const match = cookies.find((cookie) => cookie.startsWith(prefix));
  return match ? decodeURIComponent(match.slice(prefix.length)) : "";
}

function makeCookie(name, value, req, maxAge = OAUTH_COOKIE_MAX_AGE) {
  const secure = String(req.headers["x-forwarded-proto"] || "").includes("https") || getOrigin(req).startsWith("https://");
  return [
    `${name}=${encodeURIComponent(value)}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${maxAge}`,
    secure ? "Secure" : "",
  ]
    .filter(Boolean)
    .join("; ");
}

function clearCookie(name, req) {
  return makeCookie(name, "", req, 0);
}

function base64Url(input) {
  return Buffer.from(input).toString("base64url");
}

function signPayload(payload) {
  return crypto.createHmac("sha256", OAUTH_STATE_SECRET).update(payload).digest("base64url");
}

function encodeSignedCookie(payload) {
  const body = base64Url(JSON.stringify(payload));
  return `${body}.${signPayload(body)}`;
}

function decodeSignedCookie(value) {
  const [body, signature] = String(value || "").split(".");

  if (!body || !signature || signPayload(body) !== signature) {
    return null;
  }

  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
    return payload && typeof payload === "object" ? payload : null;
  } catch {
    return null;
  }
}

function createPkceVerifier() {
  return crypto.randomBytes(48).toString("base64url");
}

function createPkceChallenge(verifier) {
  return crypto.createHash("sha256").update(verifier).digest("base64url");
}

function createBasicAuthHeader(clientId, clientSecret) {
  return `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`;
}

function normalizeReturnTo(value, req) {
  const fallback = "/";
  const origin = getOrigin(req);

  try {
    const url = new URL(String(value || fallback), origin);

    if (url.origin !== origin) {
      return fallback;
    }

    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return fallback;
  }
}

function appendStatusParam(path, name, value) {
  const separator = String(path || "/").includes("?") ? "&" : "?";
  return `${path || "/"}${separator}${encodeURIComponent(name)}=${encodeURIComponent(value)}`;
}

function parseStoredToken(value) {
  const raw = String(value || "").trim();

  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : { accessToken: raw };
  } catch {
    return { accessToken: raw };
  }
}

async function exchangeCodeForToken({ code, codeVerifier, redirectUri }) {
  const config = readFigmaOauthConfig();
  const body = new URLSearchParams({
    client_id: config.clientId,
    client_secret: config.clientSecret,
    redirect_uri: redirectUri,
    code,
    grant_type: "authorization_code",
    code_verifier: codeVerifier,
  });
  const response = await fetch(FIGMA_TOKEN_URL, {
    method: "POST",
    headers: {
      Authorization: createBasicAuthHeader(config.clientId, config.clientSecret),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });
  const payload = await response.json().catch(() => ({}));

  if (!response.ok || !payload?.access_token) {
    throw new Error(payload?.message || payload?.error || "Figma did not return an access token.");
  }

  return payload;
}

async function refreshToken(storedToken) {
  const config = readFigmaOauthConfig();
  const refreshTokenValue = String(storedToken?.refreshToken || "").trim();

  if (!refreshTokenValue || !isOauthConfigured()) {
    return storedToken;
  }

  const body = new URLSearchParams({
    client_id: config.clientId,
    client_secret: config.clientSecret,
    refresh_token: refreshTokenValue,
    grant_type: "refresh_token",
  });
  const response = await fetch(FIGMA_TOKEN_URL, {
    method: "POST",
    headers: {
      Authorization: createBasicAuthHeader(config.clientId, config.clientSecret),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });
  const payload = await response.json().catch(() => ({}));

  if (!response.ok || !payload?.access_token) {
    return storedToken;
  }

  return {
    ...storedToken,
    accessToken: String(payload.access_token || "").trim(),
    tokenType: String(payload.token_type || storedToken.tokenType || "bearer").trim(),
    expiresAt: Date.now() + Math.max(0, Number(payload.expires_in) || 0) * 1000,
  };
}

export async function readFigmaUserAccessToken(email) {
  const stored = parseStoredToken(await readUserIntegrationSecret(email, FIGMA_PROVIDER_ID));

  if (!stored?.accessToken) {
    return "";
  }

  const expiresAt = Number(stored.expiresAt) || 0;

  if (expiresAt && expiresAt - Date.now() < 5 * 60 * 1000) {
    const refreshed = await refreshToken(stored);

    if (refreshed?.accessToken && refreshed.accessToken !== stored.accessToken) {
      await writeUserIntegrationSecret(email, FIGMA_PROVIDER_ID, JSON.stringify(refreshed), {
        connected: true,
        accountLabel: refreshed.userId ? `Figma ${refreshed.userId}` : "Figma",
        lastVerifiedAt: Date.now(),
      });
    }

    return refreshed?.accessToken || stored.accessToken;
  }

  return stored.accessToken;
}

async function requireUser(req) {
  const session = await getSession(req);
  const email = String(session?.user?.email || session?.email || "").trim().toLowerCase();
  return email ? { session, email } : null;
}

async function readJsonBody(req) {
  const chunks = [];

  for await (const chunk of req) {
    chunks.push(Buffer.from(chunk));
  }

  if (!chunks.length) {
    return {};
  }

  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    return {};
  }
}

async function verifyFigmaPat(token) {
  const response = await fetch(`${FIGMA_API_BASE_URL}/me`, {
    headers: {
      "X-Figma-Token": token,
    },
  });
  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(payload?.message || payload?.err || "Figma rejected that Personal Access Token.");
  }

  return payload && typeof payload === "object" ? payload : {};
}

async function handleStatus(req) {
  const user = await requireUser(req);

  if (!user) {
    return {
      status: 401,
      payload: { ok: false, configured: isConfigured(), connected: false, error: "Sign in before connecting Figma." },
    };
  }

  return {
    status: 200,
    payload: {
      ok: true,
      configured: isConfigured(),
      connected: Boolean(await readFigmaUserAccessToken(user.email)),
      connectionType: "personal-access-token",
    },
  };
}

async function handleStart(req) {
  const user = await requireUser(req);

  if (!user) {
    return { status: 302, headers: { Location: "/" }, payload: null };
  }

  if (!isOauthConfigured()) {
    return {
      status: 302,
      headers: {
        Location: appendStatusParam(
          normalizeReturnTo(new URL(req.url || "/", getOrigin(req)).searchParams.get("returnTo"), req),
          "figmaError",
          "not-configured",
        ),
      },
      payload: null,
    };
  }

  const url = new URL(req.url || "/", getOrigin(req));
  const state = crypto.randomUUID();
  const codeVerifier = createPkceVerifier();
  const redirectUri = process.env.UX_BRIDGE_FIGMA_REDIRECT_URI || process.env.FIGMA_OAUTH_REDIRECT_URI || getDefaultRedirectUri(req);
  const returnTo = normalizeReturnTo(url.searchParams.get("returnTo"), req);
  const authUrl = new URL(FIGMA_AUTH_URL);
  authUrl.searchParams.set("client_id", readFigmaOauthConfig().clientId);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("scope", FIGMA_SCOPE);
  authUrl.searchParams.set("state", state);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("code_challenge", createPkceChallenge(codeVerifier));
  authUrl.searchParams.set("code_challenge_method", "S256");

  return {
    status: 302,
    headers: {
      Location: authUrl.toString(),
      "Set-Cookie": makeCookie(
        OAUTH_COOKIE,
        encodeSignedCookie({ state, codeVerifier, redirectUri, returnTo, email: user.email, createdAt: Date.now() }),
        req,
      ),
    },
    payload: null,
  };
}

async function handleCallback(req) {
  const user = await requireUser(req);
  const url = new URL(req.url || "/", getOrigin(req));
  const stored = decodeSignedCookie(getCookie(req, OAUTH_COOKIE));
  const returnTo = normalizeReturnTo(stored?.returnTo || "/", req);
  const fail = (code) => ({
    status: 302,
    headers: {
      Location: appendStatusParam(returnTo, "figmaError", code),
      "Set-Cookie": clearCookie(OAUTH_COOKIE, req),
    },
    payload: null,
  });

  if (!user || !stored || stored.email !== user.email || stored.state !== url.searchParams.get("state")) {
    return fail("invalid-state");
  }

  const code = String(url.searchParams.get("code") || "").trim();

  if (!code) {
    return fail("missing-code");
  }

  try {
    const token = await exchangeCodeForToken({
      code,
      codeVerifier: stored.codeVerifier,
      redirectUri: stored.redirectUri,
    });
    const secretPayload = {
      accessToken: String(token.access_token || "").trim(),
      refreshToken: String(token.refresh_token || "").trim(),
      tokenType: String(token.token_type || "bearer").trim(),
      userId: String(token.user_id_string || token.user_id || "").trim(),
      expiresAt: Date.now() + Math.max(0, Number(token.expires_in) || 0) * 1000,
    };
    await writeUserIntegrationSecret(user.email, FIGMA_PROVIDER_ID, JSON.stringify(secretPayload), {
      connected: true,
      accountLabel: secretPayload.userId ? `Figma ${secretPayload.userId}` : "Figma",
      connectedAt: Date.now(),
      lastVerifiedAt: Date.now(),
    });

    return {
      status: 302,
      headers: {
        Location: appendStatusParam(returnTo, "figma", "connected"),
        "Set-Cookie": clearCookie(OAUTH_COOKIE, req),
      },
      payload: null,
    };
  } catch {
    return fail("token-exchange-failed");
  }
}

async function handleDisconnect(req) {
  const user = await requireUser(req);

  if (!user) {
    return { status: 401, payload: { ok: false, error: "Sign in before disconnecting Figma." } };
  }

  await deleteUserIntegrationSecret(user.email, FIGMA_PROVIDER_ID);
  return { status: 200, payload: { ok: true, connected: false } };
}

async function handleSaveToken(req) {
  const user = await requireUser(req);

  if (!user) {
    return { status: 401, payload: { ok: false, error: "Sign in before connecting Figma." } };
  }

  const body = await readJsonBody(req);
  const token = String(body?.token || "").trim();

  if (!token) {
    return { status: 400, payload: { ok: false, error: "Paste your Figma Personal Access Token first." } };
  }

  let figmaUser = {};

  try {
    figmaUser = await verifyFigmaPat(token);
  } catch (error) {
    return {
      status: 400,
      payload: {
        ok: false,
        error: error instanceof Error ? error.message : "Figma rejected that Personal Access Token.",
      },
    };
  }

  const label = String(figmaUser.handle || figmaUser.email || figmaUser.id || "Figma").trim();
  const secretPayload = {
    accessToken: token,
    tokenType: "pat",
    userId: String(figmaUser.id || "").trim(),
    handle: String(figmaUser.handle || "").trim(),
    email: String(figmaUser.email || "").trim(),
    connectedAt: Date.now(),
  };

  await writeUserIntegrationSecret(user.email, FIGMA_PROVIDER_ID, JSON.stringify(secretPayload), {
    connected: true,
    accountLabel: label,
    connectedAt: Date.now(),
    lastVerifiedAt: Date.now(),
  });

  return { status: 200, payload: { ok: true, connected: true, accountLabel: label } };
}

export async function handleFigmaRequest(req) {
  const url = new URL(req.url || "/", getOrigin(req));
  const pathname = url.pathname;
  const action = String(url.searchParams.get("action") || "").trim();

  if (req.method === "GET" && (pathname === "/api/figma/status" || action === "status")) {
    return handleStatus(req);
  }

  if (req.method === "GET" && (pathname === "/api/figma/oauth/start" || action === "oauth-start")) {
    return handleStart(req);
  }

  if (req.method === "GET" && (pathname === "/api/figma/oauth/callback" || action === "oauth-callback")) {
    return handleCallback(req);
  }

  if (req.method === "POST" && (pathname === "/api/figma/disconnect" || action === "disconnect")) {
    return handleDisconnect(req);
  }

  if (req.method === "POST" && (pathname === "/api/figma/token" || action === "save-token")) {
    return handleSaveToken(req);
  }

  return { status: 404, payload: { ok: false, error: "Figma endpoint not found." } };
}

export { sendJson };
