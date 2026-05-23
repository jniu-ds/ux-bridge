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
    cssFullValue: "",
    cssFilterSignature: "",
    cssShowAll: false,
    allowCssRefilterFromSelection: false,
    jsFullValue: "",
    jsFilterSignature: "",
    jsShowAll: false,
    allowJsRefilterFromSelection: false,
    overridesValue: "",
    renderedMode: "",
    renderedBreakpointMode: null,
    hoveredHtmlLine: -1,
    hoveredCssRule: null,
    hoveredJsBlock: null,
    hoveredOverridePath: "",
    previewHoveredHtmlLine: -1,
    previewHoveredLayerPath: "",
    previewSelectedLayerPath: "",
    selectedHtmlLine: -1,
    suppressHtmlCaretSelectUntil: 0,
    activePreviewHoverElement: null,
    activePreviewHoverElements: [],
    autosaveTimer: 0,
    saveRequestId: 0,
    pendingAutosavePayload: null,
    codeHistory: [],
    codeHistoryIndex: -1,
    codeHistoryMode: "",
    codeHistoryLine: -1,
    renderingLivePreview: false,
    previewDomSyncFrame: 0,
    codeEditingUntil: 0,
    panelWidth: 300,
    resizingPanel: false,
    resizeStartX: 0,
    resizeStartWidth: 300,
    overridesPaneHeight: 0,
    resizingOverridesPane: false,
    overridesResizeStartY: 0,
    overridesResizeStartHeight: 0,
    overridesDirty: false,
    pendingBreakpointCodeSave: false,
    overridesSyncTimer: 0,
    layerTogglePointerActivatedUntil: 0,
  };
  let previewStateObserver = null;
  const previewHoverOverlays = [];
  let previewHoverOverlayFrame = 0;

  const style = document.createElement("style");
  style.textContent = `
    .preview-dev-divider {
      width: 32px;
      height: 1px;
      margin: 2px 0;
      background: rgba(37, 37, 37, 0.14);
    }

    .preview-dev-panel {
      --preview-dev-editor-padding-top: 14px;
      --preview-dev-editor-line-height: 18.6px;
      --preview-dev-panel-min-width: 300px;
      position: fixed;
      top: 0;
      right: 0;
      bottom: 0;
      z-index: 1315;
      display: grid;
      grid-template-rows: auto minmax(0, 1fr);
      width: var(--preview-dev-panel-width, 300px);
      min-width: var(--preview-dev-panel-min-width, 300px);
      max-width: var(--preview-dev-panel-width, 300px);
      box-sizing: border-box;
      overflow: visible;
      pointer-events: none;
      opacity: 0;
      transform: translateX(8px);
      transition: opacity 0.18s ease, right 0.24s cubic-bezier(.22,1,.36,1), transform 0.24s cubic-bezier(.22,1,.36,1);
      border-left: 1px solid rgba(148, 163, 184, 0.18);
      border-right: 1px solid rgba(15, 23, 42, 0.8);
      background: #0f172a;
      backdrop-filter: blur(18px);
      box-shadow: -18px 0 38px rgba(2, 6, 23, 0.34);
    }

    .preview-dev-panel__resize-handle {
      position: absolute;
      top: 0;
      bottom: 0;
      left: -4px;
      z-index: 12;
      width: 8px;
      cursor: ew-resize;
      background: transparent;
      touch-action: none;
    }

    .preview-dev-panel__resize-handle::after {
      content: "";
      position: absolute;
      top: 0;
      bottom: 0;
      left: 3px;
      width: 1px;
      background: transparent;
      transition: background 0.12s ease;
    }

    .preview-dev-panel__resize-handle:hover::after,
    .preview-dev-panel__resize-handle:focus-visible::after,
    body.preview-dev-resizing .preview-dev-panel__resize-handle::after {
      background: rgba(164, 41, 236, 0.72);
    }

    body.preview-dev-resizing,
    body.preview-dev-resizing * {
      cursor: ew-resize !important;
      user-select: none !important;
    }

    body.preview-dev-open .preview-dev-panel {
      opacity: 1;
      pointer-events: auto;
      transform: translateX(0);
    }

    body.breakpoint-specific-active .preview-dev-panel,
    .preview-dev-panel.is-breakpoint-active {
      background:
        linear-gradient(135deg, rgba(164, 41, 236, 0.2) 0%, rgba(164, 41, 236, 0.08) 100%),
        #111827;
      border-color: rgba(164, 41, 236, 0.38);
    }

    .preview-dev-layer-hover-overlay {
      position: fixed;
      z-index: 1295;
      pointer-events: none;
      box-sizing: border-box;
      border: 2px solid #2563eb;
      border-radius: 2px;
      opacity: 0;
      transform: translate3d(0, 0, 0);
      transition: opacity 0.08s ease;
      box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.62), 0 10px 24px rgba(37, 99, 235, 0.22);
    }

    .preview-dev-layer-hover-overlay.is-visible {
      opacity: 1;
    }

    .preview-dev-layer-hover-overlay.is-breakpoint-override {
      border-color: #A429EC;
      box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.62), 0 10px 24px rgba(164, 41, 236, 0.24);
    }

    .preview-dev-layer-hover-overlay__label {
      position: absolute;
      left: -2px;
      top: calc(100% + 6px);
      width: max-content;
      max-width: 240px;
      padding: 6px 9px;
      border-radius: 999px;
      background: #2563eb;
      color: #ffffff;
      font-size: 12px;
      font-weight: 700;
      line-height: 1;
      letter-spacing: 0;
      box-shadow: 0 12px 24px rgba(37, 99, 235, 0.24);
    }

    .preview-dev-layer-hover-overlay.is-breakpoint-override .preview-dev-layer-hover-overlay__label {
      background: #A429EC;
      box-shadow: 0 12px 24px rgba(164, 41, 236, 0.26);
    }

    .preview-dev-panel__header {
      display: grid;
      gap: 12px;
      padding: 18px 16px 12px;
      border-bottom: 1px solid rgba(148, 163, 184, 0.16);
    }

    .preview-dev-panel__title-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
    }

    .preview-dev-panel__eyebrow {
      margin: 0;
      color: #94a3b8;
      font-size: 11px;
      font-weight: 800;
      letter-spacing: 0.16em;
      line-height: 1.1;
      text-transform: uppercase;
    }

    .preview-dev-panel__title {
      margin: 2px 0 0;
      color: #f8fafc;
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
      color: #94a3b8;
      background: transparent;
      display: grid;
      place-items: center;
      padding: 0;
    }

    .preview-dev-panel__close:hover,
    .preview-dev-panel__close:focus-visible {
      color: #f8fafc;
      background: rgba(148, 163, 184, 0.14);
      border-color: rgba(148, 163, 184, 0.2);
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
      border: 1px solid rgba(148, 163, 184, 0.16);
      border-radius: 12px;
      background: rgba(15, 23, 42, 0.62);
    }

    .preview-dev-panel__tab {
      min-width: 0;
      border: 0;
      border-radius: 9px;
      padding: 8px 6px;
      color: #94a3b8;
      background: transparent;
      font-size: 12px;
      font-weight: 800;
      line-height: 1;
    }

    .preview-dev-panel__tab.is-active {
      color: #dbeafe;
      background: rgba(37, 99, 235, 0.34);
    }

    .preview-dev-panel.is-breakpoint-active .preview-dev-panel__tab.is-active {
      color: #f3e8ff;
      background: rgba(164, 41, 236, 0.34);
    }

    .preview-dev-panel__body {
      min-height: 0;
      position: relative;
      overflow: hidden;
      display: block;
      background: #020617;
    }

    .preview-dev-panel__body.has-filter-footer .preview-dev-panel__code,
    .preview-dev-panel__body.has-filter-footer .preview-dev-panel__editor {
      padding-bottom: 58px;
    }

    .preview-dev-panel__split {
      min-height: 0;
      display: grid;
      grid-template-rows: minmax(0, 1fr) var(--preview-dev-overrides-pane-height, minmax(0, 1fr));
      background: #020617;
    }

    .preview-dev-panel__split-pane {
      min-height: 0;
      position: relative;
      overflow: hidden;
      background: #020617;
    }

    .preview-dev-panel__split-pane:not(.preview-dev-panel__split-pane--overrides) > .preview-dev-panel__body {
      height: 100%;
    }

    .preview-dev-panel__split-pane--overrides {
      display: grid;
      grid-template-rows: auto minmax(0, 1fr);
      border-top: 1px solid rgba(164, 41, 236, 0.3);
      background:
        linear-gradient(135deg, rgba(164, 41, 236, 0.1), rgba(2, 6, 23, 0) 62%),
        #020617;
    }

    .preview-dev-panel__split-resize-handle {
      position: absolute;
      top: -4px;
      left: 0;
      right: 0;
      z-index: 7;
      height: 8px;
      cursor: ns-resize;
      background: transparent;
      touch-action: none;
    }

    .preview-dev-panel__split-resize-handle::after {
      content: "";
      position: absolute;
      top: 3px;
      left: 0;
      right: 0;
      height: 1px;
      background: transparent;
      transition: background 0.12s ease;
    }

    .preview-dev-panel__split-resize-handle:hover::after,
    .preview-dev-panel__split-resize-handle:focus-visible::after,
    body.preview-dev-overrides-resizing .preview-dev-panel__split-resize-handle::after {
      background: rgba(164, 41, 236, 0.78);
    }

    .preview-dev-panel__section-header {
      z-index: 5;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      min-height: 50px;
      box-sizing: border-box;
      padding: 12px 16px;
      border-bottom: 1px solid rgba(148, 163, 184, 0.16);
      background:
        linear-gradient(135deg, rgba(164, 41, 236, 0.14), rgba(15, 23, 42, 0) 58%),
        rgba(15, 23, 42, 0.92);
      box-shadow: 0 1px 0 rgba(2, 6, 23, 0.62);
    }

    .preview-dev-panel__section-heading {
      margin: 0;
      color: #f8fafc;
      font-size: 15px;
      font-weight: 850;
      letter-spacing: 0;
      line-height: 1;
    }

    .preview-dev-panel__section-meta {
      flex: 0 0 auto;
      color: #c084fc;
      font-size: 10px;
      font-weight: 800;
      letter-spacing: 0.12em;
      line-height: 1;
      text-transform: uppercase;
      opacity: 0.82;
    }

    .preview-dev-panel__code,
    .preview-dev-panel__editor {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      min-width: 0;
      min-height: 100%;
      box-sizing: border-box;
      margin: 0;
      border: 0;
      border-radius: 0;
      padding: var(--preview-dev-editor-padding-top) 16px 14px 78px;
      overflow: auto;
      font: 12px/1.55 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
      tab-size: 2;
      white-space: pre;
      overflow-wrap: normal;
    }

    .preview-dev-panel__filter-footer {
      position: absolute;
      left: 0;
      right: 0;
      top: var(--preview-dev-filter-footer-top, 0px);
      z-index: 8;
      display: flex;
      justify-content: center;
      box-sizing: border-box;
      padding: 8px 12px 16px;
      pointer-events: none;
      background: #020617;
    }

    .preview-dev-panel__see-all {
      pointer-events: auto;
      width: 100%;
      border: 1px solid rgba(96, 165, 250, 0.32);
      border-radius: 10px;
      padding: 9px 12px;
      color: #bfdbfe;
      background: rgba(37, 99, 235, 0.2);
      font-size: 12px;
      font-weight: 800;
      line-height: 1;
      box-shadow: 0 10px 20px rgba(2, 6, 23, 0.26);
    }

    .preview-dev-panel__see-all:hover,
    .preview-dev-panel__see-all:focus-visible {
      color: #ffffff;
      background: rgba(37, 99, 235, 0.32);
      border-color: rgba(147, 197, 253, 0.54);
    }

    .preview-dev-panel.is-breakpoint-active .preview-dev-panel__see-all {
      color: #f3e8ff;
      background: rgba(164, 41, 236, 0.24);
      border-color: rgba(216, 180, 254, 0.42);
    }

    .preview-dev-panel.is-breakpoint-active .preview-dev-panel__see-all:hover,
    .preview-dev-panel.is-breakpoint-active .preview-dev-panel__see-all:focus-visible {
      background: rgba(164, 41, 236, 0.36);
      border-color: rgba(233, 213, 255, 0.58);
    }

    .preview-dev-panel__code {
      z-index: 1;
      pointer-events: none;
      color: #dbeafe;
      background: transparent;
    }

    .preview-dev-panel__row-highlights {
      position: absolute;
      inset: 0;
      z-index: 0;
      overflow: hidden;
      pointer-events: none;
    }

    .preview-dev-panel__line-numbers {
      position: absolute;
      inset: 0 auto 0 0;
      z-index: 3;
      width: 38px;
      overflow: hidden;
      pointer-events: none;
      color: #64748b;
      background: linear-gradient(90deg, rgba(2, 6, 23, 0.96), rgba(2, 6, 23, 0.72));
      border-right: 1px solid rgba(148, 163, 184, 0.12);
      font: 12px/1.55 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
      text-align: right;
      user-select: none;
    }

    .preview-dev-panel__line-number {
      position: absolute;
      left: 0;
      right: 7px;
      height: var(--preview-dev-editor-line-height);
      line-height: var(--preview-dev-editor-line-height);
    }

    .preview-dev-panel__line-number.is-selected {
      color: #dbeafe;
      font-weight: 800;
    }

    .preview-dev-panel.is-breakpoint-active .preview-dev-panel__line-number.is-selected {
      color: #f3e8ff;
    }

    .preview-dev-panel__row-highlight {
      position: absolute;
      left: 0;
      right: 0;
      height: var(--preview-dev-editor-line-height);
      background: rgba(96, 165, 250, 0.11);
      box-shadow: inset 2px 0 0 rgba(96, 165, 250, 0.7);
    }

    .preview-dev-panel__row-highlight.is-selected {
      background: rgba(37, 99, 235, 0.18);
      box-shadow: inset 2px 0 0 rgba(96, 165, 250, 0.95);
    }

    .preview-dev-panel.is-breakpoint-active .preview-dev-panel__row-highlight {
      background: rgba(164, 41, 236, 0.14);
      box-shadow: inset 2px 0 0 rgba(164, 41, 236, 0.78);
    }

    .preview-dev-panel.is-breakpoint-active .preview-dev-panel__row-highlight.is-selected {
      background: rgba(164, 41, 236, 0.22);
      box-shadow: inset 2px 0 0 rgba(164, 41, 236, 0.95);
    }

    .preview-dev-panel__code code {
      font: inherit;
    }

    .preview-dev-panel__empty-message {
      position: absolute;
      top: var(--preview-dev-editor-padding-top);
      left: 16px;
      right: 16px;
      z-index: 9;
      display: flex;
      align-items: center;
      justify-content: center;
      box-sizing: border-box;
      width: auto;
      min-height: 96px;
      border: 1px solid rgba(148, 163, 184, 0.18);
      border-radius: 10px;
      padding: 16px 18px;
      color: #94a3b8;
      background: rgba(15, 23, 42, 0.78);
      font-size: 12px;
      font-weight: 750;
      line-height: 1.2;
      text-align: center;
      pointer-events: none;
    }

    .preview-dev-panel__empty-message[hidden] {
      display: none;
    }

    .preview-dev-panel__body.is-empty-code .preview-dev-panel__row-highlights,
    .preview-dev-panel__body.is-empty-code .preview-dev-panel__line-numbers,
    .preview-dev-panel__body.is-empty-code .preview-dev-panel__layer-gutter,
    .preview-dev-panel__body.is-empty-code .preview-dev-panel__code,
    .preview-dev-panel__body.is-empty-code .preview-dev-panel__editor {
      display: none;
    }

    .preview-dev-panel__body.is-empty-code .preview-dev-panel__filter-footer {
      top: calc(var(--preview-dev-editor-padding-top) + 106px);
      background: transparent;
    }

    .preview-dev-panel__token--tag,
    .preview-dev-panel__token--keyword {
      color: #60a5fa;
      font-weight: 700;
    }

    .preview-dev-panel__token--punctuation {
      color: #94a3b8;
    }

    .preview-dev-panel__token--attr,
    .preview-dev-panel__token--property {
      color: #c084fc;
    }

    .preview-dev-panel__token--string,
    .preview-dev-panel__token--value {
      color: #34d399;
    }

    .preview-dev-panel__token--number {
      color: #fbbf24;
    }

    .preview-dev-panel__token--comment {
      color: #64748b;
      font-style: italic;
    }

    .preview-dev-panel__token--operator {
      color: #f472b6;
    }

    .preview-dev-panel__editor {
      z-index: 2;
      resize: none;
      color: transparent;
      caret-color: #f8fafc;
      background: transparent;
      outline: none;
      -webkit-text-fill-color: transparent;
    }

    .preview-dev-panel__layer-gutter {
      position: absolute;
      top: 0;
      bottom: 0;
      left: 38px;
      z-index: 4;
      width: 36px;
      overflow: hidden;
      pointer-events: auto;
    }

    .preview-dev-panel__layer-toggle {
      position: absolute;
      left: 8px;
      display: grid;
      width: 22px;
      height: 22px;
      box-sizing: border-box;
      padding: 0;
      place-items: center;
      appearance: none;
      -webkit-appearance: none;
      border: 0;
      border-radius: 999px;
      color: #94a3b8;
      background: transparent;
      line-height: 0;
      overflow: visible;
      opacity: 0;
      pointer-events: none;
      transition: opacity 0.12s ease, color 0.12s ease, background 0.12s ease;
    }

    .preview-dev-panel__layer-toggle.is-visible {
      opacity: 1;
      pointer-events: auto;
    }

    .preview-dev-panel__layer-toggle.is-hidden {
      color: #c084fc;
      opacity: 1;
      pointer-events: auto;
    }

    .preview-dev-panel__layer-toggle:hover {
      color: #f8fafc;
      background: rgba(148, 163, 184, 0.16);
    }

    .preview-dev-panel__layer-toggle.is-hidden:hover {
      color: #f3e8ff;
      background: rgba(164, 41, 236, 0.2);
    }

    .preview-dev-panel__layer-toggle svg {
      display: block;
      width: 15px;
      height: 15px;
      fill: none;
      stroke: currentColor;
      stroke-width: 2;
      stroke-linecap: round;
      stroke-linejoin: round;
    }

    .preview-dev-panel.is-breakpoint-active .preview-dev-panel__editor {
      caret-color: #f3e8ff;
    }

    .preview-dev-panel__footer {
      display: grid;
      gap: 10px;
      padding: 12px 16px 16px;
      border-top: 1px solid rgba(148, 163, 184, 0.16);
      background: rgba(15, 23, 42, 0.86);
    }

    .preview-dev-panel__status {
      min-height: 16px;
      color: #94a3b8;
      font-size: 12px;
      font-weight: 700;
      line-height: 1.3;
    }

    .preview-dev-panel__status.is-error {
      color: #f87171;
    }

    .preview-dev-panel__actions {
      display: flex;
      justify-content: flex-end;
      gap: 8px;
    }

    .preview-dev-panel__button {
      min-height: 36px;
      border: 1px solid rgba(148, 163, 184, 0.2);
      border-radius: 999px;
      padding: 0 13px;
      color: #e2e8f0;
      background: rgba(30, 41, 59, 0.92);
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

    body.preview-dev-open.preview-viewport-responsive {
      --bridge-side-actions-offset: var(--preview-dev-panel-width, 300px) !important;
      --bridge-side-actions-reserved: calc(var(--bridge-side-actions-width, 88px) + var(--preview-dev-panel-width, 300px)) !important;
      --bridge-responsive-right-inset: var(--bridge-side-actions-reserved) !important;
    }

    body.preview-dev-open.preview-viewport-responsive.customizer-open {
      --bridge-responsive-right-inset: calc(var(--bridge-side-actions-reserved) + var(--customizer-drawer-width)) !important;
    }

    body.preview-dev-open.preview-viewport-responsive.comments-open {
      --bridge-responsive-right-inset: calc(var(--bridge-side-actions-reserved) + var(--comments-drawer-width)) !important;
    }

    body.preview-dev-open.preview-viewport-responsive.uploads-open {
      --bridge-responsive-right-inset: calc(var(--bridge-side-actions-reserved) + var(--uploads-drawer-width)) !important;
    }

    body.preview-dev-open.preview-viewport-responsive.vibe-open {
      --bridge-responsive-right-inset: calc(var(--bridge-side-actions-reserved) + var(--vibe-drawer-width)) !important;
    }

    body.preview-dev-open.preview-viewport-responsive.inspector-open {
      --bridge-responsive-right-inset: calc(var(--bridge-side-actions-reserved) + var(--inspector-drawer-width)) !important;
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

  function tokenizePattern(value, pattern, classify) {
    const source = String(value || "");
    let output = "";
    let cursor = 0;

    source.replace(pattern, (match, ...args) => {
      const offset = args[args.length - 2];
      output += escapeHtml(source.slice(cursor, offset));
      output += classify(match, ...args);
      cursor = offset + match.length;
      return match;
    });

    return output + escapeHtml(source.slice(cursor));
  }

  function highlightHtml(value) {
    const highlightTag = (tag) => {
      if (tag.startsWith("<!--")) {
        return `<span class="preview-dev-panel__token--comment">${escapeHtml(tag)}</span>`;
      }

      const parts = tag.match(/^(<\/?)([A-Za-z][\w:-]*)([\s\S]*?)(\/?>)$/);

      if (!parts) {
        return `<span class="preview-dev-panel__token--tag">${escapeHtml(tag)}</span>`;
      }

      const [, open, name, attrs = "", close] = parts;
      const highlightedAttrs = tokenizePattern(
        attrs,
        /(\s+)([^\s=/>]+)(?:\s*(=)\s*("(?:(?:\\")|[^"])*"|'(?:(?:\\')|[^'])*'|[^\s>]+))?/g,
        (match, space, attrName, equals, attrValue) => {
          let output = escapeHtml(space);
          output += `<span class="preview-dev-panel__token--attr">${escapeHtml(attrName)}</span>`;

          if (equals) {
            output += `<span class="preview-dev-panel__token--operator">${escapeHtml(equals)}</span>`;
          }

          if (attrValue) {
            output += `<span class="preview-dev-panel__token--string">${escapeHtml(attrValue)}</span>`;
          }

          return output;
        },
      );

      return [
        `<span class="preview-dev-panel__token--punctuation">${escapeHtml(open)}</span>`,
        `<span class="preview-dev-panel__token--tag">${escapeHtml(name)}</span>`,
        highlightedAttrs,
        `<span class="preview-dev-panel__token--punctuation">${escapeHtml(close)}</span>`,
      ].join("");
    };

    return tokenizePattern(
      value,
      /<!--[\s\S]*?-->|<\/?[A-Za-z][^>\s/]*(?:\s+[^\s=/>]+(?:=(?:"[^"]*"|'[^']*'|[^\s>]+))?)*\s*\/?>/g,
      highlightTag,
    );
  }

  function highlightCss(value) {
    return tokenizePattern(
      value,
      /\/\*[\s\S]*?\*\/|#[0-9a-fA-F]{3,8}\b|(?:^|[;{\s])(--?[\w-]+)(?=\s*:)|\b-?\d*\.?\d+(?:px|rem|em|%|vh|vw|ms|s)?\b|"[^"]*"|'[^']*'/g,
      (match) => {
        if (match.startsWith("/*")) {
          return `<span class="preview-dev-panel__token--comment">${escapeHtml(match)}</span>`;
        }
        if (/^["']/.test(match)) {
          return `<span class="preview-dev-panel__token--string">${escapeHtml(match)}</span>`;
        }
        if (/#[0-9a-fA-F]/.test(match)) {
          return `<span class="preview-dev-panel__token--value">${escapeHtml(match)}</span>`;
        }
        if (/\d/.test(match.trim()[0] || "")) {
          return `<span class="preview-dev-panel__token--number">${escapeHtml(match)}</span>`;
        }
        return escapeHtml(match).replace(/(--?[\w-]+)/, `<span class="preview-dev-panel__token--property">$1</span>`);
      },
    );
  }

  function highlightJs(value) {
    return tokenizePattern(
      value,
      /\/\/.*|\/\*[\s\S]*?\*\/|`(?:\\[\s\S]|[^`])*`|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|\b(?:const|let|var|function|return|if|else|for|while|await|async|try|catch|new|class|import|export|from|true|false|null|undefined)\b|\b-?\d*\.?\d+\b/g,
      (match) => {
        if (match.startsWith("//") || match.startsWith("/*")) {
          return `<span class="preview-dev-panel__token--comment">${escapeHtml(match)}</span>`;
        }
        if (/^[`"']/.test(match)) {
          return `<span class="preview-dev-panel__token--string">${escapeHtml(match)}</span>`;
        }
        if (/^-?\d/.test(match)) {
          return `<span class="preview-dev-panel__token--number">${escapeHtml(match)}</span>`;
        }
        return `<span class="preview-dev-panel__token--keyword">${escapeHtml(match)}</span>`;
      },
    );
  }

  function highlightJson(value) {
    return tokenizePattern(
      value,
      /"(?:\\.|[^"\\])*"(?=\s*:)|"(?:\\.|[^"\\])*"|[-]?\b\d*\.?\d+\b|\b(?:true|false|null)\b/g,
      (match) => {
        if (match.endsWith('"') && /"\s*$/.test(match)) {
          return `<span class="preview-dev-panel__token--string">${escapeHtml(match)}</span>`;
        }
        if (/^-?\d/.test(match)) {
          return `<span class="preview-dev-panel__token--number">${escapeHtml(match)}</span>`;
        }
        if (/^(true|false|null)$/.test(match)) {
          return `<span class="preview-dev-panel__token--keyword">${escapeHtml(match)}</span>`;
        }
        return `<span class="preview-dev-panel__token--property">${escapeHtml(match)}</span>`;
      },
    );
  }

  function highlightCode(value, mode = state.mode) {
    if (mode === "css") {
      return highlightCss(value);
    }
    if (mode === "js") {
      return highlightJs(value);
    }
    if (mode === "overrides") {
      return highlightJson(value);
    }
    return highlightHtml(value);
  }

  function hasAvailableCode(value) {
    return Boolean(
      String(value || "")
        .replace(/[\u200b-\u200f\ufeff]/g, "")
        .replace(/\u00a0/g, " ")
        .trim(),
    );
  }

  function formatHtmlForEditor(value) {
    const source = String(value || "").trim();

    if (!source) {
      return "";
    }

    const block = source
      .replace(/>\s+</g, ">\n<")
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
    const inlineTags = new Set(["a", "b", "br", "code", "em", "i", "img", "input", "label", "path", "span", "strong"]);
    let depth = 0;

    return block
      .map((line) => {
        const closing = /^<\//.test(line);
        const tagMatch = line.match(/^<\/?([A-Za-z][\w:-]*)/);
        const tagName = String(tagMatch?.[1] || "").toLowerCase();
        const selfClosing = /\/>$/.test(line) || /^<(area|base|br|col|embed|hr|img|input|link|meta|param|source|track|wbr)\b/i.test(line);
        const compact = inlineTags.has(tagName) && !line.includes("\n");

        if (closing) {
          depth = Math.max(0, depth - 1);
        }

        const formatted = `${"  ".repeat(depth)}${line}`;

        if (!closing && !selfClosing && !compact && /^</.test(line) && !/<\/[A-Za-z][\w:-]*>$/.test(line)) {
          depth += 1;
        }

        return formatted;
      })
      .join("\n");
  }

  function formatCssForEditor(value) {
    const source = String(value || "").trim();

    if (!source) {
      return "";
    }

    let output = "";
    let depth = 0;
    let quote = "";
    let parenDepth = 0;
    let pendingSpace = false;

    const appendIndent = () => {
      output += "  ".repeat(Math.max(0, depth));
    };

    const appendNewline = () => {
      output = output.replace(/[ \t]+$/g, "");
      if (!output.endsWith("\n")) {
        output += "\n";
      }
      appendIndent();
      pendingSpace = false;
    };

    for (let index = 0; index < source.length; index += 1) {
      const char = source[index];
      const previous = source[index - 1] || "";

      if (quote) {
        output += char;
        if (char === quote && previous !== "\\") {
          quote = "";
        }
        continue;
      }

      if (char === '"' || char === "'") {
        if (pendingSpace && output && !/[\s({:;,>]$/.test(output)) {
          output += " ";
        }
        pendingSpace = false;
        quote = char;
        output += char;
        continue;
      }

      if (char === "(") {
        parenDepth += 1;
        output += char;
        continue;
      }

      if (char === ")") {
        parenDepth = Math.max(0, parenDepth - 1);
        output += char;
        continue;
      }

      if (/\s/.test(char)) {
        pendingSpace = true;
        continue;
      }

      if (pendingSpace && output && !/[\s({:;,>]$/.test(output) && !/[{};]/.test(char)) {
        output += " ";
      }
      pendingSpace = false;

      if (char === "{" && parenDepth === 0) {
        output = output.replace(/[ \t]+$/g, "");
        output += " {\n";
        depth += 1;
        appendIndent();
        continue;
      }

      if (char === "}" && parenDepth === 0) {
        depth = Math.max(0, depth - 1);
        output = output.replace(/[ \t]+$/g, "");
        if (!output.endsWith("\n")) {
          output += "\n";
        }
        appendIndent();
        output += "}";
        if (source[index + 1] && source[index + 1] !== "}") {
          appendNewline();
        }
        continue;
      }

      if (char === ";" && parenDepth === 0) {
        output += ";";
        appendNewline();
        continue;
      }

      if (char === "," && parenDepth === 0 && depth === 0) {
        output += ",";
        appendNewline();
        continue;
      }

      if (char === ":" && parenDepth === 0) {
        output = output.replace(/[ \t]+$/g, "");
        output += ": ";
        continue;
      }

      output += char;
    }

    return output
      .split("\n")
      .map((line) => line.replace(/[ \t]+$/g, ""))
      .join("\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  }

  function getPreview() {
    return state.page?.preview || state.page?.vibe?.appliedDraft || {};
  }

  const CODE_OVERRIDE_LAYER_PATH = "__preview_code__";
  const CODE_OVERRIDE_ATTRS = {
    html: "data-ux-preview-html",
    css: "data-ux-preview-css",
    js: "data-ux-preview-js",
  };

  function getBreakpointMode() {
    return (
      document.body.classList.contains("breakpoint-specific-active") ||
      !!document.querySelector(".preview-inspector__content--breakpoint-specific-active")
    );
  }

  function getInspectorBreakpoints() {
    const defaults = [
      { id: "mobile-xs", label: "Mobile & Extra Small", start: 320, end: 480 },
      { id: "tablet-sm", label: "Tablet & Small", start: 481, end: 768 },
      { id: "laptop-md", label: "Laptop & Medium", start: 769, end: 1024 },
      { id: "desktop-lg", label: "Large Desktop", start: 1025, end: null },
    ];
    const configured = Array.isArray(state.project?.inspectorBreakpoints) ? state.project.inspectorBreakpoints : [];

    return defaults.map((fallback, index) => {
      const breakpoint = configured[index] && typeof configured[index] === "object" ? configured[index] : {};
      const start = Number.parseInt(String(breakpoint.start ?? fallback.start), 10);
      const rawEnd = breakpoint.end ?? fallback.end;
      const end =
        rawEnd == null || String(rawEnd).trim() === "" || String(rawEnd).trim().toLowerCase() === "none"
          ? null
          : Number.parseInt(String(rawEnd), 10);

      return {
        id: fallback.id,
        label: String(breakpoint.label || fallback.label),
        start: Number.isFinite(start) ? Math.max(0, start) : fallback.start,
        end: Number.isFinite(end) && end > 0 ? end : null,
      };
    });
  }

  function getCurrentBreakpointId() {
    const scopeLabel = document.querySelector("[data-preview-inspector-breakpoint-scope-label]");
    const labelText = scopeLabel instanceof HTMLElement ? scopeLabel.textContent?.replace(/\+$/, "").trim() : "";
    const breakpoints = getInspectorBreakpoints();
    const matchedByLabel = breakpoints.find((breakpoint) => breakpoint.label === labelText);

    if (getBreakpointMode() && matchedByLabel) {
      return matchedByLabel.id;
    }

    const root = getPreviewRenderRoot();
    const width = root instanceof Element ? Math.round(root.getBoundingClientRect().width || 0) : 0;
    const matchedByWidth = breakpoints.find((breakpoint) => width >= breakpoint.start && (breakpoint.end == null || width <= breakpoint.end));

    return matchedByWidth?.id || breakpoints[breakpoints.length - 1]?.id || "";
  }

  function getPreviewCodeOverride(preview = getPreview()) {
    const breakpointId = getCurrentBreakpointId();
    const override = preview?.breakpointOverrides?.[CODE_OVERRIDE_LAYER_PATH]?.[breakpointId];
    const attrs = override && typeof override === "object" && override.attrs && typeof override.attrs === "object" ? override.attrs : null;

    if (!breakpointId || !attrs) {
      return null;
    }

    return {
      html: Object.prototype.hasOwnProperty.call(attrs, CODE_OVERRIDE_ATTRS.html) ? String(attrs[CODE_OVERRIDE_ATTRS.html] || "") : null,
      css: Object.prototype.hasOwnProperty.call(attrs, CODE_OVERRIDE_ATTRS.css) ? String(attrs[CODE_OVERRIDE_ATTRS.css] || "") : null,
      js: Object.prototype.hasOwnProperty.call(attrs, CODE_OVERRIDE_ATTRS.js) ? String(attrs[CODE_OVERRIDE_ATTRS.js] || "") : null,
    };
  }

  function getEffectivePreview(preview = getPreview(), options = {}) {
    const requireBreakpointMode = options.requireBreakpointMode !== false;

    if (requireBreakpointMode && !getBreakpointMode()) {
      return preview || {};
    }

    const codeOverride = getPreviewCodeOverride(preview);

    if (!codeOverride) {
      return preview || {};
    }

    return {
      ...(preview || {}),
      html: codeOverride.html == null ? String(preview?.html || "") : codeOverride.html,
      css: codeOverride.css == null ? String(preview?.css || "") : codeOverride.css,
      js: codeOverride.js == null ? String(preview?.js || "") : codeOverride.js,
    };
  }

  function hasCurrentBreakpointOverride(layerPath) {
    if (!getBreakpointMode()) {
      return false;
    }

    const path = String(layerPath || "").trim();
    const breakpointId = getCurrentBreakpointId();
    const overrides = parseOverridesValue();
    const layerOverrides = path && overrides ? overrides[path] : null;

    return !!(
      path &&
      breakpointId &&
      layerOverrides &&
      typeof layerOverrides === "object" &&
      Object.prototype.hasOwnProperty.call(layerOverrides, breakpointId)
    );
  }

  function getModeTabs() {
    return [
      { id: "html", label: "HTML" },
      { id: "css", label: "CSS" },
      { id: "js", label: "JavaScript" },
    ];
  }

  function getContentForMode(mode = state.mode) {
    const preview = getEffectivePreview();

    if (mode === "css") {
      const cssValue = formatCssForEditor(preview.css || state.cssFullValue || "");
      return state.cssShowAll ? cssValue : getFilteredCssForSelectedLayer(cssValue);
    }

    if (mode === "js") {
      const jsValue = String(preview.js || state.jsFullValue || "");
      return state.jsShowAll ? jsValue : getFilteredJsForSelectedLayer(jsValue);
    }

    if (mode === "overrides") {
      return JSON.stringify(preview.breakpointOverrides || {}, null, 2);
    }

    return formatHtmlForEditor(preview.html || "");
  }

  function getEditorLineFromOffset(value, offset) {
    return String(value || "").slice(0, Math.max(0, offset || 0)).split("\n").length - 1;
  }

  function resetCodeHistory(value = state.editorValue) {
    state.codeHistory = [{ value: String(value || ""), line: -1 }];
    state.codeHistoryIndex = 0;
    state.codeHistoryMode = state.mode;
    state.codeHistoryLine = -1;
  }

  function commitCodeHistory(value, line = -1) {
    const nextValue = String(value || "");

    if (state.codeHistoryMode !== state.mode) {
      resetCodeHistory(nextValue);
      state.codeHistory[0].line = line;
      state.codeHistoryLine = line;
      return;
    }

    const current = state.codeHistory[state.codeHistoryIndex];

    if (current?.value === nextValue) {
      state.codeHistoryLine = line;
      return;
    }

    if (state.codeHistoryIndex < state.codeHistory.length - 1) {
      state.codeHistory = state.codeHistory.slice(0, state.codeHistoryIndex + 1);
    }

    if (current && current.line === line && line >= 0) {
      state.codeHistory[state.codeHistoryIndex] = { value: nextValue, line };
    } else {
      state.codeHistory.push({ value: nextValue, line });
      state.codeHistoryIndex = state.codeHistory.length - 1;
    }

    state.codeHistoryLine = line;
  }

  function applyCodeHistoryStep(direction, editor) {
    if (state.codeHistoryMode !== state.mode || state.codeHistory.length <= 1) {
      return false;
    }

    const nextIndex = Math.max(0, Math.min(state.codeHistory.length - 1, state.codeHistoryIndex + direction));

    if (nextIndex === state.codeHistoryIndex) {
      return false;
    }

    state.codeHistoryIndex = nextIndex;
    state.editorValue = state.codeHistory[state.codeHistoryIndex]?.value || "";
    state.dirty = true;
    state.error = "";
    state.status = "";

    if (editor instanceof HTMLTextAreaElement) {
      const scrollTop = editor.scrollTop;
      const scrollLeft = editor.scrollLeft;
      editor.value = state.editorValue;
      editor.scrollTop = scrollTop;
      editor.scrollLeft = scrollLeft;
    }

    syncHighlightText();
    applyLivePreview();
    scheduleAutosave();
    return true;
  }

  function syncModeToBreakpointState({ preserveDirty = false } = {}) {
    const tabs = getModeTabs();

    if (!tabs.some((tab) => tab.id === state.mode)) {
      state.mode = tabs[0]?.id || "html";
      preserveDirty = false;
    }

    if (state.mode === "css") {
      state.cssFullValue = formatCssForEditor(getEffectivePreview().css || "");
      state.cssFilterSignature = getCssFilterSignature();
    } else if (state.mode === "js") {
      state.jsFullValue = String(getEffectivePreview().js || "");
      state.jsFilterSignature = getJsFilterSignature();
    }

    if (!preserveDirty || !state.dirty) {
      state.editorValue = getContentForMode(state.mode);
      state.dirty = false;
      resetCodeHistory();
    }

    if (!preserveDirty || !state.overridesDirty) {
      state.overridesValue = getContentForMode("overrides");
      state.overridesDirty = false;
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
    const drawerWidth = getActiveDrawerWidth();
    const panelWidth = Math.max(300, Math.round(Number(state.panelWidth) || 300));
    const sideActions = document.querySelector("[data-side-actions]");
    const sideActionsOffset = state.open ? drawerWidth + panelWidth : drawerWidth;

    state.panelWidth = panelWidth;
    panel.style.setProperty("--preview-dev-panel-width", `${panelWidth}px`);
    panel.style.right = `${drawerWidth}px`;
    document.body.classList.toggle("preview-dev-open", state.open);
    document.body.style.setProperty("--preview-dev-panel-width", `${panelWidth}px`);
    document.body.style.setProperty("--bridge-side-actions-offset", state.open ? `${panelWidth}px` : "0px");
    document.body.style.setProperty("--bridge-side-actions-reserved", state.open ? `calc(var(--bridge-side-actions-width, 88px) + ${panelWidth}px)` : "var(--bridge-side-actions-width, 88px)");

    if (sideActions instanceof HTMLElement && !document.body.classList.contains("preview-viewport-responsive")) {
      sideActions.style.setProperty("right", `${sideActionsOffset}px`, "important");
    } else if (sideActions instanceof HTMLElement) {
      sideActions.style.removeProperty("right");
    }
  }

  function getDevModeLayoutState() {
    return {
      panelWidth: Math.max(300, Math.round(Number(state.panelWidth) || 300)),
      overridesPaneHeight: Math.max(0, Math.round(Number(state.overridesPaneHeight) || 0)),
    };
  }

  function emitDevModeLayoutChange() {
    try {
      window.dispatchEvent(
        new CustomEvent("uxbridge:preview-dev-layout-change", {
          detail: getDevModeLayoutState(),
        }),
      );
    } catch {
      // Layout memory is best-effort and should never block editing.
    }
  }

  function setDevModeLayoutState(nextState = {}) {
    const nextPanelWidth = Number(nextState.panelWidth);
    const nextOverridesPaneHeight = Number(nextState.overridesPaneHeight);

    if (Number.isFinite(nextPanelWidth) && nextPanelWidth >= 300) {
      state.panelWidth = Math.max(300, Math.min(getMaxPanelWidth(), Math.round(nextPanelWidth)));
    }

    if (Number.isFinite(nextOverridesPaneHeight) && nextOverridesPaneHeight > 0) {
      state.overridesPaneHeight = clampOverridesPaneHeight(nextOverridesPaneHeight);
    }

    syncLayout();
    syncOverridesPaneLayout();
    emitDevModeLayoutChange();
  }

  window.UXBridgeDevModeLayout = {
    getState: getDevModeLayoutState,
    setState: setDevModeLayoutState,
  };

  function getMaxPanelWidth() {
    const drawerWidth = getActiveDrawerWidth();
    const sideActionsWidth =
      Number.parseFloat(window.getComputedStyle(document.body).getPropertyValue("--bridge-side-actions-width")) ||
      document.querySelector("[data-side-actions]")?.getBoundingClientRect?.().width ||
      88;
    const availableWidth = Math.max(300, window.innerWidth - drawerWidth - sideActionsWidth - 64);

    return Math.max(300, Math.floor(availableWidth));
  }

  function startPanelResize(event) {
    state.resizingPanel = true;
    state.resizeStartX = event.clientX;
    state.resizeStartWidth = Math.max(300, Math.round(Number(state.panelWidth) || 300));
    document.body.classList.add("preview-dev-resizing");

    try {
      event.target?.setPointerCapture?.(event.pointerId);
    } catch {
      // Pointer capture is a progressive enhancement here.
    }
  }

  function updatePanelResize(event) {
    if (!state.resizingPanel) {
      return;
    }

    const delta = state.resizeStartX - event.clientX;
    state.panelWidth = Math.max(300, Math.min(getMaxPanelWidth(), Math.round(state.resizeStartWidth + delta)));
    syncLayout();
    schedulePreviewHoverOverlaySync();
  }

  function endPanelResize() {
    if (!state.resizingPanel) {
      return;
    }

    state.resizingPanel = false;
    document.body.classList.remove("preview-dev-resizing");
    emitDevModeLayoutChange();
  }

  function getOverridesPaneBounds() {
    const split = panel.querySelector("[data-preview-dev-split]");
    const header = panel.querySelector("[data-preview-dev-overrides-header]");

    if (!(split instanceof HTMLElement) || !(header instanceof HTMLElement)) {
      return { min: 50, max: 50 };
    }

    const splitRect = split.getBoundingClientRect();
    const headerRect = header.getBoundingClientRect();
    const min = Math.max(1, Math.ceil(headerRect.height || 50));
    const max = Math.max(min, Math.floor(splitRect.height || min));

    return { min, max };
  }

  function clampOverridesPaneHeight(value) {
    const { min, max } = getOverridesPaneBounds();
    const numericValue = Number(value);

    if (!Number.isFinite(numericValue) || numericValue <= 0) {
      return 0;
    }

    return Math.max(min, Math.min(max, Math.round(numericValue)));
  }

  function syncOverridesPaneLayout() {
    const split = panel.querySelector("[data-preview-dev-split]");

    if (!(split instanceof HTMLElement)) {
      return;
    }

    if (!state.overridesPaneHeight) {
      split.style.removeProperty("--preview-dev-overrides-pane-height");
      return;
    }

    state.overridesPaneHeight = clampOverridesPaneHeight(state.overridesPaneHeight);
    split.style.setProperty("--preview-dev-overrides-pane-height", `${state.overridesPaneHeight}px`);
  }

  function startOverridesPaneResize(event) {
    const { min, max } = getOverridesPaneBounds();
    const overridesPane = panel.querySelector("[data-preview-dev-overrides-pane]");
    const currentHeight = overridesPane instanceof HTMLElement ? overridesPane.getBoundingClientRect().height : (min + max) / 2;

    state.resizingOverridesPane = true;
    state.overridesResizeStartY = event.clientY;
    state.overridesResizeStartHeight = Math.max(min, Math.min(max, Math.round(currentHeight)));
    document.body.classList.add("preview-dev-overrides-resizing");

    try {
      event.target?.setPointerCapture?.(event.pointerId);
    } catch {
      // Pointer capture is a progressive enhancement here.
    }
  }

  function updateOverridesPaneResize(event) {
    if (!state.resizingOverridesPane) {
      return;
    }

    const delta = state.overridesResizeStartY - event.clientY;
    state.overridesPaneHeight = clampOverridesPaneHeight(state.overridesResizeStartHeight + delta);
    syncOverridesPaneLayout();
    syncHighlightScroll();
  }

  function endOverridesPaneResize() {
    if (!state.resizingOverridesPane) {
      return;
    }

    state.resizingOverridesPane = false;
    document.body.classList.remove("preview-dev-overrides-resizing");
    emitDevModeLayoutChange();
  }

  function syncHighlightScroll() {
    const editor = panel.querySelector("[data-preview-dev-editor]");
    const code = panel.querySelector("[data-preview-dev-code]");
    const overridesEditor = panel.querySelector("[data-preview-dev-overrides-editor]");
    const overridesCode = panel.querySelector("[data-preview-dev-overrides-code]");

    if (editor instanceof HTMLTextAreaElement && code instanceof HTMLElement) {
      code.scrollTop = editor.scrollTop;
      code.scrollLeft = editor.scrollLeft;
    }

    if (overridesEditor instanceof HTMLTextAreaElement && overridesCode instanceof HTMLElement) {
      overridesCode.scrollTop = overridesEditor.scrollTop;
      overridesCode.scrollLeft = overridesEditor.scrollLeft;
    }

    syncLineNumbers();
    syncOverridesLineNumbers();
    syncHtmlLayerDecorations();
    syncCssLayerDecorations();
    syncJsLayerDecorations();
    syncOverridesLayerDecorations();
  }

  function syncHighlightText() {
    const code = panel.querySelector("[data-preview-dev-code]");
    const overridesCode = panel.querySelector("[data-preview-dev-overrides-code]");

    if (code) {
      code.innerHTML = `${highlightCode(state.editorValue, state.mode)}\n`;
    }

    if (overridesCode) {
      overridesCode.innerHTML = `${highlightCode(state.overridesValue, "overrides")}\n`;
    }

    syncLineNumbers();
    syncOverridesLineNumbers();
    syncEmptyCodeMessage();
    syncHtmlLayerDecorations();
    syncOverridesLayerDecorations();
  }

  function syncEmptyCodeMessage() {
    const message = panel.querySelector("[data-preview-dev-empty-message]");

    if (!(message instanceof HTMLElement)) {
      return;
    }

    const shouldShow = (state.mode === "css" || state.mode === "js") && !hasAvailableCode(state.editorValue);
    message.hidden = !shouldShow;
    message.closest(".preview-dev-panel__body")?.classList.toggle("is-empty-code", shouldShow);
  }

  function getEditorLineCount(value = state.editorValue) {
    return Math.max(1, String(value || "").split("\n").length);
  }

  function getSelectedCodeLine() {
    if (state.mode === "html" && state.selectedHtmlLine >= 0) {
      return state.selectedHtmlLine;
    }

    const editor = panel.querySelector("[data-preview-dev-editor]");

    if (editor instanceof HTMLTextAreaElement && document.activeElement === editor) {
      return getEditorLineFromOffset(editor.value, editor.selectionStart || 0);
    }

    return -1;
  }

  function syncLineNumbers() {
    const lineNumbers = panel.querySelector("[data-preview-dev-line-numbers]");
    const editor = panel.querySelector("[data-preview-dev-editor]");

    if (!(lineNumbers instanceof HTMLElement)) {
      return;
    }

    const lineHeight =
      editor instanceof HTMLTextAreaElement ? getEditorMetric(editor, "line-height", 18.6) : Number.parseFloat(getComputedStyle(document.documentElement).fontSize) || 18.6;
    const paddingTop = editor instanceof HTMLTextAreaElement ? getEditorMetric(editor, "padding-top", 14) : 14;
    const scrollTop = editor instanceof HTMLTextAreaElement ? editor.scrollTop || 0 : 0;
    const selectedLine = getSelectedCodeLine();

    lineNumbers.innerHTML = Array.from({ length: getEditorLineCount() }, (_, index) => {
      const top = paddingTop + index * lineHeight - scrollTop;
      const selectedClass = index === selectedLine ? " is-selected" : "";

      return `<span class="preview-dev-panel__line-number${selectedClass}" style="top: ${top}px;">${index + 1}</span>`;
    }).join("");

    syncFilterFooterPosition();
  }

  function syncFilterFooterPosition() {
    const footer = panel.querySelector("[data-preview-dev-css-filter-footer], [data-preview-dev-js-filter-footer]");
    const editor = panel.querySelector("[data-preview-dev-editor]");

    if (!(footer instanceof HTMLElement) || !(editor instanceof HTMLTextAreaElement)) {
      return;
    }

    const lineHeight = getEditorMetric(editor, "line-height", 18.6);
    const paddingTop = getEditorMetric(editor, "padding-top", 14);
    const lineCount = getEditorLineCount(state.editorValue);
    const top = paddingTop + lineCount * lineHeight + 2 - editor.scrollTop;

    footer.style.setProperty("--preview-dev-filter-footer-top", `${Math.max(0, top)}px`);
  }

  function parseOverridesValue() {
    try {
      const parsed = JSON.parse(state.overridesValue || "{}");
      return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : null;
    } catch {
      return null;
    }
  }

  function getJsonKeyBlockLineRange(value, key) {
    const lines = String(value || "").split("\n");
    const keyToken = JSON.stringify(String(key || ""));
    const start = lines.findIndex((line) => line.trim().startsWith(`${keyToken}:`));

    if (start < 0) {
      return null;
    }

    let depth = 0;
    let hasOpened = false;

    for (let line = start; line < lines.length; line += 1) {
      const source = lines[line] || "";

      for (let index = 0; index < source.length; index += 1) {
        const char = source[index];

        if (char === "{") {
          depth += 1;
          hasOpened = true;
        } else if (char === "}") {
          depth -= 1;
        }
      }

      if (hasOpened && depth <= 0) {
        return { start, end: line };
      }
    }

    return { start, end: start };
  }

  function getOverrideLayerPathForLine(line) {
    const normalizedLine = Number.isInteger(line) && line >= 0 ? line : -1;
    const overrides = parseOverridesValue();

    if (normalizedLine < 0 || !overrides) {
      return "";
    }

    return (
      Object.keys(overrides).find((layerPath) => {
        const range = getJsonKeyBlockLineRange(state.overridesValue, layerPath);
        return !!range && normalizedLine >= range.start && normalizedLine <= range.end;
      }) || ""
    );
  }

  function getOverrideLayerPathFromPointer(event) {
    const editor = panel.querySelector("[data-preview-dev-overrides-editor]");

    if (!(editor instanceof HTMLTextAreaElement)) {
      return "";
    }

    const rect = editor.getBoundingClientRect();
    const lineHeight = getEditorMetric(editor, "line-height", 18.6);
    const paddingTop = getEditorMetric(editor, "padding-top", 14);
    const nextLine = Math.max(0, Math.floor((event.clientY - rect.top + editor.scrollTop - paddingTop) / lineHeight));

    return getOverrideLayerPathForLine(nextLine);
  }

  function getSelectedOverrideLines() {
    const selectedLayerPaths = getSelectedPreviewLayerPaths();
    const overrides = parseOverridesValue();
    const selectedOverrideLines = new Set();

    if (!selectedLayerPaths.length || !overrides) {
      return selectedOverrideLines;
    }

    selectedLayerPaths.forEach((layerPath) => {
      if (!Object.prototype.hasOwnProperty.call(overrides, layerPath)) {
        return;
      }

      const range = getJsonKeyBlockLineRange(state.overridesValue, layerPath);

      if (!range) {
        return;
      }

      for (let line = range.start; line <= range.end; line += 1) {
        selectedOverrideLines.add(line);
      }
    });

    return selectedOverrideLines;
  }

  function syncOverridesLineNumbers() {
    const lineNumbers = panel.querySelector("[data-preview-dev-overrides-line-numbers]");
    const editor = panel.querySelector("[data-preview-dev-overrides-editor]");

    if (!(lineNumbers instanceof HTMLElement)) {
      return;
    }

    const lineHeight =
      editor instanceof HTMLTextAreaElement ? getEditorMetric(editor, "line-height", 18.6) : Number.parseFloat(getComputedStyle(document.documentElement).fontSize) || 18.6;
    const paddingTop = editor instanceof HTMLTextAreaElement ? getEditorMetric(editor, "padding-top", 14) : 14;
    const scrollTop = editor instanceof HTMLTextAreaElement ? editor.scrollTop || 0 : 0;
    const selectedLine =
      editor instanceof HTMLTextAreaElement && document.activeElement === editor ? getEditorLineFromOffset(editor.value, editor.selectionStart || 0) : -1;
    const selectedOverrideLines = getSelectedOverrideLines();

    lineNumbers.innerHTML = Array.from({ length: getEditorLineCount(state.overridesValue) }, (_, index) => {
      const top = paddingTop + index * lineHeight - scrollTop;
      const selectedClass = index === selectedLine || selectedOverrideLines.has(index) ? " is-selected" : "";

      return `<span class="preview-dev-panel__line-number${selectedClass}" style="top: ${top}px;">${index + 1}</span>`;
    }).join("");
  }

  function getEditorMetric(editor, property, fallback) {
    const value = Number.parseFloat(window.getComputedStyle(editor).getPropertyValue(property));
    return Number.isFinite(value) && value > 0 ? value : fallback;
  }

  function getHtmlLayerRows(value = state.editorValue) {
    if (state.mode !== "html") {
      return [];
    }

    let ordinal = -1;
    const rows = [];

    String(value || "")
      .split("\n")
      .forEach((line, index) => {
        const tagPattern = /<([A-Za-z][\w:-]*)(?=[\s>/])[^>]*>/g;
        let match = tagPattern.exec(line);

        while (match) {
          ordinal += 1;
          rows.push({
            line: index,
            ordinal,
            tagStart: match.index,
            tagEnd: match.index + match[0].length,
            hidden: isHtmlLayerHidden(match[0]),
          });
          match = tagPattern.exec(line);
        }
      });

    return rows;
  }

  function getCssRules(value = state.editorValue) {
    if (state.mode !== "css") {
      return [];
    }

    const lines = String(value || "").split("\n");
    const rules = [];
    let pendingStart = -1;
    let pendingSelector = "";
    let activeRule = null;
    let depth = 0;

    lines.forEach((line, index) => {
      const trimmed = line.trim();

      if (!activeRule && !pendingSelector && !trimmed) {
        return;
      }

      if (!activeRule && pendingStart < 0 && trimmed) {
        pendingStart = index;
      }

      let cursor = 0;

      while (cursor < line.length) {
        const openIndex = line.indexOf("{", cursor);
        const closeIndex = line.indexOf("}", cursor);

        if (activeRule) {
          if (closeIndex >= 0 && (openIndex < 0 || closeIndex < openIndex)) {
            depth -= 1;
            cursor = closeIndex + 1;

            if (depth <= 0) {
              activeRule.end = index;
              rules.push(activeRule);
              activeRule = null;
              pendingStart = -1;
              pendingSelector = "";
              depth = 0;
            }
            continue;
          }

          if (openIndex >= 0) {
            depth += 1;
            cursor = openIndex + 1;
            continue;
          }

          break;
        }

        if (openIndex < 0) {
          pendingSelector += `${line.slice(cursor)}\n`;
          break;
        }

        pendingSelector += line.slice(cursor, openIndex);
        const selector = pendingSelector.trim();
        const selectors = selector
          .split(",")
          .map((entry) => entry.trim())
          .filter(Boolean);

        if (selector && !selector.startsWith("@") && selectors.length) {
          activeRule = {
            start: pendingStart >= 0 ? pendingStart : index,
            end: index,
            selector,
            selectors,
          };
        }

        depth = 1;
        cursor = openIndex + 1;

        if (!activeRule) {
          pendingStart = -1;
          pendingSelector = "";
        }
      }

      if (activeRule) {
        activeRule.end = index;
      }
    });

    return rules;
  }

  function getCssRuleSource(value, rule) {
    const lines = String(value || "").split("\n");

    if (!rule || !Number.isInteger(rule.start) || !Number.isInteger(rule.end)) {
      return "";
    }

    return lines.slice(rule.start, rule.end + 1).join("\n");
  }

  function selectorMatchesElement(selector, element) {
    if (!(element instanceof Element)) {
      return false;
    }

    try {
      return element.matches(selector);
    } catch {
      return false;
    }
  }

  function cssRuleMatchesElements(rule, elements) {
    if (!rule?.selectors?.length || !Array.isArray(elements) || !elements.length) {
      return false;
    }

    return rule.selectors.some((selector) => elements.some((element) => selectorMatchesElement(selector, element)));
  }

  function getSelectedCssLayerElements() {
    const root = getPreviewRenderRoot();

    if (!(root instanceof Element)) {
      return [];
    }

    const selectedElements = Array.from(root.querySelectorAll('[data-ux-layer-selected]:not([data-ux-layer-selected="false"])')).filter(
      (element) => element instanceof Element,
    );

    const explicitSelection = root.matches('[data-ux-layer-selected]:not([data-ux-layer-selected="false"])') ? [root, ...selectedElements] : selectedElements;

    if (explicitSelection.length) {
      return explicitSelection;
    }

    const persistedSelection = state.previewSelectedLayerPath ? getPreviewElementForLayerPath(state.previewSelectedLayerPath) : null;
    if (persistedSelection instanceof Element) {
      return [persistedSelection];
    }

    if ((state.mode === "css" || state.mode === "js") && (state.cssFilterSignature || state.jsFilterSignature)) {
      const signature = state.mode === "js" && state.jsFilterSignature ? state.jsFilterSignature : state.cssFilterSignature;
      return signature
        .split("|")
        .map((layerPath) => getPreviewElementForLayerPath(layerPath))
        .filter((element) => element instanceof Element);
    }

    return [];
  }

  function getSelectedCssRules(value) {
    const selectedElements = getSelectedCssLayerElements();

    if (!selectedElements.length) {
      return [];
    }

    return getCssRules(value).filter((rule) => cssRuleMatchesElements(rule, selectedElements));
  }

  function getCssFilterSignature() {
    return getSelectedCssLayerElements()
      .map((element) => getPreviewLayerPathForElement(element))
      .filter(Boolean)
      .join("|");
  }

  function getFilteredCssForSelectedLayer(value) {
    const selectedRules = getSelectedCssRules(value);

    if (!getSelectedCssLayerElements().length) {
      return String(value || "");
    }

    return selectedRules.map((rule) => getCssRuleSource(value, rule)).filter(Boolean).join("\n\n");
  }

  function isCssFilteredViewActive() {
    if (state.mode !== "css" || state.cssShowAll) {
      return false;
    }

    const fullCss = String(state.cssFullValue || getEffectivePreview().css || "");
    const hasFilterTarget = Boolean(state.cssFilterSignature || getCssFilterSignature());
    const isShowingFilteredContent = String(state.editorValue || "") !== fullCss;

    return hasFilterTarget || isShowingFilteredContent;
  }

  function getCssOutputValue() {
    const fullCss = String(state.cssFullValue || getEffectivePreview().css || "");

    if (state.mode !== "css" || state.cssShowAll || !getSelectedCssLayerElements().length) {
      return state.mode === "css" ? state.editorValue : fullCss;
    }

    const fullRules = getCssRules(fullCss);
    const editedRules = getCssRules(state.editorValue);
    const selectedElements = getSelectedCssLayerElements();

    if (hasAvailableCode(state.editorValue) && !editedRules.length) {
      return fullCss;
    }

    const editedSources = editedRules.map((rule) => getCssRuleSource(state.editorValue, rule));
    const editedBySelector = new Map();

    editedRules.forEach((rule) => {
      const key = rule.selector;
      const entries = editedBySelector.get(key) || [];
      entries.push(getCssRuleSource(state.editorValue, rule));
      editedBySelector.set(key, entries);
    });

    const fullLines = fullCss.split("\n");
    const chunks = [];
    let cursor = 0;

    fullRules.forEach((rule) => {
      const matchesSelection = cssRuleMatchesElements(rule, selectedElements);

      if (!matchesSelection) {
        return;
      }

      if (cursor < rule.start) {
        chunks.push(fullLines.slice(cursor, rule.start).join("\n"));
      }

      const replacements = editedBySelector.get(rule.selector) || [];
      const replacement = replacements.length ? replacements.shift() : editedSources.shift() || "";

      if (replacement) {
        const sourceIndex = editedSources.indexOf(replacement);
        if (sourceIndex >= 0) {
          editedSources.splice(sourceIndex, 1);
        }
      }

      if (replacement) {
        chunks.push(replacement);
      }

      cursor = rule.end + 1;
    });

    if (cursor < fullLines.length) {
      chunks.push(fullLines.slice(cursor).join("\n"));
    }

    return chunks.filter((chunk, index) => chunk || index === 0).join("\n").replace(/\n{4,}/g, "\n\n\n");
  }

  function getJsBlocks(value = state.editorValue) {
    if (state.mode !== "js") {
      return [];
    }

    const lines = String(value || "").split("\n");
    const blocks = [];
    let start = -1;
    let depth = 0;
    let inString = "";
    let escaped = false;

    const finishBlock = (end) => {
      if (start < 0) {
        return;
      }

      const source = lines.slice(start, end + 1).join("\n").trim();
      if (source) {
        blocks.push({ start, end, source });
      }
      start = -1;
      depth = 0;
      inString = "";
      escaped = false;
    };

    lines.forEach((line, index) => {
      if (start < 0 && line.trim()) {
        start = index;
      }

      for (let offset = 0; offset < line.length; offset += 1) {
        const char = line[offset];
        const nextChar = line[offset + 1];

        if (inString) {
          escaped = !escaped && char === "\\";
          if (!escaped && char === inString) {
            inString = "";
          } else if (char !== "\\") {
            escaped = false;
          }
          continue;
        }

        if ((char === "/" && nextChar === "/") || (char === "/" && nextChar === "*")) {
          break;
        }

        if (char === "\"" || char === "'" || char === "`") {
          inString = char;
          escaped = false;
          continue;
        }

        if (char === "{" || char === "(" || char === "[") {
          depth += 1;
        } else if (char === "}" || char === ")" || char === "]") {
          depth = Math.max(0, depth - 1);
        }
      }

      const trimmed = line.trim();
      if (start >= 0 && depth === 0 && (trimmed.endsWith(";") || trimmed.endsWith("}") || (!trimmed && index > start))) {
        finishBlock(trimmed ? index : index - 1);
      }
    });

    if (start >= 0) {
      finishBlock(lines.length - 1);
    }

    return blocks;
  }

  function getJsBlockSource(value, block) {
    const lines = String(value || "").split("\n");

    if (!block || !Number.isInteger(block.start) || !Number.isInteger(block.end)) {
      return "";
    }

    return lines.slice(block.start, block.end + 1).join("\n");
  }

  function getSelectorsFromJsSource(source) {
    const selectors = [];
    const pattern = /\b(?:querySelector(?:All)?|closest|matches)\(\s*(['"`])([\s\S]*?)\1/g;
    let match = pattern.exec(String(source || ""));

    while (match) {
      const selector = String(match[2] || "").trim();
      if (selector) {
        selectors.push(selector);
      }
      match = pattern.exec(String(source || ""));
    }

    return selectors;
  }

  function jsBlockMatchesElements(block, elements) {
    const selectors = getSelectorsFromJsSource(block?.source || "");

    if (!selectors.length || !Array.isArray(elements) || !elements.length) {
      return false;
    }

    return selectors.some((selector) => elements.some((element) => selectorMatchesElement(selector, element)));
  }

  function getSelectedJsLayerElements() {
    const selectedElements = getSelectedCssLayerElements();
    const scopedElements = [];

    selectedElements.forEach((element) => {
      if (!(element instanceof Element)) {
        return;
      }

      if (!scopedElements.includes(element)) {
        scopedElements.push(element);
      }

      element.querySelectorAll("*").forEach((child) => {
        if (child instanceof Element && !scopedElements.includes(child)) {
          scopedElements.push(child);
        }
      });
    });

    return scopedElements;
  }

  function getSelectedJsBlocks(value) {
    const selectedElements = getSelectedJsLayerElements();

    if (!selectedElements.length) {
      return [];
    }

    return getJsBlocks(value).filter((block) => jsBlockMatchesElements(block, selectedElements));
  }

  function getJsFilterSignature() {
    return getSelectedJsLayerElements()
      .map((element) => getPreviewLayerPathForElement(element))
      .filter(Boolean)
      .join("|");
  }

  function getFilteredJsForSelectedLayer(value) {
    if (!getSelectedJsLayerElements().length) {
      return String(value || "");
    }

    return getSelectedJsBlocks(value).map((block) => getJsBlockSource(value, block)).filter(Boolean).join("\n\n");
  }

  function isJsFilteredViewActive() {
    if (state.mode !== "js" || state.jsShowAll) {
      return false;
    }

    const fullJs = String(state.jsFullValue || getEffectivePreview().js || "");
    const hasFilterTarget = Boolean(state.jsFilterSignature || getJsFilterSignature());
    const isShowingFilteredContent = String(state.editorValue || "") !== fullJs;

    return hasFilterTarget || isShowingFilteredContent;
  }

  function getJsOutputValue() {
    const fullJs = String(state.jsFullValue || getEffectivePreview().js || "");

    if (state.mode !== "js" || state.jsShowAll || !getSelectedJsLayerElements().length) {
      return state.mode === "js" ? state.editorValue : fullJs;
    }

    const fullBlocks = getJsBlocks(fullJs);
    const editedBlocks = getJsBlocks(state.editorValue);
    const selectedElements = getSelectedJsLayerElements();
    const editedSources = editedBlocks.map((block) => getJsBlockSource(state.editorValue, block));
    const editedBySource = new Map();

    editedBlocks.forEach((block) => {
      const selectors = getSelectorsFromJsSource(block.source).join("|");
      const entries = editedBySource.get(selectors) || [];
      entries.push(getJsBlockSource(state.editorValue, block));
      editedBySource.set(selectors, entries);
    });

    const fullLines = fullJs.split("\n");
    const chunks = [];
    let cursor = 0;

    fullBlocks.forEach((block) => {
      if (!jsBlockMatchesElements(block, selectedElements)) {
        return;
      }

      if (cursor < block.start) {
        chunks.push(fullLines.slice(cursor, block.start).join("\n"));
      }

      const key = getSelectorsFromJsSource(block.source).join("|");
      const replacements = editedBySource.get(key) || [];
      const replacement = replacements.length ? replacements.shift() : editedSources.shift() || "";

      if (replacement) {
        const sourceIndex = editedSources.indexOf(replacement);
        if (sourceIndex >= 0) {
          editedSources.splice(sourceIndex, 1);
        }
        chunks.push(replacement);
      }

      cursor = block.end + 1;
    });

    if (cursor < fullLines.length) {
      chunks.push(fullLines.slice(cursor).join("\n"));
    }

    return chunks.filter((chunk, index) => chunk || index === 0).join("\n").replace(/\n{4,}/g, "\n\n\n");
  }

  function getJsBlockFromPointer(event) {
    if (state.mode !== "js") {
      return null;
    }

    const editor = panel.querySelector("[data-preview-dev-editor]");

    if (!(editor instanceof HTMLTextAreaElement)) {
      return null;
    }

    const rect = editor.getBoundingClientRect();
    const lineHeight = getEditorMetric(editor, "line-height", 18.6);
    const paddingTop = getEditorMetric(editor, "padding-top", 14);
    const nextLine = Math.max(0, Math.floor((event.clientY - rect.top + editor.scrollTop - paddingTop) / lineHeight));

    return getJsBlocks().find((block) => nextLine >= block.start && nextLine <= block.end) || null;
  }

  function getPreviewElementsForJsBlock(block) {
    const root = getPreviewRenderRoot();
    const selectors = getSelectorsFromJsSource(block?.source || "");

    if (!(root instanceof Element) || !selectors.length) {
      return [];
    }

    const matches = [];

    selectors.forEach((selector) => {
      try {
        const selectorMatches = root.matches(selector) ? [root, ...Array.from(root.querySelectorAll(selector))] : Array.from(root.querySelectorAll(selector));
        selectorMatches.forEach((element) => {
          if (element instanceof Element && !matches.includes(element)) {
            matches.push(element);
          }
        });
      } catch {
        // Ignore selectors the browser cannot query, such as pseudo-element selectors.
      }
    });

    return matches;
  }

  function getCssRuleFromPointer(event) {
    if (state.mode !== "css") {
      return null;
    }

    const editor = panel.querySelector("[data-preview-dev-editor]");

    if (!(editor instanceof HTMLTextAreaElement)) {
      return null;
    }

    const rect = editor.getBoundingClientRect();
    const lineHeight = getEditorMetric(editor, "line-height", 18.6);
    const paddingTop = getEditorMetric(editor, "padding-top", 14);
    const nextLine = Math.max(0, Math.floor((event.clientY - rect.top + editor.scrollTop - paddingTop) / lineHeight));

    return getCssRules().find((rule) => nextLine >= rule.start && nextLine <= rule.end) || null;
  }

  function getPreviewElementsForCssRule(rule) {
    const root = getPreviewRenderRoot();

    if (!(root instanceof Element) || !rule?.selectors?.length) {
      return [];
    }

    const matches = [];

    rule.selectors.forEach((selector) => {
      try {
        const selectorMatches = root.matches(selector) ? [root, ...Array.from(root.querySelectorAll(selector))] : Array.from(root.querySelectorAll(selector));
        selectorMatches.forEach((element) => {
          if (element instanceof Element && !matches.includes(element)) {
            matches.push(element);
          }
        });
      } catch {
        // Ignore selectors the browser cannot query, such as pseudo-element selectors.
      }
    });

    return matches;
  }

  function getActiveHoverLine() {
    return state.hoveredHtmlLine >= 0 ? state.hoveredHtmlLine : state.previewHoveredHtmlLine;
  }

  function getPreviewRenderRoot() {
    const renderRoot = document.querySelector("[data-vibe-mobile-render]");
    const generatedRoot = renderRoot?.querySelector?.(".vibe-generated-page");

    if (generatedRoot instanceof Element) {
      return generatedRoot;
    }

    const fallbackRoot = document.querySelector(".mobile-page .vibe-generated-page, .vibe-mobile-stage .vibe-generated-page");
    return fallbackRoot instanceof Element ? fallbackRoot : null;
  }

  function getPreviewLayerElements() {
    const root = getPreviewRenderRoot();

    if (!(root instanceof Element)) {
      return [];
    }

    return [root, ...Array.from(root.querySelectorAll("*"))];
  }

  function getPreviewElementForLayerPath(layerPath) {
    const container = getPreviewRenderContainer();
    const path = String(layerPath || "")
      .split(".")
      .map((part) => Number.parseInt(part, 10));

    if (!(container instanceof Element) || !path.length || path.some((index) => !Number.isInteger(index) || index < 0)) {
      return null;
    }

    let element = container;

    for (const index of path) {
      element = element.children[index] || null;

      if (!(element instanceof Element)) {
        return null;
      }
    }

    return element;
  }

  function getHtmlLayerRowByLine(line) {
    return getHtmlLayerRows().find((row) => row.line === line) || null;
  }

  function getHtmlLayerLineFromPointer(event) {
    if (state.mode !== "html") {
      return -1;
    }

    const editor = panel.querySelector("[data-preview-dev-editor]");

    if (!(editor instanceof HTMLTextAreaElement)) {
      return -1;
    }

    const rect = editor.getBoundingClientRect();
    const lineHeight = getEditorMetric(editor, "line-height", 18.6);
    const paddingTop = getEditorMetric(editor, "padding-top", 14);
    const nextLine = Math.max(0, Math.floor((event.clientY - rect.top + editor.scrollTop - paddingTop) / lineHeight));

    return getHtmlLayerRows().some((row) => row.line === nextLine) ? nextLine : -1;
  }

  function getHtmlLayerLineFromEditorSelection(editor) {
    if (state.mode !== "html" || !(editor instanceof HTMLTextAreaElement)) {
      return -1;
    }

    const selectionStart = Number.isFinite(editor.selectionStart) ? editor.selectionStart : 0;
    const valueBeforeSelection = editor.value.slice(0, Math.max(0, selectionStart));
    const selectionLine = valueBeforeSelection.split("\n").length - 1;
    const rows = getHtmlLayerRows(editor.value);

    if (rows.some((row) => row.line === selectionLine)) {
      return selectionLine;
    }

    const previousRow = rows
      .filter((row) => row.line < selectionLine)
      .sort((first, second) => second.line - first.line)[0];

    return previousRow?.line ?? -1;
  }

  function getPreviewElementForHtmlLine(line) {
    const row = getHtmlLayerRowByLine(line);

    if (!row) {
      return null;
    }

    return getPreviewLayerElements()[row.ordinal] || null;
  }

  function getHtmlLineForPreviewElement(element) {
    if (!(element instanceof Element)) {
      return -1;
    }

    const elements = getPreviewLayerElements();
    const index = elements.indexOf(element);

    if (index < 0) {
      return -1;
    }

    return getHtmlLayerRows()[index]?.line ?? -1;
  }

  function getPreviewRenderContainer() {
    const renderRoot = document.querySelector("[data-vibe-mobile-render]");
    return renderRoot instanceof Element ? renderRoot : null;
  }

  function getPreviewLayerPathForElement(element) {
    const container = getPreviewRenderContainer();

    if (!(element instanceof Element) || !(container instanceof Element) || element === container || !container.contains(element)) {
      return "";
    }

    const path = [];
    let current = element;

    while (current instanceof Element && current !== container) {
      const parent = current.parentElement;

      if (!(parent instanceof Element)) {
        return "";
      }

      const index = Array.from(parent.children).indexOf(current);

      if (index < 0) {
        return "";
      }

      path.unshift(index);
      current = parent;
    }

    return path.join(".");
  }

  function getSelectedPreviewLayerPaths() {
    const container = getPreviewRenderContainer();

    if (!(container instanceof Element)) {
      return [];
    }

    return Array.from(container.querySelectorAll('[data-ux-layer-selected]:not([data-ux-layer-selected="false"])'))
      .map((element) => getPreviewLayerPathForElement(element))
      .filter(Boolean);
  }

  function getClosestPreviewLayerElement(target) {
    const root = getPreviewRenderRoot();

    if (!(root instanceof Element)) {
      return null;
    }

    let element = target instanceof Element ? target : target?.parentElement || null;

    while (element instanceof Element && element !== document.body) {
      if (element === root || root.contains(element)) {
        return element;
      }

      element = element.parentElement;
    }

    return null;
  }

  function dispatchLayerMouseEvent(element, type, relatedTarget = null) {
    if (!(element instanceof Element)) {
      return;
    }

    element.dispatchEvent(
      new MouseEvent(type, {
        bubbles: true,
        cancelable: true,
        view: window,
        relatedTarget,
      }),
    );
  }

  function ensurePreviewHoverOverlay(index = 0) {
    if (previewHoverOverlays[index] instanceof HTMLElement) {
      return previewHoverOverlays[index];
    }

    const overlay = document.createElement("div");
    overlay.className = "preview-dev-layer-hover-overlay";
    overlay.setAttribute("data-preview-dev-layer-hover-overlay", "");
    overlay.innerHTML = `<span class="preview-dev-layer-hover-overlay__label" data-preview-dev-layer-hover-label></span>`;
    document.body.append(overlay);
    previewHoverOverlays[index] = overlay;
    return overlay;
  }

  function getPreviewHoverLabel(rect) {
    const width = Math.max(0, rect.width);
    const height = Math.max(0, rect.height);
    const format = (value) => {
      const rounded = Math.round(value * 100) / 100;
      return Number.isInteger(rounded) ? String(rounded) : String(rounded);
    };

    return `${format(width)} x ${format(height)}`;
  }

  function syncPreviewHoverOverlay() {
    previewHoverOverlayFrame = 0;
    const elements = Array.isArray(state.activePreviewHoverElements) ? state.activePreviewHoverElements.filter((element) => element instanceof Element) : [];

    if (!state.open || !elements.length) {
      previewHoverOverlays.forEach((overlay) => overlay?.classList?.remove("is-visible"));
      return;
    }

    elements.forEach((element, index) => {
      const overlay = ensurePreviewHoverOverlay(index);
      const targetElement = getVisibleOverlayElement(element);
      const rect = targetElement?.getBoundingClientRect?.();

      if (!(targetElement instanceof Element) || !targetElement.isConnected || !rect || rect.width <= 0 || rect.height <= 0) {
        overlay.classList.remove("is-visible");
        return;
      }

      overlay.style.left = `${rect.left}px`;
      overlay.style.top = `${rect.top}px`;
      overlay.style.width = `${rect.width}px`;
      overlay.style.height = `${rect.height}px`;
      overlay.querySelector("[data-preview-dev-layer-hover-label]")?.replaceChildren(getPreviewHoverLabel(rect));
      overlay.classList.toggle("is-breakpoint-override", hasCurrentBreakpointOverride(getPreviewLayerPathForElement(element)));
      overlay.classList.add("is-visible");
    });

    previewHoverOverlays.slice(elements.length).forEach((overlay) => overlay?.classList?.remove("is-visible"));
  }

  function schedulePreviewHoverOverlaySync() {
    if (previewHoverOverlayFrame) {
      return;
    }

    previewHoverOverlayFrame = window.requestAnimationFrame(syncPreviewHoverOverlay);
  }

  function hasVisibleOverlayBox(element) {
    if (!(element instanceof Element) || !element.isConnected) {
      return false;
    }

    const rect = element.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  }

  function getVisibleOverlayElement(element) {
    if (hasVisibleOverlayBox(element)) {
      return element;
    }

    const visibleChild = Array.from(element?.querySelectorAll?.("*") || []).find((child) => hasVisibleOverlayBox(child));

    if (visibleChild instanceof Element) {
      return visibleChild;
    }

    const root = getPreviewRenderRoot();
    let current = element?.parentElement || null;

    while (current instanceof Element && root instanceof Element && root.contains(current)) {
      if (hasVisibleOverlayBox(current)) {
        return current;
      }

      current = current.parentElement;
    }

    return element instanceof Element ? element : null;
  }

  function activatePreviewHoverForLine(line) {
    const nextElement = line >= 0 ? getPreviewElementForHtmlLine(line) : null;
    activatePreviewHoverForElement(nextElement);
  }

  function activatePreviewHoverForLayerPath(layerPath) {
    const nextElement = layerPath ? getPreviewElementForLayerPath(layerPath) : null;
    activatePreviewHoverForElement(nextElement);
  }

  function activatePreviewHoverForElement(nextElement) {
    activatePreviewHoverForElements(nextElement instanceof Element ? [nextElement] : []);
  }

  function activatePreviewHoverForElements(nextElements) {
    const normalizedElements = Array.from(new Set((Array.isArray(nextElements) ? nextElements : []).filter((element) => element instanceof Element)));
    const previousElements = Array.isArray(state.activePreviewHoverElements)
      ? state.activePreviewHoverElements.filter((element) => element instanceof Element)
      : state.activePreviewHoverElement instanceof Element
        ? [state.activePreviewHoverElement]
        : [];
    const sameElements =
      previousElements.length === normalizedElements.length && previousElements.every((element, index) => element === normalizedElements[index]);

    if (sameElements) {
      return;
    }

    previousElements
      .filter((element) => !normalizedElements.includes(element))
      .forEach((element) => dispatchLayerMouseEvent(element, "mouseout", normalizedElements[0] || document.body));

    state.activePreviewHoverElements = normalizedElements;
    state.activePreviewHoverElement = normalizedElements[0] || null;

    normalizedElements
      .filter((element) => !previousElements.includes(element))
      .forEach((element) => dispatchLayerMouseEvent(element, "mouseover", previousElements[0] || document.body));

    schedulePreviewHoverOverlaySync();
  }

  function setCodeHoveredLine(line) {
    const nextLine = Number.isInteger(line) && line >= 0 ? line : -1;

    if (state.hoveredHtmlLine === nextLine) {
      schedulePreviewHoverOverlaySync();
      return;
    }

    state.hoveredHtmlLine = nextLine;
    activatePreviewHoverForLine(nextLine);
    syncHtmlLayerDecorations();
  }

  function setCssHoveredRule(rule) {
    const nextRule = rule && typeof rule === "object" ? rule : null;
    const currentRule = state.hoveredCssRule;
    const sameRule =
      (!currentRule && !nextRule) ||
      (currentRule &&
        nextRule &&
        currentRule.start === nextRule.start &&
        currentRule.end === nextRule.end &&
        currentRule.selector === nextRule.selector);

    if (sameRule) {
      schedulePreviewHoverOverlaySync();
      return;
    }

    state.hoveredCssRule = nextRule;
    activatePreviewHoverForElements(nextRule ? getPreviewElementsForCssRule(nextRule) : []);
    syncCssLayerDecorations();
  }

  function setJsHoveredBlock(block) {
    const nextBlock = block && typeof block === "object" ? block : null;
    const currentBlock = state.hoveredJsBlock;
    const sameBlock =
      (!currentBlock && !nextBlock) ||
      (currentBlock && nextBlock && currentBlock.start === nextBlock.start && currentBlock.end === nextBlock.end && currentBlock.source === nextBlock.source);

    if (sameBlock) {
      schedulePreviewHoverOverlaySync();
      return;
    }

    state.hoveredJsBlock = nextBlock;
    activatePreviewHoverForElements(nextBlock ? getPreviewElementsForJsBlock(nextBlock) : []);
    syncJsLayerDecorations();
  }

  function syncCssEditorFilterFromSelection({ force = false } = {}) {
    if (state.mode !== "css") {
      return;
    }

    const editor = panel.querySelector("[data-preview-dev-editor]");

    if (!force && editor instanceof HTMLTextAreaElement && document.activeElement === editor && performance.now() < Number(state.codeEditingUntil || 0)) {
      return;
    }

    const currentSignature = state.cssFilterSignature;
    const nextSignature = getCssFilterSignature();
    const signatureChanged = nextSignature !== currentSignature;

    if (state.dirty && !force && !signatureChanged) {
      return;
    }

    const nextFullValue = state.dirty ? formatCssForEditor(getCssOutputValue()) : formatCssForEditor(getEffectivePreview().css || state.cssFullValue || "");

    if (signatureChanged) {
      state.cssShowAll = false;
    }

    const nextEditorValue = state.cssShowAll ? nextFullValue : getFilteredCssForSelectedLayer(nextFullValue);

    if (!force && nextFullValue === state.cssFullValue && nextSignature === state.cssFilterSignature && nextEditorValue === state.editorValue) {
      return;
    }

    const hadFilterFooter = Boolean(panel.querySelector("[data-preview-dev-css-filter-footer]"));
    const scrollTop = editor instanceof HTMLTextAreaElement ? editor.scrollTop : 0;
    const scrollLeft = editor instanceof HTMLTextAreaElement ? editor.scrollLeft : 0;

    state.cssFullValue = nextFullValue;
    state.cssFilterSignature = nextSignature;
    state.editorValue = nextEditorValue;
    resetCodeHistory();

    if (editor instanceof HTMLTextAreaElement) {
      editor.value = state.editorValue;
      editor.scrollTop = scrollTop;
      editor.scrollLeft = scrollLeft;
    }

    if (hadFilterFooter !== isCssFilteredViewActive()) {
      render();
      return;
    }

    syncHighlightText();
  }

  function syncJsEditorFilterFromSelection({ force = false } = {}) {
    if (state.mode !== "js") {
      return;
    }

    const editor = panel.querySelector("[data-preview-dev-editor]");

    if (!force && editor instanceof HTMLTextAreaElement && document.activeElement === editor && performance.now() < Number(state.codeEditingUntil || 0)) {
      return;
    }

    const currentSignature = state.jsFilterSignature;
    const nextSignature = getJsFilterSignature();
    const signatureChanged = nextSignature !== currentSignature;

    if (state.dirty && !force && !signatureChanged) {
      return;
    }

    const nextFullValue = state.dirty ? getJsOutputValue() : String(getEffectivePreview().js || state.jsFullValue || "");

    if (signatureChanged) {
      state.jsShowAll = false;
    }

    const nextEditorValue = state.jsShowAll ? nextFullValue : getFilteredJsForSelectedLayer(nextFullValue);

    if (!force && nextFullValue === state.jsFullValue && nextSignature === state.jsFilterSignature && nextEditorValue === state.editorValue) {
      return;
    }

    const hadFilterFooter = Boolean(panel.querySelector("[data-preview-dev-js-filter-footer]"));
    const scrollTop = editor instanceof HTMLTextAreaElement ? editor.scrollTop : 0;
    const scrollLeft = editor instanceof HTMLTextAreaElement ? editor.scrollLeft : 0;

    state.jsFullValue = nextFullValue;
    state.jsFilterSignature = nextSignature;
    state.editorValue = nextEditorValue;
    resetCodeHistory();

    if (editor instanceof HTMLTextAreaElement) {
      editor.value = state.editorValue;
      editor.scrollTop = scrollTop;
      editor.scrollLeft = scrollLeft;
    }

    if (hadFilterFooter !== isJsFilteredViewActive()) {
      render();
      return;
    }

    syncHighlightText();
  }

  function setOverridesHoveredPath(layerPath) {
    const nextPath = String(layerPath || "").trim();

    if (state.hoveredOverridePath === nextPath) {
      schedulePreviewHoverOverlaySync();
      return;
    }

    state.hoveredOverridePath = nextPath;
    activatePreviewHoverForLayerPath(nextPath);
    syncOverridesLayerDecorations();
  }

  function syncPreviewLayerStateFromDom() {
    if (!state.open) {
      return;
    }

    const root = getPreviewRenderRoot();

    if (!(root instanceof Element)) {
      state.previewHoveredHtmlLine = -1;
      state.previewHoveredLayerPath = "";
      state.previewSelectedLayerPath = "";
      state.selectedHtmlLine = -1;
      syncHtmlLayerDecorations();
      syncCssEditorFilterFromSelection();
      syncCssLayerDecorations();
      syncJsEditorFilterFromSelection();
      syncJsLayerDecorations();
      syncOverridesLineNumbers();
      syncOverridesLayerDecorations();
      return;
    }

    const hoveredElement = root.querySelector('[data-ux-layer-hovered]:not([data-ux-layer-hovered="false"])');
    const selectedElement = root.querySelector('[data-ux-layer-selected]:not([data-ux-layer-selected="false"])');
    const nextPreviewHoverLine = hoveredElement instanceof Element ? getHtmlLineForPreviewElement(hoveredElement) : -1;
    const nextPreviewHoverPath = hoveredElement instanceof Element ? getPreviewLayerPathForElement(hoveredElement) : "";
    const nextSelectedLine = selectedElement instanceof Element ? getHtmlLineForPreviewElement(selectedElement) : -1;
    const nextSelectedPath = selectedElement instanceof Element ? getPreviewLayerPathForElement(selectedElement) : "";
    const nextHtmlHoverLine = state.mode === "html" ? nextPreviewHoverLine : -1;
    const nextHtmlSelectedLine = state.mode === "html" ? nextSelectedLine : -1;
    const selectionChanged = nextSelectedPath !== state.previewSelectedLayerPath || nextHtmlSelectedLine !== state.selectedHtmlLine;

    if (
      nextHtmlHoverLine !== state.previewHoveredHtmlLine ||
      nextPreviewHoverPath !== state.previewHoveredLayerPath ||
      nextSelectedPath !== state.previewSelectedLayerPath ||
      nextHtmlSelectedLine !== state.selectedHtmlLine
    ) {
      state.previewHoveredHtmlLine = nextHtmlHoverLine;
      state.previewHoveredLayerPath = nextPreviewHoverPath;
      state.previewSelectedLayerPath = nextSelectedPath;
      state.selectedHtmlLine = nextHtmlSelectedLine;
      syncLineNumbers();
      syncHtmlLayerDecorations();
      if (selectionChanged && (!state.cssShowAll || state.allowCssRefilterFromSelection)) {
        syncCssEditorFilterFromSelection();
      }
      state.allowCssRefilterFromSelection = false;
      syncCssLayerDecorations();
      if (selectionChanged && (!state.jsShowAll || state.allowJsRefilterFromSelection)) {
        syncJsEditorFilterFromSelection();
      }
      state.allowJsRefilterFromSelection = false;
      syncJsLayerDecorations();
      syncOverridesLineNumbers();
      syncOverridesLayerDecorations();
    }
  }

  function getCleanPreviewHtmlFromDom() {
    const renderRoot = document.querySelector("[data-vibe-mobile-render]");

    if (!(renderRoot instanceof Element)) {
      return "";
    }

    const clone = renderRoot.cloneNode(true);

    if (!(clone instanceof Element)) {
      return "";
    }

    clone.querySelectorAll("[data-ux-layer-hovered], [data-ux-layer-selected]").forEach((element) => {
      element.removeAttribute("data-ux-layer-hovered");
      element.removeAttribute("data-ux-layer-selected");
    });

    if (clone.hasAttribute("data-ux-layer-hovered")) {
      clone.removeAttribute("data-ux-layer-hovered");
    }

    if (clone.hasAttribute("data-ux-layer-selected")) {
      clone.removeAttribute("data-ux-layer-selected");
    }

    return clone.innerHTML;
  }

  function syncEditorFromPreviewDom() {
    state.previewDomSyncFrame = 0;

    if (!state.open || state.mode !== "html" || state.renderingLivePreview) {
      return;
    }

    const editor = panel.querySelector("[data-preview-dev-editor]");

    if (editor instanceof HTMLTextAreaElement && document.activeElement === editor) {
      return;
    }

    if (performance.now() < Number(state.codeEditingUntil || 0)) {
      return;
    }

    const nextHtml = getCleanPreviewHtmlFromDom();
    const nextValue = formatHtmlForEditor(nextHtml);

    if (!nextValue || nextValue === state.editorValue) {
      return;
    }

    const scrollTop = editor instanceof HTMLTextAreaElement ? editor.scrollTop : 0;
    const scrollLeft = editor instanceof HTMLTextAreaElement ? editor.scrollLeft : 0;
    state.editorValue = nextValue;
    state.dirty = false;
    state.error = "";
    state.status = "";

    if (state.page?.preview) {
      state.page.preview = { ...state.page.preview, html: nextHtml };
    }

    if (state.page?.vibe?.appliedDraft) {
      state.page.vibe.appliedDraft = { ...state.page.vibe.appliedDraft, html: nextHtml };
    }

    resetCodeHistory();

    if (editor instanceof HTMLTextAreaElement) {
      editor.value = state.editorValue;
      editor.scrollTop = scrollTop;
      editor.scrollLeft = scrollLeft;
    }

    syncHighlightText();
    syncHighlightScroll();
    syncPreviewLayerStateFromDom();
  }

  function scheduleEditorSyncFromPreviewDom() {
    if (state.renderingLivePreview || state.mode !== "html") {
      return;
    }

    if (state.previewDomSyncFrame) {
      return;
    }

    state.previewDomSyncFrame = window.requestAnimationFrame(syncEditorFromPreviewDom);
  }

  function syncOverridesEditorFromPreview({ force = false } = {}) {
    if (!state.open || !getBreakpointMode() || state.overridesDirty) {
      return;
    }

    const nextValue = getContentForMode("overrides");

    if (nextValue === state.overridesValue) {
      return;
    }

    const editor = panel.querySelector("[data-preview-dev-overrides-editor]");

    if (!force && editor instanceof HTMLTextAreaElement && document.activeElement === editor) {
      return;
    }

    const scrollTop = editor instanceof HTMLTextAreaElement ? editor.scrollTop : 0;
    const scrollLeft = editor instanceof HTMLTextAreaElement ? editor.scrollLeft : 0;
    state.overridesValue = nextValue;
    state.error = "";
    state.status = "";

    if (editor instanceof HTMLTextAreaElement) {
      editor.value = state.overridesValue;
      editor.scrollTop = scrollTop;
      editor.scrollLeft = scrollLeft;
    }

    syncHighlightText();
    syncHighlightScroll();
  }

  function syncOverridesEditorFromState() {
    const editor = panel.querySelector("[data-preview-dev-overrides-editor]");
    const scrollTop = editor instanceof HTMLTextAreaElement ? editor.scrollTop : 0;
    const scrollLeft = editor instanceof HTMLTextAreaElement ? editor.scrollLeft : 0;

    if (editor instanceof HTMLTextAreaElement && editor.value !== state.overridesValue) {
      editor.value = state.overridesValue;
      editor.scrollTop = scrollTop;
      editor.scrollLeft = scrollLeft;
    }

    syncHighlightText();
    syncHighlightScroll();
  }

  function applyRuntimeOverridesChange(detail = {}) {
    if (detail.project) {
      applyProject(detail.project, detail.page?.id || requestedPageId);
    } else if (state.page && detail.breakpointOverrides && typeof detail.breakpointOverrides === "object") {
      const preview = getPreview();
      const nextPreview = {
        ...preview,
        breakpointOverrides: detail.breakpointOverrides,
      };

      state.page = {
        ...state.page,
        preview: state.page.preview ? nextPreview : state.page.preview,
        vibe: state.page.vibe
          ? {
              ...state.page.vibe,
              appliedDraft: state.page.vibe.appliedDraft
                ? {
                    ...state.page.vibe.appliedDraft,
                    breakpointOverrides: detail.breakpointOverrides,
                  }
                : state.page.vibe.appliedDraft,
            }
          : state.page.vibe,
      };
    }

    const nextValue = getContentForMode("overrides");
    const editor = panel.querySelector("[data-preview-dev-overrides-editor]");
    const scrollTop = editor instanceof HTMLTextAreaElement ? editor.scrollTop : 0;
    const scrollLeft = editor instanceof HTMLTextAreaElement ? editor.scrollLeft : 0;

    state.overridesDirty = false;
    state.overridesValue = nextValue;
    state.error = "";
    state.status = "";

    if (editor instanceof HTMLTextAreaElement) {
      editor.value = nextValue;
      editor.scrollTop = scrollTop;
      editor.scrollLeft = scrollLeft;
    }

    syncHighlightText();
    syncHighlightScroll();
  }

  function startOverridesSync() {
    if (state.overridesSyncTimer || typeof window === "undefined") {
      return;
    }

    state.overridesSyncTimer = window.setInterval(() => syncOverridesEditorFromPreview(), 250);
  }

  function stopOverridesSync() {
    if (!state.overridesSyncTimer || typeof window === "undefined") {
      return;
    }

    window.clearInterval(state.overridesSyncTimer);
    state.overridesSyncTimer = 0;
  }

  function syncOverridesSyncState() {
    if (state.open && getBreakpointMode()) {
      startOverridesSync();
      syncOverridesEditorFromPreview();
      return;
    }

    stopOverridesSync();
  }

  function cancelPendingPreviewDomSync() {
    if (!state.previewDomSyncFrame) {
      return;
    }

    window.cancelAnimationFrame(state.previewDomSyncFrame);
    state.previewDomSyncFrame = 0;
  }

  function ensurePreviewStateObserver() {
    const root = getPreviewRenderRoot();

    if (!(root instanceof Element)) {
      previewStateObserver?.disconnect();
      previewStateObserver = null;
      return;
    }

    if (previewStateObserver?.__previewRoot === root) {
      return;
    }

    previewStateObserver?.disconnect();
    previewStateObserver = new MutationObserver(() => {
      syncPreviewLayerStateFromDom();
      scheduleEditorSyncFromPreviewDom();
      syncOverridesEditorFromPreview();
    });
    previewStateObserver.__previewRoot = root;
    previewStateObserver.observe(root, {
      subtree: true,
      childList: true,
      attributes: true,
      characterData: true,
    });
    syncPreviewLayerStateFromDom();
  }

  function isHtmlLayerHidden(line) {
    return (
      /\sdata-ux-layer-hidden-control=(["'])true\1/i.test(line) ||
      /\sdata-ux-layer-visible=(["'])false\1/i.test(line) ||
      /\saria-hidden=(["'])true\1/i.test(line) ||
      /style=(["'])[^"']*display\s*:\s*none/i.test(line) ||
      /style=(["'])[^"']*visibility\s*:\s*hidden/i.test(line)
    );
  }

  function iconMarkup(hidden) {
    return hidden
      ? `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 2l20 20"></path><path d="M10.6 10.6a2 2 0 0 0 2.8 2.8"></path><path d="M9.9 4.2A10.4 10.4 0 0 1 12 4c5 0 9 5 10 8a15.6 15.6 0 0 1-2.1 3.6"></path><path d="M6.5 6.5C4.4 7.9 2.8 10 2 12c1 3 5 8 10 8a10.7 10.7 0 0 0 5.5-1.6"></path></svg>`
      : `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z"></path><circle cx="12" cy="12" r="3"></circle></svg>`;
  }

  function syncHtmlLayerDecorations() {
    const gutter = panel.querySelector("[data-preview-dev-layer-gutter]");
    const editor = panel.querySelector("[data-preview-dev-editor]");
    const rowHighlights = panel.querySelector("[data-preview-dev-row-highlights]");

    if (!(gutter instanceof HTMLElement) || !(editor instanceof HTMLTextAreaElement) || state.mode !== "html") {
      if (gutter instanceof HTMLElement) {
        gutter.innerHTML = "";
      }

      if (rowHighlights instanceof HTMLElement) {
        rowHighlights.innerHTML = "";
      }

      return;
    }

    const rows = getHtmlLayerRows();
    const hoverLine = getActiveHoverLine();
    const selectedLine = state.selectedHtmlLine;
    const getUniqueRowsByLine = (nextRows) => {
      const seen = new Set();

      return nextRows.filter((row) => {
        const key = String(row.line);

        if (seen.has(key)) {
          return false;
        }

        seen.add(key);
        return true;
      });
    };
    const visibleRows = getUniqueRowsByLine(rows.filter((row) => row.hidden || row.line === hoverLine));
    const paddingTop = getEditorMetric(editor, "padding-top", 14);
    const lineHeight = getEditorMetric(editor, "line-height", 18.6);
    const scrollTop = editor.scrollTop || 0;

    if (rowHighlights instanceof HTMLElement) {
      const highlightRows = getUniqueRowsByLine(rows.filter((row) => row.line === hoverLine || row.line === selectedLine));
      rowHighlights.innerHTML = highlightRows
        .map((row) => {
          const top = paddingTop + row.line * lineHeight - scrollTop;
          const selectedClass = row.line === selectedLine ? " is-selected" : "";

          return `<div class="preview-dev-panel__row-highlight${selectedClass}" style="top: ${top}px; height: ${lineHeight}px;"></div>`;
        })
        .join("");
    }

    gutter.innerHTML = visibleRows
      .map((row) => {
        const top = paddingTop + row.line * lineHeight + (lineHeight - 22) / 2 - scrollTop;
        const visibleClass = row.line === hoverLine || row.hidden ? " is-visible" : "";
        const hiddenClass = row.hidden ? " is-hidden" : "";
        const label = row.hidden ? "Unhide HTML layer" : "Hide HTML layer";

        return `
          <button
            type="button"
            class="preview-dev-panel__layer-toggle${visibleClass}${hiddenClass}"
            style="top: ${top}px;"
            data-preview-dev-layer-toggle
            data-preview-dev-line="${row.line}"
            data-preview-dev-tag-start="${row.tagStart}"
            aria-label="${label}"
            title="${label}"
          >
            ${iconMarkup(row.hidden)}
          </button>
        `;
      })
      .join("");
  }

  function syncCssLayerDecorations() {
    const rowHighlights = panel.querySelector("[data-preview-dev-row-highlights]");
    const editor = panel.querySelector("[data-preview-dev-editor]");

    if (!(rowHighlights instanceof HTMLElement) || !(editor instanceof HTMLTextAreaElement) || state.mode !== "css") {
      return;
    }

    const rule = state.hoveredCssRule;

    if (!rule) {
      rowHighlights.innerHTML = "";
      return;
    }

    const paddingTop = getEditorMetric(editor, "padding-top", 14);
    const lineHeight = getEditorMetric(editor, "line-height", 18.6);
    const scrollTop = editor.scrollTop || 0;
    const lines = [];

    for (let line = rule.start; line <= rule.end; line += 1) {
      lines.push(line);
    }

    rowHighlights.innerHTML = lines
      .map((line) => {
        const top = paddingTop + line * lineHeight - scrollTop;
        return `<div class="preview-dev-panel__row-highlight" style="top: ${top}px; height: ${lineHeight}px;"></div>`;
      })
      .join("");
  }

  function syncJsLayerDecorations() {
    const rowHighlights = panel.querySelector("[data-preview-dev-row-highlights]");
    const editor = panel.querySelector("[data-preview-dev-editor]");

    if (!(rowHighlights instanceof HTMLElement) || !(editor instanceof HTMLTextAreaElement) || state.mode !== "js") {
      return;
    }

    const block = state.hoveredJsBlock;

    if (!block) {
      rowHighlights.innerHTML = "";
      return;
    }

    const paddingTop = getEditorMetric(editor, "padding-top", 14);
    const lineHeight = getEditorMetric(editor, "line-height", 18.6);
    const scrollTop = editor.scrollTop || 0;
    const lines = [];

    for (let line = block.start; line <= block.end; line += 1) {
      lines.push(line);
    }

    rowHighlights.innerHTML = lines
      .map((line) => {
        const top = paddingTop + line * lineHeight - scrollTop;
        return `<div class="preview-dev-panel__row-highlight" style="top: ${top}px; height: ${lineHeight}px;"></div>`;
      })
      .join("");
  }

  function syncOverridesLayerDecorations() {
    const rowHighlights = panel.querySelector("[data-preview-dev-overrides-row-highlights]");
    const editor = panel.querySelector("[data-preview-dev-overrides-editor]");

    if (!(rowHighlights instanceof HTMLElement) || !(editor instanceof HTMLTextAreaElement)) {
      if (rowHighlights instanceof HTMLElement) {
        rowHighlights.innerHTML = "";
      }
      return;
    }

    const selectedLines = getSelectedOverrideLines();
    const hoverPath = state.hoveredOverridePath || state.previewHoveredLayerPath;
    const hoverRange = hoverPath ? getJsonKeyBlockLineRange(state.overridesValue, hoverPath) : null;
    const hoverLines = new Set();

    if (hoverRange) {
      for (let line = hoverRange.start; line <= hoverRange.end; line += 1) {
        hoverLines.add(line);
      }
    }

    if (!selectedLines.size && !hoverLines.size) {
      rowHighlights.innerHTML = "";
      return;
    }

    const paddingTop = getEditorMetric(editor, "padding-top", 14);
    const lineHeight = getEditorMetric(editor, "line-height", 18.6);
    const scrollTop = editor.scrollTop || 0;

    rowHighlights.innerHTML = Array.from(new Set([...hoverLines, ...selectedLines]))
      .sort((first, second) => first - second)
      .map((line) => {
        const top = paddingTop + line * lineHeight - scrollTop;
        const selectedClass = selectedLines.has(line) ? " is-selected" : "";
        return `<div class="preview-dev-panel__row-highlight${selectedClass}" style="top: ${top}px; height: ${lineHeight}px;"></div>`;
      })
      .join("");
  }

  function setStatus(message, isError = false) {
    state.status = isError ? "" : message;
    state.error = isError ? message : "";
    const status = panel.querySelector("[data-preview-dev-status]");

    if (status) {
      status.textContent = message;
      status.classList.toggle("is-error", isError);
    }
  }

  function escapeRegExp(value) {
    return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  function escapeAttribute(value) {
    return String(value).replace(/&/g, "&amp;").replace(/"/g, "&quot;");
  }

  function setAttributeOnTag(tag, name, value) {
    const pattern = new RegExp(`\\s${escapeRegExp(name)}(?:=(?:"[^"]*"|'[^']*'|[^\\s>]+))?`, "i");
    const replacement = ` ${name}="${escapeAttribute(value)}"`;

    if (pattern.test(tag)) {
      return tag.replace(pattern, replacement);
    }

    return tag.replace(/\s*(\/?>)$/, `${replacement}$1`);
  }

  function removeAttributeFromTag(tag, name) {
    const pattern = new RegExp(`\\s${escapeRegExp(name)}(?:=(?:"[^"]*"|'[^']*'|[^\\s>]+))?`, "ig");
    return tag.replace(pattern, "");
  }

  function getAttributeFromTag(tag, name) {
    const pattern = new RegExp(`\\s${escapeRegExp(name)}=(["'])([\\s\\S]*?)\\1`, "i");
    const match = tag.match(pattern);
    return match ? match[2] : "";
  }

  function getStyleAttribute(tag) {
    const match = tag.match(/\sstyle=(["'])([\s\S]*?)\1/i);
    return match ? { quote: match[1], value: match[2] } : null;
  }

  function getStylePropertyValue(tag, propertyName) {
    const existing = getStyleAttribute(tag);

    if (!existing) {
      return "";
    }

    const propertyKey = String(propertyName || "").trim().toLowerCase();

    if (!propertyKey) {
      return "";
    }

    const item = existing.value
      .split(";")
      .map((entry) => entry.trim())
      .filter(Boolean)
      .find((entry) => {
        const colon = entry.indexOf(":");
        return colon >= 0 && entry.slice(0, colon).trim().toLowerCase() === propertyKey;
      });

    if (!item) {
      return "";
    }

    return item.slice(item.indexOf(":") + 1).trim();
  }

  function updateStyleAttribute(tag, updates) {
    const existing = getStyleAttribute(tag);
    const styles = new Map();

    if (existing) {
      existing.value
        .split(";")
        .map((item) => item.trim())
        .filter(Boolean)
        .forEach((item) => {
          const colon = item.indexOf(":");

          if (colon < 0) {
            return;
          }

          const property = item.slice(0, colon).trim().toLowerCase();
          const value = item.slice(colon + 1).trim();

          if (property) {
            styles.set(property, value);
          }
        });
    }

    Object.entries(updates).forEach(([property, value]) => {
      const key = property.toLowerCase();

      if (value == null) {
        styles.delete(key);
      } else {
        styles.set(key, value);
      }
    });

    const styleValue = Array.from(styles.entries())
      .map(([property, value]) => `${property}: ${value}`)
      .join("; ");

    if (!styleValue) {
      return removeAttributeFromTag(tag, "style");
    }

    return setAttributeOnTag(tag, "style", `${styleValue};`);
  }

  function updateHtmlLayerLine(line, hidden, tagStart = -1) {
    const tagPattern = /<([A-Za-z][\w:-]*)(?=[\s>/])[^>]*>/g;
    let match = null;

    if (Number.isInteger(tagStart) && tagStart >= 0) {
      let nextMatch = tagPattern.exec(line);

      while (nextMatch) {
        if (nextMatch.index === tagStart) {
          match = nextMatch;
          break;
        }

        nextMatch = tagPattern.exec(line);
      }
    }

    if (!match) {
      tagPattern.lastIndex = 0;
      match = tagPattern.exec(line);
    }

    if (!match) {
      return line;
    }

    const before = line.slice(0, match.index);
    let tag = match[0];
    const after = line.slice(match.index + tag.length);

    if (hidden) {
      const currentDisplay = getStylePropertyValue(tag, "display");

      if (currentDisplay && currentDisplay.toLowerCase() !== "none") {
        tag = setAttributeOnTag(tag, "data-ux-layer-display-cache", currentDisplay);
      }

      tag = setAttributeOnTag(tag, "data-ux-layer-hidden-control", "true");
      tag = setAttributeOnTag(tag, "data-ux-layer-visible", "false");
      tag = setAttributeOnTag(tag, "aria-hidden", "true");
      tag = updateStyleAttribute(tag, {
        display: "none",
        visibility: null,
        "pointer-events": null,
      });
    } else {
      const cachedDisplay = getAttributeFromTag(tag, "data-ux-layer-display-cache");
      tag = removeAttributeFromTag(tag, "data-ux-layer-hidden-control");
      tag = removeAttributeFromTag(tag, "data-ux-layer-visible");
      tag = removeAttributeFromTag(tag, "data-ux-layer-display-cache");
      tag = removeAttributeFromTag(tag, "aria-hidden");
      tag = updateStyleAttribute(tag, {
        display: cachedDisplay || null,
        visibility: null,
        "pointer-events": null,
      });
    }

    return `${before}${tag}${after}`;
  }

  function capturePreviewScrollSnapshot() {
    const nodes = new Set([
      document.scrollingElement,
      document.documentElement,
      document.body,
      document.querySelector(".bridge-main--project"),
      document.querySelector(".bridge-preview-stage"),
      document.querySelector(".mobile-page"),
      document.querySelector("[data-vibe-mobile-stage]"),
      document.querySelector("[data-vibe-mobile-render]"),
    ]);

    return Array.from(nodes)
      .filter((node) => node instanceof Element)
      .map((node) => ({
        node,
        top: node.scrollTop,
        left: node.scrollLeft,
      }));
  }

  function restorePreviewScrollSnapshot(snapshot) {
    if (!Array.isArray(snapshot)) {
      return;
    }

    snapshot.forEach((entry) => {
      if (!entry?.node || !document.contains(entry.node)) {
        return;
      }

      entry.node.scrollTop = entry.top;
      entry.node.scrollLeft = entry.left;
    });
  }

  function toggleHtmlLayerVisibility(lineIndex, tagStart = -1) {
    if (state.mode !== "html" || !Number.isInteger(lineIndex) || lineIndex < 0) {
      return;
    }

    const editor = panel.querySelector("[data-preview-dev-editor]");
    const previewScrollSnapshot = capturePreviewScrollSnapshot();
    const lines = String(state.editorValue || "").split("\n");

    if (!lines[lineIndex]) {
      return;
    }

    const targetRow = getHtmlLayerRows().find(
      (row) => row.line === lineIndex && (!Number.isInteger(tagStart) || tagStart < 0 || row.tagStart === tagStart),
    );
    const targetTag =
      targetRow && Number.isInteger(targetRow.tagStart) && Number.isInteger(targetRow.tagEnd)
        ? lines[lineIndex].slice(targetRow.tagStart, targetRow.tagEnd)
        : lines[lineIndex];
    const nextHidden = !isHtmlLayerHidden(targetTag);
    lines[lineIndex] = updateHtmlLayerLine(lines[lineIndex], nextHidden, targetRow?.tagStart ?? tagStart);
    state.editorValue = lines.join("\n");
    state.dirty = true;
    state.error = "";
    state.status = "";
    cancelPendingPreviewDomSync();
    commitCodeHistory(state.editorValue, lineIndex);

    if (editor instanceof HTMLTextAreaElement) {
      const scrollTop = editor.scrollTop;
      const scrollLeft = editor.scrollLeft;
      editor.value = state.editorValue;
      editor.scrollTop = scrollTop;
      editor.scrollLeft = scrollLeft;
      try {
        editor.focus({ preventScroll: true });
      } catch {
        editor.focus();
      }
    }

    syncHighlightText();
    syncHighlightScroll();
    applyLivePreview();
    restorePreviewScrollSnapshot(previewScrollSnapshot);
    window.requestAnimationFrame(() => restorePreviewScrollSnapshot(previewScrollSnapshot));
    scheduleAutosave();
  }

  function activateHtmlLayerVisibilityToggle(layerToggle) {
    if (!(layerToggle instanceof Element)) {
      return;
    }

    const line = Number.parseInt(String(layerToggle.getAttribute("data-preview-dev-line") || ""), 10);
    const tagStart = Number.parseInt(String(layerToggle.getAttribute("data-preview-dev-tag-start") || ""), 10);
    toggleHtmlLayerVisibility(line, tagStart);
  }

  function buildPreviewFromEditor() {
    const preview = getPreview();
    const nextPreview = {
      ...preview,
      html: String(preview.html || ""),
      css: String(preview.css || ""),
      js: String(preview.js || ""),
      stageStyle: String(preview.stageStyle || ""),
      breakpointOverrides: preview.breakpointOverrides || {},
    };

    if (getBreakpointMode() && state.mode !== "overrides") {
      const breakpointId = getCurrentBreakpointId();
      const overrides = state.overridesDirty ? JSON.parse(state.overridesValue || "{}") : JSON.parse(JSON.stringify(preview.breakpointOverrides || {}));

      if (breakpointId) {
        const currentBreakpointOverride = overrides[CODE_OVERRIDE_LAYER_PATH]?.[breakpointId] || {};
        const attrs = {
          ...(currentBreakpointOverride.attrs && typeof currentBreakpointOverride.attrs === "object" ? currentBreakpointOverride.attrs : {}),
        };

        if (!Object.prototype.hasOwnProperty.call(attrs, CODE_OVERRIDE_ATTRS.html)) {
          attrs[CODE_OVERRIDE_ATTRS.html] = String(preview.html || "");
        }
        if (!Object.prototype.hasOwnProperty.call(attrs, CODE_OVERRIDE_ATTRS.css)) {
          attrs[CODE_OVERRIDE_ATTRS.css] = String(preview.css || "");
        }
        if (!Object.prototype.hasOwnProperty.call(attrs, CODE_OVERRIDE_ATTRS.js)) {
          attrs[CODE_OVERRIDE_ATTRS.js] = String(preview.js || "");
        }

        if (state.mode === "html") {
          attrs[CODE_OVERRIDE_ATTRS.html] = state.editorValue;
        } else if (state.mode === "css") {
          attrs[CODE_OVERRIDE_ATTRS.css] = getCssOutputValue();
        } else if (state.mode === "js") {
          attrs[CODE_OVERRIDE_ATTRS.js] = getJsOutputValue();
        }

        overrides[CODE_OVERRIDE_LAYER_PATH] = {
          ...(overrides[CODE_OVERRIDE_LAYER_PATH] && typeof overrides[CODE_OVERRIDE_LAYER_PATH] === "object"
            ? overrides[CODE_OVERRIDE_LAYER_PATH]
            : {}),
          [breakpointId]: {
            styles: {},
            attrs,
          },
        };
        nextPreview.breakpointOverrides = overrides;
        state.overridesValue = JSON.stringify(overrides, null, 2);
        state.pendingBreakpointCodeSave = true;
      }
    } else if (state.mode === "html") {
      nextPreview.html = state.editorValue;
    } else if (state.mode === "css") {
      nextPreview.css = getCssOutputValue();
    } else if (state.mode === "js") {
      nextPreview.js = getJsOutputValue();
    }

    if (state.mode === "overrides") {
      nextPreview.breakpointOverrides = JSON.parse(state.overridesValue || "{}");
    }

    return nextPreview;
  }

  function updateLocalPreview(nextPreview) {
    if (!state.page || !nextPreview) {
      return;
    }

    state.page.preview = nextPreview;
    state.page.hasContent = Boolean(nextPreview.html);
    state.page.vibe = {
      ...(state.page.vibe || {}),
      status: "applied",
      appliedDraft: nextPreview,
      summary: nextPreview.summary || state.page.vibe?.summary || "",
    };
  }

  function cleanupLivePreviewScript(renderRoot) {
    const cleanup = renderRoot?.__uxBridgePreviewCleanup;

    if (typeof cleanup === "function") {
      try {
        cleanup();
      } catch (error) {
        console.warn("[dev-mode] preview.js cleanup failed", error);
      }
    }

    if (renderRoot) {
      renderRoot.__uxBridgePreviewCleanup = null;
    }
  }

  function runLivePreviewScript(renderRoot, nextPreview) {
    cleanupLivePreviewScript(renderRoot);

    const previewJs = String(nextPreview?.js || "").trim();

    if (!renderRoot || !previewJs) {
      return;
    }

    const root = renderRoot.firstElementChild instanceof HTMLElement ? renderRoot.firstElementChild : renderRoot;

    try {
      const cleanup = new Function("root", "page", "project", "api", previewJs)(root, state.page, state.project, {});

      if (typeof cleanup === "function") {
        renderRoot.__uxBridgePreviewCleanup = cleanup;
      }
    } catch (error) {
      console.warn("[dev-mode] preview.js failed", error);
    }
  }

  function renderLivePreview(nextPreview) {
    const mobilePage = document.querySelector(".mobile-page");
    const emptyShell = document.querySelector("[data-empty-mobile-shell]");
    const stage = document.querySelector("[data-vibe-mobile-stage]");
    const style = document.querySelector("[data-vibe-mobile-style]");
    const renderRoot = document.querySelector("[data-vibe-mobile-render]");

    if (!mobilePage || !emptyShell || !stage || !style || !renderRoot) {
      return;
    }

    const hasContent = Boolean(nextPreview?.html);
    mobilePage.classList.toggle("mobile-page--empty", !hasContent);
    emptyShell.hidden = hasContent;
    stage.hidden = !hasContent;

    state.renderingLivePreview = true;

    try {
      if (!hasContent) {
        cleanupLivePreviewScript(renderRoot);
        style.textContent = "";
        renderRoot.innerHTML = "";
        return;
      }

      style.textContent = String(nextPreview.css || "");
      renderRoot.innerHTML = String(nextPreview.html || "");
      runLivePreviewScript(renderRoot, nextPreview);
    } finally {
      window.requestAnimationFrame(() => {
        state.renderingLivePreview = false;
        ensurePreviewStateObserver();
        syncPreviewLayerStateFromDom();
      });
    }
  }

  function applyLivePreview() {
    let nextPreview;

    try {
      nextPreview = buildPreviewFromEditor();
    } catch (error) {
      state.error = error instanceof Error ? error.message : "Overrides must be valid JSON.";
      return false;
    }

    state.error = "";
    updateLocalPreview(nextPreview);
    const previewScrollSnapshot = capturePreviewScrollSnapshot();
    renderLivePreview(getEffectivePreview(nextPreview));
    restorePreviewScrollSnapshot(previewScrollSnapshot);
    window.requestAnimationFrame(() => restorePreviewScrollSnapshot(previewScrollSnapshot));
    if (state.mode !== "overrides") {
      syncOverridesEditorFromState();
    }
    window.dispatchEvent(
      new CustomEvent("uxbridge:preview-code-live-update", {
        detail: {
          projectId: state.project?.id || projectId,
          pageId: state.page?.id || requestedPageId || document.body.dataset.pageKey || "",
          preview: nextPreview,
        },
      }),
    );
    return true;
  }

  function scheduleAutosave(editorKey = "main") {
    try {
      state.pendingAutosavePayload = {
        ...getSavePayload(),
        __mode: state.mode,
        __editorKey: editorKey,
        __value: editorKey === "overrides" ? state.overridesValue : state.editorValue,
      };
    } catch (error) {
      state.error = error instanceof Error ? error.message : "Overrides must be valid JSON.";
      return;
    }

    if (state.autosaveTimer) {
      window.clearTimeout(state.autosaveTimer);
    }

    state.autosaveTimer = window.setTimeout(() => {
      state.autosaveTimer = 0;
      void autosave();
    }, 450);
  }

  function selectPreviewElement(element) {
    if (!(element instanceof Element)) {
      return false;
    }

    state.allowCssRefilterFromSelection = true;
    state.allowJsRefilterFromSelection = true;
    const layerPath = getPreviewLayerPathForElement(element);

    if (!layerPath) {
      return false;
    }

    window.dispatchEvent(
      new CustomEvent("uxbridge:comment-selection-select", {
        detail: {
          pageId: state.page?.id || requestedPageId || document.body.dataset.pageKey || "",
          layerPath,
        },
      }),
    );

    activatePreviewHoverForElement(element);
    window.requestAnimationFrame(syncPreviewLayerStateFromDom);
    return true;
  }

  function selectPreviewElementForHtmlLine(line) {
    const element = getPreviewElementForHtmlLine(line);

    if (!(element instanceof Element)) {
      return;
    }

    state.selectedHtmlLine = line;
    syncLineNumbers();
    syncHtmlLayerDecorations();
    syncOverridesLineNumbers();
    syncOverridesLayerDecorations();
    selectPreviewElement(element);
  }

  function selectPreviewElementForEditorCaret(editor) {
    const line = getHtmlLayerLineFromEditorSelection(editor);

    if (line >= 0) {
      selectPreviewElementForHtmlLine(line);
    }
  }

  function render() {
    syncModeToBreakpointState({ preserveDirty: true });
    const tabs = getModeTabs();
    const breakpointMode = getBreakpointMode();
    const cssFilteredView = isCssFilteredViewActive();
    const jsFilteredView = isJsFilteredViewActive();
    const filteredView = cssFilteredView || jsFilteredView;
    const emptyCode = (state.mode === "css" || state.mode === "js") && !hasAvailableCode(state.editorValue);
    const editorBodyClass = `preview-dev-panel__body${filteredView ? " has-filter-footer" : ""}${emptyCode ? " is-empty-code" : ""}`;
    const emptyCodeMessage = emptyCode
      ? `<div class="preview-dev-panel__empty-message" data-preview-dev-empty-message>No available code</div>`
      : `<div class="preview-dev-panel__empty-message" data-preview-dev-empty-message hidden>No available code</div>`;
    const filterFooter = filteredView
      ? `
        <div class="preview-dev-panel__filter-footer" ${cssFilteredView ? "data-preview-dev-css-filter-footer" : "data-preview-dev-js-filter-footer"}>
          <button type="button" class="preview-dev-panel__see-all" ${cssFilteredView ? "data-preview-dev-css-see-all" : "data-preview-dev-js-see-all"}>See All</button>
        </div>
      `
      : "";
    state.renderedMode = state.mode;
    state.renderedBreakpointMode = breakpointMode;
    panel.classList.toggle("is-breakpoint-active", breakpointMode);
    panel.style.setProperty("--preview-dev-tab-count", String(Math.max(1, tabs.length)));

    panel.innerHTML = `
      <header class="preview-dev-panel__header">
        <div class="preview-dev-panel__title-row">
          <div>
            <p class="preview-dev-panel__eyebrow">Dev Mode</p>
            <h2 class="preview-dev-panel__title">Preview Code</h2>
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
      ${
        breakpointMode
          ? `
            <div class="preview-dev-panel__split" data-preview-dev-split>
              <div class="preview-dev-panel__split-pane">
                <div class="${editorBodyClass}" data-preview-dev-body>
                  <div class="preview-dev-panel__row-highlights" data-preview-dev-row-highlights></div>
                  <div class="preview-dev-panel__line-numbers" data-preview-dev-line-numbers aria-hidden="true"></div>
                  <div class="preview-dev-panel__layer-gutter" data-preview-dev-layer-gutter></div>
                  <pre class="preview-dev-panel__code" data-preview-dev-code aria-hidden="true"><code>${highlightCode(state.editorValue, state.mode)}\n</code></pre>
                  <textarea class="preview-dev-panel__editor" data-preview-dev-editor spellcheck="false" aria-label="${escapeHtml(state.mode)} editor">${escapeHtml(state.editorValue)}</textarea>
                  ${emptyCodeMessage}
                  ${filterFooter}
                </div>
              </div>
              <div class="preview-dev-panel__split-pane preview-dev-panel__split-pane--overrides" data-preview-dev-overrides-pane>
                <div class="preview-dev-panel__split-resize-handle" data-preview-dev-split-resize-handle role="separator" aria-orientation="horizontal" aria-label="Resize JSON Overrides area" tabindex="0"></div>
                <div class="preview-dev-panel__section-header" data-preview-dev-overrides-header>
                  <h3 class="preview-dev-panel__section-heading">JSON</h3>
                  <span class="preview-dev-panel__section-meta">Overrides</span>
                </div>
                <div class="preview-dev-panel__body" data-preview-dev-overrides-body>
                  <div class="preview-dev-panel__row-highlights" data-preview-dev-overrides-row-highlights></div>
                  <div class="preview-dev-panel__line-numbers" data-preview-dev-overrides-line-numbers aria-hidden="true"></div>
                  <pre class="preview-dev-panel__code" data-preview-dev-overrides-code aria-hidden="true"><code>${highlightCode(state.overridesValue, "overrides")}\n</code></pre>
                  <textarea class="preview-dev-panel__editor" data-preview-dev-overrides-editor spellcheck="false" aria-label="Overrides viewer" readonly aria-readonly="true">${escapeHtml(state.overridesValue)}</textarea>
                </div>
              </div>
            </div>
          `
          : `
            <div class="${editorBodyClass}" data-preview-dev-body>
              <div class="preview-dev-panel__row-highlights" data-preview-dev-row-highlights></div>
              <div class="preview-dev-panel__line-numbers" data-preview-dev-line-numbers aria-hidden="true"></div>
              <div class="preview-dev-panel__layer-gutter" data-preview-dev-layer-gutter></div>
              <pre class="preview-dev-panel__code" data-preview-dev-code aria-hidden="true"><code>${highlightCode(state.editorValue, state.mode)}\n</code></pre>
              <textarea class="preview-dev-panel__editor" data-preview-dev-editor spellcheck="false" aria-label="${escapeHtml(state.mode)} editor">${escapeHtml(state.editorValue)}</textarea>
              ${emptyCodeMessage}
              ${filterFooter}
            </div>
          `
      }
      <div class="preview-dev-panel__resize-handle" data-preview-dev-resize-handle role="separator" aria-orientation="vertical" aria-label="Resize Dev Mode drawer" tabindex="0"></div>
    `;

    syncToggleState();
    syncLayout();
    syncOverridesPaneLayout();
    ensurePreviewStateObserver();
    syncLineNumbers();
    syncOverridesLineNumbers();
    syncHtmlLayerDecorations();
    syncOverridesLayerDecorations();
    syncOverridesSyncState();
    schedulePreviewHoverOverlaySync();
  }

  function syncToggleState() {
    const toggle = document.querySelector("[data-preview-dev-toggle]");

    if (toggle instanceof HTMLButtonElement) {
      toggle.classList.toggle("is-active", state.open);
      toggle.setAttribute("aria-expanded", state.open ? "true" : "false");
    }
  }

  let actionRailOrderObserver = null;
  let actionRailOrderSyncing = false;

  function getActionRailRank(node) {
    if (!(node instanceof Element)) {
      return 50;
    }

    if (node.matches("[data-vibe-drawer-toggle], [data-customizer-drawer-toggle]")) {
      return 20;
    }

    if (node.matches("[data-comments-drawer-toggle]")) {
      return 30;
    }

    if (node.matches("[data-uploads-drawer-toggle]")) {
      return 40;
    }

    if (node.matches("[data-preview-dev-divider]")) {
      return 90;
    }

    if (node.matches("[data-preview-dev-toggle]")) {
      return 100;
    }

    return 10;
  }

  function syncActionRailOrder() {
    const sideActions = document.querySelector("[data-side-actions]");

    if (!(sideActions instanceof HTMLElement) || actionRailOrderSyncing) {
      return;
    }

    const currentChildren = Array.from(sideActions.children);
    const orderedChildren = currentChildren
      .map((node, index) => ({ node, index, rank: getActionRailRank(node) }))
      .sort((first, second) => first.rank - second.rank || first.index - second.index)
      .map((entry) => entry.node);

    const alreadyOrdered = orderedChildren.every((node, index) => node === currentChildren[index]);

    if (alreadyOrdered) {
      return;
    }

    actionRailOrderSyncing = true;

    try {
      orderedChildren.forEach((node) => sideActions.append(node));
    } finally {
      actionRailOrderSyncing = false;
    }
  }

  function observeActionRailOrder() {
    const sideActions = document.querySelector("[data-side-actions]");

    if (!(sideActions instanceof HTMLElement) || actionRailOrderObserver) {
      return;
    }

    actionRailOrderObserver = new MutationObserver(() => {
      window.requestAnimationFrame(syncActionRailOrder);
    });
    actionRailOrderObserver.observe(sideActions, { childList: true });
  }

  function setOpen(nextOpen) {
    state.open = !!nextOpen;

    if (state.open) {
      syncModeToBreakpointState();
    }

    render();
  }

  panel.addEventListener(
    "pointerdown",
    (event) => {
      const target = event.target;

      if (!(target instanceof Element)) {
        return;
      }

      const layerToggle = target.closest("[data-preview-dev-layer-toggle]");

      if (layerToggle) {
        event.preventDefault();
        event.stopPropagation();
        state.layerTogglePointerActivatedUntil = performance.now() + 350;
        activateHtmlLayerVisibilityToggle(layerToggle);
        return;
      }

      const splitResizeHandle = target.closest("[data-preview-dev-split-resize-handle]");

      if (splitResizeHandle) {
        event.preventDefault();
        event.stopPropagation();
        startOverridesPaneResize(event);
        return;
      }

      const resizeHandle = target.closest("[data-preview-dev-resize-handle]");

      if (resizeHandle) {
        event.preventDefault();
        event.stopPropagation();
        startPanelResize(event);
      }
    },
    true,
  );

  document.addEventListener("pointermove", (event) => {
    updatePanelResize(event);
    updateOverridesPaneResize(event);
  });

  document.addEventListener("pointerup", () => {
    endPanelResize();
    endOverridesPaneResize();
  });
  document.addEventListener("pointercancel", () => {
    endPanelResize();
    endOverridesPaneResize();
  });

  document.addEventListener(
    "pointerdown",
    (event) => {
      if (!state.open || panel.contains(event.target)) {
        return;
      }

      const element = getClosestPreviewLayerElement(event.target);

      if (element instanceof Element) {
        state.allowCssRefilterFromSelection = true;
        state.allowJsRefilterFromSelection = true;
      }
    },
    true
  );

  panel.addEventListener("click", (event) => {
    const target = event.target;

    if (!(target instanceof Element)) {
      return;
    }

    event.stopPropagation();

    const closeButton = target.closest("[data-preview-dev-close]");

    if (closeButton) {
      event.preventDefault();
      setOpen(false);
      return;
    }

    const layerToggle = target.closest("[data-preview-dev-layer-toggle]");

    if (layerToggle) {
      event.preventDefault();
      event.stopPropagation();
      if (performance.now() > Number(state.layerTogglePointerActivatedUntil || 0)) {
        activateHtmlLayerVisibilityToggle(layerToggle);
      }
      return;
    }

    const cssSeeAll = target.closest("[data-preview-dev-css-see-all]");

    if (cssSeeAll) {
      event.preventDefault();
      const mergedCss = getCssOutputValue();
      state.cssShowAll = true;
      state.cssFullValue = formatCssForEditor(mergedCss);
      state.editorValue = formatCssForEditor(mergedCss);
      state.dirty = true;
      state.error = "";
      state.status = "";
      state.hoveredCssRule = null;
      activatePreviewHoverForElements([]);
      resetCodeHistory();
      applyLivePreview();
      scheduleAutosave();
      render();
      return;
    }

    const jsSeeAll = target.closest("[data-preview-dev-js-see-all]");

    if (jsSeeAll) {
      event.preventDefault();
      const mergedJs = getJsOutputValue();
      state.jsShowAll = true;
      state.jsFullValue = mergedJs;
      state.editorValue = mergedJs;
      state.dirty = true;
      state.error = "";
      state.status = "";
      state.hoveredJsBlock = null;
      activatePreviewHoverForElements([]);
      resetCodeHistory();
      applyLivePreview();
      scheduleAutosave();
      render();
      return;
    }

    const tabButton = target.closest("[data-preview-dev-tab]");

    if (tabButton) {
      event.preventDefault();
      event.stopPropagation();
      const nextMode = String(tabButton.getAttribute("data-preview-dev-tab") || "").trim();

      if (!nextMode || nextMode === state.mode) {
        return;
      }

      state.mode = nextMode;
      if (state.mode === "css") {
        state.cssFullValue = formatCssForEditor(getEffectivePreview().css || "");
        state.cssFilterSignature = getCssFilterSignature();
      } else if (state.mode === "js") {
        state.jsFullValue = String(getEffectivePreview().js || "");
        state.jsFilterSignature = getJsFilterSignature();
      }
      state.editorValue = getContentForMode(nextMode);
      state.dirty = false;
      state.error = "";
      state.status = "";
      state.hoveredHtmlLine = -1;
      state.hoveredCssRule = null;
      state.hoveredJsBlock = null;
      state.hoveredOverridePath = "";
      activatePreviewHoverForElements([]);
      resetCodeHistory();
      render();
      return;
    }

    if (target instanceof HTMLTextAreaElement && target.matches("[data-preview-dev-editor]")) {
      if (state.mode === "html") {
        const line = getHtmlLayerLineFromPointer(event);

        if (line >= 0) {
          state.suppressHtmlCaretSelectUntil = performance.now() + 250;
          selectPreviewElementForHtmlLine(line);
        }

        return;
      }

      window.requestAnimationFrame(() => {
        syncLineNumbers();
        if (state.mode === "css") {
          const rule = getCssRuleFromPointer(event);
          const element = getPreviewElementsForCssRule(rule)[0] || null;

          if (element instanceof Element) {
            selectPreviewElement(element);
          }
        } else if (state.mode === "js") {
          const block = getJsBlockFromPointer(event);
          const element = getPreviewElementsForJsBlock(block)[0] || null;

          if (element instanceof Element) {
            selectPreviewElement(element);
          }
        }
      });
      return;
    }

    if (target instanceof HTMLTextAreaElement && target.matches("[data-preview-dev-overrides-editor]")) {
      window.requestAnimationFrame(() => {
        syncOverridesLineNumbers();
        const layerPath = getOverrideLayerPathFromPointer(event);
        const element = getPreviewElementForLayerPath(layerPath);

        if (element instanceof Element) {
          selectPreviewElement(element);
        }
      });
      return;
    }

    if (target.closest("[data-preview-dev-body]") && state.mode === "html") {
      const line = getHtmlLayerLineFromPointer(event);

      if (line >= 0) {
        selectPreviewElementForHtmlLine(line);
      }
    }
  });

  panel.addEventListener(
    "pointerdown",
    (event) => {
      const target = event.target;

      if (target instanceof Element && target.closest("[data-preview-dev-tab]")) {
        event.stopPropagation();
      }
    },
    true
  );

  panel.addEventListener(
    "mousedown",
    (event) => {
      const target = event.target;

      if (target instanceof Element && target.closest("[data-preview-dev-tab]")) {
        event.stopPropagation();
      }
    },
    true
  );

  panel.addEventListener("pointerdown", (event) => {
    event.stopPropagation();
  });

  panel.addEventListener("mousedown", (event) => {
    event.stopPropagation();
  });

  panel.addEventListener("input", (event) => {
    const target = event.target;

    if (!(target instanceof HTMLTextAreaElement)) {
      return;
    }

    if (target.matches("[data-preview-dev-overrides-editor]")) {
      target.value = state.overridesValue;
      syncHighlightText();
      return;
    }

    if (!target.matches("[data-preview-dev-editor]")) {
      return;
    }

    state.editorValue = target.value;
    state.codeEditingUntil = performance.now() + 1200;
    state.dirty = true;
    state.status = "";
    state.error = "";
    commitCodeHistory(state.editorValue, getEditorLineFromOffset(target.value, target.selectionStart || 0));
    syncHighlightText();
    applyLivePreview();
    scheduleAutosave();
  });

  panel.addEventListener("scroll", (event) => {
    const target = event.target;

    if (target instanceof HTMLTextAreaElement && (target.matches("[data-preview-dev-editor]") || target.matches("[data-preview-dev-overrides-editor]"))) {
      syncHighlightScroll();
    }
  }, true);

  panel.addEventListener("pointermove", (event) => {
    const target = event.target;

    if (!(target instanceof Element)) {
      return;
    }

    if (target.closest("[data-preview-dev-overrides-body]")) {
      setCodeHoveredLine(-1);
      setCssHoveredRule(null);
      setJsHoveredBlock(null);
      setOverridesHoveredPath(getOverrideLayerPathFromPointer(event));
      return;
    }

    if (state.mode === "css" && target.closest("[data-preview-dev-body]")) {
      setCodeHoveredLine(-1);
      setOverridesHoveredPath("");
      setJsHoveredBlock(null);
      setCssHoveredRule(getCssRuleFromPointer(event));
      return;
    }

    if (state.mode === "js" && target.closest("[data-preview-dev-body]")) {
      setCodeHoveredLine(-1);
      setCssHoveredRule(null);
      setOverridesHoveredPath("");
      setJsHoveredBlock(getJsBlockFromPointer(event));
      return;
    }

    if (state.mode !== "html" || !target.closest("[data-preview-dev-body]")) {
      return;
    }

    setCssHoveredRule(null);
    setJsHoveredBlock(null);
    setOverridesHoveredPath("");
    setCodeHoveredLine(getHtmlLayerLineFromPointer(event));
  });

  panel.addEventListener("pointerleave", (event) => {
    const nextTarget = event.relatedTarget;

    if (nextTarget instanceof Node && panel.contains(nextTarget)) {
      return;
    }

    setCodeHoveredLine(-1);
    setCssHoveredRule(null);
    setJsHoveredBlock(null);
    setOverridesHoveredPath("");
  });

  panel.addEventListener("keyup", (event) => {
    const target = event.target;

    if (!(target instanceof HTMLTextAreaElement)) {
      return;
    }

    if (target.matches("[data-preview-dev-overrides-editor]")) {
      const navigationKeys = new Set(["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Home", "End", "PageUp", "PageDown"]);

      if (navigationKeys.has(event.key)) {
        syncOverridesLineNumbers();
      }
      return;
    }

    if (!target.matches("[data-preview-dev-editor]")) {
      return;
    }

    const navigationKeys = new Set(["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Home", "End", "PageUp", "PageDown"]);

    if (navigationKeys.has(event.key)) {
      syncLineNumbers();
      if (state.mode === "html") {
        selectPreviewElementForEditorCaret(target);
      }
    }
  });

  panel.addEventListener("select", (event) => {
    const target = event.target;

    if (!(target instanceof HTMLTextAreaElement)) {
      return;
    }

    if (target.matches("[data-preview-dev-overrides-editor]")) {
      window.requestAnimationFrame(syncOverridesLineNumbers);
      return;
    }

    if (!target.matches("[data-preview-dev-editor]")) {
      return;
    }

    window.requestAnimationFrame(() => {
      syncLineNumbers();
      if (state.mode === "html") {
        if (performance.now() < Number(state.suppressHtmlCaretSelectUntil || 0)) {
          return;
        }

        selectPreviewElementForEditorCaret(target);
      }
    });
  });

  document.addEventListener("mouseover", (event) => {
    if (!state.open || panel.contains(event.target)) {
      return;
    }

    const element = getClosestPreviewLayerElement(event.target);
    const line = getHtmlLineForPreviewElement(element);
    const path = getPreviewLayerPathForElement(element);

    if (path !== state.previewHoveredLayerPath || (state.mode === "html" && line >= 0 && line !== state.previewHoveredHtmlLine)) {
      state.previewHoveredLayerPath = path;
      state.previewHoveredHtmlLine = state.mode === "html" ? line : -1;
      syncHtmlLayerDecorations();
      syncOverridesLayerDecorations();
    }
  });

  document.addEventListener("mouseout", (event) => {
    if (!state.open || panel.contains(event.target)) {
      return;
    }

    const element = getClosestPreviewLayerElement(event.target);

    if (!(element instanceof Element)) {
      return;
    }

    const relatedElement = getClosestPreviewLayerElement(event.relatedTarget);

    if (relatedElement === element || (relatedElement instanceof Element && element.contains(relatedElement))) {
      return;
    }

    if (state.previewHoveredHtmlLine !== -1 || state.previewHoveredLayerPath) {
      state.previewHoveredHtmlLine = -1;
      state.previewHoveredLayerPath = "";
      syncHtmlLayerDecorations();
      syncOverridesLayerDecorations();
    }
  });

  document.addEventListener("click", (event) => {
    if (state.mode !== "html" || !state.open || panel.contains(event.target)) {
      return;
    }

    const element = getClosestPreviewLayerElement(event.target);
    const line = getHtmlLineForPreviewElement(element);

    if (line >= 0) {
      state.allowCssRefilterFromSelection = true;
      state.selectedHtmlLine = line;
      syncHtmlLayerDecorations();
      window.requestAnimationFrame(syncPreviewLayerStateFromDom);
    }
  });

  panel.addEventListener("keydown", (event) => {
    const target = event.target;

    if (!(target instanceof HTMLTextAreaElement)) {
      return;
    }

    const isOverridesEditor = target.matches("[data-preview-dev-overrides-editor]");

    if (!isOverridesEditor && !target.matches("[data-preview-dev-editor]")) {
      return;
    }

    if (isOverridesEditor) {
      return;
    }

    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "z") {
      event.preventDefault();
      applyCodeHistoryStep(event.shiftKey ? 1 : -1, target);
      return;
    }

    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "y") {
      event.preventDefault();
      applyCodeHistoryStep(1, target);
      return;
    }

    if (event.key === "Tab") {
      event.preventDefault();
      const start = target.selectionStart || 0;
      const end = target.selectionEnd || 0;
      const nextValue = `${target.value.slice(0, start)}  ${target.value.slice(end)}`;
      target.value = nextValue;
      target.selectionStart = target.selectionEnd = start + 2;
      target.dispatchEvent(new Event("input", { bubbles: true }));
    }
  });

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

    if ((getBreakpointMode() || state.pendingBreakpointCodeSave) && state.mode !== "overrides") {
      payload.syncBase = false;
    } else if (state.mode === "html") {
      payload.html = state.editorValue;
    } else if (state.mode === "css") {
      payload.css = getCssOutputValue();
    } else if (state.mode === "js") {
      payload.js = getJsOutputValue();
    }

    payload.breakpointOverrides = JSON.parse(state.overridesValue || "{}");

    return payload;
  }

  async function autosave() {
    if (!state.page || !state.project) {
      return;
    }

    if (state.saving) {
      if (!state.autosaveTimer) {
        state.autosaveTimer = window.setTimeout(() => {
          state.autosaveTimer = 0;
          void autosave();
        }, 250);
      }
      return;
    }

    let payload;

    try {
      payload = state.pendingAutosavePayload || getSavePayload();
    } catch (error) {
      state.error = error instanceof Error ? error.message : "Overrides must be valid JSON.";
      state.status = "";
      return;
    }

    const savedMode = payload.__mode || state.mode;
    const savedEditorKey = payload.__editorKey || "main";
    const savedValue = payload.__value ?? state.editorValue;
    delete payload.__mode;
    delete payload.__editorKey;
    delete payload.__value;
    state.pendingAutosavePayload = null;

    const requestId = state.saveRequestId + 1;
    state.saving = true;
    state.error = "";
    state.status = "Saving";
    state.saveRequestId = requestId;

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

      if (requestId !== state.saveRequestId) {
        return;
      }

      const canMarkClean =
        savedEditorKey === "overrides" ? state.overridesValue === savedValue : state.mode === savedMode && state.editorValue === savedValue;
      const wasDirty = state.dirty;
      const wasOverridesDirty = state.overridesDirty;
      if (canMarkClean) {
        if (savedEditorKey === "overrides") {
          state.overridesDirty = false;
        } else {
          state.dirty = false;
        }
      }
      applyProject(result.project, payload.page);
      state.pendingBreakpointCodeSave = false;
      state.dirty = savedEditorKey === "overrides" ? wasDirty : !canMarkClean && wasDirty;
      state.overridesDirty = savedEditorKey === "overrides" ? !canMarkClean && wasOverridesDirty : wasOverridesDirty;
      if (canMarkClean) {
        if (savedEditorKey === "overrides") {
          state.overridesDirty = false;
        } else {
          state.dirty = false;
        }
      }
      state.status = "Saved";
    } catch (error) {
      state.error = error instanceof Error ? error.message : "Unable to save preview code.";
      state.status = "";
    } finally {
      if (requestId === state.saveRequestId) {
        state.saving = false;
      }
    }
  }

  function applyProject(project, pageId = requestedPageId) {
    const normalizedPageId = String(pageId || document.body.dataset.pageKey || requestedPageId || "").trim().toLowerCase();
    const pages = Array.isArray(project?.pages) ? project.pages : [];
    const page = pages.find((entry) => String(entry?.id || "").trim().toLowerCase() === normalizedPageId) || pages[0] || null;

    state.project = project || null;
    state.page = page;
    state.cssFullValue = formatCssForEditor(getEffectivePreview().css || "");
    state.cssFilterSignature = state.mode === "css" ? getCssFilterSignature() : "";
    state.jsFullValue = String(getEffectivePreview().js || "");
    state.jsFilterSignature = state.mode === "js" ? getJsFilterSignature() : "";

    if (!state.dirty) {
      state.editorValue = getContentForMode(state.mode);
    }

    if (!state.overridesDirty) {
      state.overridesValue = getContentForMode("overrides");
    }

    syncOverridesEditorFromPreview({ force: true });
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

    if (!sideActions) {
      return false;
    }

    if (document.querySelector("[data-preview-dev-toggle]")) {
      observeActionRailOrder();
      syncActionRailOrder();
      return true;
    }

    const uploadsToggle = sideActions.querySelector("[data-uploads-drawer-toggle]");

    if (!uploadsToggle) {
      return false;
    }

    const divider = document.createElement("span");
    divider.className = "preview-dev-divider";
    divider.setAttribute("data-preview-dev-divider", "");
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
    observeActionRailOrder();
    syncActionRailOrder();
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

  window.addEventListener("uxbridge:breakpoint-overrides-change", (event) => {
    applyRuntimeOverridesChange(event.detail || {});
  });

  const mutationObserver = new MutationObserver(() => {
    const nextBreakpointMode = getBreakpointMode();

    if (!state.open) {
      syncToggleState();
      state.renderedBreakpointMode = nextBreakpointMode;
      syncOverridesSyncState();
      return;
    }

    if (state.renderedBreakpointMode !== nextBreakpointMode) {
      syncModeToBreakpointState({ preserveDirty: true });
      render();
      return;
    }

    syncLayout();
    syncOverridesSyncState();
  });

  mutationObserver.observe(document.body, { attributes: true, attributeFilter: ["class"] });
  window.addEventListener("resize", () => {
    syncLayout();
    syncOverridesPaneLayout();
    schedulePreviewHoverOverlaySync();
  });
  document.addEventListener("scroll", schedulePreviewHoverOverlaySync, true);
  window.addEventListener("uxbridge:drawer-open", () => {
    window.requestAnimationFrame(syncLayout);
    window.requestAnimationFrame(syncActionRailOrder);
    window.requestAnimationFrame(syncPreviewHoverOverlay);
  });
  window.addEventListener("uxbridge:preview-layout-change", () => {
    window.requestAnimationFrame(syncLayout);
    window.requestAnimationFrame(syncActionRailOrder);
    window.requestAnimationFrame(syncPreviewHoverOverlay);
  });

  initToggleWhenReady();
  void loadProject();
  render();
})();
