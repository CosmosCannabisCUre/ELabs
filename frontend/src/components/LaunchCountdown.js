import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";

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

  useEffect(() => {
    const id = setInterval(() => setT(getRemaining()), 1000);
    return () => clearInterval(id);
  }, []);

  const dismiss = () => {
    setOpen(false);
    setTimeout(onClose, 500);
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
                  ? "The doors are open. Visit us in Indiranagar, Bangalore."
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

              <button
                data-testid="countdown-enter-btn"
                onClick={dismiss}
                className="btn-fill inline-flex items-center gap-3 px-12 py-4 bg-[#DF0000] text-white label border border-[#DF0000]"
              >
                Explore the Site
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
