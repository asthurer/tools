import React, { useState } from 'react';
import { Database, Table, GripHorizontal, ChevronUp, ChevronDown } from 'lucide-react';
import { Panel, Group as PanelGroup, Separator as PanelResizeHandle, usePanelRef } from 'react-resizable-panels';

import { VizContent } from './VizContent';

interface ResultsViewProps {
    data: any[];
    sql?: string;
    vizConfig?: any;
}

export const ResultsView: React.FC<ResultsViewProps> = ({ data, sql, vizConfig }) => {
    const vizPanelRef = usePanelRef();
    const [isVizCollapsed, setIsVizCollapsed] = useState(false);

    if (!data || data.length === 0) {
        return (
            <div className="h-full flex flex-col items-center justify-center text-slate-500 bg-slate-900/50 rounded-xl border border-slate-800 p-8 border-dashed">
                <Database size={48} className="mb-4 opacity-50" />
                <p>No data to display yet.</p>
                <p className="text-sm mt-1">Run a query to see results here.</p>
            </div>
        );
    }

    const columns = Object.keys(data[0]);

    if (!vizConfig) {
        return (
            <div className="h-full flex flex-col bg-slate-900 rounded-xl border border-slate-700 shadow-xl overflow-hidden">
                <div className="bg-slate-800 p-4 border-b border-slate-700 flex justify-between items-center shrink-0">
                    <h3 className="font-semibold text-white flex items-center gap-2">
                        <Table size={18} className="text-blue-400" />
                        Query Results
                    </h3>
                    <span className="text-xs text-slate-400 bg-slate-900 px-2 py-1 rounded-md border border-slate-700">
                        {data.length} rows found
                    </span>
                </div>
                <div className="flex-1 overflow-auto custom-scrollbar">
                    <TableContent columns={columns} data={data} />
                </div>
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col bg-slate-900 rounded-xl border border-slate-700 shadow-xl overflow-hidden">
            <div className="bg-slate-800 p-4 border-b border-slate-700 flex justify-between items-center shrink-0 z-10">
                <h3 className="font-semibold text-white flex items-center gap-2">
                    <Table size={18} className="text-blue-400" />
                    Query Results
                </h3>
                <span className="text-xs text-slate-400 bg-slate-900 px-2 py-1 rounded-md border border-slate-700">
                    {data.length} rows found
                </span>
            </div>

            <PanelGroup orientation="vertical" className="flex-1 min-h-0">
                {/* Panel 1: Table (Top) */}
                <Panel className="flex flex-col min-h-0 bg-slate-900">
                    <div className="flex-1 overflow-auto custom-scrollbar">
                        <TableContent columns={columns} data={data} />
                    </div>
                </Panel>

                <PanelResizeHandle className="h-4 flex items-center justify-center bg-slate-800/50 hover:bg-slate-700/50 transition-colors group relative z-10 focus:outline-none border-y border-slate-700/50">
                    <div className="w-12 h-1 bg-slate-600 rounded-full group-hover:bg-blue-500/50 transition-colors flex items-center justify-center">
                        <GripHorizontal size={12} className="text-slate-400" />
                    </div>
                    <button
                        onClick={() => {
                            const p = vizPanelRef.current;
                            if (p) p.isCollapsed() ? p.expand() : p.collapse();
                        }}
                        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity p-1 bg-slate-800 rounded-full border border-slate-600 hover:bg-slate-700 z-20"
                    >
                        {isVizCollapsed ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </button>
                </PanelResizeHandle>

                {/* Panel 2: Chart (Bottom) */}
                <Panel
                    panelRef={vizPanelRef}
                    defaultSize={40}
                    minSize={25}
                    collapsible
                    onResize={(size) => {
                        const isCollapsed = size.asPercentage === 0;
                        if (isCollapsed !== isVizCollapsed) {
                            setIsVizCollapsed(isCollapsed);
                        }
                    }}
                    className="flex flex-col min-h-0 border-t border-slate-700"
                >
                    <div className="h-full p-4 overflow-hidden bg-slate-900/50">
                        <VizContent data={data} config={vizConfig} />
                    </div>
                </Panel>
            </PanelGroup>
        </div>
    );
};

const TableContent = ({ columns, data }: { columns: string[], data: any[] }) => (
    <table className="w-full text-left text-sm text-slate-300">
        <thead className="bg-slate-800/50 text-slate-400 sticky top-0 backdrop-blur-sm z-10">
            <tr>
                {columns.map((col) => (
                    <th key={col} className="px-6 py-3 font-medium uppercase text-xs tracking-wider border-b border-slate-700">
                        {col.replace(/_/g, ' ')}
                    </th>
                ))}
            </tr>
        </thead>
        <tbody className="divide-y divide-slate-800">
            {data.map((row, idx) => (
                <tr key={idx} className="hover:bg-slate-800/30 transition-colors">
                    {columns.map((col) => (
                        <td key={`${idx}-${col}`} className="px-6 py-4 whitespace-nowrap">
                            {row[col]}
                        </td>
                    ))}
                </tr>
            ))}
        </tbody>
    </table>
);
