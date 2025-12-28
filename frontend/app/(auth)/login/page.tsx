import { loginWithGoogle, loginWithEmail, signup } from './actions'
import { Mail, Lock, ArrowRight, Stethoscope, CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import Link from "next/link"

export default async function LoginPage(props: {
  searchParams: Promise<{ message: string }>
}) {
  const searchParams = await props.searchParams
  
  return (
    <div className="w-full min-h-screen lg:grid lg:grid-cols-2 overflow-hidden bg-slate-50 dark:bg-slate-950">
      
      {/* LADO ESQUERDO: Branding (Visível apenas em Desktop) */}
      <div className="hidden lg:flex relative flex-col bg-slate-900 text-white p-10 dark:border-r border-slate-800">
        {/* Background Pattern Sutil */}
        <div className="absolute inset-0 bg-indigo-950/50" />
        <div className="absolute inset-0 bg-[radial-gradient(#4f46e5_1px,transparent_1px)] [background-size:20px_20px] opacity-10" />
        
        <div className="relative z-10 flex items-center gap-2 text-lg font-bold">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold">M</span>
          </div>
          MedQuiz
        </div>

        <div className="relative z-10 mt-auto space-y-4">
          <blockquote className="space-y-2">
            <p className="text-lg font-medium leading-relaxed text-slate-200">
              &ldquo;Esta plataforma transformou a maneira como estudo para as provas. A IA e os simulados são incrivelmente precisos.&rdquo;
            </p>
            <footer className="text-sm text-slate-400">Anônimo &mdash; Estudante de Medicina</footer>
          </blockquote>
          
          <div className="flex gap-4 pt-4">
             <div className="flex items-center gap-2 text-xs text-slate-400">
                <CheckCircle2 size={14} className="text-emerald-500" /> +1.000 Questões
             </div>
             <div className="flex items-center gap-2 text-xs text-slate-400">
                <CheckCircle2 size={14} className="text-emerald-500" /> Tutor IA 24h
             </div>
          </div>
        </div>
      </div>

      {/* LADO DIREITO: Formulário */}
      <div className="flex items-center justify-center py-12 px-4 sm:px-8 lg:px-12">
        <div className="mx-auto grid w-full max-w-[400px] gap-6 animate-in fade-in slide-in-from-right-8 duration-500">
          
          <div className="flex flex-col space-y-2 text-center">
            {/* Logo Mobile */}
            <div className="lg:hidden flex justify-center mb-4">
                <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/30">
                    <Stethoscope className="text-white w-6 h-6" />
                </div>
            </div>
            
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              Bem-vindo
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Entre com seu e-mail ou conta Google
            </p>
          </div>

          {/* MENSAGEM DE ERRO (Se houver) */}
          {searchParams?.message && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-300 px-4 py-3 rounded-lg text-sm text-center font-medium animate-pulse">
              {searchParams.message}
            </div>
          )}

          {/* LOGIN GOOGLE */}
          <form action={loginWithGoogle}>
            <Button variant="outline" className="w-full py-5 border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700" type="submit">
               {/* Ícone Google SVG simples */}
               <svg className="mr-2 h-4 w-4" aria-hidden="true" focusable="false" data-prefix="fab" data-icon="google" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 488 512">
                <path fill="currentColor" d="M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 123 24.5 166.3 64.9l-67.5 64.9C258.5 52.6 94.3 116.6 94.3 256c0 86.5 69.1 156.6 153.7 156.6 98.2 0 135-70.4 140.8-106.9H248v-85.3h236.1c2.3 12.7 3.9 24.9 3.9 41.4z"></path>
              </svg>
              Entrar com Google
            </Button>
          </form>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-slate-200 dark:border-slate-700" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-slate-50 dark:bg-slate-950 px-2 text-slate-500 dark:text-slate-400">
                Ou continue com email
              </span>
            </div>
          </div>

          {/* FORMULÁRIO EMAIL */}
          <form className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <Input
                  id="email"
                  name="email"
                  placeholder="medico@exemplo.com"
                  type="email"
                  autoCapitalize="none"
                  autoComplete="email"
                  autoCorrect="off"
                  required
                  className="pl-10 h-11 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 focus-visible:ring-indigo-600"
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="password">Senha</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <Input
                  id="password"
                  name="password"
                  type="password"
                  placeholder="••••••••"
                  required
                  className="pl-10 h-11 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 focus-visible:ring-indigo-600"
                />
              </div>
            </div>
            
            <div className="flex flex-col gap-3 mt-2">
                <Button formAction={loginWithEmail} className="w-full h-11 bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-md shadow-indigo-500/20">
                    Entrar <ArrowRight className="ml-2 h-4 w-4" />
                </Button>

                <p className="text-xs text-center text-slate-500 mt-2">
                    Não tem uma conta?
                </p>

                <Link href="/cadastro" className="w-full">
                <Button type="button" variant="secondary" className="w-full h-11 bg-slate-200 dark:bg-slate-800 text-slate-900 dark:text-slate-100 hover:bg-slate-300 dark:hover:bg-slate-700">
                    Criar Nova Conta
                </Button>
              </Link>
            </div>
          </form>

          <p className="px-8 text-center text-xs text-slate-500 dark:text-slate-400 leading-5">
            Ao clicar em continuar, você concorda com nossos{" "}
            <a href="#" className="underline underline-offset-4 hover:text-indigo-600">
              Termos de Serviço
            </a>{" "}
            e{" "}
            <a href="#" className="underline underline-offset-4 hover:text-indigo-600">
              Política de Privacidade
            </a>.
          </p>
        </div>
      </div>
    </div>
  )
}