const PHONE_WIDTH = 375;
const PHONE_HEIGHT = 812;
const FALLBACK_VERTICAL_PADDING = 40;
const FALLBACK_HORIZONTAL_PADDING = 28;
const SCALE_MODE_KEY = "ux-bridge-preview-scale-mode";
let scheduledFrame = 0;

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

function sizeScaleMenu(menu, options) {
  if (!menu || !options.length) {
    return;
  }

  const wasHidden = menu.hidden;

  if (wasHidden) {
    menu.hidden = false;
    menu.style.visibility = "hidden";
  }

  const probe = document.createElement("div");
  probe.style.position = "absolute";
  probe.style.visibility = "hidden";
  probe.style.pointerEvents = "none";
  probe.style.whiteSpace = "nowrap";
  probe.style.width = "max-content";
  probe.style.fontSize = "14px";
  probe.style.fontWeight = "600";
  probe.style.letterSpacing = "0.01em";
  probe.style.lineHeight = "1";
  probe.style.padding = "0 12px";
  probe.style.boxSizing = "border-box";
  document.body.append(probe);

  const widest = options.reduce((maxWidth, option) => {
    probe.textContent = option.textContent || "";
    const optionWidth = Math.ceil(probe.getBoundingClientRect().width);
    return Math.max(maxWidth, optionWidth);
  }, 0);

  probe.remove();

  const nextWidth = widest + 16;
  menu.style.width = `${nextWidth}px`;

  if (wasHidden) {
    menu.hidden = true;
    menu.style.visibility = "";
  }
}

function syncScaleLabel(select) {
  const label = getScaleLabel();

  if (!label || !select) {
    return;
  }

  const selectedOption = getScaleOptions().find(
    (option) => option.dataset.previewScaleOption === select.dataset.value,
  );
  label.textContent = selectedOption ? selectedOption.textContent || "" : "";
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

function getAvailableSpace() {
  const projectMain = document.querySelector(".bridge-main--project");
  const toolbar = document.querySelector(".bridge-project-toolbar");
  const shell = document.querySelector(".app-shell");
  const viewportWidth = window.visualViewport?.width || window.innerWidth;
  const viewportHeight = window.visualViewport?.height || window.innerHeight;

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
        shellPaddingBottom,
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
    availableHeight: Math.max(window.innerHeight - FALLBACK_VERTICAL_PADDING, 0),
    availableWidth: Math.max(window.innerWidth - FALLBACK_HORIZONTAL_PADDING, 0),
  };
}

function getFitScale() {
  const { availableHeight, availableWidth } = getAvailableSpace();
  return Math.min(availableHeight / PHONE_HEIGHT, availableWidth / PHONE_WIDTH);
}

function syncScaleSelect(scale, mode) {
  const select = getScaleSelect();
  const trigger = getScaleTrigger();
  const menu = getScaleMenu();
  const options = getScaleOptions();

  if (!select || !trigger || !menu || !options.length) {
    return;
  }

  const fitOption = options.find((option) => option.dataset.previewScaleOption === "fit");

  if (fitOption) {
    fitOption.textContent = `Fit (${Math.round(scale * 100)}%)`;
  }

  if (select.dataset.value !== mode) {
    select.dataset.value = mode;
  }

  select.dataset.open = menu.hidden ? "false" : "true";
  trigger.setAttribute("aria-expanded", menu.hidden ? "false" : "true");
  options.forEach((option) => {
    const checked = option.dataset.previewScaleOption === mode;
    option.setAttribute("aria-checked", checked ? "true" : "false");
    option.classList.toggle("is-active", checked);
  });
  sizeScaleMenu(menu, options);
  syncScaleLabel(select);
}

function updatePhoneScale() {
  if (document.body.classList.contains("capture-mode")) {
    document.documentElement.style.setProperty("--phone-scale", "1");
    return;
  }

  const mode = getStoredScaleMode();
  const fitScale = getFitScale();
  const scale = mode === "fit" ? fitScale : Number(mode) || fitScale;

  document.documentElement.style.setProperty("--phone-scale", String(scale));
  syncScaleSelect(fitScale, mode);
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
window.addEventListener("orientationchange", scheduleUpdate);
window.addEventListener("load", scheduleUpdate);
window.visualViewport?.addEventListener("resize", scheduleUpdate);
window.visualViewport?.addEventListener("scroll", scheduleUpdate);

const resizeObserver = new ResizeObserver(() => {
  scheduleUpdate();
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

  const closeMenu = () => {
    menu.hidden = true;
    select.dataset.open = "false";
    trigger.setAttribute("aria-expanded", "false");
  };

  trigger.addEventListener("click", () => {
    const nextHidden = !menu.hidden;
    menu.hidden = nextHidden;
    select.dataset.open = nextHidden ? "false" : "true";
    trigger.setAttribute("aria-expanded", nextHidden ? "false" : "true");

    if (!nextHidden) {
      sizeScaleMenu(menu, options);
    }
  });

  options.forEach((option) => {
    option.addEventListener("click", () => {
      const mode = option.dataset.previewScaleOption || "fit";
      select.dataset.value = mode;
      setStoredScaleMode(mode);
      closeMenu();
      updatePhoneScale();
      trigger.focus();
    });
  });

  document.addEventListener("click", (event) => {
    if (!select.contains(event.target)) {
      closeMenu();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
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

  trigger.addEventListener("blur", () => {
    window.setTimeout(() => {
      if (!select.contains(document.activeElement)) {
        closeMenu();
      }
    }, 0);
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
updatePhoneScale();
