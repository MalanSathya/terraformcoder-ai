// components/ProviderSelector.jsx
import React from 'react';
import { CloudIcon } from 'lucide-react';

const ProviderSelector = ({ selectedProvider, onProviderChange, className = "" }) => {
  const providers = [
    { key: 'aws', name: 'AWS', color: 'bg-orange-500' },
    { key: 'azure', name: 'Azure', color: 'bg-blue-500' },
    { key: 'gcp', name: 'GCP', color: 'bg-green-500' }
  ];

  return (
    <div className={`flex items-center space-x-4 ${className}`}>
      <label className="text-slate-300 font-medium">Cloud Provider:</label>
      <div className="flex space-x-2">
        {providers.map((provider) => (
          <button
            key={provider.key}
            onClick={() => onProviderChange(provider.key)}
            className={`flex items-center space-x-2 px-3 py-1 rounded-lg text-sm font-medium transition-all duration-200 ${
              selectedProvider === provider.key
                ? 'bg-emerald-500 text-white shadow-lg'
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
          >
            <CloudIcon className="w-3 h-3" />
            <span>{provider.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default ProviderSelector;