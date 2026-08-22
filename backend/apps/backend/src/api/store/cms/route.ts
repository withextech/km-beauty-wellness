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
  } })
}
