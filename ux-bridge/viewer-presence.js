(function initViewerPresence() {
  const PRESENCE_ENABLED = false;

  if (!PRESENCE_ENABLED) {
    return;
  }

  const PRESENCE_API = "/api/presence";
  const HEARTBEAT_MS = 30000;
  const SESSION_KEY = "brand-affiliate-viewer-session";
  const MAX_VISIBLE_AVATARS = 5;
  const AVATAR_PALETTES = [
    { background: "linear-gradient(135deg, #3b82f6 0%, #1f79c4 100%)", foreground: "#ffffff" },
    { background: "linear-gradient(135deg, #f97316 0%, #ea580c 100%)", foreground: "#ffffff" },
    { background: "linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)", foreground: "#ffffff" },
    { background: "linear-gradient(135deg, #22c55e 0%, #15803d 100%)", foreground: "#ffffff" },
    { background: "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)", foreground: "#ffffff" },
    { background: "linear-gradient(135deg, #14b8a6 0%, #0f766e 100%)", foreground: "#ffffff" },
    { background: "linear-gradient(135deg, #ec4899 0%, #db2777 100%)", foreground: "#ffffff" },
  ];

  const widget = document.createElement("aside");
  widget.className = "viewer-presence";
  widget.setAttribute("aria-live", "polite");
  widget.innerHTML = `
    <div class="viewer-presence__stack" aria-hidden="true"></div>
    <div class="viewer-presence__tooltip" role="presentation"></div>
  `;
  const headerActions = document.querySelector("[data-header-actions]");
  if (headerActions) {
    headerActions.prepend(widget);
  } else {
    document.body.append(widget);
  }

  const stackNode = widget.querySelector(".viewer-presence__stack");
  const tooltipNode = widget.querySelector(".viewer-presence__tooltip");

  let heartbeatTimer = null;
  let isActive = false;
  let requestSequence = 0;
  let latestAppliedSequence = 0;

  function getPresenceContext() {
    return {
      path: window.location.pathname,
      projectKey: document.body.dataset.projectKey || "brand-affiliate-mobile",
      pageKey: document.body.dataset.pageKey || "",
    };
  }

  function getKnownUser() {
    if (window.uxBridgeUser?.fullName) {
      return window.uxBridgeUser;
    }

    try {
      const cached = sessionStorage.getItem("ux-bridge-user");

      if (!cached) {
        return null;
      }

      const parsed = JSON.parse(cached);
      return parsed?.fullName ? parsed : null;
    } catch {
      return null;
    }
  }

  function getInitials(fullName) {
    const parts = String(fullName || "")
      .trim()
      .split(/\s+/)
      .filter(Boolean);

    if (!parts.length) {
      return "Y";
    }

    return parts
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() || "")
      .join("");
  }

  function updateTooltip() {
    const fallbackName = "You";
    const fullName = getKnownUser()?.fullName || fallbackName;

    if (tooltipNode) {
      tooltipNode.textContent = fullName;
    }
  }

  function getSessionId() {
    let sessionId = sessionStorage.getItem(SESSION_KEY);

    if (!sessionId) {
      sessionId = crypto.randomUUID();
      sessionStorage.setItem(SESSION_KEY, sessionId);
    }

    return sessionId;
  }

  function getPaletteForSession(sessionId) {
    let hash = 0;

    for (let index = 0; index < sessionId.length; index += 1) {
      hash = (hash * 31 + sessionId.charCodeAt(index)) % 2147483647;
    }

    return AVATAR_PALETTES[Math.abs(hash) % AVATAR_PALETTES.length];
  }

  function createAvatar(viewer, index) {
    const avatar = document.createElement("span");
    const palette = getPaletteForSession(viewer.sessionId);
    const initials = viewer.initials || getInitials(viewer.fullName);
    const tooltipLabel = viewer.fullName || initials;

    avatar.className = "viewer-presence__avatar";
    avatar.style.setProperty("--viewer-z", String(index + 1));
    avatar.style.setProperty("--viewer-bg", palette.background);
    avatar.style.setProperty("--viewer-fg", palette.foreground);
    if (viewer.avatarUrl) {
      avatar.classList.add("has-photo");
      avatar.innerHTML = `<img src="${viewer.avatarUrl}" alt="" />`;
    } else {
      avatar.textContent = initials;
    }
    avatar.setAttribute("tabindex", "0");
    avatar.setAttribute("aria-label", tooltipLabel);
    avatar.addEventListener("mouseenter", () => {
      if (tooltipNode) {
        tooltipNode.textContent = tooltipLabel;
      }
    });
    avatar.addEventListener("focus", () => {
      if (tooltipNode) {
        tooltipNode.textContent = tooltipLabel;
      }
    });
    avatar.addEventListener("mouseleave", updateTooltip);
    avatar.addEventListener("blur", updateTooltip);

    return avatar;
  }

  function createOverflowBadge(count, index) {
    const overflow = document.createElement("span");
    overflow.className = "viewer-presence__overflow";
    overflow.style.setProperty("--viewer-z", String(index + 1));
    overflow.textContent = `+${count}`;
    return overflow;
  }

  function updatePresence({ count, viewers = [] }, sequence = latestAppliedSequence + 1) {
    if (sequence < latestAppliedSequence) {
      return;
    }

    latestAppliedSequence = sequence;
    const safeCount = Math.max(
      Array.isArray(viewers) ? viewers.length : 0,
      Number.isFinite(count) ? Math.max(0, count) : 0,
    );
    const ownSessionId = getSessionId();
    const orderedViewers = [...viewers].sort((left, right) => {
      if (left.sessionId === ownSessionId) {
        return -1;
      }

      if (right.sessionId === ownSessionId) {
        return 1;
      }

      const leftName = String(left.fullName || "").trim().toLowerCase();
      const rightName = String(right.fullName || "").trim().toLowerCase();

      if (leftName && rightName && leftName !== rightName) {
        return leftName.localeCompare(rightName);
      }

      return String(left.sessionId || "").localeCompare(String(right.sessionId || ""));
    });
    const visibleViewers = orderedViewers.slice(0, MAX_VISIBLE_AVATARS);
    const overflowCount = Math.max(safeCount - visibleViewers.length, 0);

    stackNode.replaceChildren();

    if (!safeCount && !visibleViewers.length) {
      widget.hidden = true;
      return;
    }

    visibleViewers.forEach((viewer, index) => {
      stackNode.append(createAvatar(viewer, index));
    });

    if (overflowCount > 0) {
      stackNode.append(createOverflowBadge(overflowCount, visibleViewers.length));
    }

    widget.setAttribute(
      "aria-label",
      `${safeCount} active ${safeCount === 1 ? "viewer" : "viewers"}`
    );
    widget.hidden = false;
  }

  async function sendPresence(action, useBeacon = false) {
    const context = getPresenceContext();
    const payload = {
      action,
      sessionId: getSessionId(),
      path: context.path,
      projectKey: context.projectKey,
      pageKey: context.pageKey,
      title: document.title,
      fullName: getKnownUser()?.fullName || "",
      initials: getInitials(getKnownUser()?.fullName || ""),
      avatarUrl: String(getKnownUser()?.avatarUrl || ""),
    };

    if (useBeacon && navigator.sendBeacon) {
      const body = new Blob([JSON.stringify(payload)], { type: "application/json" });
      navigator.sendBeacon(PRESENCE_API, body);
      return null;
    }

    const response = await fetch(PRESENCE_API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      keepalive: action === "leave",
    });

    if (!response.ok) {
      throw new Error(`Presence request failed: ${response.status}`);
    }

    return response.json();
  }

  async function heartbeat() {
    if (!isActive) {
      return;
    }

    try {
      const sequence = ++requestSequence;
      const result = await sendPresence("heartbeat");
      if (result?.ok) {
        updatePresence(result, sequence);
      }
    } catch {
      // Keep the last known presence visible on transient heartbeat issues.
    }
  }

  async function waitForPresenceContext() {
    const isDynamicProjectPage = document.body.dataset.dynamicProject === "true";

    if (!isDynamicProjectPage) {
      return;
    }

    for (let attempt = 0; attempt < 50; attempt += 1) {
      const context = getPresenceContext();

      if (context.pageKey) {
        return;
      }

      await new Promise((resolve) => window.setTimeout(resolve, 100));
    }
  }

  function stopHeartbeat() {
    if (heartbeatTimer) {
      window.clearTimeout(heartbeatTimer);
      heartbeatTimer = null;
    }
  }

  function getHeartbeatDelay() {
    if (document.visibilityState !== "visible") {
      return 60_000;
    }

    return HEARTBEAT_MS;
  }

  function scheduleHeartbeat() {
    stopHeartbeat();

    heartbeatTimer = window.setTimeout(async () => {
      await heartbeat();

      if (isActive) {
        scheduleHeartbeat();
      }
    }, getHeartbeatDelay());
  }

  async function activatePresence() {
    if (isActive) {
      return;
    }

    if (!getKnownUser()) {
      await new Promise((resolve) => {
        let settled = false;
        const done = () => {
          if (settled) {
            return;
          }
          settled = true;
          window.removeEventListener("uxbridge:user-ready", onReady);
          window.clearTimeout(timeoutId);
          resolve();
        };
        const onReady = () => done();
        const timeoutId = window.setTimeout(done, 1500);

        window.addEventListener("uxbridge:user-ready", onReady, { once: true });
      });
    }

    await waitForPresenceContext();

    isActive = true;
    updateTooltip();
    await heartbeat();
    scheduleHeartbeat();
  }

  async function deactivatePresence() {
    if (!isActive) {
      return;
    }

    isActive = false;
    stopHeartbeat();

    try {
      await sendPresence("leave");
    } catch {
      sendPresence("leave", true);
    }
  }

  function syncVisibility() {
    if (document.visibilityState === "visible") {
      activatePresence();
    } else {
      deactivatePresence();
    }
  }

  document.addEventListener("visibilitychange", syncVisibility);
  window.addEventListener("pageshow", syncVisibility);
  window.addEventListener("focus", syncVisibility);
  window.addEventListener("pagehide", () => {
    isActive = false;
    stopHeartbeat();
    sendPresence("leave", true);
  });
  window.addEventListener("beforeunload", () => {
    isActive = false;
    stopHeartbeat();
    sendPresence("leave", true);
  });

  updateTooltip();
  syncVisibility();
})();
