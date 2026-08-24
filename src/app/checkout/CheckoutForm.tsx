"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { customerToken, medusaRequest } from "../lib/browser-medusa";
import { PhilippineAddressFields } from "../components/PhilippineAddressFields";

type CartLine = { variantId: string; name: string; image?: string; price: number; quantity: number };
type CheckoutAddress = { first_name?: string; last_name?: string; phone?: string; address_1?: string; address_2?: string; city?: string; province?: string; postal_code?: string; is_default_shipping?: boolean };
type CheckoutCustomer = { first_name?: string; last_name?: string; email: string; phone?: string; addresses?: CheckoutAddress[] };
const peso = new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" });

export function CheckoutForm() {
  const [lines, setLines] = useState<CartLine[]>([]);
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);
  const [dummyPayment, setDummyPayment] = useState<{ address: Record<string, string>; voucherCode: string; orderNumber: number } | null>(null);
  const [customer, setCustomer] = useState<CheckoutCustomer | null>(null);
  const [deliveryMode, setDeliveryMode] = useState<"profile" | "other">("other");

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      try {
        const stored = JSON.parse(localStorage.getItem("km-cart") || "[]") as CartLine[];
        setLines(stored.filter((line) => line.variantId && line.quantity > 0));
      } catch { setLines([]); }
    });
    return () => cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    const token = customerToken();
    if (!token) return;
    medusaRequest<{ customer: CheckoutCustomer }>("/store/customers/me?fields=*addresses", {}, token)
      .then(({ customer: profile }) => { setCustomer(profile); setDeliveryMode("profile"); })
      .catch(() => localStorage.removeItem("km-customer-token"));
  }, []);

  const subtotal = useMemo(() => lines.reduce((sum, line) => sum + line.price * line.quantity, 0), [lines]);
  const shippingFee = lines.length ? 100 : 0;
  const total = subtotal + shippingFee;
  const savedAddress = customer?.addresses?.find((address) => address.is_default_shipping) || customer?.addresses?.[0];
  const deliveryDefaults = deliveryMode === "profile" && customer ? {
    first_name: customer.first_name || savedAddress?.first_name || "", last_name: customer.last_name || savedAddress?.last_name || "", email: customer.email || "", phone: customer.phone || savedAddress?.phone || "", address_1: savedAddress?.address_1 || "", barangay: savedAddress?.address_2 || "", city: savedAddress?.city || "", province: savedAddress?.province || "", postal_code: savedAddress?.postal_code || "",
  } : { first_name: "", last_name: "", email: "", phone: "", address_1: "", barangay: "", city: "", province: "", postal_code: "" };

  function placeOrder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!lines.length) return;
    setPending(true); setMessage("");
    const form = new FormData(event.currentTarget);
    const address = Object.fromEntries(["first_name", "last_name", "email", "phone", "address_1", "barangay", "city", "province", "postal_code"].map((key) => [key, String(form.get(key) || "")]));
    const voucherCode = String(form.get("voucher_code") || "").trim().toUpperCase();
    setDummyPayment({ address, voucherCode, orderNumber: Number(String(Date.now()).slice(-6)) });
    setPending(false);
  }

  async function markDummyPaid() {
    if (!dummyPayment) return;
    setPending(true); setMessage("");
    try {
      const response = await fetch("/api/checkout/place-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address: dummyPayment.address, lines, voucher_code: dummyPayment.voucherCode, customer_token: localStorage.getItem("km-customer-token") || "" }),
      });
      const result = await response.json() as { display_id?: number | string; message?: string; order_id?: string };
      if (!response.ok || !result.order_id) throw new Error(result.message || "Unable to place your order.");
      const completedOrder = { id: result.order_id, display_id: result.display_id, created_at: new Date().toISOString(), total, subtotal, shipping_total: shippingFee, discount_total: 0, currency_code: "PHP", fulfillment_status: "not_fulfilled", payment_status: "authorized", shipping_address: { ...dummyPayment.address, address_2: dummyPayment.address.barangay }, items: lines.map((line, index) => ({ id: `item-${index}-${result.order_id}`, variant_id: line.variantId, title: line.name, quantity: line.quantity, unit_price: line.price, thumbnail: line.image || null })) };
      localStorage.setItem("km-dummy-orders", JSON.stringify([completedOrder]));
      localStorage.removeItem("km-cart");
      window.location.assign(`/checkout/success?order=${encodeURIComponent(String(result.display_id || result.order_id))}`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to place your order.");
      setDummyPayment(null);
      setPending(false);
    }
  }

  return <section className="checkout-card checkout-premium">
    <header className="checkout-heading"><Link className="continue-shopping-button" href="/shop">Continue shopping</Link><span>Secure checkout</span><h1>Complete your order</h1><p>Enter your delivery details, review your items, then continue to QR Ph payment.</p></header>
    <div className="checkout-layout">
      <form id="checkout-delivery-form" key={`${deliveryMode}-${customer?.email || "guest"}`} onSubmit={placeOrder}>
        <div className="checkout-section-title"><b>1</b><div><h2>Delivery information</h2><p>Where should we send your KM Beauty order?</p></div></div>
        {customer ? <div className="checkout-address-choice" role="radiogroup" aria-label="Delivery address choice"><button className={deliveryMode === "profile" ? "active" : ""} type="button" role="radio" aria-checked={deliveryMode === "profile"} onClick={() => setDeliveryMode("profile")}><b>Use saved profile</b><span>{savedAddress ? [savedAddress.address_1, savedAddress.city].filter(Boolean).join(", ") : "Complete your saved delivery address"}</span></button><button className={deliveryMode === "other" ? "active" : ""} type="button" role="radio" aria-checked={deliveryMode === "other"} onClick={() => setDeliveryMode("other")}><b>Ship to someone else</b><span>Enter another recipient and address</span></button></div> : null}
        {customer && deliveryMode === "profile" && !savedAddress ? <p className="checkout-profile-warning">Your profile has no saved address yet. Fill it in here or <Link href="/account?view=profile">save it in Profile Settings</Link>.</p> : null}
        <div className="auth-name-grid"><label>First name<input name="first_name" defaultValue={deliveryDefaults.first_name} autoComplete="given-name" required /></label><label>Last name<input name="last_name" defaultValue={deliveryDefaults.last_name} autoComplete="family-name" required /></label></div>
        <label>Email address<input name="email" defaultValue={deliveryDefaults.email} type="email" autoComplete="email" required /></label><label>Mobile number<input name="phone" defaultValue={deliveryDefaults.phone} autoComplete="tel" required /></label>
        <PhilippineAddressFields defaults={deliveryDefaults} />
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
        <label className="checkout-voucher-field"><span>Voucher code <small>Optional</small></span><div><input form="checkout-delivery-form" name="voucher_code" placeholder="Enter voucher code" autoCapitalize="characters" /><b>Applied when order is created</b></div></label>
        <dl className="checkout-totals"><div><dt>Subtotal</dt><dd>{peso.format(subtotal)}</dd></div><div><dt>Shipping fee</dt><dd>{peso.format(shippingFee)}</dd></div><div className="checkout-grand-total"><dt>Grand total</dt><dd>{peso.format(total)}</dd></div></dl>
      </aside>
    </div>
    {message ? <p className="auth-message">{message}</p> : null}
    {dummyPayment ? <div className="dummy-payment-backdrop" role="dialog" aria-modal="true" aria-labelledby="dummy-payment-title"><section className="dummy-payment-modal"><button disabled={pending} type="button" aria-label="Close dummy payment" onClick={() => setDummyPayment(null)}>×</button><img className="dummy-payment-logo" src="/assets/qrph-logo.svg" alt="QR Ph" /><span>Checkout test mode</span><h2 id="dummy-payment-title">Scan dummy QR</h2><p>This QR is for order simulation only. No real payment will be collected.</p><img className="dummy-qr-code" src="/assets/dummy-qr.svg" alt="Dummy QR code" /><dl><div><dt>Order</dt><dd>#{dummyPayment.orderNumber}</dd></div><div><dt>Amount</dt><dd>{peso.format(total)}</dd></div></dl><button className="dummy-paid-button" disabled={pending} type="button" onClick={markDummyPaid}>{pending ? "Creating order…" : "Mark as dummy paid"}</button></section></div> : null}
  </section>;
}
