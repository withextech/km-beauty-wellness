const state = {
  brand: "all",
  concern: "all",
  search: "",
  sort: "featured",
  cart: JSON.parse(localStorage.getItem("km-shop-cart") || "[]"),
  discount: 0
};

const money = value => `₱${value.toLocaleString("en-PH")}`;
const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];

const grid = $("[data-product-grid]");
const cartDrawer = $("[data-cart-drawer]");
const cartStep = $("[data-cart-step]");
const checkoutStep = $("[data-checkout-step]");
const shade = $("[data-shade]");
const modal = $("[data-modal]");
const modalContent = $("[data-modal-content]");
const authModal = $("[data-auth-modal]");
const livePanel = $(".live-panel");
const liveSidebar = $("[data-sidebar-live]");
const toast = $("[data-toast]");
let isLiveInViewport = true;

function saveCart() {
  localStorage.setItem("km-shop-cart", JSON.stringify(state.cart));
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 2200);
}

function getFilteredProducts() {
  const query = state.search.trim().toLowerCase();
  let products = PRODUCTS.filter(product => {
    const matchesBrand = state.brand === "all" || product.brand === state.brand;
    const matchesConcern = state.concern === "all" || product.concern === state.concern;
    const matchesSearch = !query || [product.name, product.brand, product.summary, product.badge].join(" ").toLowerCase().includes(query);
    return matchesBrand && matchesConcern && matchesSearch;
  });

  products = [...products].sort((a, b) => {
    if (state.sort === "price-low") return a.price - b.price;
    if (state.sort === "price-high") return b.price - a.price;
    if (state.sort === "name") return a.name.localeCompare(b.name);
    return PRODUCTS.indexOf(a) - PRODUCTS.indexOf(b);
  });

  return products;
}

function renderProducts() {
  const products = getFilteredProducts();
  $("[data-result-count]").textContent = products.length;
  renderLivePanel();

  if (!products.length) {
    grid.innerHTML = `<div class="empty-state"><h2>No products found.</h2><p>Try another brand, concern, or search term.</p></div>`;
    return;
  }

  grid.innerHTML = products.map(product => `
    <article class="product-card">
      <button class="image-button" data-view="${product.id}" aria-label="View ${product.name}">
        <span>${product.badge}</span>
        <img src="${product.image}" alt="${product.name}" loading="lazy">
      </button>
      <div class="product-info">
        <small>${product.brand}</small>
        <h2>${product.name}</h2>
        <p>${product.summary}</p>
        <div class="product-meta">
          <b>${money(product.price)}</b>
          <button data-add="${product.id}">Add</button>
        </div>
      </div>
    </article>
  `).join("");
}

function renderLivePanel() {
  const isDefaultBrowse = state.brand === "all" && state.concern === "all" && !state.search.trim() && state.sort === "featured";
  livePanel.hidden = !isDefaultBrowse;
  const showLiveMini = !isDefaultBrowse || !isLiveInViewport;
  liveSidebar.hidden = !showLiveMini;
}

function monitorLiveViewport() {
  if (!window.IntersectionObserver || !livePanel) return;
  const observer = new IntersectionObserver((entries) => {
    const [entry] = entries;
    isLiveInViewport = entry?.isIntersecting || false;
    renderLivePanel();
  }, { threshold: 0.15 });
  observer.observe(livePanel);
}

function cartCount() {
  return state.cart.reduce((sum, item) => sum + item.qty, 0);
}

function cartSubtotal() {
  return state.cart.reduce((sum, item) => {
    const product = PRODUCTS.find(entry => entry.id === item.id);
    return sum + (product ? product.price * item.qty : 0);
  }, 0);
}

function renderCart() {
  const items = $("[data-cart-items]");
  $("[data-cart-count]").textContent = cartCount();

  if (!state.cart.length) {
    items.innerHTML = `<div class="cart-empty"><h3>Your bag is empty.</h3><p>Add Her Skin favorites to start an order.</p></div>`;
  } else {
    items.innerHTML = state.cart.map(item => {
      const product = PRODUCTS.find(entry => entry.id === item.id);
      return `
        <article class="cart-line">
          <img src="${product.image}" alt="${product.name}">
          <div>
            <h3>${product.name}</h3>
            <p>${money(product.price)}</p>
            <div class="qty">
              <button data-qty="${product.id}" data-step="-1">−</button>
              <span>${item.qty}</span>
              <button data-qty="${product.id}" data-step="1">+</button>
            </div>
          </div>
          <button class="remove" data-remove="${product.id}" aria-label="Remove ${product.name}">×</button>
        </article>
      `;
    }).join("");
  }

  const subtotal = cartSubtotal();
  const shipping = subtotal > 0 ? (subtotal >= 1000 ? 0 : 95) : 0;
  const discount = Math.round(subtotal * state.discount);
  $("[data-cart-subtotal]").textContent = money(subtotal);
  $("[data-subtotal]").textContent = money(subtotal);
  $("[data-shipping]").textContent = shipping ? money(shipping) : "Free";
  $("[data-discount]").textContent = discount ? `-${money(discount)}` : money(0);
  $("[data-total]").textContent = money(Math.max(0, subtotal + shipping - discount));
}

function addToCart(id) {
  const line = state.cart.find(item => item.id === id);
  if (line) line.qty += 1;
  else state.cart.push({ id, qty: 1 });
  saveCart();
  renderCart();
  showToast("Added to bag");
}

function updateQuantity(id, step) {
  const line = state.cart.find(item => item.id === id);
  if (!line) return;
  line.qty += Number(step);
  state.cart = state.cart.filter(item => item.qty > 0);
  saveCart();
  renderCart();
}

function openCart() {
  showCartStep();
  cartDrawer.classList.add("open");
  cartDrawer.setAttribute("aria-hidden", "false");
  shade.classList.add("show");
}

function closeCart() {
  cartDrawer.classList.remove("open");
  cartDrawer.setAttribute("aria-hidden", "true");
  showCartStep();
  shade.classList.remove("show");
}

function showCartStep() {
  cartStep.hidden = false;
  checkoutStep.hidden = true;
  $("[data-drawer-title]").textContent = "Your cart";
}

function showCheckoutStep() {
  if (!state.cart.length) {
    showToast("Add products before checkout");
    return;
  }
  cartStep.hidden = true;
  checkoutStep.hidden = false;
  $("[data-drawer-title]").textContent = "Checkout";
}

function openProduct(id) {
  const product = PRODUCTS.find(entry => entry.id === id);
  modalContent.innerHTML = `
    <div class="modal-grid">
      <div class="modal-art">
        <img src="${product.image}" alt="${product.name}">
      </div>
      <div class="modal-copy">
        <span>${product.brand} / ${product.badge}</span>
        <h2>${product.name}</h2>
        <b>${money(product.price)}</b>
        <p>${product.summary}</p>
        <ul>${product.details.map(detail => `<li>${detail}</li>`).join("")}</ul>
        <div class="modal-actions">
          <button class="primary-action" data-add="${product.id}">Add to bag</button>
          <a href="${product.sourceUrl}" target="_blank" rel="noopener">Original product page</a>
        </div>
      </div>
    </div>
  `;
  modal.classList.add("open");
  modal.setAttribute("aria-hidden", "false");
  shade.classList.add("show");
}

function closeModal() {
  modal.classList.remove("open");
  modal.setAttribute("aria-hidden", "true");
  if (!cartDrawer.classList.contains("open") && !authModal.classList.contains("open")) shade.classList.remove("show");
}

function openAuth(mode) {
  const isRegister = mode === "register";
  $("[data-auth-title]").textContent = isRegister ? "Create account" : "Sign in";
  $("[data-auth-kicker]").textContent = isRegister ? "Join the glow list" : "Welcome back";
  $("[data-auth-submit]").textContent = isRegister ? "Register" : "Sign in";
  $("[data-name-field]").hidden = !isRegister;
  authModal.classList.add("open");
  authModal.setAttribute("aria-hidden", "false");
  shade.classList.add("show");
}

function closeAuth() {
  authModal.classList.remove("open");
  authModal.setAttribute("aria-hidden", "true");
  if (!cartDrawer.classList.contains("open") && !modal.classList.contains("open")) shade.classList.remove("show");
}

document.addEventListener("click", event => {
  const add = event.target.closest("[data-add]");
  if (add) addToCart(add.dataset.add);

  const view = event.target.closest("[data-view]");
  if (view) openProduct(view.dataset.view);

  const qty = event.target.closest("[data-qty]");
  if (qty) updateQuantity(qty.dataset.qty, qty.dataset.step);

  const remove = event.target.closest("[data-remove]");
  if (remove) {
    state.cart = state.cart.filter(item => item.id !== remove.dataset.remove);
    saveCart();
    renderCart();
  }
});

$("[data-cart-open]").addEventListener("click", openCart);
$("[data-cart-close]").addEventListener("click", closeCart);
$("[data-proceed-checkout]").addEventListener("click", showCheckoutStep);
$("[data-back-cart]").addEventListener("click", showCartStep);
$("[data-modal-close]").addEventListener("click", closeModal);
$("[data-auth-close]").addEventListener("click", closeAuth);
shade.addEventListener("click", () => {
  closeCart();
  closeModal();
  closeAuth();
});

$$("[data-auth]").forEach(button => {
  button.addEventListener("click", () => openAuth(button.dataset.auth));
});

$$("[data-brand]").forEach(button => {
  button.addEventListener("click", () => {
    state.brand = button.dataset.brand;
    $$("[data-brand]").forEach(item => item.classList.toggle("active", item === button));
    renderProducts();
  });
});

$$("[data-brand-shortcut]").forEach(button => {
  button.addEventListener("click", () => {
    const tab = $(`[data-brand="${button.dataset.brandShortcut}"]`);
    tab.click();
    $("#products").scrollIntoView({ behavior: "smooth", block: "start" });
  });
});

$("[data-search]").addEventListener("input", event => {
  state.search = event.target.value;
  renderProducts();
});

$("[data-concern]").addEventListener("change", event => {
  state.concern = event.target.value;
  renderProducts();
});

$("[data-sort]").addEventListener("change", event => {
  state.sort = event.target.value;
  renderProducts();
});

$("[data-clear-filters]").addEventListener("click", () => {
  state.brand = "all";
  state.concern = "all";
  state.search = "";
  state.sort = "featured";
  $("[data-search]").value = "";
  $("[data-concern]").value = "all";
  $("[data-sort]").value = "featured";
  $$("[data-brand]").forEach(button => button.classList.toggle("active", button.dataset.brand === "all"));
  renderProducts();
});

$("[data-scroll-products]").addEventListener("click", () => {
  $("#products").scrollIntoView({ behavior: "smooth", block: "start" });
});

$("[data-apply-promo]").addEventListener("click", () => {
  const code = $("[data-promo]").value.trim().toUpperCase();
  state.discount = code === "KMLOVE" ? 0.1 : 0;
  renderCart();
  showToast(state.discount ? "Promo applied" : "Promo not found");
});

$("[data-checkout-form]").addEventListener("submit", event => {
  event.preventDefault();
  if (!state.cart.length) {
    showToast("Add products before checkout");
    return;
  }
  showToast("Order preview submitted");
  state.cart = [];
  state.discount = 0;
  saveCart();
  renderCart();
  event.target.reset();
  closeCart();
});

$("[data-auth-form]").addEventListener("submit", event => {
  event.preventDefault();
  showToast(`${$("[data-auth-title]").textContent} preview submitted`);
  event.target.reset();
  closeAuth();
});

renderProducts();
renderCart();
monitorLiveViewport();
