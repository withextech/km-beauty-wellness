import { MEDUSA_PUBLISHABLE_KEY as PUBLISHABLE_KEY, MEDUSA_URL } from "./medusa-config";

export async function serverMedusaRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${MEDUSA_URL}${path}`, {
    ...init,
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
      "x-publishable-api-key": PUBLISHABLE_KEY,
      ...(init.headers || {}),
    },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = data && typeof data === "object" && "message" in data ? String(data.message) : "Commerce request failed";
    throw new Error(message);
  }
  return data as T;
}
