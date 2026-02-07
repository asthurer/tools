import { useState, useMemo } from 'react';
import { HexColorPicker } from 'react-colorful';
import { colord, extend } from 'colord';
import namesPlugin from 'colord/plugins/names';
import a11yPlugin from 'colord/plugins/a11y';

extend([namesPlugin, a11yPlugin]);

export function ColorConverter() {
    const [color, setColor] = useState('#10b981'); // Initial emerald-500

    const colorData = useMemo(() => {
        const c = colord(color);
        return {
            hex: c.toHex(),
            rgb: c.toRgbString(),
            hsl: c.toHslString(),
            name: c.toName({ closest: true }) || 'Unknown',
            brightness: c.brightness(),
            isLight: c.isLight(),
            isDark: c.isDark(),
            readableOnWhite: c.isReadable('#ffffff'),
            readableOnBlack: c.isReadable('#000000'),
        };
    }, [color]);

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
    };

    return (
        <div className="h-full flex flex-col">
            <header className="mb-4">
                <h2 className="text-2xl font-bold text-slate-100">Color Converter</h2>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 flex-1 min-h-0 overflow-auto">

                {/* Picker Column */}
                <div className="flex flex-col gap-4 items-center">
                    <div className="w-full max-w-xs">
                        <HexColorPicker color={color} onChange={setColor} style={{ width: '100%', height: '200px' }} />
                    </div>

                    <div className="w-full max-w-xs space-y-4">
                        <div className="flex flex-col space-y-1">
                            <label className="text-xs font-semibold text-slate-400">HEX input</label>
                            <input
                                type="text"
                                value={color}
                                onChange={(e) => setColor(e.target.value)}
                                className="bg-slate-800 border border-slate-700 rounded-lg p-2 focus:ring-2 focus:ring-emerald-500 focus:outline-none font-mono text-sm"
                            />
                        </div>
                    </div>

                    {/* Color Preview Box */}
                    <div
                        className="w-full max-w-xs h-24 rounded-lg shadow-lg flex items-center justify-center border border-slate-700"
                        style={{ backgroundColor: colorData.hex }}
                    >
                        <span
                            className={`font-mono font-bold text-lg ${colorData.isLight ? 'text-black' : 'text-white'}`}
                        >
                            {colorData.hex}
                        </span>
                    </div>
                </div>

                {/* Info Column */}
                <div className="flex flex-col gap-4">
                    <div className="bg-slate-800 border border-slate-700 rounded-lg p-6 space-y-4">
                        <h3 className="tex-lg font-semibold text-slate-200 border-b border-slate-700 pb-2">Color Formats</h3>

                        {[
                            { label: 'HEX', value: colorData.hex },
                            { label: 'RGB', value: colorData.rgb },
                            { label: 'HSL', value: colorData.hsl },
                            { label: 'Name', value: colorData.name },
                        ].map((item) => (
                            <div key={item.label} className="flex justify-between items-center group">
                                <span className="text-sm text-slate-400">{item.label}</span>
                                <div className="flex items-center gap-2">
                                    <span className="text-sm font-mono text-emerald-300">{item.value}</span>
                                    <button
                                        onClick={() => copyToClipboard(item.value)}
                                        className="text-xs text-slate-500 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                        Copy
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="bg-slate-800 border border-slate-700 rounded-lg p-6 space-y-4">
                        <h3 className="tex-lg font-semibold text-slate-200 border-b border-slate-700 pb-2">Analysis</h3>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <span className="text-sm text-slate-400 block mb-1">State</span>
                                <span className="text-sm text-slate-200">{colorData.isLight ? 'Light' : 'Dark'}</span>
                            </div>
                            <div>
                                <span className="text-sm text-slate-400 block mb-1">Brightness</span>
                                <span className="text-sm text-slate-200">{(colorData.brightness * 100).toFixed(0)}%</span>
                            </div>
                        </div>

                        <div>
                            <span className="text-sm text-slate-400 block mb-2">Accessibility (Contrast)</span>
                            <div className="flex gap-2">
                                <span className={`px-2 py-1 rounded text-xs font-bold ${colorData.readableOnWhite ? 'bg-green-900 text-green-200' : 'bg-red-900 text-red-200'}`}>
                                    On White
                                </span>
                                <span className={`px-2 py-1 rounded text-xs font-bold ${colorData.readableOnBlack ? 'bg-green-900 text-green-200' : 'bg-red-900 text-red-200'}`}>
                                    On Black
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}
