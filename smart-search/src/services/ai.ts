import { GoogleGenerativeAI } from '@google/generative-ai';
import type { AISettings } from '../types';

export async function generateEmbedding(text: string, settings: AISettings): Promise<number[]> {
    const { apiKey, provider, model } = settings;

    if (!apiKey) {
        throw new Error('API Key is missing. Please configure in settings.');
    }

    // Truncate text to avoid token limits (roughly 8k tokens for embedding models)
    const truncatedText = text.slice(0, 30000);

    switch (provider) {
        case 'openai': {
            const response = await fetch('https://api.openai.com/v1/embeddings', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    model: model || 'text-embedding-3-small',
                    input: truncatedText
                })
            });
            const data = await response.json();
            if (data.error) throw new Error(data.error.message);
            return data.data?.[0]?.embedding || [];
        }

        case 'gemini':
        default: {
            const genAI = new GoogleGenerativeAI(apiKey);
            const embeddingModel = genAI.getGenerativeModel({ model: model || 'text-embedding-004' });
            const result = await embeddingModel.embedContent(truncatedText);
            return result.embedding.values;
        }
    }
}

export async function generateEmbeddingBatch(
    texts: string[],
    settings: AISettings,
    onProgress?: (current: number, total: number) => void
): Promise<number[][]> {
    const embeddings: number[][] = [];

    for (let i = 0; i < texts.length; i++) {
        const embedding = await generateEmbedding(texts[i], settings);
        embeddings.push(embedding);
        onProgress?.(i + 1, texts.length);
    }

    return embeddings;
}
