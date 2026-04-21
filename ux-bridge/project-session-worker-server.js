import { createServer } from "node:http";
import {
  createProjectEditSessionWorkspace,
  ensureProjectWorkspaceRepository,
  getProjectEditSessionReview,
  mergeProjectEditSessionWorkspace,
} from "./project-session-git.js";

const port = Number(process.env.PORT || 4191);
const host = String(process.env.HOST || "0.0.0.0").trim() || "0.0.0.0";
const workerToken = String(process.env.UX_BRIDGE_GIT_WORKER_TOKEN || "").trim();

/** @typedef {import("node:http").IncomingMessage} IncomingMessage */
/** @typedef {import("node:http").ServerResponse} ServerResponse */

/**
 * @param {ServerResponse} res
 * @param {number} status
 * @param {unknown} payload
 */
function sendJson(res, status, payload) {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  });
  res.end(JSON.stringify(payload));
}

/**
 * @param {IncomingMessage} req
 * @returns {Promise<Record<string, unknown>>}
 */
function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";

    req.on("data", /** @param {Buffer | string} chunk */ (chunk) => {
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

/**
 * @param {IncomingMessage} req
 */
function isAuthorized(req) {
  if (!workerToken) {
    return false;
  }

  const header = String(req.headers.authorization || "").trim();
  return header === `Bearer ${workerToken}`;
}

createServer(async (req, res) => {
  const requestUrl = new URL(req.url || "/", `http://${req.headers.host || "127.0.0.1"}`);

  if (requestUrl.pathname === "/health") {
    sendJson(res, 200, {
      ok: true,
      executionMode: "remote-worker",
      configured: Boolean(workerToken),
    });
    return;
  }

  if (!isAuthorized(req)) {
    sendJson(res, 401, {
      ok: false,
      error: "Unauthorized git worker request.",
    });
    return;
  }

  if (req.method !== "POST") {
    sendJson(res, 405, {
      ok: false,
      error: "Method not allowed",
    });
    return;
  }

  try {
    const payload = await readJsonBody(req);

    if (requestUrl.pathname === "/workspace/ensure") {
      const result = await ensureProjectWorkspaceRepository(String(payload.projectId || "").trim());
      sendJson(res, 200, { ok: true, ...result });
      return;
    }

    if (requestUrl.pathname === "/edit-session/create") {
      const result = await createProjectEditSessionWorkspace({
        projectId: String(payload.projectId || "").trim(),
        branchName: String(payload.branchName || "").trim(),
        sessionId: String(payload.sessionId || "").trim() || undefined,
      });
      sendJson(res, 200, { ok: true, ...result });
      return;
    }

    if (requestUrl.pathname === "/edit-session/merge") {
      const result = await mergeProjectEditSessionWorkspace({
        projectId: String(payload.projectId || "").trim(),
        branchName: String(payload.branchName || "").trim(),
        worktreePath: String(payload.worktreePath || "").trim(),
        baseBranch: String(payload.baseBranch || "").trim() || undefined,
      });
      sendJson(res, 200, { ok: true, ...result });
      return;
    }

    if (requestUrl.pathname === "/edit-session/review") {
      const result = await getProjectEditSessionReview({
        projectId: String(payload.projectId || "").trim(),
        branchName: String(payload.branchName || "").trim(),
        baseBranch: String(payload.baseBranch || "").trim() || undefined,
      });
      sendJson(res, 200, { ok: true, ...result });
      return;
    }

    sendJson(res, 404, {
      ok: false,
      error: "Git worker route not found.",
    });
  } catch (error) {
    sendJson(res, 400, {
      ok: false,
      error: error instanceof Error ? error.message : "Git worker request failed.",
    });
  }
}).listen(port, host, () => {
  console.log(`UX Bridge git worker running at http://${host}:${port}`);
});
