import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getSharedGeneration } from '../services/api';
import DynamicFileRenderer from '../components/DynamicFileRenderer';
import EnhancedArchitectureDiagram from '../components/EnhancedArchitectureDiagram';
import GlassCard from '../components/GlassCard';
import {
    Bolt,
    Loader,
    CheckCircle2,
    BrainCircuit,
    FolderTree,
    Copy,
    Sparkles,
    ArrowRight,
    ExternalLink,
} from 'lucide-react';

const SharedGeneration = () => {
    const { slug } = useParams();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchShared = async () => {
            try {
                setLoading(true);
                const res = await getSharedGeneration(slug);
                setData(res.data);
            } catch (err) {
                console.error('Failed to load shared generation:', err);
                setError(err.response?.status === 404 ? 'This shared generation was not found or is no longer public.' : 'Failed to load shared generation.');
            } finally {
                setLoading(false);
            }
        };
        if (slug) fetchShared();
    }, [slug]);

    const handleCopyToClipboard = (text) => navigator.clipboard.writeText(text);

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950/50 to-slate-950 flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <Loader className="w-8 h-8 text-emerald-400 animate-spin" />
                    <p className="text-slate-300 text-sm">Loading shared generation...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950/50 to-slate-950 flex items-center justify-center px-6">
                <div className="text-center max-w-md">
                    <div className="w-14 h-14 bg-red-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <ExternalLink className="w-7 h-7 text-red-400" />
                    </div>
                    <h2 className="text-xl font-bold text-white mb-2">Not Found</h2>
                    <p className="text-slate-400 mb-6">{error}</p>
                    <Link to="/register"
                        className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-emerald-500 to-cyan-500 text-white rounded-xl font-medium hover:from-emerald-400 hover:to-cyan-400 transition-all shadow-lg shadow-emerald-500/20">
                        <Sparkles className="w-4 h-4" />
                        <span>Generate your own</span>
                        <ArrowRight className="w-4 h-4" />
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950/50 to-slate-950 text-white">
            {/* Ambient background */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute -top-40 -right-40 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl" />
                <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-cyan-600/10 rounded-full blur-3xl" />
            </div>

            {/* Header */}
            <header className="relative z-10 flex items-center justify-between px-6 py-4 border-b border-white/[0.04]">
                <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 bg-gradient-to-br from-emerald-400 to-cyan-400 rounded-lg flex items-center justify-center shadow-lg shadow-emerald-500/20">
                        <Bolt className="w-4 h-4 text-white" />
                    </div>
                    <h1 className="text-lg font-semibold bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
                        AI Terraform Coder
                    </h1>
                    <span className="px-2 py-0.5 bg-blue-500/15 text-blue-300 rounded-full text-[10px] font-medium border border-blue-500/25">
                        Shared
                    </span>
                </div>
                <Link to="/register"
                    className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-emerald-500 to-cyan-500 text-white rounded-lg text-sm font-medium hover:from-emerald-400 hover:to-cyan-400 transition-all shadow-lg shadow-emerald-500/20">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Generate your own</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                </Link>
            </header>

            {/* Content */}
            <main className="relative z-10 max-w-4xl mx-auto px-6 py-8 space-y-4">
                {/* Description */}
                {data.description && (
                    <GlassCard>
                        <p className="text-slate-400 text-xs uppercase tracking-wider mb-1">Original Prompt</p>
                        <p className="text-slate-200 text-sm leading-relaxed">{data.description}</p>
                    </GlassCard>
                )}

                {/* Success Header */}
                <GlassCard>
                    <div className="flex items-center gap-2 mb-4">
                        <div className="w-8 h-8 bg-gradient-to-br from-emerald-400 to-cyan-400 rounded-lg flex items-center justify-center shadow-lg shadow-emerald-500/20">
                            <CheckCircle2 className="w-4 h-4 text-white" />
                        </div>
                        <div>
                            <h3 className="text-base font-bold text-white">Shared Infrastructure</h3>
                            <p className="text-xs text-slate-400">
                                {data.provider?.toUpperCase()} · Generated {new Date(data.created_at).toLocaleDateString()}
                            </p>
                        </div>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-3 gap-2">
                        <div className="p-2.5 bg-white/[0.03] rounded-lg border border-white/[0.04] text-center">
                            <p className="text-lg font-bold text-emerald-400">{data.files?.length || 0}</p>
                            <p className="text-[10px] text-slate-500">Files</p>
                        </div>
                        <div className="p-2.5 bg-white/[0.03] rounded-lg border border-white/[0.04] text-center">
                            <p className="text-lg font-bold text-blue-400">{data.resources?.length || 0}</p>
                            <p className="text-[10px] text-slate-500">Resources</p>
                        </div>
                        <div className="p-2.5 bg-white/[0.03] rounded-lg border border-white/[0.04] text-center">
                            <p className="text-sm font-bold text-green-400">{data.estimated_cost || 'Unknown'}</p>
                            <p className="text-[10px] text-slate-500">Est. Cost</p>
                        </div>
                    </div>

                    {/* AI Analysis */}
                    {data.explanation && (
                        <div className="mt-4 p-3 bg-white/[0.03] rounded-lg border border-white/[0.04]">
                            <div className="flex items-center gap-1.5 mb-2">
                                <BrainCircuit className="w-3.5 h-3.5 text-purple-400" />
                                <h4 className="font-medium text-slate-200 text-xs">AI Analysis</h4>
                            </div>
                            <p className="text-slate-300 text-xs leading-relaxed">{data.explanation}</p>
                        </div>
                    )}
                </GlassCard>

                {/* Architecture Diagram */}
                <EnhancedArchitectureDiagram
                    architectureDiagram={data.architecture_diagram}
                    resources={data.resources}
                    description={data.description}
                />

                {/* File Hierarchy */}
                {data.file_hierarchy && (
                    <GlassCard>
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                                <FolderTree className="w-4 h-4 text-cyan-400" />
                                <h4 className="font-semibold text-slate-200 text-sm">Project Structure</h4>
                            </div>
                            <button onClick={() => navigator.clipboard.writeText(data.file_hierarchy)}
                                className="flex items-center gap-1 px-2 py-1 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-xs text-slate-400 hover:text-slate-200 transition-colors">
                                <Copy className="w-3 h-3" /><span>Copy</span>
                            </button>
                        </div>
                        <div className="p-3 bg-slate-950/50 rounded-xl border border-white/[0.04]">
                            <pre className="text-slate-300 font-mono text-xs leading-relaxed whitespace-pre-wrap overflow-x-auto">
                                {data.file_hierarchy}
                            </pre>
                        </div>
                    </GlassCard>
                )}

                {/* Generated Files */}
                {data.files && data.files.length > 0 && (
                    <GlassCard>
                        <DynamicFileRenderer files={data.files} onCopy={handleCopyToClipboard} />
                    </GlassCard>
                )}

                {/* CTA Banner */}
                <div className="mt-8 p-6 bg-gradient-to-r from-emerald-500/10 to-cyan-500/10 rounded-2xl border border-emerald-500/20 text-center">
                    <h3 className="text-lg font-bold text-white mb-2">Want to generate your own infrastructure?</h3>
                    <p className="text-slate-400 text-sm mb-4">
                        Create production-ready Terraform code with AI in seconds.
                    </p>
                    <Link to="/register"
                        className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-emerald-500 to-cyan-500 text-white rounded-xl font-medium hover:from-emerald-400 hover:to-cyan-400 transition-all shadow-lg shadow-emerald-500/20">
                        <Sparkles className="w-4 h-4" />
                        <span>Generate your own</span>
                        <ArrowRight className="w-4 h-4" />
                    </Link>
                </div>
            </main>
        </div>
    );
};

export default SharedGeneration;
