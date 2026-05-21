(function(){let e=`ux-bridge-project-comment-summary`,t=`ux-bridge-project-thumbnail-renders`,n=1440*60*1e3,r=document.querySelector(`[data-projects-root]`),i=document.querySelector(`[data-projects-hero-actions]`),a=document.createElement(`div`),o=document.createElement(`div`),s=document.createElement(`div`),c=0,l=0,u=0,d=null;if(!r)return;a.className=`bridge-projects__thumbnail-generator`,a.setAttribute(`aria-hidden`,`true`),document.body.append(a),o.className=`bridge-projects__menu-host`,document.body.append(o),s.className=`bridge-projects__modal-host`,document.body.append(s);let f={loading:!0,projects:[],canCreateProjects:!1,canDuplicateProjects:!1,status:``,tone:`neutral`,toastClosing:!1,creating:!1,commentSummaryByProject:new Map,openMenuProjectId:``,openMenuPosition:null,ownerPickerProjectId:``,ownerPickerPosition:null,ownerPickerSearchQuery:``,updatingOwnerProjectId:``,editingProjectId:``,renamingProjectId:``,pendingProjectNameById:{},pendingProjectDescriptionById:{},dirtyProjectById:{},deleteModalProjectId:``,deletingProjectId:``,exitingProjectId:``,highlightedProjectId:``,summaryRefreshTimer:0,summaryRequestToken:0,thumbnailActiveProjectId:``,thumbnailRequestToken:``,thumbnailFailures:new Set,thumbnailRefreshStarted:!1,loadedThumbnailDataByProject:new Map,recentProjectOpenById:{},sortKey:`recentOpen`,sortDirection:`desc`,sortPresetMenuOpen:!1,searchQuery:``,availableUsers:[],selectedProjectIds:[],bulkDuplicatingProjects:!1,bulkDeleteProjectIds:[],bulkDeletingProjects:!1};function p(){if(window.uxBridgeUser?.email)return window.uxBridgeUser;try{let e=sessionStorage.getItem(`ux-bridge-user`);return e?JSON.parse(e):null}catch{return null}}function m(){return`ux-bridge-project-recent-open:${String(p()?.email||`anonymous`).trim().toLowerCase()}`}function h(e,t){return`ux-bridge-comments-seen:${String(p()?.email||`anonymous`).trim().toLowerCase()}:${e}:${t}`}function g(e,t){try{let n=localStorage.getItem(h(e,t));if(!n)return{lastSeenCommentId:``,lastSeenAt:0};let r=JSON.parse(n);return r&&typeof r==`object`?{lastSeenCommentId:String(r.lastSeenCommentId||``).trim(),lastSeenAt:Number(r.lastSeenAt)||0}:{lastSeenCommentId:String(n||``).trim(),lastSeenAt:0}}catch{return{lastSeenCommentId:``,lastSeenAt:0}}}function _(){try{let e=localStorage.getItem(m());if(!e)return{};let t=JSON.parse(e);return t&&typeof t==`object`?t:{}}catch{return{}}}function v(e){try{localStorage.setItem(m(),JSON.stringify(e))}catch{}}function y(e=``){return Number(f.recentProjectOpenById?.[e])||0}function b(e={}){return!e||typeof e!=`object`?{}:Object.fromEntries(Object.entries(e).map(([e,t])=>[String(e||``).trim(),Number(t)||0]).filter(([e,t])=>e&&t>0))}function x(...e){let t={};return e.forEach(e=>{let n=b(e);Object.entries(n).forEach(([e,n])=>{t[e]=Math.max(Number(t[e])||0,Number(n)||0)})}),t}function ee(e={},t={}){let n=b(e),r=b(t),i=Object.keys(n),a=Object.keys(r);return i.length===a.length?i.every(e=>Number(n[e])===Number(r[e])):!1}function S(e={}){let t=b(e);f.recentProjectOpenById=t,v(t)}function te(e={},{useBeacon:t=!1}={}){let n=b(e);if(!Object.keys(n).length)return;let r=JSON.stringify({action:`syncRecentOpenMap`,recentProjectOpenById:n});if(t&&navigator.sendBeacon){let e=new Blob([r],{type:`application/json`});navigator.sendBeacon(`/api/projects`,e);return}fetch(`/api/projects`,{method:`POST`,credentials:`include`,headers:{"Content-Type":`application/json`},body:r,keepalive:t}).catch(()=>{})}function ne(e=``,t=Date.now(),{useBeacon:n=!1}={}){let r=String(e||``).trim();if(!r)return;let i=JSON.stringify({action:`markRecentOpen`,project:r,openedAt:t});if(n&&navigator.sendBeacon){let e=new Blob([i],{type:`application/json`});navigator.sendBeacon(`/api/projects`,e);return}fetch(`/api/projects`,{method:`POST`,credentials:`include`,headers:{"Content-Type":`application/json`},body:i,keepalive:n}).catch(()=>{})}function re(e=``,{useBeacon:t=!1}={}){if(!e)return;let n=Date.now();S(x(f.recentProjectOpenById,{[e]:n})),ne(e,n,{useBeacon:t})}function C(){return{totalComments:0,unreadComments:0,unreadMentions:0}}function ie(e){let t=T(p()?.email);return!e||!t?!1:t===T(e.ownerEmail)?!0:(Array.isArray(e.projectMembers)?e.projectMembers:[]).some(e=>{let n=T(e?.email),r=String(e?.status||``).trim().toLowerCase();return n===t&&(r===`active`||r===`pending`)})}function w(e){return String(e??``).replaceAll(`&`,`&amp;`).replaceAll(`<`,`&lt;`).replaceAll(`>`,`&gt;`).replaceAll(`"`,`&quot;`)}function ae(e){return String(e??``).replace(/[.*+?^${}()|[\]\\]/g,`\\$&`)}function T(e){return String(e||``).trim().toLowerCase()}function E(e,t){let n=String(e??``),r=String(t||``).trim();if(!r)return w(n);let i=RegExp(`(${ae(r)})`,`gi`);return w(n).replace(i,`<mark class="bridge-table-search__highlight">$1</mark>`)}function D(e,t){let n=String(t||``).trim().toLowerCase();return n?[e.name,e.description,e.ownerName].map(e=>String(e||``).toLowerCase()).some(e=>e.includes(n)):!0}function oe(e,t){let n=String(t||``).trim().toLowerCase();return n?[e.fullName,e.email,e.role].map(e=>String(e||``).toLowerCase()).some(e=>e.includes(n)):!0}function se(e=null,t=null){window.requestAnimationFrame(()=>{let n=r.querySelector(`[data-project-search]`);n instanceof HTMLInputElement&&(n.focus(),typeof e==`number`&&typeof t==`number`&&n.setSelectionRange(e,t))})}function O(e){let t=String(e||``).trim().split(/\s+/).filter(Boolean);return t.length?t.slice(0,2).map(e=>e[0]?.toUpperCase()||``).join(``):`UX`}function ce(e){return e===`error`?`
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
    `}function k(){if(window.clearTimeout(c),window.clearTimeout(l),!f.status){f.toastClosing=!1;return}f.toastClosing=!0,X(),l=window.setTimeout(()=>{f.status=``,f.tone=`neutral`,f.toastClosing=!1,X()},260)}function le(e=``){window.clearTimeout(u),f.highlightedProjectId=e,e&&(u=window.setTimeout(()=>{f.highlightedProjectId===e&&(f.highlightedProjectId=``,X())},2e3))}function A(){let e=new Set(f.projects.map(e=>e.id));return f.selectedProjectIds.filter(t=>e.has(t))}function ue(e=``){return A().includes(e)}function de(e,t){let n=new Set(A());t?n.add(e):n.delete(e),f.selectedProjectIds=Array.from(n)}function fe(){f.selectedProjectIds=A()}function j(e=``,t=`neutral`){if(window.clearTimeout(c),window.clearTimeout(l),!e){k();return}f.status=e,f.tone=t,f.toastClosing=!1,c=window.setTimeout(()=>{k()},4e3),X()}function pe(){try{let e=localStorage.getItem(t);if(!e)return{};let n=JSON.parse(e);return n&&typeof n==`object`?n:{}}catch{return{}}}function me(e){try{localStorage.setItem(t,JSON.stringify(e))}catch{}}function he(e){let t=pe(),r=`${e.pathname}${e.searchParams.get(`table-thumb`)===`1`?`?table-thumb=1`:e.search}`,i=t[r],a=Date.now();if(i&&typeof i==`object`&&typeof i.token==`string`&&typeof i.createdAt==`number`&&a-i.createdAt<n)return i.token;let o=String(a);return t[r]={token:o,createdAt:a},me(t),o}function M(e){return String(e?.thumbnailUrl||e?.launchUrl||``).trim()}function N(e){return!!String(e?.thumbnailDataUrl||``).trim()}function ge(e){let t=String(e?.thumbnailDataUrl||``).trim(),r=Number(e?.thumbnailUpdatedAt)||0,i=String(e?.thumbnailSourceUrl||``).trim(),a=M(e);return!!(t&&r&&i===a&&Date.now()-r<n)}function _e(e){return!e||f.thumbnailFailures.has(e.id)?!1:!ge(e)}function ve(){return d?.isConnected?d:(d=document.createElement(`iframe`),d.className=`bridge-projects__thumbnail-generator-frame`,d.setAttribute(`tabindex`,`-1`),a.replaceChildren(d),d)}function ye(e,t){let n=M(e);if(!n)return``;let r=new URL(n,window.location.origin),i=he(r);return r.searchParams.set(`project`,e.id),r.searchParams.set(`thumb-capture`,`1`),r.searchParams.set(`thumb-request`,t),r.searchParams.set(`thumb-load`,i),`${r.pathname}${r.search}`}function P(e){let t=N(e),n=f.thumbnailActiveProjectId===e.id,r=!!e?.isLocked;return`
      ${t?`<img class="bridge-projects-table__thumb-image" src="${w(e.thumbnailDataUrl)}" alt="" loading="lazy" data-project-thumbnail-image="${w(e.id)}" />`:``}
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
        aria-label="Refresh thumbnail for ${w(e.name)}"
        data-tooltip="Refresh Image"
        data-project-thumbnail-refresh="${w(e.id)}"
        ${n?`disabled`:``}
      >
        <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
          <path d="M20 11a8 8 0 0 0-14.9-4H3.5"></path>
          <path d="M4 4v4h4"></path>
          <path d="M4 13a8 8 0 0 0 14.9 4H20.5"></path>
          <path d="M20 20v-4h-4"></path>
        </svg>
      </button>
    `}function be(e,t){if(!e||!t)return;let n=N(t),r=f.thumbnailActiveProjectId===t.id,i=String(t.thumbnailDataUrl||``),a=n&&f.loadedThumbnailDataByProject.get(t.id)===i;e.className=`bridge-projects-table__thumb${n?` is-ready`:``}${r?` is-loading`:``}${a?` is-image-ready`:``}`,e.innerHTML=P(t);let o=e.querySelector(`[data-project-thumbnail-image]`);if(!o)return;let s=()=>{f.loadedThumbnailDataByProject.set(t.id,i),e.classList.add(`is-image-ready`)};if(o.complete&&o.naturalWidth>0){s();return}o.addEventListener(`load`,s,{once:!0})}function F(e=[]){let t=e.length?new Set(e):null;r.querySelectorAll(`[data-project-thumbnail-cell]`).forEach(e=>{let n=e.getAttribute(`data-project-thumbnail-cell`)||``;if(t&&!t.has(n))return;let r=f.projects.find(e=>e.id===n);r&&be(e,r)})}function I(e){return e.map(e=>`${e.id}:${e.hasOverview?`overview,`:``}${(e.pages||[]).map(e=>e.id).join(`,`)}`).join(`|`)}function L(t){try{let n=sessionStorage.getItem(e);if(!n)return null;let r=JSON.parse(n);return!r||r.expiresAt<=Date.now()?(sessionStorage.removeItem(e),null):r.key!==I(t)||!r.entries?null:new Map(r.entries)}catch{return null}}function R(t,n){try{sessionStorage.setItem(e,JSON.stringify({key:I(t),expiresAt:Date.now()+3e4,entries:Array.from(n.entries())}))}catch{}}function xe(){window.clearTimeout(f.summaryRefreshTimer),f.summaryRefreshTimer=0}function z(){r.querySelectorAll(`[data-project-menu-toggle]`).forEach(e=>{let t=e.getAttribute(`data-project-menu-toggle`)||``,n=!!(t&&f.openMenuProjectId===t);e.setAttribute(`aria-expanded`,n?`true`:`false`)}),r.querySelectorAll(`[data-project-owner-edit]`).forEach(e=>{let t=e.getAttribute(`data-project-owner-edit`)||``,n=!!(t&&f.ownerPickerProjectId===t);e.setAttribute(`aria-expanded`,n?`true`:`false`)}),we(),W()}function B(){!f.openMenuProjectId&&!f.openMenuPosition||(f.openMenuProjectId=``,f.openMenuPosition=null,z())}function V(){!f.ownerPickerProjectId&&!f.ownerPickerPosition||(f.ownerPickerProjectId=``,f.ownerPickerPosition=null,f.ownerPickerSearchQuery=``,z())}function H(){f.sortPresetMenuOpen&&=!1}function Se(e,t){let n=e.getBoundingClientRect(),r=n.top-12>=134;f.ownerPickerProjectId=``,f.ownerPickerPosition=null,f.ownerPickerSearchQuery=``,f.openMenuProjectId=t,f.openMenuPosition={top:r?n.top-134-8:n.bottom+8,left:Math.min(Math.max(12,n.right-176),window.innerWidth-176-12)},z()}function U(e=null,t=null){window.requestAnimationFrame(()=>{let n=o.querySelector(`[data-project-owner-search]`);n instanceof HTMLInputElement&&(n.focus(),typeof e==`number`&&typeof t==`number`&&n.setSelectionRange(e,t))})}function Ce(e,t){let n=e.getBoundingClientRect(),r=n.top-12>=340;f.openMenuProjectId=``,f.openMenuPosition=null,f.ownerPickerProjectId=t,f.ownerPickerSearchQuery=``,f.ownerPickerPosition={top:r?n.top-340-8:n.bottom+8,left:Math.min(Math.max(12,n.left-8),window.innerWidth-320-12)},z(),U()}function we(){if(!f.openMenuProjectId||!f.openMenuPosition){o.innerHTML=``;return}let e=f.projects.find(e=>e.id===f.openMenuProjectId);if(!e){o.innerHTML=``;return}let t=!!e.canManageIdentity,n=f.canDuplicateProjects&&e.kind===`dynamic`,r=[t?`
            <button
              class="bridge-projects-table__menu-item"
              type="button"
              role="menuitem"
              data-project-rename="${w(e.id)}"
            >
              Rename Project
            </button>
          `:``,n?`
            <button
              class="bridge-projects-table__menu-item"
              type="button"
              role="menuitem"
              data-project-duplicate="${w(e.id)}"
            >
              Duplicate
            </button>
          `:``,t?`
            <button
              class="bridge-projects-table__menu-item bridge-projects-table__menu-item--danger"
              type="button"
              role="menuitem"
              data-project-delete="${w(e.id)}"
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
    `}function W(){if(!f.ownerPickerProjectId||!f.ownerPickerPosition){(!f.openMenuProjectId||!f.openMenuPosition)&&(o.innerHTML=``);return}let e=f.projects.find(e=>e.id===f.ownerPickerProjectId);if(!e){V();return}let t=f.availableUsers.filter(e=>oe(e,f.ownerPickerSearchQuery));o.innerHTML=`
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
              value="${w(f.ownerPickerSearchQuery)}"
              placeholder="Search users"
              aria-label="Search users"
              data-project-owner-search
            />
          </label>
        </div>
        <div class="bridge-projects-table__owner-picker-list">
          ${t.length?t.map(t=>{let n=T(t.email)===T(e.ownerEmail),r=O(t.fullName||t.email||`User`),i=t.avatarColor?` style="--avatar-bg:${w(t.avatarColor)}"`:``,a=t.avatarUrl?`<span class="bridge-projects-table__owner-avatar has-photo"${i}><img src="${w(t.avatarUrl)}" alt="" /></span>`:`<span class="bridge-projects-table__owner-avatar"${i}>${w(r)}</span>`;return`
                      <button
                        class="bridge-projects-table__owner-picker-item${n?` is-current`:``}"
                        type="button"
                        data-project-owner-option="${w(e.id)}"
                        data-owner-email="${w(t.email)}"
                        ${n||f.updatingOwnerProjectId===e.id?`disabled`:``}
                      >
                        ${a}
                        <span class="bridge-projects-table__owner-picker-copy">
                          <strong>${E(t.fullName||t.email,f.ownerPickerSearchQuery)}</strong>
                          <span>${E(t.email,f.ownerPickerSearchQuery)}</span>
                        </span>
                        ${n?`<span class="bridge-projects-table__owner-picker-status">Current</span>`:``}
                      </button>
                    `}).join(``):`<div class="bridge-table-search__empty bridge-projects-table__owner-picker-empty">No users match your search.</div>`}
        </div>
      </div>
    `}function G(){let e=Array.isArray(f.bulkDeleteProjectIds)?f.bulkDeleteProjectIds.filter(Boolean):[];if(!e.length){s.innerHTML=``;return}let t=e.map(e=>f.projects.find(t=>t.id===e)).filter(Boolean);if(!t.length){s.innerHTML=``;return}let n=t.length>1,r=t[0];s.innerHTML=`
      <div class="bridge-project-delete__modal-shell" data-project-delete-overlay>
        <div class="bridge-project-delete__modal" role="dialog" aria-modal="true" aria-labelledby="project-delete-title">
          <div class="bridge-project-delete__head">
            <div>
              <p class="bridge-project-delete__eyebrow">Project action</p>
              <h2 id="project-delete-title">${n?`Delete ${t.length} projects?`:`Delete ${w(r.name)}?`}</h2>
              <p>${n?`This will remove the selected projects and their comments. This action can’t be undone.`:`This will remove the project and its comments. This action can’t be undone.`}</p>
            </div>
            <button class="bridge-project-delete__close" type="button" aria-label="Close delete dialog" data-close-project-delete>×</button>
          </div>
          ${n?`
                <div class="bridge-project-delete__list">
                  ${t.map(e=>`<div class="bridge-project-delete__list-item">${w(e.name)}</div>`).join(``)}
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
    `}function K({preserveDraft:e=!1}={}){f.editingProjectId&&=(e||(delete f.pendingProjectNameById[f.editingProjectId],delete f.pendingProjectDescriptionById[f.editingProjectId],delete f.dirtyProjectById[f.editingProjectId]),``)}function q(e=``){if(!e)return;let t=f.projects.find(t=>t.id===e),n=r.querySelector(`[data-project-rename-save="${e}"]`);r.querySelector(`[data-project-rename-input="${e}"]`),r.querySelector(`[data-project-description-input="${e}"]`),!(!t||!(n instanceof HTMLButtonElement))&&(n.disabled=f.renamingProjectId===e||!f.dirtyProjectById[e])}function J(){return f.sortKey===`recentOpen`?`recentOpen`:`createdAt`}function Te(){return J()===`recentOpen`?`Most Recent`:`By Date`}function Ee(e=`recentOpen`){f.sortKey=e===`recentOpen`?`recentOpen`:`createdAt`,f.sortDirection=`desc`,H()}function De(e,t=C()){let n=Number(t.totalComments)||0,r=Number(t.unreadComments)||0,i=Number(t.unreadMentions)||0,a=ie(e),o=[];a&&r>0&&r!==i&&o.push({count:r,label:`New`,modifierClass:` bridge-projects-table__comments-badge--new`}),i>0&&o.push({count:i,label:i===1?`Mention`:`Mentions`,modifierClass:` bridge-projects-table__comments-badge--mentions`});let s=o.length>0;return`
      <div class="bridge-projects-table__comments${s?` bridge-projects-table__comments--badge-only bridge-projects-table__comments--badge-stack`:``}">
        ${s?o.map(e=>{let t=e.count>99?`99+`:e.count;return`<span class="bridge-projects-table__comments-badge${e.modifierClass}"><span>${t}</span><span>${w(e.label)}</span></span>`}).join(``):`<span class="bridge-projects-table__count">${n}</span>`}
      </div>
    `}function Oe(){r.querySelectorAll(`[data-project-comments-cell]`).forEach(e=>{let t=e.getAttribute(`data-project-comments-cell`)||``;e.innerHTML=De(f.projects.find(e=>e.id===t),f.commentSummaryByProject.get(t)||C())})}function ke(){let e=f.sortDirection===`desc`?-1:1,t=[...f.projects];return t.sort((t,n)=>{let r=0;if(f.sortKey===`owner`)r=String(t.ownerName||``).localeCompare(String(n.ownerName||``),void 0,{sensitivity:`base`}),r||=String(t.name||``).localeCompare(String(n.name||``),void 0,{sensitivity:`base`});else if(f.sortKey===`pages`)r=Number(t.pageCount||0)-Number(n.pageCount||0),r||=String(t.name||``).localeCompare(String(n.name||``),void 0,{sensitivity:`base`});else if(f.sortKey===`comments`){let e=f.commentSummaryByProject.get(t.id)||{totalComments:0,unreadComments:0},i=f.commentSummaryByProject.get(n.id)||{totalComments:0,unreadComments:0};r=Number(e.totalComments||0)-Number(i.totalComments||0),r||=Number(e.unreadComments||0)-Number(i.unreadComments||0),r||=String(t.name||``).localeCompare(String(n.name||``),void 0,{sensitivity:`base`})}else f.sortKey===`createdAt`?(r=Number(t.createdAt||0)-Number(n.createdAt||0),r||=String(t.name||``).localeCompare(String(n.name||``),void 0,{sensitivity:`base`})):f.sortKey===`recentOpen`?(r=y(t.id)-y(n.id),r||=Number(t.createdAt||0)-Number(n.createdAt||0),r||=String(t.name||``).localeCompare(String(n.name||``),void 0,{sensitivity:`base`})):(r=String(t.name||``).localeCompare(String(n.name||``),void 0,{sensitivity:`base`}),r||=String(t.ownerName||``).localeCompare(String(n.ownerName||``),void 0,{sensitivity:`base`}));return r*e}),t}function Y(e){return f.sortKey===e?f.sortDirection===`desc`?`
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
      `}function X(){let e=f.status?`
          <div class="bridge-projects__toast${f.tone===`error`?` bridge-projects__toast--error`:``}${f.toastClosing?` is-closing`:``}" role="status" aria-live="polite">
            ${ce(f.tone)}
            <span class="bridge-projects__toast-message">${w(f.status)}</span>
            <button class="bridge-projects__toast-dismiss" type="button" aria-label="Dismiss notification" data-dismiss-status>
              <span aria-hidden="true">×</span>
            </button>
          </div>
        `:``,t=f.canCreateProjects?`
          <button class="bridge-projects__create" type="button" data-create-project ${f.creating?`disabled`:``}>
            ${f.creating?`Creating…`:`New Project`}
          </button>
        `:``;i&&(i.innerHTML=t);let n=(f.loading?[]:ke()).filter(e=>D(e,f.searchQuery)),a=!f.loading&&f.projects.length>5,o=f.canDuplicateProjects||f.projects.some(e=>!!e.canManageIdentity),s=o&&!f.loading&&f.projects.length>5,c=!f.loading&&f.projects.length>5,l=A(),u=l.length,d=n.map(e=>e.id),p=d.length?d.every(e=>l.includes(e)):!1,m=a?`
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
                value="${w(f.searchQuery)}"
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
              <span>${w(Te())}</span>
              <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">
                <path d="m4 6 4 4 4-4"></path>
              </svg>
            </button>
            ${f.sortPresetMenuOpen?`
                    <div class="bridge-projects-table__menu bridge-table-sort__menu" role="menu" aria-label="Sort projects">
                      <button
                        class="bridge-projects-table__menu-item${J()===`recentOpen`?` is-selected`:``}"
                        type="button"
                        role="menuitemradio"
                        aria-checked="${J()===`recentOpen`?`true`:`false`}"
                        data-project-sort-option="recentOpen"
                      >
                        Most Recent
                      </button>
                      <button
                        class="bridge-projects-table__menu-item${J()===`createdAt`?` is-selected`:``}"
                        type="button"
                        role="menuitemradio"
                        aria-checked="${J()===`createdAt`?`true`:`false`}"
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
        `:n.length?n.map(e=>{let t=f.commentSummaryByProject.get(e.id)||C(),n=O(e.ownerName||`Unknown`),r=e.ownerAvatarColor?` style="--avatar-bg:${w(e.ownerAvatarColor)}"`:``,i=e.ownerAvatarUrl?`<span class="bridge-projects-table__owner-avatar has-photo"${r}><img src="${w(e.ownerAvatarUrl)}" alt="" /></span>`:`<span class="bridge-projects-table__owner-avatar" aria-hidden="true"${r}>${w(n)}</span>`,a=!!e.canManageIdentity,c=a&&f.availableUsers.length>0,l=f.canDuplicateProjects&&e.kind===`dynamic`,u=a||l,d=N(e),p=f.thumbnailActiveProjectId===e.id,m=f.editingProjectId===e.id,h=f.renamingProjectId===e.id;String(f.pendingProjectNameById[e.id]||e.name||``).trim();let g=String(f.pendingProjectDescriptionById[e.id]??e.description??``),_=!!f.dirtyProjectById[e.id];return`
              <tr
                class="bridge-projects-table__row${f.highlightedProjectId===e.id?` is-newly-created`:``}${f.exitingProjectId===e.id?` is-deleting`:``}"
                data-project-id="${w(e.id)}"
                data-project-launch-url="${w(e.launchUrl)}"
                data-project-locked="${e.isLocked?`true`:`false`}"
                tabindex="0"
                role="link"
                aria-label="Open ${w(e.name)}"
              >
                ${s?`
                        <td class="bridge-table-select__cell">
                          <label class="bridge-table-select">
                            <input
                              type="checkbox"
                              aria-label="Select ${w(e.name)}"
                              data-project-select="${w(e.id)}"
                              ${ue(e.id)?`checked`:``}
                            />
                            <span class="bridge-table-select__control" aria-hidden="true"></span>
                          </label>
                        </td>
                      `:``}
                <td class="bridge-projects-table__project-cell">
                  <div class="bridge-projects-table__project">
                    <div
                      class="bridge-projects-table__thumb${d?` is-ready`:``}${p?` is-loading`:``}"
                      data-project-thumbnail-cell="${w(e.id)}"
                    >
                      ${P(e)}
                    </div>
                    <div class="bridge-projects-table__identity">
                      ${m&&a?`
                            <div class="bridge-projects-table__rename-editor" data-project-rename-editor>
                              <div class="bridge-projects-table__rename-fields">
                                <div class="bridge-projects-table__field-wrap">
                                  <input
                                    class="bridge-projects-table__rename-input"
                                    type="text"
                                    value="${w(f.pendingProjectNameById[e.id]||e.name)}"
                                    aria-label="Rename ${w(e.name)}"
                                    data-project-rename-input="${w(e.id)}"
                                    ${h?`disabled`:``}
                                  />
                                  <button
                                    class="bridge-projects-table__field-clear"
                                    type="button"
                                    aria-label="Clear project name"
                                    data-project-rename-clear="${w(e.id)}"
                                    ${h?`disabled`:``}
                                  >
                                    <span aria-hidden="true">×</span>
                                  </button>
                                </div>
                                <div class="bridge-projects-table__field-wrap bridge-projects-table__field-wrap--textarea">
                                  <textarea
                                    class="bridge-projects-table__rename-textarea"
                                    aria-label="Edit description for ${w(e.name)}"
                                    data-project-description-input="${w(e.id)}"
                                    rows="2"
                                    ${h?`disabled`:``}
                                  >${w(g)}</textarea>
                                  <button
                                    class="bridge-projects-table__field-clear bridge-projects-table__field-clear--textarea"
                                    type="button"
                                    aria-label="Clear project description"
                                    data-project-description-clear="${w(e.id)}"
                                    ${h?`disabled`:``}
                                  >
                                    <span aria-hidden="true">×</span>
                                  </button>
                                </div>
                              </div>
                              <button
                                class="bridge-projects-table__rename-save"
                                type="button"
                                aria-label="Save project details for ${w(e.name)}"
                                data-project-rename-save="${w(e.id)}"
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
                                <strong>${E(e.name,f.searchQuery)}</strong>
                              ${a?`
                                      <button
                                        class="bridge-inline-edit-trigger bridge-projects-table__edit-trigger"
                                        type="button"
                                        aria-label="Edit ${w(e.name)}"
                                        data-project-edit-trigger="${w(e.id)}"
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
                            <span>${E(e.description||`A project inside UX Bridge.`,f.searchQuery)}</span>
                          `}
                    </div>
                  </div>
                </td>
                <td class="bridge-projects-table__owner-cell">
                  <div class="bridge-projects-table__owner-control">
                    <span class="bridge-projects-table__owner-pill">
                      ${i}
                      <span>${E(e.ownerName||`Unknown`,f.searchQuery)}</span>
                    </span>
                    ${c?`
                          <button
                            class="bridge-inline-edit-trigger bridge-projects-table__owner-edit"
                            type="button"
                            aria-label="Edit owner for ${w(e.name)}"
                            aria-haspopup="dialog"
                            aria-expanded="${f.ownerPickerProjectId===e.id?`true`:`false`}"
                            data-project-owner-edit="${w(e.id)}"
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
                <td class="bridge-projects-table__comments-cell" data-project-comments-cell="${w(e.id)}">
                  ${De(e,t)}
                </td>
                ${o?`
                        <td class="bridge-projects-table__actions-cell">
                          ${e.isLocked?`
                                <button
                                  class="bridge-projects-table__request"
                                  type="button"
                                  data-project-request-access="${w(e.id)}"
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
                                    aria-label="Project options for ${w(e.name)}"
                                    data-project-menu-toggle="${w(e.id)}"
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
                        ${Y(`project`)}
                      </button>
                    </th>
                    <th class="bridge-projects-table__owner-cell">
                      <button class="bridge-projects-table__sort-button" type="button" data-sort-key="owner">
                        <span>Owner</span>
                        ${Y(`owner`)}
                      </button>
                    </th>
                    <th class="bridge-projects-table__pages-cell">
                      <button class="bridge-projects-table__sort-button" type="button" data-sort-key="pages">
                        <span>Pages</span>
                        ${Y(`pages`)}
                      </button>
                    </th>
                    <th class="bridge-projects-table__comments-cell">
                      <button class="bridge-projects-table__sort-button" type="button" data-sort-key="comments">
                        <span>Comments</span>
                        ${Y(`comments`)}
                      </button>
                    </th>
                    ${o?`<th class="bridge-projects-table__actions-cell">Actions</th>`:``}
                  </tr>
                </thead>
                <tbody>${b}</tbody>
              </table>
            </div>
        `}
    `,G(),z()}function Ae(e){!e||!e.id||(f.projects.findIndex(t=>t.id===e.id)>=0?f.projects=f.projects.map(t=>t.id===e.id?e:t):f.projects=[e,...f.projects],f.commentSummaryByProject.has(e.id)||f.commentSummaryByProject.set(e.id,C()))}function je(e){let t=f.projects.find(t=>t.id===e);if(!t)return;B(),f.pendingProjectNameById[e]=t.name||``,f.pendingProjectDescriptionById[e]=t.description||``,f.dirtyProjectById[e]=!1,f.editingProjectId=e,X();let n=r.querySelector(`[data-project-rename-input="${e}"]`);n instanceof HTMLInputElement&&window.requestAnimationFrame(()=>{n.focus(),n.select()})}async function Z({background:e=!1}={}){e||(f.loading=!0,X());let t=await fetch(`/api/projects`,{credentials:`include`,cache:`no-store`}),n=await t.json().catch(()=>({}));if(!t.ok||!n?.ok)throw Error(n?.error||`Unable to load projects.`);f.projects=Array.isArray(n.projects)?n.projects:[],f.availableUsers=Array.isArray(n.availableUsers)?n.availableUsers:[];let i=b(n.recentProjectOpenById),a=x(i,_());S(a),ee(a,i)||te(a),fe(),f.canCreateProjects=!!n.canCreateProjects,f.canDuplicateProjects=!!n.canDuplicateProjects,f.editingProjectId&&!f.projects.some(e=>e.id===f.editingProjectId)&&K(),f.ownerPickerProjectId&&!f.projects.some(e=>e.id===f.ownerPickerProjectId)&&V(),f.commentSummaryByProject=L(f.projects)||new Map(f.projects.map(e=>[e.id,C()])),f.loading=!1,X();try{let e=sessionStorage.getItem(`ux-bridge-share-toast`);e&&(sessionStorage.removeItem(`ux-bridge-share-toast`),j(e))}catch{}if(Pe({immediate:!L(f.projects)}),f.thumbnailRefreshStarted=!0,f.thumbnailFailures.clear(),Q(),f.editingProjectId){let e=r.querySelector(`[data-project-rename-input="${f.editingProjectId}"]`);e instanceof HTMLInputElement&&window.requestAnimationFrame(()=>{e.focus(),e.select()})}}async function Me(e,t=0){let n=e.map(e=>({project:e.id,pages:[...e.hasOverview?[`overview`]:[],...(Array.isArray(e.pages)?e.pages:[]).map(e=>String(e.id||``).trim()).filter(Boolean)]})).filter(e=>e.project&&e.pages.length);if(!n.length){let t=new Map(e.map(e=>[e.id,C()]));return R(e,t),t}try{let r=new URLSearchParams({summary:`projects`,projects:JSON.stringify(n)}),i=await fetch(`/api/comments?${r.toString()}`,{credentials:`include`,cache:`no-store`}),a=await i.json().catch(()=>({}));if(!i.ok||!a?.ok||!Array.isArray(a.projects))throw Error(`Unable to load project comment summaries.`);let o=new Map(e.map(e=>[e.id,C()]));return a.projects.forEach(t=>{let n=String(t?.project||``).trim(),r=e.find(e=>e.id===n);if(!n||!r)return;let i=(Array.isArray(t.summary)?t.summary:[]).reduce((e,t)=>{let n=String(t.page||``).trim(),i=g(r.id,n),a=Number(t.lastSeenAt||0),o=String(t.lastSeenCommentId||``)||i.lastSeenCommentId,s=e=>{if(!Array.isArray(e)||!e.length)return 0;if(!o)return e.length;let t=e.findIndex(e=>e===o);return t<0?e.length:Math.max(e.length-(t+1),0)};return e.totalComments+=Number(t.count||0),e.unreadComments+=a>0?Number(t.unreadCount||0):s(Array.isArray(t.commentIds)?t.commentIds:[]),e.unreadMentions+=a>0?Number(t.unreadMentionCount||0):s(Array.isArray(t.mentionCommentIds)?t.mentionCommentIds:[]),e},C());o.set(n,i)}),t&&t!==f.summaryRequestToken?null:(R(e,o),o)}catch{return new Map(e.map(e=>[e.id,C()]))}}async function Ne(){if(f.loading||document.visibilityState!==`visible`)return;let e=Date.now();f.summaryRequestToken=e;let t=await Me(f.projects,e);if(!(!t||f.summaryRequestToken!==e)){if(f.commentSummaryByProject=t,f.loading||f.sortKey===`comments`){X();return}Oe()}}function Pe({immediate:e=!1}={}){xe();let t=()=>{Ne().catch(()=>{}),f.summaryRefreshTimer=window.setTimeout(t,3e3)};if(e){t();return}f.summaryRefreshTimer=window.setTimeout(t,1200)}async function Fe(e,t,n,r=`auto`){let i=await fetch(`/api/projects`,{method:`POST`,credentials:`include`,headers:{"Content-Type":`application/json`},body:JSON.stringify({action:`updateThumbnail`,project:e,sourceUrl:t,imageDataUrl:n,mode:r})}),a=await i.json().catch(()=>({}));if(!i.ok||!a?.ok||!a?.project)throw Error(a?.error||`Unable to update project thumbnail.`);return a.project}function Ie(e=``){f.thumbnailActiveProjectId=``,f.thumbnailRequestToken=``,e&&F([e])}function Q(e=``,t=`auto`){if(f.thumbnailActiveProjectId||document.visibilityState!==`visible`)return;let n=e?f.projects.find(t=>t.id===e):f.projects.find(e=>_e(e));if(!n)return;let r=`${Date.now()}-${n.id}`;f.thumbnailActiveProjectId=n.id,f.thumbnailRequestToken=r,F([n.id]);let i=ve(),a=async i=>{if(i.origin!==window.location.origin)return;let o=i.data;if(!(!o||o.requestToken!==r||o.projectId!==n.id)){if(o.type===`uxbridge:thumbnail-capture-failed`){window.removeEventListener(`message`,a),f.thumbnailFailures.add(n.id),Ie(n.id),Q();return}if(!(o.type!==`uxbridge:thumbnail-captured`||!o.imageDataUrl)){window.removeEventListener(`message`,a);try{let e=await Fe(n.id,o.sourceUrl,o.imageDataUrl,t);f.loadedThumbnailDataByProject.delete(e.id),f.projects=f.projects.map(t=>t.id===e.id?e:t),F([e.id])}catch{f.thumbnailFailures.add(n.id)}finally{Ie(n.id),e||Q()}}}};window.addEventListener(`message`,a),i.src=ye(n,r)}async function Le(){if(!f.creating){f.creating=!0,X();try{let e=await fetch(`/api/projects`,{method:`POST`,credentials:`include`,headers:{"Content-Type":`application/json`},body:JSON.stringify({action:`createProject`})}),t=await e.json().catch(()=>({}));if(!e.ok||!t?.ok)throw Error(t?.error||`Unable to create project.`);f.creating=!1,Ae(t.project),le(t.project?.id||``),j(`Created ${t.project?.name||`new project`}.`),X(),Z({background:!0}).catch(()=>{})}catch(e){f.creating=!1,j(e instanceof Error?e.message:`Unable to create project.`,`error`)}}}i&&i.addEventListener(`click`,async e=>{e.target.closest(`[data-create-project]`)&&await Le()});async function Re(e){if(e.target.closest(`[data-dismiss-status]`)){k();return}if(e.target.closest(`[data-create-project]`)){await Le();return}if(e.target.closest(`[data-project-sort-toggle]`)){e.preventDefault(),e.stopPropagation(),f.sortPresetMenuOpen=!f.sortPresetMenuOpen,X();return}let t=e.target.closest(`[data-project-sort-option]`);if(t){e.preventDefault(),e.stopPropagation(),Ee(t.getAttribute(`data-project-sort-option`)||`recentOpen`),X();return}let n=e.target.closest(`[data-sort-key]`);if(n){H();let e=n.getAttribute(`data-sort-key`)||``;if(!e)return;f.sortKey===e?(f.sortDirection===`asc`||(f.sortKey=`recentOpen`),f.sortDirection=`desc`):(f.sortKey=e,f.sortDirection=`asc`),X();return}let i=e.target.closest(`[data-project-thumbnail-refresh]`);if(i){e.preventDefault(),e.stopPropagation();let t=i.getAttribute(`data-project-thumbnail-refresh`)||``;if(!t||f.thumbnailActiveProjectId)return;f.thumbnailFailures.delete(t),Q(t,`manual`);return}let a=e.target.closest(`[data-project-request-access]`);if(a){e.preventDefault(),e.stopPropagation();let t=a.getAttribute(`data-project-request-access`)||``;if(!t)return;try{let e=await fetch(`/api/projects`,{method:`POST`,credentials:`include`,headers:{"Content-Type":`application/json`},body:JSON.stringify({action:`requestAccess`,project:t})}),n=await e.json().catch(()=>({}));if(!e.ok||!n?.ok)throw Error(n?.error||`Unable to request project access.`);j(n.message||`Access request sent.`),await Z()}catch(e){j(e instanceof Error?e.message:`Unable to request project access.`,`error`)}return}let o=e.target.closest(`[data-project-menu-toggle]`);if(o){K();let e=o.getAttribute(`data-project-menu-toggle`)||``;f.openMenuProjectId===e?B():Se(o,e);return}let s=e.target.closest(`[data-project-owner-edit]`);if(s){e.preventDefault(),e.stopPropagation(),K();let t=s.getAttribute(`data-project-owner-edit`)||``;f.ownerPickerProjectId===t?V():Ce(s,t);return}if(e.target.closest(`[data-project-bulk-duplicate]`)){e.preventDefault(),e.stopPropagation();let t=A();if(!t.length)return;f.bulkDuplicatingProjects=!0,X();try{for(let e of t){let t=await fetch(`/api/projects`,{method:`POST`,credentials:`include`,headers:{"Content-Type":`application/json`},body:JSON.stringify({action:`duplicateProject`,project:e})}),n=await t.json().catch(()=>({}));if(!t.ok||!n?.ok)throw Error(n?.error||`Unable to duplicate selected projects.`)}f.bulkDuplicatingProjects=!1,f.selectedProjectIds=[],j(`Duplicated ${t.length} ${t.length===1?`project`:`projects`}.`),X(),Z({background:!0}).catch(()=>{})}catch(e){f.bulkDuplicatingProjects=!1,j(e instanceof Error?e.message:`Unable to duplicate selected projects.`,`error`),X()}return}if(e.target.closest(`[data-project-bulk-delete]`)){e.preventDefault(),e.stopPropagation();let t=A();if(!t.length)return;f.bulkDeleteProjectIds=t,G();return}let c=e.target.closest(`[data-project-rename]`);if(c){e.preventDefault(),e.stopPropagation(),je(c.getAttribute(`data-project-rename`)||``);return}let l=e.target.closest(`[data-project-edit-trigger]`);if(l){e.preventDefault(),e.stopPropagation(),je(l.getAttribute(`data-project-edit-trigger`)||``);return}let u=e.target.closest(`[data-project-rename-clear]`);if(u){e.preventDefault(),e.stopPropagation();let t=u.getAttribute(`data-project-rename-clear`)||``,n=r.querySelector(`[data-project-rename-input="${t}"]`);n instanceof HTMLInputElement&&(n.value=``,f.pendingProjectNameById[t]=``,f.dirtyProjectById[t]=!0,q(t),n.focus());return}let d=e.target.closest(`[data-project-description-clear]`);if(d){e.preventDefault(),e.stopPropagation();let t=d.getAttribute(`data-project-description-clear`)||``,n=r.querySelector(`[data-project-description-input="${t}"]`);n instanceof HTMLTextAreaElement&&(n.value=``,f.pendingProjectDescriptionById[t]=``,f.dirtyProjectById[t]=!0,q(t),n.focus());return}let p=e.target.closest(`[data-project-rename-save]`);if(p){e.preventDefault(),e.stopPropagation();let t=p.getAttribute(`data-project-rename-save`)||``,n=f.projects.find(e=>e.id===t),i=r.querySelector(`[data-project-rename-input="${t}"]`),a=r.querySelector(`[data-project-description-input="${t}"]`),o=String(i instanceof HTMLInputElement?i.value:f.pendingProjectNameById[t]||``).trim(),s=String(a instanceof HTMLTextAreaElement?a.value:f.pendingProjectDescriptionById[t]||``).trim();if(!t||!n)return;if(!o){j(`Project name is required.`,`error`),i instanceof HTMLInputElement&&i.focus();return}if(o===String(n.name||``).trim()&&s===String(n.description||``).trim()){K(),X();return}f.renamingProjectId=t,X();try{let e=await fetch(`/api/projects`,{method:`POST`,credentials:`include`,headers:{"Content-Type":`application/json`},body:JSON.stringify({action:`renameProject`,project:t,name:o,description:s})}),n=await e.json().catch(()=>({}));if(!e.ok||!n?.ok||!n?.project)throw Error(n?.error||`Unable to rename project.`);f.projects=f.projects.map(e=>e.id===t?n.project:e),K(),f.renamingProjectId=``,j(`Renamed project to ${n.project.name}.`),X()}catch(e){f.renamingProjectId=``,j(e instanceof Error?e.message:`Unable to rename project.`,`error`),X()}return}let m=e.target.closest(`[data-project-duplicate]`);if(m){let e=m.getAttribute(`data-project-duplicate`)||``;B();try{let t=await fetch(`/api/projects`,{method:`POST`,credentials:`include`,headers:{"Content-Type":`application/json`},body:JSON.stringify({action:`duplicateProject`,project:e})}),n=await t.json().catch(()=>({}));if(!t.ok||!n?.ok)throw Error(n?.error||`Unable to duplicate project.`);j(`Duplicated ${n.project?.name||`project`}.`),await Z()}catch(e){j(e instanceof Error?e.message:`Unable to duplicate project.`,`error`)}return}let h=e.target.closest(`[data-project-delete]`);if(h){let e=h.getAttribute(`data-project-delete`)||``;if(!f.projects.find(t=>t.id===e))return;B(),f.bulkDeleteProjectIds=[e],G();return}let g=e.target.closest(`[data-project-owner-option]`);if(g){e.preventDefault(),e.stopPropagation();let t=g.getAttribute(`data-project-owner-option`)||``,n=g.getAttribute(`data-owner-email`)||``,r=f.projects.find(e=>e.id===t);if(!t||!n||!r)return;f.updatingOwnerProjectId=t,W();try{let e=await fetch(`/api/projects`,{method:`POST`,credentials:`include`,headers:{"Content-Type":`application/json`},body:JSON.stringify({action:`updateProjectOwner`,project:t,ownerEmail:n})}),r=await e.json().catch(()=>({}));if(!e.ok||!r?.ok||!r?.project)throw Error(r?.error||`Unable to update project owner.`);f.projects=f.projects.map(e=>e.id===t?r.project:e),f.updatingOwnerProjectId=``,V(),j(`Updated owner for ${r.project.name}.`),X()}catch(e){f.updatingOwnerProjectId=``,j(e instanceof Error?e.message:`Unable to update project owner.`,`error`),W()}return}if(e.target.closest(`[data-project-owner-picker]`))return;let _=e.target.closest(`[data-project-launch-url]`);if(!_){H(),B(),V();return}if(e.target.closest(`[data-project-actions]`)||e.target.closest(`[data-project-rename-editor]`)||e.target.closest(`.bridge-table-select`)||e.target.closest(`[data-project-thumbnail-refresh]`)||_.dataset.projectLocked===`true`||f.editingProjectId)return;let v=_.getAttribute(`data-project-launch-url`),y=_.getAttribute(`data-project-id`)||``;v&&(re(y,{useBeacon:!0}),window.location.href=v)}r.addEventListener(`click`,Re),o.addEventListener(`click`,Re),r.addEventListener(`change`,e=>{let t=e.target.closest(`[data-project-select]`);if(t instanceof HTMLInputElement){de(t.getAttribute(`data-project-select`)||``,t.checked),X();return}let n=e.target.closest(`[data-project-select-all]`);if(n instanceof HTMLInputElement){let e=ke().filter(e=>D(e,f.searchQuery)).map(e=>e.id),t=new Set(A());n.checked?e.forEach(e=>t.add(e)):e.forEach(e=>t.delete(e)),f.selectedProjectIds=Array.from(t),X()}}),s.addEventListener(`click`,async e=>{if(e.target.closest(`[data-confirm-project-delete]`)){let e=Array.isArray(f.bulkDeleteProjectIds)?f.bulkDeleteProjectIds.filter(Boolean):[],t=e.map(e=>f.projects.find(t=>t.id===e)).filter(Boolean);if(!t.length)return;f.bulkDeletingProjects=!0,G();try{for(let e of t){let t=await fetch(`/api/projects`,{method:`POST`,credentials:`include`,headers:{"Content-Type":`application/json`},body:JSON.stringify({action:`deleteProject`,project:e.id})}),n=await t.json().catch(()=>({}));if(!t.ok||!n?.ok)throw Error(n?.error||`Unable to delete project.`)}let n=new Set(e);f.bulkDeleteProjectIds=[],f.bulkDeletingProjects=!1,f.projects=f.projects.filter(e=>!n.has(e.id)),f.selectedProjectIds=A().filter(e=>!n.has(e)),j(`Deleted ${t.length} ${t.length===1?`project`:`projects`}.`),X(),Z({background:!0}).catch(()=>{})}catch(e){f.bulkDeletingProjects=!1,j(e instanceof Error?e.message:`Unable to delete project.`,`error`),G()}return}let t=e.target.closest(`[data-close-project-delete]`);if(t||e.target.closest(`[data-project-delete-overlay]`)){if(e.target.closest(`.bridge-project-delete__modal`)&&!t)return;f.bulkDeletingProjects||(f.bulkDeleteProjectIds=[],G());return}}),r.addEventListener(`keydown`,e=>{let t=e.target.closest(`[data-project-rename-input]`);if(t){if(e.key===`Enter`){e.preventDefault();let n=t.getAttribute(`data-project-rename-input`)||``,i=r.querySelector(`[data-project-rename-save="${n}"]`);i instanceof HTMLButtonElement&&!i.disabled&&i.click()}else e.key===`Escape`&&(e.preventDefault(),K(),X());return}let n=e.target.closest(`[data-project-description-input]`);if(n){if(e.key===`Enter`){e.preventDefault();let t=n.getAttribute(`data-project-description-input`)||``,i=r.querySelector(`[data-project-rename-save="${t}"]`);i instanceof HTMLButtonElement&&!i.disabled&&i.click()}else e.key===`Escape`&&(e.preventDefault(),K(),X());return}let i=e.target.closest(`[data-project-launch-url]`);if(!i||e.target.closest(`.bridge-table-select`)||e.key!==`Enter`&&e.key!==` `||(e.preventDefault(),i.dataset.projectLocked===`true`)||f.editingProjectId)return;let a=i.getAttribute(`data-project-launch-url`);a&&(re(i.getAttribute(`data-project-id`)||``,{useBeacon:!0}),window.location.href=a)}),r.addEventListener(`input`,e=>{let t=e.target.closest(`[data-project-search]`);if(t instanceof HTMLInputElement){let e=t.selectionStart,n=t.selectionEnd;f.searchQuery=t.value,X(),se(e,n);return}let n=e.target.closest(`[data-project-rename-input]`);if(n){let e=n.getAttribute(`data-project-rename-input`)||``;f.pendingProjectNameById[e]=n.value,f.dirtyProjectById[e]=!0,q(e);return}let r=e.target.closest(`[data-project-description-input]`);if(r){let e=r.getAttribute(`data-project-description-input`)||``;f.pendingProjectDescriptionById[e]=r.value,f.dirtyProjectById[e]=!0,q(e)}}),o.addEventListener(`input`,e=>{let t=e.target.closest(`[data-project-owner-search]`);if(t instanceof HTMLInputElement){let e=t.selectionStart,n=t.selectionEnd;f.ownerPickerSearchQuery=t.value,W(),U(e,n)}}),document.addEventListener(`click`,e=>{if(f.editingProjectId&&!e.target.closest(`[data-project-rename-editor]`)){K(),X();return}if(f.openMenuProjectId){if(e.target.closest(`[data-project-actions]`)||e.target.closest(`.bridge-projects-table__floating-menu`))return;B();return}if(f.ownerPickerProjectId){if(e.target.closest(`[data-project-owner-edit]`)||e.target.closest(`[data-project-owner-picker]`))return;V()}if(f.sortPresetMenuOpen){if(e.target.closest(`[data-project-sort]`))return;H(),X()}});let $=()=>{document.visibilityState===`visible`&&Pe({immediate:!0})};document.addEventListener(`visibilitychange`,$),window.addEventListener(`pageshow`,$),window.addEventListener(`focus`,$),Z().catch(e=>{f.loading=!1,j(e instanceof Error?e.message:`Unable to load projects.`,`error`)})})();