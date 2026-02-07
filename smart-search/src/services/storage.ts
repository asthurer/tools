import type { AISettings, IndexedDocument } from '../types';
import { DEFAULT_SETTINGS } from '../types';

const STORAGE_KEYS = {
    SETTINGS: 'smart-search-settings',
    INDEX: 'smart-search-index'
};

export function saveSettings(settings: AISettings): void {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
}

export function loadSettings(): AISettings {
    try {
        const stored = localStorage.getItem(STORAGE_KEYS.SETTINGS);
        if (stored) {
            return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
        }
    } catch (e) {
        console.error('Failed to load settings:', e);
    }
    return DEFAULT_SETTINGS;
}

export function saveIndex(documents: IndexedDocument[]): void {
    localStorage.setItem(STORAGE_KEYS.INDEX, JSON.stringify(documents));
}

export function loadIndex(): IndexedDocument[] {
    try {
        const stored = localStorage.getItem(STORAGE_KEYS.INDEX);
        if (stored) {
            return JSON.parse(stored);
        }
    } catch (e) {
        console.error('Failed to load index:', e);
    }
    return [];
}

export function clearIndex(): void {
    localStorage.removeItem(STORAGE_KEYS.INDEX);
}

export function getIndexStats(documents: IndexedDocument[]): { count: number; totalSize: number } {
    return {
        count: documents.length,
        totalSize: documents.reduce((sum, doc) => sum + doc.size, 0)
    };
}
