"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";

// --- ACTIONS PARA O HOST ---

export async function createBasicRoom(title: string, topic: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return { error: "Sem permissão." };

    // Gerar PIN único
    let pinCode = "";
    let isUnique = false;
    while (!isUnique) {
        pinCode = Math.floor(100000 + Math.random() * 900000).toString();
        const { data } = await supabase.from("kahoot_rooms").select("id").eq("pin_code", pinCode).single();
        if (!data) isUnique = true;
    }

    const { data, error } = await supabase
        .from("kahoot_rooms")
        .insert({
            host_id: user.id,
            title: title || topic,
            pin_code: pinCode,
            status: 'draft',
            game_data: [],
            config: {
                show_leaderboard: "after_question",
                question_timer_multiplier: 1.0,
                allow_anonymous: true
            }
        })
        .select()
        .single();

    if (error) {
        console.error("Erro criar sala basica:", error);
        return { error: "Erro ao criar sala." };
    }

    return { success: true, roomId: data.id };
}

export async function updateRoomContent(roomId: string, questions: any[]) {
    const supabase = await createClient();
    const { error } = await supabase
        .from("kahoot_rooms")
        .update({ game_data: questions })
        .eq("id", roomId);

    if (error) return { error: "Erro ao salvar." };

    revalidatePath(`/live/${roomId}/edit`);
    return { success: true };
}

export async function deleteRoom(roomId: string) {
    const supabase = await createClient();
    const { error } = await supabase
        .from("kahoot_rooms")
        .delete()
        .eq("id", roomId);

    if (error) return { error: "Erro ao deletar." };

    revalidatePath("/live");
    revalidatePath("/live");
    return { success: true };
}

export async function resetRoomState(roomId: string) {
    const supabase = await createClient();

    // 1. Limpar Jogadores (DELETE)
    const { error: playersError } = await supabase
        .from("kahoot_players")
        .delete()
        .eq("room_id", roomId);

    if (playersError) return { error: "Erro ao limpar jogadores." };

    // 2. Resetar Sala (UPDATE)
    const { error: roomError } = await supabase
        .from("kahoot_rooms")
        .update({
            status: 'waiting',
            current_question_index: -1,
            is_showing_results: false
        })
        .eq("id", roomId);

    if (roomError) return { error: "Erro ao resetar sala." };

    return { success: true };
}


export async function startQuestion(roomId: string, questionIndex: number) {
    const supabase = await createClient();
    const { error } = await supabase.from("kahoot_rooms").update({
        status: 'active',
        current_question_index: questionIndex,
        question_start_at: new Date().toISOString(),
        is_showing_results: false
    }).eq("id", roomId);

    if (error) return { error: "Erro ao iniciar questão." };
    return { success: true };
}

export async function endQuestion(roomId: string) {
    const supabase = await createClient();
    const { error } = await supabase.from("kahoot_rooms").update({
        status: 'question_ended'
    }).eq("id", roomId);

    if (error) return { error: "Erro ao encerrar questão." };
    return { success: true };
}

export async function showLeaderboard(roomId: string) {
    const supabase = await createClient();
    const { error } = await supabase.from("kahoot_rooms").update({
        status: 'leaderboard'
    }).eq("id", roomId);

    if (error) return { error: "Erro ao mostrar ranking." };
    return { success: true };
}


// --- ACTIONS PARA O PLAYER ---

export async function joinRoom(pin: string, nickname: string, deviceId: string) {
    const supabase = await createClient();

    // 1. Buscar Sala
    const { data: room, error: roomError } = await supabase
        .from("kahoot_rooms")
        .select("id, status")
        .eq("pin_code", pin)
        .single();

    if (roomError || !room) {
        return { error: "Sala não encontrada." };
    }

    // CASO A: Sala em Espera (Lobby) -> Permitir entrada de novos
    if (room.status === 'waiting') {
        // Check de Nickname Duplicado
        const { data: nameClash } = await supabase
            .from("kahoot_players")
            .select("id")
            .eq("room_id", room.id)
            .eq("nickname", nickname)
            .single();

        if (nameClash) {
            return { error: "Este nickname já está sendo usado." };
        }

        // Criar Novo Jogador
        const { data: newPlayer, error: joinError } = await supabase
            .from("kahoot_players")
            .insert({
                room_id: room.id,
                nickname: nickname,
                device_id: deviceId, // Salva o Device ID para reconexão futura
                score: 0,
                streak: 0
            })
            .select("id")
            .single();

        if (joinError) {
            console.error(joinError);
            return { error: "Erro ao entrar na sala." };
        }

        return { success: true, playerId: newPlayer.id, roomId: room.id };
    }

    // CASO B: Jogo Já Começou (Active/Finished) -> Apenas Reconexão
    if (room.status !== 'waiting') {
        // Check de Reconexão via Device ID
        const { data: existingPlayer } = await supabase
            .from("kahoot_players")
            .select("id")
            .eq("room_id", room.id)
            .eq("device_id", deviceId)
            .single();

        if (existingPlayer) {
            // É reconexão: Sucesso sem criar novo
            return { success: true, playerId: existingPlayer.id, roomId: room.id };
        } else {
            // Não achou player com esse device -> Bloquear
            return { error: "O jogo já começou e a sala está trancada." };
        }
    }

    return { error: "Erro desconhecido." };
}