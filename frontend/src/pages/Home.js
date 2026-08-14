import { useEffect, useState, useRef } from "react";
import { Link } from "react-router-dom";
import { motion, useScroll, useTransform } from "framer-motion";
import Marquee from "react-fast-marquee";
import { ArrowUpRight, MapPin, Leaf } from "lucide-react";
import { api } from "@/lib/api";
import ProductCard from "@/components/ProductCard";

const PARTNERS = ["Moon Impact", "Trost", "Cannazo"];

const ANATOMY_LEFT = [
  { n: "01", t: "Cola", d: "The dense flowering cluster at the top — where potency concentrates." },
  { n: "02", t: "Sugar Leaf", d: "Small trichome-frosted leaves nestled among the flowers." },
  { n: "03", t: "Fan Leaf", d: "The iconic seven-point leaf — the plant's solar engine." },
];
const ANATOMY_RIGHT = [
  { n: "04", t: "Calyx", d: "The teardrop base of each bud, richest in cannabinoids." },
  { n: "05", t: "Trichome", d: "Microscopic resin glands carrying THC, CBD and terpenes." },
  { n: "06", t: "Stem & Root", d: "The structure and foundation that feed the whole plant." },
];

const line = {
  hidden: { y: "110%" },
  show: (i) => ({ y: "0%", transition: { duration: 0.9, delay: 0.3 + i * 0.12, ease: [0.22, 1, 0.36, 1] } }),
};

const MANIFESTO = [
  { n: "01", t: "The Vision", b: "We opened India's first premium cannabis dispensary to end the whispering. Cannabis wellness deserves daylight, design, and rigour — not stigma." },
  { n: "02", t: "The Craft", b: "Every gummy is lab-tested, precisely dosed, and clearly labelled. We treat cannabis with the care of a fine pharmacy and the taste of a maison." },
  { n: "03", t: "The Cure", b: "Rest, balance, focus, ease. Four formulas, one belief — that the right dose at the right moment is a quiet kind of medicine." },
];

export default function Home() {
  const [products, setProducts] = useState([]);
  const [posts, setPosts] = useState([]);
  const [hovered, setHovered] = useState(null);
  const heroRef = useRef(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const starsY = useTransform(scrollYProgress, [0, 1], [0, 120]);
  const nebulaY = useTransform(scrollYProgress, [0, 1], [0, 220]);
  const heroTextY = useTransform(scrollYProgress, [0, 1], [0, 80]);

  useEffect(() => {
    api.get("/products").then((r) => setProducts(r.data)).catch(() => {});
    api.get("/blog").then((r) => setPosts(r.data.slice(0, 3))).catch(() => {});
  }, []);

  return (
    <div data-testid="home-page">
      {/* HERO */}
      <section ref={heroRef} className="relative min-h-screen flex flex-col justify-end overflow-hidden pt-20 bg-[#050507]">
        {/* photographic red nebula backdrop (parallax) — natural matte look */}
        <motion.div style={{ y: nebulaY }} className="absolute inset-0 z-0 pointer-events-none">
          <img
            src="/brand-assets/cosmic/hero-nebula.jpg"
            alt=""
            aria-hidden
            className="absolute inset-0 w-full h-full object-cover object-right"
          />
        </motion.div>

        {/* starfield */}
        <motion.div style={{ y: starsY }} className="absolute inset-0 z-0">
          <div className="twinkle-layer twinkle-1" />
          <div className="twinkle-layer twinkle-2" />
          <div className="twinkle-layer twinkle-3" />
        </motion.div>

        {/* shooting stars (comets) */}
        <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
          <div className="shooting-star" style={{ top: "14%", left: "8%", animationDelay: "1.5s" }} />
          <div className="shooting-star" style={{ top: "42%", left: "30%", animationDelay: "4.5s" }} />
          <div className="shooting-star" style={{ top: "8%", left: "58%", animationDelay: "7s" }} />
        </div>

        {/* film grain for matte texture */}
        <div className="grain-overlay z-0" />



        <motion.div style={{ y: heroTextY }} className="relative z-10 max-w-[1600px] w-full mx-auto px-6 md:px-10 pb-16 md:pb-24">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="label text-[#DF0000] mb-8">
            Bangalore / Launching Soon / India&apos;s First
          </motion.div>
          <h1 className="font-display leading-[0.82] tracking-tight text-[22vw] md:text-[15vw]">
            <span className="reveal-mask">
              <motion.span custom={0} variants={line} initial="hidden" animate="show" className="block">
                The
              </motion.span>
            </span>
            <span className="reveal-mask">
              <motion.span custom={1} variants={line} initial="hidden" animate="show" className="block text-[#DF0000]">
                Cure.
              </motion.span>
            </span>
          </h1>
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mt-8">
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.9, duration: 0.8 }}
              className="max-w-md text-white/60 leading-relaxed"
            >
              Premium, lab-tested cannabis gummies — engineered for rest, balance, focus and ease. Precisely dosed. Beautifully made.
            </motion.p>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.1, duration: 0.8 }}>
              <Link
                to="/shop"
                data-testid="hero-shop-btn"
                className="btn-fill inline-flex items-center gap-3 px-10 py-4 bg-[#DF0000] text-white label border border-[#DF0000]"
              >
                Shop the Collection <ArrowUpRight className="w-4 h-4" />
              </Link>
            </motion.div>
          </div>
        </motion.div>
      </section>

      {/* MARQUEE */}
      <section className="py-8 border-y border-white/10 overflow-hidden" data-testid="ribbon">
        <Marquee speed={55} gradient={false}>
          {["The Cure, Delivered", "Precisely Dosed", "Lab-Tested Vijaya", "Rest · Uplift · Balance", "Ayurvedic, Elevated", "Crafted in Bangalore"].map((phrase, i) => (
            <span key={i} className="font-display text-5xl md:text-7xl flex items-center">
              <span className={i % 2 === 1 ? "marquee-outline" : ""}>{phrase}</span>
              <Leaf className="w-7 h-7 md:w-9 md:h-9 text-[#DF0000] mx-8 md:mx-12 shrink-0" strokeWidth={1.5} />
            </span>
          ))}
        </Marquee>
      </section>

      {/* SHOWCASE */}
      <section id="shop" className="max-w-[1600px] mx-auto px-6 md:px-10 py-24 md:py-32">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="flex flex-col md:flex-row justify-between items-start md:items-end mb-16 gap-6"
        >
          <div>
            <div className="label text-[#FF2A2A] mb-4">[ The Collection ]</div>
            <h2 className="font-display text-5xl md:text-7xl tracking-tight leading-[0.9]">The Gummies</h2>
          </div>
          <p className="text-white/50 max-w-sm text-sm">Each jar is a mood, engineered. Choose your effect.</p>
        </motion.div>
        {(() => {
          const order = ["Moon Impact", "Trost", "Cannazo"];
          const groups = {};
          products.forEach((p) => { (groups[p.brand] = groups[p.brand] || []).push(p); });
          const brands = [...order.filter((b) => groups[b]), ...Object.keys(groups).filter((b) => !order.includes(b))];
          const featured = brands.map((b) => groups[b][0]).slice(0, 4); // one product per partner
          return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8" data-testid="home-featured-grid">
              {featured.map((p, i) => (
                <ProductCard key={p.id} product={p} index={i} />
              ))}
            </div>
          );
        })()}
        <div className="mt-12 flex justify-center">
          <Link
            to="/shop"
            data-testid="home-view-all-btn"
            className="btn-fill inline-flex items-center gap-3 px-10 py-4 border border-white/25 hover:border-white/60 label transition-colors"
          >
            View All {products.length} Products <ArrowUpRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* PARTNER BRANDS */}
      <section className="border-y border-white/10 py-16 md:py-20">
        <div className="max-w-[1600px] mx-auto px-6 md:px-10">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
            <div className="label text-[#FF2A2A]">[ Partner Brands ]</div>
            <p className="text-white/45 text-sm max-w-md">
              Cosmos curates four independent maisons of cannabis wellness — each a specialist in its craft, united under one roof in Bangalore.
            </p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 border-t border-l border-white/10">
            {PARTNERS.map((b, i) => (
              <motion.div
                key={b}
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.08 }}
                className="border-r border-b border-white/10"
              >
                <Link
                  to={`/brand/${b.toLowerCase().replace(/\s+/g, "-")}`}
                  data-testid={`partner-brand-${b.toLowerCase().replace(/\s+/g, "-")}`}
                  className="py-10 md:py-14 flex flex-col items-center justify-center gap-2 group hover:bg-white/[0.03] transition-colors"
                >
                  <div className="font-display text-2xl md:text-3xl group-hover:text-[#FF2A2A] transition-colors">{b}</div>
                  <div className="label text-white/30 text-[9px]">View brand →</div>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* MANIFESTO */}
      <section id="manifesto" className="py-24 md:py-40">
        <div className="max-w-[1600px] mx-auto px-6 md:px-10">
          <div className="label text-[#FF2A2A] mb-20">[ Manifesto ]</div>
          <div className="space-y-px">
            {MANIFESTO.map((m, i) => (
              <motion.div
                key={m.n}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                className="grid md:grid-cols-12 gap-6 md:gap-10 py-12 border-t border-white/15 items-baseline"
              >
                <div className="md:col-span-2 font-mono text-[#DF0000] text-sm">[ {m.n} ]</div>
                <h3 className="md:col-span-4 font-display text-4xl md:text-5xl leading-none">{m.t}</h3>
                <p className="md:col-span-5 md:col-start-8 text-white/55 leading-relaxed">{m.b}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ANATOMY OF THE PLANT */}
      <section className="relative border-t border-white/10 py-24 md:py-32 overflow-hidden">
        <div className="max-w-[1600px] mx-auto px-6 md:px-10">
          <div className="text-center mb-16">
            <img src="/brand-assets/botanical/leaf.jpg" alt="" aria-hidden className="h-16 w-auto mx-auto mb-6 object-contain mix-blend-screen opacity-90" />
            <div className="label text-[#FF2A2A] mb-4">[ Botany ]</div>
            <h2 className="font-display text-5xl md:text-7xl tracking-tight leading-[0.9]">Anatomy of the Plant</h2>
            <p className="text-white/50 max-w-lg mx-auto mt-5 text-sm">Every gummy begins here. A closer look at the botany behind the cure.</p>
          </div>

          <div className="grid md:grid-cols-12 gap-8 md:gap-6 items-center">
            <div className="md:col-span-4 space-y-10 order-2 md:order-1">
              {ANATOMY_LEFT.map((a, i) => (
                <motion.div
                  key={a.n}
                  initial={{ opacity: 0, x: -30 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: i * 0.1 }}
                  onMouseEnter={() => setHovered(a.t)}
                  onMouseLeave={() => setHovered(null)}
                  className="md:text-right border-t border-white/10 pt-4 cursor-default"
                >
                  <div className="label text-[#FF2A2A] mb-2">[ {a.n} ]</div>
                  <h3 className={`font-display text-3xl leading-none mb-2 transition-colors ${hovered === a.t ? "text-[#FF2A2A]" : ""}`}>{a.t}</h3>
                  <p className="text-white/50 text-sm md:ml-auto md:max-w-[16rem]">{a.d}</p>
                </motion.div>
              ))}
            </div>

            <div className="md:col-span-4 order-1 md:order-2 relative flex justify-center">
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <div
                  className="rounded-full transition-all duration-500"
                  style={{
                    width: hovered ? "84%" : "70%",
                    height: hovered ? "84%" : "70%",
                    background: `radial-gradient(circle, rgba(223,0,0,${hovered ? 0.34 : 0.18}), transparent 68%)`,
                  }}
                />
              </div>

              <motion.img
                src="/brand-assets/botanical/plant.jpg"
                alt="Cannabis plant botanical illustration"
                initial={{ clipPath: "inset(0 0 100% 0)", opacity: 0 }}
                whileInView={{ clipPath: "inset(0 0 0% 0)", opacity: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 1.6, ease: [0.22, 1, 0.36, 1] }}
                className="relative w-full max-w-[320px] object-contain mix-blend-screen transition-transform duration-500"
                style={{ transform: hovered ? "scale(1.04)" : "scale(1)" }}
              />
            </div>

            <div className="md:col-span-4 space-y-10 order-3">
              {ANATOMY_RIGHT.map((a, i) => (
                <motion.div
                  key={a.n}
                  initial={{ opacity: 0, x: 30 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: i * 0.1 }}
                  onMouseEnter={() => setHovered(a.t)}
                  onMouseLeave={() => setHovered(null)}
                  className="border-t border-white/10 pt-4 cursor-default"
                >
                  <div className="label text-[#FF2A2A] mb-2">[ {a.n} ]</div>
                  <h3 className={`font-display text-3xl leading-none mb-2 transition-colors ${hovered === a.t ? "text-[#FF2A2A]" : ""}`}>{a.t}</h3>
                  <p className="text-white/50 text-sm max-w-[16rem]">{a.d}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* LOCATION */}
      <section id="location" className="max-w-[1600px] mx-auto px-6 md:px-10 py-24 md:py-32">
        <div className="grid md:grid-cols-12 gap-10 items-center">
          <motion.div
            initial={{ opacity: 0, x: -40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            className="md:col-span-6 order-2 md:order-1"
          >
            <div className="label text-[#FF2A2A] mb-6">[ The Flagship ]</div>
            <h2 className="font-display text-5xl md:text-6xl tracking-tight leading-[0.9] mb-8">
              Visit us in<br />Bangalore
            </h2>
            <div className="space-y-6 max-w-md">
              <div className="border-t border-white/10 pt-5">
                <div className="label text-white/40 mb-2">Address</div>
                <a
                  href="https://www.google.com/maps/search/?api=1&query=3104%2C+6th+B+Main%2C+HAL+II+Stage%2C+Indiranagar%2C+Bangalore+560008"
                  target="_blank"
                  rel="noopener noreferrer"
                  data-testid="location-address-link"
                  className="text-lg block transition-colors hover:text-[#FF2A2A]"
                >
                  3104, 6th &apos;B&apos; Main, HAL II Stage, Indiranagar, Bangalore 560008
                </a>
              </div>
              <div className="border-t border-white/10 pt-5">
                <div className="label text-white/40 mb-2">Hours</div>
                <p className="text-lg">Monday – Sunday / 10:00 – 22:00</p>
              </div>
              <div className="border-t border-white/10 pt-5">
                <div className="label text-white/40 mb-2">Contact</div>
                <p className="text-lg">
                  <a
                    href="mailto:info@cosmoscannabis.in"
                    data-testid="location-email-link"
                    className="transition-colors hover:text-[#FF2A2A]"
                  >
                    info@cosmoscannabis.in
                  </a>
                  <span className="text-white/40"> · </span>
                  <a
                    href="tel:+919036947840"
                    data-testid="location-phone-link"
                    className="transition-colors hover:text-[#FF2A2A]"
                  >
                    +91 90369 47840
                  </a>
                </p>
              </div>
            </div>
            <a
              href="https://www.google.com/maps/search/?api=1&query=3104%2C+6th+B+Main%2C+HAL+II+Stage%2C+Indiranagar%2C+Bangalore+560008"
              target="_blank"
              rel="noopener noreferrer"
              data-testid="get-directions-btn"
              className="btn-fill mt-8 inline-flex items-center gap-3 px-8 py-4 bg-[#DF0000] text-white label border border-[#DF0000]"
            >
              <MapPin className="w-4 h-4" /> Get Directions
            </a>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.8, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
            className="md:col-span-6 order-1 md:order-2"
          >
            <div className="group relative overflow-hidden aspect-[16/10] rounded-sm ring-1 ring-white/5 transition-all duration-700 hover:ring-[#FF2A2A]/40 hover:shadow-[0_0_60px_-10px_rgba(255,42,42,0.55)]" data-testid="store-exterior">
              <img
                src="/brand-assets/store/storefront.jpg"
                alt="Cosmos Cannabis Cure storefront exterior"
                className="w-full h-full object-cover transition-transform duration-[1200ms] ease-out group-hover:scale-105"
              />
              <div className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-700 group-hover:opacity-100 bg-[radial-gradient(circle_at_50%_45%,rgba(255,190,120,0.28),transparent_45%)]" />
            </div>
          </motion.div>
        </div>
      </section>

      {/* JOURNAL */}
      <section className="border-t border-white/10 py-24 md:py-32">
        <div className="max-w-[1600px] mx-auto px-6 md:px-10">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            className="flex justify-between items-end mb-16"
          >
            <div>
              <div className="label text-[#FF2A2A] mb-4">[ Journal ]</div>
              <h2 className="font-display text-5xl md:text-7xl tracking-tight leading-[0.9]">Learn</h2>
            </div>
            <Link to="/journal" className="label hover:text-[#FF2A2A] transition-colors flex items-center gap-2">
              All Articles <ArrowUpRight className="w-4 h-4" />
            </Link>
          </motion.div>
          <div className="grid md:grid-cols-3 gap-px bg-white/10">
            {posts.map((p, i) => (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.7, delay: i * 0.1, ease: [0.22, 1, 0.36, 1] }}
              >
                <Link
                  to={`/journal/${p.slug}`}
                  data-testid={`journal-card-${p.slug}`}
                  className="block bg-[#050507] hover:bg-white/[0.03] p-8 md:p-10 transition-colors group h-full"
                >
                  <div className="label text-[#FF2A2A] mb-6">{p.category} · {p.read_time}</div>
                  <h3 className="font-display text-3xl leading-tight mb-4 group-hover:text-[#FF2A2A] transition-colors">{p.title}</h3>
                  <p className="text-white/50 text-sm leading-relaxed">{p.excerpt}</p>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
