import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function POST(req: Request) {
  try {
    const body = await req.json();

    /* 
      EXPECTED BODY:
      {
        topic: string,
        aiContext: string (optional),
        neededDifficulties: string[] (e.g. ['easy', 'medium', 'hard']),
        forcedTypes: string[] (e.g. ['multiple_choice', 'true_false', 'fill_gap_select'])
      }
    */
    const { topic, aiContext, neededDifficulties, forcedTypes } = body;

    if (!topic) {
      return NextResponse.json({ error: "Tópico é obrigatório" }, { status: 400 });
    }

    const model = genAI.getGenerativeModel({
      model: "gemini-3-flash-preview",
      generationConfig: { responseMimeType: "application/json" }
    });

    const prompt = `
      Você é um especialista em criar questões educativas para um jogo estilo Kahoot.
      
      === CONTEXTO ===
      Tópico Principal: ${topic}
      Contexto Extra / Referência: ${aiContext || "Nenhum"}
      
      === DEMANDA ===
      Gere EXATAMENTE ${neededDifficulties.length} questões.
      Dificuldades na ordem: ${neededDifficulties.join(", ")}.
      Tipos permitidos: ${forcedTypes.join(", ")}.

      === FORMATO DE SAÍDA (ARRAY DE JSON) ===
      Retorne APENAS um array JSON válido. Siga estritamente estas estruturas:

      1. MULTIPLE CHOICE ('multiple_choice'):
      {
        "statement": "Pergunta curta e direta?",
        "q_type": "multiple_choice",
        "difficulty": "easy/medium/hard",
        "time_limit": 20,
        "content": {
          "options": [
             { "id": "a", "text": "Errada", "isCorrect": false },
             { "id": "b", "text": "Certa", "isCorrect": true },
             { "id": "c", "text": "Errada", "isCorrect": false },
             { "id": "d", "text": "Errada", "isCorrect": false }
          ]
        }
      }

      2. TRUE / FALSE ('true_false'):
      {
        "statement": "Afirmação para julgar.",
        "q_type": "true_false",
        "difficulty": "easy/medium/hard",
        "time_limit": 20,
        "content": { 
           "isTrue": true // ou false
        }
      }

      3. FILL GAP ('fill_gap_select'):
      {
        "statement": "Complete a lacuna na frase abaixo:",
        "q_type": "fill_gap_select",
        "difficulty": "easy/medium/hard",
        "time_limit": 30,
        "content": {
          "text_start": "O coração bombeia sangue para...",
          "text_end": "...através da aorta.",
          "correct_answer": "o corpo",
          "options": ["o corpo", "o pulmão", "o fígado", "o cérebro"] 
          // O PRIMEIRO item do array options DEVE ser a resposta correta aqui no JSON.
        }
      }
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    let data;
    try {
      // Limpeza básica caso venha com markdown code blocks
      const cleanText = text.replace(/```json/g, "").replace(/```/g, "").trim();
      data = JSON.parse(cleanText);
    } catch (e) {
      console.error("Erro Parse JSON AI:", text);
      return NextResponse.json({ error: "Falha ao processar resposta da IA" }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });

  } catch (error: any) {
    console.error("Erro API Live Gen:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
