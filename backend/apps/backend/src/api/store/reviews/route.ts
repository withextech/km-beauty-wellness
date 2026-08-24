import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3"
import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { reviewsDatabase, serializeReview } from "../../../utils/reviews"

type UploadedFile = { buffer: Buffer; mimetype: string; originalname: string }

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const db = await reviewsDatabase(req.scope)
  const productId = typeof req.query.product_id === "string" ? req.query.product_id : ""
  const featured = req.query.featured === "true"
  let query = db("km_product_review").where({ status: "approved" }).orderBy("created_at", "desc").limit(featured ? 12 : 100)
  if (productId) query = query.andWhere({ product_id: productId })
  if (featured) query = query.andWhere({ featured: true })
  const rows = await query
  res.json({ reviews: rows.map(serializeReview) })
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const customerId = (req as MedusaRequest & { auth_context?: { actor_id?: string } }).auth_context?.actor_id
  if (!customerId) throw new MedusaError(MedusaError.Types.UNAUTHORIZED, "Sign in to submit a review")
  const body = (req.body || {}) as Record<string, unknown>
  const productId = String(body.product_id || "").trim(); const productTitle = String(body.product_title || "").trim()
  const orderId = String(body.order_id || "").trim(); const orderItemId = String(body.order_item_id || "").trim()
  const comment = String(body.comment || "").trim(); const rating = Math.max(1, Math.min(5, Math.round(Number(body.rating))))
  if (!productId || !orderId || !orderItemId || !productTitle || comment.length < 10) throw new MedusaError(MedusaError.Types.INVALID_DATA, "Complete the review before submitting")
  const query = req.scope.resolve("query")
  const { data: orders } = await query.graph({ entity: "order", fields: ["id", "customer_id", "fulfillment_status", "items.id", "items.product_id"], filters: { id: orderId } })
  const order = orders[0]
  if (!order || order.customer_id !== customerId || !order.items?.some((item: any) => item.id === orderItemId && (item.product_id === productId || productId.startsWith("variant_")))) throw new MedusaError(MedusaError.Types.NOT_ALLOWED, "This product is not part of your order")
  const { data: customers } = await query.graph({ entity: "customer", fields: ["id", "email", "first_name", "last_name"], filters: { id: customerId } })
  const customer = customers[0]
  const files = ((req as MedusaRequest & { files?: UploadedFile[] }).files || []).filter((file) => file.mimetype.startsWith("image/"))
  const images: string[] = []
  if (files.length) {
    const required = ["S3_FILE_URL", "S3_ACCESS_KEY_ID", "S3_SECRET_ACCESS_KEY", "S3_BUCKET", "S3_ENDPOINT"] as const
    if (!required.every((name) => process.env[name])) throw new MedusaError(MedusaError.Types.UNEXPECTED_STATE, "Review image storage is unavailable")
    const client = new S3Client({ region: process.env.S3_REGION || "auto", endpoint: process.env.S3_ENDPOINT!, credentials: { accessKeyId: process.env.S3_ACCESS_KEY_ID!, secretAccessKey: process.env.S3_SECRET_ACCESS_KEY! }, forcePathStyle: true })
    for (const file of files.slice(0, 5)) {
      const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]+/g, "-"); const key = `reviews/${productId}/${Date.now()}-${crypto.randomUUID()}-${safeName}`
      await client.send(new PutObjectCommand({ Bucket: process.env.S3_BUCKET!, Key: key, Body: file.buffer, ContentType: file.mimetype })); images.push(`${process.env.S3_FILE_URL!.replace(/\/$/, "")}/${key}`)
    }
  }
  const db = await reviewsDatabase(req.scope); const id = `review_${crypto.randomUUID()}`
  const record = { id, product_id: productId, product_title: productTitle, customer_id: customerId, customer_email: customer?.email || "", customer_name: [customer?.first_name, customer?.last_name].filter(Boolean).join(" ") || "Verified customer", order_id: orderId, order_item_id: orderItemId, rating, comment, images: JSON.stringify(images), status: "pending", featured: false, created_at: new Date(), updated_at: new Date() }
  await db("km_product_review").insert(record).onConflict("order_item_id").merge({ rating, comment, images: JSON.stringify(images), status: "pending", featured: false, updated_at: new Date() })
  res.status(201).json({ review: serializeReview(record) })
}
