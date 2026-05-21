(async()=>{let e=document.querySelector(`[data-admin-users-app]`),t=document.querySelector(`[data-admin-hero-actions]`),n=0,r=0;if(!e)return;let i={loading:!0,users:[],roles:[],rolePermissions:{},originalRolePermissions:{},defaultRolePermissions:{},permissionCatalog:[],currentUserEmail:``,status:``,tone:`neutral`,toastClosing:!1,busyEmail:``,openMenuEmail:``,openMenuPosition:null,editingRoleEmail:``,pendingRoleByEmail:{},sortKey:`createdAt`,sortDirection:`desc`,exportingRecovery:!1,restoringRecovery:!1,recoveryModalOpen:!1,recoverySnapshotText:``,recentAuditEvents:[],recentOperationalEvents:[],activeTab:`users`,savingRolePermissions:!1,recoveryMenuOpen:!1,searchQuery:``,selectedUserEmails:[],bulkDeletingUsers:!1};function a(e){return String(e??``).replaceAll(`&`,`&amp;`).replaceAll(`<`,`&lt;`).replaceAll(`>`,`&gt;`).replaceAll(`"`,`&quot;`)}function o(e){return String(e??``).replace(/[.*+?^${}()|[\]\\]/g,`\\$&`)}function s(e,t){let n=String(e??``),r=String(t||``).trim();if(!r)return a(n);let i=RegExp(`(${o(r)})`,`gi`);return a(n).replace(i,`<mark class="bridge-table-search__highlight">$1</mark>`)}function c(e,t){let n=String(t||``).trim().toLowerCase();return n?[e.fullName,e.email,e.role].map(e=>String(e||``).toLowerCase()).some(e=>e.includes(n)):!0}function l(t=null,n=null){window.requestAnimationFrame(()=>{let r=e.querySelector(`[data-admin-user-search]`);r instanceof HTMLInputElement&&(r.focus(),typeof t==`number`&&typeof n==`number`&&r.setSelectionRange(t,n))})}function u(e){let t=String(e||``).trim().split(/\s+/).filter(Boolean);return t.length?t.slice(0,2).map(e=>e[0]?.toUpperCase()||``).join(``):`U`}function d(e){let t=Number(e);return!Number.isFinite(t)||t<=0?`$0.00`:t<.01?`$${t.toFixed(4)}`:`$${t.toFixed(2)}`}function f(){let e=new Set(i.users.map(e=>e.email));return i.selectedUserEmails.filter(t=>e.has(t))}function p(e=``){return f().includes(e)}function m(e,t){let n=new Set(f());t?n.add(e):n.delete(e),i.selectedUserEmails=Array.from(n)}function h(){i.selectedUserEmails=f()}function g(e){let t=e&&typeof e==`object`?e:{};return i.roles.reduce((e,n)=>(e[n]=Array.isArray(t[n])?[...new Set(t[n].map(e=>String(e||``).trim()).filter(Boolean))]:[],e),{})}function _(e,t){return Array.isArray(i.rolePermissions[e])&&i.rolePermissions[e].includes(t)}function v(e,t,n){let r=g(i.rolePermissions),a=new Set(r[e]||[]);n?a.add(t):a.delete(t),r[e]=Array.from(a),i.rolePermissions=r}function y(e,t){return i.roles.every(n=>{let r=Array.isArray(e?.[n])?[...e[n]].sort():[],i=Array.isArray(t?.[n])?[...t[n]].sort():[];return r.length===i.length?r.every((e,t)=>e===i[t]):!1})}function b(){return!y(i.rolePermissions,i.originalRolePermissions)}function x(e){let t=(x.canvas||=document.createElement(`canvas`)).getContext(`2d`);if(!t)return 148;t.font=`700 15px Inter, "Segoe UI", sans-serif`;let n=t.measureText(String(e||``)).width;return Math.max(112,Math.ceil(n+58))}function S(e){return e===`error`?`
        <span class="bridge-projects__toast-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" focusable="false">
            <circle cx="12" cy="12" r="9"></circle>
            <path d="M12 8.2v5.2"></path>
            <circle cx="12" cy="16.8" r="0.9" fill="currentColor" stroke="none"></circle>
          </svg>
        </span>
      `:`
      <span class="bridge-projects__toast-icon" aria-hidden="true">
        <svg viewBox="0 0 24 24" focusable="false">
          <circle cx="12" cy="12" r="9"></circle>
          <path d="M8.2 12.4l2.5 2.5 5.1-5.4"></path>
        </svg>
      </span>
    `}function C(){let e=i.sortDirection===`desc`?-1:1,t=[...i.users];return t.sort((t,n)=>{let r=0;return i.sortKey===`role`?(r=String(t.role||``).localeCompare(String(n.role||``),void 0,{sensitivity:`base`}),r||=String(t.fullName||``).localeCompare(String(n.fullName||``),void 0,{sensitivity:`base`})):i.sortKey===`createdAt`?(r=Number(t.createdAt||0)-Number(n.createdAt||0),r||=String(t.fullName||``).localeCompare(String(n.fullName||``),void 0,{sensitivity:`base`})):(r=String(t.fullName||``).localeCompare(String(n.fullName||``),void 0,{sensitivity:`base`}),r||=String(t.email||``).localeCompare(String(n.email||``),void 0,{sensitivity:`base`})),r*e}),t}function w(e){return i.sortKey===e?i.sortDirection===`desc`?`
        <span class="bridge-admin-table__sort-arrow" aria-hidden="true">
          <svg viewBox="0 0 16 16" focusable="false">
            <path d="M8 3.25v9.5"></path>
            <path d="M5.5 10.25 8 12.75l2.5-2.5"></path>
          </svg>
        </span>
      `:`
      <span class="bridge-admin-table__sort-arrow" aria-hidden="true">
        <svg viewBox="0 0 16 16" focusable="false">
          <path d="M8 3.25v9.5"></path>
          <path d="M5.5 5.75 8 3.25l2.5 2.5"></path>
        </svg>
      </span>
    `:`
        <span class="bridge-admin-table__sort-arrow is-idle" aria-hidden="true">
          <svg viewBox="0 0 16 16" focusable="false">
            <path d="M8 3.25v9.5"></path>
            <path d="M5.5 5.75 8 3.25l2.5 2.5"></path>
            <path d="M5.5 10.25 8 12.75l2.5-2.5"></path>
          </svg>
        </span>
      `}function T(){if(window.clearTimeout(n),window.clearTimeout(r),!i.status){i.toastClosing=!1;return}i.toastClosing=!0,D(),r=window.setTimeout(()=>{i.status=``,i.tone=`neutral`,i.toastClosing=!1,D()},260)}function E(e=``,t=`neutral`){if(window.clearTimeout(n),window.clearTimeout(r),!e){T();return}i.status=e,i.tone=t,i.toastClosing=!1,n=window.setTimeout(()=>{T()},4e3),D()}function D(){if(i.loading){e.innerHTML=`
        <article class="bridge-admin__loading">
          <p>Loading users…</p>
        </article>
      `;return}t&&(t.innerHTML=`
        <div class="bridge-admin-hero__menu-wrap">
          <button
            class="bridge-action-rail-button bridge-admin-hero__menu-button"
            type="button"
            aria-haspopup="menu"
            aria-expanded="${i.recoveryMenuOpen?`true`:`false`}"
            aria-label="Admin recovery tools"
            data-admin-recovery-toggle
          >
            <span class="bridge-action-rail-button__tooltip bridge-admin-hero__tooltip" aria-hidden="true">Recovery</span>
            <svg class="bridge-admin-hero__menu-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
              <path d="M12.22 2h-.44a2 2 0 0 0-1.99 1.78l-.18 1.26c-.5.15-.99.36-1.45.6L7.12 4.9a2 2 0 0 0-2.68.2l-.3.3a2 2 0 0 0-.2 2.68l.74 1.04c-.24.46-.45.95-.6 1.45l-1.26.18A2 2 0 0 0 2 11.78v.44a2 2 0 0 0 1.78 1.99l1.26.18c.15.5.36.99.6 1.45l-.74 1.04a2 2 0 0 0 .2 2.68l.3.3a2 2 0 0 0 2.68.2l1.04-.74c.46.24.95.45 1.45.6l.18 1.26A2 2 0 0 0 11.78 22h.44a2 2 0 0 0 1.99-1.78l.18-1.26c.5-.15.99-.36 1.45-.6l1.04.74a2 2 0 0 0 2.68-.2l.3-.3a2 2 0 0 0 .2-2.68l-.74-1.04c.24-.46.45-.95.6-1.45l1.26-.18A2 2 0 0 0 22 12.22v-.44a2 2 0 0 0-1.78-1.99l-1.26-.18c-.15-.5-.36-.99-.6-1.45l.74-1.04a2 2 0 0 0-.2-2.68l-.3-.3a2 2 0 0 0-2.68-.2l-1.04.74c-.46-.24-.95-.45-1.45-.6l-.18-1.26A2 2 0 0 0 12.22 2z"></path>
              <circle cx="12" cy="12" r="3"></circle>
            </svg>
          </button>
          <div class="bridge-projects-table__menu bridge-admin-hero__menu"${i.recoveryMenuOpen?``:` hidden`} role="menu" aria-label="Recovery tools">
            <button class="bridge-projects-table__menu-item" type="button" role="menuitem" data-export-recovery ${i.exportingRecovery?`disabled`:``}>
              ${i.exportingRecovery?`Exporting...`:`Export Recovery Snapshot`}
            </button>
            <button class="bridge-projects-table__menu-item" type="button" role="menuitem" data-open-recovery-modal ${i.restoringRecovery?`disabled`:``}>
              Restore Snapshot
            </button>
          </div>
        </div>
      `);let n=i.status?`
          <div class="bridge-projects__toast${i.tone===`error`?` bridge-projects__toast--error`:``}${i.toastClosing?` is-closing`:``}" role="status" aria-live="polite">
            ${S(i.tone)}
            <span class="bridge-projects__toast-message">${a(i.status)}</span>
            <button class="bridge-projects__toast-dismiss" type="button" aria-label="Dismiss notification" data-dismiss-status>
              <span aria-hidden="true">×</span>
            </button>
          </div>
        `:``,r=C().filter(e=>c(e,i.searchQuery)),o=i.users.length>5,l=i.users.length>5,m=f(),h=m.length,g=r.filter(e=>e.email!==i.currentUserEmail).map(e=>e.email),v=g.length?g.every(e=>m.includes(e)):!1,y=o?`
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
                value="${a(i.searchQuery)}"
                placeholder="Search users"
                aria-label="Search users"
                data-admin-user-search
              />
            </label>
          </div>
        `:``,T=l&&h?`
            <div class="bridge-table-bulk-bar">
              <span class="bridge-table-bulk-bar__count">${h} selected</span>
              <div class="bridge-table-bulk-bar__actions">
                <button class="bridge-table-bulk-bar__button bridge-table-bulk-bar__button--danger" type="button" data-admin-bulk-delete ${i.bulkDeletingUsers?`disabled`:``}>
                  ${i.bulkDeletingUsers?`Deleting...`:`Delete`}
                </button>
              </div>
            </div>
          `:``,E=r.length&&r.map(e=>{let t=i.busyEmail===e.email,n=e.email===i.currentUserEmail,r=u(e.fullName),o=i.editingRoleEmail===e.email,c=i.pendingRoleByEmail[e.email]||e.role,f=x(c),m=i.roles.map(e=>`<option value="${a(e)}" ${e===c?`selected`:``}>${a(e)}</option>`).join(``),h=e.avatarColor?` style="--avatar-bg:${a(e.avatarColor)}"`:``,g=e.avatarUrl?`<span class="bridge-admin-table__avatar has-photo"${h}><img src="${a(e.avatarUrl)}" alt="" /></span>`:`<span class="bridge-admin-table__avatar" aria-hidden="true"${h}>${a(r)}</span>`,_=e.email!==i.currentUserEmail;return`
          <tr
            class="bridge-admin-table__row"
            data-user-email="${a(e.email)}"
            data-profile-email="${a(e.email)}"
            tabindex="0"
            role="link"
            aria-label="Open profile for ${a(e.fullName)}"
          >
            ${l?`
                    <td class="bridge-table-select__cell">
                      <label class="bridge-table-select">
                        <input
                          type="checkbox"
                          aria-label="Select ${a(e.fullName)}"
                          data-admin-user-select="${a(e.email)}"
                          ${p(e.email)?`checked`:``}
                          ${_?``:`disabled`}
                        />
                        <span class="bridge-table-select__control" aria-hidden="true"></span>
                      </label>
                    </td>
                  `:``}
            <td class="bridge-admin-table__user-cell">
              <div class="bridge-admin-table__user">
                ${g}
                <div class="bridge-admin-table__identity">
                  <div class="bridge-admin-table__identity-top">
                    <strong><a class="bridge-admin-table__profile-link" href="/profile.html?email=${encodeURIComponent(e.email)}">${s(e.fullName,i.searchQuery)}</a></strong>
                    ${n?`<span class="bridge-admin-table__badge">You</span>`:``}
                  </div>
                  <span><a class="bridge-admin-table__profile-link" href="/profile.html?email=${encodeURIComponent(e.email)}">${s(e.email,i.searchQuery)}</a></span>
                </div>
              </div>
            </td>
            <td class="bridge-admin-table__role-cell">
              <div class="bridge-admin-table__role" style="--role-control-width:${f}px;">
                <div class="bridge-admin-table__role-display"${o?` hidden`:``}>
                  <span class="bridge-admin-table__role-pill">${s(e.role,i.searchQuery)}</span>
                  <button
                    class="bridge-inline-edit-trigger bridge-admin-table__role-edit"
                    type="button"
                    aria-label="Edit role for ${a(e.fullName)}"
                    data-role-edit="${a(e.email)}"
                    ${t?`disabled`:``}
                  >
                    <span class="bridge-inline-edit-trigger__tooltip" aria-hidden="true">Edit</span>
                    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                      <path d="M4 20h4.75L19 9.75 14.25 5 4 15.25V20z"></path>
                      <path d="M13.5 5.75 18.25 10.5"></path>
                    </svg>
                  </button>
                </div>
                <div class="bridge-admin-table__role-editor"${o?``:` hidden`}>
                  <select data-role-select="${a(e.email)}" ${t?`disabled`:``}>
                    ${m}
                  </select>
                  <button
                    class="bridge-admin-table__role-save"
                    type="button"
                    aria-label="Save role for ${a(e.fullName)}"
                    data-role-save="${a(e.email)}"
                    ${t?`disabled`:``}
                  >
                    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                      <path d="M5.5 12.5 9.5 16.5 18.5 7.5"></path>
                    </svg>
                  </button>
                </div>
              </div>
            </td>
            <td class="bridge-admin-table__ai-cell">
              <span
                class="bridge-admin-table__ai-cost"
                data-tooltip="Estimated total AI cost: ${a(d(e.aiUsage?.totalEstimatedCostUsd||0))}"
                tabindex="0"
              >
                ${a(d(e.aiUsage?.currentMonthEstimatedCostUsd||0))}
              </span>
            </td>
            <td class="bridge-admin-table__actions-cell">
              <div class="bridge-projects-table__actions bridge-admin-table__actions" data-admin-actions>
                <button
                  class="bridge-projects-table__menu-button"
                  type="button"
                  aria-haspopup="menu"
                  aria-expanded="${i.openMenuEmail===e.email?`true`:`false`}"
                  aria-label="User options for ${a(e.fullName)}"
                  data-admin-menu-toggle="${a(e.email)}"
                >
                  <span aria-hidden="true">⋮</span>
                </button>
              </div>
              </td>
          </tr>
        `}).join(``)||`
        <tr class="bridge-admin-table__empty-row">
          <td colspan="${l?`4`:`3`}">
            <div class="bridge-table-search__empty">No users match your search.</div>
          </td>
        </tr>
      `,D=i.openMenuEmail?i.users.find(e=>e.email===i.openMenuEmail):null,O=D&&i.openMenuPosition?`
            <div
              class="bridge-projects-table__menu bridge-admin__floating-menu"
              role="menu"
              style="top:${Math.round(i.openMenuPosition.top)}px; left:${Math.round(i.openMenuPosition.left)}px;"
            >
              <button
                class="bridge-projects-table__menu-item"
                type="button"
                role="menuitem"
                data-action="reset-password"
                data-email="${a(D.email)}"
                ${i.busyEmail===D.email?`disabled`:``}
              >
                Reset password
              </button>
              <button
                class="bridge-projects-table__menu-item bridge-projects-table__menu-item--danger"
                type="button"
                role="menuitem"
                data-action="delete-user"
                data-email="${a(D.email)}"
                ${i.busyEmail===D.email||D.email===i.currentUserEmail?`disabled`:``}
              >
                Delete User
              </button>
            </div>
          `:``,k=i.recoveryModalOpen?`
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
                <textarea data-recovery-snapshot-input placeholder="Paste the exported JSON snapshot here.">${a(i.recoverySnapshotText)}</textarea>
              </label>
              <div class="bridge-admin__recovery-actions">
                <button class="bridge-admin__recovery-button bridge-admin__recovery-button--secondary" type="button" data-close-recovery-modal ${i.restoringRecovery?`disabled`:``}>Cancel</button>
                <button class="bridge-admin__recovery-button bridge-admin__recovery-button--danger" type="button" data-restore-recovery ${i.restoringRecovery?`disabled`:``}>
                  ${i.restoringRecovery?`Restoring...`:`Restore snapshot`}
                </button>
              </div>
            </div>
          </div>
        `:``,A=i.recentAuditEvents.length?i.recentAuditEvents.map(e=>`
              <li class="bridge-admin__event-item">
                <div class="bridge-admin__event-main">
                  <strong>${a(e.action||`event`)}</strong>
                  <span>${a(e.actorEmail||`System`)}</span>
                </div>
                <div class="bridge-admin__event-meta">
                  <span>${a(e.resourceType||`resource`)}${e.resourceId?` · ${a(e.resourceId)}`:``}</span>
                  <span>${new Date(Number(e.createdAt||0)).toLocaleString()}</span>
                </div>
              </li>
            `).join(``):`<li class="bridge-admin__event-empty">No audit events yet.</li>`,j=i.recentOperationalEvents.length?i.recentOperationalEvents.map(e=>`
              <li class="bridge-admin__event-item">
                <div class="bridge-admin__event-main">
                  <strong>${a(e.name||`event`)}</strong>
                  <span class="bridge-admin__event-level bridge-admin__event-level--${a(e.level||`info`)}">${a(e.level||`info`)}</span>
                </div>
                <div class="bridge-admin__event-meta">
                  <span>${a(e.errorMessage||`No error message`)}</span>
                  <span>${new Date(Number(e.createdAt||0)).toLocaleString()}</span>
                </div>
              </li>
            `).join(``):`<li class="bridge-admin__event-empty">No operational events yet.</li>`,M=`
      <div class="bridge-admin__tabs" role="tablist" aria-label="Admin sections">
        <button class="bridge-admin__tab${i.activeTab===`users`?` is-active`:``}" type="button" role="tab" aria-selected="${i.activeTab===`users`?`true`:`false`}" data-admin-tab="users">
          Users
        </button>
        <button class="bridge-admin__tab${i.activeTab===`permissions`?` is-active`:``}" type="button" role="tab" aria-selected="${i.activeTab===`permissions`?`true`:`false`}" data-admin-tab="permissions">
          Permissions
        </button>
        <button class="bridge-admin__tab${i.activeTab===`log`?` is-active`:``}" type="button" role="tab" aria-selected="${i.activeTab===`log`?`true`:`false`}" data-admin-tab="log">
          Log
        </button>
        <button class="bridge-admin__tab${i.activeTab===`system-errors`?` is-active`:``}" type="button" role="tab" aria-selected="${i.activeTab===`system-errors`?`true`:`false`}" data-admin-tab="system-errors">
          System Errors
        </button>
      </div>
    `,N=`
      <div class="bridge-admin__users-stack">
        ${y}
        ${T}
        <div class="bridge-admin__table-shell">
          <table class="bridge-admin-table">
            <thead>
              <tr>
                ${l?`
                        <th class="bridge-table-select__cell">
                          <label class="bridge-table-select">
                            <input
                              type="checkbox"
                              aria-label="Select all visible users"
                              data-admin-user-select-all
                              ${v?`checked`:``}
                            />
                            <span class="bridge-table-select__control" aria-hidden="true"></span>
                          </label>
                        </th>
                      `:``}
                <th>
                  <button class="bridge-admin-table__sort-button" type="button" data-sort-key="fullName">
                    <span>Users (${r.length})</span>
                    ${w(`fullName`)}
                  </button>
                </th>
                <th>
                  <button class="bridge-admin-table__sort-button" type="button" data-sort-key="role">
                    <span>Role</span>
                    ${w(`role`)}
                  </button>
                </th>
                <th>AI / Month</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>${E}</tbody>
          </table>
        </div>
      </div>
    `,P=`
      <section class="bridge-admin__observability-card">
        <div class="bridge-admin__observability-header">
          <p class="bridge-admin__count">Log</p>
          <p class="bridge-admin__copy">Sensitive admin, profile, and project actions.</p>
        </div>
        <ul class="bridge-admin__event-list">${A}</ul>
      </section>
    `,F=i.permissionCatalog.length?i.permissionCatalog.map(e=>{let t=i.roles.map(t=>`
                  <label class="bridge-admin-permissions__toggle">
                    <input
                      type="checkbox"
                      data-role-permission-toggle="${a(t)}"
                      data-permission-key="${a(e.key)}"
                      ${_(t,e.key)?`checked`:``}
                      ${i.savingRolePermissions?`disabled`:``}
                    />
                    <span class="bridge-admin-permissions__toggle-control" aria-hidden="true"></span>
                    <span class="bridge-admin-permissions__toggle-label">${a(t)}</span>
                  </label>
                `).join(``);return`
              <article class="bridge-admin-permissions__row">
                <div class="bridge-admin-permissions__meta">
                  <p class="bridge-admin-permissions__group">${a(e.group)}</p>
                  <h3>${a(e.label)}</h3>
                  <p>${a(e.description)}</p>
                </div>
                <div class="bridge-admin-permissions__roles">
                  ${t}
                </div>
              </article>
            `}).join(``):`<div class="bridge-admin__event-empty">No permissions available yet.</div>`,I=`
      <section class="bridge-admin__observability-card bridge-admin-permissions">
        <div class="bridge-admin__observability-header bridge-admin-permissions__header">
          <div>
            <p class="bridge-admin__count">Permissions</p>
            <p class="bridge-admin__copy">Choose which global capabilities each role gets across UX Bridge.</p>
          </div>
          <div class="bridge-admin-permissions__actions">
            <button class="bridge-admin-permissions__button bridge-admin-permissions__button--secondary" type="button" data-reset-role-permissions ${i.savingRolePermissions?`disabled`:``}>
              Reset to defaults
            </button>
            <button class="bridge-admin-permissions__button" type="button" data-save-role-permissions ${!b()||i.savingRolePermissions?`disabled`:``}>
              ${i.savingRolePermissions?`Saving…`:`Save permissions`}
            </button>
          </div>
        </div>
        <div class="bridge-admin-permissions__list">
          ${F}
        </div>
      </section>
    `,L=`
      <section class="bridge-admin__observability-card">
        <div class="bridge-admin__observability-header">
          <p class="bridge-admin__count">System Errors</p>
          <p class="bridge-admin__copy">Recent application errors and warnings.</p>
        </div>
        <ul class="bridge-admin__event-list">${j}</ul>
      </section>
    `;e.innerHTML=`
      ${M}
      ${n}
      <div class="bridge-admin__panel${i.activeTab===`users`?` is-active`:``}" data-admin-panel="users"${i.activeTab===`users`?``:` hidden`}>
        ${N}
      </div>
      <div class="bridge-admin__panel${i.activeTab===`permissions`?` is-active`:``}" data-admin-panel="permissions"${i.activeTab===`permissions`?``:` hidden`}>
        ${I}
      </div>
      <div class="bridge-admin__panel${i.activeTab===`log`?` is-active`:``}" data-admin-panel="log"${i.activeTab===`log`?``:` hidden`}>
        ${P}
      </div>
      <div class="bridge-admin__panel${i.activeTab===`system-errors`?` is-active`:``}" data-admin-panel="system-errors"${i.activeTab===`system-errors`?``:` hidden`}>
        ${L}
      </div>
      ${O}
      ${k}
    `}async function O(){i.loading=!0,D();let e=await fetch(`/api/admin-users`,{method:`GET`,credentials:`include`,cache:`no-store`}),t=await e.json().catch(()=>({}));if(!e.ok||!t?.ok)throw Error(t?.error||`Unable to load users.`);i.users=Array.isArray(t.users)?t.users:[],h(),i.roles=Array.isArray(t.roles)?t.roles:[],i.permissionCatalog=Array.isArray(t.permissionCatalog)?t.permissionCatalog:[],i.defaultRolePermissions=g(t.defaultRolePermissions),i.rolePermissions=g(t.rolePermissions),i.originalRolePermissions=g(t.rolePermissions),i.currentUserEmail=t.currentUserEmail||``,i.recentAuditEvents=Array.isArray(t.recentAuditEvents)?t.recentAuditEvents:[],i.recentOperationalEvents=Array.isArray(t.recentOperationalEvents)?t.recentOperationalEvents:[],i.loading=!1,D()}async function k(e,t,n={}){i.busyEmail=t,D();let r=await fetch(`/api/admin-users`,{method:`POST`,credentials:`include`,headers:{"Content-Type":`application/json`},body:JSON.stringify({action:e,email:t,...n})}),a=await r.json().catch(()=>({}));if(i.busyEmail=``,!r.ok||!a?.ok)throw Error(a?.error||`Unable to update user.`);return a}async function A(e,t={}){let n=await fetch(`/api/admin-users`,{method:`POST`,credentials:`include`,headers:{"Content-Type":`application/json`},body:JSON.stringify({action:e,...t})}),r=await n.json().catch(()=>({}));if(!n.ok||!r?.ok)throw Error(r?.error||`Unable to complete the recovery action.`);return r}function j(e){let t=new Blob([JSON.stringify(e,null,2)],{type:`application/json`}),n=URL.createObjectURL(t),r=document.createElement(`a`),i=new Date().toISOString().replaceAll(`:`,`-`);r.href=n,r.download=`ux-bridge-recovery-${i}.json`,r.click(),URL.revokeObjectURL(n)}function M(){!i.openMenuEmail&&!i.openMenuPosition||(i.openMenuEmail=``,i.openMenuPosition=null,D())}function N(){i.recoveryMenuOpen&&(i.recoveryMenuOpen=!1,D())}function P(e,t){let n=e.getBoundingClientRect();i.openMenuEmail=t,i.openMenuPosition={top:Math.max(12,n.top-96-8),left:Math.min(Math.max(12,n.right-196),window.innerWidth-196-12)},D()}async function F(e){if(e.target.closest(`[data-dismiss-status]`))return T(),!0;if(e.target.closest(`[data-open-recovery-modal]`))return N(),i.recoveryModalOpen=!0,D(),!0;if(e.target.closest(`[data-close-recovery-modal]`))return i.recoveryModalOpen=!1,D(),!0;if(e.target.closest(`[data-export-recovery]`)){N(),i.exportingRecovery=!0,D();try{j((await A(`exportRecoveryData`)).snapshot),E(`Recovery snapshot exported.`)}catch(e){E(e instanceof Error?e.message:`Unable to export recovery data.`,`error`)}finally{i.exportingRecovery=!1,D()}return!0}if(e.target.closest(`[data-restore-recovery]`)){i.restoringRecovery=!0,D();try{let e=await A(`restoreRecoveryData`,{snapshot:JSON.parse(i.recoverySnapshotText||`{}`)});i.recoveryModalOpen=!1,i.recoverySnapshotText=``,await O(),E(`Recovery snapshot restored. ${e.restored?.users||0} users, ${e.restored?.projects||0} projects, and ${e.restored?.commentThreads||0} comment threads restored.`)}catch(e){E(e instanceof Error?e.message:`Unable to restore recovery data.`,`error`)}finally{i.restoringRecovery=!1,D()}return!0}let t=e.target.closest(`[data-admin-tab]`);if(t)return i.activeTab=t.getAttribute(`data-admin-tab`)||`users`,M(),N(),D(),!0;if(e.target.closest(`[data-admin-recovery-toggle]`))return i.recoveryMenuOpen=!i.recoveryMenuOpen,M(),D(),!0;let n=e.target.closest(`[data-admin-menu-toggle]`);if(n){let e=n.getAttribute(`data-admin-menu-toggle`)||``;return i.openMenuEmail===e?(M(),!0):(P(n,e),!0)}return!1}e.addEventListener(`change`,async e=>{let t=e.target.closest(`[data-admin-user-select]`);if(t instanceof HTMLInputElement){m(t.getAttribute(`data-admin-user-select`)||``,t.checked),D();return}let n=e.target.closest(`[data-admin-user-select-all]`);if(n instanceof HTMLInputElement){let e=C().filter(e=>c(e,i.searchQuery)).filter(e=>e.email!==i.currentUserEmail).map(e=>e.email),t=new Set(f());n.checked?e.forEach(e=>t.add(e)):e.forEach(e=>t.delete(e)),i.selectedUserEmails=Array.from(t),D();return}let r=e.target.closest(`[data-role-select]`);if(r){let e=r.getAttribute(`data-role-select`);i.pendingRoleByEmail[e]=r.value;return}let a=e.target.closest(`[data-role-permission-toggle]`);if(!(a instanceof HTMLInputElement))return;let o=a.getAttribute(`data-role-permission-toggle`)||``,s=a.getAttribute(`data-permission-key`)||``;!o||!s||(v(o,s,a.checked),D())}),e.addEventListener(`click`,async e=>{if(await F(e))return;let t=e.target.closest(`[data-sort-key]`);if(t){let e=t.getAttribute(`data-sort-key`);if(!e)return;i.sortKey===e?(i.sortDirection===`asc`||(i.sortKey=`createdAt`),i.sortDirection=`desc`):(i.sortKey=e,i.sortDirection=`asc`),D();return}let n=e.target.closest(`[data-role-edit]`);if(n){let e=n.getAttribute(`data-role-edit`),t=i.users.find(t=>t.email===e);if(!e||!t)return;i.editingRoleEmail=e,i.pendingRoleByEmail[e]=i.pendingRoleByEmail[e]||t.role,D();return}let r=e.target.closest(`[data-role-save]`);if(r){let e=r.getAttribute(`data-role-save`),t=i.pendingRoleByEmail[e],n=i.users.find(t=>t.email===e);if(!e||!t||!n)return;if(t===n.role){i.editingRoleEmail=``,delete i.pendingRoleByEmail[e],D();return}try{let n=await k(`updateRole`,e,{role:t});i.users=i.users.map(t=>t.email===e?n.user:t),i.editingRoleEmail=``,delete i.pendingRoleByEmail[e],E(`Updated ${n.user.fullName} to ${n.user.role}.`,`success`)}catch(e){E(e instanceof Error?e.message:`Unable to update role.`,`error`),await O()}return}if(e.target.closest(`[data-admin-bulk-delete]`)){let e=f().filter(e=>e!==i.currentUserEmail);if(!e.length||!window.confirm(`Remove ${e.length} ${e.length===1?`user`:`users`} from UX Bridge? They will lose access immediately.`))return;i.bulkDeletingUsers=!0,D();try{for(let t of e)await k(`deleteUser`,t);let t=new Set(e);i.users=i.users.filter(e=>!t.has(e.email)),i.selectedUserEmails=[],i.bulkDeletingUsers=!1,E(`Removed ${e.length} ${e.length===1?`user`:`users`} from UX Bridge.`,`success`)}catch(e){i.bulkDeletingUsers=!1,E(e instanceof Error?e.message:`Unable to complete action.`,`error`),await O()}return}if(e.target.closest(`[data-save-role-permissions]`)){i.savingRolePermissions=!0,D();try{let e=await k(`updateRolePermissions`,``,{rolePermissions:i.rolePermissions});i.rolePermissions=g(e.rolePermissions),i.originalRolePermissions=g(e.rolePermissions),E(`Role permissions updated.`,`success`)}catch(e){E(e instanceof Error?e.message:`Unable to update role permissions.`,`error`),await O()}finally{i.savingRolePermissions=!1,D()}return}if(e.target.closest(`[data-reset-role-permissions]`)){if(!window.confirm(`Reset all role permissions back to the default UX Bridge policy?`))return;i.savingRolePermissions=!0,D();try{let e=await k(`resetRolePermissions`,``,{});i.rolePermissions=g(e.rolePermissions),i.originalRolePermissions=g(e.rolePermissions),E(`Role permissions reset to defaults.`,`success`)}catch(e){E(e instanceof Error?e.message:`Unable to reset role permissions.`,`error`),await O()}finally{i.savingRolePermissions=!1,D()}return}let a=e.target.closest(`[data-action]`);if(!a){if(e.target.closest(`.bridge-admin-table__profile-link`)||e.target.closest(`[data-admin-actions]`)||e.target.closest(`[data-role-edit]`)||e.target.closest(`[data-role-save]`)||e.target.closest(`[data-role-select]`)||e.target.closest(`.bridge-table-select`))return;let t=e.target.closest(`[data-profile-email]`);if(t){let e=t.getAttribute(`data-profile-email`);e&&(window.location.href=`/profile.html?email=${encodeURIComponent(e)}`)}return}let o=a.getAttribute(`data-action`),s=a.getAttribute(`data-email`);if(s)try{if(o===`reset-password`){M(),E((await k(`resetPassword`,s)).message||`Password reset email sent to ${s}.`,`success`);return}if(o===`delete-user`){if(!window.confirm(`Remove ${s} from UX Bridge? They will lose access immediately.`))return;M(),await k(`deleteUser`,s),i.users=i.users.filter(e=>e.email!==s),E(`Removed ${s} from UX Bridge.`,`success`)}}catch(e){E(e instanceof Error?e.message:`Unable to complete action.`,`error`),await O()}}),t&&t.addEventListener(`click`,async e=>{await F(e)&&(e.preventDefault(),e.stopPropagation())}),e.addEventListener(`input`,e=>{let t=e.target.closest(`[data-admin-user-search]`);if(t instanceof HTMLInputElement){let e=t.selectionStart,n=t.selectionEnd;i.searchQuery=t.value,D(),l(e,n);return}let n=e.target.closest(`[data-recovery-snapshot-input]`);n&&(i.recoverySnapshotText=n.value)}),e.addEventListener(`keydown`,e=>{let t=e.target.closest(`[data-profile-email]`);if(!t||e.target.closest(`.bridge-table-select`)||e.key!==`Enter`&&e.key!==` `||e.target.closest(`[data-admin-actions]`)||e.target.closest(`[data-role-edit]`)||e.target.closest(`[data-role-save]`)||e.target.closest(`[data-role-select]`)||e.target.closest(`.bridge-admin-table__profile-link`))return;e.preventDefault();let n=t.getAttribute(`data-profile-email`);n&&(window.location.href=`/profile.html?email=${encodeURIComponent(n)}`)});try{await O()}catch(e){i.loading=!1,E(e instanceof Error?e.message:`Unable to load users.`,`error`)}document.addEventListener(`click`,e=>{let t=e.target.closest(`[data-admin-actions]`)||e.target.closest(`.bridge-admin__floating-menu`),n=e.target.closest(`[data-admin-hero-actions]`);i.openMenuEmail&&!t&&M(),i.recoveryMenuOpen&&!n&&N()}),window.addEventListener(`resize`,()=>{M(),N()}),window.addEventListener(`scroll`,()=>{M(),N()},!0)})();