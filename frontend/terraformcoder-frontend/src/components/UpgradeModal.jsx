import React, { useState } from 'react';
import { Sparkles, Check, X, Loader, Shield, Zap, Infinity } from 'lucide-react';
import { API_BASE_URL } from '../services/api';

const UpgradeModal = ({ isOpen, onClose }) => {
    const [isLoading, setIsLoading] = useState(false);

    if (!isOpen) return null;

    const handleUpgrade = async () => {
        setIsLoading(true);
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE_URL}/api/billing/checkout`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            const data = await response.json();
            if (data.checkout_url) {
                window.location.href = data.checkout_url;
            } else {
                throw new Error('No checkout URL received');
            }
        } catch (error) {
            console.error('Failed to initiate checkout:', error);
            // Optional: Add toast error here
        } finally {
            setIsLoading(false); // In case they return, though they should be redirected
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="relative w-full max-w-lg bg-gradient-to-b from-slate-800 to-slate-900 rounded-2xl border border-slate-700 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">

                {/* Background Effects */}
                <div className="absolute top-0 inset-x-0 h-40 bg-gradient-to-b from-blue-500/20 to-transparent"></div>
                <div className="absolute -top-10 -right-10 w-40 h-40 bg-purple-500/30 rounded-full blur-3xl"></div>
                <div className="absolute -top-10 -left-10 w-40 h-40 bg-blue-500/30 rounded-full blur-3xl"></div>

                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white bg-slate-800/50 hover:bg-slate-700/50 rounded-full transition-colors z-10"
                >
                    <X className="w-5 h-5" />
                </button>

                <div className="relative p-8 px-6 sm:px-10">

                    {/* Header */}
                    <div className="text-center mb-8">
                        <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl mx-auto flex items-center justify-center shadow-lg shadow-blue-500/20 mb-6 transform -rotate-6">
                            <Sparkles className="w-8 h-8 text-white" />
                        </div>

                        <h2 className="text-2xl font-bold text-white mb-2">Upgrade to Pro</h2>
                        <p className="text-slate-400">
                            You've used all 5 free generations this month. Upgrade to unlock unlimited AI infrastructure generation.
                        </p>
                    </div>

                    {/* Pricing Card */}
                    <div className="bg-slate-900/50 border border-slate-700/50 rounded-2xl p-6 mb-8 relative group">
                        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity"></div>

                        <div className="flex justify-between items-center mb-6 relative">
                            <div>
                                <h3 className="text-xl font-bold text-white">Pro Plan</h3>
                                <p className="text-sm text-slate-400">For serious developers</p>
                            </div>
                            <div className="text-right">
                                <span className="text-3xl font-bold text-white">$19</span>
                                <span className="text-slate-400">/mo</span>
                            </div>
                        </div>

                        <div className="space-y-4 relative">
                            <div className="flex items-center space-x-3 text-sm">
                                <div className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
                                    <Infinity className="w-3.5 h-3.5 text-emerald-400" />
                                </div>
                                <span className="text-slate-200">Unlimited AI Generations</span>
                            </div>

                            <div className="flex items-center space-x-3 text-sm">
                                <div className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                                    <Zap className="w-3.5 h-3.5 text-blue-400" />
                                </div>
                                <span className="text-slate-200">Faster AI Processing</span>
                            </div>

                            <div className="flex items-center space-x-3 text-sm">
                                <div className="w-6 h-6 rounded-full bg-purple-500/20 flex items-center justify-center flex-shrink-0">
                                    <Shield className="w-3.5 h-3.5 text-purple-400" />
                                </div>
                                <span className="text-slate-200">Priority Support</span>
                            </div>
                        </div>
                    </div>

                    {/* Action Button */}
                    <button
                        onClick={handleUpgrade}
                        disabled={isLoading}
                        className="w-full relative group overflow-hidden bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl p-[1px] shadow-lg shadow-blue-500/25 transition-transform hover:scale-[1.02] disabled:opacity-75 disabled:hover:scale-100"
                    >
                        <div className="relative bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl px-4 py-3 flex items-center justify-center">
                            {isLoading ? (
                                <div className="flex items-center space-x-2">
                                    <Loader className="w-5 h-5 text-white animate-spin" />
                                    <span className="text-white font-medium">Redirecting...</span>
                                </div>
                            ) : (
                                <span className="text-white font-semibold text-lg">Upgrade to Pro</span>
                            )}
                        </div>
                        <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
                    </button>

                    <p className="text-center text-xs text-slate-500 mt-4">
                        Secure checkout powered by Stripe
                    </p>

                </div>
            </div>
        </div>
    );
};

export default UpgradeModal;
