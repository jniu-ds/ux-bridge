import { handleProfileRequest, sendJson } from "../profile-store.js";

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
    const result = await handleProfileRequest(req);
    sendJson(res, result.status, result.payload, result.headers);
  } catch (error) {
    console.error("[profile] request failed", {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    sendJson(res, 500, {
      ok: false,
      error: "Something went wrong while loading the profile.",
    });
  }
}
