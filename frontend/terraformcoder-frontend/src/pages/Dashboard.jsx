import React, { useState, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { generateCode } from '../services/api';

// Enhanced UI Components
import GlassCard from '../components/GlassCard';
import ProviderSelector from '../components/ProviderSelector';
import DynamicFileRenderer from '../components/DynamicFileRenderer';
import EnhancedArchitectureDiagram from '../components/EnhancedArchitectureDiagram';
import MultiCloudTabs from '../components/MultiCloudTabs';
import FileExplanations from '../components/FileExplanations';
import InvalidRequestCard from '../components/InvalidRequestCard';

// Icons from Lucide
import {
  LogOut,
  Bolt,
  ArrowRight,
  Loader,
  Rocket,
  CheckCircle2,
  Copy,
  BrainCircuit,
  DollarSign,
  Layers,
  Folder,
  Clock,
  Server,
  AlertTriangle,
  Clipboard,
  Zap,
  Sparkles,
  FileText,
  Eye
} from 'lucide-react';

const EnhancedDashboard = () => {
  const [description, setDescription] = useState('');
  const [provider, setProvider] = useState('aws');
  const [result, setResult] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [includeDiagram, setIncludeDiagram] = useState(true);
  const { user, logout } = useContext(AuthContext);

  const handleGenerate = async () => {
    if (!description.trim()) return;

    setIsGenerating(true);
    setResult(null);
    try {
      const token = localStorage.getItem('token');
      const res = await generateCode(description, provider, token, includeDiagram);
      setResult(res.data);
    } catch (err) {
      setResult({
        is_valid_request: false,
        explanation: err.response?.data?.detail || 'An unexpected error occurred. Please try again.',
        files: [],
        resources: [],
        estimated_cost: 'Unknown'
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    // TODO: Add toast notification for copy success
  };

  const renderGenerationProgress = () => {
    if (!isGenerating) return null;

    return (
      <GlassCard>
        <div className="flex flex-col items-center justify-center p-8 space-y-6">
          <div className="relative">
            <Loader className="w-16 h-16 animate-spin text-emerald-400" />
            <SparklesIcon className="w-6 h-6 text-yellow-400 absolute top-5 left-5 animate-pulse" />
          </div>
          <div className="text-center space-y-2">
            <p className="text-slate-300 text-lg font-medium">AI is crafting your infrastructure code...</p>
            <p className="text-slate-500 text-sm">Analyzing requirements, generating files, and creating explanations</p>
          </div>
          <div className="flex items-center space-x-2 text-xs text-slate-600">
            <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
            <span>Processing with neural networks</span>
          </div>
        </div>
      </GlassCard>
    );
  };

  const renderEnhancedResults = () => {
    if (!result) return null;

    if (!result.is_valid_request) {
      return <InvalidRequestCard message={result.explanation} />;
    }

    return (
      <div className="space-y-6">
        {/* Results Header */}
        <GlassCard className="animate-in slide-in-from-bottom-4 duration-700">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-gradient-to-r from-green-400 to-emerald-500 rounded-lg flex items-center justify-center shadow-lg">
                <CheckCircle2 className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-2xl font-bold bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
                  Infrastructure Generated Successfully
                </h3>
                <p className="text-slate-400">Advanced AI processing with neural summarization</p>
              </div>
            </div>
            {result.cached_response && (
              <span className="px-3 py-1 bg-yellow-500/20 text-yellow-300 rounded-lg text-sm font-medium border border-yellow-500/30 flex items-center space-x-1">
                <Clipboard className="w-3 h-3" />
                <span>Cached</span>
              </span>
            )}
          </div>

          {/* Generation Summary */}
          <div className="grid md:grid-cols-3 gap-4">
            <div className="p-4 bg-slate-800/30 backdrop-blur-sm rounded-xl border border-slate-700/30">
              <div className="flex items-center space-x-2 mb-2">
                <FileText className="w-4 h-4 text-emerald-400" />
                <h4 className="font-semibold text-slate-200 text-sm">Files Generated</h4>
              </div>
              <p className="text-2xl font-bold text-emerald-400">
                {result.files ? result.files.length : 0}
              </p>
            </div>

            <div className="p-4 bg-slate-800/30 backdrop-blur-sm rounded-xl border border-slate-700/30">
              <div className="flex items-center space-x-2 mb-2">
                <Layers className="w-4 h-4 text-blue-400" />
                <h4 className="font-semibold text-slate-200 text-sm">Resources</h4>
              </div>
              <p className="text-2xl font-bold text-blue-400">
                {result.resources ? result.resources.length : 0}
              </p>
            </div>

            <div className="p-4 bg-slate-800/30 backdrop-blur-sm rounded-xl border border-slate-700/30">
              <div className="flex items-center space-x-2 mb-2">
                <DollarSign className="w-4 h-4 text-green-400" />
                <h4 className="font-semibold text-slate-200 text-sm">Est. Cost</h4>
              </div>
              <p className="text-lg font-bold text-green-400">
                {result.estimated_cost}
              </p>
            </div>
          </div>
        </GlassCard>

        {/* Enhanced Architecture Diagram */}
        <EnhancedArchitectureDiagram 
          architectureDiagram={result.architecture_diagram}
          resources={result.resources}
          description={description}
        />

        {/* Dynamic File Renderer */}
        {result.files && result.files.length > 0 && (
          <GlassCard>
            <DynamicFileRenderer 
              files={result.files} 
              onCopy={handleCopyToClipboard}
            />
          </GlassCard>
        )}

        {/* Multi-Cloud Code Display (Fallback) */}
        {result.multi_cloud_code && (
          <GlassCard>
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 bg-gradient-to-r from-cyan-400 to-blue-500 rounded-lg flex items-center justify-center shadow-lg">
                <Server className="w-5 h-5 text-white" />
              </div>
              <h3 className="text-xl font-bold bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
                Multi-Cloud Implementation
              </h3>
            </div>
            <MultiCloudTabs multiCloudCode={result.multi_cloud_code} onCopy={handleCopyToClipboard} />
          </GlassCard>
        )}

        {/* Legacy Code Display (Fallback) */}
        {result.code && !result.files && (
          <GlassCard>
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 bg-gradient-to-r from-green-400 to-emerald-500 rounded-lg flex items-center justify-center shadow-lg">
                <CheckCircle2 className="w-5 h-5 text-white" />
              </div>
              <h3 className="text-xl font-bold bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
                Generated Code
              </h3>
            </div>
            <div className="relative">
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
          </GlassCard>
        )}

        {/* Explanation & Additional Info */}
        <div className="grid md:grid-cols-2 gap-6">
          <GlassCard>
            <div className="flex items-center space-x-2 mb-4">
              <BrainCircuit className="w-5 h-5 text-purple-400"/>
              <h4 className="font-semibold text-slate-200 text-lg">AI Analysis</h4>
            </div>
            <p className="text-slate-300 leading-relaxed">{result.explanation}</p>
          </GlassCard>

          <GlassCard>
            <div className="space-y-4">
              {/* File Hierarchy */}
              {result.file_hierarchy && (
                <div>
                  <div className="flex items-center space-x-2 mb-3">
                    <Folder className="w-5 h-5 text-cyan-400" />
                    <h4 className="font-semibold text-slate-200">Project Structure</h4>
                  </div>
                  <pre className="text-slate-300 font-mono text-sm leading-relaxed whitespace-pre-wrap bg-slate-900/50 p-3 rounded-lg">
                    {result.file_hierarchy}
                  </pre>
                </div>
              )}

              {/* Resources */}
              {result.resources && result.resources.length > 0 && (
                <div>
                  <div className="flex items-center space-x-2 mb-3">
                    <Layers className="w-5 h-5 text-emerald-400" />
                    <h4 className="font-semibold text-slate-200">Infrastructure Resources</h4>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {result.resources.slice(0, 6).map((resource, index) => (
                      <span key={index} className="px-3 py-1 bg-emerald-500/20 text-emerald-300 rounded-full text-xs font-medium border border-emerald-500/30">
                        {resource}
                      </span>
                    ))}
                    {result.resources.length > 6 && (
                      <span className="px-3 py-1 bg-slate-500/20 text-slate-300 rounded-full text-xs font-medium border border-slate-500/30">
                        +{result.resources.length - 6} more
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          </GlassCard>
        </div>

        {/* File Explanations (Legacy Support) */}
        <FileExplanations explanations={result.file_explanations} />
        
        {/* Generation Metadata */}
        <GlassCard>
          <div className="flex items-center justify-between text-sm text-slate-400">
            <div className="flex items-center space-x-4">
              <span className='flex items-center gap-2'>
                <Clock className='w-4 h-4'/>
                Generated on {new Date(result.generated_at).toLocaleString()}
              </span>
              <span className='flex items-center gap-2'>
                <Server className='w-4 h-4'/>
                Provider: {result.provider?.toUpperCase()}
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <ZapIcon className="w-4 h-4 text-emerald-400" />
              <span className="text-emerald-400 font-medium">AI-Enhanced Generation</span>
            </div>
          </div>
        </GlassCard>
      </div>
    );
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
            <p className="text-sm text-slate-400">Neural-Enhanced Infrastructure Generation</p>
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
        {/* Enhanced Input Section */}
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
                Describe your infrastructure needs for AI-powered code generation
              </p>
            </div>
          </div>

          <div className="space-y-6">
             <div className="relative">
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full p-4 rounded-xl bg-slate-800/50 backdrop-blur-sm text-white border border-slate-700/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all duration-300 placeholder-slate-400 resize-none font-mono"
                  rows={5}
                  placeholder="e.g., 'Create a secure AWS VPC with public and private subnets, load balancer, EC2 instances, and RDS database with automated backup and monitoring.'"
                />
                <div className="absolute bottom-3 right-3 text-xs text-slate-500">
                  {description.length}/1000
                </div>
             </div>
             
             <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center space-x-4">
                  <ProviderSelector selectedProvider={provider} onProviderChange={setProvider} />
                  
                  {/* Diagram Toggle */}
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="include-diagram"
                      checked={includeDiagram}
                      onChange={(e) => setIncludeDiagram(e.target.checked)}
                      className="w-4 h-4 text-emerald-600 bg-slate-700 border-slate-600 rounded focus:ring-emerald-500 focus:ring-2"
                    />
                    <label htmlFor="include-diagram" className="text-slate-300 text-sm flex items-center space-x-1">
                      <Eye className="w-3 h-3" />
                      <span>Generate Diagram</span>
                    </label>
                  </div>
                </div>
                
                <button
                  onClick={handleGenerate}
                  disabled={!description.trim() || isGenerating}
                  className="group relative w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-emerald-500/25 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105"
                >
                  <span className="flex items-center justify-center space-x-3">
                    {isGenerating ? (
                      <>
                        <Loader className="animate-spin w-5 h-5" />
                        <span>Processing...</span>
                      </>
                    ) : (
                      <>
                        <RocketIcon className="w-5 h-5" />
                        <span>Generate Infrastructure</span>
                        <ArrowRightIcon className="w-5 h-5 group-hover:translate-x-1 transition-transform duration-200" />
                      </>
                    )}
                  </span>
                </button>
             </div>
          </div>
        </GlassCard>

        {/* Generation Progress */}
        {renderGenerationProgress()}

        {/* Enhanced Results */}
        {renderEnhancedResults()}
      </main>

       {/* Footer */}
        <footer className="relative z-10 mt-16 border-t border-slate-800/50 bg-slate-900/30 backdrop-blur-md">
            <div className="max-w-6xl mx-auto px-6 py-8">
                <div className="text-center text-sm text-slate-400">
                    <span>© {new Date().getFullYear()} AI Terraform Coder. Enhanced with Neural Processing by Malan.</span>
                </div>
            </div>
        </footer>
    </div>
  );
};

export default EnhancedDashboard;


