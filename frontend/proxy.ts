import { type NextRequest } from 'next/server'
import { updateSession } from '@/utils/supabase/middleware'

// A função agora deve se chamar 'proxy' ou ser o export default
export async function proxy(request: NextRequest) {
  // Essa função auxiliar gerencia a renovação do token
  // Mantemos a lógica do Supabase, que deve funcionar normalmente
  return await updateSession(request)
}

export const config = {
  matcher: [
    /*
     * Aplica a todas as rotas exceto:
     * - _next/static (arquivos estáticos)
     * - _next/image (otimização de imagens)
     * - favicon.ico (ícone)
     * - imagens (svg, png, jpg, etc)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}