import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const host = process.env.RAILWAY_PUBLIC_DOMAIN ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}` : `http://127.0.0.1:${process.env.PORT || 9000}`
  const auth = await fetch(`${host}/auth/user/emailpass`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email: process.env.MEDUSA_ADMIN_EMAIL, password: process.env.MEDUSA_ADMIN_PASSWORD }),
  })
  const token = auth.ok ? ((await auth.json()) as { token: string }).token : ""
  const cmsResponse = token ? await fetch(`${host}/admin/cms`, { headers: { authorization: `Bearer ${token}` } }) : null
  const adminCms = cmsResponse?.ok ? ((await cmsResponse.json()) as { cms?: Record<string, unknown> }).cms : null
  const saved = adminCms || {}
  res.json({ cms: {
    hero_images: Array.isArray(saved.hero_images) ? saved.hero_images : [],
    discover_image: typeof saved.discover_image === "string" ? saved.discover_image : null,
    flash_sale_product_ids: Array.isArray(saved.flash_sale_product_ids) ? saved.flash_sale_product_ids : [],
    flash_sale_ends_at: typeof saved.flash_sale_ends_at === "string" ? saved.flash_sale_ends_at : null,
    discover_product_ids: Array.isArray(saved.discover_product_ids) ? saved.discover_product_ids : [],
  } })
}
