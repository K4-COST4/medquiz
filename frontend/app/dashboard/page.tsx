import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'

export default async function DashboardPage() {
  const supabase = await createClient()

  // Verificação dupla de segurança no servidor
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    redirect('/login')
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Área do Aluno</h1>
      <div className="bg-green-100 p-4 rounded-md border border-green-300 text-green-800">
        <p>✅ <strong>Sucesso!</strong> Você está logado como: {user.email}</p>
      </div>
      
      {/* Botão de Logout para testar */}
      <form action="/auth/signout" method="post" className="mt-4">
        <button className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600">
          Sair da Conta
        </button>
      </form>
    </div>
  )
}