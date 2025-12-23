import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'

export default async function DashboardPage() {
  const supabase = await createClient()
  
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return redirect('/login')
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-8 bg-slate-50 dark:bg-slate-950">
      <div className="max-w-4xl w-full text-center space-y-6">
        <h1 className="text-4xl font-extrabold text-indigo-600 dark:text-indigo-400">
          Dashboard do MedQuiz
        </h1>
        <p className="text-xl text-slate-600 dark:text-slate-300">
          Bem-vindo de volta, <span className="font-semibold">{user.email}</span>!
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8">
          {/* Card de Atalho para Praticar */}
          <div className="p-6 border border-slate-200 rounded-xl bg-white shadow-sm dark:bg-slate-900 dark:border-slate-800">
            <h2 className="text-xl font-bold mb-2">Continuar Estudos</h2>
            <p className="text-slate-500 mb-4">Você parou na trilha de Cardiologia.</p>
            <a href="/praticar" className="inline-block w-full py-2 px-4 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition">
              Ir para /praticar
            </a>
          </div>
          
           {/* Card de Logout */}
           <div className="p-6 border border-slate-200 rounded-xl bg-white shadow-sm dark:bg-slate-900 dark:border-slate-800">
            <h2 className="text-xl font-bold mb-2">Sessão</h2>
            <form action="/auth/signout" method="post">
                <button className="w-full py-2 px-4 border border-red-200 text-red-600 rounded-lg hover:bg-red-50 dark:border-red-900 dark:hover:bg-red-900/20 transition">
                Sair da Conta
                </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}