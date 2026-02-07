import { useState } from 'react';
import type { AISettings, AIProviderType } from '../types';

interface SettingsProps {
    settings: AISettings;
    onSave: (settings: AISettings) => void;
    onClose: () => void;
}

export function Settings({ settings, onSave, onClose }: SettingsProps) {
    const [formData, setFormData] = useState<AISettings>(settings);

    const handleSave = () => {
        onSave(formData);
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 backdrop-blur-sm">
            <div className="bg-slate-800 rounded-2xl p-6 w-full max-w-md border border-slate-700 shadow-2xl">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold text-white">Settings</h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div className="space-y-4">
                    {/* Provider Selection */}
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">AI Provider</label>
                        <select
                            value={formData.provider}
                            onChange={(e) => setFormData({ ...formData, provider: e.target.value as AIProviderType })}
                            className="w-full bg-slate-700 border border-slate-600 rounded-lg py-2 px-3 text-white focus:ring-2 focus:ring-orange-500 focus:outline-none"
                        >
                            <option value="gemini">Google Gemini</option>
                            <option value="openai">OpenAI</option>
                        </select>
                    </div>

                    {/* Model */}
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">Embedding Model</label>
                        <input
                            type="text"
                            value={formData.model}
                            onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                            placeholder={formData.provider === 'gemini' ? 'text-embedding-004' : 'text-embedding-3-small'}
                            className="w-full bg-slate-700 border border-slate-600 rounded-lg py-2 px-3 text-white focus:ring-2 focus:ring-orange-500 focus:outline-none"
                        />
                    </div>

                    {/* API Key */}
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">API Key</label>
                        <input
                            type="password"
                            value={formData.apiKey}
                            onChange={(e) => setFormData({ ...formData, apiKey: e.target.value })}
                            placeholder="Enter your API key..."
                            className="w-full bg-slate-700 border border-slate-600 rounded-lg py-2 px-3 text-white focus:ring-2 focus:ring-orange-500 focus:outline-none"
                        />
                    </div>
                </div>

                <div className="flex gap-3 mt-6">
                    <button
                        onClick={onClose}
                        className="flex-1 bg-slate-700 hover:bg-slate-600 text-white py-2 rounded-lg transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        className="flex-1 bg-orange-600 hover:bg-orange-500 text-white py-2 rounded-lg transition-colors font-medium"
                    >
                        Save
                    </button>
                </div>
            </div>
        </div>
    );
}
