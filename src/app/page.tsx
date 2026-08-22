import Script from "next/script";
import { escapeHtml, getHomepageCms, getStoreProducts, productButton, type StoreProduct } from "./lib/store-data";
import { ProductDetailsModal } from "./shop/ProductDetailsModal";

function renderFlashProducts(products: StoreProduct[]) {
  if (!products.length) return `<p class="storefront-empty">No flash-sale products selected.</p>`;
  return products.map((product) => {
    const discount = product.originalPrice > product.price ? Math.round((1 - product.price / product.originalPrice) * 100) : 0;
    const soldOut = product.inventoryQuantity < 1;
    return `<article class="flash-product${soldOut ? " is-sold-out" : ""}" role="button" tabindex="0" aria-label="View details for ${escapeHtml(product.title)}" data-product-id="${escapeHtml(product.id)}">${soldOut ? `<b class="stock-badge">Out of stock</b>` : discount ? `<b>${discount}% off</b>` : ""}<img src="${escapeHtml(product.image)}" alt="${escapeHtml(product.title)}"><div><span>${escapeHtml(product.brand)}</span><h3>${escapeHtml(product.title)}</h3><p>${product.originalPrice > product.price ? `<s>₱${product.originalPrice.toLocaleString("en-PH")}</s> ` : ""}${product.priceLabel}</p><button type="button" ${productButton(product)} ${soldOut ? "disabled" : ""}>${soldOut ? "Out of stock" : "Add to cart"}</button></div></article>`;
  }).join("");
}

function renderDiscoverProducts(products: StoreProduct[]) {
  if (!products.length) return `<p class="storefront-empty">No Discover products selected.</p>`;
  return products.map((product) => { const discount = product.originalPrice > product.price ? Math.round((1 - product.price / product.originalPrice) * 100) : 0; const soldOut = product.inventoryQuantity < 1; return `<article class="product-card${soldOut ? " is-sold-out" : ""}" role="button" tabindex="0" aria-label="View details for ${escapeHtml(product.title)}" data-product-id="${escapeHtml(product.id)}"><div class="product-art">${soldOut ? `<b class="stock-badge">Out of stock</b>` : ""}<img src="${escapeHtml(product.image)}" alt="${escapeHtml(product.title)}"></div><h3>${escapeHtml(product.title)}</h3><p>${discount ? `<strong>${product.priceLabel}</strong> <s>₱${product.originalPrice.toLocaleString("en-PH")}</s> <em class="product-discount">${discount}% OFF</em>` : product.priceLabel}</p><button type="button" ${productButton(product)} ${soldOut ? "disabled" : ""}>${soldOut ? "Out of stock" : "Add to cart"}</button></article>`; }).join("");
}

function glowhouseMarkup(flashProducts: StoreProduct[], discoverProducts: StoreProduct[], saleEndsAt: string | null, heroImages: string[], discoverImage: string | null) {
  const hero = ["/assets/hero-herskin-clean.jpg", "/assets/hero-founder-clean.jpg", "/assets/hero-sunblush-clean.png", "/assets/hero-neko-product.png"].map((fallback, index) => heroImages[index] || fallback);
  return `
  <header class="header home-header">
    <a href="#home" class="logo" aria-label="KM Beauty and Wellness">
      <img src="/assets/km-logo-cropped.png" alt="KM Kat Melendez">
      <b>BEAUTY & WELLNESS</b>
    </a>
    <nav aria-label="Main navigation">
      <a href="#home">Home</a>
      <a href="/shop">Shop</a>
    </nav>
    <div class="actions">
      <button class="icon-action" type="button" aria-label="Search products" data-open-search>
        <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5"></circle><path d="M15.5 15.5 21 21"></path></svg>
      </button>
      <button class="icon-action" type="button" aria-label="Customer account" data-open-account>
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4.8 20.2c1.4-3.1 3.9-4.7 7.2-4.7s5.8 1.6 7.2 4.7"></path><circle cx="12" cy="8.2" r="4.2"></circle></svg>
      </button>
      <button class="icon-action bag-action" type="button" aria-label="Shopping cart" data-open-cart>
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6.8 8.5h10.4l.8 11H6L6.8 8.5Z"></path><path d="M9 8.5V7a3 3 0 0 1 6 0v1.5"></path></svg>
        <span data-cart-count>0</span>
      </button>
      <button class="menu" type="button" aria-label="Menu">☰</button>
    </div>
  </header>

  <main id="home">
    <section class="hero-carousel" aria-label="Featured campaigns">
      <div class="carousel-bubbles" aria-hidden="true"><i></i><i></i><i></i><i></i></div>
      <article class="hero-slide active">
        <div class="slide-media"><img src="${escapeHtml(hero[0])}" alt="Her Skin products and brand ambassador"></div>
        <div class="slide-copy"><span class="hero-kicker">The home of everyday glow</span><h1>Your glow,<br><em>your way.</em></h1><p>Feel-good beauty and wellness essentials made for your everyday glow-up.</p><div class="button-row"><a class="hero-link filled" href="/shop">Visit Shop</a></div></div>
      </article>
      <article class="hero-slide">
        <div class="slide-media"><img src="${escapeHtml(hero[1])}" alt="Kath Melendez, CEO and founder"></div>
        <div class="slide-copy"><span class="hero-kicker">A note from our founder</span><h1>Beauty with<br><em>heart & purpose.</em></h1><p>Building confidence, trusted brands, and opportunities for a brighter community.</p><div class="button-row"><a class="hero-link filled" href="#about">Discover the brands</a></div></div>
      </article>
      <article class="hero-slide">
        <div class="slide-media"><img src="${escapeHtml(hero[2])}" alt="Her Skin Sun Blush Daily Multi-Defense sunscreen"></div>
        <div class="slide-copy"><span class="hero-kicker">New from Her Skin</span><h1>Sunny days.<br><em>Happy skin.</em></h1><p>Your bright and bubbly daily multi-defense sunscreen.</p><div class="button-row"><a class="hero-link filled" href="#campaign">Discover Sun Blush</a></div></div>
      </article>
      <article class="hero-slide neko-product-slide">
        <div class="slide-media"><img src="${escapeHtml(hero[3])}" alt="Neko beauty supplement product campaign"></div>
        <div class="slide-copy"><span class="hero-kicker">Featured from Neko</span><h1>Soft glow,<br><em>from within.</em></h1><p>Beauty support with a dreamy, feel-good wellness ritual.</p><div class="button-row"><a class="hero-link filled" href="/shop">Shop Neko</a></div></div>
      </article>
      <div class="carousel-footer"><div class="carousel-dots" role="tablist" aria-label="Choose slide"><button class="active" aria-label="Slide 1"></button><button aria-label="Slide 2"></button><button aria-label="Slide 3"></button><button aria-label="Slide 4"></button></div></div>
    </section>

    <section class="flash-sale" aria-label="Flash sale products">
      <div class="flash-head">
        <div>
          <span class="flash-label">Flash Sale</span>
          <h2>Glow deals ending soon.</h2>
        </div>
        <div class="sale-timer" aria-label="Flash sale countdown">
          <span>Ends in</span>
          <strong data-countdown data-countdown-end="${escapeHtml(saleEndsAt || "")}">00:00:00</strong>
        </div>
      </div>
      <div class="flash-grid">${renderFlashProducts(flashProducts)}</div>
    </section>

    <section class="best-products" id="shop">
      <div class="center-heading">
        <h2>Discover our best selling products</h2>
        <p>Fresh picks from Her Skin, Neko, and Sevendays, arranged for quick browsing and direct checkout.</p>
      </div>
      <div class="product-layout">
        <a class="editorial-tile" href="/shop">
          <img src="${escapeHtml(discoverImage || "/assets/sun-blush-ambassador.jpg")}" alt="Her Skin Sun Blush ambassador campaign">
          <span>Discover the power of natural beauty</span>
          <strong>Visit Shop</strong>
        </a>
        <div class="product-grid">${renderDiscoverProducts(discoverProducts)}</div>
      </div>
    </section>

    <section class="campaign-band" id="campaign">
      <div>
        <span>SPF45 Daily Multi-Defense</span>
        <h2>Block the sun. Keep the glow.</h2>
        <p>Lightweight sunscreen for bright days, no sticky feel, and everyday skin confidence.</p>
        <div class="campaign-perks">
          <b>No sticky finish</b>
          <b>Daily protection</b>
          <b>Glow-friendly base</b>
        </div>
        <div class="campaign-action">
          <a class="btn dark" href="/shop">Buy Sunscreen Now</a>
          <strong>₱180.00</strong>
        </div>
      </div>
      <div class="campaign-visual">
        <em>Hot pick</em>
        <img src="/assets/sun-blush-banner.png" alt="Sun Blush campaign banner">
      </div>
    </section>

    <section class="category-strip" id="about">
      <article>
        <img src="/assets/logo-herskin.png" alt="Her Skin">
        <h3>Face care</h3>
        <p>Daily cleanse, prep, hydrate, and protect routines.</p>
        <a href="/shop?brand=herskin">Shop Her Skin</a>
      </article>
      <article>
        <img src="/assets/logo-neko.png" alt="Neko">
        <h3>Wellness</h3>
        <p>Beauty support from within for consistent self-care.</p>
        <a href="/shop?brand=neko">Shop Neko</a>
      </article>
      <article>
        <img src="/assets/logo-sevendays.png" alt="Sevendays">
        <h3>Body care</h3>
        <p>Body glow, exfoliation, and all-week skin basics.</p>
        <a href="/shop?brand=sevendays">Shop Sevendays</a>
      </article>
    </section>

    <section class="journal" id="contact">
      <div class="center-heading">
        <h2>Loved by everyday glow-getters</h2>
      </div>
      <div class="journal-grid">
        <article>
          <span>★★★★★</span>
          <h3>My skin feels fresh without feeling heavy.</h3>
          <p>The water gel and toner combo became my daily routine. It looks clean, smells soft, and feels perfect for humid days.</p>
          <b>Angelica M.</b>
        </article>
        <article>
          <span>★★★★★</span>
          <h3>The sun care products are easy to recommend.</h3>
          <p>No sticky finish, no dull cast, and it layers well under makeup. I added another tube to my cart right away.</p>
          <b>Rica S.</b>
        </article>
        <article>
          <span>★★★★★</span>
          <h3>Checkout feels like browsing a boutique.</h3>
          <p>I like seeing the best sellers, sale prices, and cart updates instantly. Everything feels polished and easy to shop.</p>
          <b>Marielle T.</b>
        </article>
      </div>
    </section>
  </main>

  <footer>
    <div>
      <img src="/assets/km-logo-cropped.png" alt="KM Beauty & Wellness">
    </div>
    <nav aria-label="Footer navigation">
      <a href="#home">Home</a>
      <a href="/shop">Shop</a>
      <a href="/contact">Contact</a>
    </nav>
  </footer>

  <button class="floating-cart" type="button" aria-label="Shopping cart" aria-live="polite">
    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6.8 8.5h10.4l.8 11H6L6.8 8.5Z"></path><path d="M9 8.5V7a3 3 0 0 1 6 0v1.5"></path></svg>
    <b data-cart-count>0</b>
  </button>

  <div class="overlay" data-overlay></div>

  <aside class="cart-drawer" aria-label="Shopping cart" data-cart-drawer>
    <button class="panel-close" type="button" aria-label="Close cart" data-close-panels>×</button>
    <div class="cart-drawer-head"><span>Your Cart</span><button type="button" data-cart-reset>Clear cart</button></div>
    <h2>Shopping Bag</h2>
    <div class="cart-lines" data-cart-lines><p>Your cart is empty.</p></div>
    <div class="order-summary" data-cart-summary>
      <h3>Order Summary</h3>
      <div><small>Items</small><strong data-cart-items-total>0</strong></div>
    </div>
    <div class="cart-summary"><small>Subtotal</small><strong data-cart-total>₱0.00</strong></div>
    <a class="checkout-button" href="/checkout">Checkout</a>
  </aside>`; }

export const dynamic = "force-dynamic";

export default async function Home() {
  const [products, cms] = await Promise.all([getStoreProducts(), getHomepageCms()]);
  const byId = new Map(products.map((product) => [product.id, product]));
  const flashProducts = cms.flash_sale_product_ids.map((id) => byId.get(id)).filter((product): product is StoreProduct => Boolean(product));
  const discoverProducts = cms.discover_product_ids.map((id) => byId.get(id)).filter((product): product is StoreProduct => Boolean(product));
  return (
    <>
      <div dangerouslySetInnerHTML={{ __html: glowhouseMarkup(flashProducts, discoverProducts, cms.flash_sale_ends_at, cms.hero_images, cms.discover_image) }} />
      <ProductDetailsModal products={[...flashProducts, ...discoverProducts].filter((product, index, all) => all.findIndex((item) => item.id === product.id) === index).map((product) => product.modal)} />
      <Script src="/glowhouse-app.js" strategy="afterInteractive" />
    </>
  );
}
