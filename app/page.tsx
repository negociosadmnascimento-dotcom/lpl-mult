"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Eye, EyeOff, Lock, User, Zap } from "lucide-react";
import { useTheme } from "@/components/providers/ThemeProvider";
import { Moon, Sun } from "lucide-react";
import toast from "react-hot-toast";

export default function LoginPage() {
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    await new Promise((r) => setTimeout(r, 800));

    if (username === "lplmult" && password === "lpl2025") {
      localStorage.setItem("lpl-auth", "true");
      toast.success("Bem-vindo ao LPL mult!");
      router.push("/dashboard");
    } else {
      toast.error("Usuário ou senha incorretos");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-gradient-to-br from-[#0a0a2e] via-[#0f0f4e] to-[#1a0a3e]">
      {/* Background decorations */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-brand-blue/20 rounded-full blur-3xl animate-pulse-slow" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-brand-red/10 rounded-full blur-3xl animate-pulse-slow" style={{ animationDelay: "1s" }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-brand-blue/5 rounded-full blur-3xl" />
        {/* Grid pattern */}
        <div
          className="absolute inset-0 opacity-5"
          style={{
            backgroundImage: `linear-gradient(rgba(43,43,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(43,43,255,0.5) 1px, transparent 1px)`,
            backgroundSize: "60px 60px",
          }}
        />
      </div>

      {/* Theme toggle */}
      <button
        onClick={toggleTheme}
        className="absolute top-6 right-6 p-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-all duration-200 backdrop-blur-sm border border-white/10"
      >
        {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
      </button>

      {/* Login card */}
      <div className="relative w-full max-w-md mx-4 animate-fade-in-up">
        <div className="bg-white/10 dark:bg-white/5 backdrop-blur-xl border border-white/20 rounded-3xl p-8 shadow-2xl">
          {/* Logo */}
          <div className="flex flex-col items-center mb-8">
            <div className="relative w-24 h-24 mb-4">
              <div className="absolute inset-0 bg-brand-blue rounded-full animate-pulse-ring opacity-50" />
              <div className="relative w-24 h-24 bg-brand-blue rounded-full flex items-center justify-center border-4 border-brand-red shadow-lg shadow-brand-blue/40">
                <div className="text-center">
                  <div className="text-white font-black text-2xl leading-none tracking-tight">LPL</div>
                  <div className="text-white/90 font-medium text-xs mt-0.5">mult</div>
                </div>
              </div>
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Gestão de Brindes</h1>
            <p className="text-white/50 text-sm mt-1">Sistema Corporativo LPL mult</p>
          </div>

          {/* Form */}
          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-2">
              <label className="text-white/70 text-sm font-medium">Usuário</label>
              <div className="relative">
                <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Acesso compartilhado"
                  className="w-full bg-white/10 border border-white/20 rounded-xl pl-10 pr-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/30 transition-all duration-200 text-sm"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-white/70 text-sm font-medium">Senha</label>
              <div className="relative">
                <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-white/10 border border-white/20 rounded-xl pl-10 pr-12 py-3 text-white placeholder-white/30 focus:outline-none focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/30 transition-all duration-200 text-sm"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70 transition-colors"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-premium w-full bg-brand-blue hover:bg-brand-blue-dark text-white font-semibold py-3.5 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed shadow-lg shadow-brand-blue/30 hover:shadow-brand-blue/50 hover:-translate-y-0.5 active:translate-y-0"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Entrando...
                </>
              ) : (
                <>
                  <Zap size={16} />
                  Entrar no Sistema
                </>
              )}
            </button>
          </form>

          {/* Hint */}
          <div className="mt-6 p-3 bg-white/5 rounded-xl border border-white/10">
            <p className="text-white/40 text-xs text-center">
              <span className="text-white/60 font-medium">Acesso Único Corporativo</span> — Sistema compartilhado entre todos os colaboradores
            </p>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-white/20 text-xs mt-6">
          © 2025 LPL mult • Sistema de Gestão de Brindes
        </p>
      </div>
    </div>
  );
}
