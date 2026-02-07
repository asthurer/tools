import { useState, useMemo } from 'react';

export function RegexTester() {
    const [regexStr, setRegexStr] = useState('');
    const [flags, setFlags] = useState('gm');
    const [testString, setTestString] = useState('');

    const matches = useMemo(() => {
        if (!regexStr) return [];
        try {
            const regex = new RegExp(regexStr, flags);
            const matches = [];
            let match;

            // Prevent infinite loops with empty matches or non-global regex
            if (!flags.includes('g')) {
                match = regex.exec(testString);
                if (match) matches.push({ index: match.index, value: match[0] });
                return matches;
            }

            let lastIndex = -1;
            while ((match = regex.exec(testString)) !== null) {
                if (match.index === regex.lastIndex) {
                    regex.lastIndex++; // Avoid infinite loop
                }
                if (lastIndex === match.index) break; // Safety break
                lastIndex = match.index;

                matches.push({ index: match.index, value: match[0] });
            }
            return matches;
        } catch (err) {
            return null; // Invalid regex
        }
    }, [regexStr, flags, testString]);

    // Highlight matches in the test string
    const highlightedText = useMemo(() => {
        if (!matches) return testString;
        if (matches.length === 0) return testString;

        let lastIndex = 0;
        const parts = [];

        matches.forEach((match: any, i) => {
            // Text before match
            if (match.index > lastIndex) {
                parts.push(<span key={`text-${i}`}>{testString.slice(lastIndex, match.index)}</span>);
            }
            // Match
            parts.push(
                <span key={`match-${i}`} className="bg-emerald-500/30 text-emerald-200 border-b-2 border-emerald-500">
                    {match.value}
                </span>
            );
            lastIndex = match.index + match.value.length;
        });

        // Remaining text
        if (lastIndex < testString.length) {
            parts.push(<span key="text-end">{testString.slice(lastIndex)}</span>);
        }

        return parts;
    }, [matches, testString]);


    return (
        <div className="h-full flex flex-col">
            <header className="mb-4">
                <h2 className="text-2xl font-bold text-slate-100">Regex Tester</h2>
            </header>

            <div className="flex flex-col gap-4 flex-1 min-h-0">

                {/* Regex Input */}
                <div className="flex flex-col md:flex-row gap-4">
                    <div className="flex-1">
                        <label className="text-sm font-semibold text-slate-400">Regular Expression</label>
                        <div className="flex items-center bg-slate-800 border border-slate-700 rounded-lg overflow-hidden mt-1 focus-within:ring-2 focus-within:ring-emerald-500">
                            <span className="px-3 text-slate-500 font-mono">/</span>
                            <input
                                type="text"
                                value={regexStr}
                                onChange={(e) => setRegexStr(e.target.value)}
                                className="flex-1 bg-transparent border-none focus:ring-0 text-slate-200 font-mono py-2"
                                placeholder="e.g. [a-z0-9]+"
                            />
                            <span className="px-3 text-slate-500 font-mono">/</span>
                            <input
                                type="text"
                                value={flags}
                                onChange={(e) => setFlags(e.target.value)}
                                className="w-16 bg-transparent border-none focus:ring-0 text-slate-400 font-mono py-2 border-l border-slate-700"
                                placeholder="flags"
                            />
                        </div>
                    </div>
                </div>

                {/* Test String Input */}
                <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4 min-h-0">
                    <div className="flex flex-col space-y-2 h-full">
                        <label className="text-sm font-semibold text-slate-400">Test String</label>
                        <textarea
                            className="flex-1 bg-slate-800 border border-slate-700 rounded-lg p-4 focus:ring-2 focus:ring-emerald-500 focus:outline-none resize-none font-mono text-sm leading-6"
                            placeholder="Paste text to test against..."
                            value={testString}
                            onChange={(e) => setTestString(e.target.value)}
                        />
                    </div>

                    {/* Match Results */}
                    <div className="flex flex-col space-y-2 h-full">
                        <div className='flex justify-between items-end'>
                            <label className="text-sm font-semibold text-slate-400">Match Results</label>
                            <span className={`text-xs ${matches === null ? 'text-red-400' : 'text-emerald-400'}`}>
                                {matches === null ? 'Invalid Regex' : `${matches.length} matches found`}
                            </span>
                        </div>
                        <div className="flex-1 bg-slate-800 border border-slate-700 rounded-lg p-4 overflow-auto font-mono text-sm leading-6 whitespace-pre-wrap break-all">
                            {highlightedText}
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}
