"use client";
/* eslint-disable @next/next/no-img-element -- generated SVG artwork and the supplied logo are served locally. */

import { useEffect, useMemo, useState } from "react";
import { money, type PhoneVariant } from "@/lib/catalog";
import { phoneArtUrl } from "@/lib/phone-art";

const brands = ["All phones", "Samsung", "Apple", "Motorola", "OnePlus", "Nothing", "Google"];
const publicStoreUrl = "https://manglacom.shadabagasta.workers.dev";

function SearchIcon() {
  return <span aria-hidden="true" className="search-icon" />;
}

function WhatsAppIcon() {
  return <svg aria-hidden="true" viewBox="0 0 24 24"><path d="M20.5 3.5A11.8 11.8 0 0 0 12.1 0C5.6 0 .3 5.3.3 11.8c0 2.1.5 4.1 1.6 5.9L0 24l6.5-1.7a12 12 0 0 0 5.6 1.4h.1c6.5 0 11.8-5.3 11.8-11.8 0-3.2-1.2-6.1-3.5-8.4Zm-8.4 18.2c-1.7 0-3.4-.5-4.9-1.4l-.4-.2-3.9 1 1-3.8-.2-.4a9.8 9.8 0 1 1 8.4 4.8Zm5.4-7.3c-.3-.1-1.7-.8-2-.9-.3-.1-.5-.1-.7.2-.2.3-.8.9-1 1.1-.2.2-.4.2-.7.1-1.8-.9-3-1.6-4.2-3.7-.3-.5.3-.5.9-1.7.1-.2 0-.4 0-.6l-.9-2.1c-.2-.5-.5-.5-.7-.5h-.6c-.2 0-.6.1-.9.4-.3.3-1.2 1.2-1.2 2.9s1.2 3.3 1.4 3.5c.1.2 2.4 3.7 5.8 5.2 2.2.9 3 .9 4.1.8.7-.1 1.7-.7 1.9-1.3.2-.6.2-1.2.2-1.3-.1-.1-.3-.2-.6-.3Z"/></svg>;
}

function ProductCard({ phone }: { phone: PhoneVariant }) {
  const available = Math.max(0, phone.availableStock - phone.reservedStock);
  const savings = phone.mrp - phone.sellingPrice;
  const shareText = `${phone.brand} ${phone.model} · ${phone.ramGb}GB/${phone.storageGb}GB · ${phone.colour} · ${money(phone.sellingPrice)} · ${available > 0 ? `${available} available` : "Out of stock"}`;
  const productUrl = `${publicStoreUrl}/?phone=${phone.slug}`;
  const whatsappText = `Is this device in stock?\n\n${shareText}\n${productUrl}`;
  const artwork = phoneArtUrl(phone);
  const share = async () => {
    const url = `${window.location.origin}/?phone=${phone.slug}`;
    if (navigator.share) await navigator.share({ title: `${phone.brand} ${phone.model}`, text: shareText, url });
    else {
      await navigator.clipboard.writeText(`${shareText}\n${url}`);
      window.dispatchEvent(new CustomEvent("phonestock-toast", { detail: "Product details and link copied" }));
    }
  };

  return (
    <article className="product-card" id={phone.slug}>
      <div className="product-image-wrap">
        <img src={artwork} alt={`${phone.colour} ${phone.brand} ${phone.model}`} className="product-image" />
        <span className="network-badge">{phone.networkType}</span>
        <span className="illustration-badge">{phone.imageUrl?.includes("icecat.biz") ? "Product image" : "Illustrative image"}</span>
      </div>
      <div className="product-content">
        <p className="eyebrow" title={phone.brand}>{phone.brand}</p>
        <h2 title={phone.model}>{phone.model}</h2>
        <div className="price-rule" />
        <p className="selling-price">{money(phone.sellingPrice)}</p>
        <p className="mrp">MRP <s>{money(phone.mrp)}</s> <strong>Save {money(savings)}</strong></p>
        <span className={`stock-pill ${available === 0 ? "out" : available <= phone.reorderLevel ? "low" : ""}`}>
          {available === 0 ? "Out of stock" : `${available} in stock`}
        </span>
        <div className="spec-grid" aria-label={`${phone.model} specifications`}>
          <div><strong title={`${phone.ramGb}GB RAM`}>{phone.ramGb}GB</strong><span>RAM</span></div>
          <div><strong title={`${phone.storageGb}GB Storage`}>{phone.storageGb}GB</strong><span>Storage</span></div>
          <div><strong title={phone.colour}><i style={{ background: phone.colourHex }} />{phone.colour}</strong><span>Colour</span></div>
        </div>
        <div className="card-actions">
          <a className="whatsapp-btn" href={`https://wa.me/917011693657?text=${encodeURIComponent(whatsappText)}`} target="_blank" rel="noreferrer" aria-label={`Ask Mangla Communication about ${phone.model} on WhatsApp`}>
            <WhatsAppIcon /> WhatsApp
          </a>
          <button className="share-btn" onClick={share} aria-label={`Share ${phone.model}`} title="Share product">↗</button>
        </div>
        <p className="updated"><span aria-hidden="true">◷</span> Updated {phone.updatedAt.toLowerCase()}</p>
      </div>
    </article>
  );
}

export default function Storefront() {
  const [inventory, setInventory] = useState<PhoneVariant[]>([]);
  const [loading, setLoading] = useState(true);
  const [theme, setTheme] = useState<"light" | "dark">("dark");
  const [query, setQuery] = useState("");
  const [brand, setBrand] = useState("All phones");
  const [ram, setRam] = useState("All");
  const [storage, setStorage] = useState("All");
  const [maxPrice, setMaxPrice] = useState("All");
  const [inStock, setInStock] = useState(false);
  const [sort, setSort] = useState("featured");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [toast, setToast] = useState("");

  useEffect(() => {
    const userAgent = navigator.userAgent;
    const platform = /iPad|iPhone|iPod/.test(userAgent) ? "ios" : /Android/.test(userAgent) ? "android" : "desktop";
    document.documentElement.dataset.platform = platform;
    return () => { delete document.documentElement.dataset.platform; };
  }, []);

  useEffect(() => {
    let cachedInventory: PhoneVariant[] = [];
    try {
      const cached = localStorage.getItem("mangla-live-inventory");
      cachedInventory = cached ? JSON.parse(cached) : [];
      if (Array.isArray(cachedInventory) && cachedInventory.length) queueMicrotask(() => setInventory(cachedInventory));
    } catch { cachedInventory = []; }
    fetch("/api/inventory", { cache: "no-store" }).then(r => r.ok ? r.json() : Promise.reject()).then(data => {
      if (!Array.isArray(data.inventory)) return;
      if (data.demo && cachedInventory.length) return;
      setInventory(data.inventory);
      if (!data.demo) localStorage.setItem("mangla-live-inventory", JSON.stringify(data.inventory));
    }).catch(() => undefined).finally(() => setLoading(false));
    const listener = (event: Event) => setToast((event as CustomEvent<string>).detail);
    window.addEventListener("phonestock-toast", listener);
    return () => window.removeEventListener("phonestock-toast", listener);
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem("mangla-theme");
    const initial = saved === "light" || saved === "dark" ? saved : "dark";
    queueMicrotask(() => setTheme(initial));
    document.documentElement.dataset.theme = initial;
  }, []);

  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.dataset.theme = next;
    localStorage.setItem("mangla-theme", next);
  };

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(""), 2400);
    return () => clearTimeout(timer);
  }, [toast]);

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    const rows = inventory.filter(p => {
      const available = p.availableStock - p.reservedStock;
      return (!normalized || `${p.brand} ${p.model} ${p.colour} ${p.ramGb} ${p.storageGb}`.toLowerCase().includes(normalized))
        && (brand === "All phones" || p.brand === brand)
        && (ram === "All" || p.ramGb === Number(ram))
        && (storage === "All" || p.storageGb === Number(storage))
        && (maxPrice === "All" || p.sellingPrice <= Number(maxPrice))
        && (!inStock || available > 0);
    });
    return [...rows].sort((a, b) => sort === "price-low" ? a.sellingPrice - b.sellingPrice : sort === "price-high" ? b.sellingPrice - a.sellingPrice : sort === "stock" ? (b.availableStock - b.reservedStock) - (a.availableStock - a.reservedStock) : a.id - b.id);
  }, [inventory, query, brand, ram, storage, maxPrice, inStock, sort]);

  const brandOptions = useMemo(() => ["All phones", ...Array.from(new Set(inventory.map(phone => phone.brand))).sort()], [inventory]);

  const totalAvailable = inventory.reduce((sum, p) => sum + Math.max(0, p.availableStock - p.reservedStock), 0);
  const totalPhones = inventory.reduce((sum, p) => sum + Math.max(0, p.availableStock), 0);
  const lowStock = inventory.filter(p => p.availableStock - p.reservedStock > 0 && p.availableStock - p.reservedStock <= p.reorderLevel).length;
  const clearFilters = () => { setBrand("All phones"); setRam("All"); setStorage("All"); setMaxPrice("All"); setInStock(false); setQuery(""); };

  return (
    <main className="storefront-shell">
      <header className="site-header">
        <a href="#top" className="brand-lockup" aria-label="Mangla Communication home">
          <img src="/mangla-logo.svg" alt="Mangla Communication" className="brand-logo" />
        </a>
        <nav aria-label="Primary navigation">
          <a href="#inventory" className="active">Inventory</a>
          <a href="#brands">Brands</a>
          <a href="#updates">Price updates</a>
        </nav>
        <div className="header-actions">
          <a className="header-whatsapp" href={`https://wa.me/917011693657?text=${encodeURIComponent("is this device in stock?")}`} target="_blank" rel="noreferrer" aria-label="Chat with Mangla Communication on WhatsApp"><WhatsAppIcon /><span>WhatsApp</span></a>
          <button type="button" className="theme-toggle" onClick={toggleTheme} aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`} title={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}><span aria-hidden="true">{theme === "dark" ? "☀" : "☾"}</span></button>
          <a href="/admin" className="admin-link"><span aria-hidden="true">♙</span> Admin</a>
        </div>
      </header>

      <section className="hero" id="top">
        <div className="container">
          <p className="hero-kicker">Mangla Communication · Real-time stock</p>
          <h1><span>Live</span> phone inventory</h1>
          <p className="hero-subtitle">Real-time stock. Best prices. Trusted service.</p>
          <a className="download-app-cta" href="https://github.com/shadababbas01/phone-stock-inventory/releases/download/android-latest/Mangla-Communication.apk" target="_blank" rel="noreferrer" aria-label="Download the Mangla Communication Android app"><span aria-hidden="true">↓</span> Download App</a>
          <label className="search-box">
            <SearchIcon />
            <span className="sr-only">Search phones</span>
            <input id="catalog-search" value={query} onChange={e => setQuery(e.target.value)} placeholder="Search by brand, model, RAM, storage or colour" />
            {query && <button onClick={() => setQuery("")} aria-label="Clear search">×</button>}
          </label>
          <div className="trust-row" aria-label="Store benefits">
            <span><b>✓</b><strong>100% Original</strong><small>Official warranty</small></span>
            <span><b>◷</b><strong>Live Inventory</strong><small>Real-time stock</small></span>
            <span><b>₹</b><strong>Best Prices</strong><small>Updated regularly</small></span>
            <span><b>✦</b><strong>Expert Support</strong><small>Buy with confidence</small></span>
          </div>
        </div>
      </section>

      <section className="catalog container" id="inventory">
        <div className="filter-bar" id="brands">
          <div className="brand-chips" role="group" aria-label="Filter by brand">
            {brands.slice(0, 4).map(item => <button key={item} className={brand === item ? "selected" : ""} onClick={() => setBrand(item)}>{item}</button>)}
          </div>
          <button className="mobile-filter-button" onClick={() => setFiltersOpen(v => !v)} aria-expanded={filtersOpen}>Filters <span>▾</span></button>
          <div className={`filter-selects ${filtersOpen ? "open" : ""}`}>
            <label><span>Brand</span><select value={brand} onChange={e => setBrand(e.target.value)}>{brandOptions.map(item => <option key={item} value={item}>{item === "All phones" ? "All" : item}</option>)}</select></label>
            <label><span>RAM</span><select value={ram} onChange={e => setRam(e.target.value)}><option>All</option><option>8</option><option>12</option><option>16</option></select></label>
            <label><span>Storage</span><select value={storage} onChange={e => setStorage(e.target.value)}><option>All</option><option>128</option><option>256</option><option>512</option></select></label>
            <label><span>Price</span><select value={maxPrice} onChange={e => setMaxPrice(e.target.value)}><option>All</option><option value="25000">Under ₹25k</option><option value="50000">Under ₹50k</option><option value="75000">Under ₹75k</option></select></label>
            <label className="checkbox-filter"><input type="checkbox" checked={inStock} onChange={e => setInStock(e.target.checked)} /> In stock</label>
          </div>
        </div>

        <div className="stats-strip" id="updates">
          <div><span className="stat-icon amber">◇</span><p><strong>{totalPhones}</strong><span>Total phones</span></p></div>
          <div><span className="stat-icon teal">◇</span><p><strong>{totalAvailable}</strong><span>Phones available</span></p></div>
          <div><span className="stat-icon coral">◷</span><p><strong>{lowStock}</strong><span>Low-stock variants</span></p></div>
          <div><span className="stat-icon amber">↗</span><p><strong>{inventory.filter(p => p.mrp > p.sellingPrice).length}</strong><span>Offers live</span></p></div>
        </div>

        <div className="catalog-toolbar">
          <div><h2>Available phones</h2><p>{filtered.length} exact variant{filtered.length === 1 ? "" : "s"} found</p></div>
          <label>Sort by <select value={sort} onChange={e => setSort(e.target.value)}><option value="featured">Featured</option><option value="price-low">Price: low to high</option><option value="price-high">Price: high to low</option><option value="stock">Most stock</option></select></label>
        </div>

        {loading && !inventory.length ? <div className="inventory-loading" role="status"><span className="loading-spinner" /><strong>Loading live inventory…</strong><small>Your saved stock will appear here.</small></div> : filtered.length ? <div className="product-grid">{filtered.map(phone => <ProductCard key={phone.id} phone={phone} />)}</div> : (
          <div className="empty-state"><span>⌕</span><h3>No exact variants found</h3><p>Try removing a filter or searching for another model.</p><button onClick={clearFilters}>Clear all filters</button></div>
        )}

        <div className="benefits-strip" aria-label="Purchase benefits">
          <span><b>↻</b><strong>Easy replacement</strong><small>Shop support</small></span>
          <span><b>▱</b><strong>Fast assistance</strong><small>Direct WhatsApp help</small></span>
          <span><b>₹</b><strong>Payment options</strong><small>Ask about available modes</small></span>
          <span><b>✓</b><strong>Best price</strong><small>Transparent pricing</small></span>
        </div>
      </section>

      <footer><div className="container"><div className="brand-lockup small"><img src="/mangla-logo.svg" alt="Mangla Communication" className="brand-logo" /></div><p>Prices and availability can change. Contact the shop to reserve a device.</p><a href="/admin">Shop administration</a></div></footer>
      <nav className="mobile-tabbar" aria-label="Mobile app navigation">
        <a href="#top" className="active"><span aria-hidden="true">⌂</span><b>Home</b></a>
        <button type="button" onClick={() => { document.getElementById("catalog-search")?.focus(); window.scrollTo({ top: 0, behavior: "smooth" }); }}><span aria-hidden="true">⌕</span><b>Search</b></button>
        <a href="#inventory"><span aria-hidden="true">▦</span><b>Phones</b></a>
        <a href="/admin"><span aria-hidden="true">⚙</span><b>Admin</b></a>
      </nav>
      {toast && <div className="toast" role="status">✓ {toast}</div>}
    </main>
  );
}
