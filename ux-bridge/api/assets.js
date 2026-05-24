import { Readable } from "node:stream";
import { handleAssetContentRequest, handleAssetsRequest, sendJson } from "../assets-store.js";

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

  try {
    const requestUrl = new URL(req.url || "/", `http://${req.headers.host || "127.0.0.1"}`);

    if (req.method === "GET" && requestUrl.searchParams.get("assetId")) {
      const result = await handleAssetContentRequest(req);

      if (result.assetStream) {
        res.writeHead(result.status || 200, result.assetHeaders || {});
        Readable.fromWeb(result.assetStream).pipe(res);
        return;
      }

      sendJson(res, result.status, result.payload);
      return;
    }

    const result = await handleAssetsRequest(req);
    sendJson(res, result.status, result.payload);
  } catch (error) {
    console.error("[assets] request failed", {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });

    sendJson(res, 500, {
      ok: false,
      error: "Something went wrong while loading assets.",
    });
  }
}
