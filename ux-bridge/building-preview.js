const tierData = [
  {
    id: "base",
    label: "Base",
    shortLabel: "4%",
    amount: "$395",
    requirement: "1,000 / 2,000 GSV",
    accent: "#1f79c4",
    progress: 50,
    complete: false,
  },
  {
    id: "tier-2",
    label: "500",
    shortLabel: "6%",
    amount: "$708",
    requirement: "3,000 GSV",
    accent: "#2f2fd5",
    progress: 100,
    complete: true,
  },
  {
    id: "tier-3",
    label: "1,000",
    shortLabel: "8%",
    amount: "$1,125",
    requirement: "5,000 GSV",
    accent: "#8249f2",
    progress: 100,
    complete: true,
  },
  {
    id: "tier-4",
    label: "10,000",
    shortLabel: "20%",
    amount: "$1,389",
    requirement: "10,000 GSV",
    accent: "#9a8cff",
    progress: 0,
    complete: false,
  },
  {
    id: "tier-5",
    label: "15,000",
    shortLabel: "25%",
    amount: "$2,270",
    requirement: "15,000 GSV",
    accent: "#b89bff",
    progress: 0,
    complete: false,
  },
];

const incentiveCards = [
  {
    id: "brand-rep",
    title: "Achieve Brand Rep Status",
    copy: "Complete requirements to unlock.",
    state: "expanded",
    details: {
      requirements: [
        {
          text: 'Submit a <a href="#">Letter of Intent</a>',
          complete: true,
        },
        {
          text: 'Complete BR Qualification <a href="#">View Tracker</a>',
          complete: false,
        },
      ],
    },
  },
  {
    id: "unlock-l2",
    title: "Unlock L2 Bonus",
    copy: "Reach 500 L1 SV to unlock a 5% bonus on your L2.",
    state: "collapsed",
    details: {
      tracker: {
        label: "L1 SV",
        value: "500 / 500",
        progress: 100,
        remaining: "Unlocked",
      },
    },
  },
  {
    id: "unlock-building",
    title: "Unlock 10% Building Bonus",
    copy: "Reach 2,000 GSV to unlock. Must achieve Brand Rep Status.",
    state: "expanded",
    details: {
      tracker: {
        label: "GSV",
        value: "1,000 / 2,000",
        progress: 50,
        remaining: "1,000 GSV remaining",
      },
    },
  },
  {
    id: "double-bonus",
    title: "Unlock Double L1 & L2 Bonus",
    copy: "Reach 3,000 GSV to unlock an additional 5% on your L1 & L2 bonuses.",
    state: "collapsed",
    details: {
      tracker: {
        label: "GSV",
        value: "2,500 / 3,000",
        progress: 83,
        remaining: "500 GSV remaining",
      },
    },
  },
  {
    id: "brand-rep-complete",
    title: "Achieve Brand Rep Status",
    copy: "Complete requirements to unlock.",
    state: "complete",
    subtitle: "Completed",
    details: {
      requirements: [
        {
          text: 'Submit a <a href="#">Letter of Intent</a>',
          complete: true,
        },
        {
          text: 'Complete BR Qualification <a href="#">View Tracker</a>',
          complete: true,
        },
      ],
    },
  },
];

const tierPills = document.querySelector("#tier-pills");
const bonusTiersPanel = document.querySelector("#bonus-tiers-panel");
const incentiveCardsRoot = document.querySelector("#incentive-cards");
const tiersToggle = document.querySelector("#tiers-toggle");

let activeTierId = "tier-3";
let tiersExpanded = false;
let cardState = incentiveCards.reduce((acc, card) => {
  acc[card.id] = card.state === "expanded" || card.state === "complete";
  return acc;
}, {});

function lockIcon() {
  return `
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="5" y="10" width="14" height="10" rx="2"></rect>
      <path d="M8 10V7.8A4 4 0 0 1 12 4a4 4 0 0 1 4 3.8V10"></path>
    </svg>
  `;
}

function checkIcon() {
  return `
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M5.5 12.5l4 4 9-9"></path>
    </svg>
  `;
}

function chevronIcon() {
  return `
    <svg viewBox="0 0 20 20" aria-hidden="true">
      <path d="M4 7.5L10 13.5L16 7.5"></path>
    </svg>
  `;
}

function renderTierPills() {
  tierPills.innerHTML = tierData
    .slice(0, 3)
    .map((tier) => {
      const activeClass = tier.id === activeTierId ? "is-active" : "";
      return `
        <div class="tier-pill ${activeClass}">
          <button type="button" data-tier-id="${tier.id}" style="background:${tier.accent}">
            ${tier.shortLabel}
          </button>
          <p class="tier-pill__label">${tier.label}</p>
        </div>
      `;
    })
    .join("");

  tierPills.querySelectorAll("button").forEach((button) => {
    button.addEventListener("click", () => {
      activeTierId = button.dataset.tierId;
      renderTierPills();
      renderBonusTiers();
    });
  });
}

function renderBonusTiers() {
  bonusTiersPanel.hidden = !tiersExpanded;
  if (!tiersExpanded) {
    bonusTiersPanel.innerHTML = "";
    return;
  }

  bonusTiersPanel.innerHTML = tierData
    .map((tier) => {
      const fill = tier.complete ? 100 : tier.id === activeTierId ? tier.progress : 0;
      const progressClass = tier.complete ? "tier-progress is-complete" : "tier-progress";
      const helperText = tier.complete
        ? "Completed"
        : tier.id === activeTierId
          ? tier.requirement
          : tier.requirement.replace(" / ", " / ");
      return `
        <article class="tier-card">
          <div class="tier-card__top">
            <div class="${progressClass}" style="--fill:${fill};--accent:${tier.accent}">
              <span>${tier.shortLabel}</span>
            </div>
            <div>
              <p class="tier-card__eyebrow">${helperText}</p>
              <h3 class="tier-card__title">Bonus on GCSV</h3>
            </div>
            <div class="tier-card__amount">${tier.amount}</div>
          </div>
        </article>
      `;
    })
    .join("") +
    '<p class="tier-footer">Hide Bonus Tiers</p>';
}

function renderRequirements(requirements) {
  return `
    <div class="requirements">
      <p class="requirements__title">Requirements:</p>
      ${requirements
        .map(
          (item) => `
            <div class="requirement ${item.complete ? "is-complete" : ""}">
              <div class="requirement__status">${checkIcon()}</div>
              <p class="requirement__copy">${item.text}</p>
            </div>
          `
        )
        .join("")}
    </div>
  `;
}

function renderTracker(tracker) {
  return `
    <div class="tracker">
      <div class="tracker__row">
        <span class="tracker__label">${tracker.label}</span>
        <span class="tracker__value">${tracker.value}</span>
      </div>
      <div class="tracker__bar" style="--fill:${tracker.progress}">
        <span></span>
      </div>
      <p class="tracker__remaining">${tracker.remaining}</p>
    </div>
  `;
}

function renderCards() {
  incentiveCardsRoot.innerHTML = incentiveCards
    .map((card) => {
      const expanded = cardState[card.id];
      const complete = card.state === "complete";
      const icon = complete ? checkIcon() : lockIcon();
      const subtitle = card.subtitle ? `<p class="card-main__subtitle">${card.subtitle}</p>` : "";
      const expandedContent = expanded
        ? `
          <div class="card-expanded">
            <p class="card-main__copy">${card.copy}</p>
            ${
              card.details.requirements
                ? renderRequirements(card.details.requirements)
                : renderTracker(card.details.tracker)
            }
          </div>
        `
        : "";

      return `
        <article class="incentive-card ${complete ? "is-complete" : ""}">
          <button class="card-button" type="button" data-card-id="${card.id}" aria-expanded="${expanded}">
            <div class="card-main">
              <div class="status-icon">${icon}</div>
              <div>
                <h3 class="card-main__title">${card.title}</h3>
                ${subtitle}
              </div>
              <span class="chevron">${chevronIcon()}</span>
            </div>
            ${expandedContent}
          </button>
        </article>
      `;
    })
    .join("");

  incentiveCardsRoot.querySelectorAll(".card-button").forEach((button) => {
    const { cardId } = button.dataset;
    const card = incentiveCards.find((item) => item.id === cardId);
    if (!card || card.state === "complete") {
      return;
    }

    button.addEventListener("click", () => {
      cardState[cardId] = !cardState[cardId];
      renderCards();
    });
  });
}

tiersToggle.addEventListener("click", () => {
  tiersExpanded = !tiersExpanded;
  tiersToggle.setAttribute("aria-expanded", String(tiersExpanded));
  renderBonusTiers();
});

renderTierPills();
renderBonusTiers();
renderCards();
