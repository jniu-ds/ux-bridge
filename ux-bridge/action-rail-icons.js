(function initActionRailIcons() {
  const outlineAttrs = 'fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"';
  const iconMarkup = Object.freeze({
    inspect: `
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M8 3.75H5.75A2 2 0 0 0 3.75 5.75V8" ${outlineAttrs}></path>
        <path d="M16 3.75h2.25a2 2 0 0 1 2 2V8" ${outlineAttrs}></path>
        <path d="M20.25 16v2.25a2 2 0 0 1-2 2H16" ${outlineAttrs}></path>
        <path d="M8 20.25H5.75a2 2 0 0 1-2-2V16" ${outlineAttrs}></path>
        <rect x="8.25" y="8.25" width="7.5" height="7.5" rx="1.5" ${outlineAttrs}></rect>
      </svg>
    `,
    customize: `
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M4 7h16" ${outlineAttrs}></path>
        <path d="M4 12h16" ${outlineAttrs}></path>
        <path d="M4 17h16" ${outlineAttrs}></path>
        <circle cx="9" cy="7" r="2.2" ${outlineAttrs}></circle>
        <circle cx="15" cy="12" r="2.2" ${outlineAttrs}></circle>
        <circle cx="11" cy="17" r="2.2" ${outlineAttrs}></circle>
      </svg>
    `,
    vibe: `
      <svg viewBox="0 0 24 24" aria-hidden="true" class="bridge-action-rail-icon--vibe">
        <g transform="translate(-1.5 0)">
          <path d="M12 4.5 13.95 8.55 18 10.5l-4.05 1.95L12 16.5l-1.95-4.05L6 10.5l4.05-1.95Z"></path>
          <path d="M18.5 3.5l.6 1.4 1.4.6-1.4.6-.6 1.4-.6-1.4-1.4-.6 1.4-.6Z"></path>
          <path d="M17.5 15.5l.8 1.9 1.9.8-1.9.8-.8 1.9-.8-1.9-1.9-.8 1.9-.8Z"></path>
        </g>
      </svg>
    `,
    comments: `
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M5 6.5c0-1.38 1.12-2.5 2.5-2.5h9c1.38 0 2.5 1.12 2.5 2.5v7c0 1.38-1.12 2.5-2.5 2.5H10l-4.5 4v-4H7.5C6.12 16 5 14.88 5 13.5Z" ${outlineAttrs}></path>
        <path d="M8 8.75h8" ${outlineAttrs}></path>
        <path d="M8 12h5.5" ${outlineAttrs}></path>
      </svg>
    `,
    files: `
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M15.5 6.5 8.38 13.62a3 3 0 0 0 4.24 4.24l8.13-8.13a4.5 4.5 0 0 0-6.36-6.36L6.26 11.5a6 6 0 1 0 8.49 8.49l6.36-6.36" ${outlineAttrs}></path>
      </svg>
    `,
  });

  window.UXBridgeActionRail = Object.freeze({
    icons: iconMarkup,
    renderIcon(name) {
      return iconMarkup[name] || "";
    },
    renderButtonContent({ icon, label, tooltipClass = "", trailingMarkup = "" } = {}) {
      const tooltipClassName = tooltipClass ? ` ${tooltipClass}` : "";
      return `
        <span class="bridge-action-rail-button__tooltip${tooltipClassName}" aria-hidden="true">${label || ""}</span>
        ${iconMarkup[icon] || ""}
        ${trailingMarkup || ""}
      `;
    },
  });
})();
