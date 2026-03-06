import React, { useState, useEffect, useRef } from 'react';
import mermaid from 'mermaid';
import {
  ChevronDownIcon,
  ChevronUpIcon,
  Eye,
  CloudIcon,
  NetworkIcon,
  ArrowRight,
  Download,
  RefreshCw
} from 'lucide-react';
import GlassCard from './GlassCard';

const EnhancedArchitectureDiagram = ({ architectureDiagram, resources, description }) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [diagramError, setDiagramError] = useState(false);
  const mermaidRef = useRef(null);

  useEffect(() => {
    if (architectureDiagram?.diagram_mermaid_syntax && mermaidRef.current) {
      renderMermaidDiagram();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [architectureDiagram?.diagram_mermaid_syntax]);

  const renderMermaidDiagram = async () => {
    try {
      setDiagramError(false);
      mermaid.initialize({
        startOnLoad: false,
        theme: 'dark',
        themeVariables: {
          primaryColor: '#10b981',
          primaryTextColor: '#f1f5f9',
          primaryBorderColor: '#059669',
          lineColor: '#64748b',
          secondaryColor: '#1e293b',
          tertiaryColor: '#334155'
        }
      });

      const diagramId = `mermaid-diagram-${Date.now()}`;
      const { svg } = await mermaid.render(diagramId, architectureDiagram.diagram_mermaid_syntax);

      if (mermaidRef.current) {
        mermaidRef.current.innerHTML = svg;
      }
    } catch (error) {
      console.error("Mermaid rendering failed:", error);
      setDiagramError(true);
      if (mermaidRef.current) {
        mermaidRef.current.innerHTML = `
          <div class="flex items-center justify-center min-h-[200px] text-red-400">
            <div class="text-center">
              <p class="font-medium">Error rendering diagram</p>
              <p class="text-sm text-slate-500 mt-1">Please try regenerating</p>
            </div>
          </div>
        `;
      }
    }
  };

  const handleDownloadDiagram = () => {
    if (mermaidRef.current) {
      const svgElement = mermaidRef.current.querySelector('svg');
      if (svgElement) {
        const svgData = new XMLSerializer().serializeToString(svgElement);
        const blob = new Blob([svgData], { type: 'image/svg+xml' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'architecture-diagram.svg';
        link.click();
        URL.revokeObjectURL(url);
      }
    }
  };

  const getConnectionColor = (type) => {
    switch (type) {
      case 'network': return 'text-blue-400';
      case 'data': return 'text-green-400';
      case 'traffic': return 'text-orange-400';
      default: return 'text-slate-400';
    }
  };

  function getComponentIcon(component) {
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
  }

  if (!architectureDiagram) {
    return null;
  }

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
        <div className="flex items-center space-x-2">
          {isExpanded ?
            <ChevronUpIcon className="w-5 h-5 text-slate-400" /> :
            <ChevronDownIcon className="w-5 h-5 text-slate-400" />
          }
        </div>
      </div>

      {isExpanded && (
        <div className="mt-6">
          {/* Enhanced Diagram Display Section */}
          <div className="p-6 bg-slate-800/30 backdrop-blur-sm rounded-xl border border-slate-700/30 mb-6">
            {/* Diagram Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <NetworkIcon className="w-5 h-5 text-blue-400" />
                <h4 className="font-semibold text-slate-200">Infrastructure Architecture</h4>
              </div>

              {/* Mermaid Chart Integration */}
              {architectureDiagram?.mermaid_chart_url && (
                <div className="flex items-center space-x-2">
                  <span className="text-xs text-slate-500">Powered by MermaidChart.com</span>
                </div>
              )}
            </div>

            {/* Diagram Display */}
            {architectureDiagram?.diagram_mermaid_syntax ? (
              <div className="relative">
                <div
                  ref={mermaidRef}
                  className="mermaid-diagram-container text-slate-300 flex justify-center items-center min-h-[300px] bg-slate-900/50 rounded-lg border border-slate-700/30 overflow-auto"
                >
                  {/* Mermaid diagram will be rendered here */}
                </div>

                {/* Diagram Controls */}
                <div className="absolute top-3 right-3 flex items-center space-x-2">
                  <button
                    onClick={() => renderMermaidDiagram()}
                    className="p-2 bg-slate-800/80 backdrop-blur-sm hover:bg-slate-700/80 rounded-lg transition-colors duration-200 border border-slate-600/50"
                    title="Refresh Diagram"
                  >
                    <RefreshCw className="w-4 h-4 text-slate-300" />
                  </button>
                  <button
                    onClick={handleDownloadDiagram}
                    className="p-2 bg-blue-600/80 backdrop-blur-sm hover:bg-blue-500/80 rounded-lg transition-colors duration-200 border border-blue-500/50"
                    title="Download SVG"
                  >
                    <Download className="w-4 h-4 text-white" />
                  </button>
                </div>

                {/* Error state */}
                {diagramError && (
                  <div className="absolute inset-0 flex items-center justify-center bg-slate-900/90 rounded-lg">
                    <div className="text-center">
                      <CloudIcon className="w-12 h-12 text-slate-500 mx-auto mb-3" />
                      <p className="text-slate-400 font-medium">Diagram Render Error</p>
                      <p className="mt-2 text-sm text-slate-500">Try regenerating the infrastructure code</p>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center justify-center min-h-[300px] border-2 border-dashed border-slate-600 rounded-lg">
                <div className="text-center">
                  <CloudIcon className="w-16 h-16 text-slate-500 mx-auto mb-4" />
                  <p className="text-slate-400 text-lg font-medium">Architecture Diagram</p>
                  <p className="text-slate-500 text-sm mt-2">No diagram generated for this request.</p>
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

          {/* Components, Resources, and Data Flow — 3-column row */}
          {architectureDiagram?.components && architectureDiagram.components.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Components */}
              <div className="p-3 bg-slate-800/30 backdrop-blur-sm rounded-xl border border-slate-700/30">
                <div className="flex items-center gap-1.5 mb-2">
                  <div className="w-3 h-3 bg-emerald-400 rounded-full"></div>
                  <h4 className="font-semibold text-slate-200 text-xs">Components</h4>
                  <span className="px-1.5 py-0.5 bg-emerald-500/20 text-emerald-300 rounded text-[10px]">
                    {architectureDiagram.components.length}
                  </span>
                </div>
                <div className="space-y-1 max-h-48 overflow-y-auto">
                  {architectureDiagram.components.map((component, index) => (
                    <div key={index} className="flex items-center gap-2 p-1.5 bg-slate-900/50 rounded-lg text-xs">
                      <span>{getComponentIcon(component)}</span>
                      <span className="text-slate-300 truncate">{component}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Resources */}
              {resources && resources.length > 0 && (
                <div className="p-3 bg-slate-800/30 backdrop-blur-sm rounded-xl border border-slate-700/30">
                  <div className="flex items-center gap-1.5 mb-2">
                    <div className="w-3 h-3 bg-indigo-400 rounded-full"></div>
                    <h4 className="font-semibold text-slate-200 text-xs">Resources</h4>
                    <span className="px-1.5 py-0.5 bg-indigo-500/20 text-indigo-300 rounded text-[10px]">
                      {resources.length}
                    </span>
                  </div>
                  <div className="space-y-1 max-h-48 overflow-y-auto">
                    {resources.map((resource, idx) => (
                      <div key={idx} className="text-xs text-slate-400 truncate p-1.5 bg-slate-900/50 rounded-lg">
                        {resource}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Data Flow */}
              {architectureDiagram?.connections && architectureDiagram.connections.length > 0 && (
                <div className="p-3 bg-slate-800/30 backdrop-blur-sm rounded-xl border border-slate-700/30">
                  <div className="flex items-center gap-1.5 mb-2">
                    <ArrowRight className="w-3 h-3 text-blue-400" />
                    <h4 className="font-semibold text-slate-200 text-xs">Data Flow</h4>
                    <span className="px-1.5 py-0.5 bg-blue-500/20 text-blue-300 rounded text-[10px]">
                      {architectureDiagram.connections.length}
                    </span>
                  </div>
                  <div className="space-y-1 max-h-48 overflow-y-auto">
                    {architectureDiagram.connections.map((connection, index) => (
                      <div key={index} className="flex items-center gap-1 p-1.5 bg-slate-900/50 rounded-lg text-xs">
                        <span className="text-slate-300 truncate flex-1">{connection.from}</span>
                        <ArrowRight className={`w-2.5 h-2.5 ${getConnectionColor(connection.type)} flex-shrink-0`} />
                        <span className="text-slate-300 truncate flex-1">{connection.to}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </GlassCard>
  );
};

export default EnhancedArchitectureDiagram;