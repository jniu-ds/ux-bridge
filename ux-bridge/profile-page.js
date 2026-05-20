(async () => {
  const PROFILE_API = "/api/profile";
  const container = document.querySelector("[data-profile-app]");
  const modalHost = document.createElement("div");

  if (!container) {
    return;
  }

  modalHost.className = "bridge-profile-tool-modal-host";
  document.body.append(modalHost);

  const params = new URLSearchParams(window.location.search);
  const requestedEmail = String(params.get("email") || "").trim().toLowerCase();
  const state = {
    loading: true,
    saving: false,
    sendingReset: false,
    status: "",
    tone: "neutral",
    user: null,
    currentUser: null,
    roles: [],
    toolProviders: [],
    canEditRole: false,
    canManageAllProfiles: false,
    viewingSelf: true,
    avatarUrl: "",
    avatarColor: "",
    connectingProviderId: "",
  };

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;");
  }

  function getInitials(fullName) {
    const parts = String(fullName || "")
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2);

    return parts.map((part) => part.charAt(0).toUpperCase()).join("") || "U";
  }

  function setKnownUser(user) {
    if (!user) {
      return;
    }

    window.uxBridgeUser = user;
    sessionStorage.setItem("ux-bridge-user", JSON.stringify(user));
    window.dispatchEvent(new CustomEvent("uxbridge:user-ready", { detail: user }));
  }

  function syncShellUser(user) {
    if (!user) {
      return;
    }

    document.querySelectorAll("[data-auth-user-name]").forEach((node) => {
      node.textContent = user.fullName;
    });

    document.querySelectorAll("[data-auth-user-email]").forEach((node) => {
      node.textContent = user.email;
    });

    document.querySelectorAll("[data-auth-user-avatar]").forEach((node) => {
      node.style.setProperty("--avatar-bg", String(user.avatarColor || ""));
      if (user.avatarUrl) {
        node.innerHTML = `<img src="${user.avatarUrl}" alt="" />`;
        node.classList.add("has-photo");
      } else {
        node.textContent = getInitials(user.fullName);
        node.classList.remove("has-photo");
      }
    });

    if (String(user.role || "").trim().toLowerCase() === "admin") {
      document.querySelectorAll("[data-admin-link], [data-admin-only]").forEach((node) => {
        node.hidden = false;
      });
    } else {
      document.querySelectorAll("[data-admin-link], [data-admin-only]").forEach((node) => {
        node.remove();
      });
    }
  }

  function setStatus(message = "", tone = "neutral") {
    state.status = message;
    state.tone = tone;
    render();
  }

  function renderToolModal() {
    modalHost.innerHTML = "";
  }

  function render() {
    if (state.loading) {
      container.innerHTML = `
        <article class="bridge-profile__loading">
          <p>Loading profile…</p>
        </article>
      `;
      return;
    }

    const user = state.user;

    if (!user) {
      container.innerHTML = `
        <article class="bridge-profile__loading">
          <p>Profile not found.</p>
        </article>
      `;
      return;
    }

    const statusMarkup = state.status
      ? `<p class="bridge-profile__status${state.tone === "error" ? " bridge-profile__status--error" : ""}">${escapeHtml(state.status)}</p>`
      : "";

    const roleMarkup = state.canEditRole
      ? `
          <label class="bridge-profile__field">
            <span class="bridge-profile__label">Role</span>
            <select name="role" ${state.saving ? "disabled" : ""}>
              ${state.roles
                .map(
                  (role) =>
                    `<option value="${escapeHtml(role)}" ${role === user.role ? "selected" : ""}>${escapeHtml(role)}</option>`,
                )
                .join("")}
            </select>
          </label>
        `
      : `
          <div class="bridge-profile__field">
            <span class="bridge-profile__label">Role</span>
            <div class="bridge-profile__readonly">
              <span class="bridge-admin-table__role-pill">${escapeHtml(user.role)}</span>
            </div>
          </div>
        `;

    const adminBanner = state.canManageAllProfiles && !state.viewingSelf
      ? `<p class="bridge-profile__eyebrow-note">Admin view for ${escapeHtml(user.fullName)}</p>`
      : "";

    const integrations = user.integrations || {};
    const toolsMarkup = state.toolProviders
      .map((provider) => {
        const integration = integrations[provider.id] || {};
        const isBusy = state.connectingProviderId === provider.id;
        const isConfigured = Boolean(provider.isConfigured);
        const statusLabel = isConfigured ? "Configured" : "Needs setup";
        const accountLabel = isConfigured ? "Managed by the UX Bridge organization workspace" : "Awaiting organization-managed API setup";

        return `
          <article class="bridge-profile__tool-card">
            <div class="bridge-profile__tool-copy">
              <div>
                <strong>${escapeHtml(provider.label)}</strong>
                <p>${escapeHtml(provider.helperCopy || "Ready for hosted vibe coding in UX Bridge.")}</p>
              </div>
              <span class="bridge-profile__tool-badge${isConfigured ? " is-connected" : ""}">
                ${statusLabel}
              </span>
            </div>
            <div class="bridge-profile__tool-meta">
              <span>Credential mode</span>
              <strong>${escapeHtml(provider.credentialMode || integration.credentialMode || "organization-managed")}</strong>
            </div>
            <div class="bridge-profile__tool-meta">
              <span>Availability</span>
              <strong>${escapeHtml(accountLabel)}</strong>
            </div>
            <div class="bridge-profile__tool-actions">
              ${
                !state.viewingSelf
                  ? `<span class="bridge-profile__tool-owner-note">Managed by account owner</span>`
                  : `<span class="bridge-profile__tool-owner-note">${
                      isConfigured
                        ? "Ready for hosted vibe coding in the drawer"
                        : "An admin still needs to configure this provider for the organization"
                    }</span>`
              }
            </div>
          </article>
        `;
      })
      .join("");

    container.innerHTML = `
      <div class="bridge-profile__shell">
        <section class="bridge-profile__card">
          ${adminBanner}
          ${statusMarkup}
          <div class="bridge-profile__grid">
            <div class="bridge-profile__avatar-block">
              <div class="bridge-profile__avatar${state.avatarUrl ? " has-photo" : ""}">
                <div class="bridge-profile__avatar-surface" style="--avatar-bg:${escapeHtml(state.avatarColor || "")};">
                ${
                  state.avatarUrl
                    ? `<img src="${escapeHtml(state.avatarUrl)}" alt="${escapeHtml(user.fullName)} profile photo" />`
                    : `<span>${escapeHtml(getInitials(user.fullName))}</span>`
                }
                </div>
              </div>
              <div class="bridge-profile__avatar-actions">
                <label class="bridge-profile__photo-button">
                  <input type="file" accept="image/*" data-profile-photo-input ${state.saving ? "disabled" : ""} />
                  <span>${state.avatarUrl ? "Change photo" : "Upload photo"}</span>
                </label>
                ${
                  state.avatarUrl
                    ? `<button type="button" class="bridge-profile__photo-clear" data-clear-profile-photo ${state.saving ? "disabled" : ""}>Remove photo</button>`
                    : ""
                }
              </div>
            </div>

            <form class="bridge-profile__form" data-profile-form>
              <div class="bridge-profile__form-grid">
                <label class="bridge-profile__field">
                  <span class="bridge-profile__label">First name</span>
                  <input type="text" name="firstName" value="${escapeHtml(user.firstName)}" maxlength="80" ${state.saving ? "disabled" : ""} required />
                </label>
                <label class="bridge-profile__field">
                  <span class="bridge-profile__label">Last name</span>
                  <input type="text" name="lastName" value="${escapeHtml(user.lastName)}" maxlength="80" ${state.saving ? "disabled" : ""} required />
                </label>
                <label class="bridge-profile__field bridge-profile__field--wide">
                  <span class="bridge-profile__label">Email</span>
                  <input type="email" name="email" value="${escapeHtml(user.email)}" ${state.saving ? "disabled" : ""} required />
                </label>
                ${roleMarkup}
              </div>
              <div class="bridge-profile__actions">
                <button type="submit" class="bridge-profile__save" ${state.saving ? "disabled" : ""}>
                  ${state.saving ? "Saving…" : "Save changes"}
                </button>
                <button type="button" class="bridge-profile__reset bridge-admin-table__action bridge-admin-table__action--secondary" data-profile-reset-password ${state.sendingReset ? "disabled" : ""}>
                  ${state.sendingReset ? "Sending…" : "Send password reset email"}
                </button>
              </div>
            </form>
          </div>
        </section>
        <section class="bridge-profile__card">
          <div class="bridge-profile__section-head">
            <div>
              <p class="bridge-profile__eyebrow-note">Connected tools</p>
              <h2>Provider connections</h2>
            </div>
            <p class="bridge-profile__section-copy">Vibe coding providers are now organization-managed. Users can choose between configured providers in the drawer, and UX Bridge keeps the API credentials on the server.</p>
          </div>
          <div class="bridge-profile__tool-grid">
            ${toolsMarkup}
          </div>
        </section>
      </div>
    `;

    renderToolModal();
  }

  async function loadProfile() {
    state.loading = true;
    render();

    const url = requestedEmail ? `${PROFILE_API}?email=${encodeURIComponent(requestedEmail)}` : PROFILE_API;
    const response = await fetch(url, {
      credentials: "include",
      cache: "no-store",
    });
    const payload = await response.json().catch(() => ({}));

    if (!response.ok || !payload?.ok) {
      throw new Error(payload?.error || "Unable to load profile.");
    }

    state.user = payload.user;
    state.currentUser = payload.currentUser;
    state.roles = Array.isArray(payload.roles) ? payload.roles : [];
    state.toolProviders = Array.isArray(payload.toolProviders) ? payload.toolProviders : [];
    state.canEditRole = Boolean(payload.canEditRole);
    state.canManageAllProfiles = Boolean(payload.canManageAllProfiles);
    state.viewingSelf = Boolean(payload.viewingSelf);
    state.avatarUrl = String(payload.user?.avatarUrl || "");
    state.avatarColor = String(payload.user?.avatarColor || "");

    if (state.viewingSelf && payload.currentUser) {
      setKnownUser(payload.currentUser);
      syncShellUser(payload.currentUser);
    }

    state.loading = false;
    render();
  }

  async function fileToDataUrl(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ""));
      reader.onerror = () => reject(new Error("Unable to read image file."));
      reader.readAsDataURL(file);
    });
  }

  container.addEventListener("change", async (event) => {
    const input = event.target.closest("[data-profile-photo-input]");

    if (!input || !input.files?.[0]) {
      return;
    }

    try {
      const dataUrl = await fileToDataUrl(input.files[0]);
      state.avatarUrl = dataUrl;
      render();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to read image file.", "error");
    }
  });

  container.addEventListener("click", async (event) => {
    const clearPhotoButton = event.target.closest("[data-clear-profile-photo]");
    const resetPasswordButton = event.target.closest("[data-profile-reset-password]");
    const toolActionButton = event.target.closest("[data-tool-action]");

    if (clearPhotoButton) {
      state.avatarUrl = "";
      render();
      return;
    }

    if (toolActionButton && state.user) {
      const providerId = String(toolActionButton.dataset.providerId || "").trim().toLowerCase();
      const action = String(toolActionButton.dataset.toolAction || "").trim();

      try {
        state.connectingProviderId = providerId;
        render();

        const response = await fetch(`${PROFILE_API}?email=${encodeURIComponent(state.user.email)}`, {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            action: action === "disconnect" ? "disconnectTool" : "connectTool",
            providerId,
          }),
        });
        const payload = await response.json().catch(() => ({}));

        if (!response.ok || !payload?.ok) {
          throw new Error(payload?.error || "Unable to update tool connection.");
        }

        state.user = payload.user;
        state.currentUser = payload.currentUser;
        state.toolProviders = Array.isArray(payload.toolProviders) ? payload.toolProviders : state.toolProviders;
        state.roles = Array.isArray(payload.roles) ? payload.roles : state.roles;
        state.canEditRole = Boolean(payload.canEditRole);
        state.canManageAllProfiles = Boolean(payload.canManageAllProfiles);
        state.viewingSelf = Boolean(payload.viewingSelf);

        if (state.viewingSelf && payload.currentUser) {
          setKnownUser(payload.currentUser);
          syncShellUser(payload.currentUser);
        }

        setStatus(payload.message || "Tool connection updated.", "success");
      } catch (error) {
        setStatus(error instanceof Error ? error.message : "Unable to update tool connection.", "error");
      } finally {
        state.connectingProviderId = "";
        render();
      }
      return;
    }

    if (!resetPasswordButton || !state.user) {
      return;
    }

    try {
      state.sendingReset = true;
      render();

      const response = await fetch(`${PROFILE_API}?email=${encodeURIComponent(state.user.email)}`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action: "resetPassword" }),
      });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok || !payload?.ok) {
        throw new Error(payload?.error || "Unable to send password reset email.");
      }

      setStatus(payload.message || `Password reset email sent to ${state.user.email}.`, "success");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to send password reset email.", "error");
    } finally {
      state.sendingReset = false;
      render();
    }
  });

  container.addEventListener("submit", async (event) => {
    const form = event.target.closest("[data-profile-form]");

    if (!form || !state.user) {
      return;
    }

    event.preventDefault();

    try {
      state.saving = true;
      render();

      const formData = new FormData(form);
      const response = await fetch(`${PROFILE_API}?email=${encodeURIComponent(state.user.email)}`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "updateProfile",
          firstName: formData.get("firstName"),
          lastName: formData.get("lastName"),
          email: formData.get("email"),
          role: formData.get("role"),
          avatarUrl: state.avatarUrl,
        }),
      });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok || !payload?.ok) {
        throw new Error(payload?.error || "Unable to save profile.");
      }

      state.user = payload.user;
      state.currentUser = payload.currentUser;
      state.roles = Array.isArray(payload.roles) ? payload.roles : state.roles;
      state.toolProviders = Array.isArray(payload.toolProviders) ? payload.toolProviders : state.toolProviders;
      state.canEditRole = Boolean(payload.canEditRole);
      state.canManageAllProfiles = Boolean(payload.canManageAllProfiles);
      state.viewingSelf = Boolean(payload.viewingSelf);
      state.avatarUrl = String(payload.user?.avatarUrl || "");
      state.avatarColor = String(payload.user?.avatarColor || "");

      if (state.viewingSelf && payload.currentUser) {
        setKnownUser(payload.currentUser);
        syncShellUser(payload.currentUser);
      }

      if (state.canManageAllProfiles && !state.viewingSelf) {
        const url = new URL(window.location.href);
        url.searchParams.set("email", payload.user.email);
        window.history.replaceState({}, "", url.toString());
      }

      setStatus(payload.message || "Profile updated.", "success");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to save profile.", "error");
    } finally {
      state.saving = false;
      render();
    }
  });

  try {
    await loadProfile();
  } catch (error) {
    state.loading = false;
    setStatus(error instanceof Error ? error.message : "Unable to load profile.", "error");
  }
})();
