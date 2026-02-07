export type AIProviderType = 'gemini' | 'openai' | 'claude';

export interface AISettings {
    provider: AIProviderType;
    model: string;
    apiKey: string;
}

export type DatabaseType = 'mock' | 'postgres' | 'mysql' | 'sqlserver' | 'databricks' | 'oracle';

export interface DatabaseConfig {
    type: DatabaseType;
    host?: string;
    port?: number;
    database?: string;
    username?: string;
    password?: string;
}

export const DEFAULT_AI_SETTINGS: AISettings = {
    provider: 'gemini',
    model: 'gemini-1.5-flash',
    apiKey: ''
};

export const DEFAULT_DB_CONFIG: DatabaseConfig = {
    type: 'mock'
};
