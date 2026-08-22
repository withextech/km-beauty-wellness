"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";

type CartLine = { variantId: string; name: string; image?: string; price: number; quantity: number };
const SHIPPING_FEE = 100;
const peso = new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" });

export function CheckoutForm() {
  const [lines, setLines] = useState<CartLine[]>([]);
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);
  const [dummyPayment, setDummyPayment] = useState<{ address: Record<string, string>; orderNumber: number } | null>(null);

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

  function placeOrder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!lines.length) return;
    setPending(true); setMessage("");
    const form = new FormData(event.currentTarget);
    const address = Object.fromEntries(["first_name", "last_name", "email", "phone", "address_1", "barangay", "city", "province", "postal_code"].map((key) => [key, String(form.get(key) || "")]));
    setDummyPayment({ address, orderNumber: Number(String(Date.now()).slice(-6)) });
    setPending(false);
  }

  function markDummyPaid() {
    if (!dummyPayment) return;
    const dummyOrder = { id: `dummy-${Date.now()}`, display_id: dummyPayment.orderNumber, created_at: new Date().toISOString(), total, subtotal, shipping_total: SHIPPING_FEE, discount_total: 0, currency_code: "PHP", fulfillment_status: "not_fulfilled", payment_status: "captured", shipping_address: { ...dummyPayment.address, address_2: dummyPayment.address.barangay }, items: lines.map((line, index) => ({ id: `dummy-item-${index}-${Date.now()}`, variant_id: line.variantId, title: line.name, quantity: line.quantity, unit_price: line.price, thumbnail: line.image || null })) };
    const stored = JSON.parse(localStorage.getItem("km-dummy-orders") || "[]");
    localStorage.setItem("km-dummy-orders", JSON.stringify([dummyOrder, ...(Array.isArray(stored) ? stored : [])]));
    localStorage.removeItem("km-cart");
    window.location.assign(`/checkout/success?dummy=1&order=${dummyPayment.orderNumber}`);
  }

  return <section className="checkout-card checkout-premium">
    <header className="checkout-heading"><Link className="continue-shopping-button" href="/shop">Continue shopping</Link><span>Secure checkout</span><h1>Complete your order</h1><p>Enter your delivery details, review your items, then continue to QR Ph payment.</p></header>
    <div className="checkout-layout">
      <form onSubmit={placeOrder}>
        <div className="checkout-section-title"><b>1</b><div><h2>Delivery information</h2><p>Where should we send your KM Beauty order?</p></div></div>
        <div className="auth-name-grid"><label>First name<input name="first_name" autoComplete="given-name" required /></label><label>Last name<input name="last_name" autoComplete="family-name" required /></label></div>
        <label>Email address<input name="email" type="email" autoComplete="email" required /></label><label>Mobile number<input name="phone" autoComplete="tel" required /></label><label>Street address<input name="address_1" autoComplete="street-address" required /></label><label>Barangay<input name="barangay" required /></label>
        <div className="auth-name-grid"><label>City / Municipality<input name="city" autoComplete="address-level2" required /></label><label>Province<input name="province" autoComplete="address-level1" required /></label></div><label>Postal code<input name="postal_code" inputMode="numeric" autoComplete="postal-code" required /></label>
        <div className="checkout-payment-options" aria-label="Payment method">
          <div className="checkout-payment-title"><span>2</span><div><strong>Payment method</strong><small>Choose how you want to pay</small></div></div>
          <div className="checkout-payment-method selected"><div className="qrph-mark"><img src="/assets/qrph-logo.svg" alt="QR Ph" /></div><div><strong>QR Ph</strong><p>Scan using GCash, Maya, or a participating banking app.</p></div><b>Selected</b></div>
          <div className="checkout-payment-method disabled" aria-disabled="true"><div className="cod-mark"><svg viewBox="0 0 48 48" aria-hidden="true"><rect x="5" y="12" width="38" height="25" rx="4" /><circle cx="24" cy="24.5" r="6" /><path d="M10 17c3 0 5-2 5-5M38 17c-3 0-5-2-5-5M10 32c3 0 5 2 5 5M38 32c-3 0-5 2-5 5" /></svg></div><div><strong>Cash on Delivery (COD)</strong><p>Payment upon delivery is not available yet.</p></div><b>Unavailable</b></div>
        </div>
        <button disabled={pending || !lines.length} type="submit">{pending ? "Preparing secure payment…" : `Continue to QR Ph · ${peso.format(total)}`}</button>
        <small className="checkout-secure-note">You’ll continue to a secure QR Ph payment page.</small>
      </form>
      <aside>
        <div className="checkout-summary-head"><div><span>Order summary</span><h2>{lines.reduce((sum, line) => sum + line.quantity, 0)} items</h2></div><Link href="/shop?cart=open">Edit cart</Link></div>
        <div className="checkout-items">{lines.length ? lines.map((line) => <article className="checkout-line" key={line.variantId}><div className="checkout-line-image"><img src={line.image || "/assets/hero-sunblush-clean.png"} alt="" /><b>{line.quantity}</b></div><div><strong>{line.name}</strong><small>{peso.format(line.price)} each</small></div><em>{peso.format(line.price * line.quantity)}</em></article>) : <div className="checkout-empty"><b>Your cart is empty.</b><Link href="/shop">Browse products</Link></div>}</div>
        <dl className="checkout-totals"><div><dt>Products subtotal</dt><dd>{peso.format(subtotal)}</dd></div><div><dt>Shipping fee</dt><dd>{peso.format(lines.length ? SHIPPING_FEE : 0)}</dd></div><div><dt>Total</dt><dd>{peso.format(total)}</dd></div></dl>
      </aside>
    </div>
    {message ? <p className="auth-message">{message}</p> : null}
    {dummyPayment ? <div className="dummy-payment-backdrop" role="dialog" aria-modal="true" aria-labelledby="dummy-payment-title"><section className="dummy-payment-modal"><button type="button" aria-label="Close dummy payment" onClick={() => setDummyPayment(null)}>×</button><img className="dummy-payment-logo" src="/assets/qrph-logo.svg" alt="QR Ph" /><span>Checkout test mode</span><h2 id="dummy-payment-title">Scan dummy QR</h2><p>This QR is for order simulation only. No real payment will be collected.</p><img className="dummy-qr-code" src="/assets/dummy-qr.svg" alt="Dummy QR code" /><dl><div><dt>Order</dt><dd>#{dummyPayment.orderNumber}</dd></div><div><dt>Amount</dt><dd>{peso.format(total)}</dd></div></dl><button className="dummy-paid-button" type="button" onClick={markDummyPaid}>Mark as dummy paid</button></section></div> : null}
  </section>;
}
