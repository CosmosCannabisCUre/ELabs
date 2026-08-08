import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function AgeGate({ onVerified }) {
  const [open, setOpen] = useState(true);
  const [denied, setDenied] = useState(false);

  const accept = () => {
    localStorage.setItem("ccc_age_ok", "true");
    setOpen(false);
    setTimeout(onVerified, 700);
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          data-testid="age-gate"
          className="fixed inset-0 z-[100] bg-[#0A0A0A] text-white flex flex-col items-center justify-center px-6"
          initial={{ y: 0 }}
          exit={{ y: "-100%" }}
          transition={{ duration: 0.7, ease: [0.76, 0, 0.24, 1] }}
        >
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.8 }}
            className="max-w-2xl text-center"
          >
            <div className="label text-[#DF0000] mb-8">Cosmos Cannabis Cure — Bangalore</div>
            <h1 className="font-display text-5xl md:text-7xl leading-[0.95] tracking-tight mb-6">
              Are you<br />21 or older?
            </h1>
            <p className="text-white/50 text-sm max-w-md mx-auto mb-12 leading-relaxed">
              You must be of legal age to enter. By entering you confirm you are 21+ and accept our terms of responsible use.
            </p>
            {!denied ? (
              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                <button
                  data-testid="age-gate-yes"
                  onClick={accept}
                  className="btn-fill w-full sm:w-auto px-12 py-4 bg-[#DF0000] text-white label border border-[#DF0000]"
                >
                  Yes, I am 21+
                </button>
                <button
                  data-testid="age-gate-no"
                  onClick={() => setDenied(true)}
                  className="w-full sm:w-auto px-12 py-4 border border-white/25 text-white/60 label hover:text-white transition-colors"
                >
                  No
                </button>
              </div>
            ) : (
              <p data-testid="age-gate-denied" className="text-white/70 text-sm border border-white/20 py-6 px-8">
                We're sorry — you must be 21 or older to access this site.
              </p>
            )}
          </motion.div>
          <div className="absolute bottom-8 label text-white/25">EST. 2026 / INDIA'S FIRST</div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
