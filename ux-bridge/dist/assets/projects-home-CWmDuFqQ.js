(function(){let e=`ux-bridge-project-comment-summary`,t=`ux-bridge-project-thumbnail-renders`,n=1440*60*1e3,r=document.querySelector(`[data-projects-root]`),i=document.querySelector(`[data-projects-hero-actions]`),a=document.createElement(`div`),o=document.createElement(`div`),s=document.createElement(`div`),c=0,l=0,u=0,d=null;if(!r)return;a.className=`bridge-projects__thumbnail-generator`,a.setAttribute(`aria-hidden`,`true`),document.body.append(a),o.className=`bridge-projects__menu-host`,document.body.append(o),s.className=`bridge-projects__modal-host`,document.body.append(s);let f={loading:!0,projects:[],canCreateProjects:!1,canDuplicateProjects:!1,status:``,tone:`neutral`,toastClosing:!1,creating:!1,commentSummaryByProject:new Map,openMenuProjectId:``,openMenuPosition:null,ownerPickerProjectId:``,ownerPickerPosition:null,ownerPickerSearchQuery:``,updatingOwnerProjectId:``,editingProjectId:``,renamingProjectId:``,pendingProjectNameById:{},pendingProjectDescriptionById:{},dirtyProjectById:{},deleteModalProjectId:``,deletingProjectId:``,exitingProjectId:``,highlightedProjectId:``,summaryRefreshTimer:0,summaryRequestToken:0,thumbnailActiveProjectId:``,thumbnailRequestToken:``,thumbnailFailures:new Set,thumbnailRefreshStarted:!1,loadedThumbnailDataByProject:new Map,recentProjectOpenById:{},sortKey:`recentOpen`,sortDirection:`desc`,sortPresetMenuOpen:!1,searchQuery:``,availableUsers:[],selectedProjectIds:[],bulkDuplicatingProjects:!1,bulkDeleteProjectIds:[],bulkDeletingProjects:!1};function p(){if(window.uxBridgeUser?.email)return window.uxBridgeUser;try{let e=sessionStorage.getItem(`ux-bridge-user`);return e?JSON.parse(e):null}catch{return null}}function m(){return`ux-bridge-project-recent-open:${String(p()?.email||`anonymous`).trim().toLowerCase()}`}function h(e,t){return`ux-bridge-comments-seen:${String(p()?.email||`anonymous`).trim().toLowerCase()}:${e}:${t}`}function g(e,t){try{let n=localStorage.getItem(h(e,t));if(!n)return{lastSeenCommentId:``,lastSeenAt:0};let r=JSON.parse(n);return r&&typeof r==`object`?{lastSeenCommentId:String(r.lastSeenCommentId||``).trim(),lastSeenAt:Number(r.lastSeenAt)||0}:{lastSeenCommentId:String(n||``).trim(),lastSeenAt:0}}catch{return{lastSeenCommentId:``,lastSeenAt:0}}}function _(){try{let e=localStorage.getItem(m());if(!e)return{};let t=JSON.parse(e);return t&&typeof t==`object`?t:{}}catch{return{}}}function v(e){try{localStorage.setItem(m(),JSON.stringify(e))}catch{}}function y(e=``){return Number(f.recentProjectOpenById?.[e])||0}function b(e={}){return!e||typeof e!=`object`?{}:Object.fromEntries(Object.entries(e).map(([e,t])=>[String(e||``).trim(),Number(t)||0]).filter(([e,t])=>e&&t>0))}function x(...e){let t={};return e.forEach(e=>{let n=b(e);Object.entries(n).forEach(([e,n])=>{t[e]=Math.max(Number(t[e])||0,Number(n)||0)})}),t}function S(e={},t={}){let n=b(e),r=b(t),i=Object.keys(n),a=Object.keys(r);return i.length===a.length?i.every(e=>Number(n[e])===Number(r[e])):!1}function C(e={}){let t=b(e);f.recentProjectOpenById=t,v(t)}function ee(e={},{useBeacon:t=!1}={}){let n=b(e);if(!Object.keys(n).length)return;let r=JSON.stringify({action:`syncRecentOpenMap`,recentProjectOpenById:n});if(t&&navigator.sendBeacon){let e=new Blob([r],{type:`application/json`});navigator.sendBeacon(`/api/projects`,e);return}fetch(`/api/projects`,{method:`POST`,credentials:`include`,headers:{"Content-Type":`application/json`},body:r,keepalive:t}).catch(()=>{})}function te(e=``,t=Date.now(),{useBeacon:n=!1}={}){let r=String(e||``).trim();if(!r)return;let i=JSON.stringify({action:`markRecentOpen`,project:r,openedAt:t});if(n&&navigator.sendBeacon){let e=new Blob([i],{type:`application/json`});navigator.sendBeacon(`/api/projects`,e);return}fetch(`/api/projects`,{method:`POST`,credentials:`include`,headers:{"Content-Type":`application/json`},body:i,keepalive:n}).catch(()=>{})}function ne(e=``,{useBeacon:t=!1}={}){if(!e)return;let n=Date.now();C(x(f.recentProjectOpenById,{[e]:n})),te(e,n,{useBeacon:t})}function w(e={}){let t=x(f.recentProjectOpenById,e.recentProjectOpenById);S(t,f.recentProjectOpenById)||C(t)}function T(){return{totalComments:0,unreadComments:0,unreadMentions:0}}function re(e){let t=D(p()?.email);return!e||!t?!1:t===D(e.ownerEmail)?!0:(Array.isArray(e.projectMembers)?e.projectMembers:[]).some(e=>{let n=D(e?.email),r=String(e?.status||``).trim().toLowerCase();return n===t&&(r===`active`||r===`pending`)})}function E(e){return String(e??``).replaceAll(`&`,`&amp;`).replaceAll(`<`,`&lt;`).replaceAll(`>`,`&gt;`).replaceAll(`"`,`&quot;`)}function ie(e){return String(e??``).replace(/[.*+?^${}()|[\]\\]/g,`\\$&`)}function D(e){return String(e||``).trim().toLowerCase()}function O(e,t){let n=String(e??``),r=String(t||``).trim();if(!r)return E(n);let i=RegExp(`(${ie(r)})`,`gi`);return E(n).replace(i,`<mark class="bridge-table-search__highlight">$1</mark>`)}function ae(e,t){let n=String(t||``).trim().toLowerCase();return n?[e.name,e.description,e.ownerName].map(e=>String(e||``).toLowerCase()).some(e=>e.includes(n)):!0}function oe(e,t){let n=String(t||``).trim().toLowerCase();return n?[e.fullName,e.email,e.role].map(e=>String(e||``).toLowerCase()).some(e=>e.includes(n)):!0}function se(e=null,t=null){window.requestAnimationFrame(()=>{let n=r.querySelector(`[data-project-search]`);n instanceof HTMLInputElement&&(n.focus(),typeof e==`number`&&typeof t==`number`&&n.setSelectionRange(e,t))})}function ce(e){let t=String(e||``).trim().split(/\s+/).filter(Boolean);return t.length?t.slice(0,2).map(e=>e[0]?.toUpperCase()||``).join(``):`UX`}function le(e){return e===`error`?`
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
    `}function k(){if(window.clearTimeout(c),window.clearTimeout(l),!f.status){f.toastClosing=!1;return}f.toastClosing=!0,J(),l=window.setTimeout(()=>{f.status=``,f.tone=`neutral`,f.toastClosing=!1,J()},260)}function ue(e=``){window.clearTimeout(u),f.highlightedProjectId=e,e&&(u=window.setTimeout(()=>{f.highlightedProjectId===e&&(f.highlightedProjectId=``,J())},2e3))}function A(){let e=new Set(f.projects.map(e=>e.id));return f.selectedProjectIds.filter(t=>e.has(t))}function de(e=``){return A().includes(e)}function fe(e,t){let n=new Set(A());t?n.add(e):n.delete(e),f.selectedProjectIds=Array.from(n)}function pe(){f.selectedProjectIds=A()}function j(e=``,t=`neutral`){if(window.clearTimeout(c),window.clearTimeout(l),!e){k();return}f.status=e,f.tone=t,f.toastClosing=!1,c=window.setTimeout(()=>{k()},4e3),J()}function me(){try{let e=localStorage.getItem(t);if(!e)return{};let n=JSON.parse(e);return n&&typeof n==`object`?n:{}}catch{return{}}}function he(e){try{localStorage.setItem(t,JSON.stringify(e))}catch{}}function ge(e){let t=me(),r=`${e.pathname}${e.searchParams.get(`table-thumb`)===`1`?`?table-thumb=1`:e.search}`,i=t[r],a=Date.now();if(i&&typeof i==`object`&&typeof i.token==`string`&&typeof i.createdAt==`number`&&a-i.createdAt<n)return i.token;let o=String(a);return t[r]={token:o,createdAt:a},he(t),o}function M(e){return String(e?.thumbnailUrl||e?.launchUrl||``).trim()}function N(e){return!!String(e?.thumbnailDataUrl||``).trim()}function _e(e){let t=String(e?.thumbnailDataUrl||``).trim(),r=Number(e?.thumbnailUpdatedAt)||0,i=String(e?.thumbnailSourceUrl||``).trim(),a=M(e);return!!(t&&r&&i===a&&Date.now()-r<n)}function ve(e){return!e||f.thumbnailFailures.has(e.id)?!1:!_e(e)}function ye(){return d?.isConnected?d:(d=document.createElement(`iframe`),d.className=`bridge-projects__thumbnail-generator-frame`,d.setAttribute(`tabindex`,`-1`),a.replaceChildren(d),d)}function be(e,t){let n=M(e);if(!n)return``;let r=new URL(n,window.location.origin),i=ge(r);return r.searchParams.set(`project`,e.id),r.searchParams.set(`thumb-capture`,`1`),r.searchParams.set(`thumb-request`,t),r.searchParams.set(`thumb-load`,i),`${r.pathname}${r.search}`}function xe(e){let t=N(e),n=f.thumbnailActiveProjectId===e.id,r=!!e?.isLocked;return`
      ${t?`<img class="bridge-projects-table__thumb-image" src="${E(e.thumbnailDataUrl)}" alt="" loading="lazy" data-project-thumbnail-image="${E(e.id)}" />`:``}
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
        aria-label="Refresh thumbnail for ${E(e.name)}"
        data-tooltip="Refresh Image"
        data-project-thumbnail-refresh="${E(e.id)}"
        ${n?`disabled`:``}
      >
        <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
          <path d="M20 11a8 8 0 0 0-14.9-4H3.5"></path>
          <path d="M4 4v4h4"></path>
          <path d="M4 13a8 8 0 0 0 14.9 4H20.5"></path>
          <path d="M20 20v-4h-4"></path>
        </svg>
      </button>
    `}function Se(e,t){if(!e||!t)return;let n=N(t),r=f.thumbnailActiveProjectId===t.id,i=String(t.thumbnailDataUrl||``),a=n&&f.loadedThumbnailDataByProject.get(t.id)===i;e.className=`bridge-projects-table__thumb${n?` is-ready`:``}${r?` is-loading`:``}${a?` is-image-ready`:``}`,e.innerHTML=xe(t);let o=e.querySelector(`[data-project-thumbnail-image]`);if(!o)return;let s=()=>{f.loadedThumbnailDataByProject.set(t.id,i),e.classList.add(`is-image-ready`)};if(o.complete&&o.naturalWidth>0){s();return}o.addEventListener(`load`,s,{once:!0})}function P(e=[]){let t=e.length?new Set(e):null;r.querySelectorAll(`[data-project-thumbnail-cell]`).forEach(e=>{let n=e.getAttribute(`data-project-thumbnail-cell`)||``;if(t&&!t.has(n))return;let r=f.projects.find(e=>e.id===n);r&&Se(e,r)})}function Ce(e){return e.map(e=>`${e.id}:${e.hasOverview?`overview,`:``}${(e.pages||[]).map(e=>e.id).join(`,`)}`).join(`|`)}function F(t){try{let n=sessionStorage.getItem(e);if(!n)return null;let r=JSON.parse(n);return!r||r.expiresAt<=Date.now()?(sessionStorage.removeItem(e),null):r.key!==Ce(t)||!r.entries?null:new Map(r.entries)}catch{return null}}function I(t,n){try{sessionStorage.setItem(e,JSON.stringify({key:Ce(t),expiresAt:Date.now()+3e4,entries:Array.from(n.entries())}))}catch{}}function we(){window.clearTimeout(f.summaryRefreshTimer),f.summaryRefreshTimer=0}function L(){r.querySelectorAll(`[data-project-menu-toggle]`).forEach(e=>{let t=e.getAttribute(`data-project-menu-toggle`)||``,n=!!(t&&f.openMenuProjectId===t);e.setAttribute(`aria-expanded`,n?`true`:`false`)}),r.querySelectorAll(`[data-project-owner-edit]`).forEach(e=>{let t=e.getAttribute(`data-project-owner-edit`)||``,n=!!(t&&f.ownerPickerProjectId===t);e.setAttribute(`aria-expanded`,n?`true`:`false`)}),Oe(),V()}function R(){!f.openMenuProjectId&&!f.openMenuPosition||(f.openMenuProjectId=``,f.openMenuPosition=null,L())}function z(){!f.ownerPickerProjectId&&!f.ownerPickerPosition||(f.ownerPickerProjectId=``,f.ownerPickerPosition=null,f.ownerPickerSearchQuery=``,L())}function B(){f.sortPresetMenuOpen&&=!1}function Te(e,t){let n=e.getBoundingClientRect(),r=n.top-12>=134;f.ownerPickerProjectId=``,f.ownerPickerPosition=null,f.ownerPickerSearchQuery=``,f.openMenuProjectId=t,f.openMenuPosition={top:r?n.top-134-8:n.bottom+8,left:Math.min(Math.max(12,n.right-176),window.innerWidth-176-12)},L()}function Ee(e=null,t=null){window.requestAnimationFrame(()=>{let n=o.querySelector(`[data-project-owner-search]`);n instanceof HTMLInputElement&&(n.focus(),typeof e==`number`&&typeof t==`number`&&n.setSelectionRange(e,t))})}function De(e,t){let n=e.getBoundingClientRect(),r=n.top-12>=340;f.openMenuProjectId=``,f.openMenuPosition=null,f.ownerPickerProjectId=t,f.ownerPickerSearchQuery=``,f.ownerPickerPosition={top:r?n.top-340-8:n.bottom+8,left:Math.min(Math.max(12,n.left-8),window.innerWidth-320-12)},L(),Ee()}function Oe(){if(!f.openMenuProjectId||!f.openMenuPosition){o.innerHTML=``;return}let e=f.projects.find(e=>e.id===f.openMenuProjectId);if(!e){o.innerHTML=``;return}let t=!!e.canManageIdentity,n=f.canDuplicateProjects&&e.kind===`dynamic`,r=[t?`
            <button
              class="bridge-projects-table__menu-item"
              type="button"
              role="menuitem"
              data-project-rename="${E(e.id)}"
            >
              Rename Project
            </button>
          `:``,n?`
            <button
              class="bridge-projects-table__menu-item"
              type="button"
              role="menuitem"
              data-project-duplicate="${E(e.id)}"
            >
              Duplicate
            </button>
          `:``,t?`
            <button
              class="bridge-projects-table__menu-item bridge-projects-table__menu-item--danger"
              type="button"
              role="menuitem"
              data-project-delete="${E(e.id)}"
            >
              Delete
            </button>
          `:``].filter(Boolean);if(!r.length){o.innerHTML=``;return}o.innerHTML=`
      <div
        class="bridge-projects-table__menu bridge-projects-table__floating-menu"
        role="menu"
        aria-label="Project options"
        style="top:${Math.round(f.openMenuPosition.top)}px; left:${Math.round(f.openMenuPosition.left)}px;"
      >
        ${r.join(``)}
      </div>
    `}function V(){if(!f.ownerPickerProjectId||!f.ownerPickerPosition){(!f.openMenuProjectId||!f.openMenuPosition)&&(o.innerHTML=``);return}let e=f.projects.find(e=>e.id===f.ownerPickerProjectId);if(!e){z();return}let t=f.availableUsers.filter(e=>oe(e,f.ownerPickerSearchQuery));o.innerHTML=`
      <div
        class="bridge-projects-table__menu bridge-projects-table__floating-menu bridge-projects-table__owner-picker"
        data-project-owner-picker
        role="dialog"
        aria-label="Choose project owner"
        style="top:${Math.round(f.ownerPickerPosition.top)}px; left:${Math.round(f.ownerPickerPosition.left)}px;"
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
              value="${E(f.ownerPickerSearchQuery)}"
              placeholder="Search users"
              aria-label="Search users"
              data-project-owner-search
            />
          </label>
        </div>
        <div class="bridge-projects-table__owner-picker-list">
          ${t.length?t.map(t=>{let n=D(t.email)===D(e.ownerEmail),r=ce(t.fullName||t.email||`User`),i=t.avatarColor?` style="--avatar-bg:${E(t.avatarColor)}"`:``,a=t.avatarUrl?`<span class="bridge-projects-table__owner-avatar has-photo"${i}><img src="${E(t.avatarUrl)}" alt="" /></span>`:`<span class="bridge-projects-table__owner-avatar"${i}>${E(r)}</span>`;return`
                      <button
                        class="bridge-projects-table__owner-picker-item${n?` is-current`:``}"
                        type="button"
                        data-project-owner-option="${E(e.id)}"
                        data-owner-email="${E(t.email)}"
                        ${n||f.updatingOwnerProjectId===e.id?`disabled`:``}
                      >
                        ${a}
                        <span class="bridge-projects-table__owner-picker-copy">
                          <strong>${O(t.fullName||t.email,f.ownerPickerSearchQuery)}</strong>
                          <span>${O(t.email,f.ownerPickerSearchQuery)}</span>
                        </span>
                        ${n?`<span class="bridge-projects-table__owner-picker-status">Current</span>`:``}
                      </button>
                    `}).join(``):`<div class="bridge-table-search__empty bridge-projects-table__owner-picker-empty">No users match your search.</div>`}
        </div>
      </div>
    `}function H(){let e=Array.isArray(f.bulkDeleteProjectIds)?f.bulkDeleteProjectIds.filter(Boolean):[];if(!e.length){s.innerHTML=``;return}let t=e.map(e=>f.projects.find(t=>t.id===e)).filter(Boolean);if(!t.length){s.innerHTML=``;return}let n=t.length>1,r=t[0];s.innerHTML=`
      <div class="bridge-project-delete__modal-shell" data-project-delete-overlay>
        <div class="bridge-project-delete__modal" role="dialog" aria-modal="true" aria-labelledby="project-delete-title">
          <div class="bridge-project-delete__head">
            <div>
              <p class="bridge-project-delete__eyebrow">Project action</p>
              <h2 id="project-delete-title">${n?`Delete ${t.length} projects?`:`Delete ${E(r.name)}?`}</h2>
              <p>${n?`This will remove the selected projects and their comments. This action can’t be undone.`:`This will remove the project and its comments. This action can’t be undone.`}</p>
            </div>
            <button class="bridge-project-delete__close" type="button" aria-label="Close delete dialog" data-close-project-delete>×</button>
          </div>
          ${n?`
                <div class="bridge-project-delete__list">
                  ${t.map(e=>`<div class="bridge-project-delete__list-item">${E(e.name)}</div>`).join(``)}
                </div>
              `:``}
          <div class="bridge-project-delete__actions">
            <button class="bridge-project-delete__button bridge-project-delete__button--secondary" type="button" data-close-project-delete ${f.bulkDeletingProjects?`disabled`:``}>Cancel</button>
            <button class="bridge-project-delete__button bridge-project-delete__button--danger" type="button" data-confirm-project-delete ${f.bulkDeletingProjects?`disabled`:``}>
              ${f.bulkDeletingProjects?`Deleting...`:n?`Delete projects`:`Delete project`}
            </button>
          </div>
        </div>
      </div>
    `}function U({preserveDraft:e=!1}={}){f.editingProjectId&&=(e||(delete f.pendingProjectNameById[f.editingProjectId],delete f.pendingProjectDescriptionById[f.editingProjectId],delete f.dirtyProjectById[f.editingProjectId]),``)}function W(e=``){if(!e)return;let t=f.projects.find(t=>t.id===e),n=r.querySelector(`[data-project-rename-save="${e}"]`);r.querySelector(`[data-project-rename-input="${e}"]`),r.querySelector(`[data-project-description-input="${e}"]`),!(!t||!(n instanceof HTMLButtonElement))&&(n.disabled=f.renamingProjectId===e||!f.dirtyProjectById[e])}function G(){return f.sortKey===`recentOpen`?`recentOpen`:`createdAt`}function ke(){return G()===`recentOpen`?`Most Recent`:`By Date`}function Ae(e=`recentOpen`){f.sortKey=e===`recentOpen`?`recentOpen`:`createdAt`,f.sortDirection=`desc`,B()}function K(e,t=T()){let n=Number(t.totalComments)||0,r=Number(t.unreadComments)||0,i=Number(t.unreadMentions)||0,a=re(e),o=[];a&&r>0&&r!==i&&o.push({count:r,label:`New`,modifierClass:` bridge-projects-table__comments-badge--new`}),i>0&&o.push({count:i,label:i===1?`Mention`:`Mentions`,modifierClass:` bridge-projects-table__comments-badge--mentions`});let s=o.length>0;return`
      <div class="bridge-projects-table__comments${s?` bridge-projects-table__comments--badge-only bridge-projects-table__comments--badge-stack`:``}">
        ${s?o.map(e=>{let t=e.count>99?`99+`:e.count;return`<span class="bridge-projects-table__comments-badge${e.modifierClass}"><span>${t}</span><span>${E(e.label)}</span></span>`}).join(``):`<span class="bridge-projects-table__count">${n}</span>`}
      </div>
    `}function je(){r.querySelectorAll(`[data-project-comments-cell]`).forEach(e=>{let t=e.getAttribute(`data-project-comments-cell`)||``;e.innerHTML=K(f.projects.find(e=>e.id===t),f.commentSummaryByProject.get(t)||T())})}function Me(){let e=f.sortDirection===`desc`?-1:1,t=[...f.projects];return t.sort((t,n)=>{let r=0;if(f.sortKey===`owner`)r=String(t.ownerName||``).localeCompare(String(n.ownerName||``),void 0,{sensitivity:`base`}),r||=String(t.name||``).localeCompare(String(n.name||``),void 0,{sensitivity:`base`});else if(f.sortKey===`pages`)r=Number(t.pageCount||0)-Number(n.pageCount||0),r||=String(t.name||``).localeCompare(String(n.name||``),void 0,{sensitivity:`base`});else if(f.sortKey===`comments`){let e=f.commentSummaryByProject.get(t.id)||{totalComments:0,unreadComments:0},i=f.commentSummaryByProject.get(n.id)||{totalComments:0,unreadComments:0};r=Number(e.totalComments||0)-Number(i.totalComments||0),r||=Number(e.unreadComments||0)-Number(i.unreadComments||0),r||=String(t.name||``).localeCompare(String(n.name||``),void 0,{sensitivity:`base`})}else f.sortKey===`createdAt`?(r=Number(t.createdAt||0)-Number(n.createdAt||0),r||=String(t.name||``).localeCompare(String(n.name||``),void 0,{sensitivity:`base`})):f.sortKey===`recentOpen`?(r=y(t.id)-y(n.id),r||=Number(t.createdAt||0)-Number(n.createdAt||0),r||=String(t.name||``).localeCompare(String(n.name||``),void 0,{sensitivity:`base`})):(r=String(t.name||``).localeCompare(String(n.name||``),void 0,{sensitivity:`base`}),r||=String(t.ownerName||``).localeCompare(String(n.ownerName||``),void 0,{sensitivity:`base`}));return r*e}),t}function q(e){return f.sortKey===e?f.sortDirection===`desc`?`
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
      `}function J(){let e=f.status?`
          <div class="bridge-projects__toast${f.tone===`error`?` bridge-projects__toast--error`:``}${f.toastClosing?` is-closing`:``}" role="status" aria-live="polite">
            ${le(f.tone)}
            <span class="bridge-projects__toast-message">${E(f.status)}</span>
            <button class="bridge-projects__toast-dismiss" type="button" aria-label="Dismiss notification" data-dismiss-status>
              <span aria-hidden="true">×</span>
            </button>
          </div>
        `:``,t=f.canCreateProjects?`
          <button class="bridge-projects__create" type="button" data-create-project ${f.creating?`disabled`:``}>
            ${f.creating?`Creating…`:`New Project`}
          </button>
        `:``;i&&(i.innerHTML=t);let n=(f.loading?[]:Me()).filter(e=>ae(e,f.searchQuery)),a=!f.loading&&f.projects.length>5,o=f.canDuplicateProjects||f.projects.some(e=>!!e.canManageIdentity),s=o&&!f.loading&&f.projects.length>5,c=!f.loading&&f.projects.length>5,l=A(),u=l.length,d=n.map(e=>e.id),p=d.length?d.every(e=>l.includes(e)):!1,m=a?`
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
                value="${E(f.searchQuery)}"
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
              aria-expanded="${f.sortPresetMenuOpen?`true`:`false`}"
              data-project-sort-toggle
            >
              <span>${E(ke())}</span>
              <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">
                <path d="m4 6 4 4 4-4"></path>
              </svg>
            </button>
            ${f.sortPresetMenuOpen?`
                    <div class="bridge-projects-table__menu bridge-table-sort__menu" role="menu" aria-label="Sort projects">
                      <button
                        class="bridge-projects-table__menu-item${G()===`recentOpen`?` is-selected`:``}"
                        type="button"
                        role="menuitemradio"
                        aria-checked="${G()===`recentOpen`?`true`:`false`}"
                        data-project-sort-option="recentOpen"
                      >
                        Most Recent
                      </button>
                      <button
                        class="bridge-projects-table__menu-item${G()===`createdAt`?` is-selected`:``}"
                        type="button"
                        role="menuitemradio"
                        aria-checked="${G()===`createdAt`?`true`:`false`}"
                        data-project-sort-option="createdAt"
                      >
                        By Date
                      </button>
                    </div>
                  `:``}
          </div>
        `:``,g=c?`
          <div class="bridge-table-controls">
            ${m}
            ${h}
          </div>
        `:m,_=A().map(e=>f.projects.find(t=>t.id===e)).filter(Boolean),v=_.length>0&&_.every(e=>!!e.canManageIdentity),y=s&&u?`
            <div class="bridge-table-bulk-bar">
              <span class="bridge-table-bulk-bar__count">${u} selected</span>
              <div class="bridge-table-bulk-bar__actions">
                <button class="bridge-table-bulk-bar__button" type="button" data-project-bulk-duplicate ${f.bulkDuplicatingProjects||f.bulkDeletingProjects?`disabled`:``}>
                  ${f.bulkDuplicatingProjects?`Duplicating...`:`Duplicate`}
                </button>
                ${v?`
                        <button class="bridge-table-bulk-bar__button bridge-table-bulk-bar__button--danger" type="button" data-project-bulk-delete ${f.bulkDeletingProjects||f.bulkDuplicatingProjects?`disabled`:``}>
                          ${f.bulkDeletingProjects?`Deleting...`:`Delete`}
                        </button>
                      `:``}
              </div>
            </div>
          `:``,b=f.loading?`
          <article class="bridge-projects__loading">
            <p>Loading projects…</p>
          </article>
        `:n.length?n.map(e=>{let t=f.commentSummaryByProject.get(e.id)||T(),n=ce(e.ownerName||`Unknown`),r=e.ownerAvatarColor?` style="--avatar-bg:${E(e.ownerAvatarColor)}"`:``,i=e.ownerAvatarUrl?`<span class="bridge-projects-table__owner-avatar has-photo"${r}><img src="${E(e.ownerAvatarUrl)}" alt="" /></span>`:`<span class="bridge-projects-table__owner-avatar" aria-hidden="true"${r}>${E(n)}</span>`,a=!!e.canManageIdentity,c=a&&f.availableUsers.length>0,l=f.canDuplicateProjects&&e.kind===`dynamic`,u=a||l,d=N(e),p=f.thumbnailActiveProjectId===e.id,m=f.editingProjectId===e.id,h=f.renamingProjectId===e.id;String(f.pendingProjectNameById[e.id]||e.name||``).trim();let g=String(f.pendingProjectDescriptionById[e.id]??e.description??``),_=!!f.dirtyProjectById[e.id];return`
              <tr
                class="bridge-projects-table__row${f.highlightedProjectId===e.id?` is-newly-created`:``}${f.exitingProjectId===e.id?` is-deleting`:``}"
                data-project-id="${E(e.id)}"
                data-project-launch-url="${E(e.launchUrl)}"
                data-project-locked="${e.isLocked?`true`:`false`}"
                tabindex="0"
                role="link"
                aria-label="Open ${E(e.name)}"
              >
                ${s?`
                        <td class="bridge-table-select__cell">
                          <label class="bridge-table-select">
                            <input
                              type="checkbox"
                              aria-label="Select ${E(e.name)}"
                              data-project-select="${E(e.id)}"
                              ${de(e.id)?`checked`:``}
                            />
                            <span class="bridge-table-select__control" aria-hidden="true"></span>
                          </label>
                        </td>
                      `:``}
                <td class="bridge-projects-table__project-cell">
                  <div class="bridge-projects-table__project">
                    <div
                      class="bridge-projects-table__thumb${d?` is-ready`:``}${p?` is-loading`:``}"
                      data-project-thumbnail-cell="${E(e.id)}"
                    >
                      ${xe(e)}
                    </div>
                    <div class="bridge-projects-table__identity">
                      ${m&&a?`
                            <div class="bridge-projects-table__rename-editor" data-project-rename-editor>
                              <div class="bridge-projects-table__rename-fields">
                                <div class="bridge-projects-table__field-wrap">
                                  <input
                                    class="bridge-projects-table__rename-input"
                                    type="text"
                                    value="${E(f.pendingProjectNameById[e.id]||e.name)}"
                                    aria-label="Rename ${E(e.name)}"
                                    data-project-rename-input="${E(e.id)}"
                                    ${h?`disabled`:``}
                                  />
                                  <button
                                    class="bridge-projects-table__field-clear"
                                    type="button"
                                    aria-label="Clear project name"
                                    data-project-rename-clear="${E(e.id)}"
                                    ${h?`disabled`:``}
                                  >
                                    <span aria-hidden="true">×</span>
                                  </button>
                                </div>
                                <div class="bridge-projects-table__field-wrap bridge-projects-table__field-wrap--textarea">
                                  <textarea
                                    class="bridge-projects-table__rename-textarea"
                                    aria-label="Edit description for ${E(e.name)}"
                                    data-project-description-input="${E(e.id)}"
                                    rows="2"
                                    ${h?`disabled`:``}
                                  >${E(g)}</textarea>
                                  <button
                                    class="bridge-projects-table__field-clear bridge-projects-table__field-clear--textarea"
                                    type="button"
                                    aria-label="Clear project description"
                                    data-project-description-clear="${E(e.id)}"
                                    ${h?`disabled`:``}
                                  >
                                    <span aria-hidden="true">×</span>
                                  </button>
                                </div>
                              </div>
                              <button
                                class="bridge-projects-table__rename-save"
                                type="button"
                                aria-label="Save project details for ${E(e.name)}"
                                data-project-rename-save="${E(e.id)}"
                                ${h||!_?`disabled`:``}
                              >
                                <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                                  <path d="M5.5 12.5 9.5 16.5 18.5 7.5"></path>
                                </svg>
                              </button>
                            </div>
                          `:``}
                      ${m?``:`
                            <div class="bridge-projects-table__identity-top">
                                <strong>${O(e.name,f.searchQuery)}</strong>
                              ${a?`
                                      <button
                                        class="bridge-inline-edit-trigger bridge-projects-table__edit-trigger"
                                        type="button"
                                        aria-label="Edit ${E(e.name)}"
                                        data-project-edit-trigger="${E(e.id)}"
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
                            <span>${O(e.description||`A project inside UX Bridge.`,f.searchQuery)}</span>
                          `}
                    </div>
                  </div>
                </td>
                <td class="bridge-projects-table__owner-cell">
                  <div class="bridge-projects-table__owner-control">
                    <span class="bridge-projects-table__owner-pill">
                      ${i}
                      <span>${O(e.ownerName||`Unknown`,f.searchQuery)}</span>
                    </span>
                    ${c?`
                          <button
                            class="bridge-inline-edit-trigger bridge-projects-table__owner-edit"
                            type="button"
                            aria-label="Edit owner for ${E(e.name)}"
                            aria-haspopup="dialog"
                            aria-expanded="${f.ownerPickerProjectId===e.id?`true`:`false`}"
                            data-project-owner-edit="${E(e.id)}"
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
                <td class="bridge-projects-table__comments-cell" data-project-comments-cell="${E(e.id)}">
                  ${K(e,t)}
                </td>
                ${o?`
                        <td class="bridge-projects-table__actions-cell">
                          ${e.isLocked?`
                                <button
                                  class="bridge-projects-table__request"
                                  type="button"
                                  data-project-request-access="${E(e.id)}"
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
                                    aria-expanded="${f.openMenuProjectId===e.id?`true`:`false`}"
                                    aria-label="Project options for ${E(e.name)}"
                                    data-project-menu-toggle="${E(e.id)}"
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
            <td colspan="${s?o?`6`:`5`:o?`5`:`4`}">
              <div class="bridge-table-search__empty">No projects match your search.</div>
            </td>
          </tr>
        `;r.innerHTML=`
      ${e}
      ${f.loading?b:`
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
                                  ${p?`checked`:``}
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
                    ${o?`<th class="bridge-projects-table__actions-cell">Actions</th>`:``}
                  </tr>
                </thead>
                <tbody>${b}</tbody>
              </table>
            </div>
        `}
    `,H(),L()}function Y(e){!e||!e.id||(f.projects.findIndex(t=>t.id===e.id)>=0?f.projects=f.projects.map(t=>t.id===e.id?e:t):f.projects=[e,...f.projects],f.commentSummaryByProject.has(e.id)||f.commentSummaryByProject.set(e.id,T()))}function Ne(e){let t=f.projects.find(t=>t.id===e);if(!t)return;R(),f.pendingProjectNameById[e]=t.name||``,f.pendingProjectDescriptionById[e]=t.description||``,f.dirtyProjectById[e]=!1,f.editingProjectId=e,J();let n=r.querySelector(`[data-project-rename-input="${e}"]`);n instanceof HTMLInputElement&&window.requestAnimationFrame(()=>{n.focus(),n.select()})}async function X({background:e=!1}={}){e||(f.loading=!0,J());let t=await fetch(`/api/projects`,{credentials:`include`,cache:`no-store`}),n=await t.json().catch(()=>({}));if(!t.ok||!n?.ok)throw Error(n?.error||`Unable to load projects.`);f.projects=Array.isArray(n.projects)?n.projects:[],f.availableUsers=Array.isArray(n.availableUsers)?n.availableUsers:[];let i=b(n.recentProjectOpenById),a=x(i,_());C(a),S(a,i)||ee(a),pe(),f.canCreateProjects=!!n.canCreateProjects,f.canDuplicateProjects=!!n.canDuplicateProjects,f.editingProjectId&&!f.projects.some(e=>e.id===f.editingProjectId)&&U(),f.ownerPickerProjectId&&!f.projects.some(e=>e.id===f.ownerPickerProjectId)&&z(),f.commentSummaryByProject=F(f.projects)||new Map(f.projects.map(e=>[e.id,T()])),f.loading=!1,J();try{let e=sessionStorage.getItem(`ux-bridge-share-toast`);e&&(sessionStorage.removeItem(`ux-bridge-share-toast`),j(e))}catch{}if(Ie({immediate:!F(f.projects)}),f.thumbnailRefreshStarted=!0,f.thumbnailFailures.clear(),Q(),f.editingProjectId){let e=r.querySelector(`[data-project-rename-input="${f.editingProjectId}"]`);e instanceof HTMLInputElement&&window.requestAnimationFrame(()=>{e.focus(),e.select()})}}async function Pe(e,t=0){let n=e.map(e=>({project:e.id,pages:[...e.hasOverview?[`overview`]:[],...(Array.isArray(e.pages)?e.pages:[]).map(e=>String(e.id||``).trim()).filter(Boolean)]})).filter(e=>e.project&&e.pages.length);if(!n.length){let t=new Map(e.map(e=>[e.id,T()]));return I(e,t),t}try{let r=new URLSearchParams({summary:`projects`,projects:JSON.stringify(n)}),i=await fetch(`/api/comments?${r.toString()}`,{credentials:`include`,cache:`no-store`}),a=await i.json().catch(()=>({}));if(!i.ok||!a?.ok||!Array.isArray(a.projects))throw Error(`Unable to load project comment summaries.`);let o=new Map(e.map(e=>[e.id,T()]));return a.projects.forEach(t=>{let n=String(t?.project||``).trim(),r=e.find(e=>e.id===n);if(!n||!r)return;let i=(Array.isArray(t.summary)?t.summary:[]).reduce((e,t)=>{let n=String(t.page||``).trim(),i=g(r.id,n),a=Number(t.lastSeenAt||0),o=String(t.lastSeenCommentId||``)||i.lastSeenCommentId,s=e=>{if(!Array.isArray(e)||!e.length)return 0;if(!o)return e.length;let t=e.findIndex(e=>e===o);return t<0?e.length:Math.max(e.length-(t+1),0)};return e.totalComments+=Number(t.count||0),e.unreadComments+=a>0?Number(t.unreadCount||0):s(Array.isArray(t.commentIds)?t.commentIds:[]),e.unreadMentions+=a>0?Number(t.unreadMentionCount||0):s(Array.isArray(t.mentionCommentIds)?t.mentionCommentIds:[]),e},T());o.set(n,i)}),t&&t!==f.summaryRequestToken?null:(I(e,o),o)}catch{return new Map(e.map(e=>[e.id,T()]))}}async function Fe(){if(f.loading||document.visibilityState!==`visible`)return;let e=Date.now();f.summaryRequestToken=e;let t=await Pe(f.projects,e);if(!(!t||f.summaryRequestToken!==e)){if(f.commentSummaryByProject=t,f.loading||f.sortKey===`comments`){J();return}je()}}function Ie({immediate:e=!1}={}){we();let t=()=>{Fe().catch(()=>{}),f.summaryRefreshTimer=window.setTimeout(t,3e3)};if(e){t();return}f.summaryRefreshTimer=window.setTimeout(t,1200)}async function Le(e,t,n,r=`auto`){let i=await fetch(`/api/projects`,{method:`POST`,credentials:`include`,headers:{"Content-Type":`application/json`},body:JSON.stringify({action:`updateThumbnail`,project:e,sourceUrl:t,imageDataUrl:n,mode:r})}),a=await i.json().catch(()=>({}));if(!i.ok||!a?.ok||!a?.project)throw Error(a?.error||`Unable to update project thumbnail.`);return a.project}function Z(e=``){f.thumbnailActiveProjectId=``,f.thumbnailRequestToken=``,e&&P([e])}function Q(e=``,t=`auto`){if(f.thumbnailActiveProjectId||document.visibilityState!==`visible`)return;let n=e?f.projects.find(t=>t.id===e):f.projects.find(e=>ve(e));if(!n)return;let r=`${Date.now()}-${n.id}`;f.thumbnailActiveProjectId=n.id,f.thumbnailRequestToken=r,P([n.id]);let i=ye(),a=async i=>{if(i.origin!==window.location.origin)return;let o=i.data;if(!(!o||o.requestToken!==r||o.projectId!==n.id)){if(o.type===`uxbridge:thumbnail-capture-failed`){window.removeEventListener(`message`,a),f.thumbnailFailures.add(n.id),Z(n.id),Q();return}if(!(o.type!==`uxbridge:thumbnail-captured`||!o.imageDataUrl)){window.removeEventListener(`message`,a);try{let e=await Le(n.id,o.sourceUrl,o.imageDataUrl,t);f.loadedThumbnailDataByProject.delete(e.id),f.projects=f.projects.map(t=>t.id===e.id?e:t),P([e.id])}catch{f.thumbnailFailures.add(n.id)}finally{Z(n.id),e||Q()}}}};window.addEventListener(`message`,a),i.src=be(n,r)}async function Re(){if(!f.creating){f.creating=!0,J();try{let e=await fetch(`/api/projects`,{method:`POST`,credentials:`include`,headers:{"Content-Type":`application/json`},body:JSON.stringify({action:`createProject`})}),t=await e.json().catch(()=>({}));if(!e.ok||!t?.ok)throw Error(t?.error||`Unable to create project.`);f.creating=!1,w(t),Y(t.project),ue(t.project?.id||``),j(`Created ${t.project?.name||`new project`}.`),J(),X({background:!0}).catch(()=>{})}catch(e){f.creating=!1,j(e instanceof Error?e.message:`Unable to create project.`,`error`)}}}i&&i.addEventListener(`click`,async e=>{e.target.closest(`[data-create-project]`)&&await Re()});async function ze(e){if(e.target.closest(`[data-dismiss-status]`)){k();return}if(e.target.closest(`[data-create-project]`)){await Re();return}if(e.target.closest(`[data-project-sort-toggle]`)){e.preventDefault(),e.stopPropagation(),f.sortPresetMenuOpen=!f.sortPresetMenuOpen,J();return}let t=e.target.closest(`[data-project-sort-option]`);if(t){e.preventDefault(),e.stopPropagation(),Ae(t.getAttribute(`data-project-sort-option`)||`recentOpen`),J();return}let n=e.target.closest(`[data-sort-key]`);if(n){B();let e=n.getAttribute(`data-sort-key`)||``;if(!e)return;f.sortKey===e?(f.sortDirection===`asc`||(f.sortKey=`recentOpen`),f.sortDirection=`desc`):(f.sortKey=e,f.sortDirection=`asc`),J();return}let i=e.target.closest(`[data-project-thumbnail-refresh]`);if(i){e.preventDefault(),e.stopPropagation();let t=i.getAttribute(`data-project-thumbnail-refresh`)||``;if(!t||f.thumbnailActiveProjectId)return;f.thumbnailFailures.delete(t),Q(t,`manual`);return}let a=e.target.closest(`[data-project-request-access]`);if(a){e.preventDefault(),e.stopPropagation();let t=a.getAttribute(`data-project-request-access`)||``;if(!t)return;try{let e=await fetch(`/api/projects`,{method:`POST`,credentials:`include`,headers:{"Content-Type":`application/json`},body:JSON.stringify({action:`requestAccess`,project:t})}),n=await e.json().catch(()=>({}));if(!e.ok||!n?.ok)throw Error(n?.error||`Unable to request project access.`);j(n.message||`Access request sent.`),await X()}catch(e){j(e instanceof Error?e.message:`Unable to request project access.`,`error`)}return}let o=e.target.closest(`[data-project-menu-toggle]`);if(o){U();let e=o.getAttribute(`data-project-menu-toggle`)||``;f.openMenuProjectId===e?R():Te(o,e);return}let s=e.target.closest(`[data-project-owner-edit]`);if(s){e.preventDefault(),e.stopPropagation(),U();let t=s.getAttribute(`data-project-owner-edit`)||``;f.ownerPickerProjectId===t?z():De(s,t);return}if(e.target.closest(`[data-project-bulk-duplicate]`)){e.preventDefault(),e.stopPropagation();let t=A();if(!t.length)return;f.bulkDuplicatingProjects=!0,J();try{for(let e of t){let t=await fetch(`/api/projects`,{method:`POST`,credentials:`include`,headers:{"Content-Type":`application/json`},body:JSON.stringify({action:`duplicateProject`,project:e})}),n=await t.json().catch(()=>({}));if(!t.ok||!n?.ok)throw Error(n?.error||`Unable to duplicate selected projects.`);w(n),Y(n.project)}f.bulkDuplicatingProjects=!1,f.selectedProjectIds=[],j(`Duplicated ${t.length} ${t.length===1?`project`:`projects`}.`),J(),X({background:!0}).catch(()=>{})}catch(e){f.bulkDuplicatingProjects=!1,j(e instanceof Error?e.message:`Unable to duplicate selected projects.`,`error`),J()}return}if(e.target.closest(`[data-project-bulk-delete]`)){e.preventDefault(),e.stopPropagation();let t=A();if(!t.length)return;f.bulkDeleteProjectIds=t,H();return}let c=e.target.closest(`[data-project-rename]`);if(c){e.preventDefault(),e.stopPropagation(),Ne(c.getAttribute(`data-project-rename`)||``);return}let l=e.target.closest(`[data-project-edit-trigger]`);if(l){e.preventDefault(),e.stopPropagation(),Ne(l.getAttribute(`data-project-edit-trigger`)||``);return}let u=e.target.closest(`[data-project-rename-clear]`);if(u){e.preventDefault(),e.stopPropagation();let t=u.getAttribute(`data-project-rename-clear`)||``,n=r.querySelector(`[data-project-rename-input="${t}"]`);n instanceof HTMLInputElement&&(n.value=``,f.pendingProjectNameById[t]=``,f.dirtyProjectById[t]=!0,W(t),n.focus());return}let d=e.target.closest(`[data-project-description-clear]`);if(d){e.preventDefault(),e.stopPropagation();let t=d.getAttribute(`data-project-description-clear`)||``,n=r.querySelector(`[data-project-description-input="${t}"]`);n instanceof HTMLTextAreaElement&&(n.value=``,f.pendingProjectDescriptionById[t]=``,f.dirtyProjectById[t]=!0,W(t),n.focus());return}let p=e.target.closest(`[data-project-rename-save]`);if(p){e.preventDefault(),e.stopPropagation();let t=p.getAttribute(`data-project-rename-save`)||``,n=f.projects.find(e=>e.id===t),i=r.querySelector(`[data-project-rename-input="${t}"]`),a=r.querySelector(`[data-project-description-input="${t}"]`),o=String(i instanceof HTMLInputElement?i.value:f.pendingProjectNameById[t]||``).trim(),s=String(a instanceof HTMLTextAreaElement?a.value:f.pendingProjectDescriptionById[t]||``).trim();if(!t||!n)return;if(!o){j(`Project name is required.`,`error`),i instanceof HTMLInputElement&&i.focus();return}if(o===String(n.name||``).trim()&&s===String(n.description||``).trim()){U(),J();return}f.renamingProjectId=t,J();try{let e=await fetch(`/api/projects`,{method:`POST`,credentials:`include`,headers:{"Content-Type":`application/json`},body:JSON.stringify({action:`renameProject`,project:t,name:o,description:s})}),n=await e.json().catch(()=>({}));if(!e.ok||!n?.ok||!n?.project)throw Error(n?.error||`Unable to rename project.`);f.projects=f.projects.map(e=>e.id===t?n.project:e),U(),f.renamingProjectId=``,j(`Renamed project to ${n.project.name}.`),J()}catch(e){f.renamingProjectId=``,j(e instanceof Error?e.message:`Unable to rename project.`,`error`),J()}return}let m=e.target.closest(`[data-project-duplicate]`);if(m){let e=m.getAttribute(`data-project-duplicate`)||``;R();try{let t=await fetch(`/api/projects`,{method:`POST`,credentials:`include`,headers:{"Content-Type":`application/json`},body:JSON.stringify({action:`duplicateProject`,project:e})}),n=await t.json().catch(()=>({}));if(!t.ok||!n?.ok)throw Error(n?.error||`Unable to duplicate project.`);w(n),Y(n.project),j(`Duplicated ${n.project?.name||`project`}.`),J(),X({background:!0}).catch(()=>{})}catch(e){j(e instanceof Error?e.message:`Unable to duplicate project.`,`error`)}return}let h=e.target.closest(`[data-project-delete]`);if(h){let e=h.getAttribute(`data-project-delete`)||``;if(!f.projects.find(t=>t.id===e))return;R(),f.bulkDeleteProjectIds=[e],H();return}let g=e.target.closest(`[data-project-owner-option]`);if(g){e.preventDefault(),e.stopPropagation();let t=g.getAttribute(`data-project-owner-option`)||``,n=g.getAttribute(`data-owner-email`)||``,r=f.projects.find(e=>e.id===t);if(!t||!n||!r)return;f.updatingOwnerProjectId=t,V();try{let e=await fetch(`/api/projects`,{method:`POST`,credentials:`include`,headers:{"Content-Type":`application/json`},body:JSON.stringify({action:`updateProjectOwner`,project:t,ownerEmail:n})}),r=await e.json().catch(()=>({}));if(!e.ok||!r?.ok||!r?.project)throw Error(r?.error||`Unable to update project owner.`);f.projects=f.projects.map(e=>e.id===t?r.project:e),f.updatingOwnerProjectId=``,z(),j(`Updated owner for ${r.project.name}.`),J()}catch(e){f.updatingOwnerProjectId=``,j(e instanceof Error?e.message:`Unable to update project owner.`,`error`),V()}return}if(e.target.closest(`[data-project-owner-picker]`))return;let _=e.target.closest(`[data-project-launch-url]`);if(!_){B(),R(),z();return}if(e.target.closest(`[data-project-actions]`)||e.target.closest(`[data-project-rename-editor]`)||e.target.closest(`.bridge-table-select`)||e.target.closest(`[data-project-thumbnail-refresh]`)||_.dataset.projectLocked===`true`||f.editingProjectId)return;let v=_.getAttribute(`data-project-launch-url`),y=_.getAttribute(`data-project-id`)||``;v&&(ne(y,{useBeacon:!0}),window.location.href=v)}r.addEventListener(`click`,ze),o.addEventListener(`click`,ze),r.addEventListener(`change`,e=>{let t=e.target.closest(`[data-project-select]`);if(t instanceof HTMLInputElement){fe(t.getAttribute(`data-project-select`)||``,t.checked),J();return}let n=e.target.closest(`[data-project-select-all]`);if(n instanceof HTMLInputElement){let e=Me().filter(e=>ae(e,f.searchQuery)).map(e=>e.id),t=new Set(A());n.checked?e.forEach(e=>t.add(e)):e.forEach(e=>t.delete(e)),f.selectedProjectIds=Array.from(t),J()}}),s.addEventListener(`click`,async e=>{if(e.target.closest(`[data-confirm-project-delete]`)){let e=Array.isArray(f.bulkDeleteProjectIds)?f.bulkDeleteProjectIds.filter(Boolean):[],t=e.map(e=>f.projects.find(t=>t.id===e)).filter(Boolean);if(!t.length)return;f.bulkDeletingProjects=!0,H();try{for(let e of t){let t=await fetch(`/api/projects`,{method:`POST`,credentials:`include`,headers:{"Content-Type":`application/json`},body:JSON.stringify({action:`deleteProject`,project:e.id})}),n=await t.json().catch(()=>({}));if(!t.ok||!n?.ok)throw Error(n?.error||`Unable to delete project.`)}let n=new Set(e);f.bulkDeleteProjectIds=[],f.bulkDeletingProjects=!1,f.projects=f.projects.filter(e=>!n.has(e.id)),f.selectedProjectIds=A().filter(e=>!n.has(e)),j(`Deleted ${t.length} ${t.length===1?`project`:`projects`}.`),J(),X({background:!0}).catch(()=>{})}catch(e){f.bulkDeletingProjects=!1,j(e instanceof Error?e.message:`Unable to delete project.`,`error`),H()}return}let t=e.target.closest(`[data-close-project-delete]`);if(t||e.target.closest(`[data-project-delete-overlay]`)){if(e.target.closest(`.bridge-project-delete__modal`)&&!t)return;f.bulkDeletingProjects||(f.bulkDeleteProjectIds=[],H());return}}),r.addEventListener(`keydown`,e=>{let t=e.target.closest(`[data-project-rename-input]`);if(t){if(e.key===`Enter`){e.preventDefault();let n=t.getAttribute(`data-project-rename-input`)||``,i=r.querySelector(`[data-project-rename-save="${n}"]`);i instanceof HTMLButtonElement&&!i.disabled&&i.click()}else e.key===`Escape`&&(e.preventDefault(),U(),J());return}let n=e.target.closest(`[data-project-description-input]`);if(n){if(e.key===`Enter`){e.preventDefault();let t=n.getAttribute(`data-project-description-input`)||``,i=r.querySelector(`[data-project-rename-save="${t}"]`);i instanceof HTMLButtonElement&&!i.disabled&&i.click()}else e.key===`Escape`&&(e.preventDefault(),U(),J());return}let i=e.target.closest(`[data-project-launch-url]`);if(!i||e.target.closest(`.bridge-table-select`)||e.key!==`Enter`&&e.key!==` `||(e.preventDefault(),i.dataset.projectLocked===`true`)||f.editingProjectId)return;let a=i.getAttribute(`data-project-launch-url`);a&&(ne(i.getAttribute(`data-project-id`)||``,{useBeacon:!0}),window.location.href=a)}),r.addEventListener(`input`,e=>{let t=e.target.closest(`[data-project-search]`);if(t instanceof HTMLInputElement){let e=t.selectionStart,n=t.selectionEnd;f.searchQuery=t.value,J(),se(e,n);return}let n=e.target.closest(`[data-project-rename-input]`);if(n){let e=n.getAttribute(`data-project-rename-input`)||``;f.pendingProjectNameById[e]=n.value,f.dirtyProjectById[e]=!0,W(e);return}let r=e.target.closest(`[data-project-description-input]`);if(r){let e=r.getAttribute(`data-project-description-input`)||``;f.pendingProjectDescriptionById[e]=r.value,f.dirtyProjectById[e]=!0,W(e)}}),o.addEventListener(`input`,e=>{let t=e.target.closest(`[data-project-owner-search]`);if(t instanceof HTMLInputElement){let e=t.selectionStart,n=t.selectionEnd;f.ownerPickerSearchQuery=t.value,V(),Ee(e,n)}}),document.addEventListener(`click`,e=>{if(f.editingProjectId&&!e.target.closest(`[data-project-rename-editor]`)){U(),J();return}if(f.openMenuProjectId){if(e.target.closest(`[data-project-actions]`)||e.target.closest(`.bridge-projects-table__floating-menu`))return;R();return}if(f.ownerPickerProjectId){if(e.target.closest(`[data-project-owner-edit]`)||e.target.closest(`[data-project-owner-picker]`))return;z()}if(f.sortPresetMenuOpen){if(e.target.closest(`[data-project-sort]`))return;B(),J()}});let $=()=>{document.visibilityState===`visible`&&Ie({immediate:!0})};document.addEventListener(`visibilitychange`,$),window.addEventListener(`pageshow`,$),window.addEventListener(`focus`,$),X().catch(e=>{f.loading=!1,j(e instanceof Error?e.message:`Unable to load projects.`,`error`)})})();