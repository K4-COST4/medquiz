'use server'

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";

// --- TIPOS ---
export interface Deck {
  id: string;
  title: string;
  description?: string;
  is_public: boolean;
  user_id: string;
  card_count?: number; // Vamos calcular isso
}

export interface Flashcard {
  id: string;
  front: string;
  back: string;
  deck_id: string;
}

// 1. LISTAR MEUS DECKS
export async function getMyDecks() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return [];

  const { data, error } = await supabase
    .from('decks')
    .select('*, flashcards(count)') // Traz a contagem de cards junto
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) return [];

  // Formata para retornar o count bonitinho
  return data.map((deck: any) => ({
    ...deck,
    card_count: deck.flashcards[0]?.count || 0
  }));
}

// 2. BUSCAR UM DECK (Pode ser meu ou público)
export async function getDeckWithCards(deckId: string) {
  const supabase = await createClient();

  // Busca o deck e os cards (O RLS do banco vai impedir se for privado de outro user)
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

// 3. CLONAR DECK (Salvar na minha biblioteca) 🧬
export async function cloneDeckToMyLibrary(originalDeckId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Login necessário" };

  // A. Busca os dados originais
  const original = await getDeckWithCards(originalDeckId);
  if (!original) return { success: false, error: "Deck não encontrado" };

  // B. Cria um NOVO Deck para MIM
  const { data: newDeck, error: createError } = await supabase
    .from('decks')
    .insert({
      title: `${original.deck.title} (Cópia)`, // Adiciona sufixo
      description: original.deck.description,
      is_public: false, // Clone começa privado por padrão
      user_id: user.id
    })
    .select()
    .single();

  if (createError) return { success: false, error: createError.message };

  // C. Copia todos os cards para o novo Deck
  if (original.cards.length > 0) {
    const cardsToInsert = original.cards.map(card => ({
      deck_id: newDeck.id, // ID do novo deck
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

// 4. CRIAR NOVO DECK
export async function createDeck(title: string, description: string, isPublic: boolean) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false };

  const { data, error } = await supabase
    .from('decks')
    .insert({ title, description, is_public: isPublic, user_id: user.id })
    .select()
    .single();

  if (error) return { success: false, error: error.message };
  revalidatePath('/praticar/flashcard');
  return { success: true, deck: data };
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
// 6. SALVAR VÁRIOS CARDS DE UMA VEZ (Para a IA) 🚀
export async function saveFlashcardsBatch(deckId: string, cards: { front: string; back: string }[]) {
  const supabase = await createClient();

  // Verificação básica de sessão
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Login necessário" };

  // Verifica se o array não está vazio
  if (!cards || cards.length === 0) {
    return { success: false, error: "Nenhum card para salvar." };
  }

  // Prepara os dados para o formato do banco (adiciona deck_id em todos)
  const cardsToInsert = cards.map(card => ({
    deck_id: deckId,
    front: card.front,
    back: card.back,
    difficulty: 'medium' // Padrão
  }));

  // Insert em Lote (Bulk Insert)
  const { error } = await supabase
    .from('flashcards')
    .insert(cardsToInsert);

  if (error) {
    console.error("Erro ao salvar lote de cards:", error);
    return { success: false, error: "Erro ao salvar os cards no banco." };
  }

  // ... existing code ...

  // Atualiza a cache para os cards aparecerem na hora
  revalidatePath(`/praticar/flashcard/${deckId}`);

  return { success: true, count: cards.length };
}

// 7. EXCLUIR DECK
export async function deleteDeck(deckId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Login necessário" };

  // O RLS deve garantir que só o dono apague, mas validamos user_id por segurança
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

  // Verifica se o usuário é dono do deck deste card (Join implícito via RLS ou verificação manual)
  // Supabase RLS policies normalmente permitem delete se você for dono do deck.
  // Vamos assumir RLS configurado corretamente para 'flashcards' baseada no 'deck.user_id'

  const { error } = await supabase
    .from('flashcards')
    .delete()
    .eq('id', cardId);

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