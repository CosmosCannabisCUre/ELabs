import { Link, useNavigate } from "react-router-dom";
import { Minus, Plus, X, ArrowRight } from "lucide-react";
import { useCart } from "@/context/CartContext";
import { formatINR } from "@/lib/api";

export default function Cart() {
  const { items, setQty, remove, total } = useCart();
  const navigate = useNavigate();

  return (
    <div data-testid="cart-page" className="pt-32 md:pt-40 pb-24 min-h-screen">
      <div className="max-w-[1200px] mx-auto px-6 md:px-10">
        <div className="label text-[#DF0000] mb-4">[ Your Bag ]</div>
        <h1 className="font-display text-6xl md:text-7xl tracking-tight leading-[0.85] mb-12">Cart</h1>

        {items.length === 0 ? (
          <div className="border-t border-white/10 py-20 text-center">
            <p className="text-white/50 mb-8">Your bag is empty.</p>
            <Link to="/shop" className="btn-fill inline-block px-10 py-4 bg-[#DF0000] text-white label border border-[#DF0000]">Shop the Collection</Link>
          </div>
        ) : (
          <div className="grid md:grid-cols-12 gap-12">
            <div className="md:col-span-8 border-t border-white/15">
              {items.map((i) => (
                <div key={i.product_id} data-testid={`cart-item-${i.product_id}`} className="flex gap-6 py-6 border-b border-white/10">
                  <div className="w-24 h-28 bg-[#F5F5F5] overflow-hidden shrink-0">
                    <img src={i.image} alt={i.name} className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1 flex flex-col justify-between">
                    <div className="flex justify-between items-start">
                      <h3 className="font-display text-2xl">{i.name}</h3>
                      <button data-testid={`cart-remove-${i.product_id}`} onClick={() => remove(i.product_id)} className="text-white/40 hover:text-[#FF2A2A]">
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                    <div className="flex justify-between items-end">
                      <div className="flex items-center border border-white/10">
                        <button onClick={() => setQty(i.product_id, i.quantity - 1)} className="p-2 hover:bg-white/5"><Minus className="w-3 h-3" /></button>
                        <span className="w-10 text-center font-mono text-sm">{i.quantity}</span>
                        <button onClick={() => setQty(i.product_id, i.quantity + 1)} className="p-2 hover:bg-white/5"><Plus className="w-3 h-3" /></button>
                      </div>
                      <span className="font-mono">{formatINR(i.price * i.quantity)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="md:col-span-4">
              <div className="border border-white/15 p-8 sticky top-28">
                <div className="label mb-6">Summary</div>
                <div className="flex justify-between text-sm mb-3"><span className="text-white/50">Subtotal</span><span className="font-mono">{formatINR(total)}</span></div>
                <div className="flex justify-between text-sm mb-6"><span className="text-white/50">Delivery</span><span className="font-mono">Free</span></div>
                <div className="flex justify-between text-lg border-t border-white/10 pt-4 mb-8"><span>Total</span><span className="font-mono">{formatINR(total)}</span></div>
                <button
                  data-testid="checkout-btn"
                  onClick={() => navigate("/checkout")}
                  className="btn-fill w-full flex items-center justify-center gap-3 px-10 py-4 bg-[#DF0000] text-white label border border-[#DF0000]"
                >
                  Checkout <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
