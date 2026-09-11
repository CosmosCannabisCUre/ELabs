import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { api, formatINR } from "@/lib/api";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

const STATUSES = ["awaiting_consultation", "confirmed", "processing", "shipped", "delivered", "cancelled", "pending"];
const EMPTY = { slug: "", name: "", tagline: "", description: "", price: 0, thc: "10mg", cbd: "0mg", effect: "Balance", flavor: "Berry", image: "", stock: 100, featured: true, category: "Gummies", bestseller: false };
const CATEGORIES = ["Gummies", "Oils & Drops", "Tablets & Capsules", "Topicals", "Kits & Combos", "Smokes", "Pet Care"];

export default function AdminDashboard() {
  const [tab, setTab] = useState("queue");
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [passports, setPassports] = useState([]);
  const [waitlist, setWaitlist] = useState([]);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [consult, setConsult] = useState(null); // order being consulted
  const [cForm, setCForm] = useState({ notes: "", validity: 6, practitioner: "" });
  const [cRx, setCRx] = useState(null);
  const [cUploading, setCUploading] = useState(false);
  const navigate = useNavigate();

  const load = useCallback(async () => {
    try {
      const [o, p] = await Promise.all([api.get("/orders"), api.get("/products")]);
      setOrders(o.data);
      setProducts(p.data);
      api.get("/passports").then((r) => setPassports(r.data)).catch(() => {});
      api.get("/waitlist").then((r) => setWaitlist(r.data.entries || [])).catch(() => {});
    } catch (err) {
      if (err.response?.status === 401) navigate("/admin");
    }
  }, [navigate]);

  useEffect(() => {
    if (!localStorage.getItem("ccc_token")) return navigate("/admin");
    api.get("/auth/me").then(load).catch(() => navigate("/admin"));
  }, [navigate, load]);

  const logout = () => { localStorage.removeItem("ccc_token"); navigate("/admin"); };

  const exportWaitlistCsv = () => {
    const rows = [["email", "joined_at"], ...waitlist.map((w) => [w.email, w.created_at])];
    const csv = rows.map((r) => r.map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `cosmos-waitlist-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

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

  const openConsult = (o) => { setConsult(o); setCForm({ notes: "", validity: 6, practitioner: "" }); setCRx(null); };

  const uploadConsultRx = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const { data } = await api.post("/prescriptions/upload", fd, { headers: { "Content-Type": "multipart/form-data" } });
      setCRx(data);
      toast.success("Prescription uploaded");
    } catch (err) {
      toast.error(err.response?.data?.detail || "Upload failed");
    } finally {
      setCUploading(false);
    }
  };

  const submitConsult = async (e) => {
    e.preventDefault();
    if (!cRx) return toast.error("Upload the prescription first");
    try {
      await api.post(`/orders/${consult.id}/consult`, {
        prescription_file_id: cRx.id,
        doctor_notes: cForm.notes,
        practitioner_name: cForm.practitioner || null,
        validity_months: Number(cForm.validity),
      });
      toast.success("Consultation saved · order confirmed · passport issued");
      setConsult(null);
      load();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Could not save consultation");
    }
  };


  const [runningReminders, setRunningReminders] = useState(false);

  const runReminders = async () => {
    if (runningReminders) return;
    setRunningReminders(true);
    try {
      const { data } = await api.post("/passports/run-reminders");
      toast.success(data.sent ? `${data.sent} renewal reminder(s) sent` : "No passports need reminders right now");
    } catch {
      toast.error("Could not run reminders");
    } finally {
      setRunningReminders(false);
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
  const pending = orders.filter((o) => o.status === "awaiting_consultation");

  return (
    <div data-testid="admin-dashboard" className="min-h-screen bg-white text-[#0A0A0A]">
      <header className="border-b border-[#0A0A0A] px-6 md:px-10 h-16 flex items-center justify-between">
        <div className="font-display text-xl">Cosmos<span className="text-[#DF0000]">.</span> <span className="label ml-3 text-[#999]">Admin</span></div>
        <button data-testid="admin-logout" onClick={logout} className="label hover:text-[#DF0000]">Logout</button>
      </header>

      <div className="max-w-[1400px] mx-auto px-6 md:px-10 py-10">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-[#E5E5E5] border border-[#E5E5E5] mb-10">
          {[
            { l: "Pending Consults", v: pending.length },
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

        <div className="flex gap-3 mb-8 flex-wrap">
          {["queue", "orders", "products", "passports", "waitlist"].map((t) => (
            <button key={t} data-testid={`tab-${t}`} onClick={() => setTab(t)}
              className={`px-6 py-2 label border ${tab === t ? "bg-[#0A0A0A] text-white border-[#0A0A0A]" : "border-[#E5E5E5]"}`}>
              {t === "queue" ? `Consult Queue${pending.length ? ` (${pending.length})` : ""}` : t === "waitlist" ? `Waitlist${waitlist.length ? ` (${waitlist.length})` : ""}` : t}
            </button>
          ))}
        </div>

        {tab === "queue" && (
          <div data-testid="consult-queue">
            {pending.length === 0 && <div className="border border-[#E5E5E5] p-10 text-center text-[#999]">No pending consultations. All caught up.</div>}
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {pending.map((o) => (
                <div key={o.id} data-testid={`queue-card-${o.id}`} className="border border-[#0A0A0A] p-5 flex flex-col">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="font-display text-xl leading-none">{o.customer_name}</div>
                      <div className="font-mono text-xs text-[#999] mt-1">#{o.id.slice(-6).toUpperCase()} · {new Date(o.created_at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}</div>
                    </div>
                    {o.is_first_order && <span className="text-[9px] px-1.5 py-0.5 bg-[#DF0000] text-white">FIRST</span>}
                  </div>
                  <div className="text-xs text-[#555] mb-3">{o.items.map((i) => `${i.name}×${i.quantity}`).join(", ")} · <span className="font-mono">{formatINR(o.total)}</span></div>
                  {o.maps_location && <a href={o.maps_location} target="_blank" rel="noreferrer" className="text-[#DF0000] text-xs underline mb-3">Delivery map pin</a>}
                  <div className="mt-auto flex gap-2 pt-3">
                    <a data-testid={`call-${o.id}`} href={`tel:${o.phone}`} className="flex-1 text-center px-3 py-2.5 border border-[#0A0A0A] label text-[10px] hover:bg-[#0A0A0A] hover:text-white transition-colors">Call {o.phone}</a>
                    <button data-testid={`queue-consult-${o.id}`} onClick={() => openConsult(o)} className="flex-1 px-3 py-2.5 bg-[#DF0000] text-white label text-[10px]">Consult &amp; Confirm</button>
                  </div>
                  {o.alternate_phone && <a href={`tel:${o.alternate_phone}`} className="text-[10px] text-[#999] underline mt-2">Alt: {o.alternate_phone}</a>}
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === "orders" && (
          <div className="border border-[#0A0A0A] overflow-x-auto">
            <table className="w-full text-sm" data-testid="orders-table">
              <thead className="bg-[#0A0A0A] text-white">
                <tr className="label text-left">
                  <th className="p-4 font-normal">Order</th><th className="p-4 font-normal">Customer</th>
                  <th className="p-4 font-normal">Items</th><th className="p-4 font-normal">Total</th><th className="p-4 font-normal">Consultation</th><th className="p-4 font-normal">Status</th>
                </tr>
              </thead>
              <tbody>
                {orders.length === 0 && <tr><td colSpan={6} className="p-8 text-center text-[#999]">No orders yet.</td></tr>}
                {orders.map((o) => (
                  <tr key={o.id} data-testid={`order-row-${o.id}`} className="border-t border-[#E5E5E5]">
                    <td className="p-4 font-mono">#{o.id.slice(-6).toUpperCase()}</td>
                    <td className="p-4">
                      {o.customer_name}{o.is_first_order && <span className="ml-2 text-[9px] align-middle px-1.5 py-0.5 bg-[#DF0000] text-white">FIRST</span>}
                      <br /><span className="text-[#999] text-xs">{o.phone}{o.alternate_phone ? ` · alt ${o.alternate_phone}` : ""}</span>
                      {o.maps_location && <><br /><a href={o.maps_location} target="_blank" rel="noreferrer" className="text-[#DF0000] text-xs underline">Map pin</a></>}
                    </td>
                    <td className="p-4 text-xs">{o.items.map((i) => `${i.name}×${i.quantity}`).join(", ")}</td>
                    <td className="p-4 font-mono">{formatINR(o.total)}</td>
                    <td className="p-4 text-xs">
                      {o.status === "awaiting_consultation" ? (
                        <button data-testid={`consult-${o.id}`} onClick={() => openConsult(o)} className="px-3 py-1.5 bg-[#DF0000] text-white label text-[10px]">Consult</button>
                      ) : o.prescription_file_id ? (
                        <div className="space-y-1">
                          <button data-testid={`view-rx-${o.id}`} onClick={() => viewRx(o.prescription_file_id)} className="text-[#DF0000] underline hover:no-underline block">View Rx</button>
                          {o.passport_code && <a href={`/passport/verify/${o.passport_code}`} target="_blank" rel="noreferrer" className="text-[#0A0A0A] underline block">Passport</a>}
                        </div>
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
          <div>
            <div className="flex justify-end mb-4">
              <button data-testid="run-reminders-btn" onClick={runReminders} disabled={runningReminders} className="px-5 py-2.5 bg-[#0A0A0A] text-white label text-xs hover:bg-[#DF0000] transition-colors disabled:opacity-50">{runningReminders ? "Sending…" : "Run Renewal Reminders"}</button>
            </div>
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
          </div>
        )}

        {tab === "waitlist" && (
          <div data-testid="waitlist-panel">
            <div className="flex justify-between items-center mb-4">
              <div className="text-sm text-[#666]">{waitlist.length} signup{waitlist.length === 1 ? "" : "s"}</div>
              <button data-testid="export-waitlist-btn" onClick={exportWaitlistCsv} disabled={waitlist.length === 0} className="px-5 py-2.5 bg-[#0A0A0A] text-white label text-xs hover:bg-[#DF0000] transition-colors disabled:opacity-50">Export CSV</button>
            </div>
            <div className="border border-[#0A0A0A] overflow-x-auto" data-testid="waitlist-table">
              <table className="w-full text-sm">
                <thead className="bg-[#0A0A0A] text-white">
                  <tr className="label text-left">
                    <th className="p-4 font-normal">#</th>
                    <th className="p-4 font-normal">Email</th>
                    <th className="p-4 font-normal">Joined</th>
                  </tr>
                </thead>
                <tbody>
                  {waitlist.length === 0 && <tr><td colSpan={3} className="p-8 text-center text-[#999]">No signups yet.</td></tr>}
                  {waitlist.map((w, i) => (
                    <tr key={w.id || w.email} className="border-t border-[#E5E5E5]" data-testid={`waitlist-row-${i}`}>
                      <td className="p-4 text-[#999]">{i + 1}</td>
                      <td className="p-4">{w.email}</td>
                      <td className="p-4 text-[#666]">{w.created_at ? new Date(w.created_at).toLocaleString() : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      <Dialog open={editing !== null} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="rounded-none max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="font-display text-2xl">{editing === "new" ? "New Product" : "Edit Product"}</DialogTitle>
            <DialogDescription className="text-[#666]">Fill in the product details below.</DialogDescription>
          </DialogHeader>
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
              <div>
                <label className="label block mb-1">Category</label>
                <select data-testid="product-field-category" value={form.category || "Gummies"} onChange={(e) => setForm({ ...form, category: e.target.value })}
                  className="w-full border border-[#0A0A0A]/20 focus:border-[#0A0A0A] outline-none px-3 py-2 font-mono text-sm bg-white">
                  {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="flex items-end pb-2">
                <label className="flex items-center gap-2 label cursor-pointer">
                  <input type="checkbox" data-testid="product-field-bestseller" checked={!!form.bestseller} onChange={(e) => setForm({ ...form, bestseller: e.target.checked })} className="w-4 h-4 accent-[#DF0000]" />
                  Bestseller
                </label>
              </div>
            </div>
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

      <Dialog open={consult !== null} onOpenChange={(o) => !o && setConsult(null)}>
        <DialogContent className="rounded-none max-w-lg" data-testid="consult-dialog">
          <DialogHeader><DialogTitle className="font-display text-2xl">Doctor Consultation</DialogTitle>
            <DialogDescription className="text-[#666]">Upload the prescription and notes to issue the passport and confirm this order.</DialogDescription>
          </DialogHeader>
          {consult && (
            <form onSubmit={submitConsult} className="space-y-4">
              <div className="text-sm text-[#666]">Order <span className="font-mono">#{consult.id.slice(-6).toUpperCase()}</span> · {consult.customer_name} · {consult.phone}</div>
              <div>
                <label className="label block mb-1">Prescription File</label>
                <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2.5 border border-[#0A0A0A]/30 hover:border-[#0A0A0A] transition-colors label text-xs">
                  {cUploading ? "Uploading…" : cRx ? "Replace File" : "Upload Prescription"}
                  <input data-testid="consult-file-input" type="file" accept=".pdf,.jpg,.jpeg,.png,.webp" onChange={uploadConsultRx} disabled={cUploading} className="hidden" />
                </label>
                {cRx && <span data-testid="consult-filename" className="ml-3 text-xs text-[#16A34A] font-mono">✓ {cRx.filename}</span>}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label block mb-1">Practitioner</label>
                  <input value={cForm.practitioner} onChange={(e) => setCForm({ ...cForm, practitioner: e.target.value })} placeholder="Dr. name (BAMS)" className="w-full border border-[#0A0A0A]/20 outline-none px-3 py-2 font-mono text-sm" />
                </div>
                <div>
                  <label className="label block mb-1">Validity (months)</label>
                  <input type="number" min="1" max="24" value={cForm.validity} onChange={(e) => setCForm({ ...cForm, validity: e.target.value })} className="w-full border border-[#0A0A0A]/20 outline-none px-3 py-2 font-mono text-sm" />
                </div>
              </div>
              <div>
                <label className="label block mb-1">Consultation Notes / Guidance</label>
                <textarea rows={3} value={cForm.notes} onChange={(e) => setCForm({ ...cForm, notes: e.target.value })} className="w-full border border-[#0A0A0A]/20 outline-none px-3 py-2 font-mono text-sm resize-none" />
              </div>
              <button data-testid="consult-submit" disabled={!cRx} className="btn-fill w-full py-3 bg-[#DF0000] text-white label border border-[#DF0000] disabled:opacity-50">
                Issue Passport &amp; Confirm Order
              </button>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
