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
    "Keep the output polished, intentional, and mobile-first.",
  ].join(" ");
}

function buildCodexUserPrompt({
  prompt,
  projectName,
  pageName,
  includeProjectContext,
  includePageContext,
}) {
  const contextLines = [
    `Project: ${projectName}`,
    `Page: ${pageName}`,
    includeProjectContext ? `Include project context: yes` : `Include project context: no`,
    includePageContext ? `Include page context: yes` : `Include page context: no`,
    `User prompt: ${String(prompt || "").trim()}`,
  ];

  return [
    "Create a page-scoped mobile UI concept for the current UX Bridge page.",
    contextLines.join("\n"),
    "Return JSON with keys: summary, html, css, js, assets.",
    "Use js for rich interactions such as toggles, filters, accordions, tab states, sliders, counters, or lightweight animation behavior.",
    "assets should be an empty array unless you truly need named assets.",
  ].join("\n\n");
}

function buildFigmaImportUserText({ prompt, projectName, pageName, figmaImport }) {
  const metadata = {
    fileKey: figmaImport?.fileKey,
    nodeId: figmaImport?.nodeId,
    name: figmaImport?.name,
    type: figmaImport?.type,
    width: figmaImport?.width,
    height: figmaImport?.height,
    nodeTree: figmaImport?.nodeTree,
  };

  return [
    "Recreate this Figma node as a UX Bridge page-scoped mobile preview.",
    "Aim for a 1:1 visual match at the source design size while making the layout responsive at all screen sizes.",
    "Use the attached Figma screenshot as the visual source of truth and the Figma node metadata for structure, text, spacing, colors, and hierarchy.",
    "Do not create app chrome, device frames, inspector UI, navigation rails, or browser UI.",
    "If the Figma node is desktop-sized, translate it into a responsive .vibe-generated-page that preserves the design language and adapts gracefully down to mobile.",
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
  const trimmed = String(html || "").trim();

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

async function generateCodexPageResult({
  prompt,
  projectName,
  pageName,
  includeProjectContext,
  includePageContext,
  providerAuth = {},
  figmaImport = null,
}) {
  const apiKey = String(providerAuth?.apiKey || "").trim();

  if (!apiKey) {
    throw new Error("Connect Codex in an Admin Profile before generating.");
  }

  const requestBody = {
    instructions: buildCodexSystemPrompt(),
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
        }),
    reasoning: {
      effort: "low",
    },
    text: {
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
    },
  };

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

    let parsed;

    try {
      parsed = JSON.parse(responseText);
    } catch {
      lastError = `${model}: malformed structured output`;
      continue;
    }

    return {
      providerId: "codex",
      providerLabel: "Codex",
      credentialMode: "user-session",
      availableVia: "provider-adapter",
      summary: String(parsed.summary || "").trim() || "Codex generated a page-scoped UI concept.",
      html: validateGeneratedHtml(parsed.html),
      css: validateGeneratedCss(parsed.css),
      js: validateGeneratedJs(parsed.js),
      assets: Array.isArray(parsed.assets) ? parsed.assets : [],
    };
  }

  if (lastError) {
    const cleanedMessage = lastError.replace(/^[^:]+:\s*/, "").trim();
    throw new Error(cleanedMessage || "Codex generation failed.");
  }

  throw new Error("Codex generation failed.");
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
