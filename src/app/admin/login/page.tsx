"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Coffee, Eye, EyeOff, LoaderCircle, User, Lock, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";

import { useAdmin } from "@/context/AdminContext";

export default function AdminLoginPage() {
  const { refreshPermissions } = useAdmin();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identifier,
          password,
          deviceInfo: navigator.userAgent
        })
      });

      const result = await response.json();

      if (!response.ok) {
        setError(result.error || "Authentication failed");
        setLoading(false);
        return;
      }

      // Set the session on the client manually after server-side success
      const { error: sessionSetError } = await supabase.auth.setSession(result.session);

      if (sessionSetError) throw sessionSetError;

      await refreshPermissions();
      router.push("/admin/dashboard");
    } catch (err: any) {
      console.error("Login exception:", err);
      setError("An unexpected error occurred.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#fafaf9] p-6">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-[320px] space-y-8"
      >
        <div className="text-center space-y-2">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary mb-2">
            <Coffee className="h-6 w-6" />
          </div>
          <h1 className="text-xl font-bold tracking-tight">CAFE REPUBLIC</h1>
          <p className="text-xs text-muted-foreground font-medium">Admin Portal Access</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-1">
            <input
              type="text"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder="Admin ID / Email"
              className="w-full px-4 py-3 rounded-xl bg-white border border-border/50 focus:border-primary/30 focus:ring-4 focus:ring-primary/5 outline-none transition-all text-sm font-medium"
              required
            />
          </div>

          <div className="relative space-y-1">
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Security Key"
              className="w-full px-4 py-3 rounded-xl bg-white border border-border/50 focus:border-primary/30 focus:ring-4 focus:ring-primary/5 outline-none transition-all text-sm font-medium"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-[10px] text-muted-foreground/50 hover:text-primary transition-colors"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>

          {error && (
            <p className="text-[11px] font-bold text-red-500 text-center bg-red-50 py-2 rounded-lg border border-red-100">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-primary text-white rounded-xl font-bold shadow-lg shadow-primary/10 hover:shadow-primary/20 transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2 text-sm"
          >
            {loading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : "Authenticate"}
          </button>
        </form>

        <div className="text-center">
          <a href="/" className="text-[10px] font-bold text-muted-foreground/60 hover:text-primary transition-colors uppercase tracking-[0.2em]">
            Back to Front
          </a>
        </div>
      </motion.div>
    </div>
  );
}
