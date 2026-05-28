const PROVIDERS = [
  {
    id: "codex-app",
    label: "Codex App",
    credentialMode: "local-bridge",
    availableVia: "local-bridge",
    helperCopy: "Uses a local Codex bridge on this machine to generate page-scoped mobile UI.",
  },
  {
    id: "codex",
    label: "Codex",
    credentialMode: "user-session",
    availableVia: "provider-adapter",
    helperCopy: "Ready for a user-owned Codex session or connector-based execution flow.",
  },
  {
    id: "claude",
    label: "Claude",
    credentialMode: "connector",
    availableVia: "provider-adapter",
    helperCopy: "Structured for connector-based Claude execution with the user’s own credentials.",
  },
  {
    id: "generic",
    label: "Other tool",
    credentialMode: "token-managed",
    availableVia: "provider-adapter",
    helperCopy: "Fallback adapter for other vibe-coding tools while preserving the same UX Bridge contract.",
  },
];

const OPENAI_API_BASE_URL = "https://api.openai.com/v1";
const CODEX_MODEL_CANDIDATES = String(
  process.env.UX_BRIDGE_CODEX_MODELS || process.env.UX_BRIDGE_CODEX_MODEL || "gpt-5.2-codex,gpt-5.2,gpt-5-mini",
)
  .split(",")
  .map((value) => String(value || "").trim())
  .filter(Boolean);

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function summarizePrompt(prompt) {
  const compact = String(prompt || "").replace(/\s+/g, " ").trim();
  if (!compact) {
    return "Generated a page-scoped UI concept.";
  }

  return compact.length > 180 ? `${compact.slice(0, 177).trim()}...` : compact;
}

function detectPattern(prompt) {
  const input = String(prompt || "").toLowerCase();

  if (/(dashboard|analytics|kpi|metrics|stats)/.test(input)) {
    return "dashboard";
  }

  if (/(profile|account|person|bio|member)/.test(input)) {
    return "profile";
  }

  if (/(checkout|cart|purchase|billing|plan)/.test(input)) {
    return "commerce";
  }

  if (/(settings|preferences|notifications|controls)/.test(input)) {
    return "settings";
  }

  return "feature";
}

function buildCopy(pattern, pageName, projectName, promptSummary, providerLabel) {
  const eyebrow = providerLabel.toUpperCase();

  if (pattern === "dashboard") {
    return {
      eyebrow,
      title: `${pageName} snapshot`,
      body: `A compact dashboard view for ${projectName} focused on ${promptSummary.toLowerCase()}.`,
      primaryAction: "Review details",
      secondaryAction: "Share update",
      statLabels: ["Momentum", "Confidence", "Priority"],
    };
  }

  if (pattern === "profile") {
    return {
      eyebrow,
      title: `${pageName} profile`,
      body: `A profile-style screen for ${projectName} that keeps the UI focused on ${promptSummary.toLowerCase()}.`,
      primaryAction: "Update profile",
      secondaryAction: "Save changes",
      statLabels: ["Profile strength", "Active tasks", "Saved items"],
    };
  }

  if (pattern === "commerce") {
    return {
      eyebrow,
      title: `${pageName} offer`,
      body: `A commerce-oriented concept for ${projectName} that highlights ${promptSummary.toLowerCase()}.`,
      primaryAction: "Continue",
      secondaryAction: "View details",
      statLabels: ["Value", "Timeline", "Readiness"],
    };
  }

  if (pattern === "settings") {
    return {
      eyebrow,
      title: `${pageName} controls`,
      body: `A settings-focused screen for ${projectName} designed around ${promptSummary.toLowerCase()}.`,
      primaryAction: "Apply changes",
      secondaryAction: "Preview",
      statLabels: ["Coverage", "Alerts", "Sync state"],
    };
  }

  return {
    eyebrow,
    title: `${pageName} concept`,
    body: `A focused mobile interface for ${projectName} shaped around ${promptSummary.toLowerCase()}.`,
    primaryAction: "Continue",
    secondaryAction: "Preview flow",
    statLabels: ["Intent", "Depth", "Readiness"],
  };
}

function renderStats(labels) {
  return labels
    .map(
      (label, index) => `
        <div class="vibe-generated-page__stat">
          <span>${escapeHtml(label)}</span>
          <strong>${68 + index * 11}%</strong>
        </div>
      `,
    )
    .join("");
}

function renderMockHtml(copy, promptSummary, projectName, pageName) {
  return `
    <section class="vibe-generated-page">
      <div class="vibe-generated-page__hero">
        <p class="vibe-generated-page__eyebrow">${escapeHtml(copy.eyebrow)}</p>
        <h2>${escapeHtml(copy.title)}</h2>
        <p>${escapeHtml(copy.body)}</p>
      </div>

      <div class="vibe-generated-page__prompt">
        <span>Prompt</span>
        <p>${escapeHtml(promptSummary)}</p>
      </div>

      <div class="vibe-generated-page__stats">
        ${renderStats(copy.statLabels)}
      </div>

      <div class="vibe-generated-page__feature-card">
        <div>
          <span class="vibe-generated-page__section-label">Project</span>
          <strong>${escapeHtml(projectName)}</strong>
        </div>
        <div>
          <span class="vibe-generated-page__section-label">Page</span>
          <strong>${escapeHtml(pageName)}</strong>
        </div>
      </div>

      <div class="vibe-generated-page__actions">
        <button type="button">${escapeHtml(copy.primaryAction)}</button>
        <button type="button" class="is-secondary">${escapeHtml(copy.secondaryAction)}</button>
      </div>
    </section>
  `;
}

function renderMockCss() {
  return `
    .vibe-generated-page {
      display: grid;
      gap: 16px;
      padding: 32px 24px 28px;
      min-height: calc(100% - 56px);
      color: #1f2431;
    }

    .vibe-generated-page__hero {
      display: grid;
      gap: 10px;
    }

    .vibe-generated-page__eyebrow,
    .vibe-generated-page__section-label,
    .vibe-generated-page__prompt span {
      margin: 0;
      color: #6e7392;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.14em;
      line-height: 1.2;
      text-transform: uppercase;
    }

    .vibe-generated-page__hero h2 {
      margin: 0;
      font-size: 30px;
      line-height: 1;
      letter-spacing: -0.04em;
    }

    .vibe-generated-page__hero p,
    .vibe-generated-page__prompt p {
      margin: 0;
      color: #57607a;
      font-size: 14px;
      line-height: 1.6;
    }

    .vibe-generated-page__prompt,
    .vibe-generated-page__feature-card,
    .vibe-generated-page__stat {
      border: 1px solid rgba(37, 37, 37, 0.08);
      border-radius: 18px;
      background: rgba(255, 255, 255, 0.78);
      box-shadow: 0 18px 36px rgba(37, 37, 37, 0.06);
      backdrop-filter: blur(18px);
    }

    .vibe-generated-page__prompt {
      display: grid;
      gap: 8px;
      padding: 16px;
    }

    .vibe-generated-page__stats {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 10px;
    }

    .vibe-generated-page__stat {
      display: grid;
      gap: 6px;
      padding: 14px;
    }

    .vibe-generated-page__stat strong,
    .vibe-generated-page__feature-card strong {
      font-size: 18px;
      line-height: 1.1;
      letter-spacing: -0.03em;
    }

    .vibe-generated-page__feature-card {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 12px;
      padding: 16px;
    }

    .vibe-generated-page__feature-card > div {
      display: grid;
      gap: 6px;
    }

    .vibe-generated-page__actions {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 10px;
      margin-top: auto;
    }

    .vibe-generated-page__actions button {
      min-height: 46px;
      border: 0;
      border-radius: 999px;
      background: #252525;
      color: #fff;
      font-size: 14px;
      font-weight: 700;
      line-height: 1;
    }

    .vibe-generated-page__actions button.is-secondary {
      background: rgba(255, 255, 255, 0.9);
      color: #252525;
      box-shadow: inset 0 0 0 1px rgba(37, 37, 37, 0.12);
    }

    .vibe-generated-page__actions button.is-active {
      background: #5b5ff4;
      color: #fff;
      box-shadow: 0 12px 24px rgba(91, 95, 244, 0.2);
    }
  `;
}

function renderMockJs() {
  return `
const actionButtons = Array.from(root.querySelectorAll(".vibe-generated-page__actions button"));

const handleActionClick = (event) => {
  actionButtons.forEach((button) => button.classList.remove("is-active"));
  event.currentTarget.classList.add("is-active");
  root.dataset.previewInteraction = event.currentTarget.textContent.trim();
};

actionButtons.forEach((button) => button.addEventListener("click", handleActionClick));

return () => {
  actionButtons.forEach((button) => button.removeEventListener("click", handleActionClick));
};
  `;
}

export function validateGeneratedVibePayload(result = {}) {
  const providerId = String(result.providerId || "").trim().toLowerCase() || "generic";
  const provider = PROVIDERS.find((entry) => entry.id === providerId) || PROVIDERS.find((entry) => entry.id === "generic") || PROVIDERS[0];

  return {
    providerId: provider.id,
    providerLabel: String(result.providerLabel || provider.label || "Provider").trim() || provider.label || "Provider",
    credentialMode:
      String(result.credentialMode || provider.credentialMode || "user-session").trim().toLowerCase() ||
      provider.credentialMode ||
      "user-session",
    availableVia:
      String(result.availableVia || provider.availableVia || "provider-adapter").trim().toLowerCase() ||
      provider.availableVia ||
      "provider-adapter",
    summary: String(result.summary || "").trim() || `${provider.label} generated a page-scoped UI concept.`,
    html: validateGeneratedHtml(result.html),
    css: validateGeneratedCss(result.css),
    js: validateGeneratedJs(result.js),
    assets: Array.isArray(result.assets) ? result.assets : [],
  };
}

export function generateScaffoldedVibePageResult({
  providerId = "generic",
  prompt,
  projectName,
  pageName,
  includeProjectContext,
  includePageContext,
}) {
  const provider = PROVIDERS.find((entry) => entry.id === providerId) || PROVIDERS.find((entry) => entry.id === "generic") || PROVIDERS[0];
  const promptSummary = summarizePrompt(prompt);
  const pattern = detectPattern(prompt);
  const copy = buildCopy(pattern, pageName, projectName, promptSummary, provider.label);
  const contextSummary = [
    includeProjectContext ? `project context: ${projectName}` : "",
    includePageContext ? `page context: ${pageName}` : "",
  ]
    .filter(Boolean)
    .join(", ");

  return validateGeneratedVibePayload({
    providerId: provider.id,
    providerLabel: provider.label,
    credentialMode: provider.credentialMode,
    availableVia: provider.availableVia,
    summary: `${provider.label} created a page-scoped UI concept${contextSummary ? ` using ${contextSummary}` : ""}.`,
    html: renderMockHtml(copy, promptSummary, projectName, pageName),
    css: renderMockCss(),
    js: renderMockJs(),
    assets: [],
  });
}

function buildCodexSystemPrompt() {
  return [
    "You generate only front-end mobile page content for UX Bridge.",
    "Return JSON only.",
    "Do not generate a whole application shell, routing, auth, backend code, or head/body/html tags.",
    "Generate only content that belongs inside the current mobile-page content area.",
    "The html must use a single root element with class=\"vibe-generated-page\".",
    "The css must scope all selectors to .vibe-generated-page and must not target body, html, :root, or global app shells.",
    "Do not include <script> tags or inline event handlers.",
    "Put interaction code in the js field for preview.js. The js runs after HTML mounts as new Function(\"root\", \"page\", \"project\", \"api\", js).",
    "Use root.querySelector/querySelectorAll to attach scoped event listeners, manage local state in closure variables, and return a cleanup function when listeners or timers are created.",
    "Do not use imports, exports, network requests, document.write, inline handlers, or selectors outside root.",
    "When a selected layer scope is provided, preserve the existing preview and edit only the selected layer and its descendants, plus any directly necessary scoped CSS or JS.",
    "For scoped edits, return only the replacement HTML for the selected layer in the html field, not the full page. Return only small additive css/js patches when needed.",
    "Keep the output polished, intentional, and mobile-first.",
  ].join(" ");
}

function compactCodexPreviewForPrompt(preview = {}) {
  if (!preview || typeof preview !== "object") {
    return null;
  }

  const html = String(preview.html || "");
  const css = String(preview.css || "");
  const js = String(preview.js || "");

  if (!html && !css && !js) {
    return null;
  }

  return {
    html: html.slice(0, 100000),
    css: css.slice(0, 100000),
    js: js.slice(0, 30000),
    breakpointOverrides: preview.breakpointOverrides && typeof preview.breakpointOverrides === "object" ? preview.breakpointOverrides : {},
    htmlTruncated: html.length > 100000,
    cssTruncated: css.length > 100000,
    jsTruncated: js.length > 30000,
  };
}

function buildFigmaImportSystemPrompt() {
  return [
    "You generate only front-end page content for UX Bridge previews.",
    "Return JSON only.",
    "Do not generate a whole application shell, routing, auth, backend code, or head/body/html tags.",
    "Generate only content that belongs inside the current preview content area.",
    "The html must use a single root element with class=\"vibe-generated-page\".",
    "The css must scope all selectors to .vibe-generated-page and must not target body, html, :root, or global app shells.",
    "For Figma imports, build a responsive preview by default, not a fixed mobile-only rendering.",
    "The imported Figma width is the native source breakpoint. Match it closely at that width, then adapt fluidly wider and narrower.",
    "Use CSS grid, flex, minmax, clamp, max-width, and media queries where appropriate.",
    "Do not lock the whole page to a phone-sized width or max-width.",
    "If the Figma node is a phone screen or mobile artboard, treat it as the mobile breakpoint and create tablet/desktop layouts that use the available preview width instead of keeping the phone screen centered forever.",
    "Do not preserve phone artboard bounds, status bars, home indicators, browser chrome, or device frames as the outer layout at wider breakpoints unless the prompt explicitly asks for a device mockup.",
    "If the Figma node is tablet or desktop sized, preserve multi-column layout at the native width and larger widths instead of collapsing to one mobile column.",
    "Do not include <script> tags or inline event handlers.",
    "Put interaction code in the js field for preview.js. The js runs after HTML mounts as new Function(\"root\", \"page\", \"project\", \"api\", js).",
    "Use root.querySelector/querySelectorAll to attach scoped event listeners, manage local state in closure variables, and return a cleanup function when listeners or timers are created.",
    "Do not use imports, exports, network requests, document.write, inline handlers, or selectors outside root.",
    "Keep the output polished, intentional, and faithful to the Figma visual source.",
  ].join(" ");
}

function buildCodexUserPrompt({
  prompt,
  projectName,
  pageName,
  includeProjectContext,
  includePageContext,
  scope = null,
  currentPreview = null,
}) {
  const scopedEdit = scope?.type === "selected-layer" && scope.layerPath;
  const previewContext = scopedEdit ? compactCodexPreviewForPrompt(scope?.currentPreview) : compactCodexPreviewForPrompt(currentPreview);
  const contextLines = [
    `Project: ${projectName}`,
    `Page: ${pageName}`,
    includeProjectContext ? `Include project context: yes` : `Include project context: no`,
    includePageContext ? `Include page context: yes` : `Include page context: no`,
    `User prompt: ${String(prompt || "").trim()}`,
  ];
  const scopeLines = scopedEdit
    ? [
        "Selected layer scope: yes",
        `Target layer path: ${scope.layerPath}`,
        `Target layer label: ${scope.label || "selected layer"}`,
        `Target child count: ${Number(scope.childCount) || 0}`,
        `Target current HTML subtree: ${String(scope.html || "").slice(0, 70000)}`,
        "Scope rule: edit only this selected layer and its children. Preserve every unrelated layer outside this subtree.",
        "Return html as the replacement markup for only this selected layer. Do not return .vibe-generated-page or unrelated page markup.",
        "Return css/js only if this subtree needs a small additive patch. Leave css/js empty when the existing page code is enough.",
      ]
    : ["Selected layer scope: no", "Apply the prompt to the whole .vibe-generated-page preview."];

  return [
    scopedEdit
      ? "Modify the current UX Bridge page as a scoped edit to the selected layer only."
      : "Create or modify a page-scoped mobile UI concept for the current UX Bridge page.",
    contextLines.join("\n"),
    scopeLines.join("\n"),
    previewContext ? `Current preview context JSON: ${JSON.stringify(previewContext)}` : "",
    "Return JSON with keys: summary, html, css, js, assets.",
    "Use js for rich interactions such as toggles, filters, accordions, tab states, sliders, counters, or lightweight animation behavior.",
    "assets should be an empty array unless you truly need named assets.",
  ]
    .filter(Boolean)
    .join("\n\n");
}

function buildFigmaImportUserText({ prompt, projectName, pageName, figmaImport }) {
  const metadata = {
    fileKey: figmaImport?.fileKey,
    nodeId: figmaImport?.nodeId,
    name: figmaImport?.name,
    type: figmaImport?.type,
    nativeSize: {
      width: figmaImport?.width,
      height: figmaImport?.height,
    },
    assets: Array.isArray(figmaImport?.assets) ? figmaImport.assets : [],
    assetPlan: figmaImport?.assetPlan,
    components: figmaImport?.components,
    componentSets: figmaImport?.componentSets,
    styles: figmaImport?.styles,
    nodeTree: figmaImport?.nodeTree,
  };

  return [
    "Recreate this Figma node as a UX Bridge page-scoped responsive preview.",
    "Use the attached Figma screenshot as the visual source of truth. Use the Figma metadata for exact structure, text, typography, fills, strokes, shadows, radii, spacing, constraints, auto-layout, and asset references.",
    "At the Figma node's native width, match the screenshot as closely as possible: hierarchy, alignment, typography, colors, border radii, shadows, spacing, and proportions. First produce an exact native-width match, then add responsive rules.",
    "Use the assetPlan as binding instructions. It identifies background image fills, atomic rendered images, and SVG vectors that must be used instead of guessed CSS approximations.",
    "The generated root's top-left content should map to the Figma node's top-left origin. Do not insert an extra narrow centered wrapper unless such a wrapper exists in Figma. The primary visual surface should fill the imported frame width at the native breakpoint.",
    "The metadata assets array contains exported Figma image fills, rendered image nodes, and SVG vector/icon exports. Do not use <img> tags. Render image and SVG asset URLs as CSS background-image values on sized <div> elements that match the target Figma layer bounds.",
    "Every image asset should be represented by a div with explicit sizing/aspect-ratio and background-size/background-position/background-repeat that matches the Figma crop/fit behavior. Use role=\"img\" and aria-label when the asset needs alternative text.",
    "Prefer assets with kind=\"rendered-node\" for cropped/masked/background image layers because they preserve Figma crop, mask, radius, and effects. Use kind=\"image-fill\" when you need the original source image.",
    "When an image fill belongs to a container that also has text or child elements, use the image-fill URL as the container background and recreate the child elements separately. Do not use a rendered-node export that already includes those children.",
    "Use assets with kind=\"svg-icon\" for vector icons, logos, status symbols, rings, gauges, arcs, charts, progress indicators, and tab/navigation glyphs. Do not redraw SVG/vector artwork with plain boxes, emoji, generic CSS shapes, or scribbled strokes when a matching SVG asset URL exists.",
    "Preserve each asset's aspect ratio and crop/fit behavior according to the metadata when possible. Do not replace real image fills with gradients or plain color blocks unless no asset URL exists.",
    "Do not render the same Figma layer twice. If you use an exported asset URL for a node, do not also recreate that same node's visual shape from its children.",
    "Use rendered-node assets only for actual image, photo, illustration, or background layers. Do not use rendered-node assets as replacements for parent containers that also contain editable text, controls, or child content.",
    "SVG icon assets represent standalone icons only. Place each icon once at its intended position and do not stack a generic fallback icon on top of it.",
    "Each Figma text node should normally appear once. Avoid duplicate text runs caused by rendering both a parent group and its child text nodes.",
    "Do not create app chrome, device frames, inspector UI, navigation rails, or browser UI.",
    "Generate real HTML/CSS rather than flattening the screenshot into one image.",
    "Make the result responsive: treat the Figma node as the source design at its native breakpoint, preserve that exact design at the imported width, convert fixed layout into flex/grid/minmax/clamp where safe, and add media queries only when needed to fit smaller or wider screens without changing the source visual intent.",
    "If the native width is 700px or wider, keep the imported layout tablet/desktop-first at the native width and above. Do not collapse cards, sidebars, tables, or columns into a mobile stack by default.",
    "If the native width is 480px or narrower and the Figma node is a phone screen or mobile artboard, match that mobile design at the native width, then create wider tablet and desktop rules that expand the app surface, distribute content across the available width, and avoid leaving huge unused side gutters.",
    "Avoid fixed width wrappers like width:375px, width:390px, max-width:430px, or phone-only containers on .vibe-generated-page. The page root should generally be width:100%; min-height:100%; and adapt to the preview width.",
    "Only preserve a literal device frame/chrome if the user explicitly asks for a device mockup; otherwise translate the Figma screen into responsive page content.",
    "For repeated cards, lists, dashboard sections, and galleries, prefer responsive grid rules such as repeat(auto-fit, minmax(...)) or breakpoint-specific media queries.",
    "Keep typography, spacing, and aspect ratios stable across breakpoints. Avoid viewport-scaled font sizes.",
    "If the Figma node is desktop-sized, adapt gracefully down to mobile while preserving the same content hierarchy and design language.",
    [
      `Project: ${projectName}`,
      `Page: ${pageName}`,
      `User import note: ${String(prompt || "").trim() || "Import this Figma selection into the current empty preview."}`,
      `Figma node metadata JSON: ${JSON.stringify(metadata)}`,
    ].join("\n"),
    "Return JSON with keys: summary, html, css, js, assets.",
    "Use js only for interactions that are visible in the Figma design or naturally implied by controls in the design.",
  ].join("\n\n");
}

function buildStructuredCodexRequest({ userText, imageUrl = "" }) {
  const trimmedImageUrl = String(imageUrl || "").trim();

  if (!trimmedImageUrl) {
    return userText;
  }

  return [
    {
      role: "user",
      content: [
        {
          type: "input_text",
          text: userText,
        },
        {
          type: "input_image",
          image_url: trimmedImageUrl,
        },
      ],
    },
  ];
}

function extractResponseText(payload = {}) {
  if (typeof payload.output_text === "string" && payload.output_text.trim()) {
    return payload.output_text;
  }

  const output = Array.isArray(payload.output) ? payload.output : [];

  for (const item of output) {
    const content = Array.isArray(item?.content) ? item.content : [];

    for (const part of content) {
      if (typeof part?.text === "string" && part.text.trim()) {
        return part.text;
      }
    }
  }

  return "";
}

function describeCodexError(status, rawMessage = "") {
  const text = String(rawMessage || "").trim();

  if (status === 401) {
    return "Your Codex connection is no longer valid. Reconnect Codex in Profile and try again.";
  }

  if (/insufficient_quota/i.test(text) || /exceeded your current quota/i.test(text)) {
    return "Your connected OpenAI account has run out of API quota. Add billing or available credits to that OpenAI account, then try again.";
  }

  if (/rate limit/i.test(text) || /too many requests/i.test(text)) {
    return "Your connected OpenAI account is temporarily rate limited. Wait a moment and try again.";
  }

  if (/model.*not found/i.test(text) || /does not exist/i.test(text)) {
    return "The current Codex model is not available for this OpenAI account. Try reconnecting with a different account or update the configured Codex model.";
  }

  if (status >= 500) {
    return "OpenAI is temporarily unavailable for Codex generation. Try again in a moment.";
  }

  return text || `request failed with ${status}.`;
}

function validateGeneratedHtml(html) {
  const trimmed = normalizeGeneratedImageTags(String(html || "").trim());

  if (!trimmed) {
    throw new Error("Codex returned empty HTML.");
  }

  if (!/^<[^>]+class="[^"]*vibe-generated-page/.test(trimmed) && !/^<[^>]+class='[^']*vibe-generated-page/.test(trimmed)) {
    throw new Error("Codex returned HTML without the required vibe-generated-page root.");
  }

  if (/<script\b/i.test(trimmed) || /\son[a-z]+\s*=/i.test(trimmed) || /<(?:html|head|body)\b/i.test(trimmed)) {
    throw new Error("Codex returned unsupported markup for the page-scoped mobile section.");
  }

  return trimmed;
}

function validateGeneratedHtmlFragment(html) {
  const trimmed = normalizeGeneratedImageTags(String(html || "").trim());

  if (!trimmed) {
    throw new Error("Codex returned empty HTML.");
  }

  if (/<script\b/i.test(trimmed) || /\son[a-z]+\s*=/i.test(trimmed) || /<(?:html|head|body)\b/i.test(trimmed)) {
    throw new Error("Codex returned unsupported markup for the selected layer.");
  }

  return trimmed;
}

function parseGeneratedHtmlAttributes(attributeSource = "") {
  const attrs = {};
  const pattern = /([^\s"'<>/=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;
  let match;

  while ((match = pattern.exec(attributeSource))) {
    const name = String(match[1] || "").trim();

    if (!name) {
      continue;
    }

    attrs[name] = match[2] ?? match[3] ?? match[4] ?? "";
  }

  return attrs;
}

function escapeGeneratedHtmlAttribute(value = "") {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function serializeGeneratedHtmlAttributes(attrs = {}) {
  return Object.entries(attrs)
    .filter(([name, value]) => name && value !== undefined && value !== null && value !== false)
    .map(([name, value]) => {
      if (value === true || value === "") {
        return name;
      }

      return `${name}="${escapeGeneratedHtmlAttribute(value)}"`;
    })
    .join(" ");
}

function toBackgroundImageStyle(src = "") {
  const escapedUrl = String(src || "").replace(/\\/g, "\\\\").replace(/'/g, "\\'");

  return [
    `background-image: url('${escapedUrl}')`,
    "background-size: cover",
    "background-position: center",
    "background-repeat: no-repeat",
  ].join("; ");
}

function normalizeGeneratedImageTags(html = "") {
  return String(html || "").replace(/<img\b([^>]*)\/?>/gi, (_match, attributeSource = "") => {
    const attrs = parseGeneratedHtmlAttributes(attributeSource);
    const src = String(attrs.src || "").trim();
    const alt = String(attrs.alt || "").trim();
    const existingStyle = String(attrs.style || "").trim().replace(/;+\s*$/, "");
    const backgroundStyle = src ? toBackgroundImageStyle(src) : "";
    const style = [existingStyle, backgroundStyle].filter(Boolean).join("; ");

    delete attrs.src;
    delete attrs.alt;
    attrs.role = attrs.role || "img";

    if (alt && !attrs["aria-label"]) {
      attrs["aria-label"] = alt;
    }

    if (style) {
      attrs.style = style;
    }

    return `<div ${serializeGeneratedHtmlAttributes(attrs)}></div>`;
  });
}

function validateGeneratedCss(css) {
  const trimmed = String(css || "").trim();

  if (!trimmed) {
    throw new Error("Codex returned empty CSS.");
  }

  if (/(?:^|,|\s)(?:body|html|:root)\b/i.test(trimmed)) {
    throw new Error("Codex returned CSS that targets the global app instead of the page-scoped section.");
  }

  return trimmed;
}

function validateGeneratedJs(js) {
  const trimmed = String(js || "").trim();

  if (!trimmed) {
    return "";
  }

  if (/<\/?script\b/i.test(trimmed)) {
    throw new Error("Codex returned script tags inside preview.js.");
  }

  if (/\b(?:import|export)\b/i.test(trimmed) || /\bdocument\.write\b/i.test(trimmed)) {
    throw new Error("Codex returned unsupported JavaScript for preview.js.");
  }

  if (/\bfetch\s*\(/i.test(trimmed) || /\bXMLHttpRequest\b/i.test(trimmed)) {
    throw new Error("Codex returned network code for preview.js.");
  }

  return trimmed;
}

function buildCodexPageResultFromParsed(parsed = {}, summaryFallback = "Codex generated a page-scoped UI concept.", options = {}) {
  return {
    providerId: "codex",
    providerLabel: "Codex",
    credentialMode: "user-session",
    availableVia: "provider-adapter",
    summary: String(parsed.summary || "").trim() || summaryFallback,
    html: options.scoped ? validateGeneratedHtmlFragment(parsed.html) : validateGeneratedHtml(parsed.html),
    css: validateGeneratedCss(parsed.css),
    js: validateGeneratedJs(parsed.js),
    assets: Array.isArray(parsed.assets) ? parsed.assets : [],
  };
}

async function requestCodexStructuredPageResult({ apiKey, requestBody }) {
  let lastError = "";

  for (const model of CODEX_MODEL_CANDIDATES) {
    const response = await fetch(`${OPENAI_API_BASE_URL}/responses`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        ...requestBody,
      }),
    });

    if (!response.ok) {
      const message = await response.text().catch(() => "");
      lastError = `${model}: ${describeCodexError(response.status, message)}`;

      continue;
    }

    const payload = await response.json().catch(() => ({}));
    const responseText = extractResponseText(payload);

    if (!responseText) {
      lastError = `${model}: empty response`;
      continue;
    }

    try {
      return JSON.parse(responseText);
    } catch {
      lastError = `${model}: malformed structured output`;
    }
  }

  if (lastError) {
    const cleanedMessage = lastError.replace(/^[^:]+:\s*/, "").trim();
    throw new Error(cleanedMessage || "Codex generation failed.");
  }

  throw new Error("Codex generation failed.");
}

function shouldRunFigmaFastQa(figmaImport = null) {
  if (!figmaImport?.imageUrl) {
    return false;
  }

  return !/^(?:0|false|off)$/i.test(String(process.env.UX_BRIDGE_FIGMA_FAST_QA || "").trim());
}

function compactGeneratedPreviewForQa(result = {}) {
  const html = String(result.html || "");
  const css = String(result.css || "");
  const js = String(result.js || "");

  return {
    summary: String(result.summary || "").slice(0, 2000),
    html: html.slice(0, 70000),
    css: css.slice(0, 70000),
    js: js.slice(0, 20000),
    htmlTruncated: html.length > 70000,
    cssTruncated: css.length > 70000,
    jsTruncated: js.length > 20000,
    assets: Array.isArray(result.assets) ? result.assets.slice(0, 60) : [],
  };
}

function buildFigmaFastQaUserText({ projectName, pageName, figmaImport, firstPass }) {
  const qaPayload = compactGeneratedPreviewForQa(firstPass);
  const metadata = {
    name: figmaImport?.name,
    type: figmaImport?.type,
    nativeSize: {
      width: figmaImport?.width,
      height: figmaImport?.height,
    },
    assets: Array.isArray(figmaImport?.assets) ? figmaImport.assets : [],
  };

  return [
    "This is a hidden Fast QA correction pass for a Figma import in UX Bridge.",
    "Compare the generated preview code against the attached Figma screenshot. The screenshot is the visual truth.",
    "Return a corrected full page result only if it improves visual fidelity. Keep the same JSON contract.",
    "Focus on practical pixel-match issues: spacing, padding, margins, alignment, text wrapping, duplicated layers, asset sizing, image crop, icon placement, radii, shadows, and responsive behavior.",
    "If the generated preview uses a composite image that already contains text, controls, icons, or child elements and also recreates those same children in HTML, remove the composite usage and use the original image-fill as a background instead.",
    "Do not return <img> tags. If an image or SVG asset is needed, render it as a sized div with CSS background-image so the preview can measure and select it consistently.",
    "If a photo/background image visible in the screenshot is missing, add the matching Figma image-fill or rendered-node asset before changing layout.",
    "If vector rings, gauges, icons, or charts are approximated with rough CSS strokes, replace the approximation with matching SVG asset URLs from the Figma metadata.",
    "If the generated preview is constrained into a narrow centered panel that does not exist in Figma, remove that wrapper and restore the native Figma frame width/origin.",
    "If repeated children appear both inside a rendered asset and again as editable HTML, keep only one visual representation according to the assetPlan.",
    "Do not add app chrome, device frames, inspector UI, browser UI, page navigation, or global body/html/:root styles.",
    "Keep the result responsive. Match the Figma node at its native width, then adapt fluidly wider and narrower without changing the visual intent.",
    "Do not remove real image or SVG asset URLs unless they are clearly duplicated or wrong.",
    "If a generated code field is marked truncated, preserve the existing structure and make only high-confidence corrections.",
    [
      `Project: ${projectName}`,
      `Page: ${pageName}`,
      `Figma import metadata JSON: ${JSON.stringify(metadata)}`,
      `Generated preview JSON: ${JSON.stringify(qaPayload)}`,
    ].join("\n"),
    "Return JSON with keys: summary, html, css, js, assets.",
  ].join("\n\n");
}

async function runFigmaFastQaPass({
  apiKey,
  projectName,
  pageName,
  figmaImport,
  firstPass,
  responseFormat,
}) {
  if (!shouldRunFigmaFastQa(figmaImport)) {
    return firstPass;
  }

  try {
    const parsed = await requestCodexStructuredPageResult({
      apiKey,
      requestBody: {
        instructions: buildFigmaImportSystemPrompt(),
        input: buildStructuredCodexRequest({
          userText: buildFigmaFastQaUserText({ projectName, pageName, figmaImport, firstPass }),
          imageUrl: figmaImport.imageUrl,
        }),
        reasoning: {
          effort: "low",
        },
        text: responseFormat,
      },
    });

    const qaResult = buildCodexPageResultFromParsed(parsed, firstPass.summary);

    return {
      ...qaResult,
      summary: qaResult.summary || firstPass.summary,
    };
  } catch (error) {
    console.warn("[ux-bridge] Figma Fast QA pass skipped", {
      message: error instanceof Error ? error.message : String(error),
    });

    return firstPass;
  }
}

async function generateCodexPageResult({
  prompt,
  projectName,
  pageName,
  includeProjectContext,
  includePageContext,
  providerAuth = {},
  figmaImport = null,
  scope = null,
  currentPreview = null,
}) {
  const apiKey = String(providerAuth?.apiKey || "").trim();

  if (!apiKey) {
    throw new Error("Connect Codex in an Admin Profile before generating.");
  }

  const responseFormat = {
    format: {
      type: "json_schema",
      name: "ux_bridge_vibe_page_result",
      strict: true,
      schema: {
        type: "object",
        additionalProperties: false,
        required: ["summary", "html", "css", "js", "assets"],
        properties: {
          summary: { type: "string" },
          html: { type: "string" },
          css: { type: "string" },
          js: { type: "string" },
          assets: {
            type: "array",
            items: {
              type: "object",
              additionalProperties: false,
              required: ["name", "kind"],
              properties: {
                name: { type: "string" },
                kind: { type: "string" },
              },
            },
          },
        },
      },
    },
  };

  const requestBody = {
    instructions: figmaImport ? buildFigmaImportSystemPrompt() : buildCodexSystemPrompt(),
    input: figmaImport
      ? buildStructuredCodexRequest({
          userText: buildFigmaImportUserText({ prompt, projectName, pageName, figmaImport }),
          imageUrl: figmaImport.imageUrl,
        })
      : buildCodexUserPrompt({
          prompt,
          projectName,
          pageName,
          includeProjectContext,
          includePageContext,
          scope,
          currentPreview,
        }),
    reasoning: {
      effort: "low",
    },
    text: responseFormat,
  };

  const parsed = await requestCodexStructuredPageResult({ apiKey, requestBody });
  const firstPass = buildCodexPageResultFromParsed(
    parsed,
    "Codex generated a page-scoped UI concept.",
    { scoped: scope?.type === "selected-layer" && scope.layerPath },
  );

  return runFigmaFastQaPass({
    apiKey,
    projectName,
    pageName,
    figmaImport,
    firstPass,
    responseFormat,
  });
}

export async function generateFigmaImportPageResult({
  prompt,
  projectName,
  pageName,
  providerAuth,
  figmaImport,
}) {
  return generateCodexPageResult({
    prompt,
    projectName,
    pageName,
    includeProjectContext: true,
    includePageContext: true,
    providerAuth,
    figmaImport,
  });
}

export function listVibeProviders() {
  return PROVIDERS.map((provider) => ({ ...provider }));
}

export async function generateVibePageResult({
  providerId,
  prompt,
  projectName,
  pageName,
  includeProjectContext,
  includePageContext,
  providerAuth,
  scope = null,
  currentPreview = null,
}) {
  const provider = PROVIDERS.find((entry) => entry.id === providerId) || PROVIDERS[0];

  if (provider.id === "codex") {
    return generateCodexPageResult({
      prompt,
      projectName,
      pageName,
      includeProjectContext,
      includePageContext,
      providerAuth,
      scope,
      currentPreview,
    });
  }

  return generateScaffoldedVibePageResult({
    providerId: provider.id,
    prompt,
    projectName,
    pageName,
    includeProjectContext,
    includePageContext,
  });
}
