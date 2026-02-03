
import React from 'react';

interface TimerProps {
  seconds: number;
  label: string;
  isUrgent?: boolean;
}

export const Timer: React.FC<TimerProps> = ({ seconds, label, isUrgent }) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  
  return (
    <div className={`flex flex-col items-center p-3 rounded-lg border transition-colors ${
        isUrgent ? 'bg-red-50 border-red-200 text-red-600' : 'bg-white border-slate-200 text-slate-600'
    }`}>
      <span className="text-[10px] uppercase font-bold tracking-wider mb-1 opacity-70">{label}</span>
      <span className="text-2xl font-mono font-bold leading-none">
        {String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')}
      </span>
    </div>
  );
};
