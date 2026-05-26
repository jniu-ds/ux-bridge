(function(){let e=document.querySelector(`[data-vibe-root]`);if(!e)return;let t=`/api/projects`,n=document.createElement(`input`),r=(()=>{let e=document.querySelector(`[data-mobile-sheet-backdrop]`);if(e)return e;let t=document.createElement(`button`);return t.type=`button`,t.className=`bridge-mobile-sheet-backdrop`,t.setAttribute(`data-mobile-sheet-backdrop`,``),t.setAttribute(`aria-label`,`Close drawer`),t.hidden=!0,document.body.append(t),t})(),i=[{value:`owner_admin_only`,label:`Owner + Admin only`},{value:`contributors`,label:`Contributors can edit`},{value:`all_members`,label:`All project members`}],a=new URLSearchParams(window.location.search),o=String(a.get(`project`)||``).trim().toLowerCase(),s=String(a.get(`page`)||``).trim().toLowerCase(),c={drawerOpen:!1,loading:!1,applying:!1,restoring:!1,sessionCreating:!1,pageCreating:!1,settingsOpen:!1,reviewLoading:!1,dropdownOpen:!1,codexAccessSelectOpen:!1,project:null,page:null,shouldStickToBottom:!0,providers:[],currentUser:null,providerId:`codex`,viewportPreset:`mobile`,selectedLayerContext:null,prompt:``,submittingPrompt:``,includeProjectContext:!0,includePageContext:!0,error:``,pendingAssets:[],reviewSessionId:``,reviewData:null,lastProjectSyncSignature:``,openVerificationMessageKey:``},l={codex:`gpt-5.1-codex`,claude:`claude-sonnet-4-20250514`};n.type=`file`,n.multiple=!0,n.hidden=!0,n.className=`comments-panel__file-input`,n.setAttribute(`data-vibe-file-input`,``),document.body.append(n);function u(e,t=s||c.page?.id){let n=String(t||``).trim().toLowerCase(),r=(Array.isArray(e?.pages)?e.pages:[]).find(e=>String(e?.id||``).trim().toLowerCase()===n)||null,i=(Array.isArray(e?.editSessions)?e.editSessions:[]).filter(e=>String(e?.pageId||``).trim().toLowerCase()===n).map(e=>({id:String(e?.id||``),status:String(e?.status||``),updatedAt:Number(e?.updatedAt||e?.createdAt||0),branchName:String(e?.branchName||``)})),a=Array.isArray(e?.codexThread?.messages)?e.codexThread.messages.slice(-18).map(e=>({id:String(e?.id||``),pageId:String(e?.pageId||``),role:String(e?.role||``),content:String(e?.content||``),createdAt:Number(e?.createdAt||0),providerId:String(e?.metadata?.providerId||``),providerLabel:String(e?.metadata?.providerLabel||``),assets:Array.isArray(e?.metadata?.assets)?e.metadata.assets.map(e=>({id:String(e?.id||``),fileName:String(e?.fileName||``)})):[]})):[];return JSON.stringify({projectId:String(e?.id||``),pageId:n,pageName:String(r?.name||``),previewUpdatedAt:Number(r?.previewUpdatedAt||r?.preview?.updatedAt||r?.preview?.appliedAt||0),viewportPreset:String(e?.viewerState?.viewportPreset||``),canCreateEditSession:!!e?.canCreateEditSession,editSessions:i,reviewSessionId:String(c.reviewSessionId||``),thread:{activePageId:String(e?.codexThread?.activePageId||``),messages:a}})}function d(e){return String(e||``).replaceAll(`&`,`&amp;`).replaceAll(`<`,`&lt;`).replaceAll(`>`,`&gt;`).replaceAll(`"`,`&quot;`).replaceAll(`'`,`&#39;`)}function f(e){let t=Number(e);return Number.isFinite(t)?t.toLocaleString():`0`}function p(e){let t=Number(e);return Number.isFinite(t)?t<.01?`$${t.toFixed(4)}`:`$${t.toFixed(2)}`:``}function m(e){let t=String(e?.id||``).trim();if(t)return t;let n=Number(e?.createdAt||0);return`${String(e?.role||``).trim().toLowerCase()||`system`}:${n}:${String(e?.content||``).trim().slice(0,80)}`}function h(e,t=``){if(!e||typeof e!=`object`||String(c.openVerificationMessageKey||``)!==String(t||``))return``;let n=String(e.mode||``).trim().toLowerCase()===`selected-layer`?`Selected layer`:`Full page`,r=String(e.targetLabel||``).trim(),i=String(e.targetPath||``).trim(),a=[e.includePageContext===!1?`No page context`:`Page context`,e.includeProjectContext===!1?`No project context`:`Project context`],o=p(e.estimatedTotalCostUsd);return`
      <div class="vibe-panel__thread-verification" aria-label="Scope verification">
        <div class="vibe-panel__thread-verification-head">
          <strong>Scope verification</strong>
          <span>${d(n)}</span>
        </div>
        <div class="vibe-panel__thread-verification-grid">
          <span>Input HTML ${d(f(e.inputHtmlChars))}</span>
          <span>Returned HTML ${d(f(e.returnedHtmlChars))}</span>
          <span>Input CSS ${d(f(e.inputCssChars))}</span>
          <span>Returned CSS ${d(f(e.returnedCssChars))}</span>
          ${o?`<span>Est. cost ${d(o)}</span>`:``}
        </div>
        <div class="vibe-panel__thread-verification-meta">
          ${r?`<span>Target: ${d(r)}</span>`:``}
          ${i?`<span>Path: ${d(i)}</span>`:``}
          <span>Roots: ${d(f(e.returnedRootElements))}</span>
          ${e.estimatedInputTokens||e.estimatedOutputTokens?`<span>Tokens: ~${d(f(e.estimatedInputTokens||0))} in / ~${d(f(e.estimatedOutputTokens||0))} out</span>`:``}
          <span>${d(a.join(` • `))}</span>
        </div>
      </div>
    `}function g(e){return new Promise((t,n)=>{let r=new FileReader;r.onload=()=>t(String(r.result||``)),r.onerror=()=>n(Error(`Could not read ${e?.name||`file`}.`)),r.readAsDataURL(e)})}function _(e,t){return{id:`pending-${crypto.randomUUID()}`,fileName:String(e?.name||`Upload`).trim()||`Upload`,contentType:String(e?.type||`application/octet-stream`).trim()||`application/octet-stream`,sizeBytes:Number(e?.size)||0,kind:String(e?.type||``).startsWith(`image/`)?`image`:String(e?.type||``).startsWith(`video/`)?`video`:String(e?.type||``).trim().toLowerCase()===`application/pdf`?`pdf`:`file`,previewUrl:String(t||``).trim(),dataBase64:String(t||``).includes(`,`)?String(t).split(`,`)[1]:``,createdAt:Date.now(),pageId:c.page?.id||s||``}}async function v(e){let t=Array.from(e||[]).filter(Boolean);return t.length?Promise.all(t.map(async e=>_(e,await g(e)))):[]}async function y(e){try{let t=await v(e);if(!t.length)return;c.pendingAssets=[...c.pendingAssets,...t],c.error=``,Y()}catch(e){c.error=e instanceof Error?e.message:`Could not add file.`,Y()}finally{n.value=``}}function b(e){c.pendingAssets=c.pendingAssets.filter(t=>t.id!==e),Y()}function x(){n.click()}function ee(){return c.pendingAssets.length?`
      <div class="comments-panel__pending-assets vibe-panel__pending-assets">
        ${c.pendingAssets.map(e=>`
              <article class="comments-panel__asset-card comments-panel__asset-card--compact comments-panel__asset-card--pending">
                <div class="comments-panel__asset-preview">
                  ${e.kind===`image`?`<img src="${d(e.previewUrl||``)}" alt="${d(e.fileName)}" />`:`<span class="comments-panel__asset-extension">${d(String(e.kind||`file`).toUpperCase().slice(0,6))}</span>`}
                </div>
                <div class="comments-panel__asset-copy">
                  <strong>${d(e.fileName)}</strong>
                  <span>${d(e.kind)}</span>
                </div>
                <button
                  type="button"
                  class="comments-panel__asset-remove"
                  data-vibe-asset-remove="${d(e.id)}"
                  aria-label="Remove attachment"
                >
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M6 6 18 18"></path>
                    <path d="M18 6 6 18"></path>
                  </svg>
                </button>
              </article>
            `).join(``)}
      </div>
    `:``}function S(){return c.providers.find(e=>e.id===c.providerId)||c.providers[0]||null}function C(e){let t=String(e?.pathKey||``).trim();return!t||t===`__screen__`?null:{pageId:String(e?.pageId||``).trim(),pathKey:t,label:String(e?.label||``).trim(),tagName:String(e?.tagName||``).trim().toLowerCase(),textSummary:String(e?.textSummary||``).trim(),html:String(e?.html||``).trim()}}function xe(e){let t=String(c.page?.id||s||``).trim().toLowerCase();if(!e||String(e.pageId||``).trim().toLowerCase()!==t)return``;let n=String(e.label||e.tagName||e.textSummary||`Layer`).trim()||`Layer`,r=n.length>10?`${n.slice(0,10)}...`:n;return`<div class="vibe-panel__scope-pill" data-vibe-layer-pill title="${d(n)}"><span>${d(r)}</span><button type="button" data-vibe-layer-pill-dismiss aria-label="Clear selected layer scope"><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4.5 4.5 11.5 11.5M11.5 4.5 4.5 11.5"></path></svg></button></div>`}function te(e){let t=String(e?.id||``).trim().toLowerCase();return String(e?.model||l[t]||e?.label||`Codex`).trim()}function w(){if(c.currentUser)return c.currentUser;if(window.uxBridgeUser)return c.currentUser=window.uxBridgeUser,c.currentUser;try{let e=sessionStorage.getItem(`ux-bridge-user`);c.currentUser=e?JSON.parse(e):null}catch{c.currentUser=null}return c.currentUser}function T(){return!!S()?.isConfigured}function E(){let e=S();return e?e.isConfigured?{tone:`connected`,text:`${e.label} is ready for hosted vibe coding${e.model?` • ${e.model}`:``}.`}:{tone:`neutral`,text:`${e.label} is not configured for hosted vibe coding yet.`}:{tone:`neutral`,text:`Choose a hosted vibe-coding provider.`}}function D(){document.body.classList.toggle(`bridge-body--has-vibe`,!0),document.body.classList.toggle(`vibe-open`,c.drawerOpen),e.inert=!c.drawerOpen;let t=document.querySelector(`[data-vibe-drawer-toggle]`);t&&(t.setAttribute(`aria-expanded`,c.drawerOpen?`true`:`false`),t.classList.toggle(`is-active`,c.drawerOpen)),k()}function O(e=``){let t=String(e||``).trim().toLowerCase();t&&(c.providerId=t),P(!0),window.dispatchEvent(new CustomEvent(`uxbridge:vibe-compose-start`,{detail:{projectId:o,pageId:c.page?.id||s||``,providerId:c.providerId}}))}function k(){if(!r)return;let e=window.innerWidth<=959&&!document.body.classList.contains(`preview-viewport-responsive`),t=document.body.classList.contains(`customizer-open`)||document.body.classList.contains(`comments-open`)||document.body.classList.contains(`uploads-open`)||document.body.classList.contains(`vibe-open`),n=e&&t;r.hidden=!n,r.classList.toggle(`is-visible`,n)}function A(e){return e?e.scrollHeight-e.scrollTop-e.clientHeight<=32:!0}function j(){let t=e.querySelector(`[data-vibe-thread]`);if(!(t instanceof HTMLElement))return;let n=()=>{t.scrollTop=t.scrollHeight};n(),window.requestAnimationFrame(()=>{n(),window.setTimeout(n,0),window.setTimeout(n,120),window.setTimeout(n,240)})}function M(e){e instanceof HTMLTextAreaElement&&(e.style.height=`auto`,e.style.height=`${Math.max(e.scrollHeight,108)}px`)}function N(){c.openVerificationMessageKey=``}function P(e,t=`vibe`){c.drawerOpen!==e&&(c.drawerOpen=e,e&&(c.shouldStickToBottom=!0),D(),e?(j(),window.dispatchEvent(new CustomEvent(`uxbridge:drawer-open`,{detail:{drawer:t}})),window.dispatchEvent(new CustomEvent(`uxbridge:request-selected-layer-change`,{detail:{drawer:t}}))):(N(),c.dropdownOpen=!1,c.codexAccessSelectOpen=!1,c.settingsOpen=!1,Y()))}function ne(){let e=window.UXBridgeActionRail?.renderButtonContent||(({label:e,tooltipClass:t=``}={})=>`
        <span class="bridge-action-rail-button__tooltip${t?` ${t}`:``}" aria-hidden="true">${e||``}</span>
        <svg viewBox="0 0 24 24" aria-hidden="true" class="bridge-action-rail-icon--vibe">
          <g transform="translate(-1.5 0)">
            <path d="M12 4.5 13.95 8.55 18 10.5l-4.05 1.95L12 16.5l-1.95-4.05L6 10.5l4.05-1.95Z"></path>
            <path d="M18.5 3.5l.6 1.4 1.4.6-1.4.6-.6 1.4-.6-1.4-1.4-.6 1.4-.6Z"></path>
            <path d="M17.5 15.5l.8 1.9 1.9.8-1.9.8-.8 1.9-.8-1.9-1.9-.8 1.9-.8Z"></path>
          </g>
        </svg>
      `),t=document.querySelector(`[data-side-actions]`),n=document.createElement(`button`);n.type=`button`,n.className=`bridge-action-rail-button vibe-drawer-toggle`,n.setAttribute(`data-vibe-drawer-toggle`,``),n.setAttribute(`aria-expanded`,`false`),n.setAttribute(`aria-label`,`Vibe`),n.innerHTML=e({icon:`vibe`,label:`Vibe`,tooltipClass:`vibe-drawer-toggle__tooltip`}),n.addEventListener(`click`,()=>{P(!c.drawerOpen)}),window.addEventListener(`uxbridge:drawer-open`,e=>{e.detail?.drawer!==`vibe`&&P(!1,`vibe`)}),t&&t.prepend(n),D()}n.addEventListener(`change`,()=>{y(n.files)});function F(e,t=s||c.page?.id){if(!e)return;let n=u(e,t),r=String(c.project?.id||``).trim().toLowerCase(),i=String(c.page?.id||``).trim().toLowerCase();if(c.project=e,c.page=e.pages.find(e=>e.id===t)||e.pages[0]||null,!c.page)return;let a=c.page.vibe||{},o=String(e.id||``).trim().toLowerCase(),l=String(c.page?.id||``).trim().toLowerCase(),d=new Set((Array.isArray(c.providers)?c.providers:[]).map(e=>String(e.id||``).trim().toLowerCase())),f=String(a.providerId||c.providerId||`codex`).trim().toLowerCase();c.providerId=d.has(f)?f:c.providers[0]?.id||`codex`,c.viewportPreset=String(e.viewerState?.viewportPreset||a.viewportPreset||c.viewportPreset||`mobile`).trim().toLowerCase()||`mobile`,(r!==o||i!==l)&&(c.prompt=``,c.submittingPrompt=``,c.selectedLayerContext&&String(c.selectedLayerContext.pageId||``).trim().toLowerCase()!==l&&(c.selectedLayerContext=null)),c.includeProjectContext=a.includeProjectContext!==!1,c.includePageContext=a.includePageContext!==!1,c.reviewSessionId&&!(Array.isArray(e.editSessions)?e.editSessions:[]).some(e=>e.id===c.reviewSessionId)&&(c.reviewSessionId=``,c.reviewData=null),c.lastProjectSyncSignature!==n&&(c.lastProjectSyncSignature=n,Y());let p=String(e.codexThread?.activePageId||``).trim().toLowerCase();o&&l&&(r!==o||i!==l)&&p!==l&&oe(l)}function I(){return String(w()?.email||``).trim().toLowerCase()}function L(){let e=I();return!e||!c.project?null:(Array.isArray(c.project.editSessions)?c.project.editSessions:[]).find(t=>{let n=String(t.status||``).trim().toLowerCase();return(n===`active`||n===`ready_for_review`)&&String(t.userId||``).trim().toLowerCase()===e&&String(t.pageId||``).trim().toLowerCase()===String(c.page?.id||``).trim().toLowerCase()})||null}function re(){return!c.project||!c.page?[]:(Array.isArray(c.project.editSessions)?c.project.editSessions:[]).filter(e=>String(e.pageId||``).trim().toLowerCase()===String(c.page.id||``).trim().toLowerCase()).sort((e,t)=>{let n=Number(e.updatedAt||e.createdAt||0);return Number(t.updatedAt||t.createdAt||0)-n})}function R(){return c.project?.codexThread||null}function ie(e){let t=String(e?.role||``).trim().toLowerCase(),n=String(e?.userId||``).trim().toLowerCase(),r=I();if(t===`assistant`)return String(e?.metadata?.providerLabel||e?.metadata?.providerId||`Assistant`).trim()||`Assistant`;if(n&&r&&n===r)return`You`;let i=(Array.isArray(c.project?.projectMembers)?c.project.projectMembers:[]).find(e=>String(e?.email||``).trim().toLowerCase()===n)||(Array.isArray(c.project?.availableUsers)?c.project.availableUsers:[]).find(e=>String(e?.email||``).trim().toLowerCase()===n)||null;return i?.fullName?i.fullName:t===`system`?`Project context`:`Project collaborator`}function z(e){let t=String(e?.pageId||``).trim().toLowerCase();if(!t)return`Project`;let n=(Array.isArray(c.project?.pages)?c.project.pages:[]).find(e=>String(e?.id||``).trim().toLowerCase()===t);return n?String(c.page?.id||``).trim().toLowerCase()===t?`${n.name} • Current page`:n.name:`Project`}function B(){let e=R(),t=Array.isArray(e?.messages)?e.messages.slice(-18):[],n=z({pageId:e?.activePageId}),r=String(c.submittingPrompt||``).trim(),i=[];c.loading&&r&&(i.push({id:`__pending_user__`,role:`user`,kind:`prompt`,content:r,pageId:c.page?.id,isPending:!0}),i.push({id:`__pending_assistant__`,role:`assistant`,kind:`response`,content:`${S()?.label||`The selected provider`} is refining the current mobile preview…`,pageId:c.page?.id,metadata:{providerLabel:S()?.label||`Assistant`,providerId:S()?.id||``},isPending:!0}));let a=[...t,...i];return`
      <div class="vibe-panel__chat-surface">
        <div class="vibe-panel__history-head vibe-panel__chat-head">
          <div>
            <p class="vibe-panel__result-eyebrow">Codex thread</p>
            <span>Editing ${d(n)}</span>
          </div>
          <span>${t.length} saved message${t.length===1?``:`s`}</span>
        </div>
        ${a.length?`
              <div class="vibe-panel__chat-list">
                ${a.map(e=>{let t=String(e.role||`system`).trim().toLowerCase()||`system`,n=t===`assistant`,r=m(e),i=ie(e),a=Number(e.createdAt||0)?new Date(Number(e.createdAt||0)).toLocaleString([],{month:`short`,day:`numeric`,hour:`numeric`,minute:`2-digit`}):``;return`
                      <article class="vibe-panel__thread-item vibe-panel__thread-item--${d(t)}${e.isPending?` is-pending`:``}">
                        <div class="vibe-panel__thread-copy">
                          <small>${d(e.content||``)}</small>
                        </div>
                        <div class="vibe-panel__thread-meta${n?` is-assistant`:``}">
                          ${!n&&i!==`You`?`<strong class="vibe-panel__thread-author">${d(i)}</strong>`:``}
                          <div class="vibe-panel__thread-meta-row">
                            <span class="vibe-panel__thread-meta-detail">${d(z(e))}${a?` • ${d(a)}`:``}</span>
                            ${n&&e?.metadata?.verification?`
                                  <button
                                    type="button"
                                    class="vibe-panel__thread-info"
                                    data-vibe-verification-toggle="${d(r)}"
                                    aria-label="${c.openVerificationMessageKey===r?`Hide scope verification`:`Show scope verification`}"
                                    aria-expanded="${c.openVerificationMessageKey===r?`true`:`false`}"
                                  >
                                    <svg viewBox="0 0 24 24" aria-hidden="true">
                                      <circle cx="12" cy="12" r="8.5"></circle>
                                      <path d="M12 10.2v5.1"></path>
                                      <circle cx="12" cy="7.1" r="0.9" fill="currentColor" stroke="none"></circle>
                                    </svg>
                                  </button>
                                `:``}
                          </div>
                        </div>
                        ${Array.isArray(e?.metadata?.assets)&&e.metadata.assets.length?`
                              <div class="vibe-panel__thread-assets">
                                ${e.metadata.assets.map(e=>`
                                      <span class="vibe-panel__thread-asset">
                                        ${d(String(e?.fileName||e?.name||`Attachment`).trim()||`Attachment`)}
                                      </span>
                                    `).join(``)}
                              </div>
                            `:``}
                        ${n?h(e?.metadata?.verification,r):``}
                      </article>
                    `}).join(``)}
              </div>
            `:`<p class="vibe-panel__empty vibe-panel__empty--thread">Start a Vibe session, choose Codex or Claude, and describe the UI change you want in the mobile preview. This thread will keep the conversation going as you refine the page.</p>`}
      </div>
    `}function V(){return!!(c.project?.canManageSharing||c.project?.isOwner||c.project?.projectRole===`admin`)}function H(e){if(!c.project||!e)return null;let t=String(e.userId||``).trim().toLowerCase();return[...Array.isArray(c.project.projectMembers)?c.project.projectMembers:[],...Array.isArray(c.project.availableUsers)?c.project.availableUsers:[]].find(e=>String(e?.email||``).trim().toLowerCase()===t)||null}function U(e){let t=I(),n=String(e?.userId||``).trim().toLowerCase(),r=H(e);return t&&n===t?`You`:r?.fullName||e?.userId||`Project member`}function W(e){let t=String(e||``).split(`
`).map(e=>e.trim()).find(Boolean);return t?t.replace(/^create\s+/i,``).replace(/^build\s+/i,``).replace(/^design\s+/i,``).replace(/^a\s+/i,``).replace(/^an\s+/i,``).slice(0,48).trim()||`New Page`:``}function G(e){return i.find(t=>t.value===e)?.label||i[1].label}function K(){return!c.reviewSessionId||!c.project?null:(Array.isArray(c.project.editSessions)?c.project.editSessions:[]).find(e=>e.id===c.reviewSessionId)||null}function q(){let e=K();if(!e)return``;let t=c.reviewData,n=c.project?.pages?.find(t=>t.id===e.pageId);return`
      <section class="vibe-panel__review-card vibe-panel__review-card--detail">
        <div class="vibe-panel__history-head">
          <div>
            <p class="vibe-panel__result-eyebrow">Review session</p>
            <h3>${d(U(e))}</h3>
          </div>
          <button type="button" class="vibe-panel__button vibe-panel__button--ghost" data-vibe-close-review>Done</button>
        </div>
        <div class="vibe-panel__review-copy">
          <strong>${d(n?.name||`Project-wide session`)}</strong>
          <span>${d(e.branchName||`Session branch`)}</span>
        </div>
        ${c.reviewLoading?`<p class="vibe-panel__empty">Loading the real git diff for this session…</p>`:t?`
                <div class="vibe-panel__review-summary">
                  <span>${t.totals?.files||0} file${t.totals?.files===1?``:`s`}</span>
                  <span>+${t.totals?.added||0}</span>
                  <span>-${t.totals?.removed||0}</span>
                  <span>${d(t.baseBranch||`main`)} → ${d(t.branchName||e.branchName||`branch`)}</span>
                </div>
                ${Array.isArray(t.files)&&t.files.length?`
                      <div class="vibe-panel__review-files">
                        ${t.files.map(e=>`
                              <article class="vibe-panel__review-file">
                                <div class="vibe-panel__review-copy">
                                  <strong>${d(e.path||`Changed file`)}</strong>
                                  <span>${d(e.status||`M`)} • +${Number(e.added||0)} / -${Number(e.removed||0)}</span>
                                </div>
                              </article>
                            `).join(``)}
                      </div>
                    `:`<p class="vibe-panel__empty">No changed files were detected for this session yet.</p>`}
                <div class="vibe-panel__diff">
                  <p class="vibe-panel__review-label">Patch preview</p>
                  <pre class="vibe-panel__diff-pre">${d(t.patch||`No patch output available.`)}</pre>
                </div>
              `:`<p class="vibe-panel__empty">Open a session review to inspect changed files and patch details before merging.</p>`}
        ${V()?`<div class="vibe-panel__result-actions"><button type="button" class="vibe-panel__button vibe-panel__button--secondary" data-vibe-merge-session="${d(e.id)}" ${c.applying?`disabled`:``}>${c.applying?`Merging...`:`Merge session`}</button></div>`:``}
      </section>
    `}function J({pageName:e,projectName:t,projectReviewSessions:n,pageSessions:r,reviewSessions:a,inProgressSessions:o,canReviewSessions:s,providerStatus:l}){return`
      <section class="vibe-panel__settings-panel">
        <div class="vibe-panel__settings-head">
          <div>
            <p class="vibe-panel__result-eyebrow">Vibe settings</p>
            <h3>Project controls</h3>
          </div>
          <button type="button" class="vibe-panel__button vibe-panel__button--ghost" data-vibe-settings-toggle>Done</button>
        </div>

        <div class="vibe-panel__control-rail">
          <div class="vibe-panel__workspace-card">
            <div class="vibe-panel__workspace-head">
              <div class="vibe-panel__workspace-copy">
                <p class="vibe-panel__result-eyebrow">Codex workspace</p>
                <h3>${d(t)}</h3>
                <p>Configuration, permissions, and review controls for the shared Vibe Design workflow.</p>
              </div>
              <div class="vibe-panel__context-summary">
                <span class="vibe-panel__context-pill">${d((c.project?.visibility||`private`).replace(/_/g,` `))}</span>
                <span class="vibe-panel__context-pill is-accent">${d((c.project?.codexAccessMode||`contributors`).replace(/_/g,` `))}</span>
              </div>
            </div>

            <div class="vibe-panel__workspace-grid">
              <div class="vibe-panel__meta-card">
                <span>Codex project context</span>
                <strong>${d(c.project?.codexContextId||`Pending`)}</strong>
              </div>
              <div class="vibe-panel__meta-card">
                <span>Current page</span>
                <strong>${d(e)}</strong>
              </div>
              <div class="vibe-panel__meta-card">
                <span>Hosted provider</span>
                <strong>${l.tone===`connected`?`Ready`:`Needs setup`}</strong>
                <small>${d(l.text)}</small>
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
                            <strong>${d(G(c.project?.codexAccessMode||`contributors`))}</strong>
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
                                <strong>${d(e.label)}</strong>
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
                      <span>${n.length} ready</span>
                    </div>
                    ${n.length?`
                          <div class="vibe-panel__review-list">
                            ${n.map(e=>{let t=c.project?.pages?.find(t=>t.id===e.pageId);return`
                                  <article class="vibe-panel__review-item">
                                    <div class="vibe-panel__review-copy">
                                      <strong>${d(U(e))}</strong>
                                      <span>${d(t?.name||`Project-wide session`)} • ${d(e.branchName||`Scaffold branch`)}</span>
                                    </div>
                                    <div class="vibe-panel__review-actions">
                                      <button type="button" class="vibe-panel__button vibe-panel__button--ghost" data-vibe-open-review="${d(e.id)}">Review</button>
                                      <button type="button" class="vibe-panel__button vibe-panel__button--secondary" data-vibe-merge-session="${d(e.id)}">Merge</button>
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
                <h3>${d(e)}</h3>
              </div>
              <span class="vibe-panel__section-tag">${r.length} session${r.length===1?``:`s`}</span>
            </div>

            <div class="vibe-panel__review-card">
              ${a.length?`
                    <div class="vibe-panel__review-group">
                      <span class="vibe-panel__review-label">Ready for review</span>
                      <div class="vibe-panel__review-list">
                        ${a.map(e=>`
                              <article class="vibe-panel__review-item">
                                <div class="vibe-panel__review-copy">
                                  <strong>${d(U(e))}</strong>
                                  <span>${d(e.branchName||`Scaffold branch`)}</span>
                                </div>
                                ${s?`
                                      <div class="vibe-panel__review-actions">
                                        <button type="button" class="vibe-panel__button vibe-panel__button--ghost" data-vibe-open-review="${d(e.id)}">Review</button>
                                        <button type="button" class="vibe-panel__button vibe-panel__button--secondary" data-vibe-merge-session="${d(e.id)}">Merge</button>
                                      </div>
                                    `:`<button type="button" class="vibe-panel__button vibe-panel__button--ghost" data-vibe-open-review="${d(e.id)}">Review</button>`}
                              </article>
                            `).join(``)}
                      </div>
                    </div>
                  `:``}
              ${o.length?`
                    <div class="vibe-panel__review-group">
                      <span class="vibe-panel__review-label">In progress</span>
                      <div class="vibe-panel__review-list">
                        ${o.map(e=>`
                              <article class="vibe-panel__review-item">
                                <div class="vibe-panel__review-copy">
                                  <strong>${d(U(e))}</strong>
                                  <span>${d(e.branchName||`Scaffold branch`)}</span>
                                </div>
                              </article>
                            `).join(``)}
                      </div>
                    </div>
                  `:a.length?``:`<p class="vibe-panel__empty">No active or review-ready sessions for this page yet.</p>`}
            </div>

            ${q()}

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
          </div>
        </div>
      </section>
    `}function Y(){let t=e.querySelector(`[data-vibe-thread]`),n=c.shouldStickToBottom||A(t),r=!n&&t?t.scrollTop:null,i=E(),a=c.page?.name||`Page`,o=c.project?.name||`Project`,s=c.page?.vibe||{},l=L(),u=Array.isArray(c.project?.editSessions)?c.project.editSessions:[],f=re(),p=u.filter(e=>String(e.status||``).trim().toLowerCase()===`ready_for_review`).sort((e,t)=>Number(t.updatedAt||t.createdAt||0)-Number(e.updatedAt||e.createdAt||0)),m=f.filter(e=>String(e.status||``).trim().toLowerCase()===`ready_for_review`),h=f.filter(e=>String(e.status||``).trim().toLowerCase()===`active`),g=!!(l||c.project?.canCreateEditSession),_=String(l?.status||``).trim().toLowerCase(),v=_?_===`active`:!!g,y=V(),b=S(),x=c.providers.filter(e=>e?.isConfigured),C=x.length>1,w=te(b),T=!c.loading&&v&&!!c.prompt.trim(),D=c.settingsOpen?J({pageName:a,projectName:o,projectReviewSessions:p,pageSessions:f,reviewSessions:m,inProgressSessions:h,canReviewSessions:y,providerStatus:i}):``,ScopePill=xe(c.selectedLayerContext);e.innerHTML=`
      <div class="vibe-panel__inner">
        <div class="vibe-panel__header">
          <div class="vibe-panel__header-copy">
            <p class="vibe-panel__eyebrow">Vibe</p>
            <h2>${d(a)}</h2>
          </div>
          <div class="vibe-panel__header-actions">
            <button class="vibe-panel__close" type="button" data-vibe-settings-toggle aria-label="${c.settingsOpen?`Close Vibe settings`:`Open Vibe settings`}">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M12 3.75v2.1"></path>
                <path d="M12 18.15v2.1"></path>
                <path d="m5.64 5.64 1.48 1.48"></path>
                <path d="m16.88 16.88 1.48 1.48"></path>
                <path d="M3.75 12h2.1"></path>
                <path d="M18.15 12h2.1"></path>
                <path d="m5.64 18.36 1.48-1.48"></path>
                <path d="m16.88 7.12 1.48-1.48"></path>
                <circle cx="12" cy="12" r="3.35"></circle>
              </svg>
            </button>
            <button class="vibe-panel__close" type="button" data-vibe-close aria-label="Close vibe coding">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M6 6 18 18"></path>
                <path d="M18 6 6 18"></path>
              </svg>
            </button>
          </div>
        </div>

        ${c.settingsOpen?`
              <div class="vibe-panel__body vibe-panel__body--settings">
                ${D}
              </div>
            `:`
              <div class="vibe-panel__thread" data-vibe-thread>
                ${B()}
              </div>
            `}

        <div class="vibe-panel__composer">
          ${ee()}
          <div class="comments-panel__field">
            <div class="comments-panel__input-wrap">
              ${ScopePill}
              <textarea
                class="comments-panel__prompt vibe-panel__prompt"
                data-vibe-prompt
                placeholder="Type a message"
              >${d(c.prompt)}</textarea>
              <button
                type="button"
                class="comments-panel__attach vibe-panel__attach"
                data-vibe-attach
                aria-label="Attach files"
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M16.5 6.5 9 14a3 3 0 1 0 4.24 4.24l7-7a5 5 0 0 0-7.07-7.07l-8 8"></path>
                </svg>
              </button>
              ${C?`
                    <button
                      type="button"
                      class="vibe-panel__model-chip vibe-panel__model-chip--button"
                      data-vibe-provider-toggle
                      aria-expanded="${c.dropdownOpen?`true`:`false`}"
                      aria-label="Choose Vibe model"
                    >
                      <span>${d(w)}</span>
                      <svg viewBox="0 0 24 24" aria-hidden="true">
                        <path d="m7 10 5 5 5-5"></path>
                      </svg>
                    </button>
                  `:`<span class="vibe-panel__model-chip" aria-label="Current Vibe model">${d(w)}</span>`}
              <button
                type="button"
                class="comments-panel__send vibe-panel__send"
                data-vibe-generate
                aria-label="${c.loading?`Sending prompt`:`Send prompt`}"
                ${T?``:`disabled`}
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M12 5 12 19"></path>
                  <path d="M6 11 12 5 18 11"></path>
                </svg>
              </button>
            </div>
          </div>

          ${c.error?`<p class="vibe-panel__status vibe-panel__status--error">${d(c.error)}</p>`:s.error?`<p class="vibe-panel__status vibe-panel__status--error">${d(s.error)}</p>`:``}
          ${C?`
                <div class="vibe-panel__provider-select vibe-panel__provider-select--composer">
                  <div class="vibe-panel__provider-menu${c.dropdownOpen?` is-open`:``}" role="listbox">
                    ${x.map(e=>`
                          <button
                            type="button"
                            class="vibe-panel__provider-option${c.providerId===e.id?` is-active`:``}"
                            data-vibe-provider-option="${d(e.id)}"
                            role="option"
                            aria-selected="${c.providerId===e.id?`true`:`false`}"
                          >
                            <strong>${d(e.label)}</strong>
                            <small>${d(e.model||e.helperCopy||e.label)}</small>
                          </button>
                        `).join(``)}
                  </div>
                </div>
              `:``}
        </div>
      </div>
    `,ae();let O=e.querySelector(`[data-vibe-thread]`);O?.addEventListener(`scroll`,()=>{c.shouldStickToBottom=A(O)}),n?(window.requestAnimationFrame(()=>{j()}),c.shouldStickToBottom=!0):O&&r!==null&&window.requestAnimationFrame(()=>{O.scrollTop=r})}function ae(){let t=e.querySelector(`[data-vibe-prompt]`);M(t),e.querySelector(`[data-vibe-close]`)?.addEventListener(`click`,()=>{P(!1)}),e.querySelectorAll(`[data-vibe-settings-toggle]`).forEach(e=>{e.addEventListener(`click`,()=>{c.settingsOpen=!c.settingsOpen,c.codexAccessSelectOpen=!1,c.dropdownOpen=!1,Y()})}),e.querySelector(`[data-vibe-provider-toggle]`)?.addEventListener(`click`,()=>{c.dropdownOpen=!c.dropdownOpen,Y()}),e.querySelectorAll(`[data-vibe-verification-toggle]`).forEach(e=>{e.addEventListener(`click`,()=>{let t=String(e.getAttribute(`data-vibe-verification-toggle`)||``).trim();c.openVerificationMessageKey=c.openVerificationMessageKey===t?``:t,Y()})}),e.querySelector(`[data-vibe-attach]`)?.addEventListener(`click`,()=>{x()}),e.querySelectorAll(`[data-vibe-provider-option]`).forEach(e=>{e.addEventListener(`click`,()=>{c.providerId=String(e.getAttribute(`data-vibe-provider-option`)||``).trim().toLowerCase()||c.providerId,c.dropdownOpen=!1,Y()})}),e.querySelectorAll(`[data-vibe-asset-remove]`).forEach(e=>{e.addEventListener(`click`,()=>{b(e.getAttribute(`data-vibe-asset-remove`)||``)})}),e.querySelector(`[data-vibe-layer-pill-dismiss]`)?.addEventListener(`click`,()=>{c.selectedLayerContext=null,Y()}),e.querySelector(`[data-vibe-codex-access-toggle]`)?.addEventListener(`click`,()=>{c.codexAccessSelectOpen=!c.codexAccessSelectOpen,Y()}),e.querySelectorAll(`[data-vibe-codex-access-option]`).forEach(e=>{e.addEventListener(`click`,()=>{ce(e.getAttribute(`data-vibe-codex-access-option`)||``)})}),t?.addEventListener(`input`,n=>{M(t),c.prompt=n.currentTarget.value;let r=e.querySelector(`[data-vibe-generate]`);r&&(r.disabled=c.loading||!(String(L()?.status||``).trim().toLowerCase()?String(L()?.status||``).trim().toLowerCase()===`active`:L()||c.project?.canCreateEditSession)||!c.prompt.trim())}),t?.addEventListener(`keydown`,e=>{e.isComposing||e.key===`Enter`&&!e.shiftKey&&(e.preventDefault(),Z())}),e.querySelectorAll(`[data-vibe-context]`).forEach(t=>{t.addEventListener(`change`,()=>{c.includeProjectContext=e.querySelector(`[data-vibe-context="project"]`)?.checked!==!1,c.includePageContext=e.querySelector(`[data-vibe-context="page"]`)?.checked!==!1})}),e.querySelector(`[data-vibe-generate]`)?.addEventListener(`click`,()=>{Z()}),e.querySelector(`[data-vibe-create-page]`)?.addEventListener(`click`,()=>{se()}),e.querySelectorAll(`[data-vibe-session-status]`).forEach(e=>{e.addEventListener(`click`,()=>{le(e.getAttribute(`data-vibe-session-status`)||``)})}),e.querySelectorAll(`[data-vibe-merge-session]`).forEach(e=>{e.addEventListener(`click`,()=>{ue(e.getAttribute(`data-vibe-merge-session`)||``)})}),e.querySelectorAll(`[data-vibe-open-review]`).forEach(e=>{e.addEventListener(`click`,()=>{de(e.getAttribute(`data-vibe-open-review`)||``)})}),e.querySelector(`[data-vibe-close-review]`)?.addEventListener(`click`,()=>{c.reviewSessionId=``,c.reviewData=null,Y()}),e.querySelector(`[data-vibe-apply]`)?.addEventListener(`click`,()=>{Q()}),e.querySelectorAll(`[data-vibe-restore]`).forEach(e=>{e.addEventListener(`click`,()=>{pe(e.getAttribute(`data-vibe-restore`))})}),e.querySelectorAll(`[data-vibe-apply-version]`).forEach(e=>{e.addEventListener(`click`,()=>{Q(e.getAttribute(`data-vibe-apply-version`))})})}async function X(){if(!c.project||!c.page)return null;let e=L();if(e)return e;if(!c.project.canCreateEditSession||c.sessionCreating)return null;c.sessionCreating=!0,c.error=``,Y();try{let e=await fetch(t,{method:`POST`,credentials:`include`,headers:{"Content-Type":`application/json`},body:JSON.stringify({action:`createEditSession`,project:c.project.id,page:c.page.id,source:`hosted-vibe`})}),n=await e.json().catch(()=>({}));if(!e.ok||!n?.ok||!n?.project)throw Error(n?.error||`Unable to start a Codex edit session for this page.`);return F(n.project,c.page.id),window.dispatchEvent(new CustomEvent(`uxbridge:project-runtime-sync`,{detail:{project:n.project}})),n.session||L()}catch(e){return c.error=e instanceof Error?e.message:`Unable to start a Codex edit session for this page.`,Y(),null}finally{c.sessionCreating=!1,Y()}}async function oe(e=``){if(!(!c.project||!e))try{let n=await fetch(t,{method:`POST`,credentials:`include`,headers:{"Content-Type":`application/json`},body:JSON.stringify({action:`setCodexActivePage`,project:c.project.id,page:e})}),r=await n.json().catch(()=>({}));if(!n.ok||!r?.ok||!r?.project)return;c.project=r.project,Y()}catch{}}async function se(){if(!(!c.project||c.pageCreating||!c.prompt.trim())&&await X()){c.pageCreating=!0,c.error=``,Y();try{let e=await fetch(t,{method:`POST`,credentials:`include`,headers:{"Content-Type":`application/json`},body:JSON.stringify({action:`createPageFromCodex`,project:c.project.id,name:W(c.prompt)})}),n=await e.json().catch(()=>({}));if(!e.ok||!n?.ok||!n?.page?.launchUrl)throw Error(n?.error||`Unable to create a new page from this prompt.`);window.location.href=n.page.launchUrl}catch(e){c.error=e instanceof Error?e.message:`Unable to create a new page from this prompt.`,Y()}finally{c.pageCreating=!1,Y()}}}async function ce(e=``){if(!(!c.project||!e)){c.sessionCreating=!0,c.error=``,c.codexAccessSelectOpen=!1,Y();try{let n=await fetch(t,{method:`POST`,credentials:`include`,headers:{"Content-Type":`application/json`},body:JSON.stringify({action:`updateProjectPrivacy`,project:c.project.id,codexAccessMode:e})}),r=await n.json().catch(()=>({}));if(!n.ok||!r?.ok||!r?.project)throw Error(r?.error||`Unable to update Codex access settings.`);F(r.project,c.page.id),window.dispatchEvent(new CustomEvent(`uxbridge:project-runtime-sync`,{detail:{project:r.project}}))}catch(e){c.error=e instanceof Error?e.message:`Unable to update Codex access settings.`,Y()}finally{c.sessionCreating=!1,Y()}}}async function le(e=``){let n=L();if(!(!c.project||!n||!e)){c.sessionCreating=!0,c.error=``,Y();try{let r=await fetch(t,{method:`POST`,credentials:`include`,headers:{"Content-Type":`application/json`},body:JSON.stringify({action:`updateEditSessionStatus`,project:c.project.id,sessionId:n.id,status:e})}),i=await r.json().catch(()=>({}));if(!r.ok||!i?.ok||!i?.project)throw Error(i?.error||`Unable to update the edit session status.`);F(i.project,c.page.id),window.dispatchEvent(new CustomEvent(`uxbridge:project-runtime-sync`,{detail:{project:i.project}}))}catch(e){c.error=e instanceof Error?e.message:`Unable to update the edit session status.`,Y()}finally{c.sessionCreating=!1,Y()}}}async function ue(e=``){if(!(!c.project||!e||c.applying)){c.applying=!0,c.error=``,Y();try{let n=await fetch(t,{method:`POST`,credentials:`include`,headers:{"Content-Type":`application/json`},body:JSON.stringify({action:`mergeEditSession`,project:c.project.id,sessionId:e})}),r=await n.json().catch(()=>({}));if(!n.ok||!r?.ok||!r?.project)throw Error(r?.error||`Unable to merge this edit session.`);c.reviewSessionId===e&&(c.reviewSessionId=``,c.reviewData=null),F(r.project,c.page.id),window.dispatchEvent(new CustomEvent(`uxbridge:project-runtime-sync`,{detail:{project:r.project}}))}catch(e){c.error=e instanceof Error?e.message:`Unable to merge this edit session.`,Y()}finally{c.applying=!1,Y()}}}async function de(e=``){if(!(!c.project||!e||c.reviewLoading)){c.reviewSessionId=e,c.reviewData=null,c.reviewLoading=!0,c.error=``,Y();try{let n=await fetch(t,{method:`POST`,credentials:`include`,headers:{"Content-Type":`application/json`},body:JSON.stringify({action:`getEditSessionReview`,project:c.project.id,sessionId:e})}),r=await n.json().catch(()=>({}));if(!n.ok||!r?.ok||!r?.review)throw Error(r?.error||`Unable to load the edit-session review.`);c.reviewData=r.review}catch(e){c.error=e instanceof Error?e.message:`Unable to load the edit-session review.`}finally{c.reviewLoading=!1,Y()}}}async function fe(e=``){let n=L(),r=String(e||``).trim(),i=c.pendingAssets.map(e=>({fileName:e.fileName,contentType:e.contentType,kind:e.kind,sizeBytes:e.sizeBytes,previewUrl:e.previewUrl,dataBase64:e.dataBase64})),a=await fetch(t,{method:`POST`,credentials:`include`,headers:{"Content-Type":`application/json`},body:JSON.stringify({action:`generateVibeContent`,project:c.project.id,page:c.page.id,providerId:c.providerId,viewportPreset:c.viewportPreset,prompt:r,includeProjectContext:c.includeProjectContext,includePageContext:c.includePageContext,sessionId:n?.id||``,attachmentPayloads:i,selectedLayer:c.selectedLayerContext&&String(c.selectedLayerContext.pageId||``).trim().toLowerCase()===String(c.page?.id||``).trim().toLowerCase()?c.selectedLayerContext:null})}),o=await a.json().catch(()=>({}));if(!a.ok||!o?.ok||!o?.project)throw Error(o?.error||`The hosted Vibe provider could not generate page content.`);c.providers=Array.isArray(o.vibeProviders)&&o.vibeProviders.length?o.vibeProviders:c.providers,F(o.project,c.page.id),window.dispatchEvent(new CustomEvent(`uxbridge:project-runtime-sync`,{detail:{project:o.project}})),await Q(),c.pendingAssets=[]}async function Z(){let t=String(c.prompt||``).trim(),n=e.querySelector(`[data-vibe-prompt]`);if(!(!c.project||!c.page||!t||c.loading)){if(!T()){c.error=`${S()?.label||`Selected provider`} is not configured for hosted vibe coding yet.`,Y();return}c.loading=!0,c.error=``,c.submittingPrompt=t,c.prompt=``,n&&(n.value=``),Y();try{if(!await X()){c.submittingPrompt=``,c.prompt=t;return}await fe(t),c.submittingPrompt=``}catch(e){c.submittingPrompt=``,c.prompt=t,c.error=e instanceof Error?e.message:`Unable to generate page content.`,Y()}finally{c.loading=!1,Y()}}}async function Q(e=``){if(!(!c.project||!c.page||c.applying)){c.applying=!0,c.error=``,Y();try{let n=await fetch(t,{method:`POST`,credentials:`include`,headers:{"Content-Type":`application/json`},body:JSON.stringify({action:`applyVibeContent`,project:c.project.id,page:c.page.id,...e?{draftGeneratedAt:Number(e)||0}:{}})}),r=await n.json().catch(()=>({}));if(!n.ok||!r?.ok||!r?.project)throw Error(r?.error||`Unable to apply generated page content.`);c.providers=Array.isArray(r.vibeProviders)&&r.vibeProviders.length?r.vibeProviders:c.providers,F(r.project,c.page.id),window.dispatchEvent(new CustomEvent(`uxbridge:project-runtime-sync`,{detail:{project:r.project}}))}catch(e){c.error=e instanceof Error?e.message:`Unable to apply generated page content.`,Y()}finally{c.applying=!1,Y()}}}async function pe(e=``){if(!(!c.project||!c.page||c.restoring)){c.restoring=!0,c.error=``,Y();try{let n=await fetch(t,{method:`POST`,credentials:`include`,headers:{"Content-Type":`application/json`},body:JSON.stringify({action:`restoreVibeDraft`,project:c.project.id,page:c.page.id,draftGeneratedAt:Number(e)||0})}),r=await n.json().catch(()=>({}));if(!n.ok||!r?.ok||!r?.project)throw Error(r?.error||`Unable to restore this version.`);c.providers=Array.isArray(r.vibeProviders)&&r.vibeProviders.length?r.vibeProviders:c.providers,F(r.project,c.page.id),window.dispatchEvent(new CustomEvent(`uxbridge:project-runtime-sync`,{detail:{project:r.project}}))}catch(e){c.error=e instanceof Error?e.message:`Unable to restore this version.`,Y()}finally{c.restoring=!1,Y()}}}async function me(){try{let e=await fetch(`${t}?project=${encodeURIComponent(o)}`,{credentials:`include`,cache:`no-store`}),n=await e.json().catch(()=>({}));if(!e.ok||!n?.ok||!n?.project)return;c.providers=Array.isArray(n.vibeProviders)&&n.vibeProviders.length?n.vibeProviders:$(),c.currentUser=n.currentUser||w(),F(n.project,s)}catch{c.providers=$(),Y()}}function $(){return[{id:`codex`,label:`Codex`,model:l.codex,availableVia:`server`,credentialMode:`organization-managed`,helperCopy:`Uses the hosted OpenAI Codex integration to edit the mobile preview container for the current page.`,isConfigured:!1},{id:`claude`,label:`Claude`,model:l.claude,availableVia:`server`,credentialMode:`organization-managed`,helperCopy:`Uses the hosted Anthropic Claude integration to edit the mobile preview container for the current page.`,isConfigured:!1}]}document.addEventListener(`click`,t=>{!c.codexAccessSelectOpen&&!c.dropdownOpen||e.contains(t.target)||(c.codexAccessSelectOpen=!1,c.dropdownOpen=!1,Y())}),document.addEventListener(`keydown`,e=>{if(e.key===`Escape`){if(c.codexAccessSelectOpen){c.codexAccessSelectOpen=!1,Y();return}if(c.settingsOpen){c.settingsOpen=!1,Y();return}c.drawerOpen&&P(!1)}}),window.addEventListener(`uxbridge:project-page-sync`,e=>{let t=e.detail?.project,n=e.detail?.page;!t||!n||t.id!==o||(c.providers.length||(c.providers=$()),F(t,n.id))}),window.addEventListener(`uxbridge:selected-layer-change`,e=>{let t=String(e.detail?.pageId||``).trim().toLowerCase(),n=C(e.detail?.selectedLayer),r=String(c.page?.id||s||``).trim().toLowerCase();!r||t!==r||(c.selectedLayerContext=n,c.drawerOpen&&Y())}),window.addEventListener(`uxbridge:preview-viewport-change`,e=>{let t=String(e.detail?.viewportPreset||``).trim().toLowerCase();t&&(c.viewportPreset=t)}),window.addEventListener(`uxbridge:user-ready`,e=>{c.currentUser=e.detail||null,Y()}),c.providers=$(),ne(),Y(),r?.addEventListener(`click`,()=>{c.drawerOpen&&P(!1)}),window.addEventListener(`resize`,k),document.querySelectorAll(`[data-vibe-launch-provider]`).forEach(e=>{e.addEventListener(`click`,()=>{O(e.getAttribute(`data-vibe-launch-provider`)||``)})}),me()})();