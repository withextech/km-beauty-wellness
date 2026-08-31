"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { customerToken, medusaRequest, MEDUSA_URL, PUBLISHABLE_KEY } from "../lib/browser-medusa";
import { PhilippineAddressFields } from "../components/PhilippineAddressFields";

type Address = {
  id?: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  address_1?: string;
  address_2?: string;
  city?: string;
  province?: string;
  postal_code?: string;
  country_code?: string;
  is_default_shipping?: boolean;
};

type Order = {
  id: string;
  display_id: number;
  created_at: string;
  total: number;
  subtotal?: number;
  shipping_total?: number;
  discount_total?: number;
  currency_code: string;
  fulfillment_status: string;
  payment_status?: string;
  shipping_address?: Address;
  items?: Array<{ id: string; product_id?: string | null; variant_id?: string | null; title: string; quantity: number; unit_price?: number; thumbnail?: string | null }>;
  fulfillments?: Array<{
    created_at?: string;
    shipped_at?: string;
    delivered_at?: string;
    labels?: Array<{ tracking_number?: string; tracking_url?: string }>;
  }>;
};

type Customer = { first_name?: string; last_name?: string; email: string; phone?: string; addresses?: Address[] };
type OrderItem = NonNullable<Order["items"]>[number];
type Filter = "all" | "to-pay" | "to-ship" | "to-receive" | "to-review" | "returns";

const PAGE_SIZE = 10;

const previewOrders: Order[] = [
  {
    id: "preview-1", display_id: 58291, created_at: "2026-08-21T09:20:00Z", total: 1780, subtotal: 1680, shipping_total: 100, discount_total: 0, currency_code: "PHP", fulfillment_status: "shipped", payment_status: "captured",
    shipping_address: { first_name: "Mika", last_name: "Santos", phone: "+63 917 480 1182", address_1: "Unit 8B, Greenbelt Residences", city: "Makati City", province: "Metro Manila", postal_code: "1223" },
    items: [{ id: "preview-item-1", title: "Sun Defense SPF45 50g", quantity: 2, unit_price: 790, thumbnail: "/assets/hero-sunblush-clean.png" }, { id: "preview-item-2", title: "Secret Glow Water Gel Hydrator", quantity: 1, unit_price: 100 }],
    fulfillments: [{ shipped_at: "2026-08-21T12:00:00Z", labels: [{ tracking_number: "JT89274410PH" }] }],
  },
  {
    id: "preview-2", display_id: 58264, created_at: "2026-08-19T04:10:00Z", total: 1260, subtotal: 1260, shipping_total: 0, currency_code: "PHP", fulfillment_status: "not_fulfilled", payment_status: "captured",
    items: [{ id: "preview-item-3", title: "Daily Glow Brightening Set", quantity: 1, unit_price: 1260 }],
  },
  {
    id: "preview-3", display_id: 57122, created_at: "2026-08-08T02:30:00Z", total: 940, subtotal: 940, shipping_total: 0, currency_code: "PHP", fulfillment_status: "delivered", payment_status: "captured",
    items: [{ id: "preview-item-4", title: "Barrier Repair Night Cream", quantity: 2, unit_price: 470 }],
  },
];

const filters: Array<{ id: Filter; label: string; icon: string }> = [
  { id: "all", label: "All", icon: "▤" },
  { id: "to-pay", label: "To Pay", icon: "₱" },
  { id: "to-ship", label: "To Ship", icon: "▣" },
  { id: "to-receive", label: "To Receive", icon: "⌁" },
  { id: "to-review", label: "To Review", icon: "☆" },
  { id: "returns", label: "Returns", icon: "↶" },
];

function statusFor(order: Order): Filter {
  const fulfillment = (order.fulfillment_status || "").toLowerCase();
  const payment = (order.payment_status || "").toLowerCase();
  if (payment === "not_paid" || payment === "awaiting") return "to-pay";
  if (["delivered"].includes(fulfillment)) return "to-review";
  if (["shipped", "partially_shipped"].includes(fulfillment)) return "to-receive";
  if (["canceled", "returned", "partially_returned"].includes(fulfillment)) return "returns";
  return "to-ship";
}

function statusLabel(order: Order) {
  const status = statusFor(order);
  return filters.find((item) => item.id === status)?.label || "Processing";
}

function money(value: number | undefined, currency = "PHP") {
  return new Intl.NumberFormat("en-PH", { style: "currency", currency: currency.toUpperCase() }).format(value || 0);
}

function orderDate(value: string) {
  return new Intl.DateTimeFormat("en-PH", { month: "short", day: "numeric", year: "numeric" }).format(new Date(value));
}

function dummyOrders(): Order[] {
  try {
    const stored = JSON.parse(localStorage.getItem("km-dummy-orders") || "[]");
    return Array.isArray(stored) ? stored : [];
  } catch {
    return [];
  }
}

function trackingFor(order: Order) {
  return order.fulfillments?.flatMap((fulfillment) => fulfillment.labels || []).find((label) => label.tracking_number);
}

function deliverySteps(order: Order) {
  const status = statusFor(order);
  const progress = status === "to-review" ? 4 : status === "to-receive" ? 3 : status === "to-ship" ? 2 : 1;
  return [
    { label: "Order placed", detail: orderDate(order.created_at) },
    { label: "Preparing to ship", detail: progress >= 2 ? "Seller is preparing your parcel" : "Waiting for payment" },
    { label: "Parcel shipped", detail: progress >= 3 ? "Your parcel is with the courier" : "Tracking will appear here" },
    { label: "Delivered", detail: progress >= 4 ? "Parcel received" : "Pending delivery" },
  ].map((step, index) => ({ ...step, done: index < progress, active: index === progress - 1 }));
}

export function AccountPortal() {
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [message, setMessage] = useState("Log in to view your profile and orders.");
  const [activeFilter, setActiveFilter] = useState<Filter>("all");
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [reviewItem, setReviewItem] = useState<{ item: OrderItem; order: Order } | null>(null);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [view, setView] = useState<"orders" | "profile">("orders");

  const fetchOrders = useCallback(async (nextOffset: number, token: string) => {
    const fields = "id,display_id,created_at,total,subtotal,shipping_total,discount_total,currency_code,fulfillment_status,payment_status,*items,*fulfillments,*fulfillments.labels,*shipping_address";
    return medusaRequest<{ orders: Order[]; count?: number }>(`/store/orders?limit=${PAGE_SIZE}&offset=${nextOffset}&order=-created_at&fields=${fields}`, {}, token);
  }, []);

  useEffect(() => {
    const token = customerToken();
    if (!token) {
      if (process.env.NODE_ENV === "development" && window.location.search.includes("preview=1")) {
        queueMicrotask(() => {
          setCustomer({ first_name: "Mika", last_name: "Santos", email: "mika@example.com", phone: "+63 917 480 1182" });
          setOrders([...dummyOrders(), ...previewOrders]);
          setOffset(previewOrders.length);
          setMessage("");
        });
      }
      const timer = window.setTimeout(() => {
        const trigger = document.querySelector<HTMLElement>(".account-avatar-button, [data-open-account]");
        if (trigger) document.dispatchEvent(new CustomEvent("km-open-customer-login", { detail: { trigger } }));
      }, 100);
      return () => window.clearTimeout(timer);
    }
    const requestedView = new URLSearchParams(window.location.search).get("view") === "profile" ? "profile" : "orders";
    Promise.all([
      medusaRequest<{ customer: Customer }>("/store/customers/me?fields=*addresses", {}, token),
      fetchOrders(0, token),
    ]).then(([profile, orderData]) => {
      setView(requestedView);
      const firstPage = orderData.orders || [];
      setCustomer(profile.customer);
      setOrders([...dummyOrders(), ...firstPage]);
      setOffset(firstPage.length);
      setHasMore(firstPage.length === PAGE_SIZE && (orderData.count === undefined || firstPage.length < orderData.count));
      setMessage("");
    }).catch((error) => {
      const errorMessage = error instanceof Error ? error.message : "Unable to load your account.";
      const invalidSession = /unauthorized|not authenticated|invalid token|jwt/i.test(errorMessage);
      if (!invalidSession) {
        setMessage(errorMessage);
        return;
      }
      localStorage.removeItem("km-customer-token");
      setCustomer(null);
      setMessage("Log in to view your profile and orders.");
      window.setTimeout(() => {
        const trigger = document.querySelector<HTMLElement>(".account-avatar-button, [data-open-account]");
        if (trigger) document.dispatchEvent(new CustomEvent("km-open-customer-login", { detail: { trigger } }));
      }, 0);
    });
  }, [fetchOrders]);

  useEffect(() => {
    document.body.style.overflow = selectedOrder || reviewItem ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [reviewItem, selectedOrder]);

  const filteredOrders = useMemo(() => activeFilter === "all" ? orders : orders.filter((order) => statusFor(order) === activeFilter), [activeFilter, orders]);
  const counts = useMemo(() => Object.fromEntries(filters.map((filter) => [filter.id, filter.id === "all" ? orders.length : orders.filter((order) => statusFor(order) === filter.id).length])), [orders]);

  async function loadMore() {
    const token = customerToken();
    if (!token || loadingMore) return;
    setLoadingMore(true);
    try {
      const orderData = await fetchOrders(offset, token);
      const nextOrders = orderData.orders || [];
      setOrders((current) => [...current, ...nextOrders.filter((order) => !current.some((existing) => existing.id === order.id))]);
      setOffset((current) => current + nextOrders.length);
      setHasMore(nextOrders.length === PAGE_SIZE && (orderData.count === undefined || offset + nextOrders.length < orderData.count));
    } finally {
      setLoadingMore(false);
    }
  }

  if (!customer) {
    return (
      <main className="account-page account-signed-out">
        <section className="account-login-panel">
          <span className="account-login-icon">◎</span>
          <p>KM Beauty account</p>
          <h1>Track every order in one place</h1>
          <p>Sign in to see delivery updates, purchases, returns, points, and coupons.</p>
          <div><button type="button" data-open-account>Log in or register</button></div>
          {message !== "Log in to view your profile and orders." ? <small className="auth-message">{message}</small> : null}
        </section>
      </main>
    );
  }

  return (
    <main className="account-page shop-account-page">
      <section className="shop-account-shell">
        <nav className="account-portal-tabs" aria-label="Customer account sections">
          <button className={view === "orders" ? "active" : ""} onClick={() => setView("orders")} type="button">My orders</button>
          <button className={view === "profile" ? "active" : ""} onClick={() => setView("profile")} type="button">Profile settings</button>
        </nav>
        {view === "profile" ? <ProfileSettings customer={customer} onSaved={setCustomer} /> : <>
        <header className="shop-account-heading">
          <div><span>Order center</span><h1>My Orders</h1></div>
          <Link href="/shop">Continue shopping <span aria-hidden="true">›</span></Link>
        </header>

        <nav className="shop-order-filters" aria-label="Filter orders">
          {filters.map((filter) => (
            <button key={filter.id} type="button" className={activeFilter === filter.id ? "active" : ""} onClick={() => setActiveFilter(filter.id)}>
              <i aria-hidden="true">{filter.icon}</i><span>{filter.label}</span>{counts[filter.id] ? <b>{counts[filter.id]}</b> : null}
            </button>
          ))}
        </nav>

        <section className="shop-order-feed" aria-live="polite">
          {filteredOrders.length ? filteredOrders.map((order) => {
            const tracking = trackingFor(order);
            const firstItem = order.items?.[0];
            const remainingItems = Math.max((order.items?.length || 0) - 1, 0);
            return (
              <article className="shop-order-card" key={order.id}>
                <header>
                  <div><strong>Order #{order.display_id}</strong><span>{orderDate(order.created_at)}</span></div>
                  <span className={`shop-status ${statusFor(order)}`}>{statusLabel(order)}</span>
                </header>
                <button className="shop-order-summary" type="button" onClick={() => setSelectedOrder(order)} aria-label={`View Order ${order.display_id}`}>
                  <div className="shop-order-thumb">{firstItem?.thumbnail ? <img src={firstItem.thumbnail} alt="" /> : <span>KM</span>}</div>
                  <div className="shop-order-copy">
                    <h2>{firstItem?.title || "KM Beauty order"}</h2>
                    <p>{firstItem ? `Qty ${firstItem.quantity}` : "Order details"}{remainingItems ? ` · +${remainingItems} more item${remainingItems > 1 ? "s" : ""}` : ""}</p>
                    {tracking ? <small><i aria-hidden="true">⌁</i> J&amp;T: {tracking.tracking_number}</small> : <small>Seller is preparing your order</small>}
                  </div>
                  <div className="shop-order-price"><span>Total</span><strong>{money(order.total, order.currency_code)}</strong></div>
                </button>
                <footer>
                  <p>{statusFor(order) === "to-receive" ? "Parcel is on the way" : statusFor(order) === "to-review" ? "Order delivered" : "We’ll update you when the status changes"}</p>
                  <div>
                    <Link href={`/contact?order=${order.display_id}`}>Need help?</Link>
                    <button type="button" onClick={() => setSelectedOrder(order)}>{tracking ? "Track order" : "View details"}</button>
                  </div>
                </footer>
              </article>
            );
          }) : (
            <div className="shop-empty-orders"><span>▤</span><h2>No orders here yet</h2><p>Your orders will appear under the right status as they move through delivery.</p><Link href="/shop">Shop now</Link></div>
          )}
          {hasMore && activeFilter === "all" ? <button className="shop-load-more" type="button" onClick={loadMore} disabled={loadingMore}>{loadingMore ? "Loading orders…" : "Load more orders"}</button> : null}
        </section>
        </>}
      </section>

      {selectedOrder ? <OrderDrawer order={selectedOrder} onClose={() => setSelectedOrder(null)} onReview={(item) => setReviewItem({ item, order: selectedOrder })} /> : null}
      {reviewItem ? <AccountReviewModal customer={customer} item={reviewItem.item} order={reviewItem.order} onClose={() => setReviewItem(null)} /> : null}
    </main>
  );
}

function ProfileSettings({ customer, onSaved }: { customer: Customer; onSaved: (customer: Customer) => void }) {
  const savedAddress = customer.addresses?.find((address) => address.is_default_shipping) || customer.addresses?.[0];
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const token = customerToken();
    if (!token) return;
    setPending(true);
    setMessage("");
    const form = new FormData(event.currentTarget);
    const profile = { first_name: String(form.get("first_name") || "").trim(), last_name: String(form.get("last_name") || "").trim(), phone: String(form.get("phone") || "").trim() };
    const address = { first_name: profile.first_name, last_name: profile.last_name, phone: profile.phone, address_1: String(form.get("address_1") || "").trim(), address_2: String(form.get("barangay") || "").trim(), city: String(form.get("city") || "").trim(), province: String(form.get("province") || "").trim(), postal_code: String(form.get("postal_code") || "").trim(), country_code: "ph", is_default_shipping: true };
    try {
      await medusaRequest("/store/customers/me", { method: "POST", body: JSON.stringify(profile) }, token);
      if (savedAddress?.id) await medusaRequest(`/store/customers/me/addresses/${savedAddress.id}`, { method: "POST", body: JSON.stringify(address) }, token);
      else await medusaRequest("/store/customers/me/addresses", { method: "POST", body: JSON.stringify(address) }, token);
      const refreshed = await medusaRequest<{ customer: Customer }>("/store/customers/me?fields=*addresses", {}, token);
      onSaved(refreshed.customer);
      setMessage("Profile and delivery details saved.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Unable to save your profile."); }
    finally { setPending(false); }
  }

  return <section className="profile-settings">
    <header><span>My account</span><h1>Profile settings</h1><p>These details will be ready for you during checkout.</p></header>
    <form onSubmit={saveProfile}>
      <div className="profile-form-section"><h2>Contact details</h2><p>Used for order updates and delivery coordination.</p></div>
      <div className="auth-name-grid"><label>First name<input name="first_name" defaultValue={customer.first_name || ""} required /></label><label>Last name<input name="last_name" defaultValue={customer.last_name || ""} required /></label></div>
      <label>Email address<input value={customer.email} disabled type="email" /><small>Your verified login email cannot be changed here.</small></label>
      <label>Mobile number<input name="phone" defaultValue={customer.phone || savedAddress?.phone || ""} autoComplete="tel" required /></label>
      <div className="profile-form-section"><h2>Default delivery address</h2><p>You can still choose a different recipient or address at checkout.</p></div>
      <PhilippineAddressFields defaults={{ address_1: savedAddress?.address_1, barangay: savedAddress?.address_2, city: savedAddress?.city, province: savedAddress?.province, postal_code: savedAddress?.postal_code }} />
      <button disabled={pending} type="submit">{pending ? "Saving..." : "Save profile"}</button>
      {message ? <p className="auth-message">{message}</p> : null}
    </form>
  </section>;
}

function OrderDrawer({ order, onClose, onReview }: { order: Order; onClose: () => void; onReview: (item: OrderItem) => void }) {
  const tracking = trackingFor(order);
  const address = order.shipping_address;
  const recipient = [address?.first_name, address?.last_name].filter(Boolean).join(" ");
  const addressLine = [address?.address_1, address?.address_2, address?.city, address?.province, address?.postal_code].filter(Boolean).join(", ");
  const subtotal = order.subtotal ?? order.items?.reduce((sum, item) => sum + (item.unit_price || 0) * item.quantity, 0) ?? order.total;

  return (
    <div className="order-drawer-backdrop" role="presentation" onMouseDown={(event) => { if (event.currentTarget === event.target) onClose(); }}>
      <aside className="order-drawer" role="dialog" aria-modal="true" aria-label={`Order ${order.display_id} details`}>
        <header className="order-drawer-head">
          <button type="button" onClick={onClose} aria-label="Close order details">×</button>
          <div><span>Order #{order.display_id}</span><strong>{statusLabel(order)}</strong></div>
          <Link href={`/contact?order=${order.display_id}`}>Need help?</Link>
        </header>

        <section className="drawer-tracking-card">
          <div className="drawer-tracking-title"><span aria-hidden="true">⌁</span><div><strong>{statusFor(order) === "to-receive" ? "Your parcel is on the way" : statusFor(order) === "to-review" ? "Order delivered" : "Order is being prepared"}</strong><small>Latest update · {orderDate(order.created_at)}</small></div></div>
          <ol>{deliverySteps(order).map((step) => <li key={step.label} className={`${step.done ? "done" : ""} ${step.active ? "active" : ""}`}><i /><div><b>{step.label}</b><small>{step.detail}</small></div></li>)}</ol>
          {tracking ? <a className="drawer-track-link" href={tracking.tracking_url || `https://www.jtexpress.ph/trajectoryQuery?waybillNo=${encodeURIComponent(tracking.tracking_number || "")}`} target="_blank" rel="noreferrer"><span>J&amp;T Express · {tracking.tracking_number}</span><b>Track on J&amp;T ↗</b></a> : <p className="drawer-track-pending">Tracking number will appear once the courier receives your parcel.</p>}
        </section>

        <section className="drawer-section drawer-delivery"><h2>Delivery details</h2><dl><div><dt>Deliver to</dt><dd>{recipient || "Customer"}</dd></div><div><dt>Contact</dt><dd>{address?.phone || "Not provided"}</dd></div><div><dt>Address</dt><dd>{addressLine || "Delivery address unavailable"}</dd></div></dl></section>

        <section className="drawer-section"><h2>Items</h2><div className="drawer-items">{order.items?.map((item) => <article key={item.id}><div className="drawer-item-thumb">{item.thumbnail ? <img src={item.thumbnail} alt="" /> : <span>KM</span>}</div><div><strong>{item.title}</strong><small>Qty {item.quantity}</small>{statusFor(order) === "to-review" ? <button className="delivered-review-button" type="button" onClick={() => onReview(item)}>Write a review</button> : null}</div><b>{item.unit_price === undefined ? "" : money(item.unit_price * item.quantity, order.currency_code)}</b></article>)}</div></section>

        <section className="drawer-section drawer-total"><h2>Order total</h2><dl><div><dt>Items subtotal</dt><dd>{money(subtotal, order.currency_code)}</dd></div><div><dt>Shipping fee</dt><dd>{money(order.shipping_total, order.currency_code)}</dd></div>{order.discount_total ? <div><dt>Discount</dt><dd>-{money(order.discount_total, order.currency_code)}</dd></div> : null}<div className="drawer-grand-total"><dt>Total</dt><dd>{money(order.total, order.currency_code)}</dd></div></dl></section>
      </aside>
    </div>
  );
}

function AccountReviewModal({ customer, item, order, onClose }: { customer: Customer; item: OrderItem; order: Order; onClose: () => void }) {
  const [rating, setRating] = useState(5);
  const [submitted, setSubmitted] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const productId = item.product_id || item.variant_id || item.id;

  async function submitReview(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const comment = String(form.get("comment") || "").trim();
    if (comment.length < 10) return;
    setPending(true); setError("");
    form.set("product_id", productId); form.set("product_title", item.title); form.set("order_id", order.id); form.set("order_item_id", item.id); form.set("rating", String(rating));
    try {
      const response = await fetch(`${MEDUSA_URL}/store/reviews`, { method: "POST", headers: { "x-publishable-api-key": PUBLISHABLE_KEY, Authorization: `Bearer ${customerToken()}` }, body: form });
      const result = await response.json().catch(() => ({})); if (!response.ok) throw new Error(result.message || "Unable to submit review."); setSubmitted(true);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Unable to submit review."); }
    finally { setPending(false); }
  }

  return <div className="account-review-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <section className="account-review-modal" role="dialog" aria-modal="true" aria-labelledby="account-review-title">
      <button className="account-review-close" type="button" onClick={onClose} aria-label="Close review form">×</button>
      <span>Verified purchase · Order #{order.display_id}</span>
      <h2 id="account-review-title">Review {item.title}</h2>
      {submitted ? <div className="account-review-thanks"><b>Thank you for your review!</b><p>Your review was submitted and will appear after approval.</p><button type="button" onClick={onClose}>Done</button></div> : <form onSubmit={submitReview}>
        <fieldset><legend>Your rating</legend><div className="product-review-stars">{[1, 2, 3, 4, 5].map((value) => <button aria-label={`${value} star${value === 1 ? "" : "s"}`} className={value <= rating ? "active" : ""} key={value} onClick={() => setRating(value)} type="button">★</button>)}</div></fieldset>
        <label>Your review<textarea name="comment" minLength={10} placeholder="Tell other customers about the product, texture, and results…" required /></label>
        <label>Photos <small>Optional · up to 5 images</small><input accept="image/*" multiple name="images" type="file" /></label>{error ? <p className="auth-message">{error}</p> : null}
        <button disabled={pending} type="submit">{pending ? "Submitting…" : "Submit verified review"}</button>
      </form>}
    </section>
  </div>;
}
