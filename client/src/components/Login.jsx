import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, User, Shield, Eye, EyeOff, Mail, Key, Loader } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Helmet } from 'react-helmet-async';
import { API_URL } from '../config';

const Login = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [email, setEmail] = useState('');
    const [otp, setOtp] = useState('');

    // Steps: 'login', 'email', 'otp'
    const [step, setStep] = useState('login');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [tempToken, setTempToken] = useState(null);
    const [tempUser, setTempUser] = useState(null);
    const [isLoading, setIsLoading] = useState(false);

    const navigate = useNavigate();

    const handleLogin = async (e) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);
        try {
            if (username && password) {
                const res = await axios.post(`${API_URL}/api/auth/login`, { username, password });

                if (res.data.user.isVerified === true) {
                    localStorage.setItem('token', res.data.token);
                    localStorage.setItem('user', JSON.stringify(res.data.user));
                    navigate('/dashboard');
                } else {
                    // Start Verification Flow
                    setTempToken(res.data.token);
                    setTempUser(res.data.user);
                    setStep('email');
                }
            } else {
                setError('Please enter valid credentials');
            }
        } catch (err) {
            if (!err.response) {
                setError('Network Error: Server unreachable. Please try again later.');
            } else {
                setError(err.response.data.message || 'Invalid username or password');
            }
        } finally {
            setIsLoading(false);
        }
    };

    const handleSendOtp = async (e) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);
        try {
            if (!email.includes('@')) {
                setError('Please enter a valid email address');
                return;
            }
            await axios.post(`${API_URL}/api/auth/send-otp`, { username, email });
            setStep('otp');
        } catch (err) {
            if (!err.response) {
                setError('Network Error: Server unreachable.');
            } else {
                setError(err.response.data.message || 'Error sending OTP');
            }
        } finally {
            setIsLoading(false);
        }
    };

    const handleVerifyOtp = async (e) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);
        try {
            await axios.post(`${API_URL}/api/auth/verify-otp`, { username, email, otp });

            // Success! Save token and login
            localStorage.setItem('token', tempToken);
            // Update user object with isVerified = true
            const updatedUser = { ...tempUser, isVerified: true, email };
            localStorage.setItem('user', JSON.stringify(updatedUser));
            navigate('/dashboard');
        } catch (err) {
            if (!err.response) {
                setError('Network Error: Server unreachable.');
            } else {
                setError(err.response.data.message || 'Invalid OTP');
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex items-center justify-center min-h-[100dvh] bg-slate-950 overflow-hidden relative font-sans p-4">
            <Helmet>
                <title>Login | Escrawl Secure Connect</title>
                <meta name="description" content="Securely log in to your Escrawl Connect workspace. Private and encrypted communication platform." />
            </Helmet>

            {/* Background Elements */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-teal-900/20 via-slate-950 to-slate-950"></div>
            <motion.div
                animate={{ opacity: [0.3, 0.5, 0.3] }}
                transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
                className="absolute top-[-20%] right-[-10%] w-[800px] h-[800px] bg-teal-600/10 rounded-full blur-3xl"
            />
            <motion.div
                animate={{ opacity: [0.2, 0.4, 0.2] }}
                transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
                className="absolute bottom-[-20%] left-[-10%] w-[600px] h-[600px] bg-emerald-600/10 rounded-full blur-3xl"
            />

            <AnimatePresence mode='wait'>
                <motion.div
                    key={step}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.3 }}
                    className="relative z-10 w-full max-w-md p-6 md:p-10 bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-2xl shadow-2xl"
                >
                    <div className="text-center mb-10">
                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-teal-500 to-emerald-600 mb-4 shadow-lg shadow-teal-500/20">
                            {step === 'login' && <Shield className="w-8 h-8 text-white" />}
                            {step === 'email' && <Mail className="w-8 h-8 text-white" />}
                            {step === 'otp' && <Key className="w-8 h-8 text-white" />}
                        </div>
                        <h1 className="text-2xl md:text-3xl font-bold text-white mb-2 tracking-tight">
                            {step === 'login' && 'Welcome Back'}
                            {step === 'email' && 'Verify Email'}
                            {step === 'otp' && 'Enter OTP'}
                        </h1>
                        <p className="text-slate-400">
                            {step === 'login' && 'Sign in to your secure workspace'}
                            {step === 'email' && 'Please verify your email address to continue'}
                            {step === 'otp' && `Enter the code sent to ${email}`}
                        </p>
                    </div>

                    {error && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            className="mb-6 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm text-center font-medium"
                        >
                            {error}
                        </motion.div>
                    )}

                    {step === 'login' && (
                        <form onSubmit={handleLogin} className="space-y-6">
                            <div className="space-y-1">
                                <label className="text-xs font-medium text-slate-400 ml-1 uppercase tracking-wider">Username</label>
                                <div className="relative group">
                                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-500 w-5 h-5 group-focus-within:text-teal-400 transition-colors" />
                                    <input
                                        type="text"
                                        placeholder="Enter your username"
                                        value={username}
                                        onChange={(e) => setUsername(e.target.value)}
                                        className="w-full pl-10 pr-4 py-3 bg-slate-950 border border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500 text-white placeholder-slate-600 transition-all duration-200 text-base"
                                    />
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label className="text-xs font-medium text-slate-400 ml-1 uppercase tracking-wider">Password</label>
                                <div className="relative group">
                                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-500 w-5 h-5 group-focus-within:text-teal-400 transition-colors" />
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        placeholder="Enter your password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="w-full pl-10 pr-12 py-3 bg-slate-950 border border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500 text-white placeholder-slate-600 transition-all duration-200 text-base"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-500 hover:text-white transition-colors focus:outline-none"
                                    >
                                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                    </button>
                                </div>
                            </div>

                            <motion.button
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                type="submit"
                                className={`w-full py-3.5 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 rounded-xl font-bold text-white shadow-lg shadow-teal-500/20 transition-all duration-300 flex items-center justify-center ${isLoading ? 'opacity-80 cursor-wait' : ''}`}
                                disabled={isLoading}
                            >
                                {isLoading ? (
                                    <>
                                        <Loader className="w-5 h-5 animate-spin mr-2" />
                                        Signing In...
                                    </>
                                ) : (
                                    'Sign In'
                                )}
                            </motion.button>
                        </form>
                    )}

                    {step === 'email' && (
                        <form onSubmit={handleSendOtp} className="space-y-6">
                            <div className="space-y-1">
                                <label className="text-xs font-medium text-slate-400 ml-1 uppercase tracking-wider">Email Address</label>
                                <div className="relative group">
                                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-500 w-5 h-5 group-focus-within:text-teal-400 transition-colors" />
                                    <input
                                        type="email"
                                        placeholder="Enter your email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="w-full pl-10 pr-4 py-3 bg-slate-950 border border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500 text-white placeholder-slate-600 transition-all duration-200"
                                        required
                                    />
                                </div>
                            </div>
                            <motion.button
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                type="submit"
                                className={`w-full py-3.5 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 rounded-xl font-bold text-white shadow-lg shadow-teal-500/20 transition-all duration-300 flex items-center justify-center ${isLoading ? 'opacity-80 cursor-wait' : ''}`}
                                disabled={isLoading}
                            >
                                {isLoading ? (
                                    <>
                                        <Loader className="w-5 h-5 animate-spin mr-2" />
                                        Sending OTP...
                                    </>
                                ) : (
                                    'Send OTP'
                                )}
                            </motion.button>
                        </form>
                    )}

                    {step === 'otp' && (
                        <form onSubmit={handleVerifyOtp} className="space-y-6">
                            <div className="space-y-1">
                                <label className="text-xs font-medium text-slate-400 ml-1 uppercase tracking-wider">One-Time Password</label>
                                <div className="relative group">
                                    <Key className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-500 w-5 h-5 group-focus-within:text-teal-400 transition-colors" />
                                    <input
                                        type="text"
                                        placeholder="Enter 6-digit OTP"
                                        value={otp}
                                        onChange={(e) => setOtp(e.target.value)}
                                        className="w-full pl-10 pr-4 py-3 bg-slate-950 border border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500 text-white placeholder-slate-600 transition-all duration-200"
                                        maxLength={6}
                                        required
                                    />
                                </div>
                            </div>
                            <motion.button
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                type="submit"
                                className={`w-full py-3.5 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 rounded-xl font-bold text-white shadow-lg shadow-teal-500/20 transition-all duration-300 flex items-center justify-center ${isLoading ? 'opacity-80 cursor-wait' : ''}`}
                                disabled={isLoading}
                            >
                                {isLoading ? (
                                    <>
                                        <Loader className="w-5 h-5 animate-spin mr-2" />
                                        Verifying...
                                    </>
                                ) : (
                                    'Verify & Sign In'
                                )}
                            </motion.button>
                            <button
                                type="button"
                                onClick={() => setStep('email')}
                                className="w-full text-slate-500 hover:text-white text-sm"
                            >
                                Use a different email
                            </button>
                        </form>
                    )}

                    {step === 'login' && (
                        <div className="mt-8 text-center text-sm text-slate-500">
                            <p>Protected by end-to-end encryption</p>
                        </div>
                    )}
                </motion.div>
            </AnimatePresence>
        </div>
    );
};

export default Login;
