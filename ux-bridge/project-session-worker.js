import {
  createProjectEditSessionWorkspace as createLocalProjectEditSessionWorkspace,
  ensureProjectWorkspaceRepository as ensureLocalProjectWorkspaceRepository,
  getProjectEditSessionReview as getLocalProjectEditSessionReview,
  mergeProjectEditSessionWorkspace as mergeLocalProjectEditSessionWorkspace,
} from "./project-session-git.js";

/** @import { EditSessionWorkspace, ReviewFileStat, ReviewTotals } from "./types/project-domain.d.ts" */

const EXECUTION_MODE_LOCAL = "local";
const EXECUTION_MODE_REMOTE = "remote";
const EXECUTION_MODE = String(process.env.UX_BRIDGE_GIT_EXECUTION_MODE || EXECUTION_MODE_LOCAL)
  .trim()
  .toLowerCase();
const REMOTE_WORKER_URL = String(process.env.UX_BRIDGE_GIT_WORKER_URL || "")
  .trim()
  .replace(/\/+$/g, "");
const REMOTE_WORKER_TOKEN = String(process.env.UX_BRIDGE_GIT_WORKER_TOKEN || "").trim();

function isRemoteExecutionMode() {
  return EXECUTION_MODE === EXECUTION_MODE_REMOTE;
}

function isRemoteWorkerConfigured() {
  return Boolean(REMOTE_WORKER_URL && REMOTE_WORKER_TOKEN);
}

function buildRemoteWorkerNotConfiguredError() {
  return new Error(
    "Git/worktree execution is configured for a remote worker, but UX_BRIDGE_GIT_WORKER_URL or UX_BRIDGE_GIT_WORKER_TOKEN is missing.",
  );
}

/**
 * @param {unknown} message
 * @param {string} fallbackMessage
 */
function buildRemoteWorkerError(message, fallbackMessage) {
  return new Error(String(message || "").trim() || fallbackMessage);
}

/**
 * @param {string} path
 * @param {Record<string, unknown>} [payload]
 * @param {string} [fallbackMessage]
 * @returns {Promise<Record<string, unknown> & { ok: boolean }>}
 */
async function callRemoteWorker(path, payload = {}, fallbackMessage = "Remote git worker request failed.") {
  if (!isRemoteWorkerConfigured()) {
    throw buildRemoteWorkerNotConfiguredError();
  }

  let response;

  try {
    response = await fetch(`${REMOTE_WORKER_URL}${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${REMOTE_WORKER_TOKEN}`,
      },
      body: JSON.stringify(payload),
    });
  } catch (error) {
    throw buildRemoteWorkerError(error instanceof Error ? error.message : "", fallbackMessage);
  }

  /** @type {(Record<string, unknown> & { ok?: boolean, error?: unknown }) | null} */
  const result = /** @type {(Record<string, unknown> & { ok?: boolean, error?: unknown }) | null} */ (
    await response.json().catch(() => null)
  );

  if (!response.ok || !result?.ok) {
    throw buildRemoteWorkerError(result?.error, fallbackMessage);
  }

  return /** @type {Record<string, unknown> & { ok: boolean }} */ (result);
}

export function getProjectSessionWorkerRuntime() {
  return {
    executionMode: isRemoteExecutionMode() ? EXECUTION_MODE_REMOTE : EXECUTION_MODE_LOCAL,
    connected: isRemoteExecutionMode() ? isRemoteWorkerConfigured() : true,
    remoteUrl: isRemoteExecutionMode() ? REMOTE_WORKER_URL : "",
  };
}

/**
 * @param {string} projectId
 * @returns {Promise<{ workspaceRoot: string, baseBranch: string }>}
 */
export async function ensureProjectWorkspaceRepository(projectId) {
  if (!isRemoteExecutionMode()) {
    return ensureLocalProjectWorkspaceRepository(projectId);
  }

  const result = await callRemoteWorker(
    "/workspace/ensure",
    { projectId },
    "Unable to initialize the project workspace through the remote git worker.",
  );

  return {
    workspaceRoot: String(result.workspaceRoot || ""),
    baseBranch: String(result.baseBranch || "main"),
  };
}

/**
 * @param {{ projectId: string, branchName: string, sessionId?: string }} options
 * @returns {Promise<EditSessionWorkspace>}
 */
export async function createProjectEditSessionWorkspace(options) {
  if (!isRemoteExecutionMode()) {
    return createLocalProjectEditSessionWorkspace(options);
  }

  const result = await callRemoteWorker(
    "/edit-session/create",
    options,
    "Unable to create an isolated edit-session worktree through the remote git worker.",
  );

  return {
    workspaceRoot: String(result.workspaceRoot || ""),
    baseBranch: String(result.baseBranch || "main"),
    worktreePath: String(result.worktreePath || ""),
    executionMode: String(result.executionMode || "git-worktree") === "git-worktree" ? "git-worktree" : "git-worktree",
  };
}

/**
 * @param {{ projectId: string, branchName: string, worktreePath: string, baseBranch?: string }} options
 */
export async function mergeProjectEditSessionWorkspace(options) {
  if (!isRemoteExecutionMode()) {
    return mergeLocalProjectEditSessionWorkspace(options);
  }

  const result = await callRemoteWorker(
    "/edit-session/merge",
    options,
    "Unable to merge this edit session through the remote git worker.",
  );

  return {
    workspaceRoot: String(result.workspaceRoot || ""),
    baseBranch: String(result.baseBranch || "main"),
    merged: Boolean(result.merged),
  };
}

/**
 * @param {{ projectId: string, branchName: string, baseBranch?: string }} options
 * @returns {Promise<{ baseBranch: string, branchName: string, files: ReviewFileStat[], totals: ReviewTotals, patch: string }>}
 */
export async function getProjectEditSessionReview(options) {
  if (!isRemoteExecutionMode()) {
    return getLocalProjectEditSessionReview(options);
  }

  const result = await callRemoteWorker(
    "/edit-session/review",
    options,
    "Unable to load the edit-session review through the remote git worker.",
  );

  return {
    baseBranch: String(result.baseBranch || "main"),
    branchName: String(result.branchName || options.branchName || ""),
    files: Array.isArray(result.files) ? /** @type {ReviewFileStat[]} */ (result.files) : [],
    totals:
      result.totals && typeof result.totals === "object"
        ? /** @type {ReviewTotals} */ (result.totals)
        : { files: 0, added: 0, removed: 0 },
    patch: String(result.patch || ""),
  };
}
