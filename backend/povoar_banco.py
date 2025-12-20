import os
import json
import asyncio
from dotenv import load_dotenv
import google.generativeai as genai
from database import supabase

# Carrega chaves
load_dotenv()
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

# Configuração da IA para responder SOMENTE JSON (Isso evita erros de formatação)
model = genai.GenerativeModel(
    'gemini-2.5-flash',
    generation_config={"response_mime_type": "application/json"}
)

async def gerar_questoes_para_ilha(ilha_id, titulo_ilha):
    print(f"🤖 Gerando questões para: {titulo_ilha}...")

    prompt = f"""
    Você é um professor de medicina experiente.
    Crie 3 questões de múltipla escolha (nível Internato/Residência) sobre o tópico: '{titulo_ilha}'.
    
    Requisitos obrigatórios:
    1. Foco clínico e prático.
    2. A resposta deve ser apenas um JSON (lista de objetos).
    3. Use exatamente estas chaves: "enunciado", "alternativa_a", "alternativa_b", "alternativa_c", "alternativa_d", "correta" (apenas a letra A, B, C ou D), "explicacao" (detalhada), "dificuldade" (Fácil, Médio ou Difícil).
    
    Exemplo de formato desejado:
    [
      {{
        "enunciado": "Paciente...",
        "alternativa_a": "...",
        "alternativa_b": "...",
        "alternativa_c": "...",
        "alternativa_d": "...",
        "correta": "A",
        "explicacao": "A alternativa A é correta porque...",
        "dificuldade": "Médio"
      }}
    ]
    """

    try:
        # Pede para a IA
        response = model.generate_content(prompt)
        questoes = json.loads(response.text) # Transforma texto em objeto Python

        # Salva cada questão no Supabase
        count = 0
        for q in questoes:
            # Adiciona o ID da ilha (Foreign Key)
            q['lesson_id'] = ilha_id
            
            # Insere no banco
            supabase.table("questions").insert(q).execute()
            count += 1
            
        print(f"   ✅ {count} questões salvas para '{titulo_ilha}'.")

    except Exception as e:
        print(f"   ❌ Erro ao gerar para '{titulo_ilha}': {e}")

async def main():
    print("📚 Iniciando o Bibliotecário Automático...")

    # 1. Buscar todas as ilhas existentes no banco
    response = supabase.table("lessons").select("id, titulo").execute()
    ilhas = response.data

    if not ilhas:
        print("⚠️ Nenhuma ilha encontrada! Rode o setup_inicial.py primeiro.")
        return

    print(f"📍 Encontrei {len(ilhas)} ilhas para processar.")

    # 2. Loop para gerar questões para cada ilha
    for ilha in ilhas:
        # Verifica se a ilha já tem questões (para não gastar API à toa)
        check = supabase.table("questions").select("id").eq("lesson_id", ilha['id']).execute()
        
        if len(check.data) > 0:
            print(f"⏭️  Pular '{ilha['titulo']}': Já possui questões.")
        else:
            # Se estiver vazia, chama a IA
            await gerar_questoes_para_ilha(ilha['id'], ilha['titulo'])
            # Pequena pausa para não estourar o limite da API gratuita
            await asyncio.sleep(30) 

    print("\n🎉 Processo finalizado! Seu banco de dados está povoado.")

if __name__ == "__main__":
    asyncio.run(main())