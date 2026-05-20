export interface PageFileMetadata {
  fileSlug: string;
  rootPath: string;
  configPath: string;
  previewPath: string;
  componentPath: string;
  promptPath: string;
}

export interface PagePreview {
  providerId: string;
  providerLabel: string;
  summary: string;
  assistantMessage?: string;
  html: string;
  css: string;
  stageStyle?: string;
  breakpointOverrides?: Record<string, unknown>;
  generatedAt: number;
  appliedAt: number;
  updatedAt: number;
  source: string;
}

export interface PageRecord {
  id: string;
  name: string;
  fileSlug?: string;
  createdAt?: number;
  hasContent?: boolean;
  preview?: PagePreview | null;
  vibe?: {
    viewportPreset?: string | null;
    appliedDraft?: Partial<PagePreview> | null;
  } | null;
  files?: PageFileMetadata | null;
}

export interface PrototypeLinkRecord {
  id?: string;
  label?: string;
  url?: string;
  pageId?: string | null;
  sourcePageId?: string | null;
  sourceLayerPath?: string | null;
  sourceLayerLabel?: string | null;
  targetPageId?: string | null;
  targetPageName?: string | null;
  createdAt?: number;
  createdBy?: string | null;
}

export interface CodexThreadMessageRecord {
  id: string;
  role: string;
  kind?: string;
  userId?: string;
  pageId?: string | null;
  sessionId?: string;
  content: string;
  createdAt: number;
  metadata?: Record<string, unknown>;
}

export interface CodexThreadRecord {
  id: string;
  activePageId?: string | null;
  updatedAt: number;
  messages: CodexThreadMessageRecord[];
}

export interface ProjectRecord {
  id: string;
  name: string;
  codexContextId?: string;
  codexThread?: CodexThreadRecord;
  inspectorBreakpoints?: Array<{
    id: string;
    label: string;
    start: number;
    end: number | null;
  }>;
  viewerState?: {
    viewportPreset?: string | null;
  };
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
