import { useEffect, useState, useRef } from "react";
import { Link } from "react-router-dom";
import { motion, useScroll, useTransform } from "framer-motion";
import Marquee from "react-fast-marquee";
import { ArrowUpRight } from "lucide-react";
import { api } from "@/lib/api";
import ProductCard from "@/components/ProductCard";

const HERO_IMG =
  "https://static.prod-images.emergentagent.com/jobs/1fef2c4b-6b16-4dd9-8afb-bc98d943e39c/images/b2e2f0e0963bee59c99f3ec4a669a41c3ed3bf849051a74a4a78f0e78b2a998a.jpeg";

const PARTNERS = ["Moon Impact", "Trost", "Cannazo", "Rasta"];

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
  const heroRef = useRef(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const imgY = useTransform(scrollYProgress, [0, 1], [0, 180]);
  const imgScale = useTransform(scrollYProgress, [0, 1], [1, 1.15]);

  useEffect(() => {
    api.get("/products").then((r) => setProducts(r.data)).catch(() => {});
    api.get("/blog").then((r) => setPosts(r.data.slice(0, 3))).catch(() => {});
  }, []);

  return (
    <div data-testid="home-page">
      {/* HERO */}
      <section ref={heroRef} className="relative min-h-screen flex flex-col justify-end overflow-hidden pt-20">
        <motion.div style={{ y: imgY, scale: imgScale }} className="absolute inset-0 z-0">
          <img src={HERO_IMG} alt="" className="w-full h-full object-cover opacity-80" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#050507] via-[#050507]/50 to-[#050507]/20" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#050507] via-transparent to-transparent" />
        </motion.div>

        <div className="relative z-10 max-w-[1600px] w-full mx-auto px-6 md:px-10 pb-16 md:pb-24">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="label text-[#DF0000] mb-8">
            Bangalore / EST. 2026 / India's First
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
        </div>
      </section>

      {/* MARQUEE */}
      <section className="py-8 border-y border-white/10 overflow-hidden">
        <Marquee speed={60} gradient={false}>
          {Array.from({ length: 4 }).map((_, i) => (
            <span key={i} className="font-display text-5xl md:text-7xl mx-8 flex items-center gap-8">
              Cosmos Cannabis Cure <span className="text-[#DF0000]">—</span> Premium Gummies <span className="text-[#DF0000]">—</span> Bangalore <span className="marquee-outline">—</span>
            </span>
          ))}
        </Marquee>
      </section>

      {/* SHOWCASE */}
      <section id="shop" className="max-w-[1600px] mx-auto px-6 md:px-10 py-24 md:py-32">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-16 gap-6">
          <div>
            <div className="label text-[#FF2A2A] mb-4">[ The Collection ]</div>
            <h2 className="font-display text-5xl md:text-7xl tracking-tight leading-[0.9]">The Gummies</h2>
          </div>
          <p className="text-white/50 max-w-sm text-sm">Each jar is a mood, engineered. Choose your effect.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
          {products.map((p, i) => (
            <ProductCard key={p.id} product={p} index={i} />
          ))}
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
                className="border-r border-b border-white/10 py-10 md:py-14 flex flex-col items-center justify-center gap-2 group hover:bg-white/[0.03] transition-colors"
              >
                <div className="font-display text-2xl md:text-3xl group-hover:text-[#FF2A2A] transition-colors">{b}</div>
                <div className="label text-white/30 text-[9px]">Cosmos Partner</div>
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

      {/* LOCATION */}
      <section id="location" className="max-w-[1600px] mx-auto px-6 md:px-10 py-24 md:py-32">
        <div className="grid md:grid-cols-12 gap-10 items-center">
          <div className="md:col-span-6 order-2 md:order-1">
            <div className="label text-[#FF2A2A] mb-6">[ The Flagship ]</div>
            <h2 className="font-display text-5xl md:text-6xl tracking-tight leading-[0.9] mb-8">
              Visit us in<br />Bangalore
            </h2>
            <div className="space-y-6 max-w-md">
              <div className="border-t border-white/10 pt-5">
                <div className="label text-white/40 mb-2">Address</div>
                <p className="text-lg">14 Church Street, Ashok Nagar, Bangalore, Karnataka 560001</p>
              </div>
              <div className="border-t border-white/10 pt-5">
                <div className="label text-white/40 mb-2">Hours</div>
                <p className="text-lg">Monday – Sunday / 10:00 – 22:00</p>
              </div>
              <div className="border-t border-white/10 pt-5">
                <div className="label text-white/40 mb-2">Contact</div>
                <p className="text-lg">hello@cosmoscannabis.in · +91 80 4000 2026</p>
              </div>
            </div>
          </div>
          <div className="md:col-span-6 order-1 md:order-2">
            <div className="overflow-hidden aspect-[4/3]">
              <img
                src="https://images.unsplash.com/photo-1745455782861-43334c2d036f?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA2MTJ8MHwxfHNlYXJjaHwxfHxtb2Rlcm4lMjBtaW5pbWFsaXN0JTIwcGhhcm1hY3klMjBzdG9yZSUyMGludGVyaW9yfGVufDB8fHx8MTc4NjIwMTIxOHww&ixlib=rb-4.1.0&q=85"
                alt="Cosmos Cannabis Cure flagship interior"
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      {/* JOURNAL */}
      <section className="border-t border-white/10 py-24 md:py-32">
        <div className="max-w-[1600px] mx-auto px-6 md:px-10">
          <div className="flex justify-between items-end mb-16">
            <div>
              <div className="label text-[#FF2A2A] mb-4">[ Journal ]</div>
              <h2 className="font-display text-5xl md:text-7xl tracking-tight leading-[0.9]">Learn</h2>
            </div>
            <Link to="/journal" className="label hover:text-[#FF2A2A] transition-colors flex items-center gap-2">
              All Articles <ArrowUpRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="grid md:grid-cols-3 gap-px bg-white/10">
            {posts.map((p) => (
              <Link
                key={p.id}
                to={`/journal/${p.slug}`}
                data-testid={`journal-card-${p.slug}`}
                className="bg-[#050507] hover:bg-white/[0.03] p-8 md:p-10 transition-colors group"
              >
                <div className="label text-[#FF2A2A] mb-6">{p.category} · {p.read_time}</div>
                <h3 className="font-display text-3xl leading-tight mb-4 group-hover:text-[#FF2A2A] transition-colors">{p.title}</h3>
                <p className="text-white/50 text-sm leading-relaxed">{p.excerpt}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
