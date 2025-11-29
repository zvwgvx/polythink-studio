import React from 'react';

const Button = ({ children, onClick, className = '', variant = 'primary', size = 'md', ...props }) => {
    const baseStyle = "font-bold rounded transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#121212]";

    const sizes = {
        xs: "px-2 py-1 text-xs",
        sm: "px-3 py-1.5 text-sm",
        md: "px-4 py-2 text-sm",
        lg: "px-6 py-3 text-base"
    };

    const variants = {
        primary: "bg-white text-black hover:bg-gray-200 focus:ring-white",
        secondary: "bg-[#333] text-white hover:bg-[#444] focus:ring-[#555]",
        danger: "bg-red-900/80 text-red-100 border border-red-700 hover:bg-red-900 focus:ring-red-700",
        success: "bg-green-900/80 text-green-100 border border-green-700 hover:bg-green-900 focus:ring-green-700"
    };

    return (
        <button
            className={`${baseStyle} ${sizes[size]} ${variants[variant]} ${className}`}
            onClick={onClick}
            {...props}
        >
            {children}
        </button>
    );
};

export default Button;
