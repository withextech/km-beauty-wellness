"use client";
import Link from "next/link";
import { FormEvent, useState } from "react";
import { medusaRequest } from "../lib/browser-medusa";

export function LoginForm() {
  const [message, setMessage] = useState(""); const [pending, setPending] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setPending(true); setMessage(""); const form = new FormData(event.currentTarget);
    try {
      const auth = await medusaRequest<{ token: string }>("/auth/customer/emailpass", { method: "POST", body: JSON.stringify({ email: form.get("email"), password: form.get("password") }) });
      const data = await medusaRequest<{ customer: { metadata?: { email_verified?: boolean } } }>("/store/customers/me", {}, auth.token);
      if (!data.customer.metadata?.email_verified) throw new Error("Confirm your email address before logging in.");
      localStorage.setItem("km-customer-token", auth.token); window.location.href = "/account";
    } catch (error) { setMessage(error instanceof Error ? error.message : "Login failed."); setPending(false); }
  }
  return <section className="auth-card"><Link className="auth-logo" href="/"><img src="/assets/km-logo-cropped.png" alt="KM Beauty & Wellness" /></Link><span className="eyebrow">Welcome back</span><h1>Log in</h1><form onSubmit={submit}><label>Email address<input name="email" type="email" required /></label><label>Password<input name="password" type="password" required /></label><button disabled={pending} type="submit">{pending ? "Signing in…" : "Log in"}</button></form>{message ? <p className="auth-message">{message}</p> : null}<p>New to KM Beauty? <Link href="/register">Create an account</Link></p></section>;
}
