import { toCanvas } from "html-to-image";

(function initThumbnailCapture() {
  const params = new URLSearchParams(window.location.search);
  const isTableThumbnail = params.get("table-thumb") === "1";
  const shouldCapture = params.get("thumb-capture") === "1";
  const requestToken = String(params.get("thumb-request") || "").trim();
  const THUMBNAIL_WIDTH = 264;
  const THUMBNAIL_HEIGHT = 192;
  const DESKTOP_THUMBNAIL_VIEWPORT_WIDTH = 1440;
  const DESKTOP_THUMBNAIL_VIEWPORT_HEIGHT = 1047;

  if (!isTableThumbnail || !shouldCapture) {
    return;
  }

  function getCanonicalSourceUrl() {
    const nextUrl = new URL(window.location.href);
    nextUrl.searchParams.delete("thumb-load");
    nextUrl.searchParams.delete("thumb-capture");
    nextUrl.searchParams.delete("thumb-request");
    return `${nextUrl.pathname}${nextUrl.search}`;
  }

  function getProjectId() {
    return String(params.get("project") || document.body.dataset.projectKey || "").trim().toLowerCase();
  }

  function applyDesktopThumbnailViewport() {
    if (params.get("thumb-viewport") !== "desktop") {
      return;
    }

    document.documentElement.style.setProperty("--preview-device-width", `${DESKTOP_THUMBNAIL_VIEWPORT_WIDTH}px`);
    document.documentElement.style.setProperty("--preview-device-height", `${DESKTOP_THUMBNAIL_VIEWPORT_HEIGHT}px`);
    document.documentElement.style.setProperty("--phone-scale", "1");
    document.querySelectorAll(".mobile-page").forEach((page) => {
      page.dataset.previewViewport = "desktop";
    });
  }

  function getCaptureTarget() {
    applyDesktopThumbnailViewport();
    return document.querySelector(".phone-frame-wrap");
  }

  function postResult(type, extra = {}) {
    window.parent.postMessage(
      {
        type,
        requestToken,
        projectId: getProjectId(),
        sourceUrl: getCanonicalSourceUrl(),
        ...extra,
      },
      window.location.origin,
    );
  }

  async function waitForReadyTarget() {
    if (document.fonts?.ready) {
      try {
        await document.fonts.ready;
      } catch {
        // Keep going if fonts fail to settle.
      }
    }

    for (let attempt = 0; attempt < 60; attempt += 1) {
      const target = getCaptureTarget();
      const shell = document.querySelector("[data-bridge-shell]");
      const shellReady = !shell || !shell.hidden;
      const dynamicReady = document.body.dataset.dynamicProject !== "true" || Boolean(document.body.dataset.pageKey);

      if (target && shellReady && dynamicReady) {
        const rect = target.getBoundingClientRect();

        if (rect.width > 0 && rect.height > 0) {
          await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
          return target;
        }
      }

      await new Promise((resolve) => window.setTimeout(resolve, 100));
    }

    throw new Error("Thumbnail capture target never became ready.");
  }

  async function captureThumbnail() {
    try {
      applyDesktopThumbnailViewport();
      const target = await waitForReadyTarget();
      const rect = target.getBoundingClientRect();
      const sourceCanvas = await toCanvas(target, {
        pixelRatio: 1,
        backgroundColor: "#ffffff",
        canvasWidth: Math.max(1, Math.round(rect.width)),
        canvasHeight: Math.max(1, Math.round(rect.height)),
      });
      const outputCanvas = document.createElement("canvas");
      outputCanvas.width = THUMBNAIL_WIDTH;
      outputCanvas.height = THUMBNAIL_HEIGHT;

      const outputContext = outputCanvas.getContext("2d");

      if (!outputContext) {
        throw new Error("Unable to prepare thumbnail canvas.");
      }

      const sourceWidth = sourceCanvas.width;
      const sourceHeight = sourceCanvas.height;
      const sourceAspect = sourceWidth / sourceHeight;
      const targetAspect = THUMBNAIL_WIDTH / THUMBNAIL_HEIGHT;

      let cropWidth = sourceWidth;
      let cropHeight = sourceHeight;
      let cropX = 0;
      let cropY = 0;

      if (sourceAspect > targetAspect) {
        cropWidth = Math.round(sourceHeight * targetAspect);
        cropX = Math.max(0, Math.round((sourceWidth - cropWidth) / 2));
      } else if (sourceAspect < targetAspect) {
        cropHeight = Math.round(sourceWidth / targetAspect);
        cropY = Math.max(0, Math.round((sourceHeight - cropHeight) / 2));
      }

      outputContext.drawImage(
        sourceCanvas,
        cropX,
        cropY,
        cropWidth,
        cropHeight,
        0,
        0,
        THUMBNAIL_WIDTH,
        THUMBNAIL_HEIGHT,
      );

      const imageDataUrl = outputCanvas.toDataURL("image/jpeg", 0.72);

      postResult("uxbridge:thumbnail-captured", { imageDataUrl });
    } catch (error) {
      postResult("uxbridge:thumbnail-capture-failed", {
        error: error instanceof Error ? error.message : "Unable to capture thumbnail.",
      });
    }
  }

  if (document.readyState === "complete") {
    void captureThumbnail();
    return;
  }

  window.addEventListener(
    "load",
    () => {
      void captureThumbnail();
    },
    { once: true },
  );
})();
