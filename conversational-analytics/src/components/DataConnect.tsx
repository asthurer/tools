import { useState } from 'react';
import { Database as DbIcon, CheckCircle, XCircle } from 'lucide-react';
import type { DatabaseConfig, DatabaseType } from '../types/settings';

interface DataConnectProps {
    config: DatabaseConfig;
    onUpdate: (key: keyof DatabaseConfig, value: any) => void;
}

export function DataConnect({ config, onUpdate }: DataConnectProps) {
    const [isTesting, setIsTesting] = useState(false);
    const [connectionStatus, setConnectionStatus] = useState<{ success: boolean; message: string } | null>(null);

    const testConnection = async () => {
        setIsTesting(true);
        setConnectionStatus(null);
        try {
            const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || import.meta.env.NEXT_PUBLIC_SUPABASE_URL;
            const functionUrl = `${supabaseUrl}/functions/v1/query-proxy/connect`; // Append /connect for specific route check if handled in index.ts

            // Note: Our Edge Function handles /connect routing manually or we can pass a flag.
            // In the created index.ts, we checked `req.url.endsWith("/connect")`.
            // So calling .../query-proxy/connect should trigger that block.

            const response = await fetch(functionUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY}`
                },
                body: JSON.stringify({ type: config.type, config })
            });
            const result = await response.json();
            setConnectionStatus({
                success: result.success,
                message: result.message || (result.success ? 'Connection Successful' : 'Connection Failed')
            });

            if (result.ip) {
                setConnectionStatus(prev => prev ? ({ ...prev, message: `${prev.message} (Supabase IP: ${result.ip})` }) : null);
            }
        } catch (error: any) {
            setConnectionStatus({
                success: false,
                message: `Connection Error: ${error.message}. Check Supabase logs.`
            });
        } finally {
            setIsTesting(false);
        }
    };
    return (
        <div className="bg-foundry-900 border border-foundry-800 rounded-sm p-0 h-full overflow-y-auto">
            <div className="bg-foundry-950 px-4 py-3 border-b border-foundry-800 mb-0 sticky top-0 z-10">
                <h3 className="text-sm font-bold text-foundry-200 uppercase tracking-wider flex items-center gap-2">
                    <DbIcon size={16} className="text-accent-400" />
                    Data Connection
                </h3>
            </div>

            <div className="p-4 max-w-2xl">
                <div className="space-y-4">
                    <div className="grid grid-cols-12 gap-4 items-center">
                        <label className="col-span-4 text-xs font-bold text-foundry-500 uppercase">Data Source</label>
                        <div className="col-span-8">
                            <select
                                value={config.type}
                                onChange={(e) => onUpdate('type', e.target.value as DatabaseType)}
                                className="w-full bg-foundry-950 border border-foundry-700 rounded-sm px-3 py-1.5 text-sm text-foundry-200 focus:outline-none focus:border-accent-500 transition-all font-mono"
                            >
                                <option value="mock">Mock Data (Local)</option>
                                <option value="postgres">Postgre SQL</option>
                                <option value="mysql">My SQL</option>
                                <option value="sqlserver">SQL Server</option>
                                <option value="databricks">Databricks</option>
                                <option value="oracle">Oracle</option>
                            </select>
                        </div>
                    </div>

                    {config.type !== 'mock' && (
                        <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-200 border-t border-foundry-800 pt-4 mt-4">



                            <div className="grid grid-cols-12 gap-4 items-center">
                                <label className="col-span-4 text-xs font-bold text-foundry-500 uppercase">Host</label>
                                <div className="col-span-8">
                                    <input
                                        type="text"
                                        value={config.host || ''}
                                        onChange={(e) => onUpdate('host', e.target.value)}
                                        placeholder="localhost"
                                        className="w-full bg-foundry-950 border border-foundry-700 rounded-sm px-3 py-1.5 text-sm text-foundry-200 focus:outline-none focus:border-accent-500 font-mono"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-12 gap-4 items-center">
                                <label className="col-span-4 text-xs font-bold text-foundry-500 uppercase">Port</label>
                                <div className="col-span-8">
                                    <input
                                        type="number"
                                        value={config.port || ''}
                                        onChange={(e) => onUpdate('port', parseInt(e.target.value))}
                                        placeholder="5432"
                                        className="w-full bg-foundry-950 border border-foundry-700 rounded-sm px-3 py-1.5 text-sm text-foundry-200 focus:outline-none focus:border-accent-500 font-mono"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-12 gap-4 items-center">
                                <label className="col-span-4 text-xs font-bold text-foundry-500 uppercase">Database</label>
                                <div className="col-span-8">
                                    <input
                                        type="text"
                                        value={config.database || ''}
                                        onChange={(e) => onUpdate('database', e.target.value)}
                                        placeholder="my_database"
                                        className="w-full bg-foundry-950 border border-foundry-700 rounded-sm px-3 py-1.5 text-sm text-foundry-200 focus:outline-none focus:border-accent-500 font-mono"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-12 gap-4 items-center">
                                <label className="col-span-4 text-xs font-bold text-foundry-500 uppercase">Username</label>
                                <div className="col-span-8">
                                    <input
                                        type="text"
                                        value={config.username || ''}
                                        onChange={(e) => onUpdate('username', e.target.value)}
                                        placeholder="user"
                                        className="w-full bg-foundry-950 border border-foundry-700 rounded-sm px-3 py-1.5 text-sm text-foundry-200 focus:outline-none focus:border-accent-500 font-mono"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-12 gap-4 items-center">
                                <label className="col-span-4 text-xs font-bold text-foundry-500 uppercase">Password</label>
                                <div className="col-span-8">
                                    <input
                                        type="password"
                                        value={config.password || ''}
                                        onChange={(e) => onUpdate('password', e.target.value)}
                                        placeholder="••••••••"
                                        className="w-full bg-foundry-950 border border-foundry-700 rounded-sm px-3 py-1.5 text-sm text-foundry-200 focus:outline-none focus:border-accent-500 font-mono"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-12 gap-4 items-center">
                                <div className="col-span-4"></div>
                                <div className="col-span-8 flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        id="ssl-toggle"
                                        checked={config.ssl !== false} // Default to true if undefined
                                        onChange={(e) => onUpdate('ssl', e.target.checked)}
                                        className="rounded-sm border-foundry-700 bg-foundry-950 text-accent-500 focus:ring-accent-500/20"
                                    />
                                    <label htmlFor="ssl-toggle" className="text-xs text-foundry-400 cursor-pointer select-none">
                                        Enable SSL/TLS (Required for Azure/Cloud)
                                    </label>
                                </div>
                            </div>

                            <div className="flex justify-between items-center pt-4 border-t border-foundry-800">
                                <span className={`text-[10px] font-mono flex items-center gap-1.5 ${connectionStatus?.success ? 'text-accent-success' : 'text-accent-danger'}`}>
                                    {connectionStatus?.success && <CheckCircle size={12} />}
                                    {!connectionStatus?.success && connectionStatus?.message && <XCircle size={12} />}
                                    {connectionStatus?.message}
                                </span>
                                <button
                                    onClick={testConnection}
                                    disabled={isTesting}
                                    className={`px-4 py-2 bg-foundry-800 hover:bg-foundry-700 text-foundry-200 rounded-sm text-xs font-bold uppercase tracking-wide transition-all border border-foundry-700 ${isTesting ? 'opacity-50 cursor-wait' : ''}`}
                                >
                                    {isTesting ? 'Connecting...' : 'Verify Connection'}
                                </button>
                            </div>
                        </div>
                    )}

                    {config.type === 'mock' && (
                        <div className="mt-4 p-3 border border-dashed border-foundry-700 rounded-sm bg-foundry-950/50">
                            <p className="text-xs text-foundry-500 font-mono">
                                <span className="text-accent-success">●</span> SYSTEM_READY: Using local synthesis data (E-commerce).
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
