import "@/App.css";
import { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ReactLenis } from "lenis/react";
import { Toaster } from "sonner";
import { CartProvider } from "@/context/CartContext";
import AgeGate from "@/components/AgeGate";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Home from "@/pages/Home";
import Shop from "@/pages/Shop";
import ProductDetail from "@/pages/ProductDetail";
import Cart from "@/pages/Cart";
import Checkout from "@/pages/Checkout";
import Blog from "@/pages/Blog";
import BlogPost from "@/pages/BlogPost";
import BrandPage from "@/pages/BrandPage";
import LogoOptions from "@/pages/LogoOptions";
import ConstructionBanner from "@/components/ConstructionBanner";
import AdminLogin from "@/pages/AdminLogin";
import AdminDashboard from "@/pages/AdminDashboard";

const Site = () => (
  <>
    <Navbar />
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/shop" element={<Shop />} />
      <Route path="/product/:slug" element={<ProductDetail />} />
      <Route path="/cart" element={<Cart />} />
      <Route path="/checkout" element={<Checkout />} />
      <Route path="/journal" element={<Blog />} />
      <Route path="/journal/:slug" element={<BlogPost />} />
      <Route path="/brand/:slug" element={<BrandPage />} />
      <Route path="/logo-options" element={<LogoOptions />} />
    </Routes>
    <Footer />
    <ConstructionBanner />
  </>
);

function App() {
  const [verified, setVerified] = useState(() => localStorage.getItem("ccc_age_ok") === "true");
  const isAdmin = window.location.pathname.startsWith("/admin");

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <ReactLenis root options={{ lerp: 0.09, smoothWheel: true }}>
      <CartProvider>
        <BrowserRouter>
          <Toaster position="bottom-right" theme="light" />
          {!verified && !isAdmin && <AgeGate onVerified={() => setVerified(true)} />}
          <Routes>
            <Route path="/admin" element={<AdminLogin />} />
            <Route path="/admin/dashboard" element={<AdminDashboard />} />
            <Route path="/*" element={<Site />} />
          </Routes>
        </BrowserRouter>
      </CartProvider>
    </ReactLenis>
  );
}

export default App;
