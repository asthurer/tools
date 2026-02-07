import type { AISettings, IndexedDocument } from '../types';
import { generateEmbedding } from './ai';

function generateId(): string {
    return crypto.randomUUID();
}

async function readFileContent(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsText(file);
    });
}

export async function indexFile(
    file: File,
    settings: AISettings
): Promise<IndexedDocument> {
    const content = await readFileContent(file);
    const embedding = await generateEmbedding(content, settings);

    return {
        id: generateId(),
        filename: file.name,
        content,
        embedding,
        indexedAt: Date.now(),
        size: file.size
    };
}

export async function indexMultipleFiles(
    files: File[],
    settings: AISettings,
    onProgress?: (current: number, total: number, filename: string) => void
): Promise<IndexedDocument[]> {
    const documents: IndexedDocument[] = [];

    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        onProgress?.(i + 1, files.length, file.name);

        try {
            const doc = await indexFile(file, settings);
            documents.push(doc);
        } catch (error) {
            console.error(`Failed to index ${file.name}:`, error);
            // Continue with other files
        }
    }

    return documents;
}

export function getSupportedExtensions(): string[] {
    return ['.txt', '.md', '.json', '.csv', '.xml', '.html', '.js', '.ts', '.py'];
}

export function isFileSupported(file: File): boolean {
    const ext = '.' + file.name.split('.').pop()?.toLowerCase();
    return getSupportedExtensions().includes(ext);
}
