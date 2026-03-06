import React from 'react';
import { Cloud } from 'lucide-react';

const providers = [
  { key: 'aws', name: 'AWS', emoji: '☁️' },
  { key: 'azure', name: 'Azure', emoji: '🔷' },
  { key: 'gcp', name: 'GCP', emoji: '🌐' },
];

const ProviderSelector = ({ selectedProvider, onProviderChange, className = '' }) => {
  return (
    <div className={`flex items-center gap-2 flex-wrap ${className}`}>
      {providers.map((p) => (
        <button
          key={p.key}
          onClick={() => onProviderChange(p.key)}
          className={`
            inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium
            transition-all duration-200 border
            ${selectedProvider === p.key
              ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300 shadow-lg shadow-emerald-500/10'
              : 'bg-white/[0.04] border-white/[0.08] text-slate-400 hover:bg-white/[0.08] hover:text-slate-200 hover:border-white/[0.15]'
            }
          `}
        >
          <span className="text-base">{p.emoji}</span>
          <span>{p.name}</span>
        </button>
      ))}
    </div>
  );
};

export default ProviderSelector;