import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (!error) {
      const forwardedHost = request.headers.get('x-forwarded-host') // Vercel
      const isLocalEnv = process.env.NODE_ENV === 'development'

      // Prioridade de Redirecionamento:
      // 1. Se for local, usa a origem local.
      // 2. Se tiver forwardedHost (Vercel), usa ele.
      // 3. Fallback: Tenta usar a variável de ambiente do site (Configure isso no seu deploy!)
      
      if (isLocalEnv) {
        return NextResponse.redirect(`${origin}${next}`)
      } else if (forwardedHost) {
        return NextResponse.redirect(`https://${forwardedHost}${next}`)
      } else if (process.env.NEXT_PUBLIC_SITE_URL) {
        return NextResponse.redirect(`${process.env.NEXT_PUBLIC_SITE_URL}${next}`)
      } else {
        // Último recurso: usa o origin da request, mas isso pode falhar em containers
        return NextResponse.redirect(`${origin}${next}`)
      }
    }
  }

  // Se der erro, manda para login com erro
  return NextResponse.redirect(`${origin}/login?message=Erro ao autenticar`)
}