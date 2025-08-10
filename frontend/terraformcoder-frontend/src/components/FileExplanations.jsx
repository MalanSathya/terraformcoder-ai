// components/FileExplanations.jsx
import React, { useState } from 'react';
import { ChevronDownIcon, ChevronUpIcon, InfoIcon, FolderIcon, FileText } from 'lucide-react';
import GlassCard from './GlassCard';

const FileExplanations = ({ explanations }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!explanations || Object.keys(explanations).length === 0) {
    return null;
  }

  return (
    <GlassCard className="mt-6">
      <div 
        className="flex items-center justify-between cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gradient-to-r from-purple-400 to-pink-500 rounded-lg flex items-center justify-center shadow-lg">
            <InfoIcon className="w-5 h-5 text-white" />
          </div>
          <h3 className="text-xl font-bold bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
            File & Folder Explanations
          </h3>
        </div>
        {isExpanded ? 
          <ChevronUpIcon className="w-5 h-5 text-slate-400" /> : 
          <ChevronDownIcon className="w-5 h-5 text-slate-400" />
        }
      </div>
      
      {isExpanded && (
        <div className="mt-6 space-y-4">
          {Object.entries(explanations).map(([fileName, explanation]) => (
            <div key={fileName} className="p-4 bg-slate-800/30 backdrop-blur-sm rounded-xl border border-slate-700/30">
              <div className="flex items-center space-x-2 mb-2">
                {fileName.includes('/') ? (
                  <FolderIcon className="w-4 h-4 text-blue-400" />
                ) : (
                  <FileText className="w-4 h-4 text-green-400" />
                )}
                <h4 className="font-semibold text-slate-200 font-mono text-sm">{fileName}</h4>
              </div>
              <p className="text-slate-300 text-sm leading-relaxed">{explanation}</p>
            </div>
          ))}
        </div>
      )}
    </GlassCard>
  );
};

export default FileExplanations;