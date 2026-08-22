import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const { data } = await query.graph({ entity: "store", fields: ["metadata"] })
  const metadata = (data[0]?.metadata || {}) as Record<string, unknown>
  const saved = (metadata.homepage_cms || {}) as Record<string, unknown>
  res.json({ cms: {
    hero_images: Array.isArray(saved.hero_images) ? saved.hero_images : [],
    discover_image: typeof saved.discover_image === "string" ? saved.discover_image : null,
    flash_sale_product_ids: Array.isArray(saved.flash_sale_product_ids) ? saved.flash_sale_product_ids : [],
    flash_sale_ends_at: typeof saved.flash_sale_ends_at === "string" ? saved.flash_sale_ends_at : null,
    discover_product_ids: Array.isArray(saved.discover_product_ids) ? saved.discover_product_ids : [],
  } })
}
