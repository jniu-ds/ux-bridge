import { processPresenceActionAsync, readJsonBody, sendJson } from "../presence-store.js";

export default async function handler(req, res) {
  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Cache-Control": "no-store",
    });
    res.end();
    return;
  }

  if (req.method === "GET") {
    const requestUrl = new URL(req.url || "/", `http://${req.headers.host || "127.0.0.1"}`);
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
}
