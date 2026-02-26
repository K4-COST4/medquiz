/**
 * AI Model Configuration
 * 
 * Centraliza nomes de modelos com fallback via variáveis de ambiente.
 * Permite trocar modelos sem alterar código-fonte.
 */

export const AI_CONFIG = {
    /** Modelo para geração de flashcards */
    get flashcardModel(): string {
        return process.env.FLASHCARD_MODEL || 'gemini-3-flash-preview';
    },

    /** Modelo para chat geral (MedAI tutor) */
    get chatModel(): string {
        return process.env.MEDAI_CHAT_MODEL || 'gemini-3-flash-preview';
    },

    /** Modelo para embeddings */
    get embeddingModel(): string {
        return process.env.EMBEDDING_MODEL || 'gemini-embedding-001';
    },

    /** Dimensões do embedding (deve coincidir com vetor no DB) */
    embeddingDimensions: 768 as const,

    /** Modelo para geração de trilhas */
    get trackModel(): string {
        return process.env.TRACK_MODEL || 'gemini-3-flash-preview';
    },

    /** Thinking habilitado para geração de trilhas */
    trackModelThinking: true as const,

    /** Modelo para geração de questões */
    get questionModel(): string {
        return process.env.QUESTION_MODEL || 'gemini-3-flash-preview';
    },

    /** Modelo para geração de resumos de aulas */
    get summaryModel(): string {
        return process.env.SUMMARY_MODEL || 'gemini-3-flash-preview';
    },
    /** Thinking habilitado para geração de resumos de aulas */
    summaryModelThinking: true as const,

    /** Modelo para geração de blueprint clínico */
    get clinicalBlueprintModel(): string {
        return process.env.CLINICAL_BLUEPRINT_MODEL || 'gemini-3-flash-preview';
    },

    /** Thinking habilitado para geração de blueprint clínico */
    clinicalBlueprintModelThinking: true as const,

    /** Modelo para paciente virtual (respostas no chat) */
    get clinicalPatientModel(): string {
        return process.env.CLINICAL_PATIENT_MODEL || 'gemini-2.5-flash';
    },

    /** Modelo para avaliação de anamnese */
    get clinicalGraderModel(): string {
        return process.env.CLINICAL_GRADER_MODEL || 'gemini-3-flash-preview';
    },

    /** Modelo para geração de anamnese modelo */
    get clinicalModelNoteModel(): string {
        return process.env.CLINICAL_MODEL_NOTE_MODEL || 'gemini-3-flash-preview';
    },
} as const;
