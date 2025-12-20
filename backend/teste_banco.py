import os
from dotenv import load_dotenv
from supabase import create_client, Client

# 1. Carregar as variáveis
load_dotenv()

url = os.environ.get("SUPABASE_URL")
key = os.environ.get("SUPABASE_KEY")

if not url or not key:
    print("❌ Erro: Variáveis de ambiente não encontradas! Verifique o .env")
    exit()

print(f"🔌 Tentando conectar em: {url}...")

try:
    # 2. Criar a conexão
    supabase: Client = create_client(url, key)

    # 3. Teste Real: Tentar buscar dados da tabela 'areas'
    # Como o banco está vazio, deve retornar uma lista vazia [], mas sem erro.
    response = supabase.table("areas").select("*").execute()

    print("✅ SUCESSO! Conexão estabelecida.")
    print(f"📦 Resposta do Banco: {response.data}")
    print("O banco respondeu, o que significa que o Python e o Supabase já são amigos.")

except Exception as e:
    print(f"❌ FALHA NA CONEXÃO: {e}")