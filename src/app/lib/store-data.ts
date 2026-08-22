export type StoreProduct = {
  id: string;
  variantId: string;
  title: string;
  handle: string;
  brand: string;
  image: string;
  price: number;
  originalPrice: number;
  priceLabel: string;
};

export type HomepageCms = {
  flash_sale_product_ids: string[];
  flash_sale_ends_at: string | null;
  discover_product_ids: string[];
};

const money = new Intl.NumberFormat("en-PH", { currency: "PHP", style: "currency" });

type ApiProduct = {
  id: string; title: string; handle: string; thumbnail?: string | null;
  images?: Array<{ url?: string | null }>;
  collection?: { title?: string | null } | null;
  variants?: Array<{ id: string; calculated_price?: { calculated_amount?: number; original_amount?: number } | null; metadata?: { promo_price?: number | string | null } | null }>;
};

function backend() {
  return MEDUSA_URL;
}

function headers() {
  return { "x-publishable-api-key": MEDUSA_PUBLISHABLE_KEY };
}

type ApiRegion = { id: string; currency_code?: string };

export async function getPricingRegionId(): Promise<string | null> {
  if (!MEDUSA_PUBLISHABLE_KEY) return null;

  const response = await fetch(`${backend()}/store/regions?limit=100`, {
    headers: headers(),
    cache: "no-store",
  });
  if (!response.ok) return null;

  const data = (await response.json()) as { regions?: ApiRegion[] };
  return data.regions?.find((region) => region.currency_code?.toLowerCase() === "php")?.id || data.regions?.[0]?.id || null;
}

export async function getStoreProducts(): Promise<StoreProduct[]> {
  if (!MEDUSA_PUBLISHABLE_KEY) return [];
  const regionId = await getPricingRegionId();
  if (!regionId) return [];

  const query = new URLSearchParams({
    limit: "100",
    region_id: regionId,
    fields: "id,title,handle,thumbnail,*images,*collection,*variants.calculated_price,+variants.sku,+variants.metadata",
  });
  const response = await fetch(`${backend()}/store/products?${query}`, {
    headers: headers(),
    cache: "no-store",
  });
  if (!response.ok) return [];
  const data = (await response.json()) as { products?: ApiProduct[] };
  return (data.products || []).flatMap((product) => {
    const variant = product.variants?.[0];
    const calculated = variant?.calculated_price;
    const originalPrice = Number(calculated?.original_amount ?? calculated?.calculated_amount ?? 0);
    const rawPromoPrice = variant?.metadata?.promo_price;
    const promoPrice = typeof rawPromoPrice === "number" ? rawPromoPrice : rawPromoPrice ? Number(rawPromoPrice) : 0;
    const price = promoPrice > 0 && originalPrice > promoPrice ? promoPrice : Number(calculated?.calculated_amount ?? originalPrice);
    if (!variant?.id || !price) return [];
    return [{
      id: String(product.id),
      variantId: String(variant.id),
      title: String(product.title),
      handle: String(product.handle),
      brand: String(product.collection?.title || "KM Beauty"),
      image: String(product.thumbnail || product.images?.[0]?.url || "/assets/hero-sunblush-clean.png"),
      price,
      originalPrice: originalPrice || price,
      priceLabel: money.format(price),
    }];
  });
}

export async function getHomepageCms(): Promise<HomepageCms> {
  const fallback = { flash_sale_product_ids: [], flash_sale_ends_at: null, discover_product_ids: [] };
  if (!process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY) return fallback;
  const response = await fetch(`${backend()}/store/cms`, { headers: headers(), cache: "no-store" });
  if (!response.ok) return fallback;
  const data = (await response.json()) as { cms?: HomepageCms };
  return data.cms || fallback;
}

export function escapeHtml(value: string) {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
}

export function productButton(product: StoreProduct) {
  return `data-price="${product.price}" data-name="${escapeHtml(product.title)}" data-product-id="${product.id}" data-variant-id="${product.variantId}"`;
}
import { MEDUSA_PUBLISHABLE_KEY, MEDUSA_URL } from "./medusa-config";
