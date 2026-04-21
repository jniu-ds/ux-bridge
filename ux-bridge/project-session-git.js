import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { getProjectWorkspaceRoot } from "./project-files.js";

/** @import { EditSessionWorkspace, ReviewFileStat, ReviewTotals } from "./types/project-domain.d.ts" */

const execFileAsync = promisify(execFile);
const SESSION_WORKTREE_ROOT =
  String(process.env.PROJECT_SESSION_WORKTREES_ROOT || "").trim() || join(process.cwd(), "project-session-worktrees");
const GIT_USER_NAME = "UX Bridge";
const GIT_USER_EMAIL = "noreply@uxbridge.local";
const DEFAULT_BASE_BRANCH = "main";

/**
 * @param {unknown} error
 * @param {string} fallbackMessage
 */
function buildGitError(error, fallbackMessage) {
  const candidate = /** @type {{ stdout?: unknown, stderr?: unknown, message?: unknown } | null | undefined} */ (error);
  const stdout = String(candidate?.stdout || "").trim();
  const stderr = String(candidate?.stderr || "").trim();
  const detail = stderr || stdout || (error instanceof Error ? error.message : "");
  return new Error(detail || fallbackMessage);
}

/**
 * @param {string} path
 */
async function ensureDirectory(path) {
  await mkdir(path, { recursive: true });
}

function sanitizeSegment(value = "", fallback = "session") {
  const normalized = String(value || "")
    .trim()
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 96);

  return normalized || fallback;
}

/**
 * @param {string} cwd
 * @param {string[]} args
 * @param {string} fallbackMessage
 */
async function runGit(cwd, args, fallbackMessage) {
  try {
    const result = await execFileAsync(
      "git",
      [
        "-c",
        `user.name=${GIT_USER_NAME}`,
        "-c",
        `user.email=${GIT_USER_EMAIL}`,
        ...args,
      ],
      {
        cwd,
        env: process.env,
      },
    );

    return {
      stdout: String(result.stdout || ""),
      stderr: String(result.stderr || ""),
    };
  } catch (error) {
    throw buildGitError(error, fallbackMessage);
  }
}

/**
 * @param {string} cwd
 * @param {string[]} args
 */
async function runGitAllowFailure(cwd, args) {
  try {
    const result = await runGit(cwd, args, "Git command failed.");
    return {
      ok: true,
      stdout: result.stdout,
      stderr: result.stderr,
    };
  } catch (error) {
    return {
      ok: false,
      stdout: "",
      stderr: error instanceof Error ? error.message : "Git command failed.",
    };
  }
}

/**
 * @param {string} workspaceRoot
 */
async function ensureWorkspaceGitignore(workspaceRoot) {
  const gitignorePath = join(workspaceRoot, ".gitignore");
  const contents = `node_modules/\n.DS_Store\n`;
  await writeFile(gitignorePath, contents, "utf8");
}

/**
 * @param {string} projectId
 */
export async function ensureProjectWorkspaceRepository(projectId) {
  const workspaceRoot = getProjectWorkspaceRoot(projectId);
  await ensureDirectory(workspaceRoot);

  const isRepo = await runGitAllowFailure(workspaceRoot, ["rev-parse", "--is-inside-work-tree"]);

  if (!isRepo.ok) {
    await runGit(workspaceRoot, ["init", "-b", DEFAULT_BASE_BRANCH], "Unable to initialize the project workspace repository.");
    await ensureWorkspaceGitignore(workspaceRoot);
  }

  await ensureDirectory(join(SESSION_WORKTREE_ROOT, sanitizeSegment(projectId, "project")));

  return {
    workspaceRoot,
    baseBranch: DEFAULT_BASE_BRANCH,
  };
}

/**
 * @param {string} projectId
 * @param {string} [reason]
 */
export async function syncProjectWorkspaceSnapshot(projectId, reason = "Sync workspace snapshot") {
  const { workspaceRoot, baseBranch } = await ensureProjectWorkspaceRepository(projectId);
  const status = await runGit(workspaceRoot, ["status", "--porcelain"], "Unable to inspect the project workspace status.");

  if (!String(status.stdout || "").trim()) {
    return {
      workspaceRoot,
      baseBranch,
      committed: false,
    };
  }

  await runGit(workspaceRoot, ["add", "--all"], "Unable to stage project workspace changes.");
  await runGit(workspaceRoot, ["commit", "-m", reason], "Unable to commit the latest project workspace snapshot.");

  return {
    workspaceRoot,
    baseBranch,
    committed: true,
  };
}

/**
 * @param {{ projectId: string, branchName: string, sessionId?: string }} options
 * @returns {Promise<EditSessionWorkspace>}
 */
export async function createProjectEditSessionWorkspace({ projectId, branchName, sessionId }) {
  const { workspaceRoot, baseBranch } = await syncProjectWorkspaceSnapshot(projectId, "Sync workspace before starting edit session");
  const branchCheck = await runGitAllowFailure(workspaceRoot, ["show-ref", "--verify", "--quiet", `refs/heads/${branchName}`]);

  if (branchCheck.ok) {
    throw new Error("That edit-session branch already exists. Start a new session instead.");
  }

  const worktreePath = join(
    SESSION_WORKTREE_ROOT,
    sanitizeSegment(projectId, "project"),
    sanitizeSegment(sessionId || branchName, "session"),
  );

  await ensureDirectory(join(SESSION_WORKTREE_ROOT, sanitizeSegment(projectId, "project")));
  await runGit(
    workspaceRoot,
    ["worktree", "add", "-b", branchName, worktreePath, baseBranch],
    "Unable to create an isolated edit-session worktree.",
  );

  return {
    workspaceRoot,
    baseBranch,
    worktreePath,
    executionMode: "git-worktree",
  };
}

/**
 * @param {{ projectId: string, branchName: string, worktreePath: string, baseBranch?: string }} options
 */
export async function mergeProjectEditSessionWorkspace({ projectId, branchName, worktreePath, baseBranch = DEFAULT_BASE_BRANCH }) {
  const snapshot = await syncProjectWorkspaceSnapshot(projectId, "Sync workspace before merging edit session");
  const workspaceRoot = snapshot.workspaceRoot;
  const nextBaseBranch = baseBranch || snapshot.baseBranch || DEFAULT_BASE_BRANCH;
  const resolvedWorktreePath = String(worktreePath || "").trim();

  if (!resolvedWorktreePath) {
    throw new Error("This edit session does not have a real worktree to merge.");
  }

  const worktreeStatus = await runGitAllowFailure(resolvedWorktreePath, ["status", "--porcelain"]);

  if (!worktreeStatus.ok) {
    throw new Error("The edit-session worktree could not be found. Start a new session if this one was removed.");
  }

  if (String(worktreeStatus.stdout || "").trim()) {
    throw new Error("The edit-session worktree has uncommitted changes. Commit them inside the worktree before merging.");
  }

  await runGit(workspaceRoot, ["switch", nextBaseBranch], `Unable to switch the workspace repository to ${nextBaseBranch}.`);

  try {
    await runGit(
      workspaceRoot,
      ["merge", "--no-ff", "--no-edit", branchName],
      "Unable to merge this edit-session branch into the project workspace.",
    );
  } catch (error) {
    await runGitAllowFailure(workspaceRoot, ["merge", "--abort"]);
    throw error;
  }

  await runGit(workspaceRoot, ["worktree", "remove", resolvedWorktreePath], "Unable to remove the merged edit-session worktree.");
  await runGit(workspaceRoot, ["branch", "-d", branchName], "Unable to delete the merged edit-session branch.");

  return {
    workspaceRoot,
    baseBranch: nextBaseBranch,
    merged: true,
  };
}

/**
 * @param {string} [stdout]
 * @returns {Array<Pick<ReviewFileStat, "path" | "added" | "removed">>}
 */
function parseNumstat(stdout = "") {
  return String(stdout || "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [added, removed, ...rest] = line.split("\t");
      return {
        path: rest.join("\t"),
        added: Number.parseInt(added, 10) || 0,
        removed: Number.parseInt(removed, 10) || 0,
      };
    })
    .filter((entry) => entry.path);
}

/**
 * @param {string} [stdout]
 * @returns {Array<Pick<ReviewFileStat, "path" | "status">>}
 */
function parseNameStatus(stdout = "") {
  return String(stdout || "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [status, ...rest] = line.split("\t");
      return {
        status: String(status || "").trim(),
        path: rest.join("\t"),
      };
    })
    .filter((entry) => entry.path);
}

/**
 * @param {{ projectId: string, branchName: string, baseBranch?: string }} options
 * @returns {Promise<{ baseBranch: string, branchName: string, files: ReviewFileStat[], totals: ReviewTotals, patch: string }>}
 */
export async function getProjectEditSessionReview({ projectId, branchName, baseBranch = DEFAULT_BASE_BRANCH }) {
  const { workspaceRoot } = await ensureProjectWorkspaceRepository(projectId);
  const nextBaseBranch = baseBranch || DEFAULT_BASE_BRANCH;
  const branchExists = await runGitAllowFailure(workspaceRoot, ["show-ref", "--verify", "--quiet", `refs/heads/${branchName}`]);

  if (!branchExists.ok) {
    throw new Error("This edit-session branch could not be found for review.");
  }

  const numstat = await runGit(
    workspaceRoot,
    ["diff", "--numstat", `${nextBaseBranch}...${branchName}`],
    "Unable to read the edit-session diff summary.",
  );
  const nameStatus = await runGit(
    workspaceRoot,
    ["diff", "--name-status", `${nextBaseBranch}...${branchName}`],
    "Unable to read the edit-session changed files.",
  );
  const patch = await runGit(
    workspaceRoot,
    ["diff", "--unified=3", `${nextBaseBranch}...${branchName}`],
    "Unable to load the edit-session patch preview.",
  );

  const fileStats = parseNumstat(numstat.stdout);
  const fileStatuses = parseNameStatus(nameStatus.stdout);
  const files = fileStatuses.map((entry) => {
    const stats = fileStats.find((candidate) => candidate.path === entry.path);
    return {
      path: entry.path,
      status: entry.status,
      added: stats?.added || 0,
      removed: stats?.removed || 0,
    };
  });

  const totals = files.reduce(
    (accumulator, file) => ({
      files: accumulator.files + 1,
      added: accumulator.added + file.added,
      removed: accumulator.removed + file.removed,
    }),
    { files: 0, added: 0, removed: 0 },
  );

  return {
    baseBranch: nextBaseBranch,
    branchName,
    files,
    totals,
    patch: String(patch.stdout || "").slice(0, 32000),
  };
}
