const fallbackIncentiveCardsData = [
  {
    id: "l2-bonus",
    title: "Unlock L2 Bonus",
    description: "Reach 500 L1 SV to unlock a 5% bonus on your L2.",
    tracker: {
      label: "L1 SV",
      current: "250",
      target: "500",
      remaining: "250 L1 SV remaining",
      progress: 50,
    },
  },
  {
    id: "brand-rep",
    title: "Achieve Brand Representative",
    description: "Complete requirements to unlock.",
    requirements: [
      { text: "Submit a Letter of Intent", linkLabel: "Letter of Intent", complete: true },
      { text: "Complete BR Qualification View Tracker", linkLabel: "View Tracker", complete: false },
    ],
  },
  {
    id: "building-10",
    title: "Unlock 10% Building Bonus",
    description: "Reach 2,000 GSV to unlock. (Must achieve Brand Representative)",
    tracker: {
      label: "GSV",
      current: "1,000",
      target: "2,000",
      remaining: "1,000 GSV remaining",
      progress: 50,
    },
  },
  {
    id: "double-l1-l2",
    title: "Unlock Double L1 & L2 Bonus",
    description: "Reach 3,000 GSV to unlock an additional 5% on your L1 & L2 Bonuses.",
    tracker: {
      label: "GSV",
      current: "2,500",
      target: "3,000",
      remaining: "500 GSV remaining",
      progress: 83.3333,
    },
  },
  {
    id: "building-13",
    title: "Unlock 13% Building Bonus",
    description: "Reach 3,000 GSV to unlock.",
    tracker: {
      label: "GSV",
      current: "2,500",
      target: "3,000",
      remaining: "500 GSV remaining",
      progress: 83.3333,
    },
  },
];

const incentiveCustomizerStore = window.brandAffiliateCustomizer;

function incentiveChevronSvg(direction = "down") {
  const rotate = direction === "up" ? ' style="transform: rotate(180deg);"' : "";
  return `
    <span class="up-next-card__chevron"${rotate} aria-hidden="true">
      <svg viewBox="0 0 24 24">
        <path d="M6 9L12 15L18 9"></path>
      </svg>
    </span>
  `;
}

function incentiveLockIcon() {
  return `
    <div class="up-next-card__icon" aria-hidden="true">
      <svg viewBox="0 0 24 24">
        <rect x="5" y="10" width="14" height="10" rx="2"></rect>
        <path d="M8 10V7.8A4 4 0 0 1 12 4a4 4 0 0 1 4 3.8V10"></path>
      </svg>
    </div>
  `;
}

function requirementIcon(complete) {
  if (!complete) {
    return `
      <span class="up-next-requirement__status is-pending" aria-hidden="true">
        <svg viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="9"></circle>
        </svg>
      </span>
    `;
  }

  return `
    <span class="up-next-requirement__status is-complete" aria-hidden="true">
      <svg viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="9"></circle>
        <path d="M8.5 12.5L10.9 14.9L15.8 10"></path>
      </svg>
    </span>
  `;
}

function renderRequirementText(item) {
  if (!item.linkLabel) {
    return item.text;
  }

  const parts = item.text.split(item.linkLabel);
  return `${parts[0]}<a href="#">${item.linkLabel}</a>${parts[1] || ""}`;
}

function parseTrackerNumber(value) {
  const parsed = Number.parseFloat(String(value ?? "").replace(/[^0-9.-]/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

function countTrackerDecimals(value) {
  const normalized = String(value ?? "").replace(/,/g, "");

  if (!normalized.includes(".")) {
    return 0;
  }

  return normalized.split(".")[1].length;
}

function formatTrackerNumber(value, templateValue = "") {
  const decimals = countTrackerDecimals(templateValue);

  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

function getRemainingTrackerText(tracker) {
  const current = parseTrackerNumber(tracker.current);
  const target = parseTrackerNumber(tracker.target);
  const remainder = Math.max(target - current, 0);

  return `${formatTrackerNumber(remainder, tracker.target || tracker.current)} ${tracker.label} remaining`;
}

function renderTracker(tracker) {
  if (!tracker?.visible) {
    return "";
  }

  return `
    <div class="up-next-card__tracker">
      <div class="up-next-card__tracker-row">
        <span class="up-next-card__tracker-label">${tracker.label}</span>
        <span class="up-next-card__tracker-value">
          <strong>${tracker.current}</strong>
          <span>/</span>
          <span>${tracker.target}</span>
        </span>
      </div>
      <div class="up-next-card__tracker-bar" aria-hidden="true">
        <span style="width:${tracker.progress}%"></span>
      </div>
      ${tracker.showRemaining === false ? "" : `<p class="up-next-card__tracker-remaining">${getRemainingTrackerText(tracker)}</p>`}
    </div>
  `;
}

function renderRequirements(requirements) {
  const visibleRequirements = requirements.filter((item) => item.visible !== false);

  return `
    <div class="up-next-card__requirements">
      <p class="up-next-card__requirements-title">Requirements:</p>
      ${visibleRequirements
        .map(
          (item) => `
            <div class="up-next-requirement">
              ${requirementIcon(item.complete)}
              <p class="up-next-requirement__copy">${renderRequirementText(item)}</p>
            </div>
          `,
        )
        .join("")}
    </div>
  `;
}

function renderCardBodyContent(card) {
  const extra = card.requirements
    ? card.requirementsVisible === false
      ? ""
      : renderRequirements(card.requirements)
    : renderTracker(card.tracker);

  return `
    ${card.showDescription === false ? "" : `<p class="up-next-card__description">${card.description}</p>`}
    ${extra}
  `;
}

function renderCard(card, expanded) {
  return `
    <article class="up-next-card ${expanded ? "is-open" : ""}" data-card-id="${card.id}">
      <button class="up-next-card__button" type="button" aria-expanded="${expanded}">
        <div class="up-next-card__header">
          ${incentiveLockIcon()}
          <h3 class="up-next-card__title">${card.title}</h3>
          ${incentiveChevronSvg(expanded ? "up" : "down")}
        </div>
        <div class="up-next-card__body">
          ${renderCardBodyContent(card)}
        </div>
      </button>
    </article>
  `;
}

function setupCarousel(root) {
  let isOpen = incentiveCustomizerStore?.getState().incentives.isOpen ?? false;
  let lastSignature = "";

  const getScrollAnchor = () => {
    const cards = [...root.querySelectorAll(".up-next-card")];

    if (!cards.length) {
      return null;
    }

    const rootRect = root.getBoundingClientRect();
    const anchorCard =
      cards.find((card) => card.getBoundingClientRect().right > rootRect.left + 8) || cards[0];

    if (!anchorCard) {
      return null;
    }

    return {
      cardId: anchorCard.dataset.cardId,
      delta: root.scrollLeft - anchorCard.offsetLeft,
    };
  };

  const restoreScrollAnchor = (anchor) => {
    if (!anchor) {
      return;
    }

    const nextAnchorCard = root.querySelector(`[data-card-id="${anchor.cardId}"]`);

    if (!nextAnchorCard) {
      root.scrollLeft = Math.max(anchor.delta, 0);
      return;
    }

    root.scrollLeft = Math.max(nextAnchorCard.offsetLeft + anchor.delta, 0);
  };

  const animateCardBody = (card, shouldOpen) => {
    const body = card.querySelector(".up-next-card__body");

    if (!body) {
      return Promise.resolve();
    }

    body.getAnimations?.().forEach((animation) => animation.cancel());

    return new Promise((resolve) => {
      const cleanup = () => {
        body.removeEventListener("transitionend", onTransitionEnd);
        card.classList.remove("is-animating");

        if (shouldOpen) {
          card.classList.add("is-open");
          body.style.height = "auto";
        } else {
          card.classList.remove("is-open");
          body.style.height = "0px";
        }

        resolve();
      };

      const onTransitionEnd = (event) => {
        if (event.target === body && event.propertyName === "height") {
          cleanup();
        }
      };

      const currentHeight = body.getBoundingClientRect().height;
      body.style.height = `${currentHeight}px`;
      card.classList.add("is-animating");

      requestAnimationFrame(() => {
        if (shouldOpen) {
          card.classList.add("is-open");
          const targetHeight = body.scrollHeight;
          body.style.height = `${targetHeight}px`;
        } else {
          card.classList.remove("is-open");
          body.style.height = "0px";
        }

        body.addEventListener("transitionend", onTransitionEnd);
      });
    });
  };

  const collapseCard = (card) => {
    if (!card || !card.classList.contains("is-open")) {
      return Promise.resolve();
    }

    return animateCardBody(card, false);
  };

  const expandCard = (card) => {
    if (!card) {
      return Promise.resolve();
    }

    return animateCardBody(card, true);
  };

  const syncCardElement = (cardElement, cardData, expanded) => {
    if (!cardElement) {
      return;
    }

    cardElement.dataset.cardId = cardData.id;
    cardElement.classList.toggle("is-open", expanded);
    cardElement.classList.remove("is-animating");

    const button = cardElement.querySelector(".up-next-card__button");
    const title = cardElement.querySelector(".up-next-card__title");
    const chevron = cardElement.querySelector(".up-next-card__chevron");
    const body = cardElement.querySelector(".up-next-card__body");

    if (button) {
      button.setAttribute("aria-expanded", String(expanded));
    }

    if (title) {
      title.textContent = cardData.title;
    }

    if (chevron) {
      chevron.style.transform = expanded ? "rotate(180deg)" : "";
    }

    if (body) {
      body.innerHTML = renderCardBodyContent(cardData);
      body.style.height = expanded ? "auto" : "0px";
    }
  };

  const syncExistingCards = (cardsData) => {
    const existingCards = [...root.querySelectorAll(".up-next-card")];

    if (!existingCards.length || existingCards.length !== cardsData.length) {
      return false;
    }

    const existingIds = existingCards.map((card) => card.dataset.cardId);
    const nextIds = cardsData.map((card) => card.id);

    if (existingIds.some((id, index) => id !== nextIds[index])) {
      return false;
    }

    existingCards.forEach((cardElement, index) => {
      syncCardElement(cardElement, cardsData[index], isOpen);
    });

    return true;
  };

  const getExistingCardIds = () => [...root.querySelectorAll(".up-next-card")].map((card) => card.dataset.cardId);

  const render = () => {
    const cardsData =
      incentiveCustomizerStore?.getState().incentives.cards.filter((card) => card.visible !== false) ??
      fallbackIncentiveCardsData;
    const nextSignature = JSON.stringify({ isOpen, cardsData });

    if (nextSignature === lastSignature) {
      return;
    }

    lastSignature = nextSignature;

    if (syncExistingCards(cardsData)) {
      return;
    }

    const existingIds = getExistingCardIds();
    const nextIds = cardsData.map((card) => card.id);
    const orderChanged =
      existingIds.length === nextIds.length && existingIds.some((id, index) => id !== nextIds[index]);
    const scrollAnchor = orderChanged ? null : getScrollAnchor();
    root.style.scrollSnapType = "none";
    root.innerHTML = cardsData.map((card) => renderCard(card, isOpen)).join("");

    root.querySelectorAll(".up-next-card__body").forEach((body) => {
      body.style.height = isOpen ? "auto" : "0px";
    });

    root.querySelectorAll(".up-next-card__button").forEach((button) => {
      button.addEventListener("click", () => {
        if (root.dataset.animating === "true") {
          return;
        }

        root.dataset.animating = "true";
        const cards = [...root.querySelectorAll(".up-next-card")];
        const nextOpenState = !isOpen;

        const finish = () => {
          isOpen = nextOpenState;
          root.dataset.animating = "false";
        };

        Promise.all(cards.map((card) => (nextOpenState ? expandCard(card) : collapseCard(card)))).then(finish);
      });
    });

    if (orderChanged) {
      root.scrollLeft = 0;
      requestAnimationFrame(() => {
        root.scrollLeft = 0;
        root.style.scrollSnapType = "";
      });
      return;
    }

    restoreScrollAnchor(scrollAnchor);
    requestAnimationFrame(() => {
      restoreScrollAnchor(scrollAnchor);
      requestAnimationFrame(() => {
        restoreScrollAnchor(scrollAnchor);
        root.style.scrollSnapType = "";
      });
    });
  };

  render();

  incentiveCustomizerStore?.subscribe((state) => {
    const nextSignature = JSON.stringify({ isOpen, cardsData: state.incentives.cards });

    if (nextSignature === lastSignature) {
      return;
    }

    render();
  });
}

document.querySelectorAll("[data-up-next-carousel]").forEach((root) => {
  setupCarousel(root);
});
