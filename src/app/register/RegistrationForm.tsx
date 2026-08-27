"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { medusaRequest } from "../lib/browser-medusa";

export function RegistrationForm() {
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setPending(true); setMessage("");
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const email = String(form.get("email") || "").trim().toLowerCase();
    try {
      const auth = await medusaRequest<{ token: string }>("/auth/customer/emailpass/register", { method: "POST", body: JSON.stringify({ email, password: form.get("password") }) });
      await medusaRequest("/store/customers", { method: "POST", body: JSON.stringify({ email, first_name: form.get("first_name"), last_name: form.get("last_name"), phone: form.get("phone") }) }, auth.token);
      const linkedAuth = await medusaRequest<{ token: string }>("/auth/customer/emailpass", { method: "POST", body: JSON.stringify({ email, password: form.get("password") }) });
      localStorage.setItem("km-customer-token", linkedAuth.token);
      window.location.href = "/account";
    } catch (error) { setMessage(error instanceof Error ? error.message : "Registration failed."); }
    finally { setPending(false); }
  }
  return <section className="auth-card"><Link className="auth-logo" href="/"><img src="/assets/km-logo-cropped.png" alt="KM Beauty & Wellness" /></Link><span className="eyebrow">Customer account</span><h1>Create your account</h1><p>Create an account to track orders and save your delivery details.</p><form onSubmit={submit}><div className="auth-name-grid"><label>First name<input name="first_name" required /></label><label>Last name<input name="last_name" required /></label></div><label>Email address<input name="email" type="email" required /></label><label>Mobile number<input name="phone" type="tel" required /></label><label>Password<input minLength={8} name="password" type="password" required /></label><button disabled={pending} type="submit">{pending ? "Creating…" : "Create account"}</button></form>{message ? <p className="auth-message">{message}</p> : null}<p>Already registered? <Link href="/login">Log in</Link></p></section>;
}
