(function initVibeDrawer() {
  const drawerRoot = document.querySelector("[data-vibe-root]");

  if (!drawerRoot) {
    return;
  }

  const PROJECTS_API = "/api/projects";
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
  const LOCAL_BRIDGE_URL = String(window.__UX_BRIDGE_CODEX_BRIDGE_URL__ || "http://127.0.0.1:4318").trim();
  const CODEX_ACCESS_OPTIONS = [
    { value: "owner_admin_only", label: "Owner + Admin only" },
    { value: "contributors", label: "Contributors can edit" },
    { value: "all_members", label: "All project members" },
  ];
  const params = new URLSearchParams(window.location.search);
  const projectId = String(params.get("project") || "").trim().toLowerCase();
  const requestedPageId = String(params.get("page") || "").trim().toLowerCase();
  const state = {
    drawerOpen: false,
    loading: false,
    applying: false,
    restoring: false,
    sessionCreating: false,
    pageCreating: false,
    reviewLoading: false,
    dropdownOpen: false,
    codexAccessSelectOpen: false,
    project: null,
    page: null,
    providers: [],
    currentUser: null,
    providerId: "codex",
    prompt: "",
    includeProjectContext: true,
    includePageContext: true,
    error: "",
    reviewSessionId: "",
    reviewData: null,
    localBridge: {
      url: LOCAL_BRIDGE_URL,
      checked: false,
      checking: false,
      available: false,
      version: "",
      mode: "",
      error: "",
    },
  };

  function escapeHtml(value) {
    return String(value || "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }

  function getSelectedProvider() {
    return state.providers.find((provider) => provider.id === state.providerId) || state.providers[0] || null;
  }

  function usesLocalBridge(provider = getSelectedProvider()) {
    return String(provider?.availableVia || "").trim().toLowerCase() === "local-bridge";
  }

  function getCurrentUser() {
    if (state.currentUser) {
      return state.currentUser;
    }

    if (window.uxBridgeUser) {
      state.currentUser = window.uxBridgeUser;
      return state.currentUser;
    }

    try {
      const cachedUser = sessionStorage.getItem("ux-bridge-user");
      state.currentUser = cachedUser ? JSON.parse(cachedUser) : null;
    } catch {
      state.currentUser = null;
    }

    return state.currentUser;
  }

  function isProviderConnected(providerId = state.providerId) {
    const provider = state.providers.find((entry) => entry.id === providerId) || null;

    if (usesLocalBridge(provider)) {
      return Boolean(state.localBridge.available);
    }

    const currentUser = getCurrentUser();
    return Boolean(currentUser?.integrations?.[providerId]?.connected);
  }

  async function checkLocalBridge(force = false) {
    if (state.localBridge.checking || (!force && state.localBridge.checked)) {
      return;
    }

    state.localBridge.checking = true;
    renderDrawer();

    try {
      const response = await fetch(`${state.localBridge.url}/health`, {
        method: "GET",
        cache: "no-store",
      });
      const payload = await response.json().catch(() => ({}));

      state.localBridge.checked = true;
      state.localBridge.available = Boolean(response.ok && payload?.ok);
      state.localBridge.version = String(payload?.version || "").trim();
      state.localBridge.mode = String(payload?.mode || "").trim();
      state.localBridge.error = state.localBridge.available ? "" : "The local Codex bridge did not respond with a healthy status.";
    } catch {
      state.localBridge.checked = true;
      state.localBridge.available = false;
      state.localBridge.version = "";
      state.localBridge.mode = "";
      state.localBridge.error = "Start the local Codex bridge on this machine to use Codex App for page generation.";
    } finally {
      state.localBridge.checking = false;
      renderDrawer();
    }
  }

  function getProviderStatusMessage(selectedProvider, providerConnected, integrationAccountLabel) {
    if (usesLocalBridge(selectedProvider)) {
      if (state.localBridge.checking) {
        return {
          tone: "neutral",
          text: "Checking for a local Codex bridge on this machine…",
        };
      }

      if (providerConnected) {
        return {
          tone: "connected",
          text: `Codex App bridge is ready${state.localBridge.version ? ` (v${escapeHtml(state.localBridge.version)})` : ""}.`,
        };
      }

      return {
        tone: "neutral",
        text: state.localBridge.error || "Start the local Codex bridge on this machine to use Codex App for page generation.",
      };
    }

    if (providerConnected) {
      return {
        tone: "connected",
        text: `${selectedProvider?.label || "Provider"} is connected${integrationAccountLabel ? ` as ${integrationAccountLabel}` : ""}.`,
      };
    }

    return {
      tone: "neutral",
      text: `Connect ${selectedProvider?.label || "this provider"} in Profile before generating.`,
    };
  }

  function syncDrawerState() {
    document.body.classList.toggle("bridge-body--has-vibe", true);
    document.body.classList.toggle("vibe-open", state.drawerOpen);
    drawerRoot.inert = !state.drawerOpen;
    const toggle = document.querySelector("[data-vibe-drawer-toggle]");

    if (toggle) {
      toggle.setAttribute("aria-expanded", state.drawerOpen ? "true" : "false");
      toggle.classList.toggle("is-active", state.drawerOpen);
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

  function setDrawerOpen(nextOpen, source = "vibe") {
    if (state.drawerOpen === nextOpen) {
      return;
    }

    state.drawerOpen = nextOpen;
    syncDrawerState();

    if (nextOpen) {
      window.dispatchEvent(
        new CustomEvent("uxbridge:drawer-open", {
          detail: { drawer: source },
        }),
      );
    } else {
      state.dropdownOpen = false;
      renderDrawer();
    }
  }

  function setupDrawerLauncher() {
    const actionRail = window.UXBridgeActionRail;
    const renderToggleContent =
      actionRail?.renderButtonContent ||
      (({ label, tooltipClass = "" } = {}) => `
        <span class="bridge-action-rail-button__tooltip${tooltipClass ? ` ${tooltipClass}` : ""}" aria-hidden="true">${label || ""}</span>
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 3.6 14.72 9.11l6.08.88-4.4 4.29 1.04 6.06L12 17.48l-5.44 2.86 1.04-6.06-4.4-4.29 6.08-.88Z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"></path>
        </svg>
      `);
    const sideActions = document.querySelector("[data-side-actions]");
    const toggle = document.createElement("button");
    toggle.type = "button";
    toggle.className = "bridge-action-rail-button vibe-drawer-toggle";
    toggle.setAttribute("data-vibe-drawer-toggle", "");
    toggle.setAttribute("aria-expanded", "false");
    toggle.setAttribute("aria-label", "Vibe code");
    toggle.innerHTML = renderToggleContent({
      icon: "vibe",
      label: "Vibe code",
      tooltipClass: "vibe-drawer-toggle__tooltip",
    });

    toggle.addEventListener("click", () => {
      setDrawerOpen(!state.drawerOpen);
    });

    window.addEventListener("uxbridge:drawer-open", (event) => {
      if (event.detail?.drawer !== "vibe") {
        setDrawerOpen(false, "vibe");
      }
    });

    if (sideActions) {
      sideActions.prepend(toggle);
    }
    syncDrawerState();
  }

  function syncFromProject(project, pageId = requestedPageId || state.page?.id) {
    if (!project) {
      return;
    }

    state.project = project;
    state.page = project.pages.find((page) => page.id === pageId) || project.pages[0] || null;

    if (!state.page) {
      return;
    }

    const vibe = state.page.vibe || {};
    state.providerId = vibe.providerId || state.providerId;
    state.prompt = vibe.prompt || state.prompt;
    state.includeProjectContext = vibe.includeProjectContext !== false;
    state.includePageContext = vibe.includePageContext !== false;

    if (
      state.reviewSessionId &&
      !(Array.isArray(project.editSessions) ? project.editSessions : []).some((session) => session.id === state.reviewSessionId)
    ) {
      state.reviewSessionId = "";
      state.reviewData = null;
    }

    renderDrawer();
  }

  function getCurrentUserEmail() {
    return String(getCurrentUser()?.email || "").trim().toLowerCase();
  }

  function getActiveSession() {
    const currentUserEmail = getCurrentUserEmail();

    if (!currentUserEmail || !state.project) {
      return null;
    }

    return (
      (Array.isArray(state.project.editSessions) ? state.project.editSessions : []).find((session) => {
        const status = String(session.status || "").trim().toLowerCase();
        return (
          (status === "active" || status === "ready_for_review") &&
          String(session.userId || "").trim().toLowerCase() === currentUserEmail &&
          String(session.pageId || "").trim().toLowerCase() === String(state.page?.id || "").trim().toLowerCase()
        );
      }) || null
    );
  }

  function getPageSessions() {
    if (!state.project || !state.page) {
      return [];
    }

    return (Array.isArray(state.project.editSessions) ? state.project.editSessions : [])
      .filter((session) => String(session.pageId || "").trim().toLowerCase() === String(state.page.id || "").trim().toLowerCase())
      .sort((left, right) => {
        const leftUpdated = Number(left.updatedAt || left.createdAt || 0);
        const rightUpdated = Number(right.updatedAt || right.createdAt || 0);
        return rightUpdated - leftUpdated;
      });
  }

  function userCanReviewSessions() {
    return Boolean(state.project?.canManageSharing || state.project?.isOwner || state.project?.projectRole === "admin");
  }

  function getSessionUser(session) {
    if (!state.project || !session) {
      return null;
    }

    const sessionUserId = String(session.userId || "").trim().toLowerCase();
    const sources = [
      ...(Array.isArray(state.project.projectMembers) ? state.project.projectMembers : []),
      ...(Array.isArray(state.project.availableUsers) ? state.project.availableUsers : []),
    ];

    return (
      sources.find((entry) => String(entry?.email || "").trim().toLowerCase() === sessionUserId) || null
    );
  }

  function getSessionUserLabel(session) {
    const currentUserEmail = getCurrentUserEmail();
    const sessionUserId = String(session?.userId || "").trim().toLowerCase();
    const sessionUser = getSessionUser(session);

    if (currentUserEmail && sessionUserId === currentUserEmail) {
      return "You";
    }

    return sessionUser?.fullName || session?.userId || "Project member";
  }

  function inferPageNameFromPrompt(prompt) {
    const firstLine = String(prompt || "")
      .split("\n")
      .map((line) => line.trim())
      .find(Boolean);

    if (!firstLine) {
      return "";
    }

    const normalized = firstLine
      .replace(/^create\s+/i, "")
      .replace(/^build\s+/i, "")
      .replace(/^design\s+/i, "")
      .replace(/^a\s+/i, "")
      .replace(/^an\s+/i, "")
      .slice(0, 48)
      .trim();

    return normalized || "New Page";
  }

  function renderProviderOptions() {
    return state.providers
      .map((provider) => {
        const isActive = provider.id === state.providerId;
        return `
          <button
            type="button"
            class="vibe-panel__provider-option${isActive ? " is-active" : ""}"
            data-vibe-provider-option="${provider.id}"
            role="option"
            aria-selected="${isActive ? "true" : "false"}"
          >
            <strong>${escapeHtml(provider.label)}</strong>
            <small>${escapeHtml(provider.helperCopy || "Ready for user-owned provider auth.")}</small>
          </button>
        `;
      })
      .join("");
  }

  function getCodexAccessLabel(value) {
    return CODEX_ACCESS_OPTIONS.find((option) => option.value === value)?.label || CODEX_ACCESS_OPTIONS[1].label;
  }

  function renderGeneratedState() {
    const vibe = state.page?.vibe;
    const lastDraft = vibe?.lastDraft;
    const appliedDraft = vibe?.appliedDraft;
    const history = Array.isArray(vibe?.draftHistory) ? vibe.draftHistory : [];

    if (!lastDraft) {
      return `
        <section class="vibe-panel__result vibe-panel__result--empty">
          <p>No generated draft yet. Add a prompt and generate page content for this mobile section.</p>
        </section>
      `;
    }

    return `
      <section class="vibe-panel__result">
        <p class="vibe-panel__result-eyebrow">Latest result</p>
        <h3>${escapeHtml(lastDraft.providerLabel || getSelectedProvider()?.label || "Provider")} draft</h3>
        <p>${escapeHtml(vibe.summary || lastDraft.summary || "A new mobile UI concept is ready.")}</p>
        <dl class="vibe-panel__result-meta">
          <div>
            <dt>Provider</dt>
            <dd>${escapeHtml(lastDraft.providerLabel || getSelectedProvider()?.label || "Unknown")}</dd>
          </div>
          <div>
            <dt>Scope</dt>
            <dd>${state.includeProjectContext ? "Project" : "Page"} + ${state.includePageContext ? "Page" : "Prompt"}</dd>
          </div>
        </dl>
        <div class="vibe-panel__result-actions">
          <button type="button" class="vibe-panel__button" data-vibe-generate ${state.loading ? "disabled" : ""}>
            ${state.loading ? "Generating..." : "Regenerate draft"}
          </button>
          <button
            type="button"
            class="vibe-panel__button vibe-panel__button--secondary"
            data-vibe-apply
            ${state.applying ? "disabled" : ""}
          >
            ${state.applying ? "Applying..." : appliedDraft ? "Replace applied content" : "Apply to page"}
          </button>
        </div>
      </section>
      ${
        history.length
          ? `
            <section class="vibe-panel__history">
              <div class="vibe-panel__history-head">
                <p class="vibe-panel__result-eyebrow">Version history</p>
                <span>${history.length} saved version${history.length === 1 ? "" : "s"}</span>
              </div>
              <div class="vibe-panel__history-list">
                ${history
                  .map((entry) => {
                    const generatedAt = Number(entry.generatedAt) || 0;
                    const isLatest = Number(lastDraft.generatedAt || 0) === generatedAt;
                    const isApplied = Number(appliedDraft?.generatedAt || 0) === generatedAt;
                    const timestamp = generatedAt
                      ? new Date(generatedAt).toLocaleString([], {
                          month: "short",
                          day: "numeric",
                          hour: "numeric",
                          minute: "2-digit",
                        })
                      : "Recent";

                    return `
                      <article class="vibe-panel__history-item${isLatest ? " is-active" : ""}">
                        <div class="vibe-panel__history-copy">
                          <div class="vibe-panel__history-meta">
                            <strong>${escapeHtml(entry.providerLabel || "Version")}</strong>
                            <span>${escapeHtml(timestamp)}</span>
                          </div>
                          <p>${escapeHtml(entry.summary || "Saved page draft")}</p>
                          <div class="vibe-panel__history-badges">
                            ${isLatest ? '<span class="vibe-panel__history-badge">Latest</span>' : ""}
                            ${isApplied ? '<span class="vibe-panel__history-badge is-applied">Applied</span>' : ""}
                          </div>
                        </div>
                        <div class="vibe-panel__history-actions">
                          ${
                            !isLatest
                              ? `<button type="button" class="vibe-panel__button vibe-panel__button--ghost" data-vibe-restore="${generatedAt}" ${state.restoring ? "disabled" : ""}>${state.restoring ? "Restoring..." : "Make latest"}</button>`
                              : ""
                          }
                          ${
                            !isApplied
                              ? `<button type="button" class="vibe-panel__button vibe-panel__button--secondary" data-vibe-apply-version="${generatedAt}" ${state.applying ? "disabled" : ""}>${state.applying ? "Applying..." : "Apply version"}</button>`
                              : ""
                          }
                        </div>
                      </article>
                    `;
                  })
                  .join("")}
              </div>
            </section>
          `
          : ""
      }
    `;
  }

  function getSelectedReviewSession() {
    if (!state.reviewSessionId || !state.project) {
      return null;
    }

    return (Array.isArray(state.project.editSessions) ? state.project.editSessions : []).find(
      (session) => session.id === state.reviewSessionId,
    ) || null;
  }

  function renderReviewSurface() {
    const session = getSelectedReviewSession();

    if (!session) {
      return "";
    }

    const review = state.reviewData;
    const page = state.project?.pages?.find((entry) => entry.id === session.pageId);

    return `
      <section class="vibe-panel__review-card vibe-panel__review-card--detail">
        <div class="vibe-panel__history-head">
          <div>
            <p class="vibe-panel__result-eyebrow">Review session</p>
            <h3>${escapeHtml(getSessionUserLabel(session))}</h3>
          </div>
          <button type="button" class="vibe-panel__button vibe-panel__button--ghost" data-vibe-close-review>Done</button>
        </div>
        <div class="vibe-panel__review-copy">
          <strong>${escapeHtml(page?.name || "Project-wide session")}</strong>
          <span>${escapeHtml(session.branchName || "Session branch")}</span>
        </div>
        ${
          state.reviewLoading
            ? `<p class="vibe-panel__empty">Loading the real git diff for this session…</p>`
            : review
              ? `
                <div class="vibe-panel__review-summary">
                  <span>${review.totals?.files || 0} file${review.totals?.files === 1 ? "" : "s"}</span>
                  <span>+${review.totals?.added || 0}</span>
                  <span>-${review.totals?.removed || 0}</span>
                  <span>${escapeHtml(review.baseBranch || "main")} → ${escapeHtml(review.branchName || session.branchName || "branch")}</span>
                </div>
                ${
                  Array.isArray(review.files) && review.files.length
                    ? `
                      <div class="vibe-panel__review-files">
                        ${review.files
                          .map(
                            (file) => `
                              <article class="vibe-panel__review-file">
                                <div class="vibe-panel__review-copy">
                                  <strong>${escapeHtml(file.path || "Changed file")}</strong>
                                  <span>${escapeHtml(file.status || "M")} • +${Number(file.added || 0)} / -${Number(file.removed || 0)}</span>
                                </div>
                              </article>
                            `,
                          )
                          .join("")}
                      </div>
                    `
                    : `<p class="vibe-panel__empty">No changed files were detected for this session yet.</p>`
                }
                <div class="vibe-panel__diff">
                  <p class="vibe-panel__review-label">Patch preview</p>
                  <pre class="vibe-panel__diff-pre">${escapeHtml(review.patch || "No patch output available.")}</pre>
                </div>
              `
              : `<p class="vibe-panel__empty">Open a session review to inspect changed files and patch details before merging.</p>`
        }
        ${
          userCanReviewSessions()
            ? `<div class="vibe-panel__result-actions"><button type="button" class="vibe-panel__button vibe-panel__button--secondary" data-vibe-merge-session="${escapeHtml(session.id)}" ${state.applying ? "disabled" : ""}>${state.applying ? "Merging..." : "Merge session"}</button></div>`
            : ""
        }
      </section>
    `;
  }

  function renderDrawer() {
    const selectedProvider = getSelectedProvider();
    const providerConnected = isProviderConnected(selectedProvider?.id);
    const integrationAccountLabel = getCurrentUser()?.integrations?.[selectedProvider?.id || ""]?.accountLabel || "";
    const providerStatus = getProviderStatusMessage(selectedProvider, providerConnected, integrationAccountLabel);
    const pageName = state.page?.name || "Page";
    const projectName = state.project?.name || "Project";
    const vibe = state.page?.vibe || {};
    const activeSession = getActiveSession();
    const projectSessions = Array.isArray(state.project?.editSessions) ? state.project.editSessions : [];
    const pageSessions = getPageSessions();
    const projectReviewSessions = projectSessions
      .filter((session) => String(session.status || "").trim().toLowerCase() === "ready_for_review")
      .sort((left, right) => Number(right.updatedAt || right.createdAt || 0) - Number(left.updatedAt || left.createdAt || 0));
    const reviewSessions = pageSessions.filter((session) => String(session.status || "").trim().toLowerCase() === "ready_for_review");
    const inProgressSessions = pageSessions.filter((session) => String(session.status || "").trim().toLowerCase() === "active");
    const sessionReady = Boolean(activeSession || state.project?.canCreateEditSession);
    const currentSessionStatus = String(activeSession?.status || "").trim().toLowerCase();
    const canCreatePageFromCodex = Boolean(
      state.project?.canCreateEditSession &&
        state.prompt.trim() &&
        currentSessionStatus !== "ready_for_review",
    );
    const canGenerateForCurrentSession = currentSessionStatus ? currentSessionStatus === "active" : Boolean(sessionReady);
    const canReviewSessions = userCanReviewSessions();

    drawerRoot.innerHTML = `
      <div class="vibe-panel__inner">
        <div class="vibe-panel__header">
          <div class="vibe-panel__header-copy">
            <p class="vibe-panel__eyebrow">Vibe coding</p>
            <h2>${escapeHtml(pageName)}</h2>
            <p>Generate front-end UI for the mobile section of <strong>${escapeHtml(projectName)}</strong>. This stays scoped to this page only.</p>
          </div>
          <button class="vibe-panel__close" type="button" data-vibe-close aria-label="Close vibe coding">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M6 6 18 18"></path>
              <path d="M18 6 6 18"></path>
            </svg>
          </button>
        </div>

        <section class="vibe-panel__section">
          <div class="vibe-panel__control-rail">
            <div class="vibe-panel__workspace-card">
              <div class="vibe-panel__workspace-head">
                <div class="vibe-panel__workspace-copy">
                  <p class="vibe-panel__result-eyebrow">Codex workspace</p>
                  <h3>${escapeHtml(projectName)}</h3>
                  <p>This project-level control surface manages Codex access, context, and review before you generate anything for <strong>${escapeHtml(pageName)}</strong>.</p>
                </div>
                <div class="vibe-panel__context-summary">
                  <span class="vibe-panel__context-pill">${escapeHtml((state.project?.visibility || "private").replace(/_/g, " "))}</span>
                  <span class="vibe-panel__context-pill is-accent">${escapeHtml((state.project?.codexAccessMode || "contributors").replace(/_/g, " "))}</span>
                </div>
              </div>
              <div class="vibe-panel__workspace-grid">
                <div class="vibe-panel__meta-card">
                  <span>Codex project context</span>
                  <strong>${escapeHtml(state.project?.codexContextId || "Pending")}</strong>
                </div>
                <div class="vibe-panel__meta-card">
                  <span>Current page</span>
                  <strong>${escapeHtml(pageName)}</strong>
                </div>
                ${
                  state.project?.canManageSharing
                    ? `
                      <div class="vibe-panel__field vibe-panel__field--compact">
                        <span>Who can edit with Codex</span>
                        <div class="vibe-panel__provider-select">
                          <button
                            type="button"
                            class="vibe-panel__provider-trigger vibe-panel__provider-trigger--compact"
                            data-vibe-codex-access-toggle
                            aria-expanded="${state.codexAccessSelectOpen ? "true" : "false"}"
                          >
                            <span>
                              <strong>${escapeHtml(getCodexAccessLabel(state.project?.codexAccessMode || "contributors"))}</strong>
                              <small>Control who can create and review Codex edit sessions.</small>
                            </span>
                            <svg viewBox="0 0 24 24" aria-hidden="true">
                              <path d="m7 10 5 5 5-5"></path>
                            </svg>
                          </button>
                          <div class="vibe-panel__provider-menu${state.codexAccessSelectOpen ? " is-open" : ""}" role="listbox">
                            ${CODEX_ACCESS_OPTIONS.map(
                              (option) => `
                                <button
                                  type="button"
                                  class="vibe-panel__provider-option${state.project?.codexAccessMode === option.value ? " is-active" : ""}"
                                  data-vibe-codex-access-option="${option.value}"
                                  role="option"
                                  aria-selected="${state.project?.codexAccessMode === option.value ? "true" : "false"}"
                                >
                                  <strong>${escapeHtml(option.label)}</strong>
                                  <small>${
                                    option.value === "owner_admin_only"
                                      ? "Limit Codex sessions to owners and project admins."
                                      : option.value === "contributors"
                                        ? "Let project contributors open Codex edit sessions."
                                        : "Allow every project member to edit with Codex."
                                  }</small>
                                </button>
                              `,
                            ).join("")}
                          </div>
                        </div>
                      </div>
                    `
                    : ""
                }
              </div>
              ${
                state.project?.canManageSharing
                  ? `
                    <div class="vibe-panel__workspace-review">
                      <div class="vibe-panel__history-head">
                        <p class="vibe-panel__result-eyebrow">Project review queue</p>
                        <span>${projectReviewSessions.length} ready</span>
                      </div>
                      ${
                        projectReviewSessions.length
                          ? `
                            <div class="vibe-panel__review-list">
                              ${projectReviewSessions
                                .map((session) => {
                                  const sessionPage = state.project?.pages?.find((page) => page.id === session.pageId);
                                  return `
                                    <article class="vibe-panel__review-item">
                                      <div class="vibe-panel__review-copy">
                                        <strong>${escapeHtml(getSessionUserLabel(session))}</strong>
                                        <span>${escapeHtml(sessionPage?.name || "Project-wide session")} • ${escapeHtml(session.branchName || "Scaffold branch")}</span>
                                      </div>
                                      <div class="vibe-panel__review-actions">
                                        <button type="button" class="vibe-panel__button vibe-panel__button--ghost" data-vibe-open-review="${escapeHtml(session.id)}">Review</button>
                                        <button type="button" class="vibe-panel__button vibe-panel__button--secondary" data-vibe-merge-session="${escapeHtml(session.id)}">Merge</button>
                                      </div>
                                    </article>
                                  `;
                                })
                                .join("")}
                            </div>
                          `
                          : `<p class="vibe-panel__empty">No project sessions are currently waiting for review.</p>`
                      }
                    </div>
                  `
                : ""
              }
            </div>

            <div class="vibe-panel__session-block">
              <div class="vibe-panel__section-head">
                <div>
                  <p class="vibe-panel__result-eyebrow">Current page workflow</p>
                  <h3>${escapeHtml(pageName)}</h3>
                </div>
                <span class="vibe-panel__section-tag">${pageSessions.length} session${pageSessions.length === 1 ? "" : "s"}</span>
              </div>
              <div class="vibe-panel__session-card${activeSession ? " is-active" : ""}">
                <div class="vibe-panel__session-copy">
                  <p class="vibe-panel__result-eyebrow">Edit session</p>
                  ${
                    activeSession
                      ? `
                        <strong>${currentSessionStatus === "ready_for_review" ? "Session ready for review" : "Session active for this page"}</strong>
                        <span>${escapeHtml(activeSession.branchName || "Scaffold branch")}</span>
                        <small>${escapeHtml(activeSession.worktreePath || "project-workspaces/...")}</small>
                      `
                      : state.project?.canCreateEditSession
                        ? `
                          <strong>No active session yet</strong>
                          <span>Start an isolated Codex edit session for this page before generating or creating a new page from prompt.</span>
                        `
                        : `
                          <strong>Codex editing is restricted</strong>
                          <span>You can view this page, but you do not currently have permission to create an edit session here.</span>
                        `
                  }
                </div>
                ${
                  !activeSession && state.project?.canCreateEditSession
                    ? `<button type="button" class="vibe-panel__button vibe-panel__button--ghost" data-vibe-create-session ${state.sessionCreating ? "disabled" : ""}>${state.sessionCreating ? "Starting..." : "Start session"}</button>`
                    : activeSession
                      ? `
                        <div class="vibe-panel__session-actions">
                          <button
                            type="button"
                            class="vibe-panel__button vibe-panel__button--ghost"
                            data-vibe-session-status="${currentSessionStatus === "ready_for_review" ? "active" : "ready_for_review"}"
                          >
                            ${currentSessionStatus === "ready_for_review" ? "Resume editing" : "Mark ready for review"}
                          </button>
                          ${
                            currentSessionStatus === "ready_for_review" && canReviewSessions
                              ? `<button type="button" class="vibe-panel__button vibe-panel__button--secondary" data-vibe-merge-session="${escapeHtml(activeSession.id)}">Merge session</button>`
                              : ""
                          }
                        </div>
                      `
                      : ""
                }
              </div>
              ${
                pageSessions.length
                  ? `
                    <div class="vibe-panel__review-card">
                      <div class="vibe-panel__history-head">
                        <p class="vibe-panel__result-eyebrow">Page review flow</p>
                        <span>${pageSessions.length} session${pageSessions.length === 1 ? "" : "s"}</span>
                      </div>
                      ${
                        reviewSessions.length
                          ? `
                            <div class="vibe-panel__review-group">
                              <span class="vibe-panel__review-label">Ready for review</span>
                              <div class="vibe-panel__review-list">
                                ${reviewSessions
                                  .map(
                                    (session) => `
                                      <article class="vibe-panel__review-item">
                                        <div class="vibe-panel__review-copy">
                                          <strong>${escapeHtml(getSessionUserLabel(session))}</strong>
                                          <span>${escapeHtml(session.branchName || "Scaffold branch")}</span>
                                        </div>
                                        ${
                                          canReviewSessions
                                            ? `
                                              <div class="vibe-panel__review-actions">
                                                <button type="button" class="vibe-panel__button vibe-panel__button--ghost" data-vibe-open-review="${escapeHtml(session.id)}">Review</button>
                                                <button type="button" class="vibe-panel__button vibe-panel__button--secondary" data-vibe-merge-session="${escapeHtml(session.id)}">Merge</button>
                                              </div>
                                            `
                                            : `<button type="button" class="vibe-panel__button vibe-panel__button--ghost" data-vibe-open-review="${escapeHtml(session.id)}">Review</button>`
                                        }
                                      </article>
                                    `,
                                  )
                                  .join("")}
                              </div>
                            </div>
                          `
                          : ""
                      }
                      ${
                        inProgressSessions.length
                          ? `
                            <div class="vibe-panel__review-group">
                              <span class="vibe-panel__review-label">In progress</span>
                              <div class="vibe-panel__review-list">
                                ${inProgressSessions
                                  .map(
                                    (session) => `
                                      <article class="vibe-panel__review-item">
                                        <div class="vibe-panel__review-copy">
                                          <strong>${escapeHtml(getSessionUserLabel(session))}</strong>
                                          <span>${escapeHtml(session.branchName || "Scaffold branch")}</span>
                                        </div>
                                      </article>
                                    `,
                                  )
                                  .join("")}
                              </div>
                            </div>
                          `
                          : ""
                      }
                    </div>
                  `
                  : ""
              }
            </div>
          </div>

          ${renderReviewSurface()}

          <div class="vibe-panel__field">
            <span>Tool</span>
            <div class="vibe-panel__provider-select" data-vibe-provider-select>
              <button
                type="button"
                class="vibe-panel__provider-trigger"
                data-vibe-provider-toggle
                aria-expanded="${state.dropdownOpen ? "true" : "false"}"
              >
                <span>
                  <strong>${escapeHtml(selectedProvider?.label || "Codex")}</strong>
                  <small>${escapeHtml(selectedProvider?.helperCopy || "Ready for user-owned provider auth.")}</small>
                </span>
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="m7 10 5 5 5-5"></path>
                </svg>
              </button>
              <div class="vibe-panel__provider-menu${state.dropdownOpen ? " is-open" : ""}" role="listbox">
                ${renderProviderOptions()}
              </div>
            </div>
            <p class="vibe-panel__provider-status${providerStatus.tone === "connected" ? " is-connected" : ""}">
              ${escapeHtml(providerStatus.text)}
            </p>
          </div>

          <div class="vibe-panel__field">
            <span>Prompt</span>
            <textarea
              class="vibe-panel__prompt"
              data-vibe-prompt
              placeholder="Describe the UI you want inside this mobile page. Focus on front-end layout, content, and states only."
            >${escapeHtml(state.prompt)}</textarea>
          </div>

          <div class="vibe-panel__context">
            <label class="vibe-panel__toggle">
              <input type="checkbox" data-vibe-context="project" ${state.includeProjectContext ? "checked" : ""} />
              <span>Include project context</span>
            </label>
            <label class="vibe-panel__toggle">
              <input type="checkbox" data-vibe-context="page" ${state.includePageContext ? "checked" : ""} />
              <span>Include page context</span>
            </label>
          </div>

          <div class="vibe-panel__stack">
            <button type="button" class="vibe-panel__button" data-vibe-generate ${state.loading || !providerConnected || !canGenerateForCurrentSession ? "disabled" : ""}>
              ${state.loading ? "Generating..." : "Generate draft"}
            </button>
            <button
              type="button"
              class="vibe-panel__button vibe-panel__button--secondary"
              data-vibe-create-page
              ${state.pageCreating || !canCreatePageFromCodex ? "disabled" : ""}
            >
              ${state.pageCreating ? "Creating page..." : "Create new page from prompt"}
            </button>
            <p class="vibe-panel__hint">
              ${
                usesLocalBridge(selectedProvider)
                  ? `Codex App uses a localhost bridge at ${escapeHtml(state.localBridge.url)} so generation stays tied to this machine.`
                  : currentSessionStatus === "ready_for_review"
                    ? "This session is currently waiting for review. Resume editing if you want to generate another draft before it is merged."
                    : "Provider execution is adapter-based in this version. The contract is ready for user-owned provider credentials without storing raw secrets in UX Bridge."
              }
            </p>
            ${
              state.error
                ? `<p class="vibe-panel__status vibe-panel__status--error">${escapeHtml(state.error)}</p>`
                : vibe.error
                  ? `<p class="vibe-panel__status vibe-panel__status--error">${escapeHtml(vibe.error)}</p>`
                  : ""
            }
          </div>
        </section>

        ${renderGeneratedState()}
      </div>
    `;

    bindDrawerEvents();
  }

  function bindDrawerEvents() {
    drawerRoot.querySelector("[data-vibe-close]")?.addEventListener("click", () => {
      setDrawerOpen(false);
    });

    drawerRoot.querySelector("[data-vibe-provider-toggle]")?.addEventListener("click", () => {
      state.dropdownOpen = !state.dropdownOpen;
      state.codexAccessSelectOpen = false;
      renderDrawer();
    });

    drawerRoot.querySelector("[data-vibe-codex-access-toggle]")?.addEventListener("click", () => {
      state.codexAccessSelectOpen = !state.codexAccessSelectOpen;
      state.dropdownOpen = false;
      renderDrawer();
    });

    drawerRoot.querySelectorAll("[data-vibe-provider-option]").forEach((option) => {
      option.addEventListener("click", () => {
        state.providerId = option.dataset.vibeProviderOption || state.providerId;
        state.dropdownOpen = false;
        renderDrawer();
        if (usesLocalBridge()) {
          void checkLocalBridge(true);
        }
      });
    });

    drawerRoot.querySelectorAll("[data-vibe-codex-access-option]").forEach((option) => {
      option.addEventListener("click", () => {
        void updateCodexAccess(option.getAttribute("data-vibe-codex-access-option") || "");
      });
    });

    drawerRoot.querySelector("[data-vibe-prompt]")?.addEventListener("input", (event) => {
      state.prompt = event.currentTarget.value;
    });

    drawerRoot.querySelectorAll("[data-vibe-context]").forEach((input) => {
      input.addEventListener("change", () => {
        state.includeProjectContext = drawerRoot.querySelector('[data-vibe-context="project"]')?.checked !== false;
        state.includePageContext = drawerRoot.querySelector('[data-vibe-context="page"]')?.checked !== false;
      });
    });

    drawerRoot.querySelector("[data-vibe-generate]")?.addEventListener("click", () => {
      void generateDraft();
    });

    drawerRoot.querySelector("[data-vibe-create-session]")?.addEventListener("click", () => {
      void ensureActiveSession();
    });

    drawerRoot.querySelector("[data-vibe-create-page]")?.addEventListener("click", () => {
      void createPageFromPrompt();
    });

    drawerRoot.querySelectorAll("[data-vibe-session-status]").forEach((button) => {
      button.addEventListener("click", () => {
        void updateSessionStatus(button.getAttribute("data-vibe-session-status") || "");
      });
    });

    drawerRoot.querySelectorAll("[data-vibe-merge-session]").forEach((button) => {
      button.addEventListener("click", () => {
        void mergeSession(button.getAttribute("data-vibe-merge-session") || "");
      });
    });

    drawerRoot.querySelectorAll("[data-vibe-open-review]").forEach((button) => {
      button.addEventListener("click", () => {
        void openSessionReview(button.getAttribute("data-vibe-open-review") || "");
      });
    });

    drawerRoot.querySelector("[data-vibe-close-review]")?.addEventListener("click", () => {
      state.reviewSessionId = "";
      state.reviewData = null;
      renderDrawer();
    });

    drawerRoot.querySelector("[data-vibe-apply]")?.addEventListener("click", () => {
      void applyDraft();
    });

    drawerRoot.querySelectorAll("[data-vibe-restore]").forEach((button) => {
      button.addEventListener("click", () => {
        void restoreDraft(button.getAttribute("data-vibe-restore"));
      });
    });

    drawerRoot.querySelectorAll("[data-vibe-apply-version]").forEach((button) => {
      button.addEventListener("click", () => {
        void applyDraft(button.getAttribute("data-vibe-apply-version"));
      });
    });
  }

  async function persistGeneratedDraft(generated) {
    const response = await fetch(PROJECTS_API, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        action: "saveVibeDraft",
        project: state.project.id,
        page: state.page.id,
        providerId: state.providerId,
        prompt: state.prompt,
        includeProjectContext: state.includeProjectContext,
        includePageContext: state.includePageContext,
        generated,
      }),
    });
    const payload = await response.json().catch(() => ({}));

    if (!response.ok || !payload?.ok || !payload?.project) {
      throw new Error(payload?.error || "Unable to save the generated page draft.");
    }

    state.providers = Array.isArray(payload.vibeProviders) && payload.vibeProviders.length ? payload.vibeProviders : state.providers;
    syncFromProject(payload.project, state.page.id);
    window.dispatchEvent(
      new CustomEvent("uxbridge:project-runtime-sync", {
        detail: { project: payload.project },
      }),
    );
  }

  async function ensureActiveSession() {
    if (!state.project || !state.page) {
      return null;
    }

    const existingSession = getActiveSession();

    if (existingSession) {
      return existingSession;
    }

    if (!state.project.canCreateEditSession || state.sessionCreating) {
      return null;
    }

    state.sessionCreating = true;
    state.error = "";
    renderDrawer();

    try {
      const response = await fetch(PROJECTS_API, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "createEditSession",
          project: state.project.id,
          page: state.page.id,
          source: usesLocalBridge() ? "local-bridge" : state.providerId,
        }),
      });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok || !payload?.ok || !payload?.project) {
        throw new Error(payload?.error || "Unable to start a Codex edit session for this page.");
      }

      syncFromProject(payload.project, state.page.id);
      window.dispatchEvent(
        new CustomEvent("uxbridge:project-runtime-sync", {
          detail: { project: payload.project },
        }),
      );

      return payload.session || getActiveSession();
    } catch (error) {
      state.error = error instanceof Error ? error.message : "Unable to start a Codex edit session for this page.";
      renderDrawer();
      return null;
    } finally {
      state.sessionCreating = false;
      renderDrawer();
    }
  }

  async function createPageFromPrompt() {
    if (!state.project || state.pageCreating || !state.prompt.trim()) {
      return;
    }

    if (!(await ensureActiveSession())) {
      return;
    }

    state.pageCreating = true;
    state.error = "";
    renderDrawer();

    try {
      const response = await fetch(PROJECTS_API, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "createPageFromCodex",
          project: state.project.id,
          name: inferPageNameFromPrompt(state.prompt),
        }),
      });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok || !payload?.ok || !payload?.page?.launchUrl) {
        throw new Error(payload?.error || "Unable to create a new page from this prompt.");
      }

      window.location.href = payload.page.launchUrl;
    } catch (error) {
      state.error = error instanceof Error ? error.message : "Unable to create a new page from this prompt.";
      renderDrawer();
    } finally {
      state.pageCreating = false;
      renderDrawer();
    }
  }

  async function updateCodexAccess(codexAccessMode = "") {
    if (!state.project || !codexAccessMode) {
      return;
    }

    state.sessionCreating = true;
    state.error = "";
    state.codexAccessSelectOpen = false;
    renderDrawer();

    try {
      const response = await fetch(PROJECTS_API, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "updateProjectPrivacy",
          project: state.project.id,
          codexAccessMode,
        }),
      });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok || !payload?.ok || !payload?.project) {
        throw new Error(payload?.error || "Unable to update Codex access settings.");
      }

      syncFromProject(payload.project, state.page.id);
      window.dispatchEvent(
        new CustomEvent("uxbridge:project-runtime-sync", {
          detail: { project: payload.project },
        }),
      );
    } catch (error) {
      state.error = error instanceof Error ? error.message : "Unable to update Codex access settings.";
      renderDrawer();
    } finally {
      state.sessionCreating = false;
      renderDrawer();
    }
  }

  async function updateSessionStatus(nextStatus = "") {
    const session = getActiveSession();

    if (!state.project || !session || !nextStatus) {
      return;
    }

    state.sessionCreating = true;
    state.error = "";
    renderDrawer();

    try {
      const response = await fetch(PROJECTS_API, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "updateEditSessionStatus",
          project: state.project.id,
          sessionId: session.id,
          status: nextStatus,
        }),
      });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok || !payload?.ok || !payload?.project) {
        throw new Error(payload?.error || "Unable to update the edit session status.");
      }

      syncFromProject(payload.project, state.page.id);
      window.dispatchEvent(
        new CustomEvent("uxbridge:project-runtime-sync", {
          detail: { project: payload.project },
        }),
      );
    } catch (error) {
      state.error = error instanceof Error ? error.message : "Unable to update the edit session status.";
      renderDrawer();
    } finally {
      state.sessionCreating = false;
      renderDrawer();
    }
  }

  async function mergeSession(sessionId = "") {
    if (!state.project || !sessionId || state.applying) {
      return;
    }

    state.applying = true;
    state.error = "";
    renderDrawer();

    try {
      const response = await fetch(PROJECTS_API, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "mergeEditSession",
          project: state.project.id,
          sessionId,
        }),
      });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok || !payload?.ok || !payload?.project) {
        throw new Error(payload?.error || "Unable to merge this edit session.");
      }

      if (state.reviewSessionId === sessionId) {
        state.reviewSessionId = "";
        state.reviewData = null;
      }

      syncFromProject(payload.project, state.page.id);
      window.dispatchEvent(
        new CustomEvent("uxbridge:project-runtime-sync", {
          detail: { project: payload.project },
        }),
      );
    } catch (error) {
      state.error = error instanceof Error ? error.message : "Unable to merge this edit session.";
      renderDrawer();
    } finally {
      state.applying = false;
      renderDrawer();
    }
  }

  async function openSessionReview(sessionId = "") {
    if (!state.project || !sessionId || state.reviewLoading) {
      return;
    }

    state.reviewSessionId = sessionId;
    state.reviewData = null;
    state.reviewLoading = true;
    state.error = "";
    renderDrawer();

    try {
      const response = await fetch(PROJECTS_API, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "getEditSessionReview",
          project: state.project.id,
          sessionId,
        }),
      });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok || !payload?.ok || !payload?.review) {
        throw new Error(payload?.error || "Unable to load the edit-session review.");
      }

      state.reviewData = payload.review;
    } catch (error) {
      state.error = error instanceof Error ? error.message : "Unable to load the edit-session review.";
    } finally {
      state.reviewLoading = false;
      renderDrawer();
    }
  }

  async function generateDraftViaLocalBridge() {
    const response = await fetch(`${state.localBridge.url}/v1/generate-page`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        projectId: state.project.id,
        projectName: state.project.name,
        pageId: state.page.id,
        pageName: state.page.name,
        prompt: state.prompt,
        includeProjectContext: state.includeProjectContext,
        includePageContext: state.includePageContext,
      }),
    });
    const payload = await response.json().catch(() => ({}));

    if (!response.ok || !payload?.ok || !payload?.result) {
      throw new Error(payload?.error || "The local Codex bridge could not generate page content.");
    }

    await persistGeneratedDraft(payload.result);
  }

  async function generateDraft() {
    if (!state.project || !state.page || !state.prompt.trim() || state.loading) {
      return;
    }

    if (!isProviderConnected()) {
      state.error = `Connect ${getSelectedProvider()?.label || "this provider"} in your Profile before generating.`;
      renderDrawer();
      return;
    }

    state.loading = true;
    state.error = "";
    renderDrawer();

    try {
      if (!(await ensureActiveSession())) {
        return;
      }

      if (usesLocalBridge()) {
        await generateDraftViaLocalBridge();
        return;
      }

      const response = await fetch(PROJECTS_API, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "generateVibeContent",
          project: state.project.id,
          page: state.page.id,
          providerId: state.providerId,
          prompt: state.prompt,
          includeProjectContext: state.includeProjectContext,
          includePageContext: state.includePageContext,
        }),
      });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok || !payload?.ok || !payload?.project) {
        throw new Error(payload?.error || "Unable to generate page content.");
      }

      state.providers = Array.isArray(payload.vibeProviders) && payload.vibeProviders.length ? payload.vibeProviders : state.providers;
      syncFromProject(payload.project, state.page.id);
      window.dispatchEvent(
        new CustomEvent("uxbridge:project-runtime-sync", {
          detail: { project: payload.project },
        }),
      );
    } catch (error) {
      state.error = error instanceof Error ? error.message : "Unable to generate page content.";
      renderDrawer();
    } finally {
      state.loading = false;
      renderDrawer();
    }
  }

  async function applyDraft(draftGeneratedAt = "") {
    if (!state.project || !state.page || state.applying) {
      return;
    }

    state.applying = true;
    state.error = "";
    renderDrawer();

    try {
      const response = await fetch(PROJECTS_API, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "applyVibeContent",
          project: state.project.id,
          page: state.page.id,
          ...(draftGeneratedAt ? { draftGeneratedAt: Number(draftGeneratedAt) || 0 } : {}),
        }),
      });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok || !payload?.ok || !payload?.project) {
        throw new Error(payload?.error || "Unable to apply generated page content.");
      }

      state.providers = Array.isArray(payload.vibeProviders) && payload.vibeProviders.length ? payload.vibeProviders : state.providers;
      syncFromProject(payload.project, state.page.id);
      window.dispatchEvent(
        new CustomEvent("uxbridge:project-runtime-sync", {
          detail: { project: payload.project },
        }),
      );
    } catch (error) {
      state.error = error instanceof Error ? error.message : "Unable to apply generated page content.";
      renderDrawer();
    } finally {
      state.applying = false;
      renderDrawer();
    }
  }

  async function restoreDraft(draftGeneratedAt = "") {
    if (!state.project || !state.page || state.restoring) {
      return;
    }

    state.restoring = true;
    state.error = "";
    renderDrawer();

    try {
      const response = await fetch(PROJECTS_API, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "restoreVibeDraft",
          project: state.project.id,
          page: state.page.id,
          draftGeneratedAt: Number(draftGeneratedAt) || 0,
        }),
      });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok || !payload?.ok || !payload?.project) {
        throw new Error(payload?.error || "Unable to restore this version.");
      }

      state.providers = Array.isArray(payload.vibeProviders) && payload.vibeProviders.length ? payload.vibeProviders : state.providers;
      syncFromProject(payload.project, state.page.id);
      window.dispatchEvent(
        new CustomEvent("uxbridge:project-runtime-sync", {
          detail: { project: payload.project },
        }),
      );
    } catch (error) {
      state.error = error instanceof Error ? error.message : "Unable to restore this version.";
      renderDrawer();
    } finally {
      state.restoring = false;
      renderDrawer();
    }
  }

  async function hydrateInitialState() {
    try {
      const response = await fetch(`${PROJECTS_API}?project=${encodeURIComponent(projectId)}`, {
        credentials: "include",
        cache: "no-store",
      });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok || !payload?.ok || !payload?.project) {
        return;
      }

      state.providers = Array.isArray(payload.vibeProviders) && payload.vibeProviders.length ? payload.vibeProviders : listFallbackProviders();
      state.currentUser = payload.currentUser || getCurrentUser();
      syncFromProject(payload.project, requestedPageId);
      void checkLocalBridge();
    } catch {
      state.providers = listFallbackProviders();
      renderDrawer();
    }
  }

  function listFallbackProviders() {
    return [
      {
        id: "codex-app",
        label: "Codex App",
        availableVia: "local-bridge",
        helperCopy: "Uses a local Codex bridge on this machine to generate page-scoped mobile UI.",
      },
      {
        id: "codex",
        label: "Codex",
        helperCopy: "Ready for a user-owned Codex session or connector-based execution flow.",
      },
      {
        id: "claude",
        label: "Claude",
        helperCopy: "Structured for connector-based Claude execution with the user’s own credentials.",
      },
      {
        id: "generic",
        label: "Other tool",
        helperCopy: "Fallback adapter for other vibe-coding tools while preserving the same UX Bridge contract.",
      },
    ];
  }

  document.addEventListener("click", (event) => {
    if (!state.dropdownOpen) {
      return;
    }

    if (!drawerRoot.contains(event.target)) {
      state.dropdownOpen = false;
      renderDrawer();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      if (state.dropdownOpen) {
        state.dropdownOpen = false;
        renderDrawer();
        return;
      }

      if (state.drawerOpen) {
        setDrawerOpen(false);
      }
    }
  });

  window.addEventListener("uxbridge:project-page-sync", (event) => {
    const project = event.detail?.project;
    const page = event.detail?.page;

    if (!project || !page || project.id !== projectId) {
      return;
    }

    if (!state.providers.length) {
      state.providers = listFallbackProviders();
    }

    syncFromProject(project, page.id);
  });

  window.addEventListener("uxbridge:user-ready", (event) => {
    state.currentUser = event.detail || null;
    renderDrawer();
  });

  state.providers = listFallbackProviders();
  setupDrawerLauncher();
  renderDrawer();
  mobileSheetBackdrop?.addEventListener("click", () => {
    if (state.drawerOpen) {
      setDrawerOpen(false);
    }
  });
  window.addEventListener("resize", syncMobileSheetBackdrop);
  document.querySelector("[data-vibe-launch]")?.addEventListener("click", () => {
    setDrawerOpen(true);
  });
  void hydrateInitialState();
})();
