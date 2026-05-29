(function initFigmaImportRuntime() {
  if (window.__uxBridgeFigmaImportRuntime) {
    return;
  }

  window.__uxBridgeFigmaImportRuntime = true;

  const PROJECTS_API = "/api/projects";
  const FIGMA_API = "/api/figma";
  const MODAL_ID = "ux-figma-import-modal";
  const STYLE_ID = "ux-figma-import-styles";
  const pendingImports = new Map();
  const state = {
    open: false,
    loading: false,
    checkingConnection: false,
    configured: false,
    connected: false,
    savingToken: false,
    error: "",
    token: "",
    url: "",
  };

  function ensureStyles() {
    if (document.getElementById(STYLE_ID)) {
      return;
    }

    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      .figma-import-modal {
        position: fixed;
        inset: 0;
        z-index: 2147480000;
        display: grid;
        place-items: center;
        padding: 24px;
        background: rgba(15, 23, 42, 0.42);
        backdrop-filter: blur(12px);
      }

      .figma-import-dialog {
        width: min(460px, calc(100vw - 32px));
        border: 1px solid rgba(148, 163, 184, 0.24);
        border-radius: 28px;
        background: #ffffff;
        box-shadow: 0 28px 72px rgba(15, 23, 42, 0.24);
        color: #111827;
        font-family: Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        overflow: hidden;
      }

      .figma-import-dialog__body {
        display: grid;
        gap: 18px;
        padding: 28px;
      }

      .figma-import-dialog__eyebrow {
        margin: 0;
        color: #7c8497;
        font-size: 12px;
        font-weight: 800;
        letter-spacing: 0.18em;
        line-height: 1;
        text-transform: uppercase;
      }

      .figma-import-dialog h2 {
        margin: 0;
        font-size: 28px;
        line-height: 1.05;
        letter-spacing: 0;
      }

      .figma-import-dialog p {
        margin: 0;
        color: #64748b;
        font-size: 14px;
        line-height: 1.5;
      }

      .figma-import-dialog label {
        display: grid;
        gap: 8px;
        color: #64748b;
        font-size: 12px;
        font-weight: 800;
        letter-spacing: 0.12em;
        text-transform: uppercase;
      }

      .figma-import-dialog input {
        width: 100%;
        min-height: 52px;
        box-sizing: border-box;
        border: 1px solid rgba(148, 163, 184, 0.32);
        border-radius: 16px;
        padding: 0 16px;
        color: #111827;
        font: 600 14px/1.2 Inter, system-ui, sans-serif;
        outline: none;
      }

      .figma-import-dialog input:focus {
        border-color: #8b5cf6;
        box-shadow: 0 0 0 4px rgba(139, 92, 246, 0.14);
      }

      .figma-import-dialog input[type="password"] {
        font-family: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace;
        letter-spacing: 0;
      }

      .figma-import-dialog__error {
        padding: 12px 14px;
        border-radius: 14px;
        background: #fef2f2;
        color: #b91c1c !important;
        font-weight: 700;
      }

      .figma-import-dialog__actions {
        display: flex;
        justify-content: flex-end;
        gap: 10px;
      }

      .figma-import-dialog button {
        min-height: 44px;
        border: 0;
        border-radius: 999px;
        padding: 0 18px;
        font: 800 14px/1 Inter, system-ui, sans-serif;
        cursor: pointer;
      }

      .figma-import-dialog button:disabled {
        cursor: not-allowed;
        opacity: 0.58;
      }

      .figma-import-dialog__cancel {
        background: #f1f5f9;
        color: #334155;
      }

      .figma-import-dialog__submit {
        background: #252525;
        color: #ffffff;
      }

      .figma-import-dialog__connect {
        display: grid;
        gap: 12px;
        padding: 16px;
        border: 1px solid rgba(124, 58, 237, 0.18);
        border-radius: 18px;
        background: rgba(250, 245, 255, 0.72);
      }

      .figma-import-dialog__connect button {
        width: fit-content;
        background: #7c3aed;
        color: #ffffff;
      }

      .figma-import-dialog__connect-actions {
        display: flex;
        align-items: center;
        gap: 10px;
        flex-wrap: wrap;
      }

      .figma-import-dialog__connect-actions button[data-figma-import-disconnect] {
        background: transparent;
        color: #64748b;
        padding: 0 4px;
      }

      .figma-import-preview-loading {
        display: grid;
        place-items: center;
        min-height: 100%;
        padding: 32px;
        box-sizing: border-box;
        color: #111827;
        font-family: Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      }

      .figma-import-preview-loading__card {
        display: grid;
        justify-items: center;
        gap: 12px;
        width: min(320px, calc(100% - 32px));
        padding: 28px;
        border: 1px solid rgba(148, 163, 184, 0.28);
        border-radius: 24px;
        background: rgba(255, 255, 255, 0.92);
        box-shadow: 0 18px 48px rgba(15, 23, 42, 0.12);
        text-align: center;
      }

      .figma-import-preview-loading__spinner {
        width: 38px;
        height: 38px;
        border: 3px solid rgba(164, 41, 236, 0.18);
        border-top-color: #a429ec;
        border-radius: 999px;
        animation: figma-import-spin 800ms linear infinite;
      }

      .figma-import-preview-loading__title {
        margin: 0;
        color: #111827;
        font-size: 16px;
        font-weight: 800;
        line-height: 1.2;
      }

      .figma-import-preview-loading__copy {
        margin: 0;
        color: #64748b;
        font-size: 13px;
        font-weight: 600;
        line-height: 1.45;
      }

      .figma-import-preview-loading__retry {
        min-height: 38px;
        margin-top: 4px;
        border: 0;
        border-radius: 999px;
        padding: 0 16px;
        background: #252525;
        color: #ffffff;
        font: 800 13px/1 Inter, system-ui, sans-serif;
        cursor: pointer;
      }

      @keyframes figma-import-spin {
        to {
          transform: rotate(360deg);
        }
      }
    `;
    document.head.append(style);
  }

  function getProjectAndPageIds() {
    const params = new URLSearchParams(window.location.search);
    return {
      projectId: String(document.body.dataset.projectKey || params.get("project") || "").trim(),
      pageId: String(document.body.dataset.pageKey || params.get("page") || "").trim(),
    };
  }

  function closeModal() {
    state.open = false;
    state.loading = false;
    state.error = "";
    renderModal();
  }

  function openModal() {
    state.open = true;
    state.loading = false;
    state.checkingConnection = true;
    state.error = "";
    renderModal();
    void checkFigmaConnection();
  }

  function makeImportJobKey(projectId, pageId) {
    return `${projectId}::${pageId}`;
  }

  function rememberPendingImport(job) {
    const key = makeImportJobKey(job.projectId, job.pageId);
    pendingImports.set(key, job);
  }

  function forgetPendingImport(projectId, pageId) {
    const key = makeImportJobKey(projectId, pageId);
    pendingImports.delete(key);
  }

  function getPendingImport(projectId, pageId) {
    const key = makeImportJobKey(projectId, pageId);
    return pendingImports.get(key) || null;
  }

  function getCurrentPendingImport() {
    const { projectId, pageId } = getProjectAndPageIds();
    if (!projectId || !pageId) {
      return null;
    }
    return getPendingImport(projectId, pageId);
  }

  function getPreviewElements() {
    return {
      emptyShell: document.querySelector("[data-empty-mobile-shell]"),
      stage: document.querySelector("[data-vibe-mobile-stage]"),
      render: document.querySelector("[data-vibe-mobile-render]"),
    };
  }

  function setPreviewImportLoading(job) {
    const { emptyShell, stage, render } = getPreviewElements();
    if (!(stage instanceof HTMLElement) || !(render instanceof HTMLElement)) {
      return;
    }

    ensureStyles();
    const jobKey = makeImportJobKey(job.projectId, job.pageId);
    if (render.dataset.figmaImportJobKey === jobKey && render.querySelector("[data-figma-import-preview-loading]")) {
      return;
    }
    if (emptyShell instanceof HTMLElement) {
      emptyShell.hidden = true;
    }
    stage.hidden = false;
    render.innerHTML = `
      <div class="figma-import-preview-loading" data-figma-import-preview-loading>
        <div class="figma-import-preview-loading__card">
          <div class="figma-import-preview-loading__spinner" aria-hidden="true"></div>
          <p class="figma-import-preview-loading__title">Importing from Figma</p>
          <p class="figma-import-preview-loading__copy">You can keep working while this page updates in the background.</p>
        </div>
      </div>
    `;
    render.dataset.figmaImportJobKey = jobKey;
  }

  function setPreviewImportError(job, message) {
    const { emptyShell, stage, render } = getPreviewElements();
    if (!(stage instanceof HTMLElement) || !(render instanceof HTMLElement)) {
      return;
    }

    ensureStyles();
    if (emptyShell instanceof HTMLElement) {
      emptyShell.hidden = true;
    }
    stage.hidden = false;
    render.innerHTML = `
      <div class="figma-import-preview-loading" data-figma-import-preview-loading>
        <div class="figma-import-preview-loading__card">
          <p class="figma-import-preview-loading__title">Figma import failed</p>
          <p class="figma-import-preview-loading__copy">${escapeHtml(message)}</p>
          <button type="button" class="figma-import-preview-loading__retry" data-figma-import-retry>Try again</button>
        </div>
      </div>
    `;
    render.dataset.figmaImportJobKey = makeImportJobKey(job.projectId, job.pageId);
    render.querySelector("[data-figma-import-retry]")?.addEventListener("click", () => {
      state.url = job.figmaUrl || state.url;
      openModal();
    });
  }

  function syncCurrentPreviewImportLoading() {
    const job = getCurrentPendingImport();
    if (!job) {
      return;
    }
    setPreviewImportLoading(job);
  }

  async function checkFigmaConnection() {
    try {
      const returnTo = `${window.location.pathname}${window.location.search}${window.location.hash}`;
      const response = await fetch(`${FIGMA_API}?action=status&returnTo=${encodeURIComponent(returnTo)}`, {
        credentials: "include",
      });
      const payload = await response.json().catch(() => ({}));
      state.configured = Boolean(payload?.configured);
      state.connected = Boolean(payload?.connected);
      state.error = response.ok ? state.error : payload?.error || "Sign in before connecting Figma.";
    } catch {
      state.error = "Unable to check your Figma connection.";
    } finally {
      state.checkingConnection = false;
      renderModal();
    }
  }

  function renderModal() {
    ensureStyles();

    let modal = document.getElementById(MODAL_ID);

    if (!state.open) {
      modal?.remove();
      return;
    }

    if (!modal) {
      modal = document.createElement("div");
      modal.id = MODAL_ID;
      modal.className = "figma-import-modal";
      document.body.append(modal);
    }

    const canImport = state.connected && !state.checkingConnection;
    const connectionContent = state.checkingConnection
      ? `<p>Checking your Figma connection...</p>`
      : state.connected
        ? `<div class="figma-import-dialog__connect">
            <p>Your Figma Personal Access Token is saved for this account.</p>
            <div class="figma-import-dialog__connect-actions">
              <button type="button" data-figma-import-disconnect ${state.loading ? "disabled" : ""}>Replace token</button>
            </div>
          </div>`
        : `<div class="figma-import-dialog__connect">
            <p>Paste a Figma Personal Access Token so UX Bridge can read the frame you choose. This is saved only for your UX Bridge account.</p>
            <label>
              Personal Access Token
              <input type="password" data-figma-import-token placeholder="figd_..." value="${escapeAttribute(state.token)}" ${state.loading || state.savingToken ? "disabled" : ""} />
            </label>
            <div class="figma-import-dialog__connect-actions">
              <button type="button" data-figma-import-save-token ${state.loading || state.savingToken ? "disabled" : ""}>
                ${state.savingToken ? "Saving..." : "Save token"}
              </button>
            </div>
          </div>`;

    modal.innerHTML = `
      <form class="figma-import-dialog" data-figma-import-form>
        <div class="figma-import-dialog__body">
          <div>
            <p class="figma-import-dialog__eyebrow">Figma Import</p>
            <h2>Import from Figma</h2>
          </div>
          <p>Paste a Figma frame or layer URL. UX Bridge will recreate it in this preview with Codex.</p>
          ${connectionContent}
          <label>
            Figma URL
            <input type="url" data-figma-import-url placeholder="https://www.figma.com/design/..." value="${escapeAttribute(state.url)}" ${state.loading || !canImport ? "disabled" : ""} />
          </label>
          ${state.error ? `<p class="figma-import-dialog__error">${escapeHtml(state.error)}</p>` : ""}
          <div class="figma-import-dialog__actions">
            <button type="button" class="figma-import-dialog__cancel" data-figma-import-cancel ${state.loading ? "disabled" : ""}>Cancel</button>
            <button type="submit" class="figma-import-dialog__submit" ${state.loading || !canImport ? "disabled" : ""}>
              ${state.loading ? "Importing..." : "Import"}
            </button>
          </div>
        </div>
      </form>
    `;

    modal.onclick = (event) => {
      if (event.target === modal && !state.loading) {
        closeModal();
      }
    };

    modal.querySelector("[data-figma-import-cancel]")?.addEventListener("click", closeModal);
    modal.querySelector("[data-figma-import-save-token]")?.addEventListener("click", () => {
      void saveFigmaToken();
    });
    modal.querySelector("[data-figma-import-disconnect]")?.addEventListener("click", () => {
      void disconnectFigmaToken();
    });
    modal.querySelector("[data-figma-import-token]")?.addEventListener("input", (event) => {
      state.token = event.currentTarget.value;
    });
    modal.querySelector("[data-figma-import-url]")?.addEventListener("input", (event) => {
      state.url = event.currentTarget.value;
    });
    modal.querySelector("[data-figma-import-form]")?.addEventListener("submit", (event) => {
      event.preventDefault();
      void submitImport();
    });

    window.requestAnimationFrame(() => {
      if (canImport) {
        modal.querySelector("[data-figma-import-url]")?.focus();
      } else if (!state.checkingConnection) {
        modal.querySelector("[data-figma-import-token]")?.focus();
      }
    });
  }

  function escapeHtml(value) {
    return String(value || "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }

  function escapeAttribute(value) {
    return escapeHtml(value).replaceAll("\n", " ");
  }

  function submitImport() {
    const figmaUrl = String(state.url || "").trim();
    const { projectId, pageId } = getProjectAndPageIds();

    if (!figmaUrl) {
      state.error = "Paste a Figma URL first.";
      renderModal();
      return;
    }

    if (!projectId || !pageId) {
      state.error = "Open a project page before importing from Figma.";
      renderModal();
      return;
    }

    const existingJob = getPendingImport(projectId, pageId);
    if (existingJob) {
      closeModal();
      setPreviewImportLoading(existingJob);
      return;
    }

    const job = {
      projectId,
      pageId,
      figmaUrl,
      startedAt: Date.now(),
    };
    rememberPendingImport(job);
    closeModal();
    setPreviewImportLoading(job);
    void runImportInBackground(job);
  }

  async function runImportInBackground(job) {
    try {
      const response = await fetch(PROJECTS_API, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "importFigmaContent",
          project: job.projectId,
          page: job.pageId,
          figmaUrl: job.figmaUrl,
        }),
      });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok || !payload?.ok || !payload?.project) {
        if (payload?.code === "FIGMA_NOT_CONNECTED") {
          state.connected = false;
          void checkFigmaConnection();
        }
        throw new Error(payload?.error || "Unable to import that Figma design.");
      }

      forgetPendingImport(job.projectId, job.pageId);
      window.dispatchEvent(
        new CustomEvent("uxbridge:project-runtime-sync", {
          detail: { project: payload.project },
        }),
      );
    } catch (error) {
      forgetPendingImport(job.projectId, job.pageId);
      const message = error instanceof Error ? error.message : "Unable to import that Figma design.";
      const { projectId, pageId } = getProjectAndPageIds();
      if (projectId === job.projectId && pageId === job.pageId) {
        setPreviewImportError(job, message);
      }
    }
  }

  async function saveFigmaToken() {
    const token = String(state.token || "").trim();

    if (!token) {
      state.error = "Paste your Figma Personal Access Token first.";
      renderModal();
      return;
    }

    state.savingToken = true;
    state.error = "";
    renderModal();

    try {
      const response = await fetch(`${FIGMA_API}?action=save-token`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ token }),
      });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok || !payload?.ok) {
        throw new Error(payload?.error || "Unable to save that Figma token.");
      }

      state.connected = true;
      state.token = "";
    } catch (error) {
      state.error = error instanceof Error ? error.message : "Unable to save that Figma token.";
    } finally {
      state.savingToken = false;
      renderModal();
    }
  }

  async function disconnectFigmaToken() {
    state.savingToken = true;
    state.error = "";
    renderModal();

    try {
      await fetch(`${FIGMA_API}?action=disconnect`, {
        method: "POST",
        credentials: "include",
      });
    } catch {
      state.error = "Unable to replace the saved Figma token.";
    } finally {
      state.connected = false;
      state.savingToken = false;
      state.token = "";
      renderModal();
    }
  }

  function getImportButtonFromEventTarget(target) {
    if (!(target instanceof Element)) {
      return null;
    }

    const explicit = target.closest("[data-figma-import-open]");
    if (explicit instanceof HTMLElement) {
      return explicit;
    }

    const button = target.closest("button, [role='button'], a");
    if (!(button instanceof HTMLElement)) {
      return null;
    }

    if (!button.closest("[data-empty-mobile-shell]")) {
      return null;
    }

    if (button.textContent.trim().toLowerCase() !== "import from figma") {
      return null;
    }

    return button;
  }

  function isImportButton(element) {
    if (!(element instanceof HTMLElement)) {
      return false;
    }

    if (element.hasAttribute("data-figma-import-open")) {
      return true;
    }

    return element.closest("[data-empty-mobile-shell]") && element.textContent.trim().toLowerCase() === "import from figma";
  }

  function bindImportButtons(root = document) {
    root.querySelectorAll("button").forEach((button) => {
      if (!isImportButton(button) || button.dataset.figmaImportBound === "true") {
        return;
      }

      button.dataset.figmaImportBound = "true";
      button.addEventListener("click", (event) => {
        event.preventDefault();
        openModal();
      });
    });
  }

  document.addEventListener(
    "click",
    (event) => {
      const button = getImportButtonFromEventTarget(event.target);
      if (!button) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      openModal();
    },
    true,
  );

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && state.open && !state.loading) {
      event.preventDefault();
      closeModal();
    }
  });

  bindImportButtons();

  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (node instanceof Element) {
          bindImportButtons(node);
        }
      });
    });
    syncCurrentPreviewImportLoading();
  });

  observer.observe(document.documentElement, { childList: true, subtree: true });
  window.addEventListener("uxbridge:project-page-sync", () => {
    window.requestAnimationFrame(syncCurrentPreviewImportLoading);
  });
  window.addEventListener("popstate", () => {
    window.requestAnimationFrame(syncCurrentPreviewImportLoading);
  });
  syncCurrentPreviewImportLoading();
})();
