import { useState, useEffect } from "react";
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
  const [method, setMethod] = useState("cod");
  const [payEnabled, setPayEnabled] = useState(false);

  useEffect(() => {
    api.get("/payments/config").then((r) => setPayEnabled(r.data.enabled)).catch(() => {});
  }, []);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const loadRazorpay = () =>
    new Promise((resolve) => {
      if (window.Razorpay) return resolve(true);
      const s = document.createElement("script");
      s.src = "https://checkout.razorpay.com/v1/checkout.js";
      s.onload = () => resolve(true);
      s.onerror = () => resolve(false);
      document.body.appendChild(s);
    });

  const itemsPayload = () => items.map((i) => ({ product_id: i.product_id, name: i.name, price: i.price, quantity: i.quantity }));

  const finish = (data) => {
    setOrder(data);
    clear();
    window.scrollTo(0, 0);
  };

  const payWithRazorpay = async () => {
    const ok = await loadRazorpay();
    if (!ok) return toast.error("Could not load payment gateway. Please try again.");
    const { data: init } = await api.post("/payments/create-order", { ...form, items: itemsPayload(), payment_method: "razorpay" });
    const rzp = new window.Razorpay({
      key: init.key_id,
      amount: init.amount,
      currency: init.currency,
      order_id: init.razorpay_order_id,
      name: "Cosmos Cannabis Cure",
      description: "Premium cannabis wellness",
      prefill: { name: form.customer_name, email: form.email, contact: form.phone },
      theme: { color: "#DF0000" },
      handler: async (res) => {
        try {
          const { data } = await api.post("/payments/verify", {
            order_id: init.order_id,
            razorpay_order_id: res.razorpay_order_id,
            razorpay_payment_id: res.razorpay_payment_id,
            razorpay_signature: res.razorpay_signature,
          });
          finish(data);
        } catch {
          toast.error("Payment verification failed. Please contact support.");
        } finally {
          setLoading(false);
        }
      },
      modal: { ondismiss: () => setLoading(false) },
    });
    rzp.open();
  };

  const submit = async (e) => {
    e.preventDefault();
    if (items.length === 0) return toast.error("Your bag is empty");
    setLoading(true);
    try {
      if (method === "razorpay" && payEnabled) {
        await payWithRazorpay();
        return; // handler resets loading
      }
      const { data } = await api.post("/orders", { ...form, items: itemsPayload(), payment_method: "cod" });
      finish(data);
    } catch (err) {
      const d = err.response?.data?.detail;
      toast.error(typeof d === "string" ? d : "Could not place order. Please try again.");
    } finally {
      if (method !== "razorpay") setLoading(false);
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
          <p className="text-white/50 mb-2">Your order <span className="font-mono">#{order.id.slice(-6).toUpperCase()}</span> is being prepared.</p>
          <p className="text-white/50 mb-10">A confirmation will reach {order.email}. Total: <span className="font-mono">{formatINR(order.total)}</span></p>
          <Link to="/shop" className="btn-fill inline-block px-10 py-4 bg-[#DF0000] text-white label border border-[#DF0000]">Continue Shopping</Link>
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
                  className="w-full border border-white/20 focus:border-white/60 outline-none px-4 py-3 font-mono text-sm bg-transparent"
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
                className="w-full border border-white/20 focus:border-white/60 outline-none px-4 py-3 font-mono text-sm bg-transparent resize-none"
              />
            </div>
            <div>
              <label className="label block mb-3">Payment Method</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  data-testid="pay-method-cod"
                  onClick={() => setMethod("cod")}
                  className={`px-4 py-4 border text-left transition-colors ${method === "cod" ? "border-[#DF0000] bg-white/[0.03]" : "border-white/15 hover:border-white/40"}`}
                >
                  <div className="label mb-1">Cash / UPI on Delivery</div>
                  <div className="text-xs text-white/40">Pay when it arrives</div>
                </button>
                <button
                  type="button"
                  data-testid="pay-method-razorpay"
                  onClick={() => setMethod("razorpay")}
                  className={`px-4 py-4 border text-left transition-colors ${method === "razorpay" ? "border-[#DF0000] bg-white/[0.03]" : "border-white/15 hover:border-white/40"}`}
                >
                  <div className="label mb-1">Pay Online</div>
                  <div className="text-xs text-white/40">{payEnabled ? "UPI · Cards · Netbanking" : "Coming soon"}</div>
                </button>
              </div>
              {method === "razorpay" && !payEnabled && (
                <p data-testid="pay-disabled-note" className="text-xs text-[#FF2A2A] mt-2">Online payments aren't configured yet — add Razorpay keys to enable. Cash on Delivery works now.</p>
              )}
            </div>
            <button
              data-testid="place-order-btn"
              disabled={loading || (method === "razorpay" && !payEnabled)}
              className="btn-fill w-full px-10 py-4 bg-[#DF0000] text-white label border border-[#DF0000] disabled:opacity-50"
            >
              {loading ? "Processing…" : method === "razorpay" ? `Pay Online — ${formatINR(total)}` : `Place Order — ${formatINR(total)}`}
            </button>
            <p className="text-xs text-white/40 text-center">Cash / UPI on delivery · 21+ ID required at handover</p>
          </form>

          <div className="md:col-span-5">
            <div className="border border-white/15 p-8">
              <div className="label mb-6">Your Bag ({items.length})</div>
              {items.map((i) => (
                <div key={i.product_id} className="flex justify-between text-sm py-2 border-b border-white/10">
                  <span>{i.name} <span className="text-white/40 font-mono">×{i.quantity}</span></span>
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
