(function initActionRailIcons() {
  const outlineAttrs = 'fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"';
  const iconMarkup = Object.freeze({
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
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 3.6 14.72 9.11l6.08.88-4.4 4.29 1.04 6.06L12 17.48l-5.44 2.86 1.04-6.06-4.4-4.29 6.08-.88Z" ${outlineAttrs}></path>
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
