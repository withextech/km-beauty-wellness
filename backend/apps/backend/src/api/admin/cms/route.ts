import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3"

type CmsSettings = {
  hero_images: string[]
  discover_image: string | null
  flash_sale_product_ids: string[]
  flash_sale_ends_at: string | null
  discover_product_ids: string[]
}

const defaults: CmsSettings = { hero_images: [], discover_image: null, flash_sale_product_ids: [], flash_sale_ends_at: null, discover_product_ids: [] }

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
