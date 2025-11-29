import React, { useEffect } from 'react';

const Toast = ({ message, type = 'success', onClose, duration = 3000 }) => {
    useEffect(() => {
        const timer = setTimeout(() => {
            onClose();
        }, duration);
        return () => clearTimeout(timer);
    }, [duration, onClose]);

    const bgColors = {
        success: 'bg-green-900/90 border-green-700 text-green-100',
        error: 'bg-red-900/90 border-red-700 text-red-100',
        info: 'bg-blue-900/90 border-blue-700 text-blue-100',
        warning: 'bg-yellow-900/90 border-yellow-700 text-yellow-100'
    };

    return (
        <div className={`fixed bottom-4 right-4 px-6 py-3 rounded shadow-2xl border backdrop-blur-sm z-50 animate-fade-in-up ${bgColors[type] || bgColors.info}`}>
            <div className="flex items-center gap-3">
                {type === 'success' && (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                    </svg>
                )}
                {type === 'error' && (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                )}
                <span className="font-medium">{message}</span>
                <button onClick={onClose} className="ml-4 opacity-70 hover:opacity-100">
                    ✕
                </button>
            </div>
        </div>
    );
};

export default Toast;
