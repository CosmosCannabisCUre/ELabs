import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Check } from "lucide-react";
import { api } from "@/lib/api";

// Target launch date — placeholder (~60 days out). Change this to your real launch date/time.
// Format: ISO 8601 with IST offset (+05:30)
const LAUNCH_DATE = new Date("2026-10-07T10:00:00+05:30");

function getRemaining() {
  const diff = LAUNCH_DATE.getTime() - Date.now();
  const clamped = Math.max(0, diff);
  return {
    done: diff <= 0,
    days: Math.floor(clamped / 86400000),
    hours: Math.floor((clamped % 86400000) / 3600000),
    minutes: Math.floor((clamped % 3600000) / 60000),
    seconds: Math.floor((clamped % 60000) / 1000),
  };
}

const Unit = ({ value, label }) => (
  <div className="flex flex-col items-center" data-testid={`countdown-${label.toLowerCase()}`}>
    <span className="font-display text-4xl md:text-6xl leading-none tabular-nums text-white">
      {String(value).padStart(2, "0")}
    </span>
    <span className="label text-white/40 mt-3 text-[10px] md:text-xs">{label}</span>
  </div>
);

export default function LaunchCountdown({ onClose }) {
  const [t, setT] = useState(getRemaining());
  const [open, setOpen] = useState(true);
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState("idle"); // idle | loading | success | error
  const [message, setMessage] = useState("");

  useEffect(() => {
    const id = setInterval(() => setT(getRemaining()), 1000);
    return () => clearInterval(id);
  }, []);

  const dismiss = () => {
    setOpen(false);
    setTimeout(onClose, 500);
  };

  const submit = async (e) => {
    e.preventDefault();
    if (status === "loading") return;
    setStatus("loading");
    setMessage("");
    try {
      const { data } = await api.post("/waitlist", { email });
      setStatus("success");
      setMessage(data.status === "already_subscribed" ? "You're already on the list." : "You're on the list — see you at launch.");
    } catch (err) {
      setStatus("error");
      setMessage(err?.response?.data?.detail || "Something went wrong. Please try again.");
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          data-testid="launch-countdown-modal"
          className="fixed inset-0 z-[95] flex items-center justify-center px-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4 }}
        >
          {/* backdrop */}
          <div
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            onClick={dismiss}
            data-testid="countdown-backdrop"
          />

          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.98 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="relative w-full max-w-2xl bg-[#0A0A0C] border border-white/10 overflow-hidden"
          >
            <div className="grain-overlay" />
            <div
              className="pointer-events-none absolute inset-0"
              style={{ background: "radial-gradient(600px 300px at 80% 0%, rgba(223,0,0,0.22), transparent 60%)" }}
            />

            <button
              data-testid="countdown-dismiss-btn"
              onClick={dismiss}
              aria-label="Close"
              className="absolute top-5 right-5 z-10 text-white/50 hover:text-[#FF2A2A] transition-colors"
            >
              <X className="w-6 h-6" />
            </button>

            <div className="relative z-[1] px-8 md:px-14 py-14 text-center">
              <img
                src="/brand-assets/logos/cosmos-seal.png"
                alt="Cosmos Cannabis Cure"
                className="h-20 w-auto mx-auto mb-6"
              />
              <div className="label text-[#DF0000] mb-4">Bangalore / India&apos;s First</div>
              <h2 className="font-display text-4xl md:text-6xl leading-[0.9] tracking-tight mb-4">
                {t.done ? "We\u2019re Now Open" : "Launching Soon"}
              </h2>
              <p className="text-white/50 text-sm max-w-md mx-auto mb-10 leading-relaxed">
                {t.done
                  ? "The doors are open. Shop the collection online — we deliver across Bangalore."
                  : "India's first premium cannabis dispensary is almost here. Be the first through the doors."}
              </p>

              {!t.done && (
                <div className="flex items-start justify-center gap-6 md:gap-10 mb-10" data-testid="countdown-timer">
                  <Unit value={t.days} label="Days" />
                  <span className="font-display text-4xl md:text-6xl text-white/20 leading-none">:</span>
                  <Unit value={t.hours} label="Hours" />
                  <span className="font-display text-4xl md:text-6xl text-white/20 leading-none">:</span>
                  <Unit value={t.minutes} label="Minutes" />
                  <span className="font-display text-4xl md:text-6xl text-white/20 leading-none">:</span>
                  <Unit value={t.seconds} label="Seconds" />
                </div>
              )}

              {status === "success" ? (
                <div
                  data-testid="waitlist-success"
                  className="flex items-center justify-center gap-3 text-white border border-[#DF0000]/40 bg-[#DF0000]/10 py-4 px-6 max-w-md mx-auto"
                >
                  <Check className="w-5 h-5 text-[#FF2A2A]" />
                  <span className="text-sm">{message}</span>
                </div>
              ) : (
                <form onSubmit={submit} className="max-w-md mx-auto" data-testid="waitlist-form">
                  <div className="label text-white/40 mb-3">Notify me at launch</div>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="your@email.com"
                      data-testid="waitlist-email-input"
                      className="flex-1 bg-white/5 border border-white/15 focus:border-[#DF0000] outline-none px-5 py-4 text-white placeholder-white/30 text-sm transition-colors"
                    />
                    <button
                      type="submit"
                      disabled={status === "loading"}
                      data-testid="waitlist-submit-btn"
                      className="btn-fill px-8 py-4 bg-[#DF0000] text-white label border border-[#DF0000] disabled:opacity-60 whitespace-nowrap"
                    >
                      {status === "loading" ? "Joining…" : "Join Waitlist"}
                    </button>
                  </div>
                  {status === "error" && (
                    <p data-testid="waitlist-error" className="text-[#FF6B6B] text-xs mt-3 text-left">{message}</p>
                  )}
                  <button
                    type="button"
                    onClick={dismiss}
                    data-testid="countdown-enter-btn"
                    className="text-white/40 hover:text-white transition-colors label mt-6"
                  >
                    Explore the Site
                  </button>
                </form>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
