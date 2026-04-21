const estimatedEarningsCards = document.querySelectorAll(".estimated-earnings");
const customizerStore = window.brandAffiliateCustomizer;
const earningsParams = new URLSearchParams(window.location.search);
const requestedState = earningsParams.get("earnings");

if (requestedState === "collapsed") {
  document.body.classList.add("earnings-collapsed");
}

if (requestedState === "expanded") {
  document.body.classList.add("earnings-expanded");
}

function applyRequestedState(card) {
  if (requestedState === "collapsed") {
    card.classList.remove("is-open");
  }

  if (requestedState === "expanded") {
    card.classList.add("is-open");
  }
}

function syncEstimatedEarningsAssets(card) {
  const moneyIcon = card.querySelector(".estimated-earnings__money-icon");
  const isOpen = card.classList.contains("is-open");
  card.setAttribute("aria-expanded", isOpen ? "true" : "false");

  if (moneyIcon) {
    moneyIcon.src = isOpen ? card.dataset.moneyExpanded : card.dataset.moneyCollapsed;
  }
}

function formatCurrencyOutput(value) {
  const normalizedValue = String(value ?? "").replaceAll("$", "").trim();
  return normalizedValue ? `$${normalizedValue}` : "$0.00";
}

function renderEstimatedEarningsContent(card, state) {
  if (!state) {
    return;
  }

  const amount = card.querySelector(".estimated-earnings__amount");
  const expandLabel = card.querySelector(".estimated-earnings__expand-label");
  const breakdown = card.querySelector(".estimated-earnings__breakdown");

  if (amount) {
    amount.textContent = formatCurrencyOutput(state.amount);
  }

  if (expandLabel) {
    expandLabel.textContent = state.label;
  }

  if (breakdown) {
    breakdown.innerHTML = state.rows
      .filter((row) => row.visible)
      .map((row) => {
        if (row.sublabel?.trim()) {
          return `
            <div class="estimated-earnings__row estimated-earnings__row--stacked">
              <div>
                <span>${row.label}</span>
                <small>${row.sublabel}</small>
              </div>
              <strong>${formatCurrencyOutput(row.value)}</strong>
            </div>
          `;
        }

        return `
          <div class="estimated-earnings__row">
            <span>${row.label}</span>
            <strong>${formatCurrencyOutput(row.value)}</strong>
          </div>
        `;
      })
      .join("");
  }
}

function setExpandedState(card, expand, immediate = false) {
  const body = card.querySelector(".estimated-earnings__body");

  const finish = () => {
    card.classList.remove("is-animating");
    body.style.height = expand ? "auto" : "0px";
    card.dataset.animating = "false";
    syncEstimatedEarningsAssets(card);
  };

  if (immediate) {
    card.classList.toggle("is-open", expand);
    body.style.height = expand ? "auto" : "0px";
    syncEstimatedEarningsAssets(card);
    finish();
    return;
  }

  body.getAnimations?.().forEach((animation) => animation.cancel());
  card.dataset.animating = "true";
  card.classList.add("is-animating");
  const currentHeight = body.getBoundingClientRect().height;
  body.style.height = `${currentHeight}px`;

  if (expand) {
    card.classList.add("is-open");
    syncEstimatedEarningsAssets(card);
    requestAnimationFrame(() => {
      body.style.height = `${body.scrollHeight}px`;
    });
  } else {
    card.classList.remove("is-open");
    syncEstimatedEarningsAssets(card);
    requestAnimationFrame(() => {
      body.style.height = "0px";
    });
  }

  const handleTransitionEnd = (event) => {
    if (event.target !== body || event.propertyName !== "height") {
      return;
    }

    body.removeEventListener("transitionend", handleTransitionEnd);
    finish();
  };

  body.addEventListener("transitionend", handleTransitionEnd);
}

estimatedEarningsCards.forEach((card) => {
  applyRequestedState(card);
  renderEstimatedEarningsContent(card, customizerStore?.getState().estimatedEarnings);

  syncEstimatedEarningsAssets(card);

  card.addEventListener("click", () => {
    if (card.dataset.animating === "true") {
      return;
    }

    setExpandedState(card, !card.classList.contains("is-open"));
  });

  card.addEventListener("keydown", (event) => {
    if (card.dataset.animating === "true") {
      return;
    }

    if (event.key !== "Enter" && event.key !== " ") {
      return;
    }

    event.preventDefault();
    setExpandedState(card, !card.classList.contains("is-open"));
  });

  requestAnimationFrame(() => {
    applyRequestedState(card);
    setExpandedState(card, card.classList.contains("is-open"), true);
  });
});

customizerStore?.subscribe((state) => {
  estimatedEarningsCards.forEach((card) => {
    renderEstimatedEarningsContent(card, state.estimatedEarnings);
  });
});
