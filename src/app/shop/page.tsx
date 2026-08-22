import type { Metadata } from "next";
import Script from "next/script";
import { getPricingRegionId } from "../lib/store-data";
import { MEDUSA_PUBLISHABLE_KEY, MEDUSA_URL } from "../lib/medusa-config";
import { ProductDetailsModal, type ProductModalData } from "./ProductDetailsModal";

export const metadata: Metadata = {
  title: "Shop | KM Beauty & Wellness",
};

export const dynamic = "force-dynamic";

type MedusaPrice = {
  calculated_amount?: number;
  original_amount?: number;
  currency_code?: string;
};

type MedusaVariant = {
  id: string;
  title?: string | null;
  sku?: string | null;
  calculated_price?: MedusaPrice | null;
  metadata?: { promo_price?: number | string | null } | null;
  options?: Array<{
    value?: string | null;
    option?: { title?: string | null } | null;
  }>;
};

type MedusaProduct = {
  id: string;
  title: string;
  subtitle?: string | null;
  description?: string | null;
  handle: string;
  thumbnail?: string | null;
  metadata?: {
    shop_status?: string[] | string;
    cpr_number?: string;
    ingredients?: string;
    listing_type?: string;
    net_content?: string;
    period_after_opening?: string;
    product_video_url?: string;
    selling_point?: string;
    shelf_life?: string;
    skin_type?: string;
    usage_instructions?: string;
  } | null;
  collection?: {
    title?: string | null;
    handle?: string | null;
  } | null;
  categories?: MedusaCategory[];
  images?: Array<{ url?: string | null }>;
  variants?: MedusaVariant[];
};

type MedusaCategory = {
  id: string;
  name: string;
  handle: string;
};

type ShopProduct = {
  id: string;
  variantId: string;
  title: string;
  brand: string;
  brandSlug: string;
  category: string;
  categorySlug: string;
  status: string;
  image: string;
  price: number | null;
  originalPrice: number | null;
  discountPercentage: number;
  priceLabel: string;
  sku: string;
  order: number;
  modal: ProductModalData;
};

type ShopCategory = {
  label: string;
  slug: string;
  count: number;
};

const fallbackImages: Record<string, string> = {
  "secret-glow-routine-set": "/shop/assets/products/secret-glow.jpg",
  "revita-glow-skin-rescue": "/shop/assets/products/revita-glow-skin-rescue.png",
  "sun-defense-spf45": "/shop/assets/products/sun-defense-spf45-50g.png",
  "nekothione-beauty-supplement": "/shop/assets/products/neko-nekothione.jpg",
  "power-exfoliating-set": "/shop/assets/products/sevendays-power-exfoliating-set.jpg",
};

const pesoFormatter = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
});

function escapeHtml(value: string | null | undefined) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function getVariantPrices(variant: MedusaVariant | undefined) {
  const price = variant?.calculated_price;
  const originalPrice = price?.original_amount ?? price?.calculated_amount ?? null;
  const rawPromoPrice = variant?.metadata?.promo_price;
  const promoPrice = typeof rawPromoPrice === "number" ? rawPromoPrice : rawPromoPrice ? Number(rawPromoPrice) : null;
  const validPromoPrice = promoPrice !== null && Number.isFinite(promoPrice) && promoPrice > 0 && originalPrice !== null && promoPrice < originalPrice
    ? promoPrice
    : null;
  const effectivePrice = validPromoPrice ?? price?.calculated_amount ?? originalPrice;

  return {
    price: effectivePrice,
    originalPrice,
    discountPercentage: effectivePrice !== null && originalPrice !== null && originalPrice > effectivePrice
      ? Math.round((1 - effectivePrice / originalPrice) * 100)
      : 0,
  };
}

function normalizeShopStatuses(product: MedusaProduct) {
  const value = product.metadata?.shop_status;

  if (Array.isArray(value)) {
    return value.join(" ");
  }

  if (typeof value === "string") {
    return value;
  }

  return "";
}

function mapProduct(product: MedusaProduct, index: number): ShopProduct {
  const brand = product.collection?.title || "KM Beauty";
  const brandSlug = product.collection?.handle || slugify(brand);
  const category = product.categories?.[0];
  const variant = product.variants?.[0];
  const pricing = getVariantPrices(variant);
  const images = [product.thumbnail, ...(product.images || []).map((item) => item.url)]
    .filter((url): url is string => Boolean(url))
    .filter((url, imageIndex, all) => all.indexOf(url) === imageIndex);
  const fallbackImage = fallbackImages[product.handle] || "/assets/hero-sunblush-clean.png";

  return {
    id: product.id,
    variantId: variant?.id || "",
    title: product.title,
    brand,
    brandSlug,
    category: category?.name || "Unassigned",
    categorySlug: category?.handle ? slugify(category.handle) : "unassigned",
    status: normalizeShopStatuses(product),
    image: images[0] || fallbackImage,
    price: pricing.price,
    originalPrice: pricing.originalPrice,
    discountPercentage: pricing.discountPercentage,
    priceLabel: pricing.price === null ? "Set price in Admin" : pesoFormatter.format(pricing.price),
    sku: variant?.sku || product.handle,
    order: index + 1,
    modal: {
      id: product.id,
      title: product.title,
      subtitle: product.subtitle || "",
      description: product.description || "",
      brand,
      category: category?.name || "Unassigned",
      image: images[0] || fallbackImage,
      images: images.length ? images : [fallbackImage],
      videoUrl: product.metadata?.product_video_url || "",
      ingredients: product.metadata?.ingredients || "",
      usageInstructions: product.metadata?.usage_instructions || "",
      skinType: product.metadata?.skin_type || "",
      sellingPoint: product.metadata?.selling_point || "",
      netContent: product.metadata?.net_content || "",
      shelfLife: product.metadata?.shelf_life || "",
      periodAfterOpening: product.metadata?.period_after_opening || "",
      cprNumber: product.metadata?.cpr_number || "",
      listingType: product.metadata?.listing_type || "",
      variants: (product.variants || []).map((item) => {
        const itemPricing = getVariantPrices(item);
        const optionValues = (item.options || [])
          .map((option) => option.value?.trim())
          .filter((value): value is string => Boolean(value));
        return {
          id: item.id,
          title: optionValues.join(" · ") || item.title?.trim() || item.sku || "Standard",
          sku: item.sku || "",
          price: itemPricing.price,
          originalPrice: itemPricing.originalPrice,
        };
      }),
    },
  };
}

async function getShopData(): Promise<{
  categories: ShopCategory[];
  products: ShopProduct[];
}> {
  const backendUrl = MEDUSA_URL;
  const publishableKey = MEDUSA_PUBLISHABLE_KEY;

  if (!publishableKey) {
    return { categories: [], products: [] };
  }

  const regionId = await getPricingRegionId();
  if (!regionId) {
    return { categories: [], products: [] };
  }

  const productQuery = new URLSearchParams({
    limit: "100",
    region_id: regionId,
    fields: "id,title,subtitle,description,handle,thumbnail,metadata,*variants.calculated_price,+variants.sku,+variants.metadata,*variants.options,*images,*collection,*categories",
  });

  const [productsResponse, categoriesResponse] = await Promise.all([
    fetch(
      `${backendUrl}/store/products?${productQuery}`,
      {
        headers: {
          "x-publishable-api-key": publishableKey,
        },
        next: { revalidate: 0 },
      },
    ),
    fetch(`${backendUrl}/store/product-categories?limit=100`, {
      headers: {
        "x-publishable-api-key": publishableKey,
      },
      next: { revalidate: 0 },
    }),
  ]);

  if (!productsResponse.ok) {
    return { categories: [], products: [] };
  }

  const productsData = (await productsResponse.json()) as {
    products?: MedusaProduct[];
  };
  const categoryData = categoriesResponse.ok
    ? ((await categoriesResponse.json()) as {
        product_categories?: MedusaCategory[];
      })
    : { product_categories: [] };
  const products = (productsData.products || []).map(mapProduct);
  const categoryCounts = products.reduce<Record<string, number>>((result, product) => {
    result[product.categorySlug] = (result[product.categorySlug] || 0) + 1;
    return result;
  }, {});
  const categories = (categoryData.product_categories || [])
    .filter((category) => category.handle)
    .map((category) => ({
      label: category.name,
      slug: slugify(category.handle || category.name),
      count: categoryCounts[category.handle] || 0,
    }));

  if (categoryCounts.unassigned) {
    categories.push({
      label: "Unassigned",
      slug: "unassigned",
      count: categoryCounts.unassigned,
    });
  }

  return { categories, products };
}

function renderBrandFilters(products: ShopProduct[]) {
  const counts = products.reduce<Record<string, { label: string; count: number }>>(
    (result, product) => {
      result[product.brandSlug] ||= { label: product.brand, count: 0 };
      result[product.brandSlug].count += 1;
      return result;
    },
    {},
  );

  const links = Object.entries(counts)
    .map(
      ([slug, item]) =>
        `<a href="/shop?brand=${escapeHtml(slug)}" data-brand-filter="${escapeHtml(slug)}">${escapeHtml(item.label)} <span>${item.count}</span></a>`,
    )
    .join("");

  return `<a href="/shop" data-brand-filter="all">All Brands <span>${products.length}</span></a>${links}`;
}

function renderCategoryFilters(products: ShopProduct[], categories: ShopCategory[]) {
  const links = categories
    .map(
      (category) =>
        `<a href="#" data-category-filter="${escapeHtml(category.slug)}">${escapeHtml(category.label)} <span>${category.count}</span></a>`,
    )
    .join("");

  return `<a href="#" data-category-filter="all">All Categories <span>${products.length}</span></a>${links}`;
}

function getStatusCount(products: ShopProduct[], status: string) {
  return products.filter((product) => product.status.split(" ").includes(status)).length;
}

function renderProductCards(products: ShopProduct[]) {
  if (!products.length) {
    return `<article class="shop-card empty-shop-card">
      <div class="product-art"><img src="/assets/hero-sunblush-clean.png" alt="KM Beauty products"></div>
      <span>KM Beauty</span>
      <h2>No Medusa products yet</h2>
      <p>Add products in Medusa Admin, then refresh this page.</p>
      <button type="button">Waiting for products</button>
    </article>`;
  }

  return products
    .map((product) => {
      const safeTitle = escapeHtml(product.title);
      const safeBrand = escapeHtml(product.brand);
      const safePrice = product.price ?? 0;
      const canAddToCart = product.price !== null;
      const priceMarkup = product.price === null
        ? escapeHtml(product.priceLabel)
        : `${product.discountPercentage ? `<strong>${escapeHtml(product.priceLabel)}</strong> <del>${escapeHtml(pesoFormatter.format(product.originalPrice || product.price))}</del> <em>${product.discountPercentage}% OFF</em>` : escapeHtml(product.priceLabel)}`;

      return `<article class="shop-card ${product.status.includes("best-seller") ? "sale" : ""}" role="button" tabindex="0" aria-label="View details for ${safeTitle}" data-brand="${escapeHtml(product.brandSlug)}" data-category="${escapeHtml(product.categorySlug)}" data-status="${escapeHtml(product.status)}" data-price-value="${safePrice}" data-popularity="${96 - product.order}" data-order="${product.order}" data-product-id="${escapeHtml(product.id)}" data-sku="${escapeHtml(product.sku)}">
        <div class="product-art"><img src="${escapeHtml(product.image)}" alt="${safeTitle}"></div>
        <span>${safeBrand}</span>
        <h2>${safeTitle}</h2>
        <p class="shop-card-price">${priceMarkup}</p>
        <button type="button" data-price="${safePrice}" data-name="${safeTitle}" data-product-id="${escapeHtml(product.id)}" data-variant-id="${escapeHtml(product.variantId)}" ${canAddToCart ? "" : "disabled"}>${canAddToCart ? "Add to cart" : "Set price first"}</button>
      </article>`;
    })
    .join("");
}

function buildShopMarkup(products: ShopProduct[], categories: ShopCategory[]) {
  const productCount = products.length;

  return `
  <header class="header shop-header">
    <a href="/" class="logo" aria-label="KM Beauty and Wellness">
      <img src="/assets/km-logo-cropped.png" alt="KM Kat Melendez">
      <b>BEAUTY & WELLNESS</b>
    </a>
    <nav aria-label="Main navigation">
      <a href="/">Home</a>
      <a href="/shop">Shop</a>
      <a href="/contact">Contact Us</a>
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

  <main>
    <section class="shop-hero">
      <div>
        <span>KM Beauty & Wellness</span>
        <h1>Shop</h1>
        <p>Skin care, body glow, sun care, and wellness favorites in one clean catalog.</p>
      </div>
      <div class="shop-hero-media">
        <img src="/assets/hero-sunblush-clean.png" alt="KM Beauty featured products">
      </div>
    </section>

    <section class="shop-shell" aria-label="Product catalog">
      <div class="mobile-shop-controls" aria-label="Shop controls">
        <button type="button" data-toggle-shop-filters>
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16"></path><path d="M7 12h10"></path><path d="M10 17h4"></path></svg>
          Filter
        </button>
        <button type="button" data-toggle-shop-sort>
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 6h10"></path><path d="M7 12h7"></path><path d="M7 18h4"></path></svg>
          Sort
        </button>
      </div>

      <aside class="shop-sidebar">
        <div class="shop-filter-head">
          <strong>Filter Products</strong>
          <button type="button" aria-label="Close filters" data-close-shop-filters>×</button>
        </div>
        <div class="filter-block brand-filter">
          <h2>Sub Brands</h2>
          ${renderBrandFilters(products)}
        </div>
        <div class="filter-block">
          <h2>Categories</h2>
          ${renderCategoryFilters(products, categories)}
        </div>
        <div class="filter-block">
          <h2>Product Status</h2>
          <label><input type="checkbox" data-status-filter="sale"> On sale <span>${getStatusCount(products, "sale")}</span></label>
          <label><input type="checkbox" data-status-filter="best-seller"> Best seller <span>${getStatusCount(products, "best-seller")}</span></label>
          <label><input type="checkbox" data-status-filter="new"> New launch <span>${getStatusCount(products, "new")}</span></label>
        </div>
      </aside>

      <div class="shop-main">
        <div class="shop-toolbar">
          <p data-shop-count>Showing all ${productCount} products</p>
          <select aria-label="Sort products" data-sort-products>
            <option value="default">Default sorting</option>
            <option value="popular">Sort by popularity</option>
            <option value="price-asc">Sort by price: low to high</option>
            <option value="price-desc">Sort by price: high to low</option>
          </select>
        </div>

        <div class="shop-grid">
          ${renderProductCards(products)}
        </div>
      </div>
    </section>
  </main>

  <footer>
    <div>
      <img src="/assets/km-logo-cropped.png" alt="KM Beauty & Wellness">
    </div>
    <nav aria-label="Footer navigation">
      <a href="/">Home</a>
      <a href="/shop">Shop</a>
      <a href="/contact">Contact</a>
    </nav>
  </footer>

  <button class="floating-cart" type="button" aria-label="Shopping cart" aria-live="polite">
    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6.8 8.5h10.4l.8 11H6L6.8 8.5Z"></path><path d="M9 8.5V7a3 3 0 0 1 6 0v1.5"></path></svg>
    <b data-cart-count>0</b>
  </button>

  <div class="overlay" data-overlay></div>

  <section class="search-panel" aria-label="Search products" data-search-panel>
    <form action="/shop">
      <input type="search" placeholder="Search KM products">
      <button type="submit">Search</button>
    </form>
    <button class="panel-close" type="button" aria-label="Close search" data-close-panels>×</button>
  </section>

  <aside class="cart-drawer" aria-label="Shopping cart" data-cart-drawer>
    <button class="panel-close" type="button" aria-label="Close cart" data-close-panels>×</button>
    <span>Your Cart</span>
    <h2>Shopping Bag</h2>
    <div class="cart-lines" data-cart-lines><p>Your cart is empty.</p></div>
    <div class="order-summary" data-cart-summary>
      <h3>Order Summary</h3>
      <div><small>Items</small><strong data-cart-items-total>0</strong></div>
      <div><small>Subtotal</small><strong data-cart-subtotal>₱0.00</strong></div>
      <div><small>Shipping</small><strong>Calculated at checkout</strong></div>
    </div>
    <div class="cart-summary"><small>Total</small><strong data-cart-total>₱0.00</strong></div>
    <a class="checkout-button" href="/checkout">Checkout</a>
  </aside>`;
}

export default async function Page() {
  const { categories, products } = await getShopData();

  return (
    <>
      <div
        className="shop-page"
        dangerouslySetInnerHTML={{ __html: buildShopMarkup(products, categories) }}
      />
      <Script src="/glowhouse-app.js" strategy="afterInteractive" />
      <ProductDetailsModal products={products.map((product) => product.modal)} />
    </>
  );
}
