import type { Metadata } from "next";
import Script from "next/script";

export const metadata: Metadata = {
  title: "Contact | KM Beauty & Wellness",
};

const contactMarkup = `
  <header class="header shop-header">
    <a href="/" class="logo" aria-label="KM Beauty and Wellness">
      <img src="/assets/km-logo-cropped.png" alt="KM Kat Melendez">
      <b>BEAUTY & WELLNESS</b>
    </a>
    <nav aria-label="Main navigation">
      <a href="/">Home</a>
      <a href="/shop">Shop</a>
      <a href="/contact">Contact Us</a>
      <a href="/account">Account</a>
    </nav>
    <div class="actions">
      <button class="icon-action" type="button" aria-label="Search products" data-open-search>
        <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5"></circle><path d="M15.5 15.5 21 21"></path></svg>
      </button>
      <button class="icon-action" type="button" aria-label="Customer account" data-open-account>
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4.8 20.2c1.4-3.1 3.9-4.7 7.2-4.7s5.8 1.6 7.2 4.7"></path><circle cx="12" cy="8.2" r="4.2"></circle></svg>
      </button>
      <button class="icon-action bag-action" type="button" aria-label="Shopping cart" data-open-cart>
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6.8 8.5h10.4l.8 11H6L6.8 8.5Z"></path><path d="M9 8.5V7a3 3 0 0 1 6 0v1.5"></path></svg>
        <span data-cart-count>0</span>
      </button>
      <button class="menu" type="button" aria-label="Menu">☰</button>
    </div>
  </header>

  <main>
    <section class="contact-hero">
      <div>
        <span>Need help choosing your glow?</span>
        <h1>Contact Us</h1>
        <p>Ask about products, orders, reseller inquiries, or the right routine for your skin goals.</p>
      </div>
      <img src="/assets/card-herskin.jpg" alt="KM Beauty customer care">
    </section>

    <section class="contact-info-strip" aria-label="Contact information">
      <div class="contact-details">
        <article>
          <span>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s7-5.1 7-11.2A7 7 0 0 0 5 9.8C5 15.9 12 21 12 21Z"></path><circle cx="12" cy="9.8" r="2.4"></circle></svg>
          </span>
          <h2>Address</h2>
          <p>Cavite, Philippines</p>
        </article>
        <article>
          <span>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6.6 4.5 9 4l1.5 4-1.6 1.1a11.5 11.5 0 0 0 6 6l1.1-1.6 4 1.5-.5 2.4c-.2 1-1.1 1.7-2.1 1.6C10.2 18.5 5.5 13.8 5 6.6c-.1-1 .6-1.9 1.6-2.1Z"></path></svg>
          </span>
          <h2>Phone</h2>
          <p>+63 900 000 0000</p>
        </article>
        <article>
          <span>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6.5h16v11H4z"></path><path d="m4 7 8 6 8-6"></path></svg>
          </span>
          <h2>Email</h2>
          <p>hello@kmbeautywellness.com</p>
        </article>
      </div>
    </section>

    <section class="contact-shell" aria-label="Message KM Beauty">
      <div class="contact-form-panel">
        <div>
          <span>Send a message</span>
          <h2>Let us help you find the right products.</h2>
        </div>
        <form class="contact-form">
          <div class="field-row">
            <label>First name<input type="text" placeholder="Your first name"></label>
            <label>Last name<input type="text" placeholder="Your last name"></label>
          </div>
          <label>Email address<input type="email" placeholder="you@example.com"></label>
          <label>Topic<select>
            <option>Product recommendation</option>
            <option>Order inquiry</option>
            <option>Reseller inquiry</option>
            <option>Brand partnership</option>
          </select></label>
          <label>Message<textarea placeholder="Tell us what you need help with"></textarea></label>
          <button type="submit">Submit Message</button>
        </form>
      </div>
    </section>

    <section class="contact-map">
      <div>
        <span>Follow the glow</span>
        <h2>Message us for orders, stocks, and product tips.</h2>
      </div>
      <div class="social-strip">
        <a href="#" aria-label="Facebook">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 8.2V6.8c0-.8.6-1.3 1.4-1.3H17V3h-2.3C12.5 3 11 4.5 11 6.7v1.5H8.8V11H11v10h3V11h2.4l.4-2.8H14Z"></path></svg>
        </a>
        <a href="#" aria-label="Instagram">
          <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="4" width="16" height="16" rx="4"></rect><circle cx="12" cy="12" r="3.5"></circle><circle cx="16.8" cy="7.2" r=".7"></circle></svg>
        </a>
        <a href="#" aria-label="TikTok">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 4v10.1a3.7 3.7 0 1 1-3.7-3.7c.4 0 .8.1 1.2.2v3a1.3 1.3 0 1 0 .9 1.2V4h1.6c.5 2.4 2 3.9 4.3 4.3v3A7.1 7.1 0 0 1 14 9.5"></path></svg>
        </a>
      </div>
    </section>
  </main>

  <footer>
    <div>
      <img src="/assets/km-logo-cropped.png" alt="KM Beauty & Wellness">
    </div>
    <nav aria-label="Footer navigation">
      <a href="/">Home</a>
      <a href="/shop">Shop</a>
      <a href="/contact">Contact</a>
    </nav>
  </footer>

  <button class="floating-cart" type="button" aria-label="Shopping cart" aria-live="polite">
    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6.8 8.5h10.4l.8 11H6L6.8 8.5Z"></path><path d="M9 8.5V7a3 3 0 0 1 6 0v1.5"></path></svg>
    <b data-cart-count>0</b>
  </button>

  <div class="overlay" data-overlay></div>

  <section class="search-panel" aria-label="Search products" data-search-panel>
    <form action="/shop">
      <input type="search" placeholder="Search KM products">
      <button type="submit">Search</button>
    </form>
    <button class="panel-close" type="button" aria-label="Close search" data-close-panels>×</button>
  </section>

  <aside class="cart-drawer" aria-label="Shopping cart" data-cart-drawer>
    <button class="panel-close" type="button" aria-label="Close cart" data-close-panels>×</button>
    <span>Your Cart</span>
    <h2>Shopping Bag</h2>
    <div class="cart-lines" data-cart-lines><p>Your cart is empty.</p></div>
    <div class="order-summary" data-cart-summary>
      <h3>Order Summary</h3>
      <div><small>Items</small><strong data-cart-items-total>0</strong></div>
      <div><small>Subtotal</small><strong data-cart-subtotal>₱0.00</strong></div>
      <div><small>Shipping</small><strong>Calculated at checkout</strong></div>
    </div>
    <div class="cart-summary"><small>Total</small><strong data-cart-total>₱0.00</strong></div>
    <a class="checkout-button" href="/checkout">Checkout</a>
  </aside>`;

export default function Page() {
  return (
    <>
      <div className="contact-page" dangerouslySetInnerHTML={{ __html: contactMarkup }} />
      <Script src="/glowhouse-app.js" strategy="afterInteractive" />
    </>
  );
}
