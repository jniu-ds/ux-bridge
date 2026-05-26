import { handleFigmaRequest, sendJson } from "../figma-oauth-store.js";

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
    const result = await handleFigmaRequest(req);

    if (result.headers?.Location) {
      res.writeHead(result.status, result.headers);
      res.end();
      return;
    }

    sendJson(res, result.status, result.payload, result.headers);
  } catch (error) {
    console.error("[figma] request failed", {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    sendJson(res, 500, {
      ok: false,
      error: "Something went wrong while connecting Figma.",
    });
  }
}
