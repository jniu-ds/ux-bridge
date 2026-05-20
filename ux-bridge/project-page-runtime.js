(function initProjectPageRuntime() {
  const PROJECTS_API = "/api/projects";
  const PROJECT_SYNC_MS = 15000;
  const params = new URLSearchParams(window.location.search);
  const projectId = String(params.get("project") || "").trim().toLowerCase();
  const requestedPageId = String(params.get("page") || "").trim().toLowerCase();

  if (!projectId) {
    window.location.replace("/projects.html");
    return;
  }

  const navRoot = document.querySelector("[data-project-nav-pages]");
  const titleNode = document.querySelector("[data-project-page-title]");
  const titleShell = document.querySelector("[data-page-title-shell]");
  const editTitleButton = document.querySelector("[data-edit-page-name]");
  const titleEditor = document.querySelector("[data-page-title-editor]");
  const titleInput = document.querySelector("[data-page-title-input]");
  const saveTitleButton = document.querySelector("[data-save-page-name]");
  const breadcrumbProjectName = document.querySelector("[data-project-name]");
  const shellTitleNode = document.querySelector("[data-empty-shell-page-title]");
  const addPageButton = document.querySelector("[data-add-project-page]");
  const mobilePage = document.querySelector(".mobile-page");
  const emptyMobileShell = document.querySelector("[data-empty-mobile-shell]");
  const vibeMobileStage = document.querySelector("[data-vibe-mobile-stage]");
  const vibeMobileStyle = document.querySelector("[data-vibe-mobile-style]");
  const vibeMobileRender = document.querySelector("[data-vibe-mobile-render]");
  const state = {
    project: null,
    currentPage: null,
    canCreatePages: false,
    savingName: false,
    pageOrder: [],
    pollTimer: null,
    syncing: false,
    lastSyncSignature: "",
    lastProjectChangeAt: 0,
  };

  function cleanupPreviewScript() {
    const cleanup = vibeMobileRender?.__uxBridgePreviewCleanup;

    if (typeof cleanup === "function") {
      try {
        cleanup();
      } catch (error) {
        console.warn("[project-page] preview.js cleanup failed", error);
      }
    }

    if (vibeMobileRender) {
      vibeMobileRender.__uxBridgePreviewCleanup = null;
    }
  }

  function runPreviewScript(page, preview) {
    cleanupPreviewScript();

    if (!vibeMobileRender) {
      return;
    }

    const previewJs = String(preview?.js || "").trim();

    if (!previewJs) {
      return;
    }

    const root = vibeMobileRender.firstElementChild instanceof HTMLElement ? vibeMobileRender.firstElementChild : vibeMobileRender;

    try {
      const cleanup = new Function("root", "page", "project", "api", previewJs)(root, page, state.project, {});

      if (typeof cleanup === "function") {
        vibeMobileRender.__uxBridgePreviewCleanup = cleanup;
      }
    } catch (error) {
      console.warn("[project-page] preview.js failed", error);
    }
  }

  function getCurrentUserEmail() {
    return String(window.uxBridgeUser?.email || "").trim().toLowerCase();
  }

  function renderAppliedVibe(page) {
    if (!mobilePage || !emptyMobileShell || !vibeMobileStage || !vibeMobileStyle || !vibeMobileRender) {
      return;
    }

    const preview = page?.preview || page?.vibe?.appliedDraft;
    const hasAppliedContent = Boolean(preview?.html);

    mobilePage.classList.toggle("mobile-page--empty", !hasAppliedContent);
    emptyMobileShell.hidden = hasAppliedContent;
    vibeMobileStage.hidden = !hasAppliedContent;

    if (!hasAppliedContent) {
      cleanupPreviewScript();
      vibeMobileStyle.textContent = "";
      vibeMobileRender.innerHTML = "";
      return;
    }

    vibeMobileStyle.textContent = String(preview.css || "");
    vibeMobileRender.innerHTML = String(preview.html || "");
    runPreviewScript(page, preview);
  }

  function resizeTitleInput() {
    if (!titleInput) {
      return;
    }

    const value = titleInput.value || "";
    const styles = window.getComputedStyle(titleInput);
    const canvas = resizeTitleInput.canvas || (resizeTitleInput.canvas = document.createElement("canvas"));
    const context = canvas.getContext("2d");

    if (!context) {
      return;
    }

    context.font = `${styles.fontWeight} ${styles.fontSize} / ${styles.lineHeight} ${styles.fontFamily}`;
    const horizontalPadding =
      (Number.parseFloat(styles.paddingLeft) || 0) + (Number.parseFloat(styles.paddingRight) || 0);
    const measuredWidth = Math.ceil(context.measureText(value || "Page").width + horizontalPadding + 8);
    const clampedWidth = Math.min(300, Math.max(150, measuredWidth));

    titleInput.style.width = `${clampedWidth}px`;
    titleInput.style.height = "auto";
    titleInput.style.height = `${Math.max(titleInput.scrollHeight, 48)}px`;
  }

  async function loadProject() {
    const response = await fetch(`${PROJECTS_API}?project=${encodeURIComponent(projectId)}`, {
      credentials: "include",
      cache: "no-store",
    });
    const payload = await response.json().catch(() => ({}));

    if (!response.ok || !payload?.ok) {
      throw new Error(payload?.error || "Unable to load project.");
    }

    return payload;
  }

  async function loadProjectSyncMeta() {
    const response = await fetch(
      `${PROJECTS_API}?project=${encodeURIComponent(projectId)}&mode=runtime-sync`,
      {
        credentials: "include",
        cache: "no-store",
      },
    );
    const payload = await response.json().catch(() => ({}));

    if (!response.ok || !payload?.ok) {
      throw new Error(payload?.error || "Unable to load project sync metadata.");
    }

    return payload;
  }

  function buildProjectSyncSignature(project) {
    return JSON.stringify({
      id: project?.id || "",
      name: project?.name || "",
      updatedAt: Number(project?.updatedAt) || 0,
      pages: Array.isArray(project?.pages)
        ? project.pages.map((page) => ({
            id: page.id,
            name: page.name,
            lock: String(page?.pageLock?.lockedBy || ""),
          }))
        : [],
    });
  }

  function getProjectSyncDelay() {
    if (document.visibilityState !== "visible") {
      return 60_000;
    }

    if (state.savingName || state.syncing) {
      return PROJECT_SYNC_MS;
    }

    if (Date.now() - Number(state.lastProjectChangeAt || 0) < 60_000) {
      return PROJECT_SYNC_MS;
    }

    return 45_000;
  }

  function normalizeOrder(pages, order = state.pageOrder) {
    const validKeys = pages.map((page) => page.id).filter(Boolean);
    const normalized = Array.isArray(order) ? order.map((value) => String(value)) : [];
    const deduped = normalized.filter((value, index) => validKeys.includes(value) && normalized.indexOf(value) === index);
    return [...deduped, ...validKeys.filter((value) => !deduped.includes(value))];
  }

  function getOrderedPages(project) {
    const orderedIds = normalizeOrder(project.pages);
    const pageMap = new Map(project.pages.map((page) => [page.id, page]));
    state.pageOrder = orderedIds;
    return orderedIds.map((id) => pageMap.get(id)).filter(Boolean);
  }

  async function loadSavedOrder() {
    const response = await fetch(`/api/project-nav?project=${encodeURIComponent(projectId)}`, {
      method: "GET",
      credentials: "include",
      cache: "no-store",
    });
    const payload = await response.json().catch(() => ({}));

    if (!response.ok || !payload?.ok || !Array.isArray(payload.order)) {
      return [];
    }

    return payload.order;
  }

  async function persistPageOrder(order) {
    state.pageOrder = [...order];
    await fetch("/api/project-nav", {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        project: projectId,
        order,
      }),
    });
  }

  function getCurrentDomOrder() {
    return Array.from(navRoot?.querySelectorAll("[data-project-page-item]") || [])
      .map((item) => item.dataset.projectPageItem)
      .filter(Boolean);
  }

  function attachReorderHandlers(project) {
    if (!navRoot) {
      return;
    }

    let draggedItem = null;

    const getItems = () => Array.from(navRoot.querySelectorAll("[data-project-page-item]"));

    const getDragAfterElement = (container, clientY) => {
      const draggableItems = getItems().filter((item) => item !== draggedItem);
      let closest = null;
      let closestOffset = Number.NEGATIVE_INFINITY;

      draggableItems.forEach((item) => {
        const box = item.getBoundingClientRect();
        const offset = clientY - box.top - box.height / 2;

        if (offset < 0 && offset > closestOffset) {
          closestOffset = offset;
          closest = item;
        }
      });

      return closest;
    };

    navRoot.querySelectorAll(".bridge-sidebar__drag").forEach((handle) => {
      handle.addEventListener("dragstart", (event) => {
        draggedItem = handle.closest("[data-project-page-item]");

        if (!draggedItem || !event.dataTransfer) {
          return;
        }

        draggedItem.classList.add("is-dragging");
        event.dataTransfer.effectAllowed = "move";
        event.dataTransfer.setData("text/plain", draggedItem.dataset.projectPageItem || "");
      });

      handle.addEventListener("dragend", async () => {
        if (!draggedItem) {
          return;
        }

        draggedItem.classList.remove("is-dragging");
        draggedItem = null;
        const order = normalizeOrder(project.pages, getCurrentDomOrder());
        state.pageOrder = order;

        try {
          const response = await fetch(PROJECTS_API, {
            method: "POST",
            credentials: "include",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              action: "reorderPages",
              project: project.id,
              order,
            }),
          });
          const payload = await response.json().catch(() => ({}));

          if (!response.ok || !payload?.ok || !payload?.project) {
            throw new Error(payload?.error || "Unable to reorder pages.");
          }

          state.project = payload.project;
          state.pageOrder = payload.project.pages.map((page) => page.id);
          renderNav(payload.project, state.currentPage?.id, state.canCreatePages);
        } catch {
          // Keep the immediate UI order even if persistence fails.
        }
      });
    });

    navRoot.ondragover = (event) => {
      if (!draggedItem) {
        return;
      }

      event.preventDefault();
      const afterElement = getDragAfterElement(navRoot, event.clientY);

      if (!afterElement) {
        navRoot.append(draggedItem);
        return;
      }

      if (afterElement !== draggedItem) {
        navRoot.insertBefore(draggedItem, afterElement);
      }
    };
  }

  function renderNav(project, currentPageId, canCreatePages) {
    if (!navRoot) {
      return;
    }

    const currentUserEmail = getCurrentUserEmail();

    navRoot.innerHTML = getOrderedPages(project)
      .map(
        (page) => {
          const isLockedByOtherUser = Boolean(
            page.pageLock?.lockedBy && String(page.pageLock.lockedBy).trim().toLowerCase() !== currentUserEmail,
          );

          return `
          <div class="bridge-sidebar__nav-item" data-project-page-item="${page.id}">
            <span class="bridge-sidebar__drag" draggable="true" aria-hidden="true">
              <svg viewBox="0 0 24 24">
                <path d="M8 6.75a1.25 1.25 0 1 1 0-2.5 1.25 1.25 0 0 1 0 2.5Zm0 7a1.25 1.25 0 1 1 0-2.5 1.25 1.25 0 0 1 0 2.5Zm0 7a1.25 1.25 0 1 1 0-2.5 1.25 1.25 0 0 1 0 2.5Zm8-14a1.25 1.25 0 1 1 0-2.5 1.25 1.25 0 0 1 0 2.5Zm0 7a1.25 1.25 0 1 1 0-2.5 1.25 1.25 0 0 1 0 2.5Zm0 7a1.25 1.25 0 1 1 0-2.5 1.25 1.25 0 0 1 0 2.5Z" />
              </svg>
            </span>
            <a
              class="bridge-sidebar__link${page.id === currentPageId ? " is-active" : ""}"
              href="${page.launchUrl}"
              data-project-page-link="${page.id}"
              data-project-page-key="${page.id}"
            >
              <span class="bridge-sidebar__label">${page.name}</span>
              ${
                isLockedByOtherUser
                  ? `<span class="bridge-sidebar__page-lock" title="Being edited by ${page.pageLock.lockedBy}">Editing</span>`
                  : ""
              }
            </a>
          </div>
        `;
        },
      )
      .join("");

    attachReorderHandlers(project);

    if (addPageButton) {
      addPageButton.hidden = !canCreatePages;
    }

    window.dispatchEvent(
      new CustomEvent("uxbridge:project-nav-rendered", {
        detail: {
          projectId: project.id,
          currentPageId,
        },
      }),
    );
  }

  function applyProject(project, page) {
    state.project = project;
    state.currentPage = page;
    document.body.dataset.projectKey = project.id;
    document.body.dataset.pageKey = page.id;
    document.body.dataset.pageLabel = page.name;

    document.title = `UX Bridge | ${project.name} | ${page.name}`;

    if (titleNode) {
      titleNode.textContent = page.name;
    }

    if (breadcrumbProjectName) {
      breadcrumbProjectName.textContent = project.name;
    }

    if (shellTitleNode) {
      shellTitleNode.textContent = page.name;
    }

    if (titleInput && document.activeElement !== titleInput) {
      titleInput.value = page.name;
      resizeTitleInput();
    }

    renderAppliedVibe(page);

    window.dispatchEvent(
      new CustomEvent("uxbridge:project-page-sync", {
        detail: {
          project,
          page,
          canCreatePages: state.canCreatePages,
        },
      }),
    );
  }

  function syncProjectView(project, currentPageId = state.currentPage?.id) {
    const nextCurrentPage = project.pages.find((page) => page.id === currentPageId) || project.pages[0];

    if (!nextCurrentPage) {
      window.location.replace("/projects.html");
      return;
    }

    state.project = project;
    state.currentPage = nextCurrentPage;
    state.pageOrder = project.pages.map((page) => page.id);
    state.lastSyncSignature = buildProjectSyncSignature(project);
    state.lastProjectChangeAt = Date.now();
    renderNav(project, nextCurrentPage.id, state.canCreatePages);
    applyProject(project, nextCurrentPage);
  }

  async function pollForProjectUpdates() {
    if (state.syncing || !state.project || document.visibilityState !== "visible") {
      return;
    }

    state.syncing = true;

    try {
      const { project } = await loadProjectSyncMeta();

      if (!project) {
        return;
      }

      const nextProjectSignature = buildProjectSyncSignature(project);

      if (nextProjectSignature !== state.lastSyncSignature) {
        const fullProjectPayload = await loadProject();

        if (fullProjectPayload?.project) {
          syncProjectView(fullProjectPayload.project, state.currentPage?.id);
        }
      }
    } catch {
      // Stay quiet on transient sync errors.
    } finally {
      state.syncing = false;
    }
  }

  function scheduleProjectSync() {
    if (state.pollTimer) {
      window.clearTimeout(state.pollTimer);
    }

    state.pollTimer = window.setTimeout(async () => {
      await pollForProjectUpdates();
      scheduleProjectSync();
    }, getProjectSyncDelay());
  }

  function setEditingPageName(isEditing) {
    if (!titleShell || !titleNode || !editTitleButton || !titleEditor || !titleInput) {
      return;
    }

    titleShell.classList.toggle("is-editing", isEditing);
    titleNode.hidden = isEditing;
    editTitleButton.hidden = !state.canCreatePages || isEditing;
    titleEditor.hidden = !isEditing;

    if (isEditing) {
      titleInput.value = state.currentPage?.name || "";
      resizeTitleInput();
      requestAnimationFrame(() => {
        titleInput.focus();
        titleInput.setSelectionRange(titleInput.value.length, titleInput.value.length);
      });
    }
  }

  async function renamePage() {
    if (!state.project || !state.currentPage || !titleInput || state.savingName) {
      return;
    }

    const nextName = titleInput.value.trim();

    if (!nextName) {
      window.alert("Page name is required.");
      return;
    }

    if (nextName === state.currentPage.name) {
      setEditingPageName(false);
      return;
    }

    state.savingName = true;
    if (saveTitleButton) {
      saveTitleButton.disabled = true;
    }

    try {
      const response = await fetch(PROJECTS_API, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "renamePage",
          project: state.project.id,
          page: state.currentPage.id,
          name: nextName,
        }),
      });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok || !payload?.ok) {
        throw new Error(payload?.error || "Unable to rename page.");
      }

      state.project = payload.project;
      state.currentPage = payload.page;
      renderNav(payload.project, payload.page.id, state.canCreatePages);
      applyProject(payload.project, payload.page);
      setEditingPageName(false);
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "Unable to rename page.");
    } finally {
      state.savingName = false;
      if (saveTitleButton) {
        saveTitleButton.disabled = false;
      }
    }
  }

  async function createPage() {
    const response = await fetch(PROJECTS_API, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        action: "createPage",
        project: projectId,
      }),
    });
    const payload = await response.json().catch(() => ({}));

    if (!response.ok || !payload?.ok) {
      window.alert(payload?.error || "Unable to create page.");
      return;
    }

    window.location.href = payload.page.launchUrl;
  }

  if (addPageButton) {
    addPageButton.addEventListener("click", createPage);
  }

  if (editTitleButton) {
    editTitleButton.addEventListener("click", () => {
      setEditingPageName(true);
    });
  }

  if (saveTitleButton) {
    saveTitleButton.addEventListener("click", renamePage);
  }

  if (titleInput) {
    titleInput.addEventListener("input", () => {
      resizeTitleInput();
    });

    titleInput.addEventListener("keydown", (event) => {
      if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        renamePage();
        return;
      }

      if (event.key === "Escape") {
        event.preventDefault();
        setEditingPageName(false);
      }
    });
  }

  loadProject()
    .then(async ({ project, canCreatePages }) => {
      const currentPage = project.pages.find((page) => page.id === requestedPageId) || project.pages[0];

      if (!currentPage) {
        window.location.replace("/projects.html");
        return;
      }

      if (currentPage.id !== requestedPageId) {
        window.location.replace(currentPage.launchUrl);
        return;
      }

      state.canCreatePages = canCreatePages;
      syncProjectView(project, currentPage.id);

      if (editTitleButton) {
        editTitleButton.hidden = !canCreatePages;
      }

      if (state.pollTimer) {
        window.clearTimeout(state.pollTimer);
      }

      state.lastSyncSignature = buildProjectSyncSignature(project);
      state.lastProjectChangeAt = Date.now();
      scheduleProjectSync();
    })
    .catch((error) => {
      console.error("[project-page] load failed", error);
      window.location.replace("/projects.html");
    });

  window.addEventListener("beforeunload", () => {
    if (state.pollTimer) {
      window.clearTimeout(state.pollTimer);
    }
  });

  function handleProjectSyncWake() {
    if (document.visibilityState !== "visible") {
      return;
    }

    void pollForProjectUpdates();
  }

  document.addEventListener("visibilitychange", handleProjectSyncWake);
  window.addEventListener("pageshow", handleProjectSyncWake);
  window.addEventListener("focus", handleProjectSyncWake);
  window.addEventListener("uxbridge:project-runtime-sync", (event) => {
    const project = event.detail?.project;

    if (!project || project.id !== state.project?.id) {
      return;
    }

    syncProjectView(project, state.currentPage?.id);
  });
})();
