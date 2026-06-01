(function(){let e=`/api/projects`,t=new URLSearchParams(window.location.search),n=String(t.get(`project`)||``).trim().toLowerCase(),r=String(t.get(`page`)||``).trim().toLowerCase();if(!n)return;let i={open:!1,mode:`html`,project:null,page:null,dirty:!1,saving:!1,error:``,status:``,editorValue:``,cssFullValue:``,cssFilterSignature:``,cssShowAll:!1,allowCssRefilterFromSelection:!1,jsFullValue:``,jsFilterSignature:``,jsShowAll:!1,allowJsRefilterFromSelection:!1,overridesValue:``,renderedMode:``,renderedBreakpointMode:null,hoveredHtmlLine:-1,hoveredCssRule:null,hoveredJsBlock:null,hoveredOverridePath:``,previewHoveredHtmlLine:-1,previewHoveredLayerPath:``,previewSelectedLayerPath:``,selectedHtmlLine:-1,suppressHtmlCaretSelectUntil:0,activePreviewHoverElement:null,activePreviewHoverElements:[],autosaveTimer:0,saveRequestId:0,pendingAutosavePayload:null,codeHistory:[],codeHistoryIndex:-1,codeHistoryMode:``,codeHistoryLine:-1,renderingLivePreview:!1,previewDomSyncFrame:0,codeEditingUntil:0,panelWidth:300,resizingPanel:!1,resizeStartX:0,resizeStartWidth:300,overridesPaneHeight:0,resizingOverridesPane:!1,overridesResizeStartY:0,overridesResizeStartHeight:0,overridesDirty:!1,pendingBreakpointCodeSave:!1,overridesSyncTimer:0,layerTogglePointerActivatedUntil:0,layoutChangeFrame:0,layoutSettleTimer:0,drawerLayoutSignature:``},a=null,o=[],s=0,c=document.createElement(`style`);c.textContent=`
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

    .preview-dev-panel__line-number.is-breakpoint-overridden {
      color: #d8b4fe;
      font-weight: 800;
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

    .preview-dev-panel.is-breakpoint-active .preview-dev-panel__row-highlight.is-breakpoint-overridden {
      background: rgba(164, 41, 236, 0.11);
      box-shadow: inset 2px 0 0 rgba(164, 41, 236, 0.72);
    }

    .preview-dev-panel.is-breakpoint-active .preview-dev-panel__row-highlight.is-breakpoint-overridden.is-selected {
      background: rgba(164, 41, 236, 0.24);
      box-shadow: inset 2px 0 0 rgba(233, 213, 255, 0.95);
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
  `,document.head.append(c);let l=document.createElement(`aside`);l.className=`preview-dev-panel`,l.setAttribute(`data-preview-dev-panel`,``),l.setAttribute(`aria-label`,`Dev Mode`),document.body.append(l);function u(e=``){return String(e||``).replaceAll(`&`,`&amp;`).replaceAll(`<`,`&lt;`).replaceAll(`>`,`&gt;`).replaceAll(`"`,`&quot;`).replaceAll(`'`,`&#39;`)}function d(e,t,n){let r=String(e||``),i=``,a=0;return r.replace(t,(e,...t)=>{let o=t[t.length-2];return i+=u(r.slice(a,o)),i+=n(e,...t),a=o+e.length,e}),i+u(r.slice(a))}function ee(e){return d(e,/<!--[\s\S]*?-->|<\/?[A-Za-z][^>\s/]*(?:\s+[^\s=/>]+(?:=(?:"[^"]*"|'[^']*'|[^\s>]+))?)*\s*\/?>/g,e=>{if(e.startsWith(`<!--`))return`<span class="preview-dev-panel__token--comment">${u(e)}</span>`;let t=e.match(/^(<\/?)([A-Za-z][\w:-]*)([\s\S]*?)(\/?>)$/);if(!t)return`<span class="preview-dev-panel__token--tag">${u(e)}</span>`;let[,n,r,i=``,a]=t,o=d(i,/(\s+)([^\s=/>]+)(?:\s*(=)\s*("(?:(?:\\")|[^"])*"|'(?:(?:\\')|[^'])*'|[^\s>]+))?/g,(e,t,n,r,i)=>{let a=u(t);return a+=`<span class="preview-dev-panel__token--attr">${u(n)}</span>`,r&&(a+=`<span class="preview-dev-panel__token--operator">${u(r)}</span>`),i&&(a+=`<span class="preview-dev-panel__token--string">${u(i)}</span>`),a});return[`<span class="preview-dev-panel__token--punctuation">${u(n)}</span>`,`<span class="preview-dev-panel__token--tag">${u(r)}</span>`,o,`<span class="preview-dev-panel__token--punctuation">${u(a)}</span>`].join(``)})}function te(e){return d(e,/\/\*[\s\S]*?\*\/|#[0-9a-fA-F]{3,8}\b|(?:^|[;{\s])(--?[\w-]+)(?=\s*:)|\b-?\d*\.?\d+(?:px|rem|em|%|vh|vw|ms|s)?\b|"[^"]*"|'[^']*'/g,e=>e.startsWith(`/*`)?`<span class="preview-dev-panel__token--comment">${u(e)}</span>`:/^["']/.test(e)?`<span class="preview-dev-panel__token--string">${u(e)}</span>`:/#[0-9a-fA-F]/.test(e)?`<span class="preview-dev-panel__token--value">${u(e)}</span>`:/\d/.test(e.trim()[0]||``)?`<span class="preview-dev-panel__token--number">${u(e)}</span>`:u(e).replace(/(--?[\w-]+)/,`<span class="preview-dev-panel__token--property">$1</span>`))}function ne(e){return d(e,/\/\/.*|\/\*[\s\S]*?\*\/|`(?:\\[\s\S]|[^`])*`|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|\b(?:const|let|var|function|return|if|else|for|while|await|async|try|catch|new|class|import|export|from|true|false|null|undefined)\b|\b-?\d*\.?\d+\b/g,e=>e.startsWith(`//`)||e.startsWith(`/*`)?`<span class="preview-dev-panel__token--comment">${u(e)}</span>`:/^[`"']/.test(e)?`<span class="preview-dev-panel__token--string">${u(e)}</span>`:/^-?\d/.test(e)?`<span class="preview-dev-panel__token--number">${u(e)}</span>`:`<span class="preview-dev-panel__token--keyword">${u(e)}</span>`)}function re(e){return d(e,/"(?:\\.|[^"\\])*"(?=\s*:)|"(?:\\.|[^"\\])*"|[-]?\b\d*\.?\d+\b|\b(?:true|false|null)\b/g,e=>e.endsWith(`"`)&&/"\s*$/.test(e)?`<span class="preview-dev-panel__token--string">${u(e)}</span>`:/^-?\d/.test(e)?`<span class="preview-dev-panel__token--number">${u(e)}</span>`:/^(true|false|null)$/.test(e)?`<span class="preview-dev-panel__token--keyword">${u(e)}</span>`:`<span class="preview-dev-panel__token--property">${u(e)}</span>`)}function f(e,t=i.mode){return t===`css`?te(e):t===`js`?ne(e):t===`overrides`?re(e):ee(e)}function ie(e){return!!String(e||``).replace(/[\u200b-\u200f\ufeff]/g,``).replace(/\u00a0/g,` `).trim()}function ae(e){let t=ce(e).trim();if(!t)return``;let n=t.replace(/>\s+</g,`>
<`).split(`
`).map(e=>e.trim()).filter(Boolean),r=new Set([`a`,`b`,`br`,`code`,`em`,`i`,`img`,`input`,`label`,`path`,`span`,`strong`]),i=0;return n.map(e=>{let t=/^<\//.test(e),n=e.match(/^<\/?([A-Za-z][\w:-]*)/),a=String(n?.[1]||``).toLowerCase(),o=/\/>$/.test(e)||/^<(area|base|br|col|embed|hr|img|input|link|meta|param|source|track|wbr)\b/i.test(e),s=r.has(a)&&!e.includes(`
`);t&&(i=Math.max(0,i-1));let c=`${`  `.repeat(i)}${e}`;return!t&&!o&&!s&&/^</.test(e)&&!/<\/[A-Za-z][\w:-]*>$/.test(e)&&(i+=1),c}).join(`
`)}let oe=[`data-ux-layer-hovered`,`data-ux-layer-selected`,`data-ux-layer-editing`,`data-ux-layer-candidate`,`data-ux-layer-drop-container`,`data-ux-layer-drag-source`];function se(e){!(e instanceof Element)&&!(e instanceof DocumentFragment)||(e instanceof Element?[e,...Array.from(e.querySelectorAll(`*`))]:Array.from(e.querySelectorAll(`*`))).forEach(e=>{e instanceof Element&&oe.forEach(t=>{e.removeAttribute(t)})})}function ce(e){let t=String(e||``).trim();if(!t)return``;let n=document.createElement(`template`);return n.innerHTML=t,se(n.content),String(n.innerHTML||``).trim()}function p(e){let t=String(e||``).trim();if(!t)return``;let n=``,r=0,i=``,a=0,o=!1,s=()=>{n+=`  `.repeat(Math.max(0,r))},c=()=>{n=n.replace(/[ \t]+$/g,``),n.endsWith(`
`)||(n+=`
`),s(),o=!1};for(let e=0;e<t.length;e+=1){let l=t[e],u=t[e-1]||``;if(i){n+=l,l===i&&u!==`\\`&&(i=``);continue}if(l===`"`||l===`'`){o&&n&&!/[\s({:;,>]$/.test(n)&&(n+=` `),o=!1,i=l,n+=l;continue}if(l===`(`){a+=1,n+=l;continue}if(l===`)`){a=Math.max(0,a-1),n+=l;continue}if(/\s/.test(l)){o=!0;continue}if(o&&n&&!/[\s({:;,>]$/.test(n)&&!/[{};]/.test(l)&&(n+=` `),o=!1,l===`{`&&a===0){n=n.replace(/[ \t]+$/g,``),n+=` {
`,r+=1,s();continue}if(l===`}`&&a===0){r=Math.max(0,r-1),n=n.replace(/[ \t]+$/g,``),n.endsWith(`
`)||(n+=`
`),s(),n+=`}`,t[e+1]&&t[e+1]!==`}`&&c();continue}if(l===`;`&&a===0){n+=`;`,c();continue}if(l===`,`&&a===0&&r===0){n+=`,`,c();continue}if(l===`:`&&a===0){n=n.replace(/[ \t]+$/g,``),n+=`: `;continue}n+=l}return n.split(`
`).map(e=>e.replace(/[ \t]+$/g,``)).join(`
`).replace(/\n{3,}/g,`

`).trim()}function m(){return i.page?.preview||i.page?.vibe?.appliedDraft||{}}let h=`__preview_code__`,g={html:`data-ux-preview-html`,css:`data-ux-preview-css`,js:`data-ux-preview-js`};function _(){return document.body.classList.contains(`breakpoint-specific-active`)||!!document.querySelector(`.preview-inspector__content--breakpoint-specific-active`)}function le(){let e=[{id:`mobile-xs`,label:`Mobile & Extra Small`,start:320,end:480},{id:`tablet-sm`,label:`Tablet & Small`,start:481,end:768},{id:`laptop-md`,label:`Laptop & Medium`,start:769,end:1024},{id:`desktop-lg`,label:`Large Desktop`,start:1025,end:null}],t=Array.isArray(i.project?.inspectorBreakpoints)?i.project.inspectorBreakpoints:[];return e.map((e,n)=>{let r=t[n]&&typeof t[n]==`object`?t[n]:{},i=Number.parseInt(String(r.start??e.start),10),a=r.end??e.end,o=a==null||String(a).trim()===``||String(a).trim().toLowerCase()===`none`?null:Number.parseInt(String(a),10);return{id:e.id,label:String(r.label||e.label),start:Number.isFinite(i)?Math.max(0,i):e.start,end:Number.isFinite(o)&&o>0?o:null}})}function ue(){let e=document.querySelector(`[data-preview-inspector-breakpoint-scope-label]`),t=e instanceof HTMLElement?e.textContent?.replace(/\+$/,``).trim():``,n=le(),r=n.find(e=>e.label===t);if(_()&&r)return r.id;let i=I(),a=i instanceof Element?Math.round(i.getBoundingClientRect().width||0):0;return n.find(e=>a>=e.start&&(e.end==null||a<=e.end))?.id||n[n.length-1]?.id||``}function de(){let e=le(),t=ue(),n=e.findIndex(e=>e.id===t);return n>=0?n:Math.max(0,e.length-1)}function fe(e,t=Ve()){let n=String(e||``).trim(),r=n&&t&&typeof t==`object`?t[n]:null;if(!n||!r||typeof r!=`object`)return null;let i=le(),a=de();for(let e=Math.min(a,i.length-1);e>=0;--e){let t=i[e]?.id;if(t&&Object.prototype.hasOwnProperty.call(r,t))return r[t]}return null}function pe(e=m()){let t=fe(h,e?.breakpointOverrides||{}),n=t&&typeof t==`object`&&t.attrs&&typeof t.attrs==`object`?t.attrs:null;return n?{html:Object.prototype.hasOwnProperty.call(n,g.html)?String(n[g.html]||``):null,css:Object.prototype.hasOwnProperty.call(n,g.css)?String(n[g.css]||``):null,js:Object.prototype.hasOwnProperty.call(n,g.js)?String(n[g.js]||``):null}:null}function me(e=m()){let t=e?.breakpointOverrides;return!!(t&&typeof t==`object`&&Object.keys(t).length)}function v(e=m(),t={}){if(t.requireBreakpointMode===!0&&!_())return e||{};let n=pe(e);return n?{...e||{},html:n.html==null?String(e?.html||``):n.html,css:n.css==null?String(e?.css||``):n.css,js:n.js==null?String(e?.js||``):n.js}:e||{}}function he(e){if(!_())return!1;let t=String(e||``).trim(),n=ue(),r=Ve(),i=t&&r?r[t]:null;return!!(t&&n&&i&&typeof i==`object`&&Object.prototype.hasOwnProperty.call(i,n))}function ge(){return[{id:`html`,label:`HTML`},{id:`css`,label:`CSS`},{id:`js`,label:`JavaScript`}]}function y(e=i.mode){let t=v();if(e===`css`){let e=p(t.css||i.cssFullValue||``);return i.cssShowAll?e:$e(e)}if(e===`js`){let e=String(t.js||i.jsFullValue||``);return i.jsShowAll?e:ot(e)}return e===`overrides`?JSON.stringify(t.breakpointOverrides||{},null,2):ae(t.html||``)}function _e(e,t){return String(e||``).slice(0,Math.max(0,t||0)).split(`
`).length-1}function b(e=i.editorValue){i.codeHistory=[{value:String(e||``),line:-1}],i.codeHistoryIndex=0,i.codeHistoryMode=i.mode,i.codeHistoryLine=-1}function ve(e,t=-1){let n=String(e||``);if(i.codeHistoryMode!==i.mode){b(n),i.codeHistory[0].line=t,i.codeHistoryLine=t;return}let r=i.codeHistory[i.codeHistoryIndex];if(r?.value===n){i.codeHistoryLine=t;return}i.codeHistoryIndex<i.codeHistory.length-1&&(i.codeHistory=i.codeHistory.slice(0,i.codeHistoryIndex+1)),r&&r.line===t&&t>=0?i.codeHistory[i.codeHistoryIndex]={value:n,line:t}:(i.codeHistory.push({value:n,line:t}),i.codeHistoryIndex=i.codeHistory.length-1),i.codeHistoryLine=t}function ye(e,t){if(i.codeHistoryMode!==i.mode||i.codeHistory.length<=1)return!1;let n=Math.max(0,Math.min(i.codeHistory.length-1,i.codeHistoryIndex+e));if(n===i.codeHistoryIndex)return!1;if(i.codeHistoryIndex=n,i.editorValue=i.codeHistory[i.codeHistoryIndex]?.value||``,i.dirty=!0,i.error=``,i.status=``,t instanceof HTMLTextAreaElement){let e=t.scrollTop,n=t.scrollLeft;t.value=i.editorValue,t.scrollTop=e,t.scrollLeft=n}return T(),Z(),Q(),!0}function x({preserveDirty:e=!1}={}){let t=ge();t.some(e=>e.id===i.mode)||(i.mode=t[0]?.id||`html`,e=!1),i.mode===`css`?(i.cssFullValue=p(v().css||``),i.cssFilterSignature=j()):i.mode===`js`&&(i.jsFullValue=String(v().js||``),i.jsFilterSignature=P()),(!e||!i.dirty)&&(i.editorValue=y(i.mode),i.dirty=!1,b()),(!e||!i.overridesDirty)&&(i.overridesValue=y(`overrides`),i.overridesDirty=!1)}function be(){for(let[e,t]of[[`inspector-open`,`.inspector-panel`],[`vibe-open`,`.vibe-panel`],[`comments-open`,`.comments-panel`],[`uploads-open`,`.uploads-panel`],[`customizer-open`,`.customizer-panel`]]){if(!document.body.classList.contains(e))continue;let n=document.querySelector(t);if(!(n instanceof HTMLElement))continue;let r=n.getBoundingClientRect();if(r.width>.5)return Math.round(r.width)}return 0}function S(){let e=be(),t=Math.max(300,Math.round(Number(i.panelWidth)||300)),n=document.querySelector(`[data-side-actions]`),r=i.open?e+t:e;i.panelWidth=t,l.style.setProperty(`--preview-dev-panel-width`,`${t}px`),l.style.right=`${e}px`,document.body.classList.toggle(`preview-dev-open`,i.open),document.body.style.setProperty(`--preview-dev-panel-width`,`${t}px`),document.body.style.setProperty(`--bridge-side-actions-offset`,i.open?`${t}px`:`0px`),document.body.style.setProperty(`--bridge-side-actions-reserved`,i.open?`calc(var(--bridge-side-actions-width, 88px) + ${t}px)`:`var(--bridge-side-actions-width, 88px)`),n instanceof HTMLElement&&!document.body.classList.contains(`preview-viewport-responsive`)?n.style.setProperty(`right`,`${r}px`,`important`):n instanceof HTMLElement&&n.style.removeProperty(`right`)}function xe(){return{panelWidth:Math.max(300,Math.round(Number(i.panelWidth)||300)),overridesPaneHeight:Math.max(0,Math.round(Number(i.overridesPaneHeight)||0))}}function C(){try{window.dispatchEvent(new CustomEvent(`uxbridge:preview-dev-layout-change`,{detail:xe()})),window.dispatchEvent(new CustomEvent(`uxbridge:preview-layout-change`,{detail:{source:`dev-mode`,...xe()}}))}catch{}}function Se(){i.layoutChangeFrame||=window.requestAnimationFrame(()=>{i.layoutChangeFrame=0,C()})}function Ce(){S(),C(),window.requestAnimationFrame(()=>{S(),C(),window.requestAnimationFrame(()=>{S(),C()})}),i.layoutSettleTimer&&window.clearTimeout(i.layoutSettleTimer),i.layoutSettleTimer=window.setTimeout(()=>{i.layoutSettleTimer=0,S(),C()},160)}function we(){return[document.body.classList.contains(`inspector-open`)?`inspector`:``,document.body.classList.contains(`vibe-open`)?`vibe`:``,document.body.classList.contains(`comments-open`)?`comments`:``,document.body.classList.contains(`uploads-open`)?`uploads`:``,document.body.classList.contains(`customizer-open`)?`customizer`:``,document.body.classList.contains(`preview-dev-open`)?`dev`:``].join(`|`)}function Te(){let e=we();e!==i.drawerLayoutSignature&&(i.drawerLayoutSignature=e,Ce())}function Ee(e={}){let t=Number(e.panelWidth),n=Number(e.overridesPaneHeight);Number.isFinite(t)&&t>=300&&(i.panelWidth=Math.max(300,Math.min(De(),Math.round(t)))),Number.isFinite(n)&&n>0&&(i.overridesPaneHeight=Me(n)),S(),Ne(),C()}window.UXBridgeDevModeLayout={getState:xe,setState:Ee};function De(){let e=be(),t=Number.parseFloat(window.getComputedStyle(document.body).getPropertyValue(`--bridge-side-actions-width`))||document.querySelector(`[data-side-actions]`)?.getBoundingClientRect?.().width||88,n=Math.max(300,window.innerWidth-e-t-64);return Math.max(300,Math.floor(n))}function Oe(e){i.resizingPanel=!0,i.resizeStartX=e.clientX,i.resizeStartWidth=Math.max(300,Math.round(Number(i.panelWidth)||300)),document.body.classList.add(`preview-dev-resizing`);try{e.target?.setPointerCapture?.(e.pointerId)}catch{}}function ke(e){if(!i.resizingPanel)return;let t=i.resizeStartX-e.clientX;i.panelWidth=Math.max(300,Math.min(De(),Math.round(i.resizeStartWidth+t))),S(),Se(),B()}function Ae(){i.resizingPanel&&(i.resizingPanel=!1,document.body.classList.remove(`preview-dev-resizing`),C())}function je(){let e=l.querySelector(`[data-preview-dev-split]`),t=l.querySelector(`[data-preview-dev-overrides-header]`);if(!(e instanceof HTMLElement)||!(t instanceof HTMLElement))return{min:50,max:50};let n=e.getBoundingClientRect(),r=t.getBoundingClientRect(),i=Math.max(1,Math.ceil(r.height||50));return{min:i,max:Math.max(i,Math.floor(n.height||i))}}function Me(e){let{min:t,max:n}=je(),r=Number(e);return!Number.isFinite(r)||r<=0?0:Math.max(t,Math.min(n,Math.round(r)))}function Ne(){let e=l.querySelector(`[data-preview-dev-split]`);if(e instanceof HTMLElement){if(!i.overridesPaneHeight){e.style.removeProperty(`--preview-dev-overrides-pane-height`);return}i.overridesPaneHeight=Me(i.overridesPaneHeight),e.style.setProperty(`--preview-dev-overrides-pane-height`,`${i.overridesPaneHeight}px`)}}function Pe(e){let{min:t,max:n}=je(),r=l.querySelector(`[data-preview-dev-overrides-pane]`),a=r instanceof HTMLElement?r.getBoundingClientRect().height:(t+n)/2;i.resizingOverridesPane=!0,i.overridesResizeStartY=e.clientY,i.overridesResizeStartHeight=Math.max(t,Math.min(n,Math.round(a))),document.body.classList.add(`preview-dev-overrides-resizing`);try{e.target?.setPointerCapture?.(e.pointerId)}catch{}}function Fe(e){if(!i.resizingOverridesPane)return;let t=i.overridesResizeStartY-e.clientY;i.overridesPaneHeight=Me(i.overridesResizeStartHeight+t),Ne(),w()}function Ie(){i.resizingOverridesPane&&(i.resizingOverridesPane=!1,document.body.classList.remove(`preview-dev-overrides-resizing`),C())}function w(){let e=l.querySelector(`[data-preview-dev-editor]`),t=l.querySelector(`[data-preview-dev-code]`),n=l.querySelector(`[data-preview-dev-overrides-editor]`),r=l.querySelector(`[data-preview-dev-overrides-code]`);e instanceof HTMLTextAreaElement&&t instanceof HTMLElement&&(t.scrollTop=e.scrollTop,t.scrollLeft=e.scrollLeft),n instanceof HTMLTextAreaElement&&r instanceof HTMLElement&&(r.scrollTop=n.scrollTop,r.scrollLeft=n.scrollLeft),E(),D(),q(),Kt(),qt(),J()}function T(){let e=l.querySelector(`[data-preview-dev-code]`),t=l.querySelector(`[data-preview-dev-overrides-code]`);e&&(e.innerHTML=`${f(i.editorValue,i.mode)}\n`),t&&(t.innerHTML=`${f(i.overridesValue,`overrides`)}\n`),E(),D(),Le(),q(),J()}function Le(){let e=l.querySelector(`[data-preview-dev-empty-message]`);if(!(e instanceof HTMLElement))return;let t=(i.mode===`css`||i.mode===`js`)&&!ie(i.editorValue);e.hidden=!t,e.closest(`.preview-dev-panel__body`)?.classList.toggle(`is-empty-code`,t)}function Re(e=i.editorValue){return Math.max(1,String(e||``).split(`
`).length)}function ze(){if(i.mode===`html`&&i.selectedHtmlLine>=0)return i.selectedHtmlLine;let e=l.querySelector(`[data-preview-dev-editor]`);return e instanceof HTMLTextAreaElement&&document.activeElement===e?_e(e.value,e.selectionStart||0):-1}function E(){let e=l.querySelector(`[data-preview-dev-line-numbers]`),t=l.querySelector(`[data-preview-dev-editor]`);if(!(e instanceof HTMLElement))return;let n=t instanceof HTMLTextAreaElement?O(t,`line-height`,18.6):Number.parseFloat(getComputedStyle(document.documentElement).fontSize)||18.6,r=t instanceof HTMLTextAreaElement?O(t,`padding-top`,14):14,a=t instanceof HTMLTextAreaElement&&t.scrollTop||0,o=ze(),s=i.mode===`html`?new Set(k().filter(e=>qe(e)).map(e=>e.line)):new Set;e.innerHTML=Array.from({length:Re()},(e,t)=>{let i=r+t*n-a;return`<span class="preview-dev-panel__line-number${t===o?` is-selected`:``}${s.has(t)?` is-breakpoint-overridden`:``}" style="top: ${i}px;">${t+1}</span>`}).join(``),Be()}function Be(){let e=l.querySelector(`[data-preview-dev-css-filter-footer], [data-preview-dev-js-filter-footer]`),t=l.querySelector(`[data-preview-dev-editor]`);if(!(e instanceof HTMLElement)||!(t instanceof HTMLTextAreaElement))return;let n=O(t,`line-height`,18.6),r=O(t,`padding-top`,14)+Re(i.editorValue)*n+2-t.scrollTop;e.style.setProperty(`--preview-dev-filter-footer-top`,`${Math.max(0,r)}px`)}function Ve(){try{let e=JSON.parse(i.overridesValue||`{}`);return e&&typeof e==`object`&&!Array.isArray(e)?e:null}catch{return null}}function He(e,t){let n=String(e||``).split(`
`),r=JSON.stringify(String(t||``)),i=n.findIndex(e=>e.trim().startsWith(`${r}:`));if(i<0)return null;let a=0,o=!1;for(let e=i;e<n.length;e+=1){let t=n[e]||``;for(let e=0;e<t.length;e+=1){let n=t[e];n===`{`?(a+=1,o=!0):n===`}`&&--a}if(o&&a<=0)return{start:i,end:e}}return{start:i,end:i}}function Ue(e){let t=Number.isInteger(e)&&e>=0?e:-1,n=Ve();return t<0||!n?``:Object.keys(n).find(e=>{let n=He(i.overridesValue,e);return!!n&&t>=n.start&&t<=n.end})||``}function We(e){let t=l.querySelector(`[data-preview-dev-overrides-editor]`);if(!(t instanceof HTMLTextAreaElement))return``;let n=t.getBoundingClientRect(),r=O(t,`line-height`,18.6),i=O(t,`padding-top`,14);return Ue(Math.max(0,Math.floor((e.clientY-n.top+t.scrollTop-i)/r)))}function Ge(){let e=xt(),t=Ve(),n=new Set;return!e.length||!t||e.forEach(e=>{if(!Object.prototype.hasOwnProperty.call(t,e))return;let r=He(i.overridesValue,e);if(r)for(let e=r.start;e<=r.end;e+=1)n.add(e)}),n}function D(){let e=l.querySelector(`[data-preview-dev-overrides-line-numbers]`),t=l.querySelector(`[data-preview-dev-overrides-editor]`);if(!(e instanceof HTMLElement))return;let n=t instanceof HTMLTextAreaElement?O(t,`line-height`,18.6):Number.parseFloat(getComputedStyle(document.documentElement).fontSize)||18.6,r=t instanceof HTMLTextAreaElement?O(t,`padding-top`,14):14,a=t instanceof HTMLTextAreaElement&&t.scrollTop||0,o=t instanceof HTMLTextAreaElement&&document.activeElement===t?_e(t.value,t.selectionStart||0):-1,s=Ge();e.innerHTML=Array.from({length:Re(i.overridesValue)},(e,t)=>{let i=r+t*n-a;return`<span class="preview-dev-panel__line-number${t===o||s.has(t)?` is-selected`:``}" style="top: ${i}px;">${t+1}</span>`}).join(``)}function O(e,t,n){let r=Number.parseFloat(window.getComputedStyle(e).getPropertyValue(t));return Number.isFinite(r)&&r>0?r:n}function k(e=i.editorValue){if(i.mode!==`html`)return[];let t=-1,n=[];return String(e||``).split(`
`).forEach((e,r)=>{let i=/<([A-Za-z][\w:-]*)(?=[\s>/])[^>]*>/g,a=i.exec(e);for(;a;)t+=1,n.push({line:r,ordinal:t,tagStart:a.index,tagEnd:a.index+a[0].length,hidden:Wt(a[0])}),a=i.exec(e)}),n}function Ke(e){return!e||!Number.isInteger(e.ordinal)?``:R(pt()[e.ordinal]||null)}function qe(e){return _()?he(Ke(e)):!1}function Je(e=i.editorValue){if(i.mode!==`css`)return[];let t=String(e||``).split(`
`),n=[],r=-1,a=``,o=null,s=0;return t.forEach((e,t)=>{let i=e.trim();if(!o&&!a&&!i)return;!o&&r<0&&i&&(r=t);let c=0;for(;c<e.length;){let i=e.indexOf(`{`,c),l=e.indexOf(`}`,c);if(o){if(l>=0&&(i<0||l<i)){--s,c=l+1,s<=0&&(o.end=t,n.push(o),o=null,r=-1,a=``,s=0);continue}if(i>=0){s+=1,c=i+1;continue}break}if(i<0){a+=`${e.slice(c)}\n`;break}a+=e.slice(c,i);let u=a.trim(),d=u.split(`,`).map(e=>e.trim()).filter(Boolean);u&&!u.startsWith(`@`)&&d.length&&(o={start:r>=0?r:t,end:t,selector:u,selectors:d}),s=1,c=i+1,o||(r=-1,a=``)}o&&(o.end=t)}),n}function Ye(e,t){let n=String(e||``).split(`
`);return!t||!Number.isInteger(t.start)||!Number.isInteger(t.end)?``:n.slice(t.start,t.end+1).join(`
`)}function Xe(e,t){if(!(t instanceof Element))return!1;try{return t.matches(e)}catch{return!1}}function Ze(e,t){return!e?.selectors?.length||!Array.isArray(t)||!t.length?!1:e.selectors.some(e=>t.some(t=>Xe(e,t)))}function A(){let e=I();if(!(e instanceof Element))return[];let t=Array.from(e.querySelectorAll(`[data-ux-layer-selected]:not([data-ux-layer-selected="false"])`)).filter(e=>e instanceof Element),n=e.matches(`[data-ux-layer-selected]:not([data-ux-layer-selected="false"])`)?[e,...t]:t;if(n.length)return n;let r=i.previewSelectedLayerPath?L(i.previewSelectedLayerPath):null;return r instanceof Element?[r]:(i.mode===`css`||i.mode===`js`)&&(i.cssFilterSignature||i.jsFilterSignature)?(i.mode===`js`&&i.jsFilterSignature?i.jsFilterSignature:i.cssFilterSignature).split(`|`).map(e=>L(e)).filter(e=>e instanceof Element):[]}function Qe(e){let t=A();return t.length?Je(e).filter(e=>Ze(e,t)):[]}function j(){return A().map(e=>R(e)).filter(Boolean).join(`|`)}function $e(e){let t=Qe(e);return A().length?t.map(t=>Ye(e,t)).filter(Boolean).join(`

`):String(e||``)}function et(){if(i.mode!==`css`||i.cssShowAll)return!1;let e=String(i.cssFullValue||v().css||``),t=!!(i.cssFilterSignature||j()),n=String(i.editorValue||``)!==e;return t||n}function M(){let e=String(i.cssFullValue||v().css||``);if(i.mode!==`css`||i.cssShowAll||!A().length)return i.mode===`css`?i.editorValue:e;let t=Je(e),n=Je(i.editorValue),r=A();if(ie(i.editorValue)&&!n.length)return e;let a=n.map(e=>Ye(i.editorValue,e)),o=new Map;n.forEach(e=>{let t=e.selector,n=o.get(t)||[];n.push(Ye(i.editorValue,e)),o.set(t,n)});let s=e.split(`
`),c=[],l=0;return t.forEach(e=>{if(!Ze(e,r))return;l<e.start&&c.push(s.slice(l,e.start).join(`
`));let t=o.get(e.selector)||[],n=t.length?t.shift():a.shift()||``;if(n){let e=a.indexOf(n);e>=0&&a.splice(e,1)}n&&c.push(n),l=e.end+1}),l<s.length&&c.push(s.slice(l).join(`
`)),c.filter((e,t)=>e||t===0).join(`
`).replace(/\n{4,}/g,`


`)}function tt(e=i.editorValue){if(i.mode!==`js`)return[];let t=String(e||``).split(`
`),n=[],r=-1,a=0,o=``,s=!1,c=e=>{if(r<0)return;let i=t.slice(r,e+1).join(`
`).trim();i&&n.push({start:r,end:e,source:i}),r=-1,a=0,o=``,s=!1};return t.forEach((e,t)=>{r<0&&e.trim()&&(r=t);for(let t=0;t<e.length;t+=1){let n=e[t],r=e[t+1];if(o){s=!s&&n===`\\`,!s&&n===o?o=``:n!==`\\`&&(s=!1);continue}if(n===`/`&&r===`/`||n===`/`&&r===`*`)break;if(n===`"`||n===`'`||n==="`"){o=n,s=!1;continue}n===`{`||n===`(`||n===`[`?a+=1:(n===`}`||n===`)`||n===`]`)&&(a=Math.max(0,a-1))}let n=e.trim();r>=0&&a===0&&(n.endsWith(`;`)||n.endsWith(`}`)||!n&&t>r)&&c(n?t:t-1)}),r>=0&&c(t.length-1),n}function nt(e,t){let n=String(e||``).split(`
`);return!t||!Number.isInteger(t.start)||!Number.isInteger(t.end)?``:n.slice(t.start,t.end+1).join(`
`)}function rt(e){let t=[],n=/\b(?:querySelector(?:All)?|closest|matches)\(\s*(['"`])([\s\S]*?)\1/g,r=n.exec(String(e||``));for(;r;){let i=String(r[2]||``).trim();i&&t.push(i),r=n.exec(String(e||``))}return t}function it(e,t){let n=rt(e?.source||``);return!n.length||!Array.isArray(t)||!t.length?!1:n.some(e=>t.some(t=>Xe(e,t)))}function N(){let e=A(),t=[];return e.forEach(e=>{e instanceof Element&&(t.includes(e)||t.push(e),e.querySelectorAll(`*`).forEach(e=>{e instanceof Element&&!t.includes(e)&&t.push(e)}))}),t}function at(e){let t=N();return t.length?tt(e).filter(e=>it(e,t)):[]}function P(){return N().map(e=>R(e)).filter(Boolean).join(`|`)}function ot(e){return N().length?at(e).map(t=>nt(e,t)).filter(Boolean).join(`

`):String(e||``)}function st(){if(i.mode!==`js`||i.jsShowAll)return!1;let e=String(i.jsFullValue||v().js||``),t=!!(i.jsFilterSignature||P()),n=String(i.editorValue||``)!==e;return t||n}function F(){let e=String(i.jsFullValue||v().js||``);if(i.mode!==`js`||i.jsShowAll||!N().length)return i.mode===`js`?i.editorValue:e;let t=tt(e),n=tt(i.editorValue),r=N(),a=n.map(e=>nt(i.editorValue,e)),o=new Map;n.forEach(e=>{let t=rt(e.source).join(`|`),n=o.get(t)||[];n.push(nt(i.editorValue,e)),o.set(t,n)});let s=e.split(`
`),c=[],l=0;return t.forEach(e=>{if(!it(e,r))return;l<e.start&&c.push(s.slice(l,e.start).join(`
`));let t=rt(e.source).join(`|`),n=o.get(t)||[],i=n.length?n.shift():a.shift()||``;if(i){let e=a.indexOf(i);e>=0&&a.splice(e,1),c.push(i)}l=e.end+1}),l<s.length&&c.push(s.slice(l).join(`
`)),c.filter((e,t)=>e||t===0).join(`
`).replace(/\n{4,}/g,`


`)}function ct(e){if(i.mode!==`js`)return null;let t=l.querySelector(`[data-preview-dev-editor]`);if(!(t instanceof HTMLTextAreaElement))return null;let n=t.getBoundingClientRect(),r=O(t,`line-height`,18.6),a=O(t,`padding-top`,14),o=Math.max(0,Math.floor((e.clientY-n.top+t.scrollTop-a)/r));return tt().find(e=>o>=e.start&&o<=e.end)||null}function lt(e){let t=I(),n=rt(e?.source||``);if(!(t instanceof Element)||!n.length)return[];let r=[];return n.forEach(e=>{try{(t.matches(e)?[t,...Array.from(t.querySelectorAll(e))]:Array.from(t.querySelectorAll(e))).forEach(e=>{e instanceof Element&&!r.includes(e)&&r.push(e)})}catch{}}),r}function ut(e){if(i.mode!==`css`)return null;let t=l.querySelector(`[data-preview-dev-editor]`);if(!(t instanceof HTMLTextAreaElement))return null;let n=t.getBoundingClientRect(),r=O(t,`line-height`,18.6),a=O(t,`padding-top`,14),o=Math.max(0,Math.floor((e.clientY-n.top+t.scrollTop-a)/r));return Je().find(e=>o>=e.start&&o<=e.end)||null}function dt(e){let t=I();if(!(t instanceof Element)||!e?.selectors?.length)return[];let n=[];return e.selectors.forEach(e=>{try{(t.matches(e)?[t,...Array.from(t.querySelectorAll(e))]:Array.from(t.querySelectorAll(e))).forEach(e=>{e instanceof Element&&!n.includes(e)&&n.push(e)})}catch{}}),n}function ft(){return i.hoveredHtmlLine>=0?i.hoveredHtmlLine:i.previewHoveredHtmlLine}function I(){let e=document.querySelector(`[data-vibe-mobile-render]`)?.querySelector?.(`.vibe-generated-page`);if(e instanceof Element)return e;let t=document.querySelector(`.mobile-page .vibe-generated-page, .vibe-mobile-stage .vibe-generated-page`);return t instanceof Element?t:null}function pt(){let e=I();return e instanceof Element?[e,...Array.from(e.querySelectorAll(`*`))]:[]}function L(e){let t=bt(),n=String(e||``).split(`.`).map(e=>Number.parseInt(e,10));if(!(t instanceof Element)||!n.length||n.some(e=>!Number.isInteger(e)||e<0))return null;let r=t;for(let e of n)if(r=r.children[e]||null,!(r instanceof Element))return null;return r}function mt(e=m()){let t=e?.breakpointOverrides;!t||typeof t!=`object`||Object.entries(t).forEach(([e])=>{let n=String(e||``).trim();if(!n||n===h)return;let r=L(n),i=fe(n,t);if(!(r instanceof HTMLElement)||!i||typeof i!=`object`)return;let a=i.styles&&typeof i.styles==`object`?i.styles:{},o=i.attrs&&typeof i.attrs==`object`?i.attrs:{};Object.entries(a).forEach(([e,t])=>{let n=String(e||``).trim();n&&(r.style[n]=t==null||t===``?``:String(t))}),Object.entries(o).forEach(([e,t])=>{let n=String(e||``).trim();n&&(t==null?r.removeAttribute(n):r.setAttribute(n,String(t)))}),Object.prototype.hasOwnProperty.call(i,`text`)&&(r.textContent=String(i.text||``))})}function ht(e){return k().find(t=>t.line===e)||null}function gt(e){if(i.mode!==`html`)return-1;let t=l.querySelector(`[data-preview-dev-editor]`);if(!(t instanceof HTMLTextAreaElement))return-1;let n=t.getBoundingClientRect(),r=O(t,`line-height`,18.6),a=O(t,`padding-top`,14),o=Math.max(0,Math.floor((e.clientY-n.top+t.scrollTop-a)/r));return k().some(e=>e.line===o)?o:-1}function _t(e){if(i.mode!==`html`||!(e instanceof HTMLTextAreaElement))return-1;let t=Number.isFinite(e.selectionStart)?e.selectionStart:0,n=e.value.slice(0,Math.max(0,t)).split(`
`).length-1,r=k(e.value);return r.some(e=>e.line===n)?n:r.filter(e=>e.line<n).sort((e,t)=>t.line-e.line)[0]?.line??-1}function vt(e){let t=ht(e);return t&&pt()[t.ordinal]||null}function yt(e){if(!(e instanceof Element))return-1;let t=pt().indexOf(e);return t<0?-1:k()[t]?.line??-1}function bt(){let e=document.querySelector(`[data-vibe-mobile-render]`);return e instanceof Element?e:null}function R(e){let t=bt();if(!(e instanceof Element)||!(t instanceof Element)||e===t||!t.contains(e))return``;let n=[],r=e;for(;r instanceof Element&&r!==t;){let e=r.parentElement;if(!(e instanceof Element))return``;let t=Array.from(e.children).indexOf(r);if(t<0)return``;n.unshift(t),r=e}return n.join(`.`)}function xt(){let e=bt();return e instanceof Element?Array.from(e.querySelectorAll(`[data-ux-layer-selected]:not([data-ux-layer-selected="false"])`)).map(e=>R(e)).filter(Boolean):[]}function z(e){let t=I();if(!(t instanceof Element))return null;let n=e instanceof Element?e:e?.parentElement||null;for(;n instanceof Element&&n!==document.body;){if(n===t||t.contains(n))return n;n=n.parentElement}return null}function St(e,t,n=null){e instanceof Element&&e.dispatchEvent(new MouseEvent(t,{bubbles:!0,cancelable:!0,view:window,relatedTarget:n}))}function Ct(e=0){if(o[e]instanceof HTMLElement)return o[e];let t=document.createElement(`div`);return t.className=`preview-dev-layer-hover-overlay`,t.setAttribute(`data-preview-dev-layer-hover-overlay`,``),t.innerHTML=`<span class="preview-dev-layer-hover-overlay__label" data-preview-dev-layer-hover-label></span>`,document.body.append(t),o[e]=t,t}function wt(e){let t=Math.max(0,e.width),n=Math.max(0,e.height),r=e=>{let t=Math.round(e*100)/100;return String(t)};return`${r(t)} x ${r(n)}`}function Tt(){s=0;let e=Array.isArray(i.activePreviewHoverElements)?i.activePreviewHoverElements.filter(e=>e instanceof Element):[];if(!i.open||!e.length){o.forEach(e=>e?.classList?.remove(`is-visible`));return}e.forEach((e,t)=>{let n=Ct(t),r=Dt(e),i=r?.getBoundingClientRect?.();if(!(r instanceof Element)||!r.isConnected||!i||i.width<=0||i.height<=0){n.classList.remove(`is-visible`);return}n.style.left=`${i.left}px`,n.style.top=`${i.top}px`,n.style.width=`${i.width}px`,n.style.height=`${i.height}px`,n.querySelector(`[data-preview-dev-layer-hover-label]`)?.replaceChildren(wt(i)),n.classList.toggle(`is-breakpoint-override`,he(R(e))),n.classList.add(`is-visible`)}),o.slice(e.length).forEach(e=>e?.classList?.remove(`is-visible`))}function B(){s||=window.requestAnimationFrame(Tt)}function Et(e){if(!(e instanceof Element)||!e.isConnected)return!1;let t=e.getBoundingClientRect();return t.width>0&&t.height>0}function Dt(e){if(Et(e))return e;let t=Array.from(e?.querySelectorAll?.(`*`)||[]).find(e=>Et(e));if(t instanceof Element)return t;let n=I(),r=e?.parentElement||null;for(;r instanceof Element&&n instanceof Element&&n.contains(r);){if(Et(r))return r;r=r.parentElement}return e instanceof Element?e:null}function Ot(e){At(e>=0?vt(e):null)}function kt(e){At(e?L(e):null)}function At(e){V(e instanceof Element?[e]:[])}function V(e){let t=Array.from(new Set((Array.isArray(e)?e:[]).filter(e=>e instanceof Element))),n=Array.isArray(i.activePreviewHoverElements)?i.activePreviewHoverElements.filter(e=>e instanceof Element):i.activePreviewHoverElement instanceof Element?[i.activePreviewHoverElement]:[];n.length===t.length&&n.every((e,n)=>e===t[n])||(n.filter(e=>!t.includes(e)).forEach(e=>St(e,`mouseout`,t[0]||document.body)),i.activePreviewHoverElements=t,i.activePreviewHoverElement=t[0]||null,t.filter(e=>!n.includes(e)).forEach(e=>St(e,`mouseover`,n[0]||document.body)),B())}function H(e){let t=Number.isInteger(e)&&e>=0?e:-1;if(i.hoveredHtmlLine===t){B();return}i.hoveredHtmlLine=t,Ot(t),q()}function U(e){let t=e&&typeof e==`object`?e:null,n=i.hoveredCssRule;if(!n&&!t||n&&t&&n.start===t.start&&n.end===t.end&&n.selector===t.selector){B();return}i.hoveredCssRule=t,V(t?dt(t):[]),Kt()}function W(e){let t=e&&typeof e==`object`?e:null,n=i.hoveredJsBlock;if(!n&&!t||n&&t&&n.start===t.start&&n.end===t.end&&n.source===t.source){B();return}i.hoveredJsBlock=t,V(t?lt(t):[]),qt()}function jt({force:e=!1}={}){if(i.mode!==`css`)return;let t=l.querySelector(`[data-preview-dev-editor]`);if(!e&&t instanceof HTMLTextAreaElement&&document.activeElement===t&&performance.now()<Number(i.codeEditingUntil||0))return;let n=i.cssFilterSignature,r=j(),a=r!==n;if(i.dirty&&!e&&!a)return;let o=i.dirty?p(M()):p(v().css||i.cssFullValue||``);a&&(i.cssShowAll=!1);let s=i.cssShowAll?o:$e(o);if(!e&&o===i.cssFullValue&&r===i.cssFilterSignature&&s===i.editorValue)return;let c=!!l.querySelector(`[data-preview-dev-css-filter-footer]`),u=t instanceof HTMLTextAreaElement?t.scrollTop:0,d=t instanceof HTMLTextAreaElement?t.scrollLeft:0;if(i.cssFullValue=o,i.cssFilterSignature=r,i.editorValue=s,b(),t instanceof HTMLTextAreaElement&&(t.value=i.editorValue,t.scrollTop=u,t.scrollLeft=d),c!==et()){$();return}T()}function Mt({force:e=!1}={}){if(i.mode!==`js`)return;let t=l.querySelector(`[data-preview-dev-editor]`);if(!e&&t instanceof HTMLTextAreaElement&&document.activeElement===t&&performance.now()<Number(i.codeEditingUntil||0))return;let n=i.jsFilterSignature,r=P(),a=r!==n;if(i.dirty&&!e&&!a)return;let o=i.dirty?F():String(v().js||i.jsFullValue||``);a&&(i.jsShowAll=!1);let s=i.jsShowAll?o:ot(o);if(!e&&o===i.jsFullValue&&r===i.jsFilterSignature&&s===i.editorValue)return;let c=!!l.querySelector(`[data-preview-dev-js-filter-footer]`),u=t instanceof HTMLTextAreaElement?t.scrollTop:0,d=t instanceof HTMLTextAreaElement?t.scrollLeft:0;if(i.jsFullValue=o,i.jsFilterSignature=r,i.editorValue=s,b(),t instanceof HTMLTextAreaElement&&(t.value=i.editorValue,t.scrollTop=u,t.scrollLeft=d),c!==st()){$();return}T()}function G(e){let t=String(e||``).trim();if(i.hoveredOverridePath===t){B();return}i.hoveredOverridePath=t,kt(t),J()}function K(){if(!i.open)return;let e=I();if(!(e instanceof Element)){i.previewHoveredHtmlLine=-1,i.previewHoveredLayerPath=``,i.previewSelectedLayerPath=``,i.selectedHtmlLine=-1,q(),jt(),Kt(),Mt(),qt(),D(),J();return}let t=e.querySelector(`[data-ux-layer-hovered]:not([data-ux-layer-hovered="false"])`),n=e.querySelector(`[data-ux-layer-selected]:not([data-ux-layer-selected="false"])`),r=t instanceof Element?yt(t):-1,a=t instanceof Element?R(t):``,o=n instanceof Element?yt(n):-1,s=n instanceof Element?R(n):``,c=i.mode===`html`?r:-1,l=i.mode===`html`?o:-1,u=s!==i.previewSelectedLayerPath||l!==i.selectedHtmlLine;(c!==i.previewHoveredHtmlLine||a!==i.previewHoveredLayerPath||s!==i.previewSelectedLayerPath||l!==i.selectedHtmlLine)&&(i.previewHoveredHtmlLine=c,i.previewHoveredLayerPath=a,i.previewSelectedLayerPath=s,i.selectedHtmlLine=l,E(),q(),u&&(!i.cssShowAll||i.allowCssRefilterFromSelection)&&jt(),i.allowCssRefilterFromSelection=!1,Kt(),u&&(!i.jsShowAll||i.allowJsRefilterFromSelection)&&Mt(),i.allowJsRefilterFromSelection=!1,qt(),D(),J())}function Nt(){let e=document.querySelector(`[data-vibe-mobile-render]`);if(!(e instanceof Element))return``;let t=e.cloneNode(!0);return t instanceof Element?(se(t),t.innerHTML):``}function Pt(){if(i.previewDomSyncFrame=0,!i.open||i.mode!==`html`||i.renderingLivePreview)return;let e=l.querySelector(`[data-preview-dev-editor]`);if(e instanceof HTMLTextAreaElement&&document.activeElement===e||performance.now()<Number(i.codeEditingUntil||0))return;let t=m();if(!_()&&(me(t)||pe(t)))return;let n=Nt(),r=ae(n);if(!r||r===i.editorValue)return;let a=e instanceof HTMLTextAreaElement?e.scrollTop:0,o=e instanceof HTMLTextAreaElement?e.scrollLeft:0;i.editorValue=r,i.dirty=!1,i.error=``,i.status=``,!_()&&i.page?.preview&&(i.page.preview={...i.page.preview,html:n}),!_()&&i.page?.vibe?.appliedDraft&&(i.page.vibe.appliedDraft={...i.page.vibe.appliedDraft,html:n}),b(),e instanceof HTMLTextAreaElement&&(e.value=i.editorValue,e.scrollTop=a,e.scrollLeft=o),T(),w(),K()}function Ft(){i.renderingLivePreview||i.mode!==`html`||(i.previewDomSyncFrame||=window.requestAnimationFrame(Pt))}function It({force:e=!1}={}){if(!i.open||!_()||i.overridesDirty)return;let t=y(`overrides`);if(t===i.overridesValue)return;let n=l.querySelector(`[data-preview-dev-overrides-editor]`);if(!e&&n instanceof HTMLTextAreaElement&&document.activeElement===n)return;let r=n instanceof HTMLTextAreaElement?n.scrollTop:0,a=n instanceof HTMLTextAreaElement?n.scrollLeft:0;i.overridesValue=t,i.error=``,i.status=``,n instanceof HTMLTextAreaElement&&(n.value=i.overridesValue,n.scrollTop=r,n.scrollLeft=a),T(),w()}function Lt(){let e=l.querySelector(`[data-preview-dev-overrides-editor]`),t=e instanceof HTMLTextAreaElement?e.scrollTop:0,n=e instanceof HTMLTextAreaElement?e.scrollLeft:0;e instanceof HTMLTextAreaElement&&e.value!==i.overridesValue&&(e.value=i.overridesValue,e.scrollTop=t,e.scrollLeft=n),T(),w()}function Rt(e={}){if(e.project)Cn(e.project,e.page?.id||r);else if(i.page&&e.breakpointOverrides&&typeof e.breakpointOverrides==`object`){let t={...m(),breakpointOverrides:e.breakpointOverrides};i.page={...i.page,preview:i.page.preview?t:i.page.preview,vibe:i.page.vibe?{...i.page.vibe,appliedDraft:i.page.vibe.appliedDraft?{...i.page.vibe.appliedDraft,breakpointOverrides:e.breakpointOverrides}:i.page.vibe.appliedDraft}:i.page.vibe}}let t=y(`overrides`),n=l.querySelector(`[data-preview-dev-overrides-editor]`),a=n instanceof HTMLTextAreaElement?n.scrollTop:0,o=n instanceof HTMLTextAreaElement?n.scrollLeft:0;i.overridesDirty=!1,i.overridesValue=t,i.error=``,i.status=``,n instanceof HTMLTextAreaElement&&(n.value=t,n.scrollTop=a,n.scrollLeft=o),T(),w()}function zt(){i.overridesSyncTimer||typeof window>`u`||(i.overridesSyncTimer=window.setInterval(()=>It(),250))}function Bt(){!i.overridesSyncTimer||typeof window>`u`||(window.clearInterval(i.overridesSyncTimer),i.overridesSyncTimer=0)}function Vt(){if(i.open&&_()){zt(),It();return}Bt()}function Ht(){i.previewDomSyncFrame&&=(window.cancelAnimationFrame(i.previewDomSyncFrame),0)}function Ut(){let e=I();if(!(e instanceof Element)){a?.disconnect(),a=null;return}a?.__previewRoot!==e&&(a?.disconnect(),a=new MutationObserver(()=>{K(),Ft(),It()}),a.__previewRoot=e,a.observe(e,{subtree:!0,childList:!0,attributes:!0,characterData:!0}),K())}function Wt(e){return/\sdata-ux-layer-hidden-control=(["'])true\1/i.test(e)||/\sdata-ux-layer-visible=(["'])false\1/i.test(e)||/\saria-hidden=(["'])true\1/i.test(e)||/style=(["'])[^"']*display\s*:\s*none/i.test(e)||/style=(["'])[^"']*visibility\s*:\s*hidden/i.test(e)}function Gt(e){return e?`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 2l20 20"></path><path d="M10.6 10.6a2 2 0 0 0 2.8 2.8"></path><path d="M9.9 4.2A10.4 10.4 0 0 1 12 4c5 0 9 5 10 8a15.6 15.6 0 0 1-2.1 3.6"></path><path d="M6.5 6.5C4.4 7.9 2.8 10 2 12c1 3 5 8 10 8a10.7 10.7 0 0 0 5.5-1.6"></path></svg>`:`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z"></path><circle cx="12" cy="12" r="3"></circle></svg>`}function q(){let e=l.querySelector(`[data-preview-dev-layer-gutter]`),t=l.querySelector(`[data-preview-dev-editor]`),n=l.querySelector(`[data-preview-dev-row-highlights]`);if(!(e instanceof HTMLElement)||!(t instanceof HTMLTextAreaElement)||i.mode!==`html`){e instanceof HTMLElement&&(e.innerHTML=``),n instanceof HTMLElement&&(n.innerHTML=``);return}let r=k(),a=ft(),o=i.selectedHtmlLine,s=e=>{let t=new Set;return e.filter(e=>{let n=String(e.line);return t.has(n)?!1:(t.add(n),!0)})},c=s(r.filter(e=>e.hidden||e.line===a)),u=O(t,`padding-top`,14),d=O(t,`line-height`,18.6),ee=t.scrollTop||0;n instanceof HTMLElement&&(n.innerHTML=s(r.filter(e=>e.line===a||e.line===o||qe(e))).map(e=>{let t=u+e.line*d-ee;return`<div class="preview-dev-panel__row-highlight${e.line===o?` is-selected`:``}${qe(e)?` is-breakpoint-overridden`:``}" style="top: ${t}px; height: ${d}px;"></div>`}).join(``)),e.innerHTML=c.map(e=>{let t=u+e.line*d+(d-22)/2-ee,n=e.line===a||e.hidden?` is-visible`:``,r=e.hidden?` is-hidden`:``,i=e.hidden?`Unhide HTML layer`:`Hide HTML layer`;return`
          <button
            type="button"
            class="preview-dev-panel__layer-toggle${n}${r}"
            style="top: ${t}px;"
            data-preview-dev-layer-toggle
            data-preview-dev-line="${e.line}"
            data-preview-dev-tag-start="${e.tagStart}"
            aria-label="${i}"
            title="${i}"
          >
            ${Gt(e.hidden)}
          </button>
        `}).join(``)}function Kt(){let e=l.querySelector(`[data-preview-dev-row-highlights]`),t=l.querySelector(`[data-preview-dev-editor]`);if(!(e instanceof HTMLElement)||!(t instanceof HTMLTextAreaElement)||i.mode!==`css`)return;let n=i.hoveredCssRule;if(!n){e.innerHTML=``;return}let r=O(t,`padding-top`,14),a=O(t,`line-height`,18.6),o=t.scrollTop||0,s=[];for(let e=n.start;e<=n.end;e+=1)s.push(e);e.innerHTML=s.map(e=>`<div class="preview-dev-panel__row-highlight" style="top: ${r+e*a-o}px; height: ${a}px;"></div>`).join(``)}function qt(){let e=l.querySelector(`[data-preview-dev-row-highlights]`),t=l.querySelector(`[data-preview-dev-editor]`);if(!(e instanceof HTMLElement)||!(t instanceof HTMLTextAreaElement)||i.mode!==`js`)return;let n=i.hoveredJsBlock;if(!n){e.innerHTML=``;return}let r=O(t,`padding-top`,14),a=O(t,`line-height`,18.6),o=t.scrollTop||0,s=[];for(let e=n.start;e<=n.end;e+=1)s.push(e);e.innerHTML=s.map(e=>`<div class="preview-dev-panel__row-highlight" style="top: ${r+e*a-o}px; height: ${a}px;"></div>`).join(``)}function J(){let e=l.querySelector(`[data-preview-dev-overrides-row-highlights]`),t=l.querySelector(`[data-preview-dev-overrides-editor]`);if(!(e instanceof HTMLElement)||!(t instanceof HTMLTextAreaElement)){e instanceof HTMLElement&&(e.innerHTML=``);return}let n=Ge(),r=i.hoveredOverridePath||i.previewHoveredLayerPath,a=r?He(i.overridesValue,r):null,o=new Set;if(a)for(let e=a.start;e<=a.end;e+=1)o.add(e);if(!n.size&&!o.size){e.innerHTML=``;return}let s=O(t,`padding-top`,14),c=O(t,`line-height`,18.6),u=t.scrollTop||0;e.innerHTML=Array.from(new Set([...o,...n])).sort((e,t)=>e-t).map(e=>{let t=s+e*c-u;return`<div class="preview-dev-panel__row-highlight${n.has(e)?` is-selected`:``}" style="top: ${t}px; height: ${c}px;"></div>`}).join(``)}function Jt(e){return String(e).replace(/[.*+?^${}()|[\]\\]/g,`\\$&`)}function Yt(e){return String(e).replace(/&/g,`&amp;`).replace(/"/g,`&quot;`)}function Y(e,t,n){let r=RegExp(`\\s${Jt(t)}(?:=(?:"[^"]*"|'[^']*'|[^\\s>]+))?`,`i`),i=` ${t}="${Yt(n)}"`;return r.test(e)?e.replace(r,i):e.replace(/\s*(\/?>)$/,`${i}$1`)}function X(e,t){let n=RegExp(`\\s${Jt(t)}(?:=(?:"[^"]*"|'[^']*'|[^\\s>]+))?`,`ig`);return e.replace(n,``)}function Xt(e,t){let n=RegExp(`\\s${Jt(t)}=(["'])([\\s\\S]*?)\\1`,`i`),r=e.match(n);return r?r[2]:``}function Zt(e){let t=e.match(/\sstyle=(["'])([\s\S]*?)\1/i);return t?{quote:t[1],value:t[2]}:null}function Qt(e,t){let n=Zt(e);if(!n)return``;let r=String(t||``).trim().toLowerCase();if(!r)return``;let i=n.value.split(`;`).map(e=>e.trim()).filter(Boolean).find(e=>{let t=e.indexOf(`:`);return t>=0&&e.slice(0,t).trim().toLowerCase()===r});return i?i.slice(i.indexOf(`:`)+1).trim():``}function $t(e,t){let n=Zt(e),r=new Map;n&&n.value.split(`;`).map(e=>e.trim()).filter(Boolean).forEach(e=>{let t=e.indexOf(`:`);if(t<0)return;let n=e.slice(0,t).trim().toLowerCase(),i=e.slice(t+1).trim();n&&r.set(n,i)}),Object.entries(t).forEach(([e,t])=>{let n=e.toLowerCase();t==null?r.delete(n):r.set(n,t)});let i=Array.from(r.entries()).map(([e,t])=>`${e}: ${t}`).join(`; `);return i?Y(e,`style`,`${i};`):X(e,`style`)}function en(e,t,n=-1){let r=/<([A-Za-z][\w:-]*)(?=[\s>/])[^>]*>/g,i=null;if(Number.isInteger(n)&&n>=0){let t=r.exec(e);for(;t;){if(t.index===n){i=t;break}t=r.exec(e)}}if(i||=(r.lastIndex=0,r.exec(e)),!i)return e;let a=e.slice(0,i.index),o=i[0],s=e.slice(i.index+o.length);if(t){let e=Qt(o,`display`);e&&e.toLowerCase()!==`none`&&(o=Y(o,`data-ux-layer-display-cache`,e)),o=Y(o,`data-ux-layer-hidden-control`,`true`),o=Y(o,`data-ux-layer-visible`,`false`),o=Y(o,`aria-hidden`,`true`),o=$t(o,{display:`none`,visibility:null,"pointer-events":null})}else{let e=Xt(o,`data-ux-layer-display-cache`);o=X(o,`data-ux-layer-hidden-control`),o=X(o,`data-ux-layer-visible`),o=X(o,`data-ux-layer-display-cache`),o=X(o,`aria-hidden`),o=$t(o,{display:e||null,visibility:null,"pointer-events":null})}return`${a}${o}${s}`}function tn(){let e=new Set([document.scrollingElement,document.documentElement,document.body,document.querySelector(`.bridge-main--project`),document.querySelector(`.bridge-preview-stage`),document.querySelector(`.mobile-page`),document.querySelector(`[data-vibe-mobile-stage]`),document.querySelector(`[data-vibe-mobile-render]`)]);return Array.from(e).filter(e=>e instanceof Element).map(e=>({node:e,top:e.scrollTop,left:e.scrollLeft}))}function nn(e){Array.isArray(e)&&e.forEach(e=>{!e?.node||!document.contains(e.node)||(e.node.scrollTop=e.top,e.node.scrollLeft=e.left)})}function rn(e,t=-1){if(i.mode!==`html`||!Number.isInteger(e)||e<0)return;let n=l.querySelector(`[data-preview-dev-editor]`),r=tn(),a=String(i.editorValue||``).split(`
`);if(!a[e])return;let o=k().find(n=>n.line===e&&(!Number.isInteger(t)||t<0||n.tagStart===t)),s=!Wt(o&&Number.isInteger(o.tagStart)&&Number.isInteger(o.tagEnd)?a[e].slice(o.tagStart,o.tagEnd):a[e]);if(a[e]=en(a[e],s,o?.tagStart??t),i.editorValue=a.join(`
`),i.dirty=!0,i.error=``,i.status=``,Ht(),ve(i.editorValue,e),n instanceof HTMLTextAreaElement){let e=n.scrollTop,t=n.scrollLeft;n.value=i.editorValue,n.scrollTop=e,n.scrollLeft=t;try{n.focus({preventScroll:!0})}catch{n.focus()}}T(),w(),Z(),nn(r),window.requestAnimationFrame(()=>nn(r)),Q()}function an(e){e instanceof Element&&rn(Number.parseInt(String(e.getAttribute(`data-preview-dev-line`)||``),10),Number.parseInt(String(e.getAttribute(`data-preview-dev-tag-start`)||``),10))}function on(){let e=m(),t={...e,html:String(e.html||``),css:String(e.css||``),js:String(e.js||``),stageStyle:String(e.stageStyle||``),breakpointOverrides:e.breakpointOverrides||{}};if(_()&&i.mode!==`overrides`){let n=ue(),r=i.overridesDirty?JSON.parse(i.overridesValue||`{}`):JSON.parse(JSON.stringify(e.breakpointOverrides||{}));if(n){let a=r[h]?.[n]||{},o={...a.attrs&&typeof a.attrs==`object`?a.attrs:{}};Object.prototype.hasOwnProperty.call(o,g.html)||(o[g.html]=String(e.html||``)),Object.prototype.hasOwnProperty.call(o,g.css)||(o[g.css]=String(e.css||``)),Object.prototype.hasOwnProperty.call(o,g.js)||(o[g.js]=String(e.js||``)),i.mode===`html`?o[g.html]=i.editorValue:i.mode===`css`?o[g.css]=M():i.mode===`js`&&(o[g.js]=F()),r[h]={...r[h]&&typeof r[h]==`object`?r[h]:{},[n]:{styles:{},attrs:o}},t.breakpointOverrides=r,i.overridesValue=JSON.stringify(r,null,2),i.pendingBreakpointCodeSave=!0}}else i.mode===`html`?t.html=i.editorValue:i.mode===`css`?t.css=M():i.mode===`js`&&(t.js=F());return i.mode===`overrides`&&(t.breakpointOverrides=JSON.parse(i.overridesValue||`{}`)),t}function sn(e){!i.page||!e||(i.page.preview=e,i.page.hasContent=!!e.html,i.page.vibe={...i.page.vibe||{},status:`applied`,appliedDraft:e,summary:e.summary||i.page.vibe?.summary||``})}function cn(e){let t=e?.__uxBridgePreviewCleanup;if(typeof t==`function`)try{t()}catch(e){console.warn(`[dev-mode] preview.js cleanup failed`,e)}e&&(e.__uxBridgePreviewCleanup=null)}function ln(e,t){cn(e);let n=String(t?.js||``).trim();if(!e||!n)return;let r=e.firstElementChild instanceof HTMLElement?e.firstElementChild:e;try{let t=Function(`root`,`page`,`project`,`api`,n)(r,i.page,i.project,{});typeof t==`function`&&(e.__uxBridgePreviewCleanup=t)}catch(e){console.warn(`[dev-mode] preview.js failed`,e)}}function un(e){let t=document.querySelector(`.mobile-page`),n=document.querySelector(`[data-empty-mobile-shell]`),r=document.querySelector(`[data-vibe-mobile-stage]`),a=document.querySelector(`[data-vibe-mobile-style]`),o=document.querySelector(`[data-vibe-mobile-render]`);if(!t||!n||!r||!a||!o)return;let s=!!e?.html;t.classList.toggle(`mobile-page--empty`,!s),n.hidden=s,r.hidden=!s,i.renderingLivePreview=!0;try{if(!s){cn(o),a.textContent=``,o.innerHTML=``;return}a.textContent=String(e.css||``),o.innerHTML=String(e.html||``),ln(o,e),mt(e)}finally{window.requestAnimationFrame(()=>{i.renderingLivePreview=!1,Ut(),K()})}}function Z(){let e;try{e=on()}catch(e){return i.error=e instanceof Error?e.message:`Overrides must be valid JSON.`,!1}i.error=``,sn(e);let t=tn();return un(v(e)),nn(t),window.requestAnimationFrame(()=>nn(t)),i.mode!==`overrides`&&Lt(),window.dispatchEvent(new CustomEvent(`uxbridge:preview-code-live-update`,{detail:{projectId:i.project?.id||n,pageId:i.page?.id||r||document.body.dataset.pageKey||``,preview:e}})),!0}function Q(e=`main`){try{i.pendingAutosavePayload={...xn(),__mode:i.mode,__editorKey:e,__value:e===`overrides`?i.overridesValue:i.editorValue}}catch(e){i.error=e instanceof Error?e.message:`Overrides must be valid JSON.`;return}i.autosaveTimer&&window.clearTimeout(i.autosaveTimer),i.autosaveTimer=window.setTimeout(()=>{i.autosaveTimer=0,Sn()},450)}function dn(e){if(!(e instanceof Element))return!1;i.allowCssRefilterFromSelection=!0,i.allowJsRefilterFromSelection=!0;let t=R(e);return t?(window.dispatchEvent(new CustomEvent(`uxbridge:comment-selection-select`,{detail:{pageId:i.page?.id||r||document.body.dataset.pageKey||``,layerPath:t}})),At(e),window.requestAnimationFrame(K),!0):!1}function fn(e){let t=vt(e);t instanceof Element&&(i.selectedHtmlLine=e,E(),q(),D(),J(),dn(t))}function pn(e){let t=_t(e);t>=0&&fn(t)}function $(){x({preserveDirty:!0});let e=ge(),t=_(),n=et(),r=st(),a=n||r,o=(i.mode===`css`||i.mode===`js`)&&!ie(i.editorValue),s=`preview-dev-panel__body${a?` has-filter-footer`:``}${o?` is-empty-code`:``}`,c=o?`<div class="preview-dev-panel__empty-message" data-preview-dev-empty-message>No available code</div>`:`<div class="preview-dev-panel__empty-message" data-preview-dev-empty-message hidden>No available code</div>`,d=a?`
        <div class="preview-dev-panel__filter-footer" ${n?`data-preview-dev-css-filter-footer`:`data-preview-dev-js-filter-footer`}>
          <button type="button" class="preview-dev-panel__see-all" ${n?`data-preview-dev-css-see-all`:`data-preview-dev-js-see-all`}>See All</button>
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
                <div class="${s}" data-preview-dev-body>
                  <div class="preview-dev-panel__row-highlights" data-preview-dev-row-highlights></div>
                  <div class="preview-dev-panel__line-numbers" data-preview-dev-line-numbers aria-hidden="true"></div>
                  <div class="preview-dev-panel__layer-gutter" data-preview-dev-layer-gutter></div>
                  <pre class="preview-dev-panel__code" data-preview-dev-code aria-hidden="true"><code>${f(i.editorValue,i.mode)}\n</code></pre>
                  <textarea class="preview-dev-panel__editor" data-preview-dev-editor spellcheck="false" aria-label="${u(i.mode)} editor">${u(i.editorValue)}</textarea>
                  ${c}
                  ${d}
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
                  <textarea class="preview-dev-panel__editor" data-preview-dev-overrides-editor spellcheck="false" aria-label="Overrides viewer" readonly aria-readonly="true">${u(i.overridesValue)}</textarea>
                </div>
              </div>
            </div>
          `:`
            <div class="${s}" data-preview-dev-body>
              <div class="preview-dev-panel__row-highlights" data-preview-dev-row-highlights></div>
              <div class="preview-dev-panel__line-numbers" data-preview-dev-line-numbers aria-hidden="true"></div>
              <div class="preview-dev-panel__layer-gutter" data-preview-dev-layer-gutter></div>
              <pre class="preview-dev-panel__code" data-preview-dev-code aria-hidden="true"><code>${f(i.editorValue,i.mode)}\n</code></pre>
              <textarea class="preview-dev-panel__editor" data-preview-dev-editor spellcheck="false" aria-label="${u(i.mode)} editor">${u(i.editorValue)}</textarea>
              ${c}
              ${d}
            </div>
          `}
      <div class="preview-dev-panel__resize-handle" data-preview-dev-resize-handle role="separator" aria-orientation="vertical" aria-label="Resize Dev Mode drawer" tabindex="0"></div>
    `,mn(),S(),Ne(),Ut(),E(),D(),q(),J(),Vt(),B()}function mn(){let e=document.querySelector(`[data-preview-dev-toggle]`);e instanceof HTMLButtonElement&&(e.classList.toggle(`is-active`,i.open),e.setAttribute(`aria-expanded`,i.open?`true`:`false`))}let hn=null,gn=!1;function _n(e){return e instanceof Element?e.matches(`[data-vibe-drawer-toggle], [data-customizer-drawer-toggle]`)?20:e.matches(`[data-comments-drawer-toggle]`)?30:e.matches(`[data-uploads-drawer-toggle]`)?40:e.matches(`[data-preview-dev-divider]`)?90:e.matches(`[data-preview-dev-toggle]`)?100:10:50}function vn(){let e=document.querySelector(`[data-side-actions]`);if(!(e instanceof HTMLElement)||gn)return;let t=Array.from(e.children),n=t.map((e,t)=>({node:e,index:t,rank:_n(e)})).sort((e,t)=>e.rank-t.rank||e.index-t.index).map(e=>e.node);if(!n.every((e,n)=>e===t[n])){gn=!0;try{n.forEach(t=>e.append(t))}finally{gn=!1}}}function yn(){let e=document.querySelector(`[data-side-actions]`);!(e instanceof HTMLElement)||hn||(hn=new MutationObserver(()=>{window.requestAnimationFrame(vn)}),hn.observe(e,{childList:!0}))}function bn(e){i.open=!!e,i.open&&x(),$(),Ce()}l.addEventListener(`pointerdown`,e=>{let t=e.target;if(!(t instanceof Element))return;let n=t.closest(`[data-preview-dev-layer-toggle]`);if(n){e.preventDefault(),e.stopPropagation(),i.layerTogglePointerActivatedUntil=performance.now()+350,an(n);return}if(t.closest(`[data-preview-dev-split-resize-handle]`)){e.preventDefault(),e.stopPropagation(),Pe(e);return}t.closest(`[data-preview-dev-resize-handle]`)&&(e.preventDefault(),e.stopPropagation(),Oe(e))},!0),document.addEventListener(`pointermove`,e=>{ke(e),Fe(e)}),document.addEventListener(`pointerup`,()=>{Ae(),Ie()}),document.addEventListener(`pointercancel`,()=>{Ae(),Ie()}),document.addEventListener(`pointerdown`,e=>{!i.open||l.contains(e.target)||z(e.target)instanceof Element&&(i.allowCssRefilterFromSelection=!0,i.allowJsRefilterFromSelection=!0)},!0),l.addEventListener(`click`,e=>{let t=e.target;if(!(t instanceof Element))return;if(e.stopPropagation(),t.closest(`[data-preview-dev-close]`)){e.preventDefault(),bn(!1);return}let n=t.closest(`[data-preview-dev-layer-toggle]`);if(n){e.preventDefault(),e.stopPropagation(),performance.now()>Number(i.layerTogglePointerActivatedUntil||0)&&an(n);return}if(t.closest(`[data-preview-dev-css-see-all]`)){e.preventDefault();let t=M();i.cssShowAll=!0,i.cssFullValue=p(t),i.editorValue=p(t),i.dirty=!0,i.error=``,i.status=``,i.hoveredCssRule=null,V([]),b(),Z(),Q(),$();return}if(t.closest(`[data-preview-dev-js-see-all]`)){e.preventDefault();let t=F();i.jsShowAll=!0,i.jsFullValue=t,i.editorValue=t,i.dirty=!0,i.error=``,i.status=``,i.hoveredJsBlock=null,V([]),b(),Z(),Q(),$();return}let r=t.closest(`[data-preview-dev-tab]`);if(r){e.preventDefault(),e.stopPropagation();let t=String(r.getAttribute(`data-preview-dev-tab`)||``).trim();if(!t||t===i.mode)return;i.mode=t,i.mode===`css`?(i.cssFullValue=p(v().css||``),i.cssFilterSignature=j()):i.mode===`js`&&(i.jsFullValue=String(v().js||``),i.jsFilterSignature=P()),i.editorValue=y(t),i.dirty=!1,i.error=``,i.status=``,i.hoveredHtmlLine=-1,i.hoveredCssRule=null,i.hoveredJsBlock=null,i.hoveredOverridePath=``,V([]),b(),$();return}if(t instanceof HTMLTextAreaElement&&t.matches(`[data-preview-dev-editor]`)){if(i.mode===`html`){let t=gt(e);t>=0&&(i.suppressHtmlCaretSelectUntil=performance.now()+250,fn(t));return}window.requestAnimationFrame(()=>{if(E(),i.mode===`css`){let t=dt(ut(e))[0]||null;t instanceof Element&&dn(t)}else if(i.mode===`js`){let t=lt(ct(e))[0]||null;t instanceof Element&&dn(t)}});return}if(t instanceof HTMLTextAreaElement&&t.matches(`[data-preview-dev-overrides-editor]`)){window.requestAnimationFrame(()=>{D();let t=L(We(e));t instanceof Element&&dn(t)});return}if(t.closest(`[data-preview-dev-body]`)&&i.mode===`html`){let t=gt(e);t>=0&&fn(t)}}),l.addEventListener(`pointerdown`,e=>{let t=e.target;t instanceof Element&&t.closest(`[data-preview-dev-tab]`)&&e.stopPropagation()},!0),l.addEventListener(`mousedown`,e=>{let t=e.target;t instanceof Element&&t.closest(`[data-preview-dev-tab]`)&&e.stopPropagation()},!0),l.addEventListener(`pointerdown`,e=>{e.stopPropagation()}),l.addEventListener(`mousedown`,e=>{e.stopPropagation()}),l.addEventListener(`input`,e=>{let t=e.target;if(t instanceof HTMLTextAreaElement){if(t.matches(`[data-preview-dev-overrides-editor]`)){t.value=i.overridesValue,T();return}t.matches(`[data-preview-dev-editor]`)&&(i.editorValue=t.value,i.codeEditingUntil=performance.now()+1200,i.dirty=!0,i.status=``,i.error=``,ve(i.editorValue,_e(t.value,t.selectionStart||0)),T(),Z(),Q())}}),l.addEventListener(`scroll`,e=>{let t=e.target;t instanceof HTMLTextAreaElement&&(t.matches(`[data-preview-dev-editor]`)||t.matches(`[data-preview-dev-overrides-editor]`))&&w()},!0),l.addEventListener(`pointermove`,e=>{let t=e.target;if(t instanceof Element){if(t.closest(`[data-preview-dev-overrides-body]`)){H(-1),U(null),W(null),G(We(e));return}if(i.mode===`css`&&t.closest(`[data-preview-dev-body]`)){H(-1),G(``),W(null),U(ut(e));return}if(i.mode===`js`&&t.closest(`[data-preview-dev-body]`)){H(-1),U(null),G(``),W(ct(e));return}i.mode!==`html`||!t.closest(`[data-preview-dev-body]`)||(U(null),W(null),G(``),H(gt(e)))}}),l.addEventListener(`pointerleave`,e=>{let t=e.relatedTarget;t instanceof Node&&l.contains(t)||(H(-1),U(null),W(null),G(``))}),l.addEventListener(`keyup`,e=>{let t=e.target;if(t instanceof HTMLTextAreaElement){if(t.matches(`[data-preview-dev-overrides-editor]`)){new Set([`ArrowUp`,`ArrowDown`,`ArrowLeft`,`ArrowRight`,`Home`,`End`,`PageUp`,`PageDown`]).has(e.key)&&D();return}t.matches(`[data-preview-dev-editor]`)&&new Set([`ArrowUp`,`ArrowDown`,`ArrowLeft`,`ArrowRight`,`Home`,`End`,`PageUp`,`PageDown`]).has(e.key)&&(E(),i.mode===`html`&&pn(t))}}),l.addEventListener(`select`,e=>{let t=e.target;if(t instanceof HTMLTextAreaElement){if(t.matches(`[data-preview-dev-overrides-editor]`)){window.requestAnimationFrame(D);return}t.matches(`[data-preview-dev-editor]`)&&window.requestAnimationFrame(()=>{if(E(),i.mode===`html`){if(performance.now()<Number(i.suppressHtmlCaretSelectUntil||0))return;pn(t)}})}}),document.addEventListener(`mouseover`,e=>{if(!i.open||l.contains(e.target))return;let t=z(e.target),n=yt(t),r=R(t);(r!==i.previewHoveredLayerPath||i.mode===`html`&&n>=0&&n!==i.previewHoveredHtmlLine)&&(i.previewHoveredLayerPath=r,i.previewHoveredHtmlLine=i.mode===`html`?n:-1,q(),J())}),document.addEventListener(`mouseout`,e=>{if(!i.open||l.contains(e.target))return;let t=z(e.target);if(!(t instanceof Element))return;let n=z(e.relatedTarget);n===t||n instanceof Element&&t.contains(n)||(i.previewHoveredHtmlLine!==-1||i.previewHoveredLayerPath)&&(i.previewHoveredHtmlLine=-1,i.previewHoveredLayerPath=``,q(),J())}),document.addEventListener(`click`,e=>{if(i.mode!==`html`||!i.open||l.contains(e.target))return;let t=yt(z(e.target));t>=0&&(i.allowCssRefilterFromSelection=!0,i.selectedHtmlLine=t,q(),window.requestAnimationFrame(K))}),l.addEventListener(`keydown`,e=>{let t=e.target;if(!(t instanceof HTMLTextAreaElement))return;let n=t.matches(`[data-preview-dev-overrides-editor]`);if(!(!n&&!t.matches(`[data-preview-dev-editor]`))&&!n){if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()===`z`){e.preventDefault(),ye(e.shiftKey?1:-1,t);return}if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()===`y`){e.preventDefault(),ye(1,t);return}if(e.key===`Tab`){e.preventDefault();let n=t.selectionStart||0,r=t.selectionEnd||0;t.value=`${t.value.slice(0,n)}  ${t.value.slice(r)}`,t.selectionStart=t.selectionEnd=n+2,t.dispatchEvent(new Event(`input`,{bubbles:!0}))}}});function xn(){let e=m(),t={action:`savePreviewContentEdits`,project:i.project?.id||n,page:i.page?.id||r||document.body.dataset.pageKey||``,html:String(e.html||``),css:String(e.css||``),js:String(e.js||``),stageStyle:String(e.stageStyle||``),summary:String(e.summary||i.page?.vibe?.summary||``),syncBase:!0,breakpointOverrides:e.breakpointOverrides||{}},a=!!pe(e);return(_()||i.pendingBreakpointCodeSave||a)&&i.mode!==`overrides`?t.syncBase=!1:i.mode===`html`?t.html=i.editorValue:i.mode===`css`?t.css=M():i.mode===`js`&&(t.js=F()),t.breakpointOverrides=JSON.parse(i.overridesValue||`{}`),t}async function Sn(){if(!i.page||!i.project)return;if(i.saving){i.autosaveTimer||=window.setTimeout(()=>{i.autosaveTimer=0,Sn()},250);return}let t;try{t=i.pendingAutosavePayload||xn()}catch(e){i.error=e instanceof Error?e.message:`Overrides must be valid JSON.`,i.status=``;return}let n=t.__mode||i.mode,r=t.__editorKey||`main`,a=t.__value??i.editorValue;delete t.__mode,delete t.__editorKey,delete t.__value,i.pendingAutosavePayload=null;let o=i.saveRequestId+1;i.saving=!0,i.error=``,i.status=`Saving`,i.saveRequestId=o;try{let s=await fetch(e,{method:`POST`,credentials:`include`,headers:{"Content-Type":`application/json`},body:JSON.stringify(t)}),c=await s.json().catch(()=>({}));if(!s.ok||!c?.ok||!c?.project)throw Error(c?.error||`Unable to save preview code.`);if(o!==i.saveRequestId)return;let l=r===`overrides`?i.overridesValue===a:i.mode===n&&i.editorValue===a,u=i.dirty,d=i.overridesDirty;l&&(r===`overrides`?i.overridesDirty=!1:i.dirty=!1),Cn(c.project,t.page),i.pendingBreakpointCodeSave=!1,i.dirty=(r===`overrides`||!l)&&u,i.overridesDirty=r===`overrides`?!l&&d:d,l&&(r===`overrides`?i.overridesDirty=!1:i.dirty=!1),i.status=`Saved`}catch(e){i.error=e instanceof Error?e.message:`Unable to save preview code.`,i.status=``}finally{o===i.saveRequestId&&(i.saving=!1)}}function Cn(e,t=r){let n=String(t||document.body.dataset.pageKey||r||``).trim().toLowerCase(),a=Array.isArray(e?.pages)?e.pages:[],o=a.find(e=>String(e?.id||``).trim().toLowerCase()===n)||a[0]||null;i.project=e||null,i.page=o,i.cssFullValue=p(v().css||``),i.cssFilterSignature=i.mode===`css`?j():``,i.jsFullValue=String(v().js||``),i.jsFilterSignature=i.mode===`js`?P():``,i.dirty||(i.editorValue=y(i.mode)),i.overridesDirty||(i.overridesValue=y(`overrides`)),It({force:!0})}async function wn(){try{let t=await fetch(`${e}?project=${encodeURIComponent(n)}`,{credentials:`include`,cache:`no-store`}),i=await t.json().catch(()=>({}));t.ok&&i?.ok&&i?.project&&(Cn(i.project,r),x(),$())}catch{}}function Tn(){let e=document.querySelector(`[data-side-actions]`);if(!e)return!1;if(document.querySelector(`[data-preview-dev-toggle]`))return yn(),vn(),!0;if(!e.querySelector(`[data-uploads-drawer-toggle]`))return!1;let t=document.createElement(`span`);t.className=`preview-dev-divider`,t.setAttribute(`data-preview-dev-divider`,``),t.setAttribute(`aria-hidden`,`true`);let n=document.createElement(`button`);return n.type=`button`,n.className=`bridge-action-rail-button preview-dev-toggle`,n.setAttribute(`data-preview-dev-toggle`,``),n.setAttribute(`aria-expanded`,`false`),n.setAttribute(`aria-label`,`Dev Mode`),n.innerHTML=`
      <span class="bridge-action-rail-button__tooltip" aria-hidden="true">Dev Mode</span>
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="m8 9-3 3 3 3"></path>
        <path d="m16 9 3 3-3 3"></path>
        <path d="m14 5-4 14"></path>
      </svg>
    `,n.addEventListener(`click`,()=>bn(!i.open)),e.append(t,n),yn(),vn(),mn(),!0}function En(){let e=0,t=window.setInterval(()=>{e+=1,(Tn()||e>80)&&window.clearInterval(t)},100)}window.addEventListener(`uxbridge:project-page-sync`,e=>{e.detail?.project&&(Cn(e.detail.project,e.detail.page?.id||r),x({preserveDirty:!0}),$())}),window.addEventListener(`uxbridge:breakpoint-overrides-change`,e=>{Rt(e.detail||{})}),new MutationObserver(()=>{let e=_();if(Te(),!i.open){mn(),i.renderedBreakpointMode=e,Vt();return}if(i.renderedBreakpointMode!==e){x({preserveDirty:!0}),$();return}S(),Vt()}).observe(document.body,{attributes:!0,attributeFilter:[`class`]}),window.addEventListener(`resize`,()=>{S(),Ne(),B()}),document.addEventListener(`scroll`,B,!0),window.addEventListener(`uxbridge:drawer-open`,()=>{window.requestAnimationFrame(S),window.requestAnimationFrame(vn),window.requestAnimationFrame(Tt)}),window.addEventListener(`uxbridge:preview-layout-change`,()=>{window.requestAnimationFrame(S),window.requestAnimationFrame(vn),window.requestAnimationFrame(Tt)}),En(),wn(),$()})();