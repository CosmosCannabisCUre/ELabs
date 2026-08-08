import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { api, formatINR } from "@/lib/api";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

const STATUSES = ["pending", "processing", "shipped", "delivered", "cancelled"];
const EMPTY = { slug: "", name: "", tagline: "", description: "", price: 0, thc: "10mg", cbd: "0mg", effect: "Balance", flavor: "Berry", image: "", stock: 100, featured: true };

export default function AdminDashboard() {
  const [tab, setTab] = useState("orders");
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [passports, setPassports] = useState([]);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const navigate = useNavigate();

  const load = useCallback(async () => {
    try {
      const [o, p] = await Promise.all([api.get("/orders"), api.get("/products")]);
      setOrders(o.data);
      setProducts(p.data);
      api.get("/passports").then((r) => setPassports(r.data)).catch(() => {});
    } catch (err) {
      if (err.response?.status === 401) navigate("/admin");
    }
  }, [navigate]);

  useEffect(() => {
    if (!localStorage.getItem("ccc_token")) return navigate("/admin");
    api.get("/auth/me").then(load).catch(() => navigate("/admin"));
  }, [navigate, load]);

  const logout = () => { localStorage.removeItem("ccc_token"); navigate("/admin"); };

  const setStatus = async (id, status) => {
    await api.patch(`/orders/${id}`, { status });
    setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, status } : o)));
    toast.success("Order updated");
  };

  const viewRx = async (rxId) => {    try {
      const { data } = await api.get(`/prescriptions/${rxId}/download`, { responseType: "blob" });
      const url = URL.createObjectURL(data);
      window.open(url, "_blank", "noopener");
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch {
      toast.error("Could not open prescription");
    }
  };

  const remind = async (code) => {
    try {
      const { data } = await api.post(`/passports/${code}/remind`);
      toast.success(data.sent ? `Reminder sent to ${data.email}` : "Reminder queued");
    } catch {
      toast.error("Could not send reminder");
    }
  };

  const openNew = () => { setForm(EMPTY); setEditing("new"); };
  const openEdit = (p) => { setForm(p); setEditing(p.id); };

  const saveProduct = async (e) => {
    e.preventDefault();
    const payload = { ...form, price: Number(form.price), stock: Number(form.stock) };
    try {
      if (editing === "new") await api.post("/products", payload);
      else await api.put(`/products/${editing}`, payload);
      toast.success("Saved");
      setEditing(null);
      load();
    } catch {
      toast.error("Save failed");
    }
  };

  const del = async (id) => {
    await api.delete(`/products/${id}`);
    toast.success("Deleted");
    load();
  };

  const revenue = orders.filter((o) => o.status !== "cancelled").reduce((s, o) => s + o.total, 0);

  return (
    <div data-testid="admin-dashboard" className="min-h-screen bg-white">
      <header className="border-b border-[#0A0A0A] px-6 md:px-10 h-16 flex items-center justify-between">
        <div className="font-display text-xl">Cosmos<span className="text-[#DF0000]">.</span> <span className="label ml-3 text-[#999]">Admin</span></div>
        <button data-testid="admin-logout" onClick={logout} className="label hover:text-[#DF0000]">Logout</button>
      </header>

      <div className="max-w-[1400px] mx-auto px-6 md:px-10 py-10">
        <div className="grid grid-cols-3 gap-px bg-[#E5E5E5] border border-[#E5E5E5] mb-10">
          {[
            { l: "Orders", v: orders.length },
            { l: "Products", v: products.length },
            { l: "Revenue", v: formatINR(revenue) },
          ].map((s) => (
            <div key={s.l} className="bg-white p-6">
              <div className="label text-[#999] mb-2">{s.l}</div>
              <div className="font-display text-3xl">{s.v}</div>
            </div>
          ))}
        </div>

        <div className="flex gap-3 mb-8">
          {["orders", "products", "passports"].map((t) => (
            <button key={t} data-testid={`tab-${t}`} onClick={() => setTab(t)}
              className={`px-6 py-2 label border ${tab === t ? "bg-[#0A0A0A] text-white border-[#0A0A0A]" : "border-[#E5E5E5]"}`}>
              {t}
            </button>
          ))}
        </div>

        {tab === "orders" && (
          <div className="border border-[#0A0A0A] overflow-x-auto">
            <table className="w-full text-sm" data-testid="orders-table">
              <thead className="bg-[#0A0A0A] text-white">
                <tr className="label text-left">
                  <th className="p-4 font-normal">Order</th><th className="p-4 font-normal">Customer</th>
                  <th className="p-4 font-normal">Items</th><th className="p-4 font-normal">Total</th><th className="p-4 font-normal">Rx</th><th className="p-4 font-normal">Status</th>
                </tr>
              </thead>
              <tbody>
                {orders.length === 0 && <tr><td colSpan={6} className="p-8 text-center text-[#999]">No orders yet.</td></tr>}
                {orders.map((o) => (
                  <tr key={o.id} data-testid={`order-row-${o.id}`} className="border-t border-[#E5E5E5]">
                    <td className="p-4 font-mono">#{o.id.slice(-6).toUpperCase()}</td>
                    <td className="p-4">{o.customer_name}<br /><span className="text-[#999] text-xs">{o.phone}</span></td>
                    <td className="p-4 text-xs">{o.items.map((i) => `${i.name}×${i.quantity}`).join(", ")}</td>
                    <td className="p-4 font-mono">{formatINR(o.total)}</td>
                    <td className="p-4 text-xs">
                      {o.prescription_file_id ? (
                        <button data-testid={`view-rx-${o.id}`} onClick={() => viewRx(o.prescription_file_id)} className="text-[#DF0000] underline hover:no-underline">View</button>
                      ) : o.prescription_declared ? (
                        <span className="text-[#999]">Declared</span>
                      ) : (
                        <span className="text-[#CCC]">—</span>
                      )}
                    </td>
                    <td className="p-4">
                      <Select value={o.status} onValueChange={(v) => setStatus(o.id, v)}>
                        <SelectTrigger data-testid={`order-status-${o.id}`} className="w-36 rounded-none border-[#E5E5E5]"><SelectValue /></SelectTrigger>
                        <SelectContent className="rounded-none">
                          {STATUSES.map((s) => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {tab === "products" && (
          <div>
            <button data-testid="add-product-btn" onClick={openNew} className="mb-6 btn-fill px-6 py-3 bg-[#DF0000] text-white label border border-[#DF0000]">+ Add Product</button>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {products.map((p) => (
                <div key={p.id} className="border border-[#E5E5E5] p-5" data-testid={`admin-product-${p.slug}`}>
                  <div className="flex gap-4">
                    <img src={p.image} alt={p.name} className="w-16 h-20 object-cover bg-[#F5F5F5]" />
                    <div className="flex-1">
                      <h3 className="font-display text-xl">{p.name}</h3>
                      <p className="text-xs text-[#999]">{p.effect} · Stock {p.stock}</p>
                      <p className="font-mono text-sm mt-1">{formatINR(p.price)}</p>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-4">
                    <button onClick={() => openEdit(p)} data-testid={`edit-${p.slug}`} className="flex-1 py-2 label border border-[#0A0A0A] hover:bg-[#0A0A0A] hover:text-white transition-colors">Edit</button>
                    <button onClick={() => del(p.id)} data-testid={`delete-${p.slug}`} className="py-2 px-4 label border border-[#DF0000] text-[#DF0000] hover:bg-[#DF0000] hover:text-white transition-colors">Del</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        {tab === "passports" && (
          <div className="border border-[#0A0A0A] overflow-x-auto" data-testid="passports-table">
            <table className="w-full text-sm">
              <thead className="bg-[#0A0A0A] text-white">
                <tr className="label text-left">
                  <th className="p-4 font-normal">Passport</th><th className="p-4 font-normal">Holder</th>
                  <th className="p-4 font-normal">Issued</th><th className="p-4 font-normal">Valid Until</th>
                  <th className="p-4 font-normal">Status</th><th className="p-4 font-normal">Verify</th>
                </tr>
              </thead>
              <tbody>
                {passports.length === 0 && <tr><td colSpan={6} className="p-8 text-center text-[#999]">No passports yet.</td></tr>}
                {passports.map((p) => (
                  <tr key={p.code} className="border-t border-[#E5E5E5]">
                    <td className="p-4 font-mono">{p.passport_number}</td>
                    <td className="p-4">{p.holder_name}<br /><span className="text-[#999] text-xs">{p.phone}</span></td>
                    <td className="p-4">{p.issue_date}</td>
                    <td className="p-4">{p.expiry_date}</td>
                    <td className="p-4">
                      <span className="label" style={{ color: p.status === "valid" ? "#16A34A" : p.status === "expiring" ? "#CA8A04" : "#DF0000" }}>{p.status}</span>
                    </td>
                    <td className="p-4"><a href={`/passport/verify/${p.code}`} target="_blank" rel="noreferrer" className="text-[#DF0000] underline hover:no-underline mr-3">Open</a>
                      <button data-testid={`remind-${p.code}`} onClick={() => remind(p.code)} className="text-[#0A0A0A] underline hover:no-underline">Remind</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Dialog open={editing !== null} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="rounded-none max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="font-display text-2xl">{editing === "new" ? "New Product" : "Edit Product"}</DialogTitle></DialogHeader>
          <form onSubmit={saveProduct} className="space-y-4">
            {[
              { k: "name", l: "Name" }, { k: "slug", l: "Slug" }, { k: "tagline", l: "Tagline" },
              { k: "image", l: "Image URL" }, { k: "effect", l: "Effect" }, { k: "flavor", l: "Flavor" },
              { k: "thc", l: "THC" }, { k: "cbd", l: "CBD" },
            ].map((f) => (
              <div key={f.k}>
                <label className="label block mb-1">{f.l}</label>
                <input required data-testid={`product-field-${f.k}`} value={form[f.k]} onChange={(e) => setForm({ ...form, [f.k]: e.target.value })}
                  className="w-full border border-[#0A0A0A]/20 focus:border-[#0A0A0A] outline-none px-3 py-2 font-mono text-sm" />
              </div>
            ))}
            <div className="grid grid-cols-2 gap-4">
              <div><label className="label block mb-1">Price (₹)</label><input type="number" required value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} className="w-full border border-[#0A0A0A]/20 outline-none px-3 py-2 font-mono text-sm" /></div>
              <div><label className="label block mb-1">Stock</label><input type="number" required value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} className="w-full border border-[#0A0A0A]/20 outline-none px-3 py-2 font-mono text-sm" /></div>
            </div>
            <div>
              <label className="label block mb-1">Description</label>
              <textarea required rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="w-full border border-[#0A0A0A]/20 outline-none px-3 py-2 font-mono text-sm resize-none" />
            </div>
            <button data-testid="save-product-btn" className="btn-fill w-full py-3 bg-[#DF0000] text-white label border border-[#DF0000]">Save Product</button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
