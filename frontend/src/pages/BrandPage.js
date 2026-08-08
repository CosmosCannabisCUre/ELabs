import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowUpRight, ArrowLeft } from "lucide-react";
import { api } from "@/lib/api";
import { BRANDS, brandSlug } from "@/lib/brands";
import ProductCard from "@/components/ProductCard";

export default function BrandPage() {
  const { slug } = useParams();
  const brand = BRANDS[slug];
  const [products, setProducts] = useState([]);

  useEffect(() => {
    window.scrollTo(0, 0);
    api.get("/products").then((r) => setProducts(r.data.filter((p) => brandSlug(p.brand) === slug))).catch(() => {});
  }, [slug]);

  if (!brand) return <div className="pt-40 text-center min-h-screen">Brand not found.</div>;

  return (
    <div data-testid={`brand-page-${slug}`} className="pt-24 md:pt-28 pb-24 min-h-screen">
      <div className="max-w-[1600px] mx-auto px-6 md:px-10">
        <Link to="/shop" className="label inline-flex items-center gap-2 mb-10 hover:text-[#FF2A2A] transition-colors">
          <ArrowLeft className="w-4 h-4" /> All Brands
        </Link>

        {/* Brand hero */}
        <div className="border-t border-white/10 pt-10">
          <div className="grid md:grid-cols-12 gap-8 md:gap-10">
            <div className="md:col-span-7">
              <div className="label text-[#FF2A2A] mb-6">Cosmos Partner Brand</div>
              <motion.h1
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                className="font-display text-6xl md:text-8xl tracking-tight leading-[0.85]"
              >
                {brand.name}
              </motion.h1>
              <p className="text-xl text-white/60 mt-6 max-w-lg">{brand.tagline}</p>
            </div>
            <div className="md:col-span-4 md:col-start-9 self-end">
              <div className="grid grid-cols-1 border-t border-white/10">
                {[
                  { k: "Origin", v: brand.origin },
                  { k: "House", v: brand.house },
                  { k: "Official", v: brand.site },
                ].map((m) => (
                  <div key={m.k} className="flex justify-between py-4 border-b border-white/10">
                    <span className="label text-white/40">{m.k}</span>
                    <span className="font-mono text-sm">{m.v}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Ethos */}
        <div className="grid md:grid-cols-12 gap-8 md:gap-10 py-20 md:py-28">
          <div className="md:col-span-3 label text-white/40">[ The Ethos ]</div>
          <div className="md:col-span-8 space-y-8">
            {brand.ethos.map((para, i) => (
              <motion.p
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: i * 0.08 }}
                className="font-display text-2xl md:text-3xl leading-snug text-white/85"
              >
                {para}
              </motion.p>
            ))}
          </div>
        </div>

        {/* Product range */}
        <div className="flex items-end justify-between mb-12 border-t border-white/10 pt-10">
          <h2 className="font-display text-4xl md:text-6xl tracking-tight">The Range</h2>
          <span className="label text-white/40">{products.length} products</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
          {products.map((p, i) => (
            <ProductCard key={p.id} product={p} index={i} />
          ))}
        </div>

        {/* Other brands */}
        <div className="mt-28 border-t border-white/10 pt-10">
          <div className="label text-white/40 mb-8">Explore other houses</div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-white/10">
            {Object.values(BRANDS).filter((b) => b.slug !== slug).map((b) => (
              <Link
                key={b.slug}
                to={`/brand/${b.slug}`}
                data-testid={`brand-link-${b.slug}`}
                className="bg-[#050507] hover:bg-white/[0.03] py-10 flex items-center justify-center gap-2 group transition-colors"
              >
                <span className="font-display text-2xl md:text-3xl group-hover:text-[#FF2A2A] transition-colors">{b.name}</span>
                <ArrowUpRight className="w-4 h-4 text-white/30 group-hover:text-[#FF2A2A]" />
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
