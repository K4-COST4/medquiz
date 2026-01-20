import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  // 1. Configura Resposta Inicial
  let supabaseResponse = NextResponse.next({
    request,
  })

  // 2. Configura Cliente Supabase
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

  // 3. Verifica Usuário
  // IMPORTANTE: Do not protect the 'getUser' call itself, handle the result.
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // --- LÓGICA DE PROTEÇÃO DE ROTAS (RESTRICTIVE) ---
  const path = request.nextUrl.pathname;

  // A. Definição da Whitelist (Rotas Públicas)
  const publicRoutes = [
    '/',               // Landing Page
    '/login',          // Auth
    '/cadastro',       // Auth
    '/termos',         // Termos (Se houver)
    '/privacidade',    // Privacidade (Se houver)
    '/admin'           // EXCEPTION: User requested Admin to be public
  ];

  // Verifica se é uma rota pública baseada em prefixo ou match exato
  const isPublicRoute =
    publicRoutes.includes(path) ||
    path.startsWith('/auth') ||       // Callbacks de Auth
    path.startsWith('/legal') ||       // Legal pages (Terms, Privacy)
    path.startsWith('/api/webhooks'); // Webhooks externos

  // B. Regra: Usuário LOGADO tentando acessar páginas de Auth -> Dashboard
  if (user && (path === '/login' || path === '/cadastro')) {
    const url = request.nextUrl.clone();
    url.pathname = '/dashboard';
    return NextResponse.redirect(url);
  }

  // C. Regra: Usuário DESLOGADO tentando acessar rota PRIVADA -> Login
  if (!user && !isPublicRoute) {
    console.log(`>>> ACESSO NEGADO: ${path}. Redirecionando para Login.`);
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('next', path); // Para redirecionar de volta depois
    return NextResponse.redirect(url);
  }

  // Se passou, atualiza a sessão (cookies) e segue
  return supabaseResponse
}