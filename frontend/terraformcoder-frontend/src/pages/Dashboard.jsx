import React, { useState, useContext, useEffect } from 'react';
import { AuthContext } from '../context/AuthContext';
import { generateCode } from '../services/api';

// Components
import GlassCard from '../components/GlassCard';
import ProviderSelector from '../components/ProviderSelector';
import DynamicFileRenderer from '../components/DynamicFileRenderer';
import EnhancedArchitectureDiagram from '../components/EnhancedArchitectureDiagram';
import InvalidRequestCard from '../components/InvalidRequestCard';
import HistorySidebar from '../components/HistorySidebar';
import UpgradeModal from '../components/UpgradeModal';
import { getGenerationById, downloadGenerationZip, getBillingStatus } from '../services/api';

import {
  LogOut,
  Bolt,
  Loader,
  CheckCircle2,
  Copy,
  BrainCircuit,
  DollarSign,
  Layers,
  Zap,
  Sparkles,
  FileText,
  Eye,
  Download,
  FolderTree,
  Menu,
  Send,
} from 'lucide-react';

const EnhancedDashboard = () => {
  const [description, setDescription] = useState('');
  const [provider, setProvider] = useState('aws');
  const [result, setResult] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [includeDiagram, setIncludeDiagram] = useState(true);
  const [billingStatus, setBillingStatus] = useState({ plan: 'free', generation_count: 0, limit: 5 });
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { user, logout } = useContext(AuthContext);


  useEffect(() => {
    const fetchBillingStatus = async () => {
      try {
        const res = await getBillingStatus();
        setBillingStatus(res.data);
      } catch (err) {
        console.error('Failed to fetch billing status:', err);
      }
    };
    if (user) fetchBillingStatus();
  }, [user]);



  const handleSelectHistory = async (id) => {
    setIsLoadingHistory(true);
    setResult(null);
    try {
      const res = await getGenerationById(id);
      setResult(res.data);
      if (res.data.description) setDescription(res.data.description);
      if (res.data.provider) setProvider(res.data.provider);
    } catch (err) {
      console.error('Error loading history item:', err);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const handleGenerate = async () => {
    if (!description.trim()) return;
    setIsGenerating(true);
    setResult(null);
    try {
      const token = localStorage.getItem('token');
      const res = await generateCode(description, provider, token, includeDiagram);
      setResult(res.data);
      if (billingStatus.plan === 'free') {
        setBillingStatus(prev => ({ ...prev, generation_count: prev.generation_count + 1 }));
      }
    } catch (err) {
      if (err.response?.status === 429) {
        setIsUpgradeModalOpen(true);
        setResult(null);
      } else {
        setResult({
          is_valid_request: false,
          explanation: err.response?.data?.detail || 'An unexpected error occurred. Please try again.',
          files: [], resources: [], estimated_cost: 'Unknown', file_hierarchy: ''
        });
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownloadZip = async () => {
    if (!result?.id) {
      alert('No generation ID found. Please generate code first.');
      return;
    }
    setIsDownloading(true);
    try {
      await downloadGenerationZip(result.id);
    } catch (err) {
      console.error('Download error:', err);
      alert('Download failed. Please try again or check if the backend is running.');
    } finally {
      setIsDownloading(false);
    }
  };

  const handleCopyToClipboard = (text) => navigator.clipboard.writeText(text);

  const handleCopyFileHierarchy = () => {
    if (result?.file_hierarchy) navigator.clipboard.writeText(result.file_hierarchy);
  };

  const handleNewChat = () => { setResult(null); setDescription(''); };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey && description.trim() && !isGenerating) {
      e.preventDefault();
      handleGenerate();
    }
  };

  // ── Render: Generation Progress ─────────────────────────
  const renderGenerationProgress = () => {
    if (!isGenerating) return null;
    return (
      <GlassCard>
        <div className="flex flex-col items-center justify-center p-10 space-y-5">
          <div className="relative">
            <div className="w-14 h-14 rounded-full border-2 border-emerald-500/30 border-t-emerald-400 animate-spin" />
            <Sparkles className="w-5 h-5 text-emerald-400 absolute top-4 left-4 animate-pulse" />
          </div>
          <div className="text-center space-y-1">
            <p className="text-slate-200 font-medium">Generating your infrastructure...</p>
            <p className="text-slate-500 text-sm">AI is crafting production-ready Terraform code</p>
          </div>
        </div>
      </GlassCard>
    );
  };

  // ── Render: File Hierarchy ──────────────────────────────
  const renderFileHierarchy = () => {
    if (!result?.file_hierarchy) return null;
    return (
      <GlassCard>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <FolderTree className="w-4 h-4 text-cyan-400" />
            <h4 className="font-semibold text-slate-200 text-sm">Project Structure</h4>
            <span className="px-1.5 py-0.5 bg-cyan-500/15 text-cyan-300 rounded-full text-[10px] font-medium">
              {result.files?.length || 0} files
            </span>
          </div>
          <button onClick={handleCopyFileHierarchy}
            className="flex items-center gap-1 px-2 py-1 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-xs text-slate-400 hover:text-slate-200 transition-colors">
            <Copy className="w-3 h-3" /><span>Copy</span>
          </button>
        </div>
        <div className="p-3 bg-slate-950/50 rounded-xl border border-white/[0.04]">
          <pre className="text-slate-300 font-mono text-xs leading-relaxed whitespace-pre-wrap overflow-x-auto">
            {result.file_hierarchy}
          </pre>
        </div>
      </GlassCard>
    );
  };

  // ── Render: Results ─────────────────────────────────────
  const renderResults = () => {
    if (!result) return null;
    if (!result.is_valid_request) return <InvalidRequestCard message={result.explanation} />;

    return (
      <div className="space-y-4">
        {/* Success Header — compact */}
        <GlassCard>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-emerald-400 to-cyan-400 rounded-lg flex items-center justify-center shadow-lg shadow-emerald-500/20">
                <CheckCircle2 className="w-4 h-4 text-white" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Infrastructure Generated</h3>
                <p className="text-xs text-slate-400">Production-ready code with AI analysis</p>
              </div>
            </div>
            {result.id && (
              <button onClick={handleDownloadZip} disabled={isDownloading}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 rounded-lg text-xs font-medium border border-emerald-500/25 transition-all disabled:opacity-50">
                {isDownloading ? <Loader className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                <span className="hidden sm:inline">Download ZIP</span>
              </button>
            )}
          </div>

          {/* Compact Stats */}
          <div className="grid grid-cols-3 gap-2">
            <div className="p-2.5 bg-white/[0.03] rounded-lg border border-white/[0.04] text-center">
              <p className="text-lg font-bold text-emerald-400">{result.files?.length || 0}</p>
              <p className="text-[10px] text-slate-500">Files</p>
            </div>
            <div className="p-2.5 bg-white/[0.03] rounded-lg border border-white/[0.04] text-center">
              <p className="text-lg font-bold text-blue-400">{result.resources?.length || 0}</p>
              <p className="text-[10px] text-slate-500">Resources</p>
            </div>
            <div className="p-2.5 bg-white/[0.03] rounded-lg border border-white/[0.04] text-center">
              <p className="text-sm font-bold text-green-400">{result.estimated_cost}</p>
              <p className="text-[10px] text-slate-500">Est. Cost</p>
            </div>
          </div>

          {/* AI Analysis */}
          {result.explanation && (
            <div className="mt-4 p-3 bg-white/[0.03] rounded-lg border border-white/[0.04]">
              <div className="flex items-center gap-1.5 mb-2">
                <BrainCircuit className="w-3.5 h-3.5 text-purple-400" />
                <h4 className="font-medium text-slate-200 text-xs">AI Analysis</h4>
              </div>
              <p className="text-slate-300 text-xs leading-relaxed">{result.explanation}</p>
            </div>
          )}
        </GlassCard>

        {/* Architecture Diagram */}
        <EnhancedArchitectureDiagram
          architectureDiagram={result.architecture_diagram}
          resources={result.resources}
          description={description}
        />

        {/* File Hierarchy */}
        {renderFileHierarchy()}

        {/* Generated Files */}
        {result.files && result.files.length > 0 && (
          <GlassCard>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 bg-gradient-to-br from-orange-400 to-red-500 rounded-lg flex items-center justify-center shadow-lg">
                <FileText className="w-4 h-4 text-white" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Infrastructure Code</h3>
                <p className="text-xs text-slate-400">{result.files.length} files generated</p>
              </div>
            </div>
            <DynamicFileRenderer files={result.files} onCopy={handleCopyToClipboard} />
          </GlassCard>
        )}

      </div>
    );
  };

  // ── Input Bar ───────────────────────────────────────────
  const renderInputBar = () => (
    <div className="w-full max-w-3xl mx-auto">
      <div className="relative bg-white/[0.04] border border-white/[0.08] rounded-2xl backdrop-blur-xl shadow-2xl transition-all duration-300 focus-within:border-emerald-500/30 focus-within:shadow-emerald-500/5">
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          onKeyDown={handleKeyDown}
          className="w-full bg-transparent text-white placeholder-slate-500 px-5 pt-4 pb-14 rounded-2xl resize-none focus:outline-none text-sm leading-relaxed"
          rows={hasResults ? 2 : 4}
          placeholder="Describe your cloud infrastructure... (e.g., 'Create a secure AWS VPC with subnets, ALB, EC2, and RDS')"
        />
        <div className="absolute bottom-0 left-0 right-0 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ProviderSelector selectedProvider={provider} onProviderChange={setProvider} />
            <button onClick={() => setIncludeDiagram(!includeDiagram)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 border
                ${includeDiagram
                  ? 'bg-purple-500/20 border-purple-500/40 text-purple-300'
                  : 'bg-white/[0.04] border-white/[0.08] text-slate-500 hover:text-slate-300'}`}>
              <Eye className="w-3 h-3" /><span>Diagram</span>
            </button>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-600">{description.length}/1000</span>
            <button onClick={handleGenerate} disabled={!description.trim() || isGenerating}
              className="w-9 h-9 flex items-center justify-center rounded-full bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-white shadow-lg shadow-emerald-500/20 transition-all duration-200 disabled:opacity-30 disabled:shadow-none disabled:cursor-not-allowed hover:scale-105">
              {isGenerating ? <Loader className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  // ── Main Layout ─────────────────────────────────────────
  const hasResults = result || isGenerating || isLoadingHistory;

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-slate-950 via-purple-950/50 to-slate-950 font-sans text-white flex flex-col">
      {/* Ambient background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-cyan-600/10 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-emerald-600/5 rounded-full blur-3xl" />
      </div>

      {/* Sidebar (logout moved here — see HistorySidebar) */}
      <HistorySidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        onSelect={handleSelectHistory}
        onNewChat={handleNewChat}
        onLogout={logout}
      />

      {/* Header — minimal, no logout (moved to sidebar) */}
      <header className="relative z-10 flex items-center justify-between px-6 py-4 border-b border-white/[0.04] flex-shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={() => setIsSidebarOpen(true)}
            className="p-2 rounded-xl hover:bg-white/[0.06] text-slate-400 hover:text-white transition-colors">
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-gradient-to-br from-emerald-400 to-cyan-400 rounded-lg flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <Bolt className="w-4 h-4 text-white" />
            </div>
            <h1 className="text-lg font-semibold bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent hidden sm:block">
              AI Terraform Coder
            </h1>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {billingStatus.plan === 'free' && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white/[0.04] rounded-full border border-white/[0.06] text-xs">
              <Zap className="w-3 h-3 text-emerald-400" />
              <span className="text-slate-300 font-medium">{billingStatus.generation_count}/{billingStatus.limit}</span>
            </div>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 flex-1 flex flex-col min-h-0">
        {!hasResults ? (
          /* ── EMPTY STATE: Centered greeting ── */
          <div className="flex-1 flex flex-col items-center justify-center px-6 pb-20">
            <div className="text-center mb-10 max-w-2xl">
              <div className="animate-fade-in-up">
                <div className="w-14 h-14 bg-gradient-to-br from-emerald-400 to-cyan-400 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-emerald-500/20">
                  <Sparkles className="w-7 h-7 text-white" />
                </div>
              </div>
              <h2 className="text-3xl sm:text-4xl font-bold text-white mb-3 animate-fade-in-up">
                Welcome back{user?.name ? `, ${user.name}` : ''}.
              </h2>
              <p className="text-lg text-slate-400 animate-fade-in-up-delay">
                What infrastructure are we building today?
              </p>
            </div>
            <div className="animate-fade-in-up-delay-2 w-full">
              {renderInputBar()}
            </div>
          </div>
        ) : (
          /* ── RESULTS STATE: Scrollable results + input at bottom ── */
          <>
            {/* Scrollable results area */}
            <div className="flex-1 overflow-y-auto px-6 py-6">
              <div className="max-w-4xl mx-auto space-y-4">
                {isLoadingHistory && (
                  <GlassCard>
                    <div className="flex flex-col items-center justify-center p-6 space-y-3">
                      <Loader className="w-8 h-8 text-blue-400 animate-spin" />
                      <p className="text-slate-300 text-sm">Loading infrastructure details...</p>
                    </div>
                  </GlassCard>
                )}
                {renderGenerationProgress()}
                {renderResults()}
              </div>
            </div>

            {/* Input bar fixed at bottom */}
            <div className="flex-shrink-0 px-6 py-4 border-t border-white/[0.04]">
              {renderInputBar()}
            </div>
          </>
        )}
      </main>

      <UpgradeModal isOpen={isUpgradeModalOpen} onClose={() => setIsUpgradeModalOpen(false)} />
    </div>
  );
};

export default EnhancedDashboard;