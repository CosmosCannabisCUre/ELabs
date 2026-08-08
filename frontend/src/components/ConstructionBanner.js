import { useState } from "react";
import Marquee from "react-fast-marquee";
import { X } from "lucide-react";

export default function ConstructionBanner() {
  const [open, setOpen] = useState(() => localStorage.getItem("ccc_banner_dismissed") !== "true");
  if (!open) return null;

  const dismiss = () => {
    localStorage.setItem("ccc_banner_dismissed", "true");
    setOpen(false);
  };

  const msg = "SITE UNDER CONSTRUCTION — COSMOS CANNABIS CURE IS LAUNCHING SOON IN INDIRANAGAR, BANGALORE";

  return (
    <div
      data-testid="construction-banner"
      className="fixed bottom-0 left-0 right-0 z-[60] bg-[#DF0000] text-white flex items-center"
    >
      <Marquee speed={55} gradient={false} className="py-2.5">
        {[0, 1, 2].map((i) => (
          <span key={i} className="label mx-8 flex items-center gap-8">
            {msg} <span className="opacity-60">✦</span>
          </span>
        ))}
      </Marquee>
      <button
        data-testid="construction-banner-close"
        onClick={dismiss}
        aria-label="Dismiss announcement"
        className="shrink-0 px-4 h-full flex items-center border-l border-white/25 hover:bg-black/20 transition-colors"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
