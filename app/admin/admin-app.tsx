"use client";

import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";
import { money, type PhoneVariant } from "@/lib/catalog";
import { sampleAdminInventory } from "@/lib/admin-sample";

type Tab = "inventory" | "stock" | "reports" | "suppliers" | "settings";

const emptyForm = { brand: "", model: "", sku: "", ramGb: "8", storageGb: "128", colour: "", colourHex: "#a9c4d4", condition: "New", networkType: "5G", mrp: "", sellingPrice: "", purchasePrice: "", minimumSellingPrice: "", availableStock: "0", reorderLevel: "2", imageUrl: "/phones/phone-silver.webp" };

function Brand({ compact = false }: { compact?: boolean }) {
  return <span className="brand-lockup"><span className="logo-mark"><span>₹</span></span><span>Mangla {!compact && <em>Communication</em>}</span></span>;
}

export default function AdminApp() {
  const [checking, setChecking] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [attempts, setAttempts] = useState(0);
  const [tab, setTab] = useState<Tab>("inventory");
  const [inventory, setInventory] = useState<PhoneVariant[]>(sampleAdminInventory);
  const [query, setQuery] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");

  const loadInventory = async () => {
    const response = await fetch("/api/admin/inventory", { cache: "no-store" });
    if (response.status === 401) { setAuthenticated(false); return; }
    const data = await response.json();
    if (Array.isArray(data.inventory)) setInventory(data.inventory);
  };

  useEffect(() => {
    fetch("/api/admin/session", { cache: "no-store" }).then(r => r.json()).then(data => {
      setAuthenticated(Boolean(data.authenticated));
      if (data.authenticated) void loadInventory();
    }).finally(() => setChecking(false));
  }, []);

  useEffect(() => {
    if (!authenticated) return;
    let timer = window.setTimeout(() => void logout(), 30 * 60 * 1000);
    const reset = () => { window.clearTimeout(timer); timer = window.setTimeout(() => void logout(), 30 * 60 * 1000); };
    ["pointerdown", "keydown"].forEach(name => window.addEventListener(name, reset));
    return () => { window.clearTimeout(timer); ["pointerdown", "keydown"].forEach(name => window.removeEventListener(name, reset)); };
  }, [authenticated]);

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(""), 2600);
    return () => clearTimeout(timer);
  }, [notice]);

  async function login(event: FormEvent) {
    event.preventDefault();
    if (attempts >= 5) { setLoginError("Too many attempts. Reload after a few minutes."); return; }
    setBusy(true); setLoginError("");
    try {
      const response = await fetch("/api/admin/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password }) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) { setAttempts(v => v + 1); setLoginError(data.error ?? "Unable to sign in. Please try again."); return; }
      setAuthenticated(true); setPassword(""); setAttempts(0); await loadInventory();
    } catch {
      setLoginError("Could not reach the server. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  async function logout() {
    await fetch("/api/admin/logout", { method: "POST" });
    setAuthenticated(false); setPassword("");
  }

  async function mutate(payload: Record<string, unknown>) {
    setBusy(true);
    const response = await fetch("/api/admin/inventory", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    const data = await response.json();
    setBusy(false);
    if (!response.ok) { setNotice(data.error ?? "Unable to save changes."); return false; }
    await loadInventory(); setNotice("Inventory updated successfully"); return true;
  }

  async function createItem(event: FormEvent) {
    event.preventDefault();
    const ok = await mutate({ action: "create", ...form, ramGb: Number(form.ramGb), storageGb: Number(form.storageGb), mrp: Number(form.mrp), sellingPrice: Number(form.sellingPrice), purchasePrice: Number(form.purchasePrice), minimumSellingPrice: Number(form.minimumSellingPrice), availableStock: Number(form.availableStock), reorderLevel: Number(form.reorderLevel) });
    if (ok) { setModalOpen(false); setForm(emptyForm); }
  }

  async function adjustStock(phone: PhoneVariant, direction?: number) {
    const raw = window.prompt(`Stock adjustment for ${phone.brand} ${phone.model}\nUse positive to add, negative to remove:`, direction ? String(direction) : "1");
    if (raw === null) return;
    const change = Number(raw);
    const reason = window.prompt("Reason for this stock change:", change > 0 ? "New stock received" : "Sale / stock correction");
    if (!reason) return;
    await mutate({ action: "adjustStock", id: phone.id, change, reason });
  }

  async function updatePrice(phone: PhoneVariant) {
    const raw = window.prompt(`New selling price for ${phone.brand} ${phone.model}:`, String(phone.sellingPrice));
    if (raw === null) return;
    await mutate({ action: "updatePrice", id: phone.id, sellingPrice: Number(raw), reason: "Quick price update" });
  }

  async function archive(phone: PhoneVariant) {
    if (!window.confirm(`Archive ${phone.brand} ${phone.model} (${phone.ramGb}/${phone.storageGb}, ${phone.colour})?`)) return;
    const confirmation = window.prompt("Re-enter the admin password to confirm destructive action:");
    if (!confirmation) return;
    const auth = await fetch("/api/admin/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password: confirmation }) });
    if (!auth.ok) { setNotice("Password confirmation failed"); return; }
    await mutate({ action: "archive", id: phone.id });
  }

  function exportCsv() {
    const fields = ["Brand", "Model", "SKU", "RAM GB", "Storage GB", "Colour", "Condition", "MRP", "Selling Price", "Stock", "Reserved"];
    const rows = inventory.map(p => [p.brand, p.model, p.sku ?? "", p.ramGb, p.storageGb, p.colour, p.condition, p.mrp, p.sellingPrice, p.availableStock, p.reservedStock]);
    const csv = [fields, ...rows].map(row => row.map(value => `"${String(value).replaceAll('"', '""')}"`).join(",")).join("\n");
    const link = document.createElement("a"); link.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" })); link.download = `mangla-communication-inventory-${new Date().toISOString().slice(0,10)}.csv`; link.click(); URL.revokeObjectURL(link.href);
  }

  async function importCsv(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    const lines = (await file.text()).split(/\r?\n/).filter(Boolean);
    const split = (line: string) => line.split(/,(?=(?:[^\"]*\"[^\"]*\")*[^\"]*$)/).map(value => value.replace(/^\"|\"$/g, "").replaceAll('""', '"').trim());
    const headers = split(lines.shift() ?? "").map(value => value.toLowerCase());
    const required = ["brand", "model", "ram gb", "storage gb", "colour", "mrp", "selling price"];
    if (!required.every(name => headers.includes(name))) { setNotice("CSV is missing required inventory columns"); return; }
    const rows = lines.map(split).filter(values => values.some(Boolean));
    if (!rows.length || !window.confirm(`Import ${rows.length} phone variant${rows.length === 1 ? "" : "s"}? Duplicate variants will be rejected.`)) return;
    setBusy(true);
    let imported = 0;
    for (const values of rows) {
      const row = Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""]));
      const response = await fetch("/api/admin/inventory", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "create", brand: row.brand, model: row.model, sku: row.sku, ramGb: Number(row["ram gb"]), storageGb: Number(row["storage gb"]), colour: row.colour, condition: row.condition || "New", mrp: Number(row.mrp), sellingPrice: Number(row["selling price"]), availableStock: Number(row.stock || 0), reorderLevel: 2 }) });
      if (response.ok) imported += 1;
    }
    setBusy(false); await loadInventory(); setNotice(`${imported} of ${rows.length} variants imported`);
  }

  const visible = useMemo(() => inventory.filter(p => `${p.brand} ${p.model} ${p.sku} ${p.colour}`.toLowerCase().includes(query.toLowerCase())), [inventory, query]);
  const totalStock = inventory.reduce((s, p) => s + p.availableStock, 0);
  const available = inventory.reduce((s, p) => s + Math.max(0, p.availableStock - p.reservedStock), 0);
  const lowStock = inventory.filter(p => p.availableStock - p.reservedStock <= p.reorderLevel).length;
  const costValue = inventory.reduce((s, p) => s + (p.purchasePrice ?? 0) * p.availableStock, 0);
  const retailValue = inventory.reduce((s, p) => s + p.sellingPrice * p.availableStock, 0);

  if (checking) return <div className="login-page"><div className="login-card"><Brand /><p>Checking secure session…</p></div></div>;
  if (!authenticated) return (
    <main className="login-page">
      <form className="login-card" onSubmit={login}>
        <Brand />
        <h1>Shop administration</h1>
        <p>Enter the shop password to manage private prices, stock and reports.</p>
        <label htmlFor="password">Admin password</label>
        <div className="password-field"><input id="password" type={showPassword ? "text" : "password"} inputMode="numeric" autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} required /><button type="button" onClick={() => setShowPassword(v => !v)}>{showPassword ? "Hide" : "Show"}</button></div>
        {loginError && <p className="login-error" role="alert">{loginError}</p>}
        <button className="primary-btn" disabled={busy || !password}>{busy ? "Checking…" : "Unlock inventory"}</button>
        {/* Full-page navigation avoids retaining a privileged client tree. */}
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
        <a href="/" className="login-back">← Return to public inventory</a>
      </form>
    </main>
  );

  const tabTitle = tab === "inventory" ? "Inventory" : tab === "stock" ? "Stock control" : tab === "reports" ? "Reports" : tab === "suppliers" ? "Suppliers" : "Shop settings";
  return (
    <main className="admin-shell">
      <header className="admin-topbar"><Brand compact /><span className="admin-badge">Administrator</span><div className="topbar-actions">
        {/* Full-page navigation avoids retaining a privileged client tree. */}
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
        <a href="/">View shop</a><button onClick={logout}>Lock & logout</button></div></header>
      <div className="admin-layout">
        <aside className="admin-sidebar" aria-label="Admin sections">
          {(["inventory", "stock", "reports", "suppliers", "settings"] as Tab[]).map(item => <button key={item} className={tab === item ? "active" : ""} onClick={() => setTab(item)}>{item === "inventory" ? "▦ Inventory" : item === "stock" ? "↕ Stock control" : item === "reports" ? "▥ Reports" : item === "suppliers" ? "♙ Suppliers" : "⚙ Settings"}</button>)}
        </aside>
        <section className="admin-main">
          <div className="admin-heading"><div><h1>{tabTitle}</h1><p>{tab === "inventory" ? "Manage every exact RAM, storage and colour variant." : tab === "stock" ? "Adjust stock with a permanent reason and audit trail." : tab === "reports" ? "Understand stock value, margin and attention items." : tab === "suppliers" ? "Private supplier records stay hidden from customers." : "Configure how your public shop catalogue behaves."}</p></div>{tab === "inventory" && <button className="primary-btn" onClick={() => setModalOpen(true)}>+ Add phone variant</button>}</div>
          <div className="admin-stats"><div className="admin-stat-card"><span>Total variants</span><strong>{inventory.length}</strong></div><div className="admin-stat-card"><span>Physical stock</span><strong>{totalStock}</strong></div><div className="admin-stat-card"><span>Available to sell</span><strong>{available}</strong></div><div className="admin-stat-card"><span>Low / out of stock</span><strong>{lowStock}</strong></div></div>

          {(tab === "inventory" || tab === "stock") && <div className="admin-panel"><div className="panel-tools"><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search model, SKU or colour" />{tab === "inventory" && <label className="secondary-btn import-btn">Import CSV<input type="file" accept=".csv,text/csv" onChange={importCsv} hidden /></label>}<button className="secondary-btn" onClick={exportCsv}>Export CSV</button></div><table className="admin-table"><thead><tr><th>Phone</th><th>Variant</th><th>Price</th><th>Stock</th><th>Private cost</th><th>Actions</th></tr></thead><tbody>{visible.map(phone => { const availableNow = phone.availableStock - phone.reservedStock; return <tr key={phone.id}><td><strong>{phone.brand} {phone.model}</strong><small>{phone.sku}</small></td><td>{phone.ramGb}/{phone.storageGb} GB<br/><small>{phone.colour} · {phone.condition}</small></td><td><strong>{money(phone.sellingPrice)}</strong><small>MRP {money(phone.mrp)}</small></td><td><span className={`status-dot ${availableNow === 0 ? "out" : availableNow <= phone.reorderLevel ? "low" : ""}`} />{availableNow} available<br/><small>{phone.reservedStock} reserved</small></td><td>{money(phone.purchasePrice ?? 0)}<br/><small>Margin {money(phone.sellingPrice - (phone.purchasePrice ?? 0))}</small></td><td><div className="table-actions"><button onClick={() => adjustStock(phone, 1)}>± Stock</button><button onClick={() => updatePrice(phone)}>₹ Price</button><button onClick={() => archive(phone)}>Archive</button></div></td></tr>; })}</tbody></table></div>}

          {tab === "reports" && <div className="report-grid"><div className="report-card"><h3>Inventory cost</h3><p>Approximate purchase value of current physical stock.</p><strong>{money(costValue)}</strong></div><div className="report-card"><h3>Retail value</h3><p>Potential revenue at current selling prices.</p><strong>{money(retailValue)}</strong></div><div className="report-card"><h3>Potential gross margin</h3><p>Retail value minus recorded purchase cost.</p><strong>{money(retailValue - costValue)}</strong></div><div className="report-card"><h3>Attention needed</h3><p>Variants at or below their reorder level.</p><strong>{lowStock} variants</strong></div></div>}
          {tab === "suppliers" && <div className="admin-panel"><div className="admin-empty"><h3>Supplier register is private</h3><p>Add supplier records after connecting the production database. Supplier details are never included in public inventory responses.</p><button className="primary-btn" onClick={() => setNotice("Supplier workflow is ready for database setup")}>+ Add supplier</button></div></div>}
          {tab === "settings" && <div className="admin-panel"><div className="admin-empty"><h3>Public catalogue settings</h3><p>Default currency: INR · Timezone: Asia/Kolkata · Public stock visibility: exact count · Low stock alerts: enabled.</p><button className="secondary-btn" onClick={() => setNotice("Settings saved")}>Save settings</button></div></div>}
        </section>
      </div>

      {modalOpen && <div className="modal-backdrop" role="presentation" onMouseDown={e => { if (e.target === e.currentTarget) setModalOpen(false); }}><div className="modal" role="dialog" aria-modal="true" aria-labelledby="add-phone-title"><div className="modal-header"><h2 id="add-phone-title">Add exact phone variant</h2><button onClick={() => setModalOpen(false)} aria-label="Close">×</button></div><form className="inventory-form" onSubmit={createItem}><div className="form-grid">
        <label>Brand *<input value={form.brand} onChange={e => setForm({ ...form, brand: e.target.value })} required /></label><label>Model *<input value={form.model} onChange={e => setForm({ ...form, model: e.target.value })} required /></label><label>SKU<input value={form.sku} onChange={e => setForm({ ...form, sku: e.target.value })} placeholder="Auto-generated if blank" /></label><label>Condition<select value={form.condition} onChange={e => setForm({ ...form, condition: e.target.value })}><option>New</option><option>Open-box</option><option>Used</option><option>Refurbished</option></select></label><label>RAM (GB) *<input type="number" min="1" value={form.ramGb} onChange={e => setForm({ ...form, ramGb: e.target.value })} required /></label><label>Storage (GB) *<input type="number" min="1" value={form.storageGb} onChange={e => setForm({ ...form, storageGb: e.target.value })} required /></label><label>Colour *<input value={form.colour} onChange={e => setForm({ ...form, colour: e.target.value })} required /></label><label>Colour code<input type="color" value={form.colourHex} onChange={e => setForm({ ...form, colourHex: e.target.value })} /></label><label>MRP (₹) *<input type="number" min="1" value={form.mrp} onChange={e => setForm({ ...form, mrp: e.target.value })} required /></label><label>Selling price (₹) *<input type="number" min="1" value={form.sellingPrice} onChange={e => setForm({ ...form, sellingPrice: e.target.value })} required /></label><label>Purchase price (private)<input type="number" min="0" value={form.purchasePrice} onChange={e => setForm({ ...form, purchasePrice: e.target.value })} /></label><label>Minimum price (private)<input type="number" min="0" value={form.minimumSellingPrice} onChange={e => setForm({ ...form, minimumSellingPrice: e.target.value })} /></label><label>Opening stock<input type="number" min="0" value={form.availableStock} onChange={e => setForm({ ...form, availableStock: e.target.value })} /></label><label>Low-stock level<input type="number" min="0" value={form.reorderLevel} onChange={e => setForm({ ...form, reorderLevel: e.target.value })} /></label>
      </div><div className="form-actions"><button type="button" className="secondary-btn" onClick={() => setModalOpen(false)}>Cancel</button><button className="primary-btn" disabled={busy}>{busy ? "Saving…" : "Save phone variant"}</button></div></form></div></div>}
      {notice && <div className="toast" role="status">{notice}</div>}
    </main>
  );
}
