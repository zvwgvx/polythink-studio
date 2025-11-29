import React, { useEffect } from 'react';

const Toast = ({ message, type = 'success', onClose }) => {
    useEffect(() => {
        const timer = setTimeout(() => {
            onClose();
        }, 3000);
        return () => clearTimeout(timer);
    }, [onClose]);

    const variants = {
        success: "border-green-500 text-green-100 bg-[#1E1E1E]",
        error: "border-red-500 text-red-100 bg-[#1E1E1E]"
    };

    const icons = {
        success: (
            <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
            </svg>
        ),
        error: (
            <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
        )
    };

    return (
        <div className={`fixed bottom-8 right-8 flex items-center gap-3 px-6 py-4 rounded-lg border-l-4 shadow-2xl transform transition-all duration-300 animate-slide-up z-50 ${variants[type]}`}>
            {icons[type]}
            <span className="font-bold tracking-wide">{message}</span>
            <button onClick={onClose} className="ml-4 text-gray-500 hover:text-white transition-colors">
                ✕
            </button>
        </div>
    );
};

export default Toast;
