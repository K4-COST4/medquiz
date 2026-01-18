'use server'

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import { generateEmbedding } from "./medai-core"; // Importando função de embeddings

// --- TIPOS ---
export interface Deck {
  id: string;
  title: string;
  description?: string;
  is_public: boolean;
  user_id: string;
  card_count?: number;
  study_objective?: string;
  temp_file_path?: string;
  original_filename?: string;
  file_uploaded_at?: string;
  lesson_id?: string;
  module_id?: string;
}

export interface Flashcard {
  id: string;
  front: string;
  back: string;
  deck_id: string;
  likes_count: number;
  dislikes_count: number;
}

export interface DeckFormData {
  title: string;
  description?: string;
  study_objective: string;
  temp_file_path?: string;
  original_filename?: string;
  lesson_id?: string;
  module_id?: string;
}

// 1. LISTAR MEUS DECKS
export async function getMyDecks() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return [];

  const { data, error } = await supabase
    .from('decks')
    .select('*, flashcards(count)')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) return [];

  return data.map((deck: any) => ({
    ...deck,
    card_count: deck.flashcards[0]?.count || 0
  }));
}

// 2. BUSCAR UM DECK
export async function getDeckWithCards(deckId: string) {
  const supabase = await createClient();

  const { data: deck, error: deckError } = await supabase
    .from('decks')
    .select('*')
    .eq('id', deckId)
    .single();

  if (deckError || !deck) return null;

  const { data: cards } = await supabase
    .from('flashcards')
    .select('*')
    .eq('deck_id', deckId)
    .order('created_at', { ascending: true });

  return { deck, cards: cards || [] };
}

// 2.1 BUSCAR DECK POR LIÇÃO (INTEGRAÇÃO DECK-LESSON) 🔗
export async function getDeckByLessonId(lessonId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: deck, error } = await supabase
    .from('decks')
    .select('id')
    .eq('lesson_id', lessonId)
    .eq('user_id', user.id) // Garante que é do usuário
    .single();

  if (error || !deck) return null;
  return deck.id;
}

// 2.2 BUSCAR DECK POR MÓDULO (INTEGRAÇÃO DECK-MODULE) 📦
export async function getDeckByModuleId(moduleId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: deck, error } = await supabase
    .from('decks')
    .select('id')
    .eq('module_id', moduleId)
    .eq('user_id', user.id)
    .single();

  if (error || !deck) return null;
  return deck.id;
}

// 3. CLONAR DECK
export async function cloneDeckToMyLibrary(originalDeckId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Login necessário" };

  const original = await getDeckWithCards(originalDeckId);
  if (!original) return { success: false, error: "Deck não encontrado" };

  const { data: newDeck, error: createError } = await supabase
    .from('decks')
    .insert({
      title: `${original.deck.title} (Cópia)`,
      description: original.deck.description,
      is_public: false,
      user_id: user.id
    })
    .select()
    .single();

  if (createError) return { success: false, error: createError.message };

  if (original.cards.length > 0) {
    const cardsToInsert = original.cards.map(card => ({
      deck_id: newDeck.id,
      front: card.front,
      back: card.back,
      difficulty: 'medium'
    }));

    const { error: cardsError } = await supabase.from('flashcards').insert(cardsToInsert);
    if (cardsError) console.error("Erro ao copiar cards", cardsError);
  }

  revalidatePath('/praticar/flashcard');
  return { success: true, newDeckId: newDeck.id };
}

// 4. CRIAR NOVO DECK (LEGADO - Mantendo compatibilidade se necessário, mas idealmente substituir)
export async function createDeck(title: string, description: string, isPublic: boolean) {
  return createDeckWithContext({
    title,
    description,
    study_objective: "",
  });
}

// 4.1 NOVO CRIAR DECK COM CONTEXTO 🚀
export async function createDeckWithContext(data: DeckFormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Login necessário" };

  // 1. Gera Embedding do Deck (Mesmo se privado, gera, mas o índice filtra só públicos)
  let embedding = null;
  try {
    const textToEmbed = `Título: ${data.title}\nDescrição: ${data.description || ""}\nObjetivo: ${data.study_objective}`;
    embedding = await generateEmbedding(textToEmbed);
  } catch (e) {
    console.error("Erro ao gerar embedding do deck (ignorado):", e);
  }

  const payload: any = {
    title: data.title,
    description: data.description,
    study_objective: data.study_objective,
    is_public: false, // Padrão privado
    user_id: user.id,
    embedding: embedding,
    lesson_id: data.lesson_id, // Link com a aula
    module_id: data.module_id  // Link com o módulo
  };

  // Só adiciona campos de arquivo se existirem
  if (data.temp_file_path) {
    payload.temp_file_path = data.temp_file_path;
    payload.original_filename = data.original_filename;
    payload.file_uploaded_at = new Date().toISOString();
  }

  const { data: deck, error } = await supabase
    .from('decks')
    .insert(payload)
    .select()
    .single();

  if (error) return { success: false, error: error.message };

  revalidatePath('/praticar/flashcard');
  return { success: true, deck_id: deck.id };
}

// 5. ADICIONAR CARD AO DECK
export async function addCardToDeck(deckId: string, front: string, back: string) {
  const supabase = await createClient();

  const { error } = await supabase
    .from('flashcards')
    .insert({ deck_id: deckId, front, back });

  revalidatePath(`/praticar/flashcard/${deckId}`);
  return { success: !error };
}

// 6. SALVAR VÁRIOS CARDS DE UMA VEZ
export async function saveFlashcardsBatch(deckId: string, cards: { front: string; back: string }[]) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Login necessário" };

  if (!cards || cards.length === 0) return { success: false, error: "Nenhum card." };

  const cardsToInsert = cards.map(card => ({
    deck_id: deckId,
    front: card.front,
    back: card.back,
    difficulty: 'medium'
  }));

  const { error } = await supabase.from('flashcards').insert(cardsToInsert);

  if (error) {
    return { success: false, error: "Erro ao salvar os cards no banco." };
  }

  revalidatePath(`/praticar/flashcard/${deckId}`);
  return { success: true, count: cards.length };
}

// 7. EXCLUIR DECK
export async function deleteDeck(deckId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Login necessário" };

  // 1. Verificar se tem arquivo para deletar no Storage
  const { data: deck } = await supabase.from('decks').select('temp_file_path').eq('id', deckId).single();

  if (deck && deck.temp_file_path) {
    await supabase.storage.from('deck-attachments').remove([deck.temp_file_path]);
  }

  // 2. Deletar Deck (Cascade cuida dos cards)
  const { error } = await supabase
    .from('decks')
    .delete()
    .eq('id', deckId)
    .eq('user_id', user.id);

  if (error) return { success: false, error: error.message };

  revalidatePath('/praticar/flashcard');
  return { success: true };
}

// 8. EXCLUIR FLASHCARD
export async function deleteFlashcard(cardId: string, deckId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Login necessário" };

  const { error } = await supabase.from('flashcards').delete().eq('id', cardId);

  if (error) return { success: false, error: error.message };

  revalidatePath(`/praticar/flashcard/${deckId}`);
  return { success: true };
}

// 9. ATUALIZAR FLASHCARD
export async function updateFlashcard(cardId: string, deckId: string, front: string, back: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Login necessário" };

  const { error } = await supabase
    .from('flashcards')
    .update({ front, back })
    .eq('id', cardId);

  if (error) return { success: false, error: error.message };

  revalidatePath(`/praticar/flashcard/${deckId}`);
  return { success: true };
}

// 10. AVALIAR FLASHCARD (Novo) 👍👎
export async function rateFlashcard(cardId: string, type: 'like' | 'dislike') {
  const supabase = await createClient();

  // Incremento Atômico usando RPC ou logica simples (aqui simples)
  // Para incrementar atomicamente no Supabase, o ideal é usar uma RPC function, 
  // mas vamos fazer via select + update por enquanto (MVP) ou raw query se possível.

  // Opção A: RPC (Mais seguro para concorrência)
  // await supabase.rpc('increment_likes', { card_id: cardId }) 

  // Opção B: Get + Update (Mais simples agora, risco baixo de colisão para user único estudando)
  const { data: card } = await supabase
    .from('flashcards')
    .select('likes_count, dislikes_count')
    .eq('id', cardId)
    .single();

  if (!card) return { success: false };

  const updates: any = {};
  if (type === 'like') updates.likes_count = (card.likes_count || 0) + 1;
  else updates.dislikes_count = (card.dislikes_count || 0) + 1;

  const { error } = await supabase
    .from('flashcards')
    .update(updates)
    .eq('id', cardId);

  if (error) return { success: false, error: error.message };

  // Não precisa revalidatePath agressivo aqui para não quebrar o fluxo de estudo visualmente,
  // mas se quiser atualizar o contador na tela:
  return { success: true, newCounts: updates };
}