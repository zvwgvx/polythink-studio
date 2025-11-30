import React from 'react';
import { Link } from 'react-router-dom';

const Layout = ({ children, sidebar, onBrandClick }) => {
    return (
        <div className="min-h-screen bg-dot-grid flex font-mono text-[#E0E0E0]">
            {/* Sidebar */}
            <aside className="w-64 bg-[#1E1E1E] border-r border-[#333] flex flex-col fixed h-full overflow-y-auto">
                <div className="p-6 border-b border-[#333] bg-[#1E1E1E]">
                    <div className="flex items-center gap-3">
                        <Link to="/" onClick={onBrandClick} className="flex flex-col hover:opacity-80 transition-opacity">
                            <h1 className="text-lg font-bold text-white leading-none tracking-tight">PolyThink</h1>
                            <span className="text-[10px] font-bold text-gray-500 tracking-[0.2em] uppercase mt-1">Studio</span>
                        </Link>
                    </div>
                </div>
                <div className="flex-1 p-4">
                    {sidebar}
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 ml-64 p-8">
                <div className="max-w-5xl mx-auto">
                    {children}
                </div>
            </main>
        </div>
    );
};

export default Layout;
