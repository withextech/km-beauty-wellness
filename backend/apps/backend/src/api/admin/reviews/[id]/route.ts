import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { reviewsDatabase, serializeReview } from "../../../../utils/reviews"

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const db = await reviewsDatabase(req.scope); const body = (req.body || {}) as Record<string, unknown>
  const current = await db("km_product_review").where({ id: req.params.id }).first()
  if (!current) throw new MedusaError(MedusaError.Types.NOT_FOUND, "Review not found")
  const status = ["pending", "approved", "hidden"].includes(String(body.status)) ? String(body.status) : current.status
  const featured = body.featured === undefined ? current.featured : Boolean(body.featured)
  if (featured && status !== "approved") throw new MedusaError(MedusaError.Types.INVALID_DATA, "Approve the review before featuring it")
  await db("km_product_review").where({ id: req.params.id }).update({ status, featured, updated_at: new Date() })
  res.json({ review: serializeReview({ ...current, status, featured }) })
}

export async function DELETE(req: MedusaRequest, res: MedusaResponse) {
  const db = await reviewsDatabase(req.scope); await db("km_product_review").where({ id: req.params.id }).delete(); res.status(204).send()
}
