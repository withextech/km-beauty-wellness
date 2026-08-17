"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { customerToken, medusaRequest } from "../lib/browser-medusa";

type Order = {
  id: string; display_id: number; created_at: string; total: number; currency_code: string; fulfillment_status: string;
  items?: Array<{ id: string; title: string; quantity: number }>;
  fulfillments?: Array<{ labels?: Array<{ tracking_number?: string }> }>;
};
type Customer = { first_name?: string; last_name?: string; email: string; phone?: string };

export function AccountPortal() {
  const [customer, setCustomer] = useState<Customer | null>(null); const [orders, setOrders] = useState<Order[]>([]); const [message, setMessage] = useState("Log in to view your profile and orders.");
  useEffect(() => {
    const token = customerToken();
    if (!token) return;
    Promise.all([
      medusaRequest<{ customer: Customer }>("/store/customers/me", {}, token),
      medusaRequest<{ orders: Order[] }>("/store/orders?limit=100&order=-created_at&fields=id,display_id,created_at,total,currency_code,fulfillment_status,*items,*fulfillments,*fulfillments.labels", {}, token),
    ]).then(([profile, orderData]) => { setCustomer(profile.customer); setOrders(orderData.orders || []); setMessage(""); }).catch((error) => { setMessage(error instanceof Error ? error.message : "Unable to load your account."); });
  }, []);
  if (!customer) return <main className="account-page"><section className="account-hero"><span>KM Beauty account</span><h1>Welcome</h1><p>Sign in to review orders and tracking, or create a confirmed customer account.</p></section><section className="account-shell"><div className="account-entry-grid"><Link className="account-entry-card" href="/login"><span>Returning customer</span><h2>Log in</h2><p>Access your profile, orders, and J&amp;T tracking links.</p><strong>Continue to login →</strong></Link><Link className="account-entry-card register" href="/register"><span>New customer</span><h2>Create an account</h2><p>Register once and confirm your email address securely.</p><strong>Register now →</strong></Link></div>{message && message !== "Log in to view your profile and orders." ? <p className="auth-message">{message}</p> : null}</section></main>;
  return <main className="account-page"><section className="account-hero"><span>Customer portal</span><h1>Hello, {customer.first_name || "there"}</h1><p>{customer.email}{customer.phone ? ` · ${customer.phone}` : ""}</p></section><section className="account-shell"><div className="account-card order-list"><h2>Your orders</h2>{orders.length ? orders.map((order) => { const tracking = order.fulfillments?.flatMap((fulfillment) => fulfillment.labels || []).find((label) => label.tracking_number)?.tracking_number; return <article className="customer-order" key={order.id}><header><div><b>Order #{order.display_id}</b><small>{new Date(order.created_at).toLocaleString("en-PH")}</small></div><span className="portal-status">{order.fulfillment_status || "Processing"}</span></header><div>{order.items?.map((item) => <p key={item.id}>{item.quantity} × {item.title}</p>)}</div><footer><strong>{new Intl.NumberFormat("en-PH", { style: "currency", currency: order.currency_code.toUpperCase() }).format(order.total)}</strong>{tracking ? <a href={`https://www.jtexpress.ph/trajectoryQuery?waybillNo=${encodeURIComponent(tracking)}`} rel="noreferrer" target="_blank">Track with J&amp;T ↗</a> : <span>Tracking will appear after shipment</span>}</footer></article>; }) : <div className="empty-orders"><b>No orders yet</b><p>Your completed website orders will appear here.</p><Link href="/shop">Start shopping</Link></div>}</div></section></main>;
}
