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
    <div data-testid="product-detail-page" className="pt-24 md:pt-28 pb-24 min-h-screen">
      <div className="max-w-[1600px] mx-auto px-6 md:px-10">
        <Link to="/shop" className="label inline-flex items-center gap-2 mb-8 hover:text-[#DF0000] transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Shop
        </Link>
        <div className="grid md:grid-cols-2 gap-10 md:gap-16">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.6 }} className="bg-[#F5F5F5] aspect-square overflow-hidden">
            <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
          </motion.div>

          <div className="md:py-4">
            <div className="label text-[#DF0000] mb-4">{product.effect}</div>
            <h1 className="font-display text-6xl md:text-7xl tracking-tight leading-[0.9]">{product.name}</h1>
            <p className="text-xl text-[#555] mt-3 mb-6">{product.tagline}</p>
            <div className="font-mono text-2xl mb-8">{formatINR(product.price)}</div>
            <p className="text-[#333] leading-relaxed max-w-md mb-10">{product.description}</p>

            <div className="grid grid-cols-4 border-t border-l border-[#E5E5E5] mb-10 max-w-md">
              {specs.map((s) => (
                <div key={s.k} className="border-r border-b border-[#E5E5E5] p-4">
                  <div className="label text-[#999] mb-2">{s.k}</div>
                  <div className="font-mono text-sm">{s.v}</div>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center border border-[#0A0A0A]">
                <button data-testid="qty-decrease" onClick={() => setQty((q) => Math.max(1, q - 1))} className="p-4 hover:bg-[#F5F5F5]">
                  <Minus className="w-4 h-4" />
                </button>
                <span data-testid="qty-value" className="w-12 text-center font-mono">{qty}</span>
                <button data-testid="qty-increase" onClick={() => setQty((q) => q + 1)} className="p-4 hover:bg-[#F5F5F5]">
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
              className="mt-4 w-full px-10 py-4 border border-[#0A0A0A] label hover:bg-[#0A0A0A] hover:text-white transition-colors"
            >
              Buy Now
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
