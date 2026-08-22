const totalEls = document.querySelectorAll("[data-cart-total]");
const subtotalEls = document.querySelectorAll("[data-cart-subtotal]");
const itemsTotalEls = document.querySelectorAll("[data-cart-items-total]");
const countEls = document.querySelectorAll("[data-cart-count]");
const floatingCart = document.querySelector(".floating-cart");
const cartLines = document.querySelector("[data-cart-lines]");
const overlay = document.querySelector("[data-overlay]");
const searchPanel = document.querySelector("[data-search-panel]");
const accountModal = document.querySelector("[data-account-modal]");
const cartDrawer = document.querySelector("[data-cart-drawer]");
const shopSidebar = document.querySelector(".shop-sidebar");
const shopToolbar = document.querySelector(".shop-toolbar");
const cartItems = JSON.parse(localStorage.getItem("km-cart") || "[]");

document.body.insertAdjacentHTML("beforeend", `<section class="contact-details-modal" aria-label="Contact KM Beauty and Wellness" aria-modal="true" role="dialog" data-contact-modal>
  <button class="contact-details-close" type="button" aria-label="Close contact details" data-close-panels>×</button>
  <span>Get in touch</span>
  <h2>Contact KM Beauty</h2>
  <p class="contact-details-intro">For product and order concerns, reach us directly through the details below.</p>
  <div class="contact-details-list">
    <article><i aria-hidden="true">⌖</i><div><small>Office address</small><strong>Cavite, Philippines</strong></div></article>
    <a href="mailto:hello@kmbeautywellness.com"><i aria-hidden="true">✉</i><div><small>Email address</small><strong>hello@kmbeautywellness.com</strong></div></a>
    <a href="tel:+639000000000"><i aria-hidden="true">☎</i><div><small>Contact number</small><strong>+63 900 000 0000</strong></div></a>
  </div>
</section>`);
const contactModal = document.querySelector("[data-contact-modal]");

const formatPrice = (value) => `₱${value.toLocaleString("en-PH", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
})}`;

const renderCart = () => {
  localStorage.setItem("km-cart", JSON.stringify(cartItems));
  const cartValue = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const cartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  const total = formatPrice(cartValue);
  totalEls.forEach((item) => {
    item.textContent = total;
  });
  subtotalEls.forEach((item) => {
    item.textContent = total;
  });
  itemsTotalEls.forEach((item) => {
    item.textContent = cartCount.toString();
  });
  countEls.forEach((item) => {
    item.textContent = cartCount;
  });
  document.querySelectorAll("[data-price]").forEach((button) => {
    const variantId = button.dataset.variantId || "";
    const productId = button.dataset.productId || "";
    const line = cartItems.find((item) => variantId ? item.variantId === variantId : item.productId === productId);
    const quantity = line?.quantity || 0;
    button.classList.toggle("has-cart-quantity", quantity > 0);
    button.setAttribute("aria-label", quantity ? `${quantity} in cart. Decrease on the left or increase on the right.` : "Add to cart");
    button.innerHTML = quantity
      ? `<span data-cart-action="decrease" aria-hidden="true">−</span><b><strong>${quantity}</strong><small>in cart</small></b><span data-cart-action="increase" aria-hidden="true">+</span>`
      : "Add to cart";
  });
  if (cartLines) {
    cartLines.innerHTML = cartItems.length
      ? cartItems.map((item, index) => `<div class="cart-line">
          <div class="cart-line-image"><img src="${item.image || "/assets/hero-sunblush-clean.png"}" alt=""></div>
          <div class="cart-line-main">
            <b>${item.name}</b>
            <small>${formatPrice(item.price)} each</small>
            <div class="quantity-control" aria-label="Quantity for ${item.name}">
              <button type="button" data-cart-decrease="${index}" aria-label="Decrease quantity">−</button>
              <span>${item.quantity}</span>
              <button type="button" data-cart-increase="${index}" aria-label="Increase quantity">+</button>
            </div>
          </div>
          <div class="cart-line-side">
            <strong>${formatPrice(item.price * item.quantity)}</strong>
            <button type="button" data-cart-remove="${index}">Remove</button>
          </div>
        </div>`).join("")
      : "<p>Your cart is empty.</p>";
  }
};

const updateCartItem = (index, nextQuantity) => {
  if (!cartItems[index]) return;
  if (nextQuantity <= 0) {
    cartItems.splice(index, 1);
  } else {
    cartItems[index].quantity = nextQuantity;
  }
  renderCart();
};

cartLines?.addEventListener("click", (event) => {
  const decrease = event.target.closest("[data-cart-decrease]");
  const increase = event.target.closest("[data-cart-increase]");
  const remove = event.target.closest("[data-cart-remove]");

  if (decrease) {
    const index = Number(decrease.dataset.cartDecrease);
    updateCartItem(index, cartItems[index].quantity - 1);
  }
  if (increase) {
    const index = Number(increase.dataset.cartIncrease);
    updateCartItem(index, cartItems[index].quantity + 1);
  }
  if (remove) {
    updateCartItem(Number(remove.dataset.cartRemove), 0);
  }
});

const closePanels = () => {
  overlay?.classList.remove("show");
  searchPanel?.classList.remove("open");
  accountModal?.classList.remove("open");
  cartDrawer?.classList.remove("open");
  contactModal?.classList.remove("open");
  shopSidebar?.classList.remove("open");
  shopToolbar?.classList.remove("sort-open");
};

const openPanel = (panel) => {
  closePanels();
  overlay?.classList.add("show");
  panel?.classList.add("open");
  panel?.querySelector("input")?.focus();
};

document.addEventListener("click", (event) => {
  const button = event.target.closest("[data-price]");
  if (!button) return;

  const price = Number(button.dataset.price);
  const name = button.dataset.name || button.closest("article")?.querySelector("h3")?.textContent || "KM Beauty item";
  const variantId = button.dataset.variantId || "";
  const productId = button.dataset.productId || "";
  const existingIndex = cartItems.findIndex((item) => variantId ? item.variantId === variantId : item.productId === productId);
  const existing = cartItems[existingIndex];
  const action = event.target.closest("[data-cart-action]")?.dataset.cartAction;
  if (action === "decrease") {
    if (existing) updateCartItem(existingIndex, existing.quantity - 1);
    return;
  }
  if (existing) {
    existing.quantity += 1;
  } else {
    cartItems.push({
      name,
      price,
      quantity: 1,
      productId,
      variantId,
      image: button.dataset.image || ""
    });
  }
  renderCart();
  floatingCart?.classList.remove("cart-pop");
  void floatingCart?.offsetWidth;
  floatingCart?.classList.add("cart-pop");
});

document.addEventListener("change", (event) => {
  if (event.target.closest(".product-modal-variant")) requestAnimationFrame(renderCart);
});
document.addEventListener("km-cart-refresh", renderCart);

floatingCart?.addEventListener("click", () => {
  openPanel(cartDrawer);
});

document.querySelector("[data-open-search]")?.addEventListener("click", () => openPanel(searchPanel));
document.querySelector("[data-open-cart]")?.addEventListener("click", () => openPanel(cartDrawer));
document.querySelectorAll('a[href="/contact"]').forEach((link) => link.addEventListener("click", (event) => {
  event.preventDefault();
  openPanel(contactModal);
}));
document.querySelector("[data-toggle-shop-filters]")?.addEventListener("click", () => {
  closePanels();
  overlay?.classList.add("show");
  shopSidebar?.classList.add("open");
});
document.querySelector("[data-toggle-shop-sort]")?.addEventListener("click", () => {
  closePanels();
  shopToolbar?.classList.add("sort-open");
});
document.querySelector("[data-close-shop-filters]")?.addEventListener("click", closePanels);
document.querySelectorAll("[data-close-panels]").forEach((button) => button.addEventListener("click", closePanels));
overlay?.addEventListener("click", closePanels);
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") closePanels();
});
searchPanel?.querySelector("form")?.addEventListener("submit", (event) => event.preventDefault());
document.querySelector(".contact-form")?.addEventListener("submit", (event) => event.preventDefault());

const shopCards = document.querySelectorAll(".shop-card[data-brand]");
const brandLinks = document.querySelectorAll("[data-brand-filter]");
const categoryLinks = document.querySelectorAll("[data-category-filter]");
const statusInputs = document.querySelectorAll("[data-status-filter]");
const sortSelect = document.querySelector("[data-sort-products]");
const shopCount = document.querySelector("[data-shop-count]");
if (shopCards.length && brandLinks.length) {
  const shopGrid = document.querySelector(".shop-grid");
  const shopState = {
    brand: new URLSearchParams(window.location.search).get("brand") || "all",
    category: "all",
    statuses: new Set(),
    sort: "default"
  };

  const sortCards = () => {
    const cards = [...shopCards];
    const sorters = {
      default: (a, b) => Number(a.dataset.order) - Number(b.dataset.order),
      popular: (a, b) => Number(b.dataset.popularity) - Number(a.dataset.popularity),
      "price-asc": (a, b) => Number(a.dataset.priceValue) - Number(b.dataset.priceValue),
      "price-desc": (a, b) => Number(b.dataset.priceValue) - Number(a.dataset.priceValue)
    };
    cards.sort(sorters[shopState.sort] || sorters.default).forEach((card) => shopGrid?.appendChild(card));
  };

  const badgeLabels = {
    sale: "Sale",
    "best-seller": "Best Seller",
    new: "New Launch"
  };

  shopCards.forEach((card) => {
    const statuses = (card.dataset.status || "").split(" ").filter(Boolean);
    if (!statuses.length) return;
    const badges = document.createElement("div");
    badges.className = "product-badges";
    statuses.forEach((status) => {
      const badge = document.createElement("b");
      badge.className = `product-badge ${status}`;
      badge.textContent = badgeLabels[status] || status;
      badges.appendChild(badge);
    });
    card.prepend(badges);
  });

  const applyShopFilters = () => {
    let visibleCount = 0;

    sortCards();

    shopCards.forEach((card) => {
      const cardStatuses = (card.dataset.status || "").split(" ").filter(Boolean);
      const matchesBrand = shopState.brand === "all" || card.dataset.brand === shopState.brand;
      const matchesCategory = shopState.category === "all" || card.dataset.category === shopState.category;
      const matchesStatus = shopState.statuses.size === 0 || [...shopState.statuses].every((status) => cardStatuses.includes(status));
      const isVisible = matchesBrand && matchesCategory && matchesStatus;
      card.classList.toggle("is-hidden", !isVisible);
      if (isVisible) visibleCount += 1;
    });

    brandLinks.forEach((link) => {
      link.classList.toggle("active", link.dataset.brandFilter === shopState.brand);
    });
    categoryLinks.forEach((link) => {
      link.classList.toggle("active", link.dataset.categoryFilter === shopState.category);
    });

    if (shopCount) {
      const activeBrandLabel = [...brandLinks].find((link) => link.dataset.brandFilter === shopState.brand)?.childNodes[0]?.textContent.trim();
      const activeCategoryLabel = [...categoryLinks].find((link) => link.dataset.categoryFilter === shopState.category)?.childNodes[0]?.textContent.trim();
      const labelParts = [];
      if (shopState.brand !== "all") labelParts.push(activeBrandLabel);
      if (shopState.category !== "all") labelParts.push(activeCategoryLabel);
      shopCount.textContent = labelParts.length === 0
        ? `Showing all ${visibleCount} products`
        : `Showing ${visibleCount} ${labelParts.join(" / ")} products`;
    }
  };

  applyShopFilters();

  brandLinks.forEach((link) => {
    link.addEventListener("click", (event) => {
      event.preventDefault();
      const brand = link.dataset.brandFilter || "all";
      const url = brand === "all" ? "/shop" : `/shop?brand=${brand}`;
      history.pushState({ brand }, "", url);
      shopState.brand = brand;
      applyShopFilters();
    });
  });

  categoryLinks.forEach((link) => {
    link.addEventListener("click", (event) => {
      event.preventDefault();
      shopState.category = link.dataset.categoryFilter || "all";
      applyShopFilters();
    });
  });

  statusInputs.forEach((input) => {
    input.addEventListener("change", () => {
      if (input.checked) {
        shopState.statuses.add(input.dataset.statusFilter);
      } else {
        shopState.statuses.delete(input.dataset.statusFilter);
      }
      applyShopFilters();
    });
  });

  sortSelect?.addEventListener("change", () => {
    shopState.sort = sortSelect.value;
    shopToolbar?.classList.remove("sort-open");
    applyShopFilters();
  });

  categoryLinks.forEach((link) => {
    if (link.dataset.categoryFilter === "all") {
      link.classList.add("active");
    }
  });

  addEventListener("popstate", () => {
    const nextParams = new URLSearchParams(window.location.search);
    shopState.brand = nextParams.get("brand") || "all";
    applyShopFilters();
  });
}

const countdown = document.querySelector("[data-countdown]");
if (countdown) {
  const renderCountdown = () => {
    const end = Date.parse(countdown.dataset.countdownEnd || "");
    const remainingSeconds = Number.isFinite(end) ? Math.max(Math.floor((end - Date.now()) / 1000), 0) : 0;
    const hours = Math.floor(remainingSeconds / 3600).toString().padStart(2, "0");
    const minutes = Math.floor((remainingSeconds % 3600) / 60).toString().padStart(2, "0");
    const seconds = (remainingSeconds % 60).toString().padStart(2, "0");
    countdown.textContent = `${hours}:${minutes}:${seconds}`;
  };
  renderCountdown();
  setInterval(renderCountdown, 1000);
}

const carousel = document.querySelector(".hero-carousel");
if (carousel) {
  const slides = [...carousel.querySelectorAll(".hero-slide")];
  const dots = [...carousel.querySelectorAll(".carousel-dots button")];
  let current = 0;
  let timer;
  const showSlide = (index) => {
    current = (index + slides.length) % slides.length;
    slides.forEach((slide, i) => slide.classList.toggle("active", i === current));
    dots.forEach((dot, i) => dot.classList.toggle("active", i === current));
  };
  const start = () => {
    clearInterval(timer);
    timer = setInterval(() => showSlide(current + 1), 6500);
  };
  dots.forEach((dot, i) => dot.addEventListener("click", () => {
    showSlide(i);
    start();
  }));
  start();
}

const header = document.querySelector(".home-header");
if (header) {
  const setHeader = () => header.classList.toggle("scrolled", scrollY > 35);
  addEventListener("scroll", setHeader, { passive: true });
  setHeader();
}

document.querySelector(".menu")?.addEventListener("click", () => {
  document.querySelector(".header")?.classList.toggle("nav-open");
});

renderCart();
