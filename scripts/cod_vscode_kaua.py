import fitz  # PyMuPDF
import re
import json
import os
from typing import List, Dict
from datetime import datetime

# ============================================================================
# CLASSE BASE: LÓGICA DE EXTRAÇÃO AFYA
# ============================================================================
class ExtratorQuestoesAFYA:
    """
    Extrator otimizado para provas de medicina no formato AFYA.
    Versão 3.2 - Refinada para GitHub.
    """
    
    def __init__(self, caminho_pdf: str):
        self.caminho = caminho_pdf
        self.doc = None
        self.texto_completo = ""
        
    def abrir_pdf(self) -> bool:
        """Abre o PDF e valida se é legível."""
        try:
            self.doc = fitz.open(self.caminho)
            return True
        except Exception as e:
            print(f"❌ Erro ao abrir PDF: {e}")
            return False
    
    def limpar_texto(self, texto: str) -> str:
        """Limpeza de metadados e códigos residuais."""
        # Remove URLs e domínios (www... ou http...)
        texto = re.sub(r'https?://\S+|www\.\S+', '', texto)
        # Remove códigos hexadecimais de rastreio
        texto = re.sub(r'(?:[0-9a-fA-F]{6,}\.)+[0-9a-fA-F]{4,}.*', '', texto)
        # Remove "Pgina X de Y" e variações
        texto = re.sub(r'(?i)(?:Pgina|Página|Pagina)\s*\d+\s*(?:de\s*\d+)?', '', texto)
        # Remove cabeçalhos institucionais
        texto = re.sub(r'N\d+\s+ESPECÍFICA_.*?\d{4}', '', texto, flags=re.IGNORECASE)
        texto = re.sub(r'AFYA\s+CURSO DE MEDICINA', '', texto, flags=re.IGNORECASE)
        
        return self.unificar_quebras_linha(texto)
    
    def unificar_quebras_linha(self, texto: str) -> str:
        """Evita fundir blocos de questões diferentes."""
        linhas = texto.split('\n')
        resultado = []
        i = 0
        while i < len(linhas):
            linha_atual = linhas[i].strip()
            if not linha_atual:
                resultado.append('')
                i += 1
                continue
            if i < len(linhas) - 1:
                linha_proxima = linhas[i+1].strip()
                # Impede junção se a próxima linha for o início de uma nova questão
                if re.match(r'^\d+[ªº] QUESTÃO', linha_proxima):
                    resultado.append(linha_atual)
                    i += 1
                    continue
            resultado.append(linha_atual)
            i += 1
        return '\n'.join(resultado)

    def extrair_texto_completo(self) -> str:
        """Extrai texto com margem de segurança no rodapé."""
        texto = ""
        for pagina in self.doc:
            largura, altura = pagina.rect.width, pagina.rect.height
            # Mantém margem mínima de 35px para capturar questões no final da página
            recorte = fitz.Rect(0, 40, largura, altura - 35)
            texto += pagina.get_text("text", clip=recorte) + "\n"
        self.texto_completo = self.limpar_texto(texto)
        return self.texto_completo

    def extrair_questoes(self) -> List[Dict]:
        """Coordena a extração por blocos de questões."""
        if not self.abrir_pdf(): return []
        self.extrair_texto_completo()
        
        # Padrão identificador: "1ª QUESTÃO", "2ª QUESTÃO"
        padrao_questao = r'(\d+)[ªº]\s+QUESTÃO'
        blocos = re.split(padrao_questao, self.texto_completo)
        
        questoes = []
        for i in range(1, len(blocos), 2):
            if i+1 >= len(blocos): break
            num_questao = blocos[i].strip()
            conteudo = blocos[i+1].strip()
            parse = self._parsear_questao_afya(conteudo)
            questoes.append({
                "numero": num_questao,
                "enunciado": parse.get("enunciado", ""),
                "alternativas": parse.get("alternativas", []),
                "resposta_comentada": parse.get("resposta_comentada", ""),
                "tipo": parse.get("tipo", "objetiva")
            })
        return questoes

    def _parsear_questao_afya(self, texto: str) -> Dict:
        """Divide o conteúdo da questão em seções."""
        res = {}
        # Captura Enunciado
        match_enunciado = re.search(r'Enunciado:\s*(.*?)(?:Alternativas:|Assinale|Resposta comentada:|$)', texto, re.DOTALL)
        res["enunciado"] = match_enunciado.group(1).strip() if match_enunciado else ""
        
        # Captura Alternativas
        alts_raw = re.findall(r'\(alternativa ([A-E])\)(?:\s*\(CORRETA\))?\s*(.*?)(?=\(alternativa [A-E]\)|Resposta comentada:|$)', texto, re.DOTALL)
        res["alternativas"] = []
        for letra, txt in alts_raw:
            eh_correta = "(CORRETA)" in texto[texto.find(f"(alternativa {letra})"):texto.find(f"(alternativa {letra})")+200]
            res["alternativas"].append({"id": letra, "texto": txt.strip(), "correta": eh_correta})
        
        res["tipo"] = "objetiva" if res["alternativas"] else "dissertativa"
        
        # Captura Resposta Comentada
        match_coment = re.search(r'Resposta comentada:\s*(.*?)(?:Referências:|Refer|$)', texto, re.DOTALL)
        res["resposta_comentada"] = match_coment.group(1).strip() if match_coment else ""
        return res

# ============================================================================
# CLASSE DE EXPORTAÇÃO: GOOGLE DRIVE E ESTRUTURA DE PASTAS
# ============================================================================
class ExportadorParaDrive(ExtratorQuestoesAFYA):
    def __init__(self, caminho_pdf, nome_prova="Prova 1"):
        super().__init__(caminho_pdf)
        self.caminho_base = f"/content/drive/MyDrive/{nome_prova}"

    def salvar_pastas(self, questoes: List[Dict]):
        """Cria pastas por questão e salva arquivos JSON."""
        from google.colab import drive
        drive.mount('/content/drive', force_remount=True)
        
        for q in questoes:
            pasta = os.path.join(self.caminho_base, f"{q['numero']} Questão")
            os.makedirs(pasta, exist_ok=True)
            
            # Prepara string de alternativas
            alts_str = ""
            for alt in q["alternativas"]:
                tag = "(CORRETA) " if alt["correta"] else ""
                alts_str += f"({alt['id']}) {tag}{alt['texto']}\n"

            # Salva Enunciado e Alternativas
            with open(os.path.join(pasta, "enunciado_e_alternativas.json"), "w", encoding="utf-8") as f:
                json.dump({
                    "enunciado": q["enunciado"],
                    "alternativas": alts_str.strip()
                }, f, ensure_ascii=False, indent=4)

            # Salva Resposta Comentada
            with open(os.path.join(pasta, "resposta_comentada.json"), "w", encoding="utf-8") as f:
                json.dump({"resposta_comentada": q["resposta_comentada"]}, f, ensure_ascii=False, indent=4)
        
        print(f"📦 Exportação para o Drive concluída: {self.caminho_base}")

# ============================================================================
# PONTO DE ENTRADA (COLAB)
# ============================================================================
if __name__ == "__main__":
    from google.colab import files
    print("🚀 Iniciando Extrator AFYA...")
    uploaded = files.upload()
    if uploaded:
        nome_arquivo = list(uploaded.keys())[0]
        # O nome da prova será o nome do arquivo PDF (sem a extensão)
        nome_pasta_prova = os.path.splitext(nome_arquivo)[0]
        
        app = ExportadorParaDrive(nome_arquivo, nome_prova=nome_pasta_prova)
        dados = app.extrair_questoes()
        app.salvar_pastas(dados)