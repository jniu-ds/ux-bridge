(async () => {
  const TOAST_DISMISS_MS = 4000;
  const TOAST_EXIT_MS = 260;
  const container = document.querySelector("[data-admin-users-app]");
  const heroActionsContainer = document.querySelector("[data-admin-hero-actions]");
  let toastDismissTimer = 0;
  let toastExitTimer = 0;

  if (!container) {
    return;
  }

  const state = {
    loading: true,
    users: [],
    roles: [],
    rolePermissions: {},
    originalRolePermissions: {},
    defaultRolePermissions: {},
    permissionCatalog: [],
    currentUserEmail: "",
    status: "",
    tone: "neutral",
    toastClosing: false,
    busyEmail: "",
    openMenuEmail: "",
    openMenuPosition: null,
    editingRoleEmail: "",
    pendingRoleByEmail: {},
    sortKey: "createdAt",
    sortDirection: "desc",
    exportingRecovery: false,
    restoringRecovery: false,
    recoveryModalOpen: false,
    recoverySnapshotText: "",
    recentAuditEvents: [],
    recentOperationalEvents: [],
    activeTab: "users",
    savingRolePermissions: false,
    recoveryMenuOpen: false,
    searchQuery: "",
    selectedUserEmails: [],
    bulkDeletingUsers: false,
  };

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;");
  }

  function escapeRegExp(value) {
    return String(value ?? "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  function highlightMatch(value, query) {
    const text = String(value ?? "");
    const normalizedQuery = String(query || "").trim();

    if (!normalizedQuery) {
      return escapeHtml(text);
    }

    const pattern = new RegExp(`(${escapeRegExp(normalizedQuery)})`, "gi");
    return escapeHtml(text).replace(pattern, '<mark class="bridge-table-search__highlight">$1</mark>');
  }

  function userMatchesSearch(user, query) {
    const normalizedQuery = String(query || "").trim().toLowerCase();

    if (!normalizedQuery) {
      return true;
    }

    return [user.fullName, user.email, user.role]
      .map((value) => String(value || "").toLowerCase())
      .some((value) => value.includes(normalizedQuery));
  }

  function restoreUserSearchFocus(selectionStart = null, selectionEnd = null) {
    window.requestAnimationFrame(() => {
      const searchInput = container.querySelector("[data-admin-user-search]");

      if (!(searchInput instanceof HTMLInputElement)) {
        return;
      }

      searchInput.focus();

      if (typeof selectionStart === "number" && typeof selectionEnd === "number") {
        searchInput.setSelectionRange(selectionStart, selectionEnd);
      }
    });
  }

  function getInitials(fullName) {
    const parts = String(fullName || "")
      .trim()
      .split(/\s+/)
      .filter(Boolean);

    if (!parts.length) {
      return "U";
    }

    return parts
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() || "")
      .join("");
  }

  function getSelectedUserEmails() {
    const knownEmails = new Set(state.users.map((user) => user.email));
    return state.selectedUserEmails.filter((email) => knownEmails.has(email));
  }

  function isUserSelected(email = "") {
    return getSelectedUserEmails().includes(email);
  }

  function toggleUserSelection(email, checked) {
    const nextSelected = new Set(getSelectedUserEmails());

    if (checked) {
      nextSelected.add(email);
    } else {
      nextSelected.delete(email);
    }

    state.selectedUserEmails = Array.from(nextSelected);
  }

  function syncSelectedUsersState() {
    state.selectedUserEmails = getSelectedUserEmails();
  }

  function normalizeRolePermissions(input) {
    const source = input && typeof input === "object" ? input : {};
    return state.roles.reduce((result, role) => {
      result[role] = Array.isArray(source[role])
        ? [...new Set(source[role].map((value) => String(value || "").trim()).filter(Boolean))]
        : [];
      return result;
    }, {});
  }

  function roleHasPermission(role, permissionKey) {
    return Array.isArray(state.rolePermissions[role]) && state.rolePermissions[role].includes(permissionKey);
  }

  function setRolePermission(role, permissionKey, enabled) {
    const next = normalizeRolePermissions(state.rolePermissions);
    const nextPermissions = new Set(next[role] || []);

    if (enabled) {
      nextPermissions.add(permissionKey);
    } else {
      nextPermissions.delete(permissionKey);
    }

    next[role] = Array.from(nextPermissions);
    state.rolePermissions = next;
  }

  function rolePermissionMapsEqual(left, right) {
    return state.roles.every((role) => {
      const leftValues = Array.isArray(left?.[role]) ? [...left[role]].sort() : [];
      const rightValues = Array.isArray(right?.[role]) ? [...right[role]].sort() : [];

      if (leftValues.length !== rightValues.length) {
        return false;
      }

      return leftValues.every((value, index) => value === rightValues[index]);
    });
  }

  function getDirtyRolePermissions() {
    return !rolePermissionMapsEqual(state.rolePermissions, state.originalRolePermissions);
  }

  function measureRoleControlWidth(label) {
    const canvas = measureRoleControlWidth.canvas || (measureRoleControlWidth.canvas = document.createElement("canvas"));
    const context = canvas.getContext("2d");

    if (!context) {
      return 148;
    }

    context.font = '700 15px Inter, "Segoe UI", sans-serif';
    const textWidth = context.measureText(String(label || "")).width;
    return Math.max(112, Math.ceil(textWidth + 58));
  }

  function getToastIconMarkup(tone) {
    if (tone === "error") {
      return `
        <span class="bridge-projects__toast-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" focusable="false">
            <circle cx="12" cy="12" r="9"></circle>
            <path d="M12 8.2v5.2"></path>
            <circle cx="12" cy="16.8" r="0.9" fill="currentColor" stroke="none"></circle>
          </svg>
        </span>
      `;
    }

    return `
      <span class="bridge-projects__toast-icon" aria-hidden="true">
        <svg viewBox="0 0 24 24" focusable="false">
          <circle cx="12" cy="12" r="9"></circle>
          <path d="M8.2 12.4l2.5 2.5 5.1-5.4"></path>
        </svg>
      </span>
    `;
  }

  function getSortedUsers() {
    const direction = state.sortDirection === "desc" ? -1 : 1;
    const users = [...state.users];

    users.sort((left, right) => {
      let comparison = 0;

      if (state.sortKey === "role") {
        comparison = String(left.role || "").localeCompare(String(right.role || ""), undefined, { sensitivity: "base" });
        if (!comparison) {
          comparison = String(left.fullName || "").localeCompare(String(right.fullName || ""), undefined, { sensitivity: "base" });
        }
      } else if (state.sortKey === "createdAt") {
        comparison = Number(left.createdAt || 0) - Number(right.createdAt || 0);
        if (!comparison) {
          comparison = String(left.fullName || "").localeCompare(String(right.fullName || ""), undefined, { sensitivity: "base" });
        }
      } else {
        comparison = String(left.fullName || "").localeCompare(String(right.fullName || ""), undefined, { sensitivity: "base" });
        if (!comparison) {
          comparison = String(left.email || "").localeCompare(String(right.email || ""), undefined, { sensitivity: "base" });
        }
      }

      return comparison * direction;
    });

    return users;
  }

  function getSortArrowMarkup(key) {
    if (state.sortKey !== key) {
      return `
        <span class="bridge-admin-table__sort-arrow is-idle" aria-hidden="true">
          <svg viewBox="0 0 16 16" focusable="false">
            <path d="M8 3.25v9.5"></path>
            <path d="M5.5 5.75 8 3.25l2.5 2.5"></path>
            <path d="M5.5 10.25 8 12.75l2.5-2.5"></path>
          </svg>
        </span>
      `;
    }

    if (state.sortDirection === "desc") {
      return `
        <span class="bridge-admin-table__sort-arrow" aria-hidden="true">
          <svg viewBox="0 0 16 16" focusable="false">
            <path d="M8 3.25v9.5"></path>
            <path d="M5.5 10.25 8 12.75l2.5-2.5"></path>
          </svg>
        </span>
      `;
    }

    return `
      <span class="bridge-admin-table__sort-arrow" aria-hidden="true">
        <svg viewBox="0 0 16 16" focusable="false">
          <path d="M8 3.25v9.5"></path>
          <path d="M5.5 5.75 8 3.25l2.5 2.5"></path>
        </svg>
      </span>
    `;
  }

  function clearStatus() {
    window.clearTimeout(toastDismissTimer);
    window.clearTimeout(toastExitTimer);

    if (!state.status) {
      state.toastClosing = false;
      return;
    }

    state.toastClosing = true;
    render();

    toastExitTimer = window.setTimeout(() => {
      state.status = "";
      state.tone = "neutral";
      state.toastClosing = false;
      render();
    }, TOAST_EXIT_MS);
  }

  function setStatus(message = "", tone = "neutral") {
    window.clearTimeout(toastDismissTimer);
    window.clearTimeout(toastExitTimer);

    if (!message) {
      clearStatus();
      return;
    }

    state.status = message;
    state.tone = tone;
    state.toastClosing = false;

    toastDismissTimer = window.setTimeout(() => {
      clearStatus();
    }, TOAST_DISMISS_MS);

    render();
  }

  function render() {
    if (state.loading) {
      container.innerHTML = `
        <article class="bridge-admin__loading">
          <p>Loading users…</p>
        </article>
      `;
      return;
    }

    if (heroActionsContainer) {
      heroActionsContainer.innerHTML = `
        <div class="bridge-admin-hero__menu-wrap">
          <button
            class="bridge-action-rail-button bridge-admin-hero__menu-button"
            type="button"
            aria-haspopup="menu"
            aria-expanded="${state.recoveryMenuOpen ? "true" : "false"}"
            aria-label="Admin recovery tools"
            data-admin-recovery-toggle
          >
            <span class="bridge-action-rail-button__tooltip bridge-admin-hero__tooltip" aria-hidden="true">Recovery</span>
            <svg class="bridge-admin-hero__menu-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
              <path d="M12.22 2h-.44a2 2 0 0 0-1.99 1.78l-.18 1.26c-.5.15-.99.36-1.45.6L7.12 4.9a2 2 0 0 0-2.68.2l-.3.3a2 2 0 0 0-.2 2.68l.74 1.04c-.24.46-.45.95-.6 1.45l-1.26.18A2 2 0 0 0 2 11.78v.44a2 2 0 0 0 1.78 1.99l1.26.18c.15.5.36.99.6 1.45l-.74 1.04a2 2 0 0 0 .2 2.68l.3.3a2 2 0 0 0 2.68.2l1.04-.74c.46.24.95.45 1.45.6l.18 1.26A2 2 0 0 0 11.78 22h.44a2 2 0 0 0 1.99-1.78l.18-1.26c.5-.15.99-.36 1.45-.6l1.04.74a2 2 0 0 0 2.68-.2l.3-.3a2 2 0 0 0 .2-2.68l-.74-1.04c.24-.46.45-.95.6-1.45l1.26-.18A2 2 0 0 0 22 12.22v-.44a2 2 0 0 0-1.78-1.99l-1.26-.18c-.15-.5-.36-.99-.6-1.45l.74-1.04a2 2 0 0 0-.2-2.68l-.3-.3a2 2 0 0 0-2.68-.2l-1.04.74c-.46-.24-.95-.45-1.45-.6l-.18-1.26A2 2 0 0 0 12.22 2z"></path>
              <circle cx="12" cy="12" r="3"></circle>
            </svg>
          </button>
          <div class="bridge-projects-table__menu bridge-admin-hero__menu"${state.recoveryMenuOpen ? "" : " hidden"} role="menu" aria-label="Recovery tools">
            <button class="bridge-projects-table__menu-item" type="button" role="menuitem" data-export-recovery ${state.exportingRecovery ? "disabled" : ""}>
              ${state.exportingRecovery ? "Exporting..." : "Export Recovery Snapshot"}
            </button>
            <button class="bridge-projects-table__menu-item" type="button" role="menuitem" data-open-recovery-modal ${state.restoringRecovery ? "disabled" : ""}>
              Restore Snapshot
            </button>
          </div>
        </div>
      `;
    }

    const statusMarkup = state.status
      ? `
          <div class="bridge-projects__toast${state.tone === "error" ? " bridge-projects__toast--error" : ""}${state.toastClosing ? " is-closing" : ""}" role="status" aria-live="polite">
            ${getToastIconMarkup(state.tone)}
            <span class="bridge-projects__toast-message">${escapeHtml(state.status)}</span>
            <button class="bridge-projects__toast-dismiss" type="button" aria-label="Dismiss notification" data-dismiss-status>
              <span aria-hidden="true">×</span>
            </button>
          </div>
        `
      : "";

    const sortedUsers = getSortedUsers();
    const filteredUsers = sortedUsers.filter((user) => userMatchesSearch(user, state.searchQuery));
    const showSearch = state.users.length > 5;
    const showBulkSelection = state.users.length > 5;
    const selectedUserEmails = getSelectedUserEmails();
    const selectedUserCount = selectedUserEmails.length;
    const selectableFilteredUserEmails = filteredUsers.filter((user) => user.email !== state.currentUserEmail).map((user) => user.email);
    const allFilteredSelected = selectableFilteredUserEmails.length
      ? selectableFilteredUserEmails.every((email) => selectedUserEmails.includes(email))
      : false;
    const searchMarkup = showSearch
      ? `
          <div class="bridge-table-search-bar">
            <label class="bridge-table-search">
              <span class="bridge-table-search__icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" focusable="false">
                  <circle cx="11" cy="11" r="6.5"></circle>
                  <path d="m16 16 4 4"></path>
                </svg>
              </span>
              <input
                class="bridge-table-search__input"
                type="search"
                value="${escapeHtml(state.searchQuery)}"
                placeholder="Search users"
                aria-label="Search users"
                data-admin-user-search
              />
            </label>
          </div>
        `
      : "";
    const bulkActionsMarkup =
      showBulkSelection && selectedUserCount
        ? `
            <div class="bridge-table-bulk-bar">
              <span class="bridge-table-bulk-bar__count">${selectedUserCount} selected</span>
              <div class="bridge-table-bulk-bar__actions">
                <button class="bridge-table-bulk-bar__button bridge-table-bulk-bar__button--danger" type="button" data-admin-bulk-delete ${state.bulkDeletingUsers ? "disabled" : ""}>
                  ${state.bulkDeletingUsers ? "Deleting..." : "Delete"}
                </button>
              </div>
            </div>
          `
        : "";

    const usersMarkup = filteredUsers.length
      ? filteredUsers.map((user) => {
        const isBusy = state.busyEmail === user.email;
        const isCurrentUser = user.email === state.currentUserEmail;
        const initials = getInitials(user.fullName);
        const isEditingRole = state.editingRoleEmail === user.email;
        const pendingRole = state.pendingRoleByEmail[user.email] || user.role;
        const roleControlWidth = measureRoleControlWidth(pendingRole);
        const roleOptions = state.roles
          .map(
            (role) =>
              `<option value="${escapeHtml(role)}" ${role === pendingRole ? "selected" : ""}>${escapeHtml(role)}</option>`,
          )
          .join("");
        const avatarStyle = user.avatarColor ? ` style="--avatar-bg:${escapeHtml(user.avatarColor)}"` : "";
        const avatarMarkup = user.avatarUrl
          ? `<span class="bridge-admin-table__avatar has-photo"${avatarStyle}><img src="${escapeHtml(user.avatarUrl)}" alt="" /></span>`
          : `<span class="bridge-admin-table__avatar" aria-hidden="true"${avatarStyle}>${escapeHtml(initials)}</span>`;
        const canSelectUser = user.email !== state.currentUserEmail;

        return `
          <tr
            class="bridge-admin-table__row"
            data-user-email="${escapeHtml(user.email)}"
            data-profile-email="${escapeHtml(user.email)}"
            tabindex="0"
            role="link"
            aria-label="Open profile for ${escapeHtml(user.fullName)}"
          >
            ${
              showBulkSelection
                ? `
                    <td class="bridge-table-select__cell">
                      <label class="bridge-table-select">
                        <input
                          type="checkbox"
                          aria-label="Select ${escapeHtml(user.fullName)}"
                          data-admin-user-select="${escapeHtml(user.email)}"
                          ${isUserSelected(user.email) ? "checked" : ""}
                          ${canSelectUser ? "" : "disabled"}
                        />
                        <span class="bridge-table-select__control" aria-hidden="true"></span>
                      </label>
                    </td>
                  `
                : ""
            }
            <td class="bridge-admin-table__user-cell">
              <div class="bridge-admin-table__user">
                ${avatarMarkup}
                <div class="bridge-admin-table__identity">
                  <div class="bridge-admin-table__identity-top">
                    <strong><a class="bridge-admin-table__profile-link" href="/profile.html?email=${encodeURIComponent(user.email)}">${highlightMatch(user.fullName, state.searchQuery)}</a></strong>
                    ${isCurrentUser ? '<span class="bridge-admin-table__badge">You</span>' : ""}
                  </div>
                  <span><a class="bridge-admin-table__profile-link" href="/profile.html?email=${encodeURIComponent(user.email)}">${highlightMatch(user.email, state.searchQuery)}</a></span>
                </div>
              </div>
            </td>
            <td class="bridge-admin-table__role-cell">
              <div class="bridge-admin-table__role" style="--role-control-width:${roleControlWidth}px;">
                <div class="bridge-admin-table__role-display"${isEditingRole ? ' hidden' : ""}>
                  <span class="bridge-admin-table__role-pill">${highlightMatch(user.role, state.searchQuery)}</span>
                  <button
                    class="bridge-inline-edit-trigger bridge-admin-table__role-edit"
                    type="button"
                    aria-label="Edit role for ${escapeHtml(user.fullName)}"
                    data-role-edit="${escapeHtml(user.email)}"
                    ${isBusy ? "disabled" : ""}
                  >
                    <span class="bridge-inline-edit-trigger__tooltip" aria-hidden="true">Edit</span>
                    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                      <path d="M4 20h4.75L19 9.75 14.25 5 4 15.25V20z"></path>
                      <path d="M13.5 5.75 18.25 10.5"></path>
                    </svg>
                  </button>
                </div>
                <div class="bridge-admin-table__role-editor"${isEditingRole ? "" : ' hidden'}>
                  <select data-role-select="${escapeHtml(user.email)}" ${isBusy ? "disabled" : ""}>
                    ${roleOptions}
                  </select>
                  <button
                    class="bridge-admin-table__role-save"
                    type="button"
                    aria-label="Save role for ${escapeHtml(user.fullName)}"
                    data-role-save="${escapeHtml(user.email)}"
                    ${isBusy ? "disabled" : ""}
                  >
                    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                      <path d="M5.5 12.5 9.5 16.5 18.5 7.5"></path>
                    </svg>
                  </button>
                </div>
              </div>
            </td>
            <td class="bridge-admin-table__actions-cell">
              <div class="bridge-projects-table__actions bridge-admin-table__actions" data-admin-actions>
                <button
                  class="bridge-projects-table__menu-button"
                  type="button"
                  aria-haspopup="menu"
                  aria-expanded="${state.openMenuEmail === user.email ? "true" : "false"}"
                  aria-label="User options for ${escapeHtml(user.fullName)}"
                  data-admin-menu-toggle="${escapeHtml(user.email)}"
                >
                  <span aria-hidden="true">⋮</span>
                </button>
              </div>
              </td>
          </tr>
        `;
      }).join("")
      || `
        <tr class="bridge-admin-table__empty-row">
          <td colspan="${showBulkSelection ? "4" : "3"}">
            <div class="bridge-table-search__empty">No users match your search.</div>
          </td>
        </tr>
      `
      : `
        <tr class="bridge-admin-table__empty-row">
          <td colspan="${showBulkSelection ? "4" : "3"}">
            <div class="bridge-table-search__empty">No users match your search.</div>
          </td>
        </tr>
      `;

    const activeMenuUser = state.openMenuEmail
      ? state.users.find((user) => user.email === state.openMenuEmail)
      : null;
    const menuMarkup =
      activeMenuUser && state.openMenuPosition
        ? `
            <div
              class="bridge-projects-table__menu bridge-admin__floating-menu"
              role="menu"
              style="top:${Math.round(state.openMenuPosition.top)}px; left:${Math.round(state.openMenuPosition.left)}px;"
            >
              <button
                class="bridge-projects-table__menu-item"
                type="button"
                role="menuitem"
                data-action="reset-password"
                data-email="${escapeHtml(activeMenuUser.email)}"
                ${state.busyEmail === activeMenuUser.email ? "disabled" : ""}
              >
                Reset password
              </button>
              <button
                class="bridge-projects-table__menu-item bridge-projects-table__menu-item--danger"
                type="button"
                role="menuitem"
                data-action="delete-user"
                data-email="${escapeHtml(activeMenuUser.email)}"
                ${state.busyEmail === activeMenuUser.email || activeMenuUser.email === state.currentUserEmail ? "disabled" : ""}
              >
                Delete User
              </button>
            </div>
          `
        : "";

    const recoveryModalMarkup = state.recoveryModalOpen
      ? `
          <div class="bridge-admin__recovery-modal" data-recovery-modal>
            <div class="bridge-admin__recovery-backdrop" data-close-recovery-modal></div>
            <div class="bridge-admin__recovery-dialog" role="dialog" aria-modal="true" aria-labelledby="admin-recovery-title">
              <div class="bridge-admin__recovery-dialog-header">
                <div>
                  <p class="bridge-admin__recovery-eyebrow">Recovery</p>
                  <h2 id="admin-recovery-title">Restore from snapshot</h2>
                  <p class="bridge-admin__recovery-copy">Paste a previously exported UX Bridge recovery snapshot. This overwrites the current durable records.</p>
                </div>
                <button class="bridge-admin__recovery-close" type="button" aria-label="Close restore dialog" data-close-recovery-modal>×</button>
              </div>
              <label class="bridge-admin__recovery-field">
                <span>Recovery snapshot JSON</span>
                <textarea data-recovery-snapshot-input placeholder="Paste the exported JSON snapshot here.">${escapeHtml(state.recoverySnapshotText)}</textarea>
              </label>
              <div class="bridge-admin__recovery-actions">
                <button class="bridge-admin__recovery-button bridge-admin__recovery-button--secondary" type="button" data-close-recovery-modal ${state.restoringRecovery ? "disabled" : ""}>Cancel</button>
                <button class="bridge-admin__recovery-button bridge-admin__recovery-button--danger" type="button" data-restore-recovery ${state.restoringRecovery ? "disabled" : ""}>
                  ${state.restoringRecovery ? "Restoring..." : "Restore snapshot"}
                </button>
              </div>
            </div>
          </div>
        `
      : "";

    const auditMarkup = state.recentAuditEvents.length
      ? state.recentAuditEvents
          .map(
            (event) => `
              <li class="bridge-admin__event-item">
                <div class="bridge-admin__event-main">
                  <strong>${escapeHtml(event.action || "event")}</strong>
                  <span>${escapeHtml(event.actorEmail || "System")}</span>
                </div>
                <div class="bridge-admin__event-meta">
                  <span>${escapeHtml(event.resourceType || "resource")}${event.resourceId ? ` · ${escapeHtml(event.resourceId)}` : ""}</span>
                  <span>${new Date(Number(event.createdAt || 0)).toLocaleString()}</span>
                </div>
              </li>
            `,
          )
          .join("")
      : '<li class="bridge-admin__event-empty">No audit events yet.</li>';

    const operationalMarkup = state.recentOperationalEvents.length
      ? state.recentOperationalEvents
          .map(
            (event) => `
              <li class="bridge-admin__event-item">
                <div class="bridge-admin__event-main">
                  <strong>${escapeHtml(event.name || "event")}</strong>
                  <span class="bridge-admin__event-level bridge-admin__event-level--${escapeHtml(event.level || "info")}">${escapeHtml(event.level || "info")}</span>
                </div>
                <div class="bridge-admin__event-meta">
                  <span>${escapeHtml(event.errorMessage || "No error message")}</span>
                  <span>${new Date(Number(event.createdAt || 0)).toLocaleString()}</span>
                </div>
              </li>
            `,
          )
          .join("")
      : '<li class="bridge-admin__event-empty">No operational events yet.</li>';

    const tabsMarkup = `
      <div class="bridge-admin__tabs" role="tablist" aria-label="Admin sections">
        <button class="bridge-admin__tab${state.activeTab === "users" ? " is-active" : ""}" type="button" role="tab" aria-selected="${state.activeTab === "users" ? "true" : "false"}" data-admin-tab="users">
          Users
        </button>
        <button class="bridge-admin__tab${state.activeTab === "permissions" ? " is-active" : ""}" type="button" role="tab" aria-selected="${state.activeTab === "permissions" ? "true" : "false"}" data-admin-tab="permissions">
          Permissions
        </button>
        <button class="bridge-admin__tab${state.activeTab === "log" ? " is-active" : ""}" type="button" role="tab" aria-selected="${state.activeTab === "log" ? "true" : "false"}" data-admin-tab="log">
          Log
        </button>
        <button class="bridge-admin__tab${state.activeTab === "system-errors" ? " is-active" : ""}" type="button" role="tab" aria-selected="${state.activeTab === "system-errors" ? "true" : "false"}" data-admin-tab="system-errors">
          System Errors
        </button>
      </div>
    `;

    const usersPanelMarkup = `
      <div class="bridge-admin__users-stack">
        ${searchMarkup}
        ${bulkActionsMarkup}
        <div class="bridge-admin__table-shell">
          <table class="bridge-admin-table">
            <thead>
              <tr>
                ${
                  showBulkSelection
                    ? `
                        <th class="bridge-table-select__cell">
                          <label class="bridge-table-select">
                            <input
                              type="checkbox"
                              aria-label="Select all visible users"
                              data-admin-user-select-all
                              ${allFilteredSelected ? "checked" : ""}
                            />
                            <span class="bridge-table-select__control" aria-hidden="true"></span>
                          </label>
                        </th>
                      `
                    : ""
                }
                <th>
                  <button class="bridge-admin-table__sort-button" type="button" data-sort-key="fullName">
                    <span>Users (${filteredUsers.length})</span>
                    ${getSortArrowMarkup("fullName")}
                  </button>
                </th>
                <th>
                  <button class="bridge-admin-table__sort-button" type="button" data-sort-key="role">
                    <span>Role</span>
                    ${getSortArrowMarkup("role")}
                  </button>
                </th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>${usersMarkup}</tbody>
          </table>
        </div>
      </div>
    `;

    const logPanelMarkup = `
      <section class="bridge-admin__observability-card">
        <div class="bridge-admin__observability-header">
          <p class="bridge-admin__count">Log</p>
          <p class="bridge-admin__copy">Sensitive admin, profile, and project actions.</p>
        </div>
        <ul class="bridge-admin__event-list">${auditMarkup}</ul>
      </section>
    `;

    const permissionRowsMarkup = state.permissionCatalog.length
      ? state.permissionCatalog
          .map((permission) => {
            const cells = state.roles
              .map(
                (role) => `
                  <label class="bridge-admin-permissions__toggle">
                    <input
                      type="checkbox"
                      data-role-permission-toggle="${escapeHtml(role)}"
                      data-permission-key="${escapeHtml(permission.key)}"
                      ${roleHasPermission(role, permission.key) ? "checked" : ""}
                      ${state.savingRolePermissions ? "disabled" : ""}
                    />
                    <span class="bridge-admin-permissions__toggle-control" aria-hidden="true"></span>
                    <span class="bridge-admin-permissions__toggle-label">${escapeHtml(role)}</span>
                  </label>
                `,
              )
              .join("");

            return `
              <article class="bridge-admin-permissions__row">
                <div class="bridge-admin-permissions__meta">
                  <p class="bridge-admin-permissions__group">${escapeHtml(permission.group)}</p>
                  <h3>${escapeHtml(permission.label)}</h3>
                  <p>${escapeHtml(permission.description)}</p>
                </div>
                <div class="bridge-admin-permissions__roles">
                  ${cells}
                </div>
              </article>
            `;
          })
          .join("")
      : '<div class="bridge-admin__event-empty">No permissions available yet.</div>';

    const permissionsPanelMarkup = `
      <section class="bridge-admin__observability-card bridge-admin-permissions">
        <div class="bridge-admin__observability-header bridge-admin-permissions__header">
          <div>
            <p class="bridge-admin__count">Permissions</p>
            <p class="bridge-admin__copy">Choose which global capabilities each role gets across UX Bridge.</p>
          </div>
          <div class="bridge-admin-permissions__actions">
            <button class="bridge-admin-permissions__button bridge-admin-permissions__button--secondary" type="button" data-reset-role-permissions ${state.savingRolePermissions ? "disabled" : ""}>
              Reset to defaults
            </button>
            <button class="bridge-admin-permissions__button" type="button" data-save-role-permissions ${!getDirtyRolePermissions() || state.savingRolePermissions ? "disabled" : ""}>
              ${state.savingRolePermissions ? "Saving…" : "Save permissions"}
            </button>
          </div>
        </div>
        <div class="bridge-admin-permissions__list">
          ${permissionRowsMarkup}
        </div>
      </section>
    `;

    const systemErrorsPanelMarkup = `
      <section class="bridge-admin__observability-card">
        <div class="bridge-admin__observability-header">
          <p class="bridge-admin__count">System Errors</p>
          <p class="bridge-admin__copy">Recent application errors and warnings.</p>
        </div>
        <ul class="bridge-admin__event-list">${operationalMarkup}</ul>
      </section>
    `;

    container.innerHTML = `
      ${tabsMarkup}
      ${statusMarkup}
      <div class="bridge-admin__panel${state.activeTab === "users" ? " is-active" : ""}" data-admin-panel="users"${state.activeTab === "users" ? "" : " hidden"}>
        ${usersPanelMarkup}
      </div>
      <div class="bridge-admin__panel${state.activeTab === "permissions" ? " is-active" : ""}" data-admin-panel="permissions"${state.activeTab === "permissions" ? "" : " hidden"}>
        ${permissionsPanelMarkup}
      </div>
      <div class="bridge-admin__panel${state.activeTab === "log" ? " is-active" : ""}" data-admin-panel="log"${state.activeTab === "log" ? "" : " hidden"}>
        ${logPanelMarkup}
      </div>
      <div class="bridge-admin__panel${state.activeTab === "system-errors" ? " is-active" : ""}" data-admin-panel="system-errors"${state.activeTab === "system-errors" ? "" : " hidden"}>
        ${systemErrorsPanelMarkup}
      </div>
      ${menuMarkup}
      ${recoveryModalMarkup}
    `;
  }

  async function loadUsers() {
    state.loading = true;
    render();

    const response = await fetch("/api/admin-users", {
      method: "GET",
      credentials: "include",
      cache: "no-store",
    });

    const payload = await response.json().catch(() => ({}));

    if (!response.ok || !payload?.ok) {
      throw new Error(payload?.error || "Unable to load users.");
    }

    state.users = Array.isArray(payload.users) ? payload.users : [];
    syncSelectedUsersState();
    state.roles = Array.isArray(payload.roles) ? payload.roles : [];
    state.permissionCatalog = Array.isArray(payload.permissionCatalog) ? payload.permissionCatalog : [];
    state.defaultRolePermissions = normalizeRolePermissions(payload.defaultRolePermissions);
    state.rolePermissions = normalizeRolePermissions(payload.rolePermissions);
    state.originalRolePermissions = normalizeRolePermissions(payload.rolePermissions);
    state.currentUserEmail = payload.currentUserEmail || "";
    state.recentAuditEvents = Array.isArray(payload.recentAuditEvents) ? payload.recentAuditEvents : [];
    state.recentOperationalEvents = Array.isArray(payload.recentOperationalEvents) ? payload.recentOperationalEvents : [];
    state.loading = false;
    render();
  }

  async function runAction(action, email, extra = {}) {
    state.busyEmail = email;
    render();

    const response = await fetch("/api/admin-users", {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        action,
        email,
        ...extra,
      }),
    });

    const payload = await response.json().catch(() => ({}));
    state.busyEmail = "";

    if (!response.ok || !payload?.ok) {
      throw new Error(payload?.error || "Unable to update user.");
    }

    return payload;
  }

  async function runRecoveryAction(action, extra = {}) {
    const response = await fetch("/api/admin-users", {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        action,
        ...extra,
      }),
    });

    const payload = await response.json().catch(() => ({}));

    if (!response.ok || !payload?.ok) {
      throw new Error(payload?.error || "Unable to complete the recovery action.");
    }

    return payload;
  }

  function downloadRecoverySnapshot(snapshot) {
    const blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    const timestamp = new Date().toISOString().replaceAll(":", "-");
    anchor.href = url;
    anchor.download = `ux-bridge-recovery-${timestamp}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  function syncOpenMenuState() {
    container.querySelectorAll("[data-admin-menu-toggle]").forEach((button) => {
      const email = button.getAttribute("data-admin-menu-toggle") || "";
      const isOpen = Boolean(email && state.openMenuEmail === email);
      button.setAttribute("aria-expanded", isOpen ? "true" : "false");
    });
  }

  function closeOpenMenu() {
    if (!state.openMenuEmail && !state.openMenuPosition) {
      return;
    }

    state.openMenuEmail = "";
    state.openMenuPosition = null;
    render();
  }

  function closeRecoveryMenu() {
    if (!state.recoveryMenuOpen) {
      return;
    }

    state.recoveryMenuOpen = false;
    render();
  }

  function openMenuForButton(button, email) {
    const rect = button.getBoundingClientRect();
    const menuWidth = 196;
    const menuHeight = 96;
    const gutter = 12;
    state.openMenuEmail = email;
    state.openMenuPosition = {
      top: Math.max(gutter, rect.top - menuHeight - 8),
      left: Math.min(
        Math.max(gutter, rect.right - menuWidth),
        window.innerWidth - menuWidth - gutter,
      ),
    };
    render();
  }

  async function handleDelegatedClick(event) {
    const dismissButton = event.target.closest("[data-dismiss-status]");

    if (dismissButton) {
      clearStatus();
      return true;
    }

    const openRecoveryButton = event.target.closest("[data-open-recovery-modal]");

    if (openRecoveryButton) {
      closeRecoveryMenu();
      state.recoveryModalOpen = true;
      render();
      return true;
    }

    const closeRecoveryButton = event.target.closest("[data-close-recovery-modal]");

    if (closeRecoveryButton) {
      state.recoveryModalOpen = false;
      render();
      return true;
    }

    const exportRecoveryButton = event.target.closest("[data-export-recovery]");

    if (exportRecoveryButton) {
      closeRecoveryMenu();
      state.exportingRecovery = true;
      render();

      try {
        const payload = await runRecoveryAction("exportRecoveryData");
        downloadRecoverySnapshot(payload.snapshot);
        setStatus("Recovery snapshot exported.");
      } catch (error) {
        setStatus(error instanceof Error ? error.message : "Unable to export recovery data.", "error");
      } finally {
        state.exportingRecovery = false;
        render();
      }
      return true;
    }

    const restoreRecoveryButton = event.target.closest("[data-restore-recovery]");

    if (restoreRecoveryButton) {
      state.restoringRecovery = true;
      render();

      try {
        const snapshot = JSON.parse(state.recoverySnapshotText || "{}");
        const payload = await runRecoveryAction("restoreRecoveryData", { snapshot });
        state.recoveryModalOpen = false;
        state.recoverySnapshotText = "";
        await loadUsers();
        setStatus(
          `Recovery snapshot restored. ${payload.restored?.users || 0} users, ${payload.restored?.projects || 0} projects, and ${payload.restored?.commentThreads || 0} comment threads restored.`,
        );
      } catch (error) {
        setStatus(error instanceof Error ? error.message : "Unable to restore recovery data.", "error");
      } finally {
        state.restoringRecovery = false;
        render();
      }
      return true;
    }

    const tabButton = event.target.closest("[data-admin-tab]");

    if (tabButton) {
      const nextTab = tabButton.getAttribute("data-admin-tab") || "users";
      state.activeTab = nextTab;
      closeOpenMenu();
      closeRecoveryMenu();
      render();
      return true;
    }

    const recoveryMenuToggle = event.target.closest("[data-admin-recovery-toggle]");

    if (recoveryMenuToggle) {
      state.recoveryMenuOpen = !state.recoveryMenuOpen;
      closeOpenMenu();
      render();
      return true;
    }

    const menuToggle = event.target.closest("[data-admin-menu-toggle]");

    if (menuToggle) {
      const email = menuToggle.getAttribute("data-admin-menu-toggle") || "";
      if (state.openMenuEmail === email) {
        closeOpenMenu();
        return true;
      }

      openMenuForButton(menuToggle, email);
      return true;
    }

    return false;
  }

  container.addEventListener("change", async (event) => {
    const userSelectInput = event.target.closest("[data-admin-user-select]");

    if (userSelectInput instanceof HTMLInputElement) {
      toggleUserSelection(userSelectInput.getAttribute("data-admin-user-select") || "", userSelectInput.checked);
      render();
      return;
    }

    const userSelectAllInput = event.target.closest("[data-admin-user-select-all]");

    if (userSelectAllInput instanceof HTMLInputElement) {
      const filteredUserEmails = getSortedUsers()
        .filter((user) => userMatchesSearch(user, state.searchQuery))
        .filter((user) => user.email !== state.currentUserEmail)
        .map((user) => user.email);
      const nextSelected = new Set(getSelectedUserEmails());

      if (userSelectAllInput.checked) {
        filteredUserEmails.forEach((email) => nextSelected.add(email));
      } else {
        filteredUserEmails.forEach((email) => nextSelected.delete(email));
      }

      state.selectedUserEmails = Array.from(nextSelected);
      render();
      return;
    }

    const select = event.target.closest("[data-role-select]");

    if (select) {
      const email = select.getAttribute("data-role-select");
      state.pendingRoleByEmail[email] = select.value;
      return;
    }

    const permissionToggle = event.target.closest("[data-role-permission-toggle]");

    if (!(permissionToggle instanceof HTMLInputElement)) {
      return;
    }

    const role = permissionToggle.getAttribute("data-role-permission-toggle") || "";
    const permissionKey = permissionToggle.getAttribute("data-permission-key") || "";

    if (!role || !permissionKey) {
      return;
    }

    setRolePermission(role, permissionKey, permissionToggle.checked);
    render();
  });

  container.addEventListener("click", async (event) => {
    if (await handleDelegatedClick(event)) {
      return;
    }

    const sortButton = event.target.closest("[data-sort-key]");

    if (sortButton) {
      const sortKey = sortButton.getAttribute("data-sort-key");

      if (!sortKey) {
        return;
      }

      if (state.sortKey === sortKey) {
        if (state.sortDirection === "asc") {
          state.sortDirection = "desc";
        } else {
          state.sortKey = "createdAt";
          state.sortDirection = "desc";
        }
      } else {
        state.sortKey = sortKey;
        state.sortDirection = "asc";
      }

      render();
      return;
    }

    const editButton = event.target.closest("[data-role-edit]");

    if (editButton) {
      const email = editButton.getAttribute("data-role-edit");
      const user = state.users.find((entry) => entry.email === email);

      if (!email || !user) {
        return;
      }

      state.editingRoleEmail = email;
      state.pendingRoleByEmail[email] = state.pendingRoleByEmail[email] || user.role;
      render();
      return;
    }

    const saveButton = event.target.closest("[data-role-save]");

    if (saveButton) {
      const email = saveButton.getAttribute("data-role-save");
      const nextRole = state.pendingRoleByEmail[email];
      const existingUser = state.users.find((entry) => entry.email === email);

      if (!email || !nextRole || !existingUser) {
        return;
      }

      if (nextRole === existingUser.role) {
        state.editingRoleEmail = "";
        delete state.pendingRoleByEmail[email];
        render();
        return;
      }

      try {
        const payload = await runAction("updateRole", email, { role: nextRole });
        state.users = state.users.map((user) => (user.email === email ? payload.user : user));
        state.editingRoleEmail = "";
        delete state.pendingRoleByEmail[email];
        setStatus(`Updated ${payload.user.fullName} to ${payload.user.role}.`, "success");
      } catch (error) {
        setStatus(error instanceof Error ? error.message : "Unable to update role.", "error");
        await loadUsers();
      }
      return;
    }

    const bulkDeleteButton = event.target.closest("[data-admin-bulk-delete]");

    if (bulkDeleteButton) {
      const emails = getSelectedUserEmails().filter((email) => email !== state.currentUserEmail);

      if (!emails.length) {
        return;
      }

      const confirmed = window.confirm(`Remove ${emails.length} ${emails.length === 1 ? "user" : "users"} from UX Bridge? They will lose access immediately.`);

      if (!confirmed) {
        return;
      }

      state.bulkDeletingUsers = true;
      render();

      try {
        for (const email of emails) {
          await runAction("deleteUser", email);
        }

        const deletedEmails = new Set(emails);
        state.users = state.users.filter((user) => !deletedEmails.has(user.email));
        state.selectedUserEmails = [];
        state.bulkDeletingUsers = false;
        setStatus(`Removed ${emails.length} ${emails.length === 1 ? "user" : "users"} from UX Bridge.`, "success");
      } catch (error) {
        state.bulkDeletingUsers = false;
        setStatus(error instanceof Error ? error.message : "Unable to complete action.", "error");
        await loadUsers();
      }
      return;
    }

    const saveRolePermissionsButton = event.target.closest("[data-save-role-permissions]");

    if (saveRolePermissionsButton) {
      state.savingRolePermissions = true;
      render();

      try {
        const payload = await runAction("updateRolePermissions", "", {
          rolePermissions: state.rolePermissions,
        });
        state.rolePermissions = normalizeRolePermissions(payload.rolePermissions);
        state.originalRolePermissions = normalizeRolePermissions(payload.rolePermissions);
        setStatus("Role permissions updated.", "success");
      } catch (error) {
        setStatus(error instanceof Error ? error.message : "Unable to update role permissions.", "error");
        await loadUsers();
      } finally {
        state.savingRolePermissions = false;
        render();
      }
      return;
    }

    const resetRolePermissionsButton = event.target.closest("[data-reset-role-permissions]");

    if (resetRolePermissionsButton) {
      const confirmed = window.confirm("Reset all role permissions back to the default UX Bridge policy?");

      if (!confirmed) {
        return;
      }

      state.savingRolePermissions = true;
      render();

      try {
        const payload = await runAction("resetRolePermissions", "", {});
        state.rolePermissions = normalizeRolePermissions(payload.rolePermissions);
        state.originalRolePermissions = normalizeRolePermissions(payload.rolePermissions);
        setStatus("Role permissions reset to defaults.", "success");
      } catch (error) {
        setStatus(error instanceof Error ? error.message : "Unable to reset role permissions.", "error");
        await loadUsers();
      } finally {
        state.savingRolePermissions = false;
        render();
      }
      return;
    }

    const button = event.target.closest("[data-action]");

    if (!button) {
      const profileLink = event.target.closest(".bridge-admin-table__profile-link");

      if (profileLink) {
        return;
      }

      if (
        event.target.closest("[data-admin-actions]") ||
        event.target.closest("[data-role-edit]") ||
        event.target.closest("[data-role-save]") ||
        event.target.closest("[data-role-select]") ||
        event.target.closest(".bridge-table-select")
      ) {
        return;
      }

      const row = event.target.closest("[data-profile-email]");

      if (row) {
        const email = row.getAttribute("data-profile-email");

        if (email) {
          window.location.href = `/profile.html?email=${encodeURIComponent(email)}`;
        }
      }
      return;
    }

    const action = button.getAttribute("data-action");
    const email = button.getAttribute("data-email");

    if (!email) {
      return;
    }

    try {
      if (action === "reset-password") {
        closeOpenMenu();
        const payload = await runAction("resetPassword", email);
        setStatus(payload.message || `Password reset email sent to ${email}.`, "success");
        return;
      }

      if (action === "delete-user") {
        const confirmed = window.confirm(`Remove ${email} from UX Bridge? They will lose access immediately.`);

        if (!confirmed) {
          return;
        }

        closeOpenMenu();
        await runAction("deleteUser", email);
        state.users = state.users.filter((user) => user.email !== email);
        setStatus(`Removed ${email} from UX Bridge.`, "success");
      }
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to complete action.", "error");
      await loadUsers();
    }
  });

  if (heroActionsContainer) {
    heroActionsContainer.addEventListener("click", async (event) => {
      const handled = await handleDelegatedClick(event);
      if (handled) {
        event.preventDefault();
        event.stopPropagation();
      }
    });
  }

  container.addEventListener("input", (event) => {
    const userSearchInput = event.target.closest("[data-admin-user-search]");

    if (userSearchInput instanceof HTMLInputElement) {
      const selectionStart = userSearchInput.selectionStart;
      const selectionEnd = userSearchInput.selectionEnd;
      state.searchQuery = userSearchInput.value;
      render();
      restoreUserSearchFocus(selectionStart, selectionEnd);
      return;
    }

    const textarea = event.target.closest("[data-recovery-snapshot-input]");

    if (!textarea) {
      return;
    }

    state.recoverySnapshotText = textarea.value;
  });

  container.addEventListener("keydown", (event) => {
    const row = event.target.closest("[data-profile-email]");

    if (!row) {
      return;
    }

    if (event.target.closest(".bridge-table-select")) {
      return;
    }

    if (event.key !== "Enter" && event.key !== " ") {
      return;
    }

    if (
      event.target.closest("[data-admin-actions]") ||
      event.target.closest("[data-role-edit]") ||
      event.target.closest("[data-role-save]") ||
      event.target.closest("[data-role-select]") ||
      event.target.closest(".bridge-admin-table__profile-link")
    ) {
      return;
    }

    event.preventDefault();
    const email = row.getAttribute("data-profile-email");

    if (email) {
      window.location.href = `/profile.html?email=${encodeURIComponent(email)}`;
    }
  });

  try {
    await loadUsers();
  } catch (error) {
    state.loading = false;
    setStatus(error instanceof Error ? error.message : "Unable to load users.", "error");
  }

  document.addEventListener("click", (event) => {
    const clickedAdminActions = event.target.closest("[data-admin-actions]") || event.target.closest(".bridge-admin__floating-menu");
    const clickedRecoveryMenu = event.target.closest("[data-admin-hero-actions]");

    if (state.openMenuEmail && !clickedAdminActions) {
      closeOpenMenu();
    }

    if (state.recoveryMenuOpen && !clickedRecoveryMenu) {
      closeRecoveryMenu();
    }
  });

  window.addEventListener("resize", () => {
    closeOpenMenu();
    closeRecoveryMenu();
  });
  window.addEventListener("scroll", () => {
    closeOpenMenu();
    closeRecoveryMenu();
  }, true);
})();
