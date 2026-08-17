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
  variants?: Array<{ id: string; calculated_price?: { calculated_amount?: number; original_amount?: number } | null }>;
};

function backend() {
  return process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || "http://localhost:9000";
}

function headers() {
  return { "x-publishable-api-key": process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || "" };
}

export async function getStoreProducts(): Promise<StoreProduct[]> {
  if (!process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY) return [];
  const response = await fetch(`${backend()}/store/products?limit=100&fields=id,title,handle,thumbnail,*images,*collection,*variants.calculated_price,+variants.sku`, {
    headers: headers(),
    cache: "no-store",
  });
  if (!response.ok) return [];
  const data = (await response.json()) as { products?: ApiProduct[] };
  return (data.products || []).flatMap((product) => {
    const variant = product.variants?.[0];
    const calculated = variant?.calculated_price;
    const price = Number(calculated?.calculated_amount ?? calculated?.original_amount ?? 0);
    if (!variant?.id || !price) return [];
    return [{
      id: String(product.id),
      variantId: String(variant.id),
      title: String(product.title),
      handle: String(product.handle),
      brand: String(product.collection?.title || "KM Beauty"),
      image: String(product.thumbnail || product.images?.[0]?.url || "/assets/hero-sunblush-clean.png"),
      price,
      originalPrice: Number(calculated?.original_amount ?? price),
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
