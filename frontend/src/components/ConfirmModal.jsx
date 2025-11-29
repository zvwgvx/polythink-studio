import React from 'react';
import Button from './Button';

const ConfirmModal = ({
    isOpen,
    title,
    message,
    onConfirm,
    onDiscard,
    onCancel,
    confirmText = "Save",
    discardText = "Discard",
    cancelText = "Cancel",
    confirmVariant = "success"
}) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in">
            <div className="bg-[#1E1E1E] border border-[#333] rounded-lg shadow-2xl p-6 max-w-md w-full mx-4 transform transition-all scale-100">
                <h3 className="text-xl font-bold text-white mb-2">{title}</h3>
                <p className="text-gray-400 mb-6">{message}</p>

                <div className="flex justify-end gap-3">
                    {onCancel && (
                        <Button variant="secondary" size="md" onClick={onCancel}>
                            {cancelText}
                        </Button>
                    )}
                    {onDiscard && (
                        <Button variant="danger" size="md" onClick={onDiscard} className="bg-red-900/20 text-red-200 border-red-900/50 hover:bg-red-900/40">
                            {discardText}
                        </Button>
                    )}
                    {onConfirm && (
                        <Button variant={confirmVariant} size="md" onClick={onConfirm}>
                            {confirmText}
                        </Button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ConfirmModal;
