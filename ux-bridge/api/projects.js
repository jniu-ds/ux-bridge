import { handleProjectsRequest, sendJson } from "../projects-store.js";

export default async function handler(req, res) {
  try {
    const result = await handleProjectsRequest(req);
    sendJson(res, result.status, result.payload);
  } catch (error) {
    console.error("[projects] request failed", {
      message: error instanceof Error ? error.message : String(error),
    });

    sendJson(res, 500, {
      ok: false,
      error: "Something went wrong while loading projects.",
    });
  }
}
