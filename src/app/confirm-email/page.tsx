import { ConfirmEmail } from "./ConfirmEmail";
import { Suspense } from "react";
export default function ConfirmEmailPage() { return <main className="auth-page"><Suspense fallback={<section className="auth-card">Confirming your email…</section>}><ConfirmEmail /></Suspense></main>; }
