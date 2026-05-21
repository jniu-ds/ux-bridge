(function(){let e=`/api/projects`,t=[{value:`invited`,label:`Only those I invite`},{value:`all-users`,label:`All current users`},{value:`link`,label:`Anyone with the share link`}],n=document.querySelector(`[data-header-actions]`),r=document.createElement(`div`);if(!n)return;r.className=`bridge-project-share-modal-host`,document.body.append(r);let i={projectId:``,open:!1,loading:!1,project:null,inviteQuery:``,inviteEmails:[],prototypeLabel:``,prototypeUrl:``,prototypePageId:``,sharingSelectOpen:!1,message:``,tone:`neutral`};function a(e){return String(e??``).replaceAll(`&`,`&amp;`).replaceAll(`<`,`&lt;`).replaceAll(`>`,`&gt;`).replaceAll(`"`,`&quot;`)}function o(){return String(document.body.dataset.projectKey||``).trim().toLowerCase()}function s(e){return String(e||``).trim().split(/\s+/).filter(Boolean).slice(0,2).map(e=>e[0]?.toUpperCase()||``).join(``)||`U`}function c(){let e=i.project;if(!e||!Array.isArray(e.availableUsers))return[];let t=String(window.uxBridgeUser?.email||``).trim().toLowerCase(),n=new Set([String(e.ownerEmail||``).trim().toLowerCase(),...Array.isArray(e.members)?e.members.map(e=>String(e.email||``).trim().toLowerCase()):[]]),r=new Set(Array.isArray(e.pendingInviteEmails)?e.pendingInviteEmails.map(e=>String(e).trim().toLowerCase()):[]),a=String(i.inviteQuery||``).trim().toLowerCase(),o=new Set(i.inviteEmails.map(e=>String(e).trim().toLowerCase()));return e.availableUsers.filter(e=>{let i=String(e.email||``).trim().toLowerCase();return!i||i===t||n.has(i)||r.has(i)||o.has(i)?!1:a?[e.fullName,e.email,e.role].join(` `).toLowerCase().includes(a):!0})}function l(e=``,t=`neutral`){i.message=e,i.tone=t,v()}function u(e){return String(e||``).trim().toLowerCase()}function d(e){return/^(?:[a-z0-9._%+-]+)@(?:nuskin\.com|nuskin\.onmicrosoft\.com)$/i.test(String(e||``).trim())}function f(e){return t.find(t=>t.value===e)?.label||t[0].label}function p(e){let t=u(e);return!t||!d(t)||i.inviteEmails.includes(t)?!1:(i.inviteEmails=[...i.inviteEmails,t],i.inviteQuery=``,!0)}function m(e){let t=u(e);i.inviteEmails=i.inviteEmails.filter(e=>e!==t)}function h(){let e=c().slice(0,6).map(e=>({type:`user`,email:u(e.email),label:e.fullName,user:e})),t=u(String(i.inviteQuery||``).trim());return t&&d(t)&&!i.inviteEmails.includes(t)&&!e.some(e=>e.email===t)&&e.push({type:`email`,email:t,label:t}),e}function g(e){let t=String(e?.avatarUrl||``).trim(),n=String(e?.avatarColor||``).trim(),r=n?` style="--avatar-bg:${a(n)}"`:``;return t?`<span class="bridge-project-share__avatar has-photo"${r}><img src="${a(t)}" alt="" /></span>`:`<span class="bridge-project-share__avatar"${r}>${a(s(e?.fullName||e?.email||``))}</span>`}function _(e=null,t=null){window.requestAnimationFrame(()=>{let n=r.querySelector(`[data-project-share-search]`);if(n&&(n.focus(),typeof e==`number`)){let r=typeof t==`number`?t:e;n.setSelectionRange(e,r)}})}function v(){let e=i.project,o=!!e?.canInvite,s=!!e?.canManageSharing,c=h(),l=Array.isArray(e?.accessRequests)?e.accessRequests:[],u=Array.isArray(e?.pendingInviteEmails)?e.pendingInviteEmails:[],d=Array.isArray(e?.prototypeLinks)?e.prototypeLinks:[],p=Array.isArray(e?.pages)?e.pages:[],m=n.querySelector(`[data-project-share-root]`);m instanceof HTMLElement||(m=document.createElement(`div`),m.setAttribute(`data-project-share-root`,``),n.append(m)),m.innerHTML=`
      <div class="bridge-project-share">
        <button
          class="bridge-project-share__trigger bridge-project-share__trigger--icon"
          type="button"
          data-project-share-toggle
          aria-haspopup="dialog"
          aria-expanded="${i.open?`true`:`false`}"
          aria-label="Share project"
          data-tooltip="Share"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <path d="M15.5 8.5 8.5 12l7 3.5"></path>
            <circle cx="17.5" cy="6.5" r="2.25"></circle>
            <circle cx="6.5" cy="12" r="2.25"></circle>
            <circle cx="17.5" cy="17.5" r="2.25"></circle>
          </svg>
        </button>
      </div>
    `,r.innerHTML=i.open?`
        <div class="bridge-project-share__modal-shell" data-project-share-overlay>
          <div class="bridge-project-share__modal" role="dialog" aria-modal="true" aria-label="Project sharing">
            <div class="bridge-project-share__panel-head">
              <div>
                <p class="bridge-project-share__eyebrow">Project sharing</p>
                <h2>Share ${a(e?.name||`project`)}</h2>
              </div>
              <button class="bridge-project-share__close" type="button" aria-label="Close share panel" data-project-share-close>×</button>
            </div>

            ${i.message?`<p class="bridge-project-share__status${i.tone===`error`?` is-error`:``}">${a(i.message)}</p>`:``}

              ${s?`
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
                              aria-expanded="${i.sharingSelectOpen?`true`:`false`}"
                            >
                              <span>${a(f(e?.sharingMode||`invited`))}</span>
                              <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">
                                <path d="M3.5 5.75 8 10.25l4.5-4.5"></path>
                              </svg>
                            </button>
                            ${i.sharingSelectOpen?`
                                  <div class="bridge-project-share__select-menu" role="listbox">
                                    ${t.map(t=>`
                                        <button
                                          class="bridge-project-share__select-option${e?.sharingMode===t.value?` is-selected`:``}"
                                          type="button"
                                          role="option"
                                          data-project-sharing-option="${t.value}"
                                        >
                                          ${a(t.label)}
                                        </button>
                                      `).join(``)}
                              </div>
                            `:``}
                          </div>
                        </div>
                      </div>
                      <div class="bridge-project-share__meta-row">
                        <div class="bridge-project-share__meta-card">
                          <span>Members</span>
                          <strong>${a(String(e?.members?.length||0))}</strong>
                        </div>
                      </div>
                    </section>
                  `:``}

            ${o?`
                  <section class="bridge-project-share__section">
                    <h3>Invite people</h3>
                    <form class="bridge-project-share__invite-form" data-project-share-email-form>
                      <div class="bridge-project-share__invite-box">
                        <div class="bridge-project-share__invite-chips">
                          ${i.inviteEmails.map(e=>`
                                <span class="bridge-project-share__invite-chip">
                                  <span>${a(e)}</span>
                                  <button type="button" aria-label="Remove ${a(e)}" data-project-share-remove="${a(e)}">×</button>
                                </span>
                              `).join(``)}
                          <input
                            class="bridge-project-share__invite-input"
                            type="text"
                            name="email"
                            placeholder="${i.inviteEmails.length?``:`Search people or enter email`}"
                            value="${a(i.inviteQuery)}"
                            data-project-share-search
                          />
                        </div>
                        <button type="submit" ${i.inviteEmails.length?``:`disabled`}>Invite</button>
                      </div>
                      ${c.length?`
                            <div class="bridge-project-share__suggestions">
                              ${c.map(e=>e.type===`user`?`
                                      <button class="bridge-project-share__suggestion" type="button" data-project-share-add="${a(e.email)}">
                                        <span class="bridge-project-share__suggestion-main">
                                          ${g(e.user)}
                                          <span class="bridge-project-share__suggestion-text">
                                            <strong>${a(e.user.fullName)}</strong>
                                            <span>${a(e.user.email)}</span>
                                          </span>
                                        </span>
                                        <span class="bridge-project-share__suggestion-action">Add</span>
                                      </button>
                                    `:`
                                      <button class="bridge-project-share__suggestion" type="button" data-project-share-add="${a(e.email)}">
                                        <span class="bridge-project-share__suggestion-text">
                                          <strong>${a(e.email)}</strong>
                                          <span>Invite this email address</span>
                                        </span>
                                        <span class="bridge-project-share__suggestion-action">Add</span>
                                      </button>
                                    `).join(``)}
                            </div>
                          `:i.inviteQuery?`<p class="bridge-project-share__empty">Keep typing to search current users, or enter a valid Nu Skin email.</p>`:``}
                    </form>
                  </section>
                `:``}

            ${u.length?`
                  <section class="bridge-project-share__section">
                    <h3>Pending invitations</h3>
                    <div class="bridge-project-share__pill-list">
                      ${u.map(e=>`<span class="bridge-project-share__pill">${a(e)}</span>`).join(``)}
                    </div>
                  </section>
                `:``}

            ${s&&l.length?`
                  <section class="bridge-project-share__section">
                    <h3>Access requests</h3>
                    <div class="bridge-project-share__user-list">
                      ${l.map(e=>`
                            <div class="bridge-project-share__user-row">
                              <div class="bridge-project-share__user-meta">
                                ${g(e)}
                                <div>
                                  <strong>${a(e.fullName)}</strong>
                                  <span>${a(e.email)}</span>
                                </div>
                              </div>
                              <button type="button" data-project-share-approve="${a(e.email)}">Grant access</button>
                            </div>
                          `).join(``)}
                    </div>
                  </section>
                `:``}
            ${e?`
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
                            value="${a(i.prototypeLabel)}"
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
                            value="${a(i.prototypeUrl)}"
                            data-project-prototype-url
                          />
                        </label>
                        <label class="bridge-project-share__setting">
                          <span>Linked page</span>
                          <select class="bridge-project-share__field bridge-project-share__field--select" name="pageId" data-project-prototype-page>
                            <option value="">Project-wide</option>
                            ${p.map(e=>`
                                  <option value="${a(e.id)}" ${i.prototypePageId===e.id?`selected`:``}>
                                    ${a(e.name)}
                                  </option>
                                `).join(``)}
                          </select>
                        </label>
                      </div>
                      <div class="bridge-project-share__prototype-actions">
                        <button type="submit">Save prototype link</button>
                      </div>
                    </form>
                    ${d.length?`
                          <div class="bridge-project-share__prototype-list">
                            ${d.map(e=>{let t=p.find(t=>t.id===e.pageId);return`
                                  <article class="bridge-project-share__prototype-row">
                                    <div class="bridge-project-share__prototype-copy">
                                      <strong>${a(e.label||`Prototype link`)}</strong>
                                      <span>${a(e.url)}</span>
                                      <small>${a(t?.name||`Project-wide`)}</small>
                                    </div>
                                    <div class="bridge-project-share__prototype-actions">
                                      <button type="button" class="bridge-project-share__ghost-button" data-project-prototype-copy="${a(e.url)}">Copy</button>
                                      <a class="bridge-project-share__ghost-button is-link" href="${a(e.url)}" target="_blank" rel="noreferrer">Open</a>
                                    </div>
                                  </article>
                                `}).join(``)}
                          </div>
                        `:`<p class="bridge-project-share__empty">No prototype links yet. Add one so people can jump straight into a specific flow or review target.</p>`}
                  </section>
                `:``}
            <footer class="bridge-project-share__footer">
              <div class="bridge-project-share__copy-row">
                <input type="text" readonly value="${a(e?.shareUrl||``)}" />
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
      `:``}async function y(){let t=o();if(!t)return;i.loading=!0,i.projectId=t;let n=await fetch(`${e}?project=${encodeURIComponent(t)}`,{credentials:`include`,cache:`no-store`}),r=await n.json().catch(()=>({}));if(!n.ok||!r?.ok||!r?.project)throw Error(r?.error||`Unable to load sharing settings.`);i.project=r.project,i.loading=!1}async function b(t,n={}){let r=await fetch(e,{method:`POST`,credentials:`include`,headers:{"Content-Type":`application/json`},body:JSON.stringify({action:t,project:i.projectId,...n})}),a=await r.json().catch(()=>({}));if(!r.ok||!a?.ok)throw Error(a?.error||`Unable to update project sharing.`);a.project&&(i.project=a.project,window.dispatchEvent(new CustomEvent(`uxbridge:project-runtime-sync`,{detail:{project:a.project}}))),a.message?l(a.message):v()}async function x(){i.open=!0,l(``),v();try{await y(),i.inviteEmails=[],i.inviteQuery=``,i.prototypeLabel=``,i.prototypeUrl=``,i.prototypePageId=``,i.sharingSelectOpen=!1,v()}catch(e){l(e instanceof Error?e.message:`Unable to load sharing settings.`,`error`)}}function S(){let e=o();if(!e){window.setTimeout(S,250);return}i.projectId=e,v()}async function C(e){let t=e.target.closest(`[data-project-share-toggle]`),n=e.target.closest(`[data-project-share-close]`),r=e.target.closest(`[data-project-share-invite]`),a=e.target.closest(`[data-project-share-approve]`),o=e.target.closest(`[data-project-share-copy]`),s=e.target.closest(`[data-project-sharing-toggle]`),c=e.target.closest(`[data-project-sharing-option]`),u=e.target.closest(`[data-project-share-add]`),d=e.target.closest(`[data-project-share-remove]`),f=e.target.closest(`[data-project-prototype-copy]`);if(t){i.open?(i.open=!1,v()):await x();return}if(n){i.open=!1,v();return}if(s){i.sharingSelectOpen=!i.sharingSelectOpen,v();return}if(c){let e=c.getAttribute(`data-project-sharing-option`)||``;i.sharingSelectOpen=!1;try{await b(`updateSharingMode`,{sharingMode:e})}catch(e){l(e instanceof Error?e.message:`Unable to update sharing settings.`,`error`)}return}if(u){p(u.getAttribute(`data-project-share-add`)||``),v();return}if(d){m(d.getAttribute(`data-project-share-remove`)||``),v();return}if(r){let e=r.getAttribute(`data-project-share-invite`)||``;try{await b(`inviteUsers`,{emails:[e]})}catch(e){l(e instanceof Error?e.message:`Unable to send invite.`,`error`)}return}if(a){let e=a.getAttribute(`data-project-share-approve`)||``;try{await b(`approveAccessRequest`,{email:e})}catch(e){l(e instanceof Error?e.message:`Unable to grant access.`,`error`)}return}if(o){try{await navigator.clipboard.writeText(String(i.project?.shareUrl||``)),l(`Share link copied.`)}catch{l(`Unable to copy the share link.`,`error`)}return}if(f){try{await navigator.clipboard.writeText(String(f.getAttribute(`data-project-prototype-copy`)||``)),l(`Prototype link copied.`)}catch{l(`Unable to copy the prototype link.`,`error`)}return}i.sharingSelectOpen&&!e.target.closest(`.bridge-project-share__select`)&&(i.sharingSelectOpen=!1,v())}n.addEventListener(`click`,e=>{C(e)}),r.addEventListener(`click`,e=>{C(e)});function w(e){let t=e.target.closest(`[data-project-share-search]`),n=e.target.closest(`[data-project-prototype-label]`),r=e.target.closest(`[data-project-prototype-url]`),a=e.target.closest(`[data-project-prototype-page]`);if(t){let e=t.selectionStart,n=t.selectionEnd;i.inviteQuery=t.value,v(),_(e,n)}n&&(i.prototypeLabel=n.value),r&&(i.prototypeUrl=r.value),a&&(i.prototypePageId=a.value)}n.addEventListener(`input`,e=>{w(e)}),r.addEventListener(`input`,e=>{w(e)});async function T(e){let t=e.target.closest(`[data-project-share-email-form]`),n=e.target.closest(`[data-project-prototype-form]`);if(!t){if(!n)return;e.preventDefault();try{await b(`createPrototypeLink`,{label:i.prototypeLabel,url:i.prototypeUrl,pageId:i.prototypePageId}),i.prototypeLabel=``,i.prototypeUrl=``,i.prototypePageId=``,l(`Prototype link saved.`)}catch(e){l(e instanceof Error?e.message:`Unable to save the prototype link.`,`error`)}return}if(e.preventDefault(),i.inviteQuery){let e=!i.inviteEmails.length;p(i.inviteQuery),e&&_()}if(i.inviteEmails.length)try{await b(`inviteUsers`,{emails:i.inviteEmails}),i.inviteEmails=[],i.inviteQuery=``,v()}catch(e){l(e instanceof Error?e.message:`Unable to send invite.`,`error`)}}n.addEventListener(`submit`,e=>{T(e)}),r.addEventListener(`submit`,e=>{T(e)}),document.addEventListener(`click`,e=>{i.open&&(e.target.closest(`.bridge-project-share`)||e.target.closest(`.bridge-project-share__modal`)||(i.open=!1,v()))}),document.addEventListener(`keydown`,e=>{if(i.open){if(e.key===`Escape`){i.sharingSelectOpen=!1,i.open=!1,v();return}if(e.target.closest(`[data-project-share-search]`))if(e.key===`Enter`||e.key===`,`||e.key===`Tab`){let t=String(i.inviteQuery||``).trim();t&&d(t)&&(e.preventDefault(),p(t),v(),_())}else e.key===`Backspace`&&!i.inviteQuery&&i.inviteEmails.length&&(i.inviteEmails=i.inviteEmails.slice(0,-1),v(),_())}}),S(),window.addEventListener(`uxbridge:project-runtime-sync`,e=>{let t=e.detail?.project;!t||t.id!==i.projectId||(i.project=t,v())})})();