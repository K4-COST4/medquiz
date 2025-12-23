import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // --- CONFIGURAÇÃO DA SUA ROTA PRINCIPAL ---
  // Digite aqui o nome da pasta da sua página inicial real.
  // Exemplo: se sua página está em app/trilhas/page.tsx, coloque '/trilhas'
  // Se sua página principal for a própria raiz (app/page.tsx), deixe apenas '/'
  const ROTA_PRINCIPAL = '/' 
  // ^^^ MUDE ISSO AQUI ^^^

  // REGRA 1: Usuário LOGADO tentando acessar Login ou Raiz
  // Se ele já tá logado, manda ele direto pra sua página principal
  if (user && (request.nextUrl.pathname.startsWith('/') || request.nextUrl.pathname === '/')) {
    
    // Se a rota principal for a própria raiz, não redireciona para evitar loop
    if (request.nextUrl.pathname === ROTA_PRINCIPAL) {
      return supabaseResponse
    }

    const url = request.nextUrl.clone()
    url.pathname = ROTA_PRINCIPAL
    return NextResponse.redirect(url)
  }

  // REGRA 2: Usuário NÃO LOGADO tentando acessar área restrita
  // Aqui você lista as rotas que SÓ quem está logado pode ver
  // Adicione suas rotas protegidas dentro do parênteses
  if (!user && (
      request.nextUrl.pathname.startsWith('/praticar') || 
      request.nextUrl.pathname.startsWith('/perfil') ||
      request.nextUrl.pathname.startsWith('/erros')
     )) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}