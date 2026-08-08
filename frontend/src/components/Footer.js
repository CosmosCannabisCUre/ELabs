import { Link } from "react-router-dom";

export default function Footer() {
  return (
    <footer data-testid="footer" className="bg-[#08080B] border-t border-white/10 text-white">
      <div className="max-w-[1600px] mx-auto px-6 md:px-10 pt-20 pb-10">
        <div className="grid md:grid-cols-12 gap-10 border-b border-white/15 pb-16">
          <div className="md:col-span-6">
            <img src="/brand-assets/logos/cosmos-seal.png" alt="Cosmos Cannabis Cure" className="h-24 md:h-28 w-auto mb-8" />
            <h2 className="font-display text-5xl md:text-7xl leading-[0.9] tracking-tight">
              The Cure,<br />delivered.
            </h2>
            <p className="text-white/45 mt-6 max-w-sm text-sm leading-relaxed">
              India's first premium cannabis dispensary. Lab-tested, precisely dosed, responsibly enjoyed.
            </p>
          </div>
          <div className="md:col-span-3">
            <div className="label text-white/40 mb-5">Explore</div>
            <ul className="space-y-3 text-sm">
              <li><Link to="/shop" className="hover:text-[#DF0000] transition-colors">Shop All</Link></li>
              <li><Link to="/journal" className="hover:text-[#DF0000] transition-colors">Journal</Link></li>
              <li><a href="/#manifesto" className="hover:text-[#DF0000] transition-colors">Manifesto</a></li>
              <li><a href="/#location" className="hover:text-[#DF0000] transition-colors">Location</a></li>
            </ul>
          </div>
          <div className="md:col-span-3">
            <div className="label text-white/40 mb-5">Visit</div>
            <p className="text-sm text-white/70 leading-relaxed">
              3104, 6th 'B' Main<br />
              HAL II Stage, Indiranagar<br />
              Bangalore 560008<br /><br />
              +91 90369 47840<br />
              Mon–Sun / 10:00 – 22:00
            </p>
          </div>
        </div>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pt-8">
          <div className="label text-white/35">© 2026 Cosmos Cannabis Cure</div>
          <div className="label text-white/35">Consume responsibly · 21+ only</div>
          <Link to="/admin" data-testid="footer-admin-link" className="label text-white/25 hover:text-white/60 transition-colors">
            Admin
          </Link>
        </div>
      </div>
    </footer>
  );
}
