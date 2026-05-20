(function () {
  const PROJECTS_API = "/api/projects";
  const HIDDEN_ATTR = "data-ux-layer-hidden-control";
  const HOVER_HIDE_LABEL = "Hide layer";
  const HOVER_SHOW_LABEL = "Show layer";

  if (window.__uxBridgeLayerVisibilityControls) {
    return;
  }

  window.__uxBridgeLayerVisibilityControls = true;

  const style = document.createElement("style");
  style.textContent = `
    .preview-layer-visibility-control {
      position: fixed;
      z-index: 2147482001;
      width: 30px;
      height: 30px;
      border: 1px solid rgba(37, 99, 235, 0.18);
      border-radius: 999px;
      color: #2563eb;
      background: rgba(255, 255, 255, 0.94);
      box-shadow: 0 10px 24px rgba(15, 23, 42, 0.16);
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 0;
      cursor: pointer;
      opacity: 0;
      pointer-events: none;
      transform: translateY(-50%);
      transition: opacity 120ms ease, background 120ms ease, color 120ms ease, border-color 120ms ease;
    }

    .preview-layer-visibility-control.is-visible {
      opacity: 1;
      pointer-events: auto;
    }

    .preview-layer-visibility-control:hover,
    .preview-layer-visibility-control:focus-visible {
      color: #ffffff;
      background: #2563eb;
      border-color: #2563eb;
      outline: none;
    }

    .preview-layer-visibility-control svg {
      width: 17px;
      height: 17px;
      stroke: currentColor;
      stroke-width: 2;
      fill: none;
      stroke-linecap: round;
      stroke-linejoin: round;
    }

    .preview-layer-visibility-control[data-tooltip]::after {
      content: attr(data-tooltip);
      position: absolute;
      left: 50%;
      bottom: calc(100% + 8px);
      transform: translateX(-50%);
      white-space: nowrap;
      border-radius: 999px;
      padding: 6px 9px;
      color: #ffffff;
      background: #111827;
      box-shadow: 0 8px 18px rgba(15, 23, 42, 0.22);
      font: 700 11px/1.2 Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      opacity: 0;
      pointer-events: none;
      transition: opacity 120ms ease;
    }

    .preview-layer-visibility-control:hover::after,
    .preview-layer-visibility-control:focus-visible::after {
      opacity: 1;
    }

    [${HIDDEN_ATTR}="true"] {
      visibility: hidden !important;
      pointer-events: none !important;
    }
  `;
  document.head.append(style);

  const hoverButton = createButton(false);
  const hiddenButtons = new Map();
  let hoveredLayer = null;
  let currentProject = null;
  let currentPage = null;
  let saveTimer = null;

  document.body.append(hoverButton);

  function eyeIcon(hidden) {
    return hidden
      ? `
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M3 3l18 18"></path>
          <path d="M10.6 10.6a2 2 0 0 0 2.8 2.8"></path>
          <path d="M9.5 5.4A10.8 10.8 0 0 1 12 5c5 0 8.5 4 10 7a14 14 0 0 1-2.1 3.1"></path>
          <path d="M6.2 6.2A14.4 14.4 0 0 0 2 12c1.5 3 5 7 10 7a10.8 10.8 0 0 0 4.4-.9"></path>
        </svg>
      `
      : `
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z"></path>
          <circle cx="12" cy="12" r="3"></circle>
        </svg>
      `;
  }

  function createButton(hidden) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "preview-layer-visibility-control";
    button.setAttribute("data-preview-layer-visibility-control", "");
    button.setAttribute("aria-label", hidden ? HOVER_SHOW_LABEL : HOVER_HIDE_LABEL);
    button.setAttribute("data-tooltip", hidden ? "Unhide layer" : "Hide layer");
    button.innerHTML = eyeIcon(hidden);
    return button;
  }

  function getRenderRoot() {
    return document.querySelector("[data-vibe-mobile-render]");
  }

  function getProjectId() {
    return String(new URLSearchParams(window.location.search).get("project") || document.body.dataset.projectKey || "").trim();
  }

  function getPageId() {
    return String(new URLSearchParams(window.location.search).get("page") || document.body.dataset.pageKey || "").trim();
  }

  function isChromeElement(element) {
    return !!(
      element.closest("[data-preview-layer-visibility-control]") ||
      element.closest("[data-preview-dev-panel]") ||
      element.closest("[data-preview-inspector]") ||
      element.closest("[data-side-actions]") ||
      element.closest("[data-vibe-root]") ||
      element.closest("[data-comments-root]") ||
      element.closest("[data-customizer-root]")
    );
  }

  function isHiddenLayer(element) {
    return (
      element instanceof HTMLElement &&
      (element.getAttribute(HIDDEN_ATTR) === "true" ||
        element.getAttribute("data-ux-layer-visible") === "false" ||
        element.style.visibility === "hidden")
    );
  }

  function getLayerFromEventTarget(target) {
    const root = getRenderRoot();

    if (!(root instanceof HTMLElement) || !(target instanceof Element) || !root.contains(target) || isChromeElement(target)) {
      return null;
    }

    const marked = target.closest("[data-ux-layer-hovered], [data-ux-layer-selected], [data-ux-layer-candidate]");

    if (marked instanceof HTMLElement && root.contains(marked) && marked !== root && !isHiddenLayer(marked)) {
      return marked;
    }

    const layer = target.closest("section, article, header, footer, main, nav, aside, div, p, h1, h2, h3, h4, button, a, span, img, svg, canvas");

    return layer instanceof HTMLElement && root.contains(layer) && layer !== root && !isHiddenLayer(layer) ? layer : null;
  }

  function getLayerKey(layer) {
    if (!(layer instanceof HTMLElement)) {
      return "";
    }

    if (!layer.dataset.previewVisibilityKey) {
      layer.dataset.previewVisibilityKey = crypto.randomUUID ? crypto.randomUUID() : `layer-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    }

    return layer.dataset.previewVisibilityKey;
  }

  function positionButton(button, layer) {
    if (!(button instanceof HTMLElement) || !(layer instanceof HTMLElement)) {
      return false;
    }

    const rect = layer.getBoundingClientRect();

    if (rect.width <= 0 || rect.height <= 0) {
      return false;
    }

    const left = Math.max(6, Math.round(rect.left - 38));
    const top = Math.round(rect.top + Math.min(rect.height / 2, 28));
    button.style.left = `${left}px`;
    button.style.top = `${top}px`;
    return true;
  }

  function showHoverButton(layer) {
    hoveredLayer = layer;

    if (positionButton(hoverButton, layer)) {
      hoverButton.classList.add("is-visible");
    }
  }

  function hideHoverButton() {
    hoveredLayer = null;
    hoverButton.classList.remove("is-visible");
  }

  function setLayerHidden(layer, hidden) {
    if (!(layer instanceof HTMLElement)) {
      return;
    }

    if (hidden) {
      layer.setAttribute(HIDDEN_ATTR, "true");
      layer.setAttribute("data-ux-layer-visible", "false");
      layer.setAttribute("aria-hidden", "true");
      layer.style.visibility = "hidden";
      layer.style.pointerEvents = "none";
    } else {
      layer.removeAttribute(HIDDEN_ATTR);
      layer.setAttribute("data-ux-layer-visible", "true");
      layer.removeAttribute("aria-hidden");
      layer.style.visibility = "";
      layer.style.pointerEvents = "";
    }
  }

  function sanitizeHtmlForSave() {
    const root = getRenderRoot();

    if (!(root instanceof HTMLElement)) {
      return "";
    }

    const clone = root.cloneNode(true);

    if (!(clone instanceof HTMLElement)) {
      return "";
    }

    clone
      .querySelectorAll(
        "[data-ux-layer-hovered], [data-ux-layer-selected], [data-ux-layer-editing], [data-ux-layer-candidate], [data-ux-layer-drop-container], [data-ux-layer-drag-source]",
      )
      .forEach((element) => {
        [
          "data-ux-layer-hovered",
          "data-ux-layer-selected",
          "data-ux-layer-editing",
          "data-ux-layer-candidate",
          "data-ux-layer-drop-container",
          "data-ux-layer-drag-source",
        ].forEach((name) => element.removeAttribute(name));
      });

    clone.querySelectorAll("[data-preview-layer-visibility-control]").forEach((element) => element.remove());
    clone.removeAttribute("data-vibe-mobile-render");
    return clone.innerHTML.trim();
  }

  function getPreview() {
    return currentPage?.preview || currentPage?.vibe?.appliedDraft || {};
  }

  async function loadProjectIfNeeded() {
    const projectId = getProjectId();
    const pageId = getPageId();

    if (!projectId) {
      return false;
    }

    if (currentProject?.id === projectId && currentPage?.id === pageId) {
      return true;
    }

    const response = await fetch(`${PROJECTS_API}?project=${encodeURIComponent(projectId)}`, {
      credentials: "include",
      cache: "no-store",
    });
    const result = await response.json().catch(() => ({}));

    if (!response.ok || !result?.ok || !result?.project) {
      return false;
    }

    applyProject(result.project, pageId);
    return true;
  }

  function applyProject(project, pageId = getPageId()) {
    const normalizedPageId = String(pageId || "").trim().toLowerCase();
    const pages = Array.isArray(project?.pages) ? project.pages : [];
    currentProject = project || null;
    currentPage = pages.find((page) => String(page?.id || "").trim().toLowerCase() === normalizedPageId) || pages[0] || null;
  }

  function scheduleSave() {
    if (saveTimer) {
      window.clearTimeout(saveTimer);
    }

    saveTimer = window.setTimeout(() => {
      saveTimer = null;
      void saveNow();
    }, 420);
  }

  async function saveNow() {
    const html = sanitizeHtmlForSave();

    if (!html || !(await loadProjectIfNeeded()) || !currentProject || !currentPage) {
      return;
    }

    const preview = getPreview();
    const payload = {
      action: "savePreviewContentEdits",
      project: currentProject.id || getProjectId(),
      page: currentPage.id || getPageId(),
      html,
      css: String(preview.css || ""),
      js: String(preview.js || ""),
      stageStyle: String(preview.stageStyle || ""),
      summary: String(preview.summary || currentPage?.vibe?.summary || ""),
      syncBase: true,
      breakpointOverrides: preview.breakpointOverrides || {},
    };
    const response = await fetch(PROJECTS_API, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const result = await response.json().catch(() => ({}));

    if (response.ok && result?.ok && result?.project) {
      applyProject(result.project, payload.page);
      window.dispatchEvent(new CustomEvent("uxbridge:project-runtime-sync", { detail: { project: result.project } }));
    }
  }

  function updateHiddenButtons() {
    const root = getRenderRoot();
    const used = new Set();

    if (root instanceof HTMLElement) {
      root.querySelectorAll(`[${HIDDEN_ATTR}="true"], [data-ux-layer-visible="false"]`).forEach((layer) => {
        if (!(layer instanceof HTMLElement)) {
          return;
        }

        const key = getLayerKey(layer);
        let button = hiddenButtons.get(key);

        if (!button) {
          button = createButton(true);
          button.addEventListener("click", (event) => {
            event.preventDefault();
            event.stopPropagation();
            setLayerHidden(layer, false);
            button.remove();
            hiddenButtons.delete(key);
            scheduleSave();
            requestAnimationFrame(updateHiddenButtons);
          });
          document.body.append(button);
          hiddenButtons.set(key, button);
        }

        if (positionButton(button, layer)) {
          button.classList.add("is-visible");
          used.add(key);
        }
      });
    }

    hiddenButtons.forEach((button, key) => {
      if (!used.has(key)) {
        button.remove();
        hiddenButtons.delete(key);
      }
    });
  }

  hoverButton.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();

    if (!(hoveredLayer instanceof HTMLElement)) {
      return;
    }

    const layer = hoveredLayer;
    hideHoverButton();
    setLayerHidden(layer, true);
    scheduleSave();
    requestAnimationFrame(updateHiddenButtons);
  });

  document.addEventListener(
    "pointermove",
    (event) => {
      const layer = getLayerFromEventTarget(event.target);

      if (layer) {
        showHoverButton(layer);
      } else if (!(event.target instanceof Element) || !event.target.closest("[data-preview-layer-visibility-control]")) {
        hideHoverButton();
      }

      updateHiddenButtons();
    },
    true,
  );

  document.addEventListener(
    "scroll",
    () => {
      if (hoveredLayer instanceof HTMLElement) {
        showHoverButton(hoveredLayer);
      }

      updateHiddenButtons();
    },
    true,
  );

  window.addEventListener("resize", updateHiddenButtons);
  window.addEventListener("uxbridge:preview-scale-change", updateHiddenButtons);
  window.addEventListener("uxbridge:preview-layout-change", updateHiddenButtons);
  window.addEventListener("uxbridge:project-page-sync", (event) => {
    const detail = event instanceof CustomEvent ? event.detail || {} : {};
    applyProject(detail.project, detail.page?.id || getPageId());
    requestAnimationFrame(updateHiddenButtons);
  });
  window.addEventListener("uxbridge:project-runtime-sync", (event) => {
    const detail = event instanceof CustomEvent ? event.detail || {} : {};
    applyProject(detail.project, getPageId());
    requestAnimationFrame(updateHiddenButtons);
  });

  const observer = new MutationObserver(() => {
    requestAnimationFrame(updateHiddenButtons);
  });

  const observeWhenReady = () => {
    const root = getRenderRoot();

    if (root instanceof HTMLElement) {
      observer.observe(root, { childList: true, subtree: true, attributes: true, attributeFilter: [HIDDEN_ATTR, "data-ux-layer-visible", "style"] });
      updateHiddenButtons();
      void loadProjectIfNeeded();
      return;
    }

    window.setTimeout(observeWhenReady, 250);
  };

  observeWhenReady();
})();
