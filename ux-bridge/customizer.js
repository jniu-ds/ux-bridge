function createCustomizerStore(initialState) {
  const listeners = new Set();
  let state = initialState;

  const emit = () => {
    listeners.forEach((listener) => listener(state));
  };

  const update = (updater) => {
    state = typeof updater === "function" ? updater(state) : { ...state, ...updater };
    emit();
  };

  const setAtPath = (path, value) => {
    const keys = path.split(".");

    update((currentState) => {
      const nextState = cloneStateAtPath(currentState, keys);
      let target = nextState;

      keys.slice(0, -1).forEach((key) => {
        target = target[key];
      });

      target[keys.at(-1)] = value;
      syncDerivedTrackerFields(nextState, path);
      return nextState;
    });
  };

  return {
    getState: () => state,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    update,
    setAtPath,
  };
}

function cloneStateAtPath(state, keys = []) {
  const rootClone = Array.isArray(state) ? [...state] : { ...state };
  let sourceCursor = state;
  let targetCursor = rootClone;

  keys.slice(0, -1).forEach((key) => {
    const sourceValue = sourceCursor?.[key];
    const clonedValue = Array.isArray(sourceValue) ? [...sourceValue] : { ...sourceValue };
    targetCursor[key] = clonedValue;
    sourceCursor = sourceValue;
    targetCursor = clonedValue;
  });

  return rootClone;
}

function parseNumericValue(value) {
  const normalized = String(value ?? "").replace(/[^0-9.-]/g, "");
  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

function countDecimals(value) {
  const normalized = String(value ?? "").replace(/,/g, "");

  if (!normalized.includes(".")) {
    return 0;
  }

  return normalized.split(".")[1].length;
}

function formatTrackerNumber(value, templateValue = "") {
  const decimals = countDecimals(templateValue);

  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

function calculateTrackerProgress(currentValue, targetValue) {
  const current = parseNumericValue(currentValue);
  const target = parseNumericValue(targetValue);

  if (target <= 0) {
    return 0;
  }

  return Math.max(0, Math.min(100, (current / target) * 100));
}

function syncDerivedTrackerFields(state, path) {
  const trackerMatch = path.match(/^incentives\.cards\.(\d+)\.tracker\.(current|target|progress)$/);

  if (!trackerMatch) {
    return;
  }

  const cardIndex = Number(trackerMatch[1]);
  const changedField = trackerMatch[2];
  const tracker = state?.incentives?.cards?.[cardIndex]?.tracker;

  if (!tracker) {
    return;
  }

  if (changedField === "progress") {
    const targetAmount = parseNumericValue(tracker.target);
    const nextProgress = Math.max(0, Math.min(100, Number(tracker.progress) || 0));
    const nextCurrent = (targetAmount * nextProgress) / 100;

    tracker.progress = nextProgress;
    tracker.current = formatTrackerNumber(nextCurrent, tracker.target || tracker.current);
    return;
  }

  tracker.progress = calculateTrackerProgress(tracker.current, tracker.target);
}

function isCurrencyPath(path) {
  return (
    path === "estimatedEarnings.amount" ||
    /^estimatedEarnings\.rows\.\d+\.value$/.test(path) ||
    path === "bonusBreakdown.amount"
  );
}

function normalizeCurrencyInput(value) {
  return String(value ?? "").replaceAll("$", "").trim();
}

function formatCurrencyOutput(value) {
  const normalizedValue = normalizeCurrencyInput(value);
  return normalizedValue ? `$${normalizedValue}` : "$0.00";
}

function sanitizeCustomizerState(state) {
  const nextState = structuredClone(state);

  nextState.estimatedEarnings.amount = normalizeCurrencyInput(nextState.estimatedEarnings.amount);
  nextState.estimatedEarnings.rows = nextState.estimatedEarnings.rows.map((row, index) => ({
    ...row,
    id: row.id || `estimated-row-${index + 1}`,
    value: normalizeCurrencyInput(row.value),
  }));
  nextState.bonusBreakdown.amount = normalizeCurrencyInput(nextState.bonusBreakdown.amount);
  nextState.incentives.cards = nextState.incentives.cards.map((card) => {
    const nextCard = {
      ...card,
      visible: card.visible ?? true,
    };

    if (!card.tracker) {
      return nextCard;
    }

    return {
      ...nextCard,
      tracker: {
        ...card.tracker,
        progress: calculateTrackerProgress(card.tracker.current, card.tracker.target),
        showRemaining: card.tracker.showRemaining ?? true,
      },
    };
  });

  return nextState;
}

function createCustomizerId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function createEstimatedRow() {
  return {
    id: createCustomizerId("estimated-row"),
    label: "",
    value: "0.00",
    visible: true,
    sublabel: "",
  };
}

function createIncentiveCard() {
  return {
    id: createCustomizerId("incentive-card"),
    title: "New Incentive Card",
    visible: true,
    description: "Add a description for this incentive card.",
    showDescription: true,
    tracker: {
      label: "GSV",
      current: "0",
      target: "1000",
      remaining: "1000 GSV remaining",
      progress: 0,
      visible: true,
      showRemaining: true,
    },
  };
}

const pageKey = document.body.dataset.page || "l1";
const customizerRoot = document.querySelector("[data-customizer-root]");
const drawerEnabled = !!customizerRoot;
const isDynamicProjectPage = document.body.dataset.dynamicProject === "true";
document.body.classList.toggle("bridge-body--has-customizer", drawerEnabled);
let drawerOpen = false;
const mobileSheetBackdrop = (() => {
  const existing = document.querySelector("[data-mobile-sheet-backdrop]");

  if (existing) {
    return existing;
  }

  const node = document.createElement("button");
  node.type = "button";
  node.className = "bridge-mobile-sheet-backdrop";
  node.setAttribute("data-mobile-sheet-backdrop", "");
  node.setAttribute("aria-label", "Close drawer");
  node.hidden = true;
  document.body.append(node);
  return node;
})();
const customizerUiState = {
  panels: new Set(["estimated-earnings"]),
  groups: new Set(),
};

const customizerStates = {
  l1: {
    sectionOrder: ["estimated-earnings", "incentives", "bonus-breakdown"],
    estimatedEarnings: {
      amount: "$100.50",
      label: "Earnings Breakdown",
      rows: [
        { label: "Retailing Bonus", value: "$34", visible: true, sublabel: "" },
        { label: "L1 Bonus", value: "$67", visible: true, sublabel: "5% of the CSV" },
      ],
    },
    incentives: {
      isOpen: false,
      cards: [
        {
          id: "l2-bonus",
          title: "Unlock L2 Bonus",
          description: "Reach 500 L1 SV to unlock a 5% bonus on your L2.",
          showDescription: true,
          tracker: {
            label: "L1 SV",
            current: "250",
            target: "500",
            remaining: "250 L1 SV remaining",
            progress: 50,
            visible: true,
          },
        },
        {
          id: "brand-rep",
          title: "Achieve Brand Representative",
          description: "Complete requirements to unlock.",
          showDescription: true,
          requirementsVisible: true,
          requirements: [
            { text: "Submit a Letter of Intent", linkLabel: "Letter of Intent", complete: true, visible: true },
            {
              text: "Complete BR Qualification View Tracker",
              linkLabel: "View Tracker",
              complete: false,
              visible: true,
            },
          ],
        },
        {
          id: "building-10",
          title: "Unlock 10% Building Bonus",
          description: "Reach 2,000 GSV to unlock. (Must achieve Brand Representative)",
          showDescription: true,
          tracker: {
            label: "GSV",
            current: "1,000",
            target: "2,000",
            remaining: "1,000 GSV remaining",
            progress: 50,
            visible: true,
          },
        },
        {
          id: "double-l1-l2",
          title: "Unlock Double L1 & L2 Bonus",
          description: "Reach 3,000 GSV to unlock an additional 5% on your L1 & L2 Bonuses.",
          showDescription: true,
          tracker: {
            label: "GSV",
            current: "2,500",
            target: "3,000",
            remaining: "500 GSV remaining",
            progress: 83.3333,
            visible: true,
          },
        },
        {
          id: "building-13",
          title: "Unlock 13% Building Bonus",
          description: "Reach 3,000 GSV to unlock.",
          showDescription: true,
          tracker: {
            label: "GSV",
            current: "2,500",
            target: "3,000",
            remaining: "500 GSV remaining",
            progress: 83.3333,
            visible: true,
          },
        },
      ],
    },
    bonusBreakdown: {
      title: "L1 Bonus",
      amount: "$0.00",
      rows: [{ label: "Level 1", badge: "5%", value: "520 SV", visible: true }],
    },
  },
  l1l2: {
    sectionOrder: ["estimated-earnings", "incentives", "bonus-breakdown"],
    estimatedEarnings: {
      amount: "$177.32",
      label: "Earnings Breakdown",
      rows: [
        { label: "Retailing Bonus", value: "$51", visible: true, sublabel: "" },
        { label: "L1 Bonus", value: "$87", visible: true, sublabel: "5% of the CSV" },
        { label: "L2 Bonus", value: "$39", visible: true, sublabel: "5% of the CSV" },
      ],
    },
    incentives: {
      isOpen: false,
      cards: [
        {
          id: "l2-bonus",
          title: "Unlock L2 Bonus",
          description: "Reach 500 L1 SV to unlock a 5% bonus on your L2.",
          showDescription: true,
          tracker: {
            label: "L1 SV",
            current: "250",
            target: "500",
            remaining: "250 L1 SV remaining",
            progress: 50,
            visible: true,
          },
        },
        {
          id: "brand-rep",
          title: "Achieve Brand Representative",
          description: "Complete requirements to unlock.",
          showDescription: true,
          requirementsVisible: true,
          requirements: [
            { text: "Submit a Letter of Intent", linkLabel: "Letter of Intent", complete: true, visible: true },
            {
              text: "Complete BR Qualification View Tracker",
              linkLabel: "View Tracker",
              complete: false,
              visible: true,
            },
          ],
        },
        {
          id: "building-10",
          title: "Unlock 10% Building Bonus",
          description: "Reach 2,000 GSV to unlock. (Must achieve Brand Representative)",
          showDescription: true,
          tracker: {
            label: "GSV",
            current: "1,000",
            target: "2,000",
            remaining: "1,000 GSV remaining",
            progress: 50,
            visible: true,
          },
        },
        {
          id: "double-l1-l2",
          title: "Unlock Double L1 & L2 Bonus",
          description: "Reach 3,000 GSV to unlock an additional 5% on your L1 & L2 Bonuses.",
          showDescription: true,
          tracker: {
            label: "GSV",
            current: "2,500",
            target: "3,000",
            remaining: "500 GSV remaining",
            progress: 83.3333,
            visible: true,
          },
        },
        {
          id: "building-13",
          title: "Unlock 13% Building Bonus",
          description: "Reach 3,000 GSV to unlock.",
          showDescription: true,
          tracker: {
            label: "GSV",
            current: "2,500",
            target: "3,000",
            remaining: "500 GSV remaining",
            progress: 83.3333,
            visible: true,
          },
        },
      ],
    },
    bonusBreakdown: {
      title: "L1/L2 Bonus",
      amount: "$0.00",
      rows: [
        { label: "Level 1", badge: "5%", value: "520 SV", visible: true },
        { label: "Level 2", badge: "5%", value: "50 SV", visible: true },
      ],
    },
  },
};

const store = createCustomizerStore(
  sanitizeCustomizerState(structuredClone(customizerStates[pageKey] || customizerStates.l1)),
);
window.brandAffiliateCustomizer = store;

function syncDrawerState() {
  document.body.classList.toggle("customizer-open", drawerOpen);
  customizerRoot.inert = !drawerOpen;

  const toggle = document.querySelector("[data-customizer-drawer-toggle]");

  if (toggle) {
    toggle.setAttribute("aria-expanded", drawerOpen ? "true" : "false");
    toggle.setAttribute("aria-hidden", drawerOpen ? "true" : "false");
  }

  syncMobileSheetBackdrop();
}

function syncMobileSheetBackdrop() {
  if (!mobileSheetBackdrop) {
    return;
  }

  const isMobile = window.innerWidth <= 959;
  const hasOpenDrawer =
    document.body.classList.contains("customizer-open") ||
    document.body.classList.contains("comments-open") ||
    document.body.classList.contains("uploads-open") ||
    document.body.classList.contains("vibe-open");

  const shouldShow = isMobile && hasOpenDrawer;
  mobileSheetBackdrop.hidden = !shouldShow;
  mobileSheetBackdrop.classList.toggle("is-visible", shouldShow);
}

function setDrawerOpen(nextOpen, source = "customizer") {
  if (drawerOpen === nextOpen) {
    return;
  }

  drawerOpen = nextOpen;
  syncDrawerState();

  if (drawerOpen) {
    window.dispatchEvent(
      new CustomEvent("uxbridge:drawer-open", {
        detail: { drawer: source },
      }),
    );
  }
}

function setupDrawer() {
  if (!drawerEnabled) {
    return;
  }

  const actionRail = window.UXBridgeActionRail;
  const renderToggleContent =
    actionRail?.renderButtonContent ||
    (({ label, tooltipClass = "" } = {}) => `
      <span class="bridge-action-rail-button__tooltip${tooltipClass ? ` ${tooltipClass}` : ""}" aria-hidden="true">${label || ""}</span>
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M4 7h16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"></path>
        <path d="M4 12h16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"></path>
        <path d="M4 17h16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"></path>
        <circle cx="9" cy="7" r="2.2" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"></circle>
        <circle cx="15" cy="12" r="2.2" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"></circle>
        <circle cx="11" cy="17" r="2.2" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"></circle>
      </svg>
    `);
  const sideActions = document.querySelector("[data-side-actions]");
  const toggle = document.createElement("button");
  toggle.type = "button";
  toggle.className = "bridge-action-rail-button customizer-drawer-toggle";
  toggle.setAttribute("data-customizer-drawer-toggle", "");
  toggle.setAttribute("aria-expanded", "false");
  toggle.setAttribute("aria-label", "Customize");
  toggle.innerHTML = renderToggleContent({
    icon: "customize",
    label: "Customize",
    tooltipClass: "customizer-drawer-toggle__tooltip",
  });

  toggle.addEventListener("click", () => {
    setDrawerOpen(!drawerOpen);
  });

  window.addEventListener("uxbridge:drawer-open", (event) => {
    if (event.detail?.drawer !== "customizer") {
      setDrawerOpen(false, "customizer");
    }
  });

  if (sideActions) {
    sideActions.prepend(toggle);
  } else {
    document.body.append(toggle);
  }
  syncDrawerState();
}

function renderToggle(path, label, checked) {
  return `
    <label class="customizer-toggle">
      <span>${label}</span>
      <input type="checkbox" data-path="${path}" ${checked ? "checked" : ""} />
    </label>
  `;
}

function renderTextInput(path, label, value) {
  const inputValue = isCurrencyPath(path) ? normalizeCurrencyInput(value) : value;

  return `
    <label class="customizer-field">
      <span>${label}</span>
      <input type="text" value="${String(inputValue).replaceAll('"', "&quot;")}" data-path="${path}" />
    </label>
  `;
}

function renderRangeInput(path, label, value) {
  return `
    <label class="customizer-field">
      <span>${label} <strong>${Math.round(value)}%</strong></span>
      <input type="range" min="0" max="100" step="1" value="${value}" data-path="${path}" />
    </label>
  `;
}

function renderActionButton(action, label, value = "", tone = "primary") {
  const icon =
    tone === "destructive"
      ? `
        <svg viewBox="0 0 20 20" aria-hidden="true">
          <path d="M4.5 6h11"></path>
          <path d="M8 3.5h4"></path>
          <path d="M6.5 6l.6 9.5h5.8l.6-9.5"></path>
        </svg>
      `
      : `
        <svg viewBox="0 0 20 20" aria-hidden="true">
          <path d="M10 4.5v11"></path>
          <path d="M4.5 10h11"></path>
        </svg>
      `;

  return `
    <button class="customizer-action customizer-action--${tone}" type="button" data-action="${action}" ${value ? `data-value="${value}"` : ""}>
      <span class="customizer-action__icon">${icon}</span>
      <span>${label}</span>
    </button>
  `;
}

function renderAccordion(
  type,
  key,
  title,
  content,
  summaryActions = "",
  className = "",
  extraAttributes = "",
  customDragHandle = "",
) {
  const stateBucket = type === "panel" ? customizerUiState.panels : customizerUiState.groups;
  const open = stateBucket.has(key);
  const draggable = type === "panel" ? ' data-reorderable-section="true"' : "";
  const accordionClassName = ["customizer-accordion", className].filter(Boolean).join(" ");
  const dragHandle =
    customDragHandle ||
    (type === "panel"
      ? `
        <span class="customizer-accordion__drag" draggable="true" data-drag-handle="true" aria-hidden="true">
          <svg viewBox="0 0 20 20">
            <path d="M7 5h.01M13 5h.01M7 10h.01M13 10h.01M7 15h.01M13 15h.01"></path>
          </svg>
        </span>
      `
      : "");
  return `
    <details class="${accordionClassName}" data-customizer-accordion="${type}" data-ui-key="${key}" ${draggable} ${extraAttributes} ${
      open ? "open" : ""
    }>
      <summary class="customizer-accordion__summary">
        <span class="customizer-accordion__summary-main">
          ${dragHandle}
          <span>${title}</span>
          <span class="customizer-accordion__chevron" aria-hidden="true">
            <svg viewBox="0 0 16 16">
              <path d="M3 6L8 11L13 6"></path>
            </svg>
          </span>
        </span>
        <span class="customizer-accordion__summary-actions">${summaryActions}</span>
      </summary>
      <div class="customizer-accordion__content">
        ${content}
      </div>
    </details>
  `;
}

function renderRowAccordion(rowId, index, title, visible, content) {
  const key = `estimated-row-${rowId}`;
  const open = customizerUiState.groups.has(key);

  return `
    <details
      class="customizer-accordion customizer-accordion--row"
      data-customizer-accordion="group"
      data-ui-key="${key}"
      data-reorderable-estimated-row="true"
      data-row-id="${rowId}"
      ${open ? "open" : ""}
    >
      <summary class="customizer-accordion__summary customizer-accordion__summary--row">
        <span class="customizer-accordion__summary-main">
          <span class="customizer-accordion__drag" draggable="true" data-drag-estimated-row="true" aria-hidden="true">
            <svg viewBox="0 0 20 20">
              <path d="M7 5h.01M13 5h.01M7 10h.01M13 10h.01M7 15h.01M13 15h.01"></path>
            </svg>
          </span>
          <span>${title}</span>
          <span class="customizer-accordion__chevron" aria-hidden="true">
            <svg viewBox="0 0 16 16">
              <path d="M3 6L8 11L13 6"></path>
            </svg>
          </span>
        </span>
        <span class="customizer-accordion__summary-actions">
          <label class="customizer-switch" aria-label="Show ${title}">
            <input type="checkbox" data-path="estimatedEarnings.rows.${index}.visible" ${
              visible ? "checked" : ""
            } />
            <span class="customizer-switch__track" aria-hidden="true">
              <span class="customizer-switch__thumb"></span>
            </span>
          </label>
        </span>
      </summary>
      <div class="customizer-accordion__content">
        ${content}
        <div class="customizer-accordion__footer">
          ${renderActionButton("remove-estimated-row", "Remove", rowId, "destructive")}
        </div>
      </div>
    </details>
  `;
}

function renderCustomizer(state) {
  if (!customizerRoot) {
    return;
  }

  if (isDynamicProjectPage) {
    customizerRoot.innerHTML = `
      <div class="customizer-panel__inner customizer-panel__inner--empty">
        <div class="customizer-panel__header">
          <div class="customizer-panel__header-copy">
            <p class="customizer-panel__eyebrow">Customizer</p>
            <h2>Page Controls</h2>
            <p>This page does not have configurable content yet. Use Create with Codex to start building this screen.</p>
          </div>
          <button class="customizer-panel__close" type="button" data-customizer-close aria-label="Close customizer">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M6 6L18 18"></path>
              <path d="M18 6L6 18"></path>
            </svg>
          </button>
        </div>
        <section class="customizer-empty-state">
          <p class="customizer-empty-state__eyebrow">Nothing to customize yet</p>
          <h3>Start with Codex</h3>
          <p>Once this page has real components, live controls will show up here automatically.</p>
        </section>
      </div>
    `;

    customizerRoot.querySelector("[data-customizer-close]")?.addEventListener("click", () => {
      setDrawerOpen(false);
    });

    return;
  }

  const activeElement = document.activeElement;
  const activePath = activeElement?.dataset?.path || "";
  const activeValue = activeElement?.value;
  const selectionStart =
    typeof activeElement?.selectionStart === "number" ? activeElement.selectionStart : null;
  const selectionEnd =
    typeof activeElement?.selectionEnd === "number" ? activeElement.selectionEnd : null;
  const scrollContainer = customizerRoot;
  const previousScrollTop = scrollContainer.scrollTop;

  customizerRoot.innerHTML = `
    <div class="customizer-panel__inner">
      <div class="customizer-panel__header">
        <div class="customizer-panel__header-copy">
          <p class="customizer-panel__eyebrow">Customizer</p>
          <h2>Live Card Controls</h2>
          <p>Compact controls for quick edits and toggles.</p>
        </div>
        <button class="customizer-panel__close" type="button" data-customizer-close aria-label="Close customizer">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M6 6L18 18"></path>
            <path d="M18 6L6 18"></path>
          </svg>
        </button>
      </div>

      ${renderAccordion(
        "panel",
        "estimated-earnings",
        "Estimated Earnings",
        `
          <section class="customizer-section customizer-section--flat">
            <div class="customizer-fields-grid customizer-fields-grid--two">
              ${renderTextInput("estimatedEarnings.amount", "Amount", state.estimatedEarnings.amount)}
              ${renderTextInput("estimatedEarnings.label", "Disclosure label", state.estimatedEarnings.label)}
            </div>
            ${state.estimatedEarnings.rows
              .map((row, index) =>
                renderRowAccordion(
                  row.id,
                  index,
                  row.label?.trim() || `Row ${index + 1}`,
                  row.visible,
                  `
                    <div class="customizer-subsection">
                      <div class="customizer-fields-grid customizer-fields-grid--two">
                        ${renderTextInput(`estimatedEarnings.rows.${index}.label`, "Label", row.label)}
                        ${renderTextInput(`estimatedEarnings.rows.${index}.value`, "Value", row.value)}
                      </div>
                      ${renderTextInput(`estimatedEarnings.rows.${index}.sublabel`, "Sublabel", row.sublabel)}
                    </div>
                  `,
                ),
              )
              .join("")}
            <div class="customizer-section__actions">
              ${renderActionButton("add-estimated-row", "Add Row")}
            </div>
          </section>
        `,
      )}

      ${renderAccordion(
        "panel",
        "incentives",
        "Incentive Cards",
        `
          <section class="customizer-section customizer-section--flat">
            ${state.incentives.cards
              .map((card, index) => {
                const trackerFields = card.tracker
                  ? `
                      <div class="customizer-subsection__header">
                        <span class="customizer-subsection__label">Tracker</span>
                        <label class="customizer-switch" aria-label="Show tracker">
                          <input type="checkbox" data-path="incentives.cards.${index}.tracker.visible" ${
                            card.tracker.visible ? "checked" : ""
                          } />
                          <span class="customizer-switch__track" aria-hidden="true">
                            <span class="customizer-switch__thumb"></span>
                          </span>
                        </label>
                      </div>
                      ${renderTextInput(
                        `incentives.cards.${index}.tracker.label`,
                        "Tracker title",
                        card.tracker.label,
                      )}
                      <div class="customizer-fields-grid customizer-fields-grid--two">
                        ${renderTextInput(`incentives.cards.${index}.tracker.current`, "Current", card.tracker.current)}
                        ${renderTextInput(`incentives.cards.${index}.tracker.target`, "Target", card.tracker.target)}
                      </div>
                      ${renderRangeInput(
                        `incentives.cards.${index}.tracker.progress`,
                        "Progress",
                        card.tracker.progress,
                      )}
                      ${renderToggle(
                        `incentives.cards.${index}.tracker.showRemaining`,
                        "Show remaining",
                        card.tracker.showRemaining ?? true,
                      )}
                    `
                  : `
                      ${renderToggle(
                        `incentives.cards.${index}.requirementsVisible`,
                        "Show requirements",
                        card.requirementsVisible,
                      )}
                      ${card.requirements
                        .map(
                          (requirement, reqIndex) => `
                            <div class="customizer-nested">
                              <h5>Requirement ${reqIndex + 1}</h5>
                              <div class="customizer-fields-grid customizer-fields-grid--two">
                                ${renderToggle(
                                  `incentives.cards.${index}.requirements.${reqIndex}.visible`,
                                  "Show requirement",
                                  requirement.visible,
                                )}
                                ${renderToggle(
                                  `incentives.cards.${index}.requirements.${reqIndex}.complete`,
                                  "Completed",
                                  requirement.complete,
                                )}
                              </div>
                              ${renderTextInput(
                                `incentives.cards.${index}.requirements.${reqIndex}.text`,
                                "Text",
                                requirement.text,
                              )}
                              ${renderTextInput(
                                `incentives.cards.${index}.requirements.${reqIndex}.linkLabel`,
                                "Link label",
                                requirement.linkLabel,
                              )}
                            </div>
                          `,
                        )
                        .join("")}
                    `;

                return renderAccordion(
                  "group",
                  `incentive-card-${index}`,
                  card.title,
                  `
                    <div class="customizer-subsection customizer-subsection--flat">
                      ${renderTextInput(`incentives.cards.${index}.title`, "Title", card.title)}
                      ${renderTextInput(`incentives.cards.${index}.description`, "Description", card.description)}
                      ${card.tracker ? `<div class="customizer-subsection__divider" aria-hidden="true"></div>` : ""}
                      ${trackerFields}
                    </div>
                    <div class="customizer-accordion__footer">
                      ${renderActionButton("remove-incentive-card", "Remove", card.id, "destructive")}
                    </div>
                  `,
                  `
                    <label class="customizer-switch" aria-label="Show card">
                      <input type="checkbox" data-path="incentives.cards.${index}.visible" ${
                        card.visible !== false ? "checked" : ""
                      } />
                      <span class="customizer-switch__track" aria-hidden="true">
                        <span class="customizer-switch__thumb"></span>
                      </span>
                    </label>
                  `
                  ,
                  "",
                  `data-reorderable-incentive-card="true" data-card-id="${card.id}"`,
                  `
                    <span class="customizer-accordion__drag" draggable="true" data-drag-incentive-card="true" aria-hidden="true">
                      <svg viewBox="0 0 20 20">
                        <path d="M7 5h.01M13 5h.01M7 10h.01M13 10h.01M7 15h.01M13 15h.01"></path>
                      </svg>
                    </span>
                  `,
                );
              })
              .join("")}
            <div class="customizer-section__actions">
              ${renderActionButton("add-incentive-card", "Add Incentive Card")}
            </div>
          </section>
        `,
      )}

      ${renderAccordion(
        "panel",
        "bonus-breakdown",
        "Bonus Breakdown",
        `
          <section class="customizer-section customizer-section--flat">
            <div class="customizer-fields-grid customizer-fields-grid--two">
              ${renderTextInput("bonusBreakdown.title", "Card title", state.bonusBreakdown.title)}
              ${renderTextInput("bonusBreakdown.amount", "Amount", state.bonusBreakdown.amount)}
            </div>
            ${state.bonusBreakdown.rows
              .map((row, index) =>
                renderAccordion(
                  "group",
                  `bonus-row-${index}`,
                  `Level ${index + 1}`,
                  `
                    <div class="customizer-subsection">
                      <div class="customizer-fields-grid customizer-fields-grid--two">
                        ${renderToggle(`bonusBreakdown.rows.${index}.visible`, "Show row", row.visible)}
                        ${renderTextInput(`bonusBreakdown.rows.${index}.badge`, "Badge", row.badge)}
                      </div>
                      <div class="customizer-fields-grid customizer-fields-grid--two">
                        ${renderTextInput(`bonusBreakdown.rows.${index}.label`, "Label", row.label)}
                        ${renderTextInput(`bonusBreakdown.rows.${index}.value`, "Value", row.value)}
                      </div>
                    </div>
                  `,
                ),
              )
              .join("")}
          </section>
        `,
      )}
    </div>
  `;

  customizerRoot.querySelectorAll("input[data-path]").forEach((input) => {
    const handler = input.type === "checkbox" || input.type === "range" ? "change" : "input";
    input.addEventListener(handler, (event) => {
      if (input.closest(".customizer-switch")) {
        event.stopPropagation();
      }

      const { path } = event.target.dataset;
      const value =
        input.type === "checkbox"
          ? input.checked
          : input.type === "range"
            ? Number(input.value)
            : isCurrencyPath(path)
              ? normalizeCurrencyInput(input.value)
              : input.value;

      store.setAtPath(path, value);
    });
  });

  customizerRoot.querySelector("[data-customizer-close]")?.addEventListener("click", () => {
    setDrawerOpen(false);
  });

  customizerRoot.querySelectorAll("[data-action]").forEach((button) => {
    button.addEventListener("click", () => {
      const { action, value } = button.dataset;

      if (action === "add-estimated-row") {
        const newRow = createEstimatedRow();
        customizerUiState.groups.add(`estimated-row-${newRow.id}`);
        store.update((currentState) => ({
          ...currentState,
          estimatedEarnings: {
            ...currentState.estimatedEarnings,
            rows: [...currentState.estimatedEarnings.rows, newRow],
          },
        }));
        return;
      }

      if (action === "remove-estimated-row") {
        customizerUiState.groups.delete(`estimated-row-${value}`);
        store.update((currentState) => ({
          ...currentState,
          estimatedEarnings: {
            ...currentState.estimatedEarnings,
            rows: currentState.estimatedEarnings.rows.filter((row) => row.id !== value),
          },
        }));
        return;
      }

      if (action === "add-incentive-card") {
        store.update((currentState) => ({
          ...currentState,
          incentives: {
            ...currentState.incentives,
            cards: [...currentState.incentives.cards, createIncentiveCard()],
          },
        }));
        return;
      }

      if (action === "remove-incentive-card") {
        store.update((currentState) => ({
          ...currentState,
          incentives: {
            ...currentState.incentives,
            cards: currentState.incentives.cards.filter((card) => card.id !== value),
          },
        }));
      }
    });
  });

  customizerRoot.querySelectorAll("[data-customizer-accordion]").forEach((accordion) => {
    accordion.querySelectorAll(".customizer-switch").forEach((toggleLabel) => {
      toggleLabel.addEventListener("click", (event) => {
        event.stopPropagation();
      });
    });

    accordion.querySelectorAll(".customizer-switch input").forEach((toggle) => {
      toggle.addEventListener("click", (event) => {
        event.stopPropagation();
      });
    });
  });

  let draggedKey = null;
  let draggedEstimatedRowId = null;
  let draggedIncentiveCardId = null;

  customizerRoot.querySelectorAll('[data-reorderable-section="true"]').forEach((section) => {
    const dragHandle = section.querySelector('[data-drag-handle="true"]');

    dragHandle?.addEventListener("dragstart", (event) => {
      draggedKey = section.dataset.uiKey;
      section.classList.add("is-dragging");
      event.dataTransfer.effectAllowed = "move";
      event.dataTransfer.setData("text/plain", draggedKey);
    });

    section.addEventListener("dragover", (event) => {
      if (!draggedKey || draggedKey === section.dataset.uiKey) {
        return;
      }

      event.preventDefault();
      section.classList.add("is-drag-target");
      event.dataTransfer.dropEffect = "move";
    });

    section.addEventListener("dragleave", () => {
      section.classList.remove("is-drag-target");
    });

    section.addEventListener("drop", (event) => {
      event.preventDefault();
      section.classList.remove("is-drag-target");

      const targetKey = section.dataset.uiKey;

      if (!draggedKey || draggedKey === targetKey) {
        return;
      }

      store.update((currentState) => {
        const nextOrder = [...currentState.sectionOrder];
        const fromIndex = nextOrder.indexOf(draggedKey);
        const toIndex = nextOrder.indexOf(targetKey);

        if (fromIndex === -1 || toIndex === -1) {
          return currentState;
        }

        const [movedItem] = nextOrder.splice(fromIndex, 1);
        nextOrder.splice(toIndex, 0, movedItem);

        return {
          ...currentState,
          sectionOrder: nextOrder,
        };
      });
    });

    section.addEventListener("dragend", () => {
      draggedKey = null;
      customizerRoot
        .querySelectorAll(".is-dragging, .is-drag-target")
        .forEach((node) => node.classList.remove("is-dragging", "is-drag-target"));
    });
  });

  customizerRoot.querySelectorAll('[data-reorderable-estimated-row="true"]').forEach((rowNode) => {
    const rowHandle = rowNode.querySelector('[data-drag-estimated-row="true"]');

    rowHandle?.addEventListener("dragstart", (event) => {
      draggedEstimatedRowId = rowNode.dataset.rowId;
      rowNode.classList.add("is-dragging");
      event.dataTransfer.effectAllowed = "move";
      event.dataTransfer.setData("text/plain", draggedEstimatedRowId);
    });

    rowNode.addEventListener("dragover", (event) => {
      if (!draggedEstimatedRowId || draggedEstimatedRowId === rowNode.dataset.rowId) {
        return;
      }

      event.preventDefault();
      rowNode.classList.add("is-drag-target");
      event.dataTransfer.dropEffect = "move";
    });

    rowNode.addEventListener("dragleave", () => {
      rowNode.classList.remove("is-drag-target");
    });

    rowNode.addEventListener("drop", (event) => {
      event.preventDefault();
      rowNode.classList.remove("is-drag-target");

      const targetRowId = rowNode.dataset.rowId;

      if (!draggedEstimatedRowId || draggedEstimatedRowId === targetRowId) {
        return;
      }

      store.update((currentState) => {
        const nextRows = [...currentState.estimatedEarnings.rows];
        const fromIndex = nextRows.findIndex((row) => row.id === draggedEstimatedRowId);
        const toIndex = nextRows.findIndex((row) => row.id === targetRowId);

        if (fromIndex === -1 || toIndex === -1) {
          return currentState;
        }

        const [movedRow] = nextRows.splice(fromIndex, 1);
        nextRows.splice(toIndex, 0, movedRow);

        return {
          ...currentState,
          estimatedEarnings: {
            ...currentState.estimatedEarnings,
            rows: nextRows,
          },
        };
      });
    });

    rowNode.addEventListener("dragend", () => {
      draggedEstimatedRowId = null;
      customizerRoot
        .querySelectorAll(".is-dragging, .is-drag-target")
        .forEach((node) => node.classList.remove("is-dragging", "is-drag-target"));
    });
  });

  customizerRoot.querySelectorAll('[data-reorderable-incentive-card="true"]').forEach((cardNode) => {
    const cardHandle = cardNode.querySelector('[data-drag-incentive-card="true"]');

    cardHandle?.addEventListener("dragstart", (event) => {
      draggedIncentiveCardId = cardNode.dataset.cardId;
      cardNode.classList.add("is-dragging");
      event.dataTransfer.effectAllowed = "move";
      event.dataTransfer.setData("text/plain", draggedIncentiveCardId);
    });

    cardNode.addEventListener("dragover", (event) => {
      if (!draggedIncentiveCardId || draggedIncentiveCardId === cardNode.dataset.cardId) {
        return;
      }

      event.preventDefault();
      cardNode.classList.add("is-drag-target");
      event.dataTransfer.dropEffect = "move";
    });

    cardNode.addEventListener("dragleave", () => {
      cardNode.classList.remove("is-drag-target");
    });

    cardNode.addEventListener("drop", (event) => {
      event.preventDefault();
      cardNode.classList.remove("is-drag-target");

      const targetCardId = cardNode.dataset.cardId;

      if (!draggedIncentiveCardId || draggedIncentiveCardId === targetCardId) {
        return;
      }

      store.update((currentState) => {
        const nextCards = [...currentState.incentives.cards];
        const fromIndex = nextCards.findIndex((card) => card.id === draggedIncentiveCardId);
        const toIndex = nextCards.findIndex((card) => card.id === targetCardId);

        if (fromIndex === -1 || toIndex === -1) {
          return currentState;
        }

        const [movedCard] = nextCards.splice(fromIndex, 1);
        nextCards.splice(toIndex, 0, movedCard);

        return {
          ...currentState,
          incentives: {
            ...currentState.incentives,
            cards: nextCards,
          },
        };
      });
    });

    cardNode.addEventListener("dragend", () => {
      draggedIncentiveCardId = null;
      customizerRoot
        .querySelectorAll(".is-dragging, .is-drag-target")
        .forEach((node) => node.classList.remove("is-dragging", "is-drag-target"));
    });
  });

  scrollContainer.scrollTop = previousScrollTop;
  initializeAnimatedAccordions();

  requestAnimationFrame(() => {
    scrollContainer.scrollTop = previousScrollTop;

    if (activePath) {
      const nextActiveElement = customizerRoot.querySelector(`[data-path="${activePath}"]`);

      if (nextActiveElement) {
        nextActiveElement.focus({ preventScroll: true });

        if (
          nextActiveElement.type !== "checkbox" &&
          nextActiveElement.type !== "range" &&
          nextActiveElement.value === activeValue &&
          selectionStart !== null &&
          selectionEnd !== null
        ) {
          nextActiveElement.setSelectionRange(selectionStart, selectionEnd);
        }
      }
    }
  });
}

function initializeAnimatedAccordions() {
  customizerRoot.querySelectorAll("[data-customizer-accordion]").forEach((accordion) => {
    const summary = accordion.querySelector(".customizer-accordion__summary");
    const content = accordion.querySelector(".customizer-accordion__content");

    if (!summary || !content) {
      return;
    }

    accordion.classList.toggle("is-open", accordion.open);
    syncAccordionChevron(accordion, accordion.open);
    content.style.height = accordion.open ? "auto" : "0px";

    summary.addEventListener("click", (event) => {
      if (
        event.target.closest(".customizer-switch") ||
        event.target.closest("[data-drag-handle]") ||
        event.target.closest("[data-drag-estimated-row]") ||
        event.target.closest("[data-drag-incentive-card]")
      ) {
        event.preventDefault();
        return;
      }

      event.preventDefault();

      if (accordion.dataset.animating === "true") {
        return;
      }

      const shouldOpen = !accordion.open;
      const type = accordion.dataset.customizerAccordion;
      const key = accordion.dataset.uiKey;
      const stateBucket = type === "panel" ? customizerUiState.panels : customizerUiState.groups;

      if (shouldOpen) {
        stateBucket.add(key);
      } else {
        stateBucket.delete(key);
      }

      animateAccordion(accordion, shouldOpen);
    });
  });
}

function syncAccordionChevron(accordion, isOpen) {
  accordion
    .querySelectorAll(".customizer-accordion__chevron")
    .forEach((chevron) => {
      chevron.style.transform = isOpen ? "rotate(180deg)" : "rotate(0deg)";
    });
}

function animateAccordion(accordion, shouldOpen) {
  const content = accordion.querySelector(".customizer-accordion__content");

  if (!content) {
    return;
  }

  const finish = () => {
    accordion.dataset.animating = "false";
    accordion.classList.remove("is-animating");

    if (shouldOpen) {
      accordion.open = true;
      accordion.classList.add("is-open");
      syncAccordionChevron(accordion, true);
      content.style.height = "auto";
    } else {
      accordion.open = false;
      accordion.classList.remove("is-open");
      syncAccordionChevron(accordion, false);
      content.style.height = "0px";
    }
  };

  accordion.dataset.animating = "true";
  accordion.classList.add("is-animating");
  content.getAnimations?.().forEach((animation) => animation.cancel());

  if (shouldOpen) {
    accordion.open = true;
    accordion.classList.add("is-open");
    syncAccordionChevron(accordion, true);
    content.style.height = "0px";

    requestAnimationFrame(() => {
      const targetHeight = content.scrollHeight;
      content.style.height = `${targetHeight}px`;
    });
  } else {
    accordion.classList.remove("is-open");
    syncAccordionChevron(accordion, false);
    const currentHeight = content.scrollHeight;
    content.style.height = `${currentHeight}px`;

    requestAnimationFrame(() => {
      content.style.height = "0px";
    });
  }

  const handleTransitionEnd = (event) => {
    if (event.target !== content || event.propertyName !== "height") {
      return;
    }

    content.removeEventListener("transitionend", handleTransitionEnd);
    finish();
  };

  content.addEventListener("transitionend", handleTransitionEnd);
}

function updateMobileSectionOrder(state) {
  const container = document.querySelector(".l1-content");

  if (!container || !Array.isArray(state.sectionOrder)) {
    return;
  }

  container.querySelectorAll("[data-section-key]").forEach((section) => {
    section.hidden = false;
  });

  state.sectionOrder.forEach((key) => {
    const section = container.querySelector(`[data-section-key="${key}"]`);

    if (section) {
      container.append(section);
    }
  });
}

function updateBonusBreakdown(state) {
  const title = document.querySelector(".bonus-card__title");
  const amount = document.querySelector(".bonus-card__amount");
  const rowsContainer = document.querySelector(".bonus-card__rows");

  if (!title || !amount || !rowsContainer) {
    return;
  }

  title.textContent = state.bonusBreakdown.title;
  amount.textContent = formatCurrencyOutput(state.bonusBreakdown.amount);
  rowsContainer.classList.toggle("bonus-card__rows--dual", state.bonusBreakdown.rows.filter((row) => row.visible).length > 1);
  rowsContainer.innerHTML = state.bonusBreakdown.rows
    .filter((row) => row.visible)
    .map(
      (row) => `
        <div class="bonus-row">
          <div class="bonus-row__left">
            <span class="bonus-row__label">${row.label}</span>
            <span class="bonus-badge">${row.badge}</span>
          </div>
          <span class="bonus-row__value">${row.value}</span>
        </div>
      `,
    )
    .join("");
}

store.subscribe((state) => {
  renderCustomizer(state);
  updateBonusBreakdown(state);
  updateMobileSectionOrder(state);
});

renderCustomizer(store.getState());
updateBonusBreakdown(store.getState());
updateMobileSectionOrder(store.getState());
setupDrawer();
mobileSheetBackdrop?.addEventListener("click", () => {
  if (drawerOpen) {
    setDrawerOpen(false);
  }
});
window.addEventListener("resize", syncMobileSheetBackdrop);
