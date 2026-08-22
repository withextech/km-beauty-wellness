import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const manifestUrl = process.env.S3_FILE_URL ? `${process.env.S3_FILE_URL.replace(/\/$/, "")}/cms/homepage/settings.json?t=${Date.now()}` : ""
  const manifestResponse = manifestUrl ? await fetch(manifestUrl, { cache: "no-store" }) : null
  const saved = manifestResponse?.ok ? (await manifestResponse.json()) as Record<string, unknown> : {}
  res.json({ cms: {
    hero_images: Array.isArray(saved.hero_images) ? saved.hero_images : [],
    discover_image: typeof saved.discover_image === "string" ? saved.discover_image : null,
    flash_sale_product_ids: Array.isArray(saved.flash_sale_product_ids) ? saved.flash_sale_product_ids : [],
    flash_sale_ends_at: typeof saved.flash_sale_ends_at === "string" ? saved.flash_sale_ends_at : null,
    discover_product_ids: Array.isArray(saved.discover_product_ids) ? saved.discover_product_ids : [],
    contact_address: typeof saved.contact_address === "string" ? saved.contact_address : "Cavite, Philippines",
    contact_email: typeof saved.contact_email === "string" ? saved.contact_email : "hello@kmbeautywellness.com",
    contact_phone: typeof saved.contact_phone === "string" ? saved.contact_phone : "+63 900 000 0000",
    delivery_fees: saved.delivery_fees && typeof saved.delivery_fees === "object" ? saved.delivery_fees : { ncr: 95, luzon: 85, visayas: 100, mindanao: 105, island: 115 },
  } })
}
