import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './components/Login';
import AdminDashboard from './components/AdminDashboard';
import DatasetViewer from './components/DatasetViewer';
import { api } from './services/api';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkUser();
  }, []);

  useEffect(() => {
    if (!loading) {
      // Fade out the initial loader from index.html
      const loader = document.getElementById('initial-loader');
      if (loader) {
        loader.classList.add('fade-out');
        setTimeout(() => {
          loader.remove();
        }, 500);
      }
    }
  }, [loading]);

  const checkUser = async () => {
    const token = localStorage.getItem('token');
    if (token) {
      try {
        const userData = await api.getMe();
        setUser(userData);
      } catch (err) {
        console.error("Failed to fetch user", err);
        localStorage.removeItem('token');
      }
    }
    setLoading(false);
  };

  const handleLogin = async () => {
    await checkUser();
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setUser(null);
  };

  if (loading) {
    // Match the pre-loader style exactly so there is no visual jump
    return (
      <div className="fixed inset-0 bg-[#0a0a0a] flex flex-col items-center justify-center z-50">
        <svg className="w-[120px] h-[120px] text-blue-500 animate-[pulse-logo_2s_infinite_ease-in-out] drop-shadow-[0_0_20px_rgba(59,130,246,0.3)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M10 2v7.31l-4.2 8.4A2 2 0 0 0 7.6 21h8.8a2 2 0 0 0 1.8-3.29L14 9.31V2" />
          <path d="M8 2h8" />
          <path d="M12 15v6" />
        </svg>
        <div className="w-10 h-10 border-2 border-white/10 border-t-blue-500 rounded-full animate-spin mt-8"></div>
        <div className="mt-4 text-gray-500 font-mono text-sm animate-[pulse-text_2s_infinite_ease-in-out]">INITIALIZING STUDIO...</div>
        <style>{`
           @keyframes pulse-logo { 0%, 100% { transform: scale(1); opacity: 0.8; } 50% { transform: scale(1.05); opacity: 1; } }
           @keyframes pulse-text { 0%, 100% { opacity: 0.5; } 50% { opacity: 1; } }
         `}</style>
      </div>
    );
  }

  return (
    <Router>
      <Routes>
        <Route path="/login" element={!user ? <Login onLogin={handleLogin} /> : <Navigate to="/" />} />

        <Route path="/admin" element={
          user && user.role === 'admin' ? (
            <AdminDashboard onLogout={handleLogout} />
          ) : (
            <Navigate to="/" />
          )
        } />

        <Route path="/" element={
          user ? (
            <div className="relative">
              <DatasetViewer user={user} onLogout={handleLogout} isAdmin={user.role === 'admin'} />
            </div>
          ) : (
            <Navigate to="/login" />
          )
        } />
      </Routes>
    </Router>
  );
}

export default App;
