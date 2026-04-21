(function initProjectShare() {
  const PROJECTS_API = "/api/projects";
  const SHARE_OPTIONS = [
    { value: "invited", label: "Only those I invite" },
    { value: "all-users", label: "All current users" },
    { value: "link", label: "Anyone with the share link" },
  ];
  const root = document.querySelector("[data-header-actions]");
  const modalHost = document.createElement("div");

  if (!root) {
    return;
  }

  modalHost.className = "bridge-project-share-modal-host";
  document.body.append(modalHost);

  const state = {
    projectId: "",
    open: false,
    loading: false,
    project: null,
    inviteQuery: "",
    inviteEmails: [],
    prototypeLabel: "",
    prototypeUrl: "",
    prototypePageId: "",
    sharingSelectOpen: false,
    message: "",
    tone: "neutral",
  };

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;");
  }

  function getProjectId() {
    return String(document.body.dataset.projectKey || "").trim().toLowerCase();
  }

  function getInitials(fullName) {
    const parts = String(fullName || "")
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2);

    return parts.map((part) => part[0]?.toUpperCase() || "").join("") || "U";
  }

  function getFilteredUsers() {
    const project = state.project;

    if (!project || !Array.isArray(project.availableUsers)) {
      return [];
    }

    const currentEmail = String(window.uxBridgeUser?.email || "").trim().toLowerCase();
    const memberEmails = new Set([
      String(project.ownerEmail || "").trim().toLowerCase(),
      ...(Array.isArray(project.members) ? project.members.map((member) => String(member.email || "").trim().toLowerCase()) : []),
    ]);
    const pendingEmails = new Set(Array.isArray(project.pendingInviteEmails) ? project.pendingInviteEmails.map((email) => String(email).trim().toLowerCase()) : []);
    const query = String(state.inviteQuery || "").trim().toLowerCase();
    const selectedEmails = new Set(state.inviteEmails.map((email) => String(email).trim().toLowerCase()));

    return project.availableUsers.filter((user) => {
      const email = String(user.email || "").trim().toLowerCase();

      if (!email || email === currentEmail || memberEmails.has(email) || pendingEmails.has(email) || selectedEmails.has(email)) {
        return false;
      }

      if (!query) {
        return true;
      }

      return [user.fullName, user.email, user.role].join(" ").toLowerCase().includes(query);
    });
  }

  function setStatus(message = "", tone = "neutral") {
    state.message = message;
    state.tone = tone;
    render();
  }

  function normalizeEmail(value) {
    return String(value || "").trim().toLowerCase();
  }

  function isValidInviteEmail(value) {
    return /^(?:[a-z0-9._%+-]+)@(?:nuskin\.com|nuskin\.onmicrosoft\.com)$/i.test(String(value || "").trim());
  }

  function getSharingLabel(value) {
    return SHARE_OPTIONS.find((option) => option.value === value)?.label || SHARE_OPTIONS[0].label;
  }

  function getMemberDisplay(project, email) {
    const normalizedEmail = normalizeEmail(email);
    return (
      project?.projectMembers?.find((member) => normalizeEmail(member.email) === normalizedEmail) ||
      project?.availableUsers?.find((member) => normalizeEmail(member.email) === normalizedEmail) ||
      null
    );
  }

  function addInviteEmail(value) {
    const email = normalizeEmail(value);

    if (!email || !isValidInviteEmail(email)) {
      return false;
    }

    if (state.inviteEmails.includes(email)) {
      return false;
    }

    state.inviteEmails = [...state.inviteEmails, email];
    state.inviteQuery = "";
    return true;
  }

  function removeInviteEmail(value) {
    const email = normalizeEmail(value);
    state.inviteEmails = state.inviteEmails.filter((entry) => entry !== email);
  }

  function getInviteSuggestions() {
    const suggestions = getFilteredUsers().slice(0, 6).map((user) => ({
      type: "user",
      email: normalizeEmail(user.email),
      label: user.fullName,
      user,
    }));
    const query = String(state.inviteQuery || "").trim();
    const normalizedQuery = normalizeEmail(query);

    if (
      normalizedQuery &&
      isValidInviteEmail(normalizedQuery) &&
      !state.inviteEmails.includes(normalizedQuery) &&
      !suggestions.some((entry) => entry.email === normalizedQuery)
    ) {
      suggestions.push({
        type: "email",
        email: normalizedQuery,
        label: normalizedQuery,
      });
    }

    return suggestions;
  }

  function buildAvatarMarkup(user) {
    const avatarUrl = String(user?.avatarUrl || "").trim();
    const avatarColor = String(user?.avatarColor || "").trim();
    const style = avatarColor ? ` style="--avatar-bg:${escapeHtml(avatarColor)}"` : "";

    if (avatarUrl) {
      return `<span class="bridge-project-share__avatar has-photo"${style}><img src="${escapeHtml(avatarUrl)}" alt="" /></span>`;
    }

    return `<span class="bridge-project-share__avatar"${style}>${escapeHtml(getInitials(user?.fullName || user?.email || ""))}</span>`;
  }

  function focusInviteInput(selectionStart = null, selectionEnd = null) {
    window.requestAnimationFrame(() => {
      const input = modalHost.querySelector("[data-project-share-search]");

      if (!input) {
        return;
      }

      input.focus();

      if (typeof selectionStart === "number") {
        const end = typeof selectionEnd === "number" ? selectionEnd : selectionStart;
        input.setSelectionRange(selectionStart, end);
      }
    });
  }

  function render() {
    const project = state.project;
    const canInvite = Boolean(project?.canInvite);
    const canManageSharing = Boolean(project?.canManageSharing);
    const inviteSuggestions = getInviteSuggestions();
    const requests = Array.isArray(project?.accessRequests) ? project.accessRequests : [];
    const pendingInvites = Array.isArray(project?.pendingInviteEmails) ? project.pendingInviteEmails : [];
    const prototypeLinks = Array.isArray(project?.prototypeLinks) ? project.prototypeLinks : [];
    const prototypePages = Array.isArray(project?.pages) ? project.pages : [];

    root.innerHTML = `
      <div class="bridge-project-share">
        <button
          class="bridge-project-share__trigger"
          type="button"
          data-project-share-toggle
          aria-haspopup="dialog"
          aria-expanded="${state.open ? "true" : "false"}"
        >
          <span>Share</span>
          <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <path d="M15.5 8.5 8.5 12l7 3.5"></path>
            <circle cx="17.5" cy="6.5" r="2.25"></circle>
            <circle cx="6.5" cy="12" r="2.25"></circle>
            <circle cx="17.5" cy="17.5" r="2.25"></circle>
          </svg>
        </button>
      </div>
    `;

    modalHost.innerHTML = state.open
      ? `
        <div class="bridge-project-share__modal-shell" data-project-share-overlay>
          <div class="bridge-project-share__modal" role="dialog" aria-modal="true" aria-label="Project sharing">
            <div class="bridge-project-share__panel-head">
              <div>
                <p class="bridge-project-share__eyebrow">Project sharing</p>
                <h2>Share ${escapeHtml(project?.name || "project")}</h2>
              </div>
              <button class="bridge-project-share__close" type="button" aria-label="Close share panel" data-project-share-close>×</button>
            </div>

            ${
              state.message
                ? `<p class="bridge-project-share__status${state.tone === "error" ? " is-error" : ""}">${escapeHtml(state.message)}</p>`
                : ""
            }

              ${
                canManageSharing
                  ? `
                    <section class="bridge-project-share__section">
                      <h3>Project access</h3>
                      <div class="bridge-project-share__settings-grid">
                        <div class="bridge-project-share__setting">
                          <span>Who can open this project</span>
                          <div class="bridge-project-share__select">
                            <button
                              class="bridge-project-share__select-trigger"
                              type="button"
                              data-project-sharing-toggle
                              aria-haspopup="listbox"
                              aria-expanded="${state.sharingSelectOpen ? "true" : "false"}"
                            >
                              <span>${escapeHtml(getSharingLabel(project?.sharingMode || "invited"))}</span>
                              <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">
                                <path d="M3.5 5.75 8 10.25l4.5-4.5"></path>
                              </svg>
                            </button>
                            ${
                              state.sharingSelectOpen
                                ? `
                                  <div class="bridge-project-share__select-menu" role="listbox">
                                    ${SHARE_OPTIONS.map(
                                      (option) => `
                                        <button
                                          class="bridge-project-share__select-option${project?.sharingMode === option.value ? " is-selected" : ""}"
                                          type="button"
                                          role="option"
                                          data-project-sharing-option="${option.value}"
                                        >
                                          ${escapeHtml(option.label)}
                                        </button>
                                      `,
                                    ).join("")}
                              </div>
                            `
                                : ""
                            }
                          </div>
                        </div>
                      </div>
                      <div class="bridge-project-share__meta-row">
                        <div class="bridge-project-share__meta-card">
                          <span>Members</span>
                          <strong>${escapeHtml(String(project?.members?.length || 0))}</strong>
                        </div>
                      </div>
                    </section>
                  `
                : ""
            }

            ${
              canInvite
                ? `
                  <section class="bridge-project-share__section">
                    <h3>Invite people</h3>
                    <form class="bridge-project-share__invite-form" data-project-share-email-form>
                      <div class="bridge-project-share__invite-box">
                        <div class="bridge-project-share__invite-chips">
                          ${state.inviteEmails
                            .map(
                              (email) => `
                                <span class="bridge-project-share__invite-chip">
                                  <span>${escapeHtml(email)}</span>
                                  <button type="button" aria-label="Remove ${escapeHtml(email)}" data-project-share-remove="${escapeHtml(email)}">×</button>
                                </span>
                              `,
                            )
                            .join("")}
                          <input
                            class="bridge-project-share__invite-input"
                            type="text"
                            name="email"
                            placeholder="${state.inviteEmails.length ? "" : "Search people or enter email"}"
                            value="${escapeHtml(state.inviteQuery)}"
                            data-project-share-search
                          />
                        </div>
                        <button type="submit" ${state.inviteEmails.length ? "" : "disabled"}>Invite</button>
                      </div>
                      ${
                        inviteSuggestions.length
                          ? `
                            <div class="bridge-project-share__suggestions">
                              ${inviteSuggestions
                                .map((entry) =>
                                  entry.type === "user"
                                    ? `
                                      <button class="bridge-project-share__suggestion" type="button" data-project-share-add="${escapeHtml(entry.email)}">
                                        <span class="bridge-project-share__suggestion-main">
                                          ${buildAvatarMarkup(entry.user)}
                                          <span class="bridge-project-share__suggestion-text">
                                            <strong>${escapeHtml(entry.user.fullName)}</strong>
                                            <span>${escapeHtml(entry.user.email)}</span>
                                          </span>
                                        </span>
                                        <span class="bridge-project-share__suggestion-action">Add</span>
                                      </button>
                                    `
                                    : `
                                      <button class="bridge-project-share__suggestion" type="button" data-project-share-add="${escapeHtml(entry.email)}">
                                        <span class="bridge-project-share__suggestion-text">
                                          <strong>${escapeHtml(entry.email)}</strong>
                                          <span>Invite this email address</span>
                                        </span>
                                        <span class="bridge-project-share__suggestion-action">Add</span>
                                      </button>
                                    `,
                                )
                                .join("")}
                            </div>
                          `
                          : state.inviteQuery
                          ? `<p class="bridge-project-share__empty">Keep typing to search current users, or enter a valid Nu Skin email.</p>`
                          : ""
                      }
                    </form>
                  </section>
                `
                : ""
            }

            ${
              pendingInvites.length
                ? `
                  <section class="bridge-project-share__section">
                    <h3>Pending invitations</h3>
                    <div class="bridge-project-share__pill-list">
                      ${pendingInvites.map((email) => `<span class="bridge-project-share__pill">${escapeHtml(email)}</span>`).join("")}
                    </div>
                  </section>
                `
                : ""
            }

            ${
              canManageSharing && requests.length
                ? `
                  <section class="bridge-project-share__section">
                    <h3>Access requests</h3>
                    <div class="bridge-project-share__user-list">
                      ${requests
                        .map(
                          (user) => `
                            <div class="bridge-project-share__user-row">
                              <div class="bridge-project-share__user-meta">
                                ${buildAvatarMarkup(user)}
                                <div>
                                  <strong>${escapeHtml(user.fullName)}</strong>
                                  <span>${escapeHtml(user.email)}</span>
                                </div>
                              </div>
                              <button type="button" data-project-share-approve="${escapeHtml(user.email)}">Grant access</button>
                            </div>
                          `,
                        )
                        .join("")}
                    </div>
                  </section>
                `
                : ""
            }
            ${
              project
                ? `
                  <section class="bridge-project-share__section">
                    <div class="bridge-project-share__section-head">
                      <div>
                        <h3>Prototype links</h3>
                        <p>Save and share specific prototype destinations for this project.</p>
                      </div>
                    </div>
                    <form class="bridge-project-share__prototype-form" data-project-prototype-form>
                      <div class="bridge-project-share__prototype-grid">
                        <label class="bridge-project-share__setting">
                          <span>Label</span>
                          <input
                            class="bridge-project-share__field"
                            type="text"
                            name="label"
                            placeholder="Homepage review"
                            value="${escapeHtml(state.prototypeLabel)}"
                            data-project-prototype-label
                          />
                        </label>
                        <label class="bridge-project-share__setting bridge-project-share__setting--wide">
                          <span>Prototype URL</span>
                          <input
                            class="bridge-project-share__field"
                            type="url"
                            name="url"
                            placeholder="https://..."
                            value="${escapeHtml(state.prototypeUrl)}"
                            data-project-prototype-url
                          />
                        </label>
                        <label class="bridge-project-share__setting">
                          <span>Linked page</span>
                          <select class="bridge-project-share__field bridge-project-share__field--select" name="pageId" data-project-prototype-page>
                            <option value="">Project-wide</option>
                            ${prototypePages
                              .map(
                                (page) => `
                                  <option value="${escapeHtml(page.id)}" ${state.prototypePageId === page.id ? "selected" : ""}>
                                    ${escapeHtml(page.name)}
                                  </option>
                                `,
                              )
                              .join("")}
                          </select>
                        </label>
                      </div>
                      <div class="bridge-project-share__prototype-actions">
                        <button type="submit">Save prototype link</button>
                      </div>
                    </form>
                    ${
                      prototypeLinks.length
                        ? `
                          <div class="bridge-project-share__prototype-list">
                            ${prototypeLinks
                              .map((link) => {
                                const linkedPage = prototypePages.find((page) => page.id === link.pageId);
                                return `
                                  <article class="bridge-project-share__prototype-row">
                                    <div class="bridge-project-share__prototype-copy">
                                      <strong>${escapeHtml(link.label || "Prototype link")}</strong>
                                      <span>${escapeHtml(link.url)}</span>
                                      <small>${escapeHtml(linkedPage?.name || "Project-wide")}</small>
                                    </div>
                                    <div class="bridge-project-share__prototype-actions">
                                      <button type="button" class="bridge-project-share__ghost-button" data-project-prototype-copy="${escapeHtml(link.url)}">Copy</button>
                                      <a class="bridge-project-share__ghost-button is-link" href="${escapeHtml(link.url)}" target="_blank" rel="noreferrer">Open</a>
                                    </div>
                                  </article>
                                `;
                              })
                              .join("")}
                          </div>
                        `
                        : `<p class="bridge-project-share__empty">No prototype links yet. Add one so people can jump straight into a specific flow or review target.</p>`
                    }
                  </section>
                `
                : ""
            }
            <footer class="bridge-project-share__footer">
              <div class="bridge-project-share__copy-row">
                <input type="text" readonly value="${escapeHtml(project?.shareUrl || "")}" />
                <button type="button" data-project-share-copy aria-label="Copy share link">
                  <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                    <rect x="9" y="9" width="10" height="10" rx="2"></rect>
                    <path d="M7 15H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h7a2 2 0 0 1 2 2v1"></path>
                  </svg>
                  <span>Copy link</span>
                </button>
              </div>
            </footer>
          </div>
        </div>
      `
      : "";
  }

  async function loadProject() {
    const projectId = getProjectId();

    if (!projectId) {
      return;
    }

    state.loading = true;
    state.projectId = projectId;

    const response = await fetch(`${PROJECTS_API}?project=${encodeURIComponent(projectId)}`, {
      credentials: "include",
      cache: "no-store",
    });
    const payload = await response.json().catch(() => ({}));

    if (!response.ok || !payload?.ok || !payload?.project) {
      throw new Error(payload?.error || "Unable to load sharing settings.");
    }

    state.project = payload.project;
    state.loading = false;
  }

  async function post(action, extra = {}) {
    const response = await fetch(PROJECTS_API, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        action,
        project: state.projectId,
        ...extra,
      }),
    });
    const payload = await response.json().catch(() => ({}));

    if (!response.ok || !payload?.ok) {
      throw new Error(payload?.error || "Unable to update project sharing.");
    }

    if (payload.project) {
      state.project = payload.project;
      window.dispatchEvent(
        new CustomEvent("uxbridge:project-runtime-sync", {
          detail: { project: payload.project },
        }),
      );
    }

    if (payload.message) {
      setStatus(payload.message);
    } else {
      render();
    }
  }

  async function openPanel() {
    state.open = true;
    setStatus("");
    render();

    try {
      await loadProject();
      state.inviteEmails = [];
      state.inviteQuery = "";
      state.prototypeLabel = "";
      state.prototypeUrl = "";
      state.prototypePageId = "";
      state.sharingSelectOpen = false;
      render();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to load sharing settings.", "error");
    }
  }

  function ensureReady() {
    const projectId = getProjectId();

    if (!projectId) {
      window.setTimeout(ensureReady, 250);
      return;
    }

    state.projectId = projectId;
    render();
  }

  async function handleClick(event) {
    const toggle = event.target.closest("[data-project-share-toggle]");
    const close = event.target.closest("[data-project-share-close]");
    const invite = event.target.closest("[data-project-share-invite]");
    const approve = event.target.closest("[data-project-share-approve]");
    const copy = event.target.closest("[data-project-share-copy]");
    const shareToggle = event.target.closest("[data-project-sharing-toggle]");
    const shareOption = event.target.closest("[data-project-sharing-option]");
    const addInvite = event.target.closest("[data-project-share-add]");
    const removeInvite = event.target.closest("[data-project-share-remove]");
    const copyPrototype = event.target.closest("[data-project-prototype-copy]");

    if (toggle) {
      if (state.open) {
        state.open = false;
        render();
      } else {
        await openPanel();
      }
      return;
    }

    if (close) {
      state.open = false;
      render();
      return;
    }

    if (shareToggle) {
      state.sharingSelectOpen = !state.sharingSelectOpen;
      render();
      return;
    }

    if (shareOption) {
      const sharingMode = shareOption.getAttribute("data-project-sharing-option") || "";
      state.sharingSelectOpen = false;
      try {
        await post("updateSharingMode", { sharingMode });
      } catch (error) {
        setStatus(error instanceof Error ? error.message : "Unable to update sharing settings.", "error");
      }
      return;
    }

    if (addInvite) {
      addInviteEmail(addInvite.getAttribute("data-project-share-add") || "");
      render();
      return;
    }

    if (removeInvite) {
      removeInviteEmail(removeInvite.getAttribute("data-project-share-remove") || "");
      render();
      return;
    }

    if (invite) {
      const email = invite.getAttribute("data-project-share-invite") || "";
      try {
        await post("inviteUsers", { emails: [email] });
      } catch (error) {
        setStatus(error instanceof Error ? error.message : "Unable to send invite.", "error");
      }
      return;
    }

    if (approve) {
      const email = approve.getAttribute("data-project-share-approve") || "";
      try {
        await post("approveAccessRequest", { email });
      } catch (error) {
        setStatus(error instanceof Error ? error.message : "Unable to grant access.", "error");
      }
      return;
    }

    if (copy) {
      try {
        await navigator.clipboard.writeText(String(state.project?.shareUrl || ""));
        setStatus("Share link copied.");
      } catch {
        setStatus("Unable to copy the share link.", "error");
      }
      return;
    }

    if (copyPrototype) {
      try {
        await navigator.clipboard.writeText(String(copyPrototype.getAttribute("data-project-prototype-copy") || ""));
        setStatus("Prototype link copied.");
      } catch {
        setStatus("Unable to copy the prototype link.", "error");
      }
      return;
    }

    if (state.sharingSelectOpen && !event.target.closest(".bridge-project-share__select")) {
      state.sharingSelectOpen = false;
      render();
    }
  }

  root.addEventListener("click", (event) => {
    handleClick(event);
  });

  modalHost.addEventListener("click", (event) => {
    handleClick(event);
  });

  function handleInput(event) {
    const searchInput = event.target.closest("[data-project-share-search]");
    const prototypeLabelInput = event.target.closest("[data-project-prototype-label]");
    const prototypeUrlInput = event.target.closest("[data-project-prototype-url]");
    const prototypePageInput = event.target.closest("[data-project-prototype-page]");

    if (searchInput) {
      const selectionStart = searchInput.selectionStart;
      const selectionEnd = searchInput.selectionEnd;
      state.inviteQuery = searchInput.value;
      render();
      focusInviteInput(selectionStart, selectionEnd);
    }

    if (prototypeLabelInput) {
      state.prototypeLabel = prototypeLabelInput.value;
    }

    if (prototypeUrlInput) {
      state.prototypeUrl = prototypeUrlInput.value;
    }

    if (prototypePageInput) {
      state.prototypePageId = prototypePageInput.value;
    }
  }

  root.addEventListener("input", (event) => {
    handleInput(event);
  });

  modalHost.addEventListener("input", (event) => {
    handleInput(event);
  });

  async function handleSubmit(event) {
    const form = event.target.closest("[data-project-share-email-form]");
    const prototypeForm = event.target.closest("[data-project-prototype-form]");

    if (!form) {
      if (!prototypeForm) {
        return;
      }

      event.preventDefault();

      try {
        await post("createPrototypeLink", {
          label: state.prototypeLabel,
          url: state.prototypeUrl,
          pageId: state.prototypePageId,
        });
        state.prototypeLabel = "";
        state.prototypeUrl = "";
        state.prototypePageId = "";
        setStatus("Prototype link saved.");
      } catch (error) {
        setStatus(error instanceof Error ? error.message : "Unable to save the prototype link.", "error");
      }
      return;
    }

    event.preventDefault();
    if (state.inviteQuery) {
      const shouldRefocus = !state.inviteEmails.length;
      addInviteEmail(state.inviteQuery);
      if (shouldRefocus) {
        focusInviteInput();
      }
    }

    if (!state.inviteEmails.length) {
      return;
    }

    try {
      await post("inviteUsers", { emails: state.inviteEmails });
      state.inviteEmails = [];
      state.inviteQuery = "";
      render();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to send invite.", "error");
    }
  }

  root.addEventListener("submit", (event) => {
    handleSubmit(event);
  });

  modalHost.addEventListener("submit", (event) => {
    handleSubmit(event);
  });

  document.addEventListener("click", (event) => {
    if (!state.open) {
      return;
    }

    if (event.target.closest(".bridge-project-share") || event.target.closest(".bridge-project-share__modal")) {
      return;
    }

    state.open = false;
    render();
  });

  document.addEventListener("keydown", (event) => {
    if (!state.open) {
      return;
    }

    if (event.key === "Escape") {
      state.sharingSelectOpen = false;
      state.open = false;
      render();
      return;
    }

    if (event.target.closest("[data-project-share-search]")) {
      if (event.key === "Enter" || event.key === "," || event.key === "Tab") {
        const value = String(state.inviteQuery || "").trim();
        if (value && isValidInviteEmail(value)) {
          event.preventDefault();
          addInviteEmail(value);
          render();
          focusInviteInput();
        }
      } else if (event.key === "Backspace" && !state.inviteQuery && state.inviteEmails.length) {
        state.inviteEmails = state.inviteEmails.slice(0, -1);
        render();
        focusInviteInput();
      }
    }
  });

  ensureReady();

  window.addEventListener("uxbridge:project-runtime-sync", (event) => {
    const project = event.detail?.project;

    if (!project || project.id !== state.projectId) {
      return;
    }

    state.project = project;
    render();
  });
})();
