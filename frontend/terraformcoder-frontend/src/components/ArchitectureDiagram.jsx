import React, { useState } from 'react';
import { ChevronDownIcon, ChevronUpIcon, EyeIcon, CloudIcon } from 'lucide-react';
import GlassCard from './GlassCard';

const ArchitectureDiagram = ({ diagramUrl, resources }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <GlassCard className="mb-6">
      <div 
        className="flex items-center justify-between cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gradient-to-r from-blue-400 to-purple-500 rounded-lg flex items-center justify-center shadow-lg">
            <EyeIcon className="w-5 h-5 text-white" />
          </div>
          <h3 className="text-xl font-bold bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
            AI-Generated Infrastructure Diagram
          </h3>
        </div>
        {isExpanded ? 
          <ChevronUpIcon className="w-5 h-5 text-slate-400" /> : 
          <ChevronDownIcon className="w-5 h-5 text-slate-400" />
        }
      </div>
      
      {isExpanded && (
        <div className="mt-6 p-6 bg-slate-800/30 backdrop-blur-sm rounded-xl border border-slate-700/30">
          {diagramUrl ? (
            <img 
              src={diagramUrl} 
              alt="Infrastructure Architecture Diagram" 
              className="w-full h-auto rounded-lg border border-slate-600"
            />
          ) : (
            <div className="flex items-center justify-center min-h-[300px] border-2 border-dashed border-slate-600 rounded-lg">
              <div className="text-center">
                <CloudIcon className="w-16 h-16 text-slate-500 mx-auto mb-4" />
                <p className="text-slate-400 text-lg font-medium">Architecture Diagram</p>
                <p className="text-slate-500 text-sm mt-2">Visual representation coming soon</p>
                <p className="text-slate-600 text-xs mt-1">Powered by AI diagram generation</p>
                {resources && resources.length > 0 && (
                  <div className="mt-4 text-xs text-slate-600">
                    Resources: {resources.slice(0, 3).join(', ')}
                    {resources.length > 3 && ` +${resources.length - 3} more`}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </GlassCard>
  );
};

export default ArchitectureDiagram;