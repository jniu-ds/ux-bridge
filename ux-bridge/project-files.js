import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

/** @import { PageFileMetadata, PagePreview, PageRecord, ProjectRecord, ScaffoldPageOptions, PrototypeLinkRecord } from "./types/project-domain.d.ts" */

const PROJECT_WORKSPACES_ROOT = String(process.env.PROJECT_WORKSPACES_ROOT || "").trim() || join(process.cwd(), "project-workspaces");

function normalizeSlug(value = "", fallback = "page") {
  const slug = String(value || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);

  return slug || fallback;
}

/**
 * @param {string} projectId
 */
export function getProjectWorkspaceRoot(projectId) {
  return join(PROJECT_WORKSPACES_ROOT, String(projectId || "").trim());
}

/**
 * @param {string} projectId
 */
function getProjectSrcRoot(projectId) {
  return join(getProjectWorkspaceRoot(projectId), "src");
}

/**
 * @param {string} projectId
 */
function getProjectShellRoot(projectId) {
  return join(getProjectSrcRoot(projectId), "shell");
}

/**
 * @param {string} projectId
 */
function getProjectConfigRoot(projectId) {
  return join(getProjectSrcRoot(projectId), "project");
}

/**
 * @param {string} projectId
 */
function getProjectPagesRoot(projectId) {
  return join(getProjectSrcRoot(projectId), "pages");
}

/**
 * @param {string} projectId
 * @param {PageRecord} page
 * @returns {PageFileMetadata}
 */
export function buildPageFileMetadata(projectId, page) {
  const pageId = String(page?.id || "").trim();
  const fallbackSlug = pageId || "page";
  const fileSlug = normalizeSlug(page?.fileSlug || page?.name || pageId, fallbackSlug);
  const pageRoot = join(getProjectPagesRoot(projectId), fileSlug);

  return {
    fileSlug,
    rootPath: pageRoot,
    configPath: join(pageRoot, "page.config.json"),
    previewPath: join(pageRoot, "page.preview.json"),
    componentPath: join(pageRoot, "page.tsx"),
    promptPath: join(pageRoot, "page.prompt.md"),
  };
}

/**
 * @param {ProjectRecord} project
 */
function buildShellConfig(project) {
  return {
    shellType: "mobile-preview",
    viewport: {
      width: 375,
      height: 812,
    },
    projectId: project.id,
    generatedAt: Date.now(),
  };
}

/**
 * @param {ProjectRecord} project
 */
function buildProjectConfig(project) {
  return {
    id: project.id,
    name: project.name,
    codexContextId: project.codexContextId,
    visibility: project.visibility,
    codexAccessMode: project.codexAccessMode,
    createdAt: project.createdAt,
    updatedAt: project.updatedAt,
  };
}

/**
 * @param {ProjectRecord} project
 * @param {PageRecord & { files?: PageFileMetadata | null }} page
 */
function buildPageConfig(project, page) {
  const preview = buildPagePreview(page);

  return {
    id: page.id,
    name: page.name,
    projectId: project.id,
    fileSlug: page.fileSlug,
    createdAt: page.createdAt,
    previewTarget: "mobile-page-section",
    mobileOnly: true,
    hasAppliedContent: Boolean(preview?.html),
    previewSource: page.files?.previewPath || buildPageFileMetadata(project.id, page).previewPath,
    previewUpdatedAt: Number(preview?.appliedAt || preview?.generatedAt || 0),
  };
}

/**
 * @param {ProjectRecord} project
 * @param {PageRecord} page
 */
function buildPagePrompt(project, page) {
  return `# ${page.name}

Project: ${project.name}
Project ID: ${project.id}
Page ID: ${page.id}

This page is scoped to a single mobile screen inside UX Bridge.

Guidance:
- Generate front-end UI only
- Do not create routing, backend services, auth, or a nested application shell
- Keep output focused on the mobile preview viewport
`;
}

/**
 * @param {ProjectRecord} project
 * @param {PageRecord} page
 */
function buildPageComponent(project, page) {
  const preview = buildPagePreview(page);

  if (preview?.html) {
    return `const previewCss = \`${escapeTemplateLiteral(preview.css || "")}\`;
const previewHtml = \`${escapeTemplateLiteral(preview.html || "")}\`;

export function ${normalizeComponentName(page.name)}Page() {
  return (
    <section className="vibe-generated-page" data-page-id="${escapeTemplateLiteral(page.id)}">
      {previewCss ? <style>{previewCss}</style> : null}
      <div dangerouslySetInnerHTML={{ __html: previewHtml }} />
    </section>
  );
}
`;
  }

  return `export function ${normalizeComponentName(page.name)}Page() {
  return (
    <section className="vibe-generated-page">
      <div className="vibe-generated-page__hero">
        <p className="vibe-generated-page__eyebrow">UX BRIDGE</p>
        <h2>${escapeTemplateLiteral(page.name)}</h2>
        <p>Scaffolded page component for ${escapeTemplateLiteral(project.name)}. Replace this file with page-scoped mobile UI.</p>
      </div>
    </section>
  );
}
`;
}

function normalizeComponentName(value = "") {
  const base = String(value || "Page")
    .replace(/[^a-zA-Z0-9]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((segment) => `${segment.charAt(0).toUpperCase()}${segment.slice(1)}`)
    .join("");

  return base || "Page";
}

function escapeTemplateLiteral(value = "") {
  return String(value || "").replaceAll("`", "\\`").replaceAll("${", "\\${");
}

/**
 * @param {unknown} preview
 * @returns {PagePreview | null}
 */
export function normalizePreviewBreakpointOverrides(value) {
  const input = value && typeof value === "object" ? value : {};
  const normalized = {};

  Object.entries(input).forEach(([layerPath, breakpointMap]) => {
    const normalizedLayerPath = String(layerPath || "").trim();

    if (!normalizedLayerPath || !breakpointMap || typeof breakpointMap !== "object") {
      return;
    }

    const normalizedBreakpointMap = {};

    Object.entries(breakpointMap).forEach(([breakpointId, override]) => {
      const normalizedBreakpointId = String(breakpointId || "").trim();

      if (!normalizedBreakpointId || !override || typeof override !== "object") {
        return;
      }

      const overrideInput = /** @type {Record<string, unknown>} */ (override);
      const styles = {};
      const attrs = {};

      if (overrideInput.styles && typeof overrideInput.styles === "object") {
        Object.entries(overrideInput.styles).forEach(([key, rawValue]) => {
          const normalizedKey = String(key || "").trim();

          if (normalizedKey) {
            styles[normalizedKey] = rawValue == null ? null : String(rawValue);
          }
        });
      }

      if (overrideInput.attrs && typeof overrideInput.attrs === "object") {
        Object.entries(overrideInput.attrs).forEach(([key, rawValue]) => {
          const normalizedKey = String(key || "").trim();

          if (normalizedKey) {
            attrs[normalizedKey] = rawValue == null ? null : String(rawValue);
          }
        });
      }

      const normalizedOverride = { styles, attrs };

      if (Object.prototype.hasOwnProperty.call(overrideInput, "text")) {
        normalizedOverride.text = String(overrideInput.text || "");
      }

      if (
        Object.keys(styles).length ||
        Object.keys(attrs).length ||
        Object.prototype.hasOwnProperty.call(normalizedOverride, "text")
      ) {
        normalizedBreakpointMap[normalizedBreakpointId] = normalizedOverride;
      }
    });

    if (Object.keys(normalizedBreakpointMap).length) {
      normalized[normalizedLayerPath] = normalizedBreakpointMap;
    }
  });

  return normalized;
}

export function normalizePagePreview(preview) {
  if (!preview || typeof preview !== "object") {
    return null;
  }

  const candidate = /** @type {Record<string, unknown>} */ (preview);
  const html = String(candidate.html || "").trim();
  const css = String(candidate.css || "").trim();
  const summary = String(candidate.summary || "").trim();

  if (!html) {
    return null;
  }

  return {
    providerId: String(candidate.providerId || "").trim().toLowerCase(),
    providerLabel: String(candidate.providerLabel || "").trim(),
    summary,
    html,
    css,
    stageStyle: String(candidate.stageStyle || "").trim(),
    generatedAt: Number(candidate.generatedAt) || 0,
    appliedAt: Number(candidate.appliedAt) || 0,
    updatedAt: Number(candidate.updatedAt) || Number(candidate.appliedAt) || Number(candidate.generatedAt) || 0,
    source: String(candidate.source || "page-files").trim().toLowerCase() || "page-files",
    breakpointOverrides: normalizePreviewBreakpointOverrides(candidate.breakpointOverrides),
  };
}

/**
 * @param {PageRecord} page
 * @returns {PagePreview | null}
 */
export function buildPagePreview(page) {
  return normalizePagePreview(page?.preview || page?.vibe?.appliedDraft);
}

/**
 * @param {string} path
 */
async function ensureDirectory(path) {
  await mkdir(path, { recursive: true });
}

/**
 * @param {string} path
 * @param {string} value
 */
async function writeFileIfMissing(path, value) {
  try {
    await access(path);
  } catch {
    await writeFile(path, value, "utf8");
  }
}

/**
 * @param {string} path
 * @param {unknown} value
 */
async function writeJsonFile(path, value) {
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

/**
 * @template T
 * @param {string} path
 * @param {T} fallback
 * @returns {Promise<T>}
 */
async function readJsonFile(path, fallback) {
  try {
    const raw = await readFile(path, "utf8");
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

/**
 * @param {ProjectRecord} project
 */
async function writeProjectManifests(project) {
  const shellRoot = getProjectShellRoot(project.id);
  const projectRoot = getProjectConfigRoot(project.id);

  await ensureDirectory(shellRoot);
  await ensureDirectory(projectRoot);

  await writeJsonFile(join(shellRoot, "mobile-shell.json"), buildShellConfig(project));
  await writeJsonFile(join(projectRoot, "project.config.json"), buildProjectConfig(project));

  const prototypeLinksPath = join(projectRoot, "prototype-links.json");
  const designTokensPath = join(projectRoot, "design-tokens.json");
  const pagesManifestPath = join(projectRoot, "pages.manifest.json");

  const prototypeLinks = await readJsonFile(/** @type {string} */ (prototypeLinksPath), /** @type {PrototypeLinkRecord[]} */ ([]));
  const designTokens = await readJsonFile(designTokensPath, {
    color: {},
    spacing: {},
    typography: {},
  });

  await writeJsonFile(prototypeLinksPath, Array.isArray(project.prototypeLinks) ? project.prototypeLinks : prototypeLinks);
  await writeJsonFile(designTokensPath, project.designTokens && typeof project.designTokens === "object" ? project.designTokens : designTokens);
  await writeJsonFile(
    pagesManifestPath,
    project.pages.map((/** @type {PageRecord} */ page) => ({
      id: page.id,
      name: page.name,
      fileSlug: page.fileSlug,
      previewPath: page.files?.previewPath || "",
      componentPath: page.files?.componentPath || "",
      promptPath: page.files?.promptPath || "",
      configPath: page.files?.configPath || "",
    })),
  );
}

/**
 * @param {ProjectRecord} project
 * @param {PageRecord} page
 * @param {ScaffoldPageOptions} [options]
 * @returns {Promise<PageFileMetadata>}
 */
export async function scaffoldPageFiles(project, page, options = {}) {
  const files = buildPageFileMetadata(project.id, page);
  await ensureDirectory(files.rootPath);
  const pageWithFiles = {
    ...page,
    files,
  };
  await writeJsonFile(files.configPath, buildPageConfig(project, pageWithFiles));
  await writeJsonFile(files.previewPath, buildPagePreview(pageWithFiles) || null);
  const overwrite = options.overwrite === true;

  if (overwrite) {
    await writeFile(files.componentPath, buildPageComponent(project, pageWithFiles), "utf8");
    await writeFile(files.promptPath, buildPagePrompt(project, pageWithFiles), "utf8");
  } else {
    await writeFileIfMissing(files.componentPath, buildPageComponent(project, pageWithFiles));
    await writeFileIfMissing(files.promptPath, buildPagePrompt(project, pageWithFiles));
  }

  return files;
}

/**
 * @param {ProjectRecord} project
 * @returns {Promise<ProjectRecord>}
 */
export async function syncProjectWorkspaceMetadata(project) {
  await ensureDirectory(getProjectPagesRoot(project.id));
  const syncedPages = [];

  for (const page of Array.isArray(project.pages) ? project.pages : []) {
    const pageWithSlug = {
      ...page,
      fileSlug: page.fileSlug || normalizeSlug(page.name || page.id, page.id || "page"),
    };
    const files = await scaffoldPageFiles(project, pageWithSlug, { overwrite: false });
    syncedPages.push({
      ...pageWithSlug,
      files,
    });
  }

  await writeProjectManifests({
    ...project,
    pages: syncedPages,
  });
  return {
    ...project,
    pages: syncedPages,
  };
}

/**
 * @param {ProjectRecord} project
 * @param {ScaffoldPageOptions} [options]
 * @returns {Promise<ProjectRecord & { workspaceRoot: string }>}
 */
export async function scaffoldProjectWorkspace(project, options = {}) {
  const metadataProject = await syncProjectWorkspaceMetadata(project);

  const nextPages = [];

  for (const page of Array.isArray(metadataProject.pages) ? metadataProject.pages : []) {
    const pageWithSlug = {
      ...page,
      fileSlug: page.fileSlug || normalizeSlug(page.name || page.id, page.id || "page"),
    };
    const files = await scaffoldPageFiles(project, pageWithSlug, options);
    nextPages.push({
      ...pageWithSlug,
      files,
    });
  }

  await writeProjectManifests({
    ...metadataProject,
    pages: nextPages,
  });

  return {
    ...metadataProject,
    pages: nextPages,
    workspaceRoot: getProjectWorkspaceRoot(project.id),
  };
}

/**
 * @param {ProjectRecord | null | undefined} project
 * @returns {Promise<ProjectRecord | null | undefined>}
 */
export async function hydrateProjectPreviewFiles(project) {
  if (!project || typeof project !== "object") {
    return project;
  }

  const nextPages = [];

  for (const page of Array.isArray(project.pages) ? project.pages : []) {
    const files = page.files || buildPageFileMetadata(project.id, page);
    const preview = normalizePagePreview(await readJsonFile(files.previewPath, null));
    nextPages.push({
      ...page,
      files,
      preview,
      hasContent: Boolean(preview?.html || page.hasContent || page?.vibe?.appliedDraft?.html),
    });
  }

  return {
    ...project,
    pages: nextPages,
  };
}
