import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Minus, Plus, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { api, formatINR } from "@/lib/api";
import { useCart } from "@/context/CartContext";

export default function ProductDetail() {
  const { slug } = useParams();
  const [product, setProduct] = useState(null);
  const [qty, setQty] = useState(1);
  const { add } = useCart();
  const navigate = useNavigate();

  useEffect(() => {
    setProduct(null);
    setQty(1);
    api.get(`/products/${slug}`).then((r) => setProduct(r.data)).catch(() => setProduct(false));
  }, [slug]);

  if (product === false) return <div className="pt-40 text-center min-h-screen">Product not found.</div>;
  if (!product) return <div className="pt-40 text-center min-h-screen label">Loading…</div>;

  const specs = [
    { k: "THC", v: product.thc },
    { k: "CBD", v: product.cbd },
    { k: "Effect", v: product.effect },
    { k: "Flavor", v: product.flavor },
  ];

  const handleAdd = () => {
    add(product, qty);
    toast.success(`${product.name} × ${qty} added to bag`);
  };

  return (
    <div data-testid="product-detail-page" className="relative min-h-screen overflow-hidden pt-24 md:pt-28 pb-24">
      {/* celestial background: drifting stars + slowly rotating COSMOS seal */}
      <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
        <div className="twinkle-layer twinkle-1" />
        <div className="twinkle-layer twinkle-3" />
        <motion.img
          src="/brand-assets/logos/cosmos-seal.png"
          alt=""
          aria-hidden
          animate={{ rotate: 360 }}
          transition={{ duration: 160, repeat: Infinity, ease: "linear" }}
          className="absolute top-[46%] left-[32%] -translate-x-1/2 -translate-y-1/2 w-[75vw] max-w-[820px] opacity-[0.07]"
        />
        <div
          className="absolute top-[46%] left-[32%] -translate-x-1/2 -translate-y-1/2 w-[70vw] h-[70vw] max-w-[760px] max-h-[760px] rounded-full"
          style={{ background: "radial-gradient(circle, rgba(223,0,0,0.16), transparent 66%)" }}
        />
      </div>

      <div className="relative z-10 max-w-[1600px] mx-auto px-6 md:px-10">
        <Link to="/shop" className="label inline-flex items-center gap-2 mb-4 md:mb-8 hover:text-[#FF2A2A] transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Shop
        </Link>

        <div className="grid md:grid-cols-12 gap-8 md:gap-10 items-center md:min-h-[74vh]">
          {/* Product cut-out floating in the celestial field */}
          <div className="md:col-span-7 relative flex items-center justify-center min-h-[46vh] md:min-h-[70vh]">
            <motion.div
              key={product.slug}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
              className="relative z-10 w-full flex justify-center"
            >
              <motion.img
                src={product.image}
                alt={product.name}
                animate={{ y: [-12, 12] }}
                transition={{ duration: 6, repeat: Infinity, repeatType: "reverse", ease: "easeInOut" }}
                className="w-full max-w-[440px] md:max-w-[520px] object-contain drop-shadow-[0_40px_110px_rgba(223,0,0,0.35)]"
              />
            </motion.div>
          </div>

          {/* Info */}
          <div className="md:col-span-5 md:py-4">
            <Link to={`/brand/${(product.brand || "").toLowerCase().replace(/\s+/g, "-")}`} className="label text-[#FF2A2A] mb-4 inline-flex items-center gap-2 hover:underline" data-testid="product-brand-link">{product.brand} →</Link>
            <motion.h1
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
              className="font-display text-6xl md:text-7xl tracking-tight leading-[0.88]"
            >
              {product.name}
            </motion.h1>
            <p className="text-xl text-white/50 mt-3 mb-2">{product.tagline}</p>
            <div className="label text-white/35 mb-6">A Cosmos Partner Brand · {product.effect}</div>
            <div className="font-mono text-2xl mb-8">{formatINR(product.price)}</div>
            <p className="text-white/70 leading-relaxed max-w-md mb-10">{product.description}</p>

            <div className="grid grid-cols-4 border-t border-l border-white/10 mb-10 max-w-md backdrop-blur-sm">
              {specs.map((s) => (
                <div key={s.k} className="border-r border-b border-white/10 p-4">
                  <div className="label text-white/40 mb-2">{s.k}</div>
                  <div className="font-mono text-sm">{s.v}</div>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center border border-white/20">
                <button data-testid="qty-decrease" onClick={() => setQty((q) => Math.max(1, q - 1))} className="p-4 hover:bg-white/5">
                  <Minus className="w-4 h-4" />
                </button>
                <span data-testid="qty-value" className="w-12 text-center font-mono">{qty}</span>
                <button data-testid="qty-increase" onClick={() => setQty((q) => q + 1)} className="p-4 hover:bg-white/5">
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              <button
                data-testid={`add-to-cart-${product.slug}`}
                onClick={handleAdd}
                className="btn-fill flex-1 min-w-[200px] px-10 py-4 bg-[#DF0000] text-white label border border-[#DF0000]"
              >
                Add to Bag — {formatINR(product.price * qty)}
              </button>
            </div>

            <button
              data-testid="buy-now-btn"
              onClick={() => { add(product, qty); navigate("/checkout"); }}
              className="mt-4 w-full px-10 py-4 border border-white/20 label hover:bg-white hover:text-black transition-colors"
            >
              Buy Now
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
