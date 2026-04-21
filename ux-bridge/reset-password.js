const LOGIN_PATH = "/index.html";
const HOME_PATH = "/projects.html";

function getResetToken() {
  const params = new URLSearchParams(window.location.search);
  return params.get("token") || "";
}

function setStatus(target, message, tone = "neutral") {
  if (!target) {
    return;
  }

  target.textContent = message;
  target.dataset.tone = tone;
}

(async () => {
  document.documentElement.style.visibility = "visible";

  const form = document.querySelector("[data-reset-form]");
  const statusNode = document.querySelector("[data-reset-status]");
  const token = getResetToken();

  if (!token) {
    setStatus(statusNode, "This password reset link is missing or invalid.", "error");
    form?.querySelector('button[type="submit"]')?.setAttribute("disabled", "true");
    return;
  }

  form?.addEventListener("submit", async (event) => {
    event.preventDefault();

    const formData = new FormData(form);
    const password = String(formData.get("password") || "");
    const confirmPassword = String(formData.get("confirmPassword") || "");
    const submitButton = form.querySelector('button[type="submit"]');

    if (password !== confirmPassword) {
      setStatus(statusNode, "Passwords do not match.", "error");
      return;
    }

    submitButton.disabled = true;
    setStatus(statusNode, "Updating password...");

    try {
      const response = await fetch("/api/auth", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "resetPassword",
          token,
          password,
        }),
      });

      const payload = await response.json();

      if (!response.ok || !payload?.ok) {
        setStatus(statusNode, payload?.error || "Unable to reset password.", "error");
        return;
      }

      setStatus(statusNode, "Password updated. Redirecting...", "success");
      window.location.replace(HOME_PATH);
    } catch {
      setStatus(statusNode, "Unable to reach the sign-in service.", "error");
    } finally {
      submitButton.disabled = false;
    }
  });
})();
