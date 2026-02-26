# Plano de Integração: Banco de Questões Unificado

Este documento analisa a melhor estratégia para integrar questões de provas institucionais (`exam_questions`) ao banco de questões geral (`question_bank`) do MedQuiz.

## Objetivo
Permitir que o sistema utilize questões de fontes institucionais (USP, UNICAMP, etc.) com a mesma inteligência (Embeddings, RAG, Estatísticas) das questões geradas por IA, mantendo a capacidade de filtrar por metadados específicos (Instituição, Ano, Matéria).

## Análise dos Schemas Atuais

### `exam_questions` (Origem)
- **Foco**: Estrutura rígida de prova original.
- **Estrutura de Alternativas**: Colunas separadas (`alt_a`, `alt_b`...).
- **Metadados Ricos**: `institution`, `year`, `semester`, `subject`, `exam_name`.
- **Agrupamento**: Possui `parent_id` para questões que compartilham um enunciado/texto base.
- **Identificação**: `question_order` para manter a sequência da prova.

### `question_bank` (Destino/Principal)
- **Foco**: Flexibilidade e funcionalidades de IA.
- **Estrutura de Alternativas**: `options` (JSONB) - mais flexível.
- **Inteligência**: Possui `embedding` (para busca semântica), estatísticas de acerto/erro e dificuldade normalizada.
- **Metadados Atuais**: `topics`, `difficulty`, `source`.

---

## Estratégia Recomendada: Unificação no `question_bank`

**Recomendação:** A melhor opção é **adaptar o `question_bank`** para absorver a estrutura das questões de exames.

### Por que unificar?
1.  **Inteligência Centralizada**: O sistema de RAG (Busca e Recomendação) e os Embeddings funcionarão para TODAS as questões instantaneamente. Se mantivermos separado, teríamos que duplicar a lógica de busca semântica e embeddings.
2.  **Experiência de Estudo Única**: O aluno pode criar cadernos misturando "Questões da USP" com "Questões de IA" sem que o frontend precise lidar com dois formatos de objeto diferentes.
3.  **Estatísticas Globais**: O cálculo de desempenho do aluno fica centralizado.

---

## Alterações Necessárias no Schema (`question_bank`)

Para suportar as questões institucionais sem perder a flexibilidade, propomos as seguintes alterações na tabela `public.question_bank`:

### 1. Adição de Metadados de Filtro (CRUCIAL)
Como o usuário vai filtrar muito por Instituição e Ano, recomenda-se criar colunas dedicadas (melhor performance de índice que JSONB genérico para esses campos chave).

```sql
ALTER TABLE public.question_bank
ADD COLUMN IF NOT EXISTS institution text, -- Ex: 'USP', 'UNICAMP'
ADD COLUMN IF NOT EXISTS year integer,     -- Ex: 2024
ADD COLUMN IF NOT EXISTS exam_source_id uuid, -- Link opcional para uma tabela de 'Provas' se existir
ADD COLUMN IF NOT EXISTS original_index integer; -- Para manter a ordem da questão na prova original
```

### 2. Suporte a Enunciados Compartilhados (`parent_id`)
Muitas questões de residência usam um texto base para 3-4 perguntas. O `question_bank` precisa suportar isso.

```sql
ALTER TABLE public.question_bank
ADD COLUMN IF NOT EXISTS parent_id uuidREFERENCES public.question_bank(id);
```

### 3. Adaptação dos Conteúdos (Mapeamento)

Ao migrar os dados de `exam_questions` para `question_bank`, faremos a seguinte transformação:

| Campo `exam_questions` | Destino `question_bank` | Tratamento |
| :--- | :--- | :--- |
| `statement` | `statement` | Cópia direta. |
| `alt_a` ... `alt_e` | `options` (JSONB) | Transformar em Array JSON: `[{"id": "a", "text": "...", "original_col": "alt_a"}, ...]` |
| `correct_answer` | `correct_answer` | Normalizar (ex: se for 'A', garantir que bate com o ID no JSON). |
| `explanation` | `commentary` | Cópia direta. |
| `subject` | `topics` (Array) | Converter texto único para array `['Cardiologia']`. |
| `institution` | `institution` (Nova Coluna) | Preserva filtro rápido. |
| `year` | `year` (Nova Coluna) | Preserva filtro rápido. |
| `source` | `source` | Definir como 'official_exam' ou o nome da banca. |

### 4. Tratamento do campo `options` (JSONB)
A padronização do JSONB em `question_bank` deve ser mantida. Exemplo de estrutura para uma questão importada:

```json
[
  { "id": "A", "text": "Texto da alternativa A", "is_correct": false },
  { "id": "B", "text": "Texto da alternativa B", "is_correct": true },
  ...
]
```

---

## Plano de Ação (Próximos Passos)

1.  **Migração de Schema**: Executar `ALTER TABLE` no `question_bank` para adicionar `institution`, `year`, `parent_id`.
2.  **Script de Ingestão**: Criar um script (ou Server Action) que lê de `exam_questions`, formata o JSON de opções, gera o Embedding (via API de IA) e insere em `question_bank`.
3.  **Frontend**: Atualizar os filtros do "Banco de Questões" para ler as novas colunas (`institution`, `year`).
