import { paymongoRequest, verifyPaymongoSignature } from "../../../lib/paymongo";
import { serverMedusaRequest } from "../../../lib/server-medusa";

type CheckoutSession = {
  data: {
    attributes: {
      reference_number?: string;
      payments?: Array<{ attributes?: { status?: string } }>;
    };
  };
};

async function completeMedusaCart(cartId: string) {
  const cartData = await serverMedusaRequest<{ cart: { completed_at?: string | null; payment_collection?: { id: string; payment_sessions?: unknown[] } } }>(
    `/store/carts/${cartId}?fields=completed_at,+payment_collection.*,+payment_collection.payment_sessions.*`,
  );
  if (cartData.cart.completed_at) return;

  const paymentCollection = cartData.cart.payment_collection || (await serverMedusaRequest<{ payment_collection: { id: string; payment_sessions?: unknown[] } }>("/store/payment-collections", {
    method: "POST",
    body: JSON.stringify({ cart_id: cartId }),
  })).payment_collection;
  if (!paymentCollection.payment_sessions?.length) {
    await serverMedusaRequest(`/store/payment-collections/${paymentCollection.id}/payment-sessions`, {
      method: "POST",
      body: JSON.stringify({ provider_id: "pp_system_default" }),
    });
  }
  await serverMedusaRequest(`/store/carts/${cartId}/complete`, { method: "POST", body: "{}" });
}

export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature = request.headers.get("paymongo-signature") || request.headers.get("x-paymongo-signature");
  if (!verifyPaymongoSignature(rawBody, signature)) return Response.json({ received: false }, { status: 401 });

  try {
    const event = JSON.parse(rawBody);
    if (event?.data?.attributes?.type !== "checkout_session.payment.paid") return Response.json({ received: true });

    const sessionId = event?.data?.attributes?.data?.id;
    if (typeof sessionId !== "string") throw new Error("Missing checkout session ID.");
    const session = await paymongoRequest<CheckoutSession>(`/v2/checkout_sessions/${sessionId}`);
    const cartId = session.data.attributes.reference_number;
    const paid = session.data.attributes.payments?.some((payment) => payment.attributes?.status === "paid");
    if (!cartId || !/^cart_[A-Za-z0-9]+$/.test(cartId) || !paid) throw new Error("Unable to verify the paid cart.");

    await completeMedusaCart(cartId);
    return Response.json({ received: true });
  } catch (error) {
    console.error("PayMongo webhook processing failed", error);
    return Response.json({ received: false }, { status: 500 });
  }
}
