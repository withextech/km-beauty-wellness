import type { Metadata } from "next";
import Link from "next/link";
import Script from "next/script";
import { AccountMenu } from "./AccountMenu";
import { AccountPortal } from "./AccountPortal";

export const metadata: Metadata = {
  title: "My Account | KM Beauty & Wellness",
};

function StoreHeader() {
  return (
    <>
      <header className="header shop-header account-header">
        <Link href="/" className="logo" aria-label="KM Beauty and Wellness">
          <img src="/assets/km-logo-cropped.png" alt="KM Kat Melendez" />
          <b>BEAUTY & WELLNESS</b>
        </Link>
        <nav aria-label="Main navigation">
          <Link href="/">Home</Link>
          <Link href="/shop">Shop</Link>
        </nav>
        <div className="actions">
          <button className="icon-action" type="button" aria-label="Search products" data-open-search>
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <circle cx="10.5" cy="10.5" r="6.5" />
              <path d="M15.5 15.5 21 21" />
            </svg>
          </button>
          <button className="icon-action bag-action" type="button" aria-label="Shopping cart" data-open-cart>
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M6.8 8.5h10.4l.8 11H6L6.8 8.5Z" />
              <path d="M9 8.5V7a3 3 0 0 1 6 0v1.5" />
            </svg>
            <span data-cart-count>0</span>
          </button>
          <AccountMenu />
          <button className="menu" type="button" aria-label="Menu">☰</button>
        </div>
      </header>

      <div className="overlay" data-overlay />

      <aside className="cart-drawer" aria-label="Shopping cart" data-cart-drawer>
        <button className="panel-close" type="button" aria-label="Close cart" data-close-panels>×</button>
        <span>Your Cart</span>
        <h2>Shopping Bag</h2>
        <div className="cart-lines" data-cart-lines><p>Your cart is empty.</p></div>
        <div className="order-summary" data-cart-summary>
          <h3>Order Summary</h3>
          <div><small>Items</small><strong data-cart-items-total>0</strong></div>
          <div><small>Subtotal</small><strong data-cart-subtotal>₱0.00</strong></div>
          <div><small>Shipping</small><strong>Calculated at checkout</strong></div>
        </div>
        <div className="cart-summary"><small>Total</small><strong data-cart-total>₱0.00</strong></div>
        <Link className="checkout-button" href="/checkout">Checkout</Link>
      </aside>
    </>
  );
}

export default function Page() {
  return (
    <>
      <StoreHeader />
      <AccountPortal />
      <Script src="/glowhouse-app.js" strategy="afterInteractive" />
    </>
  );
}
