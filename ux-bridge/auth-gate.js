(async () => {
  const LOGIN_PATH = "/index.html";
  const HOME_PATH = "/projects.html";
  const ADMIN_PATH = "/user-management.html";
  const PROFILE_PATH = "/profile.html";
  const PROJECT_HOME_PATH = "/project-overview.html";
  const PROJECT_NAV_STATE_KEY = "ux-bridge-project-nav-open";
  const PROJECT_NAV_ORDER_KEY = "ux-bridge-project-nav-order:brand-affiliate-mobile";
  const PROJECT_KEY = "brand-affiliate-mobile";
  const isOverviewPage = window.location.pathname === "/project-overview.html";
  const isAdminPage = window.location.pathname === ADMIN_PATH;
  const params = new URLSearchParams(window.location.search);
  const shareToken = String(params.get("share") || "").trim();
  const isTableThumbnail = params.get("table-thumb") === "1";
  const isLocalHost = ["localhost", "127.0.0.1"].includes(window.location.hostname);
  const bypassAuth = isLocalHost && (params.has("capture") || params.get("auth") === "off");

  if (isTableThumbnail) {
    document.body.classList.add("bridge-body--table-thumb");
    document.body.dataset.projectKey = PROJECT_KEY;
    document.body.dataset.pageKey = getStaticProjectCurrentPageId();
    document.querySelectorAll("[data-bridge-shell]").forEach((shell) => {
      shell.hidden = false;
    });
    document.documentElement.style.visibility = "visible";
    return;
  }

  if (bypassAuth) {
    document.documentElement.style.visibility = "visible";
    return;
  }

  function redirectToLogin() {
    const next = `${window.location.pathname}${window.location.search}${window.location.hash}`;
    const loginUrl = new URL(LOGIN_PATH, window.location.origin);
    loginUrl.searchParams.set("next", next);
    window.location.replace(loginUrl.toString());
  }

  async function acceptShareLinkIfNeeded() {
    if (!shareToken) {
      return null;
    }

    try {
      const response = await fetch("/api/projects", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "acceptShareLink",
          shareToken,
        }),
      });
      const payload = await response.json().catch(() => ({}));

      if (response.ok && payload?.ok) {
        try {
          sessionStorage.setItem("ux-bridge-share-toast", payload.message || "You now have access to that project.");
        } catch {
          // Ignore storage issues.
        }

        const nextUrl = new URL(window.location.href);
        nextUrl.searchParams.delete("share");
        window.history.replaceState({}, "", `${nextUrl.pathname}${nextUrl.search}${nextUrl.hash}`);
      }

      return payload;
    } catch {
      return null;
    }
  }

  function getStaticProjectCurrentPageId() {
    const path = window.location.pathname;
    if (path === "/project-overview.html") {
      return "overview";
    }
    if (path === "/building-preview.html") {
      return "building";
    }
    if (path === "/l1-bonus-preview.html") {
      return "l1-bonus";
    }
    if (path === "/l1-l2-bonus-preview.html") {
      return "l1-l2-bonus";
    }
    return "";
  }

  function renderStaticProjectNav(project, currentPageId = "") {
    const navPages = document.querySelector("[data-project-nav-pages]");

    if (!navPages || !project) {
      return;
    }

    const pagesMarkup = (Array.isArray(project.pages) ? project.pages : [])
      .map((page) => {
        const pageId = String(page.id || "").trim();
        const pageName = String(page.name || "Page").trim();
        const launchUrl = String(page.launchUrl || "").trim();

        if (!pageId || !launchUrl) {
          return "";
        }

        return `
          <div class="bridge-sidebar__nav-item" data-project-page-item="${pageId}">
            <a class="bridge-sidebar__link${pageId === currentPageId ? " is-active" : ""}" href="${launchUrl}" data-project-page-key="${pageId}">
              <span class="bridge-sidebar__drag" draggable="true" aria-label="Reorder ${pageName} page" role="button" tabindex="0">
                <svg viewBox="0 0 20 20" aria-hidden="true">
                  <circle cx="7" cy="6" r="1.2" />
                  <circle cx="13" cy="6" r="1.2" />
                  <circle cx="7" cy="10" r="1.2" />
                  <circle cx="13" cy="10" r="1.2" />
                  <circle cx="7" cy="14" r="1.2" />
                  <circle cx="13" cy="14" r="1.2" />
                </svg>
              </span>
              <span class="bridge-sidebar__label">${pageName}</span>
            </a>
          </div>
        `;
      })
      .join("");

    navPages.innerHTML = pagesMarkup;

    const overviewLink = document.querySelector('[data-project-page-key="overview"]');
    if (overviewLink && project.hasOverview) {
      overviewLink.classList.toggle("is-active", currentPageId === "overview");
      const overviewLabel = overviewLink.querySelector(".bridge-sidebar__label");
      if (overviewLabel) {
        overviewLabel.textContent = "Project Overview";
      }
    }
  }

  function syncStaticProjectMeta(project, currentPageId = "") {
    if (!project) {
      return;
    }

    const currentPage =
      currentPageId === "overview"
        ? { id: "overview", name: "Project Overview" }
        : (Array.isArray(project.pages) ? project.pages : []).find((page) => String(page.id || "").trim() === currentPageId) || null;

    document.querySelectorAll("[data-project-name]").forEach((node) => {
      node.textContent = project.name || "Project";
    });

    const titleNode = document.querySelector("[data-static-project-page-title]");
    if (titleNode && currentPage?.name) {
      titleNode.textContent = currentPage.name;
      document.title = `UX Bridge | ${project.name} | ${currentPage.name}`;
    }

    document.body.dataset.projectKey = project.id || PROJECT_KEY;
    document.body.dataset.pageKey = currentPage?.id || currentPageId || "";
    document.body.dataset.pageLabel = currentPage?.name || "";
  }

  async function setupProjectPageOrdering(projectLayout) {
    const navPages = projectLayout.querySelector("[data-project-nav-pages]");

    if (!navPages) {
      return;
    }

    const getItems = () => Array.from(navPages.querySelectorAll("[data-project-page-item]"));
    const currentPageId = getStaticProjectCurrentPageId();

    const sanitizeOrder = (order) => {
      const validKeys = getItems().map((item) => item.dataset.projectPageItem).filter(Boolean);
      const normalized = Array.isArray(order) ? order.map((value) => String(value)) : [];
      const deduped = normalized.filter((value, index) => validKeys.includes(value) && normalized.indexOf(value) === index);
      return [...deduped, ...validKeys.filter((value) => !deduped.includes(value))];
    };

    const applyOrder = (order) => {
      const itemMap = new Map(getItems().map((item) => [item.dataset.projectPageItem, item]));
      sanitizeOrder(order).forEach((key) => {
        const item = itemMap.get(key);

        if (item) {
          navPages.append(item);
        }
      });
    };

    const saveOrderLocally = (order) => {
      sessionStorage.setItem(PROJECT_NAV_ORDER_KEY, JSON.stringify(order));
    };

    const currentOrder = () => getItems().map((item) => item.dataset.projectPageItem).filter(Boolean);

    const savedLocalOrder = sessionStorage.getItem(PROJECT_NAV_ORDER_KEY);

    if (savedLocalOrder) {
      try {
        applyOrder(JSON.parse(savedLocalOrder));
      } catch {
        sessionStorage.removeItem(PROJECT_NAV_ORDER_KEY);
      }
    }

    try {
      const response = await fetch(`/api/projects?project=${encodeURIComponent(PROJECT_KEY)}`, {
        method: "GET",
        credentials: "include",
        cache: "no-store",
      });

      if (response.status === 403 || response.status === 404) {
        window.location.replace(HOME_PATH);
        return;
      }

      if (response.ok) {
        const payload = await response.json();

        if (payload?.project) {
          renderStaticProjectNav(payload.project, currentPageId);
          syncStaticProjectMeta(payload.project, currentPageId);
        }

        if (Array.isArray(payload?.project?.pages) && payload.project.pages.length) {
          const sharedOrder = payload.project.pages.map((page) => String(page.id || "")).filter(Boolean);
          applyOrder(sharedOrder);
          saveOrderLocally(sharedOrder);
        }
      }
    } catch {
      // Keep the best known local order.
    }

    const persistOrder = async () => {
      const order = currentOrder();
      saveOrderLocally(order);

      try {
        await fetch("/api/projects", {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            action: "reorderPages",
            project: PROJECT_KEY,
            order,
          }),
        });
      } catch {
        // Local session order is already preserved for immediate navigation continuity.
      }
    };

    let draggedItem = null;

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

    navPages.querySelectorAll(".bridge-sidebar__drag").forEach((handle) => {
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
        if (draggedItem) {
          draggedItem.classList.remove("is-dragging");
          draggedItem = null;
          await persistOrder();
        }
      });
    });

    navPages.addEventListener("dragover", (event) => {
      if (!draggedItem) {
        return;
      }

      event.preventDefault();
      const afterElement = getDragAfterElement(navPages, event.clientY);

      if (!afterElement) {
        navPages.append(draggedItem);
        return;
      }

      if (afterElement !== draggedItem) {
        navPages.insertBefore(draggedItem, afterElement);
      }
    });
  }

  async function attachProtectedShell(user) {
    window.uxBridgeUser = user;
    sessionStorage.setItem("ux-bridge-user", JSON.stringify(user));
    window.dispatchEvent(new CustomEvent("uxbridge:user-ready", { detail: user }));

    document.querySelectorAll("[data-auth-user-name]").forEach((node) => {
      node.textContent = user.fullName;
    });

    document.querySelectorAll("[data-auth-user-email]").forEach((node) => {
      node.textContent = user.email;
    });

    document.querySelectorAll("[data-auth-user-avatar]").forEach((node) => {
      const initials = [user.firstName, user.lastName]
        .filter(Boolean)
        .map((value) => value.charAt(0).toUpperCase())
        .join("")
        .slice(0, 2) || "U";
      node.style.setProperty("--avatar-bg", String(user.avatarColor || ""));

      if (user.avatarUrl) {
        node.innerHTML = `<img src="${user.avatarUrl}" alt="" />`;
        node.classList.add("has-photo");
      } else {
        node.textContent = initials;
        node.classList.remove("has-photo");
      }
    });

    document.querySelectorAll("[data-auth-logout]").forEach((button) => {
      button.addEventListener("click", async () => {
        button.disabled = true;

        await fetch("/api/auth", {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ action: "logout" }),
        });

        window.location.replace(LOGIN_PATH);
      });
    });

    document.querySelectorAll('[data-home-link="true"]').forEach((link) => {
      link.setAttribute("href", HOME_PATH);
    });

    document.querySelectorAll('[data-profile-link="true"]').forEach((link) => {
      link.setAttribute("href", PROFILE_PATH);
    });

    document.querySelectorAll('[data-project-link="brand-affiliate-mobile"]').forEach((link) => {
      link.setAttribute("href", PROJECT_HOME_PATH);
    });

    if (user.role === "Admin") {
      document.querySelectorAll("[data-admin-link]").forEach((link) => {
        link.setAttribute("href", ADMIN_PATH);
        link.hidden = false;
      });

      document.querySelectorAll("[data-admin-only]").forEach((node) => {
        node.hidden = false;
      });
    } else {
      document.querySelectorAll("[data-admin-only], [data-admin-link]").forEach((node) => {
        node.remove();
      });
    }

    if (isAdminPage && user.role !== "Admin") {
      window.location.replace(HOME_PATH);
      return;
    }

    const projectLayout = document.querySelector(".bridge-layout--project");
    const isDynamicProject = document.body.dataset.dynamicProject === "true";

    if (projectLayout) {
      if (!isDynamicProject) {
        await setupProjectPageOrdering(projectLayout);
      }

      const toggleButtons = Array.from(document.querySelectorAll("[data-nav-toggle]"));
      const backdropButtons = Array.from(document.querySelectorAll("[data-nav-backdrop]"));
      const projectSidebar = projectLayout.querySelector(".bridge-sidebar");
      const AUTO_COLLAPSE_DELAY_MS = 3000;
      const DESKTOP_NAV_MIN_WIDTH = 641;
      let autoCollapseTimer = 0;
      let isSidebarHovered = false;
      const isDesktopViewport = () => (window.visualViewport?.width || window.innerWidth) >= DESKTOP_NAV_MIN_WIDTH;
      if (isOverviewPage) {
        sessionStorage.setItem(PROJECT_NAV_STATE_KEY, "false");
      }

      const restoredNavOpen = isOverviewPage
        ? sessionStorage.getItem(PROJECT_NAV_STATE_KEY) === "true"
        : isDesktopViewport();

      const syncNavState = (isOpen) => {
        document.body.classList.toggle("bridge-nav-open", isOpen);
        sessionStorage.setItem(PROJECT_NAV_STATE_KEY, isOpen ? "true" : "false");
        toggleButtons.forEach((button) => {
          button.setAttribute("aria-expanded", String(isOpen));
          button.setAttribute("aria-label", isOpen ? "Close navigation" : "Open navigation");
        });
      };

      const clearAutoCollapseTimer = () => {
        if (autoCollapseTimer) {
          window.clearTimeout(autoCollapseTimer);
          autoCollapseTimer = 0;
        }
      };

      const scheduleAutoCollapse = () => {
        clearAutoCollapseTimer();

        if (isOverviewPage || !document.body.classList.contains("bridge-nav-open")) {
          return;
        }

        autoCollapseTimer = window.setTimeout(() => {
          if (isSidebarHovered || !document.body.classList.contains("bridge-nav-open")) {
            scheduleAutoCollapse();
            return;
          }

          syncNavState(false);
        }, AUTO_COLLAPSE_DELAY_MS);
      };

      if (restoredNavOpen) {
        document.body.classList.add("bridge-nav-restoring");
      }

      syncNavState(restoredNavOpen);
      scheduleAutoCollapse();

      if (restoredNavOpen) {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            document.body.classList.remove("bridge-nav-restoring");
          });
        });
      }

      if (isOverviewPage) {
        projectLayout.querySelectorAll("[data-project-page-key]").forEach((link) => {
          link.addEventListener("click", () => {
            sessionStorage.setItem(PROJECT_NAV_STATE_KEY, "true");
          });
        });
      }

      toggleButtons.forEach((button) => {
        button.addEventListener("click", () => {
          syncNavState(!document.body.classList.contains("bridge-nav-open"));
          scheduleAutoCollapse();
        });
      });

      backdropButtons.forEach((button) => {
        button.addEventListener("click", () => {
          syncNavState(false);
          clearAutoCollapseTimer();
        });
      });

      if (projectSidebar && !isOverviewPage) {
        projectSidebar.addEventListener("pointerenter", () => {
          isSidebarHovered = true;
          clearAutoCollapseTimer();
        });

        projectSidebar.addEventListener("pointerleave", () => {
          isSidebarHovered = false;
          scheduleAutoCollapse();
        });
      }

      document.addEventListener("keydown", (event) => {
        if (event.key === "Escape" && document.body.classList.contains("bridge-nav-open")) {
          syncNavState(false);
          clearAutoCollapseTimer();
        }
      });
    }

    document.querySelectorAll("[data-bridge-shell]").forEach((shell) => {
      shell.hidden = false;
    });
  }

  try {
    const response = await fetch("/api/auth", {
      method: "GET",
      credentials: "include",
      cache: "no-store",
    });

    if (!response.ok) {
      redirectToLogin();
      return;
    }

    const payload = await response.json();

    if (!payload?.authenticated) {
      redirectToLogin();
      return;
    }

    await acceptShareLinkIfNeeded();
    document.body.classList.add("is-authenticated");
    await attachProtectedShell(payload.user);
    document.documentElement.style.visibility = "visible";
  } catch {
    redirectToLogin();
  }
})();
