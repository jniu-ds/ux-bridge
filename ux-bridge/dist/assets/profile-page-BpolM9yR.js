(async()=>{let e=`/api/profile`,t=document.querySelector(`[data-profile-app]`),n=document.createElement(`div`);if(!t)return;n.className=`bridge-profile-tool-modal-host`,document.body.append(n);let r=new URLSearchParams(window.location.search),i=String(r.get(`email`)||``).trim().toLowerCase(),a={loading:!0,saving:!1,sendingReset:!1,status:``,tone:`neutral`,user:null,currentUser:null,roles:[],toolProviders:[],canEditRole:!1,canManageAllProfiles:!1,viewingSelf:!0,avatarUrl:``,avatarColor:``,connectingProviderId:``,toolModalOpen:!1,toolModalProviderId:``,toolModalApiKey:``,toolModalBusy:!1,toolModalMessage:``,toolModalTone:`neutral`};function o(e){return String(e??``).replaceAll(`&`,`&amp;`).replaceAll(`<`,`&lt;`).replaceAll(`>`,`&gt;`).replaceAll(`"`,`&quot;`)}function s(e){return String(e||``).trim().split(/\s+/).filter(Boolean).slice(0,2).map(e=>e.charAt(0).toUpperCase()).join(``)||`U`}function c(e){e&&(window.uxBridgeUser=e,sessionStorage.setItem(`ux-bridge-user`,JSON.stringify(e)),window.dispatchEvent(new CustomEvent(`uxbridge:user-ready`,{detail:e})))}function l(e){e&&(document.querySelectorAll(`[data-auth-user-name]`).forEach(t=>{t.textContent=e.fullName}),document.querySelectorAll(`[data-auth-user-email]`).forEach(t=>{t.textContent=e.email}),document.querySelectorAll(`[data-auth-user-avatar]`).forEach(t=>{t.style.setProperty(`--avatar-bg`,String(e.avatarColor||``)),e.avatarUrl?(t.innerHTML=`<img src="${e.avatarUrl}" alt="" />`,t.classList.add(`has-photo`)):(t.textContent=s(e.fullName),t.classList.remove(`has-photo`))}),String(e.role||``).trim().toLowerCase()===`admin`?document.querySelectorAll(`[data-admin-link], [data-admin-only]`).forEach(e=>{e.hidden=!1}):document.querySelectorAll(`[data-admin-link], [data-admin-only]`).forEach(e=>{e.remove()}))}function u(e=``,t=`neutral`){a.status=e,a.tone=t,h()}function d(e={}){Object.assign(a,e),h()}function f(e){d({toolModalOpen:!0,toolModalProviderId:e,toolModalApiKey:``,toolModalBusy:!1,toolModalMessage:``,toolModalTone:`neutral`})}function p(){d({toolModalOpen:!1,toolModalProviderId:``,toolModalApiKey:``,toolModalBusy:!1,toolModalMessage:``,toolModalTone:`neutral`})}function m(){let e=a.toolProviders.find(e=>e.id===a.toolModalProviderId);if(!a.toolModalOpen||!e){n.innerHTML=``;return}let t=a.toolModalMessage?`<p class="bridge-profile-tool-modal__status${a.toolModalTone===`error`?` is-error`:``}">${o(a.toolModalMessage)}</p>`:``;n.innerHTML=`
      <div class="bridge-profile-tool-modal__shell" data-tool-modal-overlay>
        <div class="bridge-profile-tool-modal" role="dialog" aria-modal="true" aria-label="Connect ${o(e.label)}">
          <div class="bridge-profile-tool-modal__head">
            <div>
              <p class="bridge-profile__eyebrow-note">Provider connection</p>
              <h2>Connect ${o(e.label)}</h2>
              <p>Use your own OpenAI API key to create a user-owned Codex session for UX Bridge. The key is validated server-side and stored securely.</p>
            </div>
            <button class="bridge-profile-tool-modal__close" type="button" data-tool-modal-close aria-label="Close connect dialog">×</button>
          </div>
          ${t}
          <form class="bridge-profile-tool-modal__form" data-tool-modal-form>
            <label class="bridge-profile__field">
              <span class="bridge-profile__label">OpenAI API key</span>
              <input
                type="password"
                name="apiKey"
                autocomplete="off"
                spellcheck="false"
                placeholder="sk-..."
                value="${o(a.toolModalApiKey)}"
                data-tool-modal-api-key
                ${a.toolModalBusy?`disabled`:``}
                required
              />
            </label>
            <p class="bridge-profile-tool-modal__hint">This is used only for your Codex connection. UX Bridge does not expose the raw key back to the browser after it is stored.</p>
            <div class="bridge-profile-tool-modal__actions">
              <button type="button" class="bridge-profile__tool-button bridge-profile__tool-button--secondary" data-tool-modal-cancel ${a.toolModalBusy?`disabled`:``}>Cancel</button>
              <button type="submit" class="bridge-profile__tool-button" ${a.toolModalBusy?`disabled`:``}>
                ${a.toolModalBusy?`Connecting…`:`Connect ${o(e.label)}`}
              </button>
            </div>
          </form>
        </div>
      </div>
    `}function h(){if(a.loading){t.innerHTML=`
        <article class="bridge-profile__loading">
          <p>Loading profile…</p>
        </article>
      `;return}let e=a.user;if(!e){t.innerHTML=`
        <article class="bridge-profile__loading">
          <p>Profile not found.</p>
        </article>
      `;return}let n=a.status?`<p class="bridge-profile__status${a.tone===`error`?` bridge-profile__status--error`:``}">${o(a.status)}</p>`:``,r=a.canEditRole?`
          <label class="bridge-profile__field">
            <span class="bridge-profile__label">Role</span>
            <select name="role" ${a.saving?`disabled`:``}>
              ${a.roles.map(t=>`<option value="${o(t)}" ${t===e.role?`selected`:``}>${o(t)}</option>`).join(``)}
            </select>
          </label>
        `:`
          <div class="bridge-profile__field">
            <span class="bridge-profile__label">Role</span>
            <div class="bridge-profile__readonly">
              <span class="bridge-admin-table__role-pill">${o(e.role)}</span>
            </div>
          </div>
        `,i=a.canManageAllProfiles&&!a.viewingSelf?`<p class="bridge-profile__eyebrow-note">Admin view for ${o(e.fullName)}</p>`:``,c=e.integrations||{},l=a.toolProviders.map(e=>{let t=c[e.id]||{},n=!!t.connected,r=a.connectingProviderId===e.id,i=String(e.availableVia||``).trim().toLowerCase()===`local-bridge`,s=i?`Local bridge`:n?`Connected`:`Not connected`,l=i?`Detected from the machine running UX Bridge`:t.accountLabel||`No connector session`;return`
          <article class="bridge-profile__tool-card">
            <div class="bridge-profile__tool-copy">
              <div>
                <strong>${o(e.label)}</strong>
                <p>${o(e.helperCopy||`Ready for secure user-owned connector auth.`)}</p>
              </div>
              <span class="bridge-profile__tool-badge${n||i?` is-connected`:``}">
                ${s}
              </span>
            </div>
            <div class="bridge-profile__tool-meta">
              <span>Credential mode</span>
              <strong>${o(t.credentialMode||e.credentialMode||`user-session`)}</strong>
            </div>
            <div class="bridge-profile__tool-meta">
              <span>Account</span>
              <strong>${o(l)}</strong>
            </div>
            <div class="bridge-profile__tool-actions">
              ${a.viewingSelf?i?`<span class="bridge-profile__tool-owner-note">Managed by your local Codex bridge</span>`:n?`<button type="button" class="bridge-profile__tool-button bridge-profile__tool-button--secondary" data-tool-action="disconnect" data-provider-id="${e.id}" ${r?`disabled`:``}>${r?`Disconnecting…`:`Disconnect`}</button>`:`<button type="button" class="bridge-profile__tool-button" data-tool-action="connect" data-provider-id="${e.id}" ${r?`disabled`:``}>${r?`Connecting…`:`Connect ${o(e.label)}`}</button>`:`<span class="bridge-profile__tool-owner-note">Managed by account owner</span>`}
            </div>
          </article>
        `}).join(``);t.innerHTML=`
      <div class="bridge-profile__shell">
        <section class="bridge-profile__card">
          ${i}
          ${n}
          <div class="bridge-profile__grid">
            <div class="bridge-profile__avatar-block">
              <div class="bridge-profile__avatar${a.avatarUrl?` has-photo`:``}">
                <div class="bridge-profile__avatar-surface" style="--avatar-bg:${o(a.avatarColor||``)};">
                ${a.avatarUrl?`<img src="${o(a.avatarUrl)}" alt="${o(e.fullName)} profile photo" />`:`<span>${o(s(e.fullName))}</span>`}
                </div>
              </div>
              <div class="bridge-profile__avatar-actions">
                <label class="bridge-profile__photo-button">
                  <input type="file" accept="image/*" data-profile-photo-input ${a.saving?`disabled`:``} />
                  <span>${a.avatarUrl?`Change photo`:`Upload photo`}</span>
                </label>
                ${a.avatarUrl?`<button type="button" class="bridge-profile__photo-clear" data-clear-profile-photo ${a.saving?`disabled`:``}>Remove photo</button>`:``}
              </div>
            </div>

            <form class="bridge-profile__form" data-profile-form>
              <div class="bridge-profile__form-grid">
                <label class="bridge-profile__field">
                  <span class="bridge-profile__label">First name</span>
                  <input type="text" name="firstName" value="${o(e.firstName)}" maxlength="80" ${a.saving?`disabled`:``} required />
                </label>
                <label class="bridge-profile__field">
                  <span class="bridge-profile__label">Last name</span>
                  <input type="text" name="lastName" value="${o(e.lastName)}" maxlength="80" ${a.saving?`disabled`:``} required />
                </label>
                <label class="bridge-profile__field bridge-profile__field--wide">
                  <span class="bridge-profile__label">Email</span>
                  <input type="email" name="email" value="${o(e.email)}" ${a.saving?`disabled`:``} required />
                </label>
                ${r}
              </div>
              <div class="bridge-profile__actions">
                <button type="submit" class="bridge-profile__save" ${a.saving?`disabled`:``}>
                  ${a.saving?`Saving…`:`Save changes`}
                </button>
                <button type="button" class="bridge-profile__reset bridge-admin-table__action bridge-admin-table__action--secondary" data-profile-reset-password ${a.sendingReset?`disabled`:``}>
                  ${a.sendingReset?`Sending…`:`Send password reset email`}
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
            <p class="bridge-profile__section-copy">Connector-ready scaffolding for user-owned Codex, Claude, and similar tool sessions. Provider secrets are stored securely and UX Bridge only keeps the connection metadata it needs.</p>
          </div>
          <div class="bridge-profile__tool-grid">
            ${l}
          </div>
        </section>
      </div>
    `,m()}async function g(){a.loading=!0,h();let t=i?`${e}?email=${encodeURIComponent(i)}`:e,n=await fetch(t,{credentials:`include`,cache:`no-store`}),r=await n.json().catch(()=>({}));if(!n.ok||!r?.ok)throw Error(r?.error||`Unable to load profile.`);a.user=r.user,a.currentUser=r.currentUser,a.roles=Array.isArray(r.roles)?r.roles:[],a.toolProviders=Array.isArray(r.toolProviders)?r.toolProviders:[],a.canEditRole=!!r.canEditRole,a.canManageAllProfiles=!!r.canManageAllProfiles,a.viewingSelf=!!r.viewingSelf,a.avatarUrl=String(r.user?.avatarUrl||``),a.avatarColor=String(r.user?.avatarColor||``),a.viewingSelf&&r.currentUser&&(c(r.currentUser),l(r.currentUser)),a.loading=!1,h()}async function _(e){return new Promise((t,n)=>{let r=new FileReader;r.onload=()=>t(String(r.result||``)),r.onerror=()=>n(Error(`Unable to read image file.`)),r.readAsDataURL(e)})}t.addEventListener(`change`,async e=>{let t=e.target.closest(`[data-profile-photo-input]`);if(!(!t||!t.files?.[0]))try{a.avatarUrl=await _(t.files[0]),h()}catch(e){u(e instanceof Error?e.message:`Unable to read image file.`,`error`)}}),t.addEventListener(`click`,async t=>{let n=t.target.closest(`[data-clear-profile-photo]`),r=t.target.closest(`[data-profile-reset-password]`),i=t.target.closest(`[data-tool-action]`);if(n){a.avatarUrl=``,h();return}if(i&&a.user){let t=String(i.dataset.providerId||``).trim().toLowerCase(),n=String(i.dataset.toolAction||``).trim();if(t===`codex`&&n!==`disconnect`){f(t);return}try{a.connectingProviderId=t,h();let r=await fetch(`${e}?email=${encodeURIComponent(a.user.email)}`,{method:`POST`,credentials:`include`,headers:{"Content-Type":`application/json`},body:JSON.stringify({action:n===`disconnect`?`disconnectTool`:`connectTool`,providerId:t})}),i=await r.json().catch(()=>({}));if(!r.ok||!i?.ok)throw Error(i?.error||`Unable to update tool connection.`);a.user=i.user,a.currentUser=i.currentUser,a.toolProviders=Array.isArray(i.toolProviders)?i.toolProviders:a.toolProviders,a.roles=Array.isArray(i.roles)?i.roles:a.roles,a.canEditRole=!!i.canEditRole,a.canManageAllProfiles=!!i.canManageAllProfiles,a.viewingSelf=!!i.viewingSelf,a.viewingSelf&&i.currentUser&&(c(i.currentUser),l(i.currentUser)),u(i.message||`Tool connection updated.`,`success`)}catch(e){u(e instanceof Error?e.message:`Unable to update tool connection.`,`error`)}finally{a.connectingProviderId=``,h()}return}if(!(!r||!a.user))try{a.sendingReset=!0,h();let t=await fetch(`${e}?email=${encodeURIComponent(a.user.email)}`,{method:`POST`,credentials:`include`,headers:{"Content-Type":`application/json`},body:JSON.stringify({action:`resetPassword`})}),n=await t.json().catch(()=>({}));if(!t.ok||!n?.ok)throw Error(n?.error||`Unable to send password reset email.`);u(n.message||`Password reset email sent to ${a.user.email}.`,`success`)}catch(e){u(e instanceof Error?e.message:`Unable to send password reset email.`,`error`)}finally{a.sendingReset=!1,h()}}),t.addEventListener(`submit`,async t=>{let n=t.target.closest(`[data-profile-form]`);if(!(!n||!a.user)){t.preventDefault();try{a.saving=!0,h();let t=new FormData(n),r=await fetch(`${e}?email=${encodeURIComponent(a.user.email)}`,{method:`POST`,credentials:`include`,headers:{"Content-Type":`application/json`},body:JSON.stringify({action:`updateProfile`,firstName:t.get(`firstName`),lastName:t.get(`lastName`),email:t.get(`email`),role:t.get(`role`),avatarUrl:a.avatarUrl})}),i=await r.json().catch(()=>({}));if(!r.ok||!i?.ok)throw Error(i?.error||`Unable to save profile.`);if(a.user=i.user,a.currentUser=i.currentUser,a.roles=Array.isArray(i.roles)?i.roles:a.roles,a.toolProviders=Array.isArray(i.toolProviders)?i.toolProviders:a.toolProviders,a.canEditRole=!!i.canEditRole,a.canManageAllProfiles=!!i.canManageAllProfiles,a.viewingSelf=!!i.viewingSelf,a.avatarUrl=String(i.user?.avatarUrl||``),a.avatarColor=String(i.user?.avatarColor||``),a.viewingSelf&&i.currentUser&&(c(i.currentUser),l(i.currentUser)),a.canManageAllProfiles&&!a.viewingSelf){let e=new URL(window.location.href);e.searchParams.set(`email`,i.user.email),window.history.replaceState({},``,e.toString())}u(i.message||`Profile updated.`,`success`)}catch(e){u(e instanceof Error?e.message:`Unable to save profile.`,`error`)}finally{a.saving=!1,h()}}}),n.addEventListener(`click`,e=>{(e.target.closest(`[data-tool-modal-close]`)||e.target.closest(`[data-tool-modal-cancel]`)||e.target===n.querySelector(`[data-tool-modal-overlay]`))&&p()}),n.addEventListener(`input`,e=>{let t=e.target.closest(`[data-tool-modal-api-key]`);t&&(a.toolModalApiKey=t.value)}),n.addEventListener(`submit`,async t=>{if(!(!t.target.closest(`[data-tool-modal-form]`)||!a.user||a.toolModalProviderId!==`codex`)){t.preventDefault();try{a.toolModalBusy=!0,a.toolModalMessage=``,m();let t=await fetch(`${e}?email=${encodeURIComponent(a.user.email)}`,{method:`POST`,credentials:`include`,headers:{"Content-Type":`application/json`},body:JSON.stringify({action:`connectTool`,providerId:`codex`,apiKey:a.toolModalApiKey})}),n=await t.json().catch(()=>({}));if(!t.ok||!n?.ok)throw Error(n?.error||`Unable to connect Codex.`);a.user=n.user,a.currentUser=n.currentUser,a.toolProviders=Array.isArray(n.toolProviders)?n.toolProviders:a.toolProviders,a.roles=Array.isArray(n.roles)?n.roles:a.roles,a.canEditRole=!!n.canEditRole,a.canManageAllProfiles=!!n.canManageAllProfiles,a.viewingSelf=!!n.viewingSelf,a.viewingSelf&&n.currentUser&&(c(n.currentUser),l(n.currentUser)),p(),u(n.message||`Codex connected and verified.`,`success`)}catch(e){a.toolModalBusy=!1,a.toolModalTone=`error`,a.toolModalMessage=e instanceof Error?e.message:`Unable to connect Codex.`,m()}}}),window.addEventListener(`keydown`,e=>{e.key===`Escape`&&a.toolModalOpen&&p()});try{await g()}catch(e){a.loading=!1,u(e instanceof Error?e.message:`Unable to load profile.`,`error`)}})();