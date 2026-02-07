export type AIProviderType = 'gemini' | 'openai';

export interface AISettings {
    provider: AIProviderType;
    model: string;
    apiKey: string;
}

export interface IndexedDocument {
    id: string;
    filename: string;
    content: string;
    embedding: number[];
    indexedAt: number;
    size: number;
}

export interface SearchResult {
    document: IndexedDocument;
    score: number;
    snippet: string;
}

export const DEFAULT_SETTINGS: AISettings = {
    provider: 'gemini',
    model: 'text-embedding-004',
    apiKey: ''
};
