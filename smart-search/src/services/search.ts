import type { AISettings, IndexedDocument, SearchResult } from '../types';
import { generateEmbedding } from './ai';

function cosineSimilarity(vec1: number[], vec2: number[]): number {
    if (vec1.length !== vec2.length || vec1.length === 0) return 0;

    let dotProduct = 0;
    let norm1 = 0;
    let norm2 = 0;

    for (let i = 0; i < vec1.length; i++) {
        dotProduct += vec1[i] * vec2[i];
        norm1 += vec1[i] * vec1[i];
        norm2 += vec2[i] * vec2[i];
    }

    const denominator = Math.sqrt(norm1) * Math.sqrt(norm2);
    return denominator === 0 ? 0 : dotProduct / denominator;
}

function extractSnippet(content: string, query: string, maxLength: number = 200): string {
    const lowerContent = content.toLowerCase();
    const lowerQuery = query.toLowerCase();
    const words = lowerQuery.split(/\s+/).filter(w => w.length > 2);

    // Try to find a position containing query words
    let bestPos = 0;
    for (const word of words) {
        const pos = lowerContent.indexOf(word);
        if (pos !== -1) {
            bestPos = Math.max(0, pos - 50);
            break;
        }
    }

    // Extract snippet around best position
    let snippet = content.slice(bestPos, bestPos + maxLength);

    // Clean up snippet
    if (bestPos > 0) snippet = '...' + snippet;
    if (bestPos + maxLength < content.length) snippet = snippet + '...';

    return snippet.replace(/\n+/g, ' ').trim();
}

export async function semanticSearch(
    query: string,
    documents: IndexedDocument[],
    settings: AISettings,
    topK: number = 10
): Promise<SearchResult[]> {
    if (!query.trim() || documents.length === 0) return [];

    // Generate embedding for query
    const queryEmbedding = await generateEmbedding(query, settings);

    // Calculate similarity for each document
    const results: SearchResult[] = documents.map(doc => ({
        document: doc,
        score: cosineSimilarity(queryEmbedding, doc.embedding),
        snippet: extractSnippet(doc.content, query)
    }));

    // Sort by score descending and take top K
    return results
        .sort((a, b) => b.score - a.score)
        .slice(0, topK)
        .filter(r => r.score > 0.3); // Filter out low relevance
}
