import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { api } from "@/lib/api";

export default function Blog() {
  const [posts, setPosts] = useState([]);
  useEffect(() => {
    api.get("/blog").then((r) => setPosts(r.data)).catch(() => {});
  }, []);

  return (
    <div data-testid="blog-page" className="pt-32 md:pt-40 pb-24 min-h-screen">
      <div className="max-w-[1200px] mx-auto px-6 md:px-10">
        <div className="label text-[#DF0000] mb-4">[ Journal ]</div>
        <h1 className="font-display text-6xl md:text-8xl tracking-tight leading-[0.85] mb-16">Education<br />& Culture</h1>

        <div className="border-t border-[#0A0A0A]">
          {posts.map((p, i) => (
            <motion.div
              key={p.id}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: i * 0.05 }}
            >
              <Link to={`/journal/${p.slug}`} data-testid={`blog-item-${p.slug}`} className="group grid md:grid-cols-12 gap-4 py-10 border-b border-[#E5E5E5] items-baseline">
                <div className="md:col-span-2 label text-[#DF0000]">{p.category}</div>
                <h2 className="md:col-span-7 font-display text-3xl md:text-4xl leading-tight group-hover:text-[#DF0000] transition-colors">{p.title}</h2>
                <p className="md:col-span-3 text-[#555] text-sm">{p.excerpt}</p>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
