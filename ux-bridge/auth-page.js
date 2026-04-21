const LOGIN_PATH = "/index.html";
const HOME_PATH = "/projects.html";

function getNextPath() {
  const params = new URLSearchParams(window.location.search);
  const next = params.get("next");
  return next && next.startsWith("/") ? next : HOME_PATH;
}

function getInviteToken() {
  const params = new URLSearchParams(window.location.search);
  const directToken = params.get("share");

  if (directToken) {
    return directToken;
  }

  try {
    const nextPath = getNextPath();
    const nextUrl = new URL(nextPath, window.location.origin);
    return nextUrl.searchParams.get("share") || "";
  } catch {
    return "";
  }
}

function setMode(mode) {
  document.body.dataset.authMode = mode;
  document.querySelectorAll("[data-auth-tab]").forEach((button) => {
    const isActive = button.dataset.authTab === mode;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-pressed", String(isActive));
  });

  document.querySelectorAll("[data-auth-panel]").forEach((panel) => {
    panel.hidden = panel.dataset.authPanel !== mode;
  });
}

function setStatus(target, message, tone = "neutral") {
  if (!target) {
    return;
  }

  target.textContent = message;
  target.dataset.tone = tone;
}

function getAuthError() {
  const params = new URLSearchParams(window.location.search);
  return String(params.get("authError") || "").trim();
}

function buildMicrosoftSsoUrl() {
  const url = new URL("/api/auth/sso/start", window.location.origin);
  url.searchParams.set("next", getNextPath());
  const inviteToken = getInviteToken();

  if (inviteToken) {
    url.searchParams.set("share", inviteToken);
  }

  return url.toString();
}

async function submitAuth(action, form) {
  const formData = new FormData(form);
  const payload = { action };

  if (formData.has("email")) {
    payload.email = formData.get("email");
  }

  if (formData.has("password")) {
    payload.password = formData.get("password");
  }

  const inviteToken = getInviteToken();
  if (inviteToken) {
    payload.inviteToken = inviteToken;
  }

  if (action === "signup") {
    payload.firstName = formData.get("firstName");
    payload.lastName = formData.get("lastName");
  }

  const response = await fetch("/api/auth", {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  return {
    ok: response.ok,
    payload: await response.json(),
  };
}

(async () => {
  try {
    const sessionResponse = await fetch("/api/auth", {
      method: "GET",
      credentials: "include",
      cache: "no-store",
    });

    if (sessionResponse.ok) {
      const payload = await sessionResponse.json();

      if (payload?.authenticated) {
        window.location.replace(getNextPath());
        return;
      }
    }
  } catch {
    // Keep the user on the auth page if the check fails.
  }

  document.documentElement.style.visibility = "visible";

  document.querySelectorAll("[data-auth-tab]").forEach((button) => {
    button.addEventListener("click", () => {
      setMode(button.dataset.authTab);
    });
  });

  document.querySelectorAll("[data-auth-mode-link]").forEach((button) => {
    button.addEventListener("click", () => {
      setMode(button.dataset.authModeLink);
    });
  });

  document.querySelectorAll("[data-auth-form]").forEach((form) => {
    form.addEventListener("submit", async (event) => {
      event.preventDefault();

      const action = form.dataset.authForm;
      const submitButton = form.querySelector('button[type="submit"]');
      const statusNode = form.querySelector("[data-auth-status]");

      if (submitButton) {
        submitButton.disabled = true;
      }

      const pendingMessage = {
        signup: "Creating account...",
        login: "Signing in...",
        requestPasswordReset: "Sending reset link...",
      }[action] || "Working...";

      setStatus(statusNode, pendingMessage);

      try {
        const result = await submitAuth(action, form);

        if (!result.ok || !result.payload?.ok) {
          setStatus(statusNode, result.payload?.error || "Unable to continue.", "error");
          return;
        }

        if (action === "requestPasswordReset") {
          setStatus(
            statusNode,
            result.payload?.message || "If that account exists, a password reset email is on the way.",
            "success",
          );
          form.reset();
          return;
        }

        setStatus(statusNode, action === "signup" ? "Account created. Redirecting..." : "Signed in. Redirecting...", "success");
        window.location.replace(getNextPath());
      } catch {
        setStatus(statusNode, "Unable to reach the sign-in service.", "error");
      } finally {
        if (submitButton) {
          submitButton.disabled = false;
        }
      }
    });
  });

  document.querySelectorAll("[data-auth-sso]").forEach((button) => {
    button.addEventListener("click", () => {
      window.location.assign(buildMicrosoftSsoUrl());
    });
  });

  const initialMode = getInviteToken() ? "signup" : "login";
  setMode(initialMode);

  const authError = getAuthError();
  if (authError) {
    const initialPanel = document.querySelector(`[data-auth-panel="${initialMode}"]`);
    const statusNode = initialPanel?.querySelector("[data-auth-status]");
    setStatus(statusNode, authError, "error");
  }
})();
