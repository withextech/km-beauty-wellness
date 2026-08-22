"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type DummyOrder = {
  display_id: number;
  subtotal: number;
  shipping_total: number;
  total: number;
  items: Array<{ id: string; title: string; quantity: number; unit_price: number; thumbnail?: string | null }>;
};

const peso = new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" });

export default function CheckoutSuccessPage() {
  const [order, setOrder] = useState<DummyOrder | null>(null);

  useEffect(() => {
    localStorage.removeItem("km-cart");
    try {
      const requested = new URLSearchParams(window.location.search).get("order");
      const orders = JSON.parse(localStorage.getItem("km-dummy-orders") || "[]") as DummyOrder[];
      setOrder(orders.find((item) => String(item.display_id) === requested) || orders[0] || null);
    } catch { setOrder(null); }
  }, []);

  return <main className="checkout-page checkout-confirmation-page">
    <section className="checkout-confirmation">
      <div className="checkout-confirmation-hero"><div className="checkout-confirmation-check">✓</div><span>Dummy payment successful</span><h1>Thank you for your order!</h1><p>Your simulated payment has been recorded. The order is ready for testing in your customer account.</p>{order ? <strong>Order #{order.display_id}</strong> : null}</div>
      {order ? <div className="checkout-confirmation-summary">
        <header><div><span>Order summary</span><h2>{order.items.reduce((sum, item) => sum + item.quantity, 0)} items</h2></div><b>Paid</b></header>
        <div className="confirmation-items">{order.items.map((item) => <article key={item.id}><div><img src={item.thumbnail || "/assets/hero-sunblush-clean.png"} alt="" /><b>{item.quantity}</b></div><section><strong>{item.title}</strong><small>{peso.format(item.unit_price)} each</small></section><em>{peso.format(item.unit_price * item.quantity)}</em></article>)}</div>
        <dl><div><dt>Products subtotal</dt><dd>{peso.format(order.subtotal)}</dd></div>{order.shipping_total > 0 ? <div><dt>Shipping</dt><dd>{peso.format(order.shipping_total)}</dd></div> : null}<div><dt>Total paid</dt><dd>{peso.format(order.total)}</dd></div></dl>
      </div> : <div className="checkout-confirmation-summary confirmation-processing"><p>Your order details are being prepared.</p></div>}
      <div className="checkout-confirmation-actions"><Link href="/account">View My Orders</Link><Link href="/shop">Back to Shop</Link></div>
      <small className="checkout-confirmation-note">Test mode only — no real payment was collected.</small>
    </section>
  </main>;
}
