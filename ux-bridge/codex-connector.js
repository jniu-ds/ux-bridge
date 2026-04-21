const OPENAI_API_BASE_URL = "https://api.openai.com/v1";

function maskApiKey(apiKey = "") {
  const trimmed = String(apiKey || "").trim();

  if (!trimmed) {
    return "";
  }

  const suffix = trimmed.slice(-4);
  return `OpenAI key ••••${suffix}`;
}

export function isLikelyOpenAiApiKey(apiKey = "") {
  const trimmed = String(apiKey || "").trim();
  return /^sk-[a-z0-9._-]{16,}$/i.test(trimmed);
}

export async function validateCodexApiKey(apiKey = "") {
  const trimmed = String(apiKey || "").trim();

  if (!isLikelyOpenAiApiKey(trimmed)) {
    return {
      ok: false,
      error: "Enter a valid OpenAI API key to connect Codex.",
    };
  }

  const response = await fetch(`${OPENAI_API_BASE_URL}/models`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${trimmed}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const message = await response.text().catch(() => "");

    if (response.status === 401) {
      return {
        ok: false,
        error: "That OpenAI API key was rejected. Double-check it and try again.",
      };
    }

    return {
      ok: false,
      error: message
        ? `Codex validation failed with ${response.status}: ${message}`
        : `Codex validation failed with ${response.status}.`,
    };
  }

  const payload = await response.json().catch(() => ({}));

  return {
    ok: true,
    accountLabel: maskApiKey(trimmed),
    modelCount: Array.isArray(payload?.data) ? payload.data.length : 0,
  };
}
