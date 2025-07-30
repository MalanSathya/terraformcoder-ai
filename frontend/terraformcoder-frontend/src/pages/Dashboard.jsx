import React, { useState, useContext, useEffect } from 'react';
import { AuthContext } from '../context/AuthContext';
import { generateCode, getGenerationHistory } from '../services/api';
import GlassCard from '../components/GlassCard';
import FileExplorer from '../components/FileExplorer';
import GenerationHistory from '../components/GenerationHistory';
import MultiCloudTabs from '../components/MultiCloudTabs';
import { ArchitectureDiagram } from '../components/ArchitectureDiagram';

const Dashboard = () => {
  const [description, setDescription] = useState('');
  const [result, setResult] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState('aws');
  const [history, setHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [activeTab, setActiveTab] = useState('generate');
  const [errors, setErrors] = useState({});
  const { user, logout } = useContext(AuthContext);

  // Load generation history on component mount
  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    try {
      const token = localStorage.getItem('token');
      const historyData = await getGenerationHistory(token);
      setHistory(historyData);
    } catch (err) {
      console.error('Failed to load history:', err);
    }
  };

  const validateInput = (desc) => {
    const newErrors = {};
    
    if (!desc.trim()) {
      newErrors.description = 'Description cannot be empty';
      return newErrors;
    }
    
    if (desc.length < 10) {
      newErrors.description = 'Description must be at least 10 characters';
      return newErrors;
    }
    
    if (desc.length > 1000) {
      newErrors.description = 'Description cannot exceed 1000 characters';
      return newErrors;
    }

    // Check for infrastructure-related keywords
    const infraKeywords = [
      'vm', 'virtual machine', 'ec2', 'instance', 'server', 'compute',
      'vpc', 'network', 'subnet', 'security group', 'firewall',
      'database', 'rds', 'mysql', 'postgresql', 'storage', 's3', 'blob',
      'load balancer', 'alb', 'nlb', 'api gateway', 'lambda', 'function',
      'kubernetes', 'container', 'docker', 'terraform', 'infrastructure',
      'cloud', 'aws', 'azure', 'gcp', 'deploy', 'provision', 'create'
    ];
    
    const hasInfraKeywords = infraKeywords.some(keyword => 
      desc.toLowerCase().includes(keyword)
    );
    
    if (!hasInfraKeywords) {
      newErrors.description = 'Please describe cloud infrastructure needs (VPC, EC2, databases, etc.)';
      return newErrors;
    }
    
    return newErrors;
  };

  const handleGenerate = async () => {
    const validationErrors = validateInput(description);
    setErrors(validationErrors);
    
    if (Object.keys(validationErrors).length > 0) {
      return;
    }
    
    setIsGenerating(true);
    setResult(null);
    
    try {
      const res = await generateCode(description, selectedProvider, localStorage.getItem('token'));
      setResult(res.data);
      // Reload history to include the new generation
      await loadHistory();
    } catch (err) {
      const errorMessage = err.response?.data?.detail || 'Error generating code';
      setErrors({ general: errorMessage });
      console.error('Generation error:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleHistoryItemClick = (historyItem) => {
    setDescription(historyItem.description);
    setSelectedProvider(historyItem.provider);
    setResult({
      ...historyItem,
      cached_response: false,
      generated_at: historyItem.created_at,
      file_explanations: {},
      multi_cloud_code: null
    });
    setActiveTab('generate');
    setShowHistory(false);
  };

  const renderProviderSelector = () => (
    <div className="flex space-x-2 mb-4">
      {['aws', 'azure', 'gcp'].map((provider) => (
        <button
          key={provider}
          onClick={() => setSelectedProvider(provider)}
          className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
            selectedProvider === provider
              ? 'bg-gradient-to-r from-emerald-500 to-cyan-500 text-white shadow-lg'
              : 'bg-slate-800/50 text-slate-300 hover:bg-slate-700/50 border border-slate-600/30'
          }`}
        >
          {provider.toUpperCase()}
        </button>
      ))}
    </div>
  );

  const renderTabNavigation = () => (
    <div className="flex space-x-1 mb-6 bg-slate-800/30 p-1 rounded-xl backdrop-blur-sm">
      {[
        { id: 'generate', label: '🚀 Generate', icon: '⚡' },
        { id: 'history', label: '📋 History', icon: '🕒' }
      ].map((tab) => (
        <button
          key={tab.id}
          onClick={() => setActiveTab(tab.id)}
          className={`flex-1 px-4 py-3 rounded-lg font-medium transition-all duration-200 ${
            activeTab === tab.id
              ? 'bg-gradient-to-r from-emerald-500/20 to-cyan-500/20 text-white border border-emerald-500/30'
              : 'text-slate-400 hover:text-white hover:bg-slate-700/30'
          }`}
        >
          <span className="flex items-center justify-center space-x-2">
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
          </span>
        </button>
      ))}
    </div>
  );

  const renderGenerateTab = () => (
    <>
      {/* Welcome Section */}
      <GlassCard className="mb-8 transform hover:scale-[1.02] transition-all duration-500">
        <div className="flex items-center space-x-4 mb-6">
          <div className="w-16 h-16 bg-gradient-to-r from-emerald-400 to-cyan-400 rounded-full flex items-center justify-center shadow-lg">
            <span className="text-2xl">👋</span>
          </div>
          <div>
            <h2 className="text-3xl font-bold mb-2 bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
              Welcome back, {user?.name || 'Developer'}
            </h2>
            <p className="text-slate-400 text-lg">
              Transform your infrastructure ideas into production-ready Terraform code
            </p>
          </div>
        </div>
        
        {/* Provider Selection */}
        {renderProviderSelector()}
        
        <div className="space-y-4">
          <div className="relative">
            <textarea
              value={description}
              onChange={(e) => {
                setDescription(e.target.value);
                // Clear errors when user starts typing
                if (errors.description) {
                  setErrors({...errors, description: ''});
                }
              }}
              className={`w-full p-4 rounded-xl bg-slate-800/50 backdrop-blur-sm text-white border ${
                errors.description 
                  ? 'border-red-500/50 focus:ring-red-500/50 focus:border-red-500/50' 
                  : 'border-slate-700/50 focus:ring-emerald-500/50 focus:border-emerald-500/50'
              } focus:outline-none focus:ring-2 transition-all duration-300 placeholder-slate-400 resize-none`}
              rows={5}
              placeholder="Describe your infrastructure needs... (e.g., 'Create a VPC with EC2 instances, load balancer, and RDS database for a web application')"
            />
            <div className="absolute bottom-3 right-3 text-xs text-slate-500">
              {description.length}/1000
            </div>
            {errors.description && (
              <p className="text-red-400 text-sm mt-2 flex items-center">
                <span className="mr-1">⚠️</span>
                {errors.description}
              </p>
            )}
          </div>

          {/* General Error Display */}
          {errors.general && (
            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
              <p className="text-red-400 flex items-center">
                <span className="mr-2">❌</span>
                {errors.general}
              </p>
            </div>
          )}

          <button
            onClick={handleGenerate}
            disabled={!description.trim() || isGenerating || Object.keys(errors).length > 0}
            className="group relative w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-emerald-500/25 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105"
          >
            <span className="flex items-center justify-center space-x-3">
              {isGenerating ? (
                <>
                  <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Generating...</span>
                </>
              ) : (
                <>
                  <span>🚀</span>
                  <span>Generate Terraform Code</span>
                  <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </>
              )}
            </span>
          </button>
        </div>
      </GlassCard>

      {/* Result Section */}
      {result && (
        <GlassCard className="animate-in slide-in-from-bottom-4 duration-700">
          <div className="flex items-center space-x-3 mb-6">
            <div className="w-12 h-12 bg-gradient-to-r from-green-400 to-emerald-500 rounded-lg flex items-center justify-center shadow-lg">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-2xl font-bold bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
              Generated Terraform Code
            </h3>
            {result.cached_response && (
              <span className="px-2 py-1 bg-yellow-500/20 text-yellow-300 rounded-lg text-xs font-medium border border-yellow-500/30">
                📋 Cached
              </span>
            )}
          </div>

          {/* Multi-Cloud Code Tabs */}
          {result.multi_cloud_code && (
            <MultiCloudTabs multiCloudCode={result.multi_cloud_code} />
          )}

          {/* File Hierarchy Section */}
          {result.file_hierarchy && (
            <FileExplorer 
              fileHierarchy={result.file_hierarchy}
              fileExplanations={result.file_explanations || {}}
            />
          )}

          {/* Generated Resources */}
          {result.resources && result.resources.length > 0 && (
            <div className="mb-6 p-4 bg-slate-800/30 backdrop-blur-sm rounded-xl border border-slate-700/30">
              <div className="flex items-center space-x-2 mb-3">
                <span className="text-xl">🏗️</span>
                <h4 className="font-semibold text-slate-200">Resources Created</h4>
              </div>
              <div className="flex flex-wrap gap-2">
                {result.resources.map((resource, index) => (
                  <span
                    key={index}
                    className="px-3 py-1 bg-emerald-500/20 text-emerald-300 rounded-full text-sm font-medium border border-emerald-500/30"
                  >
                    {resource}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Architecture Diagram */}
          {result.architecture_diagram_url && (
            <ArchitectureDiagram diagramUrl={result.architecture_diagram_url} />
          )}

          <div className="relative mb-6">
            <pre className="bg-slate-900/80 backdrop-blur-sm border border-slate-700/50 text-emerald-300 p-6 rounded-xl overflow-auto text-sm leading-relaxed shadow-inner max-h-96">
              <code>{result.code}</code>
            </pre>
            <button
              onClick={() => navigator.clipboard.writeText(result.code)}
              className="absolute top-4 right-4 p-2 bg-slate-800/80 hover:bg-slate-700/80 rounded-lg text-slate-400 hover:text-white transition-all duration-200"
              title="Copy code"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </button>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="p-4 bg-slate-800/30 backdrop-blur-sm rounded-xl border border-slate-700/30">
              <div className="flex items-center space-x-2 mb-3">
                <span className="text-xl">🧠</span>
                <h4 className="font-semibold text-slate-200">Explanation</h4>
              </div>
              <p className="text-slate-300 leading-relaxed">{result.explanation}</p>
            </div>

            <div className="p-4 bg-slate-800/30 backdrop-blur-sm rounded-xl border border-slate-700/30">
              <div className="flex items-center space-x-2 mb-3">
                <span className="text-xl">💰</span>
                <h4 className="font-semibold text-slate-200">Estimated Cost</h4>
              </div>
              <div className="flex items-center space-x-2">
                <span 
                  className={`px-2 py-1 rounded-lg text-xs font-medium ${
                    result.estimated_cost === 'Low' ? 'bg-green-500/20 text-green-300 border border-green-500/30' :
                    result.estimated_cost === 'Medium' ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30' :
                    result.estimated_cost === 'High' ? 'bg-red-500/20 text-red-300 border border-red-500/30' :
                    'bg-slate-500/20 text-slate-300 border border-slate-500/30'
                  }`}
                >
                  {result.estimated_cost}
                </span>
                <span className="text-slate-400 text-sm">estimated cost</span>
              </div>
            </div>
          </div>

          {/* Generation Info */}
          <div className="mt-6 pt-4 border-t border-slate-700/30">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>Generated on {new Date(result.generated_at).toLocaleString()}</span>
              <span>Provider: {selectedProvider?.toUpperCase()}</span>
            </div>
          </div>
        </GlassCard>
      )}
    </>
  );

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-cyan-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-emerald-500 rounded-full mix-blend-multiply filter blur-xl opacity-10 animate-pulse delay-500"></div>
      </div>

      {/* Header */}
      <header className="relative z-10 flex items-center justify-between p-6">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gradient-to-r from-emerald-400 to-cyan-400 rounded-lg flex items-center justify-center shadow-lg">
            <span className="text-xl font-bold text-white">⚡</span>
          </div>
          <div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
              AI Terraform Coder
            </h1>
            <p className="text-sm text-slate-400">Infrastructure as Code, Powered by AI</p>
          </div>
        </div>

        <button
          onClick={logout}
          className="group relative px-4 py-2 bg-slate-800/50 backdrop-blur-md text-white border border-slate-700/50 rounded-xl shadow-lg hover:bg-slate-700/50 hover:border-slate-600/50 transition-all duration-300 hover:scale-105"
        >
          <span className="flex items-center space-x-2">
            <span>Logout</span>
            <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013 3v1" />
            </svg>
          </span>
        </button>
      </header>

      {/* Main Content */}
      <main className="relative z-10 max-w-6xl mx-auto px-6 pb-20">
        {/* Tab Navigation */}
        {renderTabNavigation()}

        {/* Tab Content */}
        {activeTab === 'generate' && renderGenerateTab()}
        {activeTab === 'history' && (
          <GenerationHistory 
            history={history}
            onHistoryItemClick={handleHistoryItemClick}
            onRefresh={loadHistory}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="relative z-10 mt-16 border-t border-slate-800/50 bg-slate-900/30 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-6 py-8">
          <div className="flex flex-col md:flex-row items-center justify-between space-y-4 md:space-y-0">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-r from-emerald-400 to-cyan-400 rounded-lg flex items-center justify-center">
                <span className="text-sm font-bold text-white">⚡</span>
              </div>
              <div>
                <p className="text-slate-300 font-medium">AI Terraform Coder</p>
                <p className="text-xs text-slate-500">Infrastructure automation simplified</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-6 text-sm text-slate-400">
              <span>© 2025 Built with ❤️ by Malan</span>
              <div className="flex items-center space-x-4">
                <a href="#" className="hover:text-emerald-400 transition-colors duration-200">Privacy</a>
                <a href="#" className="hover:text-emerald-400 transition-colors duration-200">Terms</a>
                <a href="#" className="hover:text-emerald-400 transition-colors duration-200">Support</a>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Dashboard;


// import React, { useState, useContext } from 'react';
// import { AuthContext } from '../context/AuthContext';
// import { generateCode } from '../services/api';
// import GlassCard from '../components/GlassCard';

// const Dashboard = () => {
//   const [description, setDescription] = useState('');
//   const [result, setResult] = useState(null);
//   const [isGenerating, setIsGenerating] = useState(false);
//   const { user, logout } = useContext(AuthContext);

//   const handleGenerate = async () => {
//     if (!description.trim()) return;
    
//     setIsGenerating(true);
//     try {
//       const res = await generateCode(description, 'aws', localStorage.getItem('token'));
//       setResult(res.data);
//     } catch (err) {
//       alert(err.response?.data?.detail || 'Error generating code');
//     } finally {
//       setIsGenerating(false);
//     }
//   };

//   return (
//     <div className="relative min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
//       {/* Animated background elements */}
//       <div className="absolute inset-0 overflow-hidden">
//         <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse"></div>
//         <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-cyan-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse delay-1000"></div>
//         <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-emerald-500 rounded-full mix-blend-multiply filter blur-xl opacity-10 animate-pulse delay-500"></div>
//       </div>

//       {/* Header */}
//       <header className="relative z-10 flex items-center justify-between p-6">
//         <div className="flex items-center space-x-3">
//           <div className="w-10 h-10 bg-gradient-to-r from-emerald-400 to-cyan-400 rounded-lg flex items-center justify-center shadow-lg">
//             <span className="text-xl font-bold text-white">⚡</span>
//           </div>
//           <div>
//             <h1 className="text-2xl font-bold bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
//               AI Terraform Coder
//             </h1>
//             <p className="text-sm text-slate-400">Infrastructure as Code, Powered by AI</p>
//           </div>
//         </div>

//         <button
//           onClick={logout}
//           className="group relative px-4 py-2 bg-slate-800/50 backdrop-blur-md text-white border border-slate-700/50 rounded-xl shadow-lg hover:bg-slate-700/50 hover:border-slate-600/50 transition-all duration-300 hover:scale-105"
//         >
//           <span className="flex items-center space-x-2">
//             <span>Logout</span>
//             <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013 3v1" />
//             </svg>
//           </span>
//         </button>
//       </header>

//       {/* Main Content */}
//       <main className="relative z-10 max-w-6xl mx-auto px-6 pb-20">
//         {/* Welcome Section */}
//         <GlassCard className="mb-8 transform hover:scale-[1.02] transition-all duration-500">
//           <div className="flex items-center space-x-4 mb-6">
//             <div className="w-16 h-16 bg-gradient-to-r from-emerald-400 to-cyan-400 rounded-full flex items-center justify-center shadow-lg">
//               <span className="text-2xl">👋</span>
//             </div>
//             <div>
//               <h2 className="text-3xl font-bold mb-2 bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
//                 Welcome back, {user?.name || 'Developer'}
//               </h2>
//               <p className="text-slate-400 text-lg">
//                 Transform your infrastructure ideas into production-ready Terraform code
//               </p>
//             </div>
//           </div>
          
//           <div className="space-y-4">
//             <div className="relative">
//               <textarea
//                 value={description}
//                 onChange={(e) => setDescription(e.target.value)}
//                 className="w-full p-4 rounded-xl bg-slate-800/50 backdrop-blur-sm text-white border border-slate-700/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all duration-300 placeholder-slate-400 resize-none"
//                 rows={5}
//                 placeholder="Describe your infrastructure needs... (e.g., 'Generate Terraform code for AWS to create an EC2 with load balancer and RDS database.')"
//               />
//               <div className="absolute bottom-3 right-3 text-xs text-slate-500">
//                 {description.length}/1000
//               </div>
//             </div>

//             <button
//               onClick={handleGenerate}
//               disabled={!description.trim() || isGenerating}
//               className="group relative w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-emerald-500/25 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105"
//             >
//               <span className="flex items-center justify-center space-x-3">
//                 {isGenerating ? (
//                   <>
//                     <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
//                       <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
//                       <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
//                     </svg>
//                     <span>Generating...</span>
//                   </>
//                 ) : (
//                   <>
//                     <span>🚀</span>
//                     <span>Generate Terraform Code</span>
//                     <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
//                     </svg>
//                   </>
//                 )}
//               </span>
//             </button>
//           </div>
//         </GlassCard>

//         {/* Result Section */}
//         {result && (
//           <GlassCard className="animate-in slide-in-from-bottom-4 duration-700">
//             <div className="flex items-center space-x-3 mb-6">
//               <div className="w-12 h-12 bg-gradient-to-r from-green-400 to-emerald-500 rounded-lg flex items-center justify-center shadow-lg">
//                 <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
//                 </svg>
//               </div>
//               <h3 className="text-2xl font-bold bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
//                 Generated Terraform Code
//               </h3>
//               {result.cached_response && (
//                 <span className="px-2 py-1 bg-yellow-500/20 text-yellow-300 rounded-lg text-xs font-medium border border-yellow-500/30">
//                   📋 Cached
//                 </span>
//               )}
//             </div>

//             {/* File Hierarchy Section - NEW */}
//             {result.file_hierarchy && (
//               <div className="mb-6 p-4 bg-slate-800/30 backdrop-blur-sm rounded-xl border border-slate-700/30">
//                 <div className="flex items-center space-x-2 mb-3">
//                   <span className="text-xl">📁</span>
//                   <h4 className="font-semibold text-slate-200">File Hierarchy</h4>
//                 </div>
//                 <pre className="text-slate-300 font-mono text-sm leading-relaxed whitespace-pre-wrap">
//                   {result.file_hierarchy}
//                 </pre>
//               </div>
//             )}

//             {/* Generated Resources - NEW */}
//             {result.resources && result.resources.length > 0 && (
//               <div className="mb-6 p-4 bg-slate-800/30 backdrop-blur-sm rounded-xl border border-slate-700/30">
//                 <div className="flex items-center space-x-2 mb-3">
//                   <span className="text-xl">🏗️</span>
//                   <h4 className="font-semibold text-slate-200">Resources Created</h4>
//                 </div>
//                 <div className="flex flex-wrap gap-2">
//                   {result.resources.map((resource, index) => (
//                     <span
//                       key={index}
//                       className="px-3 py-1 bg-emerald-500/20 text-emerald-300 rounded-full text-sm font-medium border border-emerald-500/30"
//                     >
//                       {resource}
//                     </span>
//                   ))}
//                 </div>
//               </div>
//             )}

//             <div className="relative mb-6">
//               <pre className="bg-slate-900/80 backdrop-blur-sm border border-slate-700/50 text-emerald-300 p-6 rounded-xl overflow-auto text-sm leading-relaxed shadow-inner max-h-96">
//                 <code>{result.code}</code>
//               </pre>
//               <button
//                 onClick={() => navigator.clipboard.writeText(result.code)}
//                 className="absolute top-4 right-4 p-2 bg-slate-800/80 hover:bg-slate-700/80 rounded-lg text-slate-400 hover:text-white transition-all duration-200"
//                 title="Copy code"
//               >
//                 <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
//                 </svg>
//               </button>
//             </div>

//             <div className="grid md:grid-cols-2 gap-6">
//               <div className="p-4 bg-slate-800/30 backdrop-blur-sm rounded-xl border border-slate-700/30">
//                 <div className="flex items-center space-x-2 mb-3">
//                   <span className="text-xl">🧠</span>
//                   <h4 className="font-semibold text-slate-200">Explanation</h4>
//                 </div>
//                 <p className="text-slate-300 leading-relaxed">{result.explanation}</p>
//               </div>

//               <div className="p-4 bg-slate-800/30 backdrop-blur-sm rounded-xl border border-slate-700/30">
//                 <div className="flex items-center space-x-2 mb-3">
//                   <span className="text-xl">💰</span>
//                   <h4 className="font-semibold text-slate-200">Estimated Cost</h4>
//                 </div>
//                 <div className="flex items-center space-x-2">
//                   <span 
//                     className={`px-2 py-1 rounded-lg text-xs font-medium ${
//                       result.estimated_cost === 'Low' ? 'bg-green-500/20 text-green-300 border border-green-500/30' :
//                       result.estimated_cost === 'Medium' ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30' :
//                       result.estimated_cost === 'High' ? 'bg-red-500/20 text-red-300 border border-red-500/30' :
//                       'bg-slate-500/20 text-slate-300 border border-slate-500/30'
//                     }`}
//                   >
//                     {result.estimated_cost}
//                   </span>
//                   <span className="text-slate-400 text-sm">estimated cost</span>
//                 </div>
//               </div>
//             </div>

//             {/* Generation Info - NEW */}
//             <div className="mt-6 pt-4 border-t border-slate-700/30">
//               <div className="flex items-center justify-between text-xs text-slate-500">
//                 <span>Generated on {new Date(result.generated_at).toLocaleString()}</span>
//                 <span>Provider: {result.provider?.toUpperCase()}</span>
//               </div>
//             </div>
//           </GlassCard>
//         )}
//       </main>

//       {/* Footer */}
//       <footer className="relative z-10 mt-16 border-t border-slate-800/50 bg-slate-900/30 backdrop-blur-md">
//         <div className="max-w-6xl mx-auto px-6 py-8">
//           <div className="flex flex-col md:flex-row items-center justify-between space-y-4 md:space-y-0">
//             <div className="flex items-center space-x-3">
//               <div className="w-8 h-8 bg-gradient-to-r from-emerald-400 to-cyan-400 rounded-lg flex items-center justify-center">
//                 <span className="text-sm font-bold text-white">⚡</span>
//               </div>
//               <div>
//                 <p className="text-slate-300 font-medium">AI Terraform Coder</p>
//                 <p className="text-xs text-slate-500">Infrastructure automation simplified</p>
//               </div>
//             </div>
            
//             <div className="flex items-center space-x-6 text-sm text-slate-400">
//               <span>© 2025 Built with ❤️ by Malan</span>
//               <div className="flex items-center space-x-4">
//                 <a href="#" className="hover:text-emerald-400 transition-colors duration-200">Privacy</a>
//                 <a href="#" className="hover:text-emerald-400 transition-colors duration-200">Terms</a>
//                 <a href="#" className="hover:text-emerald-400 transition-colors duration-200">Support</a>
//               </div>
//             </div>
//           </div>
//         </div>
//       </footer>
//     </div>
//   );
// };

// export default Dashboard;