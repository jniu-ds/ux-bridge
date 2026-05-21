(function(){let e=`/api/projects`,t=new URLSearchParams(window.location.search),n=String(t.get(`project`)||``).trim().toLowerCase(),r=String(t.get(`page`)||``).trim().toLowerCase();if(!n)return;let i={open:!1,mode:`html`,project:null,page:null,dirty:!1,saving:!1,error:``,status:``,editorValue:``,cssFullValue:``,cssFilterSignature:``,cssShowAll:!1,allowCssRefilterFromSelection:!1,jsFullValue:``,jsFilterSignature:``,overridesValue:``,renderedMode:``,renderedBreakpointMode:null,hoveredHtmlLine:-1,hoveredCssRule:null,hoveredJsBlock:null,hoveredOverridePath:``,previewHoveredHtmlLine:-1,previewHoveredLayerPath:``,previewSelectedLayerPath:``,selectedHtmlLine:-1,activePreviewHoverElement:null,activePreviewHoverElements:[],autosaveTimer:0,saveRequestId:0,pendingAutosavePayload:null,codeHistory:[],codeHistoryIndex:-1,codeHistoryMode:``,codeHistoryLine:-1,renderingLivePreview:!1,previewDomSyncFrame:0,panelWidth:300,resizingPanel:!1,resizeStartX:0,resizeStartWidth:300,overridesPaneHeight:0,resizingOverridesPane:!1,overridesResizeStartY:0,overridesResizeStartHeight:0,overridesDirty:!1,overridesSyncTimer:0},a=null,o=[],s=0,c=document.createElement(`style`);c.textContent=`
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
  `,document.head.append(c);let l=document.createElement(`aside`);l.className=`preview-dev-panel`,l.setAttribute(`data-preview-dev-panel`,``),l.setAttribute(`aria-label`,`Dev Mode`),document.body.append(l);function u(e=``){return String(e||``).replaceAll(`&`,`&amp;`).replaceAll(`<`,`&lt;`).replaceAll(`>`,`&gt;`).replaceAll(`"`,`&quot;`).replaceAll(`'`,`&#39;`)}function d(e,t,n){let r=String(e||``),i=``,a=0;return r.replace(t,(e,...t)=>{let o=t[t.length-2];return i+=u(r.slice(a,o)),i+=n(e,...t),a=o+e.length,e}),i+u(r.slice(a))}function ee(e){return d(e,/<!--[\s\S]*?-->|<\/?[A-Za-z][^>\s/]*(?:\s+[^\s=/>]+(?:=(?:"[^"]*"|'[^']*'|[^\s>]+))?)*\s*\/?>/g,e=>{if(e.startsWith(`<!--`))return`<span class="preview-dev-panel__token--comment">${u(e)}</span>`;let t=e.match(/^(<\/?)([A-Za-z][\w:-]*)([\s\S]*?)(\/?>)$/);if(!t)return`<span class="preview-dev-panel__token--tag">${u(e)}</span>`;let[,n,r,i=``,a]=t,o=d(i,/(\s+)([^\s=/>]+)(?:\s*(=)\s*("(?:(?:\\")|[^"])*"|'(?:(?:\\')|[^'])*'|[^\s>]+))?/g,(e,t,n,r,i)=>{let a=u(t);return a+=`<span class="preview-dev-panel__token--attr">${u(n)}</span>`,r&&(a+=`<span class="preview-dev-panel__token--operator">${u(r)}</span>`),i&&(a+=`<span class="preview-dev-panel__token--string">${u(i)}</span>`),a});return[`<span class="preview-dev-panel__token--punctuation">${u(n)}</span>`,`<span class="preview-dev-panel__token--tag">${u(r)}</span>`,o,`<span class="preview-dev-panel__token--punctuation">${u(a)}</span>`].join(``)})}function te(e){return d(e,/\/\*[\s\S]*?\*\/|#[0-9a-fA-F]{3,8}\b|(?:^|[;{\s])(--?[\w-]+)(?=\s*:)|\b-?\d*\.?\d+(?:px|rem|em|%|vh|vw|ms|s)?\b|"[^"]*"|'[^']*'/g,e=>e.startsWith(`/*`)?`<span class="preview-dev-panel__token--comment">${u(e)}</span>`:/^["']/.test(e)?`<span class="preview-dev-panel__token--string">${u(e)}</span>`:/#[0-9a-fA-F]/.test(e)?`<span class="preview-dev-panel__token--value">${u(e)}</span>`:/\d/.test(e.trim()[0]||``)?`<span class="preview-dev-panel__token--number">${u(e)}</span>`:u(e).replace(/(--?[\w-]+)/,`<span class="preview-dev-panel__token--property">$1</span>`))}function ne(e){return d(e,/\/\/.*|\/\*[\s\S]*?\*\/|`(?:\\[\s\S]|[^`])*`|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|\b(?:const|let|var|function|return|if|else|for|while|await|async|try|catch|new|class|import|export|from|true|false|null|undefined)\b|\b-?\d*\.?\d+\b/g,e=>e.startsWith(`//`)||e.startsWith(`/*`)?`<span class="preview-dev-panel__token--comment">${u(e)}</span>`:/^[`"']/.test(e)?`<span class="preview-dev-panel__token--string">${u(e)}</span>`:/^-?\d/.test(e)?`<span class="preview-dev-panel__token--number">${u(e)}</span>`:`<span class="preview-dev-panel__token--keyword">${u(e)}</span>`)}function re(e){return d(e,/"(?:\\.|[^"\\])*"(?=\s*:)|"(?:\\.|[^"\\])*"|[-]?\b\d*\.?\d+\b|\b(?:true|false|null)\b/g,e=>e.endsWith(`"`)&&/"\s*$/.test(e)?`<span class="preview-dev-panel__token--string">${u(e)}</span>`:/^-?\d/.test(e)?`<span class="preview-dev-panel__token--number">${u(e)}</span>`:/^(true|false|null)$/.test(e)?`<span class="preview-dev-panel__token--keyword">${u(e)}</span>`:`<span class="preview-dev-panel__token--property">${u(e)}</span>`)}function f(e,t=i.mode){return t===`css`?te(e):t===`js`?ne(e):t===`overrides`?re(e):ee(e)}function ie(e){let t=String(e||``).trim();if(!t)return``;let n=t.replace(/>\s+</g,`>
<`).split(`
`).map(e=>e.trim()).filter(Boolean),r=new Set([`a`,`b`,`br`,`code`,`em`,`i`,`img`,`input`,`label`,`path`,`span`,`strong`]),i=0;return n.map(e=>{let t=/^<\//.test(e),n=e.match(/^<\/?([A-Za-z][\w:-]*)/),a=String(n?.[1]||``).toLowerCase(),o=/\/>$/.test(e)||/^<(area|base|br|col|embed|hr|img|input|link|meta|param|source|track|wbr)\b/i.test(e),s=r.has(a)&&!e.includes(`
`);t&&(i=Math.max(0,i-1));let c=`${`  `.repeat(i)}${e}`;return!t&&!o&&!s&&/^</.test(e)&&!/<\/[A-Za-z][\w:-]*>$/.test(e)&&(i+=1),c}).join(`
`)}function p(){return i.page?.preview||i.page?.vibe?.appliedDraft||{}}function m(){return document.body.classList.contains(`breakpoint-specific-active`)||!!document.querySelector(`.preview-inspector__content--breakpoint-specific-active`)}function ae(){let e=[{id:`mobile-xs`,label:`Mobile & Extra Small`,start:320,end:480},{id:`tablet-sm`,label:`Tablet & Small`,start:481,end:768},{id:`laptop-md`,label:`Laptop & Medium`,start:769,end:1024},{id:`desktop-lg`,label:`Large Desktop`,start:1025,end:null}],t=Array.isArray(i.project?.inspectorBreakpoints)?i.project.inspectorBreakpoints:[];return e.map((e,n)=>{let r=t[n]&&typeof t[n]==`object`?t[n]:{},i=Number.parseInt(String(r.start??e.start),10),a=r.end??e.end,o=a==null||String(a).trim()===``||String(a).trim().toLowerCase()===`none`?null:Number.parseInt(String(a),10);return{id:e.id,label:String(r.label||e.label),start:Number.isFinite(i)?Math.max(0,i):e.start,end:Number.isFinite(o)&&o>0?o:null}})}function oe(){let e=document.querySelector(`[data-preview-inspector-breakpoint-scope-label]`),t=e instanceof HTMLElement?e.textContent?.replace(/\+$/,``).trim():``,n=ae(),r=n.find(e=>e.label===t);if(r)return r.id;let i=j(),a=i instanceof Element?Math.round(i.getBoundingClientRect().width||0):0;return n.find(e=>a>=e.start&&(e.end==null||a<=e.end))?.id||n[n.length-1]?.id||``}function se(e){if(!m())return!1;let t=String(e||``).trim(),n=oe(),r=Ee(),i=t&&r?r[t]:null;return!!(t&&n&&i&&typeof i==`object`&&Object.prototype.hasOwnProperty.call(i,n))}function ce(){return[{id:`html`,label:`HTML`},{id:`css`,label:`CSS`},{id:`js`,label:`JavaScript`}]}function h(e=i.mode){let t=p();if(e===`css`){let e=String(t.css||i.cssFullValue||``);return i.cssShowAll?e:Ie(e)}return e===`js`?He(String(t.js||i.jsFullValue||``)):e===`overrides`?JSON.stringify(t.breakpointOverrides||{},null,2):ie(t.html||``)}function le(e,t){return String(e||``).slice(0,Math.max(0,t||0)).split(`
`).length-1}function g(e=i.editorValue){i.codeHistory=[{value:String(e||``),line:-1}],i.codeHistoryIndex=0,i.codeHistoryMode=i.mode,i.codeHistoryLine=-1}function ue(e,t=-1){let n=String(e||``);if(i.codeHistoryMode!==i.mode){g(n),i.codeHistory[0].line=t,i.codeHistoryLine=t;return}let r=i.codeHistory[i.codeHistoryIndex];if(r?.value===n){i.codeHistoryLine=t;return}i.codeHistoryIndex<i.codeHistory.length-1&&(i.codeHistory=i.codeHistory.slice(0,i.codeHistoryIndex+1)),r&&r.line===t&&t>=0?i.codeHistory[i.codeHistoryIndex]={value:n,line:t}:(i.codeHistory.push({value:n,line:t}),i.codeHistoryIndex=i.codeHistory.length-1),i.codeHistoryLine=t}function de(e,t){if(i.codeHistoryMode!==i.mode||i.codeHistory.length<=1)return!1;let n=Math.max(0,Math.min(i.codeHistory.length-1,i.codeHistoryIndex+e));if(n===i.codeHistoryIndex)return!1;if(i.codeHistoryIndex=n,i.editorValue=i.codeHistory[i.codeHistoryIndex]?.value||``,i.dirty=!0,i.error=``,i.status=``,t instanceof HTMLTextAreaElement){let e=t.scrollTop,n=t.scrollLeft;t.value=i.editorValue,t.scrollTop=e,t.scrollLeft=n}return b(),Y(),X(),!0}function _({preserveDirty:e=!1}={}){let t=ce();t.some(e=>e.id===i.mode)||(i.mode=t[0]?.id||`html`,e=!1),i.mode===`css`?(i.cssFullValue=String(p().css||``),i.cssFilterSignature=E()):i.mode===`js`&&(i.jsFullValue=String(p().js||``),i.jsFilterSignature=A()),(!e||!i.dirty)&&(i.editorValue=h(i.mode),i.dirty=!1,g()),(!e||!i.overridesDirty)&&(i.overridesValue=h(`overrides`),i.overridesDirty=!1)}function fe(){for(let[e,t]of[[`inspector-open`,`.inspector-panel`],[`vibe-open`,`.vibe-panel`],[`comments-open`,`.comments-panel`],[`uploads-open`,`.uploads-panel`],[`customizer-open`,`.customizer-panel`]]){if(!document.body.classList.contains(e))continue;let n=document.querySelector(t);if(!(n instanceof HTMLElement))continue;let r=n.getBoundingClientRect();if(r.width>.5)return Math.round(r.width)}return 0}function v(){let e=fe(),t=Math.max(300,Math.round(Number(i.panelWidth)||300)),n=document.querySelector(`[data-side-actions]`),r=i.open?e+t:e;i.panelWidth=t,l.style.setProperty(`--preview-dev-panel-width`,`${t}px`),l.style.right=`${e}px`,document.body.classList.toggle(`preview-dev-open`,i.open),document.body.style.setProperty(`--preview-dev-panel-width`,`${t}px`),document.body.style.setProperty(`--bridge-side-actions-offset`,i.open?`${t}px`:`0px`),document.body.style.setProperty(`--bridge-side-actions-reserved`,i.open?`calc(var(--bridge-side-actions-width, 88px) + ${t}px)`:`var(--bridge-side-actions-width, 88px)`),n instanceof HTMLElement&&!document.body.classList.contains(`preview-viewport-responsive`)?n.style.setProperty(`right`,`${r}px`,`important`):n instanceof HTMLElement&&n.style.removeProperty(`right`)}function pe(){let e=fe(),t=Number.parseFloat(window.getComputedStyle(document.body).getPropertyValue(`--bridge-side-actions-width`))||document.querySelector(`[data-side-actions]`)?.getBoundingClientRect?.().width||88,n=Math.max(300,window.innerWidth-e-t-64);return Math.max(300,Math.floor(n))}function me(e){i.resizingPanel=!0,i.resizeStartX=e.clientX,i.resizeStartWidth=Math.max(300,Math.round(Number(i.panelWidth)||300)),document.body.classList.add(`preview-dev-resizing`);try{e.target?.setPointerCapture?.(e.pointerId)}catch{}}function he(e){if(!i.resizingPanel)return;let t=i.resizeStartX-e.clientX;i.panelWidth=Math.max(300,Math.min(pe(),Math.round(i.resizeStartWidth+t))),v(),I()}function ge(){i.resizingPanel&&(i.resizingPanel=!1,document.body.classList.remove(`preview-dev-resizing`))}function _e(){let e=l.querySelector(`[data-preview-dev-split]`),t=l.querySelector(`[data-preview-dev-overrides-header]`);if(!(e instanceof HTMLElement)||!(t instanceof HTMLElement))return{min:50,max:50};let n=e.getBoundingClientRect(),r=t.getBoundingClientRect(),i=Math.max(1,Math.ceil(r.height||50));return{min:i,max:Math.max(i,Math.floor(n.height||i))}}function ve(e){let{min:t,max:n}=_e(),r=Number(e);return!Number.isFinite(r)||r<=0?0:Math.max(t,Math.min(n,Math.round(r)))}function ye(){let e=l.querySelector(`[data-preview-dev-split]`);if(e instanceof HTMLElement){if(!i.overridesPaneHeight){e.style.removeProperty(`--preview-dev-overrides-pane-height`);return}i.overridesPaneHeight=ve(i.overridesPaneHeight),e.style.setProperty(`--preview-dev-overrides-pane-height`,`${i.overridesPaneHeight}px`)}}function be(e){let{min:t,max:n}=_e(),r=l.querySelector(`[data-preview-dev-overrides-pane]`),a=r instanceof HTMLElement?r.getBoundingClientRect().height:(t+n)/2;i.resizingOverridesPane=!0,i.overridesResizeStartY=e.clientY,i.overridesResizeStartHeight=Math.max(t,Math.min(n,Math.round(a))),document.body.classList.add(`preview-dev-overrides-resizing`);try{e.target?.setPointerCapture?.(e.pointerId)}catch{}}function xe(e){if(!i.resizingOverridesPane)return;let t=i.overridesResizeStartY-e.clientY;i.overridesPaneHeight=ve(i.overridesResizeStartHeight+t),ye(),y()}function Se(){i.resizingOverridesPane&&(i.resizingOverridesPane=!1,document.body.classList.remove(`preview-dev-overrides-resizing`))}function y(){let e=l.querySelector(`[data-preview-dev-editor]`),t=l.querySelector(`[data-preview-dev-code]`),n=l.querySelector(`[data-preview-dev-overrides-editor]`),r=l.querySelector(`[data-preview-dev-overrides-code]`);e instanceof HTMLTextAreaElement&&t instanceof HTMLElement&&(t.scrollTop=e.scrollTop,t.scrollLeft=e.scrollLeft),n instanceof HTMLTextAreaElement&&r instanceof HTMLElement&&(r.scrollTop=n.scrollTop,r.scrollLeft=n.scrollLeft),x(),S(),W(),G(),xt(),K()}function b(){let e=l.querySelector(`[data-preview-dev-code]`),t=l.querySelector(`[data-preview-dev-overrides-code]`);e&&(e.innerHTML=`${f(i.editorValue,i.mode)}\n`),t&&(t.innerHTML=`${f(i.overridesValue,`overrides`)}\n`),x(),S(),W(),K()}function Ce(e=i.editorValue){return Math.max(1,String(e||``).split(`
`).length)}function we(){if(i.mode===`html`&&i.selectedHtmlLine>=0)return i.selectedHtmlLine;let e=l.querySelector(`[data-preview-dev-editor]`);return e instanceof HTMLTextAreaElement&&document.activeElement===e?le(e.value,e.selectionStart||0):-1}function x(){let e=l.querySelector(`[data-preview-dev-line-numbers]`),t=l.querySelector(`[data-preview-dev-editor]`);if(!(e instanceof HTMLElement))return;let n=t instanceof HTMLTextAreaElement?C(t,`line-height`,18.6):Number.parseFloat(getComputedStyle(document.documentElement).fontSize)||18.6,r=t instanceof HTMLTextAreaElement?C(t,`padding-top`,14):14,i=t instanceof HTMLTextAreaElement&&t.scrollTop||0,a=we();e.innerHTML=Array.from({length:Ce()},(e,t)=>{let o=r+t*n-i;return`<span class="preview-dev-panel__line-number${t===a?` is-selected`:``}" style="top: ${o}px;">${t+1}</span>`}).join(``),Te()}function Te(){let e=l.querySelector(`[data-preview-dev-css-filter-footer]`),t=l.querySelector(`[data-preview-dev-editor]`);if(!(e instanceof HTMLElement)||!(t instanceof HTMLTextAreaElement))return;let n=C(t,`line-height`,18.6),r=C(t,`padding-top`,14)+Ce(i.editorValue)*n+2-t.scrollTop;e.style.setProperty(`--preview-dev-filter-footer-top`,`${Math.max(0,r)}px`)}function Ee(){try{let e=JSON.parse(i.overridesValue||`{}`);return e&&typeof e==`object`&&!Array.isArray(e)?e:null}catch{return null}}function De(e,t){let n=String(e||``).split(`
`),r=JSON.stringify(String(t||``)),i=n.findIndex(e=>e.trim().startsWith(`${r}:`));if(i<0)return null;let a=0,o=!1;for(let e=i;e<n.length;e+=1){let t=n[e]||``;for(let e=0;e<t.length;e+=1){let n=t[e];n===`{`?(a+=1,o=!0):n===`}`&&--a}if(o&&a<=0)return{start:i,end:e}}return{start:i,end:i}}function Oe(e){let t=Number.isInteger(e)&&e>=0?e:-1,n=Ee();return t<0||!n?``:Object.keys(n).find(e=>{let n=De(i.overridesValue,e);return!!n&&t>=n.start&&t<=n.end})||``}function ke(e){let t=l.querySelector(`[data-preview-dev-overrides-editor]`);if(!(t instanceof HTMLTextAreaElement))return``;let n=t.getBoundingClientRect(),r=C(t,`line-height`,18.6),i=C(t,`padding-top`,14);return Oe(Math.max(0,Math.floor((e.clientY-n.top+t.scrollTop-i)/r)))}function Ae(){let e=et(),t=Ee(),n=new Set;return!e.length||!t||e.forEach(e=>{if(!Object.prototype.hasOwnProperty.call(t,e))return;let r=De(i.overridesValue,e);if(r)for(let e=r.start;e<=r.end;e+=1)n.add(e)}),n}function S(){let e=l.querySelector(`[data-preview-dev-overrides-line-numbers]`),t=l.querySelector(`[data-preview-dev-overrides-editor]`);if(!(e instanceof HTMLElement))return;let n=t instanceof HTMLTextAreaElement?C(t,`line-height`,18.6):Number.parseFloat(getComputedStyle(document.documentElement).fontSize)||18.6,r=t instanceof HTMLTextAreaElement?C(t,`padding-top`,14):14,a=t instanceof HTMLTextAreaElement&&t.scrollTop||0,o=t instanceof HTMLTextAreaElement&&document.activeElement===t?le(t.value,t.selectionStart||0):-1,s=Ae();e.innerHTML=Array.from({length:Ce(i.overridesValue)},(e,t)=>{let i=r+t*n-a;return`<span class="preview-dev-panel__line-number${t===o||s.has(t)?` is-selected`:``}" style="top: ${i}px;">${t+1}</span>`}).join(``)}function C(e,t,n){let r=Number.parseFloat(window.getComputedStyle(e).getPropertyValue(t));return Number.isFinite(r)&&r>0?r:n}function w(e=i.editorValue){if(i.mode!==`html`)return[];let t=new Set([`area`,`base`,`br`,`col`,`embed`,`hr`,`img`,`input`,`link`,`meta`,`param`,`source`,`track`,`wbr`]),n=[],r=[0];return String(e||``).split(`
`).map((e,i)=>{let a=e.match(/^\s*<(\/?)(?![!/])([A-Za-z][\w:-]*)(?:\s|>|\/)/);if(!a)return null;let o=a[1]===`/`,s=String(a[2]||``).toLowerCase();if(o)return n.pop(),r.pop(),null;let c=n.length,l=r[c]||0;r[c]=l+1;let u=[...n,l].join(`.`),d=/\/>\s*$/.test(e)||t.has(s),ee=RegExp(`</${s}\\s*>\\s*$`,`i`).test(e);return!d&&!ee&&(n.push(l),r[n.length]=0),{line:i,path:u,hidden:yt(e)}}).filter(Boolean)}function je(e=i.editorValue){if(i.mode!==`css`)return[];let t=String(e||``).split(`
`),n=[],r=-1,a=``,o=null,s=0;return t.forEach((e,t)=>{let i=e.trim();if(!o&&!a&&!i)return;!o&&r<0&&i&&(r=t);let c=0;for(;c<e.length;){let i=e.indexOf(`{`,c),l=e.indexOf(`}`,c);if(o){if(l>=0&&(i<0||l<i)){--s,c=l+1,s<=0&&(o.end=t,n.push(o),o=null,r=-1,a=``,s=0);continue}if(i>=0){s+=1,c=i+1;continue}break}if(i<0){a+=`${e.slice(c)}\n`;break}a+=e.slice(c,i);let u=a.trim(),d=u.split(`,`).map(e=>e.trim()).filter(Boolean);u&&!u.startsWith(`@`)&&d.length&&(o={start:r>=0?r:t,end:t,selector:u,selectors:d}),s=1,c=i+1,o||(r=-1,a=``)}o&&(o.end=t)}),n}function Me(e,t){let n=String(e||``).split(`
`);return!t||!Number.isInteger(t.start)||!Number.isInteger(t.end)?``:n.slice(t.start,t.end+1).join(`
`)}function Ne(e,t){if(!(t instanceof Element))return!1;try{return t.matches(e)}catch{return!1}}function Pe(e,t){return!e?.selectors?.length||!Array.isArray(t)||!t.length?!1:e.selectors.some(e=>t.some(t=>Ne(e,t)))}function T(){let e=j();if(!(e instanceof Element))return[];let t=Array.from(e.querySelectorAll(`[data-ux-layer-selected]:not([data-ux-layer-selected="false"])`)).filter(e=>e instanceof Element),n=e.matches(`[data-ux-layer-selected]:not([data-ux-layer-selected="false"])`)?[e,...t]:t;if(n.length)return n;let r=i.previewSelectedLayerPath?M(i.previewSelectedLayerPath):null;return r instanceof Element?[r]:[]}function Fe(e){let t=T();return t.length?je(e).filter(e=>Pe(e,t)):[]}function E(){return T().map(e=>P(e)).filter(Boolean).join(`|`)}function Ie(e){let t=Fe(e);return T().length?t.map(t=>Me(e,t)).filter(Boolean).join(`

`):String(e||``)}function Le(){if(i.mode!==`css`||i.cssShowAll)return!1;let e=String(i.cssFullValue||p().css||``),t=!!(i.cssFilterSignature||E()),n=String(i.editorValue||``)!==e;return t||n}function D(){let e=String(i.cssFullValue||p().css||``);if(i.mode!==`css`||i.cssShowAll||!T().length)return i.mode===`css`?i.editorValue:e;let t=je(e),n=je(i.editorValue),r=T(),a=n.map(e=>Me(i.editorValue,e)),o=new Map;n.forEach(e=>{let t=e.selector,n=o.get(t)||[];n.push(Me(i.editorValue,e)),o.set(t,n)});let s=e.split(`
`),c=[],l=0;return t.forEach(e=>{if(!Pe(e,r))return;l<e.start&&c.push(s.slice(l,e.start).join(`
`));let t=o.get(e.selector)||[],n=t.length?t.shift():a.shift()||``;if(n){let e=a.indexOf(n);e>=0&&a.splice(e,1)}n&&c.push(n),l=e.end+1}),l<s.length&&c.push(s.slice(l).join(`
`)),c.filter((e,t)=>e||t===0).join(`
`).replace(/\n{4,}/g,`


`)}function O(e=i.editorValue){if(i.mode!==`js`)return[];let t=String(e||``).split(`
`),n=[],r=-1,a=0,o=``,s=!1,c=e=>{if(r<0)return;let i=t.slice(r,e+1).join(`
`).trim();i&&n.push({start:r,end:e,source:i}),r=-1,a=0,o=``,s=!1};return t.forEach((e,t)=>{r<0&&e.trim()&&(r=t);for(let t=0;t<e.length;t+=1){let n=e[t],r=e[t+1];if(o){s=!s&&n===`\\`,!s&&n===o?o=``:n!==`\\`&&(s=!1);continue}if(n===`/`&&r===`/`||n===`/`&&r===`*`)break;if(n===`"`||n===`'`||n==="`"){o=n,s=!1;continue}n===`{`||n===`(`||n===`[`?a+=1:(n===`}`||n===`)`||n===`]`)&&(a=Math.max(0,a-1))}let n=e.trim();r>=0&&a===0&&(n.endsWith(`;`)||n.endsWith(`}`)||!n&&t>r)&&c(n?t:t-1)}),r>=0&&c(t.length-1),n}function Re(e,t){let n=String(e||``).split(`
`);return!t||!Number.isInteger(t.start)||!Number.isInteger(t.end)?``:n.slice(t.start,t.end+1).join(`
`)}function ze(e){let t=[],n=/\b(?:querySelector(?:All)?|closest|matches)\(\s*(['"`])([\s\S]*?)\1/g,r=n.exec(String(e||``));for(;r;){let i=String(r[2]||``).trim();i&&t.push(i),r=n.exec(String(e||``))}return t}function Be(e,t){let n=ze(e?.source||``);return!n.length||!Array.isArray(t)||!t.length?!1:n.some(e=>t.some(t=>Ne(e,t)))}function k(){return T()}function Ve(e){let t=k();return t.length?O(e).filter(e=>Be(e,t)):[]}function A(){return k().map(e=>P(e)).filter(Boolean).join(`|`)}function He(e){return k().length?Ve(e).map(t=>Re(e,t)).filter(Boolean).join(`

`):String(e||``)}function Ue(){let e=String(i.jsFullValue||p().js||``);if(i.mode!==`js`||!k().length)return i.mode===`js`?i.editorValue:e;let t=O(e),n=O(i.editorValue),r=k(),a=n.map(e=>Re(i.editorValue,e)),o=new Map;n.forEach(e=>{let t=ze(e.source).join(`|`),n=o.get(t)||[];n.push(Re(i.editorValue,e)),o.set(t,n)});let s=e.split(`
`),c=[],l=0;return t.forEach(e=>{if(!Be(e,r))return;l<e.start&&c.push(s.slice(l,e.start).join(`
`));let t=ze(e.source).join(`|`),n=o.get(t)||[],i=n.length?n.shift():a.shift()||``;if(i){let e=a.indexOf(i);e>=0&&a.splice(e,1),c.push(i)}l=e.end+1}),l<s.length&&c.push(s.slice(l).join(`
`)),c.filter((e,t)=>e||t===0).join(`
`).replace(/\n{4,}/g,`


`)}function We(e){if(i.mode!==`js`)return null;let t=l.querySelector(`[data-preview-dev-editor]`);if(!(t instanceof HTMLTextAreaElement))return null;let n=t.getBoundingClientRect(),r=C(t,`line-height`,18.6),a=C(t,`padding-top`,14),o=Math.max(0,Math.floor((e.clientY-n.top+t.scrollTop-a)/r));return O().find(e=>o>=e.start&&o<=e.end)||null}function Ge(e){let t=j(),n=ze(e?.source||``);if(!(t instanceof Element)||!n.length)return[];let r=[];return n.forEach(e=>{try{(t.matches(e)?[t,...Array.from(t.querySelectorAll(e))]:Array.from(t.querySelectorAll(e))).forEach(e=>{e instanceof Element&&!r.includes(e)&&r.push(e)})}catch{}}),r}function Ke(e){if(i.mode!==`css`)return null;let t=l.querySelector(`[data-preview-dev-editor]`);if(!(t instanceof HTMLTextAreaElement))return null;let n=t.getBoundingClientRect(),r=C(t,`line-height`,18.6),a=C(t,`padding-top`,14),o=Math.max(0,Math.floor((e.clientY-n.top+t.scrollTop-a)/r));return je().find(e=>o>=e.start&&o<=e.end)||null}function qe(e){let t=j();if(!(t instanceof Element)||!e?.selectors?.length)return[];let n=[];return e.selectors.forEach(e=>{try{(t.matches(e)?[t,...Array.from(t.querySelectorAll(e))]:Array.from(t.querySelectorAll(e))).forEach(e=>{e instanceof Element&&!n.includes(e)&&n.push(e)})}catch{}}),n}function Je(){return i.hoveredHtmlLine>=0?i.hoveredHtmlLine:i.previewHoveredHtmlLine}function j(){let e=document.querySelector(`[data-vibe-mobile-render]`)?.querySelector?.(`.vibe-generated-page`);if(e instanceof Element)return e;let t=document.querySelector(`.mobile-page .vibe-generated-page, .vibe-mobile-stage .vibe-generated-page`);return t instanceof Element?t:null}function M(e){let t=$e(),n=String(e||``).split(`.`).map(e=>Number.parseInt(e,10));if(!(t instanceof Element)||!n.length||n.some(e=>!Number.isInteger(e)||e<0))return null;let r=t;for(let e of n)if(r=r.children[e]||null,!(r instanceof Element))return null;return r}function Ye(e){return w().find(t=>t.line===e)||null}function Xe(e){if(i.mode!==`html`)return-1;let t=l.querySelector(`[data-preview-dev-editor]`);if(!(t instanceof HTMLTextAreaElement))return-1;let n=t.getBoundingClientRect(),r=C(t,`line-height`,18.6),a=C(t,`padding-top`,14),o=Math.max(0,Math.floor((e.clientY-n.top+t.scrollTop-a)/r));return w().some(e=>e.line===o)?o:-1}function Ze(e){if(i.mode!==`html`||!(e instanceof HTMLTextAreaElement))return-1;let t=Number.isFinite(e.selectionStart)?e.selectionStart:0,n=e.value.slice(0,Math.max(0,t)).split(`
`).length-1,r=w(e.value);return r.some(e=>e.line===n)?n:r.filter(e=>e.line<n).sort((e,t)=>t.line-e.line)[0]?.line??-1}function Qe(e){let t=Ye(e);return t&&M(t.path)||null}function N(e){if(!(e instanceof Element))return-1;let t=P(e);return t?w().find(e=>e.path===t)?.line??-1:-1}function $e(){let e=document.querySelector(`[data-vibe-mobile-render]`);return e instanceof Element?e:null}function P(e){let t=$e();if(!(e instanceof Element)||!(t instanceof Element)||e===t||!t.contains(e))return``;let n=[],r=e;for(;r instanceof Element&&r!==t;){let e=r.parentElement;if(!(e instanceof Element))return``;let t=Array.from(e.children).indexOf(r);if(t<0)return``;n.unshift(t),r=e}return n.join(`.`)}function et(){let e=$e();return e instanceof Element?Array.from(e.querySelectorAll(`[data-ux-layer-selected]:not([data-ux-layer-selected="false"])`)).map(e=>P(e)).filter(Boolean):[]}function F(e){let t=j();if(!(t instanceof Element))return null;let n=e instanceof Element?e:e?.parentElement||null;for(;n instanceof Element&&n!==document.body;){if(n===t||t.contains(n))return n;n=n.parentElement}return null}function tt(e,t,n=null){e instanceof Element&&e.dispatchEvent(new MouseEvent(t,{bubbles:!0,cancelable:!0,view:window,relatedTarget:n}))}function nt(e=0){if(o[e]instanceof HTMLElement)return o[e];let t=document.createElement(`div`);return t.className=`preview-dev-layer-hover-overlay`,t.setAttribute(`data-preview-dev-layer-hover-overlay`,``),t.innerHTML=`<span class="preview-dev-layer-hover-overlay__label" data-preview-dev-layer-hover-label></span>`,document.body.append(t),o[e]=t,t}function rt(e){let t=Math.max(0,e.width),n=Math.max(0,e.height),r=e=>{let t=Math.round(e*100)/100;return String(t)};return`${r(t)} x ${r(n)}`}function it(){s=0;let e=Array.isArray(i.activePreviewHoverElements)?i.activePreviewHoverElements.filter(e=>e instanceof Element):[];if(!i.open||!e.length){o.forEach(e=>e?.classList?.remove(`is-visible`));return}e.forEach((e,t)=>{let n=nt(t),r=e.getBoundingClientRect();if(!e.isConnected||r.width<=0||r.height<=0){n.classList.remove(`is-visible`);return}n.style.left=`${r.left}px`,n.style.top=`${r.top}px`,n.style.width=`${r.width}px`,n.style.height=`${r.height}px`,n.querySelector(`[data-preview-dev-layer-hover-label]`)?.replaceChildren(rt(r)),n.classList.toggle(`is-breakpoint-override`,se(P(e))),n.classList.add(`is-visible`)}),o.slice(e.length).forEach(e=>e?.classList?.remove(`is-visible`))}function I(){s||=window.requestAnimationFrame(it)}function at(e){st(e>=0?Qe(e):null)}function ot(e){st(e?M(e):null)}function st(e){L(e instanceof Element?[e]:[])}function L(e){let t=Array.from(new Set((Array.isArray(e)?e:[]).filter(e=>e instanceof Element))),n=Array.isArray(i.activePreviewHoverElements)?i.activePreviewHoverElements.filter(e=>e instanceof Element):i.activePreviewHoverElement instanceof Element?[i.activePreviewHoverElement]:[];n.length===t.length&&n.every((e,n)=>e===t[n])||(n.filter(e=>!t.includes(e)).forEach(e=>tt(e,`mouseout`,t[0]||document.body)),i.activePreviewHoverElements=t,i.activePreviewHoverElement=t[0]||null,t.filter(e=>!n.includes(e)).forEach(e=>tt(e,`mouseover`,n[0]||document.body)),I())}function R(e){let t=Number.isInteger(e)&&e>=0?e:-1;if(i.hoveredHtmlLine===t){I();return}i.hoveredHtmlLine=t,at(t),W()}function z(e){let t=e&&typeof e==`object`?e:null,n=i.hoveredCssRule;if(!n&&!t||n&&t&&n.start===t.start&&n.end===t.end&&n.selector===t.selector){I();return}i.hoveredCssRule=t,L(t?qe(t):[]),G()}function B(e){let t=e&&typeof e==`object`?e:null,n=i.hoveredJsBlock;if(!n&&!t||n&&t&&n.start===t.start&&n.end===t.end&&n.source===t.source){I();return}i.hoveredJsBlock=t,L(t?Ge(t):[]),xt()}function ct({force:e=!1}={}){if(i.mode!==`css`)return;let t=i.cssFilterSignature,n=E(),r=n!==t;if(i.dirty&&!e&&!r)return;let a=i.dirty?D():String(p().css||i.cssFullValue||``);r&&(i.cssShowAll=!1);let o=i.cssShowAll?a:Ie(a);if(!e&&a===i.cssFullValue&&n===i.cssFilterSignature&&o===i.editorValue)return;let s=!!l.querySelector(`[data-preview-dev-css-filter-footer]`),c=l.querySelector(`[data-preview-dev-editor]`),u=c instanceof HTMLTextAreaElement?c.scrollTop:0,d=c instanceof HTMLTextAreaElement?c.scrollLeft:0;if(i.cssFullValue=a,i.cssFilterSignature=n,i.editorValue=o,g(),c instanceof HTMLTextAreaElement&&(c.value=i.editorValue,c.scrollTop=u,c.scrollLeft=d),s!==Le()){Q();return}b()}function lt({force:e=!1}={}){if(i.mode!==`js`||i.dirty)return;let t=String(p().js||i.jsFullValue||``),n=A(),r=He(t);if(!e&&t===i.jsFullValue&&n===i.jsFilterSignature&&r===i.editorValue)return;let a=l.querySelector(`[data-preview-dev-editor]`),o=a instanceof HTMLTextAreaElement?a.scrollTop:0,s=a instanceof HTMLTextAreaElement?a.scrollLeft:0;i.jsFullValue=t,i.jsFilterSignature=n,i.editorValue=r,g(),a instanceof HTMLTextAreaElement&&(a.value=i.editorValue,a.scrollTop=o,a.scrollLeft=s),b()}function V(e){let t=String(e||``).trim();if(i.hoveredOverridePath===t){I();return}i.hoveredOverridePath=t,ot(t),K()}function H(){if(!i.open)return;let e=j();if(!(e instanceof Element)){i.previewHoveredHtmlLine=-1,i.previewHoveredLayerPath=``,i.previewSelectedLayerPath=``,i.selectedHtmlLine=-1,W(),ct(),G(),lt(),xt(),S(),K();return}let t=e.querySelector(`[data-ux-layer-hovered]:not([data-ux-layer-hovered="false"])`),n=e.querySelector(`[data-ux-layer-selected]:not([data-ux-layer-selected="false"])`),r=t instanceof Element?N(t):-1,a=t instanceof Element?P(t):``,o=n instanceof Element?N(n):-1,s=n instanceof Element?P(n):``,c=i.mode===`html`?r:-1,l=i.mode===`html`?o:-1,u=s!==i.previewSelectedLayerPath||l!==i.selectedHtmlLine;(c!==i.previewHoveredHtmlLine||a!==i.previewHoveredLayerPath||s!==i.previewSelectedLayerPath||l!==i.selectedHtmlLine)&&(i.previewHoveredHtmlLine=c,i.previewHoveredLayerPath=a,i.previewSelectedLayerPath=s,i.selectedHtmlLine=l,x(),W(),u&&(!i.cssShowAll||i.allowCssRefilterFromSelection)&&ct(),i.allowCssRefilterFromSelection=!1,G(),u&&lt(),xt(),S(),K())}function ut(){let e=document.querySelector(`[data-vibe-mobile-render]`);if(!(e instanceof Element))return``;let t=e.cloneNode(!0);return t instanceof Element?(t.querySelectorAll(`[data-ux-layer-hovered], [data-ux-layer-selected]`).forEach(e=>{e.removeAttribute(`data-ux-layer-hovered`),e.removeAttribute(`data-ux-layer-selected`)}),t.hasAttribute(`data-ux-layer-hovered`)&&t.removeAttribute(`data-ux-layer-hovered`),t.hasAttribute(`data-ux-layer-selected`)&&t.removeAttribute(`data-ux-layer-selected`),t.innerHTML):``}function dt(){if(i.previewDomSyncFrame=0,!i.open||i.mode!==`html`||i.renderingLivePreview)return;let e=ut(),t=ie(e);if(!t||t===i.editorValue)return;let n=l.querySelector(`[data-preview-dev-editor]`),r=n instanceof HTMLTextAreaElement?n.scrollTop:0,a=n instanceof HTMLTextAreaElement?n.scrollLeft:0;i.editorValue=t,i.dirty=!1,i.error=``,i.status=``,i.page?.preview&&(i.page.preview={...i.page.preview,html:e}),i.page?.vibe?.appliedDraft&&(i.page.vibe.appliedDraft={...i.page.vibe.appliedDraft,html:e}),g(),n instanceof HTMLTextAreaElement&&(n.value=i.editorValue,n.scrollTop=r,n.scrollLeft=a),b(),y(),H()}function ft(){i.renderingLivePreview||i.mode!==`html`||(i.previewDomSyncFrame||=window.requestAnimationFrame(dt))}function U({force:e=!1}={}){if(!i.open||!m()||i.overridesDirty)return;let t=h(`overrides`);if(t===i.overridesValue)return;let n=l.querySelector(`[data-preview-dev-overrides-editor]`);if(!e&&n instanceof HTMLTextAreaElement&&document.activeElement===n)return;let r=n instanceof HTMLTextAreaElement?n.scrollTop:0,a=n instanceof HTMLTextAreaElement?n.scrollLeft:0;i.overridesValue=t,i.error=``,i.status=``,n instanceof HTMLTextAreaElement&&(n.value=i.overridesValue,n.scrollTop=r,n.scrollLeft=a),b(),y()}function pt(e={}){if(e.project)Gt(e.project,e.page?.id||r);else if(i.page&&e.breakpointOverrides&&typeof e.breakpointOverrides==`object`){let t={...p(),breakpointOverrides:e.breakpointOverrides};i.page={...i.page,preview:i.page.preview?t:i.page.preview,vibe:i.page.vibe?{...i.page.vibe,appliedDraft:i.page.vibe.appliedDraft?{...i.page.vibe.appliedDraft,breakpointOverrides:e.breakpointOverrides}:i.page.vibe.appliedDraft}:i.page.vibe}}let t=h(`overrides`),n=l.querySelector(`[data-preview-dev-overrides-editor]`),a=n instanceof HTMLTextAreaElement?n.scrollTop:0,o=n instanceof HTMLTextAreaElement?n.scrollLeft:0;i.overridesDirty=!1,i.overridesValue=t,i.error=``,i.status=``,n instanceof HTMLTextAreaElement&&(n.value=t,n.scrollTop=a,n.scrollLeft=o),b(),y()}function mt(){i.overridesSyncTimer||typeof window>`u`||(i.overridesSyncTimer=window.setInterval(()=>U(),250))}function ht(){!i.overridesSyncTimer||typeof window>`u`||(window.clearInterval(i.overridesSyncTimer),i.overridesSyncTimer=0)}function gt(){if(i.open&&m()){mt(),U();return}ht()}function _t(){i.previewDomSyncFrame&&=(window.cancelAnimationFrame(i.previewDomSyncFrame),0)}function vt(){let e=j();if(!(e instanceof Element)){a?.disconnect(),a=null;return}a?.__previewRoot!==e&&(a?.disconnect(),a=new MutationObserver(()=>{H(),ft(),U()}),a.__previewRoot=e,a.observe(e,{subtree:!0,childList:!0,attributes:!0,characterData:!0}),H())}function yt(e){return/\sdata-ux-layer-hidden-control=(["'])true\1/i.test(e)||/\sdata-ux-layer-visible=(["'])false\1/i.test(e)||/\saria-hidden=(["'])true\1/i.test(e)||/style=(["'])[^"']*display\s*:\s*none/i.test(e)||/style=(["'])[^"']*visibility\s*:\s*hidden/i.test(e)}function bt(e){return e?`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 2l20 20"></path><path d="M10.6 10.6a2 2 0 0 0 2.8 2.8"></path><path d="M9.9 4.2A10.4 10.4 0 0 1 12 4c5 0 9 5 10 8a15.6 15.6 0 0 1-2.1 3.6"></path><path d="M6.5 6.5C4.4 7.9 2.8 10 2 12c1 3 5 8 10 8a10.7 10.7 0 0 0 5.5-1.6"></path></svg>`:`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z"></path><circle cx="12" cy="12" r="3"></circle></svg>`}function W(){let e=l.querySelector(`[data-preview-dev-layer-gutter]`),t=l.querySelector(`[data-preview-dev-editor]`),n=l.querySelector(`[data-preview-dev-row-highlights]`);if(!(e instanceof HTMLElement)||!(t instanceof HTMLTextAreaElement)||i.mode!==`html`){e instanceof HTMLElement&&(e.innerHTML=``),n instanceof HTMLElement&&(n.innerHTML=``);return}let r=w(),a=Je(),o=i.selectedHtmlLine,s=r.filter(e=>e.hidden||e.line===a),c=C(t,`padding-top`,14),u=C(t,`line-height`,18.6),d=t.scrollTop||0;n instanceof HTMLElement&&(n.innerHTML=r.filter(e=>e.line===a||e.line===o).map(e=>{let t=c+e.line*u-d;return`<div class="preview-dev-panel__row-highlight${e.line===o?` is-selected`:``}" style="top: ${t}px; height: ${u}px;"></div>`}).join(``)),e.innerHTML=s.map(e=>{let t=c+e.line*u-d,n=e.line===a||e.hidden?` is-visible`:``,r=e.hidden?` is-hidden`:``,i=e.hidden?`Unhide HTML layer`:`Hide HTML layer`;return`
          <button
            type="button"
            class="preview-dev-panel__layer-toggle${n}${r}"
            style="top: ${t}px;"
            data-preview-dev-layer-toggle
            data-preview-dev-line="${e.line}"
            aria-label="${i}"
            title="${i}"
          >
            ${bt(e.hidden)}
          </button>
        `}).join(``)}function G(){let e=l.querySelector(`[data-preview-dev-row-highlights]`),t=l.querySelector(`[data-preview-dev-editor]`);if(!(e instanceof HTMLElement)||!(t instanceof HTMLTextAreaElement)||i.mode!==`css`)return;let n=i.hoveredCssRule;if(!n){e.innerHTML=``;return}let r=C(t,`padding-top`,14),a=C(t,`line-height`,18.6),o=t.scrollTop||0,s=[];for(let e=n.start;e<=n.end;e+=1)s.push(e);e.innerHTML=s.map(e=>`<div class="preview-dev-panel__row-highlight" style="top: ${r+e*a-o}px; height: ${a}px;"></div>`).join(``)}function xt(){let e=l.querySelector(`[data-preview-dev-row-highlights]`),t=l.querySelector(`[data-preview-dev-editor]`);if(!(e instanceof HTMLElement)||!(t instanceof HTMLTextAreaElement)||i.mode!==`js`)return;let n=i.hoveredJsBlock;if(!n){e.innerHTML=``;return}let r=C(t,`padding-top`,14),a=C(t,`line-height`,18.6),o=t.scrollTop||0,s=[];for(let e=n.start;e<=n.end;e+=1)s.push(e);e.innerHTML=s.map(e=>`<div class="preview-dev-panel__row-highlight" style="top: ${r+e*a-o}px; height: ${a}px;"></div>`).join(``)}function K(){let e=l.querySelector(`[data-preview-dev-overrides-row-highlights]`),t=l.querySelector(`[data-preview-dev-overrides-editor]`);if(!(e instanceof HTMLElement)||!(t instanceof HTMLTextAreaElement)){e instanceof HTMLElement&&(e.innerHTML=``);return}let n=Ae(),r=i.hoveredOverridePath||i.previewHoveredLayerPath,a=r?De(i.overridesValue,r):null,o=new Set;if(a)for(let e=a.start;e<=a.end;e+=1)o.add(e);if(!n.size&&!o.size){e.innerHTML=``;return}let s=C(t,`padding-top`,14),c=C(t,`line-height`,18.6),u=t.scrollTop||0;e.innerHTML=Array.from(new Set([...o,...n])).sort((e,t)=>e-t).map(e=>{let t=s+e*c-u;return`<div class="preview-dev-panel__row-highlight${n.has(e)?` is-selected`:``}" style="top: ${t}px; height: ${c}px;"></div>`}).join(``)}function St(e){return String(e).replace(/[.*+?^${}()|[\]\\]/g,`\\$&`)}function Ct(e){return String(e).replace(/&/g,`&amp;`).replace(/"/g,`&quot;`)}function q(e,t,n){let r=RegExp(`\\s${St(t)}(?:=(?:"[^"]*"|'[^']*'|[^\\s>]+))?`,`i`),i=` ${t}="${Ct(n)}"`;return r.test(e)?e.replace(r,i):e.replace(/\s*(\/?>)$/,`${i}$1`)}function J(e,t){let n=RegExp(`\\s${St(t)}(?:=(?:"[^"]*"|'[^']*'|[^\\s>]+))?`,`ig`);return e.replace(n,``)}function wt(e,t){let n=RegExp(`\\s${St(t)}=(["'])([\\s\\S]*?)\\1`,`i`),r=e.match(n);return r?r[2]:``}function Tt(e){let t=e.match(/\sstyle=(["'])([\s\S]*?)\1/i);return t?{quote:t[1],value:t[2]}:null}function Et(e,t){let n=Tt(e);if(!n)return``;let r=String(t||``).trim().toLowerCase();if(!r)return``;let i=n.value.split(`;`).map(e=>e.trim()).filter(Boolean).find(e=>{let t=e.indexOf(`:`);return t>=0&&e.slice(0,t).trim().toLowerCase()===r});return i?i.slice(i.indexOf(`:`)+1).trim():``}function Dt(e,t){let n=Tt(e),r=new Map;n&&n.value.split(`;`).map(e=>e.trim()).filter(Boolean).forEach(e=>{let t=e.indexOf(`:`);if(t<0)return;let n=e.slice(0,t).trim().toLowerCase(),i=e.slice(t+1).trim();n&&r.set(n,i)}),Object.entries(t).forEach(([e,t])=>{let n=e.toLowerCase();t==null?r.delete(n):r.set(n,t)});let i=Array.from(r.entries()).map(([e,t])=>`${e}: ${t}`).join(`; `);return i?q(e,`style`,`${i};`):J(e,`style`)}function Ot(e,t){let n=e.match(/^(\s*)(<[^>]+>)([\s\S]*)$/);if(!n)return e;let r=n[2];if(t){let e=Et(r,`display`);e&&e.toLowerCase()!==`none`&&(r=q(r,`data-ux-layer-display-cache`,e)),r=q(r,`data-ux-layer-hidden-control`,`true`),r=q(r,`data-ux-layer-visible`,`false`),r=q(r,`aria-hidden`,`true`),r=Dt(r,{display:`none`,visibility:null,"pointer-events":null})}else{let e=wt(r,`data-ux-layer-display-cache`);r=J(r,`data-ux-layer-hidden-control`),r=J(r,`data-ux-layer-visible`),r=J(r,`data-ux-layer-display-cache`),r=J(r,`aria-hidden`),r=Dt(r,{display:e||null,visibility:null,"pointer-events":null})}return`${n[1]}${r}${n[3]}`}function kt(e){if(i.mode!==`html`||!Number.isInteger(e)||e<0)return;let t=l.querySelector(`[data-preview-dev-editor]`),n=String(i.editorValue||``).split(`
`);if(!n[e])return;let r=!yt(n[e]);if(n[e]=Ot(n[e],r),i.editorValue=n.join(`
`),i.dirty=!0,i.error=``,i.status=``,_t(),ue(i.editorValue,e),t instanceof HTMLTextAreaElement){let e=t.scrollTop,n=t.scrollLeft;t.value=i.editorValue,t.scrollTop=e,t.scrollLeft=n,t.focus()}b(),y(),Y(),X()}function At(){let e=p(),t={...e,html:String(e.html||``),css:String(e.css||``),js:String(e.js||``),stageStyle:String(e.stageStyle||``),breakpointOverrides:e.breakpointOverrides||{}};return i.mode===`html`?t.html=i.editorValue:i.mode===`css`?t.css=D():i.mode===`js`&&(t.js=Ue()),t.breakpointOverrides=JSON.parse(i.overridesValue||`{}`),t}function jt(e){!i.page||!e||(i.page.preview=e,i.page.hasContent=!!e.html,i.page.vibe={...i.page.vibe||{},status:`applied`,appliedDraft:e,summary:e.summary||i.page.vibe?.summary||``})}function Mt(e){let t=e?.__uxBridgePreviewCleanup;if(typeof t==`function`)try{t()}catch(e){console.warn(`[dev-mode] preview.js cleanup failed`,e)}e&&(e.__uxBridgePreviewCleanup=null)}function Nt(e,t){Mt(e);let n=String(t?.js||``).trim();if(!e||!n)return;let r=e.firstElementChild instanceof HTMLElement?e.firstElementChild:e;try{let t=Function(`root`,`page`,`project`,`api`,n)(r,i.page,i.project,{});typeof t==`function`&&(e.__uxBridgePreviewCleanup=t)}catch(e){console.warn(`[dev-mode] preview.js failed`,e)}}function Pt(e){let t=document.querySelector(`.mobile-page`),n=document.querySelector(`[data-empty-mobile-shell]`),r=document.querySelector(`[data-vibe-mobile-stage]`),a=document.querySelector(`[data-vibe-mobile-style]`),o=document.querySelector(`[data-vibe-mobile-render]`);if(!t||!n||!r||!a||!o)return;let s=!!e?.html;t.classList.toggle(`mobile-page--empty`,!s),n.hidden=s,r.hidden=!s,i.renderingLivePreview=!0;try{if(!s){Mt(o),a.textContent=``,o.innerHTML=``;return}a.textContent=String(e.css||``),o.innerHTML=String(e.html||``),Nt(o,e)}finally{window.requestAnimationFrame(()=>{i.renderingLivePreview=!1,vt(),H()})}}function Y(){let e;try{e=At()}catch(e){return i.error=e instanceof Error?e.message:`Overrides must be valid JSON.`,!1}return i.error=``,jt(e),Pt(e),window.dispatchEvent(new CustomEvent(`uxbridge:preview-code-live-update`,{detail:{projectId:i.project?.id||n,pageId:i.page?.id||r||document.body.dataset.pageKey||``,preview:e}})),!0}function X(e=`main`){try{i.pendingAutosavePayload={...Ut(),__mode:i.mode,__editorKey:e,__value:e===`overrides`?i.overridesValue:i.editorValue}}catch(e){i.error=e instanceof Error?e.message:`Overrides must be valid JSON.`;return}i.autosaveTimer&&window.clearTimeout(i.autosaveTimer),i.autosaveTimer=window.setTimeout(()=>{i.autosaveTimer=0,Wt()},450)}function Z(e){if(!(e instanceof Element))return!1;i.allowCssRefilterFromSelection=!0;let t=e.getBoundingClientRect(),n=t.left+Math.max(1,Math.min(t.width/2,t.width-1)),r=t.top+Math.max(1,Math.min(t.height/2,t.height-1)),a={bubbles:!0,cancelable:!0,composed:!0,view:window,clientX:n,clientY:r,button:0,buttons:1};return typeof PointerEvent==`function`&&(e.dispatchEvent(new PointerEvent(`pointerdown`,{...a,pointerId:1,pointerType:`mouse`})),e.dispatchEvent(new PointerEvent(`pointerup`,{...a,pointerId:1,pointerType:`mouse`,buttons:0}))),e.dispatchEvent(new MouseEvent(`mousedown`,a)),e.dispatchEvent(new MouseEvent(`mouseup`,{...a,buttons:0})),e.dispatchEvent(new MouseEvent(`click`,{...a,buttons:0})),window.requestAnimationFrame(H),!0}function Ft(e){let t=Qe(e);t instanceof Element&&(i.selectedHtmlLine=e,x(),W(),S(),K(),Z(t))}function It(e){let t=Ze(e);t>=0&&Ft(t)}function Q(){_({preserveDirty:!0});let e=ce(),t=m(),n=Le(),r=`preview-dev-panel__body${n?` has-filter-footer`:``}`,a=n?`
        <div class="preview-dev-panel__filter-footer" data-preview-dev-css-filter-footer>
          <button type="button" class="preview-dev-panel__see-all" data-preview-dev-css-see-all>See All</button>
        </div>
      `:``;i.renderedMode=i.mode,i.renderedBreakpointMode=t,l.classList.toggle(`is-breakpoint-active`,t),l.style.setProperty(`--preview-dev-tab-count`,String(Math.max(1,e.length))),l.innerHTML=`
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
          ${e.map(e=>`
                <button type="button" class="preview-dev-panel__tab${e.id===i.mode?` is-active`:``}" data-preview-dev-tab="${u(e.id)}">
                  ${u(e.label)}
                </button>
              `).join(``)}
        </nav>
      </header>
      ${t?`
            <div class="preview-dev-panel__split" data-preview-dev-split>
              <div class="preview-dev-panel__split-pane">
                <div class="${r}" data-preview-dev-body>
                  <div class="preview-dev-panel__row-highlights" data-preview-dev-row-highlights></div>
                  <div class="preview-dev-panel__line-numbers" data-preview-dev-line-numbers aria-hidden="true"></div>
                  <div class="preview-dev-panel__layer-gutter" data-preview-dev-layer-gutter></div>
                  <pre class="preview-dev-panel__code" data-preview-dev-code aria-hidden="true"><code>${f(i.editorValue,i.mode)}\n</code></pre>
                  <textarea class="preview-dev-panel__editor" data-preview-dev-editor spellcheck="false" aria-label="${u(i.mode)} editor">${u(i.editorValue)}</textarea>
                  ${a}
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
                  <pre class="preview-dev-panel__code" data-preview-dev-overrides-code aria-hidden="true"><code>${f(i.overridesValue,`overrides`)}\n</code></pre>
                  <textarea class="preview-dev-panel__editor" data-preview-dev-overrides-editor spellcheck="false" aria-label="Overrides editor">${u(i.overridesValue)}</textarea>
                </div>
              </div>
            </div>
          `:`
            <div class="${r}" data-preview-dev-body>
              <div class="preview-dev-panel__row-highlights" data-preview-dev-row-highlights></div>
              <div class="preview-dev-panel__line-numbers" data-preview-dev-line-numbers aria-hidden="true"></div>
              <div class="preview-dev-panel__layer-gutter" data-preview-dev-layer-gutter></div>
              <pre class="preview-dev-panel__code" data-preview-dev-code aria-hidden="true"><code>${f(i.editorValue,i.mode)}\n</code></pre>
              <textarea class="preview-dev-panel__editor" data-preview-dev-editor spellcheck="false" aria-label="${u(i.mode)} editor">${u(i.editorValue)}</textarea>
              ${a}
            </div>
          `}
      <div class="preview-dev-panel__resize-handle" data-preview-dev-resize-handle role="separator" aria-orientation="vertical" aria-label="Resize Dev Mode drawer" tabindex="0"></div>
    `,Lt(),v(),ye(),vt(),x(),S(),W(),K(),gt(),I()}function Lt(){let e=document.querySelector(`[data-preview-dev-toggle]`);e instanceof HTMLButtonElement&&(e.classList.toggle(`is-active`,i.open),e.setAttribute(`aria-expanded`,i.open?`true`:`false`))}let Rt=null,zt=!1;function Bt(e){return e instanceof Element?e.matches(`[data-vibe-drawer-toggle], [data-customizer-drawer-toggle]`)?20:e.matches(`[data-comments-drawer-toggle]`)?30:e.matches(`[data-uploads-drawer-toggle]`)?40:e.matches(`[data-preview-dev-divider]`)?90:e.matches(`[data-preview-dev-toggle]`)?100:10:50}function $(){let e=document.querySelector(`[data-side-actions]`);if(!(e instanceof HTMLElement)||zt)return;let t=Array.from(e.children),n=t.map((e,t)=>({node:e,index:t,rank:Bt(e)})).sort((e,t)=>e.rank-t.rank||e.index-t.index).map(e=>e.node);if(!n.every((e,n)=>e===t[n])){zt=!0;try{n.forEach(t=>e.append(t))}finally{zt=!1}}}function Vt(){let e=document.querySelector(`[data-side-actions]`);!(e instanceof HTMLElement)||Rt||(Rt=new MutationObserver(()=>{window.requestAnimationFrame($)}),Rt.observe(e,{childList:!0}))}function Ht(e){i.open=!!e,i.open&&_(),Q()}l.addEventListener(`pointerdown`,e=>{let t=e.target;if(!(t instanceof Element))return;let n=t.closest(`[data-preview-dev-layer-toggle]`);if(!n){if(t.closest(`[data-preview-dev-split-resize-handle]`)){e.preventDefault(),e.stopPropagation(),be(e);return}t.closest(`[data-preview-dev-resize-handle]`)&&(e.preventDefault(),e.stopPropagation(),me(e));return}e.preventDefault(),e.stopPropagation(),kt(Number.parseInt(String(n.getAttribute(`data-preview-dev-line`)||``),10))},!0),document.addEventListener(`pointermove`,e=>{he(e),xe(e)}),document.addEventListener(`pointerup`,()=>{ge(),Se()}),document.addEventListener(`pointercancel`,()=>{ge(),Se()}),document.addEventListener(`pointerdown`,e=>{!i.open||l.contains(e.target)||F(e.target)instanceof Element&&(i.allowCssRefilterFromSelection=!0)},!0),l.addEventListener(`click`,e=>{let t=e.target;if(!(t instanceof Element))return;if(e.stopPropagation(),t.closest(`[data-preview-dev-close]`)){e.preventDefault(),Ht(!1);return}let n=t.closest(`[data-preview-dev-layer-toggle]`);if(n){e.preventDefault(),e.stopPropagation();let t=Number.parseInt(String(n.getAttribute(`data-preview-dev-line`)||``),10);e.detail===0&&kt(t);return}if(t.closest(`[data-preview-dev-css-see-all]`)){e.preventDefault();let t=D();i.cssShowAll=!0,i.cssFullValue=t,i.editorValue=t,i.dirty=!0,i.error=``,i.status=``,i.hoveredCssRule=null,L([]),g(),Y(),X(),Q();return}let r=t.closest(`[data-preview-dev-tab]`);if(r){e.preventDefault(),e.stopPropagation();let t=String(r.getAttribute(`data-preview-dev-tab`)||``).trim();if(!t||t===i.mode)return;i.mode=t,i.mode===`css`?(i.cssFullValue=String(p().css||``),i.cssFilterSignature=E()):i.mode===`js`&&(i.jsFullValue=String(p().js||``),i.jsFilterSignature=A()),i.editorValue=h(t),i.dirty=!1,i.error=``,i.status=``,i.hoveredHtmlLine=-1,i.hoveredCssRule=null,i.hoveredJsBlock=null,i.hoveredOverridePath=``,L([]),g(),Q();return}if(t instanceof HTMLTextAreaElement&&t.matches(`[data-preview-dev-editor]`)){window.requestAnimationFrame(()=>{if(x(),i.mode===`html`)It(t);else if(i.mode===`css`){let t=qe(Ke(e))[0]||null;t instanceof Element&&Z(t)}else if(i.mode===`js`){let t=Ge(We(e))[0]||null;t instanceof Element&&Z(t)}});return}if(t instanceof HTMLTextAreaElement&&t.matches(`[data-preview-dev-overrides-editor]`)){window.requestAnimationFrame(()=>{S();let t=M(ke(e));t instanceof Element&&Z(t)});return}if(t.closest(`[data-preview-dev-body]`)&&i.mode===`html`){let t=Xe(e);t>=0&&Ft(t)}}),l.addEventListener(`pointerdown`,e=>{let t=e.target;t instanceof Element&&t.closest(`[data-preview-dev-tab]`)&&e.stopPropagation()},!0),l.addEventListener(`mousedown`,e=>{let t=e.target;t instanceof Element&&t.closest(`[data-preview-dev-tab]`)&&e.stopPropagation()},!0),l.addEventListener(`pointerdown`,e=>{e.stopPropagation()}),l.addEventListener(`mousedown`,e=>{e.stopPropagation()}),l.addEventListener(`input`,e=>{let t=e.target;if(t instanceof HTMLTextAreaElement){if(t.matches(`[data-preview-dev-overrides-editor]`)){i.overridesValue=t.value,i.overridesDirty=!0,i.status=``,i.error=``,b(),Y(),X(`overrides`);return}t.matches(`[data-preview-dev-editor]`)&&(i.editorValue=t.value,i.dirty=!0,i.status=``,i.error=``,ue(i.editorValue,le(t.value,t.selectionStart||0)),b(),Y(),X())}}),l.addEventListener(`scroll`,e=>{let t=e.target;t instanceof HTMLTextAreaElement&&(t.matches(`[data-preview-dev-editor]`)||t.matches(`[data-preview-dev-overrides-editor]`))&&y()},!0),l.addEventListener(`pointermove`,e=>{let t=e.target;if(t instanceof Element){if(t.closest(`[data-preview-dev-overrides-body]`)){R(-1),z(null),B(null),V(ke(e));return}if(i.mode===`css`&&t.closest(`[data-preview-dev-body]`)){R(-1),V(``),B(null),z(Ke(e));return}if(i.mode===`js`&&t.closest(`[data-preview-dev-body]`)){R(-1),z(null),V(``),B(We(e));return}i.mode!==`html`||!t.closest(`[data-preview-dev-body]`)||(z(null),B(null),V(``),R(Xe(e)))}}),l.addEventListener(`pointerleave`,e=>{let t=e.relatedTarget;t instanceof Node&&l.contains(t)||(R(-1),z(null),B(null),V(``))}),l.addEventListener(`keyup`,e=>{let t=e.target;if(t instanceof HTMLTextAreaElement){if(t.matches(`[data-preview-dev-overrides-editor]`)){new Set([`ArrowUp`,`ArrowDown`,`ArrowLeft`,`ArrowRight`,`Home`,`End`,`PageUp`,`PageDown`]).has(e.key)&&S();return}t.matches(`[data-preview-dev-editor]`)&&new Set([`ArrowUp`,`ArrowDown`,`ArrowLeft`,`ArrowRight`,`Home`,`End`,`PageUp`,`PageDown`]).has(e.key)&&(x(),i.mode===`html`&&It(t))}}),l.addEventListener(`select`,e=>{let t=e.target;if(t instanceof HTMLTextAreaElement){if(t.matches(`[data-preview-dev-overrides-editor]`)){window.requestAnimationFrame(S);return}t.matches(`[data-preview-dev-editor]`)&&window.requestAnimationFrame(()=>{x(),i.mode===`html`&&It(t)})}}),document.addEventListener(`mouseover`,e=>{if(!i.open||l.contains(e.target))return;let t=F(e.target),n=N(t),r=P(t);(r!==i.previewHoveredLayerPath||i.mode===`html`&&n>=0&&n!==i.previewHoveredHtmlLine)&&(i.previewHoveredLayerPath=r,i.previewHoveredHtmlLine=i.mode===`html`?n:-1,W(),K())}),document.addEventListener(`mouseout`,e=>{if(!i.open||l.contains(e.target))return;let t=F(e.target);if(!(t instanceof Element))return;let n=F(e.relatedTarget);n===t||n instanceof Element&&t.contains(n)||(i.previewHoveredHtmlLine!==-1||i.previewHoveredLayerPath)&&(i.previewHoveredHtmlLine=-1,i.previewHoveredLayerPath=``,W(),K())}),document.addEventListener(`click`,e=>{if(i.mode!==`html`||!i.open||l.contains(e.target))return;let t=N(F(e.target));t>=0&&(i.allowCssRefilterFromSelection=!0,i.selectedHtmlLine=t,W(),window.requestAnimationFrame(H))}),l.addEventListener(`keydown`,e=>{let t=e.target;if(!(t instanceof HTMLTextAreaElement))return;let n=t.matches(`[data-preview-dev-overrides-editor]`);if(!(!n&&!t.matches(`[data-preview-dev-editor]`))&&!(n&&(e.metaKey||e.ctrlKey)&&(e.key.toLowerCase()===`z`||e.key.toLowerCase()===`y`))){if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()===`z`){e.preventDefault(),de(e.shiftKey?1:-1,t);return}if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()===`y`){e.preventDefault(),de(1,t);return}if(e.key===`Tab`){e.preventDefault();let n=t.selectionStart||0,r=t.selectionEnd||0;t.value=`${t.value.slice(0,n)}  ${t.value.slice(r)}`,t.selectionStart=t.selectionEnd=n+2,t.dispatchEvent(new Event(`input`,{bubbles:!0}))}}});function Ut(){let e=p(),t={action:`savePreviewContentEdits`,project:i.project?.id||n,page:i.page?.id||r||document.body.dataset.pageKey||``,html:String(e.html||``),css:String(e.css||``),js:String(e.js||``),stageStyle:String(e.stageStyle||``),summary:String(e.summary||i.page?.vibe?.summary||``),syncBase:!0,breakpointOverrides:e.breakpointOverrides||{}};return i.mode===`html`?t.html=i.editorValue:i.mode===`css`?t.css=D():i.mode===`js`&&(t.js=Ue()),t.breakpointOverrides=JSON.parse(i.overridesValue||`{}`),t}async function Wt(){if(!i.page||!i.project||i.saving)return;let t;try{t=i.pendingAutosavePayload||Ut()}catch(e){i.error=e instanceof Error?e.message:`Overrides must be valid JSON.`,i.status=``;return}let n=t.__mode||i.mode,r=t.__editorKey||`main`,a=t.__value??i.editorValue;delete t.__mode,delete t.__editorKey,delete t.__value,i.pendingAutosavePayload=null;let o=i.saveRequestId+1;i.saving=!0,i.error=``,i.status=`Saving`,i.saveRequestId=o;try{let s=await fetch(e,{method:`POST`,credentials:`include`,headers:{"Content-Type":`application/json`},body:JSON.stringify(t)}),c=await s.json().catch(()=>({}));if(!s.ok||!c?.ok||!c?.project)throw Error(c?.error||`Unable to save preview code.`);if(o!==i.saveRequestId)return;let l=r===`overrides`?i.overridesValue===a:i.mode===n&&i.editorValue===a,u=i.dirty,d=i.overridesDirty;l&&(r===`overrides`?i.overridesDirty=!1:i.dirty=!1),Gt(c.project,t.page),i.dirty=(r===`overrides`||!l)&&u,i.overridesDirty=r===`overrides`?!l&&d:d,l&&(r===`overrides`?i.overridesDirty=!1:i.dirty=!1),i.status=`Saved`}catch(e){i.error=e instanceof Error?e.message:`Unable to save preview code.`,i.status=``}finally{o===i.saveRequestId&&(i.saving=!1)}}function Gt(e,t=r){let n=String(t||document.body.dataset.pageKey||r||``).trim().toLowerCase(),a=Array.isArray(e?.pages)?e.pages:[],o=a.find(e=>String(e?.id||``).trim().toLowerCase()===n)||a[0]||null;i.project=e||null,i.page=o,i.cssFullValue=String(p().css||``),i.cssFilterSignature=i.mode===`css`?E():``,i.jsFullValue=String(p().js||``),i.jsFilterSignature=i.mode===`js`?A():``,i.dirty||(i.editorValue=h(i.mode)),i.overridesDirty||(i.overridesValue=h(`overrides`)),U({force:!0})}async function Kt(){try{let t=await fetch(`${e}?project=${encodeURIComponent(n)}`,{credentials:`include`,cache:`no-store`}),i=await t.json().catch(()=>({}));t.ok&&i?.ok&&i?.project&&(Gt(i.project,r),_(),Q())}catch{}}function qt(){let e=document.querySelector(`[data-side-actions]`);if(!e)return!1;if(document.querySelector(`[data-preview-dev-toggle]`))return Vt(),$(),!0;if(!e.querySelector(`[data-uploads-drawer-toggle]`))return!1;let t=document.createElement(`span`);t.className=`preview-dev-divider`,t.setAttribute(`data-preview-dev-divider`,``),t.setAttribute(`aria-hidden`,`true`);let n=document.createElement(`button`);return n.type=`button`,n.className=`bridge-action-rail-button preview-dev-toggle`,n.setAttribute(`data-preview-dev-toggle`,``),n.setAttribute(`aria-expanded`,`false`),n.setAttribute(`aria-label`,`Dev Mode`),n.innerHTML=`
      <span class="bridge-action-rail-button__tooltip" aria-hidden="true">Dev Mode</span>
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="m8 9-3 3 3 3"></path>
        <path d="m16 9 3 3-3 3"></path>
        <path d="m14 5-4 14"></path>
      </svg>
    `,n.addEventListener(`click`,()=>Ht(!i.open)),e.append(t,n),Vt(),$(),Lt(),!0}function Jt(){let e=0,t=window.setInterval(()=>{e+=1,(qt()||e>80)&&window.clearInterval(t)},100)}window.addEventListener(`uxbridge:project-page-sync`,e=>{e.detail?.project&&(Gt(e.detail.project,e.detail.page?.id||r),_({preserveDirty:!0}),Q())}),window.addEventListener(`uxbridge:breakpoint-overrides-change`,e=>{pt(e.detail||{})}),new MutationObserver(()=>{let e=m();if(!i.open){Lt(),i.renderedBreakpointMode=e,gt();return}if(i.renderedBreakpointMode!==e){_({preserveDirty:!0}),Q();return}v(),gt()}).observe(document.body,{attributes:!0,attributeFilter:[`class`]}),window.addEventListener(`resize`,()=>{v(),ye(),I()}),document.addEventListener(`scroll`,I,!0),window.addEventListener(`uxbridge:drawer-open`,()=>{window.requestAnimationFrame(v),window.requestAnimationFrame($),window.requestAnimationFrame(it)}),window.addEventListener(`uxbridge:preview-layout-change`,()=>{window.requestAnimationFrame(v),window.requestAnimationFrame($),window.requestAnimationFrame(it)}),Jt(),Kt(),Q()})();