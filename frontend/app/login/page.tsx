import { loginWithGoogle, loginWithEmail, signup } from './actions'

export default async function LoginPage(props: {
  searchParams: Promise<{ message: string }>
}) {
  const searchParams = await props.searchParams
  
  return (
    <div className="flex flex-col gap-4 p-4 max-w-md mx-auto min-h-screen justify-center">
      <h1 className="text-2xl font-bold text-center">Entrar no MedQuiz</h1>
      
      {/* Exibe mensagem de erro se houver na URL */}
      {searchParams?.message && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative text-center">
          {searchParams.message}
        </div>
      )}
      
      {/* Botão Google */}
      <form action={loginWithGoogle}>
        <button className="bg-blue-600 hover:bg-blue-700 text-white p-3 rounded w-full font-semibold transition-colors">
          Entrar com Google
        </button>
      </form>

      <div className="flex items-center my-4">
        <div className="flex-grow border-t border-gray-300"></div>
        <span className="flex-shrink mx-4 text-gray-600">OU</span>
        <div className="flex-grow border-t border-gray-300"></div>
      </div>

      {/* Formulário Email/Senha */}
      <form className="flex flex-col gap-4">
        <input 
          name="email" 
          type="email" 
          placeholder="seu@email.com" 
          required 
          className="border border-gray-300 p-3 rounded focus:outline-none focus:ring-2 focus:ring-blue-500" 
        />
        <input 
          name="password" 
          type="password" 
          placeholder="Sua senha" 
          required 
          className="border border-gray-300 p-3 rounded focus:outline-none focus:ring-2 focus:ring-blue-500" 
        />
        
        <button 
          formAction={loginWithEmail} 
          className="bg-green-600 hover:bg-green-700 text-white p-3 rounded font-semibold transition-colors"
        >
          Entrar
        </button>
        
        <button 
          formAction={signup} 
          className="bg-gray-800 hover:bg-gray-900 text-white p-3 rounded font-semibold transition-colors"
        >
          Criar Conta
        </button>
      </form>
    </div>
  )
}