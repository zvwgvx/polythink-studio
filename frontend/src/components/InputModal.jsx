import React, { useEffect, useRef } from 'react';
import Button from './Button';

const InputModal = ({
    isOpen,
    title,
    message,
    value,
    onChange,
    onConfirm,
    onCancel,
    placeholder = "Enter text...",
    confirmText = "Confirm",
    cancelText = "Cancel"
}) => {
    const inputRef = useRef(null);

    useEffect(() => {
        if (isOpen && inputRef.current) {
            inputRef.current.focus();
        }
    }, [isOpen]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-fade-in">
            <div className="bg-[#1E1E1E] border border-[#333] rounded-lg shadow-2xl w-full max-w-md p-6 transform transition-all scale-100 animate-scale-in">
                <h3 className="text-xl font-bold text-white mb-2">{title}</h3>
                {message && <p className="text-gray-400 text-sm mb-4">{message}</p>}

                <textarea
                    ref={inputRef}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder={placeholder}
                    className="w-full bg-[#121212] border border-[#333] rounded p-3 text-gray-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none min-h-[100px] mb-6 resize-none"
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            onConfirm();
                        }
                    }}
                />

                <div className="flex justify-end gap-3">
                    <Button variant="secondary" onClick={onCancel}>
                        {cancelText}
                    </Button>
                    <Button variant="primary" onClick={onConfirm} disabled={!value.trim()}>
                        {confirmText}
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default InputModal;
