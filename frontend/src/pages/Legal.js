import { motion } from "framer-motion";
import { ShieldCheck, FileText, Leaf, Stethoscope, AlertTriangle, ScrollText } from "lucide-react";

const fade = {
  hidden: { opacity: 0, y: 30 },
  show: (i = 0) => ({ opacity: 1, y: 0, transition: { duration: 0.7, delay: i * 0.08, ease: [0.22, 1, 0.36, 1] } }),
};

const SECTIONS = [
  {
    n: "01",
    icon: ScrollText,
    t: "The Law — NDPS Act, 1985",
    b: "Under India's Narcotic Drugs and Psychotropic Substances Act, 1985, the definition of \u201ccannabis (hemp)\u201d covers charas (resin) and ganja (the flowering or fruiting tops). Crucially, the Act specifically excludes the leaves and seeds of the cannabis plant when not accompanied by the tops. Preparations made from the permitted parts of the plant therefore sit outside the NDPS prohibition, which is the legal basis on which traditional and Ayurvedic cannabis-leaf preparations are made and sold in India.",
  },
  {
    n: "02",
    icon: Leaf,
    t: "Vijaya — Ayurvedic Classical Medicine",
    b: "\u201cVijaya\u201d is the classical Ayurvedic name for cannabis leaf. It appears across recognised Ayurvedic texts and is manufactured as a licensed Ayurvedic formulation under the Drugs and Cosmetics Act, 1940 and its Rules. Every product we curate is prepared from Vijaya (cannabis leaf extract) by AYUSH-licensed manufacturers, not from the restricted flowering tops or resin.",
  },
  {
    n: "03",
    icon: ShieldCheck,
    t: "AYUSH Licensing & Lab Testing",
    b: "Our partner brands hold the relevant Ayurvedic manufacturing licences issued under the AYUSH framework. Each batch is third-party lab-tested for cannabinoid content, potency and purity, and is clearly labelled with dosage. We publish potency and effect information so every purchase is informed and precise.",
  },
  {
    n: "04",
    icon: Stethoscope,
    t: "Prescription & Medical Guidance",
    b: "Vijaya-based formulations are intended for medicinal, therapeutic use under qualified guidance. We strongly recommend a valid prescription or recommendation from a registered Ayurvedic physician (BAMS / MD Ayurveda) or medical practitioner. At checkout you may optionally upload your prescription; where you do not, you must confirm that you are purchasing responsibly for personal wellness use and will consult a practitioner as needed.",
  },
  {
    n: "05",
    icon: FileText,
    t: "Who Can Purchase",
    b: "You must be 21 years of age or older to browse or buy from Cosmos Cannabis Cure. A valid government photo ID confirming age may be required at the point of delivery. These products are not for sale to minors, or to anyone who is pregnant, nursing, or advised against use by a physician.",
  },
];

export default function Legal() {
  return (
    <div data-testid="legal-page" className="pt-32 md:pt-40 pb-24 min-h-screen bg-[#050507]">
      <div className="max-w-[1100px] mx-auto px-6 md:px-10">
        <motion.div variants={fade} initial="hidden" animate="show" className="label text-[#DF0000] mb-4">
          [ Legal &amp; Compliance ]
        </motion.div>
        <motion.h1 variants={fade} initial="hidden" animate="show" custom={1} className="font-display text-5xl md:text-7xl tracking-tight leading-[0.88] mb-8">
          Legality &amp; the<br />Prescription Process
        </motion.h1>
        <motion.p variants={fade} initial="hidden" animate="show" custom={2} className="text-white/55 max-w-2xl leading-relaxed mb-16">
          Cosmos Cannabis Cure operates within India's legal framework for Ayurvedic cannabis (Vijaya).
          Below is a plain-language guide to how these products are permitted, what compliance we uphold,
          and how the prescription process works.
        </motion.p>

        <div className="space-y-px">
          {SECTIONS.map((s, i) => {
            const Icon = s.icon;
            return (
              <motion.div
                key={s.n}
                variants={fade}
                initial="hidden"
                whileInView="show"
                viewport={{ once: true, margin: "-80px" }}
                custom={i}
                data-testid={`legal-section-${s.n}`}
                className="grid md:grid-cols-12 gap-5 md:gap-10 py-10 border-t border-white/15 items-start"
              >
                <div className="md:col-span-1 font-mono text-[#DF0000] text-sm pt-1">[ {s.n} ]</div>
                <div className="md:col-span-4 flex items-start gap-4">
                  <Icon className="w-6 h-6 text-[#FF2A2A] shrink-0 mt-1" strokeWidth={1.4} />
                  <h2 className="font-display text-2xl md:text-3xl leading-tight">{s.t}</h2>
                </div>
                <p className="md:col-span-7 text-white/55 leading-relaxed text-sm md:text-base">{s.b}</p>
              </motion.div>
            );
          })}
        </div>

        {/* Compliance badges */}
        <div className="mt-20 border-t border-white/15 pt-12">
          <div className="label text-white/40 mb-6">[ Our Compliance ]</div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-white/10">
            {[
              { t: "AYUSH-Licensed", d: "Ayurvedic manufacturing" },
              { t: "Drugs & Cosmetics Act", d: "1940 compliant" },
              { t: "NDPS-Exempt Leaf", d: "Vijaya leaf extract" },
              { t: "Third-Party Lab-Tested", d: "Every batch" },
            ].map((b) => (
              <div key={b.t} data-testid={`compliance-badge-${b.t.toLowerCase().replace(/[^a-z]+/g, "-")}`} className="bg-[#050507] p-6 md:p-8">
                <ShieldCheck className="w-6 h-6 text-[#DF0000] mb-4" strokeWidth={1.4} />
                <div className="font-display text-lg leading-tight mb-1">{b.t}</div>
                <div className="text-white/40 text-xs">{b.d}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Disclaimer */}
        <div className="mt-16 border border-white/15 p-8 md:p-10 flex gap-5" data-testid="legal-disclaimer">
          <AlertTriangle className="w-6 h-6 text-[#FF2A2A] shrink-0 mt-1" strokeWidth={1.4} />
          <div>
            <div className="label text-white/50 mb-3">Important Disclaimer</div>
            <p className="text-white/50 text-sm leading-relaxed">
              These statements have not been evaluated to diagnose, treat, cure or prevent any disease.
              Products are intended for adults aged 21+ and should be used responsibly and under
              appropriate guidance. Do not drive or operate machinery after use. Keep out of reach of
              children and pets. If you are pregnant, nursing, or on medication, consult a qualified
              practitioner before use. Cosmos Cannabis Cure sells only Ayurvedic Vijaya (cannabis leaf)
              formulations produced by AYUSH-licensed manufacturers.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
