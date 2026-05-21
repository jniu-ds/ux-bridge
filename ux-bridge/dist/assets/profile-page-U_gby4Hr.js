(async()=>{let e=`/api/profile`,t=document.querySelector(`[data-profile-app]`),n=document.createElement(`div`);if(!t)return;n.className=`bridge-profile-tool-modal-host`,document.body.append(n);let r=new URLSearchParams(window.location.search),i=String(r.get(`email`)||``).trim().toLowerCase(),a={loading:!0,saving:!1,sendingReset:!1,status:``,tone:`neutral`,user:null,currentUser:null,roles:[],toolProviders:[],canEditRole:!1,canManageAllProfiles:!1,viewingSelf:!0,avatarUrl:``,avatarColor:``,connectingProviderId:``};function o(e){return String(e??``).replaceAll(`&`,`&amp;`).replaceAll(`<`,`&lt;`).replaceAll(`>`,`&gt;`).replaceAll(`"`,`&quot;`)}function s(e){return String(e||``).trim().split(/\s+/).filter(Boolean).slice(0,2).map(e=>e.charAt(0).toUpperCase()).join(``)||`U`}function c(e){e&&(window.uxBridgeUser=e,sessionStorage.setItem(`ux-bridge-user`,JSON.stringify(e)),window.dispatchEvent(new CustomEvent(`uxbridge:user-ready`,{detail:e})))}function l(e){e&&(document.querySelectorAll(`[data-auth-user-name]`).forEach(t=>{t.textContent=e.fullName}),document.querySelectorAll(`[data-auth-user-email]`).forEach(t=>{t.textContent=e.email}),document.querySelectorAll(`[data-auth-user-avatar]`).forEach(t=>{t.style.setProperty(`--avatar-bg`,String(e.avatarColor||``)),e.avatarUrl?(t.innerHTML=`<img src="${e.avatarUrl}" alt="" />`,t.classList.add(`has-photo`)):(t.textContent=s(e.fullName),t.classList.remove(`has-photo`))}),String(e.role||``).trim().toLowerCase()===`admin`?document.querySelectorAll(`[data-admin-link], [data-admin-only]`).forEach(e=>{e.hidden=!1}):document.querySelectorAll(`[data-admin-link], [data-admin-only]`).forEach(e=>{e.remove()}))}function u(e=``,t=`neutral`){a.status=e,a.tone=t,f()}function d(){n.innerHTML=``}function f(){if(a.loading){t.innerHTML=`
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
        `,i=a.canManageAllProfiles&&!a.viewingSelf?`<p class="bridge-profile__eyebrow-note">Admin view for ${o(e.fullName)}</p>`:``,c=e.integrations||{},l=a.toolProviders.map(e=>{let t=c[e.id]||{};a.connectingProviderId,e.id;let n=!!e.isConfigured,r=n?`Configured`:`Needs setup`,i=n?`Managed by the UX Bridge organization workspace`:`Awaiting organization-managed API setup`;return`
          <article class="bridge-profile__tool-card">
            <div class="bridge-profile__tool-copy">
              <div>
                <strong>${o(e.label)}</strong>
                <p>${o(e.helperCopy||`Ready for hosted vibe coding in UX Bridge.`)}</p>
              </div>
              <span class="bridge-profile__tool-badge${n?` is-connected`:``}">
                ${r}
              </span>
            </div>
            <div class="bridge-profile__tool-meta">
              <span>Credential mode</span>
              <strong>${o(e.credentialMode||t.credentialMode||`organization-managed`)}</strong>
            </div>
            <div class="bridge-profile__tool-meta">
              <span>Availability</span>
              <strong>${o(i)}</strong>
            </div>
            <div class="bridge-profile__tool-actions">
              ${a.viewingSelf?`<span class="bridge-profile__tool-owner-note">${n?`Ready for hosted vibe coding in the drawer`:`An admin still needs to configure this provider for the organization`}</span>`:`<span class="bridge-profile__tool-owner-note">Managed by account owner</span>`}
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
            <p class="bridge-profile__section-copy">Vibe coding providers are now organization-managed. Users can choose between configured providers in the drawer, and UX Bridge keeps the API credentials on the server.</p>
          </div>
          <div class="bridge-profile__tool-grid">
            ${l}
          </div>
        </section>
      </div>
    `,d()}async function p(){a.loading=!0,f();let t=i?`${e}?email=${encodeURIComponent(i)}`:e,n=await fetch(t,{credentials:`include`,cache:`no-store`}),r=await n.json().catch(()=>({}));if(!n.ok||!r?.ok)throw Error(r?.error||`Unable to load profile.`);a.user=r.user,a.currentUser=r.currentUser,a.roles=Array.isArray(r.roles)?r.roles:[],a.toolProviders=Array.isArray(r.toolProviders)?r.toolProviders:[],a.canEditRole=!!r.canEditRole,a.canManageAllProfiles=!!r.canManageAllProfiles,a.viewingSelf=!!r.viewingSelf,a.avatarUrl=String(r.user?.avatarUrl||``),a.avatarColor=String(r.user?.avatarColor||``),a.viewingSelf&&r.currentUser&&(c(r.currentUser),l(r.currentUser)),a.loading=!1,f()}async function m(e){return new Promise((t,n)=>{let r=new FileReader;r.onload=()=>t(String(r.result||``)),r.onerror=()=>n(Error(`Unable to read image file.`)),r.readAsDataURL(e)})}t.addEventListener(`change`,async e=>{let t=e.target.closest(`[data-profile-photo-input]`);if(!(!t||!t.files?.[0]))try{a.avatarUrl=await m(t.files[0]),f()}catch(e){u(e instanceof Error?e.message:`Unable to read image file.`,`error`)}}),t.addEventListener(`click`,async t=>{let n=t.target.closest(`[data-clear-profile-photo]`),r=t.target.closest(`[data-profile-reset-password]`),i=t.target.closest(`[data-tool-action]`);if(n){a.avatarUrl=``,f();return}if(i&&a.user){let t=String(i.dataset.providerId||``).trim().toLowerCase(),n=String(i.dataset.toolAction||``).trim();try{a.connectingProviderId=t,f();let r=await fetch(`${e}?email=${encodeURIComponent(a.user.email)}`,{method:`POST`,credentials:`include`,headers:{"Content-Type":`application/json`},body:JSON.stringify({action:n===`disconnect`?`disconnectTool`:`connectTool`,providerId:t})}),i=await r.json().catch(()=>({}));if(!r.ok||!i?.ok)throw Error(i?.error||`Unable to update tool connection.`);a.user=i.user,a.currentUser=i.currentUser,a.toolProviders=Array.isArray(i.toolProviders)?i.toolProviders:a.toolProviders,a.roles=Array.isArray(i.roles)?i.roles:a.roles,a.canEditRole=!!i.canEditRole,a.canManageAllProfiles=!!i.canManageAllProfiles,a.viewingSelf=!!i.viewingSelf,a.viewingSelf&&i.currentUser&&(c(i.currentUser),l(i.currentUser)),u(i.message||`Tool connection updated.`,`success`)}catch(e){u(e instanceof Error?e.message:`Unable to update tool connection.`,`error`)}finally{a.connectingProviderId=``,f()}return}if(!(!r||!a.user))try{a.sendingReset=!0,f();let t=await fetch(`${e}?email=${encodeURIComponent(a.user.email)}`,{method:`POST`,credentials:`include`,headers:{"Content-Type":`application/json`},body:JSON.stringify({action:`resetPassword`})}),n=await t.json().catch(()=>({}));if(!t.ok||!n?.ok)throw Error(n?.error||`Unable to send password reset email.`);u(n.message||`Password reset email sent to ${a.user.email}.`,`success`)}catch(e){u(e instanceof Error?e.message:`Unable to send password reset email.`,`error`)}finally{a.sendingReset=!1,f()}}),t.addEventListener(`submit`,async t=>{let n=t.target.closest(`[data-profile-form]`);if(!(!n||!a.user)){t.preventDefault();try{a.saving=!0,f();let t=new FormData(n),r=await fetch(`${e}?email=${encodeURIComponent(a.user.email)}`,{method:`POST`,credentials:`include`,headers:{"Content-Type":`application/json`},body:JSON.stringify({action:`updateProfile`,firstName:t.get(`firstName`),lastName:t.get(`lastName`),email:t.get(`email`),role:t.get(`role`),avatarUrl:a.avatarUrl})}),i=await r.json().catch(()=>({}));if(!r.ok||!i?.ok)throw Error(i?.error||`Unable to save profile.`);if(a.user=i.user,a.currentUser=i.currentUser,a.roles=Array.isArray(i.roles)?i.roles:a.roles,a.toolProviders=Array.isArray(i.toolProviders)?i.toolProviders:a.toolProviders,a.canEditRole=!!i.canEditRole,a.canManageAllProfiles=!!i.canManageAllProfiles,a.viewingSelf=!!i.viewingSelf,a.avatarUrl=String(i.user?.avatarUrl||``),a.avatarColor=String(i.user?.avatarColor||``),a.viewingSelf&&i.currentUser&&(c(i.currentUser),l(i.currentUser)),a.canManageAllProfiles&&!a.viewingSelf){let e=new URL(window.location.href);e.searchParams.set(`email`,i.user.email),window.history.replaceState({},``,e.toString())}u(i.message||`Profile updated.`,`success`)}catch(e){u(e instanceof Error?e.message:`Unable to save profile.`,`error`)}finally{a.saving=!1,f()}}});try{await p()}catch(e){a.loading=!1,u(e instanceof Error?e.message:`Unable to load profile.`,`error`)}})();