import { createServer } from "node:http";
import { generateScaffoldedVibePageResult } from "./vibe-providers.js";

const port = Number(process.env.UX_BRIDGE_CODEX_BRIDGE_PORT || 4318);
const host = "127.0.0.1";

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
      mode: "scaffolded-local-bridge",
    });
    return;
  }

  if (requestUrl.pathname === "/v1/generate-page") {
    if (req.method !== "POST") {
      sendJson(res, 405, { ok: false, error: "Method not allowed." });
      return;
    }

    try {
      const payload = await readJsonBody(req);
      const prompt = normalizePrompt(payload.prompt);
      const projectName = String(payload.projectName || "").trim() || "Project";
      const pageName = String(payload.pageName || "").trim() || "Page";

      if (!prompt) {
        sendJson(res, 400, { ok: false, error: "Add a prompt before asking Codex App to generate page content." });
        return;
      }

      const result = generateScaffoldedVibePageResult({
        providerId: "codex-app",
        prompt,
        projectName,
        pageName,
        includeProjectContext: payload.includeProjectContext !== false,
        includePageContext: payload.includePageContext !== false,
      });

      sendJson(res, 200, {
        ok: true,
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

  sendJson(res, 404, { ok: false, error: "Not found." });
}).listen(port, host, () => {
  console.log(`UX Bridge Codex App bridge running at http://${host}:${port}`);
});
