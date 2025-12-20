import asyncio
from database import supabase
from questoes_novas import QUESTOES_PARA_INSERIR # Importa sua lista

async def importar_questoes():
    print("📦 Iniciando importação manual de questões...")
    sucesso = 0
    erros = 0

    for q in QUESTOES_PARA_INSERIR:
        nome_ilha = q["ilha_alvo"]
        
        # 1. Achar o ID da Ilha pelo nome (O "Pulo do Gato")
        print(f"🔎 Procurando ilha: '{nome_ilha}'...")
        res = supabase.table("lessons").select("id").eq("titulo", nome_ilha).execute()

        if not res.data:
            print(f"   ❌ ERRO: Ilha não encontrada! Verifique se digitou o nome EXATAMENTE igual.")
            erros += 1
            continue # Pula para a próxima questão
        
        ilha_id = res.data[0]['id']

        # 2. Preparar o pacote para envio
        nova_questao = {
            "lesson_id": ilha_id,
            "enunciado": q["enunciado"],
            "alternativa_a": q["alternativa_a"],
            "alternativa_b": q["alternativa_b"],
            "alternativa_c": q["alternativa_c"],
            "alternativa_d": q["alternativa_d"],
            "correta": q["correta"].upper(), # Garante que seja 'A' e não 'a'
            "explicacao": q["explicacao"],
            "dificuldade": q["dificuldade"]
        }

        # 3. Inserir no Banco
        try:
            supabase.table("questions").insert(nova_questao).execute()
            print(f"   ✅ Questão salva com sucesso na ilha {ilha_id}!")
            sucesso += 1
        except Exception as e:
            print(f"   ❌ Erro ao salvar no banco: {e}")
            erros += 1

    print(f"\n📊 RESUMO FINAL:")
    print(f"   Salvas: {sucesso}")
    print(f"   Falhas: {erros}")

if __name__ == "__main__":
    asyncio.run(importar_questoes())