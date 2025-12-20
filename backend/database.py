import os
from dotenv import load_dotenv
from supabase import create_client, Client

# Carrega as variáveis uma única vez
load_dotenv()

url = os.environ.get("SUPABASE_URL")
key = os.environ.get("SUPABASE_KEY")

if not url or not key:
    raise ValueError("❌ ERRO CRÍTICO: Variáveis SUPABASE_URL ou SUPABASE_KEY não encontradas no .env")

# Cria a instância oficial do cliente
supabase: Client = create_client(url, key)

print("🔌 Módulo de Banco de Dados carregado.")