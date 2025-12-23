import os
import json
import time
import re
from dotenv import load_dotenv
from google import genai
from google.genai import types

# =============================================================================
# CONFIGURAÇÃO
# =============================================================================

load_dotenv()
api_key = os.getenv("GEMINI_API_KEY")

if not api_key:
    print("❌ Erro: Chave API não encontrada no .env")
    exit()

client = genai.Client(api_key=api_key)

# Configurações ajustáveis
CONFIG = {
    "TAMANHO_LOTE": 15,  # Questões por lote
    "DELAY_ENTRE_LOTES": 4,  # Segundos entre requests (15 RPM = 4s mínimo)
    "MODELO": "gemini-3-flash-preview",
    "MAX_TOKENS": 8192,
    "TEMPERATURA": 0.0  # Máxima precisão
}

# =============================================================================
# FUNÇÕES AUXILIARES
# =============================================================================

def limpar_json_markdown(texto: str) -> str:
    """Remove formatação Markdown ```json ... ``` se a IA colocar."""
    padrao = r"```json\s*(.*?)\s*```"
    match = re.search(padrao, texto, re.DOTALL)
    if match:
        return match.group(1)
    return texto

def selecionar_arquivo_json() -> str:
    """Lista e permite selecionar um arquivo JSON."""
    arquivos = [f for f in os.listdir('.') if f.lower().endswith('.json')]
    
    if not arquivos:
        print("❌ Nenhum arquivo JSON encontrado na pasta.")
        return None

    print("\n📂 Arquivos JSON disponíveis:")
    for i, arq in enumerate(arquivos, start=1):
        tamanho_kb = os.path.getsize(arq) / 1024
        print(f"  [{i}] {arq} ({tamanho_kb:.1f} KB)")

    while True:
        try:
            escolha = input("\nEscolha o número: ").strip()
            idx = int(escolha) - 1
            if 0 <= idx < len(arquivos):
                return arquivos[idx]
        except:
            pass
        print("⚠️ Opção inválida. Tente novamente.")

def criar_prompt_polimento(json_entrada: str) -> str:
    """Cria o prompt otimizado APENAS para polimento textual."""
    
    return f"""Você é um Corretor Especialista em Textos Médicos Extraídos de PDF.

═══════════════════════════════════════════════════════════════════════════

🎯 OBJETIVO:
Polir o texto das questões médicas, corrigindo APENAS erros técnicos de extração.

⚠️ REGRA CRÍTICA - PRESERVAÇÃO TOTAL DE CONTEÚDO:
   - NÃO resuma, NÃO parafrase, NÃO encurte NENHUM campo
   - NÃO reescreva frases por "clareza" ou "estilo"
   - NÃO remova detalhes, parágrafos ou informações
   - Sua função é APENAS corrigir erros técnicos de OCR/extração

═══════════════════════════════════════════════════════════════════════════

📋 O QUE VOCÊ DEVE CORRIGIR:

1. **Quebras de Linha Artificiais (analise cada uma e verifique se tem sentido semântico para a ocasião ou não):**
   ❌ "túnel do\\ncarpo" 
   ✅ "túnel do carpo"
   
   ❌ "paciente apresenta hiper-\\ntensão arterial"
   ✅ "paciente apresenta hipertensão arterial"
   
   ❌ "conforme descrito em\\nDalgalarrondo"
   ✅ "conforme descrito em Dalgalarrondo"
   
   ❌ "Os\nsintomas tiveram um início insidioso"
   ✅ "Os sintomas tiveram um início insidioso"

  ❌"A queixa principal associada à\nSTC é dormência seguida de dor e fraqueza na mão."
  ✅"A queixa principal associada à STC é dormência seguida de dor e fraqueza na mão."

2. **Erros de OCR Comuns:**
   ❌ "hipertensÄo" → ✅ "hipertensão"
   ❌ "sÃ­ndrome" → ✅ "síndrome"
   ❌ "cirurgiÃ£o" → ✅ "cirurgião"
   ❌ "ressonÃ¢ncia" → ✅ "ressonância"
   ❌ "elevaÃ§Ã£o" → ✅ "elevação"

3. **Hifenização de Fim de Linha:**
   ❌ "trata-\\nmento" → ✅ "tratamento"
   ❌ "hemor-\\nragia" → ✅ "hemorragia"

4. **Espaçamentos Incorretos:**
   ❌ "paciente  com    diabetes" → ✅ "paciente com diabetes"
   ❌ "A)febre" → ✅ "A) febre"

5. **Lixo de Extração (APENAS se óbvio):**
   ❌ "www.acervo.top/xxxx" → ✅ [remover]
   ❌ "Página 5 de 10" → ✅ [remover]
   ❌ "000154.88001c.xxx" → ✅ [remover]
   - Remover todas as informações de rodapés, cabeçalhos e URLs do acervo.

═══════════════════════════════════════════════════════════════════════════

⛔ O QUE VOCÊ **NÃO DEVE** FAZER:

❌ NÃO resuma "resposta_comentada" (mantenha TODOS os parágrafos)
❌ NÃO reescreva "enunciado" com suas palavras
❌ NÃO remova detalhes por achar "redundante"
❌ NÃO corrija termos médicos técnicos que você não conhece
❌ NÃO altere referências bibliográficas
❌ NÃO mude pontuação legítima (parágrafos, listas numeradas)

═══════════════════════════════════════════════════════════════════════════

📥 ENTRADA JSON:
{json_entrada}

═══════════════════════════════════════════════════════════════════════════

📤 SAÍDA OBRIGATÓRIA:
Retorne APENAS o JSON puro (array de objetos), sem Markdown, sem explicações.

═══════════════════════════════════════════════════════════════════════════

✅ EXEMPLO DE CORREÇÃO CORRETA:

ENTRADA:
{{
  "numero": "1",
  "enunciado": "Paciente com hiperten-\\nsão arterial sistÃªmica apre-\\nsenta...",
  "resposta_comentada": "Alternativa correta: A hipertensÃ£o arterial\\n\\nsistÃªmica Ã© caracterizada por pressÃ£o\\n\\nelevada. Segundo Harrison...\\n\\nDistratores:\\nAlternativa B: Incorreta porque..."
}}

SAÍDA:
{{
  "numero": "1",
  "enunciado": "Paciente com hipertensão arterial sistêmica apresenta...",
  "resposta_comentada": "Alternativa correta: A hipertensão arterial sistêmica é caracterizada por pressão elevada. Segundo Harrison...\\n\\nDistratores:\\nAlternativa B: Incorreta porque..."
}}

⚠️ Perceba:
- Quebras artificiais removidas ("hiperten-\\nsão" → "hipertensão")
- Erros de OCR corrigidos ("sistÃªmica" → "sistêmica")
- Quebras legítimas mantidas ("\\n\\nDistratores:" permaneceu)
- TODO o conteúdo preservado (nada foi resumido)

═══════════════════════════════════════════════════════════════════════════

🔄 Agora processe o JSON acima seguindo exatamente estas regras.
"""

def validar_preservacao_conteudo(questao_original: dict, questao_refinada: dict) -> dict:
    """
    Valida se a IA não resumiu indevidamente os campos importantes.
    Retorna dicionário com status e detalhes.
    """
    campos_criticos = ["resposta_comentada", "enunciado", "referencias"]
    alertas = []
    
    for campo in campos_criticos:
        original = questao_original.get(campo, "")
        refinado = questao_refinada.get(campo, "")
        
        # Ignora se campo estava vazio
        if not original:
            continue
        
        # Calcula redução de tamanho
        tamanho_original = len(original)
        tamanho_refinado = len(refinado)
        
        # Se reduziu mais de 25%, é suspeito
        if tamanho_refinado < tamanho_original * 0.75:
            reducao_pct = ((tamanho_original - tamanho_refinado) / tamanho_original) * 100
            alertas.append({
                "campo": campo,
                "reducao": reducao_pct,
                "original": tamanho_original,
                "refinado": tamanho_refinado
            })
    
    return {
        "passou": len(alertas) == 0,
        "alertas": alertas
    }

def refinar_lote(lote_questoes: list, numero_lote: int, total_lotes: int) -> list:
    """Envia um lote de questões para a IA processar."""
    
    print(f"   ⏳ Lote {numero_lote}/{total_lotes} ({len(lote_questoes)} questões)...", end="", flush=True)

    json_entrada = json.dumps(lote_questoes, ensure_ascii=False, indent=2)
    prompt = criar_prompt_polimento(json_entrada)

    try:
        response = client.models.generate_content(
            model=CONFIG["MODELO"],
            contents=prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                temperature=CONFIG["TEMPERATURA"],
                max_output_tokens=CONFIG["MAX_TOKENS"]
            )
        )
        
        texto_limpo = limpar_json_markdown(response.text)
        resultado = json.loads(texto_limpo)
        
        # Valida se retornou lista
        if not isinstance(resultado, list):
            raise ValueError("IA não retornou uma lista válida")
        
        # Valida preservação de conteúdo
        alertas_totais = 0
        for original, refinada in zip(lote_questoes, resultado):
            validacao = validar_preservacao_conteudo(original, refinada)
            if not validacao["passou"]:
                alertas_totais += 1
                num = refinada.get('numero', '?')
                print(f"\n      ⚠️ Questão {num}: Possível resumo indevido")
                for alerta in validacao["alertas"]:
                    print(f"         • {alerta['campo']}: {alerta['reducao']:.0f}% menor ({alerta['original']} → {alerta['refinado']} chars)")
        
        if alertas_totais > 0:
            print(f"\n   ⚠️ {alertas_totais} questão(ões) com alerta", end="")
        
        print(" ✅")
        
        return resultado
    
    except json.JSONDecodeError as e:
        print(f" ❌ JSON inválido: {e}")
        print(f"   Resposta da IA (primeiros 200 chars): {response.text[:200]}...")
        return lote_questoes  # Fallback: retorna original
    
    except Exception as e:
        print(f" ❌ Erro: {str(e)[:100]}")
        return lote_questoes  # Fallback: retorna original

def processar_arquivo_polimento(arquivo_entrada: str):
    """Função principal de polimento textual."""
    
    print("\n" + "="*70)
    print("🩺 MEDILINGO - POLIDOR DE QUESTÕES EXTRAÍDAS (v4.0)")
    print("="*70)
    print(f"📂 Arquivo: {arquivo_entrada}")
    print("🎯 Modo: Polimento Textual (correção de OCR e quebras de linha)")
    print("="*70 + "\n")

    # 1. Ler JSON das Questões
    try:
        with open(arquivo_entrada, "r", encoding="utf-8") as f:
            dados = json.load(f)
    except Exception as e:
        print(f"❌ Erro ao abrir JSON: {e}")
        return

    lista_questoes = dados.get("questoes", [])
    if not lista_questoes:
        print("❌ Nenhuma questão encontrada no JSON.")
        return

    # 2. Processar em lotes
    questoes_polidas = []
    total_questoes = len(lista_questoes)
    lotes = [
        lista_questoes[i:i + CONFIG["TAMANHO_LOTE"]] 
        for i in range(0, total_questoes, CONFIG["TAMANHO_LOTE"])
    ]
    total_lotes = len(lotes)

    print(f"📄 Processando {total_questoes} questões em {total_lotes} lote(s)...")
    print(f"⏱️ Tempo estimado: ~{total_lotes * CONFIG['DELAY_ENTRE_LOTES']}s\n")
    
    inicio = time.time()

    for i, lote in enumerate(lotes, start=1):
        lote_processado = refinar_lote(lote, i, total_lotes)
        
        if isinstance(lote_processado, list):
            questoes_polidas.extend(lote_processado)
        else:
            print(f"   ⚠️ Usando fallback (original) para lote {i}")
            questoes_polidas.extend(lote)
        
        # Delay entre requisições (respeita rate limit)
        if i < total_lotes:
            time.sleep(CONFIG["DELAY_ENTRE_LOTES"])

    # 3. Preparar salvamento
    nome_saida = arquivo_entrada.replace("_EXTRAIDO.json", "_POLIDO.json")
    if nome_saida == arquivo_entrada: 
        nome_saida = arquivo_entrada.replace(".json", "_POLIDO.json")

    dados_finais = {
        "metadata": {
            "arquivo_origem": arquivo_entrada,
            "processado_por": f"Gemini AI ({CONFIG['MODELO']})",
            "tipo_processamento": "Polimento Textual (OCR + Quebras de Linha)",
            "data_processamento": time.strftime("%Y-%m-%d %H:%M:%S"),
            "total_questoes": len(questoes_polidas),
            "configuracao": {
                "tamanho_lote": CONFIG["TAMANHO_LOTE"],
                "temperatura": CONFIG["TEMPERATURA"],
                "modelo": CONFIG["MODELO"]
            }
        },
        "questoes": questoes_polidas
    }

    with open(nome_saida, "w", encoding="utf-8") as f:
        json.dump(dados_finais, f, indent=2, ensure_ascii=False)

    # 4. Relatório final
    tempo_total = time.time() - inicio
    
    print("\n" + "="*70)
    print("✅ POLIMENTO CONCLUÍDO")
    print("="*70)
    print(f"⏱️ Tempo total: {tempo_total:.1f}s")
    print(f"📊 Questões processadas: {len(questoes_polidas)}")
    print(f"💾 Arquivo salvo: {nome_saida}")
    print("="*70 + "\n")
    
    print("💡 Próximos passos:")
    print("   1. Revise manualmente questões com alertas (se houver)")
    print("   2. Adicione deferimentos/anulações manualmente no JSON")
    print("   3. Importe para o banco de dados\n")

# =============================================================================
# EXECUÇÃO PRINCIPAL
# =============================================================================

if __name__ == "__main__":
    print("\n🔬 INICIANDO POLIDOR DE QUESTÕES MÉDICAS\n")
    
    # 1. Seleciona o JSON bruto
    arquivo_json = selecionar_arquivo_json()
    if not arquivo_json:
        print("❌ Nenhum arquivo selecionado. Encerrando.")
        exit()

    # 2. Confirmação
    print("\n" + "-"*70)
    print("🎯 CONFIGURAÇÃO:")
    print(f"   Modelo: {CONFIG['MODELO']}")
    print(f"   Lote: {CONFIG['TAMANHO_LOTE']} questões por request")
    print(f"   Delay: {CONFIG['DELAY_ENTRE_LOTES']}s entre lotes")
    print(f"   Temperatura: {CONFIG['TEMPERATURA']} (máxima precisão)")
    print("-"*70)
    
    input("\n▶️ Pressione ENTER para iniciar o polimento...")

    # 3. Executa
    processar_arquivo_polimento(arquivo_json)