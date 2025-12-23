'use server'

import { createClient } from "@/utils/supabase/server"

// 1. Busca Instituições Únicas
export async function getInstitutions() {
  const supabase = await createClient()
  
  const { data } = await supabase
    .from('exam_questions')
    .select('institution')
    .order('institution')

  if (!data) return []
  
  const uniqueInstitutions = Array.from(new Set(data.map(item => item.institution)))
  return uniqueInstitutions
}

// 2. Traz Períodos e Matérias
export async function getPeriodsAndModules(institution: string) {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('exam_questions')
    .select('course_period, subject')
    .eq('institution', institution)
    .not('course_period', 'is', null)
    .not('subject', 'is', null)

  if (error || !data) {
    console.error("Erro ao buscar grade:", error)
    return {}
  }

  const grid: Record<string, string[]> = {}

  data.forEach(item => {
    const p = item.course_period?.toString() || "Geral"
    const subj = item.subject || "Outros"
    
    if (!grid[p]) grid[p] = []
    if (!grid[p].includes(subj)) grid[p].push(subj)
  })

  Object.keys(grid).forEach(key => {
    grid[key].sort()
  })

  return grid
}

// 3. (ATUALIZADO) Lista as Provas formatadas (2025.1)
export async function getExamList(institution: string, periodStr: string, subject: string) {
  const supabase = await createClient()
  const period = parseInt(periodStr)
  
  // ADICIONADO: 'semester' na busca
  const { data } = await supabase
    .from('exam_questions')
    .select('id, year, semester, exam_name') 
    .eq('institution', institution)
    .eq('course_period', period)
    .eq('subject', subject)
    .order('year', { ascending: false })
    .order('semester', { ascending: false }) // Ordena semestre decrescente também

  if (!data) return []

  const examsMap = new Map()

  data.forEach(q => {
    // CRÍTICO: A chave agora combina Nome, Ano e Semestre.
    // Assim separamos "N1 2024.1" de "N2 2024.1"
    const semesterLabel = q.semester ? `.${q.semester}` : ''
    const uniqueKey = `${q.exam_name}-${q.year}${semesterLabel}`
    
    if (!examsMap.has(uniqueKey)) {
      examsMap.set(uniqueKey, {
        id: uniqueKey, // ID virtual
        // FORMATAÇÃO: "N1 SOI V 2025.1"
        title: `${q.exam_name || 'Prova'} ${q.year}${semesterLabel}`,
        year: q.year,
        semester: q.semester,
        questionCount: 1
      })
    } else {
      const exam = examsMap.get(uniqueKey)
      exam.questionCount += 1
    }
  })

  return Array.from(examsMap.values())
}