import React, { useState, useEffect } from 'react';
import { Clock, X, Plus, LogOut, Play, Users, User, Building2 } from 'lucide-react';
import { getGenerationHistory, getMyOrgs, getTeamHistory } from '../services/api';
import { Link } from 'react-router-dom';

const HistorySidebar = ({ isOpen, onClose, onSelect, onNewChat, onLogout, onContinue }) => {
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Team toggle state
    const [viewMode, setViewMode] = useState('my'); // 'my' | 'team'
    const [orgs, setOrgs] = useState([]);
    const [hasOrg, setHasOrg] = useState(false);

    useEffect(() => {
        if (isOpen) {
            fetchHistory();
            fetchOrgs();
        }
    }, [isOpen]);

    useEffect(() => {
        if (isOpen) fetchHistory();
    }, [viewMode]);

    const fetchOrgs = async () => {
        try {
            const res = await getMyOrgs();
            setOrgs(res.data);
            setHasOrg(res.data.length > 0);
        } catch (err) {
            // Org tables might not exist yet
            setHasOrg(false);
        }
    };

    const fetchHistory = async () => {
        try {
            setLoading(true);
            if (viewMode === 'team' && orgs.length > 0) {
                const res = await getTeamHistory(orgs[0].org_id, 20);
                setHistory(res.data);
            } else {
                const res = await getGenerationHistory(20);
                setHistory(res.data);
            }
        } catch (err) {
            console.error('Failed to fetch history:', err);
            setError('Failed to load history');
        } finally {
            setLoading(false);
        }
    };

    const getRelativeTime = (dateString) => {
        const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
        const now = new Date();
        const past = new Date(dateString);
        const diffInMs = past.getTime() - now.getTime();
        const diffInSecs = Math.round(diffInMs / 1000);
        const diffInMins = Math.round(diffInSecs / 60);
        const diffInHours = Math.round(diffInMins / 60);
        const diffInDays = Math.round(diffInHours / 24);
        if (Math.abs(diffInDays) > 0) return rtf.format(diffInDays, 'day');
        if (Math.abs(diffInHours) > 0) return rtf.format(diffInHours, 'hour');
        if (Math.abs(diffInMins) > 0) return rtf.format(diffInMins, 'minute');
        return rtf.format(diffInSecs, 'second');
    };

    const truncateText = (text, maxLength = 50) => {
        if (!text) return '';
        return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
    };

    const getProviderBadge = (provider) => {
        const colors = {
            aws: 'text-orange-400 bg-orange-400/10',
            azure: 'text-blue-400 bg-blue-400/10',
            gcp: 'text-red-400 bg-red-400/10',
        };
        return colors[provider?.toLowerCase()] || 'text-emerald-400 bg-emerald-400/10';
    };

    return (
        <>
            {isOpen && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden" onClick={onClose} />
            )}

            <div className={`
                fixed top-0 left-0 h-full z-50 w-72
                bg-slate-950/95 backdrop-blur-2xl border-r border-white/[0.06]
                flex flex-col
                transform transition-transform duration-300 ease-out
                ${isOpen ? 'translate-x-0' : '-translate-x-full'}
            `}>
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-white/[0.06]">
                    <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-slate-400" />
                        <h3 className="text-sm font-semibold text-slate-300 tracking-wide uppercase">History</h3>
                    </div>
                    <button onClick={onClose}
                        className="p-1.5 rounded-lg hover:bg-white/[0.06] text-slate-400 hover:text-white transition-colors">
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* New Chat */}
                <div className="p-3">
                    <button onClick={() => { if (onNewChat) onNewChat(); onClose(); }}
                        className="w-full flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-slate-300 hover:bg-white/[0.08] hover:text-white transition-all text-sm font-medium">
                        <Plus className="w-4 h-4" /><span>New Generation</span>
                    </button>
                </div>

                {/* My / Team toggle */}
                {hasOrg && (
                    <div className="px-3 pb-2">
                        <div className="flex gap-1 p-1 bg-white/[0.03] rounded-lg border border-white/[0.06]">
                            <button onClick={() => setViewMode('my')}
                                className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-md text-xs font-medium transition-all ${viewMode === 'my' ? 'bg-white/[0.08] text-white' : 'text-slate-500 hover:text-slate-300'
                                    }`}>
                                <User className="w-3 h-3" /> My
                            </button>
                            <button onClick={() => setViewMode('team')}
                                className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-md text-xs font-medium transition-all ${viewMode === 'team' ? 'bg-white/[0.08] text-white' : 'text-slate-500 hover:text-slate-300'
                                    }`}>
                                <Users className="w-3 h-3" /> Team
                            </button>
                        </div>
                    </div>
                )}

                {/* History List */}
                <div className="flex-1 overflow-y-auto px-3 pb-2">
                    {loading ? (
                        <div className="space-y-2 mt-2">
                            {[1, 2, 3, 4, 5].map((i) => (
                                <div key={i} className="animate-pulse p-3 rounded-xl bg-white/[0.03]">
                                    <div className="h-3 bg-white/[0.06] rounded w-3/4 mb-2"></div>
                                    <div className="h-2.5 bg-white/[0.04] rounded w-1/2"></div>
                                </div>
                            ))}
                        </div>
                    ) : error ? (
                        <div className="p-4 text-center text-red-400/80 text-sm">{error}</div>
                    ) : history.length === 0 ? (
                        <div className="p-8 text-center">
                            <div className="w-10 h-10 rounded-full bg-white/[0.04] flex items-center justify-center mx-auto mb-3">
                                <Clock className="w-5 h-5 text-slate-500" />
                            </div>
                            <p className="text-sm text-slate-500">No generations yet</p>
                        </div>
                    ) : (
                        <div className="space-y-1 mt-1">
                            {history.map((item) => (
                                <div key={item.id} className="group w-full text-left p-3 rounded-xl hover:bg-white/[0.06] transition-all duration-150">
                                    <button
                                        onClick={() => { onSelect(item.id); onClose(); }}
                                        className="w-full text-left">
                                        <div className="text-sm text-slate-300 group-hover:text-white line-clamp-2 leading-relaxed">
                                            {truncateText(item.description)}
                                        </div>
                                        <div className="flex items-center gap-2 mt-2">
                                            <span className={`text-[10px] uppercase tracking-wider font-medium px-1.5 py-0.5 rounded ${getProviderBadge(item.provider)}`}>
                                                {item.provider}
                                            </span>
                                            <span className="text-[10px] text-slate-500">{getRelativeTime(item.created_at)}</span>
                                        </div>
                                    </button>
                                    {/* Continue this button */}
                                    {onContinue && (
                                        <button
                                            onClick={(e) => { e.stopPropagation(); onContinue(item.id); onClose(); }}
                                            className="mt-2 flex items-center gap-1 px-2 py-1 rounded-md bg-white/[0.04] hover:bg-emerald-500/15 text-[10px] text-slate-500 hover:text-emerald-300 transition-all opacity-0 group-hover:opacity-100">
                                            <Play className="w-2.5 h-2.5" />
                                            <span>Continue this</span>
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Bottom section: Team settings + Logout */}
                <div className="p-3 border-t border-white/[0.06] space-y-1">
                    {hasOrg && (
                        <Link to="/settings/org" onClick={onClose}
                            className="w-full flex items-center gap-2 px-4 py-2.5 rounded-xl text-slate-400 hover:bg-white/[0.06] hover:text-white transition-all text-sm font-medium">
                            <Building2 className="w-4 h-4" /><span>Team Settings</span>
                        </Link>
                    )}
                    {onLogout && (
                        <button onClick={onLogout}
                            className="w-full flex items-center gap-2 px-4 py-2.5 rounded-xl text-slate-400 hover:bg-red-500/10 hover:text-red-400 transition-all text-sm font-medium">
                            <LogOut className="w-4 h-4" /><span>Logout</span>
                        </button>
                    )}
                </div>
            </div>
        </>
    );
};

export default HistorySidebar;
