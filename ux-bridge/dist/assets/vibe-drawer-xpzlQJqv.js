(function(){let e=document.querySelector(`[data-vibe-root]`);if(!e)return;let t=`/api/projects`,n=(()=>{let e=document.querySelector(`[data-mobile-sheet-backdrop]`);if(e)return e;let t=document.createElement(`button`);return t.type=`button`,t.className=`bridge-mobile-sheet-backdrop`,t.setAttribute(`data-mobile-sheet-backdrop`,``),t.setAttribute(`aria-label`,`Close drawer`),t.hidden=!0,document.body.append(t),t})(),r=String(window.__UX_BRIDGE_CODEX_BRIDGE_URL__||`http://127.0.0.1:4318`).trim(),i=[{value:`owner_admin_only`,label:`Owner + Admin only`},{value:`contributors`,label:`Contributors can edit`},{value:`all_members`,label:`All project members`}],a=new URLSearchParams(window.location.search),o=String(a.get(`project`)||``).trim().toLowerCase(),s=String(a.get(`page`)||``).trim().toLowerCase(),c={drawerOpen:!1,loading:!1,applying:!1,restoring:!1,sessionCreating:!1,pageCreating:!1,reviewLoading:!1,dropdownOpen:!1,codexAccessSelectOpen:!1,project:null,page:null,providers:[],currentUser:null,providerId:`codex`,prompt:``,includeProjectContext:!0,includePageContext:!0,error:``,reviewSessionId:``,reviewData:null,localBridge:{url:r,checked:!1,checking:!1,available:!1,version:``,mode:``,error:``}};function l(e){return String(e||``).replaceAll(`&`,`&amp;`).replaceAll(`<`,`&lt;`).replaceAll(`>`,`&gt;`).replaceAll(`"`,`&quot;`).replaceAll(`'`,`&#39;`)}function u(){return c.providers.find(e=>e.id===c.providerId)||c.providers[0]||null}function d(e=u()){return String(e?.availableVia||``).trim().toLowerCase()===`local-bridge`}function f(){if(c.currentUser)return c.currentUser;if(window.uxBridgeUser)return c.currentUser=window.uxBridgeUser,c.currentUser;try{let e=sessionStorage.getItem(`ux-bridge-user`);c.currentUser=e?JSON.parse(e):null}catch{c.currentUser=null}return c.currentUser}function p(e=c.providerId){return d(c.providers.find(t=>t.id===e)||null)?!!c.localBridge.available:!!f()?.integrations?.[e]?.connected}async function m(e=!1){if(!(c.localBridge.checking||!e&&c.localBridge.checked)){c.localBridge.checking=!0,N();try{let e=await fetch(`${c.localBridge.url}/health`,{method:`GET`,cache:`no-store`}),t=await e.json().catch(()=>({}));c.localBridge.checked=!0,c.localBridge.available=!!(e.ok&&t?.ok),c.localBridge.version=String(t?.version||``).trim(),c.localBridge.mode=String(t?.mode||``).trim(),c.localBridge.error=c.localBridge.available?``:`The local Codex bridge did not respond with a healthy status.`}catch{c.localBridge.checked=!0,c.localBridge.available=!1,c.localBridge.version=``,c.localBridge.mode=``,c.localBridge.error=`Start the local Codex bridge on this machine to use Codex App for page generation.`}finally{c.localBridge.checking=!1,N()}}}function h(e,t,n){return d(e)?c.localBridge.checking?{tone:`neutral`,text:`Checking for a local Codex bridge on this machine…`}:t?{tone:`connected`,text:`Codex App bridge is ready${c.localBridge.version?` (v${l(c.localBridge.version)})`:``}.`}:{tone:`neutral`,text:c.localBridge.error||`Start the local Codex bridge on this machine to use Codex App for page generation.`}:t?{tone:`connected`,text:`${e?.label||`Provider`} is connected${n?` as ${n}`:``}.`}:{tone:`neutral`,text:`Connect ${e?.label||`this provider`} in Profile before generating.`}}function g(){document.body.classList.toggle(`bridge-body--has-vibe`,!0),document.body.classList.toggle(`vibe-open`,c.drawerOpen),e.inert=!c.drawerOpen;let t=document.querySelector(`[data-vibe-drawer-toggle]`);t&&(t.setAttribute(`aria-expanded`,c.drawerOpen?`true`:`false`),t.classList.toggle(`is-active`,c.drawerOpen)),_()}function _(){if(!n)return;let e=window.innerWidth<=959,t=document.body.classList.contains(`customizer-open`)||document.body.classList.contains(`comments-open`)||document.body.classList.contains(`uploads-open`)||document.body.classList.contains(`vibe-open`),r=e&&t;n.hidden=!r,n.classList.toggle(`is-visible`,r)}function v(e,t=`vibe`){c.drawerOpen!==e&&(c.drawerOpen=e,g(),e?window.dispatchEvent(new CustomEvent(`uxbridge:drawer-open`,{detail:{drawer:t}})):(c.dropdownOpen=!1,N()))}function y(){let e=window.UXBridgeActionRail?.renderButtonContent||(({label:e,tooltipClass:t=``}={})=>`
        <span class="bridge-action-rail-button__tooltip${t?` ${t}`:``}" aria-hidden="true">${e||``}</span>
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 3.6 14.72 9.11l6.08.88-4.4 4.29 1.04 6.06L12 17.48l-5.44 2.86 1.04-6.06-4.4-4.29 6.08-.88Z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"></path>
        </svg>
      `),t=document.querySelector(`[data-side-actions]`),n=document.createElement(`button`);n.type=`button`,n.className=`bridge-action-rail-button vibe-drawer-toggle`,n.setAttribute(`data-vibe-drawer-toggle`,``),n.setAttribute(`aria-expanded`,`false`),n.setAttribute(`aria-label`,`Vibe code`),n.innerHTML=e({icon:`vibe`,label:`Vibe code`,tooltipClass:`vibe-drawer-toggle__tooltip`}),n.addEventListener(`click`,()=>{v(!c.drawerOpen)}),window.addEventListener(`uxbridge:drawer-open`,e=>{e.detail?.drawer!==`vibe`&&v(!1,`vibe`)}),t&&t.prepend(n),g()}function b(e,t=s||c.page?.id){if(!e||(c.project=e,c.page=e.pages.find(e=>e.id===t)||e.pages[0]||null,!c.page))return;let n=c.page.vibe||{};c.providerId=n.providerId||c.providerId,c.prompt=n.prompt||c.prompt,c.includeProjectContext=n.includeProjectContext!==!1,c.includePageContext=n.includePageContext!==!1,c.reviewSessionId&&!(Array.isArray(e.editSessions)?e.editSessions:[]).some(e=>e.id===c.reviewSessionId)&&(c.reviewSessionId=``,c.reviewData=null),N()}function x(){return String(f()?.email||``).trim().toLowerCase()}function S(){let e=x();return!e||!c.project?null:(Array.isArray(c.project.editSessions)?c.project.editSessions:[]).find(t=>{let n=String(t.status||``).trim().toLowerCase();return(n===`active`||n===`ready_for_review`)&&String(t.userId||``).trim().toLowerCase()===e&&String(t.pageId||``).trim().toLowerCase()===String(c.page?.id||``).trim().toLowerCase()})||null}function C(){return!c.project||!c.page?[]:(Array.isArray(c.project.editSessions)?c.project.editSessions:[]).filter(e=>String(e.pageId||``).trim().toLowerCase()===String(c.page.id||``).trim().toLowerCase()).sort((e,t)=>{let n=Number(e.updatedAt||e.createdAt||0);return Number(t.updatedAt||t.createdAt||0)-n})}function w(){return!!(c.project?.canManageSharing||c.project?.isOwner||c.project?.projectRole===`admin`)}function T(e){if(!c.project||!e)return null;let t=String(e.userId||``).trim().toLowerCase();return[...Array.isArray(c.project.projectMembers)?c.project.projectMembers:[],...Array.isArray(c.project.availableUsers)?c.project.availableUsers:[]].find(e=>String(e?.email||``).trim().toLowerCase()===t)||null}function E(e){let t=x(),n=String(e?.userId||``).trim().toLowerCase(),r=T(e);return t&&n===t?`You`:r?.fullName||e?.userId||`Project member`}function D(e){let t=String(e||``).split(`
`).map(e=>e.trim()).find(Boolean);return t?t.replace(/^create\s+/i,``).replace(/^build\s+/i,``).replace(/^design\s+/i,``).replace(/^a\s+/i,``).replace(/^an\s+/i,``).slice(0,48).trim()||`New Page`:``}function O(){return c.providers.map(e=>{let t=e.id===c.providerId;return`
          <button
            type="button"
            class="vibe-panel__provider-option${t?` is-active`:``}"
            data-vibe-provider-option="${e.id}"
            role="option"
            aria-selected="${t?`true`:`false`}"
          >
            <strong>${l(e.label)}</strong>
            <small>${l(e.helperCopy||`Ready for user-owned provider auth.`)}</small>
          </button>
        `}).join(``)}function k(e){return i.find(t=>t.value===e)?.label||i[1].label}function A(){let e=c.page?.vibe,t=e?.lastDraft,n=e?.appliedDraft,r=Array.isArray(e?.draftHistory)?e.draftHistory:[];return t?`
      <section class="vibe-panel__result">
        <p class="vibe-panel__result-eyebrow">Latest result</p>
        <h3>${l(t.providerLabel||u()?.label||`Provider`)} draft</h3>
        <p>${l(e.summary||t.summary||`A new mobile UI concept is ready.`)}</p>
        <dl class="vibe-panel__result-meta">
          <div>
            <dt>Provider</dt>
            <dd>${l(t.providerLabel||u()?.label||`Unknown`)}</dd>
          </div>
          <div>
            <dt>Scope</dt>
            <dd>${c.includeProjectContext?`Project`:`Page`} + ${c.includePageContext?`Page`:`Prompt`}</dd>
          </div>
        </dl>
        <div class="vibe-panel__result-actions">
          <button type="button" class="vibe-panel__button" data-vibe-generate ${c.loading?`disabled`:``}>
            ${c.loading?`Generating...`:`Regenerate draft`}
          </button>
          <button
            type="button"
            class="vibe-panel__button vibe-panel__button--secondary"
            data-vibe-apply
            ${c.applying?`disabled`:``}
          >
            ${c.applying?`Applying...`:n?`Replace applied content`:`Apply to page`}
          </button>
        </div>
      </section>
      ${r.length?`
            <section class="vibe-panel__history">
              <div class="vibe-panel__history-head">
                <p class="vibe-panel__result-eyebrow">Version history</p>
                <span>${r.length} saved version${r.length===1?``:`s`}</span>
              </div>
              <div class="vibe-panel__history-list">
                ${r.map(e=>{let r=Number(e.generatedAt)||0,i=Number(t.generatedAt||0)===r,a=Number(n?.generatedAt||0)===r,o=r?new Date(r).toLocaleString([],{month:`short`,day:`numeric`,hour:`numeric`,minute:`2-digit`}):`Recent`;return`
                      <article class="vibe-panel__history-item${i?` is-active`:``}">
                        <div class="vibe-panel__history-copy">
                          <div class="vibe-panel__history-meta">
                            <strong>${l(e.providerLabel||`Version`)}</strong>
                            <span>${l(o)}</span>
                          </div>
                          <p>${l(e.summary||`Saved page draft`)}</p>
                          <div class="vibe-panel__history-badges">
                            ${i?`<span class="vibe-panel__history-badge">Latest</span>`:``}
                            ${a?`<span class="vibe-panel__history-badge is-applied">Applied</span>`:``}
                          </div>
                        </div>
                        <div class="vibe-panel__history-actions">
                          ${i?``:`<button type="button" class="vibe-panel__button vibe-panel__button--ghost" data-vibe-restore="${r}" ${c.restoring?`disabled`:``}>${c.restoring?`Restoring...`:`Make latest`}</button>`}
                          ${a?``:`<button type="button" class="vibe-panel__button vibe-panel__button--secondary" data-vibe-apply-version="${r}" ${c.applying?`disabled`:``}>${c.applying?`Applying...`:`Apply version`}</button>`}
                        </div>
                      </article>
                    `}).join(``)}
              </div>
            </section>
          `:``}
    `:`
        <section class="vibe-panel__result vibe-panel__result--empty">
          <p>No generated draft yet. Add a prompt and generate page content for this mobile section.</p>
        </section>
      `}function j(){return!c.reviewSessionId||!c.project?null:(Array.isArray(c.project.editSessions)?c.project.editSessions:[]).find(e=>e.id===c.reviewSessionId)||null}function M(){let e=j();if(!e)return``;let t=c.reviewData,n=c.project?.pages?.find(t=>t.id===e.pageId);return`
      <section class="vibe-panel__review-card vibe-panel__review-card--detail">
        <div class="vibe-panel__history-head">
          <div>
            <p class="vibe-panel__result-eyebrow">Review session</p>
            <h3>${l(E(e))}</h3>
          </div>
          <button type="button" class="vibe-panel__button vibe-panel__button--ghost" data-vibe-close-review>Done</button>
        </div>
        <div class="vibe-panel__review-copy">
          <strong>${l(n?.name||`Project-wide session`)}</strong>
          <span>${l(e.branchName||`Session branch`)}</span>
        </div>
        ${c.reviewLoading?`<p class="vibe-panel__empty">Loading the real git diff for this session…</p>`:t?`
                <div class="vibe-panel__review-summary">
                  <span>${t.totals?.files||0} file${t.totals?.files===1?``:`s`}</span>
                  <span>+${t.totals?.added||0}</span>
                  <span>-${t.totals?.removed||0}</span>
                  <span>${l(t.baseBranch||`main`)} → ${l(t.branchName||e.branchName||`branch`)}</span>
                </div>
                ${Array.isArray(t.files)&&t.files.length?`
                      <div class="vibe-panel__review-files">
                        ${t.files.map(e=>`
                              <article class="vibe-panel__review-file">
                                <div class="vibe-panel__review-copy">
                                  <strong>${l(e.path||`Changed file`)}</strong>
                                  <span>${l(e.status||`M`)} • +${Number(e.added||0)} / -${Number(e.removed||0)}</span>
                                </div>
                              </article>
                            `).join(``)}
                      </div>
                    `:`<p class="vibe-panel__empty">No changed files were detected for this session yet.</p>`}
                <div class="vibe-panel__diff">
                  <p class="vibe-panel__review-label">Patch preview</p>
                  <pre class="vibe-panel__diff-pre">${l(t.patch||`No patch output available.`)}</pre>
                </div>
              `:`<p class="vibe-panel__empty">Open a session review to inspect changed files and patch details before merging.</p>`}
        ${w()?`<div class="vibe-panel__result-actions"><button type="button" class="vibe-panel__button vibe-panel__button--secondary" data-vibe-merge-session="${l(e.id)}" ${c.applying?`disabled`:``}>${c.applying?`Merging...`:`Merge session`}</button></div>`:``}
      </section>
    `}function N(){let t=u(),n=p(t?.id),r=h(t,n,f()?.integrations?.[t?.id||``]?.accountLabel||``),a=c.page?.name||`Page`,o=c.project?.name||`Project`,s=c.page?.vibe||{},m=S(),g=Array.isArray(c.project?.editSessions)?c.project.editSessions:[],_=C(),v=g.filter(e=>String(e.status||``).trim().toLowerCase()===`ready_for_review`).sort((e,t)=>Number(t.updatedAt||t.createdAt||0)-Number(e.updatedAt||e.createdAt||0)),y=_.filter(e=>String(e.status||``).trim().toLowerCase()===`ready_for_review`),b=_.filter(e=>String(e.status||``).trim().toLowerCase()===`active`),x=!!(m||c.project?.canCreateEditSession),T=String(m?.status||``).trim().toLowerCase(),D=!!(c.project?.canCreateEditSession&&c.prompt.trim()&&T!==`ready_for_review`),j=T?T===`active`:!!x,N=w();e.innerHTML=`
      <div class="vibe-panel__inner">
        <div class="vibe-panel__header">
          <div class="vibe-panel__header-copy">
            <p class="vibe-panel__eyebrow">Vibe coding</p>
            <h2>${l(a)}</h2>
            <p>Generate front-end UI for the mobile section of <strong>${l(o)}</strong>. This stays scoped to this page only.</p>
          </div>
          <button class="vibe-panel__close" type="button" data-vibe-close aria-label="Close vibe coding">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M6 6 18 18"></path>
              <path d="M18 6 6 18"></path>
            </svg>
          </button>
        </div>

        <section class="vibe-panel__section">
          <div class="vibe-panel__control-rail">
            <div class="vibe-panel__workspace-card">
              <div class="vibe-panel__workspace-head">
                <div class="vibe-panel__workspace-copy">
                  <p class="vibe-panel__result-eyebrow">Codex workspace</p>
                  <h3>${l(o)}</h3>
                  <p>This project-level control surface manages Codex access, context, and review before you generate anything for <strong>${l(a)}</strong>.</p>
                </div>
                <div class="vibe-panel__context-summary">
                  <span class="vibe-panel__context-pill">${l((c.project?.visibility||`private`).replace(/_/g,` `))}</span>
                  <span class="vibe-panel__context-pill is-accent">${l((c.project?.codexAccessMode||`contributors`).replace(/_/g,` `))}</span>
                </div>
              </div>
              <div class="vibe-panel__workspace-grid">
                <div class="vibe-panel__meta-card">
                  <span>Codex project context</span>
                  <strong>${l(c.project?.codexContextId||`Pending`)}</strong>
                </div>
                <div class="vibe-panel__meta-card">
                  <span>Current page</span>
                  <strong>${l(a)}</strong>
                </div>
                ${c.project?.canManageSharing?`
                      <div class="vibe-panel__field vibe-panel__field--compact">
                        <span>Who can edit with Codex</span>
                        <div class="vibe-panel__provider-select">
                          <button
                            type="button"
                            class="vibe-panel__provider-trigger vibe-panel__provider-trigger--compact"
                            data-vibe-codex-access-toggle
                            aria-expanded="${c.codexAccessSelectOpen?`true`:`false`}"
                          >
                            <span>
                              <strong>${l(k(c.project?.codexAccessMode||`contributors`))}</strong>
                              <small>Control who can create and review Codex edit sessions.</small>
                            </span>
                            <svg viewBox="0 0 24 24" aria-hidden="true">
                              <path d="m7 10 5 5 5-5"></path>
                            </svg>
                          </button>
                          <div class="vibe-panel__provider-menu${c.codexAccessSelectOpen?` is-open`:``}" role="listbox">
                            ${i.map(e=>`
                                <button
                                  type="button"
                                  class="vibe-panel__provider-option${c.project?.codexAccessMode===e.value?` is-active`:``}"
                                  data-vibe-codex-access-option="${e.value}"
                                  role="option"
                                  aria-selected="${c.project?.codexAccessMode===e.value?`true`:`false`}"
                                >
                                  <strong>${l(e.label)}</strong>
                                  <small>${e.value===`owner_admin_only`?`Limit Codex sessions to owners and project admins.`:e.value===`contributors`?`Let project contributors open Codex edit sessions.`:`Allow every project member to edit with Codex.`}</small>
                                </button>
                              `).join(``)}
                          </div>
                        </div>
                      </div>
                    `:``}
              </div>
              ${c.project?.canManageSharing?`
                    <div class="vibe-panel__workspace-review">
                      <div class="vibe-panel__history-head">
                        <p class="vibe-panel__result-eyebrow">Project review queue</p>
                        <span>${v.length} ready</span>
                      </div>
                      ${v.length?`
                            <div class="vibe-panel__review-list">
                              ${v.map(e=>{let t=c.project?.pages?.find(t=>t.id===e.pageId);return`
                                    <article class="vibe-panel__review-item">
                                      <div class="vibe-panel__review-copy">
                                        <strong>${l(E(e))}</strong>
                                        <span>${l(t?.name||`Project-wide session`)} • ${l(e.branchName||`Scaffold branch`)}</span>
                                      </div>
                                      <div class="vibe-panel__review-actions">
                                        <button type="button" class="vibe-panel__button vibe-panel__button--ghost" data-vibe-open-review="${l(e.id)}">Review</button>
                                        <button type="button" class="vibe-panel__button vibe-panel__button--secondary" data-vibe-merge-session="${l(e.id)}">Merge</button>
                                      </div>
                                    </article>
                                  `}).join(``)}
                            </div>
                          `:`<p class="vibe-panel__empty">No project sessions are currently waiting for review.</p>`}
                    </div>
                  `:``}
            </div>

            <div class="vibe-panel__session-block">
              <div class="vibe-panel__section-head">
                <div>
                  <p class="vibe-panel__result-eyebrow">Current page workflow</p>
                  <h3>${l(a)}</h3>
                </div>
                <span class="vibe-panel__section-tag">${_.length} session${_.length===1?``:`s`}</span>
              </div>
              <div class="vibe-panel__session-card${m?` is-active`:``}">
                <div class="vibe-panel__session-copy">
                  <p class="vibe-panel__result-eyebrow">Edit session</p>
                  ${m?`
                        <strong>${T===`ready_for_review`?`Session ready for review`:`Session active for this page`}</strong>
                        <span>${l(m.branchName||`Scaffold branch`)}</span>
                        <small>${l(m.worktreePath||`project-workspaces/...`)}</small>
                      `:c.project?.canCreateEditSession?`
                          <strong>No active session yet</strong>
                          <span>Start an isolated Codex edit session for this page before generating or creating a new page from prompt.</span>
                        `:`
                          <strong>Codex editing is restricted</strong>
                          <span>You can view this page, but you do not currently have permission to create an edit session here.</span>
                        `}
                </div>
                ${!m&&c.project?.canCreateEditSession?`<button type="button" class="vibe-panel__button vibe-panel__button--ghost" data-vibe-create-session ${c.sessionCreating?`disabled`:``}>${c.sessionCreating?`Starting...`:`Start session`}</button>`:m?`
                        <div class="vibe-panel__session-actions">
                          <button
                            type="button"
                            class="vibe-panel__button vibe-panel__button--ghost"
                            data-vibe-session-status="${T===`ready_for_review`?`active`:`ready_for_review`}"
                          >
                            ${T===`ready_for_review`?`Resume editing`:`Mark ready for review`}
                          </button>
                          ${T===`ready_for_review`&&N?`<button type="button" class="vibe-panel__button vibe-panel__button--secondary" data-vibe-merge-session="${l(m.id)}">Merge session</button>`:``}
                        </div>
                      `:``}
              </div>
              ${_.length?`
                    <div class="vibe-panel__review-card">
                      <div class="vibe-panel__history-head">
                        <p class="vibe-panel__result-eyebrow">Page review flow</p>
                        <span>${_.length} session${_.length===1?``:`s`}</span>
                      </div>
                      ${y.length?`
                            <div class="vibe-panel__review-group">
                              <span class="vibe-panel__review-label">Ready for review</span>
                              <div class="vibe-panel__review-list">
                                ${y.map(e=>`
                                      <article class="vibe-panel__review-item">
                                        <div class="vibe-panel__review-copy">
                                          <strong>${l(E(e))}</strong>
                                          <span>${l(e.branchName||`Scaffold branch`)}</span>
                                        </div>
                                        ${N?`
                                              <div class="vibe-panel__review-actions">
                                                <button type="button" class="vibe-panel__button vibe-panel__button--ghost" data-vibe-open-review="${l(e.id)}">Review</button>
                                                <button type="button" class="vibe-panel__button vibe-panel__button--secondary" data-vibe-merge-session="${l(e.id)}">Merge</button>
                                              </div>
                                            `:`<button type="button" class="vibe-panel__button vibe-panel__button--ghost" data-vibe-open-review="${l(e.id)}">Review</button>`}
                                      </article>
                                    `).join(``)}
                              </div>
                            </div>
                          `:``}
                      ${b.length?`
                            <div class="vibe-panel__review-group">
                              <span class="vibe-panel__review-label">In progress</span>
                              <div class="vibe-panel__review-list">
                                ${b.map(e=>`
                                      <article class="vibe-panel__review-item">
                                        <div class="vibe-panel__review-copy">
                                          <strong>${l(E(e))}</strong>
                                          <span>${l(e.branchName||`Scaffold branch`)}</span>
                                        </div>
                                      </article>
                                    `).join(``)}
                              </div>
                            </div>
                          `:``}
                    </div>
                  `:``}
            </div>
          </div>

          ${M()}

          <div class="vibe-panel__field">
            <span>Tool</span>
            <div class="vibe-panel__provider-select" data-vibe-provider-select>
              <button
                type="button"
                class="vibe-panel__provider-trigger"
                data-vibe-provider-toggle
                aria-expanded="${c.dropdownOpen?`true`:`false`}"
              >
                <span>
                  <strong>${l(t?.label||`Codex`)}</strong>
                  <small>${l(t?.helperCopy||`Ready for user-owned provider auth.`)}</small>
                </span>
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="m7 10 5 5 5-5"></path>
                </svg>
              </button>
              <div class="vibe-panel__provider-menu${c.dropdownOpen?` is-open`:``}" role="listbox">
                ${O()}
              </div>
            </div>
            <p class="vibe-panel__provider-status${r.tone===`connected`?` is-connected`:``}">
              ${l(r.text)}
            </p>
          </div>

          <div class="vibe-panel__field">
            <span>Prompt</span>
            <textarea
              class="vibe-panel__prompt"
              data-vibe-prompt
              placeholder="Describe the UI you want inside this mobile page. Focus on front-end layout, content, and states only."
            >${l(c.prompt)}</textarea>
          </div>

          <div class="vibe-panel__context">
            <label class="vibe-panel__toggle">
              <input type="checkbox" data-vibe-context="project" ${c.includeProjectContext?`checked`:``} />
              <span>Include project context</span>
            </label>
            <label class="vibe-panel__toggle">
              <input type="checkbox" data-vibe-context="page" ${c.includePageContext?`checked`:``} />
              <span>Include page context</span>
            </label>
          </div>

          <div class="vibe-panel__stack">
            <button type="button" class="vibe-panel__button" data-vibe-generate ${c.loading||!n||!j?`disabled`:``}>
              ${c.loading?`Generating...`:`Generate draft`}
            </button>
            <button
              type="button"
              class="vibe-panel__button vibe-panel__button--secondary"
              data-vibe-create-page
              ${c.pageCreating||!D?`disabled`:``}
            >
              ${c.pageCreating?`Creating page...`:`Create new page from prompt`}
            </button>
            <p class="vibe-panel__hint">
              ${d(t)?`Codex App uses a localhost bridge at ${l(c.localBridge.url)} so generation stays tied to this machine.`:T===`ready_for_review`?`This session is currently waiting for review. Resume editing if you want to generate another draft before it is merged.`:`Provider execution is adapter-based in this version. The contract is ready for user-owned provider credentials without storing raw secrets in UX Bridge.`}
            </p>
            ${c.error?`<p class="vibe-panel__status vibe-panel__status--error">${l(c.error)}</p>`:s.error?`<p class="vibe-panel__status vibe-panel__status--error">${l(s.error)}</p>`:``}
          </div>
        </section>

        ${A()}
      </div>
    `,P()}function P(){e.querySelector(`[data-vibe-close]`)?.addEventListener(`click`,()=>{v(!1)}),e.querySelector(`[data-vibe-provider-toggle]`)?.addEventListener(`click`,()=>{c.dropdownOpen=!c.dropdownOpen,c.codexAccessSelectOpen=!1,N()}),e.querySelector(`[data-vibe-codex-access-toggle]`)?.addEventListener(`click`,()=>{c.codexAccessSelectOpen=!c.codexAccessSelectOpen,c.dropdownOpen=!1,N()}),e.querySelectorAll(`[data-vibe-provider-option]`).forEach(e=>{e.addEventListener(`click`,()=>{c.providerId=e.dataset.vibeProviderOption||c.providerId,c.dropdownOpen=!1,N(),d()&&m(!0)})}),e.querySelectorAll(`[data-vibe-codex-access-option]`).forEach(e=>{e.addEventListener(`click`,()=>{R(e.getAttribute(`data-vibe-codex-access-option`)||``)})}),e.querySelector(`[data-vibe-prompt]`)?.addEventListener(`input`,e=>{c.prompt=e.currentTarget.value}),e.querySelectorAll(`[data-vibe-context]`).forEach(t=>{t.addEventListener(`change`,()=>{c.includeProjectContext=e.querySelector(`[data-vibe-context="project"]`)?.checked!==!1,c.includePageContext=e.querySelector(`[data-vibe-context="page"]`)?.checked!==!1})}),e.querySelector(`[data-vibe-generate]`)?.addEventListener(`click`,()=>{U()}),e.querySelector(`[data-vibe-create-session]`)?.addEventListener(`click`,()=>{I()}),e.querySelector(`[data-vibe-create-page]`)?.addEventListener(`click`,()=>{L()}),e.querySelectorAll(`[data-vibe-session-status]`).forEach(e=>{e.addEventListener(`click`,()=>{z(e.getAttribute(`data-vibe-session-status`)||``)})}),e.querySelectorAll(`[data-vibe-merge-session]`).forEach(e=>{e.addEventListener(`click`,()=>{B(e.getAttribute(`data-vibe-merge-session`)||``)})}),e.querySelectorAll(`[data-vibe-open-review]`).forEach(e=>{e.addEventListener(`click`,()=>{V(e.getAttribute(`data-vibe-open-review`)||``)})}),e.querySelector(`[data-vibe-close-review]`)?.addEventListener(`click`,()=>{c.reviewSessionId=``,c.reviewData=null,N()}),e.querySelector(`[data-vibe-apply]`)?.addEventListener(`click`,()=>{W()}),e.querySelectorAll(`[data-vibe-restore]`).forEach(e=>{e.addEventListener(`click`,()=>{G(e.getAttribute(`data-vibe-restore`))})}),e.querySelectorAll(`[data-vibe-apply-version]`).forEach(e=>{e.addEventListener(`click`,()=>{W(e.getAttribute(`data-vibe-apply-version`))})})}async function F(e){let n=await fetch(t,{method:`POST`,credentials:`include`,headers:{"Content-Type":`application/json`},body:JSON.stringify({action:`saveVibeDraft`,project:c.project.id,page:c.page.id,providerId:c.providerId,prompt:c.prompt,includeProjectContext:c.includeProjectContext,includePageContext:c.includePageContext,generated:e})}),r=await n.json().catch(()=>({}));if(!n.ok||!r?.ok||!r?.project)throw Error(r?.error||`Unable to save the generated page draft.`);c.providers=Array.isArray(r.vibeProviders)&&r.vibeProviders.length?r.vibeProviders:c.providers,b(r.project,c.page.id),window.dispatchEvent(new CustomEvent(`uxbridge:project-runtime-sync`,{detail:{project:r.project}}))}async function I(){if(!c.project||!c.page)return null;let e=S();if(e)return e;if(!c.project.canCreateEditSession||c.sessionCreating)return null;c.sessionCreating=!0,c.error=``,N();try{let e=await fetch(t,{method:`POST`,credentials:`include`,headers:{"Content-Type":`application/json`},body:JSON.stringify({action:`createEditSession`,project:c.project.id,page:c.page.id,source:d()?`local-bridge`:c.providerId})}),n=await e.json().catch(()=>({}));if(!e.ok||!n?.ok||!n?.project)throw Error(n?.error||`Unable to start a Codex edit session for this page.`);return b(n.project,c.page.id),window.dispatchEvent(new CustomEvent(`uxbridge:project-runtime-sync`,{detail:{project:n.project}})),n.session||S()}catch(e){return c.error=e instanceof Error?e.message:`Unable to start a Codex edit session for this page.`,N(),null}finally{c.sessionCreating=!1,N()}}async function L(){if(!(!c.project||c.pageCreating||!c.prompt.trim())&&await I()){c.pageCreating=!0,c.error=``,N();try{let e=await fetch(t,{method:`POST`,credentials:`include`,headers:{"Content-Type":`application/json`},body:JSON.stringify({action:`createPageFromCodex`,project:c.project.id,name:D(c.prompt)})}),n=await e.json().catch(()=>({}));if(!e.ok||!n?.ok||!n?.page?.launchUrl)throw Error(n?.error||`Unable to create a new page from this prompt.`);window.location.href=n.page.launchUrl}catch(e){c.error=e instanceof Error?e.message:`Unable to create a new page from this prompt.`,N()}finally{c.pageCreating=!1,N()}}}async function R(e=``){if(!(!c.project||!e)){c.sessionCreating=!0,c.error=``,c.codexAccessSelectOpen=!1,N();try{let n=await fetch(t,{method:`POST`,credentials:`include`,headers:{"Content-Type":`application/json`},body:JSON.stringify({action:`updateProjectPrivacy`,project:c.project.id,codexAccessMode:e})}),r=await n.json().catch(()=>({}));if(!n.ok||!r?.ok||!r?.project)throw Error(r?.error||`Unable to update Codex access settings.`);b(r.project,c.page.id),window.dispatchEvent(new CustomEvent(`uxbridge:project-runtime-sync`,{detail:{project:r.project}}))}catch(e){c.error=e instanceof Error?e.message:`Unable to update Codex access settings.`,N()}finally{c.sessionCreating=!1,N()}}}async function z(e=``){let n=S();if(!(!c.project||!n||!e)){c.sessionCreating=!0,c.error=``,N();try{let r=await fetch(t,{method:`POST`,credentials:`include`,headers:{"Content-Type":`application/json`},body:JSON.stringify({action:`updateEditSessionStatus`,project:c.project.id,sessionId:n.id,status:e})}),i=await r.json().catch(()=>({}));if(!r.ok||!i?.ok||!i?.project)throw Error(i?.error||`Unable to update the edit session status.`);b(i.project,c.page.id),window.dispatchEvent(new CustomEvent(`uxbridge:project-runtime-sync`,{detail:{project:i.project}}))}catch(e){c.error=e instanceof Error?e.message:`Unable to update the edit session status.`,N()}finally{c.sessionCreating=!1,N()}}}async function B(e=``){if(!(!c.project||!e||c.applying)){c.applying=!0,c.error=``,N();try{let n=await fetch(t,{method:`POST`,credentials:`include`,headers:{"Content-Type":`application/json`},body:JSON.stringify({action:`mergeEditSession`,project:c.project.id,sessionId:e})}),r=await n.json().catch(()=>({}));if(!n.ok||!r?.ok||!r?.project)throw Error(r?.error||`Unable to merge this edit session.`);c.reviewSessionId===e&&(c.reviewSessionId=``,c.reviewData=null),b(r.project,c.page.id),window.dispatchEvent(new CustomEvent(`uxbridge:project-runtime-sync`,{detail:{project:r.project}}))}catch(e){c.error=e instanceof Error?e.message:`Unable to merge this edit session.`,N()}finally{c.applying=!1,N()}}}async function V(e=``){if(!(!c.project||!e||c.reviewLoading)){c.reviewSessionId=e,c.reviewData=null,c.reviewLoading=!0,c.error=``,N();try{let n=await fetch(t,{method:`POST`,credentials:`include`,headers:{"Content-Type":`application/json`},body:JSON.stringify({action:`getEditSessionReview`,project:c.project.id,sessionId:e})}),r=await n.json().catch(()=>({}));if(!n.ok||!r?.ok||!r?.review)throw Error(r?.error||`Unable to load the edit-session review.`);c.reviewData=r.review}catch(e){c.error=e instanceof Error?e.message:`Unable to load the edit-session review.`}finally{c.reviewLoading=!1,N()}}}async function H(){let e=await fetch(`${c.localBridge.url}/v1/generate-page`,{method:`POST`,headers:{"Content-Type":`application/json`},body:JSON.stringify({projectId:c.project.id,projectName:c.project.name,pageId:c.page.id,pageName:c.page.name,prompt:c.prompt,includeProjectContext:c.includeProjectContext,includePageContext:c.includePageContext})}),t=await e.json().catch(()=>({}));if(!e.ok||!t?.ok||!t?.result)throw Error(t?.error||`The local Codex bridge could not generate page content.`);await F(t.result)}async function U(){if(!(!c.project||!c.page||!c.prompt.trim()||c.loading)){if(!p()){c.error=`Connect ${u()?.label||`this provider`} in your Profile before generating.`,N();return}c.loading=!0,c.error=``,N();try{if(!await I())return;if(d()){await H();return}let e=await fetch(t,{method:`POST`,credentials:`include`,headers:{"Content-Type":`application/json`},body:JSON.stringify({action:`generateVibeContent`,project:c.project.id,page:c.page.id,providerId:c.providerId,prompt:c.prompt,includeProjectContext:c.includeProjectContext,includePageContext:c.includePageContext})}),n=await e.json().catch(()=>({}));if(!e.ok||!n?.ok||!n?.project)throw Error(n?.error||`Unable to generate page content.`);c.providers=Array.isArray(n.vibeProviders)&&n.vibeProviders.length?n.vibeProviders:c.providers,b(n.project,c.page.id),window.dispatchEvent(new CustomEvent(`uxbridge:project-runtime-sync`,{detail:{project:n.project}}))}catch(e){c.error=e instanceof Error?e.message:`Unable to generate page content.`,N()}finally{c.loading=!1,N()}}}async function W(e=``){if(!(!c.project||!c.page||c.applying)){c.applying=!0,c.error=``,N();try{let n=await fetch(t,{method:`POST`,credentials:`include`,headers:{"Content-Type":`application/json`},body:JSON.stringify({action:`applyVibeContent`,project:c.project.id,page:c.page.id,...e?{draftGeneratedAt:Number(e)||0}:{}})}),r=await n.json().catch(()=>({}));if(!n.ok||!r?.ok||!r?.project)throw Error(r?.error||`Unable to apply generated page content.`);c.providers=Array.isArray(r.vibeProviders)&&r.vibeProviders.length?r.vibeProviders:c.providers,b(r.project,c.page.id),window.dispatchEvent(new CustomEvent(`uxbridge:project-runtime-sync`,{detail:{project:r.project}}))}catch(e){c.error=e instanceof Error?e.message:`Unable to apply generated page content.`,N()}finally{c.applying=!1,N()}}}async function G(e=``){if(!(!c.project||!c.page||c.restoring)){c.restoring=!0,c.error=``,N();try{let n=await fetch(t,{method:`POST`,credentials:`include`,headers:{"Content-Type":`application/json`},body:JSON.stringify({action:`restoreVibeDraft`,project:c.project.id,page:c.page.id,draftGeneratedAt:Number(e)||0})}),r=await n.json().catch(()=>({}));if(!n.ok||!r?.ok||!r?.project)throw Error(r?.error||`Unable to restore this version.`);c.providers=Array.isArray(r.vibeProviders)&&r.vibeProviders.length?r.vibeProviders:c.providers,b(r.project,c.page.id),window.dispatchEvent(new CustomEvent(`uxbridge:project-runtime-sync`,{detail:{project:r.project}}))}catch(e){c.error=e instanceof Error?e.message:`Unable to restore this version.`,N()}finally{c.restoring=!1,N()}}}async function K(){try{let e=await fetch(`${t}?project=${encodeURIComponent(o)}`,{credentials:`include`,cache:`no-store`}),n=await e.json().catch(()=>({}));if(!e.ok||!n?.ok||!n?.project)return;c.providers=Array.isArray(n.vibeProviders)&&n.vibeProviders.length?n.vibeProviders:q(),c.currentUser=n.currentUser||f(),b(n.project,s),m()}catch{c.providers=q(),N()}}function q(){return[{id:`codex-app`,label:`Codex App`,availableVia:`local-bridge`,helperCopy:`Uses a local Codex bridge on this machine to generate page-scoped mobile UI.`},{id:`codex`,label:`Codex`,helperCopy:`Ready for a user-owned Codex session or connector-based execution flow.`},{id:`claude`,label:`Claude`,helperCopy:`Structured for connector-based Claude execution with the user’s own credentials.`},{id:`generic`,label:`Other tool`,helperCopy:`Fallback adapter for other vibe-coding tools while preserving the same UX Bridge contract.`}]}document.addEventListener(`click`,t=>{c.dropdownOpen&&(e.contains(t.target)||(c.dropdownOpen=!1,N()))}),document.addEventListener(`keydown`,e=>{if(e.key===`Escape`){if(c.dropdownOpen){c.dropdownOpen=!1,N();return}c.drawerOpen&&v(!1)}}),window.addEventListener(`uxbridge:project-page-sync`,e=>{let t=e.detail?.project,n=e.detail?.page;!t||!n||t.id!==o||(c.providers.length||(c.providers=q()),b(t,n.id))}),window.addEventListener(`uxbridge:user-ready`,e=>{c.currentUser=e.detail||null,N()}),c.providers=q(),y(),N(),n?.addEventListener(`click`,()=>{c.drawerOpen&&v(!1)}),window.addEventListener(`resize`,_),document.querySelector(`[data-vibe-launch]`)?.addEventListener(`click`,()=>{v(!0)}),K()})();