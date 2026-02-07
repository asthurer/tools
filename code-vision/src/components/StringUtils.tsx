import { useState, useMemo } from 'react';

export function StringUtils() {
    const [input, setInput] = useState('');

    const stats = useMemo(() => {
        return {
            chars: input.length,
            words: input.trim() ? input.trim().split(/\s+/).length : 0,
            lines: input ? input.split(/\r\n|\r|\n/).length : 0,
        };
    }, [input]);

    const transformations = useMemo(() => ({
        lowercase: input.toLowerCase(),
        uppercase: input.toUpperCase(),
        capitalized: input.replace(/\b\w/g, l => l.toUpperCase()),
        camelCase: input
            .replace(/(?:^\w|[A-Z]|\b\w)/g, (word, index) =>
                index === 0 ? word.toLowerCase() : word.toUpperCase()
            )
            .replace(/\s+/g, ''),
        snakeCase: input
            .match(/[A-Z]{2,}(?=[A-Z][a-z]+[0-9]*|\b)|[A-Z]?[a-z]+[0-9]*|[A-Z]|[0-9]+/g)
            ?.map(x => x.toLowerCase())
            .join('_') || input,
        kebabCase: input
            .match(/[A-Z]{2,}(?=[A-Z][a-z]+[0-9]*|\b)|[A-Z]?[a-z]+[0-9]*|[A-Z]|[0-9]+/g)
            ?.map(x => x.toLowerCase())
            .join('-') || input,
        slugify: input
            .toLowerCase()
            .trim()
            .replace(/[^\w\s-]/g, '')
            .replace(/[\s_-]+/g, '-')
            .replace(/^-+|-+$/g, ''),
        reversed: input.split('').reverse().join(''),
    }), [input]);

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
    };

    return (
        <div className="h-full flex flex-col">
            <header className="mb-4">
                <h2 className="text-2xl font-bold text-slate-100">String Utilities</h2>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1 min-h-0">

                {/* Input */}
                <div className="flex flex-col space-y-2">
                    <div className="flex justify-between items-center">
                        <label className="text-sm font-semibold text-slate-400">Input Text</label>
                        <div className="text-xs text-slate-500 flex gap-3">
                            <span>{stats.chars} chars</span>
                            <span>{stats.words} words</span>
                            <span>{stats.lines} lines</span>
                        </div>
                    </div>
                    <textarea
                        className="flex-1 bg-slate-800 border border-slate-700 rounded-lg p-4 focus:ring-2 focus:ring-emerald-500 focus:outline-none resize-none font-mono text-sm leading-6"
                        placeholder="Type or paste text here..."
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                    />
                </div>

                {/* Transformations */}
                <div className="flex flex-col space-y-2 h-full min-h-0 overflow-auto">
                    <label className="text-sm font-semibold text-slate-400">Transformations</label>
                    <div className="flex-1 space-y-3 overflow-y-auto pr-2">
                        {Object.entries(transformations).map(([key, value]) => (
                            <div key={key} className="bg-slate-800 border border-slate-700 rounded-lg p-3">
                                <div className="flex justify-between items-center mb-1">
                                    <span className="text-xs text-slate-500 uppercase font-bold tracking-wider">{key}</span>
                                    <button
                                        onClick={() => copyToClipboard(value)}
                                        className="text-xs text-emerald-400 hover:text-emerald-300"
                                    >
                                        Copy
                                    </button>
                                </div>
                                <div className="text-sm font-mono text-slate-300 break-all">
                                    {value || <span className="text-slate-600 italic">...</span>}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

            </div>
        </div>
    );
}
