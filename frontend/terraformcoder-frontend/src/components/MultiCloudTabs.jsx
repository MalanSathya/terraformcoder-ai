import React, { useState } from 'react';
import { CloudIcon, Copy } from 'lucide-react';

const MultiCloudTabs = ({ multiCloudCode, onCopy }) => {
  const [activeTab, setActiveTab] = useState('aws');

  const providers = [
    { key: 'aws', name: 'AWS', icon: CloudIcon, color: 'from-orange-400 to-yellow-500' },
    { key: 'azure', name: 'Azure', icon: CloudIcon, color: 'from-blue-400 to-cyan-500' },
    { key: 'gcp', name: 'GCP', icon: CloudIcon, color: 'from-green-400 to-emerald-500' }
  ];

  const handleCopy = () => {
    const code = multiCloudCode?.[activeTab] || '';
    if (onCopy) {
      onCopy(code);
    } else {
      navigator.clipboard.writeText(code);
    }
  };

  return (
    <div className="mb-6">
      <div className="flex space-x-2 mb-4">
        {providers.map((provider) => {
          const Icon = provider.icon;
          return (
            <button
              key={provider.key}
              onClick={() => setActiveTab(provider.key)}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                activeTab === provider.key
                  ? 'bg-gradient-to-r ' + provider.color + ' text-white shadow-lg'
                  : 'bg-slate-800/50 text-slate-400 hover:text-white hover:bg-slate-700/50'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{provider.name}</span>
            </button>
          );
        })}
      </div>
      
      <div className="relative">
        <pre className="bg-slate-900/80 backdrop-blur-sm border border-slate-700/50 text-emerald-300 p-6 rounded-xl overflow-auto text-sm leading-relaxed shadow-inner max-h-96 font-mono">
          <code>
            {multiCloudCode?.[activeTab] || `# ${activeTab.toUpperCase()} code not available`}
          </code>
        </pre>
        <button
          onClick={handleCopy}
          className="absolute top-4 right-4 p-2 bg-slate-800/80 hover:bg-slate-700/80 rounded-lg text-slate-400 hover:text-white transition-all duration-200"
          title="Copy code"
        >
          <Copy className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default MultiCloudTabs;