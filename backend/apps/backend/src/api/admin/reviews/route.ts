import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { reviewsDatabase, serializeReview } from "../../../utils/reviews"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const db = await reviewsDatabase(req.scope)
  const rows = await db("km_product_review").orderBy("created_at", "desc").limit(500)
  res.json({ reviews: rows.map(serializeReview) })
}
