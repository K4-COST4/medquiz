import json
import os
from dotenv import load_dotenv
from supabase import create_client, Client

# 1. Configuração Inicial
load_dotenv()
url = os.getenv("SUPABASE_URL")
key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

if not url or not key:
    print("❌ Erro: Verifique as chaves no arquivo .env")
    exit()

supabase: Client = create_client(url, key)

def enviar_dados():
    print("\n📦 MEDILINGO - UPLOADER COMPLETO (v4.0)\n")

    # --- 1. SELEÇÃO DO ARQUIVO (Prioriza os Auditados/Refinados) ---
    arquivos_json = [f for f in os.listdir('.') if f.endswith('_AUDITADO.json') or f.endswith('_REFINADO.json')]
    
    if not arquivos_json:
        # Fallback: Procura qualquer JSON se não tiver os refinados
        arquivos_json = [f for f in os.listdir('.') if f.endswith('.json') and not f.endswith('package.json')]

    if not arquivos_json:
        print("❌ Nenhum arquivo .json encontrado na pasta.")
        return

    print("Arquivos disponíveis para envio:")
    for i, arquivo in enumerate(arquivos_json):
        print(f"  [{i+1}] {arquivo}")
    
    arquivo_selecionado = None
    while True:
        try:
            escolha = input("\nDigite o NÚMERO do arquivo: ").strip()
            indice = int(escolha) - 1
            if 0 <= indice < len(arquivos_json):
                arquivo_selecionado = arquivos_json[indice]
                break
        except:
            pass
        print("⚠️ Escolha inválida.")

    # --- 2. COLETA DE METADADOS COMPLETOS ---
    print(f"\n--- 📝 ETIQUETAGEM DA PROVA: {arquivo_selecionado} ---")
    
    # Novos Campos Solicitados
    faculdade = input("1. Instituição (ex: AFYA, UFT): ").strip().upper()
    nome_prova = input("2. Nome da Prova (ex: N1 SOI V): ").strip()
    
    periodo_str = input("3. Período do Curso (ex: 5 para 5º período): ").strip()
    periodo = int(periodo_str) if periodo_str.isdigit() else None
    
    ano = input("4. Ano Aplicado (ex: 2025): ").strip()
    semestre_str = input("5. Semestre Aplicado (1 ou 2): ").strip()
    materia = input("6. Disciplina/Tema (ex: Clínica Médica): ").strip()

    semestre = int(semestre_str) if semestre_str.isdigit() else None
    ano_int = int(ano) if ano.isdigit() else 0

    # --- 3. LEITURA E PREPARAÇÃO ---
    try:
        with open(arquivo_selecionado, "r", encoding="utf-8") as f:
            conteudo = json.load(f)
    except Exception as e:
        print(f"❌ Erro ao ler arquivo: {e}")
        return

    # Normaliza a entrada (pode vir dentro de "questoes" ou lista direta)
    if isinstance(conteudo, dict) and "questoes" in conteudo:
        lista_questoes = conteudo["questoes"]
    else:
        lista_questoes = conteudo

    print(f"\n🚀 Enviando {len(lista_questoes)} questões para o Supabase...")

    sucessos = 0
    erros = 0

    # --- 4. LOOP DE ENVIO ---
    for item in lista_questoes:
        try:
            # Identifica tipo
            tipo_raw = item.get("tipo", "objetiva").lower()
            tipo_db = "OBJETIVA" if "objetiva" in tipo_raw else "DISCURSIVA"

            # Monta o objeto base (Payload)
            payload = {
                # Metadados Gerais
                "institution": faculdade,
                "exam_name": nome_prova,       # <--- NOVO
                "course_period": periodo,      # <--- NOVO
                "year": ano_int,
                "semester": semestre,
                "subject": materia,
                
                # Conteúdo da Questão
                "type": tipo_db,
                "statement": item.get("enunciado"),
                "explanation": item.get("resposta_comentada"),
                
                # Controle de Anulação (Vindo do refinar_provas.py)
                "is_canceled": item.get("anulada", False),
                "cancellation_reason": item.get("motivo_anulacao", None)
            }

            # Tratamento de Alternativas (para Objetivas)
            if tipo_db == "OBJETIVA":
                alts_lista = item.get("alternativas", [])
                
                # O script refinar/extrair gera uma lista: [{'id': 'A', 'texto': '...'}, ...]
                # Precisamos transformar isso em colunas alt_a, alt_b...
                if alts_lista:
                    mapa = {a['id'].upper(): a['texto'] for a in alts_lista if 'id' in a}
                    
                    payload["alt_a"] = mapa.get("A")
                    payload["alt_b"] = mapa.get("B")
                    payload["alt_c"] = mapa.get("C")
                    payload["alt_d"] = mapa.get("D")
                    payload["alt_e"] = mapa.get("E")

                payload["correct_answer"] = item.get("resposta_correta")

            # --- INSERÇÃO NO BANCO ---
            supabase.table("exam_questions").insert(payload).execute()
            
            # Log visual
            status_icon = "🚫" if payload["is_canceled"] else "✅"
            num = item.get("numero", "?")
            print(f"  {status_icon} Questão {num} enviada.")
            sucessos += 1

        except Exception as e:
            print(f"  ❌ Falha na questão {item.get('numero', '?')}: {e}")
            erros += 1

    # --- RELATÓRIO FINAL ---
    print(f"\n🏁 PROCESSO CONCLUÍDO!")
    print(f"   Sucessos: {sucessos}")
    print(f"   Falhas:   {erros}")

if __name__ == "__main__":
    enviar_dados()