import React, { useState } from 'react';
import { ChevronDownIcon, ChevronUpIcon, Eye, CloudIcon, NetworkIcon, ArrowRight } from 'lucide-react';
import GlassCard from './GlassCard';
import { API_BASE_URL } from '../services/api';

const EnhancedArchitectureDiagram = ({ architectureDiagram, resources, description }) => {
  const [isExpanded, setIsExpanded] = useState(true);

  // Component icons mapping
  const getComponentIcon = (component) => {
    const componentLower = component.toLowerCase();
    if (componentLower.includes('compute') || componentLower.includes('instance')) {
      return '🖥️';
    } else if (componentLower.includes('network') || componentLower.includes('vpc')) {
      return '🌐';
    } else if (componentLower.includes('database')) {
      return '🗄️';
    } else if (componentLower.includes('load balancer')) {
      return '⚖️';
    } else if (componentLower.includes('storage')) {
      return '💾';
    } else if (componentLower.includes('security')) {
      return '🛡️';
    }
    return '🔧';
  };

  const getConnectionColor = (type) => {
    switch (type) {
      case 'network': return 'text-blue-400';
      case 'data': return 'text-green-400';
      case 'traffic': return 'text-orange-400';
      default: return 'text-slate-400';
    }
  };

  return (
    <GlassCard className="mb-6">
      <div 
        className="flex items-center justify-between cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gradient-to-r from-blue-400 to-purple-500 rounded-lg flex items-center justify-center shadow-lg">
            <Eye className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-xl font-bold bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
              Architecture Diagram
            </h3>
            <p className="text-sm text-slate-400">AI-powered infrastructure visualization</p>
          </div>
        </div>
        {isExpanded ? 
          <ChevronUpIcon className="w-5 h-5 text-slate-400" /> : 
          <ChevronDownIcon className="w-5 h-5 text-slate-400" />
        }
      </div>
      
      {isExpanded && (
        <div className="mt-6">
          {/* Diagram Display Section */}
          <div className="p-6 bg-slate-800/30 backdrop-blur-sm rounded-xl border border-slate-700/30 mb-6">
            {architectureDiagram?.diagram_url ? (
              <img 
                src={`${API_BASE_URL}${architectureDiagram.diagram_url}`} 
                alt="Infrastructure Architecture Diagram" 
                className="w-full h-auto rounded-lg border border-slate-600"
              />
            ) : (
              <div className="flex items-center justify-center min-h-[300px] border-2 border-dashed border-slate-600 rounded-lg">
                <div className="text-center">
                  <CloudIcon className="w-16 h-16 text-slate-500 mx-auto mb-4" />
                  <p className="text-slate-400 text-lg font-medium">Architecture Diagram</p>
                  <p className="text-slate-500 text-sm mt-2">No diagram generated.</p>
                </div>
              </div>
            )}
          </div>

          {/* Architecture Description */}
          {architectureDiagram?.diagram_description && (
            <div className="p-4 bg-slate-800/30 backdrop-blur-sm rounded-xl border border-slate-700/30 mb-6">
              <div className="flex items-center space-x-2 mb-3">
                <NetworkIcon className="w-5 h-5 text-cyan-400" />
                <h4 className="font-semibold text-slate-200">Architecture Overview</h4>
              </div>
              <p className="text-slate-300 text-sm leading-relaxed">
                {architectureDiagram.diagram_description}
              </p>
            </div>
          )}

          {/* Components and Connections */}
          {architectureDiagram?.components && architectureDiagram.components.length > 0 && (
            <div className="grid md:grid-cols-2 gap-6">
              {/* Components */}
              <div className="p-4 bg-slate-800/30 backdrop-blur-sm rounded-xl border border-slate-700/30">
                <div className="flex items-center space-x-2 mb-3">
                  <div className="w-4 h-4 bg-emerald-400 rounded-full"></div>
                  <h4 className="font-semibold text-slate-200">Components</h4>
                </div>
                <div className="space-y-2">
                  {architectureDiagram.components.map((component, index) => (
                    <div key={index} className="flex items-center space-x-3 p-2 bg-slate-900/50 rounded-lg">
                      <span className="text-xl">{getComponentIcon(component)}</span>
                      <span className="text-slate-300 text-sm">{component}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Connections */}
              {architectureDiagram?.connections && architectureDiagram.connections.length > 0 && (
                <div className="p-4 bg-slate-800/30 backdrop-blur-sm rounded-xl border border-slate-700/30">
                  <div className="flex items-center space-x-2 mb-3">
                    <ArrowRight className="w-4 h-4 text-blue-400" />
                    <h4 className="font-semibold text-slate-200">Connections</h4>
                  </div>
                  <div className="space-y-2">
                    {architectureDiagram.connections.map((connection, index) => (
                      <div key={index} className="flex items-center space-x-2 p-2 bg-slate-900/50 rounded-lg text-sm">
                        <span className="text-slate-300">{connection.from}</span>
                        <ArrowRight className={`w-3 h-3 ${getConnectionColor(connection.type)}`} />
                        <span className="text-slate-300">{connection.to}</span>
                        <span className={`px-2 py-0.5 rounded text-xs ${getConnectionColor(connection.type)} bg-current bg-opacity-20`}>
                          {connection.type}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Resource Summary */}
          {resources && resources.length > 0 && (
            <div className="mt-6 p-4 bg-slate-800/30 backdrop-blur-sm rounded-xl border border-slate-700/30">
              <div className="flex items-center space-x-2 mb-3">
                <div className="w-4 h-4 bg-purple-400 rounded-full"></div>
                <h4 className="font-semibold text-slate-200">Infrastructure Resources</h4>
              </div>
              <div className="flex flex-wrap gap-2">
                {resources.slice(0, 8).map((resource, index) => (
                  <span key={index} className="px-3 py-1 bg-purple-500/20 text-purple-300 rounded-full text-xs font-medium border border-purple-500/30">
                    {resource}
                  </span>
                ))}
                {resources.length > 8 && (
                  <span className="px-3 py-1 bg-slate-500/20 text-slate-300 rounded-full text-xs font-medium border border-slate-500/30">
                    +{resources.length - 8} more
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </GlassCard>
  );
};

export default EnhancedArchitectureDiagram;
