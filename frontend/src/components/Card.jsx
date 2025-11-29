import React from 'react';

const Card = ({ children, className = '', title }) => {
    return (
        <div className={`bg-[#1E1E1E] border border-[#333] rounded-lg shadow-lg p-6 ${className}`}>
            {title && (
                <div className="mb-4 border-b border-[#333] pb-2">
                    <h3 className="text-lg font-bold text-white tracking-wide">{title}</h3>
                </div>
            )}
            {children}
        </div>
    );
};

export default Card;
