import { handleProjectNavRequest, sendJson } from "../project-nav-store.js";

export default async function handler(req, res) {
  try {
    const result = await handleProjectNavRequest(req);
    sendJson(res, result.status, result.payload);
  } catch (error) {
    console.error("[project-nav] request failed", {
      message: error instanceof Error ? error.message : String(error),
    });

    sendJson(res, 500, {
      ok: false,
      error: "Something went wrong while saving page order.",
    });
  }
}
