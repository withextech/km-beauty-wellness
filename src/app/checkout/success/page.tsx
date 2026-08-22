"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function CheckoutSuccessPage() {
  useEffect(() => localStorage.removeItem("km-cart"), []);
  return (
    <main className="checkout-page">
      <section className="checkout-card checkout-success">
        <h1>Payment recorded</h1>
        <p>Your checkout was completed successfully. You can now view the simulated order and its status in My Orders.</p>
        <Link className="auth-primary-link" href="/account">View your orders</Link>
      </section>
    </main>
  );
}
