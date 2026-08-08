import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/lib/api";

export default function AdminLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const { data } = await api.post("/auth/login", { email, password });
      localStorage.setItem("ccc_token", data.token);
      navigate("/admin/dashboard");
    } catch (err) {
      const d = err.response?.data?.detail;
      setError(typeof d === "string" ? d : "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div data-testid="admin-login-page" className="min-h-screen bg-[#0A0A0A] text-white flex items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <div className="font-display text-3xl mb-2">Cosmos<span className="text-[#DF0000]">.</span></div>
        <div className="label text-white/40 mb-10">Admin Access</div>
        <form onSubmit={submit} className="space-y-5">
          <div>
            <label className="label block mb-2 text-white/50">Email</label>
            <input data-testid="admin-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-transparent border border-white/20 focus:border-[#DF0000] outline-none px-4 py-3 font-mono text-sm" />
          </div>
          <div>
            <label className="label block mb-2 text-white/50">Password</label>
            <input data-testid="admin-password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-transparent border border-white/20 focus:border-[#DF0000] outline-none px-4 py-3 font-mono text-sm" />
          </div>
          {error && <p data-testid="admin-error" className="text-[#FF3B30] text-sm">{error}</p>}
          <button data-testid="admin-login-btn" disabled={loading} className="btn-fill w-full px-10 py-4 bg-[#DF0000] text-white label border border-[#DF0000] disabled:opacity-50">
            {loading ? "Signing in…" : "Sign In"}
          </button>
        </form>
      </div>
    </div>
  );
}
