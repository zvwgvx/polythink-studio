import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import Layout from './Layout';
import Card from './Card';
import Button from './Button';
import { diffJson } from 'diff';

const AdminDashboard = () => {
    const [activeTab, setActiveTab] = useState('users'); // 'users', 'prs', 'repo'
    const [users, setUsers] = useState([]);
    const [prs, setPrs] = useState([]);
    const [newUser, setNewUser] = useState({ username: '', password: '', role: 'user', full_name: '', email: '' });
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [loading, setLoading] = useState(false);

    // Git State
    const [remoteUrl, setRemoteUrl] = useState('');
    const [gitLoading, setGitLoading] = useState(false);
    const [gitOutput, setGitOutput] = useState('');

    // Diff State
    const [diffData, setDiffData] = useState(null);
    const [showDiffModal, setShowDiffModal] = useState(false);

    const [invites, setInvites] = useState([]);

    useEffect(() => {
        if (activeTab === 'users') {
            loadUsers();
            loadInvites();
        }
        if (activeTab === 'prs') loadPRs();
        if (activeTab === 'repo') loadGitConfig();
    }, [activeTab]);

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
        setError('');
        setSuccess('');
        try {
            await api.generateInvite();
            setSuccess('New invitation code generated');
            loadInvites();
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteUser = async (username) => {
        if (!window.confirm(`Are you sure you want to delete user ${username}?`)) return;
        try {
            await api.deleteUser(username);
            loadUsers();
        } catch (err) {
            alert('Failed to delete user');
        }
    };

    const handleMergePR = async (prId) => {
        if (!window.confirm("Are you sure you want to merge this PR? This will overwrite the main dataset file.")) return;
        try {
            await api.mergePR(prId);
            loadPRs();
            alert("PR Merged Successfully!");
        } catch (err) {
            alert("Failed to merge PR: " + err.message);
        }
    };

    const handleRejectPR = async (prId) => {
        if (!window.confirm("Are you sure you want to reject this PR?")) return;
        try {
            await api.rejectPR(prId);
            loadPRs();
        } catch (err) {
            alert("Failed to reject PR: " + err.message);
        }
    };

    const handleSaveRemote = async () => {
        setGitLoading(true);
        try {
            await api.setGitConfig(remoteUrl);
            alert("Remote URL updated successfully");
        } catch (err) {
            alert("Failed to update remote: " + err.message);
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
            setShowDiffModal(true);
        } catch (err) {
            alert("Failed to load diff: " + err.message);
        } finally {
            setLoading(false);
        }
    };

    // Diff Modal Component
    const DiffModal = () => {
        if (!showDiffModal || !diffData) return null;

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
                                <div key={idx} className="border border-[#333] rounded bg-[#121212] overflow-hidden">
                                    <div className={`px-4 py-2 text-xs font-bold uppercase tracking-wider border-b border-[#333] flex justify-between items-center ${diff.type === 'added' ? 'bg-green-900/20 text-green-400' :
                                        diff.type === 'removed' ? 'bg-red-900/20 text-red-400' :
                                            'bg-blue-900/20 text-blue-400'
                                        }`}>
                                        <span>Item Index: {diff.index} • {diff.type}</span>
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

                    <div className="p-4 border-t border-[#333] bg-[#252525] flex justify-end">
                        <Button variant="secondary" onClick={() => setShowDiffModal(false)}>Close</Button>
                    </div>
                </div>
            </div>
        );
    };

    const Sidebar = (
        <div className="space-y-8">
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

            <div>
                <h2 className="font-bold mb-3 text-gray-500 text-xs uppercase tracking-widest">Navigation</h2>
                <Link to="/" className="flex items-center gap-2 px-3 py-2 rounded text-sm text-gray-400 hover:bg-[#333] hover:text-white transition-all group">
                    <svg className="w-4 h-4 transition-transform group-hover:-translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                    Back to Studio
                </Link>
            </div>
        </div>
    );

    return (
        <Layout sidebar={Sidebar}>
            <DiffModal />
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
                                {error && <p className="text-red-400 text-sm mb-4 bg-red-900/20 p-2 rounded border border-red-800">{error}</p>}
                                {success && <p className="text-green-400 text-sm mb-4 bg-green-900/20 p-2 rounded border border-green-800">{success}</p>}

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
                                            <div key={invite.code} className="bg-[#121212] border border-[#333] rounded p-3 flex justify-between items-center">
                                                <div>
                                                    <div className="font-mono text-lg font-bold text-white tracking-widest">{invite.code}</div>
                                                    <div className="text-[10px] text-gray-500">
                                                        {new Date(invite.created_at).toLocaleDateString()} • {invite.created_by}
                                                    </div>
                                                </div>
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
                                                <tr key={user.username} className="border-b border-[#333] hover:bg-[#252525] transition-colors">
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
                                                            <span className="text-green-400" title="Merged PRs">
                                                                {user.contribution_stats?.merged_prs || 0} Merged
                                                            </span>
                                                        </div>
                                                    </td>
                                                    <td className="p-3 text-right">
                                                        <Button
                                                            variant="danger"
                                                            size="xs"
                                                            onClick={() => handleDeleteUser(user.username)}
                                                        >
                                                            Delete
                                                        </Button>
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
