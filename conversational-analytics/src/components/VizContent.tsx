import React from 'react';
import {
    BarChart,
    Bar,
    LineChart,
    Line,
    PieChart,
    Pie,
    Cell,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer
} from 'recharts';

interface VizConfig {
    type: 'bar' | 'line' | 'pie';
    xKey: string;
    yKey: string;
    title: string;
}

interface VizContentProps {
    data: any[];
    config: VizConfig;
}

const COLORS = ['#2563eb', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#d4af37'];

const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-foundry-900 border border-foundry-700 p-2 shadow-xl rounded-sm">
                <p className="text-foundry-400 text-[10px] uppercase tracking-wider mb-1">{label}</p>
                {payload.map((entry: any, index: number) => (
                    <p key={index} className="text-xs font-mono font-bold" style={{ color: entry.color }}>
                        {entry.name}: {entry.value}
                    </p>
                ))}
            </div>
        );
    }
    return null;
};

export const VizContent: React.FC<VizContentProps> = ({ data, config }) => {
    if (!data || data.length === 0) return null;

    return (
        <div className="w-full h-full bg-foundry-950 rounded-sm border border-foundry-800 p-3 relative group">
            <h3 className="text-xs font-bold text-foundry-400 uppercase tracking-widest absolute top-3 left-3 bg-foundry-950 px-2 py-0.5 border border-foundry-800 rounded-sm z-10 opacity-70 group-hover:opacity-100 transition-opacity">
                {config.title}
            </h3>
            <ResponsiveContainer width="100%" height="100%">
                {config.type === 'bar' ? (
                    <BarChart data={data} margin={{ top: 30, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" vertical={false} />
                        <XAxis
                            dataKey={config.xKey}
                            stroke="#555"
                            fontSize={10}
                            tickLine={false}
                            axisLine={{ stroke: '#2a2a2a' }}
                            tick={{ fill: '#888' }}
                        />
                        <YAxis
                            stroke="#555"
                            fontSize={10}
                            tickLine={false}
                            axisLine={false}
                            tick={{ fill: '#888' }}
                        />
                        <Tooltip content={<CustomTooltip />} cursor={{ fill: '#2a2a2a', opacity: 0.4 }} />
                        <Bar dataKey={config.yKey} fill="#3b82f6" radius={[2, 2, 0, 0]} maxBarSize={50} />
                    </BarChart>
                ) : config.type === 'line' ? (
                    <LineChart data={data} margin={{ top: 30, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" vertical={false} />
                        <XAxis
                            dataKey={config.xKey}
                            stroke="#555"
                            fontSize={10}
                            tickLine={false}
                            axisLine={{ stroke: '#2a2a2a' }}
                            tick={{ fill: '#888' }}
                        />
                        <YAxis
                            stroke="#555"
                            fontSize={10}
                            tickLine={false}
                            axisLine={false}
                            tick={{ fill: '#888' }}
                        />
                        <Tooltip content={<CustomTooltip />} />
                        <Line
                            type="monotone"
                            dataKey={config.yKey}
                            stroke="#10b981"
                            strokeWidth={2}
                            dot={{ r: 2, fill: '#10b981', strokeWidth: 0 }}
                            activeDot={{ r: 4, strokeWidth: 0 }}
                        />
                    </LineChart>
                ) : (
                    <PieChart>
                        <Pie
                            data={data}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={80}
                            paddingAngle={2}
                            dataKey={config.yKey}
                            nameKey={config.xKey}
                        >
                            {data.map((_entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="#0a0a0a" strokeWidth={2} />
                            ))}
                        </Pie>
                        <Tooltip content={<CustomTooltip />} />
                        <Legend
                            layout="vertical"
                            verticalAlign="middle"
                            align="right"
                            iconType="circle"
                            iconSize={8}
                            wrapperStyle={{ fontSize: '10px', color: '#888' }}
                        />
                    </PieChart>
                )}
            </ResponsiveContainer>
        </div>
    );
};
