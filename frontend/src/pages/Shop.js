import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import ProductCard from "@/components/ProductCard";

const BRAND_ORDER = ["Trost", "Moon Impact", "Cannazo"];
const TYPE_ORDER = ["Gummies", "Oils & Drops", "Tablets & Capsules", "Topicals", "Kits & Combos", "Smokes", "Pet Care"];

export default function Shop() {
  const [products, setProducts] = useState([]);
  const [filter, setFilter] = useState("All");
  const [typeFilter, setTypeFilter] = useState("All");

  useEffect(() => {
    api.get("/products").then((r) => setProducts(r.data)).catch(() => {});
  }, []);

  const present = Array.from(new Set(products.map((p) => p.brand)));
  const brands = ["All", ...BRAND_ORDER.filter((b) => present.includes(b)), ...present.filter((b) => !BRAND_ORDER.includes(b))];
  const brandMatch = (p) => filter === "All" || p.brand === filter;
  const types = TYPE_ORDER.filter((t) => products.some((p) => p.category === t && brandMatch(p)));
  const shown = products.filter((p) => brandMatch(p) && (typeFilter === "All" || p.category === typeFilter));

  return (
    <div data-testid="shop-page" className="pt-32 md:pt-40 pb-24 min-h-screen">
      <div className="max-w-[1600px] mx-auto px-6 md:px-10">
        <div className="label text-[#FF2A2A] mb-4">[ Shop All ]</div>
        <h1 className="font-display text-6xl md:text-8xl tracking-tight leading-[0.85] mb-4">The Collection</h1>
        <p className="text-white/50 max-w-lg mb-12">Three partner brands. One curated dispensary. Filter by house below.</p>

        <div className="flex flex-wrap gap-3 mb-4 border-t border-white/10 pt-8">
          {brands.map((e) => (
            <button
              key={e}
              data-testid={`filter-${e.toLowerCase().replace(/\s+/g, "-")}`}
              onClick={() => setFilter(e)}
              className={`px-6 py-2 label border transition-colors ${
                filter === e ? "bg-[#DF0000] text-white border-[#DF0000]" : "border-white/15 hover:border-white"
              }`}
            >
              {e}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap gap-2 mb-16" data-testid="type-filters">
          {["All", ...types].map((t) => (
            <button
              key={t}
              data-testid={`type-filter-${t === "All" ? "all" : t.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}
              onClick={() => setTypeFilter(t)}
              className={`px-4 py-1.5 label text-[10px] border transition-colors ${
                typeFilter === t ? "bg-white text-black border-white" : "border-white/10 text-white/45 hover:border-white/40 hover:text-white"
              }`}
            >
              {t === "All" ? "All Types" : `${t} · ${products.filter((p) => p.category === t && brandMatch(p)).length}`}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-10">
          {shown.map((p, i) => (
            <ProductCard key={p.id} product={p} index={i} />
          ))}
        </div>
        {shown.length === 0 && (
          <p data-testid="no-products-note" className="text-white/40 label mt-8">Nothing in this combination yet — try another type.</p>
        )}
      </div>
    </div>
  );
}
