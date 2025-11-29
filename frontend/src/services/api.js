const API_URL = 'http://localhost:8000';

const getHeaders = () => {
    const token = localStorage.getItem('token');
    const headers = {
        'Content-Type': 'application/json',
    };
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
};

export const api = {
    login: async (username, password) => {
        const formData = new FormData();
        formData.append('username', username);
        formData.append('password', password);

        const response = await fetch(`${API_URL}/token`, {
            method: 'POST',
            body: formData,
        });
        if (!response.ok) throw new Error('Login failed');
        return response.json();
    },

    getMe: async () => {
        const response = await fetch(`${API_URL}/users/me`, {
            headers: getHeaders(),
        });
        if (!response.ok) throw new Error('Failed to fetch user info');
        return response.json();
    },

    getUsers: async () => {
        const response = await fetch(`${API_URL}/users`, {
            headers: getHeaders(),
        });
        if (!response.ok) throw new Error('Failed to fetch users');
        return response.json();
    },

    createUser: async (userData) => {
        // Legacy: Replaced by registration
        throw new Error("Use registration flow");
    },

    loginRequest: async (email) => {
        const response = await fetch(`${API_URL}/auth/login-request`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email }),
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Failed to request login code');
        }
        return response.json();
    },

    loginVerify: async (email, code) => {
        const response = await fetch(`${API_URL}/auth/login-verify`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, code }),
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Failed to verify login code');
        }
        return response.json();
    },

    register: async (username, email, fullName, invitationCode) => {
        const response = await fetch(`${API_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, email, full_name: fullName, invitation_code: invitationCode }),
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Registration failed');
        }
        return response.json();
    },

    verifyEmail: async (email, code) => {
        const response = await fetch(`${API_URL}/auth/verify`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, code }),
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Verification failed');
        }
        return response.json();
    },

    forgotPassword: async (email) => {
        const response = await fetch(`${API_URL}/auth/forgot-password`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email }),
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Failed to request password reset');
        }
        return response.json();
    },

    resetPassword: async (email, code, newPassword) => {
        const response = await fetch(`${API_URL}/auth/reset-password`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, code, new_password: newPassword }),
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Failed to reset password');
        }
        return response.json();
    },

    deleteUser: async (username) => {
        const response = await fetch(`${API_URL}/users/${username}`, {
            method: 'DELETE',
            headers: getHeaders(),
        });
        if (!response.ok) throw new Error('Failed to delete user');
        return response.json();
    },

    // Invitation API
    generateInvite: async () => {
        const response = await fetch(`${API_URL}/admin/invites`, {
            method: 'POST',
            headers: getHeaders(),
        });
        if (!response.ok) throw new Error('Failed to generate invite');
        return response.json();
    },

    getInvites: async () => {
        const response = await fetch(`${API_URL}/admin/invites`, {
            headers: getHeaders(),
        });
        if (!response.ok) throw new Error('Failed to fetch invites');
        return response.json();
    },

    getDatasets: async () => {
        const response = await fetch(`${API_URL}/datasets`, {
            headers: getHeaders(),
        });
        if (!response.ok) throw new Error('Failed to fetch datasets');
        return response.json();
    },

    getDatasetContent: async (type, filename, fork = false) => {
        const url = `${API_URL}/datasets/${type}/${filename}${fork ? '?fork=true' : ''}`;
        const response = await fetch(url, {
            headers: getHeaders(),
        });
        if (!response.ok) throw new Error('Failed to fetch dataset content');
        return response.json();
    },

    saveDatasetContent: async (type, filename, content) => {
        const response = await fetch(`${API_URL}/datasets/${type}/${filename}`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify({ content }),
        });
        if (!response.ok) throw new Error('Failed to save dataset');
        return response.json();
    },

    // Workflow API
    createPR: async (datasetPath, description) => {
        const response = await fetch(`${API_URL}/workflow/pr?dataset_path=${datasetPath}&description=${description}`, {
            method: 'POST',
            headers: getHeaders(),
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Failed to create PR');
        }
        return response.json();
    },

    getPRs: async () => {
        const response = await fetch(`${API_URL}/workflow/prs`, {
            headers: getHeaders(),
        });
        if (!response.ok) throw new Error('Failed to fetch PRs');
        return response.json();
    },

    getPRDiff: async (prId) => {
        const response = await fetch(`${API_URL}/workflow/prs/${prId}/diff`, {
            headers: getHeaders(),
        });
        if (!response.ok) throw new Error('Failed to fetch PR diff');
        return response.json();
    },

    mergePR: async (prId) => {
        const response = await fetch(`${API_URL}/workflow/prs/${prId}/merge`, {
            method: 'POST',
            headers: getHeaders(),
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Failed to merge PR');
        }
        return response.json();
    },

    rejectPR: async (prId) => {
        const response = await fetch(`${API_URL}/workflow/prs/${prId}/reject`, {
            method: 'POST',
            headers: getHeaders(),
        });
        if (!response.ok) throw new Error('Failed to reject PR');
        return response.json();
    },

    // Git API
    getGitConfig: async () => {
        const response = await fetch(`${API_URL}/workflow/git/config`, {
            headers: getHeaders(),
        });
        if (!response.ok) throw new Error('Failed to get git config');
        return response.json();
    },

    setGitConfig: async (url) => {
        const response = await fetch(`${API_URL}/workflow/git/config`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify({ url }),
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Failed to set git config');
        }
        return response.json();
    },

    syncGit: async () => {
        const response = await fetch(`${API_URL}/workflow/git/sync`, {
            method: 'POST',
            headers: getHeaders(),
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Failed to sync');
        }
        return response.json();
    },

    pushGit: async () => {
        const response = await fetch(`${API_URL}/workflow/git/push`, {
            method: 'POST',
            headers: getHeaders(),
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Failed to push');
        }
        return response.json();
    }
};
