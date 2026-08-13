import { useState } from "react";
import { useAuth } from "../AuthContext";
import TermsModal from "./TermsModal";

export default function AuthPage() {
  const { login, register } = useAuth();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showTerms, setShowTerms] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (mode === "login") {
        await login(email, password);
      } else {
        if (!displayName.trim()) {
          setError("Display name is required");
          setLoading(false);
          return;
        }
        await register(email, password, displayName);
      }
    } catch (err: any) {
      setError(err.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "linear-gradient(135deg, #17212b 0%, #242f3d 100%)" }}>
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 rounded-full bg-[#2b5278] flex items-center justify-center mb-4 shadow-lg">
            <svg viewBox="0 0 24 24" className="w-9 h-9 fill-white">
              <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z" />
            </svg>
          </div>
          <h1 className="text-white text-2xl font-semibold tracking-tight">Farenet</h1>
          <p className="text-[#7d90a0] text-sm mt-1">
            {mode === "login" ? "Sign in to your account" : "Create your account"}
          </p>
        </div>

        {/* Card */}
        <div className="bg-[#1c2733] rounded-2xl p-6 shadow-2xl">
          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === "register" && (
              <div>
                <label className="block text-[#7d90a0] text-xs font-medium mb-1.5 uppercase tracking-wider">
                  Display Name
                </label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Your name"
                  className="w-full bg-[#242f3d] border border-[#2d3e50] rounded-xl px-4 py-3 text-white placeholder-[#4a6278] text-sm focus:outline-none focus:border-[#5288c1] transition-colors"
                />
              </div>
            )}
            <div>
              <label className="block text-[#7d90a0] text-xs font-medium mb-1.5 uppercase tracking-wider">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                className="w-full bg-[#242f3d] border border-[#2d3e50] rounded-xl px-4 py-3 text-white placeholder-[#4a6278] text-sm focus:outline-none focus:border-[#5288c1] transition-colors"
              />
            </div>
            <div>
              <label className="block text-[#7d90a0] text-xs font-medium mb-1.5 uppercase tracking-wider">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                minLength={6}
                className="w-full bg-[#242f3d] border border-[#2d3e50] rounded-xl px-4 py-3 text-white placeholder-[#4a6278] text-sm focus:outline-none focus:border-[#5288c1] transition-colors"
              />
            </div>

            {error && (
              <div className="bg-red-900/30 border border-red-700/50 rounded-xl px-4 py-3 text-red-400 text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#5288c1] hover:bg-[#4a7ab5] disabled:opacity-50 text-white font-semibold rounded-xl py-3 text-sm transition-colors mt-2"
            >
              {loading ? "Please wait..." : mode === "login" ? "Sign In" : "Create Account"}
            </button>
          </form>

          <div className="mt-5 text-center">
            <button
              onClick={() => { setMode(mode === "login" ? "register" : "login"); setError(""); }}
              className="text-[#5288c1] text-sm hover:underline"
            >
              {mode === "login" ? "Don't have an account? Register" : "Already have an account? Sign in"}
            </button>
          </div>
        </div>

        <p className="text-center text-[#4a6278] text-xs mt-6">
          By signing in, you agree to our{" "}
          <button onClick={() => setShowTerms(true)} className="text-[#5288c1] hover:underline">
            Terms of Service
          </button>
        </p>
      </div>

      {showTerms && <TermsModal onClose={() => setShowTerms(false)} />}
    </div>
  );
}
