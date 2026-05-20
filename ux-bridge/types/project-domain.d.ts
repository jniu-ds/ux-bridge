export interface PageFileMetadata {
  fileSlug: string;
  rootPath: string;
  configPath: string;
  previewPath: string;
  htmlPath: string;
  cssPath: string;
  breakpointOverridesPath: string;
  scriptPath: string;
  componentPath: string;
  promptPath: string;
}

export interface PagePreview {
  providerId: string;
  providerLabel: string;
  summary: string;
  html: string;
  css: string;
  js?: string;
  stageStyle?: string;
  generatedAt: number;
  appliedAt: number;
  updatedAt: number;
  source: string;
  breakpointOverrides?: Record<string, Record<string, {
    styles?: Record<string, string | null>;
    attrs?: Record<string, string | null>;
    text?: string;
  }>>;
}

export interface PageRecord {
  id: string;
  name: string;
  fileSlug?: string;
  createdAt?: number;
  hasContent?: boolean;
  preview?: PagePreview | null;
  vibe?: {
    appliedDraft?: Partial<PagePreview> | null;
  } | null;
  files?: PageFileMetadata | null;
}

export interface PrototypeLinkRecord {
  id?: string;
  label?: string;
  url?: string;
  pageId?: string | null;
}

export interface ProjectRecord {
  id: string;
  name: string;
  codexContextId?: string;
  visibility?: string;
  codexAccessMode?: string;
  createdAt?: number;
  updatedAt?: number;
  designTokens?: Record<string, unknown>;
  prototypeLinks?: PrototypeLinkRecord[];
  pages: PageRecord[];
}

export interface ScaffoldPageOptions {
  overwrite?: boolean;
}

export interface EditSessionWorkspace {
  workspaceRoot: string;
  baseBranch: string;
  worktreePath: string;
  executionMode: "git-worktree";
}

export interface ReviewFileStat {
  path: string;
  status: string;
  added: number;
  removed: number;
}

export interface ReviewTotals {
  files: number;
  added: number;
  removed: number;
}
