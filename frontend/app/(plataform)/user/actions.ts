"use server";

import { createClient } from "@/utils/supabase/server"; // O @ garante que o import funcione em qualquer pasta
import { revalidatePath } from "next/cache";

const REGEN_TIME_HOURS = 0.5; // Tempo em horas para ganhar 1 vida (30 min)

/**
 * Verifica se já passou tempo suficiente para recuperar vidas automaticamente.
 * Deve ser chamado no layout ou ao carregar a página inicial.
 */
export async function checkAndRegenerateHearts() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    // 1. Pega dados atuais do banco
    const { data: profile } = await supabase
        .from('profiles')
        .select('hearts, last_heart_update')
        .eq('id', user.id)
        .single();

    if (!profile) return null;

    // 2. Se estiver cheio, não faz nada
    if (profile.hearts >= 5) return profile.hearts;

    // 3. Calcula regeneração passiva
    const lastUpdate = new Date(profile.last_heart_update).getTime();
    const now = new Date().getTime();
    const diffHours = (now - lastUpdate) / (1000 * 60 * 60);

    if (diffHours >= REGEN_TIME_HOURS) {
        // Quantas vidas ganhou nesse tempo?
        const heartsGained = Math.floor(diffHours / REGEN_TIME_HOURS);

        // Se ganhou alguma coisa, atualiza
        if (heartsGained > 0) {
            const newHearts = Math.min(5, profile.hearts + heartsGained);

            await supabase.from('profiles').update({
                hearts: newHearts,
                last_heart_update: new Date().toISOString() // Reseta o relógio para agora
            }).eq('id', user.id);

            // Revalida para o usuário ver a mudança
            // revalidatePath('/', 'layout');
            return newHearts;
        }
    }

    return profile.hearts;
}

/**
 * Remove 1 vida do usuário.
 * Retorna sucesso: false se já estiver zerado.
 */
export async function deductHeart() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false };

    const { data: profile } = await supabase.from('profiles').select('hearts').eq('id', user.id).single();

    if (profile && profile.hearts > 0) {
        const newCount = profile.hearts - 1;

        await supabase.from('profiles').update({
            hearts: newCount,
            // IMPORTANTE: Só atualiza o timestamp se estava cheio antes.
            // Se ele já estava recuperando (ex: tinha 4), não zera o relógio da próxima vida.
            // Mas para simplificar a lógica inicial V1, vamos resetar o timer ao perder vida:
            last_heart_update: new Date().toISOString()
        }).eq('id', user.id);

        revalidatePath('/', 'layout');
        return { success: true, remaining: newCount };
    }

    return { success: false, remaining: 0, message: "Sem vidas" };
}

/**
 * Adiciona 1 vida (Recompensa por Praticar Erros)
 */
export async function refillHeartByPractice() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const { data: profile } = await supabase.from('profiles').select('hearts').eq('id', user.id).single();

    if (profile && profile.hearts < 5) {
        await supabase.from('profiles').update({
            hearts: profile.hearts + 1
        }).eq('id', user.id);

        revalidatePath('/', 'layout');
        return true;
    }
    return false;
}

/**
 * Atualiza a ofensiva (streak) do usuário ao concluir atividades.
 * Deve ser chamado ao finalizar um Quiz com sucesso.
 */
export async function updateUserStreak() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // 1. Buscar dados atuais
    const { data: profile } = await supabase
        .from('profiles')
        .select('streak_count, last_study_date')
        .eq('id', user.id)
        .single();

    if (!profile) return;

    const today = new Date();
    // Normaliza para comparar datas (ignora horas)
    const todayStr = today.toISOString().split('T')[0];

    let lastDateStr = null;
    if (profile.last_study_date) {
        lastDateStr = new Date(profile.last_study_date).toISOString().split('T')[0];
    }

    // 2. Lógica de Streak
    let newStreak = profile.streak_count || 0;

    if (lastDateStr === todayStr) {
        // Já estudou hoje, não faz nada com o streak, mas atualiza o timestamp se quiser
        return;
    }

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    if (lastDateStr === yesterdayStr) {
        // Estudou ontem: +1 no streak
        newStreak += 1;
    } else {
        // Quebrou a ofensiva (ou é o primeiro dia)
        // Se nunca estudou, vira 1. Se quebrou, recomeça do 1.
        newStreak = 1;
    }

    // 3. Salvar
    await supabase.from('profiles').update({
        streak_count: newStreak,
        last_study_date: today.toISOString()
    }).eq('id', user.id);

    // Opcional: Revalidar dashboard para mostrar novo streak/fogo
    revalidatePath('/trilhas');
}