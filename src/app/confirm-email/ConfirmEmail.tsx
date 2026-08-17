"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { medusaRequest } from "../lib/browser-medusa";
export function ConfirmEmail() {
  const params = useSearchParams(); const [message, setMessage] = useState("Confirming your email…"); const [ok, setOk] = useState(false);
  useEffect(() => { const token = params.get("token") || ""; medusaRequest("/store/customer-verification/confirm", { method: "POST", body: JSON.stringify({ token }) }).then(() => { setOk(true); setMessage("Your email is confirmed. You can now log in."); }).catch((error) => setMessage(error instanceof Error ? error.message : "Confirmation failed.")); }, [params]);
  return <section className="auth-card"><h1>Email confirmation</h1><p className="auth-message">{message}</p>{ok ? <Link className="auth-primary-link" href="/login">Continue to login</Link> : <Link href="/register">Register again</Link>}</section>;
}
