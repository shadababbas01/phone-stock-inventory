"use client";

import { useEffect, useMemo, useState } from "react";
import { money, sampleInventory, type PhoneVariant } from "@/lib/catalog";

const brands = ["All phones", "Samsung", "Apple", "Motorola", "OnePlus", "Nothing", "Google"];

function SearchIcon() {
  return <span aria-hidden="true" className="search-icon" />;
}

function ProductCard({ phone }: { phone: PhoneVariant }) {
  const available = Math.max(0, phone.availableStock - phone.reservedStock);
  const savings = phone.mrp - phone.sellingPrice;
  const shareText = `${phone.brand} ${phone.model} · ${phone.ramGb}GB/${phone.storageGb}GB · ${phone.colour} · ${money(phone.sellingPrice)} · ${available > 0 ? `${available} available` : "Out of stock"}`;
  const share = async () => {
    const url = `${window.location.origin}/?phone=${phone.slug}`;
    if (navigator.share) await navigator.share({ title: `${phone.brand} ${phone.model}`, text: shareText, url });
    else {
      await navigator.clipboard.writeText(url);
      window.dispatchEvent(new CustomEvent("phonestock-toast", { detail: "Product link copied" }));
    }
  };

  return (
    <article className="product-card" id={phone.slug}>
      <div className="product-image-wrap">
        {/* Locally optimized WebP keeps the catalogue lightweight without a remote image service. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={phone.imageUrl} alt={`Brand-neutral product representation for ${phone.brand} ${phone.model}`} className="product-image" />
        <span className="network-badge">{phone.networkType}</span>
      </div>
      <div className="product-content">
        <p className="eyebrow">{phone.brand}</p>
        <h2>{phone.model}</h2>
        <p className="variant-line">{phone.ramGb} GB RAM <span>•</span> {phone.storageGb} GB</p>
        <p className="colour-line"><span style={{ background: phone.colourHex }} />{phone.colour}</p>
        <div className="price-rule" />
        <p className="selling-price">{money(phone.sellingPrice)}</p>
        <p className="mrp">MRP <s>{money(phone.mrp)}</s> <strong>Save {money(savings)}</strong></p>
        <span className={`stock-pill ${available === 0 ? "out" : available <= phone.reorderLevel ? "low" : ""}`}>
          {available === 0 ? "Out of stock" : `${available} in stock`}
        </span>
        <div className="card-actions">
          <a className="whatsapp-btn" href={`https://wa.me/?text=${encodeURIComponent(shareText)}`} target="_blank" rel="noreferrer" aria-label={`Share ${phone.model} on WhatsApp`}>
            <span aria-hidden="true">◉</span> WhatsApp
          </a>
          <button className="share-btn" onClick={share} aria-label={`Share ${phone.model}`} title="Share product">↗</button>
        </div>
        <p className="updated"><span aria-hidden="true">◷</span> Updated {phone.updatedAt.toLowerCase()}</p>
      </div>
    </article>
  );
}

export default function Storefront() {
  const [inventory, setInventory] = useState(sampleInventory);
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
    fetch("/api/inventory", { cache: "no-store" }).then(r => r.ok ? r.json() : Promise.reject()).then(data => {
      if (Array.isArray(data.inventory) && data.inventory.length) setInventory(data.inventory);
    }).catch(() => undefined);
    const listener = (event: Event) => setToast((event as CustomEvent<string>).detail);
    window.addEventListener("phonestock-toast", listener);
    return () => window.removeEventListener("phonestock-toast", listener);
  }, []);

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

  const totalAvailable = inventory.reduce((sum, p) => sum + Math.max(0, p.availableStock - p.reservedStock), 0);
  const modelCount = new Set(inventory.map(p => `${p.brand}-${p.model}`)).size;
  const clearFilters = () => { setBrand("All phones"); setRam("All"); setStorage("All"); setMaxPrice("All"); setInStock(false); setQuery(""); };

  return (
    <main className="storefront-shell">
      <header className="site-header">
        <a href="#top" className="brand-lockup" aria-label="Mangla Communication home">
          <span className="logo-mark" aria-hidden="true"><span>₹</span></span>
          <span>Mangla <em>Communication</em></span>
        </a>
        <nav aria-label="Primary navigation">
          <a href="#inventory" className="active">Inventory</a>
          <a href="#brands">Brands</a>
          <a href="#updates">Price updates</a>
        </nav>
        <a href="/admin" className="admin-link"><span aria-hidden="true">♙</span> Admin</a>
      </header>

      <section className="hero" id="top">
        <div className="container">
          <p className="hero-kicker">Mangla Communication · Live inventory</p>
          <h1>Find the right phone, <span>in stock today.</span></h1>
          <label className="search-box">
            <SearchIcon />
            <span className="sr-only">Search phones</span>
            <input id="catalog-search" value={query} onChange={e => setQuery(e.target.value)} placeholder="Search by brand, model, RAM, storage or colour" />
            {query && <button onClick={() => setQuery("")} aria-label="Clear search">×</button>}
          </label>
        </div>
      </section>

      <section className="catalog container" id="inventory">
        <div className="filter-bar" id="brands">
          <div className="brand-chips" role="group" aria-label="Filter by brand">
            {brands.slice(0, 4).map(item => <button key={item} className={brand === item ? "selected" : ""} onClick={() => setBrand(item)}>{item}</button>)}
          </div>
          <button className="mobile-filter-button" onClick={() => setFiltersOpen(v => !v)} aria-expanded={filtersOpen}>Filters <span>▾</span></button>
          <div className={`filter-selects ${filtersOpen ? "open" : ""}`}>
            <label><span>RAM</span><select value={ram} onChange={e => setRam(e.target.value)}><option>All</option><option>8</option><option>12</option><option>16</option></select></label>
            <label><span>Storage</span><select value={storage} onChange={e => setStorage(e.target.value)}><option>All</option><option>128</option><option>256</option><option>512</option></select></label>
            <label><span>Price</span><select value={maxPrice} onChange={e => setMaxPrice(e.target.value)}><option>All</option><option value="25000">Under ₹25k</option><option value="50000">Under ₹50k</option><option value="75000">Under ₹75k</option></select></label>
            <label className="checkbox-filter"><input type="checkbox" checked={inStock} onChange={e => setInStock(e.target.checked)} /> In stock</label>
          </div>
        </div>

        <div className="stats-strip" id="updates">
          <div><span className="stat-icon amber">▯</span><p><strong>{modelCount}</strong><span>Models listed</span></p></div>
          <div><span className="stat-icon teal">◇</span><p><strong>{totalAvailable}</strong><span>Phones available</span></p></div>
          <div><span className="stat-icon coral">↗</span><p><strong>{inventory.filter(p => p.mrp > p.sellingPrice).length}</strong><span>Best price updates</span></p></div>
          <div className="freshness"><span>●</span> Live stock</div>
        </div>

        <div className="catalog-toolbar">
          <div><h2>Available phones</h2><p>{filtered.length} exact variant{filtered.length === 1 ? "" : "s"} found</p></div>
          <label>Sort by <select value={sort} onChange={e => setSort(e.target.value)}><option value="featured">Featured</option><option value="price-low">Price: low to high</option><option value="price-high">Price: high to low</option><option value="stock">Most stock</option></select></label>
        </div>

        {filtered.length ? <div className="product-grid">{filtered.map(phone => <ProductCard key={phone.id} phone={phone} />)}</div> : (
          <div className="empty-state"><span>⌕</span><h3>No exact variants found</h3><p>Try removing a filter or searching for another model.</p><button onClick={clearFilters}>Clear all filters</button></div>
        )}
      </section>

      <footer><div className="container"><div className="brand-lockup small"><span className="logo-mark"><span>₹</span></span><span>Mangla Communication</span></div><p>Prices and availability can change. Contact the shop to reserve a device.</p><a href="/admin">Shop administration</a></div></footer>
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
