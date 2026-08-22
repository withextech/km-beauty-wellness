import type { ProductModalData } from "../shop/ProductDetailsModal";

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
  inventoryQuantity: number;
  modal: ProductModalData;
};

export type HomepageCms = {
  hero_images: string[];
  discover_image: string | null;
  flash_sale_product_ids: string[];
  flash_sale_ends_at: string | null;
  discover_product_ids: string[];
};

const money = new Intl.NumberFormat("en-PH", { currency: "PHP", style: "currency" });

type ApiProduct = {
  id: string; title: string; subtitle?: string | null; description?: string | null; handle: string; thumbnail?: string | null;
  images?: Array<{ url?: string | null }>;
  collection?: { title?: string | null } | null;
  categories?: Array<{ name?: string | null }>;
  metadata?: { product_video_url?: string; ingredients?: string; usage_instructions?: string; skin_type?: string; selling_point?: string; net_content?: string; shelf_life?: string; period_after_opening?: string; cpr_number?: string; listing_type?: string } | null;
  variants?: Array<{ id: string; title?: string | null; sku?: string | null; inventory_quantity?: number; allow_backorder?: boolean; calculated_price?: { calculated_amount?: number; original_amount?: number } | null; metadata?: { promo_price?: number | string | null } | null; options?: Array<{ value?: string | null }> }>;
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
    fields: "id,title,subtitle,description,handle,thumbnail,metadata,*images,*collection,*categories,*variants,*variants.calculated_price,+variants.sku,+variants.metadata,+variants.inventory_quantity,+variants.allow_backorder,*variants.options",
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
    const images = [product.thumbnail, ...(product.images || []).map((item) => item.url)].filter((url): url is string => Boolean(url)).filter((url, index, all) => all.indexOf(url) === index);
    const image = String(images[0] || "/assets/hero-sunblush-clean.png");
    const variantData = (product.variants || []).map((item) => {
      const itemOriginal = Number(item.calculated_price?.original_amount ?? item.calculated_price?.calculated_amount ?? 0);
      const rawItemPromo = item.metadata?.promo_price;
      const itemPromo = typeof rawItemPromo === "number" ? rawItemPromo : rawItemPromo ? Number(rawItemPromo) : 0;
      const itemPrice = itemPromo > 0 && itemOriginal > itemPromo ? itemPromo : Number(item.calculated_price?.calculated_amount ?? itemOriginal);
      return { id: item.id, title: (item.options || []).map((option) => option.value?.trim()).filter(Boolean).join(" · ") || item.title?.trim() || item.sku || "Standard", sku: item.sku || "", price: itemPrice || null, originalPrice: itemOriginal || itemPrice || null, image, inventoryQuantity: item.allow_backorder ? 99 : Math.max(0, Number(item.inventory_quantity || 0)) };
    });
    return [{
      id: String(product.id),
      variantId: String(variant.id),
      title: String(product.title),
      handle: String(product.handle),
      brand: String(product.collection?.title || "KM Beauty"),
      image,
      price,
      originalPrice: originalPrice || price,
      priceLabel: money.format(price),
      inventoryQuantity: variant.allow_backorder ? 99 : Math.max(0, Number(variant.inventory_quantity || 0)),
      modal: { id: String(product.id), title: String(product.title), subtitle: product.subtitle || "", description: product.description || "", brand: String(product.collection?.title || "KM Beauty"), category: product.categories?.[0]?.name || "Unassigned", image, images: images.length ? images : [image], videoUrl: product.metadata?.product_video_url || "", ingredients: product.metadata?.ingredients || "", usageInstructions: product.metadata?.usage_instructions || "", skinType: product.metadata?.skin_type || "", sellingPoint: product.metadata?.selling_point || "", netContent: product.metadata?.net_content || "", shelfLife: product.metadata?.shelf_life || "", periodAfterOpening: product.metadata?.period_after_opening || "", cprNumber: product.metadata?.cpr_number || "", listingType: product.metadata?.listing_type || "", variants: variantData },
    }];
  });
}

export async function getHomepageCms(): Promise<HomepageCms> {
  const fallback = { hero_images: [], discover_image: null, flash_sale_product_ids: [], flash_sale_ends_at: null, discover_product_ids: [] };
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
  return `data-price="${product.price}" data-stock="${product.inventoryQuantity}" data-name="${escapeHtml(product.title)}" data-image="${escapeHtml(product.image)}" data-product-id="${product.id}" data-variant-id="${product.variantId}"`;
}
import { MEDUSA_PUBLISHABLE_KEY, MEDUSA_URL } from "./medusa-config";
