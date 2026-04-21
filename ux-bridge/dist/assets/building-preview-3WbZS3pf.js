var e=[{id:`base`,label:`Base`,shortLabel:`4%`,amount:`$395`,requirement:`1,000 / 2,000 GSV`,accent:`#1f79c4`,progress:50,complete:!1},{id:`tier-2`,label:`500`,shortLabel:`6%`,amount:`$708`,requirement:`3,000 GSV`,accent:`#2f2fd5`,progress:100,complete:!0},{id:`tier-3`,label:`1,000`,shortLabel:`8%`,amount:`$1,125`,requirement:`5,000 GSV`,accent:`#8249f2`,progress:100,complete:!0},{id:`tier-4`,label:`10,000`,shortLabel:`20%`,amount:`$1,389`,requirement:`10,000 GSV`,accent:`#9a8cff`,progress:0,complete:!1},{id:`tier-5`,label:`15,000`,shortLabel:`25%`,amount:`$2,270`,requirement:`15,000 GSV`,accent:`#b89bff`,progress:0,complete:!1}],t=[{id:`brand-rep`,title:`Achieve Brand Rep Status`,copy:`Complete requirements to unlock.`,state:`expanded`,details:{requirements:[{text:`Submit a <a href="#">Letter of Intent</a>`,complete:!0},{text:`Complete BR Qualification <a href="#">View Tracker</a>`,complete:!1}]}},{id:`unlock-l2`,title:`Unlock L2 Bonus`,copy:`Reach 500 L1 SV to unlock a 5% bonus on your L2.`,state:`collapsed`,details:{tracker:{label:`L1 SV`,value:`500 / 500`,progress:100,remaining:`Unlocked`}}},{id:`unlock-building`,title:`Unlock 10% Building Bonus`,copy:`Reach 2,000 GSV to unlock. Must achieve Brand Rep Status.`,state:`expanded`,details:{tracker:{label:`GSV`,value:`1,000 / 2,000`,progress:50,remaining:`1,000 GSV remaining`}}},{id:`double-bonus`,title:`Unlock Double L1 & L2 Bonus`,copy:`Reach 3,000 GSV to unlock an additional 5% on your L1 & L2 bonuses.`,state:`collapsed`,details:{tracker:{label:`GSV`,value:`2,500 / 3,000`,progress:83,remaining:`500 GSV remaining`}}},{id:`brand-rep-complete`,title:`Achieve Brand Rep Status`,copy:`Complete requirements to unlock.`,state:`complete`,subtitle:`Completed`,details:{requirements:[{text:`Submit a <a href="#">Letter of Intent</a>`,complete:!0},{text:`Complete BR Qualification <a href="#">View Tracker</a>`,complete:!0}]}}],n=document.querySelector(`#tier-pills`),r=document.querySelector(`#bonus-tiers-panel`),i=document.querySelector(`#incentive-cards`),a=document.querySelector(`#tiers-toggle`),o=`tier-3`,s=!1,c=t.reduce((e,t)=>(e[t.id]=t.state===`expanded`||t.state===`complete`,e),{});function l(){return`
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="5" y="10" width="14" height="10" rx="2"></rect>
      <path d="M8 10V7.8A4 4 0 0 1 12 4a4 4 0 0 1 4 3.8V10"></path>
    </svg>
  `}function u(){return`
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M5.5 12.5l4 4 9-9"></path>
    </svg>
  `}function d(){return`
    <svg viewBox="0 0 20 20" aria-hidden="true">
      <path d="M4 7.5L10 13.5L16 7.5"></path>
    </svg>
  `}function f(){n.innerHTML=e.slice(0,3).map(e=>`
        <div class="tier-pill ${e.id===o?`is-active`:``}">
          <button type="button" data-tier-id="${e.id}" style="background:${e.accent}">
            ${e.shortLabel}
          </button>
          <p class="tier-pill__label">${e.label}</p>
        </div>
      `).join(``),n.querySelectorAll(`button`).forEach(e=>{e.addEventListener(`click`,()=>{o=e.dataset.tierId,f(),p()})})}function p(){if(r.hidden=!s,!s){r.innerHTML=``;return}r.innerHTML=e.map(e=>{let t=e.complete?100:e.id===o?e.progress:0,n=e.complete?`tier-progress is-complete`:`tier-progress`,r=e.complete?`Completed`:e.id===o?e.requirement:e.requirement.replace(` / `,` / `);return`
        <article class="tier-card">
          <div class="tier-card__top">
            <div class="${n}" style="--fill:${t};--accent:${e.accent}">
              <span>${e.shortLabel}</span>
            </div>
            <div>
              <p class="tier-card__eyebrow">${r}</p>
              <h3 class="tier-card__title">Bonus on GCSV</h3>
            </div>
            <div class="tier-card__amount">${e.amount}</div>
          </div>
        </article>
      `}).join(``)+`<p class="tier-footer">Hide Bonus Tiers</p>`}function m(e){return`
    <div class="requirements">
      <p class="requirements__title">Requirements:</p>
      ${e.map(e=>`
            <div class="requirement ${e.complete?`is-complete`:``}">
              <div class="requirement__status">${u()}</div>
              <p class="requirement__copy">${e.text}</p>
            </div>
          `).join(``)}
    </div>
  `}function h(e){return`
    <div class="tracker">
      <div class="tracker__row">
        <span class="tracker__label">${e.label}</span>
        <span class="tracker__value">${e.value}</span>
      </div>
      <div class="tracker__bar" style="--fill:${e.progress}">
        <span></span>
      </div>
      <p class="tracker__remaining">${e.remaining}</p>
    </div>
  `}function g(){i.innerHTML=t.map(e=>{let t=c[e.id],n=e.state===`complete`,r=n?u():l(),i=e.subtitle?`<p class="card-main__subtitle">${e.subtitle}</p>`:``,a=t?`
          <div class="card-expanded">
            <p class="card-main__copy">${e.copy}</p>
            ${e.details.requirements?m(e.details.requirements):h(e.details.tracker)}
          </div>
        `:``;return`
        <article class="incentive-card ${n?`is-complete`:``}">
          <button class="card-button" type="button" data-card-id="${e.id}" aria-expanded="${t}">
            <div class="card-main">
              <div class="status-icon">${r}</div>
              <div>
                <h3 class="card-main__title">${e.title}</h3>
                ${i}
              </div>
              <span class="chevron">${d()}</span>
            </div>
            ${a}
          </button>
        </article>
      `}).join(``),i.querySelectorAll(`.card-button`).forEach(e=>{let{cardId:n}=e.dataset,r=t.find(e=>e.id===n);!r||r.state===`complete`||e.addEventListener(`click`,()=>{c[n]=!c[n],g()})})}a.addEventListener(`click`,()=>{s=!s,a.setAttribute(`aria-expanded`,String(s)),p()}),f(),p(),g();