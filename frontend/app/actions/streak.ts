'use server'

import { createClient } from "@/utils/supabase/server"

// Definindo a interface de retorno para o TypeScript não se perder
interface StreakData {
  current_streak: number
  has_played_today: boolean
  last_activity_date: string | null
}

export async function getUserStreak(): Promise<StreakData> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  // Retorno padrão se não houver usuário
  if (!user) {
    return { current_streak: 0, has_played_today: false, last_activity_date: null }
  }

  const today = new Date().toISOString().split('T')[0]

  const { data } = await supabase
    .from('user_streaks')
    .select('current_streak, last_activity_date')
    .eq('user_id', user.id)
    .single()

  // Retorno padrão se não houver registro no banco
  if (!data) {
    return { current_streak: 0, has_played_today: false, last_activity_date: null }
  }

  // Retorno com dados
  return {
    current_streak: data.current_streak,
    has_played_today: data.last_activity_date === today,
    last_activity_date: data.last_activity_date
  }
}

export async function updateStreak() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) return

  const { data: existing } = await supabase
    .from('user_streaks')
    .select('*')
    .eq('user_id', user.id)
    .single()

  const today = new Date()
  const todayStr = today.toISOString().split('T')[0]

  if (!existing) {
    await supabase.from('user_streaks').insert({
      user_id: user.id,
      current_streak: 1,
      last_activity_date: todayStr
    })
    return { streak: 1 }
  }

  if (existing.last_activity_date === todayStr) {
    return { streak: existing.current_streak }
  }

  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  const yesterdayStr = yesterday.toISOString().split('T')[0]

  let newStreak = 1
  if (existing.last_activity_date === yesterdayStr) {
     newStreak = existing.current_streak + 1
  }

  await supabase
    .from('user_streaks')
    .update({
      current_streak: newStreak,
      last_activity_date: todayStr,
      updated_at: new Date().toISOString()
    })
    .eq('user_id', user.id)

  return { streak: newStreak }
}