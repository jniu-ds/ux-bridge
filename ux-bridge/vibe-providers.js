const OPENAI_API_BASE_URL = "https://api.openai.com/v1";
const ANTHROPIC_API_BASE_URL = "https://api.anthropic.com/v1";
const OPENAI_API_KEY = String(process.env.OPENAI_API_KEY || "").trim();
const OPENAI_VIBE_MODEL = String(process.env.OPENAI_VIBE_MODEL || "gpt-5.1-codex").trim() || "gpt-5.1-codex";
const ANTHROPIC_API_KEY = String(process.env.ANTHROPIC_API_KEY || "").trim();
const ANTHROPIC_VIBE_MODEL =
  String(process.env.ANTHROPIC_VIBE_MODEL || "claude-sonnet-4-20250514").trim() || "claude-sonnet-4-20250514";

const PROVIDERS = [
  {
    id: "codex",
    label: "Codex",
    credentialMode: "organization-managed",
    availableVia: "server",
    helperCopy: "Uses the hosted OpenAI Codex integration for page-scoped Vibe coding in the mobile preview container.",
    isConfigured: Boolean(OPENAI_API_KEY),
    model: OPENAI_VIBE_MODEL,
  },
  {
    id: "claude",
    label: "Claude",
    credentialMode: "organization-managed",
    availableVia: "server",
    helperCopy: "Uses the hosted Anthropic Claude integration for page-scoped Vibe coding in the mobile preview container.",
    isConfigured: Boolean(ANTHROPIC_API_KEY),
    model: ANTHROPIC_VIBE_MODEL,
  },
];

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

function hasChartIntent(prompt) {
  return /(chart|graph|plot|donut|doughnut|pie chart|pie|bar chart|bar graph|line chart|line graph|area chart|sparkline|histogram|scatter ?plot|radar chart|legend|axis|axes)\b/i.test(
    String(prompt || ""),
  );
}

function hasChartLikeMarkup(source) {
  const html = String(source || "");
  if (!html) {
    return false;
  }

  return /data-chart-root\b|<(?:svg|canvas)\b|conic-gradient\(|\b(?:chart|graph|plot|legend|axis)\b/i.test(html);
}

function shouldRequireEditableCharts({ prompt, selectedLayer }) {
  if (hasChartIntent(prompt)) {
    return true;
  }

  return hasChartLikeMarkup(selectedLayer?.html);
}

function extractChartRootTags(html) {
  const source = String(html || "");
  return Array.from(source.matchAll(/<([a-z0-9:-]+)\b[^>]*\bdata-chart-root\b[^>]*>/gi)).map((match) => match[0]);
}

function tagHasAttribute(tag, attributeName) {
  const escapedName = String(attributeName || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`\\b${escapedName}(?:\\s*=\\s*(?:"[^"]*"|'[^']*'|[^\\s>]+))?`, "i").test(String(tag || ""));
}

function validateEditableChartContract(html, options = {}) {
  if (!options.requireEditableCharts) {
    return;
  }

  const source = String(html || "").trim();
  const chartRootTags = extractChartRootTags(source);

  if (!chartRootTags.length) {
    throw new Error(
      "Chart edits must return at least one editable chart root with data-chart-root, data-chart-type, data-chart-kind, data-chart-values, data-chart-labels, and data-chart-colors.",
    );
  }

  const requiredAttributes = [
    "data-chart-root",
    "data-chart-type",
    "data-chart-kind",
    "data-chart-values",
    "data-chart-labels",
    "data-chart-colors",
  ];

  chartRootTags.forEach((tag, index) => {
    const missingAttributes = requiredAttributes.filter((attributeName) => !tagHasAttribute(tag, attributeName));
    if (missingAttributes.length) {
      throw new Error(
        `Editable chart root ${index + 1} is missing required metadata: ${missingAttributes.join(", ")}.`,
      );
    }
  });
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
      min-height: 100%;
      color: #1f2431;
      box-sizing: border-box;
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
  `;
}

function validateGeneratedHtml(html, options = {}) {
  const trimmed = String(html || "").trim();
  const { selectedLayer = false, requireEditableCharts = false } = options;

  if (!trimmed) {
    throw new Error("The provider returned empty HTML.");
  }

  if (
    !selectedLayer &&
    !/^<[^>]+class="[^"]*vibe-generated-page/.test(trimmed) &&
    !/^<[^>]+class='[^']*vibe-generated-page/.test(trimmed)
  ) {
    throw new Error("The provider returned HTML without the required vibe-generated-page root.");
  }

  if (/<script\b/i.test(trimmed) || /\son[a-z]+\s*=/i.test(trimmed) || /<(?:html|head|body)\b/i.test(trimmed)) {
    throw new Error(
      selectedLayer
        ? "The provider returned unsupported markup for the selected layer update."
        : "The provider returned unsupported markup for the page-scoped mobile section.",
    );
  }

  if (
    /(empty-mobile-taskbar|empty-mobile-shell|phone-frame|mobile-page--empty|preview-scale-bar|bridge-project-toolbar)/i.test(
      trimmed,
    )
  ) {
    throw new Error("The provider returned preview-shell markup instead of container-only page content.");
  }

  validateEditableChartContract(trimmed, { requireEditableCharts });

  return trimmed;
}

function validateGeneratedCss(css, options = {}) {
  const trimmed = String(css || "").trim();
  const { allowEmpty = false } = options;

  if (!trimmed && !allowEmpty) {
    throw new Error("The provider returned empty CSS.");
  }

  if (!trimmed) {
    return "";
  }

  if (/(?:^|,|\s)(?:body|html|:root)\b/i.test(trimmed)) {
    throw new Error("The provider returned CSS that targets the global app instead of the page-scoped section.");
  }

  return trimmed;
}

export function validateGeneratedVibePayload(result = {}, options = {}) {
  const normalizedProviderId = String(result.providerId || PROVIDERS[0]?.id || "codex").trim().toLowerCase();
  const provider = PROVIDERS.find((entry) => entry.id === normalizedProviderId) || PROVIDERS[0];
  const summary = String(result.summary || "").trim() || `${provider.label} generated a page-scoped UI concept.`;
  const hasSelectedLayer = Boolean(result.selectedLayer);
  const requireEditableCharts = options.requireEditableCharts === true;

  return {
    providerId: provider.id,
    providerLabel: String(result.providerLabel || provider.label || "Provider").trim() || provider.label || "Provider",
    credentialMode:
      String(result.credentialMode || provider.credentialMode || "organization-managed").trim().toLowerCase() ||
      provider.credentialMode ||
      "organization-managed",
    availableVia:
      String(result.availableVia || provider.availableVia || "server").trim().toLowerCase() ||
      provider.availableVia ||
      "server",
    summary,
    assistantMessage:
      String(result.assistantMessage || "").trim() ||
      `Updated the mobile preview container for ${String(result.pageName || "").trim() || "this page"}. ${summary}`,
    html: validateGeneratedHtml(result.html, { selectedLayer: hasSelectedLayer, requireEditableCharts }),
    css: validateGeneratedCss(result.css, { allowEmpty: hasSelectedLayer }),
    assets: Array.isArray(result.assets) ? result.assets : [],
  };
}

export function generateScaffoldedVibePageResult({
  providerId = "codex",
  prompt,
  projectName,
  pageName,
  includeProjectContext,
  includePageContext,
}) {
  const provider = PROVIDERS.find((entry) => entry.id === providerId) || PROVIDERS[0];
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
    pageName,
    summary: `${provider.label} created a mobile-preview concept${contextSummary ? ` using ${contextSummary}` : ""}.`,
    assistantMessage: `I created a first pass for ${pageName}. I focused on ${promptSummary.toLowerCase()} and kept the changes scoped to the mobile preview container.`,
    html: renderMockHtml(copy, promptSummary, projectName, pageName),
    css: renderMockCss(),
    assets: [],
  });
}

function summarizeThreadMessages(messages = []) {
  return (Array.isArray(messages) ? messages : [])
    .slice(-8)
    .map((message) => {
      const role = String(message?.role || "system").trim().toLowerCase() || "system";
      const pageId = String(message?.pageId || "").trim();
      const content = String(message?.content || "").trim().replace(/\s+/g, " ");
      const attachmentSummary = Array.isArray(message?.assets)
        ? message.assets
            .map((asset) => String(asset?.fileName || "").trim())
            .filter(Boolean)
            .join(", ")
        : "";

      if (!content) {
        return "";
      }

      return `${role}${pageId ? ` (${pageId})` : ""}: ${content}${attachmentSummary ? ` [attachments: ${attachmentSummary}]` : ""}`;
    })
    .filter(Boolean)
    .join("\n");
}

function summarizePromptAssets(assets = []) {
  return (Array.isArray(assets) ? assets : [])
    .map((asset) => {
      const fileName = String(asset?.fileName || "").trim();
      const kind = String(asset?.kind || "").trim().toLowerCase() || "file";
      if (!fileName) {
        return "";
      }
      return `${fileName} (${kind})`;
    })
    .filter(Boolean)
    .join(", ");
}

function summarizeDesignSystem(designSystem = {}) {
  const tokenGroups = Array.isArray(designSystem?.tokenGroups) ? designSystem.tokenGroups : [];
  const referencePages = Array.isArray(designSystem?.referencePages) ? designSystem.referencePages : [];
  const tokenSummary = tokenGroups.length
    ? tokenGroups.map((entry) => `${entry.group} (${entry.count})`).join(", ")
    : "none";
  const referenceSummary = referencePages.length
    ? referencePages
        .slice(0, 4)
        .map((entry) => `${entry.name}: ${entry.summary || "applied pattern"}`)
        .join("; ")
    : "none";

  return {
    tokenSummary,
    referenceSummary,
    prototypeLinks: Number(designSystem?.prototypeLinks || 0) || 0,
  };
}

function buildCurrentPageSourceContext(currentPageHtml = "", currentPageCss = "") {
  const html = String(currentPageHtml || "").trim();
  const css = String(currentPageCss || "").trim();

  if (!html && !css) {
    return "";
  }

  const maxHtmlLength = 12000;
  const maxCssLength = 12000;
  const safeHtml = html.length > maxHtmlLength ? `${html.slice(0, maxHtmlLength).trim()}\n<!-- truncated -->` : html;
  const safeCss = css.length > maxCssLength ? `${css.slice(0, maxCssLength).trim()}\n/* truncated */` : css;

  return [
    `Current page source of truth:`,
    html ? `Current HTML:\n${safeHtml}` : "",
    css ? `Current CSS:\n${safeCss}` : "",
  ]
    .filter(Boolean)
    .join("\n\n");
}

function buildSelectedLayerSourceContext(selectedLayer = null, currentPageCss = "") {
  const html = String(selectedLayer?.html || "").trim();

  if (!html) {
    return "";
  }

  const maxHtmlLength = 8000;
  const maxCssLength = 8000;
  const css = String(currentPageCss || "").trim();
  const safeHtml = html.length > maxHtmlLength ? `${html.slice(0, maxHtmlLength).trim()}\n<!-- truncated -->` : html;
  const safeCss = css.length > maxCssLength ? `${css.slice(0, maxCssLength).trim()}\n/* truncated */` : css;

  return [
    `Selected layer scope:`,
    selectedLayer?.label ? `Selected layer label: ${selectedLayer.label}` : "",
    selectedLayer?.tagName ? `Selected layer tag: ${selectedLayer.tagName}` : "",
    selectedLayer?.pathKey ? `Selected layer path: ${selectedLayer.pathKey}` : "",
    selectedLayer?.textSummary ? `Selected layer text summary: ${selectedLayer.textSummary}` : "",
    `Selected layer HTML:\n${safeHtml}`,
    safeCss ? `Current page CSS:\n${safeCss}` : "",
  ]
    .filter(Boolean)
    .join("\n\n");
}

function buildHostedSystemPrompt({
  providerLabel,
  prompt,
  projectName,
  pageName,
  currentPageSummary,
  currentPageHtml,
  currentPageCss,
  selectedLayer,
  includeProjectContext,
  includePageContext,
  recentThreadMessages,
  designSystem,
  viewport,
  promptAssets,
}) {
  const threadSummary = summarizeThreadMessages(recentThreadMessages);
  const systemSummary = summarizeDesignSystem(designSystem);
  const attachmentSummary = summarizePromptAssets(promptAssets);
  const currentPageSourceContext = buildCurrentPageSourceContext(currentPageHtml, currentPageCss);
  const selectedLayerSourceContext = buildSelectedLayerSourceContext(selectedLayer, currentPageCss);
  const hasSelectedLayer = Boolean(String(selectedLayer?.pathKey || "").trim() && String(selectedLayer?.html || "").trim());
  const requireEditableCharts = shouldRequireEditableCharts({ prompt, selectedLayer });

  return [
    `You are ${providerLabel} inside UX Bridge.`,
    `Your job is to edit only the mobile preview container content for the current page in the project.`,
    hasSelectedLayer
      ? `A specific layer is currently selected. Edit only that selected layer and its descendants.`
      : `No specific layer is selected. Default to the smallest page-level change that satisfies the user's request.`,
    hasSelectedLayer
      ? `Treat the selected layer as the source of truth. Preserve ancestors, siblings, and every unrelated part of the page exactly as they are.`
      : `Treat the current page as the source of truth. Preserve existing sections, copy, layout, styling patterns, classes, and responsive behavior wherever they are not directly involved in the requested change.`,
    hasSelectedLayer
      ? `Return html as the complete replacement outerHTML for the selected layer only. Do not return the full page html.`
      : `Do not redesign, rewrite, or restructure unrelated parts of the page unless the user explicitly asks for a broader redesign, overhaul, restructure, or new page layout.`,
    hasSelectedLayer
      ? `Return css only as minimal additive overrides for the selected layer and its descendants. Leave css empty if no css changes are needed. Do not include runtime data-ux-* attributes in the returned html.`
      : `If the request only affects one area, return the full updated html/css with the untouched areas kept as close to the current version as possible.`,
    `Return valid JSON only with this shape: {"summary":"string","assistantMessage":"string","html":"string","css":"string","assets":[]}.`,
    `Rules for html:`,
    hasSelectedLayer ? `- root element must be the selected layer replacement element` : `- root element must have class "vibe-generated-page"`,
    `- output only the content that belongs inside the mobile preview body`,
    `- do not recreate or reference the phone shell, device chrome, preview frame, or the top task bar`,
    `- assume the top task bar already exists outside your output and must remain untouched`,
    `- do not include <html>, <head>, <body>, <script>, or inline event handlers`,
    `Rules for css:`,
    `- style only the returned container and its descendants`,
    `- do not target body, html, :root, the preview shell, the phone frame, or the top task bar`,
    `- keep the output appropriate for the active preview container and its selected viewport`,
    `- design for the vertical space below the existing task bar`,
    requireEditableCharts ? `Chart editability rules:` : "",
    requireEditableCharts
      ? `- any chart you create or replace must include a chart root with data-chart-root, data-chart-type, data-chart-kind, data-chart-values, data-chart-labels, and data-chart-colors`
      : "",
    requireEditableCharts
      ? `- keep the rendered chart visuals, labels, and legends synchronized with those data-chart-* values`
      : "",
    requireEditableCharts
      ? `- prefer editable svg or css chart markup over opaque canvas unless the user explicitly asks for canvas`
      : "",
    requireEditableCharts
      ? `- for donut or pie charts, include hooks named data-chart-donut-visual, data-chart-donut-center-label, data-chart-donut-center-value, data-chart-legend-item, data-chart-legend-dot, data-chart-legend-label, and data-chart-legend-value`
      : "",
    `Responsive-first rules:`,
    `- every generated design must be responsive by default`,
    `- use fluid, flexible layouts that adapt cleanly to narrower and wider viewport widths`,
    `- prefer grid/flex layouts, wrapping behavior, relative spacing, and width constraints like max-width: 100%`,
    `- avoid brittle fixed widths, overflow-prone horizontal layouts, and absolute positioning unless it is genuinely necessary for the design`,
    `- text, cards, controls, and media should resize or wrap gracefully without clipping`,
    `- if you introduce multi-column structure, it must collapse cleanly for narrow screens`,
    `Project: ${projectName || "Project"}.`,
    `Current page: ${pageName || "Page"}.`,
    viewport?.label && viewport?.width && viewport?.height
      ? `Active preview viewport: ${viewport.label} (${viewport.width}x${viewport.height}, ${viewport.orientation || "responsive"}).`
      : "",
    includePageContext && currentPageSummary ? `Current page preview summary: ${currentPageSummary}` : "",
    includePageContext && hasSelectedLayer && selectedLayerSourceContext ? selectedLayerSourceContext : "",
    includePageContext && !hasSelectedLayer && currentPageSourceContext ? currentPageSourceContext : "",
    includeProjectContext && threadSummary ? `Recent shared project thread:\n${threadSummary}` : "",
    attachmentSummary ? `The current user prompt includes these attachments: ${attachmentSummary}. Use them as direct context for the requested change.` : "",
    `Design system tokens: ${systemSummary.tokenSummary}.`,
    `Reference pages: ${systemSummary.referenceSummary}.`,
    systemSummary.prototypeLinks ? `Prototype links available: ${systemSummary.prototypeLinks}.` : "",
    viewport?.label
      ? `For this turn, optimize the layout decisions for the active ${viewport.label.toLowerCase()} viewport while preserving clean responsive behavior across the other supported screen sizes. Use media queries or responsive layout rules when the layout should change between viewports.`
      : "",
    `Use the design system patterns when possible and keep the UI production-oriented, intentional, and visually refined.`,
  ]
    .filter(Boolean)
    .join("\n");
}

function extractJsonObject(text = "") {
  const source = String(text || "").trim();

  if (!source) {
    throw new Error("The provider returned an empty response.");
  }

  const fencedMatch = source.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fencedMatch ? fencedMatch[1].trim() : source;
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");

  if (start === -1 || end === -1 || end <= start) {
    throw new Error("The provider response did not include a valid JSON object.");
  }

  return JSON.parse(candidate.slice(start, end + 1));
}

async function callOpenAiVibeProvider({ prompt, systemPrompt }) {
  const promptAttachments = arguments[0]?.promptAttachments || [];
  const userContent = [{ type: "input_text", text: prompt }];

  promptAttachments.forEach((asset) => {
    const contentType = String(asset?.contentType || "").trim().toLowerCase();
    const dataBase64 = String(asset?.dataBase64 || "").trim();

    if (!contentType.startsWith("image/") || !dataBase64) {
      return;
    }

    userContent.push({
      type: "input_image",
      image_url: `data:${contentType};base64,${dataBase64}`,
    });
  });

  const response = await fetch(`${OPENAI_API_BASE_URL}/responses`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: OPENAI_VIBE_MODEL,
      text: {
        format: {
          type: "json_schema",
          name: "ux_bridge_vibe_response",
          schema: {
            type: "object",
            additionalProperties: false,
            required: ["summary", "assistantMessage", "html", "css", "assets"],
            properties: {
              summary: { type: "string" },
              assistantMessage: { type: "string" },
              html: { type: "string" },
              css: { type: "string" },
              assets: {
                type: "array",
                items: {
                  type: "object",
                  additionalProperties: false,
                  properties: {},
                },
              },
            },
          },
        },
      },
      input: [
        {
          role: "system",
          content: [{ type: "input_text", text: systemPrompt }],
        },
        {
          role: "user",
          content: userContent,
        },
      ],
    }),
  });

  if (!response.ok) {
    const message = await response.text().catch(() => "");
    throw new Error(
      message ? `Codex request failed with ${response.status}: ${message}` : `Codex request failed with ${response.status}.`,
    );
  }

  const payload = await response.json().catch(() => ({}));
  const content =
    String(payload?.output_text || "").trim() ||
    (Array.isArray(payload?.output)
      ? payload.output
          .flatMap((entry) => (Array.isArray(entry?.content) ? entry.content : []))
          .map((entry) => {
            if (entry?.type === "output_text") {
              return String(entry.text || "");
            }

            if (entry?.type === "text") {
              return String(entry.text || "");
            }

            return "";
          })
          .filter(Boolean)
          .join("\n")
          .trim()
      : "");
  return extractJsonObject(content);
}

async function callAnthropicVibeProvider({ prompt, systemPrompt }) {
  const promptAttachments = arguments[0]?.promptAttachments || [];
  const userContent = [{ type: "text", text: prompt }];

  promptAttachments.forEach((asset) => {
    const contentType = String(asset?.contentType || "").trim().toLowerCase();
    const dataBase64 = String(asset?.dataBase64 || "").trim();

    if (!contentType.startsWith("image/") || !dataBase64) {
      return;
    }

    userContent.push({
      type: "image",
      source: {
        type: "base64",
        media_type: contentType,
        data: dataBase64,
      },
    });
  });

  const response = await fetch(`${ANTHROPIC_API_BASE_URL}/messages`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: ANTHROPIC_VIBE_MODEL,
      max_tokens: 2200,
      system: systemPrompt,
      messages: [
        {
          role: "user",
          content: userContent,
        },
      ],
    }),
  });

  if (!response.ok) {
    const message = await response.text().catch(() => "");
    throw new Error(
      message ? `Claude request failed with ${response.status}: ${message}` : `Claude request failed with ${response.status}.`,
    );
  }

  const payload = await response.json().catch(() => ({}));
  const content = Array.isArray(payload?.content)
    ? payload.content
        .map((entry) => (entry?.type === "text" ? String(entry.text || "") : ""))
        .filter(Boolean)
        .join("\n")
    : "";
  return extractJsonObject(content);
}

export function listVibeProviders() {
  return PROVIDERS.map((provider) => ({ ...provider }));
}

export async function generateVibePageResult({
  providerId,
  prompt,
  promptAssets,
  attachmentPayloads,
  projectName,
  pageName,
  includeProjectContext,
  includePageContext,
  currentPageSummary,
  currentPageHtml,
  currentPageCss,
  selectedLayer,
  recentThreadMessages,
  designSystem,
  viewport,
}) {
  const provider = PROVIDERS.find((entry) => entry.id === String(providerId || "").trim().toLowerCase()) || PROVIDERS[0];

  if (!provider.isConfigured) {
    throw new Error(
      `${provider.label} is not configured for hosted Vibe coding yet. Add the required server API key before using this provider.`,
    );
  }

  const requireEditableCharts = shouldRequireEditableCharts({ prompt, selectedLayer });

  const systemPrompt = buildHostedSystemPrompt({
    providerLabel: provider.label,
    projectName,
    pageName,
    currentPageSummary,
    currentPageHtml,
    currentPageCss,
    selectedLayer,
    includeProjectContext,
    includePageContext,
    recentThreadMessages,
    designSystem,
    viewport,
    promptAssets,
    prompt,
  });

  const rawResult =
    provider.id === "claude"
      ? await callAnthropicVibeProvider({ prompt, systemPrompt, promptAttachments: attachmentPayloads })
      : await callOpenAiVibeProvider({ prompt, systemPrompt, promptAttachments: attachmentPayloads });

  return validateGeneratedVibePayload({
    providerId: provider.id,
    providerLabel: provider.label,
    credentialMode: provider.credentialMode,
    availableVia: provider.availableVia,
    pageName,
    selectedLayer,
    summary: rawResult.summary,
    assistantMessage: rawResult.assistantMessage,
    html: rawResult.html,
    css: rawResult.css,
    assets: rawResult.assets,
  }, { requireEditableCharts });
}
