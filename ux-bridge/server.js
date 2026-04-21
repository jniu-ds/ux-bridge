import { createReadStream, existsSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, normalize } from "node:path";
import { Readable } from "node:stream";
import { handleAssetContentRequest, handleAssetsRequest, sendJson as sendAssetsJson } from "./assets-store.js";
import { handleAdminUsersRequest, handleAuthRequest, sendJson as sendAuthJson } from "./auth-store.js";
import { handleCommentsRequest, sendJson as sendCommentsJson } from "./comments-store.js";
import { getStorageHealthSnapshot } from "./db/config.js";
import { captureOperationalEvent } from "./db/observability.js";
import { checkPostgresConnection } from "./db/postgres.js";
import { checkRedisConnection } from "./db/redis.js";
import { processPresenceActionAsync, readJsonBody, sendJson } from "./presence-store.js";
import { handleProfileRequest, sendJson as sendProfileJson } from "./profile-store.js";
import { handleProjectNavRequest, sendJson as sendProjectNavJson } from "./project-nav-store.js";
import { handleProjectsRequest, sendJson as sendProjectsJson } from "./projects-store.js";

const port = Number(process.env.PORT || 4173);
const root = join(process.cwd(), "dist");

const contentTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
};

function resolvePath(urlPath) {
  const trimmed = urlPath === "/" ? "/index.html" : urlPath;
  const safePath = normalize(trimmed).replace(/^(\.\.[/\\])+/, "");
  return join(root, safePath);
}

createServer(async (req, res) => {
  try {
    const requestUrl = new URL(req.url || "/", `http://${req.headers.host || "127.0.0.1"}`);
    const isThumbnailRequest =
      requestUrl.searchParams.get("table-thumb") === "1" && Boolean(requestUrl.searchParams.get("thumb-load"));

    if (requestUrl.pathname === "/api/presence") {
      if (req.method === "GET") {
        sendJson(
          res,
          200,
          await processPresenceActionAsync("status", {
            path: requestUrl.searchParams.get("path") || "",
            projectKey: requestUrl.searchParams.get("project") || "",
            pageKey: requestUrl.searchParams.get("page") || "",
          }),
        );
        return;
      }

      if (req.method !== "POST") {
        sendJson(res, 405, { ok: false, error: "Method not allowed" });
        return;
      }

      try {
        const payload = await readJsonBody(req);
        const result = await processPresenceActionAsync(payload.action, payload);
        sendJson(res, result.status || 200, result);
      } catch {
        sendJson(res, 400, { ok: false, error: "Invalid JSON payload" });
      }
      return;
    }

    if (requestUrl.pathname === "/api/auth" || requestUrl.pathname.startsWith("/api/auth/")) {
      const result = await handleAuthRequest(req);

      if (result.headers?.Location) {
        res.writeHead(result.status, result.headers);
        res.end();
        return;
      }

      sendAuthJson(res, result.status, result.payload, result.headers);
      return;
    }

    if (requestUrl.pathname === "/api/admin-users") {
      const result = await handleAdminUsersRequest(req);
      sendAuthJson(res, result.status, result.payload, result.headers);
      return;
    }

    if (requestUrl.pathname === "/api/profile") {
      const result = await handleProfileRequest(req);
      sendProfileJson(res, result.status, result.payload, result.headers);
      return;
    }

    if (requestUrl.pathname === "/api/project-nav") {
      const result = await handleProjectNavRequest(req);
      sendProjectNavJson(res, result.status, result.payload);
      return;
    }

    if (requestUrl.pathname === "/api/projects") {
      const result = await handleProjectsRequest(req);
      sendProjectsJson(res, result.status, result.payload);
      return;
    }

    if (requestUrl.pathname === "/api/comments") {
      const result = await handleCommentsRequest(req);
      sendCommentsJson(res, result.status, result.payload);
      return;
    }

    if (requestUrl.pathname === "/api/assets") {
      if (req.method === "GET" && requestUrl.searchParams.get("assetId")) {
        const result = await handleAssetContentRequest(req);

        if (result.assetStream) {
          res.writeHead(result.status || 200, result.assetHeaders || {});
          Readable.fromWeb(result.assetStream).pipe(res);
          return;
        }

        sendAssetsJson(res, result.status, result.payload);
        return;
      }

      const result = await handleAssetsRequest(req);
      sendAssetsJson(res, result.status, result.payload);
      return;
    }

    if (requestUrl.pathname === "/api/health/storage") {
      const snapshot = getStorageHealthSnapshot();
      const postgres = await checkPostgresConnection();
      const redis = await checkRedisConnection();

      sendJson(res, 200, {
        ok: true,
        ...snapshot,
        postgres: {
          ...snapshot.postgres,
          connected: postgres.connected,
          error: postgres.error,
        },
        redis: {
          ...snapshot.redis,
          connected: redis.connected,
          error: redis.error,
        },
      });
      return;
    }

    let filePath = resolvePath(requestUrl.pathname);

    if (!existsSync(filePath) || statSync(filePath).isDirectory()) {
      if (extname(requestUrl.pathname)) {
        res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
        res.end("Not found");
        return;
      }

      filePath = join(root, "index.html");
    }

    const ext = extname(filePath);
    res.writeHead(200, {
      "Content-Type": contentTypes[ext] || "application/octet-stream",
      "Cache-Control": isThumbnailRequest
        ? "public, max-age=31536000, immutable"
        : "no-store",
    });

    createReadStream(filePath).pipe(res);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected server error.";
    const status = message.includes("Postgres is required") ? 503 : 500;
    await captureOperationalEvent({
      name: "server.request_failed",
      level: status >= 500 ? "error" : "warn",
      context: {
        method: req.method || "GET",
        url: req.url || "/",
        status,
      },
      errorMessage: message,
    });

    if (!res.headersSent) {
      sendJson(res, status, {
        ok: false,
        error: message,
      });
      return;
    }

    res.destroy(error instanceof Error ? error : undefined);
  }
}).listen(port, "127.0.0.1", () => {
  console.log(`Brand Affiliate mobile app running at http://127.0.0.1:${port}`);
});
