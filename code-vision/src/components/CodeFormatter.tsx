import { useState, useEffect } from 'react';
import * as prettier from "prettier/standalone";
import * as parserBabel from "prettier/plugins/babel";
import * as parserEstree from "prettier/plugins/estree";
import * as parserHtml from "prettier/plugins/html";
import * as parserPostcss from "prettier/plugins/postcss";
import { format as sqlFormat } from 'sql-formatter';
import xmlFormat from 'xml-formatter';
import ReactJson from 'react-json-view';
import Papa from 'papaparse';

type Language = 'json' | 'css' | 'html' | 'javascript' | 'sql' | 'xml' | 'csv' | 'base64' | 'url';

export function CodeFormatter() {
    const [input, setInput] = useState('');
    const [output, setOutput] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [language, setLanguage] = useState<Language>('json');
    const [isFormatting, setIsFormatting] = useState(false);
    const [viewMode, setViewMode] = useState<'code' | 'tree'>('code');
    const [parsedJson, setParsedJson] = useState<object | null>(null);

    // Update parsed JSON whenever input changes and is valid JSON
    useEffect(() => {
        if (language === 'json') {
            try {
                const parsed = JSON.parse(input);
                setParsedJson(parsed);
            } catch {
                setParsedJson(null);
            }
        } else {
            setParsedJson(null);
        }
    }, [input, language]);

    const handleAction1 = async () => {
        // Action 1: Format or Encode
        if (!input.trim()) {
            setOutput('');
            setError(null);
            return;
        }
        setError(null);
        setIsFormatting(true);

        try {
            let result = '';
            if (language === 'json') {
                const parsed = JSON.parse(input);
                result = JSON.stringify(parsed, null, 2);
            } else if (language === 'sql') {
                result = sqlFormat(input);
            } else if (language === 'xml') {
                result = xmlFormat(input, {
                    collapseContent: true,
                    indentation: '  ',
                    lineSeparator: '\n'
                });
            } else if (language === 'javascript') {
                result = await prettier.format(input, {
                    parser: "babel",
                    plugins: [parserBabel, parserEstree],
                    semi: true,
                    singleQuote: true,
                });
            } else if (language === 'css') {
                result = await prettier.format(input, {
                    parser: "css",
                    plugins: [parserPostcss],
                });
            } else if (language === 'html') {
                result = await prettier.format(input, {
                    parser: "html",
                    plugins: [parserHtml],
                });
            } else if (language === 'csv') {
                const parsed = Papa.parse(input, { header: true, skipEmptyLines: true });
                if (parsed.errors.length > 0) throw new Error(parsed.errors[0].message);
                result = Papa.unparse(parsed.data);
            } else if (language === 'base64') {
                result = btoa(input);
            } else if (language === 'url') {
                result = encodeURIComponent(input);
            }
            setOutput(result);
        } catch (err: any) {
            console.error(err);
            setError(err.message || 'Error processing');
            setOutput('');
        } finally {
            setIsFormatting(false);
        }
    };

    const handleAction2 = async () => {
        // Action 2: Minify or Decode
        if (!input.trim()) return;
        setError(null);
        setIsFormatting(true);

        try {
            let result = '';
            if (language === 'json') {
                const parsed = JSON.parse(input);
                result = JSON.stringify(parsed);
            } else if (language === 'sql') {
                result = input.replace(/\s+/g, ' ').trim();
            } else if (language === 'xml') {
                result = xmlFormat(input, {
                    indentation: '',
                    collapseContent: true,
                    lineSeparator: ''
                });
            } else if (language === 'css') {
                result = input
                    .replace(/\/\*[\s\S]*?\*\//g, '')
                    .replace(/\s+/g, ' ')
                    .replace(/\s*([{}:;,])\s*/g, '$1')
                    .replace(/;}/g, '}')
                    .trim();
            } else if (language === 'html') {
                result = input
                    .replace(/<!--[\s\S]*?-->/g, '')
                    .replace(/\s+/g, ' ')
                    .replace(/>\s+</g, '><')
                    .trim();
            } else if (language === 'javascript') {
                result = input
                    .replace(/\/\/.*$/gm, '')
                    .replace(/\/\*[\s\S]*?\*\//g, '')
                    .replace(/\s+/g, ' ')
                    .trim();
            } else if (language === 'csv') {
                // CSV minification just ensures no extra whitespace? Actually CSV is already compact usually.
                // We'll standardise it.
                const parsed = Papa.parse(input, { header: true, skipEmptyLines: true });
                result = Papa.unparse(parsed.data, { quotes: false, quoteChar: '"' });
            } else if (language === 'base64') {
                result = atob(input);
            } else if (language === 'url') {
                result = decodeURIComponent(input);
            }
            setOutput(result);
        } catch (err: any) {
            console.error(err);
            setError(err.message || 'Error processing');
            setOutput('');
        } finally {
            setIsFormatting(false);
        }
    };

    const getActionLabels = () => {
        if (language === 'base64' || language === 'url') {
            return { action1: 'Encode', action2: 'Decode' };
        }
        return { action1: 'Format', action2: 'Minify' };
    };

    const labels = getActionLabels();

    const clearAll = () => {
        setInput('');
        setOutput('');
        setError(null);
        setParsedJson(null);
    };

    return (
        <div className="h-full flex flex-col">
            <header className="mb-4 flex flex-col md:flex-row items-center justify-between gap-4">
                <h2 className="text-2xl font-bold text-slate-100">Code Formatter</h2>
                <div className="flex items-center space-x-4">
                    <select
                        value={language}
                        onChange={(e) => {
                            setLanguage(e.target.value as Language);
                            setError(null);
                            setOutput('');
                            setViewMode('code');
                        }}
                        className="bg-slate-800 border border-slate-700 text-slate-200 text-sm rounded-lg focus:ring-emerald-500 focus:border-emerald-500 block p-2.5"
                    >
                        <option value="json">JSON</option>
                        <option value="javascript">JavaScript</option>
                        <option value="css">CSS</option>
                        <option value="html">HTML</option>
                        <option value="sql">SQL</option>
                        <option value="xml">XML</option>
                        <option value="csv">CSV</option>
                        <option value="base64">Base64</option>
                        <option value="url">URL</option>
                    </select>
                </div>
            </header>

            <main className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1 min-h-0">
                {/* Input Column */}
                <div className="flex flex-col space-y-2 h-full min-h-0">
                    <div className="flex justify-between items-center bg-slate-800/50 p-2 rounded-t-lg">
                        <div className='flex items-center gap-2'>
                            <label className="text-sm font-semibold text-slate-400 pl-2">Input ({language.toUpperCase()})</label>
                            {language === 'json' && (
                                <div className='flex bg-slate-700 rounded-lg p-0.5 ml-4'>
                                    <button
                                        onClick={() => setViewMode('code')}
                                        className={`px-3 py-1 text-xs rounded-md transition-colors ${viewMode === 'code' ? 'bg-emerald-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
                                    >
                                        Code
                                    </button>
                                    <button
                                        onClick={() => setViewMode('tree')}
                                        className={`px-3 py-1 text-xs rounded-md transition-colors ${viewMode === 'tree' ? 'bg-emerald-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
                                    >
                                        Tree
                                    </button>
                                </div>
                            )}
                        </div>
                        <div className="flex gap-2">
                            <button type="button" onClick={clearAll} className="text-xs text-red-400 hover:text-red-300 px-2">Clear</button>
                        </div>
                    </div>

                    <div className="flex-1 bg-slate-800 border border-slate-700 rounded-b-lg overflow-hidden relative">
                        {language === 'json' && viewMode === 'tree' ? (
                            <div className="absolute inset-0 overflow-auto p-4 text-sm">
                                {parsedJson ? (
                                    <ReactJson
                                        src={parsedJson}
                                        theme="ocean"
                                        style={{ backgroundColor: 'transparent' }}
                                        displayDataTypes={false}
                                        onEdit={(edit) => {
                                            setParsedJson(edit.updated_src);
                                            setInput(JSON.stringify(edit.updated_src, null, 2));
                                        }}
                                        onAdd={(add) => {
                                            setParsedJson(add.updated_src);
                                            setInput(JSON.stringify(add.updated_src, null, 2));
                                        }}
                                        onDelete={(del) => {
                                            setParsedJson(del.updated_src);
                                            setInput(JSON.stringify(del.updated_src, null, 2));
                                        }}
                                    />
                                ) : (
                                    <div className="text-center text-slate-500 mt-10">Invalid JSON data for Tree View</div>
                                )}
                            </div>
                        ) : (
                            <textarea
                                className="w-full h-full bg-slate-800 p-4 focus:ring-2 focus:ring-emerald-500 focus:outline-none resize-none font-mono text-sm border-none"
                                placeholder={`Paste your ${language} code here...`}
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                            />
                        )}
                    </div>
                </div>

                {/* Output Column */}
                <div className="flex flex-col space-y-2 h-full min-h-0">
                    <div className="flex justify-between items-center bg-slate-800/50 p-2 rounded-t-lg">
                        <label className="text-sm font-semibold text-slate-400 pl-2">Output</label>
                        <div className="space-x-2">
                            <button
                                onClick={handleAction1}
                                disabled={isFormatting}
                                className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed rounded text-sm font-medium transition-colors"
                            >
                                {isFormatting ? '...' : labels.action1}
                            </button>
                            <button
                                onClick={handleAction2}
                                disabled={isFormatting}
                                className="px-3 py-1 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed rounded text-sm font-medium transition-colors"
                            >
                                {isFormatting ? '...' : labels.action2}
                            </button>
                        </div>
                    </div>

                    <div className={`flex-1 bg-slate-800 border ${error ? 'border-red-500' : 'border-slate-700'} rounded-b-lg p-4 overflow-auto relative font-mono text-sm`}>
                        {error ? (
                            <div className="text-red-400">
                                <h3 className="font-bold mb-2">Error</h3>
                                <p>{error}</p>
                            </div>
                        ) : (
                            <pre className="text-emerald-300 whitespace-pre-wrap break-all">
                                {output}
                            </pre>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
}
