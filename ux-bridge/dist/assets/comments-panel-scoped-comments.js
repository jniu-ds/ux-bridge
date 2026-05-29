(function initCommentsPanel() {
  const COMMENTS_API = "/api/comments";
  const ASSETS_API = "/api/assets";
  const COMMENT_SEEN_KEY_PREFIX = "ux-bridge-comments-seen";
  const COMMENTS_POLL_MS = 3000;
  const PAGE_LABELS = {
    "/project-overview.html": "Project Overview",
    "/building-preview.html": "Building overview",
    "/l1-bonus-preview.html": "L1 Bonus preview",
    "/l1-l2-bonus-preview.html": "L1/L2 Bonus preview",
  };
  const PAGE_KEYS = {
    "/project-overview.html": "overview",
    "/building-preview.html": "building",
    "/l1-bonus-preview.html": "l1-bonus",
    "/l1-l2-bonus-preview.html": "l1-l2-bonus",
  };
  const params = new URLSearchParams(window.location.search);
  const isTableThumbnail = params.get("table-thumb") === "1";

  const commentsRoot = document.querySelector("[data-comments-root]");
  const uploadsRoot = document.createElement("aside");
  const assetViewerRoot = document.createElement("div");
  const assetFileInput = document.createElement("input");
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
  const isDynamicProjectPage = document.body.dataset.dynamicProject === "true";

  if (!commentsRoot || isTableThumbnail) {
    return;
  }

  document.body.classList.add("bridge-body--has-comments");
  document.body.classList.add("bridge-body--has-uploads");

  if (!document.getElementById("ux-bridge-scoped-comments-style")) {
    const scopedCommentsStyle = document.createElement("style");
    scopedCommentsStyle.id = "ux-bridge-scoped-comments-style";
    scopedCommentsStyle.textContent = `
      .comments-panel__scope-label {
        display: inline-flex;
        align-items: center;
        max-width: 120px;
        min-height: 20px;
        padding: 2px 8px;
        border-radius: 999px;
        background: rgba(37, 99, 235, 0.08);
        color: #2563eb;
        font-size: 11px;
        font-weight: 700;
        line-height: 1.2;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .comments-panel__item.is-scoped .comments-panel__bubble {
        border-color: rgba(37, 99, 235, 0.18);
      }
    `;
    document.head.append(scopedCommentsStyle);
  }

  uploadsRoot.className = "uploads-panel";
  uploadsRoot.setAttribute("data-uploads-root", "");
  uploadsRoot.hidden = true;
  document.body.append(uploadsRoot);

  assetViewerRoot.className = "asset-viewer";
  assetViewerRoot.setAttribute("data-asset-viewer-root", "");
  assetViewerRoot.hidden = true;
  document.body.append(assetViewerRoot);

  assetFileInput.type = "file";
  assetFileInput.multiple = true;
  assetFileInput.hidden = true;
  assetFileInput.className = "comments-panel__file-input";
  assetFileInput.setAttribute("data-comments-file-input", "");
  document.body.append(assetFileInput);

  const state = {
    projectKey: "",
    pageKey: "",
    pageLabel: "",
    drawerOpen: false,
    comments: [],
    users: [],
    isLoading: true,
    isSubmitting: false,
    error: "",
    body: "",
    mention: null,
    mentionIndex: 0,
    refreshTimer: null,
    unseenCount: 0,
    editingCommentId: "",
    editingCommentBody: "",
    busyCommentId: "",
    copiedCommentId: "",
    shouldStickToBottom: true,
    pageCommentSummary: new Map(),
    refreshTick: 0,
    currentPageActivityAt: "",
    pendingAssets: [],
    uploads: [],
    uploadsLoading: false,
    uploadsError: "",
    uploadsDrawerOpen: false,
    assetViewerAsset: null,
    assetViewerItems: [],
    assetViewerIndex: 0,
    assetViewerScaleMode: "fit",
    assetViewerScaleMenuOpen: false,
    lastSeenCommentId: "",
    lastSeenAt: 0,
    lastPersistedSeenCommentId: "",
    lastPersistedSeenAt: 0,
    canDeleteAnyComment: false,
    commentsRequestToken: 0,
    summaryRequestToken: 0,
    scopedLayer: null,
    scopedHoverElement: null,
  };

  function getPreviewRenderContainer() {
    const renderRoot = document.querySelector("[data-vibe-mobile-render]");

    if (renderRoot instanceof Element) {
      return renderRoot;
    }

    const fallbackRoot = document.querySelector(".vibe-mobile-stage, .mobile-page");
    return fallbackRoot instanceof Element ? fallbackRoot : null;
  }

  function getPreviewRenderRoot() {
    const container = getPreviewRenderContainer();
    const generatedRoot = container?.querySelector?.(".vibe-generated-page");

    if (generatedRoot instanceof Element) {
      return generatedRoot;
    }

    const fallbackRoot = document.querySelector(".mobile-page .vibe-generated-page, .vibe-mobile-stage .vibe-generated-page");
    return fallbackRoot instanceof Element ? fallbackRoot : null;
  }

  function getPreviewLayerPathForElement(element) {
    const container = getPreviewRenderContainer();

    if (!(container instanceof Element) || !(element instanceof Element) || !container.contains(element)) {
      return "";
    }

    const segments = [];
    let current = element;

    while (current && current !== container) {
      const parent = current.parentElement;

      if (!parent) {
        return "";
      }

      segments.unshift(Array.from(parent.children).indexOf(current));
      current = parent;
    }

    return segments.join(".");
  }

  function getPreviewElementForLayerPath(layerPath) {
    const container = getPreviewRenderContainer();
    const segments = String(layerPath || "")
      .split(".")
      .map((segment) => Number(segment))
      .filter((segment) => Number.isInteger(segment) && segment >= 0);

    if (!(container instanceof Element) || !segments.length) {
      return null;
    }

    let current = container;

    for (const segment of segments) {
      const next = current.children?.[segment];

      if (!(next instanceof Element)) {
        return null;
      }

      current = next;
    }

    return current instanceof Element ? current : null;
  }

  function getSelectedPreviewElement() {
    const root = getPreviewRenderRoot();

    if (!(root instanceof Element)) {
      return null;
    }

    if (root.matches('[data-ux-layer-selected]:not([data-ux-layer-selected="false"])')) {
      return root;
    }

    return root.querySelector('[data-ux-layer-selected]:not([data-ux-layer-selected="false"])');
  }

  function getLayerLabelForElement(element) {
    if (!(element instanceof Element)) {
      return "";
    }

    const className = String(element.getAttribute("class") || "")
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 3)
      .join(".");
    const tagName = element.tagName.toLowerCase();
    return className ? `${tagName}.${className}` : tagName;
  }

  function getScopedLayerForSelectedElement() {
    const element = getSelectedPreviewElement();
    const path = getPreviewLayerPathForElement(element);

    if (!path || !(element instanceof Element)) {
      return null;
    }

    return {
      path,
      label: getLayerLabelForElement(element),
      tagName: element.tagName.toLowerCase(),
    };
  }

  function normalizeScopedLayer(value) {
    if (!value || typeof value !== "object") {
      return null;
    }

    const path = String(value.path || value.layerPath || "").trim();

    if (!path) {
      return null;
    }

    const element = getPreviewElementForLayerPath(path);
    return {
      path,
      label: String(value.label || getLayerLabelForElement(element) || "Layer").trim(),
      tagName: String(value.tagName || element?.tagName || "").trim().toLowerCase(),
    };
  }

  function dispatchPreviewMouseEvent(element, type, relatedTarget = document.body) {
    if (!(element instanceof Element)) {
      return;
    }

    const rect = element.getBoundingClientRect();
    const clientX = rect.left + Math.max(1, Math.min(rect.width / 2, Math.max(1, rect.width - 1)));
    const clientY = rect.top + Math.max(1, Math.min(rect.height / 2, Math.max(1, rect.height - 1)));

    element.dispatchEvent(
      new MouseEvent(type, {
        bubbles: true,
        cancelable: true,
        composed: true,
        view: window,
        relatedTarget,
        clientX,
        clientY,
      }),
    );
  }

  function activateScopedCommentHover(layerPath) {
    const element = getPreviewElementForLayerPath(layerPath);

    if (!(element instanceof Element)) {
      return;
    }

    if (state.scopedHoverElement && state.scopedHoverElement !== element) {
      clearScopedCommentHover();
    }

    state.scopedHoverElement = element;
    dispatchPreviewMouseEvent(element, "mouseover");
  }

  function clearScopedCommentHover() {
    const element = state.scopedHoverElement;
    state.scopedHoverElement = null;

    if (element instanceof Element) {
      dispatchPreviewMouseEvent(element, "mouseout");
    }
  }

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

  function getCurrentUserEmail() {
    return String(getKnownUser()?.email || "").trim().toLowerCase();
  }

  function getSeenStorageKey(pageKey = state.pageKey) {
    const user = getKnownUser();
    const email = String(user?.email || "anonymous").trim().toLowerCase();
    return `${COMMENT_SEEN_KEY_PREFIX}:${email}:${state.projectKey}:${pageKey}`;
  }

  function readLocalSeenState(pageKey = state.pageKey) {
    try {
      const raw = localStorage.getItem(getSeenStorageKey(pageKey));

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

  function writeLocalSeenState(commentId, seenAt = 0, pageKey = state.pageKey) {
    try {
      if (!commentId && !seenAt) {
        localStorage.removeItem(getSeenStorageKey(pageKey));
        return;
      }

      localStorage.setItem(
        getSeenStorageKey(pageKey),
        JSON.stringify({
          lastSeenCommentId: String(commentId || "").trim(),
          lastSeenAt: Number(seenAt) || 0,
        }),
      );
    } catch {
      // Ignore storage issues and keep UI responsive.
    }
  }

  function commentSeenTimestamp(comment) {
    const createdAt = Date.parse(String(comment?.createdAt || ""));
    if (Number.isFinite(createdAt)) {
      return createdAt;
    }

    const editedAt = Date.parse(String(comment?.editedAt || ""));
    return Number.isFinite(editedAt) ? editedAt : 0;
  }

  function getUnseenCountForComments(comments, lastSeenAt = state.lastSeenAt, treatAsSeen = false) {
    const commentList = Array.isArray(comments) ? comments : [];

    if (!commentList.length) {
      return 0;
    }

    if (treatAsSeen) {
      return 0;
    }

    return commentList.reduce(
      (count, comment) => count + (commentSeenTimestamp(comment) > Number(lastSeenAt || 0) ? 1 : 0),
      0,
    );
  }

  function updateUnseenCount() {
    state.unseenCount = getUnseenCountForComments(state.comments, state.lastSeenAt, state.drawerOpen);
  }

  function getLatestActivityAt(comments) {
    const latestActivity = (Array.isArray(comments) ? comments : []).reduce((latest, comment) => {
      const timestamp = new Date(comment.editedAt || comment.createdAt || 0).getTime();
      return Number.isNaN(timestamp) ? latest : Math.max(latest, timestamp);
    }, 0);

    return latestActivity ? new Date(latestActivity).toISOString() : "";
  }

  function syncCurrentPageActivity() {
    const currentPageSummary = state.pageCommentSummary.get(state.pageKey);
    state.currentPageActivityAt = String(currentPageSummary?.latestActivityAt || "");
  }

  async function markCommentsSeen() {
    const latestComment = state.comments.at(-1) || null;
    const latestCommentId = String(latestComment?.id || "");
    const nextSeenAt = commentSeenTimestamp(latestComment);
    state.lastSeenCommentId = latestCommentId;
    state.lastSeenAt = nextSeenAt;
    state.unseenCount = 0;
    writeLocalSeenState(latestCommentId, nextSeenAt);

    if (
      latestCommentId === state.lastPersistedSeenCommentId &&
      nextSeenAt === Number(state.lastPersistedSeenAt || 0)
    ) {
      return;
    }

    if (!state.projectKey || !state.pageKey) {
      return;
    }

    try {
      await fetch(COMMENTS_API, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "markSeen",
          project: state.projectKey,
          page: state.pageKey,
          commentId: latestCommentId,
        }),
      });
      state.lastPersistedSeenCommentId = latestCommentId;
      state.lastPersistedSeenAt = nextSeenAt;
    } catch {
      // Keep the optimistic UI state and retry on the next fetch/open cycle.
    }
  }

  function getRefreshDelay() {
    if (state.drawerOpen || state.unseenCount > 0 || state.uploadsDrawerOpen) {
      return COMMENTS_POLL_MS;
    }

    const latestActivityAt = Date.parse(String(state.currentPageActivityAt || ""));
    if (Number.isFinite(latestActivityAt) && Date.now() - latestActivityAt < 60_000) {
      return COMMENTS_POLL_MS;
    }

    return 10_000;
  }

  function getNavPageKeys() {
    return Array.from(document.querySelectorAll("[data-project-page-key]"))
      .map((node) => String(node.dataset.projectPageKey || "").trim())
      .filter(Boolean);
  }

  function ensureNavBadge(linkNode) {
    let badgeNode = linkNode.querySelector("[data-nav-comments-badge]");

    if (badgeNode) {
      return badgeNode;
    }

    badgeNode = document.createElement("span");
    badgeNode.className = "bridge-sidebar__comments-badge";
    badgeNode.setAttribute("data-nav-comments-badge", "");
    badgeNode.hidden = true;
    linkNode.append(badgeNode);
    return badgeNode;
  }

  function renderNavCommentBadges() {
    document.querySelectorAll("[data-project-page-key]").forEach((linkNode) => {
      const pageKey = String(linkNode.dataset.projectPageKey || "").trim();

      if (!pageKey) {
        return;
      }

      const badgeNode = ensureNavBadge(linkNode);
      const pageSummary = state.pageCommentSummary.get(pageKey);
      const unseenCount =
        pageKey === state.pageKey
          ? getUnseenCountForComments(state.comments, state.lastSeenAt, state.drawerOpen)
          : Number(pageSummary?.unreadCount || 0);

      if (!unseenCount) {
        badgeNode.hidden = true;
        badgeNode.textContent = "";
        return;
      }

      badgeNode.hidden = false;
      badgeNode.textContent = String(unseenCount > 99 ? "99+" : unseenCount);
    });
  }

  function resolveContext() {
    const pagePath = window.location.pathname;
    const projectKey = document.body.dataset.projectKey || "brand-affiliate-mobile";
    const pageKey = document.body.dataset.pageKey || PAGE_KEYS[pagePath];
    const pageLabel =
      document.body.dataset.pageLabel ||
      PAGE_LABELS[pagePath] ||
      document.querySelector(".bridge-project-toolbar h1")?.textContent?.trim() ||
      "Page";

    return {
      projectKey,
      pageKey,
      pageLabel,
    };
  }

  function escapeHtml(value) {
    return String(value || "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }

  function escapeAttribute(value) {
    return escapeHtml(value).replaceAll("`", "&#96;");
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

  function formatTimestamp(value) {
    const timestamp = new Date(value);

    if (Number.isNaN(timestamp.getTime())) {
      return "";
    }

    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(timestamp);
  }

  function formatFileSize(value) {
    const size = Number(value) || 0;

    if (size >= 1024 * 1024) {
      return `${(size / (1024 * 1024)).toFixed(1)} MB`;
    }

    if (size >= 1024) {
      return `${Math.max(size / 1024, 0.1).toFixed(1)} KB`;
    }

    return `${size} B`;
  }

  function normalizeAssetKind(asset) {
    return String(asset?.kind || "").trim().toLowerCase();
  }

  function isImageAsset(asset) {
    return normalizeAssetKind(asset) === "image";
  }

  function isVideoAsset(asset) {
    return normalizeAssetKind(asset) === "video";
  }

  function isPdfAsset(asset) {
    return normalizeAssetKind(asset) === "pdf";
  }

  function getAssetDownloadUrl(asset) {
    const assetId = String(asset?.id || "").trim();

    if (assetId) {
      return `${ASSETS_API}?assetId=${encodeURIComponent(assetId)}`;
    }

    return String(asset?.previewUrl || "").trim();
  }

  function getAssetExtension(asset) {
    const fileName = String(asset?.fileName || "").trim();
    const extension = fileName.includes(".") ? fileName.split(".").pop() : "";
    return String(extension || normalizeAssetKind(asset) || "file").toUpperCase().slice(0, 6);
  }

  function getPageLabelForKey(pageKey = "") {
    if (pageKey === state.pageKey) {
      return state.pageLabel;
    }

    const normalized = String(pageKey || "").trim().toLowerCase();

    if (!normalized) {
      return "Page";
    }

    const pathname = Object.keys(PAGE_KEYS).find((key) => PAGE_KEYS[key] === normalized);
    return pathname ? PAGE_LABELS[pathname] || "Page" : normalized.replaceAll("-", " ");
  }

  function readFileAsDataUrl(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ""));
      reader.onerror = () => reject(new Error(`Could not read ${file?.name || "file"}.`));
      reader.readAsDataURL(file);
    });
  }

  function createPendingAssetRecord(file, dataUrl) {
    return {
      id: `pending-${crypto.randomUUID()}`,
      fileName: String(file?.name || "Upload").trim() || "Upload",
      contentType: String(file?.type || "application/octet-stream").trim() || "application/octet-stream",
      sizeBytes: Number(file?.size) || 0,
      kind: String(file?.type || "").startsWith("image/")
        ? "image"
        : String(file?.type || "").startsWith("video/")
        ? "video"
        : String(file?.type || "").trim().toLowerCase() === "application/pdf"
        ? "pdf"
        : "file",
      previewUrl: String(dataUrl || "").trim(),
      dataBase64: String(dataUrl || "").includes(",") ? String(dataUrl).split(",")[1] : "",
      createdAt: Date.now(),
      pageId: state.pageKey,
    };
  }

  function formatCommentMeta(comment) {
    const base = formatTimestamp(comment.createdAt);

    if (comment.editedAt) {
      return `${base} · edited`;
    }

    return base;
  }

  function getCommentsSignature(comments) {
    return comments
      .map((comment) =>
        [
          comment.id,
          comment.createdAt,
          comment.editedAt || "",
          comment.body || "",
          comment.author?.email || "",
        ].join("::"),
      )
      .join("|");
  }

  function getUsersSignature(users) {
    return users
      .map((user) => [user.email || "", user.fullName || "", user.role || ""].join("::"))
      .join("|");
  }

  function shouldGroupWithPrevious(comment, previousComment) {
    if (!comment || !previousComment) {
      return false;
    }

    const currentAuthor = String(comment.author?.email || "").trim().toLowerCase();
    const previousAuthor = String(previousComment.author?.email || "").trim().toLowerCase();

    if (!currentAuthor || currentAuthor !== previousAuthor) {
      return false;
    }

    const currentTime = new Date(comment.createdAt).getTime();
    const previousTime = new Date(previousComment.createdAt).getTime();

    if (Number.isNaN(currentTime) || Number.isNaN(previousTime)) {
      return false;
    }

    return currentTime - previousTime <= 10 * 60 * 1000;
  }

  function buildMentionRegex(mentions) {
    const names = mentions
      .map((mention) => mention?.fullName)
      .filter(Boolean)
      .sort((left, right) => right.length - left.length)
      .map((name) => name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));

    if (!names.length) {
      return null;
    }

    return new RegExp(`@(${names.join("|")})`, "gi");
  }

  function renderCommentBody(body, mentions = []) {
    const safeBody = escapeHtml(body).replace(/\n/g, "<br />");
    const mentionPattern = buildMentionRegex(mentions);

    if (!mentionPattern) {
      return safeBody;
    }

    return safeBody.replace(mentionPattern, (match) => `<span class="comments-panel__mention">${match}</span>`);
  }

  function getMentionContext(text, caretPosition) {
    const beforeCaret = text.slice(0, caretPosition);
    const atIndex = beforeCaret.lastIndexOf("@");

    if (atIndex < 0) {
      return null;
    }

    const prefixCharacter = beforeCaret[atIndex - 1];

    if (prefixCharacter && !/\s/.test(prefixCharacter)) {
      return null;
    }

    const rawQuery = beforeCaret.slice(atIndex + 1);

    if (rawQuery.includes("\n") || rawQuery.includes("@")) {
      return null;
    }

    if (/\s{2,}/.test(rawQuery)) {
      return null;
    }

    const query = rawQuery.trimStart().toLowerCase();
    const suggestions = state.users
      .filter((user) => {
        if (!query) {
          return true;
        }

        const haystack = [user.fullName, user.email].join(" ").toLowerCase();
        return haystack.includes(query);
      })
      .slice(0, 6);

    if (!suggestions.length) {
      return null;
    }

    return {
      start: atIndex,
      end: caretPosition,
      suggestions,
    };
  }

  function syncDrawerState() {
    document.body.classList.toggle("comments-open", state.drawerOpen);
    commentsRoot.inert = !state.drawerOpen;
    const toggle = document.querySelector("[data-comments-drawer-toggle]");

    if (toggle) {
      toggle.setAttribute("aria-expanded", state.drawerOpen ? "true" : "false");
      toggle.setAttribute("aria-hidden", state.drawerOpen ? "true" : "false");
    }

    syncMobileSheetBackdrop();
  }

  function setDrawerOpen(nextOpen, source = "comments") {
    if (state.drawerOpen === nextOpen) {
      return;
    }

    state.drawerOpen = nextOpen;

    if (state.drawerOpen) {
      state.shouldStickToBottom = true;
      state.scopedLayer = getScopedLayerForSelectedElement();
      markCommentsSeen();
    } else {
      clearScopedCommentHover();
      updateUnseenCount();
    }

    renderToggleBadge();
    syncDrawerState();

    if (state.drawerOpen) {
      window.dispatchEvent(
        new CustomEvent("uxbridge:drawer-open", {
          detail: { drawer: source },
        }),
      );
    }
  }

  async function queueFiles(fileList) {
    const files = Array.from(fileList || []).filter(Boolean);

    if (!files.length) {
      return;
    }

    try {
      const nextAssets = await Promise.all(
        files.map(async (file) => createPendingAssetRecord(file, await readFileAsDataUrl(file))),
      );
      state.pendingAssets = [...state.pendingAssets, ...nextAssets];
      state.error = "";
      render();
    } catch (error) {
      state.error = error instanceof Error ? error.message : "Could not add file.";
      render();
    } finally {
      assetFileInput.value = "";
    }
  }

  function removePendingAsset(assetId) {
    state.pendingAssets = state.pendingAssets.filter((asset) => asset.id !== assetId);
    render();
  }

  async function uploadPendingAssets() {
    const uploadedAssets = [];

    try {
      for (const asset of state.pendingAssets) {
        const response = await fetch(ASSETS_API, {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            action: "uploadAsset",
            project: state.projectKey,
            page: state.pageKey,
            fileName: asset.fileName,
            contentType: asset.contentType,
            dataBase64: asset.dataBase64,
          }),
        });
        const payload = await response.json();

        if (!response.ok || !payload?.ok || !payload.asset) {
          throw new Error(payload?.error || `Could not upload ${asset.fileName}.`);
        }

        uploadedAssets.push(payload.asset);
      }
    } catch (error) {
      await rollbackUploadedAssets(uploadedAssets);
      throw error;
    }

    return uploadedAssets;
  }

  async function rollbackUploadedAssets(assets) {
    await Promise.all(
      (Array.isArray(assets) ? assets : []).map(async (asset) => {
        if (!asset?.id) {
          return;
        }

        try {
          await fetch(ASSETS_API, {
            method: "POST",
            credentials: "include",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              action: "deleteAsset",
              assetId: asset.id,
            }),
          });
        } catch {
          // Best-effort cleanup only.
        }
      }),
    );
  }

  async function fetchAssets(options = {}) {
    const { silent = false } = options;

    if (!silent) {
      state.uploadsLoading = true;
      state.uploadsError = "";
      renderUploadsDrawer();
    }

    try {
      const response = await fetch(`${ASSETS_API}?project=${encodeURIComponent(state.projectKey)}`, {
        credentials: "include",
        cache: "no-store",
      });
      const payload = await response.json();

      if (!response.ok || !payload?.ok) {
        throw new Error(payload?.error || "Could not load uploads.");
      }

      state.uploads = Array.isArray(payload.assets) ? payload.assets : [];

      if (state.uploadsDrawerOpen || !silent) {
        renderUploadsDrawer();
      }
    } catch (error) {
      state.uploadsError = error instanceof Error ? error.message : "Could not load uploads.";
      renderUploadsDrawer();
    } finally {
      state.uploadsLoading = false;

      if (!silent) {
        renderUploadsDrawer();
      }
    }
  }

  function syncUploadsDrawerState() {
    document.body.classList.toggle("uploads-open", state.uploadsDrawerOpen);
    uploadsRoot.hidden = !state.uploadsDrawerOpen;
    uploadsRoot.inert = !state.uploadsDrawerOpen;
    const toggle = document.querySelector("[data-uploads-drawer-toggle]");

    if (toggle) {
      toggle.setAttribute("aria-expanded", state.uploadsDrawerOpen ? "true" : "false");
      toggle.setAttribute("aria-hidden", state.uploadsDrawerOpen ? "true" : "false");
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

  function setUploadsDrawerOpen(nextOpen, source = "uploads") {
    if (state.uploadsDrawerOpen === nextOpen) {
      return;
    }

    state.uploadsDrawerOpen = nextOpen;
    syncUploadsDrawerState();

    if (state.uploadsDrawerOpen) {
      renderUploadsDrawer();
      void fetchAssets({ silent: true });
      window.dispatchEvent(
        new CustomEvent("uxbridge:drawer-open", {
          detail: { drawer: source },
        }),
      );
      return;
    }

    renderUploadsDrawer();
  }

  function findKnownAsset(assetId) {
    const normalizedAssetId = String(assetId || "").trim();

    if (!normalizedAssetId) {
      return null;
    }

    for (const comment of state.comments) {
      const asset = (Array.isArray(comment.assets) ? comment.assets : []).find((entry) => entry.id === normalizedAssetId);

      if (asset) {
        return asset;
      }
    }

    const pendingAsset = state.pendingAssets.find((asset) => asset.id === normalizedAssetId);

    if (pendingAsset) {
      return pendingAsset;
    }

    return state.uploads.find((asset) => asset.id === normalizedAssetId) || null;
  }

  function getRenderableProjectAssets() {
    if (state.uploads.length) {
      return state.uploads;
    }

    return state.comments.flatMap((comment) => (Array.isArray(comment.assets) ? comment.assets : []));
  }

  function getAssetViewerScaleLabel(mode) {
    if (mode === "fit") {
      return "Fit";
    }

    const percentage = Math.round((Number(mode) || 1) * 100);
    return `${percentage}%`;
  }

  function getAssetViewerScaleValue(mode) {
    if (mode === "fit") {
      return 1;
    }

    return Number(mode) || 1;
  }

  function syncAssetViewerScaleMenu() {
    const select = assetViewerRoot.querySelector("[data-asset-viewer-scale]");
    const trigger = assetViewerRoot.querySelector("[data-asset-viewer-scale-trigger]");
    const menu = assetViewerRoot.querySelector("[data-asset-viewer-scale-menu]");

    if (!select || !trigger || !menu) {
      return;
    }

    select.dataset.value = state.assetViewerScaleMode;
    select.dataset.open = state.assetViewerScaleMenuOpen ? "true" : "false";
    trigger.setAttribute("aria-expanded", state.assetViewerScaleMenuOpen ? "true" : "false");
    menu.hidden = !state.assetViewerScaleMenuOpen;
  }

  function setAssetViewerScaleMode(mode) {
    state.assetViewerScaleMode = String(mode || "fit");
    state.assetViewerScaleMenuOpen = false;
    renderAssetViewer();
  }

  function setAssetViewerIndex(nextIndex) {
    const itemCount = state.assetViewerItems.length;

    if (!itemCount) {
      return;
    }

    state.assetViewerIndex = (nextIndex + itemCount) % itemCount;
    state.assetViewerAsset = state.assetViewerItems[state.assetViewerIndex] || null;
    renderAssetViewer();
  }

  function openAssetViewer(assetId) {
    const asset = typeof assetId === "string" ? findKnownAsset(assetId) : assetId;

    if (!asset) {
      return;
    }

    const isPendingAsset = String(asset.id || "").startsWith("pending-");
    const sourceAssets = isPendingAsset ? state.pendingAssets : getRenderableProjectAssets();
    const nextItems = sourceAssets.filter(Boolean);
    const nextIndex = Math.max(
      nextItems.findIndex((entry) => String(entry?.id || "").trim() === String(asset.id || "").trim()),
      0,
    );

    state.assetViewerItems = nextItems;
    state.assetViewerIndex = nextIndex;
    state.assetViewerAsset = asset;
    state.assetViewerScaleMode = "fit";
    state.assetViewerScaleMenuOpen = false;
    renderAssetViewer();
  }

  function closeAssetViewer() {
    state.assetViewerAsset = null;
    state.assetViewerItems = [];
    state.assetViewerIndex = 0;
    state.assetViewerScaleMenuOpen = false;
    renderAssetViewer();
  }

  async function fetchComments(options = {}) {
    const { silent = false } = options;
    const requestToken = ++state.commentsRequestToken;
    const previousCommentIds = state.comments.map((comment) => comment.id).join("|");
    const previousCommentsSignature = getCommentsSignature(state.comments);
    const previousUsersSignature = getUsersSignature(state.users);
    const previousUnseenCount = state.unseenCount;
    const previousError = state.error;

    if (!silent) {
      state.isLoading = true;
      state.error = "";
      render();
    }

    try {
      const response = await fetch(
        `${COMMENTS_API}?project=${encodeURIComponent(state.projectKey)}&page=${encodeURIComponent(state.pageKey)}`,
        {
          credentials: "include",
          cache: "no-store",
        },
      );
      const payload = await response.json();

      if (requestToken !== state.commentsRequestToken) {
        return;
      }

      if (!response.ok || !payload?.ok) {
        throw new Error(payload?.error || "Could not load comments.");
      }

      state.comments = Array.isArray(payload.comments) ? payload.comments : [];
      state.users = Array.isArray(payload.users) ? payload.users : [];
      state.canDeleteAnyComment = Boolean(payload.canDeleteAnyComment);
      const localSeenState = readLocalSeenState();
      const payloadLastSeenAt = Number(payload.lastSeenAt) || 0;
      const payloadLastSeenCommentId = String(payload.lastSeenCommentId || "");
      state.lastPersistedSeenCommentId = payloadLastSeenCommentId;
      state.lastPersistedSeenAt = payloadLastSeenAt;
      state.lastSeenAt = Math.max(payloadLastSeenAt, localSeenState.lastSeenAt || 0);
      state.lastSeenCommentId =
        state.lastSeenAt === payloadLastSeenAt && payloadLastSeenCommentId
          ? payloadLastSeenCommentId
          : localSeenState.lastSeenCommentId;
      if (nextCommentIdsChanged(previousCommentIds, state.comments)) {
        state.shouldStickToBottom = true;
      }
      state.currentPageActivityAt = getLatestActivityAt(state.comments);
      if (state.drawerOpen) {
        await markCommentsSeen();
      } else {
        const currentPageSummary = state.pageCommentSummary.get(state.pageKey);
        if (currentPageSummary) {
          state.unseenCount = Number(currentPageSummary.unreadCount || 0);
        } else {
          updateUnseenCount();
        }
      }
      renderToggleBadge();
      renderNavCommentBadges();
      const nextCommentsSignature = getCommentsSignature(state.comments);
      const nextUsersSignature = getUsersSignature(state.users);
      const shouldRenderSilently =
        silent &&
        (nextCommentsSignature !== previousCommentsSignature ||
          nextUsersSignature !== previousUsersSignature ||
          state.unseenCount !== previousUnseenCount ||
          state.error !== previousError);

      if (shouldRenderSilently) {
        render();
      }
    } catch (error) {
      if (requestToken !== state.commentsRequestToken) {
        return;
      }

      state.error = error instanceof Error ? error.message : "Could not load comments.";
      if (silent && state.error !== previousError) {
        render();
      }
    } finally {
      if (requestToken !== state.commentsRequestToken) {
        return;
      }

      if (!silent) {
        state.isLoading = false;
        render();
      }
    }
  }

  async function fetchProjectSummary() {
    const requestToken = ++state.summaryRequestToken;
    const pageKeys = getNavPageKeys();

    if (!state.projectKey || !pageKeys.length) {
      return;
    }

    try {
      const response = await fetch(
        `${COMMENTS_API}?project=${encodeURIComponent(state.projectKey)}&summary=pages&pages=${encodeURIComponent(pageKeys.join(","))}`,
        {
          credentials: "include",
          cache: "no-store",
        },
      );
      const payload = await response.json().catch(() => ({}));

      if (requestToken !== state.summaryRequestToken) {
        return false;
      }

      if (!response.ok || !payload?.ok) {
        throw new Error(payload?.error || "Could not load comment summary.");
      }

      const previousCurrentPageActivityAt = state.currentPageActivityAt;
      const previousUnseenCount = state.unseenCount;
      state.pageCommentSummary = new Map(
        (Array.isArray(payload.summary) ? payload.summary : []).map((entry) => [
          entry.page,
          (() => {
            const commentIds = Array.isArray(entry.commentIds) ? entry.commentIds : [];
            const mentionCommentIds = Array.isArray(entry.mentionCommentIds) ? entry.mentionCommentIds : [];
            const localSeenState = readLocalSeenState(entry.page);
            const payloadLastSeenCommentId = String(entry.lastSeenCommentId || "");
            const payloadLastSeenAt = Number(entry.lastSeenAt) || 0;
            const resolvedLastSeenCommentId = payloadLastSeenCommentId || localSeenState.lastSeenCommentId;
            const getUnseenCountFromIds = (ids) => {
              if (!Array.isArray(ids) || !ids.length) {
                return 0;
              }

              if (!resolvedLastSeenCommentId) {
                return ids.length;
              }

              const lastSeenIndex = ids.findIndex((commentId) => commentId === resolvedLastSeenCommentId);
              return lastSeenIndex < 0 ? ids.length : Math.max(ids.length - (lastSeenIndex + 1), 0);
            };

            return {
              commentIds,
              latestActivityAt: String(entry.latestActivityAt || ""),
              unreadCount:
                payloadLastSeenAt > 0 ? Number(entry.unreadCount || 0) : getUnseenCountFromIds(commentIds),
              unreadMentionCount:
                payloadLastSeenAt > 0 ? Number(entry.unreadMentionCount || 0) : getUnseenCountFromIds(mentionCommentIds),
              lastSeenCommentId: resolvedLastSeenCommentId,
              lastSeenAt: Math.max(payloadLastSeenAt, localSeenState.lastSeenAt || 0),
            };
          })(),
        ]),
      );
      syncCurrentPageActivity();
      const currentPageSummary = state.pageCommentSummary.get(state.pageKey);
      if (!state.drawerOpen && currentPageSummary) {
        state.unseenCount = Number(currentPageSummary.unreadCount || 0);
      }
      if (state.unseenCount !== previousUnseenCount) {
        renderToggleBadge();
      }
      renderNavCommentBadges();
      return previousCurrentPageActivityAt !== state.currentPageActivityAt;
    } catch {
      if (requestToken !== state.summaryRequestToken) {
        return false;
      }

      renderToggleBadge();
      renderNavCommentBadges();
      return false;
    }
  }

  function startCommentsRefresh() {
    if (state.refreshTimer) {
      window.clearTimeout(state.refreshTimer);
    }

    const run = () => {
      state.refreshTimer = window.setTimeout(() => {
        if (!state.projectKey || !state.pageKey || state.isSubmitting || document.visibilityState !== "visible") {
          run();
          return;
        }

        if (state.drawerOpen) {
          void fetchComments({ silent: true }).finally(run);
          void fetchProjectSummary();
          return;
        }

        void fetchProjectSummary()
          .then((didCurrentPageChange) => {
            if (didCurrentPageChange) {
              return fetchComments({ silent: true });
            }

            return null;
          })
          .finally(run);
      }, getRefreshDelay());
    };

    run();
  }

  function stopCommentsRefresh() {
    if (state.refreshTimer) {
      window.clearTimeout(state.refreshTimer);
      state.refreshTimer = null;
    }
  }

  function refreshWhenVisible() {
    if (!state.projectKey || !state.pageKey || document.visibilityState !== "visible") {
      return;
    }

    if (state.uploadsDrawerOpen) {
      void fetchAssets({ silent: true });
    }

    if (state.drawerOpen) {
      void fetchProjectSummary().then((didCurrentPageChange) => {
        if (didCurrentPageChange) {
          void fetchComments({ silent: true });
        }
      });
      return;
    }

    void fetchProjectSummary().then((didCurrentPageChange) => {
      if (didCurrentPageChange) {
        void fetchComments({ silent: true });
      }
    });
  }

  async function submitComment() {
    if ((!state.body.trim() && !state.pendingAssets.length) || state.isSubmitting) {
      return;
    }

    state.isSubmitting = true;
    state.error = "";
    render();

    try {
      const uploadedAssets = state.pendingAssets.length ? await uploadPendingAssets() : [];
      const scopedLayer = state.scopedLayer || getScopedLayerForSelectedElement();
      const response = await fetch(COMMENTS_API, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          project: state.projectKey,
          page: state.pageKey,
          body: state.body,
          assets: uploadedAssets,
          layer: scopedLayer,
        }),
      });
      const payload = await response.json();

      if (!response.ok || !payload?.ok) {
        await rollbackUploadedAssets(uploadedAssets);
        throw new Error(payload?.error || "Could not post comment.");
      }

      state.comments = Array.isArray(payload.comments) ? payload.comments : state.comments;
      state.canDeleteAnyComment = Boolean(payload.canDeleteAnyComment);
      state.users = Array.isArray(payload.users) ? payload.users : state.users;
      state.canDeleteAnyComment = Boolean(payload.canDeleteAnyComment);
      state.shouldStickToBottom = true;
      state.body = "";
      state.pendingAssets = [];
      state.mention = null;
      state.mentionIndex = 0;
      state.pageCommentSummary.set(state.pageKey, {
        commentIds: state.comments.map((comment) => comment.id),
        latestActivityAt: getLatestActivityAt(state.comments),
        unreadCount: 0,
        unreadMentionCount: 0,
        lastSeenCommentId: state.comments.at(-1)?.id || "",
        lastSeenAt: commentSeenTimestamp(state.comments.at(-1)),
      });
      syncCurrentPageActivity();
      state.lastSeenCommentId = state.comments.at(-1)?.id || "";
      state.lastSeenAt = commentSeenTimestamp(state.comments.at(-1));
      renderToggleBadge();
      renderNavCommentBadges();
      void fetchAssets({ silent: true });
    } catch (error) {
      state.error = error instanceof Error ? error.message : "Could not post comment.";
    } finally {
      state.isSubmitting = false;
      render();
    }
  }

  function startEditingComment(comment) {
    state.editingCommentId = comment.id;
    state.editingCommentBody = comment.body;
    state.copiedCommentId = "";
    render();
  }

  function stopEditingComment() {
    state.editingCommentId = "";
    state.editingCommentBody = "";
    state.busyCommentId = "";
    render();
  }

  async function saveEditedComment(commentId) {
    const body = state.editingCommentBody.trim();

    if (!body || state.busyCommentId) {
      return;
    }

    state.busyCommentId = commentId;
    render();

    try {
      const response = await fetch(COMMENTS_API, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "edit",
          project: state.projectKey,
          page: state.pageKey,
          commentId,
          body,
        }),
      });
      const payload = await response.json();

      if (!response.ok || !payload?.ok) {
        throw new Error(payload?.error || "Could not save comment.");
      }

      state.comments = Array.isArray(payload.comments) ? payload.comments : state.comments;
      state.canDeleteAnyComment = Boolean(payload.canDeleteAnyComment);
      state.users = Array.isArray(payload.users) ? payload.users : state.users;
      state.shouldStickToBottom = true;
      state.editingCommentId = "";
      state.editingCommentBody = "";
      state.busyCommentId = "";
      state.pageCommentSummary.set(state.pageKey, {
        commentIds: state.comments.map((comment) => comment.id),
        latestActivityAt: getLatestActivityAt(state.comments),
        unreadCount: state.drawerOpen ? 0 : getUnseenCountForComments(state.comments, state.lastSeenAt, false),
        unreadMentionCount: 0,
        lastSeenCommentId: state.lastSeenCommentId,
        lastSeenAt: state.lastSeenAt,
      });
      syncCurrentPageActivity();
      renderNavCommentBadges();
      render();
    } catch (error) {
      state.error = error instanceof Error ? error.message : "Could not save comment.";
      state.busyCommentId = "";
      render();
    }
  }

  async function deleteComment(commentId) {
    if (state.busyCommentId) {
      return;
    }

    const confirmed = window.confirm("Delete this comment?");

    if (!confirmed) {
      return;
    }

    state.busyCommentId = commentId;
    render();

    try {
      const response = await fetch(COMMENTS_API, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "delete",
          project: state.projectKey,
          page: state.pageKey,
          commentId,
        }),
      });
      const payload = await response.json();

      if (!response.ok || !payload?.ok) {
        throw new Error(payload?.error || "Could not delete comment.");
      }

      state.comments = Array.isArray(payload.comments) ? payload.comments : state.comments;
      state.users = Array.isArray(payload.users) ? payload.users : state.users;
      state.shouldStickToBottom = true;
      state.editingCommentId = state.editingCommentId === commentId ? "" : state.editingCommentId;
      state.editingCommentBody = state.editingCommentId ? state.editingCommentBody : "";
      state.pageCommentSummary.set(state.pageKey, {
        commentIds: state.comments.map((comment) => comment.id),
        latestActivityAt: getLatestActivityAt(state.comments),
        unreadCount: state.drawerOpen ? 0 : getUnseenCountForComments(state.comments, state.lastSeenAt, false),
        unreadMentionCount: 0,
        lastSeenCommentId: state.lastSeenCommentId,
        lastSeenAt: state.lastSeenAt,
      });
      syncCurrentPageActivity();
      if (state.drawerOpen) {
        await markCommentsSeen();
      } else {
        updateUnseenCount();
      }
      renderToggleBadge();
      renderNavCommentBadges();
      state.busyCommentId = "";
      render();
    } catch (error) {
      state.error = error instanceof Error ? error.message : "Could not delete comment.";
      state.busyCommentId = "";
      render();
    }
  }

  async function copyCommentBody(comment) {
    try {
      await navigator.clipboard.writeText(comment.body);
      state.copiedCommentId = comment.id;
      render();
      window.setTimeout(() => {
        if (state.copiedCommentId === comment.id) {
          state.copiedCommentId = "";
          render();
        }
      }, 1200);
    } catch {
      state.error = "Could not copy comment.";
      render();
    }
  }

  function applyMention(user) {
    const textarea = commentsRoot.querySelector("[data-comments-input]");

    if (!textarea || !state.mention) {
      return;
    }

    const replacement = `@${user.fullName} `;
    const nextValue =
      state.body.slice(0, state.mention.start) + replacement + state.body.slice(state.mention.end);
    const nextCaret = state.mention.start + replacement.length;

    state.body = nextValue;
    state.mention = null;
    state.mentionIndex = 0;
    render();

    const nextTextarea = commentsRoot.querySelector("[data-comments-input]");

    if (nextTextarea) {
      nextTextarea.focus();
      nextTextarea.setSelectionRange(nextCaret, nextCaret);
    }
  }

  function handleInput() {
    const textarea = commentsRoot.querySelector("[data-comments-input]");

    if (!textarea) {
      return;
    }

    state.body = textarea.value;
    state.mention = getMentionContext(textarea.value, textarea.selectionStart || 0);
    state.mentionIndex = 0;
    render();
  }

  function autoResizeComposerTextarea(textarea) {
    if (!textarea) {
      return;
    }

    textarea.style.height = "auto";
    textarea.style.height = `${Math.max(textarea.scrollHeight, 96)}px`;
  }

  function renderAssetPreview(asset, options = {}) {
    const { compact = false } = options;
    const assetUrl = getAssetDownloadUrl(asset);
    const safeName = escapeHtml(asset.fileName || "Attachment");

    if (isImageAsset(asset) && assetUrl) {
      return `<img src="${escapeAttribute(assetUrl)}" alt="${safeName}" loading="lazy" />`;
    }

    if (isVideoAsset(asset) && assetUrl) {
      return `<video src="${escapeAttribute(assetUrl)}" muted playsinline preload="metadata"></video>`;
    }

    const label = isPdfAsset(asset) ? "PDF" : getAssetExtension(asset);
    return `<span class="comments-panel__asset-glyph${compact ? " is-compact" : ""}">${escapeHtml(label)}</span>`;
  }

  function renderAssetCard(asset, options = {}) {
    const { pending = false, compact = false, context = "comment" } = options;
    const assetId = String(asset.id || "").trim();
    const safeName = escapeHtml(asset.fileName || "Attachment");
    const pageLabel = escapeHtml(getPageLabelForKey(asset.pageId));

    return `
      <button
        type="button"
        class="comments-panel__asset-card${compact ? " is-compact" : ""}${pending ? " is-pending" : ""}"
        data-asset-open="${assetId}"
        data-asset-context="${escapeAttribute(context)}"
      >
        <span class="comments-panel__asset-preview">
          ${renderAssetPreview(asset, { compact })}
        </span>
        <span class="comments-panel__asset-copy">
          <strong>${safeName}</strong>
          <small>${escapeHtml(`${pageLabel} · ${formatFileSize(asset.sizeBytes)}`)}</small>
        </span>
        ${
          pending
            ? `
                <span class="comments-panel__asset-remove-wrap">
                  <span class="comments-panel__asset-remove" data-pending-asset-remove="${assetId}" aria-label="Remove attachment">
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M6 6 18 18"></path>
                      <path d="M18 6 6 18"></path>
                    </svg>
                  </span>
                </span>
              `
            : ""
        }
      </button>
    `;
  }

  function renderPendingAssets() {
    if (!state.pendingAssets.length) {
      return "";
    }

    return `
      <div class="comments-panel__pending-assets">
        ${state.pendingAssets
          .map((asset) => renderAssetCard(asset, { pending: true, compact: true, context: "pending" }))
          .join("")}
      </div>
    `;
  }

  function renderCommentAssets(assets = []) {
    if (!Array.isArray(assets) || !assets.length) {
      return "";
    }

    return `
      <div class="comments-panel__assets">
        ${assets.map((asset) => renderAssetCard(asset, { compact: true, context: "comment" })).join("")}
      </div>
    `;
  }

  function renderCommentsList() {
    if (state.isLoading) {
      return `<div class="comments-panel__empty">Loading comments…</div>`;
    }

    if (state.error && !state.comments.length) {
      return `<div class="comments-panel__empty comments-panel__empty--error">${escapeHtml(state.error)}</div>`;
    }

    if (!state.comments.length) {
      return `<div class="comments-panel__empty">No comments yet. Start the conversation for this page.</div>`;
    }

    const currentUserEmail = getCurrentUserEmail();
    return state.comments
      .map(
        (comment, index) => `
          ${(() => {
            const isOwn = String(comment.author?.email || "").toLowerCase() === currentUserEmail;
            const canEdit = isOwn;
            const canDelete = isOwn || state.canDeleteAnyComment;
            const isEditing = state.editingCommentId === comment.id;
            const isBusy = state.busyCommentId === comment.id;
            const copied = state.copiedCommentId === comment.id;
            const previousComment = state.comments[index - 1];
            const isGrouped = shouldGroupWithPrevious(comment, previousComment);
            const scopedLayer = normalizeScopedLayer(comment.layer);
            const scopeLabel = scopedLayer?.label || scopedLayer?.tagName || "Layer";
            const actionMarkup = `
              <div class="comments-panel__actions" role="menu" aria-label="Comment actions">
                <button type="button" class="comments-panel__action" data-comment-action="copy" data-comment-id="${comment.id}" aria-label="${copied ? "Copied" : "Copy comment"}" title="${copied ? "Copied" : "Copy"}">
                  ${
                    copied
                      ? `
                        <svg viewBox="0 0 24 24" aria-hidden="true">
                          <path d="M5 12.5 9.2 16.5 19 7.5"></path>
                        </svg>
                      `
                      : `
                        <svg viewBox="0 0 24 24" aria-hidden="true">
                          <rect x="9" y="9" width="10" height="10" rx="2"></rect>
                          <path d="M7 15H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h7a2 2 0 0 1 2 2v1"></path>
                        </svg>
                      `
                  }
                </button>
                ${
                  canEdit
                    ? `
                        <button type="button" class="comments-panel__action" data-comment-action="edit" data-comment-id="${comment.id}" aria-label="Edit comment" title="Edit">
                          <svg viewBox="0 0 24 24" aria-hidden="true">
                            <path d="M4 20h4l10.5-10.5a2.12 2.12 0 0 0-3-3L5 17v3Z"></path>
                            <path d="M13.5 6.5 17.5 10.5"></path>
                          </svg>
                        </button>
                      `
                    : ""
                }
                ${
                  canDelete
                    ? `
                        <button type="button" class="comments-panel__action comments-panel__action--destructive" data-comment-action="delete" data-comment-id="${comment.id}" aria-label="Delete comment" title="Delete" ${isBusy ? "disabled" : ""}>
                          <svg viewBox="0 0 24 24" aria-hidden="true">
                            <path d="M4 7h16"></path>
                            <path d="M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"></path>
                            <path d="M7 7l1 12a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2l1-12"></path>
                            <path d="M10 11v6"></path>
                            <path d="M14 11v6"></path>
                          </svg>
                        </button>
                      `
                    : ""
                }
              </div>
            `;

            return `
              <article
                class="comments-panel__item${isOwn ? " is-own" : ""}${isGrouped ? " is-grouped" : ""}${scopedLayer ? " is-scoped" : ""}"
                data-comment-id="${comment.id}"
                ${scopedLayer ? `data-comment-layer-path="${escapeAttribute(scopedLayer.path)}"` : ""}
              >
                <div class="comments-panel__message-wrap">
                  ${actionMarkup}
                  ${
                    isGrouped
                      ? ""
                      : `
                        <div class="comments-panel__meta-line">
                          <strong>${escapeHtml(comment.author?.fullName || "Unknown user")}</strong>
                          <span>${escapeHtml(formatCommentMeta(comment))}</span>
                          ${scopedLayer ? `<span class="comments-panel__scope-label">${escapeHtml(scopeLabel)}</span>` : ""}
                        </div>
                      `
                  }
                  <div class="comments-panel__bubble">
                    ${
                      isEditing
                        ? `
                          <div class="comments-panel__edit">
                            <textarea data-comment-edit-input="${comment.id}">${escapeHtml(state.editingCommentBody)}</textarea>
                            <div class="comments-panel__edit-actions">
                              <button type="button" class="comments-panel__edit-button comments-panel__edit-button--secondary" data-comment-action="cancel-edit" data-comment-id="${comment.id}" ${isBusy ? "disabled" : ""}>Cancel</button>
                              <button type="button" class="comments-panel__edit-button" data-comment-action="save-edit" data-comment-id="${comment.id}" ${isBusy ? "disabled" : ""}>
                                ${isBusy ? "Saving…" : "Save"}
                              </button>
                            </div>
                          </div>
                        `
                        : `
                            ${comment.body ? `<div class="comments-panel__body">${renderCommentBody(comment.body, comment.mentions || [])}</div>` : ""}
                            ${renderCommentAssets(comment.assets || [])}
                          `
                    }
                  </div>
                </div>
              </article>
            `;
          })()}
        `,
      )
      .join("");
  }

  function nextCommentIdsChanged(previousIds, comments) {
    const nextIds = comments.map((comment) => comment.id).join("|");
    return nextIds !== previousIds;
  }

  function isThreadNearBottom(thread) {
    if (!thread) {
      return true;
    }

    const distanceFromBottom = thread.scrollHeight - thread.scrollTop - thread.clientHeight;
    return distanceFromBottom <= 32;
  }

  function scrollThreadToBottom(thread) {
    if (!thread) {
      return;
    }

    thread.scrollTop = thread.scrollHeight;
  }

  function renderMentionMenu() {
    if (!state.mention?.suggestions?.length) {
      return "";
    }

    return `
      <div class="comments-panel__mentions" data-comments-mentions>
        ${state.mention.suggestions
          .map(
            (user, index) => `
              <button
                type="button"
                class="comments-panel__mention-option ${index === state.mentionIndex ? "is-active" : ""}"
                data-mention-index="${index}"
              >
                <span class="comments-panel__mention-avatar" style="--avatar-bg:${escapeHtml(user.avatarColor || "")}">${escapeHtml(getInitials(user.fullName))}</span>
                <span class="comments-panel__mention-copy">
                  <strong>${escapeHtml(user.fullName)}</strong>
                  <small>${escapeHtml(user.email)}</small>
                </span>
              </button>
            `,
          )
          .join("")}
      </div>
    `;
  }

  function renderComposer() {
    const canSubmit = Boolean(state.body.trim() || state.pendingAssets.length) && !state.isSubmitting;

    return `
      <div class="comments-panel__composer">
        ${renderPendingAssets()}
        <div class="comments-panel__field">
          <div class="comments-panel__input-wrap">
            <textarea
              data-comments-input
              placeholder="Type a message"
            >${escapeHtml(state.body)}</textarea>
            <button
              type="button"
              class="comments-panel__attach"
              data-comments-attach
              aria-label="Attach files"
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M16.5 6.5 9 14a3 3 0 1 0 4.24 4.24l7-7a5 5 0 0 0-7.07-7.07l-8 8"></path>
              </svg>
            </button>
            <button
              type="button"
              class="comments-panel__send"
              data-comments-submit
              aria-label="Post comment"
              ${canSubmit ? "" : "disabled"}
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M12 5 12 19"></path>
                <path d="M6 11 12 5 18 11"></path>
              </svg>
            </button>
          </div>
        </div>
        ${renderMentionMenu()}
        ${state.error ? `<p class="comments-panel__status comments-panel__status--error">${escapeHtml(state.error)}</p>` : ""}
        <div class="comments-panel__composer-actions">
          <p class="comments-panel__hint">Comments and uploads are saved to this page for everyone in the project.</p>
        </div>
      </div>
    `;
  }

  function renderUploadsDrawer() {
    uploadsRoot.innerHTML = `
      <div class="uploads-panel__inner">
        <div class="uploads-panel__header">
          <div class="uploads-panel__header-copy">
            <p class="uploads-panel__eyebrow">Uploads</p>
            <h2>Project Assets</h2>
            <p>Browse uploaded files for ${escapeHtml(state.pageLabel)} and the rest of this project.</p>
          </div>
          <button class="uploads-panel__close" type="button" data-uploads-close aria-label="Close uploads">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M6 6 18 18"></path>
              <path d="M18 6 6 18"></path>
            </svg>
          </button>
        </div>
        <div class="uploads-panel__list" data-uploads-list>
          ${
            state.uploadsLoading
              ? `<div class="uploads-panel__empty">Loading uploads…</div>`
              : state.uploadsError
              ? `<div class="uploads-panel__empty uploads-panel__empty--error">${escapeHtml(state.uploadsError)}</div>`
              : !state.uploads.length
              ? `<div class="uploads-panel__empty">No uploads yet. Add attachments from the comments drawer.</div>`
              : state.uploads
                  .map(
                    (asset) => `
                      <div class="uploads-panel__item">
                        ${renderAssetCard(asset, { context: "uploads" })}
                      </div>
                    `,
                  )
                  .join("")
          }
        </div>
      </div>
    `;

    uploadsRoot.querySelector("[data-uploads-close]")?.addEventListener("click", () => {
      setUploadsDrawerOpen(false);
    });

    uploadsRoot.querySelectorAll("[data-asset-open]").forEach((button) => {
      button.addEventListener("click", () => {
        openAssetViewer(button.getAttribute("data-asset-open"));
      });
    });

    syncUploadsDrawerState();
  }

  function renderAssetViewer() {
    const asset = state.assetViewerAsset;

    if (!asset) {
      assetViewerRoot.hidden = true;
      assetViewerRoot.innerHTML = "";
      document.body.classList.remove("asset-viewer-open");
      return;
    }

    const assetUrl = getAssetDownloadUrl(asset);
    const safeName = escapeHtml(asset.fileName || "Attachment");
    const pageLabel = escapeHtml(getPageLabelForKey(asset.pageId));
    const fileMeta = escapeHtml(`${pageLabel} · ${formatFileSize(asset.sizeBytes)}`);
    const canNavigate = state.assetViewerItems.length > 1;
    const scaleValue = getAssetViewerScaleValue(state.assetViewerScaleMode);

    let contentMarkup = `
      <div class="asset-viewer__empty">
        <strong>${safeName}</strong>
        <p>Preview is not available for this file type.</p>
      </div>
    `;

    if (isImageAsset(asset) && assetUrl) {
      contentMarkup = `<img class="asset-viewer__image" src="${escapeAttribute(assetUrl)}" alt="${safeName}" />`;
    } else if (isVideoAsset(asset) && assetUrl) {
      contentMarkup = `<video class="asset-viewer__video" src="${escapeAttribute(assetUrl)}" controls playsinline></video>`;
    } else if (isPdfAsset(asset) && assetUrl) {
      contentMarkup = `<iframe class="asset-viewer__pdf" src="${escapeAttribute(assetUrl)}" title="${safeName}"></iframe>`;
    }

    assetViewerRoot.hidden = false;
    document.body.classList.add("asset-viewer-open");
    assetViewerRoot.innerHTML = `
      <div class="asset-viewer__backdrop" data-asset-viewer-close></div>
      <div class="asset-viewer__surface" role="dialog" aria-modal="true" aria-label="${safeName}">
        <div class="asset-viewer__topbar">
          <div class="asset-viewer__copy">
            <h3>${safeName}</h3>
            <p>${fileMeta}</p>
          </div>
          <div class="asset-viewer__center">
            <div class="asset-viewer__scale-wrap">
              <div class="preview-scale-select asset-viewer__scale" data-asset-viewer-scale data-value="${escapeAttribute(state.assetViewerScaleMode)}" data-open="${state.assetViewerScaleMenuOpen ? "true" : "false"}">
                <button
                  type="button"
                  class="preview-scale-trigger"
                  data-asset-viewer-scale-trigger
                  aria-haspopup="menu"
                  aria-expanded="${state.assetViewerScaleMenuOpen ? "true" : "false"}"
                  aria-label="Scale asset"
                >
                  <span class="preview-scale-trigger__icon" aria-hidden="true"></span>
                  <span class="preview-scale-select__label">${escapeHtml(getAssetViewerScaleLabel(state.assetViewerScaleMode))}</span>
                  <span class="preview-scale-trigger__chevron" aria-hidden="true"></span>
                </button>
                <div class="preview-scale-menu asset-viewer__scale-menu" data-asset-viewer-scale-menu role="menu" ${state.assetViewerScaleMenuOpen ? "" : "hidden"}>
                  <button type="button" class="preview-scale-menu__item ${state.assetViewerScaleMode === "fit" ? "is-active" : ""}" data-asset-viewer-scale-option="fit" role="menuitemradio" aria-checked="${state.assetViewerScaleMode === "fit" ? "true" : "false"}">Fit</button>
                  <button type="button" class="preview-scale-menu__item ${state.assetViewerScaleMode === "0.5" ? "is-active" : ""}" data-asset-viewer-scale-option="0.5" role="menuitemradio" aria-checked="${state.assetViewerScaleMode === "0.5" ? "true" : "false"}">50%</button>
                  <button type="button" class="preview-scale-menu__item ${state.assetViewerScaleMode === "0.75" ? "is-active" : ""}" data-asset-viewer-scale-option="0.75" role="menuitemradio" aria-checked="${state.assetViewerScaleMode === "0.75" ? "true" : "false"}">75%</button>
                  <button type="button" class="preview-scale-menu__item ${state.assetViewerScaleMode === "1" ? "is-active" : ""}" data-asset-viewer-scale-option="1" role="menuitemradio" aria-checked="${state.assetViewerScaleMode === "1" ? "true" : "false"}">100%</button>
                  <button type="button" class="preview-scale-menu__item ${state.assetViewerScaleMode === "1.5" ? "is-active" : ""}" data-asset-viewer-scale-option="1.5" role="menuitemradio" aria-checked="${state.assetViewerScaleMode === "1.5" ? "true" : "false"}">150%</button>
                  <button type="button" class="preview-scale-menu__item ${state.assetViewerScaleMode === "2" ? "is-active" : ""}" data-asset-viewer-scale-option="2" role="menuitemradio" aria-checked="${state.assetViewerScaleMode === "2" ? "true" : "false"}">200%</button>
                </div>
              </div>
              <span class="asset-viewer__control-tooltip" aria-hidden="true">Scaling</span>
            </div>
          </div>
          <div class="asset-viewer__actions">
            ${
              canNavigate
                ? `
                    <button type="button" class="asset-viewer__nav asset-viewer__icon-control" data-asset-viewer-prev aria-label="Previous asset">
                      <svg viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M15 6 9 12l6 6"></path>
                      </svg>
                    </button>
                    <button type="button" class="asset-viewer__nav asset-viewer__icon-control" data-asset-viewer-next aria-label="Next asset">
                      <svg viewBox="0 0 24 24" aria-hidden="true">
                        <path d="m9 6 6 6-6 6"></path>
                      </svg>
                    </button>
                  `
                : ""
            }
            ${
              assetUrl
                ? `
                    <a
                      class="asset-viewer__download asset-viewer__icon-control"
                      href="${escapeAttribute(`${assetUrl}${assetUrl.includes("?") ? "&" : "?"}download=1`)}"
                      target="_blank"
                      rel="noreferrer"
                      aria-label="Download asset"
                    >
                      <svg viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M12 4v10"></path>
                        <path d="m8 10 4 4 4-4"></path>
                        <path d="M5 18h14"></path>
                      </svg>
                      <span class="asset-viewer__control-tooltip" aria-hidden="true">Download</span>
                    </a>
                  `
                : ""
            }
            <button type="button" class="asset-viewer__close asset-viewer__icon-control" data-asset-viewer-close aria-label="Close asset viewer">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M6 6 18 18"></path>
                <path d="M18 6 6 18"></path>
              </svg>
              <span class="asset-viewer__control-tooltip" aria-hidden="true">Close</span>
            </button>
          </div>
        </div>
        <div class="asset-viewer__viewport">
          <div class="asset-viewer__canvas" style="--asset-viewer-scale:${scaleValue};">
            ${contentMarkup}
          </div>
        </div>
      </div>
    `;

    assetViewerRoot.querySelectorAll("[data-asset-viewer-close]").forEach((node) => {
      node.addEventListener("click", closeAssetViewer);
    });

    assetViewerRoot.querySelector("[data-asset-viewer-prev]")?.addEventListener("click", () => {
      setAssetViewerIndex(state.assetViewerIndex - 1);
    });

    assetViewerRoot.querySelector("[data-asset-viewer-next]")?.addEventListener("click", () => {
      setAssetViewerIndex(state.assetViewerIndex + 1);
    });

    assetViewerRoot.querySelector("[data-asset-viewer-scale-trigger]")?.addEventListener("click", () => {
      state.assetViewerScaleMenuOpen = !state.assetViewerScaleMenuOpen;
      syncAssetViewerScaleMenu();
    });

    assetViewerRoot.querySelectorAll("[data-asset-viewer-scale-option]").forEach((button) => {
      button.addEventListener("click", () => {
        setAssetViewerScaleMode(button.getAttribute("data-asset-viewer-scale-option"));
      });
    });

    assetViewerRoot.onclick = (event) => {
      const scaleSelect = assetViewerRoot.querySelector("[data-asset-viewer-scale]");
      const backdrop = assetViewerRoot.querySelector(".asset-viewer__backdrop");
      const viewport = assetViewerRoot.querySelector(".asset-viewer__viewport");
      const canvas = assetViewerRoot.querySelector(".asset-viewer__canvas");

      if (state.assetViewerScaleMenuOpen && scaleSelect && !scaleSelect.contains(event.target)) {
        state.assetViewerScaleMenuOpen = false;
        syncAssetViewerScaleMenu();
      }

      if (
        event.target.closest(".asset-viewer__copy") ||
        event.target.closest(".asset-viewer__actions") ||
        event.target.closest(".asset-viewer__center") ||
        event.target.closest(".asset-viewer__image") ||
        event.target.closest(".asset-viewer__video") ||
        event.target.closest(".asset-viewer__pdf") ||
        event.target.closest(".asset-viewer__empty")
      ) {
        return;
      }

      if (event.target === backdrop) {
        closeAssetViewer();
      }
    };
  }

  function render() {
    const activeElement = document.activeElement;
    const existingThread = commentsRoot.querySelector("[data-comments-thread]");
    const preserveThreadBottom = state.shouldStickToBottom || isThreadNearBottom(existingThread);
    const preservedThreadScrollTop = !preserveThreadBottom && existingThread ? existingThread.scrollTop : null;
    const preserveTextareaFocus = activeElement?.matches?.("[data-comments-input]");
    const selectionStart = preserveTextareaFocus ? activeElement.selectionStart : null;
    const selectionEnd = preserveTextareaFocus ? activeElement.selectionEnd : null;
    const editingCommentId = activeElement?.getAttribute?.("data-comment-edit-input");
    const preserveEditFocus = Boolean(editingCommentId);
    const editSelectionStart = preserveEditFocus ? activeElement.selectionStart : null;
    const editSelectionEnd = preserveEditFocus ? activeElement.selectionEnd : null;

    commentsRoot.innerHTML = `
      <div class="comments-panel__inner">
        <div class="comments-panel__header">
          <div class="comments-panel__header-copy">
            <p class="comments-panel__eyebrow">Comments</p>
            <h2>Page Discussion</h2>
            <p>Collaborate on ${escapeHtml(state.pageLabel)} and tag teammates with @mentions.</p>
          </div>
          <button class="comments-panel__close" type="button" data-comments-close aria-label="Close comments">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M6 6 18 18"></path>
              <path d="M18 6 6 18"></path>
            </svg>
          </button>
        </div>
        <div class="comments-panel__thread" data-comments-thread>
          ${renderCommentsList()}
        </div>
        ${renderComposer()}
      </div>
    `;

    const textarea = commentsRoot.querySelector("[data-comments-input]");
    const thread = commentsRoot.querySelector("[data-comments-thread]");

    thread?.addEventListener("scroll", () => {
      state.shouldStickToBottom = isThreadNearBottom(thread);
    });

    autoResizeComposerTextarea(textarea);

    textarea?.addEventListener("input", () => {
      autoResizeComposerTextarea(textarea);
      handleInput();
    });
    textarea?.addEventListener("click", handleInput);
    textarea?.addEventListener("keyup", handleInput);
    textarea?.addEventListener("keydown", (event) => {
      if (!state.mention?.suggestions?.length) {
        if (event.key === "Enter" && !event.shiftKey) {
          event.preventDefault();
          void submitComment();
        }
        return;
      }

      if (event.key === "ArrowDown") {
        event.preventDefault();
        state.mentionIndex = (state.mentionIndex + 1) % state.mention.suggestions.length;
        render();
        const nextTextarea = commentsRoot.querySelector("[data-comments-input]");
        nextTextarea?.focus();
        return;
      }

      if (event.key === "ArrowUp") {
        event.preventDefault();
        state.mentionIndex =
          (state.mentionIndex - 1 + state.mention.suggestions.length) % state.mention.suggestions.length;
        render();
        const nextTextarea = commentsRoot.querySelector("[data-comments-input]");
        nextTextarea?.focus();
        return;
      }

      if (event.key === "Enter" && state.mention) {
        event.preventDefault();
        applyMention(state.mention.suggestions[state.mentionIndex]);
        return;
      }

      if (event.key === "Escape") {
        state.mention = null;
        state.mentionIndex = 0;
        render();
      }
    });

    commentsRoot.querySelector("[data-comments-close]")?.addEventListener("click", () => {
      setDrawerOpen(false);
    });

    commentsRoot.querySelector("[data-comments-submit]")?.addEventListener("click", () => {
      void submitComment();
    });

    commentsRoot.querySelector("[data-comments-attach]")?.addEventListener("click", () => {
      assetFileInput.click();
    });

    commentsRoot.querySelectorAll("[data-comment-action]").forEach((button) => {
      button.addEventListener("click", () => {
        const action = button.getAttribute("data-comment-action");
        const commentId = button.getAttribute("data-comment-id");
        const comment = state.comments.find((entry) => entry.id === commentId);

        if (!action || !commentId || !comment) {
          return;
        }

        if (action === "copy") {
          void copyCommentBody(comment);
          return;
        }

        if (action === "edit") {
          startEditingComment(comment);
          return;
        }

        if (action === "cancel-edit") {
          stopEditingComment();
          return;
        }

        if (action === "save-edit") {
          void saveEditedComment(commentId);
          return;
        }

        if (action === "delete") {
          void deleteComment(commentId);
        }
      });
    });

    commentsRoot.querySelectorAll("[data-comment-edit-input]").forEach((textarea) => {
      textarea.addEventListener("input", () => {
        state.editingCommentBody = textarea.value;
      });

      textarea.addEventListener("keydown", (event) => {
        if (event.key === "Escape") {
          event.preventDefault();
          stopEditingComment();
          return;
        }

        if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
          event.preventDefault();
          void saveEditedComment(textarea.getAttribute("data-comment-edit-input"));
        }
      });
    });

    commentsRoot.querySelectorAll("[data-mention-index]").forEach((button) => {
      button.addEventListener("click", () => {
        const nextUser = state.mention?.suggestions?.[Number(button.dataset.mentionIndex)];

        if (nextUser) {
          applyMention(nextUser);
        }
      });
    });

    commentsRoot.querySelectorAll("[data-pending-asset-remove]").forEach((button) => {
      button.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        removePendingAsset(button.getAttribute("data-pending-asset-remove"));
      });
    });

    commentsRoot.querySelectorAll("[data-asset-open]").forEach((button) => {
      button.addEventListener("click", () => {
        openAssetViewer(button.getAttribute("data-asset-open"));
      });
    });

    commentsRoot.querySelectorAll("[data-comment-layer-path]").forEach((commentNode) => {
      commentNode.addEventListener("mouseenter", () => {
        activateScopedCommentHover(commentNode.getAttribute("data-comment-layer-path"));
      });

      commentNode.addEventListener("mouseleave", () => {
        clearScopedCommentHover();
      });
    });

    if (preserveTextareaFocus) {
      const nextTextarea = commentsRoot.querySelector("[data-comments-input]");

      if (nextTextarea) {
        nextTextarea.focus();
        autoResizeComposerTextarea(nextTextarea);
        nextTextarea.setSelectionRange(selectionStart ?? state.body.length, selectionEnd ?? state.body.length);
      }
    }

    if (preserveThreadBottom) {
      requestAnimationFrame(() => {
        scrollThreadToBottom(thread);
      });
      state.shouldStickToBottom = true;
    } else if (thread && preservedThreadScrollTop !== null) {
      requestAnimationFrame(() => {
        thread.scrollTop = preservedThreadScrollTop;
      });
    }

    if (preserveEditFocus && editingCommentId) {
      const nextEditTextarea = commentsRoot.querySelector(`[data-comment-edit-input="${editingCommentId}"]`);

      if (nextEditTextarea) {
        nextEditTextarea.focus();
        nextEditTextarea.setSelectionRange(
          editSelectionStart ?? state.editingCommentBody.length,
          editSelectionEnd ?? state.editingCommentBody.length,
        );
      }
    }
  }

  function renderToggleBadge() {
    const toggle = document.querySelector("[data-comments-drawer-toggle]");

    if (!toggle) {
      return;
    }

    const badge = toggle.querySelector("[data-comments-badge]");

    if (!badge) {
      return;
    }

    if (!state.unseenCount || state.drawerOpen) {
      badge.hidden = true;
      badge.textContent = "";
      return;
    }

    badge.hidden = false;
    badge.textContent = String(state.unseenCount > 99 ? "99+" : state.unseenCount);
  }

  function setupDrawer() {
    const actionRail = window.UXBridgeActionRail;
    const renderToggleContent =
      actionRail?.renderButtonContent ||
      (({ icon, label, tooltipClass = "", trailingMarkup = "" } = {}) => {
        const fallbackIcons = {
          comments: `
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M5 6.5c0-1.38 1.12-2.5 2.5-2.5h9c1.38 0 2.5 1.12 2.5 2.5v7c0 1.38-1.12 2.5-2.5 2.5H10l-4.5 4v-4H7.5C6.12 16 5 14.88 5 13.5Z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"></path>
              <path d="M8 8.75h8" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"></path>
              <path d="M8 12h5.5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"></path>
            </svg>
          `,
          files: `
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M15.5 6.5 8.38 13.62a3 3 0 0 0 4.24 4.24l8.13-8.13a4.5 4.5 0 0 0-6.36-6.36L6.26 11.5a6 6 0 1 0 8.49 8.49l6.36-6.36" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"></path>
            </svg>
          `,
        };

        return `
          <span class="bridge-action-rail-button__tooltip${tooltipClass ? ` ${tooltipClass}` : ""}" aria-hidden="true">${label || ""}</span>
          ${fallbackIcons[icon] || ""}
          ${trailingMarkup || ""}
        `;
      });
    const sideActions = document.querySelector("[data-side-actions]");
    const toggle = document.createElement("button");
    toggle.type = "button";
    toggle.className = "bridge-action-rail-button comments-drawer-toggle";
    toggle.setAttribute("data-comments-drawer-toggle", "");
    toggle.setAttribute("aria-expanded", "false");
    toggle.setAttribute("aria-label", "Comments");
    toggle.innerHTML = renderToggleContent({
      icon: "comments",
      label: "Comments",
      tooltipClass: "comments-drawer-toggle__tooltip",
      trailingMarkup: '<span class="comments-drawer-toggle__badge" data-comments-badge hidden></span>',
    });

    toggle.addEventListener("click", () => {
      setDrawerOpen(!state.drawerOpen);
    });

    const uploadsToggle = document.createElement("button");
    uploadsToggle.type = "button";
    uploadsToggle.className = "bridge-action-rail-button uploads-drawer-toggle";
    uploadsToggle.setAttribute("data-uploads-drawer-toggle", "");
    uploadsToggle.setAttribute("aria-expanded", "false");
    uploadsToggle.setAttribute("aria-label", "Uploads");
    uploadsToggle.innerHTML = renderToggleContent({
      icon: "files",
      label: "Files",
      tooltipClass: "uploads-drawer-toggle__tooltip",
    });

    uploadsToggle.addEventListener("click", () => {
      setUploadsDrawerOpen(!state.uploadsDrawerOpen);
    });

    window.addEventListener("uxbridge:drawer-open", (event) => {
      if (event.detail?.drawer !== "comments") {
        setDrawerOpen(false, "comments");
      }

      if (event.detail?.drawer !== "uploads") {
        setUploadsDrawerOpen(false, "uploads");
      }
    });

    if (sideActions) {
      sideActions.append(toggle);
      sideActions.append(uploadsToggle);
    } else {
      document.body.append(toggle);
      document.body.append(uploadsToggle);
    }

    syncDrawerState();
    syncUploadsDrawerState();
    renderToggleBadge();
    renderUploadsDrawer();
  }

  async function initWhenReady() {
    const maxAttempts = isDynamicProjectPage ? 50 : 1;

    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      const context = resolveContext();

      if (context.pageKey) {
        state.projectKey = context.projectKey;
        state.pageKey = context.pageKey;
        state.pageLabel = context.pageLabel;
        setupDrawer();
        render();
        await fetchComments();
        await fetchProjectSummary();
        await fetchAssets({ silent: true });
        startCommentsRefresh();
        return;
      }

      await new Promise((resolve) => window.setTimeout(resolve, 100));
    }
  }

  void initWhenReady();

  assetFileInput.addEventListener("change", () => {
    void queueFiles(assetFileInput.files);
  });

  window.addEventListener("beforeunload", () => {
    stopCommentsRefresh();
  });

  window.addEventListener("uxbridge:project-nav-rendered", () => {
    renderNavCommentBadges();
    void fetchProjectSummary();
  });
  window.addEventListener("uxbridge:comment-selection-select", (event) => {
    state.scopedLayer = normalizeScopedLayer(event.detail);
  });
  mobileSheetBackdrop?.addEventListener("click", () => {
    if (state.drawerOpen) {
      setDrawerOpen(false);
    }

    if (state.uploadsDrawerOpen) {
      setUploadsDrawerOpen(false);
    }
  });
  window.addEventListener("resize", syncMobileSheetBackdrop);

  document.addEventListener("visibilitychange", refreshWhenVisible);
  window.addEventListener("pageshow", refreshWhenVisible);
  window.addEventListener("focus", refreshWhenVisible);
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && state.assetViewerAsset) {
      closeAssetViewer();
      return;
    }

    if (state.assetViewerAsset && state.assetViewerItems.length > 1) {
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        setAssetViewerIndex(state.assetViewerIndex - 1);
        return;
      }

      if (event.key === "ArrowRight") {
        event.preventDefault();
        setAssetViewerIndex(state.assetViewerIndex + 1);
      }
    }
  });

})();
