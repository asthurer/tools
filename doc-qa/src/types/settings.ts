export type AIProviderType = 'gemini' | 'openai' | 'claude';

export interface AISettings {
    provider: AIProviderType;
    model: string;
    apiKey: string;
}

export const DEFAULT_SETTINGS: AISettings = {
    provider: 'gemini',
    model: 'gemini-1.5-flash',
    apiKey: ''
};
