'use server'

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";

interface RegisterData {
    nome: string;
    handle: string;
    telefone: string;
    email: string;
    senha: string;
}

interface RegisterResponse {
    success: boolean;
    error?: string;
    redirectUrl?: string; // Para onde ir após sucesso
}

export async function registerUser(data: RegisterData): Promise<RegisterResponse> {
    const supabase = await createClient();

    // 1. Validação Básica
    if (!data.handle.match(/^[a-zA-Z0-9_]+$/)) {
        return { success: false, error: "O ID deve conter apenas letras, números e underline." };
    }

    try {
        // 2. Verifica disponibilidade do username/handle ANTES de criar o Auth User
        const { data: existingUser } = await supabase
            .from('profiles')
            .select('handle')
            .eq('handle', data.handle.toLowerCase())
            .single();

        if (existingUser) {
            return { success: false, error: "Este ID já está em uso." };
        }

        // 3. Cria o Auth User
        const { data: authData, error: authError } = await supabase.auth.signUp({
            email: data.email,
            password: data.senha,
            options: {
                data: {
                    full_name: data.nome,
                    handle: data.handle.toLowerCase()
                }
            }
        });

        if (authError) {
            return { success: false, error: authError.message };
        }

        if (!authData.user) {
            return { success: false, error: "Erro desconhecido ao criar usuário." };
        }

        // 4. Estratégia Anti-Race Condition para Perfis
        // O Trigger do Supabase pode já ter criado o perfil. Tentamos dar UPDATE primeiro.
        const { error: updateError, data: updatedData } = await supabase
            .from('profiles')
            .update({
                nome: data.nome,
                handle: data.handle.toLowerCase(),
                telefone: data.telefone,
                updated_at: new Date().toISOString()
            })
            .eq('id', authData.user.id)
            .select();

        // Se o UPDATE falhar ou não afetar linhas (e não for erro de DB), fazemos o INSERT
        if (!updateError && (!updatedData || updatedData.length === 0)) {
            const { error: insertError } = await supabase
                .from('profiles')
                .insert({
                    id: authData.user.id,
                    nome: data.nome,
                    handle: data.handle.toLowerCase(),
                    telefone: data.telefone,
                    email: data.email,
                    xp: 0,
                    streak: 0
                });

            if (insertError) {
                // Tratamento específico para duplicidade (caso raro de colisão exata no ms)
                if (insertError.code === '23505') {
                    return { success: false, error: "Este ID já está em uso." };
                }
                console.error("Erro no Inset Fallback:", insertError);
                // Não retornamos erro aqui para não travar o login do usuário, pois o auth já foi criado.
                // O usuário conseguiria logar, mas sem perfil completo. Idealmente logaríamos isso no Sentry.
            }
        } else if (updateError) {
            console.error("Erro no Update Principal:", updateError);
            // Segue o jogo, pois o usuário foi criado.
        }

        // 5. Sucesso
        revalidatePath('/', 'layout'); // Limpa cache global para garantir que o user state atualize
        return { success: true, redirectUrl: "/dashboard" };

    } catch (error: any) {
        console.error("Erro fatal no registro:", error);
        return { success: false, error: "Erro interno ao processar registro." };
    }
}
