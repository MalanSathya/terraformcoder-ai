import React, { useState, useEffect } from 'react';
import { Clock, Server, DollarSign, Database, Activity } from 'lucide-react';
import { getGenerationHistory } from '../services/api';

const HistorySidebar = ({ onSelect }) => {
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchHistory = async () => {
            try {
                setLoading(true);
                const res = await getGenerationHistory(20);
                setHistory(res.data);
            } catch (err) {
                console.error('Failed to fetch history:', err);
                setError('Failed to load history');
            } finally {
                setLoading(false);
            }
        };

        fetchHistory();
    }, []);

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

    const truncateText = (text, maxLength = 60) => {
        if (!text) return '';
        return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
    };

    const getProviderIcon = (provider) => {
        switch (provider?.toLowerCase()) {
            case 'aws': return <Server className="w-3 h-3 text-orange-400" />;
            case 'azure': return <Database className="w-3 h-3 text-blue-400" />;
            case 'gcp': return <Activity className="w-3 h-3 text-red-400" />;
            default: return <Server className="w-3 h-3 text-emerald-400" />;
        }
    };

    return (
        <div className="w-full max-h-[600px] flex flex-col bg-slate-900/50 backdrop-blur-xl border border-slate-700/50 rounded-2xl overflow-hidden shadow-xl h-full">
            <div className="p-4 border-b border-slate-700/50 flex items-center space-x-2 bg-slate-800/30">
                <Clock className="w-5 h-5 text-emerald-400" />
                <h3 className="text-lg font-semibold text-slate-200">Generation History</h3>
            </div>

            <div className="flex-1 overflow-y-auto p-2 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
                {loading ? (
                    <div className="space-y-3 p-2">
                        {[1, 2, 3, 4, 5].map((i) => (
                            <div key={i} className="animate-pulse flex flex-col p-3 rounded-xl bg-slate-800/30 border border-slate-700/30">
                                <div className="h-4 bg-slate-700/50 rounded w-3/4 mb-3"></div>
                                <div className="flex justify-between items-center mt-auto">
                                    <div className="h-3 bg-slate-700/50 rounded w-16"></div>
                                    <div className="h-3 bg-slate-700/50 rounded w-20"></div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : error ? (
                    <div className="p-4 text-center text-red-400 text-sm">{error}</div>
                ) : history.length === 0 ? (
                    <div className="p-8 text-center text-slate-400 flex flex-col items-center">
                        <div className="w-12 h-12 rounded-full bg-slate-800/50 flex items-center justify-center mb-3">
                            <Clock className="w-6 h-6 text-slate-500" />
                        </div>
                        <p className="text-sm">No generations yet.</p>
                        <p className="text-xs text-slate-500 mt-1">Your history will appear here.</p>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {history.map((item) => (
                            <button
                                key={item.id}
                                onClick={() => onSelect(item.id)}
                                className="w-full text-left p-3 rounded-xl hover:bg-slate-800/50 border border-transparent hover:border-slate-700/50 transition-all duration-200 group flex flex-col gap-2"
                            >
                                <div className="text-sm text-slate-300 group-hover:text-white transition-colors line-clamp-2 leading-relaxed">
                                    {truncateText(item.description)}
                                </div>

                                <div className="flex items-center justify-between mt-1 pt-2 border-t border-slate-700/30">
                                    <div className="flex items-center space-x-2">
                                        <span className="flex items-center space-x-1 px-2 py-0.5 bg-slate-800 rounded-md text-xs font-medium text-slate-300 border border-slate-700">
                                            {getProviderIcon(item.provider)}
                                            <span className="uppercase text-[10px] tracking-wider">{item.provider}</span>
                                        </span>
                                        <span className="flex items-center space-x-1 text-xs text-green-400/80 font-mono">
                                            <DollarSign className="w-3 h-3" />
                                            {item.estimated_cost || 'Unknown'}
                                        </span>
                                    </div>

                                    <span className="text-[10px] text-slate-500 whitespace-nowrap">
                                        {getRelativeTime(item.created_at)}
                                    </span>
                                </div>
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default HistorySidebar;
