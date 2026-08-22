import crypto from "node:crypto"
import { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;")
}

export async function POST(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  const customerId = req.auth_context.actor_id
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const { data } = await query.graph({
    entity: "customer",
    fields: ["id", "email", "first_name", "metadata"],
    filters: { id: customerId },
  })
  const customer = data[0]

  if (!customer?.email) {
    res.status(404).json({ message: "Customer not found" })
    return
  }

  const secret = crypto.randomBytes(24).toString("hex")
  const token = Buffer.from(`${customer.id}:${secret}`).toString("base64url")
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
  const customerService = req.scope.resolve(Modules.CUSTOMER)

  await customerService.updateCustomers(customer.id, {
    metadata: {
      ...(customer.metadata || {}),
      email_verified: false,
      email_verification_hash: crypto.createHash("sha256").update(secret).digest("hex"),
      email_verification_expires_at: expiresAt,
    },
  })

  const storefrontUrl = process.env.STOREFRONT_URL || "http://localhost:3100"
  const confirmationUrl = `${storefrontUrl}/confirm-email?token=${encodeURIComponent(token)}`
  const resendKey = process.env.RESEND_API_KEY

  if (!resendKey) {
    res.status(503).json({ message: "Email delivery is not configured" })
    return
  }

  const name = escapeHtml(String(customer.first_name || "there"))
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: process.env.EMAIL_FROM || "KM Beauty & Wellness <kmbeauty@withextech.com>",
      to: [customer.email],
      subject: "Confirm your KM Beauty & Wellness account",
      html: `<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#244f57"><h1 style="color:#287e89">Welcome to KM Beauty & Wellness</h1><p>Hello ${name},</p><p>Confirm your email address to activate your account and view your orders.</p><p style="margin:28px 0"><a href="${confirmationUrl}" style="background:#287e89;color:#fff;padding:13px 22px;text-decoration:none;border-radius:6px;font-weight:700">Confirm email address</a></p><p style="color:#70878c;font-size:13px">This link expires in 24 hours. If you did not create this account, you can ignore this email.</p></div>`,
    }),
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    console.error("Unable to send confirmation email", error)
    res.status(502).json({ message: "Unable to send confirmation email" })
    return
  }

  res.json({ sent: true })
}
