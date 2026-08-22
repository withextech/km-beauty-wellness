"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { customerToken, medusaRequest } from "../lib/browser-medusa";

type CartLine = { variantId: string; name: string; image?: string; price: number; quantity: number };
const SHIPPING_FEE = 100;
const peso = new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" });

export function CheckoutForm() {
  const [lines, setLines] = useState<CartLine[]>([]);
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      try {
        const stored = JSON.parse(localStorage.getItem("km-cart") || "[]") as CartLine[];
        setLines(stored.filter((line) => line.variantId && line.quantity > 0));
      } catch { setLines([]); }
    });
    return () => cancelAnimationFrame(frame);
  }, []);

  const subtotal = useMemo(() => lines.reduce((sum, line) => sum + line.price * line.quantity, 0), [lines]);
  const total = subtotal + (lines.length ? SHIPPING_FEE : 0);

  async function placeOrder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!lines.length) return;
    setPending(true); setMessage("");
    const form = new FormData(event.currentTarget);
    const token = customerToken() || undefined;
    try {
      const regionData = await medusaRequest<{ regions: Array<{ id: string }> }>("/store/regions?limit=1");
      const cartData = await medusaRequest<{ cart: { id: string } }>("/store/carts", { method: "POST", body: JSON.stringify({ region_id: regionData.regions[0]?.id }) }, token);
      const cartId = cartData.cart.id;
      for (const line of lines) await medusaRequest(`/store/carts/${cartId}/line-items`, { method: "POST", body: JSON.stringify({ variant_id: line.variantId, quantity: line.quantity }) }, token);
      await medusaRequest(`/store/carts/${cartId}`, { method: "POST", body: JSON.stringify({ email: form.get("email"), shipping_address: { first_name: form.get("first_name"), last_name: form.get("last_name"), phone: form.get("phone"), address_1: form.get("address_1"), address_2: form.get("barangay"), city: form.get("city"), province: form.get("province"), postal_code: form.get("postal_code"), country_code: "ph" } }) }, token);
      const shipping = await medusaRequest<{ shipping_options: Array<{ id: string }> }>(`/store/shipping-options?cart_id=${cartId}`, {}, token);
      if (!shipping.shipping_options[0]) throw new Error("No shipping option is available for this address.");
      await medusaRequest(`/store/carts/${cartId}/shipping-methods`, { method: "POST", body: JSON.stringify({ option_id: shipping.shipping_options[0].id }) }, token);
      const response = await fetch("/api/paymongo/checkout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ cart_id: cartId }) });
      const payment = await response.json();
      if (!response.ok || !payment.checkout_url) throw new Error(payment.message || "Unable to start QR Ph payment.");
      window.location.assign(payment.checkout_url);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to start checkout.");
      setPending(false);
    }
  }

  return <section className="checkout-card checkout-premium">
    <header className="checkout-heading"><Link className="continue-shopping-button" href="/shop">← Continue shopping</Link><span>Secure checkout</span><h1>Complete your order</h1><p>Enter your delivery details, review your items, then continue to QR Ph payment.</p></header>
    <div className="checkout-layout">
      <form onSubmit={placeOrder}>
        <div className="checkout-section-title"><b>1</b><div><h2>Delivery information</h2><p>Where should we send your KM Beauty order?</p></div></div>
        <div className="auth-name-grid"><label>First name<input name="first_name" autoComplete="given-name" required /></label><label>Last name<input name="last_name" autoComplete="family-name" required /></label></div>
        <label>Email address<input name="email" type="email" autoComplete="email" required /></label><label>Mobile number<input name="phone" autoComplete="tel" required /></label><label>Street address<input name="address_1" autoComplete="street-address" required /></label><label>Barangay<input name="barangay" required /></label>
        <div className="auth-name-grid"><label>City / Municipality<input name="city" autoComplete="address-level2" required /></label><label>Province<input name="province" autoComplete="address-level1" required /></label></div><label>Postal code<input name="postal_code" inputMode="numeric" autoComplete="postal-code" required /></label>
        <div className="checkout-payment-method"><div className="qrph-mark">QR</div><div><small>Payment method</small><strong>QR Ph via PayMongo</strong><p>Scan using GCash, Maya, or a participating banking app.</p></div><b>Selected</b></div>
        <button disabled={pending || !lines.length} type="submit">{pending ? "Preparing secure payment…" : `Continue to QR Ph · ${peso.format(total)}`}</button>
        <small className="checkout-secure-note">You’ll be redirected to PayMongo’s secure QR Ph payment page.</small>
      </form>
      <aside>
        <div className="checkout-summary-head"><div><span>Order summary</span><h2>{lines.reduce((sum, line) => sum + line.quantity, 0)} items</h2></div><Link href="/shop">Edit cart</Link></div>
        <div className="checkout-items">{lines.length ? lines.map((line) => <article className="checkout-line" key={line.variantId}><div className="checkout-line-image"><img src={line.image || "/assets/hero-sunblush-clean.png"} alt="" /><b>{line.quantity}</b></div><div><strong>{line.name}</strong><small>{peso.format(line.price)} each</small></div><em>{peso.format(line.price * line.quantity)}</em></article>) : <div className="checkout-empty"><b>Your cart is empty.</b><Link href="/shop">Browse products</Link></div>}</div>
        <dl className="checkout-totals"><div><dt>Products subtotal</dt><dd>{peso.format(subtotal)}</dd></div><div><dt>Shipping fee</dt><dd>{peso.format(lines.length ? SHIPPING_FEE : 0)}</dd></div><div><dt>Total</dt><dd>{peso.format(total)}</dd></div></dl>
        <div className="checkout-shipping-note"><b>Standard delivery</b><span>Shipping is currently calculated at a flat ₱100.</span></div>
      </aside>
    </div>
    {message ? <p className="auth-message">{message}</p> : null}
  </section>;
}
