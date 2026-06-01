(function(){if(window.__uxBridgeFigmaImportRuntime)return;window.__uxBridgeFigmaImportRuntime=!0;let e=`/api/figma`,t=`ux-figma-import-modal`,n=`ux-figma-import-styles`,r=new Map,i={open:!1,loading:!1,checkingConnection:!1,configured:!1,connected:!1,savingToken:!1,error:``,token:``,url:``};function a(){if(document.getElementById(n))return;let e=document.createElement(`style`);e.id=n,e.textContent=`
      .figma-import-modal {
        position: fixed;
        inset: 0;
        z-index: 2147480000;
        display: grid;
        place-items: center;
        padding: 24px;
        background: rgba(15, 23, 42, 0.42);
        backdrop-filter: blur(12px);
      }

      .figma-import-dialog {
        width: min(460px, calc(100vw - 32px));
        border: 1px solid rgba(148, 163, 184, 0.24);
        border-radius: 28px;
        background: #ffffff;
        box-shadow: 0 28px 72px rgba(15, 23, 42, 0.24);
        color: #111827;
        font-family: Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        overflow: hidden;
      }

      .figma-import-dialog__body {
        display: grid;
        gap: 18px;
        padding: 28px;
      }

      .figma-import-dialog__eyebrow {
        margin: 0;
        color: #7c8497;
        font-size: 12px;
        font-weight: 800;
        letter-spacing: 0.18em;
        line-height: 1;
        text-transform: uppercase;
      }

      .figma-import-dialog h2 {
        margin: 0;
        font-size: 28px;
        line-height: 1.05;
        letter-spacing: 0;
      }

      .figma-import-dialog p {
        margin: 0;
        color: #64748b;
        font-size: 14px;
        line-height: 1.5;
      }

      .figma-import-dialog label {
        display: grid;
        gap: 8px;
        color: #64748b;
        font-size: 12px;
        font-weight: 800;
        letter-spacing: 0.12em;
        text-transform: uppercase;
      }

      .figma-import-dialog input {
        width: 100%;
        min-height: 52px;
        box-sizing: border-box;
        border: 1px solid rgba(148, 163, 184, 0.32);
        border-radius: 16px;
        padding: 0 16px;
        color: #111827;
        font: 600 14px/1.2 Inter, system-ui, sans-serif;
        outline: none;
      }

      .figma-import-dialog input:focus {
        border-color: #8b5cf6;
        box-shadow: 0 0 0 4px rgba(139, 92, 246, 0.14);
      }

      .figma-import-dialog input[type="password"] {
        font-family: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace;
        letter-spacing: 0;
      }

      .figma-import-dialog__error {
        padding: 12px 14px;
        border-radius: 14px;
        background: #fef2f2;
        color: #b91c1c !important;
        font-weight: 700;
      }

      .figma-import-dialog__actions {
        display: flex;
        justify-content: flex-end;
        gap: 10px;
      }

      .figma-import-dialog button {
        min-height: 44px;
        border: 0;
        border-radius: 999px;
        padding: 0 18px;
        font: 800 14px/1 Inter, system-ui, sans-serif;
        cursor: pointer;
      }

      .figma-import-dialog button:disabled {
        cursor: not-allowed;
        opacity: 0.58;
      }

      .figma-import-dialog__cancel {
        background: #f1f5f9;
        color: #334155;
      }

      .figma-import-dialog__submit {
        background: #252525;
        color: #ffffff;
      }

      .figma-import-dialog__connect {
        display: grid;
        gap: 12px;
        padding: 16px;
        border: 1px solid rgba(124, 58, 237, 0.18);
        border-radius: 18px;
        background: rgba(250, 245, 255, 0.72);
      }

      .figma-import-dialog__connect button {
        width: fit-content;
        background: #7c3aed;
        color: #ffffff;
      }

      .figma-import-dialog__connect-actions {
        display: flex;
        align-items: center;
        gap: 10px;
        flex-wrap: wrap;
      }

      .figma-import-dialog__connect-actions button[data-figma-import-disconnect] {
        background: transparent;
        color: #64748b;
        padding: 0 4px;
      }

      .figma-import-preview-loading {
        display: grid;
        place-items: center;
        min-height: 100%;
        padding: 32px;
        box-sizing: border-box;
        color: #111827;
        font-family: Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      }

      .figma-import-preview-loading__card {
        display: grid;
        justify-items: center;
        gap: 12px;
        width: min(320px, calc(100% - 32px));
        padding: 28px;
        border: 1px solid rgba(148, 163, 184, 0.28);
        border-radius: 24px;
        background: rgba(255, 255, 255, 0.92);
        box-shadow: 0 18px 48px rgba(15, 23, 42, 0.12);
        text-align: center;
      }

      .figma-import-preview-loading__spinner {
        width: 38px;
        height: 38px;
        border: 3px solid rgba(164, 41, 236, 0.18);
        border-top-color: #a429ec;
        border-radius: 999px;
        animation: figma-import-spin 800ms linear infinite;
      }

      .figma-import-preview-loading__title {
        margin: 0;
        color: #111827;
        font-size: 16px;
        font-weight: 800;
        line-height: 1.2;
      }

      .figma-import-preview-loading__copy {
        margin: 0;
        color: #64748b;
        font-size: 13px;
        font-weight: 600;
        line-height: 1.45;
      }

      .figma-import-preview-loading__retry {
        min-height: 38px;
        margin-top: 4px;
        border: 0;
        border-radius: 999px;
        padding: 0 16px;
        background: #252525;
        color: #ffffff;
        font: 800 13px/1 Inter, system-ui, sans-serif;
        cursor: pointer;
      }

      @keyframes figma-import-spin {
        to {
          transform: rotate(360deg);
        }
      }
    `,document.head.append(e)}function o(){let e=new URLSearchParams(window.location.search);return{projectId:String(document.body.dataset.projectKey||e.get(`project`)||``).trim(),pageId:String(document.body.dataset.pageKey||e.get(`page`)||``).trim()}}function s(){i.open=!1,i.loading=!1,i.error=``,y()}function c(){i.open=!0,i.loading=!1,i.checkingConnection=!0,i.error=``,y(),v()}function l(e,t){return`${e}::${t}`}function u(e){let t=l(e.projectId,e.pageId);r.set(t,e)}function d(e,t){let n=l(e,t);r.delete(n)}function f(e,t){let n=l(e,t);return r.get(n)||null}function p(){let{projectId:e,pageId:t}=o();return!e||!t?null:f(e,t)}function m(){return{emptyShell:document.querySelector(`[data-empty-mobile-shell]`),stage:document.querySelector(`[data-vibe-mobile-stage]`),render:document.querySelector(`[data-vibe-mobile-render]`)}}function h(e){let{emptyShell:t,stage:n,render:r}=m();if(!(n instanceof HTMLElement)||!(r instanceof HTMLElement))return;a();let i=l(e.projectId,e.pageId);r.dataset.figmaImportJobKey===i&&r.querySelector(`[data-figma-import-preview-loading]`)||(t instanceof HTMLElement&&(t.hidden=!0),n.hidden=!1,r.innerHTML=`
      <div class="figma-import-preview-loading" data-figma-import-preview-loading>
        <div class="figma-import-preview-loading__card">
          <div class="figma-import-preview-loading__spinner" aria-hidden="true"></div>
          <p class="figma-import-preview-loading__title">Importing from Figma</p>
          <p class="figma-import-preview-loading__copy">You can keep working while this page updates in the background.</p>
        </div>
      </div>
    `,r.dataset.figmaImportJobKey=i)}function g(e,t){let{emptyShell:n,stage:r,render:o}=m();!(r instanceof HTMLElement)||!(o instanceof HTMLElement)||(a(),n instanceof HTMLElement&&(n.hidden=!0),r.hidden=!1,o.innerHTML=`
      <div class="figma-import-preview-loading" data-figma-import-preview-loading>
        <div class="figma-import-preview-loading__card">
          <p class="figma-import-preview-loading__title">Figma import failed</p>
          <p class="figma-import-preview-loading__copy">${b(t)}</p>
          <button type="button" class="figma-import-preview-loading__retry" data-figma-import-retry>Try again</button>
        </div>
      </div>
    `,o.dataset.figmaImportJobKey=l(e.projectId,e.pageId),o.querySelector(`[data-figma-import-retry]`)?.addEventListener(`click`,()=>{i.url=e.figmaUrl||i.url,c()}))}function _(){let e=p();e&&h(e)}async function v(){try{let t=`${window.location.pathname}${window.location.search}${window.location.hash}`,n=await fetch(`${e}?action=status&returnTo=${encodeURIComponent(t)}`,{credentials:`include`}),r=await n.json().catch(()=>({}));i.configured=!!r?.configured,i.connected=!!r?.connected,i.error=n.ok?i.error:r?.error||`Sign in before connecting Figma.`}catch{i.error=`Unable to check your Figma connection.`}finally{i.checkingConnection=!1,y()}}function y(){a();let e=document.getElementById(t);if(!i.open){e?.remove();return}e||(e=document.createElement(`div`),e.id=t,e.className=`figma-import-modal`,document.body.append(e));let n=i.connected&&!i.checkingConnection,r=i.checkingConnection?`<p>Checking your Figma connection...</p>`:i.connected?`<div class="figma-import-dialog__connect">
            <p>Your Figma Personal Access Token is saved for this account.</p>
            <div class="figma-import-dialog__connect-actions">
              <button type="button" data-figma-import-disconnect ${i.loading?`disabled`:``}>Replace token</button>
            </div>
          </div>`:`<div class="figma-import-dialog__connect">
            <p>Paste a Figma Personal Access Token so UX Bridge can read the frame you choose. This is saved only for your UX Bridge account.</p>
            <label>
              Personal Access Token
              <input type="password" data-figma-import-token placeholder="figd_..." value="${x(i.token)}" ${i.loading||i.savingToken?`disabled`:``} />
            </label>
            <div class="figma-import-dialog__connect-actions">
              <button type="button" data-figma-import-save-token ${i.loading||i.savingToken?`disabled`:``}>
                ${i.savingToken?`Saving...`:`Save token`}
              </button>
            </div>
          </div>`;e.innerHTML=`
      <form class="figma-import-dialog" data-figma-import-form>
        <div class="figma-import-dialog__body">
          <div>
            <p class="figma-import-dialog__eyebrow">Figma Import</p>
            <h2>Import from Figma</h2>
          </div>
          <p>Paste a Figma frame or layer URL. UX Bridge will recreate it in this preview with Codex.</p>
          ${r}
          <label>
            Figma URL
            <input type="url" data-figma-import-url placeholder="https://www.figma.com/design/..." value="${x(i.url)}" ${i.loading||!n?`disabled`:``} />
          </label>
          ${i.error?`<p class="figma-import-dialog__error">${b(i.error)}</p>`:``}
          <div class="figma-import-dialog__actions">
            <button type="button" class="figma-import-dialog__cancel" data-figma-import-cancel ${i.loading?`disabled`:``}>Cancel</button>
            <button type="submit" class="figma-import-dialog__submit" ${i.loading||!n?`disabled`:``}>
              ${i.loading?`Importing...`:`Import`}
            </button>
          </div>
        </div>
      </form>
    `,e.onclick=t=>{t.target===e&&!i.loading&&s()},e.querySelector(`[data-figma-import-cancel]`)?.addEventListener(`click`,s),e.querySelector(`[data-figma-import-save-token]`)?.addEventListener(`click`,()=>{w()}),e.querySelector(`[data-figma-import-disconnect]`)?.addEventListener(`click`,()=>{T()}),e.querySelector(`[data-figma-import-token]`)?.addEventListener(`input`,e=>{i.token=e.currentTarget.value}),e.querySelector(`[data-figma-import-url]`)?.addEventListener(`input`,e=>{i.url=e.currentTarget.value}),e.querySelector(`[data-figma-import-form]`)?.addEventListener(`submit`,e=>{e.preventDefault(),S()}),window.requestAnimationFrame(()=>{n?e.querySelector(`[data-figma-import-url]`)?.focus():i.checkingConnection||e.querySelector(`[data-figma-import-token]`)?.focus()})}function b(e){return String(e||``).replaceAll(`&`,`&amp;`).replaceAll(`<`,`&lt;`).replaceAll(`>`,`&gt;`).replaceAll(`"`,`&quot;`).replaceAll(`'`,`&#39;`)}function x(e){return b(e).replaceAll(`
`,` `)}function S(){let e=String(i.url||``).trim(),{projectId:t,pageId:n}=o();if(!e){i.error=`Paste a Figma URL first.`,y();return}if(!t||!n){i.error=`Open a project page before importing from Figma.`,y();return}let r=f(t,n);if(r){s(),h(r);return}let a={projectId:t,pageId:n,figmaUrl:e,startedAt:Date.now()};u(a),s(),h(a),C(a)}async function C(e){try{let t=await fetch(`/api/projects`,{method:`POST`,credentials:`include`,headers:{"Content-Type":`application/json`},body:JSON.stringify({action:`importFigmaContent`,project:e.projectId,page:e.pageId,figmaUrl:e.figmaUrl})}),n=await t.json().catch(()=>({}));if(!t.ok||!n?.ok||!n?.project)throw n?.code===`FIGMA_NOT_CONNECTED`&&(i.connected=!1,v()),Error(n?.error||`Unable to import that Figma design.`);d(e.projectId,e.pageId),window.dispatchEvent(new CustomEvent(`uxbridge:project-runtime-sync`,{detail:{project:n.project}}))}catch(t){d(e.projectId,e.pageId);let n=t instanceof Error?t.message:`Unable to import that Figma design.`,{projectId:r,pageId:i}=o();r===e.projectId&&i===e.pageId&&g(e,n)}}async function w(){let t=String(i.token||``).trim();if(!t){i.error=`Paste your Figma Personal Access Token first.`,y();return}i.savingToken=!0,i.error=``,y();try{let n=await fetch(`${e}?action=save-token`,{method:`POST`,credentials:`include`,headers:{"Content-Type":`application/json`},body:JSON.stringify({token:t})}),r=await n.json().catch(()=>({}));if(!n.ok||!r?.ok)throw Error(r?.error||`Unable to save that Figma token.`);i.connected=!0,i.token=``}catch(e){i.error=e instanceof Error?e.message:`Unable to save that Figma token.`}finally{i.savingToken=!1,y()}}async function T(){i.savingToken=!0,i.error=``,y();try{await fetch(`${e}?action=disconnect`,{method:`POST`,credentials:`include`})}catch{i.error=`Unable to replace the saved Figma token.`}finally{i.connected=!1,i.savingToken=!1,i.token=``,y()}}function E(e){if(!(e instanceof Element))return null;let t=e.closest(`[data-figma-import-open]`);if(t instanceof HTMLElement)return t;let n=e.closest(`button, [role='button'], a`);return!(n instanceof HTMLElement)||!n.closest(`[data-empty-mobile-shell]`)||n.textContent.trim().toLowerCase()!==`import from figma`?null:n}function D(e){return e instanceof HTMLElement?e.hasAttribute(`data-figma-import-open`)?!0:e.closest(`[data-empty-mobile-shell]`)&&e.textContent.trim().toLowerCase()===`import from figma`:!1}function O(e=document){e.querySelectorAll(`button`).forEach(e=>{!D(e)||e.dataset.figmaImportBound===`true`||(e.dataset.figmaImportBound=`true`,e.addEventListener(`click`,e=>{e.preventDefault(),c()}))})}document.addEventListener(`click`,e=>{E(e.target)&&(e.preventDefault(),e.stopPropagation(),c())},!0),document.addEventListener(`keydown`,e=>{e.key===`Escape`&&i.open&&!i.loading&&(e.preventDefault(),s())}),O(),new MutationObserver(e=>{e.forEach(e=>{e.addedNodes.forEach(e=>{e instanceof Element&&O(e)})}),_()}).observe(document.documentElement,{childList:!0,subtree:!0}),window.addEventListener(`uxbridge:project-page-sync`,()=>{window.requestAnimationFrame(_)}),window.addEventListener(`popstate`,()=>{window.requestAnimationFrame(_)}),_()})();