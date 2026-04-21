import { useLayoutEffect } from "react";

export function useLegacyPage({ title, bodyClass = "", bodyDataset = {}, scriptLoaders = [] }) {
  useLayoutEffect(() => {
    document.title = title;
    const isProjectPage = bodyClass.includes("bridge-body--project");
    const isDynamicProject = bodyDataset.dynamicProject === "true";
    const isOverviewPage = window.location.pathname === "/project-overview.html";
    const isDesktopViewport = (window.visualViewport?.width || window.innerWidth) >= 641;
    const storedNavOpen = (() => {
      try {
        return window.sessionStorage.getItem("ux-bridge-project-nav-open") === "true";
      } catch {
        return false;
      }
    })();
    const hasKnownUser = (() => {
      try {
        return Boolean(window.sessionStorage.getItem("ux-bridge-user"));
      } catch {
        return false;
      }
    })();
    const shouldHideDocument = !window.__uxBridgePageBooted && !hasKnownUser;
    const shouldPrecomputePhoneScale = bodyClass.includes("bridge-body--project");

    if (shouldPrecomputePhoneScale) {
      const PHONE_WIDTH = 375;
      const PHONE_HEIGHT = 812;
      const projectMain = document.querySelector(".bridge-main--project");
      const toolbar = document.querySelector(".bridge-project-toolbar");
      const shell = document.querySelector(".app-shell");
      const viewportWidth = window.visualViewport?.width || window.innerWidth;
      const viewportHeight = window.visualViewport?.height || window.innerHeight;
      const projectStyles = projectMain ? window.getComputedStyle(projectMain) : null;
      const shellStyles = shell ? window.getComputedStyle(shell) : null;
      const toolbarStyles = toolbar ? window.getComputedStyle(toolbar) : null;
      const projectPaddingTop = projectStyles ? Number.parseFloat(projectStyles.paddingTop) || 0 : 0;
      const projectPaddingBottom = projectStyles ? Number.parseFloat(projectStyles.paddingBottom) || 0 : 0;
      const projectPaddingLeft = projectStyles ? Number.parseFloat(projectStyles.paddingLeft) || 0 : 0;
      const projectPaddingRight = projectStyles ? Number.parseFloat(projectStyles.paddingRight) || 0 : 0;
      const paddingTop = shellStyles ? Number.parseFloat(shellStyles.paddingTop) || 0 : 0;
      const paddingBottom = shellStyles ? Number.parseFloat(shellStyles.paddingBottom) || 0 : 0;
      const paddingLeft = shellStyles ? Number.parseFloat(shellStyles.paddingLeft) || 0 : 0;
      const paddingRight = shellStyles ? Number.parseFloat(shellStyles.paddingRight) || 0 : 0;
      const toolbarHeight = toolbar ? toolbar.getBoundingClientRect().height : 0;
      const toolbarMarginBottom = toolbarStyles ? Number.parseFloat(toolbarStyles.marginBottom) || 0 : 0;
      const availableHeight = projectMain
        ? Math.max(
            viewportHeight -
              projectPaddingTop -
              projectPaddingBottom -
              toolbarHeight -
              toolbarMarginBottom -
              paddingTop -
              paddingBottom,
            0,
          )
        : Math.max(window.innerHeight - 40, 0);
      const availableWidth = projectMain
        ? Math.max(
            viewportWidth -
              projectPaddingLeft -
              projectPaddingRight -
              paddingLeft -
              paddingRight,
            0,
          )
        : Math.max(window.innerWidth - 28, 0);
      const scale = Math.min(availableHeight / PHONE_HEIGHT, availableWidth / PHONE_WIDTH);

      document.documentElement.style.setProperty("--phone-scale", String(scale));
    }

    if (shouldHideDocument) {
      document.documentElement.style.visibility = "hidden";
    } else {
      document.documentElement.style.visibility = "visible";
    }

    const nextBodyClasses = bodyClass.split(/\s+/).filter(Boolean);
    const shouldRestoreProjectNav = isOverviewPage ? storedNavOpen : isDesktopViewport;

    if (isProjectPage && shouldRestoreProjectNav) {
      nextBodyClasses.push("bridge-nav-open");
    }

    if (isProjectPage && shouldRestoreProjectNav) {
      nextBodyClasses.push("bridge-nav-restoring");
    }

    document.body.className = nextBodyClasses.join(" ");

    if (isProjectPage && !isDynamicProject) {
      try {
        const savedOrder = window.sessionStorage.getItem("ux-bridge-project-nav-order:brand-affiliate-mobile");

        if (savedOrder) {
          const navPages = document.querySelector("[data-project-nav-pages]");

          if (navPages) {
            const items = Array.from(navPages.querySelectorAll("[data-project-page-item]"));
            const itemMap = new Map(items.map((item) => [item.dataset.projectPageItem, item]));
            const validKeys = items.map((item) => item.dataset.projectPageItem).filter(Boolean);
            const normalized = JSON.parse(savedOrder);
            const deduped = Array.isArray(normalized)
              ? normalized.filter((value, index) => validKeys.includes(value) && normalized.indexOf(value) === index)
              : [];
            const orderedKeys = [...deduped, ...validKeys.filter((value) => !deduped.includes(value))];

            orderedKeys.forEach((key) => {
              const item = itemMap.get(key);

              if (item) {
                navPages.append(item);
              }
            });
          }
        }
      } catch {
        // Keep default markup order if session state is missing or invalid.
      }
    }

    const existingKeys = Object.keys(document.body.dataset);
    existingKeys.forEach((key) => {
      delete document.body.dataset[key];
    });

    Object.entries(bodyDataset).forEach(([key, value]) => {
      if (value != null) {
        document.body.dataset[key] = value;
      }
    });

    let cancelled = false;

    (async () => {
      for (const loadScript of scriptLoaders) {
        if (cancelled) {
          return;
        }

        await loadScript();
      }

      if (!cancelled) {
        window.__uxBridgePageBooted = true;
        document.documentElement.style.visibility = "visible";
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [title, bodyClass, bodyDataset, scriptLoaders]);
}
