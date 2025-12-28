"use client";

import { useState, useEffect } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { 
  User, Phone, Hash, ArrowRight, Loader2, Brain, CheckCircle2 
} from "lucide-react";

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function CompletarCadastroPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [user, setUser] = useState<any>(null);

  const [formData, setFormData] = useState({
    nome: "",
    handle: "",
    telefone: ""
  });

  useEffect(() => {
    async function checkUser() {
      // 1. Verifica quem está logado (v veio do Google)
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push("/cadastro");
        return;
      }

      // 2. Verifica se JÁ TEM perfil (se sim, não precisa completar nada)
      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", session.user.id)
        .single();

      if (profile && profile.handle) {
        router.push("/dashboard");
        return;
      }

      // 3. Se não tem, preenche o nome com o que veio do Google
      setUser(session.user);
      setFormData(prev => ({
        ...prev,
        nome: session.user.user_metadata?.full_name || "",
        email: session.user.email
      }));
      setLoading(false);
    }
    checkUser();
  }, [router]);

  async function handleSalvar(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    if (!formData.handle.match(/^[a-zA-Z0-9_]+$/)) {
      alert("O ID deve conter apenas letras, números e underline.");
      setSaving(false);
      return;
    }

    // Cria o perfil vinculado ao usuário do Google
    const { error } = await supabase
      .from('profiles')
      .upsert({
        id: user.id,
        nome: formData.nome, // Usuário pode ter editado
        handle: formData.handle.toLowerCase(),
        telefone: formData.telefone,
        email: user.email,
        xp: 0,
        streak: 0
      });

    if (error) {
      if (error.code === '23505') alert("Este ID já está em uso.");
      else alert("Erro ao salvar perfil.");
      setSaving(false);
    } else {
      router.push("/dashboard");
    }
  }

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-slate-50"><Loader2 className="animate-spin text-violet-600"/></div>;
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 font-sans selection:bg-violet-100 selection:text-violet-900">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white w-full max-w-md p-8 rounded-3xl shadow-xl border border-slate-100"
      >
        <div className="flex justify-center mb-6">
           <div className="bg-violet-100 p-3 rounded-full text-violet-600">
             <CheckCircle2 size={32} />
           </div>
        </div>

        <div className="text-center mb-8">
            <h1 className="text-2xl font-black text-slate-800">Quase lá!</h1>
            <p className="text-slate-400 font-medium text-sm mt-1">Complete seu perfil para acessar o MedQuiz.</p>
        </div>

        <form onSubmit={handleSalvar} className="space-y-4">
            
            {/* Nome de Exibição */}
            <div className="relative group">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-violet-500 transition-colors" size={20}/>
                <input 
                  type="text" 
                  value={formData.nome}
                  onChange={(e) => setFormData({...formData, nome: e.target.value})}
                  required
                  placeholder="Seu Nome ou Apelido"
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3.5 pl-12 pr-4 font-bold text-slate-700 outline-none focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10"
                />
            </div>

            {/* Handle / ID */}
            <div className="relative group">
                <Hash className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-violet-500 transition-colors" size={20}/>
                <input 
                  type="text" 
                  value={formData.handle}
                  onChange={(e) => setFormData({...formData, handle: e.target.value})}
                  required
                  placeholder="Crie seu ID (ex: dr_house)"
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3.5 pl-12 pr-4 font-bold text-slate-700 outline-none focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10 lowercase"
                />
            </div>

            {/* Telefone */}
            <div className="relative group">
                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-violet-500 transition-colors" size={20}/>
                <input 
                  type="tel" 
                  value={formData.telefone}
                  onChange={(e) => setFormData({...formData, telefone: e.target.value})}
                  required
                  placeholder="WhatsApp / Celular"
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3.5 pl-12 pr-4 font-bold text-slate-700 outline-none focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10"
                />
            </div>

            <button 
              type="submit" 
              disabled={saving}
              className="w-full bg-violet-600 hover:bg-violet-700 text-white font-black py-4 rounded-2xl shadow-lg shadow-violet-200 transform active:scale-95 transition-all flex items-center justify-center gap-2 mt-6"
            >
              {saving ? <Loader2 className="animate-spin" /> : <>Finalizar Cadastro <ArrowRight size={20}/></>}
            </button>

        </form>
      </motion.div>
    </div>
  );
}