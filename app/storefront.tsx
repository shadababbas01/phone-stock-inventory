"use client";
/* eslint-disable @next/next/no-img-element -- generated SVG artwork and the supplied logo are served locally. */

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { money, type PhoneVariant } from "@/lib/catalog";
import { phoneArtUrl } from "@/lib/phone-art";

const brands = ["All phones", "Samsung", "Apple", "Motorola", "OnePlus", "Nothing", "Google"];
const publicStoreUrl = "https://manglacom.shadabagasta.workers.dev";

function SearchIcon() {
  return <span aria-hidden="true" className="search-icon" />;
}

function WhatsAppIcon() {
  return <svg aria-hidden="true" viewBox="0 0 16 16" fill="currentColor"><path d="M13.601 2.326A7.854 7.854 0 0 0 7.994 0C3.627 0 .068 3.558.064 7.926c0 1.399.366 2.76 1.057 3.965L0 16l4.204-1.102a7.933 7.933 0 0 0 3.79.965h.004c4.368 0 7.926-3.558 7.93-7.93a7.898 7.898 0 0 0-2.327-5.607ZM7.994 14.521a6.573 6.573 0 0 1-3.356-.92l-.24-.144-2.494.654.666-2.433-.156-.25a6.56 6.56 0 0 1-1.007-3.505c0-3.626 2.957-6.584 6.591-6.584a6.56 6.56 0 0 1 4.66 1.931 6.557 6.557 0 0 1 1.928 4.66c-.004 3.639-2.961 6.592-6.592 6.592Zm3.615-4.934c-.198-.099-1.17-.578-1.352-.642-.182-.066-.315-.099-.445.099-.133.198-.513.642-.627.775-.116.133-.232.148-.43.05-.198-.1-.836-.308-1.592-.984-.59-.525-.986-1.173-1.102-1.371-.116-.198-.013-.305.087-.404.09-.088.198-.232.297-.348.1-.116.133-.198.198-.33.066-.134.033-.249-.016-.348-.05-.099-.445-1.074-.611-1.47-.161-.389-.324-.336-.445-.342-.116-.007-.248-.007-.38-.007a.729.729 0 0 0-.529.248c-.182.198-.694.678-.694 1.654s.71 1.916.81 2.049c.098.132 1.394 2.132 3.383 2.992.47.205.84.326 1.129.418.475.151.907.129 1.249.078.38-.058 1.171-.48 1.338-.943.164-.462.164-.86.116-.943-.05-.084-.182-.133-.38-.232Z"/></svg>;
}

function ProductCard({ phone }: { phone: PhoneVariant }) {
  const [imageOpen, setImageOpen] = useState(false);
  const available = Math.max(0, phone.availableStock - phone.reservedStock);
  const shareText = `${phone.brand} ${phone.model} · ${phone.ramGb}GB/${phone.storageGb}GB · ${phone.colour} · ${money(phone.sellingPrice)} · ${available > 0 ? `${available} available` : "Out of stock"}`;
  const productUrl = `${publicStoreUrl}/?phone=${phone.slug}`;
  const whatsappText = `Is this device in stock?\n\n${shareText}\n${productUrl}`;
  const artwork = phoneArtUrl(phone);
  useEffect(() => {
    if (!imageOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setImageOpen(false);
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [imageOpen]);
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
        <button type="button" className="product-image-button" onClick={() => setImageOpen(true)} aria-label={`View a larger image of ${phone.colour} ${phone.brand} ${phone.model}`}>
          <img src={artwork} alt={`${phone.colour} ${phone.brand} ${phone.model}`} className="product-image" />
          <span className="image-expand-hint" aria-hidden="true">↗</span>
        </button>
        <span className="network-badge">{phone.networkType}</span>
      </div>
      <div className="product-content">
        <p className="eyebrow" title={phone.brand}>{phone.brand}</p>
        <h2 title={phone.model}>{phone.model}</h2>
        <p className="selling-price">{money(phone.sellingPrice)}</p>
        <p className="mrp">MRP <s>{money(phone.mrp)}</s></p>
        <span className={`stock-pill ${available === 0 ? "out" : available <= phone.reorderLevel ? "low" : ""}`}>
          {available === 0 ? "Out of stock" : `${available} in stock`}
        </span>
        <div className="spec-grid" aria-label={`${phone.model} specifications`}>
          <div><strong title={`${phone.ramGb}GB RAM`}>{phone.ramGb}GB RAM</strong></div>
          <div><strong title={`${phone.storageGb}GB Storage`}>{phone.storageGb}GB</strong></div>
          <div><strong title={phone.colour}><i style={{ background: phone.colourHex }} />{phone.colour}</strong></div>
        </div>
        <div className="card-actions">
          <a className="whatsapp-btn" href={`https://wa.me/917011693657?text=${encodeURIComponent(whatsappText)}`} target="_blank" rel="noreferrer" aria-label={`Ask Mangla Communication about ${phone.model} on WhatsApp`}>
            <WhatsAppIcon /> WhatsApp
          </a>
          <button className="share-btn" onClick={share} aria-label={`Share ${phone.model}`} title="Share product">›</button>
        </div>
      </div>
      {imageOpen && createPortal(<div className="image-lightbox" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) setImageOpen(false); }}>
        <section role="dialog" aria-modal="true" aria-label={`${phone.brand} ${phone.model} product image`}>
          <button type="button" className="lightbox-close" onClick={() => setImageOpen(false)} aria-label="Close enlarged image">×</button>
          <img src={artwork} alt={`${phone.colour} ${phone.brand} ${phone.model}`} />
          <div><strong>{phone.brand} {phone.model}</strong><span>{phone.ramGb}GB / {phone.storageGb}GB · {phone.colour}</span></div>
        </section>
      </div>, document.body)}
    </article>
  );
}

export default function Storefront() {
  const [inventory, setInventory] = useState<PhoneVariant[]>([]);
  const [loading, setLoading] = useState(true);
  const [theme, setTheme] = useState<"light" | "dark">("light");
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
    const initial = saved === "light" || saved === "dark" ? saved : "light";
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

  const clearFilters = () => { setBrand("All phones"); setRam("All"); setStorage("All"); setMaxPrice("All"); setInStock(false); setQuery(""); };

  return (
    <main className="storefront-shell">
      <header className="site-header">
        <a href="#top" className="brand-lockup" aria-label="Mangla Communication home">
          <img src="/mangla-logo.svg" alt="Mangla Communication" className="brand-logo" />
        </a>
        <div className="header-actions">
          <a className="header-download" href="https://github.com/shadababbas01/phone-stock-inventory/releases/download/android-latest/Mangla-Communication.apk" target="_blank" rel="noreferrer" aria-label="Download Android app"><span aria-hidden="true">⇩</span><b>Download app</b></a>
          <a className="header-whatsapp" href={`https://wa.me/917011693657?text=${encodeURIComponent("is this device in stock?")}`} target="_blank" rel="noreferrer" aria-label="Chat with Mangla Communication on WhatsApp" title="WhatsApp"><WhatsAppIcon /></a>
          <button type="button" className="theme-toggle" onClick={toggleTheme} aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`} title={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}><b aria-hidden="true">{theme === "dark" ? "☀" : "☾"}</b></button>
          <a href="/admin" className="admin-link" aria-label="Admin login" title="Admin login"><span aria-hidden="true">♙</span></a>
        </div>
        <div className="header-ticker" aria-label="Cheaper than Cheapest">
          <div className="header-ticker-track">
            <span>Cheaper than Cheapest&nbsp;&nbsp;•&nbsp;&nbsp;Cheaper than Cheapest&nbsp;&nbsp;•&nbsp;&nbsp;Cheaper than Cheapest&nbsp;&nbsp;•&nbsp;&nbsp;</span>
            <span aria-hidden="true">Cheaper than Cheapest&nbsp;&nbsp;•&nbsp;&nbsp;Cheaper than Cheapest&nbsp;&nbsp;•&nbsp;&nbsp;Cheaper than Cheapest&nbsp;&nbsp;•&nbsp;&nbsp;</span>
          </div>
        </div>
      </header>

      <section className="hero" id="top">
        <div className="container">
          <div className="search-row">
            <label className="search-box">
              <SearchIcon />
              <span className="sr-only">Search phones</span>
              <input id="catalog-search" value={query} onChange={e => setQuery(e.target.value)} placeholder="Search phone by name or model" />
              {query && <button onClick={() => setQuery("")} aria-label="Clear search">×</button>}
            </label>
            <button className="filter-trigger" type="button" onClick={() => setFiltersOpen(v => !v)} aria-expanded={filtersOpen}><span aria-hidden="true">▽</span> Filter</button>
          </div>
          <div className={`quick-filters ${filtersOpen ? "open" : ""}`} id="brands">
            <div className="brand-chips" role="group" aria-label="Filter by brand">
              {brands.map(item => <button key={item} className={brand === item ? "selected" : ""} onClick={() => setBrand(item)}>{item}</button>)}
            </div>
            <div className="filter-selects">
              <label><span>Brand</span><select value={brand} onChange={e => setBrand(e.target.value)}>{brandOptions.map(item => <option key={item} value={item}>{item === "All phones" ? "All" : item}</option>)}</select></label>
              <label><span>RAM</span><select value={ram} onChange={e => setRam(e.target.value)}><option>All</option><option>8</option><option>12</option><option>16</option></select></label>
              <label><span>Storage</span><select value={storage} onChange={e => setStorage(e.target.value)}><option>All</option><option>128</option><option>256</option><option>512</option></select></label>
              <label><span>Price</span><select value={maxPrice} onChange={e => setMaxPrice(e.target.value)}><option>All</option><option value="25000">Under ₹25k</option><option value="50000">Under ₹50k</option><option value="75000">Under ₹75k</option></select></label>
              <label className="checkbox-filter"><input type="checkbox" checked={inStock} onChange={e => setInStock(e.target.checked)} /> In stock</label>
            </div>
          </div>
        </div>
      </section>

      <section className="catalog container" id="inventory">
        <div className="catalog-toolbar">
          <div className="catalog-title"><h1>Phones</h1><span>{filtered.length}</span></div>
          <label><span className="sr-only">Sort phones</span><select value={sort} onChange={e => setSort(e.target.value)}><option value="featured">Featured</option><option value="price-low">Price: low to high</option><option value="price-high">Price: high to low</option><option value="stock">Most stock</option></select></label>
        </div>

        {loading && !inventory.length ? <div className="inventory-loading" role="status"><span className="loading-spinner" /><strong>Loading inventory…</strong></div> : filtered.length ? <div className="product-grid">{filtered.map(phone => <ProductCard key={phone.id} phone={phone} />)}</div> : (
          <div className="empty-state"><span>⌕</span><h3>No phones found</h3><button onClick={clearFilters}>Clear filters</button></div>
        )}
      </section>

      <nav className="mobile-tabbar" aria-label="Mobile app navigation">
        <a href="#top" className="active" aria-label="Home"><span aria-hidden="true">⌂</span></a>
        <button type="button" aria-label="Search" onClick={() => { document.getElementById("catalog-search")?.focus(); window.scrollTo({ top: 0, behavior: "smooth" }); }}><span aria-hidden="true">⌕</span></button>
        <a href="#inventory" aria-label="Phones"><span aria-hidden="true">▦</span></a>
        <a href="/admin" aria-label="Admin"><span aria-hidden="true">⚙</span></a>
      </nav>
      {toast && <div className="toast" role="status">✓ {toast}</div>}
    </main>
  );
}
