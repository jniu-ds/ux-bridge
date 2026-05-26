(function initFigmaImportRuntime() {
  if (window.__uxBridgeFigmaImportRuntime) {
    return;
  }

  window.__uxBridgeFigmaImportRuntime = true;

  const PROJECTS_API = "/api/projects";
  const MODAL_ID = "ux-figma-import-modal";
  const STYLE_ID = "ux-figma-import-styles";
  const state = {
    open: false,
    loading: false,
    error: "",
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
    state.error = "";
    renderModal();
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

    modal.innerHTML = `
      <form class="figma-import-dialog" data-figma-import-form>
        <div class="figma-import-dialog__body">
          <div>
            <p class="figma-import-dialog__eyebrow">Figma Import</p>
            <h2>Import from Figma</h2>
          </div>
          <p>Paste a Figma frame or layer URL. UX Bridge will recreate it in this preview with Codex.</p>
          <label>
            Figma URL
            <input type="url" data-figma-import-url placeholder="https://www.figma.com/design/..." value="${escapeAttribute(state.url)}" ${state.loading ? "disabled" : ""} />
          </label>
          ${state.error ? `<p class="figma-import-dialog__error">${escapeHtml(state.error)}</p>` : ""}
          <div class="figma-import-dialog__actions">
            <button type="button" class="figma-import-dialog__cancel" data-figma-import-cancel ${state.loading ? "disabled" : ""}>Cancel</button>
            <button type="submit" class="figma-import-dialog__submit" ${state.loading ? "disabled" : ""}>
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
    modal.querySelector("[data-figma-import-url]")?.addEventListener("input", (event) => {
      state.url = event.currentTarget.value;
    });
    modal.querySelector("[data-figma-import-form]")?.addEventListener("submit", (event) => {
      event.preventDefault();
      void submitImport();
    });

    window.requestAnimationFrame(() => {
      modal.querySelector("[data-figma-import-url]")?.focus();
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

  async function submitImport() {
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

    state.loading = true;
    state.error = "";
    renderModal();

    try {
      const response = await fetch(PROJECTS_API, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "importFigmaContent",
          project: projectId,
          page: pageId,
          figmaUrl,
        }),
      });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok || !payload?.ok || !payload?.project) {
        throw new Error(payload?.error || "Unable to import that Figma design.");
      }

      closeModal();
      window.dispatchEvent(
        new CustomEvent("uxbridge:project-runtime-sync", {
          detail: { project: payload.project },
        }),
      );
    } catch (error) {
      state.loading = false;
      state.error = error instanceof Error ? error.message : "Unable to import that Figma design.";
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
  });

  observer.observe(document.documentElement, { childList: true, subtree: true });
})();
