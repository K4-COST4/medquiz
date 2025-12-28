import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  // Captura o 'next' ou define '/dashboard' como padrão
  const next = searchParams.get('next') ?? '/dashboard'

  if (code) {
    const cookieStore = await cookies()

    // Cria o cliente Supabase MANUALMENTE para garantir controle total dos cookies
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              )
            } catch {
              // O 'set' pode falhar se chamado de um Server Component, 
              // mas aqui no Route Handler ele funciona perfeitamente.
            }
          },
        },
      }
    )

    // Troca o código pela sessão
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (!error) {
      // Lógica de redirecionamento inteligente
      const forwardedHost = request.headers.get('x-forwarded-host') 
      const isLocalEnv = process.env.NODE_ENV === 'development'
      
      if (isLocalEnv) {
        return NextResponse.redirect(`${origin}${next}`)
      } else if (forwardedHost) {
        return NextResponse.redirect(`https://${forwardedHost}${next}`)
      } else if (process.env.NEXT_PUBLIC_SITE_URL) {
        return NextResponse.redirect(`${process.env.NEXT_PUBLIC_SITE_URL}${next}`)
      } else {
        return NextResponse.redirect(`${origin}${next}`)
      }
    }
  }

  // Se der erro
  return NextResponse.redirect(`${origin}/login?message=Erro ao autenticar`)
}