import type { SearchResult } from '../types';

interface SearchResultsProps {
    results: SearchResult[];
    searching: boolean;
    hasQuery: boolean;
}

export function SearchResults({ results, searching, hasQuery }: SearchResultsProps) {
    if (searching) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="animate-spin w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full mr-3"></div>
                <span className="text-slate-400">Searching with semantic matching...</span>
            </div>
        );
    }

    if (!hasQuery) {
        return (
            <div className="text-center text-slate-500 py-12">
                <svg className="w-16 h-16 mx-auto mb-4 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                Enter a query to search across your indexed documents using AI-powered semantic matching.
            </div>
        );
    }

    if (results.length === 0) {
        return (
            <div className="text-center text-slate-500 py-12">
                <svg className="w-16 h-16 mx-auto mb-4 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                No matching documents found. Try a different query or add more documents.
            </div>
        );
    }

    return (
        <div className="space-y-3">
            <div className="text-sm text-slate-400 mb-2">
                Found {results.length} result{results.length !== 1 ? 's' : ''}
            </div>
            {results.map((result, idx) => (
                <div
                    key={result.document.id + idx}
                    className="bg-slate-800 rounded-xl p-4 border border-slate-700 hover:border-orange-500/50 transition-all hover:shadow-lg hover:shadow-black/20 cursor-pointer group"
                >
                    <div className="flex justify-between items-start mb-2">
                        <h3 className="text-lg font-semibold text-orange-200 group-hover:text-orange-300 transition-colors">
                            {result.document.filename}
                        </h3>
                        <span className={`text-xs px-2 py-1 rounded font-medium ${result.score >= 0.8
                                ? 'bg-green-500/20 text-green-300'
                                : result.score >= 0.5
                                    ? 'bg-yellow-500/20 text-yellow-300'
                                    : 'bg-slate-600 text-slate-300'
                            }`}>
                            {(result.score * 100).toFixed(0)}% match
                        </span>
                    </div>
                    <p className="text-slate-400 text-sm leading-relaxed">
                        {result.snippet}
                    </p>
                </div>
            ))}
        </div>
    );
}
