export const BRANDS = {
  "moon-impact": {
    name: "Moon Impact",
    slug: "moon-impact",
    tagline: "Precision Vijaya therapeutics.",
    origin: "India",
    house: "Nano-infused gummies",
    site: "trymoonimpact.com",
    ethos: [
      "Moon Impact is a precision-driven system for Vijaya-based therapeutics — built to eliminate the confusion and inconsistency that plague cannabis-derived products.",
      "The house keeps a deliberately closed set of formulations, each engineered for a specific therapeutic function: fast or slow, high-potency or balanced, daytime or nighttime. Full spectrum. Nothing stripped.",
      "Every gummy is upgraded with pharmaceutical-grade nano-infusion for faster onset, superior absorption and exceptional consistency — designed for controlled, repeatable outcomes under medical supervision.",
    ],
  },
  trost: {
    name: "Trost",
    slug: "trost",
    tagline: "Premium cannabis & hemp wellness.",
    origin: "India",
    house: "Mello & Kosha gummies",
    site: "thetrost.com",
    ethos: [
      "Trost — named for the old word for solace — crafts premium cannabis gummies that fuse sweetness and chewiness with carefully dosed cannabis leaf extract.",
      "From gentle 5% Mello gummies to bold 13% Kosha Mriduvati formulations, the range meets you wherever you are: easing stress and anxiety, calming nausea, and improving sleep.",
      "Each gummy is a discreet, delicious way to bring the benefits of the plant into everyday wellness — simple, reliable, and beautifully made.",
    ],
  },
  cannazo: {
    name: "Cannazo",
    slug: "cannazo",
    logo: "/brand-assets/logos/cannazo.png",
    tagline: "AYUSH-licensed, lab-verified.",
    origin: "India",
    house: "Uplift Vatis gummies",
    site: "cannazoindia.com",
    ethos: [
      "Cannazo India is one of the country's leading cannabis wellness companies, with a consultancy tie-up with CSIR and a fully AYUSH-licensed, GMP-certified supply chain.",
      "Its Uplift Vatis gummies are full-spectrum with terpenes, precisely dosed from 315mg to 500mg, and formulated for real outcomes — anxiety and stress support, better mood, deep sleep and chronic-pain comfort.",
      "Every batch undergoes certified third-party lab testing for accurate potency and zero contaminants, so strength and results stay reliable, jar after jar.",
    ],
  },
};

export const brandSlug = (brand) => (brand || "").toLowerCase().replace(/\s+/g, "-");
