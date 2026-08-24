import { NextRequest } from "next/server";

type PsgcItem = { code?: string; name?: string; type?: string; zip_code?: string };
const endpoint = "https://psgc.cloud/api/v2";

function cleanName(value: string) {
  try { return decodeURIComponent(escape(value)); } catch { return value; }
}

export async function GET(request: NextRequest) {
  const level = request.nextUrl.searchParams.get("level") || "provinces";
  const parent = request.nextUrl.searchParams.get("parent") || "";
  if (!["provinces", "cities", "barangays"].includes(level)) return Response.json({ message: "Invalid address level." }, { status: 400 });
  if (level !== "provinces" && !/^\d{10}$/.test(parent)) return Response.json({ message: "Invalid parent location." }, { status: 400 });
  const path = level === "provinces" ? "/provinces" : level === "cities" ? `${parent === "1300000000" ? "/regions" : "/provinces"}/${parent}/cities-municipalities` : `/cities-municipalities/${parent}/barangays`;
  try {
    const response = await fetch(`${endpoint}${path}`, { next: { revalidate: 604800 } });
    if (!response.ok) throw new Error("PSGC service unavailable");
    const payload = await response.json() as { data?: PsgcItem[] };
    let items = (payload.data || []).filter((item) => item.code && item.name);
    if (level === "cities") items = items.filter((item) => item.type !== "SubMun");
    const normalized = items.map((item) => ({ code: item.code!, name: cleanName(item.name!), postalCode: item.zip_code || "" }));
    if (level === "provinces") normalized.push({ code: "1300000000", name: "Metro Manila", postalCode: "" });
    normalized.sort((a, b) => a.name.localeCompare(b.name));
    return Response.json({ items: normalized }, { headers: { "Cache-Control": "public, s-maxage=604800, stale-while-revalidate=86400" } });
  } catch {
    return Response.json({ message: "Unable to load Philippine address options." }, { status: 502 });
  }
}
