import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import ProductCard from "@/components/ProductCard";

export default function Shop() {
  const [products, setProducts] = useState([]);
  const [filter, setFilter] = useState("All");

  useEffect(() => {
    api.get("/products").then((r) => setProducts(r.data)).catch(() => {});
  }, []);

  const effects = ["All", ...Array.from(new Set(products.map((p) => p.effect)))];
  const shown = filter === "All" ? products : products.filter((p) => p.effect === filter);

  return (
    <div data-testid="shop-page" className="pt-32 md:pt-40 pb-24 min-h-screen">
      <div className="max-w-[1600px] mx-auto px-6 md:px-10">
        <div className="label text-[#DF0000] mb-4">[ Shop All ]</div>
        <h1 className="font-display text-6xl md:text-8xl tracking-tight leading-[0.85] mb-12">The Collection</h1>

        <div className="flex flex-wrap gap-3 mb-16 border-t border-white/10 pt-8">
          {effects.map((e) => (
            <button
              key={e}
              data-testid={`filter-${e.toLowerCase()}`}
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
