(function initDevModeDrawer() {
  const PROJECTS_API = "/api/projects";
  const params = new URLSearchParams(window.location.search);
  const projectId = String(params.get("project") || "").trim().toLowerCase();
  const requestedPageId = String(params.get("page") || "").trim().toLowerCase();

  if (!projectId) {
    return;
  }

  const state = {
    open: false,
    mode: "html",
    project: null,
    page: null,
    dirty: false,
    saving: false,
    error: "",
    status: "",
    editorValue: "",
  };

  const style = document.createElement("style");
  style.textContent = `
    .preview-dev-divider {
      width: 32px;
      height: 1px;
      margin: 2px 0;
      background: rgba(37, 37, 37, 0.14);
    }

    .preview-dev-panel {
      position: fixed;
      top: 0;
      right: 0;
      bottom: 0;
      z-index: 1315;
      display: grid;
      grid-template-rows: auto minmax(0, 1fr) auto;
      width: 300px;
      max-width: min(300px, calc(100vw - 96px));
      box-sizing: border-box;
      overflow: auto;
      pointer-events: none;
      opacity: 0;
      transform: translateX(12px);
      transition: opacity 0.18s ease, transform 0.24s cubic-bezier(.22,1,.36,1);
      border-left: 1px solid rgba(37, 37, 37, 0.14);
      border-right: 1px solid rgba(37, 37, 37, 0.08);
      background: rgba(255, 255, 255, 0.94);
      backdrop-filter: blur(18px);
      box-shadow: -18px 0 38px rgba(38, 44, 78, 0.12);
    }

    body.preview-dev-open .preview-dev-panel {
      opacity: 1;
      pointer-events: auto;
      transform: translateX(0);
    }

    body.breakpoint-specific-active .preview-dev-panel,
    .preview-dev-panel.is-breakpoint-active {
      background:
        linear-gradient(135deg, #a429ec14 0%, #a429ec0f 100%),
        #ffffffe0;
      border-color: #a429ec2e;
    }

    .preview-dev-panel__header {
      display: grid;
      gap: 12px;
      padding: 18px 16px 12px;
      border-bottom: 1px solid rgba(37, 37, 37, 0.1);
    }

    .preview-dev-panel__title-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
    }

    .preview-dev-panel__eyebrow {
      margin: 0;
      color: #7b8397;
      font-size: 11px;
      font-weight: 800;
      letter-spacing: 0.16em;
      line-height: 1.1;
      text-transform: uppercase;
    }

    .preview-dev-panel__title {
      margin: 2px 0 0;
      color: #111827;
      font-size: 20px;
      font-weight: 800;
      line-height: 1.1;
    }

    .preview-dev-panel__close {
      flex: none;
      width: 38px;
      height: 38px;
      border: 1px solid transparent;
      border-radius: 999px;
      color: #64748b;
      background: transparent;
      display: grid;
      place-items: center;
      padding: 0;
    }

    .preview-dev-panel__close:hover,
    .preview-dev-panel__close:focus-visible {
      color: #111827;
      background: rgba(255, 255, 255, 0.78);
      border-color: rgba(37, 37, 37, 0.12);
    }

    .preview-dev-panel__close svg,
    .preview-dev-toggle svg {
      width: 24px;
      height: 24px;
      fill: none;
      stroke: currentColor;
      stroke-width: 1.8;
      stroke-linecap: round;
      stroke-linejoin: round;
    }

    .preview-dev-panel__tabs {
      display: grid;
      grid-template-columns: repeat(var(--preview-dev-tab-count, 3), minmax(0, 1fr));
      gap: 4px;
      padding: 4px;
      border: 1px solid rgba(37, 37, 37, 0.1);
      border-radius: 12px;
      background: rgba(255, 255, 255, 0.7);
    }

    .preview-dev-panel__tab {
      min-width: 0;
      border: 0;
      border-radius: 9px;
      padding: 8px 6px;
      color: #64748b;
      background: transparent;
      font-size: 12px;
      font-weight: 800;
      line-height: 1;
    }

    .preview-dev-panel__tab.is-active {
      color: #2563eb;
      background: rgba(37, 99, 235, 0.12);
    }

    .preview-dev-panel.is-breakpoint-active .preview-dev-panel__tab.is-active {
      color: #a429ec;
      background: rgba(164, 41, 236, 0.14);
    }

    .preview-dev-panel__body {
      min-height: 0;
      padding: 12px 16px;
      display: grid;
    }

    .preview-dev-panel__editor {
      width: 100%;
      min-width: 0;
      min-height: 420px;
      height: 100%;
      box-sizing: border-box;
      resize: none;
      border: 1px solid rgba(37, 37, 37, 0.12);
      border-radius: 14px;
      padding: 12px;
      color: #111827;
      background: rgba(255, 255, 255, 0.86);
      font: 12px/1.55 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
      tab-size: 2;
      outline: none;
    }

    .preview-dev-panel.is-breakpoint-active .preview-dev-panel__editor {
      color: #6f13a3;
      background: rgba(255, 255, 255, 0.72);
      border-color: rgba(164, 41, 236, 0.24);
    }

    .preview-dev-panel__footer {
      display: grid;
      gap: 10px;
      padding: 12px 16px 16px;
      border-top: 1px solid rgba(37, 37, 37, 0.1);
      background: rgba(255, 255, 255, 0.56);
    }

    .preview-dev-panel__status {
      min-height: 16px;
      color: #64748b;
      font-size: 12px;
      font-weight: 700;
      line-height: 1.3;
    }

    .preview-dev-panel__status.is-error {
      color: #dc2626;
    }

    .preview-dev-panel__actions {
      display: flex;
      justify-content: flex-end;
      gap: 8px;
    }

    .preview-dev-panel__button {
      min-height: 36px;
      border: 1px solid rgba(37, 37, 37, 0.12);
      border-radius: 999px;
      padding: 0 13px;
      color: #111827;
      background: rgba(255, 255, 255, 0.82);
      font-size: 13px;
      font-weight: 800;
    }

    .preview-dev-panel__button--primary {
      color: #fff;
      background: #2563eb;
      border-color: #2563eb;
    }

    .preview-dev-panel.is-breakpoint-active .preview-dev-panel__button--primary {
      background: #a429ec;
      border-color: #a429ec;
    }

    body.preview-dev-open .bridge-project-side-actions .preview-dev-toggle,
    .bridge-project-side-actions .preview-dev-toggle.is-active {
      color: #2563eb !important;
      background: rgba(37, 99, 235, 0.1) !important;
      border-color: rgba(37, 99, 235, 0.18) !important;
    }

    body.breakpoint-specific-active.preview-dev-open .bridge-project-side-actions .preview-dev-toggle,
    body.breakpoint-specific-active .bridge-project-side-actions .preview-dev-toggle.is-active {
      color: #a429ec !important;
      background: #a429ec1a !important;
      border-color: #a429ec36 !important;
    }
  `;
  document.head.append(style);

  const panel = document.createElement("aside");
  panel.className = "preview-dev-panel";
  panel.setAttribute("data-preview-dev-panel", "");
  panel.setAttribute("aria-label", "Dev Mode");
  document.body.append(panel);

  function escapeHtml(value = "") {
    return String(value || "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }

  function getPreview() {
    return state.page?.preview || state.page?.vibe?.appliedDraft || {};
  }

  function getBreakpointMode() {
    return (
      document.body.classList.contains("breakpoint-specific-active") ||
      !!document.querySelector(".preview-inspector__content--breakpoint-specific-active")
    );
  }

  function getModeTabs() {
    return getBreakpointMode()
      ? [{ id: "overrides", label: "Overrides" }]
      : [
          { id: "html", label: "HTML" },
          { id: "css", label: "CSS" },
          { id: "js", label: "JavaScript" },
        ];
  }

  function getContentForMode(mode = state.mode) {
    const preview = getPreview();

    if (mode === "css") {
      return String(preview.css || "");
    }

    if (mode === "js") {
      return String(preview.js || "");
    }

    if (mode === "overrides") {
      return JSON.stringify(preview.breakpointOverrides || {}, null, 2);
    }

    return String(preview.html || "");
  }

  function syncModeToBreakpointState({ preserveDirty = false } = {}) {
    const tabs = getModeTabs();

    if (!tabs.some((tab) => tab.id === state.mode)) {
      state.mode = tabs[0]?.id || "html";
      preserveDirty = false;
    }

    if (!preserveDirty || !state.dirty) {
      state.editorValue = getContentForMode(state.mode);
      state.dirty = false;
    }
  }

  function getActiveDrawerWidth() {
    const drawerSelectors = [
      ["inspector-open", ".inspector-panel"],
      ["vibe-open", ".vibe-panel"],
      ["comments-open", ".comments-panel"],
      ["uploads-open", ".uploads-panel"],
      ["customizer-open", ".customizer-panel"],
    ];

    for (const [bodyClass, selector] of drawerSelectors) {
      if (!document.body.classList.contains(bodyClass)) {
        continue;
      }

      const drawer = document.querySelector(selector);

      if (!(drawer instanceof HTMLElement)) {
        continue;
      }

      const rect = drawer.getBoundingClientRect();

      if (rect.width > 0.5) {
        return Math.round(rect.width);
      }
    }

    return 0;
  }

  function syncLayout() {
    const rail = document.querySelector(".bridge-project-side-actions");
    const drawerWidth = getActiveDrawerWidth();
    const panelWidth = state.open ? Math.min(300, Math.max(0, window.innerWidth - 96)) : 0;

    panel.style.right = `${drawerWidth}px`;
    document.body.classList.toggle("preview-dev-open", state.open);

    if (rail instanceof HTMLElement) {
      if (state.open) {
        rail.style.right = `${drawerWidth + panelWidth}px`;
      } else {
        rail.style.removeProperty("right");
      }
    }
  }

  function render() {
    syncModeToBreakpointState({ preserveDirty: true });
    const tabs = getModeTabs();
    const breakpointMode = getBreakpointMode();
    panel.classList.toggle("is-breakpoint-active", breakpointMode);
    panel.style.setProperty("--preview-dev-tab-count", String(Math.max(1, tabs.length)));

    panel.innerHTML = `
      <header class="preview-dev-panel__header">
        <div class="preview-dev-panel__title-row">
          <div>
            <p class="preview-dev-panel__eyebrow">Dev Mode</p>
            <h2 class="preview-dev-panel__title">${breakpointMode ? "Breakpoint Overrides" : "Preview Code"}</h2>
          </div>
          <button type="button" class="preview-dev-panel__close" data-preview-dev-close aria-label="Close Dev Mode">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M6 6l12 12"></path>
              <path d="M18 6 6 18"></path>
            </svg>
          </button>
        </div>
        <nav class="preview-dev-panel__tabs" aria-label="Preview files">
          ${tabs
            .map(
              (tab) => `
                <button type="button" class="preview-dev-panel__tab${tab.id === state.mode ? " is-active" : ""}" data-preview-dev-tab="${escapeHtml(tab.id)}">
                  ${escapeHtml(tab.label)}
                </button>
              `,
            )
            .join("")}
        </nav>
      </header>
      <div class="preview-dev-panel__body">
        <textarea class="preview-dev-panel__editor" data-preview-dev-editor spellcheck="false" aria-label="${escapeHtml(state.mode)} editor">${escapeHtml(state.editorValue)}</textarea>
      </div>
      <footer class="preview-dev-panel__footer">
        <div class="preview-dev-panel__status${state.error ? " is-error" : ""}" data-preview-dev-status>
          ${escapeHtml(state.error || state.status || (state.dirty ? "Unsaved changes" : ""))}
        </div>
        <div class="preview-dev-panel__actions">
          <button type="button" class="preview-dev-panel__button" data-preview-dev-revert>Revert</button>
          <button type="button" class="preview-dev-panel__button preview-dev-panel__button--primary" data-preview-dev-save ${state.saving ? "disabled" : ""}>
            ${state.saving ? "Saving" : "Save"}
          </button>
        </div>
      </footer>
    `;

    panel.querySelector("[data-preview-dev-close]")?.addEventListener("click", () => setOpen(false));
    panel.querySelectorAll("[data-preview-dev-tab]").forEach((button) => {
      button.addEventListener("click", () => {
        const nextMode = String(button.getAttribute("data-preview-dev-tab") || "").trim();

        if (!nextMode || nextMode === state.mode) {
          return;
        }

        state.mode = nextMode;
        state.editorValue = getContentForMode(nextMode);
        state.dirty = false;
        state.error = "";
        state.status = "";
        render();
      });
    });

    const editor = panel.querySelector("[data-preview-dev-editor]");

    if (editor instanceof HTMLTextAreaElement) {
      editor.addEventListener("input", () => {
        state.editorValue = editor.value;
        state.dirty = true;
        state.status = "";
        state.error = "";
        const status = panel.querySelector("[data-preview-dev-status]");

        if (status) {
          status.textContent = "Unsaved changes";
          status.classList.remove("is-error");
        }
      });

      editor.addEventListener("keydown", (event) => {
        if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "s") {
          event.preventDefault();
          void save();
        }
      });
    }

    panel.querySelector("[data-preview-dev-revert]")?.addEventListener("click", () => {
      state.editorValue = getContentForMode(state.mode);
      state.dirty = false;
      state.error = "";
      state.status = "Reverted";
      render();
    });
    panel.querySelector("[data-preview-dev-save]")?.addEventListener("click", () => {
      void save();
    });

    syncToggleState();
    syncLayout();
  }

  function syncToggleState() {
    const toggle = document.querySelector("[data-preview-dev-toggle]");

    if (toggle instanceof HTMLButtonElement) {
      toggle.classList.toggle("is-active", state.open);
      toggle.setAttribute("aria-expanded", state.open ? "true" : "false");
    }
  }

  function setOpen(nextOpen) {
    state.open = !!nextOpen;

    if (state.open) {
      syncModeToBreakpointState();
    }

    render();
  }

  function getSavePayload() {
    const preview = getPreview();
    const payload = {
      action: "savePreviewContentEdits",
      project: state.project?.id || projectId,
      page: state.page?.id || requestedPageId || document.body.dataset.pageKey || "",
      html: String(preview.html || ""),
      css: String(preview.css || ""),
      js: String(preview.js || ""),
      stageStyle: String(preview.stageStyle || ""),
      summary: String(preview.summary || state.page?.vibe?.summary || ""),
      syncBase: true,
      breakpointOverrides: preview.breakpointOverrides || {},
    };

    if (state.mode === "html") {
      payload.html = state.editorValue;
    } else if (state.mode === "css") {
      payload.css = state.editorValue;
    } else if (state.mode === "js") {
      payload.js = state.editorValue;
    } else if (state.mode === "overrides") {
      payload.breakpointOverrides = JSON.parse(state.editorValue || "{}");
    }

    return payload;
  }

  async function save() {
    if (!state.page || !state.project || state.saving) {
      return;
    }

    let payload;

    try {
      payload = getSavePayload();
    } catch (error) {
      state.error = error instanceof Error ? error.message : "Overrides must be valid JSON.";
      state.status = "";
      render();
      return;
    }

    state.saving = true;
    state.error = "";
    state.status = "Saving";
    render();

    try {
      const response = await fetch(PROJECTS_API, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await response.json().catch(() => ({}));

      if (!response.ok || !result?.ok || !result?.project) {
        throw new Error(result?.error || "Unable to save preview code.");
      }

      applyProject(result.project, payload.page);
      state.dirty = false;
      state.status = "Saved";
      window.dispatchEvent(new CustomEvent("uxbridge:project-runtime-sync", { detail: { project: result.project } }));
    } catch (error) {
      state.error = error instanceof Error ? error.message : "Unable to save preview code.";
      state.status = "";
    } finally {
      state.saving = false;
      syncModeToBreakpointState();
      render();
    }
  }

  function applyProject(project, pageId = requestedPageId) {
    const normalizedPageId = String(pageId || document.body.dataset.pageKey || requestedPageId || "").trim().toLowerCase();
    const pages = Array.isArray(project?.pages) ? project.pages : [];
    const page = pages.find((entry) => String(entry?.id || "").trim().toLowerCase() === normalizedPageId) || pages[0] || null;

    state.project = project || null;
    state.page = page;

    if (!state.dirty) {
      state.editorValue = getContentForMode(state.mode);
    }
  }

  async function loadProject() {
    try {
      const response = await fetch(`${PROJECTS_API}?project=${encodeURIComponent(projectId)}`, {
        credentials: "include",
        cache: "no-store",
      });
      const result = await response.json().catch(() => ({}));

      if (response.ok && result?.ok && result?.project) {
        applyProject(result.project, requestedPageId);
        syncModeToBreakpointState();
        render();
      }
    } catch {
      // The runtime project sync event will fill this in if the first fetch races auth.
    }
  }

  function setupToggle() {
    const sideActions = document.querySelector("[data-side-actions]");

    if (!sideActions || document.querySelector("[data-preview-dev-toggle]")) {
      return !!document.querySelector("[data-preview-dev-toggle]");
    }

    const uploadsToggle = sideActions.querySelector("[data-uploads-drawer-toggle]");

    if (!uploadsToggle) {
      return false;
    }

    const divider = document.createElement("span");
    divider.className = "preview-dev-divider";
    divider.setAttribute("aria-hidden", "true");

    const toggle = document.createElement("button");
    toggle.type = "button";
    toggle.className = "bridge-action-rail-button preview-dev-toggle";
    toggle.setAttribute("data-preview-dev-toggle", "");
    toggle.setAttribute("aria-expanded", "false");
    toggle.setAttribute("aria-label", "Dev Mode");
    toggle.innerHTML = `
      <span class="bridge-action-rail-button__tooltip" aria-hidden="true">Dev Mode</span>
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="m8 9-3 3 3 3"></path>
        <path d="m16 9 3 3-3 3"></path>
        <path d="m14 5-4 14"></path>
      </svg>
    `;
    toggle.addEventListener("click", () => setOpen(!state.open));

    sideActions.append(divider, toggle);
    syncToggleState();
    return true;
  }

  function initToggleWhenReady() {
    let attempts = 0;
    const timer = window.setInterval(() => {
      attempts += 1;

      if (setupToggle() || attempts > 80) {
        window.clearInterval(timer);
      }
    }, 100);
  }

  window.addEventListener("uxbridge:project-page-sync", (event) => {
    if (event.detail?.project) {
      applyProject(event.detail.project, event.detail.page?.id || requestedPageId);
      syncModeToBreakpointState({ preserveDirty: true });
      render();
    }
  });

  const mutationObserver = new MutationObserver(() => {
    if (!state.open) {
      syncToggleState();
      return;
    }

    syncModeToBreakpointState({ preserveDirty: true });
    render();
  });

  mutationObserver.observe(document.body, { attributes: true, attributeFilter: ["class"] });
  window.addEventListener("resize", syncLayout);
  window.addEventListener("uxbridge:drawer-open", () => window.requestAnimationFrame(syncLayout));
  window.addEventListener("uxbridge:preview-layout-change", () => window.requestAnimationFrame(syncLayout));

  initToggleWhenReady();
  void loadProject();
  render();
})();
