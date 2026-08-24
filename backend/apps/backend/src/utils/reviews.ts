import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

export type ReviewRecord = {
  id: string; product_id: string; product_title: string; customer_id: string; customer_email: string;
  customer_name: string; order_id: string; order_item_id: string; rating: number; comment: string;
  images: string[]; status: "pending" | "approved" | "hidden"; featured: boolean; created_at: string; updated_at: string;
}

export async function reviewsDatabase(scope: any) {
  const db = scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
  const exists = await db.schema.hasTable("km_product_review")
  if (!exists) {
    await db.schema.createTable("km_product_review", (table: any) => {
      table.string("id").primary(); table.string("product_id").notNullable().index(); table.string("product_title").notNullable();
      table.string("customer_id").notNullable().index(); table.string("customer_email").notNullable(); table.string("customer_name").notNullable();
      table.string("order_id").notNullable().index(); table.string("order_item_id").notNullable().unique(); table.integer("rating").notNullable();
      table.text("comment").notNullable(); table.jsonb("images").notNullable().defaultTo("[]"); table.string("status").notNullable().defaultTo("pending").index();
      table.boolean("featured").notNullable().defaultTo(false).index(); table.timestamp("created_at").notNullable().defaultTo(db.fn.now()); table.timestamp("updated_at").notNullable().defaultTo(db.fn.now());
    })
  }
  return db
}

export function serializeReview(row: any): ReviewRecord {
  return { ...row, images: Array.isArray(row.images) ? row.images : typeof row.images === "string" ? JSON.parse(row.images) : [], rating: Number(row.rating), featured: Boolean(row.featured) }
}
