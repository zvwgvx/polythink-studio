import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import Layout from './Layout';
import Card from './Card';
import Button from './Button';
import ContributionGraph from './ContributionGraph';
import ConfirmModal from './ConfirmModal';
import Toast from './Toast';
import { diffJson } from 'diff';

const AdminDashboard = ({ onLogout }) => {
    const [activeTab, setActiveTab] = useState('users'); // 'users', 'prs', 'repo'
    const [users, setUsers] = useState([]);
    const [prs, setPrs] = useState([]);
    const [newUser, setNewUser] = useState({ username: '', password: '', role: 'user', full_name: '', email: '' });
    const [loading, setLoading] = useState(false);
    const [toast, setToast] = useState(null);

    // Git State
    const [remoteUrl, setRemoteUrl] = useState('');
    const [gitLoading, setGitLoading] = useState(false);
    const [gitOutput, setGitOutput] = useState('');

    // Diff State
    const [diffData, setDiffData] = useState(null);
    const [showDiffModal, setShowDiffModal] = useState(false);
    const [currentPRId, setCurrentPRId] = useState(null);

    // User Stats Modal
    const [selectedUserStats, setSelectedUserStats] = useState(null);
    const [showUserStatsModal, setShowUserStatsModal] = useState(false);

    // Permission Modal State
    const [showPermissionModal, setShowPermissionModal] = useState(false);
    const [selectedUserForPermissions, setSelectedUserForPermissions] = useState(null);

    // Confirm Modal State
    const [modalConfig, setModalConfig] = useState({
        isOpen: false,
        title: '',
        message: '',
        onConfirm: null,
        onCancel: null,
        confirmText: 'Confirm',
        confirmVariant: 'danger'
    });

    const [invites, setInvites] = useState([]);

    useEffect(() => {
        if (activeTab === 'users') {
            loadUsers();
            loadInvites();
        }
        if (activeTab === 'prs') loadPRs();
        if (activeTab === 'repo') loadGitConfig();
    }, [activeTab]);

    const showToast = (message, type = 'success') => {
        setToast({ message, type });
    };

    const loadUsers = async () => {
        try {
            const data = await api.getUsers();
            setUsers(data);
        } catch (err) {
            console.error('Failed to load users', err);
        }
    };

    const loadInvites = async () => {
        try {
            const data = await api.getInvites();
            setInvites(data);
        } catch (err) {
            console.error('Failed to load invites', err);
        }
    };

    const loadPRs = async () => {
        try {
            const data = await api.getPRs();
            setPrs(data);
        } catch (err) {
            console.error('Failed to load PRs', err);
        }
    };

    const loadGitConfig = async () => {
        try {
            const data = await api.getGitConfig();
            setRemoteUrl(data.remote_url);
        } catch (err) {
            console.error('Failed to load git config', err);
        }
    };

    const handleGenerateInvite = async () => {
        setLoading(true);
        try {
            await api.generateInvite();
            showToast('New invitation code generated', 'success');
            loadInvites();
        } catch (err) {
            showToast(err.message, 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteUser = (username) => {
        setModalConfig({
            isOpen: true,
            title: 'Delete User',
            message: `Are you sure you want to delete user ${username}?`,
            confirmText: 'Delete',
            confirmVariant: 'danger',
            onConfirm: async () => {
                try {
                    await api.deleteUser(username);
                    loadUsers();
                    setModalConfig(prev => ({ ...prev, isOpen: false }));
                    showToast(`User ${username} deleted`, 'success');
                } catch (err) {
                    showToast('Failed to delete user', 'error');
                }
            },
            onCancel: () => setModalConfig(prev => ({ ...prev, isOpen: false }))
        });
    };

    const handleDeleteInvite = (code) => {
        setModalConfig({
            isOpen: true,
            title: 'Cancel Invitation',
            message: `Are you sure you want to cancel invitation code ${code}?`,
            confirmText: 'Cancel Invite',
            confirmVariant: 'danger',
            onConfirm: async () => {
                try {
                    await api.deleteInvite(code);
                    loadInvites();
                    setModalConfig(prev => ({ ...prev, isOpen: false }));
                    showToast('Invitation cancelled', 'success');
                } catch (err) {
                    showToast('Failed to delete invite: ' + err.message, 'error');
                }
            },
            onCancel: () => setModalConfig(prev => ({ ...prev, isOpen: false }))
        });
    };

    const handleViewUserStats = async (username) => {
        setLoading(true);
        try {
            const data = await api.getUserStats(username);
            setSelectedUserStats(data);
            setShowUserStatsModal(true);
        } catch (err) {
            showToast('Failed to load user stats: ' + err.message, 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleMergePR = (prId) => {
        setModalConfig({
            isOpen: true,
            title: 'Merge Pull Request',
            message: "Are you sure you want to merge this PR? This will overwrite the main dataset file.",
            confirmText: 'Merge',
            confirmVariant: 'success',
            onConfirm: async () => {
                try {
                    await api.mergePR(prId);
                    loadPRs();
                    setModalConfig(prev => ({ ...prev, isOpen: false }));
                    showToast("PR Merged Successfully!", 'success');
                } catch (err) {
                    showToast("Failed to merge PR: " + err.message, 'error');
                }
            },
            onCancel: () => setModalConfig(prev => ({ ...prev, isOpen: false }))
        });
    };

    const handleRejectPR = (prId) => {
        setModalConfig({
            isOpen: true,
            title: 'Reject Pull Request',
            message: "Are you sure you want to reject this PR?",
            confirmText: 'Reject',
            confirmVariant: 'danger',
            onConfirm: async () => {
                try {
                    await api.rejectPR(prId);
                    loadPRs();
                    setModalConfig(prev => ({ ...prev, isOpen: false }));
                    showToast("PR Rejected", 'success');
                } catch (err) {
                    showToast("Failed to reject PR: " + err.message, 'error');
                }
            },
            onCancel: () => setModalConfig(prev => ({ ...prev, isOpen: false }))
        });
    };

    const handleSaveRemote = async () => {
        setGitLoading(true);
        try {
            await api.setGitConfig(remoteUrl);
            showToast("Remote URL updated successfully", 'success');
        } catch (err) {
            showToast("Failed to update remote: " + err.message, 'error');
        } finally {
            setGitLoading(false);
        }
    };

    const handleGitSync = async () => {
        setGitLoading(true);
        setGitOutput('Syncing...');
        try {
            const res = await api.syncGit();
            setGitOutput(res.output || res.message);
        } catch (err) {
            setGitOutput("Error: " + err.message);
        } finally {
            setGitLoading(false);
        }
    };

    const handleGitPush = async () => {
        setGitLoading(true);
        setGitOutput('Pushing...');
        try {
            const res = await api.pushGit();
            setGitOutput(res.output || res.message);
        } catch (err) {
            setGitOutput("Error: " + err.message);
        } finally {
            setGitLoading(false);
        }
    };

    const handleViewDiff = async (prId) => {
        setLoading(true);
        try {
            const data = await api.getPRDiff(prId);
            setDiffData(data);
            setCurrentPRId(prId);
            setShowDiffModal(true);
        } catch (err) {
            showToast("Failed to load diff: " + err.message, 'error');
        } finally {
            setLoading(false);
        }
    };

    // Diff Modal Component
    const DiffModal = () => {
        if (!showDiffModal || !diffData) return null;

        const [acceptedIndices, setAcceptedIndices] = useState([]);

        useEffect(() => {
            if (diffData) {
                // Default to all selected
                const allIndices = diffData.diffs.map(d => d.index);
                setAcceptedIndices(allIndices);
            }
        }, [diffData]);

        const toggleIndex = (index) => {
            setAcceptedIndices(prev =>
                prev.includes(index)
                    ? prev.filter(i => i !== index)
                    : [...prev, index]
            );
        };

        const handleProcessPR = async () => {
            if (!currentPRId) return;
            setLoading(true);
            try {
                await api.processPR(currentPRId, acceptedIndices);
                showToast(`PR Processed. ${acceptedIndices.length} samples accepted.`, 'success');
                setShowDiffModal(false);
                loadPRs();
            } catch (err) {
                showToast("Failed to process PR: " + err.message, 'error');
            } finally {
                setLoading(false);
            }
        };

        const renderDiff = (oldObj, newObj) => {
            const diff = diffJson(oldObj, newObj);
            return (
                <pre className="font-mono text-xs whitespace-pre-wrap">
                    {diff.map((part, i) => {
                        const color = part.added ? 'text-green-400 bg-green-900/20' :
                            part.removed ? 'text-red-400 bg-red-900/20' : 'text-gray-400';
                        return (
                            <span key={i} className={color}>
                                {part.value}
                            </span>
                        );
                    })}
                </pre>
            );
        };

        return (
            <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                <div className="bg-[#1E1E1E] border border-[#333] rounded-lg w-full max-w-5xl h-[80vh] flex flex-col shadow-2xl">
                    <div className="p-4 border-b border-[#333] flex justify-between items-center bg-[#252525]">
                        <h3 className="text-xl font-bold text-white">Review Changes ({diffData.total_changes} items changed)</h3>
                        <button onClick={() => setShowDiffModal(false)} className="text-gray-400 hover:text-white">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-6 space-y-6">
                        {diffData.diffs.length === 0 ? (
                            <div className="text-center text-gray-500 py-12">No differences found. The dataset is identical to the main repo.</div>
                        ) : (
                            diffData.diffs.map((diff, idx) => (
                                <div key={idx} className={`border rounded bg-[#121212] overflow-hidden transition-all ${acceptedIndices.includes(diff.index) ? 'border-green-800 shadow-green-900/10' : 'border-[#333] opacity-60'}`}>
                                    <div className={`px-4 py-2 text-xs font-bold uppercase tracking-wider border-b border-[#333] flex justify-between items-center ${acceptedIndices.includes(diff.index)
                                        ? (diff.type === 'added' ? 'bg-green-900/20 text-green-400' : diff.type === 'removed' ? 'bg-red-900/20 text-red-400' : 'bg-blue-900/20 text-blue-400')
                                        : 'bg-[#252525] text-gray-500'
                                        }`}>
                                        <div className="flex items-center gap-3">
                                            <input
                                                type="checkbox"
                                                checked={acceptedIndices.includes(diff.index)}
                                                onChange={() => toggleIndex(diff.index)}
                                                className="w-4 h-4 rounded border-gray-600 text-green-500 focus:ring-green-500 bg-[#333]"
                                            />
                                            <span>Item Index: {diff.index} • {diff.type}</span>
                                        </div>
                                        <span className={acceptedIndices.includes(diff.index) ? "text-green-400" : "text-gray-500"}>
                                            {acceptedIndices.includes(diff.index) ? "ACCEPTED" : "REJECTED"}
                                        </span>
                                    </div>

                                    <div className="p-4 font-mono text-xs overflow-x-auto">
                                        {diff.type === 'modified' ? (
                                            <div>
                                                {renderDiff(diff.old_content, diff.new_content)}
                                            </div>
                                        ) : (
                                            <pre className={`whitespace-pre-wrap ${diff.type === 'added' ? 'text-green-300' : 'text-red-300'}`}>
                                                {JSON.stringify(diff.content, null, 2)}
                                            </pre>
                                        )}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    <div className="p-4 border-t border-[#333] bg-[#252525] flex justify-between items-center">
                        <div className="text-sm text-gray-400">
                            <span className="text-white font-bold">{acceptedIndices.length}</span> items selected to merge.
                        </div>
                        <div className="flex gap-3">
                            <Button variant="secondary" onClick={() => setShowDiffModal(false)}>Close</Button>
                            <Button variant="success" onClick={handleProcessPR} disabled={loading}>
                                {loading ? 'Processing...' : 'Process PR'}
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    const UserStatsModal = () => {
        if (!showUserStatsModal || !selectedUserStats) return null;

        return (
            <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                <div className="bg-[#1E1E1E] border border-[#333] rounded-lg w-full max-w-4xl flex flex-col shadow-2xl animate-fade-in-up">
                    <div className="p-6 border-b border-[#333] flex justify-between items-center bg-[#252525] rounded-t-lg">
                        <div>
                            <h3 className="text-2xl font-bold text-white mb-1">{selectedUserStats.full_name || selectedUserStats.username}</h3>
                            <p className="text-sm text-gray-400">@{selectedUserStats.username} • {selectedUserStats.email}</p>
                        </div>
                        <button onClick={() => setShowUserStatsModal(false)} className="text-gray-400 hover:text-white transition-colors">
                            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                    </div>

                    <div className="p-8 bg-[#0a0a0a]">
                        <div className="grid grid-cols-3 gap-6 mb-8">
                            <div className="bg-[#121212] p-4 rounded border border-[#333]">
                                <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Total PRs</div>
                                <div className="text-2xl font-bold text-blue-400">{selectedUserStats.contribution_stats?.total_prs || 0}</div>
                            </div>
                            <div className="bg-[#121212] p-4 rounded border border-[#333]">
                                <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Accepted Samples</div>
                                <div className="text-2xl font-bold text-green-400">{selectedUserStats.sample_stats?.accepted || 0}</div>
                            </div>
                            <div className="bg-[#121212] p-4 rounded border border-[#333]">
                                <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Rejected Samples</div>
                                <div className="text-2xl font-bold text-red-400">{selectedUserStats.sample_stats?.rejected || 0}</div>
                            </div>
                        </div>

                        <ContributionGraph stats={selectedUserStats.contribution_stats?.daily_stats} />
                    </div>

                    <div className="p-4 border-t border-[#333] bg-[#252525] flex justify-end rounded-b-lg">
                        <Button variant="secondary" onClick={() => setShowUserStatsModal(false)}>Close</Button>
                    </div>
                </div>
            </div>
        );
    };

    const PermissionModal = () => {
        if (!showPermissionModal || !selectedUserForPermissions) return null;

        const [selectedDatasets, setSelectedDatasets] = useState(selectedUserForPermissions.allowed_datasets || []);
        const [availableDatasets, setAvailableDatasets] = useState([]);
        const [loadingDatasets, setLoadingDatasets] = useState(false);

        useEffect(() => {
            const fetchDatasets = async () => {
                setLoadingDatasets(true);
                try {
                    const data = await api.getDatasets();
                    setAvailableDatasets(data.datasets);
                } catch (err) {
                    showToast("Failed to load datasets", "error");
                } finally {
                    setLoadingDatasets(false);
                }
            };
            fetchDatasets();
        }, []);

        const toggleDataset = (path) => {
            setSelectedDatasets(prev =>
                prev.includes(path)
                    ? prev.filter(p => p !== path)
                    : [...prev, path]
            );
        };

        const handleSave = async () => {
            setLoading(true);
            try {
                await api.updateUserPermissions(selectedUserForPermissions.username, selectedDatasets);
                showToast("Permissions updated successfully", "success");
                setShowPermissionModal(false);
                loadUsers(); // Reload to update local state
            } catch (err) {
                showToast("Failed to save permissions: " + err.message, "error");
            } finally {
                setLoading(false);
            }
        };

        return (
            <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                <div className="bg-[#1E1E1E] border border-[#333] rounded-lg w-full max-w-2xl flex flex-col shadow-2xl animate-fade-in-up">
                    <div className="p-6 border-b border-[#333] flex justify-between items-center bg-[#252525] rounded-t-lg">
                        <h3 className="text-xl font-bold text-white">Manage Permissions: {selectedUserForPermissions.username}</h3>
                        <button onClick={() => setShowPermissionModal(false)} className="text-gray-400 hover:text-white">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                    </div>

                    <div className="p-6 max-h-[60vh] overflow-y-auto">
                        <p className="text-gray-400 text-sm mb-4">Select the datasets this user is allowed to view and edit.</p>

                        {loadingDatasets ? (
                            <div className="text-center py-8 text-gray-500">Loading datasets...</div>
                        ) : (
                            <div className="space-y-2">
                                {availableDatasets.map(ds => (
                                    <div
                                        key={ds.path}
                                        className={`p-3 rounded border cursor-pointer flex items-center justify-between transition-all ${selectedDatasets.includes(ds.path)
                                            ? 'bg-blue-900/20 border-blue-800'
                                            : 'bg-[#121212] border-[#333] hover:border-gray-600'
                                            }`}
                                        onClick={() => toggleDataset(ds.path)}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className={`w-5 h-5 rounded border flex items-center justify-center ${selectedDatasets.includes(ds.path)
                                                ? 'bg-blue-500 border-blue-500 text-white'
                                                : 'border-gray-600 bg-[#333]'
                                                }`}>
                                                {selectedDatasets.includes(ds.path) && (
                                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>
                                                )}
                                            </div>
                                            <div>
                                                <div className="font-bold text-white text-sm">{ds.name}</div>
                                                <div className="text-xs text-gray-500">{ds.path}</div>
                                            </div>
                                        </div>
                                        <span className="text-xs font-bold uppercase text-gray-600 bg-[#222] px-2 py-1 rounded">{ds.type}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="p-4 border-t border-[#333] bg-[#252525] flex justify-end gap-3 rounded-b-lg">
                        <Button variant="secondary" onClick={() => setShowPermissionModal(false)}>Cancel</Button>
                        <Button variant="primary" onClick={handleSave} disabled={loading}>Save Permissions</Button>
                    </div>
                </div>
            </div>
        );
    };

    const Sidebar = (
        <div className="flex flex-col h-full">
            <div className="space-y-8 flex-1 overflow-y-auto">
                <div>
                    <h2 className="font-bold mb-3 text-gray-500 text-xs uppercase tracking-widest">Admin Controls</h2>
                    <div className="space-y-1">
                        <div
                            onClick={() => setActiveTab('users')}
                            className={`px-3 py-2 rounded text-sm font-bold cursor-pointer transition-all ${activeTab === 'users' ? 'bg-white text-black' : 'text-gray-400 hover:bg-[#333] hover:text-white'}`}
                        >
                            User Management
                        </div>
                        <div
                            onClick={() => setActiveTab('prs')}
                            className={`px-3 py-2 rounded text-sm font-bold cursor-pointer transition-all ${activeTab === 'prs' ? 'bg-white text-black' : 'text-gray-400 hover:bg-[#333] hover:text-white'}`}
                        >
                            Pull Requests
                        </div>
                        <div
                            onClick={() => setActiveTab('repo')}
                            className={`px-3 py-2 rounded text-sm font-bold cursor-pointer transition-all ${activeTab === 'repo' ? 'bg-white text-black' : 'text-gray-400 hover:bg-[#333] hover:text-white'}`}
                        >
                            Repository
                        </div>
                    </div>
                </div>
            </div>

            <div className="pt-4 mt-auto border-t border-[#333] space-y-2">
                <Link to="/" className="w-full flex items-center gap-3 px-3 py-2 text-purple-400 hover:text-white hover:bg-purple-900/20 rounded transition-all group">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                    <span className="text-sm font-bold">Back to Studio</span>
                </Link>
                <button
                    onClick={onLogout}
                    className="w-full flex items-center gap-3 px-3 py-2 text-gray-300 hover:bg-[#333] rounded transition-all group"
                >
                    <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    <span className="text-sm font-medium">Sign Out</span>
                </button>
            </div>
        </div>
    );

    return (
        <Layout sidebar={Sidebar}>
            {toast && (
                <Toast
                    message={toast.message}
                    type={toast.type}
                    onClose={() => setToast(null)}
                />
            )}
            <ConfirmModal
                isOpen={modalConfig.isOpen}
                title={modalConfig.title}
                message={modalConfig.message}
                onConfirm={modalConfig.onConfirm}
                onCancel={modalConfig.onCancel}
                confirmText={modalConfig.confirmText}
                confirmVariant={modalConfig.confirmVariant}
            />
            <DiffModal />
            <UserStatsModal />
            <PermissionModal />
            <div className="space-y-8">
                <div className="flex justify-between items-center border-b border-[#333] pb-6">
                    <h2 className="text-2xl font-black text-white tracking-tight uppercase">
                        {activeTab === 'users' ? 'User Management' :
                            activeTab === 'prs' ? 'Pull Requests' : 'Repository Settings'}
                    </h2>
                </div>

                {activeTab === 'users' && (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Invitation Management */}
                        <div className="lg:col-span-1">
                            <Card title="Invitation Management" className="sticky top-8">
                                <p className="text-gray-400 text-sm mb-4">Generate unique invitation codes for new users to register.</p>

                                <Button
                                    onClick={handleGenerateInvite}
                                    variant="primary"
                                    className="w-full mb-6"
                                    disabled={loading}
                                >
                                    {loading ? 'Generating...' : 'Generate New Code'}
                                </Button>

                                <div className="space-y-3">
                                    <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Recent Codes</h4>
                                    <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
                                        {invites.map(invite => (
                                            <div key={invite.code} className="bg-[#121212] border border-[#333] rounded p-3 flex justify-between items-center group">
                                                <div>
                                                    <div className="font-mono text-lg font-bold text-white tracking-widest mb-1">{invite.code}</div>
                                                    <div className="text-[10px] text-gray-500 flex flex-col gap-0.5">
                                                        <span>Created: {new Date(invite.created_at).toLocaleTimeString()}</span>
                                                        {invite.expires_at && (
                                                            <span className={new Date() > new Date(invite.expires_at) ? 'text-red-500 font-bold' : 'text-yellow-500'}>
                                                                Expires: {new Date(invite.expires_at).toLocaleTimeString()}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <div>
                                                        {invite.is_used ? (
                                                            <span className="px-2 py-1 rounded text-[10px] font-bold uppercase bg-red-900/30 text-red-200 border border-red-800">
                                                                Used by {invite.used_by}
                                                            </span>
                                                        ) : (
                                                            <span className="px-2 py-1 rounded text-[10px] font-bold uppercase bg-green-900/30 text-green-200 border border-green-800">
                                                                Available
                                                            </span>
                                                        )}
                                                    </div>
                                                    {!invite.is_used && (
                                                        <button
                                                            onClick={() => handleDeleteInvite(invite.code)}
                                                            className="text-gray-600 hover:text-red-400 transition-colors p-1 rounded hover:bg-[#333]"
                                                            title="Cancel Invitation"
                                                        >
                                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                        {invites.length === 0 && (
                                            <div className="text-center text-gray-500 text-xs italic py-4">No codes generated yet.</div>
                                        )}
                                    </div>
                                </div>
                            </Card>
                        </div>

                        {/* Users List */}
                        <div className="lg:col-span-2">
                            <Card title={`Existing Users (${users.length})`}>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left border-collapse">
                                        <thead>
                                            <tr className="border-b border-[#333] text-gray-500 text-xs uppercase tracking-wider">
                                                <th className="p-3 font-bold">Username</th>
                                                <th className="p-3 font-bold">Role</th>
                                                <th className="p-3 font-bold">Full Name</th>
                                                <th className="p-3 font-bold">Contributions</th>
                                                <th className="p-3 font-bold text-right">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="text-sm">
                                            {users.map(user => (
                                                <tr
                                                    key={user.username}
                                                    className="border-b border-[#333] hover:bg-[#252525] transition-colors cursor-pointer"
                                                    onClick={() => handleViewUserStats(user.username)}
                                                >
                                                    <td className="p-3 font-medium text-white">{user.username}</td>
                                                    <td className="p-3">
                                                        <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${user.role === 'admin'
                                                            ? 'bg-purple-900/30 text-purple-200 border border-purple-800'
                                                            : 'bg-gray-800 text-gray-300 border border-gray-700'
                                                            }`}>
                                                            {user.role}
                                                        </span>
                                                    </td>
                                                    <td className="p-3 text-gray-400">{user.full_name || '-'}</td>
                                                    <td className="p-3">
                                                        <div className="flex items-center gap-2 text-xs">
                                                            <span className="text-gray-300" title="Total PRs">
                                                                {user.contribution_stats?.total_prs || 0} PRs
                                                            </span>
                                                            <span className="text-gray-600">•</span>
                                                            <span className="text-green-400" title="Accepted Samples">
                                                                {user.sample_stats?.accepted || 0} Samples
                                                            </span>
                                                        </div>
                                                    </td>
                                                    <td className="p-3 text-right">
                                                        <div className="flex justify-end gap-2">
                                                            <Button
                                                                variant="secondary"
                                                                size="xs"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setSelectedUserForPermissions(user);
                                                                    setShowPermissionModal(true);
                                                                }}
                                                            >
                                                                Permissions
                                                            </Button>
                                                            <Button
                                                                variant="danger"
                                                                size="xs"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleDeleteUser(user.username);
                                                                }}
                                                            >
                                                                Delete
                                                            </Button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                            {users.length === 0 && (
                                                <tr>
                                                    <td colSpan="4" className="p-8 text-center text-gray-500 italic">
                                                        No users found.
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </Card>
                        </div>
                    </div>
                )}

                {activeTab === 'prs' && (
                    <div className="space-y-4">
                        {prs.map(pr => (
                            <Card key={pr._id} className="border-l-4 border-l-blue-500">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <div className="flex items-center gap-3 mb-2">
                                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${pr.status === 'open' ? 'bg-green-900/30 text-green-200 border border-green-800' :
                                                pr.status === 'merged' ? 'bg-purple-900/30 text-purple-200 border border-purple-800' :
                                                    'bg-red-900/30 text-red-200 border border-red-800'
                                                }`}>
                                                {pr.status}
                                            </span>
                                            <h3 className="text-lg font-bold text-white">{pr.dataset_path}</h3>
                                        </div>
                                        <div className="text-sm text-gray-400 mb-4">
                                            <span className="font-bold text-white">{pr.username}</span> wants to merge changes.
                                            <span className="mx-2">•</span>
                                            {new Date(pr.created_at).toLocaleString()}
                                        </div>
                                        {pr.description && (
                                            <div className="bg-[#121212] p-3 rounded border border-[#333] text-sm text-gray-300 mb-4">
                                                {pr.description}
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex gap-2">
                                        <Button variant="secondary" size="sm" onClick={() => handleViewDiff(pr._id)}>
                                            View Changes
                                        </Button>
                                        {pr.status === 'open' && (
                                            <>
                                                <Button variant="danger" size="sm" onClick={() => handleRejectPR(pr._id)}>Reject</Button>
                                                <Button variant="success" size="sm" onClick={() => handleMergePR(pr._id)}>Merge</Button>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </Card>
                        ))}
                        {prs.length === 0 && (
                            <div className="text-center py-12 text-gray-500">
                                No Pull Requests found.
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'repo' && (
                    <div className="space-y-8">
                        <Card title="Remote Repository Configuration">
                            <div className="flex gap-4 items-end">
                                <div className="flex-1">
                                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Remote URL (Origin)</label>
                                    <input
                                        type="text"
                                        value={remoteUrl}
                                        onChange={(e) => setRemoteUrl(e.target.value)}
                                        className="w-full bg-[#121212] border border-[#333] rounded p-3 text-white focus:border-white focus:outline-none font-mono text-sm"
                                        placeholder="https://github.com/username/repo.git"
                                    />
                                </div>
                                <Button onClick={handleSaveRemote} disabled={gitLoading}>
                                    Save Config
                                </Button>
                            </div>
                        </Card>

                        <Card title="Sync Operations">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-4">
                                    <h3 className="font-bold text-white">Pull Changes</h3>
                                    <p className="text-sm text-gray-400">Fetch and merge changes from the remote repository to the local server.</p>
                                    <Button variant="secondary" onClick={handleGitSync} disabled={gitLoading} className="w-full">
                                        Sync (Pull from Remote)
                                    </Button>
                                </div>
                                <div className="space-y-4">
                                    <h3 className="font-bold text-white">Push Changes</h3>
                                    <p className="text-sm text-gray-400">Push all approved and merged changes from the local server to the remote repository.</p>
                                    <Button variant="primary" onClick={handleGitPush} disabled={gitLoading} className="w-full">
                                        Push to Remote
                                    </Button>
                                </div>
                            </div>

                            {gitOutput && (
                                <div className="mt-8">
                                    <h3 className="font-bold text-white mb-2 text-xs uppercase tracking-wider">Console Output</h3>
                                    <div className="bg-[#121212] p-4 rounded border border-[#333] font-mono text-xs text-green-400 whitespace-pre-wrap h-64 overflow-y-auto">
                                        {gitOutput}
                                    </div>
                                </div>
                            )}
                        </Card>
                    </div>
                )}
            </div>
        </Layout>
    );
};

export default AdminDashboard;
