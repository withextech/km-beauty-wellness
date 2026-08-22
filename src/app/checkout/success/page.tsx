"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function CheckoutSuccessPage() {
  useEffect(() => localStorage.removeItem("km-cart"), []);
  return (
    <main className="checkout-page">
      <section className="checkout-card checkout-success">
        <h1>Payment received</h1>
        <p>Your QR Ph payment was submitted successfully. We’ll confirm the order as soon as PayMongo finishes verification.</p>
        <Link className="auth-primary-link" href="/account">View your orders</Link>
      </section>
    </main>
  );
}
