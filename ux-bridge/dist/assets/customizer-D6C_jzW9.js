function e(e){let n=new Set,r=e,i=()=>{n.forEach(e=>e(r))},a=e=>{r=typeof e==`function`?e(r):{...r,...e},i()};return{getState:()=>r,subscribe(e){return n.add(e),()=>n.delete(e)},update:a,setAtPath:(e,n)=>{let r=e.split(`.`);a(i=>{let a=t(i,r),s=a;return r.slice(0,-1).forEach(e=>{s=s[e]}),s[r.at(-1)]=n,o(a,e),a})}}}function t(e,t=[]){let n=Array.isArray(e)?[...e]:{...e},r=e,i=n;return t.slice(0,-1).forEach(e=>{let t=r?.[e],n=Array.isArray(t)?[...t]:{...t};i[e]=n,r=t,i=n}),n}function n(e){let t=String(e??``).replace(/[^0-9.-]/g,``),n=Number.parseFloat(t);return Number.isFinite(n)?n:0}function r(e){let t=String(e??``).replace(/,/g,``);return t.includes(`.`)?t.split(`.`)[1].length:0}function i(e,t=``){let n=r(t);return new Intl.NumberFormat(`en-US`,{minimumFractionDigits:n,maximumFractionDigits:n}).format(e)}function a(e,t){let r=n(e),i=n(t);return i<=0?0:Math.max(0,Math.min(100,r/i*100))}function o(e,t){let r=t.match(/^incentives\.cards\.(\d+)\.tracker\.(current|target|progress)$/);if(!r)return;let o=Number(r[1]),s=r[2],c=e?.incentives?.cards?.[o]?.tracker;if(c){if(s===`progress`){let e=n(c.target),t=Math.max(0,Math.min(100,Number(c.progress)||0)),r=e*t/100;c.progress=t,c.current=i(r,c.target||c.current);return}c.progress=a(c.current,c.target)}}function s(e){return e===`estimatedEarnings.amount`||/^estimatedEarnings\.rows\.\d+\.value$/.test(e)||e===`bonusBreakdown.amount`}function c(e){return String(e??``).replaceAll(`$`,``).trim()}function l(e){let t=c(e);return t?`$${t}`:`$0.00`}function u(e){let t=structuredClone(e);return t.estimatedEarnings.amount=c(t.estimatedEarnings.amount),t.estimatedEarnings.rows=t.estimatedEarnings.rows.map((e,t)=>({...e,id:e.id||`estimated-row-${t+1}`,value:c(e.value)})),t.bonusBreakdown.amount=c(t.bonusBreakdown.amount),t.incentives.cards=t.incentives.cards.map(e=>{let t={...e,visible:e.visible??!0};return e.tracker?{...t,tracker:{...e.tracker,progress:a(e.tracker.current,e.tracker.target),showRemaining:e.tracker.showRemaining??!0}}:t}),t}function d(e){return`${e}-${Date.now()}-${Math.random().toString(36).slice(2,8)}`}function f(){return{id:d(`estimated-row`),label:``,value:`0.00`,visible:!0,sublabel:``}}function p(){return{id:d(`incentive-card`),title:`New Incentive Card`,visible:!0,description:`Add a description for this incentive card.`,showDescription:!0,tracker:{label:`GSV`,current:`0`,target:`1000`,remaining:`1000 GSV remaining`,progress:0,visible:!0,showRemaining:!0}}}var m=document.body.dataset.page||`l1`,h=document.querySelector(`[data-customizer-root]`),g=!!h,_=document.body.dataset.dynamicProject===`true`;document.body.classList.toggle(`bridge-body--has-customizer`,g);var v=!1,y=(()=>{let e=document.querySelector(`[data-mobile-sheet-backdrop]`);if(e)return e;let t=document.createElement(`button`);return t.type=`button`,t.className=`bridge-mobile-sheet-backdrop`,t.setAttribute(`data-mobile-sheet-backdrop`,``),t.setAttribute(`aria-label`,`Close drawer`),t.hidden=!0,document.body.append(t),t})(),b={panels:new Set([`estimated-earnings`]),groups:new Set},x={l1:{sectionOrder:[`estimated-earnings`,`incentives`,`bonus-breakdown`],estimatedEarnings:{amount:`$100.50`,label:`Earnings Breakdown`,rows:[{label:`Retailing Bonus`,value:`$34`,visible:!0,sublabel:``},{label:`L1 Bonus`,value:`$67`,visible:!0,sublabel:`5% of the CSV`}]},incentives:{isOpen:!1,cards:[{id:`l2-bonus`,title:`Unlock L2 Bonus`,description:`Reach 500 L1 SV to unlock a 5% bonus on your L2.`,showDescription:!0,tracker:{label:`L1 SV`,current:`250`,target:`500`,remaining:`250 L1 SV remaining`,progress:50,visible:!0}},{id:`brand-rep`,title:`Achieve Brand Representative`,description:`Complete requirements to unlock.`,showDescription:!0,requirementsVisible:!0,requirements:[{text:`Submit a Letter of Intent`,linkLabel:`Letter of Intent`,complete:!0,visible:!0},{text:`Complete BR Qualification View Tracker`,linkLabel:`View Tracker`,complete:!1,visible:!0}]},{id:`building-10`,title:`Unlock 10% Building Bonus`,description:`Reach 2,000 GSV to unlock. (Must achieve Brand Representative)`,showDescription:!0,tracker:{label:`GSV`,current:`1,000`,target:`2,000`,remaining:`1,000 GSV remaining`,progress:50,visible:!0}},{id:`double-l1-l2`,title:`Unlock Double L1 & L2 Bonus`,description:`Reach 3,000 GSV to unlock an additional 5% on your L1 & L2 Bonuses.`,showDescription:!0,tracker:{label:`GSV`,current:`2,500`,target:`3,000`,remaining:`500 GSV remaining`,progress:83.3333,visible:!0}},{id:`building-13`,title:`Unlock 13% Building Bonus`,description:`Reach 3,000 GSV to unlock.`,showDescription:!0,tracker:{label:`GSV`,current:`2,500`,target:`3,000`,remaining:`500 GSV remaining`,progress:83.3333,visible:!0}}]},bonusBreakdown:{title:`L1 Bonus`,amount:`$0.00`,rows:[{label:`Level 1`,badge:`5%`,value:`520 SV`,visible:!0}]}},l1l2:{sectionOrder:[`estimated-earnings`,`incentives`,`bonus-breakdown`],estimatedEarnings:{amount:`$177.32`,label:`Earnings Breakdown`,rows:[{label:`Retailing Bonus`,value:`$51`,visible:!0,sublabel:``},{label:`L1 Bonus`,value:`$87`,visible:!0,sublabel:`5% of the CSV`},{label:`L2 Bonus`,value:`$39`,visible:!0,sublabel:`5% of the CSV`}]},incentives:{isOpen:!1,cards:[{id:`l2-bonus`,title:`Unlock L2 Bonus`,description:`Reach 500 L1 SV to unlock a 5% bonus on your L2.`,showDescription:!0,tracker:{label:`L1 SV`,current:`250`,target:`500`,remaining:`250 L1 SV remaining`,progress:50,visible:!0}},{id:`brand-rep`,title:`Achieve Brand Representative`,description:`Complete requirements to unlock.`,showDescription:!0,requirementsVisible:!0,requirements:[{text:`Submit a Letter of Intent`,linkLabel:`Letter of Intent`,complete:!0,visible:!0},{text:`Complete BR Qualification View Tracker`,linkLabel:`View Tracker`,complete:!1,visible:!0}]},{id:`building-10`,title:`Unlock 10% Building Bonus`,description:`Reach 2,000 GSV to unlock. (Must achieve Brand Representative)`,showDescription:!0,tracker:{label:`GSV`,current:`1,000`,target:`2,000`,remaining:`1,000 GSV remaining`,progress:50,visible:!0}},{id:`double-l1-l2`,title:`Unlock Double L1 & L2 Bonus`,description:`Reach 3,000 GSV to unlock an additional 5% on your L1 & L2 Bonuses.`,showDescription:!0,tracker:{label:`GSV`,current:`2,500`,target:`3,000`,remaining:`500 GSV remaining`,progress:83.3333,visible:!0}},{id:`building-13`,title:`Unlock 13% Building Bonus`,description:`Reach 3,000 GSV to unlock.`,showDescription:!0,tracker:{label:`GSV`,current:`2,500`,target:`3,000`,remaining:`500 GSV remaining`,progress:83.3333,visible:!0}}]},bonusBreakdown:{title:`L1/L2 Bonus`,amount:`$0.00`,rows:[{label:`Level 1`,badge:`5%`,value:`520 SV`,visible:!0},{label:`Level 2`,badge:`5%`,value:`50 SV`,visible:!0}]}}},S=e(u(structuredClone(x[m]||x.l1)));window.brandAffiliateCustomizer=S;function C(){document.body.classList.toggle(`customizer-open`,v),h.inert=!v;let e=document.querySelector(`[data-customizer-drawer-toggle]`);e&&(e.setAttribute(`aria-expanded`,v?`true`:`false`),e.setAttribute(`aria-hidden`,v?`true`:`false`),e.classList.toggle(`is-active`,v)),w()}function w(){if(!y)return;let e=window.innerWidth<=959&&!document.body.classList.contains(`preview-viewport-responsive`),t=document.body.classList.contains(`customizer-open`)||document.body.classList.contains(`comments-open`)||document.body.classList.contains(`uploads-open`)||document.body.classList.contains(`vibe-open`),n=e&&t;y.hidden=!n,y.classList.toggle(`is-visible`,n)}function T(e,t=`customizer`){v!==e&&(v=e,C(),v&&window.dispatchEvent(new CustomEvent(`uxbridge:drawer-open`,{detail:{drawer:t}})))}function E(){if(!g)return;let e=window.UXBridgeActionRail?.renderButtonContent||(({label:e,tooltipClass:t=``}={})=>`
      <span class="bridge-action-rail-button__tooltip${t?` ${t}`:``}" aria-hidden="true">${e||``}</span>
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M4 7h16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"></path>
        <path d="M4 12h16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"></path>
        <path d="M4 17h16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"></path>
        <circle cx="9" cy="7" r="2.2" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"></circle>
        <circle cx="15" cy="12" r="2.2" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"></circle>
        <circle cx="11" cy="17" r="2.2" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"></circle>
      </svg>
    `),t=document.querySelector(`[data-side-actions]`),n=document.createElement(`button`);n.type=`button`,n.className=`bridge-action-rail-button customizer-drawer-toggle`,n.setAttribute(`data-customizer-drawer-toggle`,``),n.setAttribute(`aria-expanded`,`false`),n.setAttribute(`aria-label`,`Customize`),n.innerHTML=e({icon:`customize`,label:`Customize`,tooltipClass:`customizer-drawer-toggle__tooltip`}),n.addEventListener(`click`,()=>{T(!v)}),window.addEventListener(`uxbridge:drawer-open`,e=>{e.detail?.drawer!==`customizer`&&T(!1,`customizer`)}),t?t.prepend(n):document.body.append(n),C()}function D(e,t,n){return`
    <label class="customizer-toggle">
      <span>${t}</span>
      <input type="checkbox" data-path="${e}" ${n?`checked`:``} />
    </label>
  `}function O(e,t,n){let r=s(e)?c(n):n;return`
    <label class="customizer-field">
      <span>${t}</span>
      <input type="text" value="${String(r).replaceAll(`"`,`&quot;`)}" data-path="${e}" />
    </label>
  `}function k(e,t,n){return`
    <label class="customizer-field">
      <span>${t} <strong>${Math.round(n)}%</strong></span>
      <input type="range" min="0" max="100" step="1" value="${n}" data-path="${e}" />
    </label>
  `}function A(e,t,n=``,r=`primary`){let i=r===`destructive`?`
        <svg viewBox="0 0 20 20" aria-hidden="true">
          <path d="M4.5 6h11"></path>
          <path d="M8 3.5h4"></path>
          <path d="M6.5 6l.6 9.5h5.8l.6-9.5"></path>
        </svg>
      `:`
        <svg viewBox="0 0 20 20" aria-hidden="true">
          <path d="M10 4.5v11"></path>
          <path d="M4.5 10h11"></path>
        </svg>
      `;return`
    <button class="customizer-action customizer-action--${r}" type="button" data-action="${e}" ${n?`data-value="${n}"`:``}>
      <span class="customizer-action__icon">${i}</span>
      <span>${t}</span>
    </button>
  `}function j(e,t,n,r,i=``,a=``,o=``,s=``){let c=(e===`panel`?b.panels:b.groups).has(t),l=e===`panel`?` data-reorderable-section="true"`:``;return`
    <details class="${[`customizer-accordion`,a].filter(Boolean).join(` `)}" data-customizer-accordion="${e}" data-ui-key="${t}" ${l} ${o} ${c?`open`:``}>
      <summary class="customizer-accordion__summary">
        <span class="customizer-accordion__summary-main">
          ${s||(e===`panel`?`
        <span class="customizer-accordion__drag" draggable="true" data-drag-handle="true" aria-hidden="true">
          <svg viewBox="0 0 20 20">
            <path d="M7 5h.01M13 5h.01M7 10h.01M13 10h.01M7 15h.01M13 15h.01"></path>
          </svg>
        </span>
      `:``)}
          <span>${n}</span>
          <span class="customizer-accordion__chevron" aria-hidden="true">
            <svg viewBox="0 0 16 16">
              <path d="M3 6L8 11L13 6"></path>
            </svg>
          </span>
        </span>
        <span class="customizer-accordion__summary-actions">${i}</span>
      </summary>
      <div class="customizer-accordion__content">
        ${r}
      </div>
    </details>
  `}function M(e,t,n,r,i){let a=`estimated-row-${e}`;return`
    <details
      class="customizer-accordion customizer-accordion--row"
      data-customizer-accordion="group"
      data-ui-key="${a}"
      data-reorderable-estimated-row="true"
      data-row-id="${e}"
      ${b.groups.has(a)?`open`:``}
    >
      <summary class="customizer-accordion__summary customizer-accordion__summary--row">
        <span class="customizer-accordion__summary-main">
          <span class="customizer-accordion__drag" draggable="true" data-drag-estimated-row="true" aria-hidden="true">
            <svg viewBox="0 0 20 20">
              <path d="M7 5h.01M13 5h.01M7 10h.01M13 10h.01M7 15h.01M13 15h.01"></path>
            </svg>
          </span>
          <span>${n}</span>
          <span class="customizer-accordion__chevron" aria-hidden="true">
            <svg viewBox="0 0 16 16">
              <path d="M3 6L8 11L13 6"></path>
            </svg>
          </span>
        </span>
        <span class="customizer-accordion__summary-actions">
          <label class="customizer-switch" aria-label="Show ${n}">
            <input type="checkbox" data-path="estimatedEarnings.rows.${t}.visible" ${r?`checked`:``} />
            <span class="customizer-switch__track" aria-hidden="true">
              <span class="customizer-switch__thumb"></span>
            </span>
          </label>
        </span>
      </summary>
      <div class="customizer-accordion__content">
        ${i}
        <div class="customizer-accordion__footer">
          ${A(`remove-estimated-row`,`Remove`,e,`destructive`)}
        </div>
      </div>
    </details>
  `}function N(e){if(!h)return;if(_){h.innerHTML=`
      <div class="customizer-panel__inner customizer-panel__inner--empty">
        <div class="customizer-panel__header">
          <div class="customizer-panel__header-copy">
            <p class="customizer-panel__eyebrow">Customizer</p>
            <h2>Page Controls</h2>
            <p>This page does not have configurable content yet. Use Create with Codex to start building this screen.</p>
          </div>
          <button class="customizer-panel__close" type="button" data-customizer-close aria-label="Close customizer">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M6 6L18 18"></path>
              <path d="M18 6L6 18"></path>
            </svg>
          </button>
        </div>
        <section class="customizer-empty-state">
          <p class="customizer-empty-state__eyebrow">Nothing to customize yet</p>
          <h3>Start with Codex</h3>
          <p>Once this page has real components, live controls will show up here automatically.</p>
        </section>
      </div>
    `,h.querySelector(`[data-customizer-close]`)?.addEventListener(`click`,()=>{T(!1)});return}let t=document.activeElement,n=t?.dataset?.path||``,r=t?.value,i=typeof t?.selectionStart==`number`?t.selectionStart:null,a=typeof t?.selectionEnd==`number`?t.selectionEnd:null,o=h,l=o.scrollTop;h.innerHTML=`
    <div class="customizer-panel__inner">
      <div class="customizer-panel__header">
        <div class="customizer-panel__header-copy">
          <p class="customizer-panel__eyebrow">Customizer</p>
          <h2>Live Card Controls</h2>
          <p>Compact controls for quick edits and toggles.</p>
        </div>
        <button class="customizer-panel__close" type="button" data-customizer-close aria-label="Close customizer">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M6 6L18 18"></path>
            <path d="M18 6L6 18"></path>
          </svg>
        </button>
      </div>

      ${j(`panel`,`estimated-earnings`,`Estimated Earnings`,`
          <section class="customizer-section customizer-section--flat">
            <div class="customizer-fields-grid customizer-fields-grid--two">
              ${O(`estimatedEarnings.amount`,`Amount`,e.estimatedEarnings.amount)}
              ${O(`estimatedEarnings.label`,`Disclosure label`,e.estimatedEarnings.label)}
            </div>
            ${e.estimatedEarnings.rows.map((e,t)=>M(e.id,t,e.label?.trim()||`Row ${t+1}`,e.visible,`
                    <div class="customizer-subsection">
                      <div class="customizer-fields-grid customizer-fields-grid--two">
                        ${O(`estimatedEarnings.rows.${t}.label`,`Label`,e.label)}
                        ${O(`estimatedEarnings.rows.${t}.value`,`Value`,e.value)}
                      </div>
                      ${O(`estimatedEarnings.rows.${t}.sublabel`,`Sublabel`,e.sublabel)}
                    </div>
                  `)).join(``)}
            <div class="customizer-section__actions">
              ${A(`add-estimated-row`,`Add Row`)}
            </div>
          </section>
        `)}

      ${j(`panel`,`incentives`,`Incentive Cards`,`
          <section class="customizer-section customizer-section--flat">
            ${e.incentives.cards.map((e,t)=>{let n=e.tracker?`
                      <div class="customizer-subsection__header">
                        <span class="customizer-subsection__label">Tracker</span>
                        <label class="customizer-switch" aria-label="Show tracker">
                          <input type="checkbox" data-path="incentives.cards.${t}.tracker.visible" ${e.tracker.visible?`checked`:``} />
                          <span class="customizer-switch__track" aria-hidden="true">
                            <span class="customizer-switch__thumb"></span>
                          </span>
                        </label>
                      </div>
                      ${O(`incentives.cards.${t}.tracker.label`,`Tracker title`,e.tracker.label)}
                      <div class="customizer-fields-grid customizer-fields-grid--two">
                        ${O(`incentives.cards.${t}.tracker.current`,`Current`,e.tracker.current)}
                        ${O(`incentives.cards.${t}.tracker.target`,`Target`,e.tracker.target)}
                      </div>
                      ${k(`incentives.cards.${t}.tracker.progress`,`Progress`,e.tracker.progress)}
                      ${D(`incentives.cards.${t}.tracker.showRemaining`,`Show remaining`,e.tracker.showRemaining??!0)}
                    `:`
                      ${D(`incentives.cards.${t}.requirementsVisible`,`Show requirements`,e.requirementsVisible)}
                      ${e.requirements.map((e,n)=>`
                            <div class="customizer-nested">
                              <h5>Requirement ${n+1}</h5>
                              <div class="customizer-fields-grid customizer-fields-grid--two">
                                ${D(`incentives.cards.${t}.requirements.${n}.visible`,`Show requirement`,e.visible)}
                                ${D(`incentives.cards.${t}.requirements.${n}.complete`,`Completed`,e.complete)}
                              </div>
                              ${O(`incentives.cards.${t}.requirements.${n}.text`,`Text`,e.text)}
                              ${O(`incentives.cards.${t}.requirements.${n}.linkLabel`,`Link label`,e.linkLabel)}
                            </div>
                          `).join(``)}
                    `;return j(`group`,`incentive-card-${t}`,e.title,`
                    <div class="customizer-subsection customizer-subsection--flat">
                      ${O(`incentives.cards.${t}.title`,`Title`,e.title)}
                      ${O(`incentives.cards.${t}.description`,`Description`,e.description)}
                      ${e.tracker?`<div class="customizer-subsection__divider" aria-hidden="true"></div>`:``}
                      ${n}
                    </div>
                    <div class="customizer-accordion__footer">
                      ${A(`remove-incentive-card`,`Remove`,e.id,`destructive`)}
                    </div>
                  `,`
                    <label class="customizer-switch" aria-label="Show card">
                      <input type="checkbox" data-path="incentives.cards.${t}.visible" ${e.visible===!1?``:`checked`} />
                      <span class="customizer-switch__track" aria-hidden="true">
                        <span class="customizer-switch__thumb"></span>
                      </span>
                    </label>
                  `,``,`data-reorderable-incentive-card="true" data-card-id="${e.id}"`,`
                    <span class="customizer-accordion__drag" draggable="true" data-drag-incentive-card="true" aria-hidden="true">
                      <svg viewBox="0 0 20 20">
                        <path d="M7 5h.01M13 5h.01M7 10h.01M13 10h.01M7 15h.01M13 15h.01"></path>
                      </svg>
                    </span>
                  `)}).join(``)}
            <div class="customizer-section__actions">
              ${A(`add-incentive-card`,`Add Incentive Card`)}
            </div>
          </section>
        `)}

      ${j(`panel`,`bonus-breakdown`,`Bonus Breakdown`,`
          <section class="customizer-section customizer-section--flat">
            <div class="customizer-fields-grid customizer-fields-grid--two">
              ${O(`bonusBreakdown.title`,`Card title`,e.bonusBreakdown.title)}
              ${O(`bonusBreakdown.amount`,`Amount`,e.bonusBreakdown.amount)}
            </div>
            ${e.bonusBreakdown.rows.map((e,t)=>j(`group`,`bonus-row-${t}`,`Level ${t+1}`,`
                    <div class="customizer-subsection">
                      <div class="customizer-fields-grid customizer-fields-grid--two">
                        ${D(`bonusBreakdown.rows.${t}.visible`,`Show row`,e.visible)}
                        ${O(`bonusBreakdown.rows.${t}.badge`,`Badge`,e.badge)}
                      </div>
                      <div class="customizer-fields-grid customizer-fields-grid--two">
                        ${O(`bonusBreakdown.rows.${t}.label`,`Label`,e.label)}
                        ${O(`bonusBreakdown.rows.${t}.value`,`Value`,e.value)}
                      </div>
                    </div>
                  `)).join(``)}
          </section>
        `)}
    </div>
  `,h.querySelectorAll(`input[data-path]`).forEach(e=>{let t=e.type===`checkbox`||e.type===`range`?`change`:`input`;e.addEventListener(t,t=>{e.closest(`.customizer-switch`)&&t.stopPropagation();let{path:n}=t.target.dataset,r=e.type===`checkbox`?e.checked:e.type===`range`?Number(e.value):s(n)?c(e.value):e.value;S.setAtPath(n,r)})}),h.querySelector(`[data-customizer-close]`)?.addEventListener(`click`,()=>{T(!1)}),h.querySelectorAll(`[data-action]`).forEach(e=>{e.addEventListener(`click`,()=>{let{action:t,value:n}=e.dataset;if(t===`add-estimated-row`){let e=f();b.groups.add(`estimated-row-${e.id}`),S.update(t=>({...t,estimatedEarnings:{...t.estimatedEarnings,rows:[...t.estimatedEarnings.rows,e]}}));return}if(t===`remove-estimated-row`){b.groups.delete(`estimated-row-${n}`),S.update(e=>({...e,estimatedEarnings:{...e.estimatedEarnings,rows:e.estimatedEarnings.rows.filter(e=>e.id!==n)}}));return}if(t===`add-incentive-card`){S.update(e=>({...e,incentives:{...e.incentives,cards:[...e.incentives.cards,p()]}}));return}t===`remove-incentive-card`&&S.update(e=>({...e,incentives:{...e.incentives,cards:e.incentives.cards.filter(e=>e.id!==n)}}))})}),h.querySelectorAll(`[data-customizer-accordion]`).forEach(e=>{e.querySelectorAll(`.customizer-switch`).forEach(e=>{e.addEventListener(`click`,e=>{e.stopPropagation()})}),e.querySelectorAll(`.customizer-switch input`).forEach(e=>{e.addEventListener(`click`,e=>{e.stopPropagation()})})});let u=null,d=null,m=null;h.querySelectorAll(`[data-reorderable-section="true"]`).forEach(e=>{e.querySelector(`[data-drag-handle="true"]`)?.addEventListener(`dragstart`,t=>{u=e.dataset.uiKey,e.classList.add(`is-dragging`),t.dataTransfer.effectAllowed=`move`,t.dataTransfer.setData(`text/plain`,u)}),e.addEventListener(`dragover`,t=>{!u||u===e.dataset.uiKey||(t.preventDefault(),e.classList.add(`is-drag-target`),t.dataTransfer.dropEffect=`move`)}),e.addEventListener(`dragleave`,()=>{e.classList.remove(`is-drag-target`)}),e.addEventListener(`drop`,t=>{t.preventDefault(),e.classList.remove(`is-drag-target`);let n=e.dataset.uiKey;!u||u===n||S.update(e=>{let t=[...e.sectionOrder],r=t.indexOf(u),i=t.indexOf(n);if(r===-1||i===-1)return e;let[a]=t.splice(r,1);return t.splice(i,0,a),{...e,sectionOrder:t}})}),e.addEventListener(`dragend`,()=>{u=null,h.querySelectorAll(`.is-dragging, .is-drag-target`).forEach(e=>e.classList.remove(`is-dragging`,`is-drag-target`))})}),h.querySelectorAll(`[data-reorderable-estimated-row="true"]`).forEach(e=>{e.querySelector(`[data-drag-estimated-row="true"]`)?.addEventListener(`dragstart`,t=>{d=e.dataset.rowId,e.classList.add(`is-dragging`),t.dataTransfer.effectAllowed=`move`,t.dataTransfer.setData(`text/plain`,d)}),e.addEventListener(`dragover`,t=>{!d||d===e.dataset.rowId||(t.preventDefault(),e.classList.add(`is-drag-target`),t.dataTransfer.dropEffect=`move`)}),e.addEventListener(`dragleave`,()=>{e.classList.remove(`is-drag-target`)}),e.addEventListener(`drop`,t=>{t.preventDefault(),e.classList.remove(`is-drag-target`);let n=e.dataset.rowId;!d||d===n||S.update(e=>{let t=[...e.estimatedEarnings.rows],r=t.findIndex(e=>e.id===d),i=t.findIndex(e=>e.id===n);if(r===-1||i===-1)return e;let[a]=t.splice(r,1);return t.splice(i,0,a),{...e,estimatedEarnings:{...e.estimatedEarnings,rows:t}}})}),e.addEventListener(`dragend`,()=>{d=null,h.querySelectorAll(`.is-dragging, .is-drag-target`).forEach(e=>e.classList.remove(`is-dragging`,`is-drag-target`))})}),h.querySelectorAll(`[data-reorderable-incentive-card="true"]`).forEach(e=>{e.querySelector(`[data-drag-incentive-card="true"]`)?.addEventListener(`dragstart`,t=>{m=e.dataset.cardId,e.classList.add(`is-dragging`),t.dataTransfer.effectAllowed=`move`,t.dataTransfer.setData(`text/plain`,m)}),e.addEventListener(`dragover`,t=>{!m||m===e.dataset.cardId||(t.preventDefault(),e.classList.add(`is-drag-target`),t.dataTransfer.dropEffect=`move`)}),e.addEventListener(`dragleave`,()=>{e.classList.remove(`is-drag-target`)}),e.addEventListener(`drop`,t=>{t.preventDefault(),e.classList.remove(`is-drag-target`);let n=e.dataset.cardId;!m||m===n||S.update(e=>{let t=[...e.incentives.cards],r=t.findIndex(e=>e.id===m),i=t.findIndex(e=>e.id===n);if(r===-1||i===-1)return e;let[a]=t.splice(r,1);return t.splice(i,0,a),{...e,incentives:{...e.incentives,cards:t}}})}),e.addEventListener(`dragend`,()=>{m=null,h.querySelectorAll(`.is-dragging, .is-drag-target`).forEach(e=>e.classList.remove(`is-dragging`,`is-drag-target`))})}),o.scrollTop=l,P(),requestAnimationFrame(()=>{if(o.scrollTop=l,n){let e=h.querySelector(`[data-path="${n}"]`);e&&(e.focus({preventScroll:!0}),e.type!==`checkbox`&&e.type!==`range`&&e.value===r&&i!==null&&a!==null&&e.setSelectionRange(i,a))}})}function P(){h.querySelectorAll(`[data-customizer-accordion]`).forEach(e=>{let t=e.querySelector(`.customizer-accordion__summary`),n=e.querySelector(`.customizer-accordion__content`);!t||!n||(e.classList.toggle(`is-open`,e.open),F(e,e.open),n.style.height=e.open?`auto`:`0px`,t.addEventListener(`click`,t=>{if(t.target.closest(`.customizer-switch`)||t.target.closest(`[data-drag-handle]`)||t.target.closest(`[data-drag-estimated-row]`)||t.target.closest(`[data-drag-incentive-card]`)){t.preventDefault();return}if(t.preventDefault(),e.dataset.animating===`true`)return;let n=!e.open,r=e.dataset.customizerAccordion,i=e.dataset.uiKey,a=r===`panel`?b.panels:b.groups;n?a.add(i):a.delete(i),I(e,n)}))})}function F(e,t){e.querySelectorAll(`.customizer-accordion__chevron`).forEach(e=>{e.style.transform=t?`rotate(180deg)`:`rotate(0deg)`})}function I(e,t){let n=e.querySelector(`.customizer-accordion__content`);if(!n)return;let r=()=>{e.dataset.animating=`false`,e.classList.remove(`is-animating`),t?(e.open=!0,e.classList.add(`is-open`),F(e,!0),n.style.height=`auto`):(e.open=!1,e.classList.remove(`is-open`),F(e,!1),n.style.height=`0px`)};if(e.dataset.animating=`true`,e.classList.add(`is-animating`),n.getAnimations?.().forEach(e=>e.cancel()),t)e.open=!0,e.classList.add(`is-open`),F(e,!0),n.style.height=`0px`,requestAnimationFrame(()=>{let e=n.scrollHeight;n.style.height=`${e}px`});else{e.classList.remove(`is-open`),F(e,!1);let t=n.scrollHeight;n.style.height=`${t}px`,requestAnimationFrame(()=>{n.style.height=`0px`})}let i=e=>{e.target!==n||e.propertyName!==`height`||(n.removeEventListener(`transitionend`,i),r())};n.addEventListener(`transitionend`,i)}function L(e){let t=document.querySelector(`.l1-content`);!t||!Array.isArray(e.sectionOrder)||(t.querySelectorAll(`[data-section-key]`).forEach(e=>{e.hidden=!1}),e.sectionOrder.forEach(e=>{let n=t.querySelector(`[data-section-key="${e}"]`);n&&t.append(n)}))}function R(e){let t=document.querySelector(`.bonus-card__title`),n=document.querySelector(`.bonus-card__amount`),r=document.querySelector(`.bonus-card__rows`);!t||!n||!r||(t.textContent=e.bonusBreakdown.title,n.textContent=l(e.bonusBreakdown.amount),r.classList.toggle(`bonus-card__rows--dual`,e.bonusBreakdown.rows.filter(e=>e.visible).length>1),r.innerHTML=e.bonusBreakdown.rows.filter(e=>e.visible).map(e=>`
        <div class="bonus-row">
          <div class="bonus-row__left">
            <span class="bonus-row__label">${e.label}</span>
            <span class="bonus-badge">${e.badge}</span>
          </div>
          <span class="bonus-row__value">${e.value}</span>
        </div>
      `).join(``))}S.subscribe(e=>{N(e),R(e),L(e)}),N(S.getState()),R(S.getState()),L(S.getState()),E(),y?.addEventListener(`click`,()=>{v&&T(!1)}),window.addEventListener(`resize`,w);