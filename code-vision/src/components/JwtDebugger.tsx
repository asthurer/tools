import { useState, useMemo } from 'react';
import { jwtDecode } from 'jwt-decode';
import ReactJson from 'react-json-view';

export function JwtDebugger() {
    const [token, setToken] = useState('');

    const decoded = useMemo(() => {
        if (!token.trim()) return null;
        try {
            const header = jwtDecode(token, { header: true });
            const payload = jwtDecode(token);
            return { header, payload, error: null };
        } catch (err: any) {
            return { header: null, payload: null, error: err.message };
        }
    }, [token]);

    return (
        <div className="h-full flex flex-col">
            <header className="mb-4">
                <h2 className="text-2xl font-bold text-slate-100">JWT Debugger</h2>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1 min-h-0">
                {/* Token Input */}
                <div className="flex flex-col space-y-2">
                    <label className="text-sm font-semibold text-slate-400">Encoded Token</label>
                    <textarea
                        className="flex-1 bg-slate-800 border border-slate-700 rounded-lg p-4 focus:ring-2 focus:ring-emerald-500 focus:outline-none resize-none font-mono text-sm break-all"
                        placeholder="Paste JWT token here..."
                        value={token}
                        onChange={(e) => setToken(e.target.value)}
                    />
                </div>

                {/* Decoded Output */}
                <div className="flex flex-col space-y-4 min-h-0 overflow-hidden">
                    {/* Header */}
                    <div className="flex-1 flex flex-col min-h-0">
                        <label className="text-sm font-semibold text-slate-400 mb-2">Header</label>
                        <div className="flex-1 bg-slate-800 border border-slate-700 rounded-lg overflow-auto p-4">
                            {decoded?.header ? (
                                <ReactJson
                                    src={decoded.header}
                                    theme="ocean"
                                    style={{ backgroundColor: 'transparent' }}
                                    displayDataTypes={false}
                                    enableClipboard={false}
                                />
                            ) : (
                                <span className="text-slate-500 text-sm">No header data</span>
                            )}
                        </div>
                    </div>

                    {/* Payload */}
                    <div className="flex-[2] flex flex-col min-h-0">
                        <label className="text-sm font-semibold text-slate-400 mb-2">Payload</label>
                        <div className={`flex-1 bg-slate-800 border ${decoded?.error ? 'border-red-500' : 'border-slate-700'} rounded-lg overflow-auto p-4`}>
                            {decoded?.error ? (
                                <div className="text-red-400 text-sm">
                                    <span className="font-bold">Error:</span> {decoded.error}
                                </div>
                            ) : decoded?.payload ? (
                                <ReactJson
                                    src={decoded.payload}
                                    theme="ocean"
                                    style={{ backgroundColor: 'transparent' }}
                                    displayDataTypes={false}
                                    enableClipboard={false}
                                />
                            ) : (
                                <span className="text-slate-500 text-sm">No payload data</span>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
