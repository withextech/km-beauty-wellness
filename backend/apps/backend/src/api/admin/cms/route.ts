import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3"

type CmsSettings = {
  hero_images: string[]
  discover_image: string | null
  flash_sale_product_ids: string[]
  flash_sale_ends_at: string | null
  discover_product_ids: string[]
  contact_address: string
  contact_email: string
  contact_phone: string
  delivery_fees: Record<string, number>
}

const defaults: CmsSettings = { hero_images: [], discover_image: null, flash_sale_product_ids: [], flash_sale_ends_at: null, discover_product_ids: [], contact_address: "Cavite, Philippines", contact_email: "hello@kmbeautywellness.com", contact_phone: "+63 900 000 0000", delivery_fees: { ncr: 95, luzon: 85, visayas: 100, mindanao: 105, island: 115 } }

async function getStore(req: MedusaRequest) {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const { data } = await query.graph({ entity: "store", fields: ["id", "metadata"] })
  return data[0]
}

function readSettings(metadata: Record<string, unknown> | null | undefined): CmsSettings {
  const saved = (metadata?.homepage_cms || {}) as Partial<CmsSettings>
  return {
    hero_images: Array.isArray(saved.hero_images) ? saved.hero_images.filter((url): url is string => typeof url === "string").slice(0, 4) : [],
    discover_image: typeof saved.discover_image === "string" ? saved.discover_image : null,
    flash_sale_product_ids: Array.isArray(saved.flash_sale_product_ids) ? saved.flash_sale_product_ids.filter((id): id is string => typeof id === "string") : [],
    flash_sale_ends_at: typeof saved.flash_sale_ends_at === "string" ? saved.flash_sale_ends_at : null,
    discover_product_ids: Array.isArray(saved.discover_product_ids) ? saved.discover_product_ids.filter((id): id is string => typeof id === "string") : [],
    contact_address: typeof saved.contact_address === "string" ? saved.contact_address : defaults.contact_address,
    contact_email: typeof saved.contact_email === "string" ? saved.contact_email : defaults.contact_email,
    contact_phone: typeof saved.contact_phone === "string" ? saved.contact_phone : defaults.contact_phone,
    delivery_fees: saved.delivery_fees && typeof saved.delivery_fees === "object" ? { ...defaults.delivery_fees, ...saved.delivery_fees } : defaults.delivery_fees,
  }
}

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const store = await getStore(req)
  res.json({ cms: store ? readSettings(store.metadata) : defaults })
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const store = await getStore(req)
  if (!store) return void res.status(404).json({ message: "Store not found" })
  const body = (req.body || {}) as Partial<CmsSettings>
  const settings: CmsSettings = {
    hero_images: Array.isArray(body.hero_images) ? body.hero_images.filter((url): url is string => typeof url === "string").slice(0, 4) : [],
    discover_image: typeof body.discover_image === "string" && body.discover_image ? body.discover_image : null,
    flash_sale_product_ids: Array.isArray(body.flash_sale_product_ids) ? body.flash_sale_product_ids.filter((id): id is string => typeof id === "string") : [],
    flash_sale_ends_at: typeof body.flash_sale_ends_at === "string" && body.flash_sale_ends_at ? new Date(body.flash_sale_ends_at).toISOString() : null,
    discover_product_ids: Array.isArray(body.discover_product_ids) ? body.discover_product_ids.filter((id): id is string => typeof id === "string") : [],
    contact_address: typeof body.contact_address === "string" ? body.contact_address.trim() : defaults.contact_address,
    contact_email: typeof body.contact_email === "string" ? body.contact_email.trim() : defaults.contact_email,
    contact_phone: typeof body.contact_phone === "string" ? body.contact_phone.trim() : defaults.contact_phone,
    delivery_fees: Object.fromEntries(Object.entries({ ...defaults.delivery_fees, ...(body.delivery_fees || {}) }).map(([key, value]) => [key, Math.max(0, Number(value) || 0)])),
  }
  const storeService = req.scope.resolve(Modules.STORE)
  await storeService.updateStores(store.id, { metadata: { ...(store.metadata || {}), homepage_cms: settings } })
  if (process.env.S3_ENDPOINT && process.env.S3_BUCKET && process.env.S3_ACCESS_KEY_ID && process.env.S3_SECRET_ACCESS_KEY) {
    const client = new S3Client({
      region: process.env.S3_REGION || "auto",
      endpoint: process.env.S3_ENDPOINT,
      credentials: { accessKeyId: process.env.S3_ACCESS_KEY_ID, secretAccessKey: process.env.S3_SECRET_ACCESS_KEY },
      forcePathStyle: true,
    })
    await client.send(new PutObjectCommand({ Bucket: process.env.S3_BUCKET, Key: "cms/homepage/settings.json", Body: JSON.stringify(settings), ContentType: "application/json", CacheControl: "no-cache" }))
  }
  res.json({ cms: settings })
}
