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
    renderedMode: "",
    renderedBreakpointMode: null,
    hoveredHtmlLine: -1,
    previewHoveredHtmlLine: -1,
    selectedHtmlLine: -1,
    activePreviewHoverElement: null,
  };
  let previewStateObserver = null;
  let previewHoverOverlay = null;
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
      position: fixed;
      top: 0;
      right: 0;
      bottom: 0;
      z-index: 1315;
      display: grid;
      grid-template-rows: auto minmax(0, 1fr) auto;
      width: var(--preview-dev-panel-width, 300px);
      max-width: var(--preview-dev-panel-width, 300px);
      box-sizing: border-box;
      overflow: hidden;
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

    body.breakpoint-specific-active .preview-dev-layer-hover-overlay {
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

    body.breakpoint-specific-active .preview-dev-layer-hover-overlay__label {
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
      padding: var(--preview-dev-editor-padding-top) 16px 14px 42px;
      overflow: auto;
      font: 12px/1.55 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
      tab-size: 2;
      white-space: pre;
      overflow-wrap: normal;
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
      left: 0;
      z-index: 3;
      width: 36px;
      overflow: hidden;
      pointer-events: none;
    }

    .preview-dev-panel__layer-toggle {
      position: absolute;
      left: 8px;
      display: grid;
      width: 22px;
      height: 22px;
      place-items: center;
      border: 0;
      border-radius: 999px;
      color: #94a3b8;
      background: transparent;
      opacity: 0;
      pointer-events: none;
      transform: translateY(-2px);
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

    return formatHtmlForEditor(preview.html || "");
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
    const drawerWidth = getActiveDrawerWidth();

    panel.style.right = `${drawerWidth}px`;
    document.body.classList.toggle("preview-dev-open", state.open);
  }

  function syncHighlightScroll() {
    const editor = panel.querySelector("[data-preview-dev-editor]");
    const code = panel.querySelector("[data-preview-dev-code]");

    if (editor instanceof HTMLTextAreaElement && code instanceof HTMLElement) {
      code.scrollTop = editor.scrollTop;
      code.scrollLeft = editor.scrollLeft;
    }

    syncHtmlLayerDecorations();
  }

  function syncHighlightText() {
    const code = panel.querySelector("[data-preview-dev-code]");

    if (code) {
      code.innerHTML = `${highlightCode(state.editorValue, state.mode)}\n`;
    }

    syncHtmlLayerDecorations();
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

    return String(value || "")
      .split("\n")
      .map((line, index) => {
        const match = line.match(/^\s*<(?!\/|!)([A-Za-z][\w:-]*)(?:\s|>|\/)/);

        if (!match) {
          return null;
        }

        ordinal += 1;

        return {
          line: index,
          ordinal,
          hidden: isHtmlLayerHidden(line),
        };
      })
      .filter(Boolean);
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

  function ensurePreviewHoverOverlay() {
    if (previewHoverOverlay instanceof HTMLElement) {
      return previewHoverOverlay;
    }

    previewHoverOverlay = document.createElement("div");
    previewHoverOverlay.className = "preview-dev-layer-hover-overlay";
    previewHoverOverlay.setAttribute("data-preview-dev-layer-hover-overlay", "");
    previewHoverOverlay.innerHTML = `<span class="preview-dev-layer-hover-overlay__label" data-preview-dev-layer-hover-label></span>`;
    document.body.append(previewHoverOverlay);
    return previewHoverOverlay;
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
    const overlay = ensurePreviewHoverOverlay();
    const element = state.activePreviewHoverElement instanceof Element ? state.activePreviewHoverElement : null;

    if (!state.open || state.mode !== "html" || !(element instanceof Element) || !element.isConnected) {
      overlay.classList.remove("is-visible");
      return;
    }

    const rect = element.getBoundingClientRect();

    if (rect.width <= 0 || rect.height <= 0) {
      overlay.classList.remove("is-visible");
      return;
    }

    overlay.style.left = `${rect.left}px`;
    overlay.style.top = `${rect.top}px`;
    overlay.style.width = `${rect.width}px`;
    overlay.style.height = `${rect.height}px`;
    overlay.querySelector("[data-preview-dev-layer-hover-label]")?.replaceChildren(getPreviewHoverLabel(rect));
    overlay.classList.add("is-visible");
  }

  function schedulePreviewHoverOverlaySync() {
    if (previewHoverOverlayFrame) {
      return;
    }

    previewHoverOverlayFrame = window.requestAnimationFrame(syncPreviewHoverOverlay);
  }

  function activatePreviewHoverForLine(line) {
    const nextElement = line >= 0 ? getPreviewElementForHtmlLine(line) : null;
    const previousElement = state.activePreviewHoverElement instanceof Element ? state.activePreviewHoverElement : null;

    if (previousElement === nextElement) {
      return;
    }

    if (previousElement) {
      dispatchLayerMouseEvent(previousElement, "mouseout", nextElement || document.body);
    }

    state.activePreviewHoverElement = nextElement instanceof Element ? nextElement : null;

    if (nextElement instanceof Element) {
      dispatchLayerMouseEvent(nextElement, "mouseover", previousElement || document.body);
    }

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

  function syncPreviewLayerStateFromDom() {
    if (state.mode !== "html") {
      state.previewHoveredHtmlLine = -1;
      state.selectedHtmlLine = -1;
      syncHtmlLayerDecorations();
      return;
    }

    const root = getPreviewRenderRoot();

    if (!(root instanceof Element)) {
      return;
    }

    const hoveredElement = root.querySelector('[data-ux-layer-hovered]:not([data-ux-layer-hovered="false"])');
    const selectedElement = root.querySelector('[data-ux-layer-selected]:not([data-ux-layer-selected="false"])');
    const nextPreviewHoverLine = hoveredElement instanceof Element ? getHtmlLineForPreviewElement(hoveredElement) : -1;
    const nextSelectedLine = selectedElement instanceof Element ? getHtmlLineForPreviewElement(selectedElement) : -1;

    if (nextPreviewHoverLine !== state.previewHoveredHtmlLine || nextSelectedLine !== state.selectedHtmlLine) {
      state.previewHoveredHtmlLine = nextPreviewHoverLine;
      state.selectedHtmlLine = nextSelectedLine;
      syncHtmlLayerDecorations();
    }
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
    previewStateObserver = new MutationObserver(() => syncPreviewLayerStateFromDom());
    previewStateObserver.__previewRoot = root;
    previewStateObserver.observe(root, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ["data-ux-layer-hovered", "data-ux-layer-selected"],
    });
    syncPreviewLayerStateFromDom();
  }

  function isHtmlLayerHidden(line) {
    return (
      /\sdata-ux-layer-hidden-control=(["'])true\1/i.test(line) ||
      /\sdata-ux-layer-visible=(["'])false\1/i.test(line) ||
      /\saria-hidden=(["'])true\1/i.test(line) ||
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
    const visibleRows = rows.filter((row) => row.hidden || row.line === hoverLine);
    const paddingTop = getEditorMetric(editor, "padding-top", 14);
    const lineHeight = getEditorMetric(editor, "line-height", 18.6);
    const scrollTop = editor.scrollTop || 0;

    if (rowHighlights instanceof HTMLElement) {
      const highlightRows = rows.filter((row) => row.line === hoverLine || row.line === selectedLine);
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
        const top = paddingTop + row.line * lineHeight - scrollTop;
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
            aria-label="${label}"
            title="${label}"
          >
            ${iconMarkup(row.hidden)}
          </button>
        `;
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

  function getStyleAttribute(tag) {
    const match = tag.match(/\sstyle=(["'])([\s\S]*?)\1/i);
    return match ? { quote: match[1], value: match[2] } : null;
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

  function updateHtmlLayerLine(line, hidden) {
    const match = line.match(/^(\s*)(<[^>]+>)([\s\S]*)$/);

    if (!match) {
      return line;
    }

    let tag = match[2];

    if (hidden) {
      tag = setAttributeOnTag(tag, "data-ux-layer-hidden-control", "true");
      tag = setAttributeOnTag(tag, "data-ux-layer-visible", "false");
      tag = setAttributeOnTag(tag, "aria-hidden", "true");
      tag = updateStyleAttribute(tag, {
        visibility: "hidden",
        "pointer-events": "none",
      });
    } else {
      tag = removeAttributeFromTag(tag, "data-ux-layer-hidden-control");
      tag = removeAttributeFromTag(tag, "data-ux-layer-visible");
      tag = removeAttributeFromTag(tag, "aria-hidden");
      tag = updateStyleAttribute(tag, {
        visibility: null,
        "pointer-events": null,
      });
    }

    return `${match[1]}${tag}${match[3]}`;
  }

  function toggleHtmlLayerVisibility(lineIndex) {
    if (state.mode !== "html" || !Number.isInteger(lineIndex) || lineIndex < 0) {
      return;
    }

    const editor = panel.querySelector("[data-preview-dev-editor]");
    const lines = String(state.editorValue || "").split("\n");

    if (!lines[lineIndex]) {
      return;
    }

    const nextHidden = !isHtmlLayerHidden(lines[lineIndex]);
    lines[lineIndex] = updateHtmlLayerLine(lines[lineIndex], nextHidden);
    state.editorValue = lines.join("\n");
    state.dirty = true;
    state.error = "";
    state.status = "Unsaved changes";

    if (editor instanceof HTMLTextAreaElement) {
      const scrollTop = editor.scrollTop;
      const scrollLeft = editor.scrollLeft;
      editor.value = state.editorValue;
      editor.scrollTop = scrollTop;
      editor.scrollLeft = scrollLeft;
      editor.focus();
    }

    syncHighlightText();
    syncHighlightScroll();
    setStatus("Unsaved changes");
  }

  function selectPreviewElementForHtmlLine(line) {
    const element = getPreviewElementForHtmlLine(line);

    if (!(element instanceof Element)) {
      return;
    }

    state.selectedHtmlLine = line;
    syncHtmlLayerDecorations();

    element.dispatchEvent(
      new MouseEvent("click", {
        bubbles: true,
        cancelable: true,
        view: window,
      }),
    );

    window.requestAnimationFrame(syncPreviewLayerStateFromDom);
  }

  function render() {
    syncModeToBreakpointState({ preserveDirty: true });
    const tabs = getModeTabs();
    const breakpointMode = getBreakpointMode();
    state.renderedMode = state.mode;
    state.renderedBreakpointMode = breakpointMode;
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
      <div class="preview-dev-panel__body" data-preview-dev-body>
        <div class="preview-dev-panel__row-highlights" data-preview-dev-row-highlights></div>
        <div class="preview-dev-panel__layer-gutter" data-preview-dev-layer-gutter></div>
        <pre class="preview-dev-panel__code" data-preview-dev-code aria-hidden="true"><code>${highlightCode(state.editorValue, state.mode)}\n</code></pre>
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

    syncToggleState();
    syncLayout();
    ensurePreviewStateObserver();
    syncHtmlLayerDecorations();
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

  panel.addEventListener("click", (event) => {
    const target = event.target;

    if (!(target instanceof Element)) {
      return;
    }

    const closeButton = target.closest("[data-preview-dev-close]");

    if (closeButton) {
      event.preventDefault();
      setOpen(false);
      return;
    }

    const layerToggle = target.closest("[data-preview-dev-layer-toggle]");

    if (layerToggle) {
      event.preventDefault();
      const line = Number.parseInt(String(layerToggle.getAttribute("data-preview-dev-line") || ""), 10);
      toggleHtmlLayerVisibility(line);
      return;
    }

    const tabButton = target.closest("[data-preview-dev-tab]");

    if (tabButton) {
      event.preventDefault();
      const nextMode = String(tabButton.getAttribute("data-preview-dev-tab") || "").trim();

      if (!nextMode || nextMode === state.mode) {
        return;
      }

      state.mode = nextMode;
      state.editorValue = getContentForMode(nextMode);
      state.dirty = false;
      state.error = "";
      state.status = "";
      render();
      return;
    }

    if (target.closest("[data-preview-dev-revert]")) {
      event.preventDefault();
      state.editorValue = getContentForMode(state.mode);
      state.dirty = false;
      state.error = "";
      state.status = "Reverted";
      render();
      return;
    }

    if (target.closest("[data-preview-dev-save]")) {
      event.preventDefault();
      void save();
    }

    if (target.closest("[data-preview-dev-body]") && state.mode === "html") {
      const line = getHtmlLayerLineFromPointer(event);

      if (line >= 0) {
        selectPreviewElementForHtmlLine(line);
      }
    }
  });

  panel.addEventListener("input", (event) => {
    const target = event.target;

    if (!(target instanceof HTMLTextAreaElement) || !target.matches("[data-preview-dev-editor]")) {
      return;
    }

    state.editorValue = target.value;
    state.dirty = true;
    state.status = "";
    state.error = "";
    syncHighlightText();

    const status = panel.querySelector("[data-preview-dev-status]");

    if (status) {
      status.textContent = "Unsaved changes";
      status.classList.remove("is-error");
    }
  });

  panel.addEventListener("scroll", (event) => {
    const target = event.target;

    if (target instanceof HTMLTextAreaElement && target.matches("[data-preview-dev-editor]")) {
      syncHighlightScroll();
    }
  }, true);

  panel.addEventListener("pointermove", (event) => {
    if (state.mode !== "html") {
      return;
    }

    const target = event.target;

    if (!(target instanceof Element) || !target.closest("[data-preview-dev-body]")) {
      return;
    }

    setCodeHoveredLine(getHtmlLayerLineFromPointer(event));
  });

  panel.addEventListener("pointerleave", (event) => {
    const nextTarget = event.relatedTarget;

    if (nextTarget instanceof Node && panel.contains(nextTarget)) {
      return;
    }

    setCodeHoveredLine(-1);
  });

  document.addEventListener("mouseover", (event) => {
    if (state.mode !== "html" || !state.open || panel.contains(event.target)) {
      return;
    }

    const element = getClosestPreviewLayerElement(event.target);
    const line = getHtmlLineForPreviewElement(element);

    if (line >= 0 && line !== state.previewHoveredHtmlLine) {
      state.previewHoveredHtmlLine = line;
      syncHtmlLayerDecorations();
    }
  });

  document.addEventListener("mouseout", (event) => {
    if (state.mode !== "html" || !state.open || panel.contains(event.target)) {
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

    if (state.previewHoveredHtmlLine !== -1) {
      state.previewHoveredHtmlLine = -1;
      syncHtmlLayerDecorations();
    }
  });

  document.addEventListener("click", (event) => {
    if (state.mode !== "html" || !state.open || panel.contains(event.target)) {
      return;
    }

    const element = getClosestPreviewLayerElement(event.target);
    const line = getHtmlLineForPreviewElement(element);

    if (line >= 0) {
      state.selectedHtmlLine = line;
      syncHtmlLayerDecorations();
      window.requestAnimationFrame(syncPreviewLayerStateFromDom);
    }
  });

  panel.addEventListener("keydown", (event) => {
    const target = event.target;

    if (!(target instanceof HTMLTextAreaElement) || !target.matches("[data-preview-dev-editor]")) {
      return;
    }

    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "s") {
      event.preventDefault();
      void save();
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

  const mutationObserver = new MutationObserver(() => {
    const nextBreakpointMode = getBreakpointMode();

    if (!state.open) {
      syncToggleState();
      state.renderedBreakpointMode = nextBreakpointMode;
      return;
    }

    if (state.renderedBreakpointMode !== nextBreakpointMode) {
      syncModeToBreakpointState({ preserveDirty: true });
      render();
      return;
    }

    syncLayout();
  });

  mutationObserver.observe(document.body, { attributes: true, attributeFilter: ["class"] });
  window.addEventListener("resize", () => {
    syncLayout();
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
