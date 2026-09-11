import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import ProductCard from "@/components/ProductCard";

export default function Shop() {
  const [products, setProducts] = useState([]);
  const [filter, setFilter] = useState("All");

  useEffect(() => {
    api.get("/products").then((r) => setProducts(r.data)).catch(() => {});
  }, []);

  const brands = ["All", ...Array.from(new Set(products.map((p) => p.brand)))];
  const shown = filter === "All" ? products : products.filter((p) => p.brand === filter);

  return (
    <div data-testid="shop-page" className="pt-32 md:pt-40 pb-24 min-h-screen">
      <div className="max-w-[1600px] mx-auto px-6 md:px-10">
        <div className="label text-[#FF2A2A] mb-4">[ Shop All ]</div>
        <h1 className="font-display text-6xl md:text-8xl tracking-tight leading-[0.85] mb-4">The Collection</h1>
        <p className="text-white/50 max-w-lg mb-12">Three partner brands. One curated dispensary. Filter by house below.</p>

        <div className="flex flex-wrap gap-3 mb-16 border-t border-white/10 pt-8">
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

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-10">
          {shown.map((p, i) => (
            <ProductCard key={p.id} product={p} index={i} />
          ))}
        </div>
      </div>
    </div>
  );
}
