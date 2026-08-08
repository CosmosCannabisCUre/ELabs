import { useState } from "react";
import { motion } from "framer-motion";
import { QRCodeCanvas } from "qrcode.react";
import { toast } from "sonner";
import { ShieldCheck, Upload, Copy, Printer, ExternalLink } from "lucide-react";
import { api, API } from "@/lib/api";

const VALIDITY = [
  { v: 3, l: "3 months" },
  { v: 6, l: "6 months" },
  { v: 12, l: "12 months" },
];

const STATUS_STYLE = {
  valid: { c: "#22C55E", t: "Valid" },
  expiring: { c: "#EAB308", t: "Expiring Soon" },
  expired: { c: "#DF0000", t: "Expired" },
  unknown: { c: "#8A8A95", t: "Unknown" },
};

export default function Passport() {
  const [form, setForm] = useState({ holder_name: "", phone: "", email: "", practitioner_name: "", issue_date: "", validity_months: 6 });
  const [rx, setRx] = useState(null);
  const [rxUploading, setRxUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [passport, setPassport] = useState(null);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const uploadRx = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setRxUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const { data } = await api.post("/prescriptions/upload", fd, { headers: { "Content-Type": "multipart/form-data" } });
      setRx(data);
      toast.success("Prescription uploaded");
    } catch (err) {
      toast.error(err.response?.data?.detail || "Upload failed");
    } finally {
      setRxUploading(false);
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!rx) return toast.error("Please upload your prescription first.");
    setLoading(true);
    try {
      const { data } = await api.post("/passports", { ...form, validity_months: Number(form.validity_months), prescription_file_id: rx.id });
      setPassport(data);
      window.scrollTo(0, 0);
      toast.success("Passport created");
    } catch (err) {
      toast.error(err.response?.data?.detail || "Could not create passport");
    } finally {
      setLoading(false);
    }
  };

  if (passport) {
    const verifyUrl = `${window.location.origin}/passport/verify/${passport.code}`;
    const st = STATUS_STYLE[passport.status] || STATUS_STYLE.unknown;
    return (
      <div data-testid="passport-result" className="pt-32 md:pt-40 pb-24 min-h-screen">
        <div className="max-w-[720px] mx-auto px-6">
          <div className="label text-[#DF0000] mb-4 text-center">[ Issued ]</div>
          <h1 className="font-display text-5xl md:text-6xl tracking-tight text-center mb-10">Your COSMOS Passport</h1>

          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            data-testid="passport-card"
            className="cosmic-stage border border-white/15 p-8 md:p-10"
          >
            <div className="flex items-start justify-between gap-6 mb-8">
              <img src="/brand-assets/logos/cosmos-seal.png" alt="Cosmos Cannabis Cure" className="h-20 w-auto" />
              <span
                data-testid="passport-status"
                className="label px-3 py-1.5 border"
                style={{ color: st.c, borderColor: st.c }}
              >
                {st.t}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-6 items-end">
              <div className="col-span-2 space-y-4">
                <div>
                  <div className="label text-white/40 mb-1">Holder</div>
                  <div className="font-display text-2xl">{passport.holder_name}</div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="label text-white/40 mb-1">Passport No.</div>
                    <div className="font-mono text-sm" data-testid="passport-number">{passport.passport_number}</div>
                  </div>
                  <div>
                    <div className="label text-white/40 mb-1">Practitioner</div>
                    <div className="text-sm">{passport.practitioner_name || "—"}</div>
                  </div>
                  <div>
                    <div className="label text-white/40 mb-1">Issued</div>
                    <div className="text-sm">{passport.issue_date}</div>
                  </div>
                  <div>
                    <div className="label text-white/40 mb-1">Valid Until</div>
                    <div className="text-sm">{passport.expiry_date}</div>
                  </div>
                </div>
              </div>
              <div className="col-span-1 flex flex-col items-center">
                <div className="bg-white p-3">
                  <QRCodeCanvas value={verifyUrl} size={128} level="M" data-testid="passport-qr" />
                </div>
                <div className="label text-white/40 mt-2 text-[9px] text-center">Scan to verify</div>
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-white/10 flex items-center gap-2 text-white/45 text-xs">
              <ShieldCheck className="w-4 h-4 text-[#DF0000]" strokeWidth={1.5} />
              Ayurvedic Vijaya prescription record · Present for purchase or authority validation
            </div>
          </motion.div>

          <div className="flex flex-wrap gap-3 mt-8 justify-center">
            <button
              data-testid="passport-copy-link"
              onClick={() => { navigator.clipboard.writeText(verifyUrl); toast.success("Verification link copied"); }}
              className="btn-fill inline-flex items-center gap-2 px-6 py-3 border border-white/25 hover:border-white/60 label transition-colors"
            >
              <Copy className="w-4 h-4" /> Copy Verify Link
            </button>
            <a
              href={`/passport/verify/${passport.code}`}
              target="_blank"
              rel="noreferrer"
              data-testid="passport-open-verify"
              className="btn-fill inline-flex items-center gap-2 px-6 py-3 border border-white/25 hover:border-white/60 label transition-colors"
            >
              <ExternalLink className="w-4 h-4" /> Open Verify Page
            </a>
            <button
              onClick={() => window.print()}
              className="btn-fill inline-flex items-center gap-2 px-6 py-3 bg-[#DF0000] text-white border border-[#DF0000] label"
            >
              <Printer className="w-4 h-4" /> Print / Save
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div data-testid="passport-page" className="pt-32 md:pt-40 pb-24 min-h-screen">
      <div className="max-w-[880px] mx-auto px-6 md:px-10">
        <div className="label text-[#DF0000] mb-4">[ COSMOS Passport ]</div>
        <h1 className="font-display text-5xl md:text-7xl tracking-tight leading-[0.88] mb-6">
          Seal your prescription.<br />Carry it anywhere.
        </h1>
        <p className="text-white/55 max-w-2xl leading-relaxed mb-12">
          The COSMOS Passport is a sealed, scannable record of your Ayurvedic Vijaya prescription — like a
          vaccination certificate. It carries your issue date and validity, and a QR seal that lets a store or
          legal authority verify it in seconds. Create yours below.
        </p>

        <form onSubmit={submit} className="grid md:grid-cols-2 gap-6">
          {[
            { k: "holder_name", label: "Full Name", type: "text", req: true },
            { k: "email", label: "Email", type: "email", req: true },
            { k: "phone", label: "Phone", type: "tel", req: true },
            { k: "practitioner_name", label: "Prescribing Practitioner (optional)", type: "text", req: false },
          ].map((f) => (
            <div key={f.k}>
              <label className="label block mb-2">{f.label}</label>
              <input
                data-testid={`passport-${f.k}`}
                required={f.req}
                type={f.type}
                value={form[f.k]}
                onChange={set(f.k)}
                className="w-full border border-white/20 focus:border-white/60 outline-none px-4 py-3 font-mono text-sm bg-transparent"
              />
            </div>
          ))}
          <div>
            <label className="label block mb-2">Prescription Issue Date</label>
            <input
              data-testid="passport-issue_date"
              required
              type="date"
              value={form.issue_date}
              onChange={set("issue_date")}
              className="w-full border border-white/20 focus:border-white/60 outline-none px-4 py-3 font-mono text-sm bg-transparent [color-scheme:dark]"
            />
          </div>
          <div>
            <label className="label block mb-2">Validity</label>
            <select
              data-testid="passport-validity"
              value={form.validity_months}
              onChange={set("validity_months")}
              className="w-full border border-white/20 focus:border-white/60 outline-none px-4 py-3 font-mono text-sm bg-transparent [color-scheme:dark]"
            >
              {VALIDITY.map((v) => <option key={v.v} value={v.v} className="bg-[#0f0f14]">{v.l}</option>)}
            </select>
          </div>

          <div className="md:col-span-2 border border-white/15 p-5">
            <div className="label mb-2">Prescription Document</div>
            <p className="text-xs text-white/40 mb-3">PDF or image, up to 10 MB. This is sealed into your passport.</p>
            <div className="flex items-center gap-3">
              <label data-testid="passport-upload-label" className="cursor-pointer inline-flex items-center gap-2 px-4 py-2.5 border border-white/25 hover:border-white/60 transition-colors label text-xs">
                <Upload className="w-4 h-4" /> {rxUploading ? "Uploading…" : rx ? "Replace File" : "Upload Prescription"}
                <input data-testid="passport-file-input" type="file" accept=".pdf,.jpg,.jpeg,.png,.webp" onChange={uploadRx} disabled={rxUploading} className="hidden" />
              </label>
              {rx && <span data-testid="passport-filename" className="text-xs text-[#22C55E] font-mono truncate max-w-[220px]">✓ {rx.filename}</span>}
            </div>
          </div>

          <div className="md:col-span-2">
            <button
              data-testid="passport-submit"
              disabled={loading || !rx}
              className="btn-fill w-full px-10 py-4 bg-[#DF0000] text-white label border border-[#DF0000] disabled:opacity-50"
            >
              {loading ? "Creating…" : "Create My Passport"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
