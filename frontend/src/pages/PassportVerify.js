import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ShieldCheck, ShieldAlert, ShieldX, Loader2 } from "lucide-react";
import { api, API } from "@/lib/api";

const STATUS = {
  valid: { c: "#22C55E", t: "Valid", Icon: ShieldCheck, note: "This prescription record is currently valid." },
  expiring: { c: "#EAB308", t: "Expiring Soon", Icon: ShieldAlert, note: "This record is valid but expiring within 30 days." },
  expired: { c: "#DF0000", t: "Expired", Icon: ShieldX, note: "This record has expired and should be renewed." },
  unknown: { c: "#8A8A95", t: "Unknown", Icon: ShieldAlert, note: "Status could not be determined." },
};

export default function PassportVerify() {
  const { code } = useParams();
  const [state, setState] = useState({ loading: true, data: null, error: null });

  useEffect(() => {
    api.get(`/passports/verify/${code}`)
      .then((r) => setState({ loading: false, data: r.data, error: null }))
      .catch((e) => setState({ loading: false, data: null, error: e.response?.status === 404 ? "not_found" : "error" }));
  }, [code]);

  if (state.loading) {
    return (
      <div className="pt-40 pb-40 min-h-screen flex items-center justify-center" data-testid="passport-verify-loading">
        <Loader2 className="w-6 h-6 animate-spin text-[#DF0000]" />
      </div>
    );
  }

  if (state.error) {
    return (
      <div className="pt-40 pb-40 min-h-screen" data-testid="passport-verify-notfound">
        <div className="max-w-[560px] mx-auto px-6 text-center">
          <ShieldX className="w-10 h-10 text-[#DF0000] mx-auto mb-6" strokeWidth={1.4} />
          <h1 className="font-display text-4xl md:text-5xl tracking-tight mb-4">Passport Not Found</h1>
          <p className="text-white/50 mb-8">This verification link is invalid or the passport has been revoked.</p>
          <Link to="/passport" className="btn-fill inline-block px-8 py-3 border border-white/25 hover:border-white/60 label transition-colors">Create a Passport</Link>
        </div>
      </div>
    );
  }

  const d = state.data;
  const s = STATUS[d.status] || STATUS.unknown;
  const Icon = s.Icon;

  return (
    <div data-testid="passport-verify-page" className="pt-32 md:pt-40 pb-24 min-h-screen">
      <div className="max-w-[720px] mx-auto px-6">
        <div className="label text-[#DF0000] mb-4 text-center">[ Official Verification ]</div>
        <h1 className="font-display text-5xl md:text-6xl tracking-tight text-center mb-10">COSMOS Passport</h1>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          data-testid="verify-card"
          className="cosmic-stage border border-white/15 p-8 md:p-10"
        >
          <div className="flex items-start justify-between gap-6 mb-8">
            <img src="/brand-assets/logos/cosmos-seal.png" alt="Cosmos Cannabis Cure" className="h-20 w-auto" />
            <span data-testid="verify-status" className="inline-flex items-center gap-2 label px-3 py-1.5 border" style={{ color: s.c, borderColor: s.c }}>
              <Icon className="w-4 h-4" strokeWidth={1.6} /> {s.t}
            </span>
          </div>

          <div className="space-y-5">
            <div>
              <div className="label text-white/40 mb-1">Holder</div>
              <div className="font-display text-3xl" data-testid="verify-holder">{d.holder_name}</div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
              <div><div className="label text-white/40 mb-1">Passport No.</div><div className="font-mono text-sm">{d.passport_number}</div></div>
              <div><div className="label text-white/40 mb-1">Issued</div><div className="text-sm">{d.issue_date}</div></div>
              <div><div className="label text-white/40 mb-1">Valid Until</div><div className="text-sm">{d.expiry_date}</div></div>
              <div><div className="label text-white/40 mb-1">Practitioner</div><div className="text-sm">{d.practitioner_name || "—"}</div></div>
            </div>

            {d.has_prescription && (
              <div>
                <div className="label text-white/40 mb-2">Sealed Prescription</div>
                <div className="border border-white/15 bg-white/[0.02] overflow-hidden max-h-[420px] flex items-center justify-center">
                  <img
                    data-testid="verify-prescription-img"
                    src={`${API}/passports/${code}/prescription`}
                    alt="Sealed prescription document"
                    className="max-w-full max-h-[420px] object-contain"
                  />
                </div>
                <p className="text-white/30 text-[11px] mt-2">If the document is a PDF and does not preview, <a className="text-[#FF2A2A] hover:underline" href={`${API}/passports/${code}/prescription`} target="_blank" rel="noreferrer">open it here</a>.</p>
              </div>
            )}
          </div>

          <div className="mt-8 pt-6 border-t border-white/10 flex items-center gap-2 text-white/45 text-xs">
            <ShieldCheck className="w-4 h-4" style={{ color: s.c }} strokeWidth={1.6} />
            {s.note} · Ayurvedic Vijaya (cannabis leaf) prescription record.
          </div>
        </motion.div>

        <p className="text-center text-white/30 text-xs mt-8">
          Verified via secure QR link · Cosmos Cannabis Cure · Bangalore, India
        </p>
      </div>
    </div>
  );
}
