import React, { useState, useEffect, useRef } from 'react';
import mermaid from 'mermaid';
import { 
  ChevronDownIcon, 
  ChevronUpIcon, 
  Eye, 
  CloudIcon, 
  NetworkIcon, 
  ArrowRight, 
  ExternalLink, 
  Copy, 
  Download,
  Maximize2,
  RefreshCw
} from 'lucide-react';
import GlassCard from './GlassCard';

const EnhancedArchitectureDiagram = ({ architectureDiagram, resources, description }) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [diagramError, setDiagramError] = useState(false);
  const [isLoadingChart, setIsLoadingChart] = useState(false);
  const mermaidRef = useRef(null);

  useEffect(() => {
    if (architectureDiagram?.diagram_mermaid_syntax && mermaidRef.current) {
      renderMermaidDiagram();
    }
  }, [architectureDiagram?.diagram_mermaid_syntax]);

  async function fetchMermaidSecure(code) {
  try {
    const res = await fetch('/api/mermaid/render', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
      },
      body: JSON.stringify({ code, format: 'svg', theme: 'dark' })
    });

    if (!res.ok) throw new Error(await res.text());
    const svgText = await res.text();
    mermaidRef.current.innerHTML = svgText;
  } catch (err) {
    console.error("Secure Mermaid render failed:", err);
  }
}

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
              <p class="text-sm text-slate-500 mt-1">Please try regenerating or use the external link</p>
            </div>
          </div>
        `;
      }
    }
  };

  const handleCopyMermaidCode = () => {
    if (architectureDiagram?.diagram_mermaid_syntax) {
      navigator.clipboard.writeText(architectureDiagram.diagram_mermaid_syntax);
      // TODO: Add toast notification
    }
  };

  const handleOpenInMermaidChart = () => {
    if (architectureDiagram?.mermaid_chart_url) {
      window.open(architectureDiagram.mermaid_chart_url, '_blank');
    } else {
      // Fallback: Create a direct mermaid.live link
      const encodedDiagram = encodeURIComponent(architectureDiagram?.diagram_mermaid_syntax || '');
      const mermaidLiveUrl = `https://mermaid.live/edit#pako:eNpVjstqw0AMRX_F6HWS_AFeFBq3dBG6KYRC2YxHY1tjzwhpJjFh_r2yncYk7Ubc6z7eR-i8EQVaEiKGTgMBJR7_TK3X2lhf0gAyAX2t5NbIb_k_RdOdKEsyGO2t1fA_${encodedDiagram}`;
      window.open(mermaidLiveUrl, '_blank');
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

  // // Component icons mapping
  // const getComponentIcon = (component) => {
  //   const componentLower = component.toLowerCase();
  //   if (componentLower.includes('compute') || componentLower.includes('instance')) {
  //     return '🖥️';
  //   } else if (componentLower.includes('network') || componentLower.includes('vpc')) {
  //     return '🌐';
  //   } else if (componentLower.includes('database')) {
  //     return '🗄️';
  //   } else if (componentLower.includes('load balancer')) {
  //     return '⚖️';
  //   } else if (componentLower.includes('storage')) {
  //     return '💾';
  //   } else if (componentLower.includes('security')) {
  //     return '🛡️';
  //   }
  //   return '🔧';
  // };

  const getConnectionColor = (type) => {
    switch (type) {
      case 'network': return 'text-blue-400';
      case 'data': return 'text-green-400';
      case 'traffic': return 'text-orange-400';
      default: return 'text-slate-400';
    }
  };

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
          {/* Action buttons */}
          {isExpanded && (
            <div className="flex items-center space-x-1" onClick={(e) => e.stopPropagation()}>
              <button
                onClick={handleCopyMermaidCode}
                className="p-2 bg-slate-700/50 hover:bg-slate-600/50 rounded-lg transition-colors duration-200"
                title="Copy Mermaid Code"
              >
                <Copy className="w-4 h-4 text-slate-300" />
              </button>
              <button
                onClick={handleOpenInMermaidChart}
                className="p-2 bg-slate-700/50 hover:bg-slate-600/50 rounded-lg transition-colors duration-200"
                title="Open in Mermaid Chart"
              >
                <ExternalLink className="w-4 h-4 text-slate-300" />
              </button>
              <button
                onClick={handleDownloadDiagram}
                className="p-2 bg-slate-700/50 hover:bg-slate-600/50 rounded-lg transition-colors duration-200"
                title="Download SVG"
              >
                <Download className="w-4 h-4 text-slate-300" />
              </button>
            </div>
          )}
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
                  <span className="text-xs text-slate-500">Powered by</span>
                  <a
                    href={architectureDiagram.mermaid_chart_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center space-x-1 px-3 py-1 bg-emerald-500/20 text-emerald-300 rounded-lg text-xs font-medium border border-emerald-500/30 hover:bg-emerald-500/30 transition-colors duration-200"
                  >
                    <span>MermaidChart.com</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
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
                    onClick={handleOpenInMermaidChart}
                    className="p-2 bg-emerald-600/80 backdrop-blur-sm hover:bg-emerald-500/80 rounded-lg transition-colors duration-200 border border-emerald-500/50"
                    title="Open in Full Editor"
                  >
                    <Maximize2 className="w-4 h-4 text-white" />
                  </button>
                </div>

                {/* Error state */}
                {diagramError && (
                  <div className="absolute inset-0 flex items-center justify-center bg-slate-900/90 rounded-lg">
                    <div className="text-center">
                      <CloudIcon className="w-12 h-12 text-slate-500 mx-auto mb-3" />
                      <p className="text-slate-400 font-medium">Diagram Render Error</p>
                      <button
                        onClick={handleOpenInMermaidChart}
                        className="mt-3 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-sm rounded-lg transition-colors duration-200"
                      >
                        View in External Editor
                      </button>
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

          {/* Components and Connections */}
          {architectureDiagram?.components && architectureDiagram.components.length > 0 && (
            <div className="grid md:grid-cols-2 gap-6">
              {/* Components */}
              <div className="p-4 bg-slate-800/30 backdrop-blur-sm rounded-xl border border-slate-700/30">
                <div className="flex items-center space-x-2 mb-3">
                  <div className="w-4 h-4 bg-emerald-400 rounded-full"></div>
                  <h4 className="font-semibold text-slate-200">Components</h4>
                  <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 rounded text-xs">
                    {architectureDiagram.components.length}
                  </span>
                </div>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {architectureDiagram.components.map((component, index) => (
                    <div key={index} className="flex items-center space-x-3 p-2 bg-slate-900/50 rounded-lg hover:bg-slate-900/70 transition-colors duration-200">
                      <span className="text-xl">{getComponentIcon(component)}</span>
                      <span className="text-slate-300 text-sm flex-1">{component}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Connections */}
              {architectureDiagram?.connections && architectureDiagram.connections.length > 0 && (
                <div className="p-4 bg-slate-800/30 backdrop-blur-sm rounded-xl border border-slate-700/30">
                  <div className="flex items-center space-x-2 mb-3">
                    <ArrowRight className="w-4 h-4 text-blue-400" />
                    <h4 className="font-semibold text-slate-200">Data Flow</h4>
                    <span className="px-2 py-0.5 bg-blue-500/20 text-blue-300 rounded text-xs">
                      {architectureDiagram.connections.length}
                    </span>
                  </div>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {architectureDiagram.connections.map((connection, index) => (
                      <div key={index} className="flex items-center space-x-2 p-2 bg-slate-900/50 rounded-lg text-sm hover:bg-slate-900/70 transition-colors duration-200">
                        <span className="text-slate-300 flex-1 truncate">{connection.from}</span>
                        <ArrowRight className={`w-3 h-3 ${getConnectionColor(connection.type)} flex-shrink-0`} />
                        <span className="text-slate-300 flex-1 truncate">{connection.to}</span>
                        <span className={`px-2 py-0.5 rounded text-xs flex-shrink-0 ${getConnectionColor(connection.type)} bg-current bg-opacity-20`}>
                          {connection.type}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Mermaid Code Section
          {architectureDiagram?.diagram_mermaid_syntax && (
            <div className="mt-6 p-4 bg-slate-800/30 backdrop-blur-sm rounded-xl border border-slate-700/30">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 bg-purple-400 rounded-full"></div>
                  <h4 className="font-semibold text-slate-200">Mermaid Code</h4>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={handleCopyMermaidCode}
                    className="flex items-center space-x-1 px-3 py-1 bg-slate-700/50 hover:bg-slate-600/50 rounded-lg text-xs text-slate-300 transition-colors duration-200"
                  >
                    <Copy className="w-3 h-3" />
                    <span>Copy</span>
                  </button>
                  <button
                    onClick={handleOpenInMermaidChart}
                    className="flex items-center space-x-1 px-3 py-1 bg-emerald-600/50 hover:bg-emerald-500/50 rounded-lg text-xs text-white transition-colors duration-200"
                  >
                    <ExternalLink className="w-3 h-3" />
                    <span>Edit Online</span>
                  </button>
                </div>
              </div>
              <pre className="text-slate-300 font-mono text-xs leading-relaxed bg-slate-900/50 p-3 rounded-lg overflow-x-auto border border-slate-700/30">
                {architectureDiagram.diagram_mermaid_syntax}
              </pre>
            </div>
          )} */}

          {/* Resource Summary */}
          {resources && resources.length > 0 && (
            <div className="mt-6 p-4 bg-slate-800/30 backdrop-blur-sm rounded-xl border border-slate-700/30">
              <div className="flex items-center space-x-2 mb-3">
                <div className="w-4 h-4 bg-purple-400 rounded-full"></div>
                <h4 className="font-semibold text-slate-200">Infrastructure Resources</h4>
                <span className="px-2 py-0.5 bg-purple-500/20 text-purple-300 rounded text-xs">
                  {resources.length} total
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {resources.slice(0, 12).map((resource, index) => (
                  <span key={index} className="px-3 py-1 bg-purple-500/20 text-purple-300 rounded-full text-xs font-medium border border-purple-500/30 hover:bg-purple-500/30 transition-colors duration-200">
                    {resource}
                  </span>
                ))}
                {resources.length > 12 && (
                  <span className="px-3 py-1 bg-slate-500/20 text-slate-300 rounded-full text-xs font-medium border border-slate-500/30">
                    +{resources.length - 12} more
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Quick Actions */}
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <div className="text-xs text-slate-500 flex items-center space-x-1">
              <span>Quick Actions:</span>
            </div>
            <button
              onClick={handleOpenInMermaidChart}
              className="flex items-center space-x-1 px-3 py-1.5 bg-gradient-to-r from-emerald-500/20 to-cyan-500/20 text-emerald-300 rounded-lg text-xs font-medium border border-emerald-500/30 hover:from-emerald-500/30 hover:to-cyan-500/30 transition-all duration-200"
            >
              <ExternalLink className="w-3 h-3" />
              <span>Edit in MermaidChart</span>
            </button>
            <button
              onClick={handleDownloadDiagram}
              className="flex items-center space-x-1 px-3 py-1.5 bg-blue-500/20 text-blue-300 rounded-lg text-xs font-medium border border-blue-500/30 hover:bg-blue-500/30 transition-colors duration-200"
            >
              <Download className="w-3 h-3" />
              <span>Download SVG</span>
            </button>
            <button
              onClick={handleCopyMermaidCode}
              className="flex items-center space-x-1 px-3 py-1.5 bg-purple-500/20 text-purple-300 rounded-lg text-xs font-medium border border-purple-500/30 hover:bg-purple-500/30 transition-colors duration-200"
            >
              <Copy className="w-3 h-3" />
              <span>Copy Code</span>
            </button>
          </div>
        </div>
      )}
    </GlassCard>
  );

  // Helper function moved inside component to access state
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
};

export default EnhancedArchitectureDiagram;