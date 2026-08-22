"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { medusaRequest } from "../lib/browser-medusa";

type PopoverPosition = { right: number; top: number };

export function StoreAccountAccess() {
  const [loginOpen, setLoginOpen] = useState(false);
  const [registerOpen, setRegisterOpen] = useState(false);
  const [position, setPosition] = useState<PopoverPosition>({ right: 18, top: 76 });
  const [loginMessage, setLoginMessage] = useState("");
  const [registerMessage, setRegisterMessage] = useState("");
  const [developmentUrl, setDevelopmentUrl] = useState("");
  const [pending, setPending] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const showLogin = (trigger: HTMLElement) => {
      const bounds = trigger.getBoundingClientRect();
      setPosition({
        right: Math.max(12, window.innerWidth - bounds.right),
        top: bounds.bottom + 10,
      });
      setRegisterOpen(false);
      setLoginOpen(true);
    };

    const openLogin = (event: MouseEvent) => {
      const trigger = (event.target as Element).closest<HTMLElement>("[data-open-account]");
      if (!trigger) return;

      event.preventDefault();
      if (localStorage.getItem("km-customer-token")) {
        window.location.href = "/account";
        return;
      }

      if (loginOpen) {
        setLoginOpen(false);
      } else {
        showLogin(trigger);
      }
    };

    const openFromAccountPage = (event: Event) => {
      const trigger = (event as CustomEvent<{ trigger: HTMLElement }>).detail?.trigger;
      if (trigger) showLogin(trigger);
    };

    const closeOutside = (event: MouseEvent) => {
      if (
        loginOpen &&
        !popoverRef.current?.contains(event.target as Node) &&
        !(event.target as Element).closest("[data-open-account]")
      ) {
        setLoginOpen(false);
      }
    };

    document.addEventListener("click", openLogin);
    document.addEventListener("click", closeOutside);
    document.addEventListener("km-open-customer-login", openFromAccountPage);
    return () => {
      document.removeEventListener("click", openLogin);
      document.removeEventListener("click", closeOutside);
      document.removeEventListener("km-open-customer-login", openFromAccountPage);
    };
  }, [loginOpen]);

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setLoginOpen(false);
        setRegisterOpen(false);
      }
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, []);

  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setLoginMessage("");
    const form = new FormData(event.currentTarget);

    try {
      const auth = await medusaRequest<{ token: string }>("/auth/customer/emailpass", {
        method: "POST",
        body: JSON.stringify({ email: form.get("email"), password: form.get("password") }),
      });
      const data = await medusaRequest<{
        customer: { metadata?: { email_verified?: boolean } };
      }>("/store/customers/me", {}, auth.token);

      if (!data.customer.metadata?.email_verified) {
        throw new Error("Confirm your email address before logging in.");
      }

      localStorage.setItem("km-customer-token", auth.token);
      window.location.href = "/account";
    } catch (error) {
      setLoginMessage(error instanceof Error ? error.message : "Login failed.");
      setPending(false);
    }
  }

  async function register(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setRegisterMessage("");
    setDevelopmentUrl("");
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const email = String(form.get("email") || "").trim().toLowerCase();

    try {
      const auth = await medusaRequest<{ token: string }>("/auth/customer/emailpass/register", {
        method: "POST",
        body: JSON.stringify({ email, password: form.get("password") }),
      });
      await medusaRequest(
        "/store/customers",
        {
          method: "POST",
          body: JSON.stringify({
            email,
            first_name: form.get("first_name"),
            last_name: form.get("last_name"),
            phone: form.get("phone"),
          }),
        },
        auth.token,
      );
      const linkedAuth = await medusaRequest<{ token: string }>(
        "/auth/customer/emailpass",
        {
          method: "POST",
          body: JSON.stringify({ email, password: form.get("password") }),
        },
      );
      const result = await medusaRequest<{ development_url?: string }>(
        "/store/customer-verification/request",
        { method: "POST", body: "{}" },
        linkedAuth.token,
      );
      setDevelopmentUrl(result.development_url || "");
      setRegisterMessage("Registration successful. Check your email to confirm your account.");
      formElement.reset();
    } catch (error) {
      setRegisterMessage(error instanceof Error ? error.message : "Registration failed.");
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <div
        className={`store-login-popover ${loginOpen ? "open" : ""}`}
        ref={popoverRef}
        style={{ right: position.right, top: position.top }}
      >
        <span className="eyebrow">Customer account</span>
        <h2>Log in</h2>
        <form onSubmit={login}>
          <label>
            Email address
            <input autoComplete="email" name="email" required type="email" />
          </label>
          <label>
            Password
            <input autoComplete="current-password" name="password" required type="password" />
          </label>
          <button disabled={pending} type="submit">
            {pending ? "Signing in…" : "Log in"}
          </button>
        </form>
        {loginMessage ? <p className="store-account-message">{loginMessage}</p> : null}
        <p className="store-account-switch">
          Don&apos;t have an account?{" "}
          <button
            onClick={() => {
              setLoginOpen(false);
              setRegisterOpen(true);
            }}
            type="button"
          >
            Register
          </button>
        </p>
      </div>

      {registerOpen ? (
        <div className="store-register-backdrop" role="presentation" onMouseDown={() => setRegisterOpen(false)}>
          <section
            aria-labelledby="store-register-title"
            aria-modal="true"
            className="store-register-modal"
            onMouseDown={(event) => event.stopPropagation()}
            role="dialog"
          >
            <button
              aria-label="Close registration"
              className="store-account-close"
              onClick={() => setRegisterOpen(false)}
              type="button"
            >
              ×
            </button>
            <span className="eyebrow">New customer</span>
            <h2 id="store-register-title">Create your account</h2>
            <p className="store-register-intro">We’ll email you a confirmation link to activate it.</p>
            <form onSubmit={register}>
              <div className="store-register-names">
                <label>First name<input name="first_name" required /></label>
                <label>Last name<input name="last_name" required /></label>
              </div>
              <label>Email address<input autoComplete="email" name="email" required type="email" /></label>
              <label>Mobile number<input autoComplete="tel" name="phone" required type="tel" /></label>
              <label>Password<input autoComplete="new-password" minLength={8} name="password" required type="password" /></label>
              <button disabled={pending} type="submit">{pending ? "Creating…" : "Create account"}</button>
            </form>
            {registerMessage ? <p className="store-account-message">{registerMessage}</p> : null}
            {developmentUrl ? <a className="development-link" href={developmentUrl}>Open confirmation link (development only)</a> : null}
            <p className="store-account-switch">Already registered? <button onClick={() => { setRegisterOpen(false); setLoginOpen(true); }} type="button">Log in</button></p>
          </section>
        </div>
      ) : null}
    </>
  );
}
