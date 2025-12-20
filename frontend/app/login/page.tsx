"use client";

import { useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";

// Conexão direta com Supabase (Segura no Frontend pois usamos a chave Anon)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [loading, setLoading] = useState(false);
  const [modo, setModo] = useState<"login" | "cadastro">("login"); // Alterna entre entrar e cadastrar

  async function lidarComAuth(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      if (modo === "login") {
        // Tentar Logar
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password: senha,
        });
        if (error) throw error;
        router.push("/"); // Manda para a home se der certo
      } else {
        // Tentar Cadastrar
        const { error } = await supabase.auth.signUp({
          email,
          password: senha,
        });
        if (error) throw error;
        alert("Cadastro realizado! Verifique seu e-mail ou faça login.");
        setModo("login");
      }
    } catch (erro: any) {
      alert("Erro: " + erro.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="bg-slate-800 p-8 rounded-2xl shadow-xl w-full max-w-md border border-slate-700">
        <h1 className="text-3xl font-bold text-blue-400 mb-6 text-center">
          {modo === "login" ? "Entrar no MediLingo" : "Criar Conta"}
        </h1>

        <form onSubmit={lidarComAuth} className="flex flex-col gap-4">
          <input
            type="email"
            placeholder="Seu e-mail"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="p-3 rounded bg-slate-900 border border-slate-600 text-white focus:border-blue-500 outline-none"
            required
          />
          <input
            type="password"
            placeholder="Sua senha"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            className="p-3 rounded bg-slate-900 border border-slate-600 text-white focus:border-blue-500 outline-none"
            required
          />
          
          <button
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded transition-all disabled:opacity-50"
          >
            {loading ? "Carregando..." : modo === "login" ? "Entrar" : "Cadastrar"}
          </button>
        </form>

        <div className="mt-6 text-center text-gray-400 text-sm">
          {modo === "login" ? "Ainda não tem conta? " : "Já tem conta? "}
          <button
            onClick={() => setModo(modo === "login" ? "cadastro" : "login")}
            className="text-blue-400 hover:underline font-bold"
          >
            {modo === "login" ? "Cadastre-se" : "Faça Login"}
          </button>
        </div>
      </div>
    </div>
  );
}