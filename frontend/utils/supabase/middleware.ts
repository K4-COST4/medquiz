import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  // 1. Prepara a resposta inicial
  let supabaseResponse = NextResponse.next({
    request,
  })

  // 2. Configura o cliente do Supabase
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // --- ÁREA DE DIAGNÓSTICO (LOGS) ---
  console.log("------------------------------------------------")
  console.log(">>> MIDDLEWARE INICIADO")
  console.log(">>> Rota tentada:", request.nextUrl.pathname)

  // 3. Verifica o usuário
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error) {
    console.log(">>> Erro ao buscar usuário:", error.message)
  }
  
  console.log(">>> Usuário está logado?", user ? "SIM (Email: " + user.email + ")" : "NÃO")
  // ----------------------------------

  // Função auxiliar para redirecionar levando os cookies junto (Tratamento)
  const redirectWithCookies = (path: string) => {
    console.log(`>>> REDIRECIONANDO para: ${path}`) // Log extra aqui
    const url = request.nextUrl.clone()
    url.pathname = path
    const newResponse = NextResponse.redirect(url)
    
    // Transplante de cookies
    const cookiesToSet = supabaseResponse.cookies.getAll()
    cookiesToSet.forEach(cookie => {
      newResponse.cookies.set(cookie)
    })
    
    return newResponse
  }

  // REGRAS DE PROTEÇÃO

  // A. Se estiver logado e tentar ir pro Login -> Dashboard
  if (user && request.nextUrl.pathname.startsWith('/login')) {
    return redirectWithCookies('/dashboard')
  }

  // B. Se NÃO estiver logado e tentar acessar rotas protegidas
  if (!user && (
      request.nextUrl.pathname.startsWith('/dashboard') || 
      request.nextUrl.pathname.startsWith('/perfil') || 
      request.nextUrl.pathname.startsWith('/erros') ||
      request.nextUrl.pathname.startsWith('/praticar')
  )) {
    console.log(">>> BLOQUEIO: Tentativa de acesso sem login. Redirecionando.")
// Adiciona o parâmetro 'next' com a rota que ele tentou acessar
    const loginUrl = `/login?next=${request.nextUrl.pathname}`
  return redirectWithCookies(loginUrl)
  }

  console.log(">>> ACESSO PERMITIDO. Passando para a página.")
  console.log("------------------------------------------------")
  
  return supabaseResponse
}