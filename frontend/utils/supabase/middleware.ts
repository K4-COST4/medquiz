import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  // 0. REGRA DE OURO: Ignora rotas de Auth para evitar loops
  // Isso impede que o middleware intercepte o callback de login do Google
  if (request.nextUrl.pathname.startsWith('/auth')) {
    return NextResponse.next()
  }

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
  // Remova estes logs em produção para limpar o terminal
  console.log("------------------------------------------------")
  console.log(">>> MIDDLEWARE INICIADO")
  console.log(">>> Rota tentada:", request.nextUrl.pathname)

  // 3. Verifica o usuário
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error) {
    // É normal dar erro se não tiver token (usuário deslogado)
    // console.log(">>> Nota: Nenhum usuário ativo no momento.") 
  }
  
  console.log(">>> Usuário está logado?", user ? "SIM" : "NÃO")
  // ----------------------------------

  // Função auxiliar para redirecionar mantendo os cookies da sessão
  const redirectWithCookies = (path: string) => {
    console.log(`>>> REDIRECIONANDO para: ${path}`)
    const url = request.nextUrl.clone()
    url.pathname = path
    const newResponse = NextResponse.redirect(url)
    
    // Transplante de cookies (Crucial para o login persistir)
    const cookiesToSet = supabaseResponse.cookies.getAll()
    cookiesToSet.forEach(cookie => {
      newResponse.cookies.set(cookie)
    })
    
    return newResponse
  }

  // --- REGRAS DE PROTEÇÃO ---

  // A. Usuário LOGADO tentando acessar Login -> Manda para Dashboard
  if (user && request.nextUrl.pathname.startsWith('/login')) {
    return redirectWithCookies('/dashboard')
  }

  // B. Usuário DESLOGADO tentando acessar rotas protegidas -> Manda para Login
  if (!user && (
      request.nextUrl.pathname.startsWith('/dashboard') || 
      request.nextUrl.pathname.startsWith('/perfil') || 
      request.nextUrl.pathname.startsWith('/erros') ||
      request.nextUrl.pathname.startsWith('/praticar')||
      request.nextUrl.pathname.startsWith('/contribuir')||
      request.nextUrl.pathname.startsWith('/estatisticas')||
      request.nextUrl.pathname.startsWith('/medai')
  )) {
    console.log(">>> BLOQUEIO: Acesso restrito. Redirecionando para login.")
    // Adiciona 'next' na URL para o usuário voltar para onde queria depois de logar
    const loginUrl = `/login?next=${request.nextUrl.pathname}`
    return redirectWithCookies(loginUrl)
  }

  // Se passou por tudo, libera o acesso
  return supabaseResponse
}