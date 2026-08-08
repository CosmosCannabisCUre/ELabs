import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { formatINR } from "@/lib/api";

export default function ProductCard({ product, index = 0 }) {
  return (
    <motion.div
      data-testid={`product-card-${product.slug}`}
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.7, delay: (index % 4) * 0.08, ease: [0.22, 1, 0.36, 1] }}
      className="group"
    >
      <Link to={`/product/${product.slug}`}>
        <div className="relative overflow-hidden bg-[#F5F5F5] aspect-[4/5] border border-transparent group-hover:border-[#DF0000] transition-colors duration-300">
          <img
            src={product.image}
            alt={product.name}
            className="w-full h-full object-cover transition-transform duration-[900ms] ease-out group-hover:scale-105"
          />
          <span className="absolute top-4 left-4 label bg-white text-black px-2 py-1">{product.effect}</span>
        </div>
        <div className="flex items-baseline justify-between mt-5">
          <div>
            <div className="label text-white/35 text-[9px] mb-1">{product.brand}</div>
            <h3 className="font-display text-2xl leading-none">{product.name}</h3>
            <p className="text-white/50 text-sm mt-1">{product.tagline}</p>
          </div>
          <span className="font-mono text-sm">{formatINR(product.price)}</span>
        </div>
      </Link>
    </motion.div>
  );
}
