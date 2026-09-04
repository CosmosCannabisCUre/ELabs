import { Link, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";
import { ShoppingBag, Menu, X, Sun, Moon } from "lucide-react";
import { useCart } from "@/context/CartContext";
import { useTheme } from "@/context/ThemeContext";

export default function Navbar() {
  const { count } = useCart();
  const { theme, toggle } = useTheme();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => setOpen(false), [pathname]);

  const links = [
    { to: "/shop", label: "Shop" },
    { to: "/passport", label: "Passport" },
    { to: "/#manifesto", label: "Manifesto" },
    { to: "/journal", label: "Journal" },
    { to: "/#location", label: "Location" },
  ];

  return (
    <header
      data-testid="navbar"
      className={`fixed top-0 left-0 right-0 z-50 transition-colors duration-300 ${
        scrolled ? "nav-scrolled" : "bg-transparent"
      }`}
    >
      <div className="max-w-[1600px] mx-auto px-6 md:px-10 h-20 md:h-24 flex items-center justify-between">
        <Link to="/" data-testid="nav-logo" className="flex items-center gap-1.5 leading-none">
          <img src={scrolled || theme !== "light" ? "/brand-assets/logos/cosmos-seal.png" : "/brand-assets/logos/cosmos-seal-dark.png"} alt="Cosmos Cannabis Cure" className="h-16 md:h-20 w-auto" />
          <span data-testid="nav-wordmark" className="font-display text-2xl md:text-3xl tracking-[0.12em]">COSMOS</span>
        </Link>

        <nav className="hidden md:flex items-center gap-10">
          {links.map((l) => (
            <a key={l.label} href={l.to} className="label hover:text-[#DF0000] transition-colors">
              {l.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-5">
          <button
            data-testid="theme-toggle"
            onClick={toggle}
            aria-label={theme === "light" ? "Switch to dark mode" : "Switch to light mode"}
            className="hover:text-[#DF0000] transition-colors"
          >
            {theme === "light" ? <Moon className="w-5 h-5" strokeWidth={1.5} /> : <Sun className="w-5 h-5" strokeWidth={1.5} />}
          </button>
          <Link to="/cart" data-testid="nav-cart" className="relative">
            <ShoppingBag className="w-5 h-5" strokeWidth={1.5} />
            {count > 0 && (
              <span
                data-testid="cart-count"
                className="absolute -top-2 -right-2 bg-[#DF0000] text-white text-[10px] font-mono w-4 h-4 flex items-center justify-center"
              >
                {count}
              </span>
            )}
          </Link>
          <button className="md:hidden" data-testid="nav-menu-toggle" onClick={() => setOpen(!open)}>
            {open ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {open && (
        <div className="md:hidden bg-[#050507] border-t border-white/10 px-6 py-6 flex flex-col gap-5">
          {links.map((l) => (
            <a key={l.label} href={l.to} className="label" onClick={() => setOpen(false)}>
              {l.label}
            </a>
          ))}
        </div>
      )}
    </header>
  );
}
