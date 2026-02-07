import { Database as DbIcon, AlertCircle } from 'lucide-react';
import type { DatabaseConfig, DatabaseType } from '../types/settings';

interface DataConnectProps {
    config: DatabaseConfig;
    onUpdate: (key: keyof DatabaseConfig, value: any) => void;
}

export function DataConnect({ config, onUpdate }: DataConnectProps) {
    return (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl h-full overflow-y-auto">
            <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                <DbIcon size={20} className="text-emerald-400" />
                Data Connection
            </h3>

            <div className="space-y-6 max-w-xl">
                <div>
                    <label className="block text-sm font-bold text-slate-400 uppercase mb-2">Data Source</label>
                    <select
                        value={config.type}
                        onChange={(e) => onUpdate('type', e.target.value as DatabaseType)}
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-3 text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
                    >
                        <option value="mock">Mock Data (Local)</option>
                        <option value="postgres">PostgreSQL</option>
                        <option value="mysql">MySQL</option>
                        <option value="sqlserver">SQL Server</option>
                        <option value="databricks">Databricks</option>
                        <option value="oracle">Oracle</option>
                    </select>
                </div>

                {config.type !== 'mock' && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-top-4 duration-300">
                        <div className="bg-amber-900/20 border border-amber-800/50 rounded-lg p-4 flex gap-3">
                            <AlertCircle size={20} className="text-amber-400 flex-shrink-0 mt-0.5" />
                            <div className="text-sm text-amber-200">
                                <strong className="block mb-1">Backend Service Required</strong>
                                Real database connections require a backend proxy service. The UI is ready, but connection logic is not yet implemented. Currently using mock data.
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-6 opacity-50 pointer-events-none">
                            <div>
                                <label className="block text-sm font-bold text-slate-400 uppercase mb-2">Host</label>
                                <input
                                    type="text"
                                    value={config.host || ''}
                                    onChange={(e) => onUpdate('host', e.target.value)}
                                    placeholder="localhost"
                                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-3 text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-400 uppercase mb-2">Port</label>
                                <input
                                    type="number"
                                    value={config.port || ''}
                                    onChange={(e) => onUpdate('port', parseInt(e.target.value))}
                                    placeholder="5432"
                                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-3 text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-slate-400 uppercase mb-2">Database Name</label>
                            <input
                                type="text"
                                value={config.database || ''}
                                onChange={(e) => onUpdate('database', e.target.value)}
                                placeholder="my_database"
                                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-3 text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 opacity-50 pointer-events-none"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-6 opacity-50 pointer-events-none">
                            <div>
                                <label className="block text-sm font-bold text-slate-400 uppercase mb-2">Username</label>
                                <input
                                    type="text"
                                    value={config.username || ''}
                                    onChange={(e) => onUpdate('username', e.target.value)}
                                    placeholder="user"
                                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-3 text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-400 uppercase mb-2">Password</label>
                                <input
                                    type="password"
                                    value={config.password || ''}
                                    onChange={(e) => onUpdate('password', e.target.value)}
                                    placeholder="••••••••"
                                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-3 text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                />
                            </div>
                        </div>

                        <div className="flex justify-end pt-4">
                            <button
                                className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold transition-all shadow-lg shadow-emerald-900/40 opacity-50 cursor-not-allowed"
                            >
                                Test Connection
                            </button>
                        </div>
                    </div>
                )}

                {config.type === 'mock' && (
                    <div className="bg-slate-800/30 border border-slate-800 rounded-lg p-4 text-slate-400 text-sm">
                        <p>Using built-in mock data (E-commerce Sales).</p>
                    </div>
                )}
            </div>
        </div>
    );
}
