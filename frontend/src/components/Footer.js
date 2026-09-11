import { Link } from "react-router-dom";
import { ShieldCheck } from "lucide-react";

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
              <li><Link to="/passport" data-testid="footer-passport-link" className="hover:text-[#DF0000] transition-colors">COSMOS Passport</Link></li>
              <li><Link to="/journal" className="hover:text-[#DF0000] transition-colors">Journal</Link></li>
              <li><a href="/#manifesto" className="hover:text-[#DF0000] transition-colors">Manifesto</a></li>
              <li><a href="/#trost-launch" className="hover:text-[#DF0000] transition-colors">Trost Store</a></li>
              <li><Link to="/legal" data-testid="footer-legal-link" className="hover:text-[#DF0000] transition-colors">Legal &amp; Compliance</Link></li>
            </ul>
          </div>
          <div className="md:col-span-3">
            <div className="label text-white/40 mb-5">Contact</div>
            <p className="text-sm text-white/70 leading-relaxed">
              Online-only dispensary —<br />
              we deliver to your door.<br /><br />
              info@cosmoscannabis.in<br />
              +91 90369 47840<br /><br />
              <span className="text-white/40">Partner store:</span><br />
              Trost — Richmond Town, Bangalore
            </p>
          </div>
        </div>
        <div className="flex flex-col md:flex-row items-center gap-6 mt-14" data-testid="footer-ayush">
          <div className="bg-white p-3 shrink-0">
            <img src="/brand-assets/certifications/ministry-of-ayush.png" alt="Ministry of AYUSH, Government of India" className="h-16 w-auto" />
          </div>
          <p className="text-white/40 text-xs leading-relaxed max-w-xl">
            Manufactured under the AYUSH regulatory framework (Ministry of AYUSH, Govt. of India) as per the Drugs &amp; Cosmetics Act, 1940.
            Emblem shown to indicate regulatory framework; not an endorsement.
          </p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-white/10 mt-6 mb-4" data-testid="footer-compliance">
          {[
            { t: "AYUSH-Licensed", d: "Ayurvedic manufacturing" },
            { t: "Drugs & Cosmetics Act", d: "1940 compliant" },
            { t: "Lab-Tested", d: "Every batch verified" },
            { t: "21+ Only", d: "Legal-age verified" },
          ].map((b) => (
            <div key={b.t} className="bg-[#08080B] p-5 flex items-center gap-3">
              <ShieldCheck className="w-5 h-5 text-[#DF0000] shrink-0" strokeWidth={1.4} />
              <div>
                <div className="text-sm leading-tight">{b.t}</div>
                <div className="text-white/35 text-[11px]">{b.d}</div>
              </div>
            </div>
          ))}
        </div>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pt-8">
          <div className="label text-white/35">© 2026 Cosmos Cannabis Cure</div>
          <Link to="/legal" className="label text-white/35 hover:text-white/70 transition-colors">Consume responsibly · Vijaya (Ayurvedic) · 21+ only</Link>
          <Link to="/admin" data-testid="footer-admin-link" className="label text-white/25 hover:text-white/60 transition-colors">
            Admin
          </Link>
        </div>
      </div>
    </footer>
  );
}
