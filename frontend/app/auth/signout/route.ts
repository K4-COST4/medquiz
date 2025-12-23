import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { type NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const supabase = await createClient()

  // 1. Verifica se existe sessão ativa
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) {
    // 2. Destrói a sessão no Supabase (invalida o token)
    await supabase.auth.signOut()
  }

  // 3. Limpa o cache do Next.js para garantir que a UI atualize
  revalidatePath('/', 'layout')

  // 4. Redireciona o usuário para a tela de login
  return NextResponse.redirect(new URL('/login', req.url), {
    status: 302,
  })
}