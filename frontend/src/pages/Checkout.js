import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { toast } from "sonner";
import { api, formatINR } from "@/lib/api";
import { useCart } from "@/context/CartContext";

export default function Checkout() {
  const { items, total, clear } = useCart();
  const [form, setForm] = useState({ customer_name: "", email: "", phone: "", address: "" });
  const [loading, setLoading] = useState(false);
  const [order, setOrder] = useState(null);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    if (items.length === 0) return toast.error("Your bag is empty");
    setLoading(true);
    try {
      const payload = {
        ...form,
        items: items.map((i) => ({ product_id: i.product_id, name: i.name, price: i.price, quantity: i.quantity })),
      };
      const { data } = await api.post("/orders", payload);
      setOrder(data);
      clear();
      window.scrollTo(0, 0);
    } catch (err) {
      toast.error("Could not place order. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (order) {
    return (
      <div data-testid="order-confirmation" className="pt-32 md:pt-40 pb-24 min-h-screen">
        <div className="max-w-[700px] mx-auto px-6 text-center">
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring" }} className="w-16 h-16 bg-[#DF0000] flex items-center justify-center mx-auto mb-8">
            <Check className="w-8 h-8 text-white" />
          </motion.div>
          <div className="label text-[#DF0000] mb-4">[ Order Confirmed ]</div>
          <h1 className="font-display text-5xl md:text-6xl tracking-tight mb-6">Thank you, {order.customer_name.split(" ")[0]}.</h1>
          <p className="text-[#555] mb-2">Your order <span className="font-mono">#{order.id.slice(-6).toUpperCase()}</span> is being prepared.</p>
          <p className="text-[#555] mb-10">A confirmation will reach {order.email}. Total: <span className="font-mono">{formatINR(order.total)}</span></p>
          <Link to="/shop" className="btn-fill inline-block px-10 py-4 bg-[#0A0A0A] text-white label">Continue Shopping</Link>
        </div>
      </div>
    );
  }

  return (
    <div data-testid="checkout-page" className="pt-32 md:pt-40 pb-24 min-h-screen">
      <div className="max-w-[1200px] mx-auto px-6 md:px-10">
        <div className="label text-[#DF0000] mb-4">[ Checkout ]</div>
        <h1 className="font-display text-6xl md:text-7xl tracking-tight leading-[0.85] mb-12">Checkout</h1>

        <div className="grid md:grid-cols-12 gap-12">
          <form onSubmit={submit} className="md:col-span-7 space-y-6">
            {[
              { k: "customer_name", label: "Full Name", type: "text" },
              { k: "email", label: "Email", type: "email" },
              { k: "phone", label: "Phone", type: "tel" },
            ].map((f) => (
              <div key={f.k}>
                <label className="label block mb-2">{f.label}</label>
                <input
                  data-testid={`checkout-${f.k}`}
                  required
                  type={f.type}
                  value={form[f.k]}
                  onChange={set(f.k)}
                  className="w-full border border-[#0A0A0A]/20 focus:border-[#0A0A0A] outline-none px-4 py-3 font-mono text-sm bg-white"
                />
              </div>
            ))}
            <div>
              <label className="label block mb-2">Delivery Address</label>
              <textarea
                data-testid="checkout-address"
                required
                rows={3}
                value={form.address}
                onChange={set("address")}
                className="w-full border border-[#0A0A0A]/20 focus:border-[#0A0A0A] outline-none px-4 py-3 font-mono text-sm bg-white resize-none"
              />
            </div>
            <button
              data-testid="place-order-btn"
              disabled={loading}
              className="btn-fill w-full px-10 py-4 bg-[#DF0000] text-white label border border-[#DF0000] disabled:opacity-50"
            >
              {loading ? "Placing Order…" : `Place Order — ${formatINR(total)}`}
            </button>
            <p className="text-xs text-[#999] text-center">Cash / UPI on delivery · 21+ ID required at handover</p>
          </form>

          <div className="md:col-span-5">
            <div className="border border-[#0A0A0A] p-8">
              <div className="label mb-6">Your Bag ({items.length})</div>
              {items.map((i) => (
                <div key={i.product_id} className="flex justify-between text-sm py-2 border-b border-[#E5E5E5]">
                  <span>{i.name} <span className="text-[#999] font-mono">×{i.quantity}</span></span>
                  <span className="font-mono">{formatINR(i.price * i.quantity)}</span>
                </div>
              ))}
              <div className="flex justify-between text-lg pt-6"><span>Total</span><span className="font-mono">{formatINR(total)}</span></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
