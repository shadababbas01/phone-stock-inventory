"use client";
/* eslint-disable @next/next/no-img-element -- generated SVG previews and the supplied logo are served locally. */

import { ChangeEvent, FormEvent, useEffect, useMemo, useRef, useState } from "react";
import type { IScannerControls } from "@zxing/browser";
import { money, type PhoneVariant } from "@/lib/catalog";
import { sampleAdminInventory } from "@/lib/admin-sample";
import { phoneArtUrl } from "@/lib/phone-art";
import { parseBoxLabel, type BoxLabelResult } from "@/lib/box-label";

type Tab = "inventory" | "stock" | "reports" | "suppliers" | "settings";
type DeviceOptions = {
  brands: string[];
  models: string[];
  colours: string[];
  ramGb: number[];
  storageGb: number[];
  exactMatch: boolean;
  source: "catalog" | "saved" | "internet";
};

const emptyOptions: DeviceOptions = { brands: [], models: [], colours: [], ramGb: [], storageGb: [], exactMatch: false, source: "catalog" };
const emptyForm = { brand: "", model: "", gtin: "", manufacturerCode: "", imageUrl: "", ramGb: "8", storageGb: "128", colour: "", networkType: "5G", imei1: "", imei2: "", serialNumber: "", mrp: "", sellingPrice: "", purchasePrice: "", availableStock: "1", reorderLevel: "2" };
type InventoryForm = typeof emptyForm;

function scannedGtin(value: string) {
  const digits = value.replace(/\D/g, "");
  return digits.length >= 8 && digits.length <= 18 ? digits : "";
}

function cameraErrorMessage(error: unknown) {
  const name = error instanceof DOMException ? error.name : "";
  if (name === "NotAllowedError" || name === "SecurityError") return "Camera permission was denied. Allow camera access in your phone settings, then try again.";
  if (name === "NotFoundError" || name === "OverconstrainedError") return "No usable rear camera was found. You can still type the barcode manually.";
  if (name === "NotReadableError") return "The camera is busy in another app. Close that app and try again.";
  return "The camera could not start. You can still type the barcode manually.";
}

function BarcodeScanner({ title, onDetected, onClose }: { title: string; onDetected: (gtin: string) => void; onClose: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsRef = useRef<IScannerControls | null>(null);
  const detectedRef = useRef(false);
  const detectedHandlerRef = useRef(onDetected);
  const [status, setStatus] = useState("Starting rear camera…");
  const [torchAvailable, setTorchAvailable] = useState(false);
  const [torchOn, setTorchOn] = useState(false);

  useEffect(() => {
    detectedHandlerRef.current = onDetected;
  }, [onDetected]);

  useEffect(() => {
    let cancelled = false;
    const videoElement = videoRef.current;

    async function start() {
      if (!navigator.mediaDevices?.getUserMedia || !videoElement) {
        setStatus("Camera scanning is not supported here. Open the site in Chrome or Safari, or enter the barcode manually.");
        return;
      }

      try {
        const { BrowserMultiFormatOneDReader } = await import("@zxing/browser");
        const reader = new BrowserMultiFormatOneDReader();
        const controls = await reader.decodeFromConstraints({
          audio: false,
          video: {
            facingMode: { ideal: "environment" },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
        }, videoElement, (result) => {
          if (!result || detectedRef.current) return;
          const gtin = scannedGtin(result.getText());
          if (!gtin) {
            setStatus("A barcode was seen, but it was not a valid product GTIN. Point at the EAN/UPC barcode on the box.");
            return;
          }
          detectedRef.current = true;
          setStatus(`Barcode ${gtin} detected. Checking the exact product…`);
          controlsRef.current?.stop();
          detectedHandlerRef.current(gtin);
        });

        if (cancelled) {
          controls.stop();
          return;
        }
        controlsRef.current = controls;
        setTorchAvailable(Boolean(controls.switchTorch));
        setStatus("Place the barcode inside the frame. The scan happens automatically.");
      } catch (error) {
        if (!cancelled) setStatus(cameraErrorMessage(error));
      }
    }

    void start();
    return () => {
      cancelled = true;
      controlsRef.current?.stop();
      controlsRef.current = null;
      const stream = videoElement?.srcObject;
      if (stream instanceof MediaStream) stream.getTracks().forEach(track => track.stop());
    };
  }, []);

  async function toggleTorch() {
    if (!controlsRef.current?.switchTorch) return;
    const next = !torchOn;
    try {
      await controlsRef.current.switchTorch(next);
      setTorchOn(next);
    } catch {
      setTorchAvailable(false);
      setStatus("Torch control is unavailable on this phone. Keep the barcode well lit.");
    }
  }

  return (
    <div className="scanner-backdrop" role="presentation">
      <section className="barcode-scanner" role="dialog" aria-modal="true" aria-labelledby="scanner-title">
        <div className="scanner-header">
          <div><span>Exact product image</span><h2 id="scanner-title">{title}</h2></div>
          <button type="button" onClick={onClose} aria-label="Close barcode scanner">×</button>
        </div>
        <div className="scanner-camera">
          <video ref={videoRef} muted playsInline aria-label="Live rear-camera barcode preview" />
          <div className="scanner-guide" aria-hidden="true"><i /><i /><i /><i /><span /></div>
        </div>
        <p className="scanner-status" role="status">{status}</p>
        <div className="scanner-actions">
          {torchAvailable && <button type="button" className="secondary-btn" onClick={() => void toggleTorch()}>{torchOn ? "Turn torch off" : "Turn torch on"}</button>}
          <button type="button" className="primary-btn" onClick={onClose}>Enter barcode manually</button>
        </div>
        <small>Camera images stay on this phone. Only the detected barcode number is sent for the Icecat lookup.</small>
      </section>
    </div>
  );
}

function BoxPhotoScanner({ onResult, onClose }: { onResult: (result: BoxLabelResult) => void; onClose: () => void }) {
  const [status, setStatus] = useState("Take a clear photo of the label side of the sealed phone box.");
  const [progress, setProgress] = useState(0);
  const [busy, setBusy] = useState(false);

  async function readPhoto(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setBusy(true);
    setProgress(3);
    setStatus("Enhancing and reading the label on this phone…");
    const objectUrl = URL.createObjectURL(file);
    try {
      const barcodePromise = import("@zxing/browser").then(async ({ BrowserMultiFormatReader }) => {
        try {
          const result = await new BrowserMultiFormatReader().decodeFromImageUrl(objectUrl);
          return [result.getText()];
        } catch {
          return [] as string[];
        }
      });
      const { createWorker } = await import("tesseract.js");
      const worker = await createWorker("eng", 1, {
        logger: message => {
          if (message.status === "recognizing text") setProgress(Math.max(5, Math.round((message.progress ?? 0) * 100)));
          setStatus(message.status === "recognizing text" ? "Reading model, variant and private identifiers…" : "Preparing on-device OCR…");
        },
      });
      const [ocr, codes] = await Promise.all([worker.recognize(file), barcodePromise]);
      await worker.terminate();
      const result = parseBoxLabel(ocr.data.text, codes);
      if (!result.brand && !result.model && !result.manufacturerCode && !result.gtin) {
        setStatus("The label could not be read. Retake it straight-on in bright light and keep all text sharp.");
        return;
      }
      setProgress(100);
      onResult(result);
    } catch {
      setStatus("The photo could not be processed. Check the connection once, then retake the label in good light.");
    } finally {
      URL.revokeObjectURL(objectUrl);
      setBusy(false);
    }
  }

  return <div className="scanner-backdrop" role="presentation"><section className="barcode-scanner box-photo-scanner" role="dialog" aria-modal="true" aria-labelledby="box-photo-title">
    <div className="scanner-header"><div><span>Private · on-device reading</span><h2 id="box-photo-title">Scan phone-box label</h2></div><button type="button" onClick={onClose} aria-label="Close box scanner">×</button></div>
    <div className="box-scan-guide"><strong>Photograph the label side</strong><span>Include model, colour, RAM/storage, IMEI and the full barcode. Avoid glare and blur.</span></div>
    <p className="scanner-status" role="status">{status}</p>
    {busy && <div className="ocr-progress" aria-hidden="true"><i style={{ width: `${progress}%` }} /></div>}
    <div className="scanner-actions"><button type="button" className="secondary-btn" onClick={onClose}>Cancel</button><label className={`primary-btn capture-btn ${busy ? "disabled" : ""}`}>{busy ? "Reading photo…" : "Take label photo"}<input type="file" accept="image/*" capture="environment" onChange={readPhoto} disabled={busy} hidden /></label></div>
    <small>The image is processed in your browser and is not uploaded. IMEI and serial fields stay inside the password-protected admin area.</small>
  </section></div>;
}

function Brand({ compact = false }: { compact?: boolean }) {
  return <span className={`brand-lockup ${compact ? "compact" : ""}`}><img src="/mangla-logo.svg" alt="Mangla Communication" className="brand-logo" /></span>;
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
  const [deviceOptions, setDeviceOptions] = useState<DeviceOptions>(emptyOptions);
  const [suggestionsBusy, setSuggestionsBusy] = useState(false);
  const [imageBusy, setImageBusy] = useState(false);
  const [imageStatus, setImageStatus] = useState("Generated fallback will be used unless an exact identifier matches Icecat.");
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scannerPhone, setScannerPhone] = useState<PhoneVariant | null>(null);
  const [boxScannerOpen, setBoxScannerOpen] = useState(false);
  const [scanReview, setScanReview] = useState("");

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

  useEffect(() => {
    if (!modalOpen || !authenticated) return;
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setSuggestionsBusy(true);
      try {
        const params = new URLSearchParams({ brand: form.brand, q: form.model, model: form.model });
        const response = await fetch(`/api/admin/device-suggestions?${params}`, { cache: "no-store", signal: controller.signal });
        if (!response.ok) return;
        const data = await response.json() as DeviceOptions;
        setDeviceOptions(data);
        if (data.exactMatch) {
          setForm(current => ({
            ...current,
            ramGb: data.ramGb.includes(Number(current.ramGb)) ? current.ramGb : String(data.ramGb[0] ?? current.ramGb),
            storageGb: data.storageGb.includes(Number(current.storageGb)) ? current.storageGb : String(data.storageGb[0] ?? current.storageGb),
            colour: data.colours.includes(current.colour) ? current.colour : (data.colours[0] ?? current.colour)
          }));
        }
      } catch (error) {
        if (!(error instanceof DOMException && error.name === "AbortError")) setDeviceOptions(emptyOptions);
      } finally {
        if (!controller.signal.aborted) setSuggestionsBusy(false);
      }
    }, 250);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [authenticated, modalOpen, form.brand, form.model]);

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
    const ok = await mutate({ action: "create", ...form, ramGb: Number(form.ramGb), storageGb: Number(form.storageGb), mrp: Number(form.mrp), sellingPrice: Number(form.sellingPrice), purchasePrice: Number(form.purchasePrice), availableStock: Number(form.availableStock), reorderLevel: Number(form.reorderLevel) });
    if (ok) { setModalOpen(false); setForm(emptyForm); setImageStatus("Generated fallback will be used unless an exact identifier matches Icecat."); }
  }

  function applyBoxScan(result: BoxLabelResult) {
    setForm(current => ({
      ...current,
      brand: result.brand || current.brand,
      model: result.model || current.model,
      manufacturerCode: result.manufacturerCode || current.manufacturerCode,
      colour: result.colour || current.colour,
      ramGb: result.ramGb || current.ramGb,
      storageGb: result.storageGb || current.storageGb,
      gtin: result.gtin || current.gtin,
      imei1: result.imei1,
      imei2: result.imei2,
      serialNumber: result.serialNumber,
      imageUrl: "",
    }));
    setBoxScannerOpen(false);
    setScanReview(`Scan filled the form (${result.confidence}% field coverage). Review every value before saving.`);
    if (result.gtin || (result.brand && result.manufacturerCode)) void findExactImage({
      brand: result.brand,
      manufacturerCode: result.manufacturerCode,
      gtin: result.gtin,
    });
  }

  async function findExactImage(overrides: Partial<InventoryForm> = {}) {
    const requestForm = { ...form, ...overrides };
    if (!requestForm.gtin && !(requestForm.brand && requestForm.manufacturerCode)) {
      setImageStatus("Enter a GTIN/barcode or the brand and manufacturer code first.");
      return;
    }
    setImageBusy(true);
    try {
      const response = await fetch("/api/admin/product-image", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(requestForm) });
      const data = await response.json() as { matched?: boolean; verified?: boolean; imageUrl?: string; fallbackUrl?: string; matchType?: string; reason?: string; title?: string; brand?: string; productCode?: string };
      if (response.status === 401) { setAuthenticated(false); return; }
      if (data.matched && data.verified && data.imageUrl) {
        setForm(current => ({
          ...current,
          gtin: requestForm.gtin || current.gtin,
          brand: current.brand || data.brand || "",
          manufacturerCode: current.manufacturerCode || data.productCode || "",
          imageUrl: data.imageUrl ?? "",
        }));
        setImageStatus(`Verified ${data.matchType === "gtin" ? "barcode" : "manufacturer-code"} image found${data.title ? ` · ${data.title}` : ""}.`);
      } else {
        setForm(current => ({ ...current, imageUrl: "" }));
        setImageStatus(data.reason ?? "No verified exact image was found; generated artwork will be used.");
      }
    } catch {
      setForm(current => ({ ...current, imageUrl: "" }));
      setImageStatus("Image lookup is unavailable; generated artwork will be used.");
    } finally {
      setImageBusy(false);
    }
  }

  async function handleScannedBarcode(gtin: string) {
    const target = scannerPhone;
    setScannerOpen(false);
    setScannerPhone(null);

    if (!target) {
      setForm(current => ({ ...current, gtin, imageUrl: "" }));
      setImageStatus(`Barcode ${gtin} scanned. Checking Icecat for an exact match…`);
      await findExactImage({ gtin });
      return;
    }

    setBusy(true);
    setNotice(`Checking ${target.brand} ${target.model}…`);
    try {
      const response = await fetch("/api/admin/product-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...target, gtin }),
      });
      const data = await response.json() as { matched?: boolean; verified?: boolean; imageUrl?: string; reason?: string };
      if (response.status === 401) { setAuthenticated(false); return; }
      if (!data.matched || !data.verified || !data.imageUrl) {
        setNotice(data.reason ?? "No verified exact image was found for that barcode.");
        return;
      }
      const saved = await fetch("/api/admin/inventory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "updateImage", id: target.id, gtin, imageUrl: data.imageUrl }),
      });
      const savedData = await saved.json().catch(() => ({})) as { error?: string };
      if (!saved.ok) {
        setNotice(savedData.error ?? "The exact image could not be saved.");
        return;
      }
      await loadInventory();
      setNotice(`Exact image saved for ${target.brand} ${target.model}`);
    } catch {
      setNotice("Image lookup is unavailable. Check the connection and try again.");
    } finally {
      setBusy(false);
    }
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
          <div className="admin-heading"><div><h1>{tabTitle}</h1><p>{tab === "inventory" ? "Manage every exact RAM, storage and colour variant." : tab === "stock" ? "Adjust stock with a permanent reason and audit trail." : tab === "reports" ? "Understand stock value, margin and attention items." : tab === "suppliers" ? "Private supplier records stay hidden from customers." : "Configure how your public shop catalogue behaves."}</p></div>{tab === "inventory" && <div className="heading-actions"><button className="secondary-btn" onClick={() => { setModalOpen(true); setBoxScannerOpen(true); }}>▣ Scan box</button><button className="primary-btn" onClick={() => setModalOpen(true)}>+ Add phone variant</button></div>}</div>
          <div className="admin-stats"><div className="admin-stat-card"><span>Total variants</span><strong>{inventory.length}</strong></div><div className="admin-stat-card"><span>Physical stock</span><strong>{totalStock}</strong></div><div className="admin-stat-card"><span>Available to sell</span><strong>{available}</strong></div><div className="admin-stat-card"><span>Low / out of stock</span><strong>{lowStock}</strong></div></div>

          {(tab === "inventory" || tab === "stock") && <div className="admin-panel"><div className="panel-tools"><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search model, SKU or colour" />{tab === "inventory" && <label className="secondary-btn import-btn">Import CSV<input type="file" accept=".csv,text/csv" onChange={importCsv} hidden /></label>}<button className="secondary-btn" onClick={exportCsv}>Export CSV</button></div><table className="admin-table"><thead><tr><th>Phone</th><th>Variant</th><th>Price</th><th>Stock</th><th>Private cost</th><th>Actions</th></tr></thead><tbody>{visible.map(phone => { const availableNow = phone.availableStock - phone.reservedStock; return <tr key={phone.id}><td><strong>{phone.brand} {phone.model}</strong><small>{phone.sku}</small></td><td>{phone.ramGb}/{phone.storageGb} GB<br/><small>{phone.colour} · {phone.condition}</small></td><td><strong>{money(phone.sellingPrice)}</strong><small>MRP {money(phone.mrp)}</small></td><td><span className={`status-dot ${availableNow === 0 ? "out" : availableNow <= phone.reorderLevel ? "low" : ""}`} />{availableNow} available<br/><small>{phone.reservedStock} reserved</small></td><td>{money(phone.purchasePrice ?? 0)}<br/><small>Margin {money(phone.sellingPrice - (phone.purchasePrice ?? 0))}</small></td><td><div className="table-actions"><button onClick={() => adjustStock(phone, 1)}>± Stock</button><button onClick={() => updatePrice(phone)}>₹ Price</button><button onClick={() => { setScannerPhone(phone); setScannerOpen(true); }}>▣ Image</button><button onClick={() => archive(phone)}>Archive</button></div></td></tr>; })}</tbody></table></div>}

          {tab === "reports" && <div className="report-grid"><div className="report-card"><h3>Inventory cost</h3><p>Approximate purchase value of current physical stock.</p><strong>{money(costValue)}</strong></div><div className="report-card"><h3>Retail value</h3><p>Potential revenue at current selling prices.</p><strong>{money(retailValue)}</strong></div><div className="report-card"><h3>Potential gross margin</h3><p>Retail value minus recorded purchase cost.</p><strong>{money(retailValue - costValue)}</strong></div><div className="report-card"><h3>Attention needed</h3><p>Variants at or below their reorder level.</p><strong>{lowStock} variants</strong></div></div>}
          {tab === "suppliers" && <div className="admin-panel"><div className="admin-empty"><h3>Supplier register is private</h3><p>Add supplier records after connecting the production database. Supplier details are never included in public inventory responses.</p><button className="primary-btn" onClick={() => setNotice("Supplier workflow is ready for database setup")}>+ Add supplier</button></div></div>}
          {tab === "settings" && <div className="admin-panel"><div className="admin-empty"><h3>Public catalogue settings</h3><p>Default currency: INR · Timezone: Asia/Kolkata · Public stock visibility: exact count · Low stock alerts: enabled.</p><button className="secondary-btn" onClick={() => setNotice("Settings saved")}>Save settings</button></div></div>}
        </section>
      </div>

      {modalOpen && <div className="modal-backdrop" role="presentation" onMouseDown={e => { if (e.target === e.currentTarget) setModalOpen(false); }}><div className="modal" role="dialog" aria-modal="true" aria-labelledby="add-phone-title"><div className="modal-header"><h2 id="add-phone-title">Add exact phone variant</h2><button onClick={() => setModalOpen(false)} aria-label="Close">×</button></div><form className="inventory-form" onSubmit={createItem}><div className="form-grid">
        <div className="scan-box-banner full"><div><strong>Fill from one box photo</strong><span>Reads barcode, model, variant and private identifiers on this device.</span></div><button type="button" className="secondary-btn" onClick={() => setBoxScannerOpen(true)}>Scan label</button></div>
        {scanReview && <p className="scan-review full" role="status">{scanReview}</p>}
        <label>Brand *<input list="phone-brand-options" value={form.brand} onChange={e => setForm({ ...form, brand: e.target.value, model: "", colour: "", imageUrl: "" })} placeholder="Start typing, e.g. Sam" autoComplete="off" required /><datalist id="phone-brand-options">{deviceOptions.brands.map(brand => <option key={brand} value={brand} />)}</datalist></label>
        <label>Model *<input list="phone-model-options" value={form.model} onChange={e => setForm({ ...form, model: e.target.value, colour: "", imageUrl: "" })} placeholder={form.brand ? "Type S, A, iPhone…" : "Choose brand first"} autoComplete="off" disabled={!form.brand} required /><datalist id="phone-model-options">{deviceOptions.models.map(model => <option key={model} value={model} />)}</datalist></label>
        <label>Barcode / GTIN<div className="barcode-input-row"><input value={form.gtin} onChange={e => setForm({ ...form, gtin: e.target.value.replace(/[^0-9]/g, ""), imageUrl: "" })} onBlur={() => { if (form.gtin.length >= 8) void findExactImage(); }} placeholder="Scan or enter barcode" inputMode="numeric" autoComplete="off" /><button type="button" onClick={() => { setScannerPhone(null); setScannerOpen(true); }} aria-label="Scan phone barcode with camera">Scan</button></div><small className="field-help">Use the barcode on the sealed phone box for the most accurate image.</small></label>
        <label>Manufacturer code<input value={form.manufacturerCode} onChange={e => setForm({ ...form, manufacturerCode: e.target.value, imageUrl: "" })} onBlur={() => { if (!form.gtin && form.brand && form.manufacturerCode) void findExactImage(); }} placeholder="e.g. SM-S931BZKDEUB" autoComplete="off" /></label>
        <label>RAM (GB) *<input list="phone-ram-options" type="number" min="1" value={form.ramGb} onChange={e => setForm({ ...form, ramGb: e.target.value })} inputMode="numeric" required /><datalist id="phone-ram-options">{deviceOptions.ramGb.map(value => <option key={value} value={value} />)}</datalist></label>
        <label>Storage (GB) *<input list="phone-storage-options" type="number" min="1" value={form.storageGb} onChange={e => setForm({ ...form, storageGb: e.target.value })} inputMode="numeric" required /><datalist id="phone-storage-options">{deviceOptions.storageGb.map(value => <option key={value} value={value} />)}</datalist></label>
        <label>Colour *<input list="phone-colour-options" value={form.colour} onChange={e => setForm({ ...form, colour: e.target.value, imageUrl: "" })} placeholder={form.model ? "Choose official colour" : "Choose model first"} autoComplete="off" disabled={!form.model} required /><datalist id="phone-colour-options">{deviceOptions.colours.map(colour => <option key={colour} value={colour} />)}</datalist></label>
        <label>Network<select value={form.networkType} onChange={e => setForm({ ...form, networkType: e.target.value })}><option>5G</option><option>4G</option><option>3G</option></select></label>
        <label>IMEI 1 (private)<input value={form.imei1} onChange={e => setForm({ ...form, imei1: e.target.value.replace(/\D/g, "").slice(0, 15) })} inputMode="numeric" autoComplete="off" /></label>
        <label>IMEI 2 (private)<input value={form.imei2} onChange={e => setForm({ ...form, imei2: e.target.value.replace(/\D/g, "").slice(0, 15) })} inputMode="numeric" autoComplete="off" /></label>
        <label>Serial number (private)<input value={form.serialNumber} onChange={e => setForm({ ...form, serialNumber: e.target.value.slice(0, 40) })} autoComplete="off" /></label>
        <p className="suggestion-status full" aria-live="polite">{suggestionsBusy ? "Finding matching phones and variants…" : deviceOptions.exactMatch ? `Variant choices ready · ${deviceOptions.source === "internet" ? "live device catalogue" : deviceOptions.source === "saved" ? "your saved stock" : "built-in catalogue"}` : "Type or tap a suggestion. You can still enter a model manually."}</p>
        {form.brand && form.model && form.colour && <div className="variant-art-preview full"><img src={phoneArtUrl(form)} alt={`Preview for ${form.brand} ${form.model} in ${form.colour}`} /><div><strong>{form.imageUrl ? "Exact product image" : "Generated image fallback"}</strong><span>{imageStatus}</span><button type="button" className="image-lookup-btn" onClick={() => void findExactImage()} disabled={imageBusy || (!form.gtin && !form.manufacturerCode)}>{imageBusy ? "Checking Icecat…" : "Find exact image"}</button></div></div>}
        <label>MRP (₹) *<input type="number" min="1" value={form.mrp} onChange={e => setForm({ ...form, mrp: e.target.value })} inputMode="numeric" required /></label>
        <label>Selling price (₹) *<input type="number" min="1" value={form.sellingPrice} onChange={e => setForm({ ...form, sellingPrice: e.target.value })} inputMode="numeric" required /></label>
        <label>Purchase price (private)<input type="number" min="0" value={form.purchasePrice} onChange={e => setForm({ ...form, purchasePrice: e.target.value })} inputMode="numeric" /></label>
        <label>Opening stock<input type="number" min="0" value={form.availableStock} onChange={e => setForm({ ...form, availableStock: e.target.value })} inputMode="numeric" /></label>
        <label>Low-stock level<input type="number" min="0" value={form.reorderLevel} onChange={e => setForm({ ...form, reorderLevel: e.target.value })} inputMode="numeric" /></label>
      </div><div className="form-actions"><button type="button" className="secondary-btn" onClick={() => setModalOpen(false)}>Cancel</button><button className="primary-btn" disabled={busy}>{busy ? "Saving…" : "Save phone variant"}</button></div></form></div></div>}
      {scannerOpen && <BarcodeScanner title={scannerPhone ? `Scan ${scannerPhone.brand} ${scannerPhone.model}` : "Scan phone-box barcode"} onDetected={gtin => void handleScannedBarcode(gtin)} onClose={() => { setScannerOpen(false); setScannerPhone(null); }} />}
      {boxScannerOpen && <BoxPhotoScanner onResult={applyBoxScan} onClose={() => setBoxScannerOpen(false)} />}
      {notice && <div className="toast" role="status">{notice}</div>}
    </main>
  );
}
