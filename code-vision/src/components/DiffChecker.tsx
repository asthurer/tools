import { useState, useMemo, useEffect } from 'react';
import * as Diff from 'diff';
import Papa from 'papaparse';

export function DiffChecker() {
    const [original, setOriginal] = useState('');
    const [modified, setModified] = useState('');
    const [viewType, setViewType] = useState<'unified' | 'split'>('split');
    const [viewMode, setViewMode] = useState<'input' | 'preview'>('input');
    const [isCsv, setIsCsv] = useState(false);

    // Auto-detect CSV
    useEffect(() => {
        const isCsvContent = (text: string) => {
            if (!text || text.length > 500000) return false;
            const result = Papa.parse(text, { preview: 2, skipEmptyLines: true });
            // Relaxed check: just ensure we have data with multiple columns
            return result.data.length > 0 && (result.data[0] as any[]).length > 1;
        };
        // Auto-detect only when entering preview mode, don't override manual toggle
        if (viewMode === 'preview' && isCsvContent(original) && isCsvContent(modified)) {
            setIsCsv(true);
        }
    }, [original, modified, viewMode]);

    const diffs = useMemo(() => {
        if (!original && !modified) return [];
        try {
            return Diff.diffLines(original, modified);
        } catch (err) {
            console.error("Diff error", err);
            return [{ value: "Error calculating diff. Please check your input.", added: false, removed: false }];
        }
    }, [original, modified]);

    const splitRows = useMemo(() => {
        if (viewType !== 'split' && !isCsv) return []; // CSV always uses split-like logic for alignment
        if (!diffs.length) return [];

        const rows: {
            left?: { num: number, value: string, type: 'removed' | 'unchanged', parsed?: string[] },
            right?: { num: number, value: string, type: 'added' | 'unchanged', parsed?: string[] }
        }[] = [];

        let leftLine = 1;
        let rightLine = 1;

        diffs.forEach(part => {
            // Handle newline behavior for diffLines
            let value = part.value;
            // Remove trailing newline if it exists and isn't the only char (diffLines often includes it)
            if (value.endsWith('\n') && value.length > 1) {
                // Determine if we should split.
            }

            const lines = value.split(/\r\n|\r|\n/);
            if (lines.length > 0 && lines[lines.length - 1] === '') lines.pop();

            lines.forEach(line => {
                const parsed = isCsv ? (Papa.parse(line, { header: false }).data[0] as string[]) : undefined;

                if (part.removed) {
                    rows.push({
                        left: { num: leftLine++, value: line, type: 'removed', parsed },
                        right: undefined
                    });
                } else if (part.added) {
                    rows.push({
                        left: undefined,
                        right: { num: rightLine++, value: line, type: 'added', parsed }
                    });
                } else {
                    rows.push({
                        left: { num: leftLine++, value: line, type: 'unchanged', parsed },
                        right: { num: rightLine++, value: line, type: 'unchanged', parsed }
                    });
                }
            });
        });
        return rows;
    }, [diffs, viewType, isCsv]);

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, setter: (value: string) => void) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (file.size > 10 * 1024 * 1024) {
            alert('File size exceeds 10MB limit.');
            return;
        }
        const reader = new FileReader();
        reader.onload = (event) => {
            if (typeof event.target?.result === 'string') {
                setter(event.target.result);
            }
        };
        reader.readAsText(file);
    };

    return (
        <div className="h-full flex flex-col">
            <header className="mb-4 flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <h2 className="text-2xl font-bold text-slate-100">Diff Checker</h2>
                    {viewMode === 'preview' && (
                        <label className="flex items-center cursor-pointer gap-2 bg-slate-800 px-3 py-1.5 rounded border border-slate-700 hover:border-slate-600 transition-colors">
                            <input
                                type="checkbox"
                                checked={isCsv}
                                onChange={(e) => setIsCsv(e.target.checked)}
                                className="rounded bg-slate-700 border-slate-600 text-emerald-500 focus:ring-emerald-500 focus:ring-offset-0 w-4 h-4"
                            />
                            <span className="text-xs text-slate-300 font-medium select-none">CSV Table Mode</span>
                        </label>
                    )}
                </div>

                <div className="flex items-center space-x-4">
                    <div className="flex bg-slate-700 rounded-lg p-0.5">
                        <button
                            onClick={() => setViewMode('input')}
                            className={`px-3 py-1 text-xs rounded-md transition-colors ${viewMode === 'input' ? 'bg-emerald-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
                        >
                            Input
                        </button>
                        <button
                            onClick={() => setViewMode('preview')}
                            className={`px-3 py-1 text-xs rounded-md transition-colors ${viewMode === 'preview' ? 'bg-emerald-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
                        >
                            Preview Diff
                        </button>
                    </div>

                    {viewMode === 'preview' && !isCsv && (
                        <>
                            <div className="w-px h-6 bg-slate-700 mx-2"></div>
                            <div className="flex bg-slate-700 rounded-lg p-0.5">
                                <button
                                    onClick={() => setViewType('split')}
                                    className={`px-3 py-1 text-xs rounded-md transition-colors ${viewType === 'split' ? 'bg-emerald-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
                                >
                                    Split
                                </button>
                                <button
                                    onClick={() => setViewType('unified')}
                                    className={`px-3 py-1 text-xs rounded-md transition-colors ${viewType === 'unified' ? 'bg-emerald-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
                                >
                                    Unified
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </header>

            <div className="flex-1 min-h-0 bg-slate-800 border border-slate-700 rounded-lg overflow-hidden flex flex-col">

                {viewMode === 'input' ? (
                    <div className="flex-1 grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-700 min-h-0">
                        <div className="flex flex-col min-h-0 relative">
                            <div className="bg-slate-900/50 p-2 border-b border-slate-700 flex justify-between items-center">
                                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Original Text</span>
                                <div>
                                    <input
                                        type="file"
                                        id="upload-original"
                                        className="hidden"
                                        accept=".txt,.json,.csv,.js,.ts,.html,.css,.sql,.md,.xml"
                                        onChange={(e) => handleFileUpload(e, setOriginal)}
                                    />
                                    <label
                                        htmlFor="upload-original"
                                        className="cursor-pointer text-xs bg-slate-700 hover:bg-slate-600 text-slate-300 px-2 py-1 rounded transition-colors"
                                    >
                                        Upload File
                                    </label>
                                </div>
                            </div>
                            <textarea
                                className="flex-1 bg-transparent p-4 focus:outline-none resize-none font-mono text-sm leading-6 text-slate-300 placeholder-slate-600"
                                placeholder="Paste original text or upload a file..."
                                value={original}
                                onChange={(e) => setOriginal(e.target.value)}
                            />
                        </div>
                        <div className="flex flex-col min-h-0 relative">
                            <div className="bg-slate-900/50 p-2 border-b border-slate-700 flex justify-between items-center">
                                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Modified Text</span>
                                <div>
                                    <input
                                        type="file"
                                        id="upload-modified"
                                        className="hidden"
                                        accept=".txt,.json,.csv,.js,.ts,.html,.css,.sql,.md,.xml"
                                        onChange={(e) => handleFileUpload(e, setModified)}
                                    />
                                    <label
                                        htmlFor="upload-modified"
                                        className="cursor-pointer text-xs bg-slate-700 hover:bg-slate-600 text-slate-300 px-2 py-1 rounded transition-colors"
                                    >
                                        Upload File
                                    </label>
                                </div>
                            </div>
                            <textarea
                                className="flex-1 bg-transparent p-4 focus:outline-none resize-none font-mono text-sm leading-6 text-slate-300 placeholder-slate-600"
                                placeholder="Paste modified text or upload a file..."
                                value={modified}
                                onChange={(e) => setModified(e.target.value)}
                            />
                        </div>
                    </div>
                ) : (
                    <div className="flex-1 flex flex-col min-h-0 ">
                        <div className="flex-1 overflow-auto p-0 font-mono text-xs">
                            {isCsv ? (
                                // CSV TABLE COMPARISON VIEW
                                <table className="w-full border-collapse">
                                    <thead>
                                        <tr>
                                            <th className="sticky top-0 border-r border-slate-700 bg-slate-900 text-slate-500 font-normal py-1 z-10 w-[50%]">Original CSV</th>
                                            <th className="sticky top-0 bg-slate-900 text-slate-500 font-normal py-1 z-10 w-[50%]">Modified CSV</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-800">
                                        {splitRows.map((row, i) => (
                                            <tr key={i} className="hover:bg-slate-700/20">
                                                {/* LEFT SIDE */}
                                                <td className={`align-top border-r border-slate-700 p-0 w-[50%] ${row.left?.type === 'removed' ? 'bg-red-900/10' : ''}`}>
                                                    <div className="flex h-full">
                                                        <span className="w-8 text-right pr-2 text-slate-600 select-none bg-slate-900/30 border-r border-slate-800/50 flex-shrink-0">
                                                            {row.left?.num || ''}
                                                        </span>
                                                        <div className="flex-1 overflow-x-auto">
                                                            {row.left?.parsed ? (
                                                                <div className="flex divide-x divide-slate-800/50 border-b border-transparent">
                                                                    {row.left.parsed.map((cell, cIdx) => (
                                                                        <span key={cIdx} className={`px-2 py-0.5 truncate min-w-[50px] max-w-[200px] ${row.left?.type === 'removed' ? 'text-red-200 bg-red-900/20' : 'text-slate-300'}`}>
                                                                            {cell}
                                                                        </span>
                                                                    ))}
                                                                </div>
                                                            ) : (
                                                                <span className="px-2 text-slate-500 italic block py-0.5">{row.left ? 'Invalid CSV Row' : ''}</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </td>

                                                {/* RIGHT SIDE */}
                                                <td className={`align-top p-0 w-[50%] ${row.right?.type === 'added' ? 'bg-emerald-900/10' : ''}`}>
                                                    <div className="flex h-full">
                                                        <span className="w-8 text-right pr-2 text-slate-600 select-none bg-slate-900/30 border-r border-slate-800/50 flex-shrink-0">
                                                            {row.right?.num || ''}
                                                        </span>
                                                        <div className="flex-1 overflow-x-auto">
                                                            {row.right?.parsed ? (
                                                                <div className="flex divide-x divide-slate-800/50 border-b border-transparent">
                                                                    {row.right.parsed.map((cell, cIdx) => (
                                                                        <span key={cIdx} className={`px-2 py-0.5 truncate min-w-[50px] max-w-[200px] ${row.right?.type === 'added' ? 'text-emerald-200 bg-emerald-900/20' : 'text-slate-300'}`}>
                                                                            {cell}
                                                                        </span>
                                                                    ))}
                                                                </div>
                                                            ) : (
                                                                <span className="px-2 text-slate-500 italic block py-0.5">{row.right ? 'Invalid CSV Row' : ''}</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            ) : (
                                // STANDARD TEXT DIFF VIEW (Existing Logic)
                                viewType === 'split' ? (
                                    <table className="w-full border-collapse">
                                        <thead>
                                            <tr>
                                                <th className="w-[50%] sticky top-0 border-r border-slate-700 bg-slate-900/50 text-slate-500 font-normal py-1 z-10">Original</th>
                                                <th className="w-[50%] sticky top-0 bg-slate-900/50 text-slate-500 font-normal py-1 z-10">Modified</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {splitRows.map((row, i) => (
                                                <tr key={i} className="hover:bg-slate-700/20">
                                                    <td className={`align-top border-r border-slate-700 p-0 ${row.left?.type === 'removed' ? 'bg-red-900/20' : ''}`}>
                                                        <div className="flex">
                                                            <span className="w-8 text-right pr-2 text-slate-600 select-none bg-slate-900/30 border-r border-slate-800/50">{row.left?.num || ''}</span>
                                                            <span className={`flex-1 px-2 whitespace-pre-wrap break-all ${row.left?.type === 'removed' ? 'text-red-200' : 'text-slate-300'}`}>
                                                                {row.left?.value || ''}
                                                            </span>
                                                        </div>
                                                    </td>
                                                    <td className={`align-top p-0 ${row.right?.type === 'added' ? 'bg-emerald-900/20' : ''}`}>
                                                        <div className="flex">
                                                            <span className="w-8 text-right pr-2 text-slate-600 select-none bg-slate-900/30 border-r border-slate-800/50">{row.right?.num || ''}</span>
                                                            <span className={`flex-1 px-2 whitespace-pre-wrap break-all ${row.right?.type === 'added' ? 'text-emerald-200' : 'text-slate-300'}`}>
                                                                {row.right?.value || ''}
                                                            </span>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                            {splitRows.length === 0 && (
                                                <tr>
                                                    <td colSpan={2} className="p-8 text-center text-slate-500">
                                                        No differences found or no input provided.
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                ) : (
                                    <div className="p-4 whitespace-pre-wrap break-all">
                                        {diffs.map((part, index) => (
                                            <span
                                                key={index}
                                                className={`
                                                ${part.added ? 'bg-emerald-900/50 text-emerald-200' : ''}
                                                ${part.removed ? 'bg-red-900/50 text-red-200 decoration-red-500 line-through opacity-70' : ''}
                                                ${!part.added && !part.removed ? 'text-slate-300' : ''}
                                            `}
                                            >
                                                {part.value}
                                            </span>
                                        ))}
                                    </div>
                                )
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
