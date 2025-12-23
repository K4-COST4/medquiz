import fitz  # PyMuPDF
import re
import json
import os
from typing import List, Dict
from datetime import datetime

class ExtratorQuestoesAFYA:
    """
    Extrator OTIMIZADO para provas AFYA/Medicina.
    Versão corrigida e funcional - v3.1
    """
    
    def __init__(self, caminho_pdf: str):
        self.caminho = caminho_pdf
        self.doc = None
        self.texto_completo = ""
        
    def abrir_pdf(self) -> bool:
        """Abre o PDF e valida se é legível."""
        try:
            self.doc = fitz.open(self.caminho)
            print(f"✅ PDF aberto: {len(self.doc)} páginas detectadas")
            return True
        except Exception as e:
            print(f"❌ Erro ao abrir PDF: {e}")
            return False
    
    def limpar_texto(self, texto: str) -> str:
        """
        Limpeza PESADA para compensar a margem de 35px.
        """
        # 1. Remove códigos hexadecimais de rastreio (longos, com pontos)
        texto = re.sub(r'(?:[0-9a-fA-F]{6,}\.)+[0-9a-fA-F]{4,}.*', '', texto)
        
        # 2. Remove "Pgina X de Y" com todas as variações de erro de OCR
        texto = re.sub(r'(?i)(?:Pgina|Página|Pagina)\s*\d+\s*(?:de\s*\d+)?', '', texto)
        # Remove números de página soltos que ficaram sozinhos na linha (Ex: "2 de 17")
        texto = re.sub(r'\n\s*\d+\s+de\s+\d+\s*\n', '\n', texto) 

        # 3. Cabeçalhos Institucionais
        texto = re.sub(r'N\d+\s+ESPECÍFICA_.*?\d{4}', '', texto, flags=re.IGNORECASE)
        texto = re.sub(r'RELATÓRIO DE DEVOLUTIVA.*?(PROVA|CADERNO).*?\d+', '', texto, flags=re.IGNORECASE | re.DOTALL)
        texto = re.sub(r'AFYA\s+CURSO DE MEDICINA', '', texto, flags=re.IGNORECASE)

        # 4. Marcas d'água e URLs
        texto = re.sub(r'(?i)Acervo do Rique', '', texto)
        texto = re.sub(r'(?i)Quer treinar essa prova\?', '', texto)
        texto = re.sub(r'www\.acervo\.top[/\w\-]*', '', texto)
        texto = re.sub(r'www\.acervotop\.com[/\w\-]*', '', texto)

        # 5. UNIFICAÇÃO
        texto = self.unificar_quebras_linha(texto)
        
        # 6. Limpeza final
        texto = re.sub(r' {2,}', ' ', texto)
        texto = re.sub(r'\n{3,}', '\n\n', texto)
        
        return texto
    
    def unificar_quebras_linha(self, texto: str) -> str:
        """
        Remove quebras de linha artificiais, com proteção para não fundir questões.
        """
        linhas = texto.split('\n')
        resultado = []
        i = 0
        
        while i < len(linhas):
            linha_atual = linhas[i].strip()
            
            # Pula linhas vazias
            if not linha_atual:
                resultado.append('')
                i += 1
                continue
            
            # Se é a última linha, adiciona e para
            if i == len(linhas) - 1:
                resultado.append(linha_atual)
                break
            
            linha_proxima = linhas[i+1].strip() if i+1 < len(linhas) else ''
            
            # === [NOVA REGRA CRÍTICA] ===
            # Bloqueia a junção se a próxima linha for o início de uma nova questão
            # Isso impede que o final da Q1 se funda com o título "2ª QUESTÃO"
            if re.match(r'^\d+ª QUESTÃO', linha_proxima):
                resultado.append(linha_atual)
                i += 1
                continue

            # --- REGRAS PARA MANTER QUEBRA (não juntar) ---
            
            # 1. Linha atual termina com pontuação forte
            if re.search(r'[.!?:]\s*$', linha_atual):
                resultado.append(linha_atual)
                i += 1
                continue
            
            # 2. Linha atual é item de lista ou alternativa
            if re.match(r'^[IVXivx]+[\.)]\s+', linha_atual) or \
               re.match(r'^[a-eA-E][\.)]\s+', linha_atual) or \
               re.match(r'^\d+[\.)]\s+', linha_atual):
                resultado.append(linha_atual)
                i += 1
                continue
            
            # 3. Próxima linha começa com Maiúscula (novo parágrafo)
            if linha_atual.endswith('.') and linha_proxima and linha_proxima[0].isupper():
                resultado.append(linha_atual)
                i += 1
                continue
            
            # 4. Próxima linha é título/seção
            if linha_proxima and (linha_proxima.isupper() or re.match(r'^\d+[ªº]', linha_proxima)):
                resultado.append(linha_atual)
                i += 1
                continue
            
            # 5. Próxima linha é palavra-chave estrutural
            if linha_proxima and re.match(r'^(Alternativas?|Enunciado|Resposta|Referências?|Assinale):', linha_proxima):
                resultado.append(linha_atual)
                i += 1
                continue
            
            # --- REGRAS PARA JUNTAR LINHAS ---
            
            # 6. Hifenização
            if linha_atual.endswith('-'):
                resultado.append(linha_atual[:-1] + linha_proxima)
                i += 2
                continue
            
            # 7. Quebra no meio de palavra
            if linha_atual and linha_proxima and \
               not linha_atual[-1].isspace() and \
               linha_proxima[0].islower():
                resultado.append(linha_atual + linha_proxima)
                i += 2
                continue
            
            # 8. Continuação de frase (sem pontuação + minúscula)
            if linha_proxima and linha_proxima[0].islower() and not linha_atual.endswith((':', ';')):
                resultado.append(linha_atual + ' ' + linha_proxima)
                i += 2
                continue
            
            # 9. Conectores pendentes
            conectores = r'(,|e|que|com|para|sem|por|ao|à|do|da|de|o|a|no|na|os|as)\s*$'
            if re.search(conectores, linha_atual, re.IGNORECASE):
                resultado.append(linha_atual + ' ' + linha_proxima)
                i += 2
                continue
            
            # 10. Gabarito na mesma linha
            if linha_atual.strip().endswith('(CORRETA)') and linha_proxima.startswith(('-', 'A', 'O')):
                resultado.append(linha_atual + ' ' + linha_proxima)
                i += 2
                continue
            
            # PADRÃO
            resultado.append(linha_atual)
            i += 1
        
        return '\n'.join(resultado)
    
    def extrair_texto_completo(self) -> str:
        """
        Extrai texto com MARGEM MÍNIMA (35px) no rodapé.
        Isso garante que questões que começam no final da página sejam capturadas.
        """
        texto = ""
        
        for num_pag, pagina in enumerate(self.doc, start=1):
            largura = pagina.rect.width
            altura = pagina.rect.height
            
            # --- ÁREA DE CORTE AGRESSIVA (Para pegar tudo) ---
            # Topo: 50px (Mantém cabeçalho longe)
            # Base: 35px (Solicitado: Pega texto até quase o fim da folha)
            recorte = fitz.Rect(0, 40, largura, altura - 35)
            
            texto_pagina = pagina.get_text("text", clip=recorte)
            texto += texto_pagina + "\n"
        
        self.texto_completo = self.limpar_texto(texto)
        return self.texto_completo
    
    def extrair_questoes(self) -> List[Dict]:
        """
        Método principal: Extração específica para formato AFYA.
        """
        if not self.abrir_pdf():
            return []
        
        self.extrair_texto_completo()
        
        # PADRÃO AFYA: "1ª QUESTÃO", "2ª QUESTÃO", etc.
        padrao_questao = r'(\d+)ª QUESTÃO'
        
        # Divide o texto em blocos de questões
        blocos = re.split(padrao_questao, self.texto_completo)
        
        questoes = []
        
        # blocos[0] = lixo antes da 1ª questão
        # blocos[1] = "1", blocos[2] = conteúdo da questão 1
        # blocos[3] = "2", blocos[4] = conteúdo da questão 2...
        
        for i in range(1, len(blocos), 2):
            if i+1 >= len(blocos):
                break
            
            num_questao = blocos[i].strip()
            conteudo = blocos[i+1].strip()
            
            # Extrai as partes da questão
            questao_parseada = self._parsear_questao_afya(conteudo)
            
            questao = {
                "numero": num_questao,
                "fonte": questao_parseada.get("fonte", ""),
                "enunciado": questao_parseada.get("enunciado", ""),
                "tipo": questao_parseada.get("tipo", "objetiva"),
                "alternativas": questao_parseada.get("alternativas", []),
                "resposta_correta": questao_parseada.get("resposta_correta", None),
                "resposta_comentada": questao_parseada.get("resposta_comentada", ""),
                "referencias": questao_parseada.get("referencias", ""),
                "tem_imagem": self._detectar_imagem(conteudo),
                "tamanho_caracteres": len(conteudo)
            }
            
            questoes.append(questao)
        
        return questoes
    
    def _parsear_questao_afya(self, texto: str) -> Dict:
        """
        Parseia uma questão individual, com inteligência para detectar
        discursivas 'disfarçadas' (como a Questão 4 da prova SOI V).
        """
        resultado = {}
        
        # 1. EXTRAI FONTE
        match_fonte = re.search(r'\(([A-Z\s]+)\)', texto)
        resultado["fonte"] = match_fonte.group(1).strip() if match_fonte else ""
        
        # 2. SEPARA ENUNCIADO
        # Pega tudo desde "Enunciado:" até o início das alternativas ou resposta
        match_enunciado = re.search(r'Enunciado:\s*(.*?)(?:Alternativas:|Assinale|Resposta comentada:|$)', texto, re.DOTALL)
        resultado["enunciado"] = match_enunciado.group(1).strip() if match_enunciado else ""
        
        # 3. EXTRAÇÃO DE ALTERNATIVAS
        alternativas_raw = re.findall(
            r'\(alternativa ([A-E])\)(?:\s*\(CORRETA\))?\s*(.*?)(?=\(alternativa [A-E]\)|Resposta comentada:|$)',
            texto,
            re.DOTALL
        )
        
        resultado["alternativas"] = []
        for letra, texto_alt in alternativas_raw:
            texto_limpo = texto_alt.strip()
            # Validação: Se o texto da alternativa for vazio, ignora
            if texto_limpo:
                # Verifica se é a correta buscando a tag (CORRETA) no texto original próximo
                pos_inicio = texto.find(f"(alternativa {letra})")
                trecho = texto[pos_inicio:pos_inicio + 300] if pos_inicio != -1 else ""
                eh_correta = "(CORRETA)" in trecho
                
                resultado["alternativas"].append({
                    "id": letra,
                    "texto": texto_limpo,
                    "correta": eh_correta
                })

        # 4. DEFINIÇÃO DO TIPO (A Lógica Melhorada)
        # Se achou alternativas A, B, C... é Objetiva.
        # Se NÃO achou alternativas (lista vazia), é Discursiva (mesmo que tenha a palavra 'Alternativas' no texto).
        if resultado["alternativas"]:
            resultado["tipo"] = "objetiva"
            # Identifica a resposta correta
            resultado["resposta_correta"] = next((alt["id"] for alt in resultado["alternativas"] if alt["correta"]), None)
        else:
            resultado["tipo"] = "dissertativa"
            resultado["resposta_correta"] = None
            resultado["alternativas"] = None # JSON null

        # 5. EXTRAI RESPOSTA COMENTADA
        match_comentario = re.search(r'Resposta comentada:\s*(.*?)(?:Referências:|Refer|$)', texto, re.DOTALL)
        resultado["resposta_comentada"] = match_comentario.group(1).strip() if match_comentario else ""
        
        # 6. EXTRAI REFERÊNCIAS
        match_ref = re.search(r'Referências?:\s*(.*?)(?:\d+ª QUESTÃO|$)', texto, re.DOTALL)
        resultado["referencias"] = match_ref.group(1).strip() if match_ref else ""
        
        return resultado
    
    def _detectar_imagem(self, texto: str) -> bool:
        """Heurística para detectar se questão tem imagem/tabela."""
        indicadores = [
            "figura", "imagem", "gráfico", "tabela", "radiografia", 
            "ecg", "raio-x", "tomografia", "ressonância", "ultrassom",
            "ilustr", "esquema", "desenho"
        ]
        
        espacos_vazios = len(re.findall(r'\n\s*\n\s*\n', texto))
        tem_palavra_chave = any(ind in texto.lower() for ind in indicadores)
        
        return espacos_vazios > 3 or tem_palavra_chave
    
    def salvar_json(self, questoes: List[Dict], sufixo: str = "_EXTRAIDO") -> str:
        """Salva o resultado em JSON estruturado."""
        nome_base = os.path.splitext(os.path.basename(self.caminho))[0]
        nome_saida = f"{nome_base}{sufixo}.json"
        
        metadata = {
            "arquivo_origem": self.caminho,
            "total_questoes": len(questoes),
            "questoes_objetivas": sum(1 for q in questoes if q["tipo"] == "objetiva"),
            "questoes_dissertativas": sum(1 for q in questoes if q["tipo"] == "dissertativa"),
            "data_extracao": datetime.now().isoformat()
        }
        
        with open(nome_saida, "w", encoding="utf-8") as f:
            json.dump({
                "metadata": metadata,
                "questoes": questoes
            }, f, indent=2, ensure_ascii=False)
        
        print(f"\n✅ Arquivo salvo: {nome_saida}")
        return nome_saida
    
    def gerar_relatorio(self, questoes: List[Dict]):
        """Gera relatório diagnóstico da extração."""
        print("\n" + "="*70)
        print("📊 RELATÓRIO DE EXTRAÇÃO - FORMATO AFYA")
        print("="*70)
        
        total = len(questoes)
        if total == 0:
            print("❌ Nenhuma questão extraída!")
            return
            
        objetivas = sum(1 for q in questoes if q["tipo"] == "objetiva")
        dissertativas = sum(1 for q in questoes if q["tipo"] == "dissertativa")
        com_gabarito = sum(1 for q in questoes if q["resposta_correta"])
        com_comentario = sum(1 for q in questoes if q["resposta_comentada"])
        com_imagem = sum(1 for q in questoes if q["tem_imagem"])
        
        print(f"Total de questões: {total}")
        print(f"├─ Objetivas: {objetivas} ({objetivas/total*100:.1f}%)")
        print(f"└─ Dissertativas: {dissertativas} ({dissertativas/total*100:.1f}%)")
        print(f"\nQualidade da extração:")
        print(f"├─ Com gabarito identificado: {com_gabarito}/{objetivas} ({com_gabarito/objetivas*100 if objetivas else 0:.1f}%)")
        print(f"├─ Com resposta comentada: {com_comentario} ({com_comentario/total*100:.1f}%)")
        print(f"└─ Suspeita de imagem: {com_imagem} ({com_imagem/total*100:.1f}%)")
        
        # Lista questões dissertativas (precisam atenção especial)
        if dissertativas > 0:
            print(f"\n📝 Questões dissertativas detectadas:")
            for q in questoes:
                if q["tipo"] == "dissertativa":
                    print(f"   → Questão {q['numero']} ({q['fonte']})")
        
        # Alerta de qualidade
        if objetivas > 0 and com_gabarito < objetivas * 0.9:
            print("\n⚠️ ALERTA: Alguns gabaritos podem não ter sido identificados.")
            print("   → Revisar manualmente as questões objetivas.")
        
        if com_imagem > 0:
            print(f"\n🖼️ {com_imagem} questões podem conter elementos visuais.")
            print("   → Considerar extração manual ou OCR visual.")
    
    def preview_questao(self, questoes: List[Dict], num: int = 1):
        """Mostra preview formatado de uma questão."""
        if not questoes or num > len(questoes) or num < 1:
            print("❌ Questão não encontrada.")
            return
        
        q = questoes[num-1]
        
        print("\n" + "="*70)
        print(f"🔍 PREVIEW - QUESTÃO {q['numero']}")
        print("="*70)
        print(f"Fonte: {q['fonte']}")
        print(f"Tipo: {q['tipo'].upper()}")
        print(f"\nEnunciado:\n{q['enunciado'][:300]}{'...' if len(q['enunciado']) > 300 else ''}")
        
        if q['tipo'] == 'objetiva':
            print(f"\nAlternativas:")
            for alt in q['alternativas']:
                marcador = "✓" if alt['correta'] else " "
                print(f"  [{marcador}] {alt['id']}) {alt['texto'][:80]}{'...' if len(alt['texto']) > 80 else ''}")
            print(f"\nGabarito: {q['resposta_correta']}")
        
        if q['resposta_comentada']:
            print(f"\nResposta comentada:\n{q['resposta_comentada'][:200]}{'...' if len(q['resposta_comentada']) > 200 else ''}")

# ============================================================================
# EXECUÇÃO PRINCIPAL
# ============================================================================

def main():
    print("🔬 EXTRATOR DE QUESTÕES AFYA - MEDQUIZ v3.1\n")
    
    # Lista PDFs disponíveis
    pdfs = [f for f in os.listdir('.') if f.lower().endswith('.pdf')]
    
    if not pdfs:
        print("❌ Nenhum PDF encontrado na pasta.")
        return
    
    print("Selecione o PDF para extração:")
    for i, pdf in enumerate(pdfs, start=1):
        tamanho = os.path.getsize(pdf) / 1024  # KB
        print(f"[{i}] {pdf} ({tamanho:.1f} KB)")
    
    try:
        idx = int(input("\nNúmero: ")) - 1
        arquivo = pdfs[idx]
    except (ValueError, IndexError):
        print("❌ Seleção inválida.")
        return
    
    # Executa extração
    print(f"\n🔄 Processando {arquivo}...\n")
    extrator = ExtratorQuestoesAFYA(arquivo)
    questoes = extrator.extrair_questoes()
    
    if questoes:
        extrator.gerar_relatorio(questoes)
        extrator.salvar_json(questoes)
        
        # Preview da primeira questão
        extrator.preview_questao(questoes, 1)
        
        # Opção de ver mais questões
        while True:
            try:
                resp = input("\n🔖 Ver outra questão? (número ou 'n' para sair): ").strip()
                if resp.lower() == 'n':
                    break
                num = int(resp)
                extrator.preview_questao(questoes, num)
            except:
                break
    else:
        print("❌ Nenhuma questão foi extraída. Verifique o formato do PDF.")

if __name__ == "__main__":
    main()