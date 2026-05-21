(function initProjectsHome() {
  const COMMENTS_API = "/api/comments";
  const COMMENT_SEEN_KEY_PREFIX = "ux-bridge-comments-seen";
  const PROJECT_SUMMARY_CACHE_KEY = "ux-bridge-project-comment-summary";
  const PROJECT_SUMMARY_CACHE_TTL_MS = 30000;
  const PROJECT_SUMMARY_REFRESH_MS = 3000;
  const THUMBNAIL_RENDER_CACHE_KEY = "ux-bridge-project-thumbnail-renders";
  const THUMBNAIL_RENDER_TTL_MS = 24 * 60 * 60 * 1000;
  const PROJECT_RECENT_OPEN_KEY_PREFIX = "ux-bridge-project-recent-open";
  const TOAST_DISMISS_MS = 4000;
  const TOAST_EXIT_MS = 260;
  const PROJECT_THUMBNAIL_VIEWPORT_WIDTH = 1440;
  const PROJECT_THUMBNAIL_VIEWPORT_HEIGHT = 1047;
  const root = document.querySelector("[data-projects-root]");
  const heroActionsRoot = document.querySelector("[data-projects-hero-actions]");
  const generatorHost = document.createElement("div");
  const menuHost = document.createElement("div");
  const modalHost = document.createElement("div");
  let toastDismissTimer = 0;
  let toastExitTimer = 0;
  let projectSpotlightTimer = 0;
  let projectDeleteTimer = 0;
  let thumbnailGeneratorFrame = null;

  if (!root) {
    return;
  }

  generatorHost.className = "bridge-projects__thumbnail-generator";
  generatorHost.setAttribute("aria-hidden", "true");
  document.body.append(generatorHost);
  menuHost.className = "bridge-projects__menu-host";
  document.body.append(menuHost);
  modalHost.className = "bridge-projects__modal-host";
  document.body.append(modalHost);

  const state = {
    loading: true,
    projects: [],
    canCreateProjects: false,
    canDuplicateProjects: false,
    status: "",
    tone: "neutral",
    toastClosing: false,
    creating: false,
    commentSummaryByProject: new Map(),
    openMenuProjectId: "",
    openMenuPosition: null,
    ownerPickerProjectId: "",
    ownerPickerPosition: null,
    ownerPickerSearchQuery: "",
    updatingOwnerProjectId: "",
    editingProjectId: "",
    renamingProjectId: "",
    pendingProjectNameById: {},
    pendingProjectDescriptionById: {},
    dirtyProjectById: {},
    deleteModalProjectId: "",
    deletingProjectId: "",
    exitingProjectId: "",
    highlightedProjectId: "",
    summaryRefreshTimer: 0,
    summaryRequestToken: 0,
    thumbnailActiveProjectId: "",
    thumbnailRequestToken: "",
    thumbnailFailures: new Set(),
    thumbnailRefreshStarted: false,
    loadedThumbnailDataByProject: new Map(),
    recentProjectOpenById: {},
    sortKey: "recentOpen",
    sortDirection: "desc",
    sortPresetMenuOpen: false,
    searchQuery: "",
    availableUsers: [],
    selectedProjectIds: [],
    bulkDuplicatingProjects: false,
    bulkDeleteProjectIds: [],
    bulkDeletingProjects: false,
  };

  function getKnownUser() {
    if (window.uxBridgeUser?.email) {
      return window.uxBridgeUser;
    }

    try {
      const cached = sessionStorage.getItem("ux-bridge-user");
      return cached ? JSON.parse(cached) : null;
    } catch {
      return null;
    }
  }

  function getRecentProjectOpenStorageKey() {
    const email = String(getKnownUser()?.email || "anonymous").trim().toLowerCase();
    return `${PROJECT_RECENT_OPEN_KEY_PREFIX}:${email}`;
  }

  function getSeenStorageKey(projectId, pageId) {
    const email = String(getKnownUser()?.email || "anonymous").trim().toLowerCase();
    return `${COMMENT_SEEN_KEY_PREFIX}:${email}:${projectId}:${pageId}`;
  }

  function readLocalSeenState(projectId, pageId) {
    try {
      const raw = localStorage.getItem(getSeenStorageKey(projectId, pageId));

      if (!raw) {
        return {
          lastSeenCommentId: "",
          lastSeenAt: 0,
        };
      }

      const parsed = JSON.parse(raw);

      if (parsed && typeof parsed === "object") {
        return {
          lastSeenCommentId: String(parsed.lastSeenCommentId || "").trim(),
          lastSeenAt: Number(parsed.lastSeenAt) || 0,
        };
      }

      return {
        lastSeenCommentId: String(raw || "").trim(),
        lastSeenAt: 0,
      };
    } catch {
      return {
        lastSeenCommentId: "",
        lastSeenAt: 0,
      };
    }
  }

  function readRecentProjectOpenMap() {
    try {
      const raw = localStorage.getItem(getRecentProjectOpenStorageKey());

      if (!raw) {
        return {};
      }

      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch {
      return {};
    }
  }

  function writeRecentProjectOpenMap(nextMap) {
    try {
      localStorage.setItem(getRecentProjectOpenStorageKey(), JSON.stringify(nextMap));
    } catch {
      // Ignore local storage issues and fall back to default sorting.
    }
  }

  function getRecentProjectOpenTimestamp(projectId = "") {
    return Number(state.recentProjectOpenById?.[projectId]) || 0;
  }

  function normalizeRecentProjectOpenMap(value = {}) {
    if (!value || typeof value !== "object") {
      return {};
    }

    return Object.fromEntries(
      Object.entries(value)
        .map(([projectId, timestamp]) => [String(projectId || "").trim(), Number(timestamp) || 0])
        .filter(([projectId, timestamp]) => projectId && timestamp > 0),
    );
  }

  function mergeRecentProjectOpenMaps(...maps) {
    const merged = {};

    maps.forEach((map) => {
      const normalizedMap = normalizeRecentProjectOpenMap(map);
      Object.entries(normalizedMap).forEach(([projectId, timestamp]) => {
        merged[projectId] = Math.max(Number(merged[projectId]) || 0, Number(timestamp) || 0);
      });
    });

    return merged;
  }

  function recentProjectOpenMapsEqual(left = {}, right = {}) {
    const leftMap = normalizeRecentProjectOpenMap(left);
    const rightMap = normalizeRecentProjectOpenMap(right);
    const leftKeys = Object.keys(leftMap);
    const rightKeys = Object.keys(rightMap);

    if (leftKeys.length !== rightKeys.length) {
      return false;
    }

    return leftKeys.every((key) => Number(leftMap[key]) === Number(rightMap[key]));
  }

  function persistRecentProjectOpenMap(projectOpenMap = {}) {
    const normalizedMap = normalizeRecentProjectOpenMap(projectOpenMap);
    state.recentProjectOpenById = normalizedMap;
    writeRecentProjectOpenMap(normalizedMap);
  }

  function syncRecentProjectOpenMapToServer(projectOpenMap = {}, { useBeacon = false } = {}) {
    const normalizedMap = normalizeRecentProjectOpenMap(projectOpenMap);

    if (!Object.keys(normalizedMap).length) {
      return;
    }

    const body = JSON.stringify({
      action: "syncRecentOpenMap",
      recentProjectOpenById: normalizedMap,
    });

    if (useBeacon && navigator.sendBeacon) {
      const blob = new Blob([body], { type: "application/json" });
      navigator.sendBeacon("/api/projects", blob);
      return;
    }

    void fetch("/api/projects", {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body,
      keepalive: useBeacon,
    }).catch(() => {
      // Keep local recency state when the background sync fails.
    });
  }

  function sendRecentProjectOpenToServer(projectId = "", openedAt = Date.now(), { useBeacon = false } = {}) {
    const normalizedProjectId = String(projectId || "").trim();

    if (!normalizedProjectId) {
      return;
    }

    const body = JSON.stringify({
      action: "markRecentOpen",
      project: normalizedProjectId,
      openedAt,
    });

    if (useBeacon && navigator.sendBeacon) {
      const blob = new Blob([body], { type: "application/json" });
      navigator.sendBeacon("/api/projects", blob);
      return;
    }

    void fetch("/api/projects", {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body,
      keepalive: useBeacon,
    }).catch(() => {
      // Keep local recency state when the background write fails.
    });
  }

  function markProjectRecentlyOpened(projectId = "", { useBeacon = false } = {}) {
    if (!projectId) {
      return;
    }

    const openedAt = Date.now();
    const nextMap = mergeRecentProjectOpenMaps(state.recentProjectOpenById, {
      [projectId]: openedAt,
    });
    persistRecentProjectOpenMap(nextMap);
    sendRecentProjectOpenToServer(projectId, openedAt, { useBeacon });
  }

  function applyRecentProjectOpenMapFromPayload(payload = {}) {
    const nextMap = mergeRecentProjectOpenMaps(state.recentProjectOpenById, payload.recentProjectOpenById);

    if (recentProjectOpenMapsEqual(nextMap, state.recentProjectOpenById)) {
      return;
    }

    persistRecentProjectOpenMap(nextMap);
  }

  function createEmptyCommentSummary() {
    return {
      totalComments: 0,
      unreadComments: 0,
      unreadMentions: 0,
    };
  }

  function projectAllowsUnreadBadge(project) {
    const currentUser = getKnownUser();
    const currentUserEmail = normalizeUserEmail(currentUser?.email);

    if (!project || !currentUserEmail) {
      return false;
    }

    if (currentUserEmail === normalizeUserEmail(project.ownerEmail)) {
      return true;
    }

    const projectMembers = Array.isArray(project.projectMembers) ? project.projectMembers : [];
    return projectMembers.some((member) => {
      const memberEmail = normalizeUserEmail(member?.email);
      const status = String(member?.status || "")
        .trim()
        .toLowerCase();
      return memberEmail === currentUserEmail && (status === "active" || status === "pending");
    });
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;");
  }

  function escapeRegExp(value) {
    return String(value ?? "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  function normalizeUserEmail(value) {
    return String(value || "").trim().toLowerCase();
  }

  function highlightMatch(value, query) {
    const text = String(value ?? "");
    const normalizedQuery = String(query || "").trim();

    if (!normalizedQuery) {
      return escapeHtml(text);
    }

    const pattern = new RegExp(`(${escapeRegExp(normalizedQuery)})`, "gi");
    return escapeHtml(text).replace(pattern, '<mark class="bridge-table-search__highlight">$1</mark>');
  }

  function projectMatchesSearch(project, query) {
    const normalizedQuery = String(query || "").trim().toLowerCase();

    if (!normalizedQuery) {
      return true;
    }

    return [project.name, project.description, project.ownerName]
      .map((value) => String(value || "").toLowerCase())
      .some((value) => value.includes(normalizedQuery));
  }

  function availableUserMatchesSearch(user, query) {
    const normalizedQuery = String(query || "").trim().toLowerCase();

    if (!normalizedQuery) {
      return true;
    }

    return [user.fullName, user.email, user.role]
      .map((value) => String(value || "").toLowerCase())
      .some((value) => value.includes(normalizedQuery));
  }

  function restoreProjectSearchFocus(selectionStart = null, selectionEnd = null) {
    window.requestAnimationFrame(() => {
      const searchInput = root.querySelector("[data-project-search]");

      if (!(searchInput instanceof HTMLInputElement)) {
        return;
      }

      searchInput.focus();

      if (typeof selectionStart === "number" && typeof selectionEnd === "number") {
        searchInput.setSelectionRange(selectionStart, selectionEnd);
      }
    });
  }

  function getInitials(fullName) {
    const parts = String(fullName || "")
      .trim()
      .split(/\s+/)
      .filter(Boolean);

    if (!parts.length) {
      return "UX";
    }

    return parts
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() || "")
      .join("");
  }

  function getToastIconMarkup(tone) {
    if (tone === "error") {
      return `
        <span class="bridge-projects__toast-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" focusable="false">
            <circle cx="12" cy="12" r="9"></circle>
            <path d="M12 8.2v5.2"></path>
            <circle cx="12" cy="16.8" r="0.9" fill="currentColor" stroke="none"></circle>
          </svg>
        </span>
      `;
    }

    return `
      <span class="bridge-projects__toast-icon" aria-hidden="true">
        <svg viewBox="0 0 24 24" focusable="false">
          <circle cx="12" cy="12" r="9"></circle>
          <path d="M8.2 12.4l2.5 2.5 5.1-5.4"></path>
        </svg>
      </span>
    `;
  }

  function clearStatus() {
    window.clearTimeout(toastDismissTimer);
    window.clearTimeout(toastExitTimer);

    if (!state.status) {
      state.toastClosing = false;
      return;
    }

    state.toastClosing = true;
    render();

    toastExitTimer = window.setTimeout(() => {
      state.status = "";
      state.tone = "neutral";
      state.toastClosing = false;
      render();
    }, TOAST_EXIT_MS);
  }

  function spotlightProject(projectId = "") {
    window.clearTimeout(projectSpotlightTimer);
    state.highlightedProjectId = projectId;

    if (!projectId) {
      return;
    }

    projectSpotlightTimer = window.setTimeout(() => {
      if (state.highlightedProjectId !== projectId) {
        return;
      }

      state.highlightedProjectId = "";
      render();
    }, 2000);
  }

  function animateProjectRemoval(projectId, projectName) {
    window.clearTimeout(projectDeleteTimer);
    state.exitingProjectId = projectId;
    render();

    projectDeleteTimer = window.setTimeout(() => {
      removeProjectLocally(projectId);
      state.exitingProjectId = "";
      setStatus(`The project: ${projectName} has been deleted.`);
      render();
      loadProjects({ background: true }).catch(() => {
        // Keep the local row removal when the background refresh fails.
      });
    }, 320);
  }

  function getSelectedProjectIds() {
    const knownIds = new Set(state.projects.map((project) => project.id));
    return state.selectedProjectIds.filter((projectId) => knownIds.has(projectId));
  }

  function isProjectSelected(projectId = "") {
    return getSelectedProjectIds().includes(projectId);
  }

  function toggleProjectSelection(projectId, checked) {
    const nextSelected = new Set(getSelectedProjectIds());

    if (checked) {
      nextSelected.add(projectId);
    } else {
      nextSelected.delete(projectId);
    }

    state.selectedProjectIds = Array.from(nextSelected);
  }

  function syncProjectSelectionState() {
    state.selectedProjectIds = getSelectedProjectIds();
  }

  function setStatus(message = "", tone = "neutral") {
    window.clearTimeout(toastDismissTimer);
    window.clearTimeout(toastExitTimer);

    if (!message) {
      clearStatus();
      return;
    }

    state.status = message;
    state.tone = tone;
    state.toastClosing = false;

    toastDismissTimer = window.setTimeout(() => {
      clearStatus();
    }, TOAST_DISMISS_MS);

    render();
  }

  function readThumbnailRenderCache() {
    try {
      const raw = localStorage.getItem(THUMBNAIL_RENDER_CACHE_KEY);

      if (!raw) {
        return {};
      }

      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch {
      return {};
    }
  }

  function writeThumbnailRenderCache(cache) {
    try {
      localStorage.setItem(THUMBNAIL_RENDER_CACHE_KEY, JSON.stringify(cache));
    } catch {
      // Ignore storage issues and fall back to best-effort rendering.
    }
  }

  function getThumbnailRenderKey(url) {
    const cache = readThumbnailRenderCache();
    const cacheKey = `${url.pathname}${url.searchParams.get("table-thumb") === "1" ? "?table-thumb=1" : url.search}`;
    const cachedEntry = cache[cacheKey];
    const now = Date.now();

    if (
      cachedEntry &&
      typeof cachedEntry === "object" &&
      typeof cachedEntry.token === "string" &&
      typeof cachedEntry.createdAt === "number" &&
      now - cachedEntry.createdAt < THUMBNAIL_RENDER_TTL_MS
    ) {
      return cachedEntry.token;
    }

    const token = String(now);
    cache[cacheKey] = {
      token,
      createdAt: now,
    };
    writeThumbnailRenderCache(cache);
    return token;
  }

  function getProjectThumbnailSourceUrl(project) {
    return String(project?.thumbnailUrl || project?.launchUrl || "").trim();
  }

  function hasProjectThumbnail(project) {
    return Boolean(String(project?.thumbnailDataUrl || "").trim());
  }

  function isProjectThumbnailFresh(project) {
    const thumbnailDataUrl = String(project?.thumbnailDataUrl || "").trim();
    const thumbnailUpdatedAt = Number(project?.thumbnailUpdatedAt) || 0;
    const thumbnailSourceUrl = String(project?.thumbnailSourceUrl || "").trim();
    const expectedSourceUrl = getProjectThumbnailSourceUrl(project);

    return Boolean(
      thumbnailDataUrl &&
        thumbnailUpdatedAt &&
        thumbnailSourceUrl === expectedSourceUrl &&
        Date.now() - thumbnailUpdatedAt < THUMBNAIL_RENDER_TTL_MS,
    );
  }

  function shouldRefreshProjectThumbnail(project) {
    if (!project || state.thumbnailFailures.has(project.id)) {
      return false;
    }

    return !isProjectThumbnailFresh(project);
  }

  function ensureThumbnailGeneratorFrame() {
    if (thumbnailGeneratorFrame?.isConnected) {
      return thumbnailGeneratorFrame;
    }

    thumbnailGeneratorFrame = document.createElement("iframe");
    thumbnailGeneratorFrame.className = "bridge-projects__thumbnail-generator-frame";
    thumbnailGeneratorFrame.setAttribute("tabindex", "-1");
    generatorHost.style.width = `${PROJECT_THUMBNAIL_VIEWPORT_WIDTH}px`;
    generatorHost.style.height = `${PROJECT_THUMBNAIL_VIEWPORT_HEIGHT}px`;
    thumbnailGeneratorFrame.style.width = `${PROJECT_THUMBNAIL_VIEWPORT_WIDTH}px`;
    thumbnailGeneratorFrame.style.height = `${PROJECT_THUMBNAIL_VIEWPORT_HEIGHT}px`;
    generatorHost.replaceChildren(thumbnailGeneratorFrame);
    return thumbnailGeneratorFrame;
  }

  function buildThumbnailGeneratorSrc(project, requestToken) {
    const sourceUrl = getProjectThumbnailSourceUrl(project);

    if (!sourceUrl) {
      return "";
    }

    const nextUrl = new URL(sourceUrl, window.location.origin);
    const thumbToken = getThumbnailRenderKey(nextUrl);
    nextUrl.searchParams.set("project", project.id);
    nextUrl.searchParams.set("thumb-capture", "1");
    nextUrl.searchParams.set("thumb-request", requestToken);
    nextUrl.searchParams.set("thumb-load", thumbToken);
    return `${nextUrl.pathname}${nextUrl.search}`;
  }

  function buildThumbnailCellMarkup(project) {
    const hasThumbnail = hasProjectThumbnail(project);
    const isLoading = state.thumbnailActiveProjectId === project.id;
    const isLocked = Boolean(project?.isLocked);

    return `
      ${
        hasThumbnail
          ? `<img class="bridge-projects-table__thumb-image" src="${escapeHtml(project.thumbnailDataUrl)}" alt="" loading="lazy" data-project-thumbnail-image="${escapeHtml(project.id)}" />`
          : ""
      }
      ${
        isLocked
          ? `
            <span class="bridge-projects-table__thumb-lock" aria-hidden="true">
              <svg viewBox="0 0 24 24" focusable="false">
                <path d="M7 11V8.6a5 5 0 0 1 10 0V11"></path>
                <rect x="5" y="11" width="14" height="10" rx="3"></rect>
              </svg>
            </span>
          `
          : ""
      }
      <button
        class="bridge-projects-table__thumb-refresh"
        type="button"
        aria-label="Refresh thumbnail for ${escapeHtml(project.name)}"
        data-tooltip="Refresh Image"
        data-project-thumbnail-refresh="${escapeHtml(project.id)}"
        ${isLoading ? "disabled" : ""}
      >
        <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
          <path d="M20 11a8 8 0 0 0-14.9-4H3.5"></path>
          <path d="M4 4v4h4"></path>
          <path d="M4 13a8 8 0 0 0 14.9 4H20.5"></path>
          <path d="M20 20v-4h-4"></path>
        </svg>
      </button>
    `;
  }

  function applyThumbnailCell(cell, project) {
    if (!cell || !project) {
      return;
    }

    const hasThumbnail = hasProjectThumbnail(project);
    const isLoading = state.thumbnailActiveProjectId === project.id;
    const thumbnailDataUrl = String(project.thumbnailDataUrl || "");
    const isImageReady = hasThumbnail && state.loadedThumbnailDataByProject.get(project.id) === thumbnailDataUrl;

    cell.className = `bridge-projects-table__thumb${hasThumbnail ? " is-ready" : ""}${isLoading ? " is-loading" : ""}${isImageReady ? " is-image-ready" : ""}`;
    cell.innerHTML = buildThumbnailCellMarkup(project);

    const image = cell.querySelector("[data-project-thumbnail-image]");

    if (!image) {
      return;
    }

    const markReady = () => {
      state.loadedThumbnailDataByProject.set(project.id, thumbnailDataUrl);
      cell.classList.add("is-image-ready");
    };

    if (image.complete && image.naturalWidth > 0) {
      markReady();
      return;
    }

    image.addEventListener("load", markReady, { once: true });
  }

  function syncProjectThumbnailCells(projectIds = []) {
    const ids = projectIds.length ? new Set(projectIds) : null;
    root.querySelectorAll("[data-project-thumbnail-cell]").forEach((cell) => {
      const projectId = cell.getAttribute("data-project-thumbnail-cell") || "";

      if (ids && !ids.has(projectId)) {
        return;
      }

      const project = state.projects.find((entry) => entry.id === projectId);

      if (project) {
        applyThumbnailCell(cell, project);
      }
    });
  }

  function getProjectSummaryCacheKey(projects) {
    return projects
      .map((project) => `${project.id}:${project.hasOverview ? "overview," : ""}${(project.pages || []).map((page) => page.id).join(",")}`)
      .join("|");
  }

  function readCachedProjectSummaries(projects) {
    try {
      const raw = sessionStorage.getItem(PROJECT_SUMMARY_CACHE_KEY);

      if (!raw) {
        return null;
      }

      const parsed = JSON.parse(raw);

      if (!parsed || parsed.expiresAt <= Date.now()) {
        sessionStorage.removeItem(PROJECT_SUMMARY_CACHE_KEY);
        return null;
      }

      if (parsed.key !== getProjectSummaryCacheKey(projects) || !parsed.entries) {
        return null;
      }

      return new Map(parsed.entries);
    } catch {
      return null;
    }
  }

  function writeCachedProjectSummaries(projects, summaryMap) {
    try {
      sessionStorage.setItem(
        PROJECT_SUMMARY_CACHE_KEY,
        JSON.stringify({
          key: getProjectSummaryCacheKey(projects),
          expiresAt: Date.now() + PROJECT_SUMMARY_CACHE_TTL_MS,
          entries: Array.from(summaryMap.entries()),
        }),
      );
    } catch {
      // Ignore storage issues and keep the page responsive.
    }
  }

  function stopProjectSummaryRefresh() {
    window.clearTimeout(state.summaryRefreshTimer);
    state.summaryRefreshTimer = 0;
  }

  function syncOpenMenuState() {
    root.querySelectorAll("[data-project-menu-toggle]").forEach((button) => {
      const projectId = button.getAttribute("data-project-menu-toggle") || "";
      const isOpen = Boolean(projectId && state.openMenuProjectId === projectId);
      button.setAttribute("aria-expanded", isOpen ? "true" : "false");
    });
    root.querySelectorAll("[data-project-owner-edit]").forEach((button) => {
      const projectId = button.getAttribute("data-project-owner-edit") || "";
      const isOpen = Boolean(projectId && state.ownerPickerProjectId === projectId);
      button.setAttribute("aria-expanded", isOpen ? "true" : "false");
    });
    renderFloatingProjectMenu();
    renderFloatingOwnerPicker();
  }

  function closeProjectMenu() {
    if (!state.openMenuProjectId && !state.openMenuPosition) {
      return;
    }

    state.openMenuProjectId = "";
    state.openMenuPosition = null;
    syncOpenMenuState();
  }

  function closeProjectOwnerPicker() {
    if (!state.ownerPickerProjectId && !state.ownerPickerPosition) {
      return;
    }

    state.ownerPickerProjectId = "";
    state.ownerPickerPosition = null;
    state.ownerPickerSearchQuery = "";
    syncOpenMenuState();
  }

  function closeSortPresetMenu() {
    if (!state.sortPresetMenuOpen) {
      return;
    }

    state.sortPresetMenuOpen = false;
  }

  function openProjectMenuForButton(button, projectId) {
    const rect = button.getBoundingClientRect();
    const menuWidth = 176;
    const menuHeight = 134;
    const gutter = 12;
    const spaceAbove = rect.top - gutter;
    const shouldOpenAbove = spaceAbove >= menuHeight;
    state.ownerPickerProjectId = "";
    state.ownerPickerPosition = null;
    state.ownerPickerSearchQuery = "";
    state.openMenuProjectId = projectId;
    state.openMenuPosition = {
      top: shouldOpenAbove ? rect.top - menuHeight - 8 : rect.bottom + 8,
      left: Math.min(
        Math.max(gutter, rect.right - menuWidth),
        window.innerWidth - menuWidth - gutter,
      ),
    };
    syncOpenMenuState();
  }

  function restoreOwnerPickerSearchFocus(selectionStart = null, selectionEnd = null) {
    window.requestAnimationFrame(() => {
      const searchInput = menuHost.querySelector("[data-project-owner-search]");

      if (!(searchInput instanceof HTMLInputElement)) {
        return;
      }

      searchInput.focus();

      if (typeof selectionStart === "number" && typeof selectionEnd === "number") {
        searchInput.setSelectionRange(selectionStart, selectionEnd);
      }
    });
  }

  function openProjectOwnerPickerForButton(button, projectId) {
    const rect = button.getBoundingClientRect();
    const pickerWidth = 320;
    const pickerHeight = 340;
    const gutter = 12;
    const spaceAbove = rect.top - gutter;
    const shouldOpenAbove = spaceAbove >= pickerHeight;
    state.openMenuProjectId = "";
    state.openMenuPosition = null;
    state.ownerPickerProjectId = projectId;
    state.ownerPickerSearchQuery = "";
    state.ownerPickerPosition = {
      top: shouldOpenAbove ? rect.top - pickerHeight - 8 : rect.bottom + 8,
      left: Math.min(
        Math.max(gutter, rect.left - 8),
        window.innerWidth - pickerWidth - gutter,
      ),
    };
    syncOpenMenuState();
    restoreOwnerPickerSearchFocus();
  }

  function renderFloatingProjectMenu() {
    if (!state.openMenuProjectId || !state.openMenuPosition) {
      menuHost.innerHTML = "";
      return;
    }

    const project = state.projects.find((entry) => entry.id === state.openMenuProjectId);

    if (!project) {
      menuHost.innerHTML = "";
      return;
    }

    const canManageIdentity = Boolean(project.canManageIdentity);
    const canDuplicateProject = state.canDuplicateProjects && project.kind === "dynamic";
    const menuItems = [
      canManageIdentity
        ? `
            <button
              class="bridge-projects-table__menu-item"
              type="button"
              role="menuitem"
              data-project-rename="${escapeHtml(project.id)}"
            >
              Rename Project
            </button>
          `
        : "",
      canDuplicateProject
        ? `
            <button
              class="bridge-projects-table__menu-item"
              type="button"
              role="menuitem"
              data-project-duplicate="${escapeHtml(project.id)}"
            >
              Duplicate
            </button>
          `
        : "",
      canManageIdentity
        ? `
            <button
              class="bridge-projects-table__menu-item bridge-projects-table__menu-item--danger"
              type="button"
              role="menuitem"
              data-project-delete="${escapeHtml(project.id)}"
            >
              Delete
            </button>
          `
        : "",
    ].filter(Boolean);

    if (!menuItems.length) {
      menuHost.innerHTML = "";
      return;
    }

    menuHost.innerHTML = `
      <div
        class="bridge-projects-table__menu bridge-projects-table__floating-menu"
        role="menu"
        aria-label="Project options"
        style="top:${Math.round(state.openMenuPosition.top)}px; left:${Math.round(state.openMenuPosition.left)}px;"
      >
        ${menuItems.join("")}
      </div>
    `;
  }

  function renderFloatingOwnerPicker() {
    if (!state.ownerPickerProjectId || !state.ownerPickerPosition) {
      if (!state.openMenuProjectId || !state.openMenuPosition) {
        menuHost.innerHTML = "";
      }
      return;
    }

    const project = state.projects.find((entry) => entry.id === state.ownerPickerProjectId);

    if (!project) {
      closeProjectOwnerPicker();
      return;
    }

    const filteredUsers = state.availableUsers.filter((candidate) => availableUserMatchesSearch(candidate, state.ownerPickerSearchQuery));
    menuHost.innerHTML = `
      <div
        class="bridge-projects-table__menu bridge-projects-table__floating-menu bridge-projects-table__owner-picker"
        data-project-owner-picker
        role="dialog"
        aria-label="Choose project owner"
        style="top:${Math.round(state.ownerPickerPosition.top)}px; left:${Math.round(state.ownerPickerPosition.left)}px;"
      >
        <div class="bridge-table-search-bar bridge-projects-table__owner-picker-search">
          <label class="bridge-table-search">
            <span class="bridge-table-search__icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" focusable="false">
                <circle cx="11" cy="11" r="6.5"></circle>
                <path d="m16 16 4 4"></path>
              </svg>
            </span>
            <input
              class="bridge-table-search__input"
              type="search"
              value="${escapeHtml(state.ownerPickerSearchQuery)}"
              placeholder="Search users"
              aria-label="Search users"
              data-project-owner-search
            />
          </label>
        </div>
        <div class="bridge-projects-table__owner-picker-list">
          ${
            filteredUsers.length
              ? filteredUsers
                  .map((candidate) => {
                    const isCurrentOwner = normalizeUserEmail(candidate.email) === normalizeUserEmail(project.ownerEmail);
                    const initials = getInitials(candidate.fullName || candidate.email || "User");
                    const avatarStyle = candidate.avatarColor ? ` style="--avatar-bg:${escapeHtml(candidate.avatarColor)}"` : "";
                    const avatarMarkup = candidate.avatarUrl
                      ? `<span class="bridge-projects-table__owner-avatar has-photo"${avatarStyle}><img src="${escapeHtml(candidate.avatarUrl)}" alt="" /></span>`
                      : `<span class="bridge-projects-table__owner-avatar"${avatarStyle}>${escapeHtml(initials)}</span>`;

                    return `
                      <button
                        class="bridge-projects-table__owner-picker-item${isCurrentOwner ? " is-current" : ""}"
                        type="button"
                        data-project-owner-option="${escapeHtml(project.id)}"
                        data-owner-email="${escapeHtml(candidate.email)}"
                        ${isCurrentOwner || state.updatingOwnerProjectId === project.id ? "disabled" : ""}
                      >
                        ${avatarMarkup}
                        <span class="bridge-projects-table__owner-picker-copy">
                          <strong>${highlightMatch(candidate.fullName || candidate.email, state.ownerPickerSearchQuery)}</strong>
                          <span>${highlightMatch(candidate.email, state.ownerPickerSearchQuery)}</span>
                        </span>
                        ${
                          isCurrentOwner
                            ? `<span class="bridge-projects-table__owner-picker-status">Current</span>`
                            : ""
                        }
                      </button>
                    `;
                  })
                  .join("")
              : `<div class="bridge-table-search__empty bridge-projects-table__owner-picker-empty">No users match your search.</div>`
          }
        </div>
      </div>
    `;
  }

  function renderDeleteProjectModal() {
    const deleteProjectIds = Array.isArray(state.bulkDeleteProjectIds) ? state.bulkDeleteProjectIds.filter(Boolean) : [];

    if (!deleteProjectIds.length) {
      modalHost.innerHTML = "";
      return;
    }

    const projectsToDelete = deleteProjectIds
      .map((projectId) => state.projects.find((entry) => entry.id === projectId))
      .filter(Boolean);

    if (!projectsToDelete.length) {
      modalHost.innerHTML = "";
      return;
    }

    const isBulkDelete = projectsToDelete.length > 1;
    const firstProject = projectsToDelete[0];

    modalHost.innerHTML = `
      <div class="bridge-project-delete__modal-shell" data-project-delete-overlay>
        <div class="bridge-project-delete__modal" role="dialog" aria-modal="true" aria-labelledby="project-delete-title">
          <div class="bridge-project-delete__head">
            <div>
              <p class="bridge-project-delete__eyebrow">Project action</p>
              <h2 id="project-delete-title">${isBulkDelete ? `Delete ${projectsToDelete.length} projects?` : `Delete ${escapeHtml(firstProject.name)}?`}</h2>
              <p>${isBulkDelete ? "This will remove the selected projects and their comments. This action can’t be undone." : "This will remove the project and its comments. This action can’t be undone."}</p>
            </div>
            <button class="bridge-project-delete__close" type="button" aria-label="Close delete dialog" data-close-project-delete>×</button>
          </div>
          ${
            isBulkDelete
              ? `
                <div class="bridge-project-delete__list">
                  ${projectsToDelete.map((project) => `<div class="bridge-project-delete__list-item">${escapeHtml(project.name)}</div>`).join("")}
                </div>
              `
              : ""
          }
          <div class="bridge-project-delete__actions">
            <button class="bridge-project-delete__button bridge-project-delete__button--secondary" type="button" data-close-project-delete ${state.bulkDeletingProjects ? "disabled" : ""}>Cancel</button>
            <button class="bridge-project-delete__button bridge-project-delete__button--danger" type="button" data-confirm-project-delete ${state.bulkDeletingProjects ? "disabled" : ""}>
              ${state.bulkDeletingProjects ? "Deleting..." : isBulkDelete ? "Delete projects" : "Delete project"}
            </button>
          </div>
        </div>
      </div>
    `;
  }

  function closeProjectRenameEditor({ preserveDraft = false } = {}) {
    if (!state.editingProjectId) {
      return;
    }

    if (!preserveDraft) {
      delete state.pendingProjectNameById[state.editingProjectId];
      delete state.pendingProjectDescriptionById[state.editingProjectId];
      delete state.dirtyProjectById[state.editingProjectId];
    }

    state.editingProjectId = "";
  }

  function syncProjectRenameSaveState(projectId = "") {
    if (!projectId) {
      return;
    }

    const project = state.projects.find((entry) => entry.id === projectId);
    const saveButton = root.querySelector(`[data-project-rename-save="${projectId}"]`);
    const renameInput = root.querySelector(`[data-project-rename-input="${projectId}"]`);
    const descriptionInput = root.querySelector(`[data-project-description-input="${projectId}"]`);

    if (!project || !(saveButton instanceof HTMLButtonElement)) {
      return;
    }

    saveButton.disabled = Boolean(state.renamingProjectId === projectId || !state.dirtyProjectById[projectId]);
  }

  function getActiveProjectSortPreset() {
    return state.sortKey === "recentOpen" ? "recentOpen" : "createdAt";
  }

  function getProjectSortPresetLabel() {
    return getActiveProjectSortPreset() === "recentOpen" ? "Most Recent" : "By Date";
  }

  function applyProjectSortPreset(preset = "recentOpen") {
    state.sortKey = preset === "recentOpen" ? "recentOpen" : "createdAt";
    state.sortDirection = "desc";
    closeSortPresetMenu();
  }

  function buildCommentsCellMarkup(project, commentSummary = createEmptyCommentSummary()) {
    const totalComments = Number(commentSummary.totalComments) || 0;
    const unreadComments = Number(commentSummary.unreadComments) || 0;
    const unreadMentions = Number(commentSummary.unreadMentions) || 0;
    const canShowUnreadBadge = projectAllowsUnreadBadge(project);
    const badges = [];

    const shouldShowNewBadge = canShowUnreadBadge && unreadComments > 0 && unreadComments !== unreadMentions;

    if (shouldShowNewBadge) {
      badges.push({
        count: unreadComments,
        label: "New",
        modifierClass: " bridge-projects-table__comments-badge--new",
      });
    }

    if (unreadMentions > 0) {
      badges.push({
        count: unreadMentions,
        label: unreadMentions === 1 ? "Mention" : "Mentions",
        modifierClass: " bridge-projects-table__comments-badge--mentions",
      });
    }

    const showBadgeStack = badges.length > 0;

    return `
      <div class="bridge-projects-table__comments${showBadgeStack ? " bridge-projects-table__comments--badge-only bridge-projects-table__comments--badge-stack" : ""}">
        ${
          showBadgeStack
            ? badges
                .map((badge) => {
                  const badgeCount = badge.count > 99 ? "99+" : badge.count;
                  return `<span class="bridge-projects-table__comments-badge${badge.modifierClass}"><span>${badgeCount}</span><span>${escapeHtml(badge.label)}</span></span>`;
                })
                .join("")
            : `<span class="bridge-projects-table__count">${totalComments}</span>`
        }
      </div>
    `;
  }

  function syncProjectCommentCells() {
    root.querySelectorAll("[data-project-comments-cell]").forEach((cell) => {
      const projectId = cell.getAttribute("data-project-comments-cell") || "";
      const project = state.projects.find((entry) => entry.id === projectId);
      const commentSummary = state.commentSummaryByProject.get(projectId) || createEmptyCommentSummary();
      cell.innerHTML = buildCommentsCellMarkup(project, commentSummary);
    });
  }

  function getSortedProjects() {
    const direction = state.sortDirection === "desc" ? -1 : 1;
    const projects = [...state.projects];

    projects.sort((left, right) => {
      let comparison = 0;

      if (state.sortKey === "owner") {
        comparison = String(left.ownerName || "").localeCompare(String(right.ownerName || ""), undefined, {
          sensitivity: "base",
        });
        if (!comparison) {
          comparison = String(left.name || "").localeCompare(String(right.name || ""), undefined, {
            sensitivity: "base",
          });
        }
      } else if (state.sortKey === "pages") {
        comparison = Number(left.pageCount || 0) - Number(right.pageCount || 0);
        if (!comparison) {
          comparison = String(left.name || "").localeCompare(String(right.name || ""), undefined, {
            sensitivity: "base",
          });
        }
      } else if (state.sortKey === "comments") {
        const leftSummary = state.commentSummaryByProject.get(left.id) || { totalComments: 0, unreadComments: 0 };
        const rightSummary = state.commentSummaryByProject.get(right.id) || { totalComments: 0, unreadComments: 0 };
        comparison = Number(leftSummary.totalComments || 0) - Number(rightSummary.totalComments || 0);
        if (!comparison) {
          comparison = Number(leftSummary.unreadComments || 0) - Number(rightSummary.unreadComments || 0);
        }
        if (!comparison) {
          comparison = String(left.name || "").localeCompare(String(right.name || ""), undefined, {
            sensitivity: "base",
          });
        }
      } else if (state.sortKey === "createdAt") {
        comparison = Number(left.createdAt || 0) - Number(right.createdAt || 0);
        if (!comparison) {
          comparison = String(left.name || "").localeCompare(String(right.name || ""), undefined, {
            sensitivity: "base",
          });
        }
      } else if (state.sortKey === "recentOpen") {
        comparison = getRecentProjectOpenTimestamp(left.id) - getRecentProjectOpenTimestamp(right.id);
        if (!comparison) {
          comparison = Number(left.createdAt || 0) - Number(right.createdAt || 0);
        }
        if (!comparison) {
          comparison = String(left.name || "").localeCompare(String(right.name || ""), undefined, {
            sensitivity: "base",
          });
        }
      } else {
        comparison = String(left.name || "").localeCompare(String(right.name || ""), undefined, {
          sensitivity: "base",
        });
        if (!comparison) {
          comparison = String(left.ownerName || "").localeCompare(String(right.ownerName || ""), undefined, {
            sensitivity: "base",
          });
        }
      }

      return comparison * direction;
    });

    return projects;
  }

  function getSortArrowMarkup(key) {
    if (state.sortKey !== key) {
      return `
        <span class="bridge-projects-table__sort-arrow is-idle" aria-hidden="true">
          <svg viewBox="0 0 16 16" focusable="false">
            <path d="M8 3.25v9.5"></path>
            <path d="M5.5 5.75 8 3.25l2.5 2.5"></path>
            <path d="M5.5 10.25 8 12.75l2.5-2.5"></path>
          </svg>
        </span>
      `;
    }

    if (state.sortDirection === "desc") {
      return `
        <span class="bridge-projects-table__sort-arrow" aria-hidden="true">
          <svg viewBox="0 0 16 16" focusable="false">
            <path d="M8 3.25v9.5"></path>
            <path d="M5.5 10.25 8 12.75l2.5-2.5"></path>
          </svg>
        </span>
      `;
    }

    return `
      <span class="bridge-projects-table__sort-arrow" aria-hidden="true">
        <svg viewBox="0 0 16 16" focusable="false">
          <path d="M8 3.25v9.5"></path>
          <path d="M5.5 5.75 8 3.25l2.5 2.5"></path>
        </svg>
      </span>
    `;
  }

  function render() {
    const statusMarkup = state.status
      ? `
          <div class="bridge-projects__toast${state.tone === "error" ? " bridge-projects__toast--error" : ""}${state.toastClosing ? " is-closing" : ""}" role="status" aria-live="polite">
            ${getToastIconMarkup(state.tone)}
            <span class="bridge-projects__toast-message">${escapeHtml(state.status)}</span>
            <button class="bridge-projects__toast-dismiss" type="button" aria-label="Dismiss notification" data-dismiss-status>
              <span aria-hidden="true">×</span>
            </button>
          </div>
        `
      : "";

    const createButtonMarkup = state.canCreateProjects
      ? `
          <button class="bridge-projects__create" type="button" data-create-project ${state.creating ? "disabled" : ""}>
            ${state.creating ? "Creating…" : "New Project"}
          </button>
        `
      : "";

    if (heroActionsRoot) {
      heroActionsRoot.innerHTML = createButtonMarkup;
    }

    const sortedProjects = state.loading ? [] : getSortedProjects();
    const filteredProjects = sortedProjects.filter((project) => projectMatchesSearch(project, state.searchQuery));
    const showSearch = !state.loading && state.projects.length > 5;
    const showActionsColumn = state.canDuplicateProjects || state.projects.some((project) => Boolean(project.canManageIdentity));
    const showBulkSelection = showActionsColumn && !state.loading && state.projects.length > 5;
    const showProjectsControls = !state.loading && state.projects.length > 5;
    const selectedProjectIds = getSelectedProjectIds();
    const selectedProjectCount = selectedProjectIds.length;
    const filteredProjectIds = filteredProjects.map((project) => project.id);
    const allFilteredSelected = filteredProjectIds.length ? filteredProjectIds.every((projectId) => selectedProjectIds.includes(projectId)) : false;
    const searchMarkup = showSearch
      ? `
          <div class="bridge-table-search-bar">
            <label class="bridge-table-search">
              <span class="bridge-table-search__icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" focusable="false">
                  <circle cx="11" cy="11" r="6.5"></circle>
                  <path d="m16 16 4 4"></path>
                </svg>
              </span>
              <input
                class="bridge-table-search__input"
                type="search"
                value="${escapeHtml(state.searchQuery)}"
                placeholder="Search projects"
                aria-label="Search projects"
                data-project-search
              />
            </label>
          </div>
        `
      : "";
    const sortPresetMarkup = showProjectsControls
      ? `
          <div class="bridge-table-sort" data-project-sort>
            <button
              class="bridge-table-sort__trigger"
              type="button"
              aria-haspopup="menu"
              aria-expanded="${state.sortPresetMenuOpen ? "true" : "false"}"
              data-project-sort-toggle
            >
              <span>${escapeHtml(getProjectSortPresetLabel())}</span>
              <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">
                <path d="m4 6 4 4 4-4"></path>
              </svg>
            </button>
            ${
              state.sortPresetMenuOpen
                ? `
                    <div class="bridge-projects-table__menu bridge-table-sort__menu" role="menu" aria-label="Sort projects">
                      <button
                        class="bridge-projects-table__menu-item${getActiveProjectSortPreset() === "recentOpen" ? " is-selected" : ""}"
                        type="button"
                        role="menuitemradio"
                        aria-checked="${getActiveProjectSortPreset() === "recentOpen" ? "true" : "false"}"
                        data-project-sort-option="recentOpen"
                      >
                        Most Recent
                      </button>
                      <button
                        class="bridge-projects-table__menu-item${getActiveProjectSortPreset() === "createdAt" ? " is-selected" : ""}"
                        type="button"
                        role="menuitemradio"
                        aria-checked="${getActiveProjectSortPreset() === "createdAt" ? "true" : "false"}"
                        data-project-sort-option="createdAt"
                      >
                        By Date
                      </button>
                    </div>
                  `
                : ""
            }
          </div>
        `
      : "";
    const controlsMarkup = showProjectsControls
      ? `
          <div class="bridge-table-controls">
            ${searchMarkup}
            ${sortPresetMarkup}
          </div>
        `
      : searchMarkup;
    const selectedProjects = getSelectedProjectIds()
      .map((projectId) => state.projects.find((project) => project.id === projectId))
      .filter(Boolean);
    const canBulkDeleteSelectedProjects =
      selectedProjects.length > 0 && selectedProjects.every((project) => Boolean(project.canManageIdentity));
    const bulkActionsMarkup =
      showBulkSelection && selectedProjectCount
        ? `
            <div class="bridge-table-bulk-bar">
              <span class="bridge-table-bulk-bar__count">${selectedProjectCount} selected</span>
              <div class="bridge-table-bulk-bar__actions">
                <button class="bridge-table-bulk-bar__button" type="button" data-project-bulk-duplicate ${state.bulkDuplicatingProjects || state.bulkDeletingProjects ? "disabled" : ""}>
                  ${state.bulkDuplicatingProjects ? "Duplicating..." : "Duplicate"}
                </button>
                ${
                  canBulkDeleteSelectedProjects
                    ? `
                        <button class="bridge-table-bulk-bar__button bridge-table-bulk-bar__button--danger" type="button" data-project-bulk-delete ${state.bulkDeletingProjects || state.bulkDuplicatingProjects ? "disabled" : ""}>
                          ${state.bulkDeletingProjects ? "Deleting..." : "Delete"}
                        </button>
                      `
                    : ""
                }
              </div>
            </div>
          `
        : "";

    const projectsMarkup = state.loading
      ? `
          <article class="bridge-projects__loading">
            <p>Loading projects…</p>
          </article>
        `
      : filteredProjects.length
      ? filteredProjects
          .map(
            (project) => {
              const commentSummary = state.commentSummaryByProject.get(project.id) || createEmptyCommentSummary();
              const ownerInitials = getInitials(project.ownerName || "Unknown");
              const ownerAvatarStyle = project.ownerAvatarColor ? ` style="--avatar-bg:${escapeHtml(project.ownerAvatarColor)}"` : "";
              const ownerAvatarMarkup = project.ownerAvatarUrl
                ? `<span class="bridge-projects-table__owner-avatar has-photo"${ownerAvatarStyle}><img src="${escapeHtml(project.ownerAvatarUrl)}" alt="" /></span>`
                : `<span class="bridge-projects-table__owner-avatar" aria-hidden="true"${ownerAvatarStyle}>${escapeHtml(ownerInitials)}</span>`;
              const canManageIdentity = Boolean(project.canManageIdentity);
              const canEditOwner = canManageIdentity && state.availableUsers.length > 0;
              const canDuplicateProject = state.canDuplicateProjects && project.kind === "dynamic";
              const canOpenProjectMenu = canManageIdentity || canDuplicateProject;
              const hasThumbnail = hasProjectThumbnail(project);
              const isThumbnailLoading = state.thumbnailActiveProjectId === project.id;
              const isEditingProject = state.editingProjectId === project.id;
              const isRenamingProject = state.renamingProjectId === project.id;
              const pendingProjectName = String(state.pendingProjectNameById[project.id] || project.name || "").trim();
              const pendingProjectDescription = String(
                state.pendingProjectDescriptionById[project.id] ?? project.description ?? "",
              );
              const isProjectDirty = Boolean(state.dirtyProjectById[project.id]);

              return `
              <tr
                class="bridge-projects-table__row${state.highlightedProjectId === project.id ? " is-newly-created" : ""}${state.exitingProjectId === project.id ? " is-deleting" : ""}"
                data-project-id="${escapeHtml(project.id)}"
                data-project-launch-url="${escapeHtml(project.launchUrl)}"
                data-project-locked="${project.isLocked ? "true" : "false"}"
                tabindex="0"
                role="link"
                aria-label="Open ${escapeHtml(project.name)}"
              >
                ${
                  showBulkSelection
                    ? `
                        <td class="bridge-table-select__cell">
                          <label class="bridge-table-select">
                            <input
                              type="checkbox"
                              aria-label="Select ${escapeHtml(project.name)}"
                              data-project-select="${escapeHtml(project.id)}"
                              ${isProjectSelected(project.id) ? "checked" : ""}
                            />
                            <span class="bridge-table-select__control" aria-hidden="true"></span>
                          </label>
                        </td>
                      `
                    : ""
                }
                <td class="bridge-projects-table__project-cell">
                  <div class="bridge-projects-table__project">
                    <div
                      class="bridge-projects-table__thumb${hasThumbnail ? " is-ready" : ""}${isThumbnailLoading ? " is-loading" : ""}"
                      data-project-thumbnail-cell="${escapeHtml(project.id)}"
                    >
                      ${buildThumbnailCellMarkup(project)}
                    </div>
                    <div class="bridge-projects-table__identity">
                      ${
                        isEditingProject && canManageIdentity
                          ? `
                            <div class="bridge-projects-table__rename-editor" data-project-rename-editor>
                              <div class="bridge-projects-table__rename-fields">
                                <div class="bridge-projects-table__field-wrap">
                                  <input
                                    class="bridge-projects-table__rename-input"
                                    type="text"
                                    value="${escapeHtml(state.pendingProjectNameById[project.id] || project.name)}"
                                    aria-label="Rename ${escapeHtml(project.name)}"
                                    data-project-rename-input="${escapeHtml(project.id)}"
                                    ${isRenamingProject ? "disabled" : ""}
                                  />
                                  <button
                                    class="bridge-projects-table__field-clear"
                                    type="button"
                                    aria-label="Clear project name"
                                    data-project-rename-clear="${escapeHtml(project.id)}"
                                    ${isRenamingProject ? "disabled" : ""}
                                  >
                                    <span aria-hidden="true">×</span>
                                  </button>
                                </div>
                                <div class="bridge-projects-table__field-wrap bridge-projects-table__field-wrap--textarea">
                                  <textarea
                                    class="bridge-projects-table__rename-textarea"
                                    aria-label="Edit description for ${escapeHtml(project.name)}"
                                    data-project-description-input="${escapeHtml(project.id)}"
                                    rows="2"
                                    ${isRenamingProject ? "disabled" : ""}
                                  >${escapeHtml(pendingProjectDescription)}</textarea>
                                  <button
                                    class="bridge-projects-table__field-clear bridge-projects-table__field-clear--textarea"
                                    type="button"
                                    aria-label="Clear project description"
                                    data-project-description-clear="${escapeHtml(project.id)}"
                                    ${isRenamingProject ? "disabled" : ""}
                                  >
                                    <span aria-hidden="true">×</span>
                                  </button>
                                </div>
                              </div>
                              <button
                                class="bridge-projects-table__rename-save"
                                type="button"
                                aria-label="Save project details for ${escapeHtml(project.name)}"
                                data-project-rename-save="${escapeHtml(project.id)}"
                                ${isRenamingProject || !isProjectDirty ? "disabled" : ""}
                              >
                                <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                                  <path d="M5.5 12.5 9.5 16.5 18.5 7.5"></path>
                                </svg>
                              </button>
                            </div>
                          `
                          : ""
                      }
                      ${
                        isEditingProject
                          ? ""
                          : `
                            <div class="bridge-projects-table__identity-top">
                                <strong>${highlightMatch(project.name, state.searchQuery)}</strong>
                              ${
                                canManageIdentity
                                  ? `
                                      <button
                                        class="bridge-inline-edit-trigger bridge-projects-table__edit-trigger"
                                        type="button"
                                        aria-label="Edit ${escapeHtml(project.name)}"
                                        data-project-edit-trigger="${escapeHtml(project.id)}"
                                      >
                                        <span class="bridge-inline-edit-trigger__tooltip" aria-hidden="true">Edit</span>
                                        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                                          <path d="m6.25 17.75 3.15-.5 8.5-8.5-2.65-2.65-8.5 8.5-.5 3.15Z"></path>
                                          <path d="m13.9 7.45 2.65 2.65"></path>
                                          <path d="M14.95 5.55 16.2 4.3a1.75 1.75 0 0 1 2.5 0l1 1a1.75 1.75 0 0 1 0 2.5l-1.25 1.25-3.5-3.5Z"></path>
                                        </svg>
                                      </button>
                                    `
                                  : ""
                              }
                            </div>
                            <span>${highlightMatch(project.description || "A project inside UX Bridge.", state.searchQuery)}</span>
                          `
                      }
                    </div>
                  </div>
                </td>
                <td class="bridge-projects-table__owner-cell">
                  <div class="bridge-projects-table__owner-control">
                    <span class="bridge-projects-table__owner-pill">
                      ${ownerAvatarMarkup}
                      <span>${highlightMatch(project.ownerName || "Unknown", state.searchQuery)}</span>
                    </span>
                    ${
                      canEditOwner
                        ? `
                          <button
                            class="bridge-inline-edit-trigger bridge-projects-table__owner-edit"
                            type="button"
                            aria-label="Edit owner for ${escapeHtml(project.name)}"
                            aria-haspopup="dialog"
                            aria-expanded="${state.ownerPickerProjectId === project.id ? "true" : "false"}"
                            data-project-owner-edit="${escapeHtml(project.id)}"
                          >
                            <span class="bridge-inline-edit-trigger__tooltip" aria-hidden="true">Edit</span>
                            <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                              <path d="m6.25 17.75 3.15-.5 8.5-8.5-2.65-2.65-8.5 8.5-.5 3.15Z"></path>
                              <path d="m13.9 7.45 2.65 2.65"></path>
                              <path d="M14.95 5.55 16.2 4.3a1.75 1.75 0 0 1 2.5 0l1 1a1.75 1.75 0 0 1 0 2.5l-1.25 1.25-3.5-3.5Z"></path>
                            </svg>
                          </button>
                        `
                        : ""
                    }
                  </div>
                </td>
                <td class="bridge-projects-table__pages-cell">
                  <span class="bridge-projects-table__count">${project.pageCount}</span>
                </td>
                <td class="bridge-projects-table__comments-cell" data-project-comments-cell="${escapeHtml(project.id)}">
                  ${buildCommentsCellMarkup(project, commentSummary)}
                </td>
                ${
                  showActionsColumn
                    ? `
                        <td class="bridge-projects-table__actions-cell">
                          ${
                            project.isLocked
                              ? `
                                <button
                                  class="bridge-projects-table__request"
                                  type="button"
                                  data-project-request-access="${escapeHtml(project.id)}"
                                  ${project.requestPending ? "disabled" : ""}
                                >
                                  ${project.requestPending ? "Requested" : "Request Access"}
                                </button>
                              `
                              : canOpenProjectMenu
                              ? `
                                <div class="bridge-projects-table__actions" data-project-actions>
                                  <button
                                    class="bridge-projects-table__menu-button"
                                    type="button"
                                    aria-haspopup="menu"
                                    aria-expanded="${state.openMenuProjectId === project.id ? "true" : "false"}"
                                    aria-label="Project options for ${escapeHtml(project.name)}"
                                    data-project-menu-toggle="${escapeHtml(project.id)}"
                                  >
                                    <span aria-hidden="true">⋮</span>
                                  </button>
                                </div>
                              `
                              : ""
                          }
                        </td>
                      `
                    : ""
                }
              </tr>
            `;
            },
          )
          .join("")
      : `
          <tr class="bridge-projects-table__empty-row">
            <td colspan="${showBulkSelection ? (showActionsColumn ? "6" : "5") : showActionsColumn ? "5" : "4"}">
              <div class="bridge-table-search__empty">No projects match your search.</div>
            </td>
          </tr>
        `;

    root.innerHTML = `
      ${statusMarkup}
      ${
        state.loading
          ? projectsMarkup
          : `
            ${controlsMarkup}
            ${bulkActionsMarkup}
            <div class="bridge-projects__table-shell">
              <table class="bridge-projects-table">
                <thead>
                  <tr>
                    ${
                      showBulkSelection
                        ? `
                            <th class="bridge-table-select__cell">
                              <label class="bridge-table-select">
                                <input
                                  type="checkbox"
                                  aria-label="Select all visible projects"
                                  data-project-select-all
                                  ${allFilteredSelected ? "checked" : ""}
                                />
                                <span class="bridge-table-select__control" aria-hidden="true"></span>
                              </label>
                            </th>
                          `
                        : ""
                    }
                    <th class="bridge-projects-table__project-cell">
                      <button class="bridge-projects-table__sort-button" type="button" data-sort-key="project">
                        <span>Projects (${filteredProjects.length})</span>
                        ${getSortArrowMarkup("project")}
                      </button>
                    </th>
                    <th class="bridge-projects-table__owner-cell">
                      <button class="bridge-projects-table__sort-button" type="button" data-sort-key="owner">
                        <span>Owner</span>
                        ${getSortArrowMarkup("owner")}
                      </button>
                    </th>
                    <th class="bridge-projects-table__pages-cell">
                      <button class="bridge-projects-table__sort-button" type="button" data-sort-key="pages">
                        <span>Pages</span>
                        ${getSortArrowMarkup("pages")}
                      </button>
                    </th>
                    <th class="bridge-projects-table__comments-cell">
                      <button class="bridge-projects-table__sort-button" type="button" data-sort-key="comments">
                        <span>Comments</span>
                        ${getSortArrowMarkup("comments")}
                      </button>
                    </th>
                    ${
                      showActionsColumn
                        ? `<th class="bridge-projects-table__actions-cell">Actions</th>`
                        : ""
                    }
                  </tr>
                </thead>
                <tbody>${projectsMarkup}</tbody>
              </table>
            </div>
        `
      }
    `;
    renderDeleteProjectModal();
    syncOpenMenuState();
  }

  function upsertProjectLocally(project) {
    if (!project || !project.id) {
      return;
    }

    const existingIndex = state.projects.findIndex((entry) => entry.id === project.id);

    if (existingIndex >= 0) {
      state.projects = state.projects.map((entry) => (entry.id === project.id ? project : entry));
    } else {
      state.projects = [project, ...state.projects];
    }

    if (!state.commentSummaryByProject.has(project.id)) {
      state.commentSummaryByProject.set(project.id, createEmptyCommentSummary());
    }
  }

  function removeProjectLocally(projectId) {
    if (!projectId) {
      return;
    }

    state.projects = state.projects.filter((entry) => entry.id !== projectId);
    state.commentSummaryByProject.delete(projectId);
    state.loadedThumbnailDataByProject.delete(projectId);

    if (state.openMenuProjectId === projectId) {
      closeProjectMenu();
    }

    if (state.editingProjectId === projectId) {
      closeProjectRenameEditor();
    }
  }

  function openProjectRenameEditor(projectId) {
    const project = state.projects.find((entry) => entry.id === projectId);

    if (!project) {
      return;
    }

    closeProjectMenu();
    state.pendingProjectNameById[projectId] = project.name || "";
    state.pendingProjectDescriptionById[projectId] = project.description || "";
    state.dirtyProjectById[projectId] = false;
    state.editingProjectId = projectId;
    render();
    const renameInput = root.querySelector(`[data-project-rename-input="${projectId}"]`);
    if (renameInput instanceof HTMLInputElement) {
      window.requestAnimationFrame(() => {
        renameInput.focus();
        renameInput.select();
      });
    }
  }

  async function loadProjects({ background = false } = {}) {
    if (!background) {
      state.loading = true;
      render();
    }

    const response = await fetch("/api/projects", {
      credentials: "include",
      cache: "no-store",
    });
    const payload = await response.json().catch(() => ({}));

    if (!response.ok || !payload?.ok) {
      throw new Error(payload?.error || "Unable to load projects.");
    }

    state.projects = Array.isArray(payload.projects) ? payload.projects : [];
    state.availableUsers = Array.isArray(payload.availableUsers) ? payload.availableUsers : [];
    const serverRecentProjectOpenById = normalizeRecentProjectOpenMap(payload.recentProjectOpenById);
    const localRecentProjectOpenById = readRecentProjectOpenMap();
    const mergedRecentProjectOpenById = mergeRecentProjectOpenMaps(serverRecentProjectOpenById, localRecentProjectOpenById);
    persistRecentProjectOpenMap(mergedRecentProjectOpenById);
    if (!recentProjectOpenMapsEqual(mergedRecentProjectOpenById, serverRecentProjectOpenById)) {
      syncRecentProjectOpenMapToServer(mergedRecentProjectOpenById);
    }
    syncProjectSelectionState();
    state.canCreateProjects = Boolean(payload.canCreateProjects);
    state.canDuplicateProjects = Boolean(payload.canDuplicateProjects);
    if (state.editingProjectId && !state.projects.some((project) => project.id === state.editingProjectId)) {
      closeProjectRenameEditor();
    }
    if (state.ownerPickerProjectId && !state.projects.some((project) => project.id === state.ownerPickerProjectId)) {
      closeProjectOwnerPicker();
    }
    state.commentSummaryByProject =
      readCachedProjectSummaries(state.projects) ||
      new Map(state.projects.map((project) => [project.id, createEmptyCommentSummary()]));
    state.loading = false;
    render();
    try {
      const shareToast = sessionStorage.getItem("ux-bridge-share-toast");
      if (shareToast) {
        sessionStorage.removeItem("ux-bridge-share-toast");
        setStatus(shareToast);
      }
    } catch {
      // Ignore storage issues.
    }
    queueCommentSummaryRefresh({ immediate: !readCachedProjectSummaries(state.projects) });
    state.thumbnailRefreshStarted = true;
    state.thumbnailFailures.clear();
    queueThumbnailRefresh();

    if (state.editingProjectId) {
      const renameInput = root.querySelector(`[data-project-rename-input="${state.editingProjectId}"]`);
      if (renameInput instanceof HTMLInputElement) {
        window.requestAnimationFrame(() => {
          renameInput.focus();
          renameInput.select();
        });
      }
    }
  }

  async function loadCommentSummaries(projects, requestToken = 0) {
    const specs = projects
      .map((project) => ({
        project: project.id,
        pages: [
          ...(project.hasOverview ? ["overview"] : []),
          ...((Array.isArray(project.pages) ? project.pages : []).map((page) => String(page.id || "").trim()).filter(Boolean)),
        ],
      }))
      .filter((entry) => entry.project && entry.pages.length);

    if (!specs.length) {
      const emptyMap = new Map(projects.map((project) => [project.id, createEmptyCommentSummary()]));
      writeCachedProjectSummaries(projects, emptyMap);
      return emptyMap;
    }

    try {
      const params = new URLSearchParams({
        summary: "projects",
        projects: JSON.stringify(specs),
      });
      const response = await fetch(`${COMMENTS_API}?${params.toString()}`, {
        credentials: "include",
        cache: "no-store",
      });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok || !payload?.ok || !Array.isArray(payload.projects)) {
        throw new Error("Unable to load project comment summaries.");
      }

      const summaryMap = new Map(projects.map((project) => [project.id, createEmptyCommentSummary()]));

      payload.projects.forEach((entry) => {
        const projectId = String(entry?.project || "").trim();
        const project = projects.find((candidate) => candidate.id === projectId);

        if (!projectId || !project) {
          return;
        }

        const summary = (Array.isArray(entry.summary) ? entry.summary : []).reduce(
          (accumulator, pageSummary) => {
            const pageId = String(pageSummary.page || "").trim();
            const localSeenState = readLocalSeenState(project.id, pageId);
            const payloadLastSeenAt = Number(pageSummary.lastSeenAt || 0);
            const resolvedLastSeenCommentId = String(pageSummary.lastSeenCommentId || "") || localSeenState.lastSeenCommentId;
            const countUnseenFromIds = (ids) => {
              if (!Array.isArray(ids) || !ids.length) {
                return 0;
              }

              if (!resolvedLastSeenCommentId) {
                return ids.length;
              }

              const lastSeenIndex = ids.findIndex((commentId) => commentId === resolvedLastSeenCommentId);
              return lastSeenIndex < 0 ? ids.length : Math.max(ids.length - (lastSeenIndex + 1), 0);
            };

            accumulator.totalComments += Number(pageSummary.count || 0);
            accumulator.unreadComments +=
              payloadLastSeenAt > 0
                ? Number(pageSummary.unreadCount || 0)
                : countUnseenFromIds(Array.isArray(pageSummary.commentIds) ? pageSummary.commentIds : []);
            accumulator.unreadMentions +=
              payloadLastSeenAt > 0
                ? Number(pageSummary.unreadMentionCount || 0)
                : countUnseenFromIds(Array.isArray(pageSummary.mentionCommentIds) ? pageSummary.mentionCommentIds : []);
            return accumulator;
          },
          createEmptyCommentSummary(),
        );

        summaryMap.set(projectId, summary);
      });

      if (requestToken && requestToken !== state.summaryRequestToken) {
        return null;
      }

      writeCachedProjectSummaries(projects, summaryMap);
      return summaryMap;
    } catch {
      return new Map(projects.map((project) => [project.id, createEmptyCommentSummary()]));
    }
  }

  async function refreshCommentSummaries() {
    if (state.loading || document.visibilityState !== "visible") {
      return;
    }

    const requestToken = Date.now();
    state.summaryRequestToken = requestToken;
    const nextSummaryMap = await loadCommentSummaries(state.projects, requestToken);

    if (!nextSummaryMap || state.summaryRequestToken !== requestToken) {
      return;
    }

    state.commentSummaryByProject = nextSummaryMap;

    if (state.loading || state.sortKey === "comments") {
      render();
      return;
    }

    syncProjectCommentCells();
  }

  function queueCommentSummaryRefresh({ immediate = false } = {}) {
    stopProjectSummaryRefresh();

    const run = () => {
      refreshCommentSummaries().catch(() => {
        // Keep existing summaries on summary refresh failures.
      });
      state.summaryRefreshTimer = window.setTimeout(run, PROJECT_SUMMARY_REFRESH_MS);
    };

    if (immediate) {
      run();
      return;
    }

    state.summaryRefreshTimer = window.setTimeout(run, 1200);
  }

  async function persistThumbnail(projectId, sourceUrl, imageDataUrl, mode = "auto") {
    const response = await fetch("/api/projects", {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        action: "updateThumbnail",
        project: projectId,
        sourceUrl,
        imageDataUrl,
        mode,
      }),
    });
    const payload = await response.json().catch(() => ({}));

    if (!response.ok || !payload?.ok || !payload?.project) {
      throw new Error(payload?.error || "Unable to update project thumbnail.");
    }

    return payload.project;
  }

  function finishThumbnailRefresh(projectId = "") {
    state.thumbnailActiveProjectId = "";
    state.thumbnailRequestToken = "";

    if (projectId) {
      syncProjectThumbnailCells([projectId]);
    }
  }

  function queueThumbnailRefresh(projectId = "", mode = "auto") {
    if (state.thumbnailActiveProjectId || document.visibilityState !== "visible") {
      return;
    }

    const nextProject = projectId
      ? state.projects.find((project) => project.id === projectId)
      : state.projects.find((project) => shouldRefreshProjectThumbnail(project));

    if (!nextProject) {
      return;
    }

    const requestToken = `${Date.now()}-${nextProject.id}`;
    state.thumbnailActiveProjectId = nextProject.id;
    state.thumbnailRequestToken = requestToken;
    syncProjectThumbnailCells([nextProject.id]);

    const frame = ensureThumbnailGeneratorFrame();

    const handleMessage = async (event) => {
      if (event.origin !== window.location.origin) {
        return;
      }

      const payload = event.data;

      if (!payload || payload.requestToken !== requestToken || payload.projectId !== nextProject.id) {
        return;
      }

      if (payload.type === "uxbridge:thumbnail-capture-failed") {
        window.removeEventListener("message", handleMessage);
        state.thumbnailFailures.add(nextProject.id);
        finishThumbnailRefresh(nextProject.id);
        queueThumbnailRefresh();
        return;
      }

      if (payload.type !== "uxbridge:thumbnail-captured" || !payload.imageDataUrl) {
        return;
      }

      window.removeEventListener("message", handleMessage);

      try {
        const updatedProject = await persistThumbnail(nextProject.id, payload.sourceUrl, payload.imageDataUrl, mode);
        state.loadedThumbnailDataByProject.delete(updatedProject.id);
        state.projects = state.projects.map((project) => (project.id === updatedProject.id ? updatedProject : project));
        syncProjectThumbnailCells([updatedProject.id]);
      } catch {
        state.thumbnailFailures.add(nextProject.id);
      } finally {
        finishThumbnailRefresh(nextProject.id);
        if (!projectId) {
          queueThumbnailRefresh();
        }
      }
    };

    window.addEventListener("message", handleMessage);
    frame.src = buildThumbnailGeneratorSrc(nextProject, requestToken);
  }

  async function handleCreateProject() {
    if (state.creating) {
      return;
    }

    state.creating = true;
    render();

    try {
      const response = await fetch("/api/projects", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "createProject",
        }),
      });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok || !payload?.ok) {
        throw new Error(payload?.error || "Unable to create project.");
      }

      state.creating = false;
      applyRecentProjectOpenMapFromPayload(payload);
      upsertProjectLocally(payload.project);
      spotlightProject(payload.project?.id || "");
      setStatus(`Created ${payload.project?.name || "new project"}.`);
      render();
      loadProjects({ background: true }).catch(() => {
        // Keep the in-place project row when the background refresh fails.
      });
    } catch (error) {
      state.creating = false;
      setStatus(error instanceof Error ? error.message : "Unable to create project.", "error");
    }
  }

  if (heroActionsRoot) {
    heroActionsRoot.addEventListener("click", async (event) => {
      const createButton = event.target.closest("[data-create-project]");

      if (!createButton) {
        return;
      }

      await handleCreateProject();
    });
  }

  async function handleProjectsClick(event) {
    const dismissButton = event.target.closest("[data-dismiss-status]");

    if (dismissButton) {
      clearStatus();
      return;
    }

    const createButton = event.target.closest("[data-create-project]");

    if (createButton) {
      await handleCreateProject();
      return;
    }

    const sortPresetToggle = event.target.closest("[data-project-sort-toggle]");

    if (sortPresetToggle) {
      event.preventDefault();
      event.stopPropagation();
      state.sortPresetMenuOpen = !state.sortPresetMenuOpen;
      render();
      return;
    }

    const sortPresetOption = event.target.closest("[data-project-sort-option]");

    if (sortPresetOption) {
      event.preventDefault();
      event.stopPropagation();
      applyProjectSortPreset(sortPresetOption.getAttribute("data-project-sort-option") || "recentOpen");
      render();
      return;
    }

    const sortButton = event.target.closest("[data-sort-key]");

    if (sortButton) {
      closeSortPresetMenu();
      const sortKey = sortButton.getAttribute("data-sort-key") || "";

      if (!sortKey) {
        return;
      }

      if (state.sortKey === sortKey) {
        if (state.sortDirection === "asc") {
          state.sortDirection = "desc";
        } else {
          state.sortKey = "recentOpen";
          state.sortDirection = "desc";
        }
      } else {
        state.sortKey = sortKey;
        state.sortDirection = "asc";
      }

      render();
      return;
    }

    const thumbnailRefreshButton = event.target.closest("[data-project-thumbnail-refresh]");

    if (thumbnailRefreshButton) {
      event.preventDefault();
      event.stopPropagation();
      const projectId = thumbnailRefreshButton.getAttribute("data-project-thumbnail-refresh") || "";

      if (!projectId || state.thumbnailActiveProjectId) {
        return;
      }

      state.thumbnailFailures.delete(projectId);
      queueThumbnailRefresh(projectId, "manual");
      return;
    }

    const requestAccessButton = event.target.closest("[data-project-request-access]");

    if (requestAccessButton) {
      event.preventDefault();
      event.stopPropagation();
      const projectId = requestAccessButton.getAttribute("data-project-request-access") || "";

      if (!projectId) {
        return;
      }

      try {
        const response = await fetch("/api/projects", {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            action: "requestAccess",
            project: projectId,
          }),
        });
        const payload = await response.json().catch(() => ({}));

        if (!response.ok || !payload?.ok) {
          throw new Error(payload?.error || "Unable to request project access.");
        }

        setStatus(payload.message || "Access request sent.");
        await loadProjects();
      } catch (error) {
        setStatus(error instanceof Error ? error.message : "Unable to request project access.", "error");
      }
      return;
    }

    const menuToggle = event.target.closest("[data-project-menu-toggle]");

    if (menuToggle) {
      closeProjectRenameEditor();
      const projectId = menuToggle.getAttribute("data-project-menu-toggle") || "";
      if (state.openMenuProjectId === projectId) {
        closeProjectMenu();
      } else {
        openProjectMenuForButton(menuToggle, projectId);
      }
      return;
    }

    const ownerEditButton = event.target.closest("[data-project-owner-edit]");

    if (ownerEditButton) {
      event.preventDefault();
      event.stopPropagation();
      closeProjectRenameEditor();
      const projectId = ownerEditButton.getAttribute("data-project-owner-edit") || "";
      if (state.ownerPickerProjectId === projectId) {
        closeProjectOwnerPicker();
      } else {
        openProjectOwnerPickerForButton(ownerEditButton, projectId);
      }
      return;
    }

    const bulkDuplicateButton = event.target.closest("[data-project-bulk-duplicate]");

    if (bulkDuplicateButton) {
      event.preventDefault();
      event.stopPropagation();
      const projectIds = getSelectedProjectIds();

      if (!projectIds.length) {
        return;
      }

      state.bulkDuplicatingProjects = true;
      render();

      try {
        for (const projectId of projectIds) {
          const response = await fetch("/api/projects", {
            method: "POST",
            credentials: "include",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              action: "duplicateProject",
              project: projectId,
            }),
          });
          const payload = await response.json().catch(() => ({}));

          if (!response.ok || !payload?.ok) {
            throw new Error(payload?.error || "Unable to duplicate selected projects.");
          }

          applyRecentProjectOpenMapFromPayload(payload);
          upsertProjectLocally(payload.project);
        }

        state.bulkDuplicatingProjects = false;
        state.selectedProjectIds = [];
        setStatus(`Duplicated ${projectIds.length} ${projectIds.length === 1 ? "project" : "projects"}.`);
        render();
        loadProjects({ background: true }).catch(() => {
          // Keep the current rows when the background refresh fails.
        });
      } catch (error) {
        state.bulkDuplicatingProjects = false;
        setStatus(error instanceof Error ? error.message : "Unable to duplicate selected projects.", "error");
        render();
      }
      return;
    }

    const bulkDeleteButton = event.target.closest("[data-project-bulk-delete]");

    if (bulkDeleteButton) {
      event.preventDefault();
      event.stopPropagation();
      const projectIds = getSelectedProjectIds();

      if (!projectIds.length) {
        return;
      }

      state.bulkDeleteProjectIds = projectIds;
      renderDeleteProjectModal();
      return;
    }

    const renameButton = event.target.closest("[data-project-rename]");

    if (renameButton) {
      event.preventDefault();
      event.stopPropagation();
      const projectId = renameButton.getAttribute("data-project-rename") || "";
      openProjectRenameEditor(projectId);
      return;
    }

    const editTriggerButton = event.target.closest("[data-project-edit-trigger]");

    if (editTriggerButton) {
      event.preventDefault();
      event.stopPropagation();
      const projectId = editTriggerButton.getAttribute("data-project-edit-trigger") || "";
      openProjectRenameEditor(projectId);
      return;
    }

    const clearNameButton = event.target.closest("[data-project-rename-clear]");

    if (clearNameButton) {
      event.preventDefault();
      event.stopPropagation();
      const projectId = clearNameButton.getAttribute("data-project-rename-clear") || "";
      const renameInput = root.querySelector(`[data-project-rename-input="${projectId}"]`);

      if (renameInput instanceof HTMLInputElement) {
        renameInput.value = "";
        state.pendingProjectNameById[projectId] = "";
        state.dirtyProjectById[projectId] = true;
        syncProjectRenameSaveState(projectId);
        renameInput.focus();
      }
      return;
    }

    const clearDescriptionButton = event.target.closest("[data-project-description-clear]");

    if (clearDescriptionButton) {
      event.preventDefault();
      event.stopPropagation();
      const projectId = clearDescriptionButton.getAttribute("data-project-description-clear") || "";
      const descriptionInput = root.querySelector(`[data-project-description-input="${projectId}"]`);

      if (descriptionInput instanceof HTMLTextAreaElement) {
        descriptionInput.value = "";
        state.pendingProjectDescriptionById[projectId] = "";
        state.dirtyProjectById[projectId] = true;
        syncProjectRenameSaveState(projectId);
        descriptionInput.focus();
      }
      return;
    }

    const renameSaveButton = event.target.closest("[data-project-rename-save]");

    if (renameSaveButton) {
      event.preventDefault();
      event.stopPropagation();
      const projectId = renameSaveButton.getAttribute("data-project-rename-save") || "";
      const project = state.projects.find((entry) => entry.id === projectId);
      const renameInput = root.querySelector(`[data-project-rename-input="${projectId}"]`);
      const descriptionInput = root.querySelector(`[data-project-description-input="${projectId}"]`);
      const nextName = String(renameInput instanceof HTMLInputElement ? renameInput.value : state.pendingProjectNameById[projectId] || "").trim();
      const nextDescription = String(
        descriptionInput instanceof HTMLTextAreaElement ? descriptionInput.value : state.pendingProjectDescriptionById[projectId] || "",
      ).trim();

      if (!projectId || !project) {
        return;
      }

      if (!nextName) {
        setStatus("Project name is required.", "error");
        if (renameInput instanceof HTMLInputElement) {
          renameInput.focus();
        }
        return;
      }

      if (nextName === String(project.name || "").trim()) {
        if (nextDescription === String(project.description || "").trim()) {
          closeProjectRenameEditor();
          render();
          return;
        }
      }

      state.renamingProjectId = projectId;
      render();

      try {
        const response = await fetch("/api/projects", {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            action: "renameProject",
            project: projectId,
            name: nextName,
            description: nextDescription,
          }),
        });
        const payload = await response.json().catch(() => ({}));

        if (!response.ok || !payload?.ok || !payload?.project) {
          throw new Error(payload?.error || "Unable to rename project.");
        }

        state.projects = state.projects.map((entry) => (entry.id === projectId ? payload.project : entry));
        closeProjectRenameEditor();
        state.renamingProjectId = "";
        setStatus(`Renamed project to ${payload.project.name}.`);
        render();
      } catch (error) {
        state.renamingProjectId = "";
        setStatus(error instanceof Error ? error.message : "Unable to rename project.", "error");
        render();
      }
      return;
    }

    const duplicateButton = event.target.closest("[data-project-duplicate]");

    if (duplicateButton) {
      const projectId = duplicateButton.getAttribute("data-project-duplicate") || "";
      closeProjectMenu();

      try {
        const response = await fetch("/api/projects", {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            action: "duplicateProject",
            project: projectId,
          }),
        });
        const payload = await response.json().catch(() => ({}));

        if (!response.ok || !payload?.ok) {
          throw new Error(payload?.error || "Unable to duplicate project.");
        }

        applyRecentProjectOpenMapFromPayload(payload);
        upsertProjectLocally(payload.project);
        setStatus(`Duplicated ${payload.project?.name || "project"}.`);
        render();
        loadProjects({ background: true }).catch(() => {
          // Keep the in-place project row when the background refresh fails.
        });
      } catch (error) {
        setStatus(error instanceof Error ? error.message : "Unable to duplicate project.", "error");
      }
      return;
    }

    const deleteButton = event.target.closest("[data-project-delete]");

    if (deleteButton) {
      const projectId = deleteButton.getAttribute("data-project-delete") || "";
      const project = state.projects.find((entry) => entry.id === projectId);

      if (!project) {
        return;
      }

      closeProjectMenu();
      state.bulkDeleteProjectIds = [projectId];
      renderDeleteProjectModal();
      return;
    }

    const ownerOptionButton = event.target.closest("[data-project-owner-option]");

    if (ownerOptionButton) {
      event.preventDefault();
      event.stopPropagation();
      const projectId = ownerOptionButton.getAttribute("data-project-owner-option") || "";
      const ownerEmail = ownerOptionButton.getAttribute("data-owner-email") || "";
      const project = state.projects.find((entry) => entry.id === projectId);

      if (!projectId || !ownerEmail || !project) {
        return;
      }

      state.updatingOwnerProjectId = projectId;
      renderFloatingOwnerPicker();

      try {
        const response = await fetch("/api/projects", {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            action: "updateProjectOwner",
            project: projectId,
            ownerEmail,
          }),
        });
        const payload = await response.json().catch(() => ({}));

        if (!response.ok || !payload?.ok || !payload?.project) {
          throw new Error(payload?.error || "Unable to update project owner.");
        }

        state.projects = state.projects.map((entry) => (entry.id === projectId ? payload.project : entry));
        state.updatingOwnerProjectId = "";
        closeProjectOwnerPicker();
        setStatus(`Updated owner for ${payload.project.name}.`);
        render();
      } catch (error) {
        state.updatingOwnerProjectId = "";
        setStatus(error instanceof Error ? error.message : "Unable to update project owner.", "error");
        renderFloatingOwnerPicker();
      }
      return;
    }

    if (event.target.closest("[data-project-owner-picker]")) {
      return;
    }

    const projectRow = event.target.closest("[data-project-launch-url]");

    if (!projectRow) {
      closeSortPresetMenu();
      closeProjectMenu();
      closeProjectOwnerPicker();
      return;
    }

    if (
      event.target.closest("[data-project-actions]") ||
      event.target.closest("[data-project-rename-editor]") ||
      event.target.closest(".bridge-table-select")
    ) {
      return;
    }

    if (event.target.closest("[data-project-thumbnail-refresh]")) {
      return;
    }

    if (projectRow.dataset.projectLocked === "true") {
      return;
    }

    if (state.editingProjectId) {
      return;
    }

    const launchUrl = projectRow.getAttribute("data-project-launch-url");
    const projectId = projectRow.getAttribute("data-project-id") || "";

    if (launchUrl) {
      markProjectRecentlyOpened(projectId, { useBeacon: true });
      window.location.href = launchUrl;
    }
  }

  root.addEventListener("click", handleProjectsClick);
  menuHost.addEventListener("click", handleProjectsClick);
  root.addEventListener("change", (event) => {
    const selectProjectInput = event.target.closest("[data-project-select]");

    if (selectProjectInput instanceof HTMLInputElement) {
      toggleProjectSelection(selectProjectInput.getAttribute("data-project-select") || "", selectProjectInput.checked);
      render();
      return;
    }

    const selectAllInput = event.target.closest("[data-project-select-all]");

    if (selectAllInput instanceof HTMLInputElement) {
      const filteredProjectIds = getSortedProjects()
        .filter((project) => projectMatchesSearch(project, state.searchQuery))
        .map((project) => project.id);
      const nextSelected = new Set(getSelectedProjectIds());

      if (selectAllInput.checked) {
        filteredProjectIds.forEach((projectId) => nextSelected.add(projectId));
      } else {
        filteredProjectIds.forEach((projectId) => nextSelected.delete(projectId));
      }

      state.selectedProjectIds = Array.from(nextSelected);
      render();
    }
  });
  modalHost.addEventListener("click", async (event) => {
    const confirmDeleteButton = event.target.closest("[data-confirm-project-delete]");

    if (confirmDeleteButton) {
      const projectIds = Array.isArray(state.bulkDeleteProjectIds) ? state.bulkDeleteProjectIds.filter(Boolean) : [];
      const projectsToDelete = projectIds
        .map((projectId) => state.projects.find((entry) => entry.id === projectId))
        .filter(Boolean);

      if (!projectsToDelete.length) {
        return;
      }

      state.bulkDeletingProjects = true;
      renderDeleteProjectModal();

      try {
        for (const project of projectsToDelete) {
          const response = await fetch("/api/projects", {
            method: "POST",
            credentials: "include",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              action: "deleteProject",
              project: project.id,
            }),
          });
          const payload = await response.json().catch(() => ({}));

          if (!response.ok || !payload?.ok) {
            throw new Error(payload?.error || "Unable to delete project.");
          }
        }

        const deletedProjectIds = new Set(projectIds);
        state.bulkDeleteProjectIds = [];
        state.bulkDeletingProjects = false;
        state.projects = state.projects.filter((project) => !deletedProjectIds.has(project.id));
        state.selectedProjectIds = getSelectedProjectIds().filter((projectId) => !deletedProjectIds.has(projectId));
        setStatus(`Deleted ${projectsToDelete.length} ${projectsToDelete.length === 1 ? "project" : "projects"}.`);
        render();
        loadProjects({ background: true }).catch(() => {
          // Keep the local removals when the background refresh fails.
        });
      } catch (error) {
        state.bulkDeletingProjects = false;
        setStatus(error instanceof Error ? error.message : "Unable to delete project.", "error");
        renderDeleteProjectModal();
      }
      return;
    }

    const closeButton = event.target.closest("[data-close-project-delete]");

    if (closeButton || event.target.closest("[data-project-delete-overlay]")) {
      if (event.target.closest(".bridge-project-delete__modal") && !closeButton) {
        return;
      }

      if (!state.bulkDeletingProjects) {
        state.bulkDeleteProjectIds = [];
        renderDeleteProjectModal();
      }
      return;
    }
  });

  root.addEventListener("keydown", (event) => {
    const renameInput = event.target.closest("[data-project-rename-input]");

    if (renameInput) {
      if (event.key === "Enter") {
        event.preventDefault();
        const projectId = renameInput.getAttribute("data-project-rename-input") || "";
        const saveButton = root.querySelector(`[data-project-rename-save="${projectId}"]`);
        if (saveButton instanceof HTMLButtonElement && !saveButton.disabled) {
          saveButton.click();
        }
      } else if (event.key === "Escape") {
        event.preventDefault();
        closeProjectRenameEditor();
        render();
      }
      return;
    }

    const descriptionInput = event.target.closest("[data-project-description-input]");

    if (descriptionInput) {
      if (event.key === "Enter") {
        event.preventDefault();
        const projectId = descriptionInput.getAttribute("data-project-description-input") || "";
        const saveButton = root.querySelector(`[data-project-rename-save="${projectId}"]`);
        if (saveButton instanceof HTMLButtonElement && !saveButton.disabled) {
          saveButton.click();
        }
      } else if (event.key === "Escape") {
        event.preventDefault();
        closeProjectRenameEditor();
        render();
      }
      return;
    }

    const projectRow = event.target.closest("[data-project-launch-url]");

    if (!projectRow) {
      return;
    }

    if (event.target.closest(".bridge-table-select")) {
      return;
    }

    if (event.key !== "Enter" && event.key !== " ") {
      return;
    }

    event.preventDefault();

    if (projectRow.dataset.projectLocked === "true") {
      return;
    }

    if (state.editingProjectId) {
      return;
    }

    const launchUrl = projectRow.getAttribute("data-project-launch-url");

    if (launchUrl) {
      const projectId = projectRow.getAttribute("data-project-id") || "";
      markProjectRecentlyOpened(projectId, { useBeacon: true });
      window.location.href = launchUrl;
    }
  });

  root.addEventListener("input", (event) => {
    const projectSearchInput = event.target.closest("[data-project-search]");

    if (projectSearchInput instanceof HTMLInputElement) {
      const selectionStart = projectSearchInput.selectionStart;
      const selectionEnd = projectSearchInput.selectionEnd;
      state.searchQuery = projectSearchInput.value;
      render();
      restoreProjectSearchFocus(selectionStart, selectionEnd);
      return;
    }

    const renameInput = event.target.closest("[data-project-rename-input]");

    if (renameInput) {
      const projectId = renameInput.getAttribute("data-project-rename-input") || "";
      state.pendingProjectNameById[projectId] = renameInput.value;
      state.dirtyProjectById[projectId] = true;
      syncProjectRenameSaveState(projectId);
      return;
    }

    const descriptionInput = event.target.closest("[data-project-description-input]");

    if (descriptionInput) {
      const projectId = descriptionInput.getAttribute("data-project-description-input") || "";
      state.pendingProjectDescriptionById[projectId] = descriptionInput.value;
      state.dirtyProjectById[projectId] = true;
      syncProjectRenameSaveState(projectId);
    }
  });

  menuHost.addEventListener("input", (event) => {
    const ownerSearchInput = event.target.closest("[data-project-owner-search]");

    if (ownerSearchInput instanceof HTMLInputElement) {
      const selectionStart = ownerSearchInput.selectionStart;
      const selectionEnd = ownerSearchInput.selectionEnd;
      state.ownerPickerSearchQuery = ownerSearchInput.value;
      renderFloatingOwnerPicker();
      restoreOwnerPickerSearchFocus(selectionStart, selectionEnd);
    }
  });

  document.addEventListener("click", (event) => {
    if (state.editingProjectId && !event.target.closest("[data-project-rename-editor]")) {
      closeProjectRenameEditor();
      render();
      return;
    }

    if (state.openMenuProjectId) {
      if (event.target.closest("[data-project-actions]") || event.target.closest(".bridge-projects-table__floating-menu")) {
        return;
      }

      closeProjectMenu();
      return;
    }

    if (state.ownerPickerProjectId) {
      if (event.target.closest("[data-project-owner-edit]") || event.target.closest("[data-project-owner-picker]")) {
        return;
      }

      closeProjectOwnerPicker();
    }

    if (state.sortPresetMenuOpen) {
      if (event.target.closest("[data-project-sort]")) {
        return;
      }

      closeSortPresetMenu();
      render();
    }
  });

  const handleWakeRefresh = () => {
    if (document.visibilityState !== "visible") {
      return;
    }

    queueCommentSummaryRefresh({ immediate: true });
  };

  document.addEventListener("visibilitychange", handleWakeRefresh);
  window.addEventListener("pageshow", handleWakeRefresh);
  window.addEventListener("focus", handleWakeRefresh);

  loadProjects().catch((error) => {
    state.loading = false;
    setStatus(error instanceof Error ? error.message : "Unable to load projects.", "error");
  });
})();
