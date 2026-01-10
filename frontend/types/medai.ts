export interface ActionResponse<T = any> {
    success: boolean;
    data?: T;
    error?: string;
}

export interface MedAIResponse {
    success: boolean;
    message: string;
    data?: any;
    limitReached?: boolean;
    usesLeft?: number;
    error?: string;
}

export interface FlashcardGenerated {
    front: string;
    back: string;
    tags?: string[];
}

export interface QuestionGenerated {
    statement: string;
    options: string[];
    correctAnswer: string;
    explanation: string;
    difficulty: 'Easy' | 'Medium' | 'Hard';
}
