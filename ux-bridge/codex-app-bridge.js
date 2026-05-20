import crypto from "node:crypto";
import { createServer } from "node:http";
import { generateScaffoldedVibePageResult } from "./vibe-providers.js";

const port = Number(process.env.UX_BRIDGE_CODEX_BRIDGE_PORT || 4318);
const host = "127.0.0.1";
const bridgeSessions = new Map();

function sendJson(res, status, payload) {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Private-Network": "true",
    "Cache-Control": "no-store",
    Vary: "Access-Control-Request-Private-Network",
  });
  res.end(JSON.stringify(payload));
}

async function readJsonBody(req) {
  const chunks = [];

  for await (const chunk of req) {
    chunks.push(chunk);
  }

  if (!chunks.length) {
    return {};
  }

  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

function normalizePrompt(value) {
  return String(value || "").trim().replace(/\s+/g, " ");
}

function normalizeSessionKey(value) {
  return String(value || "").trim() || crypto.randomUUID();
}

function summarizeTokenGroups(designSystem = {}) {
  const tokenGroups = Array.isArray(designSystem?.tokenGroups) ? designSystem.tokenGroups : [];
  return tokenGroups.length ? tokenGroups.map((entry) => `${entry.group} (${entry.count})`).join(", ") : "none";
}

function summarizeReferencePages(designSystem = {}) {
  const referencePages = Array.isArray(designSystem?.referencePages) ? designSystem.referencePages : [];
  return referencePages.length
    ? referencePages
        .slice(0, 4)
        .map((entry) => `${entry.name}: ${entry.summary || "applied pattern"}`)
        .join("; ")
    : "none";
}

function summarizeThreadTurns(messages = []) {
  return (Array.isArray(messages) ? messages : [])
    .slice(-6)
    .map((message) => {
      const role = String(message?.role || "system").trim().toLowerCase();
      const content = String(message?.content || "").trim();
      const pageId = String(message?.pageId || "").trim();

      if (!content) {
        return "";
      }

      return `${role}${pageId ? ` (${pageId})` : ""}: ${content}`;
    })
    .filter(Boolean)
    .join(" ");
}

function buildBridgePrompt(payload = {}, session = null) {
  const prompt = normalizePrompt(payload.prompt);
  const currentPageSummary = String(payload.currentPageSummary || "").trim();
  const recentTurns = summarizeThreadTurns(payload.recentThreadMessages);
  const previousTurns = Array.isArray(session?.turns)
    ? session.turns
        .slice(-4)
        .map((turn) => `${turn.role}: ${turn.content}`)
        .filter(Boolean)
        .join(" ")
    : "";
  const designSystem = payload.designSystem && typeof payload.designSystem === "object" ? payload.designSystem : {};
  const contextBits = [
    currentPageSummary ? `Current preview: ${currentPageSummary}.` : "",
    recentTurns ? `Shared project thread: ${recentTurns}.` : "",
    previousTurns ? `Bridge session memory: ${previousTurns}.` : "",
    `Design tokens: ${summarizeTokenGroups(designSystem)}.`,
    `Reference pages: ${summarizeReferencePages(designSystem)}.`,
  ]
    .filter(Boolean)
    .join(" ");

  return contextBits ? `${prompt} ${contextBits}`.trim() : prompt;
}

function serializeSession(session) {
  return {
    id: session.id,
    sessionKey: session.sessionKey,
    projectId: session.projectId,
    projectName: session.projectName,
    pageId: session.pageId,
    pageName: session.pageName,
    turnCount: Array.isArray(session.turns) ? session.turns.length : 0,
    updatedAt: session.updatedAt,
  };
}

function ensureBridgeSession(payload = {}) {
  const sessionKey = normalizeSessionKey(payload.sessionKey || payload.sessionId || payload.projectId || payload.projectName);
  const existing = bridgeSessions.get(sessionKey);
  const now = Date.now();

  if (existing) {
    existing.projectId = String(payload.projectId || existing.projectId || "").trim();
    existing.projectName = String(payload.projectName || existing.projectName || "").trim() || "Project";
    existing.pageId = String(payload.pageId || existing.pageId || "").trim();
    existing.pageName = String(payload.pageName || existing.pageName || "").trim() || "Page";
    existing.updatedAt = now;
    return existing;
  }

  const created = {
    id: crypto.randomUUID(),
    sessionKey,
    projectId: String(payload.projectId || "").trim(),
    projectName: String(payload.projectName || "").trim() || "Project",
    pageId: String(payload.pageId || "").trim(),
    pageName: String(payload.pageName || "").trim() || "Page",
    createdAt: now,
    updatedAt: now,
    turns: [],
  };
  bridgeSessions.set(sessionKey, created);
  return created;
}

createServer(async (req, res) => {
  const requestUrl = new URL(req.url || "/", `http://${req.headers.host || `${host}:${port}`}`);

  if (req.method === "OPTIONS") {
    sendJson(res, 204, {});
    return;
  }

  if (requestUrl.pathname === "/health") {
    sendJson(res, 200, {
      ok: true,
      bridge: "ux-bridge-codex-app-bridge",
      version: "0.1.0",
      mode: "session-local-bridge",
      activeSessions: bridgeSessions.size,
    });
    return;
  }

  if (requestUrl.pathname === "/v1/sessions/ensure") {
    if (req.method !== "POST") {
      sendJson(res, 405, { ok: false, error: "Method not allowed." });
      return;
    }

    try {
      const payload = await readJsonBody(req);
      const session = ensureBridgeSession(payload);

      sendJson(res, 200, {
        ok: true,
        session: serializeSession(session),
      });
    } catch (error) {
      sendJson(res, 400, {
        ok: false,
        error: error instanceof Error ? error.message : "Unable to create or resume the local Codex bridge session.",
      });
    }
    return;
  }

  if (requestUrl.pathname === "/v1/sessions/message") {
    if (req.method !== "POST") {
      sendJson(res, 405, { ok: false, error: "Method not allowed." });
      return;
    }

    try {
      const payload = await readJsonBody(req);
      const prompt = normalizePrompt(payload.prompt);
      const session = ensureBridgeSession(payload);
      const projectName = String(payload.projectName || session.projectName || "").trim() || "Project";
      const pageName = String(payload.pageName || session.pageName || "").trim() || "Page";

      if (!prompt) {
        sendJson(res, 400, { ok: false, error: "Add a prompt before asking Codex App to edit the current mobile preview." });
        return;
      }

      session.projectName = projectName;
      session.pageId = String(payload.pageId || session.pageId || "").trim();
      session.pageName = pageName;
      session.turns.push({
        role: "user",
        content: prompt,
        pageId: session.pageId,
        createdAt: Date.now(),
      });

      const result = generateScaffoldedVibePageResult({
        providerId: "codex-app",
        prompt: buildBridgePrompt(payload, session),
        projectName,
        pageName,
        includeProjectContext: payload.includeProjectContext !== false,
        includePageContext: payload.includePageContext !== false,
      });

      session.turns.push({
        role: "assistant",
        content: String(result.summary || "").trim() || `Refined ${pageName}.`,
        pageId: session.pageId,
        createdAt: Date.now() + 1,
      });
      session.updatedAt = Date.now();

      sendJson(res, 200, {
        ok: true,
        session: serializeSession(session),
        result: {
          ...result,
          providerId: "codex-app",
          providerLabel: "Codex App",
          credentialMode: "local-bridge",
          availableVia: "local-bridge",
        },
      });
    } catch (error) {
      sendJson(res, 400, {
        ok: false,
        error: error instanceof Error ? error.message : "Unable to generate content from the local Codex bridge.",
      });
    }
    return;
  }

  if (requestUrl.pathname === "/v1/generate-page") {
    sendJson(res, 308, {
      ok: true,
      message: "Use /v1/sessions/message instead.",
    });
    return;
  }

  sendJson(res, 404, { ok: false, error: "Not found." });
}).listen(port, host, () => {
  console.log(`UX Bridge Codex App bridge running at http://${host}:${port}`);
});
