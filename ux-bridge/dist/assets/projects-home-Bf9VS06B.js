(function(){let e=`ux-bridge-project-comment-summary`,t=`ux-bridge-project-thumbnail-renders`,n=1440*60*1e3,r=1440,i=1047,a=document.querySelector(`[data-projects-root]`),o=document.querySelector(`[data-projects-hero-actions]`),s=document.createElement(`div`),c=document.createElement(`div`),l=document.createElement(`div`),u=0,d=0,f=0,p=null;if(!a)return;s.className=`bridge-projects__thumbnail-generator`,s.setAttribute(`aria-hidden`,`true`),document.body.append(s),c.className=`bridge-projects__menu-host`,document.body.append(c),l.className=`bridge-projects__modal-host`,document.body.append(l);let m={loading:!0,projects:[],canCreateProjects:!1,canDuplicateProjects:!1,status:``,tone:`neutral`,toastClosing:!1,creating:!1,commentSummaryByProject:new Map,openMenuProjectId:``,openMenuPosition:null,ownerPickerProjectId:``,ownerPickerPosition:null,ownerPickerSearchQuery:``,updatingOwnerProjectId:``,editingProjectId:``,renamingProjectId:``,pendingProjectNameById:{},pendingProjectDescriptionById:{},dirtyProjectById:{},deleteModalProjectId:``,deletingProjectId:``,exitingProjectId:``,highlightedProjectId:``,summaryRefreshTimer:0,summaryRequestToken:0,thumbnailActiveProjectId:``,thumbnailRequestToken:``,thumbnailFailures:new Set,thumbnailRefreshStarted:!1,loadedThumbnailDataByProject:new Map,recentProjectOpenById:{},sortKey:`recentOpen`,sortDirection:`desc`,sortPresetMenuOpen:!1,searchQuery:``,availableUsers:[],selectedProjectIds:[],bulkDuplicatingProjects:!1,bulkDeleteProjectIds:[],bulkDeletingProjects:!1};function h(){if(window.uxBridgeUser?.email)return window.uxBridgeUser;try{let e=sessionStorage.getItem(`ux-bridge-user`);return e?JSON.parse(e):null}catch{return null}}function g(){return`ux-bridge-project-recent-open:${String(h()?.email||`anonymous`).trim().toLowerCase()}`}function _(e,t){return`ux-bridge-comments-seen:${String(h()?.email||`anonymous`).trim().toLowerCase()}:${e}:${t}`}function v(e,t){try{let n=localStorage.getItem(_(e,t));if(!n)return{lastSeenCommentId:``,lastSeenAt:0};let r=JSON.parse(n);return r&&typeof r==`object`?{lastSeenCommentId:String(r.lastSeenCommentId||``).trim(),lastSeenAt:Number(r.lastSeenAt)||0}:{lastSeenCommentId:String(n||``).trim(),lastSeenAt:0}}catch{return{lastSeenCommentId:``,lastSeenAt:0}}}function y(){try{let e=localStorage.getItem(g());if(!e)return{};let t=JSON.parse(e);return t&&typeof t==`object`?t:{}}catch{return{}}}function b(e){try{localStorage.setItem(g(),JSON.stringify(e))}catch{}}function x(e=``){return Number(m.recentProjectOpenById?.[e])||0}function S(e={}){return!e||typeof e!=`object`?{}:Object.fromEntries(Object.entries(e).map(([e,t])=>[String(e||``).trim(),Number(t)||0]).filter(([e,t])=>e&&t>0))}function C(...e){let t={};return e.forEach(e=>{let n=S(e);Object.entries(n).forEach(([e,n])=>{t[e]=Math.max(Number(t[e])||0,Number(n)||0)})}),t}function ee(e={},t={}){let n=S(e),r=S(t),i=Object.keys(n),a=Object.keys(r);return i.length===a.length?i.every(e=>Number(n[e])===Number(r[e])):!1}function te(e={}){let t=S(e);m.recentProjectOpenById=t,b(t)}function ne(e={},{useBeacon:t=!1}={}){let n=S(e);if(!Object.keys(n).length)return;let r=JSON.stringify({action:`syncRecentOpenMap`,recentProjectOpenById:n});if(t&&navigator.sendBeacon){let e=new Blob([r],{type:`application/json`});navigator.sendBeacon(`/api/projects`,e);return}fetch(`/api/projects`,{method:`POST`,credentials:`include`,headers:{"Content-Type":`application/json`},body:r,keepalive:t}).catch(()=>{})}function re(e=``,t=Date.now(),{useBeacon:n=!1}={}){let r=String(e||``).trim();if(!r)return;let i=JSON.stringify({action:`markRecentOpen`,project:r,openedAt:t});if(n&&navigator.sendBeacon){let e=new Blob([i],{type:`application/json`});navigator.sendBeacon(`/api/projects`,e);return}fetch(`/api/projects`,{method:`POST`,credentials:`include`,headers:{"Content-Type":`application/json`},body:i,keepalive:n}).catch(()=>{})}function ie(e=``,{useBeacon:t=!1}={}){if(!e)return;let n=Date.now();te(C(m.recentProjectOpenById,{[e]:n})),re(e,n,{useBeacon:t})}function w(){return{totalComments:0,unreadComments:0,unreadMentions:0}}function ae(e){let t=E(h()?.email);return!e||!t?!1:t===E(e.ownerEmail)?!0:(Array.isArray(e.projectMembers)?e.projectMembers:[]).some(e=>{let n=E(e?.email),r=String(e?.status||``).trim().toLowerCase();return n===t&&(r===`active`||r===`pending`)})}function T(e){return String(e??``).replaceAll(`&`,`&amp;`).replaceAll(`<`,`&lt;`).replaceAll(`>`,`&gt;`).replaceAll(`"`,`&quot;`)}function oe(e){return String(e??``).replace(/[.*+?^${}()|[\]\\]/g,`\\$&`)}function E(e){return String(e||``).trim().toLowerCase()}function D(e,t){let n=String(e??``),r=String(t||``).trim();if(!r)return T(n);let i=RegExp(`(${oe(r)})`,`gi`);return T(n).replace(i,`<mark class="bridge-table-search__highlight">$1</mark>`)}function se(e,t){let n=String(t||``).trim().toLowerCase();return n?[e.name,e.description,e.ownerName].map(e=>String(e||``).toLowerCase()).some(e=>e.includes(n)):!0}function ce(e,t){let n=String(t||``).trim().toLowerCase();return n?[e.fullName,e.email,e.role].map(e=>String(e||``).toLowerCase()).some(e=>e.includes(n)):!0}function le(e=null,t=null){window.requestAnimationFrame(()=>{let n=a.querySelector(`[data-project-search]`);n instanceof HTMLInputElement&&(n.focus(),typeof e==`number`&&typeof t==`number`&&n.setSelectionRange(e,t))})}function ue(e){let t=String(e||``).trim().split(/\s+/).filter(Boolean);return t.length?t.slice(0,2).map(e=>e[0]?.toUpperCase()||``).join(``):`UX`}function de(e){return e===`error`?`
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
    `}function O(){if(window.clearTimeout(u),window.clearTimeout(d),!m.status){m.toastClosing=!1;return}m.toastClosing=!0,J(),d=window.setTimeout(()=>{m.status=``,m.tone=`neutral`,m.toastClosing=!1,J()},260)}function fe(e=``){window.clearTimeout(f),m.highlightedProjectId=e,e&&(f=window.setTimeout(()=>{m.highlightedProjectId===e&&(m.highlightedProjectId=``,J())},2e3))}function k(){let e=new Set(m.projects.map(e=>e.id));return m.selectedProjectIds.filter(t=>e.has(t))}function pe(e=``){return k().includes(e)}function me(e,t){let n=new Set(k());t?n.add(e):n.delete(e),m.selectedProjectIds=Array.from(n)}function he(){m.selectedProjectIds=k()}function A(e=``,t=`neutral`){if(window.clearTimeout(u),window.clearTimeout(d),!e){O();return}m.status=e,m.tone=t,m.toastClosing=!1,u=window.setTimeout(()=>{O()},4e3),J()}function ge(){try{let e=localStorage.getItem(t);if(!e)return{};let n=JSON.parse(e);return n&&typeof n==`object`?n:{}}catch{return{}}}function _e(e){try{localStorage.setItem(t,JSON.stringify(e))}catch{}}function ve(e){let t=ge(),r=`${e.pathname}${e.searchParams.get(`table-thumb`)===`1`?`?table-thumb=1`:e.search}`,i=t[r],a=Date.now();if(i&&typeof i==`object`&&typeof i.token==`string`&&typeof i.createdAt==`number`&&a-i.createdAt<n)return i.token;let o=String(a);return t[r]={token:o,createdAt:a},_e(t),o}function j(e){return String(e?.thumbnailUrl||e?.launchUrl||``).trim()}function M(e){return!!String(e?.thumbnailDataUrl||``).trim()}function ye(e){let t=String(e?.thumbnailDataUrl||``).trim(),r=Number(e?.thumbnailUpdatedAt)||0,i=String(e?.thumbnailSourceUrl||``).trim(),a=j(e);return!!(t&&r&&i===a&&Date.now()-r<n)}function be(e){return!e||m.thumbnailFailures.has(e.id)?!1:!ye(e)}function xe(){return p?.isConnected?p:(p=document.createElement(`iframe`),p.className=`bridge-projects__thumbnail-generator-frame`,p.setAttribute(`tabindex`,`-1`),s.style.width=`${r}px`,s.style.height=`${i}px`,p.style.width=`${r}px`,p.style.height=`${i}px`,s.replaceChildren(p),p)}function Se(e,t){let n=j(e);if(!n)return``;let r=new URL(n,window.location.origin),i=ve(r);return r.searchParams.set(`project`,e.id),r.searchParams.set(`thumb-capture`,`1`),r.searchParams.set(`thumb-request`,t),r.searchParams.set(`thumb-load`,i),`${r.pathname}${r.search}`}function N(e){let t=M(e),n=m.thumbnailActiveProjectId===e.id,r=!!e?.isLocked;return`
      ${t?`<img class="bridge-projects-table__thumb-image" src="${T(e.thumbnailDataUrl)}" alt="" loading="lazy" data-project-thumbnail-image="${T(e.id)}" />`:``}
      ${r?`
            <span class="bridge-projects-table__thumb-lock" aria-hidden="true">
              <svg viewBox="0 0 24 24" focusable="false">
                <path d="M7 11V8.6a5 5 0 0 1 10 0V11"></path>
                <rect x="5" y="11" width="14" height="10" rx="3"></rect>
              </svg>
            </span>
          `:``}
      <button
        class="bridge-projects-table__thumb-refresh"
        type="button"
        aria-label="Refresh thumbnail for ${T(e.name)}"
        data-tooltip="Refresh Image"
        data-project-thumbnail-refresh="${T(e.id)}"
        ${n?`disabled`:``}
      >
        <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
          <path d="M20 11a8 8 0 0 0-14.9-4H3.5"></path>
          <path d="M4 4v4h4"></path>
          <path d="M4 13a8 8 0 0 0 14.9 4H20.5"></path>
          <path d="M20 20v-4h-4"></path>
        </svg>
      </button>
    `}function Ce(e,t){if(!e||!t)return;let n=M(t),r=m.thumbnailActiveProjectId===t.id,i=String(t.thumbnailDataUrl||``),a=n&&m.loadedThumbnailDataByProject.get(t.id)===i;e.className=`bridge-projects-table__thumb${n?` is-ready`:``}${r?` is-loading`:``}${a?` is-image-ready`:``}`,e.innerHTML=N(t);let o=e.querySelector(`[data-project-thumbnail-image]`);if(!o)return;let s=()=>{m.loadedThumbnailDataByProject.set(t.id,i),e.classList.add(`is-image-ready`)};if(o.complete&&o.naturalWidth>0){s();return}o.addEventListener(`load`,s,{once:!0})}function P(e=[]){let t=e.length?new Set(e):null;a.querySelectorAll(`[data-project-thumbnail-cell]`).forEach(e=>{let n=e.getAttribute(`data-project-thumbnail-cell`)||``;if(t&&!t.has(n))return;let r=m.projects.find(e=>e.id===n);r&&Ce(e,r)})}function F(e){return e.map(e=>`${e.id}:${e.hasOverview?`overview,`:``}${(e.pages||[]).map(e=>e.id).join(`,`)}`).join(`|`)}function I(t){try{let n=sessionStorage.getItem(e);if(!n)return null;let r=JSON.parse(n);return!r||r.expiresAt<=Date.now()?(sessionStorage.removeItem(e),null):r.key!==F(t)||!r.entries?null:new Map(r.entries)}catch{return null}}function L(t,n){try{sessionStorage.setItem(e,JSON.stringify({key:F(t),expiresAt:Date.now()+3e4,entries:Array.from(n.entries())}))}catch{}}function we(){window.clearTimeout(m.summaryRefreshTimer),m.summaryRefreshTimer=0}function R(){a.querySelectorAll(`[data-project-menu-toggle]`).forEach(e=>{let t=e.getAttribute(`data-project-menu-toggle`)||``,n=!!(t&&m.openMenuProjectId===t);e.setAttribute(`aria-expanded`,n?`true`:`false`)}),a.querySelectorAll(`[data-project-owner-edit]`).forEach(e=>{let t=e.getAttribute(`data-project-owner-edit`)||``,n=!!(t&&m.ownerPickerProjectId===t);e.setAttribute(`aria-expanded`,n?`true`:`false`)}),Oe(),H()}function z(){!m.openMenuProjectId&&!m.openMenuPosition||(m.openMenuProjectId=``,m.openMenuPosition=null,R())}function B(){!m.ownerPickerProjectId&&!m.ownerPickerPosition||(m.ownerPickerProjectId=``,m.ownerPickerPosition=null,m.ownerPickerSearchQuery=``,R())}function V(){m.sortPresetMenuOpen&&=!1}function Te(e,t){let n=e.getBoundingClientRect(),r=n.top-12>=134;m.ownerPickerProjectId=``,m.ownerPickerPosition=null,m.ownerPickerSearchQuery=``,m.openMenuProjectId=t,m.openMenuPosition={top:r?n.top-134-8:n.bottom+8,left:Math.min(Math.max(12,n.right-176),window.innerWidth-176-12)},R()}function Ee(e=null,t=null){window.requestAnimationFrame(()=>{let n=c.querySelector(`[data-project-owner-search]`);n instanceof HTMLInputElement&&(n.focus(),typeof e==`number`&&typeof t==`number`&&n.setSelectionRange(e,t))})}function De(e,t){let n=e.getBoundingClientRect(),r=n.top-12>=340;m.openMenuProjectId=``,m.openMenuPosition=null,m.ownerPickerProjectId=t,m.ownerPickerSearchQuery=``,m.ownerPickerPosition={top:r?n.top-340-8:n.bottom+8,left:Math.min(Math.max(12,n.left-8),window.innerWidth-320-12)},R(),Ee()}function Oe(){if(!m.openMenuProjectId||!m.openMenuPosition){c.innerHTML=``;return}let e=m.projects.find(e=>e.id===m.openMenuProjectId);if(!e){c.innerHTML=``;return}let t=!!e.canManageIdentity,n=m.canDuplicateProjects&&e.kind===`dynamic`,r=[t?`
            <button
              class="bridge-projects-table__menu-item"
              type="button"
              role="menuitem"
              data-project-rename="${T(e.id)}"
            >
              Rename Project
            </button>
          `:``,n?`
            <button
              class="bridge-projects-table__menu-item"
              type="button"
              role="menuitem"
              data-project-duplicate="${T(e.id)}"
            >
              Duplicate
            </button>
          `:``,t?`
            <button
              class="bridge-projects-table__menu-item bridge-projects-table__menu-item--danger"
              type="button"
              role="menuitem"
              data-project-delete="${T(e.id)}"
            >
              Delete
            </button>
          `:``].filter(Boolean);if(!r.length){c.innerHTML=``;return}c.innerHTML=`
      <div
        class="bridge-projects-table__menu bridge-projects-table__floating-menu"
        role="menu"
        aria-label="Project options"
        style="top:${Math.round(m.openMenuPosition.top)}px; left:${Math.round(m.openMenuPosition.left)}px;"
      >
        ${r.join(``)}
      </div>
    `}function H(){if(!m.ownerPickerProjectId||!m.ownerPickerPosition){(!m.openMenuProjectId||!m.openMenuPosition)&&(c.innerHTML=``);return}let e=m.projects.find(e=>e.id===m.ownerPickerProjectId);if(!e){B();return}let t=m.availableUsers.filter(e=>ce(e,m.ownerPickerSearchQuery));c.innerHTML=`
      <div
        class="bridge-projects-table__menu bridge-projects-table__floating-menu bridge-projects-table__owner-picker"
        data-project-owner-picker
        role="dialog"
        aria-label="Choose project owner"
        style="top:${Math.round(m.ownerPickerPosition.top)}px; left:${Math.round(m.ownerPickerPosition.left)}px;"
      >
        <div class="bridge-table-search-bar bridge-projects-table__owner-picker-search">
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
              value="${T(m.ownerPickerSearchQuery)}"
              placeholder="Search users"
              aria-label="Search users"
              data-project-owner-search
            />
          </label>
        </div>
        <div class="bridge-projects-table__owner-picker-list">
          ${t.length?t.map(t=>{let n=E(t.email)===E(e.ownerEmail),r=ue(t.fullName||t.email||`User`),i=t.avatarColor?` style="--avatar-bg:${T(t.avatarColor)}"`:``,a=t.avatarUrl?`<span class="bridge-projects-table__owner-avatar has-photo"${i}><img src="${T(t.avatarUrl)}" alt="" /></span>`:`<span class="bridge-projects-table__owner-avatar"${i}>${T(r)}</span>`;return`
                      <button
                        class="bridge-projects-table__owner-picker-item${n?` is-current`:``}"
                        type="button"
                        data-project-owner-option="${T(e.id)}"
                        data-owner-email="${T(t.email)}"
                        ${n||m.updatingOwnerProjectId===e.id?`disabled`:``}
                      >
                        ${a}
                        <span class="bridge-projects-table__owner-picker-copy">
                          <strong>${D(t.fullName||t.email,m.ownerPickerSearchQuery)}</strong>
                          <span>${D(t.email,m.ownerPickerSearchQuery)}</span>
                        </span>
                        ${n?`<span class="bridge-projects-table__owner-picker-status">Current</span>`:``}
                      </button>
                    `}).join(``):`<div class="bridge-table-search__empty bridge-projects-table__owner-picker-empty">No users match your search.</div>`}
        </div>
      </div>
    `}function U(){let e=Array.isArray(m.bulkDeleteProjectIds)?m.bulkDeleteProjectIds.filter(Boolean):[];if(!e.length){l.innerHTML=``;return}let t=e.map(e=>m.projects.find(t=>t.id===e)).filter(Boolean);if(!t.length){l.innerHTML=``;return}let n=t.length>1,r=t[0];l.innerHTML=`
      <div class="bridge-project-delete__modal-shell" data-project-delete-overlay>
        <div class="bridge-project-delete__modal" role="dialog" aria-modal="true" aria-labelledby="project-delete-title">
          <div class="bridge-project-delete__head">
            <div>
              <p class="bridge-project-delete__eyebrow">Project action</p>
              <h2 id="project-delete-title">${n?`Delete ${t.length} projects?`:`Delete ${T(r.name)}?`}</h2>
              <p>${n?`This will remove the selected projects and their comments. This action can’t be undone.`:`This will remove the project and its comments. This action can’t be undone.`}</p>
            </div>
            <button class="bridge-project-delete__close" type="button" aria-label="Close delete dialog" data-close-project-delete>×</button>
          </div>
          ${n?`
                <div class="bridge-project-delete__list">
                  ${t.map(e=>`<div class="bridge-project-delete__list-item">${T(e.name)}</div>`).join(``)}
                </div>
              `:``}
          <div class="bridge-project-delete__actions">
            <button class="bridge-project-delete__button bridge-project-delete__button--secondary" type="button" data-close-project-delete ${m.bulkDeletingProjects?`disabled`:``}>Cancel</button>
            <button class="bridge-project-delete__button bridge-project-delete__button--danger" type="button" data-confirm-project-delete ${m.bulkDeletingProjects?`disabled`:``}>
              ${m.bulkDeletingProjects?`Deleting...`:n?`Delete projects`:`Delete project`}
            </button>
          </div>
        </div>
      </div>
    `}function W({preserveDraft:e=!1}={}){m.editingProjectId&&=(e||(delete m.pendingProjectNameById[m.editingProjectId],delete m.pendingProjectDescriptionById[m.editingProjectId],delete m.dirtyProjectById[m.editingProjectId]),``)}function G(e=``){if(!e)return;let t=m.projects.find(t=>t.id===e),n=a.querySelector(`[data-project-rename-save="${e}"]`);a.querySelector(`[data-project-rename-input="${e}"]`),a.querySelector(`[data-project-description-input="${e}"]`),!(!t||!(n instanceof HTMLButtonElement))&&(n.disabled=m.renamingProjectId===e||!m.dirtyProjectById[e])}function K(){return m.sortKey===`recentOpen`?`recentOpen`:`createdAt`}function ke(){return K()===`recentOpen`?`Most Recent`:`By Date`}function Ae(e=`recentOpen`){m.sortKey=e===`recentOpen`?`recentOpen`:`createdAt`,m.sortDirection=`desc`,V()}function je(e,t=w()){let n=Number(t.totalComments)||0,r=Number(t.unreadComments)||0,i=Number(t.unreadMentions)||0,a=ae(e),o=[];a&&r>0&&r!==i&&o.push({count:r,label:`New`,modifierClass:` bridge-projects-table__comments-badge--new`}),i>0&&o.push({count:i,label:i===1?`Mention`:`Mentions`,modifierClass:` bridge-projects-table__comments-badge--mentions`});let s=o.length>0;return`
      <div class="bridge-projects-table__comments${s?` bridge-projects-table__comments--badge-only bridge-projects-table__comments--badge-stack`:``}">
        ${s?o.map(e=>{let t=e.count>99?`99+`:e.count;return`<span class="bridge-projects-table__comments-badge${e.modifierClass}"><span>${t}</span><span>${T(e.label)}</span></span>`}).join(``):`<span class="bridge-projects-table__count">${n}</span>`}
      </div>
    `}function Me(){a.querySelectorAll(`[data-project-comments-cell]`).forEach(e=>{let t=e.getAttribute(`data-project-comments-cell`)||``;e.innerHTML=je(m.projects.find(e=>e.id===t),m.commentSummaryByProject.get(t)||w())})}function Ne(){let e=m.sortDirection===`desc`?-1:1,t=[...m.projects];return t.sort((t,n)=>{let r=0;if(m.sortKey===`owner`)r=String(t.ownerName||``).localeCompare(String(n.ownerName||``),void 0,{sensitivity:`base`}),r||=String(t.name||``).localeCompare(String(n.name||``),void 0,{sensitivity:`base`});else if(m.sortKey===`pages`)r=Number(t.pageCount||0)-Number(n.pageCount||0),r||=String(t.name||``).localeCompare(String(n.name||``),void 0,{sensitivity:`base`});else if(m.sortKey===`comments`){let e=m.commentSummaryByProject.get(t.id)||{totalComments:0,unreadComments:0},i=m.commentSummaryByProject.get(n.id)||{totalComments:0,unreadComments:0};r=Number(e.totalComments||0)-Number(i.totalComments||0),r||=Number(e.unreadComments||0)-Number(i.unreadComments||0),r||=String(t.name||``).localeCompare(String(n.name||``),void 0,{sensitivity:`base`})}else m.sortKey===`createdAt`?(r=Number(t.createdAt||0)-Number(n.createdAt||0),r||=String(t.name||``).localeCompare(String(n.name||``),void 0,{sensitivity:`base`})):m.sortKey===`recentOpen`?(r=x(t.id)-x(n.id),r||=Number(t.createdAt||0)-Number(n.createdAt||0),r||=String(t.name||``).localeCompare(String(n.name||``),void 0,{sensitivity:`base`})):(r=String(t.name||``).localeCompare(String(n.name||``),void 0,{sensitivity:`base`}),r||=String(t.ownerName||``).localeCompare(String(n.ownerName||``),void 0,{sensitivity:`base`}));return r*e}),t}function q(e){return m.sortKey===e?m.sortDirection===`desc`?`
        <span class="bridge-projects-table__sort-arrow" aria-hidden="true">
          <svg viewBox="0 0 16 16" focusable="false">
            <path d="M8 3.25v9.5"></path>
            <path d="M5.5 10.25 8 12.75l2.5-2.5"></path>
          </svg>
        </span>
      `:`
      <span class="bridge-projects-table__sort-arrow" aria-hidden="true">
        <svg viewBox="0 0 16 16" focusable="false">
          <path d="M8 3.25v9.5"></path>
          <path d="M5.5 5.75 8 3.25l2.5 2.5"></path>
        </svg>
      </span>
    `:`
        <span class="bridge-projects-table__sort-arrow is-idle" aria-hidden="true">
          <svg viewBox="0 0 16 16" focusable="false">
            <path d="M8 3.25v9.5"></path>
            <path d="M5.5 5.75 8 3.25l2.5 2.5"></path>
            <path d="M5.5 10.25 8 12.75l2.5-2.5"></path>
          </svg>
        </span>
      `}function J(){let e=m.status?`
          <div class="bridge-projects__toast${m.tone===`error`?` bridge-projects__toast--error`:``}${m.toastClosing?` is-closing`:``}" role="status" aria-live="polite">
            ${de(m.tone)}
            <span class="bridge-projects__toast-message">${T(m.status)}</span>
            <button class="bridge-projects__toast-dismiss" type="button" aria-label="Dismiss notification" data-dismiss-status>
              <span aria-hidden="true">×</span>
            </button>
          </div>
        `:``,t=m.canCreateProjects?`
          <button class="bridge-projects__create" type="button" data-create-project ${m.creating?`disabled`:``}>
            ${m.creating?`Creating…`:`New Project`}
          </button>
        `:``;o&&(o.innerHTML=t);let n=(m.loading?[]:Ne()).filter(e=>se(e,m.searchQuery)),r=!m.loading&&m.projects.length>5,i=m.canDuplicateProjects||m.projects.some(e=>!!e.canManageIdentity),s=i&&!m.loading&&m.projects.length>5,c=!m.loading&&m.projects.length>5,l=k(),u=l.length,d=n.map(e=>e.id),f=d.length?d.every(e=>l.includes(e)):!1,p=r?`
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
                value="${T(m.searchQuery)}"
                placeholder="Search projects"
                aria-label="Search projects"
                data-project-search
              />
            </label>
          </div>
        `:``,h=c?`
          <div class="bridge-table-sort" data-project-sort>
            <button
              class="bridge-table-sort__trigger"
              type="button"
              aria-haspopup="menu"
              aria-expanded="${m.sortPresetMenuOpen?`true`:`false`}"
              data-project-sort-toggle
            >
              <span>${T(ke())}</span>
              <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">
                <path d="m4 6 4 4 4-4"></path>
              </svg>
            </button>
            ${m.sortPresetMenuOpen?`
                    <div class="bridge-projects-table__menu bridge-table-sort__menu" role="menu" aria-label="Sort projects">
                      <button
                        class="bridge-projects-table__menu-item${K()===`recentOpen`?` is-selected`:``}"
                        type="button"
                        role="menuitemradio"
                        aria-checked="${K()===`recentOpen`?`true`:`false`}"
                        data-project-sort-option="recentOpen"
                      >
                        Most Recent
                      </button>
                      <button
                        class="bridge-projects-table__menu-item${K()===`createdAt`?` is-selected`:``}"
                        type="button"
                        role="menuitemradio"
                        aria-checked="${K()===`createdAt`?`true`:`false`}"
                        data-project-sort-option="createdAt"
                      >
                        By Date
                      </button>
                    </div>
                  `:``}
          </div>
        `:``,g=c?`
          <div class="bridge-table-controls">
            ${p}
            ${h}
          </div>
        `:p,_=k().map(e=>m.projects.find(t=>t.id===e)).filter(Boolean),v=_.length>0&&_.every(e=>!!e.canManageIdentity),y=s&&u?`
            <div class="bridge-table-bulk-bar">
              <span class="bridge-table-bulk-bar__count">${u} selected</span>
              <div class="bridge-table-bulk-bar__actions">
                <button class="bridge-table-bulk-bar__button" type="button" data-project-bulk-duplicate ${m.bulkDuplicatingProjects||m.bulkDeletingProjects?`disabled`:``}>
                  ${m.bulkDuplicatingProjects?`Duplicating...`:`Duplicate`}
                </button>
                ${v?`
                        <button class="bridge-table-bulk-bar__button bridge-table-bulk-bar__button--danger" type="button" data-project-bulk-delete ${m.bulkDeletingProjects||m.bulkDuplicatingProjects?`disabled`:``}>
                          ${m.bulkDeletingProjects?`Deleting...`:`Delete`}
                        </button>
                      `:``}
              </div>
            </div>
          `:``,b=m.loading?`
          <article class="bridge-projects__loading">
            <p>Loading projects…</p>
          </article>
        `:n.length?n.map(e=>{let t=m.commentSummaryByProject.get(e.id)||w(),n=ue(e.ownerName||`Unknown`),r=e.ownerAvatarColor?` style="--avatar-bg:${T(e.ownerAvatarColor)}"`:``,a=e.ownerAvatarUrl?`<span class="bridge-projects-table__owner-avatar has-photo"${r}><img src="${T(e.ownerAvatarUrl)}" alt="" /></span>`:`<span class="bridge-projects-table__owner-avatar" aria-hidden="true"${r}>${T(n)}</span>`,o=!!e.canManageIdentity,c=o&&m.availableUsers.length>0,l=m.canDuplicateProjects&&e.kind===`dynamic`,u=o||l,d=M(e),f=m.thumbnailActiveProjectId===e.id,p=m.editingProjectId===e.id,h=m.renamingProjectId===e.id;String(m.pendingProjectNameById[e.id]||e.name||``).trim();let g=String(m.pendingProjectDescriptionById[e.id]??e.description??``),_=!!m.dirtyProjectById[e.id];return`
              <tr
                class="bridge-projects-table__row${m.highlightedProjectId===e.id?` is-newly-created`:``}${m.exitingProjectId===e.id?` is-deleting`:``}"
                data-project-id="${T(e.id)}"
                data-project-launch-url="${T(e.launchUrl)}"
                data-project-locked="${e.isLocked?`true`:`false`}"
                tabindex="0"
                role="link"
                aria-label="Open ${T(e.name)}"
              >
                ${s?`
                        <td class="bridge-table-select__cell">
                          <label class="bridge-table-select">
                            <input
                              type="checkbox"
                              aria-label="Select ${T(e.name)}"
                              data-project-select="${T(e.id)}"
                              ${pe(e.id)?`checked`:``}
                            />
                            <span class="bridge-table-select__control" aria-hidden="true"></span>
                          </label>
                        </td>
                      `:``}
                <td class="bridge-projects-table__project-cell">
                  <div class="bridge-projects-table__project">
                    <div
                      class="bridge-projects-table__thumb${d?` is-ready`:``}${f?` is-loading`:``}"
                      data-project-thumbnail-cell="${T(e.id)}"
                    >
                      ${N(e)}
                    </div>
                    <div class="bridge-projects-table__identity">
                      ${p&&o?`
                            <div class="bridge-projects-table__rename-editor" data-project-rename-editor>
                              <div class="bridge-projects-table__rename-fields">
                                <div class="bridge-projects-table__field-wrap">
                                  <input
                                    class="bridge-projects-table__rename-input"
                                    type="text"
                                    value="${T(m.pendingProjectNameById[e.id]||e.name)}"
                                    aria-label="Rename ${T(e.name)}"
                                    data-project-rename-input="${T(e.id)}"
                                    ${h?`disabled`:``}
                                  />
                                  <button
                                    class="bridge-projects-table__field-clear"
                                    type="button"
                                    aria-label="Clear project name"
                                    data-project-rename-clear="${T(e.id)}"
                                    ${h?`disabled`:``}
                                  >
                                    <span aria-hidden="true">×</span>
                                  </button>
                                </div>
                                <div class="bridge-projects-table__field-wrap bridge-projects-table__field-wrap--textarea">
                                  <textarea
                                    class="bridge-projects-table__rename-textarea"
                                    aria-label="Edit description for ${T(e.name)}"
                                    data-project-description-input="${T(e.id)}"
                                    rows="2"
                                    ${h?`disabled`:``}
                                  >${T(g)}</textarea>
                                  <button
                                    class="bridge-projects-table__field-clear bridge-projects-table__field-clear--textarea"
                                    type="button"
                                    aria-label="Clear project description"
                                    data-project-description-clear="${T(e.id)}"
                                    ${h?`disabled`:``}
                                  >
                                    <span aria-hidden="true">×</span>
                                  </button>
                                </div>
                              </div>
                              <button
                                class="bridge-projects-table__rename-save"
                                type="button"
                                aria-label="Save project details for ${T(e.name)}"
                                data-project-rename-save="${T(e.id)}"
                                ${h||!_?`disabled`:``}
                              >
                                <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                                  <path d="M5.5 12.5 9.5 16.5 18.5 7.5"></path>
                                </svg>
                              </button>
                            </div>
                          `:``}
                      ${p?``:`
                            <div class="bridge-projects-table__identity-top">
                                <strong>${D(e.name,m.searchQuery)}</strong>
                              ${o?`
                                      <button
                                        class="bridge-inline-edit-trigger bridge-projects-table__edit-trigger"
                                        type="button"
                                        aria-label="Edit ${T(e.name)}"
                                        data-project-edit-trigger="${T(e.id)}"
                                      >
                                        <span class="bridge-inline-edit-trigger__tooltip" aria-hidden="true">Edit</span>
                                        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                                          <path d="m6.25 17.75 3.15-.5 8.5-8.5-2.65-2.65-8.5 8.5-.5 3.15Z"></path>
                                          <path d="m13.9 7.45 2.65 2.65"></path>
                                          <path d="M14.95 5.55 16.2 4.3a1.75 1.75 0 0 1 2.5 0l1 1a1.75 1.75 0 0 1 0 2.5l-1.25 1.25-3.5-3.5Z"></path>
                                        </svg>
                                      </button>
                                    `:``}
                            </div>
                            <span>${D(e.description||`A project inside UX Bridge.`,m.searchQuery)}</span>
                          `}
                    </div>
                  </div>
                </td>
                <td class="bridge-projects-table__owner-cell">
                  <div class="bridge-projects-table__owner-control">
                    <span class="bridge-projects-table__owner-pill">
                      ${a}
                      <span>${D(e.ownerName||`Unknown`,m.searchQuery)}</span>
                    </span>
                    ${c?`
                          <button
                            class="bridge-inline-edit-trigger bridge-projects-table__owner-edit"
                            type="button"
                            aria-label="Edit owner for ${T(e.name)}"
                            aria-haspopup="dialog"
                            aria-expanded="${m.ownerPickerProjectId===e.id?`true`:`false`}"
                            data-project-owner-edit="${T(e.id)}"
                          >
                            <span class="bridge-inline-edit-trigger__tooltip" aria-hidden="true">Edit</span>
                            <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                              <path d="m6.25 17.75 3.15-.5 8.5-8.5-2.65-2.65-8.5 8.5-.5 3.15Z"></path>
                              <path d="m13.9 7.45 2.65 2.65"></path>
                              <path d="M14.95 5.55 16.2 4.3a1.75 1.75 0 0 1 2.5 0l1 1a1.75 1.75 0 0 1 0 2.5l-1.25 1.25-3.5-3.5Z"></path>
                            </svg>
                          </button>
                        `:``}
                  </div>
                </td>
                <td class="bridge-projects-table__pages-cell">
                  <span class="bridge-projects-table__count">${e.pageCount}</span>
                </td>
                <td class="bridge-projects-table__comments-cell" data-project-comments-cell="${T(e.id)}">
                  ${je(e,t)}
                </td>
                ${i?`
                        <td class="bridge-projects-table__actions-cell">
                          ${e.isLocked?`
                                <button
                                  class="bridge-projects-table__request"
                                  type="button"
                                  data-project-request-access="${T(e.id)}"
                                  ${e.requestPending?`disabled`:``}
                                >
                                  ${e.requestPending?`Requested`:`Request Access`}
                                </button>
                              `:u?`
                                <div class="bridge-projects-table__actions" data-project-actions>
                                  <button
                                    class="bridge-projects-table__menu-button"
                                    type="button"
                                    aria-haspopup="menu"
                                    aria-expanded="${m.openMenuProjectId===e.id?`true`:`false`}"
                                    aria-label="Project options for ${T(e.name)}"
                                    data-project-menu-toggle="${T(e.id)}"
                                  >
                                    <span aria-hidden="true">⋮</span>
                                  </button>
                                </div>
                              `:``}
                        </td>
                      `:``}
              </tr>
            `}).join(``):`
          <tr class="bridge-projects-table__empty-row">
            <td colspan="${s?i?`6`:`5`:i?`5`:`4`}">
              <div class="bridge-table-search__empty">No projects match your search.</div>
            </td>
          </tr>
        `;a.innerHTML=`
      ${e}
      ${m.loading?b:`
            ${g}
            ${y}
            <div class="bridge-projects__table-shell">
              <table class="bridge-projects-table">
                <thead>
                  <tr>
                    ${s?`
                            <th class="bridge-table-select__cell">
                              <label class="bridge-table-select">
                                <input
                                  type="checkbox"
                                  aria-label="Select all visible projects"
                                  data-project-select-all
                                  ${f?`checked`:``}
                                />
                                <span class="bridge-table-select__control" aria-hidden="true"></span>
                              </label>
                            </th>
                          `:``}
                    <th class="bridge-projects-table__project-cell">
                      <button class="bridge-projects-table__sort-button" type="button" data-sort-key="project">
                        <span>Projects (${n.length})</span>
                        ${q(`project`)}
                      </button>
                    </th>
                    <th class="bridge-projects-table__owner-cell">
                      <button class="bridge-projects-table__sort-button" type="button" data-sort-key="owner">
                        <span>Owner</span>
                        ${q(`owner`)}
                      </button>
                    </th>
                    <th class="bridge-projects-table__pages-cell">
                      <button class="bridge-projects-table__sort-button" type="button" data-sort-key="pages">
                        <span>Pages</span>
                        ${q(`pages`)}
                      </button>
                    </th>
                    <th class="bridge-projects-table__comments-cell">
                      <button class="bridge-projects-table__sort-button" type="button" data-sort-key="comments">
                        <span>Comments</span>
                        ${q(`comments`)}
                      </button>
                    </th>
                    ${i?`<th class="bridge-projects-table__actions-cell">Actions</th>`:``}
                  </tr>
                </thead>
                <tbody>${b}</tbody>
              </table>
            </div>
        `}
    `,U(),R()}function Pe(e){!e||!e.id||(m.projects.findIndex(t=>t.id===e.id)>=0?m.projects=m.projects.map(t=>t.id===e.id?e:t):m.projects=[e,...m.projects],m.commentSummaryByProject.has(e.id)||m.commentSummaryByProject.set(e.id,w()))}function Y(e){let t=m.projects.find(t=>t.id===e);if(!t)return;z(),m.pendingProjectNameById[e]=t.name||``,m.pendingProjectDescriptionById[e]=t.description||``,m.dirtyProjectById[e]=!1,m.editingProjectId=e,J();let n=a.querySelector(`[data-project-rename-input="${e}"]`);n instanceof HTMLInputElement&&window.requestAnimationFrame(()=>{n.focus(),n.select()})}async function X({background:e=!1}={}){e||(m.loading=!0,J());let t=await fetch(`/api/projects`,{credentials:`include`,cache:`no-store`}),n=await t.json().catch(()=>({}));if(!t.ok||!n?.ok)throw Error(n?.error||`Unable to load projects.`);m.projects=Array.isArray(n.projects)?n.projects:[],m.availableUsers=Array.isArray(n.availableUsers)?n.availableUsers:[];let r=S(n.recentProjectOpenById),i=C(r,y());te(i),ee(i,r)||ne(i),he(),m.canCreateProjects=!!n.canCreateProjects,m.canDuplicateProjects=!!n.canDuplicateProjects,m.editingProjectId&&!m.projects.some(e=>e.id===m.editingProjectId)&&W(),m.ownerPickerProjectId&&!m.projects.some(e=>e.id===m.ownerPickerProjectId)&&B(),m.commentSummaryByProject=I(m.projects)||new Map(m.projects.map(e=>[e.id,w()])),m.loading=!1,J();try{let e=sessionStorage.getItem(`ux-bridge-share-toast`);e&&(sessionStorage.removeItem(`ux-bridge-share-toast`),A(e))}catch{}if(Le({immediate:!I(m.projects)}),m.thumbnailRefreshStarted=!0,m.thumbnailFailures.clear(),Z(),m.editingProjectId){let e=a.querySelector(`[data-project-rename-input="${m.editingProjectId}"]`);e instanceof HTMLInputElement&&window.requestAnimationFrame(()=>{e.focus(),e.select()})}}async function Fe(e,t=0){let n=e.map(e=>({project:e.id,pages:[...e.hasOverview?[`overview`]:[],...(Array.isArray(e.pages)?e.pages:[]).map(e=>String(e.id||``).trim()).filter(Boolean)]})).filter(e=>e.project&&e.pages.length);if(!n.length){let t=new Map(e.map(e=>[e.id,w()]));return L(e,t),t}try{let r=new URLSearchParams({summary:`projects`,projects:JSON.stringify(n)}),i=await fetch(`/api/comments?${r.toString()}`,{credentials:`include`,cache:`no-store`}),a=await i.json().catch(()=>({}));if(!i.ok||!a?.ok||!Array.isArray(a.projects))throw Error(`Unable to load project comment summaries.`);let o=new Map(e.map(e=>[e.id,w()]));return a.projects.forEach(t=>{let n=String(t?.project||``).trim(),r=e.find(e=>e.id===n);if(!n||!r)return;let i=(Array.isArray(t.summary)?t.summary:[]).reduce((e,t)=>{let n=String(t.page||``).trim(),i=v(r.id,n),a=Number(t.lastSeenAt||0),o=String(t.lastSeenCommentId||``)||i.lastSeenCommentId,s=e=>{if(!Array.isArray(e)||!e.length)return 0;if(!o)return e.length;let t=e.findIndex(e=>e===o);return t<0?e.length:Math.max(e.length-(t+1),0)};return e.totalComments+=Number(t.count||0),e.unreadComments+=a>0?Number(t.unreadCount||0):s(Array.isArray(t.commentIds)?t.commentIds:[]),e.unreadMentions+=a>0?Number(t.unreadMentionCount||0):s(Array.isArray(t.mentionCommentIds)?t.mentionCommentIds:[]),e},w());o.set(n,i)}),t&&t!==m.summaryRequestToken?null:(L(e,o),o)}catch{return new Map(e.map(e=>[e.id,w()]))}}async function Ie(){if(m.loading||document.visibilityState!==`visible`)return;let e=Date.now();m.summaryRequestToken=e;let t=await Fe(m.projects,e);if(!(!t||m.summaryRequestToken!==e)){if(m.commentSummaryByProject=t,m.loading||m.sortKey===`comments`){J();return}Me()}}function Le({immediate:e=!1}={}){we();let t=()=>{Ie().catch(()=>{}),m.summaryRefreshTimer=window.setTimeout(t,3e3)};if(e){t();return}m.summaryRefreshTimer=window.setTimeout(t,1200)}async function Re(e,t,n,r=`auto`){let i=await fetch(`/api/projects`,{method:`POST`,credentials:`include`,headers:{"Content-Type":`application/json`},body:JSON.stringify({action:`updateThumbnail`,project:e,sourceUrl:t,imageDataUrl:n,mode:r})}),a=await i.json().catch(()=>({}));if(!i.ok||!a?.ok||!a?.project)throw Error(a?.error||`Unable to update project thumbnail.`);return a.project}function ze(e=``){m.thumbnailActiveProjectId=``,m.thumbnailRequestToken=``,e&&P([e])}function Z(e=``,t=`auto`){if(m.thumbnailActiveProjectId||document.visibilityState!==`visible`)return;let n=e?m.projects.find(t=>t.id===e):m.projects.find(e=>be(e));if(!n)return;let r=`${Date.now()}-${n.id}`;m.thumbnailActiveProjectId=n.id,m.thumbnailRequestToken=r,P([n.id]);let i=xe(),a=async i=>{if(i.origin!==window.location.origin)return;let o=i.data;if(!(!o||o.requestToken!==r||o.projectId!==n.id)){if(o.type===`uxbridge:thumbnail-capture-failed`){window.removeEventListener(`message`,a),m.thumbnailFailures.add(n.id),ze(n.id),Z();return}if(!(o.type!==`uxbridge:thumbnail-captured`||!o.imageDataUrl)){window.removeEventListener(`message`,a);try{let e=await Re(n.id,o.sourceUrl,o.imageDataUrl,t);m.loadedThumbnailDataByProject.delete(e.id),m.projects=m.projects.map(t=>t.id===e.id?e:t),P([e.id])}catch{m.thumbnailFailures.add(n.id)}finally{ze(n.id),e||Z()}}}};window.addEventListener(`message`,a),i.src=Se(n,r)}async function Be(){if(!m.creating){m.creating=!0,J();try{let e=await fetch(`/api/projects`,{method:`POST`,credentials:`include`,headers:{"Content-Type":`application/json`},body:JSON.stringify({action:`createProject`})}),t=await e.json().catch(()=>({}));if(!e.ok||!t?.ok)throw Error(t?.error||`Unable to create project.`);m.creating=!1,Pe(t.project),fe(t.project?.id||``),A(`Created ${t.project?.name||`new project`}.`),J(),X({background:!0}).catch(()=>{})}catch(e){m.creating=!1,A(e instanceof Error?e.message:`Unable to create project.`,`error`)}}}o&&o.addEventListener(`click`,async e=>{e.target.closest(`[data-create-project]`)&&await Be()});async function Q(e){if(e.target.closest(`[data-dismiss-status]`)){O();return}if(e.target.closest(`[data-create-project]`)){await Be();return}if(e.target.closest(`[data-project-sort-toggle]`)){e.preventDefault(),e.stopPropagation(),m.sortPresetMenuOpen=!m.sortPresetMenuOpen,J();return}let t=e.target.closest(`[data-project-sort-option]`);if(t){e.preventDefault(),e.stopPropagation(),Ae(t.getAttribute(`data-project-sort-option`)||`recentOpen`),J();return}let n=e.target.closest(`[data-sort-key]`);if(n){V();let e=n.getAttribute(`data-sort-key`)||``;if(!e)return;m.sortKey===e?(m.sortDirection===`asc`||(m.sortKey=`recentOpen`),m.sortDirection=`desc`):(m.sortKey=e,m.sortDirection=`asc`),J();return}let r=e.target.closest(`[data-project-thumbnail-refresh]`);if(r){e.preventDefault(),e.stopPropagation();let t=r.getAttribute(`data-project-thumbnail-refresh`)||``;if(!t||m.thumbnailActiveProjectId)return;m.thumbnailFailures.delete(t),Z(t,`manual`);return}let i=e.target.closest(`[data-project-request-access]`);if(i){e.preventDefault(),e.stopPropagation();let t=i.getAttribute(`data-project-request-access`)||``;if(!t)return;try{let e=await fetch(`/api/projects`,{method:`POST`,credentials:`include`,headers:{"Content-Type":`application/json`},body:JSON.stringify({action:`requestAccess`,project:t})}),n=await e.json().catch(()=>({}));if(!e.ok||!n?.ok)throw Error(n?.error||`Unable to request project access.`);A(n.message||`Access request sent.`),await X()}catch(e){A(e instanceof Error?e.message:`Unable to request project access.`,`error`)}return}let o=e.target.closest(`[data-project-menu-toggle]`);if(o){W();let e=o.getAttribute(`data-project-menu-toggle`)||``;m.openMenuProjectId===e?z():Te(o,e);return}let s=e.target.closest(`[data-project-owner-edit]`);if(s){e.preventDefault(),e.stopPropagation(),W();let t=s.getAttribute(`data-project-owner-edit`)||``;m.ownerPickerProjectId===t?B():De(s,t);return}if(e.target.closest(`[data-project-bulk-duplicate]`)){e.preventDefault(),e.stopPropagation();let t=k();if(!t.length)return;m.bulkDuplicatingProjects=!0,J();try{for(let e of t){let t=await fetch(`/api/projects`,{method:`POST`,credentials:`include`,headers:{"Content-Type":`application/json`},body:JSON.stringify({action:`duplicateProject`,project:e})}),n=await t.json().catch(()=>({}));if(!t.ok||!n?.ok)throw Error(n?.error||`Unable to duplicate selected projects.`)}m.bulkDuplicatingProjects=!1,m.selectedProjectIds=[],A(`Duplicated ${t.length} ${t.length===1?`project`:`projects`}.`),J(),X({background:!0}).catch(()=>{})}catch(e){m.bulkDuplicatingProjects=!1,A(e instanceof Error?e.message:`Unable to duplicate selected projects.`,`error`),J()}return}if(e.target.closest(`[data-project-bulk-delete]`)){e.preventDefault(),e.stopPropagation();let t=k();if(!t.length)return;m.bulkDeleteProjectIds=t,U();return}let c=e.target.closest(`[data-project-rename]`);if(c){e.preventDefault(),e.stopPropagation(),Y(c.getAttribute(`data-project-rename`)||``);return}let l=e.target.closest(`[data-project-edit-trigger]`);if(l){e.preventDefault(),e.stopPropagation(),Y(l.getAttribute(`data-project-edit-trigger`)||``);return}let u=e.target.closest(`[data-project-rename-clear]`);if(u){e.preventDefault(),e.stopPropagation();let t=u.getAttribute(`data-project-rename-clear`)||``,n=a.querySelector(`[data-project-rename-input="${t}"]`);n instanceof HTMLInputElement&&(n.value=``,m.pendingProjectNameById[t]=``,m.dirtyProjectById[t]=!0,G(t),n.focus());return}let d=e.target.closest(`[data-project-description-clear]`);if(d){e.preventDefault(),e.stopPropagation();let t=d.getAttribute(`data-project-description-clear`)||``,n=a.querySelector(`[data-project-description-input="${t}"]`);n instanceof HTMLTextAreaElement&&(n.value=``,m.pendingProjectDescriptionById[t]=``,m.dirtyProjectById[t]=!0,G(t),n.focus());return}let f=e.target.closest(`[data-project-rename-save]`);if(f){e.preventDefault(),e.stopPropagation();let t=f.getAttribute(`data-project-rename-save`)||``,n=m.projects.find(e=>e.id===t),r=a.querySelector(`[data-project-rename-input="${t}"]`),i=a.querySelector(`[data-project-description-input="${t}"]`),o=String(r instanceof HTMLInputElement?r.value:m.pendingProjectNameById[t]||``).trim(),s=String(i instanceof HTMLTextAreaElement?i.value:m.pendingProjectDescriptionById[t]||``).trim();if(!t||!n)return;if(!o){A(`Project name is required.`,`error`),r instanceof HTMLInputElement&&r.focus();return}if(o===String(n.name||``).trim()&&s===String(n.description||``).trim()){W(),J();return}m.renamingProjectId=t,J();try{let e=await fetch(`/api/projects`,{method:`POST`,credentials:`include`,headers:{"Content-Type":`application/json`},body:JSON.stringify({action:`renameProject`,project:t,name:o,description:s})}),n=await e.json().catch(()=>({}));if(!e.ok||!n?.ok||!n?.project)throw Error(n?.error||`Unable to rename project.`);m.projects=m.projects.map(e=>e.id===t?n.project:e),W(),m.renamingProjectId=``,A(`Renamed project to ${n.project.name}.`),J()}catch(e){m.renamingProjectId=``,A(e instanceof Error?e.message:`Unable to rename project.`,`error`),J()}return}let p=e.target.closest(`[data-project-duplicate]`);if(p){let e=p.getAttribute(`data-project-duplicate`)||``;z();try{let t=await fetch(`/api/projects`,{method:`POST`,credentials:`include`,headers:{"Content-Type":`application/json`},body:JSON.stringify({action:`duplicateProject`,project:e})}),n=await t.json().catch(()=>({}));if(!t.ok||!n?.ok)throw Error(n?.error||`Unable to duplicate project.`);A(`Duplicated ${n.project?.name||`project`}.`),await X()}catch(e){A(e instanceof Error?e.message:`Unable to duplicate project.`,`error`)}return}let h=e.target.closest(`[data-project-delete]`);if(h){let e=h.getAttribute(`data-project-delete`)||``;if(!m.projects.find(t=>t.id===e))return;z(),m.bulkDeleteProjectIds=[e],U();return}let g=e.target.closest(`[data-project-owner-option]`);if(g){e.preventDefault(),e.stopPropagation();let t=g.getAttribute(`data-project-owner-option`)||``,n=g.getAttribute(`data-owner-email`)||``,r=m.projects.find(e=>e.id===t);if(!t||!n||!r)return;m.updatingOwnerProjectId=t,H();try{let e=await fetch(`/api/projects`,{method:`POST`,credentials:`include`,headers:{"Content-Type":`application/json`},body:JSON.stringify({action:`updateProjectOwner`,project:t,ownerEmail:n})}),r=await e.json().catch(()=>({}));if(!e.ok||!r?.ok||!r?.project)throw Error(r?.error||`Unable to update project owner.`);m.projects=m.projects.map(e=>e.id===t?r.project:e),m.updatingOwnerProjectId=``,B(),A(`Updated owner for ${r.project.name}.`),J()}catch(e){m.updatingOwnerProjectId=``,A(e instanceof Error?e.message:`Unable to update project owner.`,`error`),H()}return}if(e.target.closest(`[data-project-owner-picker]`))return;let _=e.target.closest(`[data-project-launch-url]`);if(!_){V(),z(),B();return}if(e.target.closest(`[data-project-actions]`)||e.target.closest(`[data-project-rename-editor]`)||e.target.closest(`.bridge-table-select`)||e.target.closest(`[data-project-thumbnail-refresh]`)||_.dataset.projectLocked===`true`||m.editingProjectId)return;let v=_.getAttribute(`data-project-launch-url`),y=_.getAttribute(`data-project-id`)||``;v&&(ie(y,{useBeacon:!0}),window.location.href=v)}a.addEventListener(`click`,Q),c.addEventListener(`click`,Q),a.addEventListener(`change`,e=>{let t=e.target.closest(`[data-project-select]`);if(t instanceof HTMLInputElement){me(t.getAttribute(`data-project-select`)||``,t.checked),J();return}let n=e.target.closest(`[data-project-select-all]`);if(n instanceof HTMLInputElement){let e=Ne().filter(e=>se(e,m.searchQuery)).map(e=>e.id),t=new Set(k());n.checked?e.forEach(e=>t.add(e)):e.forEach(e=>t.delete(e)),m.selectedProjectIds=Array.from(t),J()}}),l.addEventListener(`click`,async e=>{if(e.target.closest(`[data-confirm-project-delete]`)){let e=Array.isArray(m.bulkDeleteProjectIds)?m.bulkDeleteProjectIds.filter(Boolean):[],t=e.map(e=>m.projects.find(t=>t.id===e)).filter(Boolean);if(!t.length)return;m.bulkDeletingProjects=!0,U();try{for(let e of t){let t=await fetch(`/api/projects`,{method:`POST`,credentials:`include`,headers:{"Content-Type":`application/json`},body:JSON.stringify({action:`deleteProject`,project:e.id})}),n=await t.json().catch(()=>({}));if(!t.ok||!n?.ok)throw Error(n?.error||`Unable to delete project.`)}let n=new Set(e);m.bulkDeleteProjectIds=[],m.bulkDeletingProjects=!1,m.projects=m.projects.filter(e=>!n.has(e.id)),m.selectedProjectIds=k().filter(e=>!n.has(e)),A(`Deleted ${t.length} ${t.length===1?`project`:`projects`}.`),J(),X({background:!0}).catch(()=>{})}catch(e){m.bulkDeletingProjects=!1,A(e instanceof Error?e.message:`Unable to delete project.`,`error`),U()}return}let t=e.target.closest(`[data-close-project-delete]`);if(t||e.target.closest(`[data-project-delete-overlay]`)){if(e.target.closest(`.bridge-project-delete__modal`)&&!t)return;m.bulkDeletingProjects||(m.bulkDeleteProjectIds=[],U());return}}),a.addEventListener(`keydown`,e=>{let t=e.target.closest(`[data-project-rename-input]`);if(t){if(e.key===`Enter`){e.preventDefault();let n=t.getAttribute(`data-project-rename-input`)||``,r=a.querySelector(`[data-project-rename-save="${n}"]`);r instanceof HTMLButtonElement&&!r.disabled&&r.click()}else e.key===`Escape`&&(e.preventDefault(),W(),J());return}let n=e.target.closest(`[data-project-description-input]`);if(n){if(e.key===`Enter`){e.preventDefault();let t=n.getAttribute(`data-project-description-input`)||``,r=a.querySelector(`[data-project-rename-save="${t}"]`);r instanceof HTMLButtonElement&&!r.disabled&&r.click()}else e.key===`Escape`&&(e.preventDefault(),W(),J());return}let r=e.target.closest(`[data-project-launch-url]`);if(!r||e.target.closest(`.bridge-table-select`)||e.key!==`Enter`&&e.key!==` `||(e.preventDefault(),r.dataset.projectLocked===`true`)||m.editingProjectId)return;let i=r.getAttribute(`data-project-launch-url`);i&&(ie(r.getAttribute(`data-project-id`)||``,{useBeacon:!0}),window.location.href=i)}),a.addEventListener(`input`,e=>{let t=e.target.closest(`[data-project-search]`);if(t instanceof HTMLInputElement){let e=t.selectionStart,n=t.selectionEnd;m.searchQuery=t.value,J(),le(e,n);return}let n=e.target.closest(`[data-project-rename-input]`);if(n){let e=n.getAttribute(`data-project-rename-input`)||``;m.pendingProjectNameById[e]=n.value,m.dirtyProjectById[e]=!0,G(e);return}let r=e.target.closest(`[data-project-description-input]`);if(r){let e=r.getAttribute(`data-project-description-input`)||``;m.pendingProjectDescriptionById[e]=r.value,m.dirtyProjectById[e]=!0,G(e)}}),c.addEventListener(`input`,e=>{let t=e.target.closest(`[data-project-owner-search]`);if(t instanceof HTMLInputElement){let e=t.selectionStart,n=t.selectionEnd;m.ownerPickerSearchQuery=t.value,H(),Ee(e,n)}}),document.addEventListener(`click`,e=>{if(m.editingProjectId&&!e.target.closest(`[data-project-rename-editor]`)){W(),J();return}if(m.openMenuProjectId){if(e.target.closest(`[data-project-actions]`)||e.target.closest(`.bridge-projects-table__floating-menu`))return;z();return}if(m.ownerPickerProjectId){if(e.target.closest(`[data-project-owner-edit]`)||e.target.closest(`[data-project-owner-picker]`))return;B()}if(m.sortPresetMenuOpen){if(e.target.closest(`[data-project-sort]`))return;V(),J()}});let $=()=>{document.visibilityState===`visible`&&Le({immediate:!0})};document.addEventListener(`visibilitychange`,$),window.addEventListener(`pageshow`,$),window.addEventListener(`focus`,$),X().catch(e=>{m.loading=!1,A(e instanceof Error?e.message:`Unable to load projects.`,`error`)})})();