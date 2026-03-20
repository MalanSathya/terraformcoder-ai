import React, { useState, useContext, useEffect, useRef } from 'react';
import JSZip from 'jszip';
import { AuthContext } from '../context/AuthContext';
import { generateCode, shareGeneration } from '../services/api';

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
  Bolt,
  Loader,
  CheckCircle2,
  Copy,
  Check,
  Zap,
  Sparkles,
  FileText,
  Eye,
  Download,
  FolderTree,
  Menu,
  Send,
  ArrowRight,
  Share2,
  Link2,
  User,
  Bot,
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
  const scrollRef = useRef(null);

  // Chat state (Feature 2)
  const [messages, setMessages] = useState([]); // [{role, content, result?}]

  // Share state (Feature 1)
  const [isSharing, setIsSharing] = useState(false);
  const [shareUrl, setShareUrl] = useState('');
  const [isShared, setIsShared] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);


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

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if ((messages.length > 0 || isGenerating) && scrollRef.current) {
      setTimeout(() => {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      }, 100);
    }
  }, [messages, isGenerating]);


  const handleSelectHistory = async (id) => {
    setIsLoadingHistory(true);
    setResult(null);
    setMessages([]);
    setShareUrl('');
    setIsShared(false);
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

  // "Continue this" — loads the generation as first assistant message in a new chat thread
  const handleContinueHistory = async (id) => {
    setIsLoadingHistory(true);
    setResult(null);
    setShareUrl('');
    setIsShared(false);
    try {
      const res = await getGenerationById(id);
      const data = res.data;
      // Start a new chat thread with this as the first assistant message
      setMessages([
        {
          role: 'assistant',
          content: data.explanation || 'Infrastructure generated.',
          result: data,
        },
      ]);
      setResult(data);
      setDescription('');
      if (data.provider) setProvider(data.provider);
    } catch (err) {
      console.error('Error loading history for continue:', err);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const handleGenerate = async () => {
    if (!description.trim()) return;
    setIsGenerating(true);
    setShareUrl('');
    setIsShared(false);

    // Append user message to chat
    const userMsg = { role: 'user', content: description };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);

    try {
      const token = localStorage.getItem('token');

      // Build conversation history from the last 6 messages
      const conversationHistory = newMessages.slice(-6).map((m) => ({
        role: m.role,
        content: m.role === 'assistant' ? (m.result?.explanation || m.content) : m.content,
      }));

      // Determine parent generation ID (last assistant message with a result)
      let parentGenerationId = null;
      for (let i = newMessages.length - 1; i >= 0; i--) {
        if (newMessages[i].role === 'assistant' && newMessages[i].result?.id) {
          parentGenerationId = newMessages[i].result.id;
          break;
        }
      }

      const res = await generateCode(description, provider, token, includeDiagram, conversationHistory, parentGenerationId);
      const data = res.data;

      // Append assistant message
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: data.explanation || 'Infrastructure generated.', result: data },
      ]);

      setResult(data);
      setDescription('');

      if (billingStatus.plan === 'free') {
        setBillingStatus((prev) => ({ ...prev, generation_count: prev.generation_count + 1 }));
      }
    } catch (err) {
      if (err.response?.status === 429) {
        setIsUpgradeModalOpen(true);
        // Remove the user message we just added since it failed
        setMessages(messages);
      } else {
        const errorResult = {
          is_valid_request: false,
          explanation: err.response?.data?.detail || 'An unexpected error occurred. Please try again.',
          files: [], resources: [], estimated_cost: 'Unknown', file_hierarchy: ''
        };
        setMessages((prev) => [
          ...prev,
          { role: 'assistant', content: errorResult.explanation, result: errorResult },
        ]);
        setResult(errorResult);
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownloadZip = async () => {
    if (!result?.files || result.files.length === 0) {
      alert('No files available to download. Please generate code first.');
      return;
    }
    setIsDownloading(true);
    try {
      if (result.id) {
        await downloadGenerationZip(result.id);
      } else {
        const zip = new JSZip();
        result.files.forEach((file) => {
          if (file.filename && file.content) {
            zip.file(file.filename, file.content);
          }
        });
        zip.file('README.md', `# TerraformCoder AI Generation\n\n**Provider**: ${result.provider || 'Unknown'}\n\nGenerated by AI. Please review the code before deployment.`);
        const blob = await zip.generateAsync({ type: 'blob' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `terraform-code.zip`);
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
      }
    } catch (err) {
      console.error('Download error:', err);
      alert('Download failed. Please try again.');
    } finally {
      setIsDownloading(false);
    }
  };

  const handleShare = async () => {
    if (!result?.id) return;
    setIsSharing(true);
    try {
      const res = await shareGeneration(result.id);
      if (res.data.shared) {
        setIsShared(true);
        setShareUrl(res.data.url);
      } else {
        setIsShared(false);
        setShareUrl('');
      }
    } catch (err) {
      console.error('Share error:', err);
    } finally {
      setIsSharing(false);
    }
  };

  const handleCopyShareUrl = () => {
    navigator.clipboard.writeText(shareUrl);
    setShareCopied(true);
    setTimeout(() => setShareCopied(false), 2000);
  };

  const handleCopyToClipboard = (text) => navigator.clipboard.writeText(text);

  const handleCopyFileHierarchy = () => {
    if (result?.file_hierarchy) navigator.clipboard.writeText(result.file_hierarchy);
  };

  const handleNewChat = () => { setResult(null); setDescription(''); setMessages([]); setShareUrl(''); setIsShared(false); };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey && description.trim() && !isGenerating) {
      e.preventDefault();
      handleGenerate();
    }
  };

  // ── Render: Chat Messages ──────────────────────────────
  const renderChatMessages = () => {
    if (messages.length === 0 && !isGenerating && !isLoadingHistory) return null;

    return (
      <div className="space-y-4">
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] ${msg.role === 'user' ? 'order-2' : 'order-1'}`}>
              {/* Message bubble */}
              <div className={`flex items-start gap-2.5 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${msg.role === 'user'
                  ? 'bg-gradient-to-br from-emerald-400 to-cyan-400'
                  : 'bg-gradient-to-br from-purple-400 to-violet-500'
                  }`}>
                  {msg.role === 'user' ? <User className="w-3.5 h-3.5 text-white" /> : <Bot className="w-3.5 h-3.5 text-white" />}
                </div>
                <div className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${msg.role === 'user'
                  ? 'bg-emerald-500/15 border border-emerald-500/25 text-emerald-100 rounded-br-md'
                  : 'bg-white/[0.04] border border-white/[0.08] text-slate-300 rounded-bl-md'
                  }`}>
                  {msg.content}
                </div>
              </div>

            </div>
          </div>
        ))}
      </div>
    );
  };

  // ── Render: Generation Progress ─────────────────────────
  const renderGenerationProgress = () => {
    if (!isGenerating) return null;
    return (
      <div className="flex justify-start">
        <div className="max-w-[85%]">
          <div className="flex items-start gap-2.5">
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-purple-400 to-violet-500 flex items-center justify-center flex-shrink-0">
              <Bot className="w-3.5 h-3.5 text-white" />
            </div>
            <div className="px-4 py-3 bg-white/[0.04] border border-white/[0.08] rounded-2xl rounded-bl-md">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-full border-2 border-emerald-500/30 border-t-emerald-400 animate-spin" />
                <span className="text-slate-400 text-sm">Generating infrastructure...</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // ── Render: Active Result Panel (shown for the latest result) ─
  const renderActiveResult = () => {
    if (!result) return null;
    if (!result.is_valid_request) return <InvalidRequestCard message={result.explanation} />;

    return (
      <div className="space-y-4">
        {/* Success Header */}
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

            {/* Share button */}
            {result.id && (
              <button onClick={handleShare} disabled={isSharing}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all disabled:opacity-50 ${isShared
                  ? 'bg-blue-500/15 border-blue-500/25 text-blue-300 hover:bg-blue-500/25'
                  : 'bg-white/[0.04] border-white/[0.08] text-slate-400 hover:text-white hover:bg-white/[0.08]'
                  }`}>
                {isSharing ? <Loader className="w-3.5 h-3.5 animate-spin" /> : <Share2 className="w-3.5 h-3.5" />}
                <span>{isShared ? 'Unshare' : 'Share'}</span>
              </button>
            )}
          </div>

          {/* Share URL inline display */}
          {isShared && shareUrl && (
            <div className="mb-4 flex items-center gap-2 p-2.5 bg-blue-500/10 border border-blue-500/20 rounded-xl">
              <Link2 className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />
              <p className="text-xs text-blue-300 flex-1 font-mono truncate">{shareUrl}</p>
              <button onClick={handleCopyShareUrl}
                className="px-2.5 py-1 bg-blue-500/20 rounded-lg text-xs text-blue-300 hover:bg-blue-500/30 transition-colors flex items-center gap-1 flex-shrink-0">
                {shareCopied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                {shareCopied ? 'Copied!' : 'Copy'}
              </button>
            </div>
          )}

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

        </GlassCard>

        {/* Architecture Diagram */}
        <EnhancedArchitectureDiagram
          architectureDiagram={result.architecture_diagram}
          resources={result.resources}
          description={description}
        />

        {/* Components, Resources, Data Flow */}
        {(result.architecture_diagram?.components?.length > 0 || result.resources?.length > 0 || result.architecture_diagram?.connections?.length > 0) && (
          <GlassCard>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {result.architecture_diagram?.components?.length > 0 && (
                <div className="p-3 bg-white/[0.02] rounded-xl border border-white/[0.04]">
                  <div className="flex items-center gap-1.5 mb-2">
                    <div className="w-3 h-3 bg-emerald-400 rounded-full"></div>
                    <h4 className="font-semibold text-slate-200 text-xs">Components</h4>
                    <span className="px-1.5 py-0.5 bg-emerald-500/20 text-emerald-300 rounded text-[10px]">
                      {result.architecture_diagram.components.length}
                    </span>
                  </div>
                  <div className="space-y-1 max-h-48 overflow-y-auto">
                    {result.architecture_diagram.components.map((c, i) => (
                      <div key={i} className="flex items-center gap-2 p-1.5 bg-slate-900/50 rounded-lg text-xs">
                        <span className="text-slate-300 truncate">{c}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {result.resources?.length > 0 && (
                <div className="p-3 bg-white/[0.02] rounded-xl border border-white/[0.04]">
                  <div className="flex items-center gap-1.5 mb-2">
                    <div className="w-3 h-3 bg-indigo-400 rounded-full"></div>
                    <h4 className="font-semibold text-slate-200 text-xs">Resources</h4>
                    <span className="px-1.5 py-0.5 bg-indigo-500/20 text-indigo-300 rounded text-[10px]">
                      {result.resources.length}
                    </span>
                  </div>
                  <div className="space-y-1 max-h-48 overflow-y-auto">
                    {result.resources.map((r, i) => (
                      <div key={i} className="text-xs text-slate-400 truncate p-1.5 bg-slate-900/50 rounded-lg">{r}</div>
                    ))}
                  </div>
                </div>
              )}

              {result.architecture_diagram?.connections?.length > 0 && (
                <div className="p-3 bg-white/[0.02] rounded-xl border border-white/[0.04]">
                  <div className="flex items-center gap-1.5 mb-2">
                    <ArrowRight className="w-3 h-3 text-blue-400" />
                    <h4 className="font-semibold text-slate-200 text-xs">Data Flow</h4>
                    <span className="px-1.5 py-0.5 bg-blue-500/20 text-blue-300 rounded text-[10px]">
                      {result.architecture_diagram.connections.length}
                    </span>
                  </div>
                  <div className="space-y-1 max-h-48 overflow-y-auto">
                    {result.architecture_diagram.connections.map((conn, i) => (
                      <div key={i} className="flex items-center gap-1 p-1.5 bg-slate-900/50 rounded-lg text-xs">
                        <span className="text-slate-300 truncate flex-1">{conn.from}</span>
                        <ArrowRight className="w-2.5 h-2.5 text-slate-500 flex-shrink-0" />
                        <span className="text-slate-300 truncate flex-1">{conn.to}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </GlassCard>
        )}

        {/* File Hierarchy */}
        {result.file_hierarchy && (
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
        )}

        {/* Generated Files + Download ZIP */}
        {result.files && result.files.length > 0 && (
          <GlassCard>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-gradient-to-br from-orange-400 to-red-500 rounded-lg flex items-center justify-center shadow-lg">
                  <FileText className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Infrastructure Code</h3>
                  <p className="text-xs text-slate-400">{result.files.length} files generated</p>
                </div>
              </div>
              <button onClick={handleDownloadZip} disabled={isDownloading}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 rounded-lg text-xs font-medium border border-emerald-500/25 transition-all disabled:opacity-50">
                {isDownloading ? <Loader className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                <span>Download ZIP</span>
              </button>
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
          placeholder={messages.length > 0 ? "Refine or modify your infrastructure..." : "Describe your cloud infrastructure... (e.g., 'Create a secure AWS VPC with subnets, ALB, EC2, and RDS')"}
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
            <span className="text-xs text-slate-600">{description.length}/3000</span>
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
  const hasResults = result || isGenerating || isLoadingHistory || messages.length > 0;

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-slate-950 via-purple-950/50 to-slate-950 font-sans text-white flex flex-col">
      {/* Ambient background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-cyan-600/10 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-emerald-600/5 rounded-full blur-3xl" />
      </div>

      {/* Sidebar */}
      <HistorySidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        onSelect={handleSelectHistory}
        onNewChat={handleNewChat}
        onLogout={logout}
        onContinue={handleContinueHistory}
      />

      {/* Header */}
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
          /* ── RESULTS STATE: Chat thread + results + sticky bottom input ── */
          <>
            {/* Scrollable area */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 py-6">
              <div className="max-w-4xl mx-auto space-y-4">
                {isLoadingHistory && (
                  <GlassCard>
                    <div className="flex flex-col items-center justify-center p-6 space-y-3">
                      <Loader className="w-8 h-8 text-blue-400 animate-spin" />
                      <p className="text-slate-300 text-sm">Loading infrastructure details...</p>
                    </div>
                  </GlassCard>
                )}

<<<<<<< HEAD
          <div className="space-y-6">
             <div className="relative">
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full p-4 rounded-xl bg-slate-800/50 backdrop-blur-sm text-.jsx' to its original state by removing the theme toggle button and dark mode classes.white border border-slate-700/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all duration-300 placeholder-slate-400 resize-none font-mono"
                  rows={5}
                  placeholder="e.g., 'Create a secure AWS VPC with public and private subnets, load balancer, EC2 instances, and RDS database with automated backup and monitoring.'"
                />
                <div className="absolute bottom-3 right-3 flex items-center space-x-2">
                  <span className="text-xs text-slate-500">
                    {description.length}/1000
                  </span>
                  {description.length > 0 && (
                    <div className={`w-2 h-2 rounded-full ${description.length > 900 ? 'bg-red-400' : description.length > 700 ? 'bg-yellow-400' : 'bg-green-400'}`}></div>
                  )}
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
                        <Rocket className="w-5 h-5" />
                        <span>Generate Infrastructure</span>
                        <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform duration-200" />
                      </>
                    )}
                  </span>
                </button>
             </div>
          </div>
        </GlassCard>
=======
                {/* Chat Messages */}
                {renderChatMessages()}
>>>>>>> main

                {/* Generation progress */}
                {renderGenerationProgress()}

                {/* Active result panel (always show for latest result) */}
                {renderActiveResult()}
              </div>
            </div>

            {/* Sticky bottom input bar */}
            <div className="sticky bottom-0 z-30 px-6 py-4 border-t border-white/[0.06] bg-gradient-to-t from-slate-950 via-slate-950/95 to-transparent backdrop-blur-md">
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