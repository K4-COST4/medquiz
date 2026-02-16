'use server';

import { createClient } from '@/utils/supabase/server';

/**
 * Busca a preferência do usuário sobre exibição de distratores
 */
export async function getUserDistractorPreference(): Promise<boolean> {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return true; // Default: expandido

    const { data: profile } = await supabase
        .from('profiles')
        .select('show_distractors_expanded')
        .eq('id', user.id)
        .single();

    return profile?.show_distractors_expanded ?? true;
}

/**
 * Atualiza a preferência do usuário sobre exibição de distratores
 */
export async function updateDistractorPreference(value: boolean): Promise<{ success: boolean }> {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false };

    const { error } = await supabase
        .from('profiles')
        .update({ show_distractors_expanded: value })
        .eq('id', user.id);

    return { success: !error };
}
