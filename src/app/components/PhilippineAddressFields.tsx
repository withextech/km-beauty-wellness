"use client";

import { useEffect, useState } from "react";

type Location = { code: string; name: string; postalCode?: string };
type AddressDefaults = { province?: string; city?: string; barangay?: string; postal_code?: string; address_1?: string };
const comparable = (value: string) => value.toLowerCase().replace(/^city of /, "").replace(/ city$/, "").replace(/[^a-z0-9]/g, "");

async function loadLocations(level: "provinces" | "cities" | "barangays", parent = "") {
  const response = await fetch(`/api/philippine-addresses?level=${level}${parent ? `&parent=${encodeURIComponent(parent)}` : ""}`);
  const payload = await response.json() as { items?: Location[]; message?: string };
  if (!response.ok) throw new Error(payload.message || "Unable to load address options.");
  return payload.items || [];
}

export function PhilippineAddressFields({ defaults = {} }: { defaults?: AddressDefaults }) {
  const [provinces, setProvinces] = useState<Location[]>([]), [cities, setCities] = useState<Location[]>([]), [barangays, setBarangays] = useState<Location[]>([]);
  const [province, setProvince] = useState(defaults.province || ""), [city, setCity] = useState(defaults.city || ""), [barangay, setBarangay] = useState(defaults.barangay || ""), [postalCode, setPostalCode] = useState(defaults.postal_code || "");
  const [provinceCode, setProvinceCode] = useState(""), [cityCode, setCityCode] = useState(""), [loading, setLoading] = useState(true), [error, setError] = useState("");

  useEffect(() => { loadLocations("provinces").then((items) => { setProvinces(items); const match = items.find((item) => comparable(item.name) === comparable(defaults.province || "")); if (match) setProvinceCode(match.code); }).catch((reason) => setError(reason.message)).finally(() => setLoading(false)); }, [defaults.province]);
  useEffect(() => { if (!provinceCode) { setCities([]); return; } setLoading(true); loadLocations("cities", provinceCode).then((items) => { setCities(items); const match = items.find((item) => comparable(item.name) === comparable(city)); if (match) setCityCode(match.code); }).catch((reason) => setError(reason.message)).finally(() => setLoading(false)); }, [provinceCode]);
  useEffect(() => { if (!cityCode) { setBarangays([]); return; } setLoading(true); loadLocations("barangays", cityCode).then(setBarangays).catch((reason) => setError(reason.message)).finally(() => setLoading(false)); }, [cityCode]);

  return <div className="ph-address-fields">
    <div className="auth-name-grid">
      <label>Province<select name="province" value={province} required disabled={loading && !provinces.length} onChange={(event) => { const selected = provinces.find((item) => item.name === event.target.value); setProvince(event.target.value); setProvinceCode(selected?.code || ""); setCity(""); setCityCode(""); setBarangay(""); setPostalCode(""); }}><option value="">Select province</option>{provinces.map((item) => <option key={item.code} value={item.name}>{item.name}</option>)}</select></label>
      <label>City / Municipality<select name="city" value={city} required disabled={!provinceCode || loading} onChange={(event) => { const selected = cities.find((item) => item.name === event.target.value); setCity(event.target.value); setCityCode(selected?.code || ""); setBarangay(""); setPostalCode(selected?.postalCode || ""); }}><option value="">{province ? "Select city / municipality" : "Select province first"}</option>{cities.map((item) => <option key={item.code} value={item.name}>{item.name}</option>)}</select></label>
    </div>
    <div className="auth-name-grid">
      <label>Barangay<select name="barangay" value={barangay} required disabled={!cityCode || loading} onChange={(event) => setBarangay(event.target.value)}><option value="">{city ? "Select barangay" : "Select city first"}</option>{barangays.map((item) => <option key={item.code} value={item.name}>{item.name}</option>)}</select></label>
      <label>ZIP Code<input name="postal_code" value={postalCode} onChange={(event) => setPostalCode(event.target.value)} inputMode="numeric" autoComplete="postal-code" required /></label>
    </div>
    <label>House/unit, street & delivery instructions<textarea name="address_1" defaultValue={defaults.address_1 || ""} autoComplete="street-address" placeholder="House or unit number, street, subdivision, landmark, or special delivery instructions" required /></label>
    {error ? <p className="ph-address-error">{error} Please refresh and try again.</p> : null}
    <style jsx>{`.ph-address-fields{display:grid;gap:14px}.ph-address-fields select,.ph-address-fields textarea{width:100%;min-height:46px;border:1px solid rgba(39,92,105,.16);border-radius:11px;background:#fbfdfd;color:#355b63;font-size:13px;padding:0 13px}.ph-address-fields textarea{min-height:88px;padding:12px 13px;line-height:1.5;resize:vertical}.ph-address-fields select:disabled{background:#edf3f3;color:#849497;cursor:wait}.ph-address-fields select:focus,.ph-address-fields textarea:focus{border-color:#63bac5;outline:3px solid rgba(99,186,197,.13)}.ph-address-error{margin:0;border-radius:10px;background:#fff1ec;color:#a44d38;padding:10px 12px;font-size:10px;font-weight:750;line-height:1.45}`}</style>
  </div>;
}
