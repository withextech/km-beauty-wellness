import { MEDUSA_PUBLISHABLE_KEY, MEDUSA_URL } from "./medusa-config";

export { MEDUSA_URL };
export const PUBLISHABLE_KEY = MEDUSA_PUBLISHABLE_KEY;

export async function medusaRequest<T>(path: string, init: RequestInit = {}, token?: string): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${MEDUSA_URL}${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        "x-publishable-api-key": PUBLISHABLE_KEY,
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(init.headers || {}),
      },
    });
  } catch {
    throw new Error("Customer service is temporarily unavailable. Please try again in a moment.");
  }
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || data.error || "Request failed");
  return data as T;
}

export function customerToken() {
  return typeof window === "undefined" ? "" : localStorage.getItem("km-customer-token") || "";
}
