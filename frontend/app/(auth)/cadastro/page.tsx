"use client";

import { useState } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  Mail, Lock, User, Phone, Hash, ArrowRight, Loader2, Brain, AlertCircle
} from "lucide-react";
import Link from "next/link";
import { registerUser } from "./actions"; // <--- Importando a Server Action

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Ícone do Google (SVG)
const GoogleIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24">
    <path
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      fill="#4285F4"
    />
    <path
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      fill="#34A853"
    />
    <path
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.84z"
      fill="#FBBC05"
    />
    <path
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      fill="#EA4335"
    />
  </svg>
);

export default function CadastroPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const [formData, setFormData] = useState({
    nome: "",
    handle: "",
    telefone: "",
    email: "",
    senha: ""
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // --- FUNÇÃO DE LOGIN COM GOOGLE ---
  async function handleGoogleSignUp() {
    setLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=/cadastro/completar`,
      },
    });

    if (error) {
      setErrorMsg("Erro ao conectar com Google.");
      setLoading(false);
    }
  }

  // --- CADASTRO POR EMAIL (VIA SERVER ACTION) ---
  async function handleEmailCadastro(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErrorMsg("");

    try {
      // Chama a Server Action
      const result = await registerUser(formData);

      if (!result.success) {
        setErrorMsg(result.error || "Erro desconhecido.");
      } else {
        // Redireciona em caso de sucesso
        router.push(result.redirectUrl || "/dashboard");
      }

    } catch (err) {
      setErrorMsg("Erro de conexão.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 font-sans selection:bg-violet-100 selection:text-violet-900">

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white w-full max-w-md p-8 rounded-3xl shadow-xl shadow-slate-200/60 border border-slate-100"
      >
        <div className="flex justify-center mb-6">
          <div className="flex items-center gap-2">
            <div className="bg-violet-600 p-2 rounded-xl shadow-lg shadow-violet-200">
              <Brain className="text-white w-6 h-6" />
            </div>
            <span className="text-2xl font-black text-slate-800 tracking-tight">Med<span className="text-violet-600">Quiz</span></span>
          </div>
        </div>

        <div className="text-center mb-6">
          <h1 className="text-2xl font-black text-slate-800">Crie sua conta</h1>
          <p className="text-slate-400 font-medium text-sm mt-1">Comece sua jornada de residência.</p>
        </div>

        {errorMsg && (
          <div className="mb-6 p-4 bg-rose-50 border border-rose-100 rounded-2xl flex items-center gap-3 text-rose-500 text-sm font-bold">
            <AlertCircle size={18} /> {errorMsg}
          </div>
        )}

        {/* BOTÃO GOOGLE */}
        <button
          onClick={handleGoogleSignUp}
          disabled={loading}
          type="button"
          className="w-full bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold py-3.5 rounded-2xl flex items-center justify-center gap-3 transition-all mb-6 shadow-sm"
        >
          <GoogleIcon />
          <span>Criar com Google</span>
        </button>

        <div className="relative mb-6">
          <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-200"></div></div>
          <div className="relative flex justify-center text-sm"><span className="px-2 bg-white text-slate-400 font-medium">Ou com email</span></div>
        </div>

        <form onSubmit={handleEmailCadastro} className="space-y-4">

          {/* Nome de Exibição (Apelido) */}
          <div className="relative group">
            <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-violet-500 transition-colors" size={20} />
            <input
              type="text"
              name="nome"
              required
              placeholder="Nome de Exibição / Apelido"
              value={formData.nome}
              onChange={handleChange}
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3.5 pl-12 pr-4 font-bold text-slate-700 outline-none focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10 transition-all placeholder:text-slate-400 placeholder:font-medium"
            />
          </div>

          <div className="relative group">
            <Hash className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-violet-500 transition-colors" size={20} />
            <input
              type="text"
              name="handle"
              required
              placeholder="ID de Usuário (ex: med_joao)"
              value={formData.handle}
              onChange={handleChange}
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3.5 pl-12 pr-4 font-bold text-slate-700 outline-none focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10 transition-all placeholder:text-slate-400 placeholder:font-medium lowercase"
            />
          </div>

          <div className="relative group">
            <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-violet-500 transition-colors" size={20} />
            <input
              type="tel"
              name="telefone"
              required
              placeholder="WhatsApp / Celular"
              value={formData.telefone}
              onChange={handleChange}
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3.5 pl-12 pr-4 font-bold text-slate-700 outline-none focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10 transition-all placeholder:text-slate-400 placeholder:font-medium"
            />
          </div>

          <div className="relative group">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-violet-500 transition-colors" size={20} />
            <input
              type="email"
              name="email"
              required
              placeholder="Seu email"
              value={formData.email}
              onChange={handleChange}
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3.5 pl-12 pr-4 font-bold text-slate-700 outline-none focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10 transition-all placeholder:text-slate-400 placeholder:font-medium"
            />
          </div>

          <div className="relative group">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-violet-500 transition-colors" size={20} />
            <input
              type="password"
              name="senha"
              required
              placeholder="Senha"
              value={formData.senha}
              onChange={handleChange}
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3.5 pl-12 pr-4 font-bold text-slate-700 outline-none focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10 transition-all placeholder:text-slate-400 placeholder:font-medium"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-violet-600 hover:bg-violet-700 text-white font-black py-4 rounded-2xl shadow-lg shadow-violet-200 transform active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed mt-4"
          >
            {loading ? <Loader2 className="animate-spin" /> : <>Criar Conta <ArrowRight size={20} /></>}
          </button>
        </form>

        <div className="mt-8 text-center">
          <p className="text-slate-400 font-bold text-sm">
            Já tem uma conta?{' '}
            <Link href="/login" className="text-violet-600 hover:text-violet-700 hover:underline">
              Fazer Login
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}