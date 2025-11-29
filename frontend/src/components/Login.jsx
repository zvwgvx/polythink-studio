import React, { useState } from 'react';
import { api } from '../services/api';
import Button from './Button';

const Login = ({ onLogin }) => {
    const [isRegistering, setIsRegistering] = useState(false);

    // Login State
    const [email, setEmail] = useState('');
    const [loginStep, setLoginStep] = useState(1); // 1: Email, 2: OTP
    const [loginOtp, setLoginOtp] = useState('');

    // Register State
    const [registerData, setRegisterData] = useState({
        invitation_code: '',
        full_name: '',
        username: '',
        email: '',
    });

    // Verification State (for Registration)
    const [showVerification, setShowVerification] = useState(false);
    const [verificationCode, setVerificationCode] = useState('');
    const [verificationEmail, setVerificationEmail] = useState('');

    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [loading, setLoading] = useState(false);

    // --- Login Handlers ---
    const handleRequestLoginOtp = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        setLoading(true);
        try {
            await api.loginRequest(email);
            setSuccess("Login code sent! Please check your email.");
            setLoginStep(2);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyLoginOtp = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const data = await api.loginVerify(email, loginOtp);
            localStorage.setItem('token', data.access_token);
            onLogin(data);
        } catch (err) {
            setError(err.message || 'Invalid code');
        } finally {
            setLoading(false);
        }
    };

    // --- Register Handlers ---
    const handleRegister = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        setLoading(true);
        try {
            await api.register(
                registerData.username,
                registerData.email,
                registerData.full_name,
                registerData.invitation_code
            );
            setSuccess("Registration successful! Please check your email for the verification code.");
            setVerificationEmail(registerData.email);
            setShowVerification(true);
            setIsRegistering(false);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyRegistration = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        setLoading(true);
        try {
            await api.verifyEmail(verificationEmail, verificationCode);
            setSuccess("Email verified successfully! You can now login.");
            setShowVerification(false);
            setVerificationCode('');
            // Auto-fill email for login
            setEmail(verificationEmail);
            setLoginStep(1);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    // --- Render Helpers ---

    if (showVerification) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a] p-4">
                <div className="bg-[#121212] p-8 rounded-lg shadow-2xl w-full max-w-md border border-[#333]">
                    <h2 className="text-2xl font-black text-white mb-6 text-center uppercase tracking-tight">Verify Registration</h2>
                    {error && <div className="bg-red-900/20 border border-red-800 text-red-400 p-3 rounded mb-4 text-sm">{error}</div>}
                    {success && <div className="bg-green-900/20 border border-green-800 text-green-400 p-3 rounded mb-4 text-sm">{success}</div>}

                    <p className="text-gray-400 text-sm mb-6 text-center">
                        We have sent a verification code to <span className="text-white font-bold">{verificationEmail}</span>.
                    </p>

                    <form onSubmit={handleVerifyRegistration} className="space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Verification Code</label>
                            <input
                                type="text"
                                value={verificationCode}
                                onChange={(e) => setVerificationCode(e.target.value)}
                                className="w-full bg-[#1E1E1E] border border-[#333] rounded p-3 text-white focus:border-white focus:outline-none transition-colors text-center text-2xl tracking-widest font-mono"
                                placeholder="XXXXXX"
                                required
                            />
                        </div>
                        <Button type="submit" variant="primary" className="w-full py-3" disabled={loading}>
                            {loading ? 'Verifying...' : 'Verify Account'}
                        </Button>
                    </form>
                    <div className="mt-4 text-center">
                        <button
                            onClick={() => setShowVerification(false)}
                            className="text-gray-500 hover:text-white text-xs uppercase tracking-wider font-bold"
                        >
                            Back to Login
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a] relative overflow-hidden font-mono text-[#E0E0E0]">
            {/* Ambient Background Effects */}
            <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] bg-purple-900/10 rounded-full blur-[120px] pointer-events-none"></div>
            <div className="absolute bottom-[-20%] right-[-10%] w-[600px] h-[600px] bg-blue-900/10 rounded-full blur-[120px] pointer-events-none"></div>

            <div className="w-full max-w-md p-6 relative z-10 animate-fade-in-up">
                {/* Logo / Brand Area */}
                <div className="text-center mb-10">
                    <h1 className="text-4xl font-black text-white tracking-tighter mb-2">PolyThink</h1>
                    <p className="text-gray-500 text-xs font-bold uppercase tracking-[0.3em]">Studio Access</p>
                </div>

                {/* Main Card */}
                <div className="bg-[#121212]/80 backdrop-blur-xl border border-[#333] rounded-2xl shadow-2xl p-8">
                    {error && (
                        <div className="mb-6 p-3 bg-red-500/10 border border-red-500/20 text-red-200 text-xs font-bold rounded flex items-center gap-2">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                            {error}
                        </div>
                    )}
                    {success && (
                        <div className="mb-6 p-3 bg-green-500/10 border border-green-500/20 text-green-200 text-xs font-bold rounded flex items-center gap-2">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
                            {success}
                        </div>
                    )}

                    {!isRegistering ? (
                        // --- LOGIN VIEW ---
                        loginStep === 1 ? (
                            <form onSubmit={handleRequestLoginOtp} className="space-y-6">
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Email Address</label>
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="block w-full px-4 py-3 bg-[#1E1E1E] border border-[#333] rounded-lg text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-white/20 focus:border-white transition-all duration-200 sm:text-sm"
                                        placeholder="you@polydevs.uk"
                                        required
                                    />
                                </div>
                                <Button type="submit" variant="primary" className="w-full py-3.5 text-sm uppercase tracking-wider" disabled={loading}>
                                    {loading ? 'Sending Code...' : 'Get Login Code'}
                                </Button>
                                <div className="text-center pt-4">
                                    <button type="button" onClick={() => setIsRegistering(true)} className="text-xs text-gray-400 hover:text-white underline">
                                        Need an account? Register with Invite Code
                                    </button>
                                </div>
                            </form>
                        ) : (
                            <form onSubmit={handleVerifyLoginOtp} className="space-y-6">
                                <div className="text-center mb-4">
                                    <p className="text-sm text-gray-400">Code sent to <span className="text-white font-bold">{email}</span></p>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Login Code</label>
                                    <input
                                        type="text"
                                        value={loginOtp}
                                        onChange={(e) => setLoginOtp(e.target.value)}
                                        className="block w-full px-4 py-3 bg-[#1E1E1E] border border-[#333] rounded-lg text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-white/20 focus:border-white transition-all duration-200 sm:text-sm text-center text-xl tracking-widest font-mono"
                                        placeholder="XXXXXX"
                                        required
                                    />
                                </div>
                                <Button type="submit" variant="primary" className="w-full py-3.5 text-sm uppercase tracking-wider" disabled={loading}>
                                    {loading ? 'Verifying...' : 'Sign In'}
                                </Button>
                                <div className="text-center pt-2">
                                    <button type="button" onClick={() => setLoginStep(1)} className="text-xs text-gray-400 hover:text-white underline">
                                        Back to Email
                                    </button>
                                </div>
                            </form>
                        )
                    ) : (
                        // --- REGISTER VIEW ---
                        <form onSubmit={handleRegister} className="space-y-4">
                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Invitation Code</label>
                                <input
                                    type="text"
                                    value={registerData.invitation_code}
                                    onChange={(e) => setRegisterData({ ...registerData, invitation_code: e.target.value })}
                                    className="block w-full px-4 py-2 bg-[#1E1E1E] border border-[#333] rounded-lg text-white focus:outline-none focus:border-white text-sm"
                                    placeholder="Enter invite code"
                                    required
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Full Name</label>
                                    <input
                                        type="text"
                                        value={registerData.full_name}
                                        onChange={(e) => setRegisterData({ ...registerData, full_name: e.target.value })}
                                        className="block w-full px-4 py-2 bg-[#1E1E1E] border border-[#333] rounded-lg text-white focus:outline-none focus:border-white text-sm"
                                        placeholder="John Doe"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Username</label>
                                    <input
                                        type="text"
                                        value={registerData.username}
                                        onChange={(e) => setRegisterData({ ...registerData, username: e.target.value })}
                                        className="block w-full px-4 py-2 bg-[#1E1E1E] border border-[#333] rounded-lg text-white focus:outline-none focus:border-white text-sm"
                                        placeholder="johndoe"
                                        required
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Email (polydevs.uk only)</label>
                                <input
                                    type="email"
                                    value={registerData.email}
                                    onChange={(e) => setRegisterData({ ...registerData, email: e.target.value })}
                                    className="block w-full px-4 py-2 bg-[#1E1E1E] border border-[#333] rounded-lg text-white focus:outline-none focus:border-white text-sm"
                                    placeholder="you@polydevs.uk"
                                    required
                                />
                            </div>

                            <Button type="submit" variant="success" className="w-full py-3 text-sm uppercase tracking-wider" disabled={loading}>
                                {loading ? 'Registering...' : 'Register'}
                            </Button>
                            <div className="text-center pt-2">
                                <button type="button" onClick={() => setIsRegistering(false)} className="text-xs text-gray-400 hover:text-white underline">
                                    Back to Login
                                </button>
                            </div>
                        </form>
                    )}
                </div>

                <div className="text-center mt-8 space-y-2">
                    <p className="text-[#333] text-[10px] uppercase tracking-widest font-bold">
                        Secure Environment v2.0
                    </p>
                </div>
            </div>
        </div>
    );
};

export default Login;
