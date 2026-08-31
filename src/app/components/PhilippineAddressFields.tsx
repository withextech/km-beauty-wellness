"use client";

import { KeyboardEvent, useEffect, useMemo, useRef, useState } from "react";

type Location = { code: string; name: string; postalCode?: string };
type AddressDefaults = { province?: string; city?: string; barangay?: string; postal_code?: string; address_1?: string };
type AddressDropdownProps = { disabled?: boolean; label: string; loading?: boolean; name: string; onChange: (location: Location) => void; options: Location[]; placeholder: string; value: string };
const comparable = (value: string) => value.toLowerCase().replace(/^city of /, "").replace(/ city$/, "").replace(/[^a-z0-9]/g, "");

async function loadLocations(level: "provinces" | "cities" | "barangays", parent = "") {
  const response = await fetch(`/api/philippine-addresses?level=${level}${parent ? `&parent=${encodeURIComponent(parent)}` : ""}`);
  const payload = await response.json() as { items?: Location[]; message?: string };
  if (!response.ok) throw new Error(payload.message || "Unable to load address options.");
  return payload.items || [];
}

function AddressDropdown({ disabled, label, loading, name, onChange, options, placeholder, value }: AddressDropdownProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const filtered = useMemo(() => options.filter((item) => item.name.toLowerCase().includes(query.trim().toLowerCase())), [options, query]);

  useEffect(() => {
    const close = (event: MouseEvent) => { if (!rootRef.current?.contains(event.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  useEffect(() => {
    if (!open) return;
    setQuery("");
    setActiveIndex(Math.max(0, options.findIndex((item) => item.name === value)));
    requestAnimationFrame(() => searchRef.current?.focus());
  }, [open, options, value]);

  const choose = (item: Location) => {
    onChange(item);
    setOpen(false);
  };

  const handleKeys = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key === "Escape") { setOpen(false); return; }
    if (!open && ["Enter", " ", "ArrowDown"].includes(event.key)) { event.preventDefault(); setOpen(true); return; }
    if (!open || !filtered.length) return;
    if (event.key === "ArrowDown") { event.preventDefault(); setActiveIndex((current) => (current + 1) % filtered.length); }
    if (event.key === "ArrowUp") { event.preventDefault(); setActiveIndex((current) => (current - 1 + filtered.length) % filtered.length); }
    if (event.key === "Enter") { event.preventDefault(); choose(filtered[Math.min(activeIndex, filtered.length - 1)]); }
  };

  return <div className="address-dropdown-field" ref={rootRef}>
    <span className="address-dropdown-label">{label}</span>
    <input className="address-dropdown-required" name={name} onChange={() => undefined} onInvalid={() => setOpen(true)} required tabIndex={-1} value={value} />
    <button aria-expanded={open} aria-haspopup="listbox" className={`address-dropdown-trigger ${open ? "open" : ""}`} disabled={disabled || loading} onClick={() => setOpen((current) => !current)} onKeyDown={handleKeys} type="button">
      <span className={value ? "selected" : "placeholder"}>{loading ? "Loading options…" : value || placeholder}</span>
      {loading ? <i className="address-dropdown-loader" /> : <svg aria-hidden="true" viewBox="0 0 20 20"><path d="m5 7 5 5 5-5" /></svg>}
    </button>
    {open ? <div className="address-dropdown-panel">
      <div className="address-dropdown-search"><svg aria-hidden="true" viewBox="0 0 20 20"><circle cx="8.5" cy="8.5" r="5.5" /><path d="m13 13 4 4" /></svg><input aria-label={`Search ${label}`} onChange={(event) => { setQuery(event.target.value); setActiveIndex(0); }} onKeyDown={handleKeys} placeholder={`Search ${label.toLowerCase()}…`} ref={searchRef} value={query} /></div>
      <div aria-label={label} className="address-dropdown-options" role="listbox">
        {filtered.length ? filtered.map((item, index) => <button aria-selected={item.name === value} className={`${item.name === value ? "selected" : ""} ${index === activeIndex ? "active" : ""}`} key={item.code} onClick={() => choose(item)} onMouseEnter={() => setActiveIndex(index)} role="option" type="button"><span>{item.name}</span>{item.name === value ? <svg aria-hidden="true" viewBox="0 0 20 20"><path d="m4 10 4 4 8-8" /></svg> : null}</button>) : <p>No matching locations found.</p>}
      </div>
    </div> : null}
  </div>;
}

export function PhilippineAddressFields({ defaults = {} }: { defaults?: AddressDefaults }) {
  const [provinces, setProvinces] = useState<Location[]>([]), [cities, setCities] = useState<Location[]>([]), [barangays, setBarangays] = useState<Location[]>([]);
  const [province, setProvince] = useState(defaults.province || ""), [city, setCity] = useState(defaults.city || ""), [barangay, setBarangay] = useState(defaults.barangay || ""), [postalCode, setPostalCode] = useState(defaults.postal_code || "");
  const [provinceCode, setProvinceCode] = useState(""), [cityCode, setCityCode] = useState("");
  const [loadingProvinces, setLoadingProvinces] = useState(true), [loadingCities, setLoadingCities] = useState(false), [loadingBarangays, setLoadingBarangays] = useState(false), [error, setError] = useState("");

  useEffect(() => { loadLocations("provinces").then((items) => { setProvinces(items); const match = items.find((item) => comparable(item.name) === comparable(defaults.province || "")); if (match) setProvinceCode(match.code); }).catch((reason) => setError(reason.message)).finally(() => setLoadingProvinces(false)); }, [defaults.province]);
  useEffect(() => { if (!provinceCode) { setCities([]); return; } setLoadingCities(true); loadLocations("cities", provinceCode).then((items) => { setCities(items); const match = items.find((item) => comparable(item.name) === comparable(city)); if (match) setCityCode(match.code); }).catch((reason) => setError(reason.message)).finally(() => setLoadingCities(false)); }, [provinceCode]);
  useEffect(() => { if (!cityCode) { setBarangays([]); return; } setLoadingBarangays(true); loadLocations("barangays", cityCode).then(setBarangays).catch((reason) => setError(reason.message)).finally(() => setLoadingBarangays(false)); }, [cityCode]);

  return <div className="ph-address-fields">
    <div className="auth-name-grid">
      <AddressDropdown label="Province" loading={loadingProvinces} name="province" onChange={(selected) => { setProvince(selected.name); setProvinceCode(selected.code); setCity(""); setCityCode(""); setBarangay(""); setPostalCode(""); }} options={provinces} placeholder="Select province" value={province} />
      <AddressDropdown disabled={!provinceCode} label="City / Municipality" loading={loadingCities} name="city" onChange={(selected) => { setCity(selected.name); setCityCode(selected.code); setBarangay(""); setPostalCode(selected.postalCode || ""); }} options={cities} placeholder={province ? "Select city / municipality" : "Select province first"} value={city} />
    </div>
    <div className="auth-name-grid">
      <AddressDropdown disabled={!cityCode} label="Barangay" loading={loadingBarangays} name="barangay" onChange={(selected) => setBarangay(selected.name)} options={barangays} placeholder={city ? "Select barangay" : "Select city first"} value={barangay} />
      <label>ZIP Code<input name="postal_code" value={postalCode} onChange={(event) => setPostalCode(event.target.value)} inputMode="numeric" autoComplete="postal-code" required /></label>
    </div>
    <label>House/unit, street & delivery instructions<textarea name="address_1" defaultValue={defaults.address_1 || ""} autoComplete="street-address" placeholder="House or unit number, street, subdivision, landmark, or special delivery instructions" required /></label>
    {error ? <p className="ph-address-error">{error} Please refresh and try again.</p> : null}
    <style jsx global>{`.ph-address-fields{display:grid;gap:14px}.address-dropdown-field{position:relative;min-width:0}.address-dropdown-label{display:block;margin-bottom:6px;color:#496970;font-size:11px;font-weight:700}.address-dropdown-required{position:absolute!important;left:8px;bottom:3px;width:1px!important;height:1px!important;min-height:0!important;border:0!important;opacity:0;padding:0!important;pointer-events:none}.address-dropdown-trigger{display:flex!important;align-items:center!important;justify-content:space-between!important;gap:10px;width:100%;min-height:46px!important;border:1px solid rgba(39,92,105,.16)!important;border-radius:11px!important;background:#fbfdfd!important;color:#355b63!important;font-size:13px!important;font-weight:650!important;padding:0 12px!important;text-align:left;box-shadow:none!important}.address-dropdown-trigger:hover:not(:disabled),.address-dropdown-trigger.open{border-color:#63bac5!important;background:#fff!important;box-shadow:0 0 0 3px rgba(99,186,197,.12)!important}.address-dropdown-trigger:disabled{background:#edf3f3!important;color:#849497!important;cursor:not-allowed}.address-dropdown-trigger span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.address-dropdown-trigger .placeholder{color:#87999d;font-weight:550}.address-dropdown-trigger svg{flex:0 0 auto;width:18px!important;height:18px!important;fill:none;stroke:#477078;stroke-width:1.8;transition:transform .18s}.address-dropdown-trigger.open svg{transform:rotate(180deg)}.address-dropdown-loader{flex:0 0 auto;width:15px;height:15px;border:2px solid #bdd9dc;border-top-color:#327f89;border-radius:50%;animation:address-spin .65s linear infinite}.address-dropdown-panel{position:absolute;z-index:80;top:calc(100% + 7px);left:0;width:max(100%,280px);overflow:hidden;border:1px solid rgba(39,92,105,.14);border-radius:15px;background:#fff;box-shadow:0 18px 48px rgba(28,69,77,.18)}.address-dropdown-search{display:flex;align-items:center;gap:8px;margin:9px;border-radius:10px;background:#f1f8f9;padding:0 10px}.address-dropdown-search svg{flex:0 0 auto;width:16px!important;height:16px!important;fill:none;stroke:#66858b;stroke-width:1.7}.address-dropdown-search input{width:100%!important;min-height:38px!important;border:0!important;background:transparent!important;font-size:12px!important;outline:0!important;padding:0!important;box-shadow:none!important}.address-dropdown-options{max-height:230px;overflow:auto;padding:0 7px 8px;scrollbar-width:thin;scrollbar-color:#bfd7da transparent}.address-dropdown-options button{display:flex!important;align-items:center!important;justify-content:space-between!important;width:100%;min-height:38px!important;border:0!important;border-radius:9px!important;background:#fff!important;color:#47656b!important;font-size:12px!important;font-weight:650!important;padding:8px 10px!important;text-align:left}.address-dropdown-options button.active{background:#edf8f9!important;color:#285e69!important}.address-dropdown-options button.selected{color:#20717c!important;font-weight:850!important}.address-dropdown-options button svg{width:16px!important;height:16px!important;fill:none;stroke:#25828e;stroke-width:2}.address-dropdown-options p{margin:0;padding:18px;color:#819499;font-size:11px;text-align:center}.ph-address-fields textarea{width:100%;min-height:88px;border:1px solid rgba(39,92,105,.16);border-radius:11px;background:#fbfdfd;color:#355b63;font-size:13px;padding:12px 13px;line-height:1.5;resize:vertical}.ph-address-fields textarea:focus{border-color:#63bac5;outline:3px solid rgba(99,186,197,.13)}.ph-address-error{margin:0;border-radius:10px;background:#fff1ec;color:#a44d38;padding:10px 12px;font-size:10px;font-weight:750;line-height:1.45}@keyframes address-spin{to{transform:rotate(360deg)}}@media(max-width:700px){.address-dropdown-panel{width:100%}}`}</style>
  </div>;
}
