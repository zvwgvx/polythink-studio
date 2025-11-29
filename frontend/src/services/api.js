const API_URL = 'http://localhost:8000';

export const api = {
    getDatasets: async () => {
        const response = await fetch(`${API_URL}/datasets`);
        if (!response.ok) throw new Error('Failed to fetch datasets');
        return response.json();
    },

    getDatasetContent: async (type, filename) => {
        const response = await fetch(`${API_URL}/datasets/${type}/${filename}`);
        if (!response.ok) throw new Error('Failed to fetch dataset content');
        return response.json();
    },

    saveDatasetContent: async (type, filename, content) => {
        const response = await fetch(`${API_URL}/datasets/${type}/${filename}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ content }),
        });
        if (!response.ok) throw new Error('Failed to save dataset');
        return response.json();
    }
};
