import React, { useState, useEffect } from 'react';
import {
    getMyOrgs,
    createOrg,
    inviteToOrg,
    getOrgMembers,
    getTeamHistory,
} from '../services/api';
import GlassCard from '../components/GlassCard';
import {
    Building2,
    Users,
    Plus,
    Mail,
    Copy,
    Check,
    Loader,
    UserPlus,
    ArrowLeft,
    FileText,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const OrgSettings = () => {
    const navigate = useNavigate();
    const [orgs, setOrgs] = useState([]);
    const [selectedOrg, setSelectedOrg] = useState(null);
    const [members, setMembers] = useState([]);
    const [teamHistory, setTeamHistory] = useState([]);
    const [activeTab, setActiveTab] = useState('members');
    const [loading, setLoading] = useState(true);
    const [membersLoading, setMembersLoading] = useState(false);

    // Create org form
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [newOrgName, setNewOrgName] = useState('');
    const [newOrgSlug, setNewOrgSlug] = useState('');
    const [creating, setCreating] = useState(false);

    // Invite form
    const [inviteEmail, setInviteEmail] = useState('');
    const [inviteRole, setInviteRole] = useState('viewer');
    const [inviteUrl, setInviteUrl] = useState('');
    const [inviting, setInviting] = useState(false);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        fetchOrgs();
    }, []);

    useEffect(() => {
        if (selectedOrg) {
            fetchMembers(selectedOrg.org_id);
            fetchTeamHistory(selectedOrg.org_id);
        }
    }, [selectedOrg]);

    const fetchOrgs = async () => {
        try {
            setLoading(true);
            const res = await getMyOrgs();
            setOrgs(res.data);
            if (res.data.length > 0) {
                setSelectedOrg(res.data[0]);
            }
        } catch (err) {
            console.error('Failed to fetch orgs:', err);
        } finally {
            setLoading(false);
        }
    };

    const fetchMembers = async (orgId) => {
        try {
            setMembersLoading(true);
            const res = await getOrgMembers(orgId);
            setMembers(res.data);
        } catch (err) {
            console.error('Failed to fetch members:', err);
        } finally {
            setMembersLoading(false);
        }
    };

    const fetchTeamHistory = async (orgId) => {
        try {
            const res = await getTeamHistory(orgId);
            setTeamHistory(res.data);
        } catch (err) {
            console.error('Failed to fetch team history:', err);
        }
    };

    const handleCreateOrg = async (e) => {
        e.preventDefault();
        if (!newOrgName.trim() || !newOrgSlug.trim()) return;
        setCreating(true);
        try {
            await createOrg(newOrgName, newOrgSlug.toLowerCase().replace(/\s+/g, '-'));
            setNewOrgName('');
            setNewOrgSlug('');
            setShowCreateForm(false);
            await fetchOrgs();
        } catch (err) {
            console.error('Failed to create org:', err);
            alert(err.response?.data?.detail || 'Failed to create organization.');
        } finally {
            setCreating(false);
        }
    };

    const handleInvite = async (e) => {
        e.preventDefault();
        if (!inviteEmail.trim() || !selectedOrg) return;
        setInviting(true);
        setInviteUrl('');
        try {
            const res = await inviteToOrg(selectedOrg.org_id, inviteEmail, inviteRole);
            setInviteUrl(res.data.accept_url);
            setInviteEmail('');
        } catch (err) {
            console.error('Failed to invite:', err);
            alert(err.response?.data?.detail || 'Failed to send invite.');
        } finally {
            setInviting(false);
        }
    };

    const handleCopyInviteUrl = () => {
        navigator.clipboard.writeText(inviteUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const getRoleBadge = (role) => {
        const colors = {
            admin: 'bg-red-500/15 text-red-300 border-red-500/25',
            editor: 'bg-amber-500/15 text-amber-300 border-amber-500/25',
            viewer: 'bg-blue-500/15 text-blue-300 border-blue-500/25',
        };
        return colors[role] || colors.viewer;
    };

    const getRelativeTime = (dateString) => {
        const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
        const now = new Date();
        const past = new Date(dateString);
        const diffInMs = past.getTime() - now.getTime();
        const diffInDays = Math.round(diffInMs / (1000 * 60 * 60 * 24));
        const diffInHours = Math.round(diffInMs / (1000 * 60 * 60));
        if (Math.abs(diffInDays) > 0) return rtf.format(diffInDays, 'day');
        return rtf.format(diffInHours, 'hour');
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950/50 to-slate-950 flex items-center justify-center">
                <Loader className="w-8 h-8 text-emerald-400 animate-spin" />
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
            <header className="relative z-10 flex items-center gap-4 px-6 py-4 border-b border-white/[0.04]">
                <button onClick={() => navigate('/dashboard')}
                    className="p-2 rounded-xl hover:bg-white/[0.06] text-slate-400 hover:text-white transition-colors">
                    <ArrowLeft className="w-5 h-5" />
                </button>
                <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 bg-gradient-to-br from-violet-400 to-purple-500 rounded-lg flex items-center justify-center">
                        <Building2 className="w-4 h-4 text-white" />
                    </div>
                    <h1 className="text-lg font-semibold text-white">Team Settings</h1>
                </div>
            </header>

            <main className="relative z-10 max-w-4xl mx-auto px-6 py-8 space-y-6">
                {/* Org selector or create */}
                {orgs.length === 0 ? (
                    <GlassCard>
                        <div className="text-center py-8">
                            <Building2 className="w-12 h-12 text-slate-500 mx-auto mb-4" />
                            <h3 className="text-lg font-bold text-white mb-2">No Team Yet</h3>
                            <p className="text-slate-400 text-sm mb-6">Create a team workspace to collaborate with your colleagues.</p>
                            <button onClick={() => setShowCreateForm(true)}
                                className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-cyan-500 text-white rounded-xl font-medium hover:from-emerald-400 hover:to-cyan-400 transition-all">
                                <Plus className="w-4 h-4" /> Create Team
                            </button>
                        </div>
                    </GlassCard>
                ) : (
                    <div className="flex items-center gap-3 flex-wrap">
                        {orgs.map((org) => (
                            <button key={org.org_id} onClick={() => setSelectedOrg(org)}
                                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all border ${selectedOrg?.org_id === org.org_id
                                    ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
                                    : 'bg-white/[0.04] border-white/[0.08] text-slate-400 hover:text-white hover:bg-white/[0.08]'
                                    }`}>
                                {org.name}
                            </button>
                        ))}
                        <button onClick={() => setShowCreateForm(!showCreateForm)}
                            className="px-4 py-2 rounded-xl text-sm font-medium bg-white/[0.04] border border-dashed border-white/[0.15] text-slate-500 hover:text-white hover:border-emerald-500/30 transition-all">
                            <Plus className="w-4 h-4 inline mr-1" /> New Team
                        </button>
                    </div>
                )}

                {/* Create org form */}
                {showCreateForm && (
                    <GlassCard>
                        <h3 className="text-sm font-semibold text-slate-200 mb-4">Create New Team</h3>
                        <form onSubmit={handleCreateOrg} className="flex flex-col sm:flex-row gap-3">
                            <input value={newOrgName} onChange={(e) => { setNewOrgName(e.target.value); setNewOrgSlug(e.target.value.toLowerCase().replace(/\s+/g, '-')); }}
                                placeholder="Team name" className="flex-1 px-4 py-2.5 bg-white/[0.04] border border-white/[0.08] rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:border-emerald-500/30" />
                            <input value={newOrgSlug} onChange={(e) => setNewOrgSlug(e.target.value)}
                                placeholder="team-slug" className="sm:w-40 px-4 py-2.5 bg-white/[0.04] border border-white/[0.08] rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:border-emerald-500/30 font-mono" />
                            <button type="submit" disabled={creating}
                                className="px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-cyan-500 text-white rounded-xl text-sm font-medium disabled:opacity-50">
                                {creating ? <Loader className="w-4 h-4 animate-spin" /> : 'Create'}
                            </button>
                        </form>
                    </GlassCard>
                )}

                {/* Tabs */}
                {selectedOrg && (
                    <>
                        <div className="flex gap-1 p-1 bg-white/[0.03] rounded-xl border border-white/[0.06]">
                            <button onClick={() => setActiveTab('members')}
                                className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${activeTab === 'members' ? 'bg-white/[0.08] text-white' : 'text-slate-400 hover:text-white'
                                    }`}>
                                <Users className="w-4 h-4" /> Members
                            </button>
                            <button onClick={() => setActiveTab('generations')}
                                className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${activeTab === 'generations' ? 'bg-white/[0.08] text-white' : 'text-slate-400 hover:text-white'
                                    }`}>
                                <FileText className="w-4 h-4" /> Generations
                            </button>
                        </div>

                        {/* Members Tab */}
                        {activeTab === 'members' && (
                            <div className="space-y-4">
                                {/* Invite form */}
                                {selectedOrg.role === 'admin' && (
                                    <GlassCard>
                                        <div className="flex items-center gap-2 mb-4">
                                            <UserPlus className="w-4 h-4 text-emerald-400" />
                                            <h3 className="text-sm font-semibold text-slate-200">Invite Member</h3>
                                        </div>
                                        <form onSubmit={handleInvite} className="flex flex-col sm:flex-row gap-3">
                                            <div className="flex-1 flex gap-2">
                                                <input value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)}
                                                    type="email" placeholder="colleague@example.com"
                                                    className="flex-1 px-4 py-2.5 bg-white/[0.04] border border-white/[0.08] rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:border-emerald-500/30" />
                                                <select value={inviteRole} onChange={(e) => setInviteRole(e.target.value)}
                                                    className="px-3 py-2.5 bg-white/[0.04] border border-white/[0.08] rounded-xl text-white text-sm focus:outline-none appearance-none cursor-pointer">
                                                    <option value="viewer" className="bg-slate-900">Viewer</option>
                                                    <option value="editor" className="bg-slate-900">Editor</option>
                                                    <option value="admin" className="bg-slate-900">Admin</option>
                                                </select>
                                            </div>
                                            <button type="submit" disabled={inviting || !inviteEmail.trim()}
                                                className="px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-cyan-500 text-white rounded-xl text-sm font-medium disabled:opacity-50 flex items-center gap-2">
                                                {inviting ? <Loader className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
                                                Invite
                                            </button>
                                        </form>
                                        {inviteUrl && (
                                            <div className="mt-3 flex items-center gap-2 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
                                                <p className="text-xs text-emerald-300 flex-1 font-mono truncate">{inviteUrl}</p>
                                                <button onClick={handleCopyInviteUrl}
                                                    className="px-3 py-1.5 bg-emerald-500/20 rounded-lg text-xs text-emerald-300 hover:bg-emerald-500/30 transition-colors flex items-center gap-1">
                                                    {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                                                    {copied ? 'Copied!' : 'Copy'}
                                                </button>
                                            </div>
                                        )}
                                    </GlassCard>
                                )}

                                {/* Members list */}
                                <GlassCard>
                                    <div className="flex items-center gap-2 mb-4">
                                        <Users className="w-4 h-4 text-blue-400" />
                                        <h3 className="text-sm font-semibold text-slate-200">Members</h3>
                                        <span className="px-1.5 py-0.5 bg-blue-500/15 text-blue-300 rounded-full text-[10px]">{members.length}</span>
                                    </div>
                                    {membersLoading ? (
                                        <div className="flex justify-center py-6"><Loader className="w-6 h-6 text-blue-400 animate-spin" /></div>
                                    ) : (
                                        <div className="space-y-2">
                                            {members.map((member) => (
                                                <div key={member.user_id} className="flex items-center justify-between p-3 bg-white/[0.02] rounded-xl border border-white/[0.04]">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 bg-gradient-to-br from-slate-600 to-slate-700 rounded-full flex items-center justify-center text-xs font-bold text-white">
                                                            {(member.name || member.email || '?')[0].toUpperCase()}
                                                        </div>
                                                        <div>
                                                            <p className="text-sm text-white font-medium">{member.name || 'Unknown'}</p>
                                                            <p className="text-xs text-slate-500">{member.email}</p>
                                                        </div>
                                                    </div>
                                                    <span className={`px-2.5 py-1 rounded-lg text-[10px] font-medium uppercase tracking-wider border ${getRoleBadge(member.role)}`}>
                                                        {member.role}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </GlassCard>
                            </div>
                        )}

                        {/* Generations Tab */}
                        {activeTab === 'generations' && (
                            <GlassCard>
                                <div className="flex items-center gap-2 mb-4">
                                    <FileText className="w-4 h-4 text-emerald-400" />
                                    <h3 className="text-sm font-semibold text-slate-200">Team Generations</h3>
                                    <span className="px-1.5 py-0.5 bg-emerald-500/15 text-emerald-300 rounded-full text-[10px]">{teamHistory.length}</span>
                                </div>
                                {teamHistory.length === 0 ? (
                                    <p className="text-center text-slate-500 py-6 text-sm">No team generations yet.</p>
                                ) : (
                                    <div className="space-y-2">
                                        {teamHistory.map((item) => (
                                            <button key={item.id} onClick={() => navigate('/dashboard')}
                                                className="w-full text-left p-3 bg-white/[0.02] rounded-xl border border-white/[0.04] hover:bg-white/[0.05] transition-all">
                                                <p className="text-sm text-white truncate">{item.description}</p>
                                                <div className="flex items-center gap-2 mt-1.5">
                                                    <span className="text-[10px] uppercase text-slate-500">{item.provider}</span>
                                                    <span className="text-[10px] text-slate-600">·</span>
                                                    <span className="text-[10px] text-slate-500">{getRelativeTime(item.created_at)}</span>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </GlassCard>
                        )}
                    </>
                )}
            </main>
        </div>
    );
};

export default OrgSettings;
