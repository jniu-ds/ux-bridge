import { toCanvas } from "html-to-image";

(function initThumbnailCapture() {
  const params = new URLSearchParams(window.location.search);
  const isTableThumbnail = params.get("table-thumb") === "1";
  const shouldCapture = params.get("thumb-capture") === "1";
  const requestToken = String(params.get("thumb-request") || "").trim();
  const thumbFit = String(params.get("thumb-fit") || "crop").trim().toLowerCase();
  const requestedViewport = String(params.get("preview-viewport") || "").trim().toLowerCase();
  const THUMBNAIL_WIDTH = Math.max(1, Number(params.get("thumb-width")) || 264);
  const THUMBNAIL_HEIGHT = Math.max(1, Number(params.get("thumb-height")) || 192);

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

  function getCaptureTarget() {
    return (
      document.querySelector(".phone-frame") ||
      document.querySelector(".phone-frame-wrap") ||
      document.querySelector(".mobile-page")
    );
  }

  function getExpectedViewportSize() {
    const rootStyles = window.getComputedStyle(document.documentElement);
    const width = Number.parseFloat(rootStyles.getPropertyValue("--preview-device-width")) || 375;
    const height = Number.parseFloat(rootStyles.getPropertyValue("--preview-device-height")) || 812;
    return {
      width: Math.max(1, Math.round(width)),
      height: Math.max(1, Math.round(height)),
    };
  }

  function wait(ms) {
    return new Promise((resolve) => window.setTimeout(resolve, ms));
  }

  async function waitForImagesToLoad(target) {
    if (!(target instanceof HTMLElement)) {
      return;
    }

    const pendingImages = [target, ...target.querySelectorAll("img")]
      .filter((node) => node instanceof HTMLImageElement)
      .filter((image) => !image.complete || image.naturalWidth <= 0);

    if (!pendingImages.length) {
      return;
    }

    await Promise.race([
      Promise.all(
        pendingImages.map(
          (image) =>
            new Promise((resolve) => {
              image.addEventListener("load", resolve, { once: true });
              image.addEventListener("error", resolve, { once: true });
            }),
        ),
      ),
      wait(2500),
    ]);
  }

  function getFiniteAnimations(target) {
    if (!(target instanceof HTMLElement) || typeof target.getAnimations !== "function") {
      return [];
    }

    return target
      .getAnimations({ subtree: true })
      .filter((animation) => {
        try {
          const timing = animation.effect?.getComputedTiming?.();
          const endTime = Number(timing?.endTime);
          return Number.isFinite(endTime) && endTime > 0;
        } catch {
          return false;
        }
      });
  }

  async function waitForVisualStability(target) {
    await waitForImagesToLoad(target);
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));

    const animations = getFiniteAnimations(target).filter(
      (animation) => animation.playState === "running" || animation.playState === "pending",
    );

    if (animations.length) {
      await Promise.race([
        Promise.allSettled(animations.map((animation) => animation.finished.catch(() => undefined))),
        wait(2500),
      ]);
    }

    await wait(120);
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
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
      const previewShell = document.querySelector("[data-preview-ready]");
      const shellReady = !shell || !shell.hidden;
      const dynamicReady = document.body.dataset.dynamicProject !== "true" || Boolean(document.body.dataset.pageKey);
      const previewReady = !(previewShell instanceof HTMLElement) || previewShell.dataset.previewReady === "true";

      if (target && shellReady && dynamicReady && previewReady) {
        const rect = target.getBoundingClientRect();
        const expected = getExpectedViewportSize();
        const targetWidth = Math.round(rect.width);
        const targetHeight = Math.round(rect.height);
        const matchesViewport =
          Math.abs(targetWidth - expected.width) <= 2 &&
          Math.abs(targetHeight - expected.height) <= 2;

        if (rect.width > 0 && rect.height > 0 && (requestedViewport ? matchesViewport : true)) {
          await waitForVisualStability(target);
          return target;
        }
      }

      await wait(100);
    }

    throw new Error("Thumbnail capture target never became ready.");
  }

  async function captureThumbnail() {
    try {
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

      outputContext.fillStyle = "#ffffff";
      outputContext.fillRect(0, 0, THUMBNAIL_WIDTH, THUMBNAIL_HEIGHT);

      const sourceWidth = sourceCanvas.width;
      const sourceHeight = sourceCanvas.height;
      const sourceAspect = sourceWidth / sourceHeight;
      const targetAspect = THUMBNAIL_WIDTH / THUMBNAIL_HEIGHT;

      if (thumbFit === "contain") {
        const scale = Math.min(THUMBNAIL_WIDTH / sourceWidth, THUMBNAIL_HEIGHT / sourceHeight);
        const renderWidth = Math.max(1, Math.round(sourceWidth * scale));
        const renderHeight = Math.max(1, Math.round(sourceHeight * scale));
        const renderX = Math.max(0, Math.round((THUMBNAIL_WIDTH - renderWidth) / 2));
        const renderY = 0;

        outputContext.drawImage(sourceCanvas, 0, 0, sourceWidth, sourceHeight, renderX, renderY, renderWidth, renderHeight);

        const imageDataUrl = outputCanvas.toDataURL("image/jpeg", 0.72);
        postResult("uxbridge:thumbnail-captured", { imageDataUrl });
        return;
      }

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
