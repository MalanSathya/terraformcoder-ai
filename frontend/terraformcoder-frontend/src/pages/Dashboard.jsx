import React, { useState, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { generateCode } from '../services/api';

// UI Components
import GlassCard from '../components/GlassCard';
import ProviderSelector from '../components/ProviderSelector';
import ArchitectureDiagram from '../components/ArchitectureDiagram';
import MultiCloudTabs from '../components/MultiCloudTabs';
import FileExplanations from '../components/FileExplanations';
import InvalidRequestCard from '../components/InvalidRequestCard';

// Icons from Lucide
import {
  LogOutIcon,
  BoltIcon,
  ArrowRightIcon,
  LoaderCircle,
  RocketIcon,
  CheckCircle2,
  Copy,
  BrainCircuit,
  DollarSign,
  Layers,
  Folder,
  Clock,
  Server,
  AlertTriangle,
  Clipboard
} from 'lucide-react';

const Dashboard = () => {
  const [description, setDescription] = useState('');
  const [provider, setProvider] = useState('aws');
  const [result, setResult] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const { user, logout } = useContext(AuthContext);

  const handleGenerate = async () => {
    if (!description.trim()) return;

    setIsGenerating(true);
    setResult(null); // Clear previous results
    try {
      const token = localStorage.getItem('token');
      const res = await generateCode(description, provider, token);
      setResult(res.data);
    } catch (err) {
      // Display a generic error card if API fails
      setResult({
        is_valid_request: false,
        explanation: err.response?.data?.detail || 'An unexpected error occurred. Please try again.',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    // Optional: Show a "Copied!" toast notification here
  };


  return (
    <div className="relative min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 font-sans text-white">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-cyan-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse delay-1000"></div>
      </div>

      {/* Header */}
      <header className="relative z-10 flex items-center justify-between p-6">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gradient-to-r from-emerald-400 to-cyan-400 rounded-lg flex items-center justify-center shadow-lg">
            <BoltIcon className="w-6 h-6 text-white" />
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
          className="group relative px-4 py-2 bg-slate-800/50 backdrop-blur-md text-white border border-slate-700/50 rounded-xl shadow-lg hover:bg-slate-700/50 transition-all duration-300 hover:scale-105"
        >
          <span className="flex items-center space-x-2">
            <span>Logout</span>
            <LogOutIcon className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-200" />
          </span>
        </button>
      </header>

      {/* Main Content */}
      <main className="relative z-10 max-w-6xl mx-auto px-6 pb-20">
        {/* Welcome & Input Section */}
        <GlassCard className="mb-8">
          <div className="flex items-center space-x-4 mb-6">
            <div className="w-16 h-16 bg-gradient-to-r from-emerald-400 to-cyan-400 rounded-full flex items-center justify-center shadow-lg">
               <Server className="w-8 h-8 text-white"/>
            </div>
            <div>
              <h2 className="text-3xl font-bold bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
                Welcome back, {user?.name || 'Developer'}
              </h2>
              <p className="text-slate-400 text-lg">
                Describe your infrastructure needs to generate production-ready code.
              </p>
            </div>
          </div>

          <div className="space-y-4">
             <div className="relative">
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full p-4 rounded-xl bg-slate-800/50 backdrop-blur-sm text-white border border-slate-700/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all duration-300 placeholder-slate-400 resize-none font-mono"
                  rows={5}
                  placeholder="e.g., 'Create a secure AWS VPC with public and private subnets, an internet gateway, and a NAT gateway for an application server and a database.'"
                />
             </div>
             <div className="flex flex-wrap items-center justify-between gap-4">
                <ProviderSelector selectedProvider={provider} onProviderChange={setProvider} />
                <button
                  onClick={handleGenerate}
                  disabled={!description.trim() || isGenerating}
                  className="group relative w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-emerald-500/25 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105"
                >
                  <span className="flex items-center justify-center space-x-3">
                    {isGenerating ? (
                      <>
                        <LoaderCircle className="animate-spin w-5 h-5" />
                        <span>Generating...</span>
                      </>
                    ) : (
                      <>
                        <RocketIcon className="w-5 h-5" />
                        <span>Generate Code</span>
                        <ArrowRightIcon className="w-5 h-5 group-hover:translate-x-1 transition-transform duration-200" />
                      </>
                    )}
                  </span>
                </button>
             </div>
          </div>
        </GlassCard>

        {/* Loading Spinner */}
        {isGenerating && (
            <GlassCard>
                <div className="flex flex-col items-center justify-center p-8 space-y-4">
                    <LoaderCircle className="w-12 h-12 animate-spin text-emerald-400" />
                    <p className="text-slate-300 text-lg">AI is crafting your infrastructure code...</p>
                </div>
            </GlassCard>
        )}

        {/* Result Section */}
        {result && (
          <>
            {!result.is_valid_request ? (
              <InvalidRequestCard message={result.explanation} />
            ) : (
              <GlassCard className="animate-in slide-in-from-bottom-4 duration-700">
                <div className="flex items-center space-x-3 mb-6">
                  <div className="w-12 h-12 bg-gradient-to-r from-green-400 to-emerald-500 rounded-lg flex items-center justify-center shadow-lg">
                    <CheckCircle2 className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
                    Generated Terraform Code
                  </h3>
                  {result.cached_response && (
                    <span className="px-2 py-1 bg-yellow-500/20 text-yellow-300 rounded-lg text-xs font-medium border border-yellow-500/30">
                      Cached
                    </span>
                  )}
                </div>

                {/* --- Architecture Diagram --- */}
                <ArchitectureDiagram diagramUrl={result.architecture_diagram_url} resources={result.resources} />

                {/* --- File Hierarchy & Resources --- */}
                 {result.file_hierarchy && (
                    <div className="mb-6 p-4 bg-slate-800/30 backdrop-blur-sm rounded-xl border border-slate-700/30">
                        <div className="flex items-center space-x-2 mb-3">
                        <Folder className="w-5 h-5 text-cyan-400" />
                        <h4 className="font-semibold text-slate-200">File Hierarchy</h4>
                        </div>
                        <pre className="text-slate-300 font-mono text-sm leading-relaxed whitespace-pre-wrap">
                        {result.file_hierarchy}
                        </pre>
                    </div>
                )}
                {result.resources && result.resources.length > 0 && (
                    <div className="mb-6 p-4 bg-slate-800/30 backdrop-blur-sm rounded-xl border border-slate-700/30">
                        <div className="flex items-center space-x-2 mb-3">
                        <Layers className="w-5 h-5 text-emerald-400" />
                        <h4 className="font-semibold text-slate-200">Resources Created</h4>
                        </div>
                        <div className="flex flex-wrap gap-2">
                        {result.resources.map((resource, index) => (
                            <span key={index} className="px-3 py-1 bg-emerald-500/20 text-emerald-300 rounded-full text-sm font-medium border border-emerald-500/30">
                            {resource}
                            </span>
                        ))}
                        </div>
                    </div>
                )}

                {/* --- Code Display --- */}
                {result.multi_cloud_code ? (
                  <MultiCloudTabs multiCloudCode={result.multi_cloud_code} onCopy={handleCopyToClipboard} />
                ) : (
                  <div className="relative mb-6">
                    <pre className="bg-slate-900/80 backdrop-blur-sm border border-slate-700/50 text-emerald-300 p-6 rounded-xl overflow-auto text-sm leading-relaxed shadow-inner max-h-[500px] font-mono">
                      <code>{result.code}</code>
                    </pre>
                    <button
                      onClick={() => handleCopyToClipboard(result.code)}
                      className="absolute top-4 right-4 p-2 bg-slate-800/80 hover:bg-slate-700/80 rounded-lg text-slate-400 hover:text-white transition-all duration-200"
                      title="Copy code"
                    >
                      <Clipboard className="w-4 h-4" />
                    </button>
                  </div>
                )}
                
                {/* --- Explanations & Cost --- */}
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="p-4 bg-slate-800/30 backdrop-blur-sm rounded-xl border border-slate-700/30">
                    <div className="flex items-center space-x-2 mb-3">
                      <BrainCircuit className="w-5 h-5 text-purple-400"/>
                      <h4 className="font-semibold text-slate-200">Explanation</h4>
                    </div>
                    <p className="text-slate-300 leading-relaxed">{result.explanation}</p>
                  </div>

                  <div className="p-4 bg-slate-800/30 backdrop-blur-sm rounded-xl border border-slate-700/30">
                    <div className="flex items-center space-x-2 mb-3">
                      <DollarSign className="w-5 h-5 text-green-400" />
                      <h4 className="font-semibold text-slate-200">Estimated Cost</h4>
                    </div>
                    <p className="text-slate-300">{result.estimated_cost}</p>
                  </div>
                </div>

                {/* --- File & Folder Explanations --- */}
                <FileExplanations explanations={result.file_explanations} />
                
                {/* --- Generation Info --- */}
                <div className="mt-6 pt-4 border-t border-slate-700/30">
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span className='flex items-center gap-2'><Clock className='w-3 h-3'/> Generated on {new Date(result.generated_at).toLocaleString()}</span>
                    <span className='flex items-center gap-2'><Server className='w-3 h-3'/> Provider: {result.provider?.toUpperCase()}</span>
                  </div>
                </div>
              </GlassCard>
            )}
          </>
        )}
      </main>

       {/* Footer */}
        <footer className="relative z-10 mt-16 border-t border-slate-800/50 bg-slate-900/30 backdrop-blur-md">
            <div className="max-w-6xl mx-auto px-6 py-8">
                <div className="text-center text-sm text-slate-400">
                    <span>© {new Date().getFullYear()} AI Terraform Coder. Built with ❤️ by Malan.</span>
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