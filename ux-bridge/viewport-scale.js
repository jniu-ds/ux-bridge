const DEFAULT_PREVIEW_WIDTH = 375;
const DEFAULT_PREVIEW_HEIGHT = 812;
const FALLBACK_VERTICAL_PADDING = 40;
const FALLBACK_HORIZONTAL_PADDING = 28;
const FIT_BOTTOM_GUTTER = 20;
const SCALE_MODE_KEY = "ux-bridge-preview-scale-mode";
const MIN_CUSTOM_SCALE = 0.2;
const MAX_CUSTOM_SCALE = 3;
const CUSTOM_SCALE_STEP = 0.05;
const LANE_CENTERED_SCALE_MODES = new Set(["fit", "0.25", "0.5", "0.75", "1", "2"]);
let scheduledFrame = 0;
let pendingScaleAnchor = null;

function getScaleSelect() {
  return document.querySelector("[data-preview-scale]");
}

function getScaleTrigger() {
  return document.querySelector("[data-preview-scale-trigger]");
}

function getScaleMenu() {
  return document.querySelector("[data-preview-scale-menu]");
}

function getScaleOptions() {
  return Array.from(document.querySelectorAll("[data-preview-scale-option]"));
}

function getScaleLabel() {
  return document.querySelector("[data-preview-scale-label]");
}

function getScaleSubtext() {
  return document.querySelector("[data-preview-scale-subtext]");
}

function getScaleSection() {
  return document.querySelector(".preview-scale-menu__section--scales");
}

function getAppShell() {
  return document.querySelector(".app-shell");
}

function getPreviewShell() {
  return document.querySelector(".bridge-preview-shell");
}

function getPreviewZoomFrame() {
  return document.querySelector(".phone-frame-wrap") || getPreviewShell();
}

function getCurrentPreviewViewportPreset() {
  const mobilePage = document.querySelector(".mobile-page");
  const preset =
    String(mobilePage?.dataset.previewViewport || "").trim().toLowerCase() ||
    String(getScaleTrigger()?.dataset.previewViewport || "").trim().toLowerCase();
  return preset || "mobile";
}

function isResponsiveViewportMode() {
  return getCurrentPreviewViewportPreset() === "responsive";
}

function isPreviewZoomChromeTarget(target) {
  if (!(target instanceof Element)) {
    return false;
  }

  return Boolean(
    target.closest(
      [
        ".bridge-project-toolbar",
        ".project-page-strip",
        "[data-project-page-strip]",
        ".project-page-strip__pages",
        "[data-project-nav-pages]",
        "[data-live-page-thumbnail]",
        "[data-layer-link-live-thumbnail]",
        ".bridge-project-side-actions",
        ".preview-scale-menu",
        ".preview-scale-trigger",
        ".inspector-panel",
        ".comments-panel",
        ".uploads-panel",
        ".vibe-panel",
        ".customizer-panel",
        ".asset-viewer",
      ].join(", "),
    ),
  );
}

function isTypingTarget(target) {
  if (!(target instanceof Element)) {
    return false;
  }

  return Boolean(target.closest("input, textarea, select, [contenteditable='true'], [contenteditable='']"));
}

function getPreviewDimensionVar(name, fallback) {
  const value = window
    .getComputedStyle(document.documentElement)
    .getPropertyValue(name)
    .trim()
    .replace(/px$/i, "");
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function getCurrentPreviewDimensions() {
  return {
    width: getPreviewDimensionVar("--preview-device-width", DEFAULT_PREVIEW_WIDTH),
    height: getPreviewDimensionVar("--preview-device-height", DEFAULT_PREVIEW_HEIGHT),
  };
}

function getPreviewHeaderHeight() {
  if (isResponsiveViewportMode()) {
    return 0;
  }

  const previewShell = getPreviewShell();

  if (previewShell instanceof HTMLElement) {
    const shellStyles = window.getComputedStyle(previewShell);
    const parsed = Number.parseFloat(shellStyles.getPropertyValue("--bridge-preview-header-height"));
    if (Number.isFinite(parsed) && parsed >= 0) {
      return parsed;
    }
  }

  return 0;
}

function getOpenDrawerRect() {
  const body = document.body;
  if (!(body instanceof HTMLElement)) {
    return null;
  }

  const candidates = [
    ["inspector-open", ".inspector-panel"],
    ["vibe-open", ".vibe-panel"],
    ["comments-open", ".comments-panel"],
    ["uploads-open", ".uploads-panel"],
    ["customizer-open", ".customizer-panel"],
  ];

  for (const [className, selector] of candidates) {
    if (!body.classList.contains(className)) {
      continue;
    }
    const panel = document.querySelector(selector);
    if (!(panel instanceof HTMLElement)) {
      continue;
    }
    const rect = panel.getBoundingClientRect();
    if (rect.width > 0.5) {
      return rect;
    }
  }

  return null;
}

function getOpenDrawerWidth() {
  return getOpenDrawerRect()?.width || 0;
}

function getRightChromeLeft() {
  const candidates = [];
  const drawerRect = getOpenDrawerRect();
  if (drawerRect) {
    candidates.push(drawerRect.left);
  }
  const sideActions = document.querySelector(".bridge-project-side-actions");
  if (sideActions instanceof HTMLElement) {
    const styles = window.getComputedStyle(sideActions);
    if (styles.display !== "none" && styles.visibility !== "hidden") {
      const rect = sideActions.getBoundingClientRect();
      if (rect.width > 0.5) {
        candidates.push(rect.left);
      }
    }
  }
  return candidates.length ? Math.min(...candidates) : null;
}

function getFitLaneOffsetX(scale) {
  if (!Number.isFinite(scale) || scale <= 0) {
    return 0;
  }

  const appShell = getAppShell();
  const previewShell = getPreviewShell();
  const pageStrip = document.querySelector(".project-page-strip");
  if (!(appShell instanceof HTMLElement) || !(previewShell instanceof HTMLElement)) {
    return 0;
  }

  const appShellRect = appShell.getBoundingClientRect();
  const shellStyles = window.getComputedStyle(appShell);
  const shellPaddingLeft = Number.parseFloat(shellStyles.paddingLeft) || 0;
  const shellPaddingRight = Number.parseFloat(shellStyles.paddingRight) || 0;
  const stripRect =
    pageStrip instanceof HTMLElement && window.getComputedStyle(pageStrip).display !== "none"
      ? pageStrip.getBoundingClientRect()
      : null;
  const previewShellRect = previewShell.getBoundingClientRect();
  const visibleLeft = stripRect ? stripRect.right : appShellRect.left + shellPaddingLeft;
  const rightChromeLeft = getRightChromeLeft();
  const visibleRight = rightChromeLeft ?? appShellRect.right - shellPaddingRight;
  const visibleCenter = visibleLeft + Math.max(0, visibleRight - visibleLeft) / 2;
  const computedLeft = Number.parseFloat(window.getComputedStyle(previewShell).left) || 0;
  const baseCenter = previewShellRect.left + previewShellRect.width / 2 - computedLeft;

  return Math.round(visibleCenter - baseCenter);
}

function sizeScaleMenu(menu, options) {
  if (!menu || !options.length) {
    return;
  }

  menu.style.removeProperty("width");
}

function positionScaleMenu() {
  const trigger = getScaleTrigger();
  const menu = getScaleMenu();

  if (!(trigger instanceof HTMLElement) || !(menu instanceof HTMLElement) || menu.hidden) {
    return;
  }

  const previousVisibility = menu.style.visibility;
  const previousPointerEvents = menu.style.pointerEvents;

  menu.style.visibility = "hidden";
  menu.style.pointerEvents = "none";
  const triggerRect = trigger.getBoundingClientRect();
  const menuRect = menu.getBoundingClientRect();
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const margin = 12;
  const gap = 8;

  const left = Math.max(
    margin,
    Math.min(triggerRect.right - menuRect.width, viewportWidth - menuRect.width - margin),
  );
  const top = Math.max(
    margin,
    Math.min(triggerRect.bottom + gap, viewportHeight - menuRect.height - margin),
  );

  menu.style.position = "fixed";
  menu.style.left = `${Math.round(left)}px`;
  menu.style.top = `${Math.round(top)}px`;
  menu.style.right = "auto";
  menu.style.visibility = previousVisibility;
  menu.style.pointerEvents = previousPointerEvents;
}

function syncScaleLabel(select) {
  const label = getScaleLabel();
  const subtext = getScaleSubtext();

  if (!label || !select) {
    return;
  }

  if (isResponsiveViewportMode()) {
    const { width, height } = getCurrentPreviewDimensions();
    label.textContent = "Responsive";
    if (subtext) {
      subtext.textContent = `(${Math.round(width)}x${Math.round(height)})`;
      subtext.hidden = false;
    }
    return;
  }

  const selectedOption = getScaleOptions().find(
    (option) => option.dataset.previewScaleOption === select.dataset.value,
  );
  if (selectedOption) {
    const triggerLabel = String(selectedOption.dataset.previewScaleTriggerLabel || "").trim();
    const triggerSubtext = String(selectedOption.dataset.previewScaleTriggerSubtext || "").trim();
    label.textContent = triggerLabel || selectedOption.textContent || "";
    if (subtext) {
      subtext.textContent = triggerSubtext;
      subtext.hidden = !triggerSubtext;
    }
    return;
  }

  const parsed = Number.parseFloat(select.dataset.value || "");
  label.textContent = Number.isFinite(parsed) && parsed > 0 ? `${Math.round(parsed * 100)}%` : "Fit";
  if (subtext) {
    subtext.textContent = "";
    subtext.hidden = true;
  }
}

function getStoredScaleMode() {
  try {
    return window.sessionStorage.getItem(SCALE_MODE_KEY) || "fit";
  } catch {
    return "fit";
  }
}

function setStoredScaleMode(mode) {
  try {
    window.sessionStorage.setItem(SCALE_MODE_KEY, mode);
  } catch {
    // Ignore storage failures.
  }
}

function parseScaleMode(mode, fitScale = getFitScale()) {
  if (mode === "fit") {
    return fitScale;
  }

  const parsed = Number.parseFloat(mode);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fitScale;
}

function clampCustomScale(scale) {
  return Math.min(MAX_CUSTOM_SCALE, Math.max(MIN_CUSTOM_SCALE, scale));
}

function roundCustomScale(scale) {
  return Math.round(scale * 100) / 100;
}

function resolveNextScaleMode(nextScale, fitScale) {
  if (!Number.isFinite(nextScale) || !Number.isFinite(fitScale)) {
    return "fit";
  }

  return nextScale <= fitScale + CUSTOM_SCALE_STEP / 2 ? "fit" : String(roundCustomScale(nextScale));
}

function normalizeScaleAnchor(anchor = null) {
  if (!anchor || typeof anchor.clientX !== "number" || typeof anchor.clientY !== "number") {
    return null;
  }

  const appShell = getAppShell();
  const previewShell = getPreviewShell();
  const previewFrame = getPreviewZoomFrame();
  if (!(appShell instanceof HTMLElement) || !(previewShell instanceof HTMLElement) || !(previewFrame instanceof HTMLElement)) {
    return null;
  }

  const shellRect = previewShell.getBoundingClientRect();
  const previewRect = previewFrame.getBoundingClientRect();
  const currentScale = parseScaleMode(getStoredScaleMode(), getFitScale());
  if (!Number.isFinite(currentScale) || currentScale <= 0) {
    return null;
  }

  if (
    anchor.clientX < shellRect.left ||
    anchor.clientY < shellRect.top ||
    anchor.clientX > shellRect.right ||
    anchor.clientY > shellRect.bottom
  ) {
    return null;
  }

  const offsetX = Math.max(0, Math.min(previewRect.width, anchor.clientX - previewRect.left));
  const offsetY = Math.max(0, Math.min(previewRect.height, anchor.clientY - previewRect.top));

  return {
    clientX: anchor.clientX,
    clientY: anchor.clientY,
    unscaledX: offsetX / currentScale,
    unscaledY: offsetY / currentScale,
  };
}

function restoreScaleAnchor(anchor, scale) {
  if (!anchor || !Number.isFinite(scale) || scale <= 0) {
    return;
  }

  const appShell = getAppShell();
  const previewFrame = getPreviewZoomFrame();
  if (!(appShell instanceof HTMLElement) || !(previewFrame instanceof HTMLElement)) {
    return;
  }

  const appShellRect = appShell.getBoundingClientRect();
  const desiredScrollLeft =
    previewFrame.offsetLeft + anchor.unscaledX * scale - (anchor.clientX - appShellRect.left);
  const desiredScrollTop =
    previewFrame.offsetTop + anchor.unscaledY * scale - (anchor.clientY - appShellRect.top);
  const maxScrollLeft = Math.max(0, appShell.scrollWidth - appShell.clientWidth);
  const maxScrollTop = Math.max(0, appShell.scrollHeight - appShell.clientHeight);

  appShell.scrollLeft = Math.max(0, Math.min(maxScrollLeft, desiredScrollLeft));
  appShell.scrollTop = Math.max(0, Math.min(maxScrollTop, desiredScrollTop));
}

function setScaleMode(mode, anchor = null) {
  const select = getScaleSelect();
  if (select) {
    select.dataset.value = mode;
  }
  pendingScaleAnchor = normalizeScaleAnchor(anchor);
  setStoredScaleMode(mode);
  updatePhoneScale();
}

function getAvailableSpace() {
  const projectMain = document.querySelector(".bridge-main--project");
  const toolbar = document.querySelector(".bridge-project-toolbar");
  const shell = document.querySelector(".app-shell");
  const pageStrip = document.querySelector(".project-page-strip");
  const viewportWidth = window.visualViewport?.width || window.innerWidth;
  const viewportHeight = window.visualViewport?.height || window.innerHeight;

  if (shell instanceof HTMLElement) {
    const shellStyles = window.getComputedStyle(shell);
    const shellPaddingTop = Number.parseFloat(shellStyles.paddingTop) || 0;
    const shellPaddingBottom = Number.parseFloat(shellStyles.paddingBottom) || 0;
    const shellPaddingLeft = Number.parseFloat(shellStyles.paddingLeft) || 0;
    const shellPaddingRight = Number.parseFloat(shellStyles.paddingRight) || 0;
    const shellColumnGap = Number.parseFloat(shellStyles.columnGap || shellStyles.gap) || 0;
    const shellRect = shell.getBoundingClientRect();
    const stripRect =
      pageStrip instanceof HTMLElement && window.getComputedStyle(pageStrip).display !== "none"
        ? pageStrip.getBoundingClientRect()
        : null;
    const stripWidth = isResponsiveViewportMode() ? 0 : stripRect ? stripRect.width : 0;
    const openDrawerWidth = getOpenDrawerWidth();
    const availableHeight = Math.max(
      shellRect.height - shellPaddingTop - shellPaddingBottom - FIT_BOTTOM_GUTTER,
      0,
    );
    const availableWidth = Math.max(
      shellRect.width -
        shellPaddingLeft -
        shellPaddingRight -
        stripWidth -
        (stripRect ? shellColumnGap : 0) -
        openDrawerWidth,
      0,
    );
    return { availableHeight, availableWidth };
  }

  if (projectMain && shell) {
    const projectStyles = window.getComputedStyle(projectMain);
    const shellStyles = window.getComputedStyle(shell);
    const toolbarStyles = toolbar ? window.getComputedStyle(toolbar) : null;
    const projectPaddingTop = Number.parseFloat(projectStyles.paddingTop) || 0;
    const projectPaddingBottom = Number.parseFloat(projectStyles.paddingBottom) || 0;
    const projectPaddingLeft = Number.parseFloat(projectStyles.paddingLeft) || 0;
    const projectPaddingRight = Number.parseFloat(projectStyles.paddingRight) || 0;
    const shellPaddingTop = Number.parseFloat(shellStyles.paddingTop) || 0;
    const shellPaddingBottom = Number.parseFloat(shellStyles.paddingBottom) || 0;
    const shellPaddingLeft = Number.parseFloat(shellStyles.paddingLeft) || 0;
    const shellPaddingRight = Number.parseFloat(shellStyles.paddingRight) || 0;
    const toolbarHeight = toolbar ? toolbar.getBoundingClientRect().height : 0;
    const toolbarMarginBottom = toolbarStyles ? Number.parseFloat(toolbarStyles.marginBottom) || 0 : 0;
    const availableHeight = Math.max(
      viewportHeight -
        projectPaddingTop -
        projectPaddingBottom -
        toolbarHeight -
        toolbarMarginBottom -
        shellPaddingTop -
        shellPaddingBottom -
        FIT_BOTTOM_GUTTER,
      0,
    );
    const availableWidth = Math.max(
      viewportWidth -
        projectPaddingLeft -
        projectPaddingRight -
        shellPaddingLeft -
        shellPaddingRight,
      0,
    );
    return { availableHeight, availableWidth };
  }

  return {
    availableHeight: Math.max(window.innerHeight - FALLBACK_VERTICAL_PADDING - FIT_BOTTOM_GUTTER, 0),
    availableWidth: Math.max(window.innerWidth - FALLBACK_HORIZONTAL_PADDING, 0),
  };
}

function getFitScale() {
  const { availableHeight, availableWidth } = getAvailableSpace();
  const { width, height } = getCurrentPreviewDimensions();
  const previewHeaderHeight = getPreviewHeaderHeight();
  const availableDeviceHeight = Math.max(availableHeight - previewHeaderHeight, 0);
  return Math.min(availableDeviceHeight / height, availableWidth / width);
}

function syncScaleSelect(scale, mode) {
  const select = getScaleSelect();
  const trigger = getScaleTrigger();
  const menu = getScaleMenu();
  const options = getScaleOptions();
  const scaleSection = getScaleSection();
  const responsiveViewport = isResponsiveViewportMode();

  if (!select || !trigger || !menu || !options.length) {
    return;
  }

  if (scaleSection instanceof HTMLElement) {
    scaleSection.hidden = false;
    scaleSection.classList.toggle("is-disabled", responsiveViewport);
    scaleSection.setAttribute("aria-disabled", responsiveViewport ? "true" : "false");
  }

  const fitOption = options.find((option) => option.dataset.previewScaleOption === "fit");

  if (fitOption) {
    fitOption.dataset.previewScaleTriggerLabel = "Fit";
    const fitLabel = fitOption.querySelector(".preview-scale-menu__item-label");
    if (fitLabel) {
      fitLabel.textContent = "Fit";
    } else {
      fitOption.textContent = "Fit";
    }
  }

  const actualOption = options.find((option) => option.dataset.previewScaleOption === "1");
  if (actualOption) {
    const { width, height } = getCurrentPreviewDimensions();
    actualOption.dataset.previewScaleTriggerLabel = "Actual";
    actualOption.dataset.previewScaleTriggerSubtext = `(${Math.round(width)}x${Math.round(height)})`;
    const actualLabel = actualOption.querySelector(".preview-scale-menu__item-label");
    const actualNote = actualOption.querySelector(".preview-scale-menu__item-note");
    if (actualLabel) {
      actualLabel.textContent = "Actual";
    }
    if (actualNote) {
      actualNote.textContent = `(${Math.round(width)}x${Math.round(height)})`;
    } else {
      actualOption.textContent = `Actual (${Math.round(width)}x${Math.round(height)})`;
    }
  }

  const effectiveMode = responsiveViewport ? "1" : mode;

  if (select.dataset.value !== effectiveMode) {
    select.dataset.value = effectiveMode;
  }

  select.dataset.open = menu.hidden ? "false" : "true";
  trigger.setAttribute("aria-expanded", menu.hidden ? "false" : "true");
  options.forEach((option) => {
    const checked = option.dataset.previewScaleOption === effectiveMode;
    option.setAttribute("aria-checked", checked ? "true" : "false");
    option.classList.toggle("is-active", checked);
    option.disabled = responsiveViewport;
    option.setAttribute("aria-disabled", responsiveViewport ? "true" : "false");
    option.tabIndex = responsiveViewport ? -1 : -1;
  });
  sizeScaleMenu(menu, options);
  syncScaleLabel(select);
}

function updatePhoneScale() {
  if (document.body.classList.contains("capture-mode")) {
    document.documentElement.style.setProperty("--phone-scale", "1");
    window.dispatchEvent(
      new CustomEvent("uxbridge:preview-scale-change", {
        detail: { scale: 1, mode: "capture" },
      }),
    );
    return;
  }

  const responsiveViewport = isResponsiveViewportMode();
  const mode = responsiveViewport ? "1" : getStoredScaleMode();
  const fitScale = getFitScale();
  const scale = responsiveViewport ? 1 : parseScaleMode(mode, fitScale);
  const anchor = pendingScaleAnchor;
  const previewShell = getPreviewShell();
  const fitOffsetX = responsiveViewport ? 0 : LANE_CENTERED_SCALE_MODES.has(mode) ? getFitLaneOffsetX(scale) : 0;
  pendingScaleAnchor = null;

  document.documentElement.style.setProperty("--phone-scale", String(scale));
  if (previewShell instanceof HTMLElement) {
    previewShell.style.setProperty("--bridge-preview-fit-offset-x", `${Math.round(fitOffsetX)}px`);
  }
  const appShell = getAppShell();
  if (!responsiveViewport && LANE_CENTERED_SCALE_MODES.has(mode) && appShell instanceof HTMLElement) {
    appShell.scrollLeft = 0;
  }
  syncScaleSelect(fitScale, mode);
  if (anchor) {
    window.requestAnimationFrame(() => {
      restoreScaleAnchor(anchor, scale);
    });
  }
  window.dispatchEvent(
    new CustomEvent("uxbridge:preview-scale-change", {
      detail: { scale, mode },
    }),
  );
}

const scheduleUpdate = () => {
  if (scheduledFrame) {
    window.cancelAnimationFrame(scheduledFrame);
  }

  scheduledFrame = window.requestAnimationFrame(() => {
    scheduledFrame = 0;
    updatePhoneScale();
  });
};

window.addEventListener("resize", scheduleUpdate);
window.addEventListener("resize", positionScaleMenu);
window.addEventListener("orientationchange", scheduleUpdate);
window.addEventListener("orientationchange", positionScaleMenu);
window.addEventListener("load", scheduleUpdate);
window.visualViewport?.addEventListener("resize", scheduleUpdate);
window.visualViewport?.addEventListener("resize", positionScaleMenu);
window.visualViewport?.addEventListener("scroll", scheduleUpdate);
window.visualViewport?.addEventListener("scroll", positionScaleMenu);
window.addEventListener("uxbridge:preview-viewport-change", scheduleUpdate);
window.addEventListener("uxbridge:preview-viewport-change", positionScaleMenu);

const resizeObserver = new ResizeObserver(() => {
  scheduleUpdate();
  positionScaleMenu();
});

const observeShell = () => {
  resizeObserver.observe(document.documentElement);
  resizeObserver.observe(document.body);

  const projectMain = document.querySelector(".bridge-main--project");
  const toolbar = document.querySelector(".bridge-project-toolbar");
  const shell = document.querySelector(".app-shell");
  if (projectMain) {
    resizeObserver.observe(projectMain);
  }

  if (toolbar) {
    resizeObserver.observe(toolbar);
  }

  if (shell) {
    resizeObserver.observe(shell);
  }
};

function bindScaleSelect() {
  const select = getScaleSelect();
  const trigger = getScaleTrigger();
  const menu = getScaleMenu();
  const options = getScaleOptions();

  if (!select || !trigger || !menu || !options.length || select.dataset.bound === "true") {
    return;
  }

  select.dataset.bound = "true";
  select.dataset.value = getStoredScaleMode();
  if (!menu.dataset.floatingRoot) {
    document.body.append(menu);
    menu.dataset.floatingRoot = "body";
  }

  const closeMenu = () => {
    menu.hidden = true;
    select.dataset.open = "false";
    trigger.setAttribute("aria-expanded", "false");
  };

  window.UXBridgePreviewScale = {
    closeMenu,
    isMenuOpen: () => !menu.hidden,
  };

  trigger.addEventListener("click", () => {
    const nextHidden = !menu.hidden;
    menu.hidden = nextHidden;
    select.dataset.open = nextHidden ? "false" : "true";
    trigger.setAttribute("aria-expanded", nextHidden ? "false" : "true");

    if (!nextHidden) {
      sizeScaleMenu(menu, options);
      positionScaleMenu();
    }
  });

  options.forEach((option) => {
    option.addEventListener("click", () => {
      const mode = option.dataset.previewScaleOption || "fit";
      setScaleMode(mode);
      closeMenu();
      trigger.focus();
    });
  });

  document.addEventListener("click", (event) => {
    if (!select.contains(event.target) && !(event.target instanceof Node && menu.contains(event.target))) {
      closeMenu();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeMenu();
    }

      if (isTypingTarget(event.target) || !(event.metaKey || event.ctrlKey) || event.altKey || event.shiftKey) {
        return;
      }

      if (isResponsiveViewportMode()) {
        return;
      }

    if (event.key === "0") {
      event.preventDefault();
      setScaleMode("1");
      closeMenu();
      return;
    }

    if (event.key === "1") {
      event.preventDefault();
      setScaleMode("fit");
      closeMenu();
    }
  });

  trigger.addEventListener("keydown", (event) => {
    if (event.key === "ArrowDown" || event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      menu.hidden = false;
      select.dataset.open = "true";
      trigger.setAttribute("aria-expanded", "true");
      sizeScaleMenu(menu, options);
      positionScaleMenu();
      options[0]?.focus();
    }
  });

  options.forEach((option, index) => {
    option.addEventListener("keydown", (event) => {
      if (event.key === "ArrowDown") {
        event.preventDefault();
        options[(index + 1) % options.length]?.focus();
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        options[(index - 1 + options.length) % options.length]?.focus();
      } else if (event.key === "Escape") {
        event.preventDefault();
        closeMenu();
        trigger.focus();
      }
    });
  });

  options.forEach((option) => {
    option.setAttribute("tabindex", "-1");
  });

  if (!select.dataset.value) {
    select.dataset.value = "fit";
    setStoredScaleMode("fit");
    updatePhoneScale();
  } else {
    updatePhoneScale();
  }

  syncScaleLabel(select);
}

function bindWheelZoom() {
  if (document.documentElement.dataset.previewWheelZoomBound === "true") {
    return;
  }

  document.documentElement.dataset.previewWheelZoomBound = "true";

  document.addEventListener(
    "wheel",
    (event) => {
      const target = event.target;
      if (!(target instanceof Element) || !target.closest(".bridge-main--project")) {
        return;
      }
      if (isResponsiveViewportMode()) {
        return;
      }
      if (target.closest("input, textarea, select, [contenteditable='true'], [contenteditable='']")) {
        return;
      }

      if (isPreviewZoomChromeTarget(target)) {
        return;
      }

      const previewShell = getPreviewShell();
      const appShell = getAppShell();
      if (!(previewShell instanceof HTMLElement) || !(appShell instanceof HTMLElement)) {
        return;
      }

      const shouldUsePreviewZoom =
        previewShell.contains(target) ||
        (appShell.contains(target) && !isPreviewZoomChromeTarget(target));

      if (!shouldUsePreviewZoom) {
        return;
      }

      if (event.metaKey || event.ctrlKey) {
        event.preventDefault();

        const fitScale = getFitScale();
        const currentMode = getStoredScaleMode();
        const currentScale = parseScaleMode(currentMode, fitScale);
        const direction = event.deltaY < 0 ? 1 : -1;
        const nextScale = roundCustomScale(clampCustomScale(currentScale + direction * CUSTOM_SCALE_STEP));

        setScaleMode(resolveNextScaleMode(nextScale, fitScale), {
          clientX: event.clientX,
          clientY: event.clientY,
        });
        return;
      }

      const fitScale = getFitScale();
      const currentScale = parseScaleMode(getStoredScaleMode(), fitScale);
      if (!(appShell instanceof HTMLElement) || currentScale <= fitScale + 0.001) {
        return;
      }

      const canScrollX = appShell.scrollWidth > appShell.clientWidth + 1;
      const canScrollY = appShell.scrollHeight > appShell.clientHeight + 1;
      if (!canScrollX && !canScrollY) {
        return;
      }

      event.preventDefault();
      const horizontalDelta = event.shiftKey && Math.abs(event.deltaY) > Math.abs(event.deltaX)
        ? event.deltaY
        : event.deltaX;
      if (canScrollX) {
        appShell.scrollLeft += horizontalDelta;
      }
      if (canScrollY && !event.shiftKey) {
        appShell.scrollTop += event.deltaY;
      }
    },
    { passive: false },
  );
}

const mutationObserver = new MutationObserver(() => {
  observeShell();
  bindScaleSelect();
  scheduleUpdate();
});

if (document.body) {
  mutationObserver.observe(document.body, {
    attributes: true,
    attributeFilter: ["class"],
  });
}

observeShell();
bindScaleSelect();
bindWheelZoom();
updatePhoneScale();
