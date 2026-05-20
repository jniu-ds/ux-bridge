var e=[{id:`l2-bonus`,title:`Unlock L2 Bonus`,description:`Reach 500 L1 SV to unlock a 5% bonus on your L2.`,tracker:{label:`L1 SV`,current:`250`,target:`500`,remaining:`250 L1 SV remaining`,progress:50}},{id:`brand-rep`,title:`Achieve Brand Representative`,description:`Complete requirements to unlock.`,requirements:[{text:`Submit a Letter of Intent`,linkLabel:`Letter of Intent`,complete:!0},{text:`Complete BR Qualification View Tracker`,linkLabel:`View Tracker`,complete:!1}]},{id:`building-10`,title:`Unlock 10% Building Bonus`,description:`Reach 2,000 GSV to unlock. (Must achieve Brand Representative)`,tracker:{label:`GSV`,current:`1,000`,target:`2,000`,remaining:`1,000 GSV remaining`,progress:50}},{id:`double-l1-l2`,title:`Unlock Double L1 & L2 Bonus`,description:`Reach 3,000 GSV to unlock an additional 5% on your L1 & L2 Bonuses.`,tracker:{label:`GSV`,current:`2,500`,target:`3,000`,remaining:`500 GSV remaining`,progress:83.3333}},{id:`building-13`,title:`Unlock 13% Building Bonus`,description:`Reach 3,000 GSV to unlock.`,tracker:{label:`GSV`,current:`2,500`,target:`3,000`,remaining:`500 GSV remaining`,progress:83.3333}}],t=window.brandAffiliateCustomizer;function n(e=`down`){return`
    <span class="up-next-card__chevron"${e===`up`?` style="transform: rotate(180deg);"`:``} aria-hidden="true">
      <svg viewBox="0 0 24 24">
        <path d="M6 9L12 15L18 9"></path>
      </svg>
    </span>
  `}function r(){return`
    <div class="up-next-card__icon" aria-hidden="true">
      <svg viewBox="0 0 24 24">
        <rect x="5" y="10" width="14" height="10" rx="2"></rect>
        <path d="M8 10V7.8A4 4 0 0 1 12 4a4 4 0 0 1 4 3.8V10"></path>
      </svg>
    </div>
  `}function i(e){return e?`
    <span class="up-next-requirement__status is-complete" aria-hidden="true">
      <svg viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="9"></circle>
        <path d="M8.5 12.5L10.9 14.9L15.8 10"></path>
      </svg>
    </span>
  `:`
      <span class="up-next-requirement__status is-pending" aria-hidden="true">
        <svg viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="9"></circle>
        </svg>
      </span>
    `}function a(e){if(!e.linkLabel)return e.text;let t=e.text.split(e.linkLabel);return`${t[0]}<a href="#">${e.linkLabel}</a>${t[1]||``}`}function o(e){let t=Number.parseFloat(String(e??``).replace(/[^0-9.-]/g,``));return Number.isFinite(t)?t:0}function s(e){let t=String(e??``).replace(/,/g,``);return t.includes(`.`)?t.split(`.`)[1].length:0}function c(e,t=``){let n=s(t);return new Intl.NumberFormat(`en-US`,{minimumFractionDigits:n,maximumFractionDigits:n}).format(e)}function l(e){let t=o(e.current),n=o(e.target);return`${c(Math.max(n-t,0),e.target||e.current)} ${e.label} remaining`}function u(e){return e?.visible?`
    <div class="up-next-card__tracker">
      <div class="up-next-card__tracker-row">
        <span class="up-next-card__tracker-label">${e.label}</span>
        <span class="up-next-card__tracker-value">
          <strong>${e.current}</strong>
          <span>/</span>
          <span>${e.target}</span>
        </span>
      </div>
      <div class="up-next-card__tracker-bar" aria-hidden="true">
        <span style="width:${e.progress}%"></span>
      </div>
      ${e.showRemaining===!1?``:`<p class="up-next-card__tracker-remaining">${l(e)}</p>`}
    </div>
  `:``}function d(e){return`
    <div class="up-next-card__requirements">
      <p class="up-next-card__requirements-title">Requirements:</p>
      ${e.filter(e=>e.visible!==!1).map(e=>`
            <div class="up-next-requirement">
              ${i(e.complete)}
              <p class="up-next-requirement__copy">${a(e)}</p>
            </div>
          `).join(``)}
    </div>
  `}function f(e){let t=e.requirements?e.requirementsVisible===!1?``:d(e.requirements):u(e.tracker);return`
    ${e.showDescription===!1?``:`<p class="up-next-card__description">${e.description}</p>`}
    ${t}
  `}function p(e,t){return`
    <article class="up-next-card ${t?`is-open`:``}" data-card-id="${e.id}">
      <button class="up-next-card__button" type="button" aria-expanded="${t}">
        <div class="up-next-card__header">
          ${r()}
          <h3 class="up-next-card__title">${e.title}</h3>
          ${n(t?`up`:`down`)}
        </div>
        <div class="up-next-card__body">
          ${f(e)}
        </div>
      </button>
    </article>
  `}function m(n){let r=t?.getState().incentives.isOpen??!1,i=``,a=()=>{let e=[...n.querySelectorAll(`.up-next-card`)];if(!e.length)return null;let t=n.getBoundingClientRect(),r=e.find(e=>e.getBoundingClientRect().right>t.left+8)||e[0];return r?{cardId:r.dataset.cardId,delta:n.scrollLeft-r.offsetLeft}:null},o=e=>{if(!e)return;let t=n.querySelector(`[data-card-id="${e.cardId}"]`);if(!t){n.scrollLeft=Math.max(e.delta,0);return}n.scrollLeft=Math.max(t.offsetLeft+e.delta,0)},s=(e,t)=>{let n=e.querySelector(`.up-next-card__body`);return n?(n.getAnimations?.().forEach(e=>e.cancel()),new Promise(r=>{let i=()=>{n.removeEventListener(`transitionend`,a),e.classList.remove(`is-animating`),t?(e.classList.add(`is-open`),n.style.height=`auto`):(e.classList.remove(`is-open`),n.style.height=`0px`),r()},a=e=>{e.target===n&&e.propertyName===`height`&&i()},o=n.getBoundingClientRect().height;n.style.height=`${o}px`,e.classList.add(`is-animating`),requestAnimationFrame(()=>{if(t){e.classList.add(`is-open`);let t=n.scrollHeight;n.style.height=`${t}px`}else e.classList.remove(`is-open`),n.style.height=`0px`;n.addEventListener(`transitionend`,a)})})):Promise.resolve()},c=e=>!e||!e.classList.contains(`is-open`)?Promise.resolve():s(e,!1),l=e=>e?s(e,!0):Promise.resolve(),u=(e,t,n)=>{if(!e)return;e.dataset.cardId=t.id,e.classList.toggle(`is-open`,n),e.classList.remove(`is-animating`);let r=e.querySelector(`.up-next-card__button`),i=e.querySelector(`.up-next-card__title`),a=e.querySelector(`.up-next-card__chevron`),o=e.querySelector(`.up-next-card__body`);r&&r.setAttribute(`aria-expanded`,String(n)),i&&(i.textContent=t.title),a&&(a.style.transform=n?`rotate(180deg)`:``),o&&(o.innerHTML=f(t),o.style.height=n?`auto`:`0px`)},d=e=>{let t=[...n.querySelectorAll(`.up-next-card`)];if(!t.length||t.length!==e.length)return!1;let i=t.map(e=>e.dataset.cardId),a=e.map(e=>e.id);return i.some((e,t)=>e!==a[t])?!1:(t.forEach((t,n)=>{u(t,e[n],r)}),!0)},m=()=>[...n.querySelectorAll(`.up-next-card`)].map(e=>e.dataset.cardId),h=()=>{let s=t?.getState().incentives.cards.filter(e=>e.visible!==!1)??e,u=JSON.stringify({isOpen:r,cardsData:s});if(u===i||(i=u,d(s)))return;let f=m(),h=s.map(e=>e.id),g=f.length===h.length&&f.some((e,t)=>e!==h[t]),_=g?null:a();if(n.style.scrollSnapType=`none`,n.innerHTML=s.map(e=>p(e,r)).join(``),n.querySelectorAll(`.up-next-card__body`).forEach(e=>{e.style.height=r?`auto`:`0px`}),n.querySelectorAll(`.up-next-card__button`).forEach(e=>{e.addEventListener(`click`,()=>{if(n.dataset.animating===`true`)return;n.dataset.animating=`true`;let e=[...n.querySelectorAll(`.up-next-card`)],t=!r;Promise.all(e.map(e=>t?l(e):c(e))).then(()=>{r=t,n.dataset.animating=`false`})})}),g){n.scrollLeft=0,requestAnimationFrame(()=>{n.scrollLeft=0,n.style.scrollSnapType=``});return}o(_),requestAnimationFrame(()=>{o(_),requestAnimationFrame(()=>{o(_),n.style.scrollSnapType=``})})};h(),t?.subscribe(e=>{JSON.stringify({isOpen:r,cardsData:e.incentives.cards})!==i&&h()})}document.querySelectorAll(`[data-up-next-carousel]`).forEach(e=>{m(e)});