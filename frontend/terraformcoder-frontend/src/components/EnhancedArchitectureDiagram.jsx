import React, { useState, useEffect } from 'react';
import { ChevronDownIcon, ChevronUpIcon, EyeIcon, CloudIcon, NetworkIcon, ArrowRightIcon, ZapIcon } from 'lucide-react';
import GlassCard from './GlassCard';

const EnhancedArchitectureDiagram = ({ architectureDiagram, resources, description }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [diagramLoading, setDiagramLoading] = useState(false);
  const [generatedDiagram, setGeneratedDiagram] = useState(null);

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

  // Simulate Phind API integration for diagram generation
  const generateDiagramWithPhind = async () => {
    setDiagramLoading(true);
    try {
      // In a real implementation, this would call Phind API
      // For demo purposes, we'll simulate the process
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Mock generated diagram data
      const mockDiagram = {
        svg: `
          <svg viewBox="0 0 800 600" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" style="stop-color:#3b82f6;stop-opacity:1" />
                <stop offset="100%" style="stop-color:#1e40af;stop-opacity:1" />
              </linearGradient>
              <linearGradient id="grad2" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" style="stop-color:#10b981;stop-opacity:1" />
                <stop offset="100%" style="stop-color:#047857;stop-opacity:1" />
              </linearGradient>
            </defs>
            
            <!-- VPC Container -->
            <rect x="50" y="50" width="700" height="500" rx="20" fill="rgba(59, 130, 246, 0.1)" stroke="#3b82f6" stroke-width="2" stroke-dasharray="5,5"/>
            <text x="70" y="80" fill="#3b82f6" font-family="Arial, sans-serif" font-size="16" font-weight="bold">Virtual Private Cloud</text>
            
            <!-- Public Subnet -->
            <rect x="100" y="100" width="300" height="200" rx="10" fill="rgba(16, 185, 129, 0.1)" stroke="#10b981" stroke-width="2"/>
            <text x="120" y="130" fill="#10b981" font-family="Arial, sans-serif" font-size="14" font-weight="bold">Public Subnet</text>
            
            <!-- Load Balancer -->
            <rect x="150" y="150" width="80" height="50" rx="5" fill="url(#grad1)" stroke="#1e40af" stroke-width="2"/>
            <text x="175" y="180" fill="white" font-family="Arial, sans-serif" font-size="12" text-anchor="middle">Load Balancer</text>
            
            <!-- Web Servers -->
            <rect x="150" y="220" width="60" height="40" rx="5" fill="url(#grad2)" stroke="#047857" stroke-width="1"/>
            <text x="180" y="245" fill="white" font-family="Arial, sans-serif" font-size="10" text-anchor="middle">Web Server</text>
            
            <!-- Private Subnet -->
            <rect x="450" y="100" width="250" height="200" rx="10" fill="rgba(168, 85, 247, 0.1)" stroke="#a855f7" stroke-width="2"/>
            <text x="470" y="130" fill="#a855f7" font-family="Arial, sans-serif" font-size="14" font-weight="bold">Private Subnet</text>
            
            <!-- Database -->
            <rect x="500" y="180" width="80" height="50" rx="5" fill="rgba(168, 85, 247, 0.8)" stroke="#7c3aed" stroke-width="2"/>
            <text x="540" y="210" fill="white" font-family="Arial, sans-serif" font-size="12" text-anchor="middle">Database</text>
            
            <!-- Connections -->
            <line x1="230" y1="175" x2="450" y2="175" stroke="#64748b" stroke-width="2" marker-end="url(#arrowhead)"/>
            <line x1="210" y1="240" x2="500" y2="205" stroke="#64748b" stroke-width="2" marker-end="url(#arrowhead)"/>
            
            <!-- Arrow marker -->
            <defs>
              <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="10" refY="3.5" orient="auto">
                <polygon points="0 0, 10 3.5, 0 7" fill="#64748b" />
              </marker>
            </defs>
            
            <!-- Internet Gateway -->
            <rect x="170" y="20" width="80" height="30" rx="5" fill="rgba(245, 158, 11, 0.8)" stroke="#d97706" stroke-width="2"/>
            <text x="210" y="40" fill="white" font-family="Arial, sans-serif" font-size="12" text-anchor="middle">Internet Gateway</text>
            <line x1="210" y1="50" x2="190" y2="150" stroke="#64748b" stroke-width="2" marker-end="url(#arrowhead)"/>
          </svg>
        `,
        description: "Auto-generated infrastructure diagram showing the relationship between VPC, subnets, load balancer, web servers, and database components."
      };
      
      setGeneratedDiagram(mockDiagram);
    } catch (error) {
      console.error('Error generating diagram:', error);
    } finally {
      setDiagramLoading(false);
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
            <EyeIcon className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-xl font-bold bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
              Architecture Diagram
            </h3>
            <p className="text-sm text-slate-400">AI-powered infrastructure visualization</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          {!generatedDiagram && !diagramLoading && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                generateDiagramWithPhind();
              }}
              className="px-3 py-1 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg text-xs font-medium hover:from-blue-600 hover:to-purple-600 transition-all duration-200 flex items-center space-x-1"
            >
              <ZapIcon className="w-3 h-3" />
              <span>Generate</span>
            </button>
          )}
          {isExpanded ? 
            <ChevronUpIcon className="w-5 h-5 text-slate-400" /> : 
            <ChevronDownIcon className="w-5 h-5 text-slate-400" />
          }
        </div>
      </div>
      
      {isExpanded && (
        <div className="mt-6">
          {/* Diagram Display Section */}
          <div className="p-6 bg-slate-800/30 backdrop-blur-sm rounded-xl border border-slate-700/30 mb-6">
            {diagramLoading ? (
              <div className="flex items-center justify-center min-h-[300px]">
                <div className="text-center">
                  <div className="w-12 h-12 border-4 border-blue-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                  <p className="text-slate-400 text-lg font-medium">Generating Architecture Diagram</p>
                  <p className="text-slate-500 text-sm mt-2">Powered by AI diagram generation</p>
                </div>
              </div>
            ) : generatedDiagram ? (
              <div className="space-y-4">
                <div 
                  className="bg-white rounded-lg p-4 border border-slate-600"
                  dangerouslySetInnerHTML={{ __html: generatedDiagram.svg }}
                />
                <p className="text-slate-300 text-sm italic">
                  {generatedDiagram.description}
                </p>
              </div>
            ) : architectureDiagram?.diagram_url ? (
              <img 
                src={architectureDiagram.diagram_url} 
                alt="Infrastructure Architecture Diagram" 
                className="w-full h-auto rounded-lg border border-slate-600"
              />
            ) : (
              <div className="flex items-center justify-center min-h-[300px] border-2 border-dashed border-slate-600 rounded-lg">
                <div className="text-center">
                  <CloudIcon className="w-16 h-16 text-slate-500 mx-auto mb-4" />
                  <p className="text-slate-400 text-lg font-medium">Architecture Diagram</p>
                  <p className="text-slate-500 text-sm mt-2">Click "Generate" to create visual representation</p>
                  <p className="text-slate-600 text-xs mt-1">Powered by AI diagram generation</p>
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
                    <ArrowRightIcon className="w-4 h-4 text-blue-400" />
                    <h4 className="font-semibold text-slate-200">Connections</h4>
                  </div>
                  <div className="space-y-2">
                    {architectureDiagram.connections.map((connection, index) => (
                      <div key={index} className="flex items-center space-x-2 p-2 bg-slate-900/50 rounded-lg text-sm">
                        <span className="text-slate-300">{connection.from}</span>
                        <ArrowRightIcon className={`w-3 h-3 ${getConnectionColor(connection.type)}`} />
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


// import React, { useState } from 'react';
// import { ChevronDownIcon, ChevronUpIcon, EyeIcon, CloudIcon } from 'lucide-react';
// import GlassCard from './GlassCard';

// const ArchitectureDiagram = ({ diagramUrl, resources }) => {
//   const [isExpanded, setIsExpanded] = useState(false);

//   return (
//     <GlassCard className="mb-6">
//       <div 
//         className="flex items-center justify-between cursor-pointer"
//         onClick={() => setIsExpanded(!isExpanded)}
//       >
//         <div className="flex items-center space-x-3">
//           <div className="w-10 h-10 bg-gradient-to-r from-blue-400 to-purple-500 rounded-lg flex items-center justify-center shadow-lg">
//             <EyeIcon className="w-5 h-5 text-white" />
//           </div>
//           <h3 className="text-xl font-bold bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
//             AI-Generated Infrastructure Diagram
//           </h3>
//         </div>
//         {isExpanded ? 
//           <ChevronUpIcon className="w-5 h-5 text-slate-400" /> : 
//           <ChevronDownIcon className="w-5 h-5 text-slate-400" />
//         }
//       </div>
      
//       {isExpanded && (
//         <div className="mt-6 p-6 bg-slate-800/30 backdrop-blur-sm rounded-xl border border-slate-700/30">
//           {diagramUrl ? (
//             <img 
//               src={diagramUrl} 
//               alt="Infrastructure Architecture Diagram" 
//               className="w-full h-auto rounded-lg border border-slate-600"
//             />
//           ) : (
//             <div className="flex items-center justify-center min-h-[300px] border-2 border-dashed border-slate-600 rounded-lg">
//               <div className="text-center">
//                 <CloudIcon className="w-16 h-16 text-slate-500 mx-auto mb-4" />
//                 <p className="text-slate-400 text-lg font-medium">Architecture Diagram</p>
//                 <p className="text-slate-500 text-sm mt-2">Visual representation coming soon</p>
//                 <p className="text-slate-600 text-xs mt-1">Powered by AI diagram generation</p>
//                 {resources && resources.length > 0 && (
//                   <div className="mt-4 text-xs text-slate-600">
//                     Resources: {resources.slice(0, 3).join(', ')}
//                     {resources.length > 3 && ` +${resources.length - 3} more`}
//                   </div>
//                 )}
//               </div>
//             </div>
//           )}
//         </div>
//       )}
//     </GlassCard>
//   );
// };

// export default ArchitectureDiagram;