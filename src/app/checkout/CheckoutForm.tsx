"use client";
import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { customerToken, medusaRequest } from "../lib/browser-medusa";

type CartLine = { variantId: string; name: string; price: number; quantity: number };
export function CheckoutForm() {
  const [lines, setLines] = useState<CartLine[]>([]); const [message, setMessage] = useState(""); const [pending, setPending] = useState(false); const [orderId, setOrderId] = useState("");
  useEffect(() => { const frame = requestAnimationFrame(() => setLines(JSON.parse(localStorage.getItem("km-cart") || "[]").filter((line: CartLine) => line.variantId))); return () => cancelAnimationFrame(frame); }, []);
  const total = useMemo(() => lines.reduce((sum, line) => sum + line.price * line.quantity, 0), [lines]);
  async function placeOrder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!lines.length) return; setPending(true); setMessage(""); const form = new FormData(event.currentTarget); const token = customerToken() || undefined;
    try {
      const regionData = await medusaRequest<{ regions: Array<{ id: string }> }>("/store/regions?limit=1");
      const cartData = await medusaRequest<{ cart: { id: string } }>("/store/carts", { method: "POST", body: JSON.stringify({ region_id: regionData.regions[0]?.id }) }, token);
      const cartId = cartData.cart.id;
      for (const line of lines) await medusaRequest(`/store/carts/${cartId}/line-items`, { method: "POST", body: JSON.stringify({ variant_id: line.variantId, quantity: line.quantity }) }, token);
      await medusaRequest(`/store/carts/${cartId}`, { method: "POST", body: JSON.stringify({ email: form.get("email"), shipping_address: { first_name: form.get("first_name"), last_name: form.get("last_name"), phone: form.get("phone"), address_1: form.get("address_1"), address_2: form.get("barangay"), city: form.get("city"), province: form.get("province"), postal_code: form.get("postal_code"), country_code: "ph" } }) }, token);
      const shipping = await medusaRequest<{ shipping_options: Array<{ id: string }> }>(`/store/shipping-options?cart_id=${cartId}`, {}, token);
      if (!shipping.shipping_options[0]) throw new Error("No shipping option is available for this address.");
      await medusaRequest(`/store/carts/${cartId}/shipping-methods`, { method: "POST", body: JSON.stringify({ option_id: shipping.shipping_options[0].id }) }, token);
      const collection = await medusaRequest<{ payment_collection: { id: string } }>("/store/payment-collections", { method: "POST", body: JSON.stringify({ cart_id: cartId }) }, token);
      await medusaRequest(`/store/payment-collections/${collection.payment_collection.id}/payment-sessions`, { method: "POST", body: JSON.stringify({ provider_id: "pp_system_default" }) }, token);
      const result = await medusaRequest<{ type: string; order?: { id: string; display_id: number } }>(`/store/carts/${cartId}/complete`, { method: "POST", body: "{}" }, token);
      if (result.type !== "order" || !result.order) throw new Error("The order could not be completed.");
      localStorage.removeItem("km-cart"); setLines([]); setOrderId(`#${result.order.display_id}`); setMessage("Order placed successfully. Payment is recorded as a test payment for now.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Unable to place order."); }
    finally { setPending(false); }
  }
  if (orderId) return <section className="checkout-card checkout-success"><h1>Thank you</h1><strong>{orderId}</strong><p>{message}</p><Link href="/account">View your orders</Link></section>;
  return <section className="checkout-card"><Link href="/shop">← Continue shopping</Link><h1>Checkout</h1><div className="checkout-layout"><form onSubmit={placeOrder}><div className="auth-name-grid"><label>First name<input name="first_name" required /></label><label>Last name<input name="last_name" required /></label></div><label>Email<input name="email" type="email" required /></label><label>Mobile number<input name="phone" required /></label><label>Street address<input name="address_1" required /></label><label>Barangay<input name="barangay" required /></label><div className="auth-name-grid"><label>City/Municipality<input name="city" required /></label><label>Province<input name="province" required /></label></div><label>Postal code<input name="postal_code" required /></label><button disabled={pending || !lines.length} type="submit">{pending ? "Placing order…" : "Dummy payment — Place order"}</button><small>No real charge will be made. A payment gateway will be connected later.</small></form><aside><h2>Order summary</h2>{lines.map((line) => <div className="checkout-line" key={line.variantId}><span>{line.quantity} × {line.name}</span><b>₱{(line.price * line.quantity).toLocaleString("en-PH")}</b></div>)}<div className="checkout-total"><span>Products</span><strong>₱{total.toLocaleString("en-PH")}</strong></div></aside></div>{message ? <p className="auth-message">{message}</p> : null}</section>;
}
