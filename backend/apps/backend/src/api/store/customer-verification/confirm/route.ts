import crypto from "node:crypto"
import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const token = String((req.body as { token?: string })?.token || "")
  let decoded = ""

  try {
    decoded = Buffer.from(token, "base64url").toString("utf8")
  } catch {}

  const separator = decoded.indexOf(":")
  const customerId = decoded.slice(0, separator)
  const secret = decoded.slice(separator + 1)

  if (!customerId || !secret) {
    res.status(400).json({ message: "Invalid confirmation link" })
    return
  }

  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const { data } = await query.graph({
    entity: "customer",
    fields: ["id", "metadata"],
    filters: { id: customerId },
  })
  const customer = data[0]
  const metadata = (customer?.metadata || {}) as Record<string, unknown>
  const actualHash = crypto.createHash("sha256").update(secret).digest("hex")
  const expiresAt = new Date(String(metadata.email_verification_expires_at || 0))

  if (
    !customer ||
    metadata.email_verification_hash !== actualHash ||
    Number.isNaN(expiresAt.getTime()) ||
    expiresAt.getTime() < Date.now()
  ) {
    res.status(400).json({ message: "This confirmation link is invalid or expired" })
    return
  }

  const customerService = req.scope.resolve(Modules.CUSTOMER)
  await customerService.updateCustomers(customer.id, {
    metadata: {
      ...metadata,
      email_verified: true,
      email_verified_at: new Date().toISOString(),
      email_verification_hash: null,
      email_verification_expires_at: null,
    },
  })

  res.json({ confirmed: true })
}
