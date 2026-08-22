import { randomUUID } from "node:crypto";
import { paymongoRequest } from "../../../lib/paymongo";
import { serverMedusaRequest } from "../../../lib/server-medusa";

type MedusaCart = {
  id: string;
  currency_code: string;
  email?: string;
  total: number;
  completed_at?: string | null;
  items?: Array<{ title?: string; product_title?: string; unit_price: number; quantity: number }>;
};

type CheckoutResponse = { data: { id: string; attributes: { checkout_url: string } } };

export async function POST(request: Request) {
  try {
    if (!process.env.PAYMONGO_SECRET_KEY) {
      return Response.json({ message: "QR Ph payment is not active yet. Please contact the store while payment setup is being completed." }, { status: 503 });
    }
    const body = await request.json();
    const cartId = typeof body.cart_id === "string" ? body.cart_id : "";
    if (!/^cart_[A-Za-z0-9]+$/.test(cartId)) return Response.json({ message: "Invalid cart." }, { status: 400 });

    const { cart } = await serverMedusaRequest<{ cart: MedusaCart }>(`/store/carts/${cartId}?fields=+items.*`);
    if (cart.completed_at) return Response.json({ message: "This cart has already been completed." }, { status: 409 });
    if (!cart.items?.length || !cart.total || cart.total < 1) return Response.json({ message: "The cart is empty." }, { status: 400 });
    if (cart.currency_code.toLowerCase() !== "php") return Response.json({ message: "QR Ph checkout requires PHP pricing." }, { status: 400 });

    const origin = new URL(request.url).origin;
    const checkout = await paymongoRequest<CheckoutResponse>("/v2/checkout_sessions", {
      method: "POST",
      headers: { "Idempotency-Key": `paymongo-${cart.id}-${randomUUID()}` },
      body: JSON.stringify({
        data: {
          attributes: {
            billing: cart.email ? { email: cart.email } : undefined,
            cancel_url: `${origin}/checkout`,
            description: `KM Beauty & Wellness order ${cart.id}`,
            line_items: cart.items.map((item) => ({
              amount: Math.round(item.unit_price * 100),
              currency: "PHP",
              name: item.product_title || item.title || "KM Beauty product",
              quantity: item.quantity,
            })).concat([{ amount: 10000, currency: "PHP", name: "Standard shipping", quantity: 1 }]),
            metadata: { cart_id: cart.id },
            payment_method_types: ["qrph"],
            reference_number: cart.id,
            send_email_receipt: true,
            show_description: true,
            show_line_items: true,
            success_url: `${origin}/checkout/success?cart_id=${encodeURIComponent(cart.id)}`,
          },
        },
      }),
    });

    return Response.json({ checkout_url: checkout.data.attributes.checkout_url });
  } catch (error) {
    console.error("Unable to create PayMongo checkout", error);
    return Response.json({ message: error instanceof Error ? error.message : "Unable to start payment." }, { status: 500 });
  }
}
