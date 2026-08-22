import { serverMedusaRequest } from "../../../lib/server-medusa";

type CheckoutLine = { variantId?: unknown; quantity?: unknown };
type CheckoutAddress = Record<string, unknown>;
type MedusaCart = { id: string; payment_collection?: { id: string; payment_sessions?: unknown[] } };
type CompleteCartResponse = { order?: { id: string; display_id?: number | string } };

function requiredText(address: CheckoutAddress, key: string) {
  const value = typeof address[key] === "string" ? address[key].trim() : "";
  if (!value) throw new Error(`Please enter your ${key.replaceAll("_", " ")}.`);
  return value;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { address?: CheckoutAddress; lines?: CheckoutLine[] };
    const lines = Array.isArray(body.lines)
      ? body.lines.map((line) => ({
          quantity: Math.max(1, Math.min(99, Math.floor(Number(line.quantity)))),
          variant_id: typeof line.variantId === "string" ? line.variantId.trim() : "",
        })).filter((line) => /^variant_[A-Za-z0-9]+$/.test(line.variant_id) && Number.isFinite(line.quantity))
      : [];
    if (!lines.length) return Response.json({ message: "Your cart is empty." }, { status: 400 });

    const address = body.address || {};
    const email = requiredText(address, "email");
    const shippingAddress = {
      first_name: requiredText(address, "first_name"), last_name: requiredText(address, "last_name"),
      phone: requiredText(address, "phone"), address_1: requiredText(address, "address_1"),
      address_2: requiredText(address, "barangay"), city: requiredText(address, "city"),
      province: requiredText(address, "province"), postal_code: requiredText(address, "postal_code"), country_code: "ph",
    };

    const regions = await serverMedusaRequest<{ regions: Array<{ id: string; currency_code: string }> }>("/store/regions?limit=100");
    const regionId = regions.regions.find((region) => region.currency_code.toLowerCase() === "php")?.id;
    if (!regionId) throw new Error("Philippine checkout is not configured.");

    const created = await serverMedusaRequest<{ cart: MedusaCart }>("/store/carts", {
      method: "POST", body: JSON.stringify({ email, region_id: regionId, shipping_address: shippingAddress }),
    });
    const cartId = created.cart.id;
    for (const line of lines) {
      await serverMedusaRequest(`/store/carts/${cartId}/line-items`, { method: "POST", body: JSON.stringify(line) });
    }

    const shipping = await serverMedusaRequest<{ shipping_options: Array<{ id: string }> }>(`/store/shipping-options?cart_id=${encodeURIComponent(cartId)}`);
    if (!shipping.shipping_options[0]) throw new Error("Shipping is not available for this delivery address.");
    await serverMedusaRequest(`/store/carts/${cartId}/shipping-methods`, {
      method: "POST", body: JSON.stringify({ option_id: shipping.shipping_options[0].id }),
    });

    const cartData = await serverMedusaRequest<{ cart: MedusaCart }>(`/store/carts/${cartId}?fields=+payment_collection.*,+payment_collection.payment_sessions.*`);
    const paymentCollection = cartData.cart.payment_collection || (await serverMedusaRequest<{ payment_collection: { id: string; payment_sessions?: unknown[] } }>(
      "/store/payment-collections", { method: "POST", body: JSON.stringify({ cart_id: cartId }) },
    )).payment_collection;
    if (!paymentCollection.payment_sessions?.length) {
      await serverMedusaRequest(`/store/payment-collections/${paymentCollection.id}/payment-sessions`, {
        method: "POST", body: JSON.stringify({ provider_id: "pp_system_default" }),
      });
    }

    const completed = await serverMedusaRequest<CompleteCartResponse>(`/store/carts/${cartId}/complete`, { method: "POST", body: "{}" });
    if (!completed.order?.id) throw new Error("Medusa did not return the completed order.");
    return Response.json({ cart_id: cartId, display_id: completed.order.display_id || "", order_id: completed.order.id });
  } catch (error) {
    console.error("Unable to place Medusa order", error);
    return Response.json({ message: error instanceof Error ? error.message : "Unable to place order." }, { status: 500 });
  }
}
