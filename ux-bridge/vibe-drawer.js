(function initVibeDrawer() {
  const drawerRoot = document.querySelector("[data-vibe-root]");

  if (!drawerRoot) {
    return;
  }

  const PROJECTS_API = "/api/projects";
  const assetFileInput = document.createElement("input");
  const mobileSheetBackdrop = (() => {
    const existing = document.querySelector("[data-mobile-sheet-backdrop]");

    if (existing) {
      return existing;
    }

    const node = document.createElement("button");
    node.type = "button";
    node.className = "bridge-mobile-sheet-backdrop";
    node.setAttribute("data-mobile-sheet-backdrop", "");
    node.setAttribute("aria-label", "Close drawer");
    node.hidden = true;
    document.body.append(node);
    return node;
  })();
  const CODEX_ACCESS_OPTIONS = [
    { value: "owner_admin_only", label: "Owner + Admin only" },
    { value: "contributors", label: "Contributors can edit" },
    { value: "all_members", label: "All project members" },
  ];
  const params = new URLSearchParams(window.location.search);
  const projectId = String(params.get("project") || "").trim().toLowerCase();
  const requestedPageId = String(params.get("page") || "").trim().toLowerCase();
  const state = {
    drawerOpen: false,
    loading: false,
    applying: false,
    restoring: false,
    sessionCreating: false,
    pageCreating: false,
    settingsOpen: false,
    reviewLoading: false,
    dropdownOpen: false,
    codexAccessSelectOpen: false,
    project: null,
    page: null,
    shouldStickToBottom: true,
    providers: [],
    currentUser: null,
    providerId: "codex",
    viewportPreset: "mobile",
    selectedLayerContext: null,
    prompt: "",
    submittingPrompt: "",
    includeProjectContext: true,
    includePageContext: true,
    error: "",
    pendingAssets: [],
    reviewSessionId: "",
    reviewData: null,
    lastProjectSyncSignature: "",
    openVerificationMessageKey: "",
  };

  const DEFAULT_PROVIDER_MODELS = {
    codex: "gpt-5.1-codex",
    claude: "claude-sonnet-4-20250514",
  };

  assetFileInput.type = "file";
  assetFileInput.multiple = true;
  assetFileInput.hidden = true;
  assetFileInput.className = "comments-panel__file-input";
  assetFileInput.setAttribute("data-vibe-file-input", "");
  document.body.append(assetFileInput);

  function buildDrawerProjectSyncSignature(project, pageId = requestedPageId || state.page?.id) {
    const normalizedPageId = String(pageId || "").trim().toLowerCase();
    const page = (Array.isArray(project?.pages) ? project.pages : []).find(
      (entry) => String(entry?.id || "").trim().toLowerCase() === normalizedPageId,
    ) || null;
    const pageSessions = (Array.isArray(project?.editSessions) ? project.editSessions : [])
      .filter((session) => String(session?.pageId || "").trim().toLowerCase() === normalizedPageId)
      .map((session) => ({
        id: String(session?.id || ""),
        status: String(session?.status || ""),
        updatedAt: Number(session?.updatedAt || session?.createdAt || 0),
        branchName: String(session?.branchName || ""),
      }));
    const threadMessages = Array.isArray(project?.codexThread?.messages)
      ? project.codexThread.messages.slice(-18).map((message) => ({
          id: String(message?.id || ""),
          pageId: String(message?.pageId || ""),
          role: String(message?.role || ""),
          content: String(message?.content || ""),
          createdAt: Number(message?.createdAt || 0),
          providerId: String(message?.metadata?.providerId || ""),
          providerLabel: String(message?.metadata?.providerLabel || ""),
          assets: Array.isArray(message?.metadata?.assets)
            ? message.metadata.assets.map((asset) => ({
                id: String(asset?.id || ""),
                fileName: String(asset?.fileName || ""),
              }))
            : [],
        }))
      : [];

    return JSON.stringify({
      projectId: String(project?.id || ""),
      pageId: normalizedPageId,
      pageName: String(page?.name || ""),
      previewUpdatedAt: Number(page?.previewUpdatedAt || page?.preview?.updatedAt || page?.preview?.appliedAt || 0),
      viewportPreset: String(project?.viewerState?.viewportPreset || ""),
      canCreateEditSession: Boolean(project?.canCreateEditSession),
      editSessions: pageSessions,
      reviewSessionId: String(state.reviewSessionId || ""),
      thread: {
        activePageId: String(project?.codexThread?.activePageId || ""),
        messages: threadMessages,
      },
    });
  }

  function buildDesignSystemSummary() {
    const designTokens = state.project?.designTokens && typeof state.project.designTokens === "object" ? state.project.designTokens : {};
    const tokenGroups = Object.entries(designTokens)
      .map(([group, value]) => ({
        group,
        count: value && typeof value === "object" ? Object.keys(value).length : 0,
      }))
      .filter((entry) => entry.count > 0);
    const referencePages = (Array.isArray(state.project?.pages) ? state.project.pages : [])
      .map((page) => {
        const summary = String(page?.preview?.summary || page?.vibe?.appliedDraft?.summary || page?.vibe?.lastDraft?.summary || "").trim();
        const hasVisuals = Boolean(page?.preview?.html || page?.vibe?.appliedDraft?.html || page?.vibe?.lastDraft?.html);

        if (!hasVisuals) {
          return null;
        }

        return {
          id: String(page?.id || "").trim(),
          name: String(page?.name || "").trim() || "Page",
          summary,
        };
      })
      .filter(Boolean);

    return {
      tokenGroups,
      referencePages,
      prototypeLinks: Array.isArray(state.project?.prototypeLinks) ? state.project.prototypeLinks.length : 0,
    };
  }

  function escapeHtml(value) {
    return String(value || "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }

  function formatVerificationNumber(value) {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric.toLocaleString() : "0";
  }

  function formatVerificationCost(value) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) {
      return "";
    }

    if (numeric < 0.01) {
      return `$${numeric.toFixed(4)}`;
    }

    return `$${numeric.toFixed(2)}`;
  }

  function getThreadMessageKey(message) {
    const explicitId = String(message?.id || "").trim();
    if (explicitId) {
      return explicitId;
    }

    const createdAt = Number(message?.createdAt || 0);
    const role = String(message?.role || "").trim().toLowerCase() || "system";
    const content = String(message?.content || "").trim();
    return `${role}:${createdAt}:${content.slice(0, 80)}`;
  }

  function renderThreadVerification(verification, messageKey = "") {
    if (!verification || typeof verification !== "object") {
      return "";
    }

    if (String(state.openVerificationMessageKey || "") !== String(messageKey || "")) {
      return "";
    }

    const mode = String(verification.mode || "").trim().toLowerCase() === "selected-layer" ? "Selected layer" : "Full page";
    const targetLabel = String(verification.targetLabel || "").trim();
    const targetPath = String(verification.targetPath || "").trim();
    const contextParts = [
      verification.includePageContext === false ? "No page context" : "Page context",
      verification.includeProjectContext === false ? "No project context" : "Project context",
    ];
    const estimatedCost = formatVerificationCost(verification.estimatedTotalCostUsd);

    return `
      <div class="vibe-panel__thread-verification" aria-label="Scope verification">
        <div class="vibe-panel__thread-verification-head">
          <strong>Scope verification</strong>
          <span>${escapeHtml(mode)}</span>
        </div>
        <div class="vibe-panel__thread-verification-grid">
          <span>Input HTML ${escapeHtml(formatVerificationNumber(verification.inputHtmlChars))}</span>
          <span>Returned HTML ${escapeHtml(formatVerificationNumber(verification.returnedHtmlChars))}</span>
          <span>Input CSS ${escapeHtml(formatVerificationNumber(verification.inputCssChars))}</span>
          <span>Returned CSS ${escapeHtml(formatVerificationNumber(verification.returnedCssChars))}</span>
          ${estimatedCost ? `<span>Est. cost ${escapeHtml(estimatedCost)}</span>` : ""}
        </div>
        <div class="vibe-panel__thread-verification-meta">
          ${targetLabel ? `<span>Target: ${escapeHtml(targetLabel)}</span>` : ""}
          ${targetPath ? `<span>Path: ${escapeHtml(targetPath)}</span>` : ""}
          <span>Roots: ${escapeHtml(formatVerificationNumber(verification.returnedRootElements))}</span>
          ${
            verification.estimatedInputTokens || verification.estimatedOutputTokens
              ? `<span>Tokens: ~${escapeHtml(formatVerificationNumber(verification.estimatedInputTokens || 0))} in / ~${escapeHtml(formatVerificationNumber(verification.estimatedOutputTokens || 0))} out</span>`
              : ""
          }
          <span>${escapeHtml(contextParts.join(" • "))}</span>
        </div>
      </div>
    `;
  }

  function readFileAsDataUrl(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ""));
      reader.onerror = () => reject(new Error(`Could not read ${file?.name || "file"}.`));
      reader.readAsDataURL(file);
    });
  }

  function createPendingAssetRecord(file, dataUrl) {
    return {
      id: `pending-${crypto.randomUUID()}`,
      fileName: String(file?.name || "Upload").trim() || "Upload",
      contentType: String(file?.type || "application/octet-stream").trim() || "application/octet-stream",
      sizeBytes: Number(file?.size) || 0,
      kind: String(file?.type || "").startsWith("image/")
        ? "image"
        : String(file?.type || "").startsWith("video/")
          ? "video"
          : String(file?.type || "").trim().toLowerCase() === "application/pdf"
            ? "pdf"
            : "file",
      previewUrl: String(dataUrl || "").trim(),
      dataBase64: String(dataUrl || "").includes(",") ? String(dataUrl).split(",")[1] : "",
      createdAt: Date.now(),
      pageId: state.page?.id || requestedPageId || "",
    };
  }

  async function createAssetUploadRecords(fileList) {
    const files = Array.from(fileList || []).filter(Boolean);

    if (!files.length) {
      return [];
    }

    return Promise.all(files.map(async (file) => createPendingAssetRecord(file, await readFileAsDataUrl(file))));
  }

  async function queueFiles(fileList) {
    try {
      const nextAssets = await createAssetUploadRecords(fileList);

      if (!nextAssets.length) {
        return;
      }

      state.pendingAssets = [...state.pendingAssets, ...nextAssets];
      state.error = "";
      renderDrawer();
    } catch (error) {
      state.error = error instanceof Error ? error.message : "Could not add file.";
      renderDrawer();
    } finally {
      assetFileInput.value = "";
    }
  }

  function removePendingAsset(assetId) {
    state.pendingAssets = state.pendingAssets.filter((asset) => asset.id !== assetId);
    renderDrawer();
  }

  function openAssetFilePicker() {
    assetFileInput.click();
  }

  function renderPendingAssets() {
    if (!state.pendingAssets.length) {
      return "";
    }

    return `
      <div class="comments-panel__pending-assets vibe-panel__pending-assets">
        ${state.pendingAssets
          .map(
            (asset) => `
              <article class="comments-panel__asset-card comments-panel__asset-card--compact comments-panel__asset-card--pending">
                <div class="comments-panel__asset-preview">
                  ${
                    asset.kind === "image"
                      ? `<img src="${escapeHtml(asset.previewUrl || "")}" alt="${escapeHtml(asset.fileName)}" />`
                      : `<span class="comments-panel__asset-extension">${escapeHtml(String(asset.kind || "file").toUpperCase().slice(0, 6))}</span>`
                  }
                </div>
                <div class="comments-panel__asset-copy">
                  <strong>${escapeHtml(asset.fileName)}</strong>
                  <span>${escapeHtml(asset.kind)}</span>
                </div>
                <button
                  type="button"
                  class="comments-panel__asset-remove"
                  data-vibe-asset-remove="${escapeHtml(asset.id)}"
                  aria-label="Remove attachment"
                >
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M6 6 18 18"></path>
                    <path d="M18 6 6 18"></path>
                  </svg>
                </button>
              </article>
            `,
          )
          .join("")}
      </div>
    `;
  }

  function getSelectedProvider() {
    return state.providers.find((provider) => provider.id === state.providerId) || state.providers[0] || null;
  }

  function normalizeSelectedLayerContext(input) {
    const pathKey = String(input?.pathKey || "").trim();

    if (!pathKey || pathKey === "__screen__") {
      return null;
    }

    return {
      pageId: String(input?.pageId || "").trim(),
      pathKey,
      label: String(input?.label || "").trim(),
      tagName: String(input?.tagName || "").trim().toLowerCase(),
      textSummary: String(input?.textSummary || "").trim(),
      html: String(input?.html || "").trim(),
    };
  }

  function getProviderModelLabel(provider) {
    const providerId = String(provider?.id || "").trim().toLowerCase();
    return String(provider?.model || DEFAULT_PROVIDER_MODELS[providerId] || provider?.label || "Codex").trim();
  }

  function getCurrentUser() {
    if (state.currentUser) {
      return state.currentUser;
    }

    if (window.uxBridgeUser) {
      state.currentUser = window.uxBridgeUser;
      return state.currentUser;
    }

    try {
      const cachedUser = sessionStorage.getItem("ux-bridge-user");
      state.currentUser = cachedUser ? JSON.parse(cachedUser) : null;
    } catch {
      state.currentUser = null;
    }

    return state.currentUser;
  }

  function isProviderConnected() {
    return Boolean(getSelectedProvider()?.isConfigured);
  }

  function getCurrentPagePreviewSummary() {
    return String(
      state.page?.preview?.summary || state.page?.vibe?.appliedDraft?.summary || state.page?.vibe?.lastDraft?.summary || "",
    ).trim();
  }

  function getProviderStatusMessage() {
    const provider = getSelectedProvider();

    if (!provider) {
      return {
        tone: "neutral",
        text: "Choose a hosted vibe-coding provider.",
      };
    }

    if (provider.isConfigured) {
      return {
        tone: "connected",
        text: `${provider.label} is ready for hosted vibe coding${provider.model ? ` • ${provider.model}` : ""}.`,
      };
    }

    return {
      tone: "neutral",
      text: `${provider.label} is not configured for hosted vibe coding yet.`,
    };
  }

  function syncDrawerState() {
    document.body.classList.toggle("bridge-body--has-vibe", true);
    document.body.classList.toggle("vibe-open", state.drawerOpen);
    drawerRoot.inert = !state.drawerOpen;
    const toggle = document.querySelector("[data-vibe-drawer-toggle]");

    if (toggle) {
      toggle.setAttribute("aria-expanded", state.drawerOpen ? "true" : "false");
      toggle.classList.toggle("is-active", state.drawerOpen);
    }

    syncMobileSheetBackdrop();
  }

  function beginVibeCompose(providerId = "") {
    const normalizedProviderId = String(providerId || "").trim().toLowerCase();

    if (normalizedProviderId) {
      state.providerId = normalizedProviderId;
    }

    setDrawerOpen(true);
    window.dispatchEvent(
      new CustomEvent("uxbridge:vibe-compose-start", {
        detail: {
          projectId,
          pageId: state.page?.id || requestedPageId || "",
          providerId: state.providerId,
        },
      }),
    );
  }

  function syncMobileSheetBackdrop() {
    if (!mobileSheetBackdrop) {
      return;
    }

    mobileSheetBackdrop.hidden = true;
    mobileSheetBackdrop.classList.remove("is-visible");
  }

  function isThreadNearBottom(thread) {
    if (!thread) {
      return true;
    }

    const distanceFromBottom = thread.scrollHeight - thread.scrollTop - thread.clientHeight;
    return distanceFromBottom <= 32;
  }

  function scrollThreadToLatest() {
    const threadList = drawerRoot.querySelector("[data-vibe-thread]");

    if (!(threadList instanceof HTMLElement)) {
      return;
    }

    const scrollToLatest = () => {
      threadList.scrollTop = threadList.scrollHeight;
    };

    scrollToLatest();
    window.requestAnimationFrame(() => {
      scrollToLatest();
      window.setTimeout(scrollToLatest, 0);
      window.setTimeout(scrollToLatest, 120);
      window.setTimeout(scrollToLatest, 240);
    });
  }

  function autoResizeComposerTextarea(textarea) {
    if (!(textarea instanceof HTMLTextAreaElement)) {
      return;
    }

    textarea.style.height = "auto";
    textarea.style.height = `${Math.max(textarea.scrollHeight, 108)}px`;
  }

  function resetTransientThreadUi() {
    state.openVerificationMessageKey = "";
  }

  function setDrawerOpen(nextOpen, source = "vibe") {
    if (state.drawerOpen === nextOpen) {
      return;
    }

    state.drawerOpen = nextOpen;
    if (nextOpen) {
      state.shouldStickToBottom = true;
    }
    syncDrawerState();

    if (nextOpen) {
      scrollThreadToLatest();
      window.dispatchEvent(
        new CustomEvent("uxbridge:drawer-open", {
          detail: { drawer: source },
        }),
      );
    } else {
      resetTransientThreadUi();
      state.dropdownOpen = false;
      state.codexAccessSelectOpen = false;
      state.settingsOpen = false;
      renderDrawer();
    }
  }

  function setupDrawerLauncher() {
    const actionRail = window.UXBridgeActionRail;
    const renderToggleContent =
      actionRail?.renderButtonContent ||
      (({ label, tooltipClass = "" } = {}) => `
        <span class="bridge-action-rail-button__tooltip${tooltipClass ? ` ${tooltipClass}` : ""}" aria-hidden="true">${label || ""}</span>
        <svg viewBox="0 0 24 24" aria-hidden="true" class="bridge-action-rail-icon--vibe">
          <g transform="translate(-1.5 0)">
            <path d="M12 4.5 13.95 8.55 18 10.5l-4.05 1.95L12 16.5l-1.95-4.05L6 10.5l4.05-1.95Z"></path>
            <path d="M18.5 3.5l.6 1.4 1.4.6-1.4.6-.6 1.4-.6-1.4-1.4-.6 1.4-.6Z"></path>
            <path d="M17.5 15.5l.8 1.9 1.9.8-1.9.8-.8 1.9-.8-1.9-1.9-.8 1.9-.8Z"></path>
          </g>
        </svg>
      `);
    const sideActions = document.querySelector("[data-side-actions]");
    const toggle = document.createElement("button");
    toggle.type = "button";
    toggle.className = "bridge-action-rail-button vibe-drawer-toggle";
    toggle.setAttribute("data-vibe-drawer-toggle", "");
    toggle.setAttribute("aria-expanded", "false");
    toggle.setAttribute("aria-label", "Vibe");
    toggle.innerHTML = renderToggleContent({
      icon: "vibe",
      label: "Vibe",
      tooltipClass: "vibe-drawer-toggle__tooltip",
    });

    toggle.addEventListener("click", () => {
      setDrawerOpen(!state.drawerOpen);
    });

    window.addEventListener("uxbridge:drawer-open", (event) => {
      if (event.detail?.drawer !== "vibe") {
        setDrawerOpen(false, "vibe");
      }
    });

    if (sideActions) {
      sideActions.prepend(toggle);
    }
    syncDrawerState();
  }

  assetFileInput.addEventListener("change", () => {
    void queueFiles(assetFileInput.files);
  });

  function syncFromProject(project, pageId = requestedPageId || state.page?.id) {
    if (!project) {
      return;
    }

    const nextSyncSignature = buildDrawerProjectSyncSignature(project, pageId);
    const previousProjectId = String(state.project?.id || "").trim().toLowerCase();
    const previousPageId = String(state.page?.id || "").trim().toLowerCase();
    state.project = project;
    state.page = project.pages.find((page) => page.id === pageId) || project.pages[0] || null;

    if (!state.page) {
      return;
    }

    const vibe = state.page.vibe || {};
    const nextProjectId = String(project.id || "").trim().toLowerCase();
    const nextPageId = String(state.page?.id || "").trim().toLowerCase();
    const availableProviderIds = new Set((Array.isArray(state.providers) ? state.providers : []).map((provider) => String(provider.id || "").trim().toLowerCase()));
    const nextProviderId = String(vibe.providerId || state.providerId || "codex").trim().toLowerCase();
    state.providerId = availableProviderIds.has(nextProviderId) ? nextProviderId : (state.providers[0]?.id || "codex");
    state.viewportPreset = String(project.viewerState?.viewportPreset || vibe.viewportPreset || state.viewportPreset || "mobile").trim().toLowerCase() || "mobile";
    if (previousProjectId !== nextProjectId || previousPageId !== nextPageId) {
      state.prompt = "";
      state.submittingPrompt = "";
      if (state.selectedLayerContext && String(state.selectedLayerContext.pageId || "").trim().toLowerCase() !== nextPageId) {
        state.selectedLayerContext = null;
      }
    }
    state.includeProjectContext = vibe.includeProjectContext !== false;
    state.includePageContext = vibe.includePageContext !== false;

    if (
      state.reviewSessionId &&
      !(Array.isArray(project.editSessions) ? project.editSessions : []).some((session) => session.id === state.reviewSessionId)
    ) {
      state.reviewSessionId = "";
      state.reviewData = null;
    }

    if (state.lastProjectSyncSignature !== nextSyncSignature) {
      state.lastProjectSyncSignature = nextSyncSignature;
      renderDrawer();
    }

    const activeThreadPageId = String(project.codexThread?.activePageId || "").trim().toLowerCase();

    if (nextProjectId && nextPageId && (previousProjectId !== nextProjectId || previousPageId !== nextPageId) && activeThreadPageId !== nextPageId) {
      void persistActivePageContext(nextPageId);
    }
  }

  function getCurrentUserEmail() {
    return String(getCurrentUser()?.email || "").trim().toLowerCase();
  }

  function getActiveSession() {
    const currentUserEmail = getCurrentUserEmail();

    if (!currentUserEmail || !state.project) {
      return null;
    }

    return (
      (Array.isArray(state.project.editSessions) ? state.project.editSessions : []).find((session) => {
        const status = String(session.status || "").trim().toLowerCase();
        return (
          (status === "active" || status === "ready_for_review") &&
          String(session.userId || "").trim().toLowerCase() === currentUserEmail &&
          String(session.pageId || "").trim().toLowerCase() === String(state.page?.id || "").trim().toLowerCase()
        );
      }) || null
    );
  }

  function getPageSessions() {
    if (!state.project || !state.page) {
      return [];
    }

    return (Array.isArray(state.project.editSessions) ? state.project.editSessions : [])
      .filter((session) => String(session.pageId || "").trim().toLowerCase() === String(state.page.id || "").trim().toLowerCase())
      .sort((left, right) => {
        const leftUpdated = Number(left.updatedAt || left.createdAt || 0);
        const rightUpdated = Number(right.updatedAt || right.createdAt || 0);
        return rightUpdated - leftUpdated;
      });
  }

  function getCodexThread() {
    return state.project?.codexThread || null;
  }

  function getThreadMessageUserLabel(message) {
    const role = String(message?.role || "").trim().toLowerCase();
    const userId = String(message?.userId || "").trim().toLowerCase();
    const currentUserEmail = getCurrentUserEmail();

    if (role === "assistant") {
      return String(message?.metadata?.providerLabel || message?.metadata?.providerId || "Assistant").trim() || "Assistant";
    }

    if (userId && currentUserEmail && userId === currentUserEmail) {
      return "You";
    }

    const projectUser =
      (Array.isArray(state.project?.projectMembers) ? state.project.projectMembers : []).find(
        (entry) => String(entry?.email || "").trim().toLowerCase() === userId,
      ) ||
      (Array.isArray(state.project?.availableUsers) ? state.project.availableUsers : []).find(
        (entry) => String(entry?.email || "").trim().toLowerCase() === userId,
      ) ||
      null;

    if (projectUser?.fullName) {
      return projectUser.fullName;
    }

    return role === "system" ? "Project context" : "Project collaborator";
  }

  function getThreadMessagePageLabel(message) {
    const pageId = String(message?.pageId || "").trim().toLowerCase();

    if (!pageId) {
      return "Project";
    }

    const page = (Array.isArray(state.project?.pages) ? state.project.pages : []).find(
      (entry) => String(entry?.id || "").trim().toLowerCase() === pageId,
    );

    if (!page) {
      return "Project";
    }

    return String(state.page?.id || "").trim().toLowerCase() === pageId ? `${page.name} • Current page` : page.name;
  }

  function renderThreadSurface() {
    const thread = getCodexThread();
    const messages = Array.isArray(thread?.messages) ? thread.messages.slice(-18) : [];
    const activePageLabel = getThreadMessagePageLabel({ pageId: thread?.activePageId });
    const pendingPrompt = String(state.submittingPrompt || "").trim();
    const pendingMessages = [];

    if (state.loading && pendingPrompt) {
      pendingMessages.push({
        id: "__pending_user__",
        role: "user",
        kind: "prompt",
        content: pendingPrompt,
        pageId: state.page?.id,
        isPending: true,
      });
      pendingMessages.push({
        id: "__pending_assistant__",
        role: "assistant",
        kind: "response",
        content: `${getSelectedProvider()?.label || "The selected provider"} is refining the current mobile preview…`,
        pageId: state.page?.id,
        metadata: {
          providerLabel: getSelectedProvider()?.label || "Assistant",
          providerId: getSelectedProvider()?.id || "",
        },
        isPending: true,
      });
    }

    const timeline = [...messages, ...pendingMessages];

    return `
      <div class="vibe-panel__chat-surface">
        <div class="vibe-panel__history-head vibe-panel__chat-head">
          <div>
            <p class="vibe-panel__result-eyebrow">Codex thread</p>
            <span>Editing ${escapeHtml(activePageLabel)}</span>
          </div>
          <span>${messages.length} saved message${messages.length === 1 ? "" : "s"}</span>
        </div>
        ${
          timeline.length
            ? `
              <div class="vibe-panel__chat-list">
                ${timeline
                  .map((message) => {
                    const role = String(message.role || "system").trim().toLowerCase() || "system";
                    const isAssistant = role === "assistant";
                    const messageKey = getThreadMessageKey(message);
                    const userLabel = getThreadMessageUserLabel(message);
                    const timestamp = Number(message.createdAt || 0)
                      ? new Date(Number(message.createdAt || 0)).toLocaleString([], {
                          month: "short",
                          day: "numeric",
                          hour: "numeric",
                          minute: "2-digit",
                        })
                      : "";

                    return `
                      <article class="vibe-panel__thread-item vibe-panel__thread-item--${escapeHtml(role)}${message.isPending ? " is-pending" : ""}">
                        <div class="vibe-panel__thread-copy">
                          <small>${escapeHtml(message.content || "")}</small>
                        </div>
                        <div class="vibe-panel__thread-meta${isAssistant ? " is-assistant" : ""}">
                          ${
                            !isAssistant && userLabel !== "You"
                              ? `<strong class="vibe-panel__thread-author">${escapeHtml(userLabel)}</strong>`
                              : ""
                          }
                          <div class="vibe-panel__thread-meta-row">
                            <span class="vibe-panel__thread-meta-detail">${escapeHtml(getThreadMessagePageLabel(message))}${timestamp ? ` • ${escapeHtml(timestamp)}` : ""}</span>
                            ${
                              isAssistant && message?.metadata?.verification
                                ? `
                                  <button
                                    type="button"
                                    class="vibe-panel__thread-info"
                                    data-vibe-verification-toggle="${escapeHtml(messageKey)}"
                                    aria-label="${state.openVerificationMessageKey === messageKey ? "Hide scope verification" : "Show scope verification"}"
                                    aria-expanded="${state.openVerificationMessageKey === messageKey ? "true" : "false"}"
                                  >
                                    <svg viewBox="0 0 24 24" aria-hidden="true">
                                      <circle cx="12" cy="12" r="8.5"></circle>
                                      <path d="M12 10.2v5.1"></path>
                                      <circle cx="12" cy="7.1" r="0.9" fill="currentColor" stroke="none"></circle>
                                    </svg>
                                  </button>
                                `
                                : ""
                            }
                          </div>
                        </div>
                        ${
                          Array.isArray(message?.metadata?.assets) && message.metadata.assets.length
                            ? `
                              <div class="vibe-panel__thread-assets">
                                ${message.metadata.assets
                                  .map(
                                    (asset) => `
                                      <span class="vibe-panel__thread-asset">
                                        ${escapeHtml(String(asset?.fileName || asset?.name || "Attachment").trim() || "Attachment")}
                                      </span>
                                    `,
                                  )
                                  .join("")}
                              </div>
                            `
                            : ""
                        }
                        ${isAssistant ? renderThreadVerification(message?.metadata?.verification, messageKey) : ""}
                      </article>
                    `;
                  })
                  .join("")}
              </div>
            `
          : `<p class="vibe-panel__empty vibe-panel__empty--thread">Start a Vibe session, choose Codex or Claude, and describe the UI change you want in the mobile preview. This thread will keep the conversation going as you refine the page.</p>`
        }
      </div>
    `;
  }

  function userCanReviewSessions() {
    return Boolean(state.project?.canManageSharing || state.project?.isOwner || state.project?.projectRole === "admin");
  }

  function getSessionUser(session) {
    if (!state.project || !session) {
      return null;
    }

    const sessionUserId = String(session.userId || "").trim().toLowerCase();
    const sources = [
      ...(Array.isArray(state.project.projectMembers) ? state.project.projectMembers : []),
      ...(Array.isArray(state.project.availableUsers) ? state.project.availableUsers : []),
    ];

    return (
      sources.find((entry) => String(entry?.email || "").trim().toLowerCase() === sessionUserId) || null
    );
  }

  function getSessionUserLabel(session) {
    const currentUserEmail = getCurrentUserEmail();
    const sessionUserId = String(session?.userId || "").trim().toLowerCase();
    const sessionUser = getSessionUser(session);

    if (currentUserEmail && sessionUserId === currentUserEmail) {
      return "You";
    }

    return sessionUser?.fullName || session?.userId || "Project member";
  }

  function inferPageNameFromPrompt(prompt) {
    const firstLine = String(prompt || "")
      .split("\n")
      .map((line) => line.trim())
      .find(Boolean);

    if (!firstLine) {
      return "";
    }

    const normalized = firstLine
      .replace(/^create\s+/i, "")
      .replace(/^build\s+/i, "")
      .replace(/^design\s+/i, "")
      .replace(/^a\s+/i, "")
      .replace(/^an\s+/i, "")
      .slice(0, 48)
      .trim();

    return normalized || "New Page";
  }

  function getCodexAccessLabel(value) {
    return CODEX_ACCESS_OPTIONS.find((option) => option.value === value)?.label || CODEX_ACCESS_OPTIONS[1].label;
  }

  function renderGeneratedState() {
    const vibe = state.page?.vibe;
    const lastDraft = vibe?.lastDraft;
    const appliedDraft = vibe?.appliedDraft;
    const history = Array.isArray(vibe?.draftHistory) ? vibe.draftHistory : [];

    if (!lastDraft) {
      return `
        <section class="vibe-panel__result vibe-panel__result--empty">
          <p>No generated draft yet. Add a prompt and generate page content for this mobile section.</p>
        </section>
      `;
    }

    return `
      <section class="vibe-panel__result">
        <p class="vibe-panel__result-eyebrow">Latest preview draft</p>
        <h3>${escapeHtml(lastDraft.providerLabel || getSelectedProvider()?.label || "Provider")} draft</h3>
        <p>${escapeHtml(vibe.summary || lastDraft.summary || "A new mobile UI concept is ready.")}</p>
        <dl class="vibe-panel__result-meta">
          <div>
            <dt>Provider</dt>
            <dd>${escapeHtml(lastDraft.providerLabel || getSelectedProvider()?.label || "Unknown")}</dd>
          </div>
          <div>
            <dt>Scope</dt>
            <dd>${state.includeProjectContext ? "Project" : "Page"} + ${state.includePageContext ? "Page" : "Prompt"}</dd>
          </div>
        </dl>
        <div class="vibe-panel__result-actions">
          <button type="button" class="vibe-panel__button" data-vibe-generate ${state.loading ? "disabled" : ""}>
            ${state.loading ? "Generating..." : "Regenerate draft"}
          </button>
          <button
            type="button"
            class="vibe-panel__button vibe-panel__button--secondary"
            data-vibe-apply
            ${state.applying ? "disabled" : ""}
          >
            ${state.applying ? "Applying..." : appliedDraft ? "Replace applied content" : "Apply to page"}
          </button>
        </div>
      </section>
      ${
        history.length
          ? `
            <section class="vibe-panel__history">
              <div class="vibe-panel__history-head">
                <p class="vibe-panel__result-eyebrow">Version history</p>
                <span>${history.length} saved version${history.length === 1 ? "" : "s"}</span>
              </div>
              <div class="vibe-panel__history-list">
                ${history
                  .map((entry) => {
                    const generatedAt = Number(entry.generatedAt) || 0;
                    const isLatest = Number(lastDraft.generatedAt || 0) === generatedAt;
                    const isApplied = Number(appliedDraft?.generatedAt || 0) === generatedAt;
                    const timestamp = generatedAt
                      ? new Date(generatedAt).toLocaleString([], {
                          month: "short",
                          day: "numeric",
                          hour: "numeric",
                          minute: "2-digit",
                        })
                      : "Recent";

                    return `
                      <article class="vibe-panel__history-item${isLatest ? " is-active" : ""}">
                        <div class="vibe-panel__history-copy">
                          <div class="vibe-panel__history-meta">
                            <strong>${escapeHtml(entry.providerLabel || "Version")}</strong>
                            <span>${escapeHtml(timestamp)}</span>
                          </div>
                          <p>${escapeHtml(entry.summary || "Saved page draft")}</p>
                          <div class="vibe-panel__history-badges">
                            ${isLatest ? '<span class="vibe-panel__history-badge">Latest</span>' : ""}
                            ${isApplied ? '<span class="vibe-panel__history-badge is-applied">Applied</span>' : ""}
                          </div>
                        </div>
                        <div class="vibe-panel__history-actions">
                          ${
                            !isLatest
                              ? `<button type="button" class="vibe-panel__button vibe-panel__button--ghost" data-vibe-restore="${generatedAt}" ${state.restoring ? "disabled" : ""}>${state.restoring ? "Restoring..." : "Make latest"}</button>`
                              : ""
                          }
                          ${
                            !isApplied
                              ? `<button type="button" class="vibe-panel__button vibe-panel__button--secondary" data-vibe-apply-version="${generatedAt}" ${state.applying ? "disabled" : ""}>${state.applying ? "Applying..." : "Apply version"}</button>`
                              : ""
                          }
                        </div>
                      </article>
                    `;
                  })
                  .join("")}
              </div>
            </section>
          `
          : ""
      }
    `;
  }

  function getSelectedReviewSession() {
    if (!state.reviewSessionId || !state.project) {
      return null;
    }

    return (Array.isArray(state.project.editSessions) ? state.project.editSessions : []).find(
      (session) => session.id === state.reviewSessionId,
    ) || null;
  }

  function renderReviewSurface() {
    const session = getSelectedReviewSession();

    if (!session) {
      return "";
    }

    const review = state.reviewData;
    const page = state.project?.pages?.find((entry) => entry.id === session.pageId);

    return `
      <section class="vibe-panel__review-card vibe-panel__review-card--detail">
        <div class="vibe-panel__history-head">
          <div>
            <p class="vibe-panel__result-eyebrow">Review session</p>
            <h3>${escapeHtml(getSessionUserLabel(session))}</h3>
          </div>
          <button type="button" class="vibe-panel__button vibe-panel__button--ghost" data-vibe-close-review>Done</button>
        </div>
        <div class="vibe-panel__review-copy">
          <strong>${escapeHtml(page?.name || "Project-wide session")}</strong>
          <span>${escapeHtml(session.branchName || "Session branch")}</span>
        </div>
        ${
          state.reviewLoading
            ? `<p class="vibe-panel__empty">Loading the real git diff for this session…</p>`
            : review
              ? `
                <div class="vibe-panel__review-summary">
                  <span>${review.totals?.files || 0} file${review.totals?.files === 1 ? "" : "s"}</span>
                  <span>+${review.totals?.added || 0}</span>
                  <span>-${review.totals?.removed || 0}</span>
                  <span>${escapeHtml(review.baseBranch || "main")} → ${escapeHtml(review.branchName || session.branchName || "branch")}</span>
                </div>
                ${
                  Array.isArray(review.files) && review.files.length
                    ? `
                      <div class="vibe-panel__review-files">
                        ${review.files
                          .map(
                            (file) => `
                              <article class="vibe-panel__review-file">
                                <div class="vibe-panel__review-copy">
                                  <strong>${escapeHtml(file.path || "Changed file")}</strong>
                                  <span>${escapeHtml(file.status || "M")} • +${Number(file.added || 0)} / -${Number(file.removed || 0)}</span>
                                </div>
                              </article>
                            `,
                          )
                          .join("")}
                      </div>
                    `
                    : `<p class="vibe-panel__empty">No changed files were detected for this session yet.</p>`
                }
                <div class="vibe-panel__diff">
                  <p class="vibe-panel__review-label">Patch preview</p>
                  <pre class="vibe-panel__diff-pre">${escapeHtml(review.patch || "No patch output available.")}</pre>
                </div>
              `
              : `<p class="vibe-panel__empty">Open a session review to inspect changed files and patch details before merging.</p>`
        }
        ${
          userCanReviewSessions()
            ? `<div class="vibe-panel__result-actions"><button type="button" class="vibe-panel__button vibe-panel__button--secondary" data-vibe-merge-session="${escapeHtml(session.id)}" ${state.applying ? "disabled" : ""}>${state.applying ? "Merging..." : "Merge session"}</button></div>`
            : ""
        }
      </section>
    `;
  }

  function renderPrimarySessionCard({ activeSession, currentSessionStatus }) {
    if (activeSession) {
      return `
        <div class="vibe-panel__chat-status is-active">
          <div class="vibe-panel__chat-status-copy">
            <strong>${currentSessionStatus === "ready_for_review" ? "Review mode" : "Live editing"}</strong>
            <small>${
              currentSessionStatus === "ready_for_review"
                ? "This page is paused for review. Open settings if you want to resume editing or merge the session."
                : `${getSelectedProvider()?.label || "The selected provider"} is scoped to the current mobile preview container.`
            }</small>
          </div>
        </div>
      `;
    }

    if (state.project?.canCreateEditSession) {
      return `
        <div class="vibe-panel__chat-status">
          <div class="vibe-panel__chat-status-copy">
            <strong>No live session yet</strong>
            <small>Your first message will start a session for this page automatically.</small>
          </div>
        </div>
      `;
    }

    return `
      <div class="vibe-panel__chat-status">
        <div class="vibe-panel__chat-status-copy">
          <strong>Editing is restricted</strong>
          <small>You can read the thread here, but you do not currently have permission to start a live vibe-coding session on this page.</small>
        </div>
      </div>
    `;
  }

  function renderSettingsPanel({
    pageName,
    projectName,
    projectReviewSessions,
    pageSessions,
    reviewSessions,
    inProgressSessions,
    canReviewSessions,
    providerStatus,
  }) {
    return `
      <section class="vibe-panel__settings-panel">
        <div class="vibe-panel__settings-head">
          <div>
            <p class="vibe-panel__result-eyebrow">Vibe settings</p>
            <h3>Project controls</h3>
          </div>
          <button type="button" class="vibe-panel__button vibe-panel__button--ghost" data-vibe-settings-toggle>Done</button>
        </div>

        <div class="vibe-panel__control-rail">
          <div class="vibe-panel__workspace-card">
            <div class="vibe-panel__workspace-head">
              <div class="vibe-panel__workspace-copy">
                <p class="vibe-panel__result-eyebrow">Codex workspace</p>
                <h3>${escapeHtml(projectName)}</h3>
                <p>Configuration, permissions, and review controls for the shared Vibe Design workflow.</p>
              </div>
              <div class="vibe-panel__context-summary">
                <span class="vibe-panel__context-pill">${escapeHtml((state.project?.visibility || "private").replace(/_/g, " "))}</span>
                <span class="vibe-panel__context-pill is-accent">${escapeHtml((state.project?.codexAccessMode || "contributors").replace(/_/g, " "))}</span>
              </div>
            </div>

            <div class="vibe-panel__workspace-grid">
              <div class="vibe-panel__meta-card">
                <span>Codex project context</span>
                <strong>${escapeHtml(state.project?.codexContextId || "Pending")}</strong>
              </div>
              <div class="vibe-panel__meta-card">
                <span>Current page</span>
                <strong>${escapeHtml(pageName)}</strong>
              </div>
              <div class="vibe-panel__meta-card">
                <span>Hosted provider</span>
                <strong>${providerStatus.tone === "connected" ? "Ready" : "Needs setup"}</strong>
                <small>${escapeHtml(providerStatus.text)}</small>
              </div>
              ${
                state.project?.canManageSharing
                  ? `
                    <div class="vibe-panel__field vibe-panel__field--compact">
                      <span>Who can edit with Codex</span>
                      <div class="vibe-panel__provider-select">
                        <button
                          type="button"
                          class="vibe-panel__provider-trigger vibe-panel__provider-trigger--compact"
                          data-vibe-codex-access-toggle
                          aria-expanded="${state.codexAccessSelectOpen ? "true" : "false"}"
                        >
                          <span>
                            <strong>${escapeHtml(getCodexAccessLabel(state.project?.codexAccessMode || "contributors"))}</strong>
                            <small>Control who can create and review Codex edit sessions.</small>
                          </span>
                          <svg viewBox="0 0 24 24" aria-hidden="true">
                            <path d="m7 10 5 5 5-5"></path>
                          </svg>
                        </button>
                        <div class="vibe-panel__provider-menu${state.codexAccessSelectOpen ? " is-open" : ""}" role="listbox">
                          ${CODEX_ACCESS_OPTIONS.map(
                            (option) => `
                              <button
                                type="button"
                                class="vibe-panel__provider-option${state.project?.codexAccessMode === option.value ? " is-active" : ""}"
                                data-vibe-codex-access-option="${option.value}"
                                role="option"
                                aria-selected="${state.project?.codexAccessMode === option.value ? "true" : "false"}"
                              >
                                <strong>${escapeHtml(option.label)}</strong>
                                <small>${
                                  option.value === "owner_admin_only"
                                    ? "Limit Codex sessions to owners and project admins."
                                    : option.value === "contributors"
                                      ? "Let project contributors open Codex edit sessions."
                                      : "Allow every project member to edit with Codex."
                                }</small>
                              </button>
                            `,
                          ).join("")}
                        </div>
                      </div>
                    </div>
                  `
                  : ""
              }
            </div>

            ${
              state.project?.canManageSharing
                ? `
                  <div class="vibe-panel__workspace-review">
                    <div class="vibe-panel__history-head">
                      <p class="vibe-panel__result-eyebrow">Project review queue</p>
                      <span>${projectReviewSessions.length} ready</span>
                    </div>
                    ${
                      projectReviewSessions.length
                        ? `
                          <div class="vibe-panel__review-list">
                            ${projectReviewSessions
                              .map((session) => {
                                const sessionPage = state.project?.pages?.find((page) => page.id === session.pageId);
                                return `
                                  <article class="vibe-panel__review-item">
                                    <div class="vibe-panel__review-copy">
                                      <strong>${escapeHtml(getSessionUserLabel(session))}</strong>
                                      <span>${escapeHtml(sessionPage?.name || "Project-wide session")} • ${escapeHtml(session.branchName || "Scaffold branch")}</span>
                                    </div>
                                    <div class="vibe-panel__review-actions">
                                      <button type="button" class="vibe-panel__button vibe-panel__button--ghost" data-vibe-open-review="${escapeHtml(session.id)}">Review</button>
                                      <button type="button" class="vibe-panel__button vibe-panel__button--secondary" data-vibe-merge-session="${escapeHtml(session.id)}">Merge</button>
                                    </div>
                                  </article>
                                `;
                              })
                              .join("")}
                          </div>
                        `
                        : `<p class="vibe-panel__empty">No project sessions are currently waiting for review.</p>`
                    }
                  </div>
                `
                : ""
            }
          </div>

          <div class="vibe-panel__session-block">
            <div class="vibe-panel__section-head">
              <div>
                <p class="vibe-panel__result-eyebrow">Current page workflow</p>
                <h3>${escapeHtml(pageName)}</h3>
              </div>
              <span class="vibe-panel__section-tag">${pageSessions.length} session${pageSessions.length === 1 ? "" : "s"}</span>
            </div>

            <div class="vibe-panel__review-card">
              ${
                reviewSessions.length
                  ? `
                    <div class="vibe-panel__review-group">
                      <span class="vibe-panel__review-label">Ready for review</span>
                      <div class="vibe-panel__review-list">
                        ${reviewSessions
                          .map(
                            (session) => `
                              <article class="vibe-panel__review-item">
                                <div class="vibe-panel__review-copy">
                                  <strong>${escapeHtml(getSessionUserLabel(session))}</strong>
                                  <span>${escapeHtml(session.branchName || "Scaffold branch")}</span>
                                </div>
                                ${
                                  canReviewSessions
                                    ? `
                                      <div class="vibe-panel__review-actions">
                                        <button type="button" class="vibe-panel__button vibe-panel__button--ghost" data-vibe-open-review="${escapeHtml(session.id)}">Review</button>
                                        <button type="button" class="vibe-panel__button vibe-panel__button--secondary" data-vibe-merge-session="${escapeHtml(session.id)}">Merge</button>
                                      </div>
                                    `
                                    : `<button type="button" class="vibe-panel__button vibe-panel__button--ghost" data-vibe-open-review="${escapeHtml(session.id)}">Review</button>`
                                }
                              </article>
                            `,
                          )
                          .join("")}
                      </div>
                    </div>
                  `
                  : ""
              }
              ${
                inProgressSessions.length
                  ? `
                    <div class="vibe-panel__review-group">
                      <span class="vibe-panel__review-label">In progress</span>
                      <div class="vibe-panel__review-list">
                        ${inProgressSessions
                          .map(
                            (session) => `
                              <article class="vibe-panel__review-item">
                                <div class="vibe-panel__review-copy">
                                  <strong>${escapeHtml(getSessionUserLabel(session))}</strong>
                                  <span>${escapeHtml(session.branchName || "Scaffold branch")}</span>
                                </div>
                              </article>
                            `,
                          )
                          .join("")}
                      </div>
                    </div>
                  `
                  : !reviewSessions.length
                    ? `<p class="vibe-panel__empty">No active or review-ready sessions for this page yet.</p>`
                    : ""
              }
            </div>

            ${renderReviewSurface()}

            <div class="vibe-panel__context">
              <label class="vibe-panel__toggle">
                <input type="checkbox" data-vibe-context="project" ${state.includeProjectContext ? "checked" : ""} />
                <span>Include project context</span>
              </label>
              <label class="vibe-panel__toggle">
                <input type="checkbox" data-vibe-context="page" ${state.includePageContext ? "checked" : ""} />
                <span>Include page context</span>
              </label>
            </div>
          </div>
        </div>
      </section>
    `;
  }

  function renderDrawer() {
    const existingThread = drawerRoot.querySelector("[data-vibe-thread]");
    const preserveThreadBottom = state.shouldStickToBottom || isThreadNearBottom(existingThread);
    const preservedThreadScrollTop = !preserveThreadBottom && existingThread ? existingThread.scrollTop : null;
    const providerStatus = getProviderStatusMessage();
    const pageName = state.page?.name || "Page";
    const projectName = state.project?.name || "Project";
    const vibe = state.page?.vibe || {};
    const activeSession = getActiveSession();
    const projectSessions = Array.isArray(state.project?.editSessions) ? state.project.editSessions : [];
    const pageSessions = getPageSessions();
    const projectReviewSessions = projectSessions
      .filter((session) => String(session.status || "").trim().toLowerCase() === "ready_for_review")
      .sort((left, right) => Number(right.updatedAt || right.createdAt || 0) - Number(left.updatedAt || left.createdAt || 0));
    const reviewSessions = pageSessions.filter((session) => String(session.status || "").trim().toLowerCase() === "ready_for_review");
    const inProgressSessions = pageSessions.filter((session) => String(session.status || "").trim().toLowerCase() === "active");
    const sessionReady = Boolean(activeSession || state.project?.canCreateEditSession);
    const currentSessionStatus = String(activeSession?.status || "").trim().toLowerCase();
    const canGenerateForCurrentSession = currentSessionStatus ? currentSessionStatus === "active" : Boolean(sessionReady);
    const canReviewSessions = userCanReviewSessions();
    const selectedProvider = getSelectedProvider();
    const selectableProviders = state.providers.filter((provider) => provider?.isConfigured);
    const canChooseProvider = selectableProviders.length > 1;
    const providerCompactLabel = getProviderModelLabel(selectedProvider);
    const canSubmitPrompt = !state.loading && canGenerateForCurrentSession && Boolean(state.prompt.trim());
    const settingsPanel = state.settingsOpen
      ? renderSettingsPanel({
          pageName,
          projectName,
          projectReviewSessions,
          pageSessions,
          reviewSessions,
          inProgressSessions,
          canReviewSessions,
          providerStatus,
        })
      : "";

    drawerRoot.innerHTML = `
      <div class="vibe-panel__inner">
        <div class="vibe-panel__header">
          <div class="vibe-panel__header-copy">
            <p class="vibe-panel__eyebrow">Vibe</p>
            <h2>${escapeHtml(pageName)}</h2>
          </div>
          <div class="vibe-panel__header-actions">
            <button class="vibe-panel__close" type="button" data-vibe-settings-toggle aria-label="${state.settingsOpen ? "Close Vibe settings" : "Open Vibe settings"}">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M12 3.75v2.1"></path>
                <path d="M12 18.15v2.1"></path>
                <path d="m5.64 5.64 1.48 1.48"></path>
                <path d="m16.88 16.88 1.48 1.48"></path>
                <path d="M3.75 12h2.1"></path>
                <path d="M18.15 12h2.1"></path>
                <path d="m5.64 18.36 1.48-1.48"></path>
                <path d="m16.88 7.12 1.48-1.48"></path>
                <circle cx="12" cy="12" r="3.35"></circle>
              </svg>
            </button>
            <button class="vibe-panel__close" type="button" data-vibe-close aria-label="Close vibe coding">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M6 6 18 18"></path>
                <path d="M18 6 6 18"></path>
              </svg>
            </button>
          </div>
        </div>

        ${
          state.settingsOpen
            ? `
              <div class="vibe-panel__body vibe-panel__body--settings">
                ${settingsPanel}
              </div>
            `
            : `
              <div class="vibe-panel__thread" data-vibe-thread>
                ${renderThreadSurface()}
              </div>
            `
        }

        <div class="vibe-panel__composer">
          ${renderPendingAssets()}
          <div class="comments-panel__field">
            <div class="comments-panel__input-wrap">
              <textarea
                class="comments-panel__prompt vibe-panel__prompt"
                data-vibe-prompt
                placeholder="Type a message"
              >${escapeHtml(state.prompt)}</textarea>
              <button
                type="button"
                class="comments-panel__attach vibe-panel__attach"
                data-vibe-attach
                aria-label="Attach files"
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M16.5 6.5 9 14a3 3 0 1 0 4.24 4.24l7-7a5 5 0 0 0-7.07-7.07l-8 8"></path>
                </svg>
              </button>
              ${
                canChooseProvider
                  ? `
                    <button
                      type="button"
                      class="vibe-panel__model-chip vibe-panel__model-chip--button"
                      data-vibe-provider-toggle
                      aria-expanded="${state.dropdownOpen ? "true" : "false"}"
                      aria-label="Choose Vibe model"
                    >
                      <span>${escapeHtml(providerCompactLabel)}</span>
                      <svg viewBox="0 0 24 24" aria-hidden="true">
                        <path d="m7 10 5 5 5-5"></path>
                      </svg>
                    </button>
                  `
                  : `<span class="vibe-panel__model-chip" aria-label="Current Vibe model">${escapeHtml(providerCompactLabel)}</span>`
              }
              <button
                type="button"
                class="comments-panel__send vibe-panel__send"
                data-vibe-generate
                aria-label="${state.loading ? "Sending prompt" : "Send prompt"}"
                ${canSubmitPrompt ? "" : "disabled"}
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M12 5 12 19"></path>
                  <path d="M6 11 12 5 18 11"></path>
                </svg>
              </button>
            </div>
          </div>

          ${
            state.error
              ? `<p class="vibe-panel__status vibe-panel__status--error">${escapeHtml(state.error)}</p>`
              : vibe.error
                ? `<p class="vibe-panel__status vibe-panel__status--error">${escapeHtml(vibe.error)}</p>`
                : ""
          }
          ${
            canChooseProvider
              ? `
                <div class="vibe-panel__provider-select vibe-panel__provider-select--composer">
                  <div class="vibe-panel__provider-menu${state.dropdownOpen ? " is-open" : ""}" role="listbox">
                    ${selectableProviders
                      .map(
                        (provider) => `
                          <button
                            type="button"
                            class="vibe-panel__provider-option${state.providerId === provider.id ? " is-active" : ""}"
                            data-vibe-provider-option="${escapeHtml(provider.id)}"
                            role="option"
                            aria-selected="${state.providerId === provider.id ? "true" : "false"}"
                          >
                            <strong>${escapeHtml(provider.label)}</strong>
                            <small>${escapeHtml(provider.model || provider.helperCopy || provider.label)}</small>
                          </button>
                        `,
                      )
                      .join("")}
                  </div>
                </div>
              `
              : ""
          }
        </div>
      </div>
    `;

    bindDrawerEvents();

    const thread = drawerRoot.querySelector("[data-vibe-thread]");
    thread?.addEventListener("scroll", () => {
      state.shouldStickToBottom = isThreadNearBottom(thread);
    });

    if (preserveThreadBottom) {
      window.requestAnimationFrame(() => {
        scrollThreadToLatest();
      });
      state.shouldStickToBottom = true;
    } else if (thread && preservedThreadScrollTop !== null) {
      window.requestAnimationFrame(() => {
        thread.scrollTop = preservedThreadScrollTop;
      });
    }
  }

  function bindDrawerEvents() {
    const promptField = drawerRoot.querySelector("[data-vibe-prompt]");

    autoResizeComposerTextarea(promptField);

    drawerRoot.querySelector("[data-vibe-close]")?.addEventListener("click", () => {
      setDrawerOpen(false);
    });

    drawerRoot.querySelectorAll("[data-vibe-settings-toggle]").forEach((button) => {
      button.addEventListener("click", () => {
        state.settingsOpen = !state.settingsOpen;
        state.codexAccessSelectOpen = false;
        state.dropdownOpen = false;
        renderDrawer();
      });
    });

    drawerRoot.querySelector("[data-vibe-provider-toggle]")?.addEventListener("click", () => {
      state.dropdownOpen = !state.dropdownOpen;
      renderDrawer();
    });

    drawerRoot.querySelectorAll("[data-vibe-verification-toggle]").forEach((button) => {
      button.addEventListener("click", () => {
        const messageKey = String(button.getAttribute("data-vibe-verification-toggle") || "").trim();
        state.openVerificationMessageKey =
          state.openVerificationMessageKey === messageKey ? "" : messageKey;
        renderDrawer();
      });
    });

    drawerRoot.querySelector("[data-vibe-attach]")?.addEventListener("click", () => {
      openAssetFilePicker();
    });

    drawerRoot.querySelectorAll("[data-vibe-provider-option]").forEach((button) => {
      button.addEventListener("click", () => {
        state.providerId = String(button.getAttribute("data-vibe-provider-option") || "").trim().toLowerCase() || state.providerId;
        state.dropdownOpen = false;
        renderDrawer();
      });
    });

    drawerRoot.querySelectorAll("[data-vibe-asset-remove]").forEach((button) => {
      button.addEventListener("click", () => {
        removePendingAsset(button.getAttribute("data-vibe-asset-remove") || "");
      });
    });

    drawerRoot.querySelector("[data-vibe-codex-access-toggle]")?.addEventListener("click", () => {
      state.codexAccessSelectOpen = !state.codexAccessSelectOpen;
      renderDrawer();
    });

    drawerRoot.querySelectorAll("[data-vibe-codex-access-option]").forEach((option) => {
      option.addEventListener("click", () => {
        void updateCodexAccess(option.getAttribute("data-vibe-codex-access-option") || "");
      });
    });

    promptField?.addEventListener("input", (event) => {
      autoResizeComposerTextarea(promptField);
      state.prompt = event.currentTarget.value;
      const generateButton = drawerRoot.querySelector("[data-vibe-generate]");

      if (generateButton) {
        generateButton.disabled =
          state.loading ||
          !(String(getActiveSession()?.status || "").trim().toLowerCase() ? String(getActiveSession()?.status || "").trim().toLowerCase() === "active" : Boolean(getActiveSession() || state.project?.canCreateEditSession)) ||
          !state.prompt.trim();
      }
    });

    promptField?.addEventListener("keydown", (event) => {
      if (event.isComposing) {
        return;
      }

      if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        void generateDraft();
      }
    });

    drawerRoot.querySelectorAll("[data-vibe-context]").forEach((input) => {
      input.addEventListener("change", () => {
        state.includeProjectContext = drawerRoot.querySelector('[data-vibe-context="project"]')?.checked !== false;
        state.includePageContext = drawerRoot.querySelector('[data-vibe-context="page"]')?.checked !== false;
      });
    });

    drawerRoot.querySelector("[data-vibe-generate]")?.addEventListener("click", () => {
      void generateDraft();
    });

    drawerRoot.querySelector("[data-vibe-create-page]")?.addEventListener("click", () => {
      void createPageFromPrompt();
    });

    drawerRoot.querySelectorAll("[data-vibe-session-status]").forEach((button) => {
      button.addEventListener("click", () => {
        void updateSessionStatus(button.getAttribute("data-vibe-session-status") || "");
      });
    });

    drawerRoot.querySelectorAll("[data-vibe-merge-session]").forEach((button) => {
      button.addEventListener("click", () => {
        void mergeSession(button.getAttribute("data-vibe-merge-session") || "");
      });
    });

    drawerRoot.querySelectorAll("[data-vibe-open-review]").forEach((button) => {
      button.addEventListener("click", () => {
        void openSessionReview(button.getAttribute("data-vibe-open-review") || "");
      });
    });

    drawerRoot.querySelector("[data-vibe-close-review]")?.addEventListener("click", () => {
      state.reviewSessionId = "";
      state.reviewData = null;
      renderDrawer();
    });

    drawerRoot.querySelector("[data-vibe-apply]")?.addEventListener("click", () => {
      void applyDraft();
    });

    drawerRoot.querySelectorAll("[data-vibe-restore]").forEach((button) => {
      button.addEventListener("click", () => {
        void restoreDraft(button.getAttribute("data-vibe-restore"));
      });
    });

    drawerRoot.querySelectorAll("[data-vibe-apply-version]").forEach((button) => {
      button.addEventListener("click", () => {
        void applyDraft(button.getAttribute("data-vibe-apply-version"));
      });
    });

  }

  async function persistGeneratedDraft(generated) {
    const activeSession = getActiveSession();
    const response = await fetch(PROJECTS_API, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        action: "saveVibeDraft",
        project: state.project.id,
        page: state.page.id,
        providerId: state.providerId,
        viewportPreset: state.viewportPreset,
        prompt: state.prompt,
        includeProjectContext: state.includeProjectContext,
        includePageContext: state.includePageContext,
        sessionId: activeSession?.id || "",
        generated,
      }),
    });
    const payload = await response.json().catch(() => ({}));

    if (!response.ok || !payload?.ok || !payload?.project) {
      throw new Error(payload?.error || "Unable to save the generated page draft.");
    }

    state.providers = Array.isArray(payload.vibeProviders) && payload.vibeProviders.length ? payload.vibeProviders : state.providers;
    syncFromProject(payload.project, state.page.id);
    window.dispatchEvent(
      new CustomEvent("uxbridge:project-runtime-sync", {
        detail: { project: payload.project },
      }),
    );
  }

  async function appendThreadNote() {
    if (!state.project || !state.page || !state.prompt.trim() || state.loading) {
      return;
    }

    state.loading = true;
    state.error = "";
    renderDrawer();

    try {
      const response = await fetch(PROJECTS_API, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "appendCodexThreadMessage",
          project: state.project.id,
          page: state.page.id,
          sessionId: getActiveSession()?.id || "",
          role: "user",
          kind: "note",
          content: state.prompt,
          metadata: {
            providerId: state.providerId,
            viewportPreset: state.viewportPreset,
            includeProjectContext: state.includeProjectContext,
            includePageContext: state.includePageContext,
          },
        }),
      });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok || !payload?.ok || !payload?.project) {
        throw new Error(payload?.error || "Unable to add this note to the Vibe Design thread.");
      }

      state.prompt = "";
      syncFromProject(payload.project, state.page.id);
      window.dispatchEvent(
        new CustomEvent("uxbridge:project-runtime-sync", {
          detail: { project: payload.project },
        }),
      );
    } catch (error) {
      state.error = error instanceof Error ? error.message : "Unable to add this note to the Vibe Design thread.";
      renderDrawer();
    } finally {
      state.loading = false;
      renderDrawer();
    }
  }

  async function ensureActiveSession() {
    if (!state.project || !state.page) {
      return null;
    }

    const existingSession = getActiveSession();

    if (existingSession) {
      return existingSession;
    }

    if (!state.project.canCreateEditSession || state.sessionCreating) {
      return null;
    }

    state.sessionCreating = true;
    state.error = "";
    renderDrawer();

    try {
      const response = await fetch(PROJECTS_API, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "createEditSession",
          project: state.project.id,
          page: state.page.id,
          source: "hosted-vibe",
        }),
      });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok || !payload?.ok || !payload?.project) {
        throw new Error(payload?.error || "Unable to start a Codex edit session for this page.");
      }

      syncFromProject(payload.project, state.page.id);
      window.dispatchEvent(
        new CustomEvent("uxbridge:project-runtime-sync", {
          detail: { project: payload.project },
        }),
      );

      return payload.session || getActiveSession();
    } catch (error) {
      state.error = error instanceof Error ? error.message : "Unable to start a Codex edit session for this page.";
      renderDrawer();
      return null;
    } finally {
      state.sessionCreating = false;
      renderDrawer();
    }
  }

  async function persistActivePageContext(pageId = "") {
    if (!state.project || !pageId) {
      return;
    }

    try {
      const response = await fetch(PROJECTS_API, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "setCodexActivePage",
          project: state.project.id,
          page: pageId,
        }),
      });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok || !payload?.ok || !payload?.project) {
        return;
      }

      state.project = payload.project;
      renderDrawer();
    } catch {
      // Keep page switching resilient even if the active-page sync misses once.
    }
  }

  async function createPageFromPrompt() {
    if (!state.project || state.pageCreating || !state.prompt.trim()) {
      return;
    }

    if (!(await ensureActiveSession())) {
      return;
    }

    state.pageCreating = true;
    state.error = "";
    renderDrawer();

    try {
      const response = await fetch(PROJECTS_API, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "createPageFromCodex",
          project: state.project.id,
          name: inferPageNameFromPrompt(state.prompt),
        }),
      });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok || !payload?.ok || !payload?.page?.launchUrl) {
        throw new Error(payload?.error || "Unable to create a new page from this prompt.");
      }

      window.location.href = payload.page.launchUrl;
    } catch (error) {
      state.error = error instanceof Error ? error.message : "Unable to create a new page from this prompt.";
      renderDrawer();
    } finally {
      state.pageCreating = false;
      renderDrawer();
    }
  }

  async function updateCodexAccess(codexAccessMode = "") {
    if (!state.project || !codexAccessMode) {
      return;
    }

    state.sessionCreating = true;
    state.error = "";
    state.codexAccessSelectOpen = false;
    renderDrawer();

    try {
      const response = await fetch(PROJECTS_API, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "updateProjectPrivacy",
          project: state.project.id,
          codexAccessMode,
        }),
      });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok || !payload?.ok || !payload?.project) {
        throw new Error(payload?.error || "Unable to update Codex access settings.");
      }

      syncFromProject(payload.project, state.page.id);
      window.dispatchEvent(
        new CustomEvent("uxbridge:project-runtime-sync", {
          detail: { project: payload.project },
        }),
      );
    } catch (error) {
      state.error = error instanceof Error ? error.message : "Unable to update Codex access settings.";
      renderDrawer();
    } finally {
      state.sessionCreating = false;
      renderDrawer();
    }
  }

  async function updateSessionStatus(nextStatus = "") {
    const session = getActiveSession();

    if (!state.project || !session || !nextStatus) {
      return;
    }

    state.sessionCreating = true;
    state.error = "";
    renderDrawer();

    try {
      const response = await fetch(PROJECTS_API, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "updateEditSessionStatus",
          project: state.project.id,
          sessionId: session.id,
          status: nextStatus,
        }),
      });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok || !payload?.ok || !payload?.project) {
        throw new Error(payload?.error || "Unable to update the edit session status.");
      }

      syncFromProject(payload.project, state.page.id);
      window.dispatchEvent(
        new CustomEvent("uxbridge:project-runtime-sync", {
          detail: { project: payload.project },
        }),
      );
    } catch (error) {
      state.error = error instanceof Error ? error.message : "Unable to update the edit session status.";
      renderDrawer();
    } finally {
      state.sessionCreating = false;
      renderDrawer();
    }
  }

  async function mergeSession(sessionId = "") {
    if (!state.project || !sessionId || state.applying) {
      return;
    }

    state.applying = true;
    state.error = "";
    renderDrawer();

    try {
      const response = await fetch(PROJECTS_API, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "mergeEditSession",
          project: state.project.id,
          sessionId,
        }),
      });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok || !payload?.ok || !payload?.project) {
        throw new Error(payload?.error || "Unable to merge this edit session.");
      }

      if (state.reviewSessionId === sessionId) {
        state.reviewSessionId = "";
        state.reviewData = null;
      }

      syncFromProject(payload.project, state.page.id);
      window.dispatchEvent(
        new CustomEvent("uxbridge:project-runtime-sync", {
          detail: { project: payload.project },
        }),
      );
    } catch (error) {
      state.error = error instanceof Error ? error.message : "Unable to merge this edit session.";
      renderDrawer();
    } finally {
      state.applying = false;
      renderDrawer();
    }
  }

  async function openSessionReview(sessionId = "") {
    if (!state.project || !sessionId || state.reviewLoading) {
      return;
    }

    state.reviewSessionId = sessionId;
    state.reviewData = null;
    state.reviewLoading = true;
    state.error = "";
    renderDrawer();

    try {
      const response = await fetch(PROJECTS_API, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "getEditSessionReview",
          project: state.project.id,
          sessionId,
        }),
      });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok || !payload?.ok || !payload?.review) {
        throw new Error(payload?.error || "Unable to load the edit-session review.");
      }

      state.reviewData = payload.review;
    } catch (error) {
      state.error = error instanceof Error ? error.message : "Unable to load the edit-session review.";
    } finally {
      state.reviewLoading = false;
      renderDrawer();
    }
  }

  async function generateDraftViaHostedProvider(promptText = "") {
    const activeSession = getActiveSession();
    const submittedPrompt = String(promptText || "").trim();
    const pendingAttachmentPayloads = state.pendingAssets.map((asset) => ({
      fileName: asset.fileName,
      contentType: asset.contentType,
      kind: asset.kind,
      sizeBytes: asset.sizeBytes,
      previewUrl: asset.previewUrl,
      dataBase64: asset.dataBase64,
    }));
    const response = await fetch(PROJECTS_API, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        action: "generateVibeContent",
        project: state.project.id,
        page: state.page.id,
        providerId: state.providerId,
        viewportPreset: state.viewportPreset,
        prompt: submittedPrompt,
        includeProjectContext: state.includeProjectContext,
        includePageContext: state.includePageContext,
        sessionId: activeSession?.id || "",
        attachmentPayloads: pendingAttachmentPayloads,
        selectedLayer: state.selectedLayerContext && String(state.selectedLayerContext.pageId || "").trim().toLowerCase() === String(state.page?.id || "").trim().toLowerCase()
          ? state.selectedLayerContext
          : null,
      }),
    });
    const payload = await response.json().catch(() => ({}));

    if (!response.ok || !payload?.ok || !payload?.project) {
      throw new Error(payload?.error || "The hosted Vibe provider could not generate page content.");
    }

    state.providers = Array.isArray(payload.vibeProviders) && payload.vibeProviders.length ? payload.vibeProviders : state.providers;
    syncFromProject(payload.project, state.page.id);
    window.dispatchEvent(
      new CustomEvent("uxbridge:project-runtime-sync", {
        detail: { project: payload.project },
      }),
    );
    await applyDraft();
    state.pendingAssets = [];
  }

  async function generateDraft() {
    const submittedPrompt = String(state.prompt || "").trim();
    const promptField = drawerRoot.querySelector("[data-vibe-prompt]");

    if (!state.project || !state.page || !submittedPrompt || state.loading) {
      return;
    }

    if (!isProviderConnected()) {
      state.error = `${getSelectedProvider()?.label || "Selected provider"} is not configured for hosted vibe coding yet.`;
      renderDrawer();
      return;
    }

    state.loading = true;
    state.error = "";
    state.submittingPrompt = submittedPrompt;
    state.prompt = "";
    if (promptField) {
      promptField.value = "";
    }
    renderDrawer();

    try {
      if (!(await ensureActiveSession())) {
        state.submittingPrompt = "";
        state.prompt = submittedPrompt;
        return;
      }

      await generateDraftViaHostedProvider(submittedPrompt);
      state.submittingPrompt = "";
    } catch (error) {
      state.submittingPrompt = "";
      state.prompt = submittedPrompt;
      state.error = error instanceof Error ? error.message : "Unable to generate page content.";
      renderDrawer();
    } finally {
      state.loading = false;
      renderDrawer();
    }
  }

  async function applyDraft(draftGeneratedAt = "") {
    if (!state.project || !state.page || state.applying) {
      return;
    }

    state.applying = true;
    state.error = "";
    renderDrawer();

    try {
      const response = await fetch(PROJECTS_API, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "applyVibeContent",
          project: state.project.id,
          page: state.page.id,
          ...(draftGeneratedAt ? { draftGeneratedAt: Number(draftGeneratedAt) || 0 } : {}),
        }),
      });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok || !payload?.ok || !payload?.project) {
        throw new Error(payload?.error || "Unable to apply generated page content.");
      }

      state.providers = Array.isArray(payload.vibeProviders) && payload.vibeProviders.length ? payload.vibeProviders : state.providers;
      syncFromProject(payload.project, state.page.id);
      window.dispatchEvent(
        new CustomEvent("uxbridge:project-runtime-sync", {
          detail: { project: payload.project },
        }),
      );
    } catch (error) {
      state.error = error instanceof Error ? error.message : "Unable to apply generated page content.";
      renderDrawer();
    } finally {
      state.applying = false;
      renderDrawer();
    }
  }

  async function restoreDraft(draftGeneratedAt = "") {
    if (!state.project || !state.page || state.restoring) {
      return;
    }

    state.restoring = true;
    state.error = "";
    renderDrawer();

    try {
      const response = await fetch(PROJECTS_API, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "restoreVibeDraft",
          project: state.project.id,
          page: state.page.id,
          draftGeneratedAt: Number(draftGeneratedAt) || 0,
        }),
      });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok || !payload?.ok || !payload?.project) {
        throw new Error(payload?.error || "Unable to restore this version.");
      }

      state.providers = Array.isArray(payload.vibeProviders) && payload.vibeProviders.length ? payload.vibeProviders : state.providers;
      syncFromProject(payload.project, state.page.id);
      window.dispatchEvent(
        new CustomEvent("uxbridge:project-runtime-sync", {
          detail: { project: payload.project },
        }),
      );
    } catch (error) {
      state.error = error instanceof Error ? error.message : "Unable to restore this version.";
      renderDrawer();
    } finally {
      state.restoring = false;
      renderDrawer();
    }
  }

  async function hydrateInitialState() {
    try {
      const response = await fetch(`${PROJECTS_API}?project=${encodeURIComponent(projectId)}`, {
        credentials: "include",
        cache: "no-store",
      });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok || !payload?.ok || !payload?.project) {
        return;
      }

      state.providers = Array.isArray(payload.vibeProviders) && payload.vibeProviders.length ? payload.vibeProviders : listFallbackProviders();
      state.currentUser = payload.currentUser || getCurrentUser();
      syncFromProject(payload.project, requestedPageId);
    } catch {
      state.providers = listFallbackProviders();
      renderDrawer();
    }
  }

  function listFallbackProviders() {
    return [
      {
        id: "codex",
        label: "Codex",
        model: DEFAULT_PROVIDER_MODELS.codex,
        availableVia: "server",
        credentialMode: "organization-managed",
        helperCopy: "Uses the hosted OpenAI Codex integration to edit the mobile preview container for the current page.",
        isConfigured: false,
      },
      {
        id: "claude",
        label: "Claude",
        model: DEFAULT_PROVIDER_MODELS.claude,
        availableVia: "server",
        credentialMode: "organization-managed",
        helperCopy: "Uses the hosted Anthropic Claude integration to edit the mobile preview container for the current page.",
        isConfigured: false,
      },
    ];
  }

  document.addEventListener("click", (event) => {
    if (!state.codexAccessSelectOpen && !state.dropdownOpen) {
      return;
    }

    if (!drawerRoot.contains(event.target)) {
      state.codexAccessSelectOpen = false;
      state.dropdownOpen = false;
      renderDrawer();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      if (state.codexAccessSelectOpen) {
        state.codexAccessSelectOpen = false;
        renderDrawer();
        return;
      }

      if (state.settingsOpen) {
        state.settingsOpen = false;
        renderDrawer();
        return;
      }

      if (state.drawerOpen) {
        setDrawerOpen(false);
      }
    }
  });

  window.addEventListener("uxbridge:project-page-sync", (event) => {
    const project = event.detail?.project;
    const page = event.detail?.page;

    if (!project || !page || project.id !== projectId) {
      return;
    }

    if (!state.providers.length) {
      state.providers = listFallbackProviders();
    }

    syncFromProject(project, page.id);
  });

  window.addEventListener("uxbridge:selected-layer-change", (event) => {
    const pageId = String(event.detail?.pageId || "").trim().toLowerCase();
    const selectedLayer = normalizeSelectedLayerContext(event.detail?.selectedLayer);
    const currentPageId = String(state.page?.id || requestedPageId || "").trim().toLowerCase();

    if (!currentPageId || pageId !== currentPageId) {
      return;
    }

    state.selectedLayerContext = selectedLayer;
  });

  window.addEventListener("uxbridge:preview-viewport-change", (event) => {
    const nextPreset = String(event.detail?.viewportPreset || "").trim().toLowerCase();

    if (!nextPreset) {
      return;
    }

    state.viewportPreset = nextPreset;
  });

  window.addEventListener("uxbridge:user-ready", (event) => {
    state.currentUser = event.detail || null;
    renderDrawer();
  });

  state.providers = listFallbackProviders();
  setupDrawerLauncher();
  renderDrawer();
  mobileSheetBackdrop?.addEventListener("click", () => {
    if (state.drawerOpen) {
      setDrawerOpen(false);
    }
  });
  window.addEventListener("resize", syncMobileSheetBackdrop);
  document.querySelectorAll("[data-vibe-launch-provider]").forEach((button) => {
    button.addEventListener("click", () => {
      beginVibeCompose(button.getAttribute("data-vibe-launch-provider") || "");
    });
  });
  void hydrateInitialState();
})();
