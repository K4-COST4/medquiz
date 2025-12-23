import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  // 1. Cria a resposta inicial
  let supabaseResponse = NextResponse.next({
    request,
  })

  // 2. Instancia o cliente Supabase
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          // Atualiza os cookies na requisição (para o Next ver agora)
          cookiesToSet.forEach(({ name, value, options }) =>
            request.cookies.set(name, value)
          )
          
          // Atualiza a resposta inicial
          supabaseResponse = NextResponse.next({
            request,
          })
          
          // Define os cookies na resposta final (para o navegador salvar)
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // 3. Verifica o usuário. 
  // IMPORTANTE: Não use apenas getUser() sem tratar erro, pois pode quebrar se o cookie estiver corrompido.
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // --- REGRAS ATUALIZADAS ---

  // 1. Usuário LOGADO tentando acessar Login -> Manda para Dashboard
  if (user && request.nextUrl.pathname.startsWith('/login')) {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard' // MUDANÇA AQUI
    return NextResponse.redirect(url)
  }

  // 2. Proteção de Rotas
  // Se NÃO tem usuário e tenta acessar Dashboard ou outras áreas restritas
  if (!user && (
      request.nextUrl.pathname.startsWith('/dashboard') || // ADICIONADO
      request.nextUrl.pathname.startsWith('/perfil') || 
      request.nextUrl.pathname.startsWith('/erros') ||
      request.nextUrl.pathname.startsWith('/praticar') // Ainda protegida, mas não é mais a home
  )) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}