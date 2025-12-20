import os
import google.generativeai as genai
from dotenv import load_dotenv

# 1. Tenta carregar o .env
print("--- INICIANDO DIAGNÓSTICO ---")
load_dotenv()

chave = os.getenv("GEMINI_API_KEY")

# 2. Verifica se a chave foi lida
if not chave:
    print("❌ ERRO: O Python NÃO conseguiu ler a chave do arquivo .env.")
    print("Dica: Verifique se o arquivo se chama exatamente '.env' e está na mesma pasta.")
else:
    print(f"✅ SUCESSO: Chave encontrada! (Termina em ...{chave[-4:]})")

    # 3. Tenta conectar com o Google e listar modelos
    try:
        genai.configure(api_key=chave)
        print("📡 Tentando conectar com o Google...")
        
        models = genai.list_models()
        print("\n📋 MODELOS DISPONÍVEIS NA SUA CONTA:")
        found_any = False
        for m in models:
            if 'generateContent' in m.supported_generation_methods:
                print(f" - {m.name}")
                found_any = True
        
        if not found_any:
            print("⚠️ AVISO: Conectou, mas nenhum modelo de texto foi encontrado.")
        else:
            print("\n✅ Conexão PERFEITA! Use um dos nomes acima no seu main.py.")

    except Exception as e:
        print(f"\n❌ ERRO DE CONEXÃO: {e}")
        print("Dica: Se o erro for 'API not enabled', você precisa ativar a 'Generative Language API' no Google Cloud.")