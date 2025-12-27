'use server'

import { createClient } from "@/utils/supabase/server"

export async function fetchExamQuestions(filters: {
  institution: string
  subject: string
  year: string
  exam_title?: string
}) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('exam_questions')
    .select(`
      id,
      statement,
      alt_a,
      alt_b,
      alt_c,
      alt_d,
      alt_e,
      correct_answer,
      explanation,
      question_order,
      is_canceled,
      cancellation_reason,
      type
    `)
    .eq('institution', filters.institution)
    .eq('year', parseInt(filters.year))
    .eq('subject', filters.subject)
    .order('question_order', { ascending: true })

  if (error) {
    console.error("Erro ao buscar questões:", error)
    return []
  }

  if (!data) return []

  return data.map((q: any) => {
    
    // --- 1. MAPEAMENTO DE TIPOS (CRÍTICO) ---
    // Pega o valor do banco, transforma em maiúsculo e remove espaços
    const rawType = q.type ? q.type.toString().toUpperCase().trim() : 'OBJETIVA'

    let finalType: 'MULTIPLE_CHOICE' | 'DISCURSIVE' = 'MULTIPLE_CHOICE'

    // Se no banco for "DISCURSIVA", vira "DISCURSIVE" (que o frontend entende)
    if (rawType === 'DISCURSIVA') {
      finalType = 'DISCURSIVE'
    } 
    // Se for "OBJETIVA", vira "MULTIPLE_CHOICE"
    else if (rawType === 'OBJETIVA') {
      finalType = 'MULTIPLE_CHOICE'
    }

    // --- 2. MONTAR ALTERNATIVAS ---
    // Só montamos se for Objetiva/Multiple Choice
    const alts = []
    if (finalType === 'MULTIPLE_CHOICE') {
      // Verifica se existe texto na coluna antes de adicionar
      if (q.alt_a) alts.push({ id: 'A', text: q.alt_a })
      if (q.alt_b) alts.push({ id: 'B', text: q.alt_b })
      if (q.alt_c) alts.push({ id: 'C', text: q.alt_c })
      if (q.alt_d) alts.push({ id: 'D', text: q.alt_d })
      if (q.alt_e) alts.push({ id: 'E', text: q.alt_e })
    }

    // --- 3. TRATAMENTO DE ANULADAS ---
    let finalStatement = q.statement
    let finalExplanation = q.explanation || "Sem comentário disponível."

    if (q.is_canceled) {
      finalStatement = `[ANULADA] ${q.statement}`
      finalExplanation = `ANULADA: ${q.cancellation_reason || ''} \n\n ${finalExplanation}`
    }

    return {
      id: q.id,
      type: finalType, 
      text: finalStatement,
      alternatives: alts,
      correctAnswer: q.correct_answer?.toUpperCase().trim() || 'A',
      explanation: finalExplanation,
      isCanceled: q.is_canceled
    }
  })
}