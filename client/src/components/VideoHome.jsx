import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Video, Keyboard, Plus, Copy, Link as LinkIcon, Users, Shield, Zap } from 'lucide-react';
import { motion } from 'framer-motion';

const VideoHome = () => {
    const navigate = useNavigate();
    const [joinCode, setJoinCode] = useState('');

    const startNewMeeting = () => {
        const randomId = Math.random().toString(36).substring(2, 8) + '-' + Math.random().toString(36).substring(2, 8);
        navigate(`/video/${randomId}`);
    };

    const joinMeeting = (e) => {
        e.preventDefault();
        if (joinCode.trim()) {
            navigate(`/video/${joinCode}`);
        }
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-[85vh] text-center p-6 bg-slate-900 overflow-hidden relative">
            {/* Background Decorations */}
            <div className="absolute top-0 left-0 w-96 h-96 bg-teal-600/10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2"></div>
            <div className="absolute bottom-0 right-0 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl translate-x-1/2 translate-y-1/2"></div>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                className="max-w-6xl w-full grid lg:grid-cols-2 gap-16 items-center z-10"
            >
                {/* Left Side: Actions */}
                <div className="text-left space-y-10">
                    <div className="space-y-4">
                        <motion.div
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.2 }}
                            className="inline-flex items-center space-x-2 bg-slate-800/50 border border-slate-700/50 rounded-full px-4 py-1.5 text-sm text-slate-300 backdrop-blur-sm"
                        >
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-teal-500"></span>
                            </span>
                            <span>Secure, crystal-clear connections</span>
                        </motion.div>

                        <h1 className="text-5xl md:text-6xl font-extrabold leading-tight tracking-tight text-white">
                            Video calls for <br />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-blue-500">everyone.</span>
                        </h1>
                        <p className="text-slate-400 text-lg md:text-xl max-w-lg leading-relaxed">
                            Connect, collaborate, and celebrate from anywhere with Escrawl Connect. High-quality video meetings available for free.
                        </p>
                    </div>

                    <div className="flex flex-col sm:flex-row items-center space-y-4 sm:space-y-0 sm:space-x-4">
                        <button
                            onClick={startNewMeeting}
                            className="group flex items-center space-x-3 bg-teal-600 hover:bg-teal-500 text-white px-8 py-4 rounded-xl font-semibold text-lg transition-all shadow-xl shadow-teal-500/20 transform hover:-translate-y-1 ring-1 ring-white/10"
                        >
                            <Video className="w-6 h-6 group-hover:scale-110 transition-transform" />
                            <span>New Meeting</span>
                        </button>

                        <form onSubmit={joinMeeting} className="flex items-center space-x-2 w-full sm:w-auto">
                            <div className="relative flex-1 sm:w-72 group">
                                <Keyboard className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-500 group-focus-within:text-teal-500 transition-colors w-5 h-5" />
                                <input
                                    type="text"
                                    placeholder="Enter a code or link"
                                    value={joinCode}
                                    onChange={(e) => setJoinCode(e.target.value)}
                                    className="w-full bg-slate-800 border border-slate-700 text-white pl-12 pr-4 py-4 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none transition-all placeholder:text-slate-500"
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={!joinCode.trim()}
                                className="text-teal-400 font-semibold hover:text-teal-300 disabled:opacity-50 disabled:cursor-not-allowed px-6 py-3 hover:bg-slate-800/50 rounded-xl transition-all"
                            >
                                Join
                            </button>
                        </form>
                    </div>

                    <div className="pt-8 border-t border-slate-800/60 grid grid-cols-3 gap-6">
                        <div className="text-center sm:text-left">
                            <div className="bg-slate-800/50 w-10 h-10 rounded-lg flex items-center justify-center mb-3">
                                <Users className="w-5 h-5 text-blue-400" />
                            </div>
                            <h3 className="font-semibold text-white">Unlimited Users</h3>
                        </div>
                        <div className="text-center sm:text-left">
                            <div className="bg-slate-800/50 w-10 h-10 rounded-lg flex items-center justify-center mb-3">
                                <Shield className="w-5 h-5 text-teal-400" />
                            </div>
                            <h3 className="font-semibold text-white">Secure Encrypted</h3>
                        </div>
                        <div className="text-center sm:text-left">
                            <div className="bg-slate-800/50 w-10 h-10 rounded-lg flex items-center justify-center mb-3">
                                <Zap className="w-5 h-5 text-yellow-400" />
                            </div>
                            <h3 className="font-semibold text-white">Fast & Reliable</h3>
                        </div>
                    </div>
                </div>

                {/* Right Side: Showcase */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.3 }}
                    className="relative hidden lg:block"
                >
                    <div className="absolute -inset-1 bg-gradient-to-tr from-teal-500 via-purple-500 to-blue-500 rounded-3xl blur-lg opacity-40 animate-pulse"></div>
                    <div className="relative bg-slate-900 rounded-3xl border border-slate-800 p-6 shadow-2xl">
                        {/* Header Mockup */}
                        <div className="flex items-center justify-between mb-6 border-b border-slate-800 pb-4">
                            <div className="flex space-x-2">
                                <div className="w-3 h-3 rounded-full bg-red-500/50"></div>
                                <div className="w-3 h-3 rounded-full bg-yellow-500/50"></div>
                                <div className="w-3 h-3 rounded-full bg-green-500/50"></div>
                            </div>
                            <div className="h-2 w-32 bg-slate-800 rounded-full"></div>
                        </div>

                        {/* Video Grid Mockup */}
                        <div className="grid grid-cols-2 gap-4">
                            {[1, 2, 3, 4].map((i) => (
                                <div key={i} className="bg-slate-800 rounded-2xl aspect-video flex items-center justify-center relative overflow-hidden group">
                                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-slate-700 to-slate-600 flex items-center justify-center text-slate-400 text-sm font-bold shadow-inner">
                                        {['JD', 'AS', 'MK', 'LR'][i - 1]}
                                    </div>
                                    <div className="absolute bottom-3 left-3 w-2.5 h-2.5 rounded-full bg-green-500 border-2 border-slate-800"></div>
                                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-all cursor-pointer"></div>

                                    {/* Audio Wave Animation Mockup */}
                                    {i === 1 && (
                                        <div className="absolute top-3 right-3 flex space-x-0.5">
                                            <div className="w-1 h-3 bg-teal-500 rounded-full animate-bounce"></div>
                                            <div className="w-1 h-4 bg-teal-500 rounded-full animate-bounce delay-75"></div>
                                            <div className="w-1 h-2 bg-teal-500 rounded-full animate-bounce delay-150"></div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>

                        {/* Controls Mockup */}
                        <div className="flex justify-center mt-8 space-x-6">
                            <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 hover:bg-slate-700 transition-colors"><span className="w-5 h-5 border-2 border-current rounded-full opacity-50"></span></div>
                            <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 hover:bg-slate-700 transition-colors"><Video className="w-5 h-5" /></div>
                            <div className="w-14 h-14 rounded-full bg-red-500 flex items-center justify-center text-white shadow-lg shadow-red-500/30 hover:bg-red-600 transition-colors transform hover:scale-110"><Plus className="w-6 h-6 rotate-45" /></div>
                            <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 hover:bg-slate-700 transition-colors"><Users className="w-5 h-5" /></div>
                        </div>
                    </div>
                </motion.div>
            </motion.div>
        </div>
    );
};

export default VideoHome;
