import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  // 'next' é para onde redirecionar o usuário após logar (ex: /dashboard)
  const next = searchParams.get('next') ?? '/'

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (!error) {
      // Cria um redirect para a página de destino
      const forwardedHost = request.headers.get('x-forwarded-host') // necessário se usar load balancers
      const isLocalEnv = process.env.NODE_ENV === 'development'
      
      if (isLocalEnv) {
        // Desenvolvimento: localhost
        return NextResponse.redirect(`${origin}${next}`)
      } else if (forwardedHost) {
        // Produção: Vercel/Outros
        return NextResponse.redirect(`https://${forwardedHost}${next}`)
      } else {
        return NextResponse.redirect(`${origin}${next}`)
      }
    }
  }

  // Se der erro, manda para uma página de erro
  return NextResponse.redirect(`${origin}/auth/auth-code-error`)
}