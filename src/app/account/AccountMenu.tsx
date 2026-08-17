"use client";

import { useState } from "react";

export function AccountMenu() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="account-menu">
      <button
        className="account-avatar-button"
        type="button"
        aria-label="Open account menu"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((current) => !current)}
      >
        ♙
      </button>
      {isOpen ? (
        <div className="account-dropdown">
          <div className="account-dropdown-head"><b>Customer account</b></div>
          <a href="/account">Profile and orders</a>
          <div className="account-menu-divider" />
          <a href="/contact?topic=faq">FAQ</a>
          <a href="/terms">Terms and Conditions</a>
          <button className="account-menu-support" type="button">Chat support</button>
          <div className="account-menu-divider" />
          <button className="account-menu-logout" type="button" onClick={() => { localStorage.removeItem("km-customer-token"); window.location.href = "/login"; }}>Logout</button>
        </div>
      ) : null}
    </div>
  );
}
