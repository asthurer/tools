import { useRef, useState } from 'react';
import type { AISettings, IndexedDocument } from '../types';
import { indexMultipleFiles, isFileSupported, getSupportedExtensions } from '../services/indexer';

interface FileIndexerProps {
    documents: IndexedDocument[];
    settings: AISettings;
    onDocumentsChange: (docs: IndexedDocument[]) => void;
}

export function FileIndexer({ documents, settings, onDocumentsChange }: FileIndexerProps) {
    const [indexing, setIndexing] = useState(false);
    const [progress, setProgress] = useState({ current: 0, total: 0, filename: '' });
    const [error, setError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFiles = async (files: FileList | null) => {
        if (!files || files.length === 0) return;

        if (!settings.apiKey) {
            setError('Please configure your API key in settings first.');
            return;
        }

        const validFiles = Array.from(files).filter(isFileSupported);
        if (validFiles.length === 0) {
            setError(`No supported files. Supported: ${getSupportedExtensions().join(', ')}`);
            return;
        }

        setError(null);
        setIndexing(true);

        try {
            const newDocs = await indexMultipleFiles(validFiles, settings, (current, total, filename) => {
                setProgress({ current, total, filename });
            });
            onDocumentsChange([...documents, ...newDocs]);
        } catch (e: any) {
            setError(e.message || 'Failed to index files');
        } finally {
            setIndexing(false);
            setProgress({ current: 0, total: 0, filename: '' });
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        handleFiles(e.dataTransfer.files);
    };

    const handleDelete = (id: string) => {
        onDocumentsChange(documents.filter(d => d.id !== id));
    };

    const formatSize = (bytes: number) => {
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    };

    return (
        <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
            <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                <svg className="w-5 h-5 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Indexed Documents ({documents.length})
            </h3>

            {/* Drop Zone */}
            <div
                onDrop={handleDrop}
                onDragOver={(e) => e.preventDefault()}
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-600 rounded-lg p-6 text-center cursor-pointer hover:border-orange-500/50 hover:bg-slate-700/30 transition-all mb-4"
            >
                {indexing ? (
                    <div className="text-slate-400">
                        <div className="animate-spin w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full mx-auto mb-2"></div>
                        Indexing {progress.filename}... ({progress.current}/{progress.total})
                    </div>
                ) : (
                    <div className="text-slate-400">
                        <svg className="w-8 h-8 mx-auto mb-2 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        Drop files here or click to browse
                    </div>
                )}
                <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept={getSupportedExtensions().join(',')}
                    onChange={(e) => handleFiles(e.target.files)}
                    className="hidden"
                />
            </div>

            {error && (
                <div className="text-red-400 text-sm mb-3 bg-red-500/10 p-2 rounded">{error}</div>
            )}

            {/* Document List */}
            <div className="space-y-2 max-h-60 overflow-y-auto">
                {documents.map(doc => (
                    <div key={doc.id} className="flex items-center justify-between bg-slate-700/50 rounded-lg px-3 py-2">
                        <div className="flex items-center gap-2 min-w-0">
                            <svg className="w-4 h-4 text-slate-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            <span className="text-slate-200 truncate text-sm">{doc.filename}</span>
                            <span className="text-slate-500 text-xs">{formatSize(doc.size)}</span>
                        </div>
                        <button
                            onClick={() => handleDelete(doc.id)}
                            className="text-slate-400 hover:text-red-400 transition-colors p-1"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                        </button>
                    </div>
                ))}
                {documents.length === 0 && (
                    <div className="text-slate-500 text-sm text-center py-4">
                        No documents indexed yet. Add files to enable semantic search.
                    </div>
                )}
            </div>
        </div>
    );
}
