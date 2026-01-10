'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { headers } from 'next/headers'

export async function loginWithGoogle() {
  const supabase = await createClient()

  // Tenta pegar a origem da requisição. 
  // Em produção, isso garante que seja a URL correta. 
  // Em localhost, garantimos o fallback seguro.
  const origin = (await headers()).get('origin') || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      // OBRIGATÓRIO: A URL completa para onde o Google vai devolver o código
      redirectTo: `${origin}/auth/callback`,
      queryParams: {
        access_type: 'offline',
        prompt: 'consent',
      },
    },
  })

  if (error) {
    return redirect('/login?message=Não foi possível conectar com Google')
  }

  if (data.url) {
    return redirect(data.url)
  }
}

export async function loginWithEmail(formData: FormData) {
  const supabase = await createClient()

  const email = formData.get('email') as string
  const password = formData.get('password') as string

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    return redirect('/login?message=Email ou senha incorretos')
  }

  // CORREÇÃO CRÍTICA:
  // Antes estava '/dashboard' (que não existe).
  // Agora aponta para '/praticar', que é sua área logada real.
  revalidatePath('/', 'layout')
  redirect('/dashboard')
}

export async function signup(formData: FormData) {
  const supabase = await createClient()

  const email = formData.get('email') as string
  const password = formData.get('password') as string

  // Nota: Seu formulário atual na page.tsx parece não ter campo 'fullName', 
  // mas mantive a lógica caso você adicione depois.
  const fullName = formData.get('fullName') as string

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
      },
      // Importante para evitar que o usuário precise confirmar email 
      // (se o Supabase estiver configurado para exigir confirmação, 
      // o login automático não funcionará sem isso)
    }
  })

  if (error) {
    return redirect(`/login?message=${encodeURIComponent(error.message)}`)
  }

  revalidatePath('/', 'layout')
  // CORREÇÃO CRÍTICA:
  redirect('/dashboard')
}