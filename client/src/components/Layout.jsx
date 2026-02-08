import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Home, MessageSquare, Video, Settings, LogOut, Menu, X, User } from 'lucide-react';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const SidebarItem = ({ icon: Icon, label, path, active, onClick }) => (
    <Link to={path} onClick={onClick}>
        <motion.div
            whileHover={{ scale: 1.02, x: 5 }}
            whileTap={{ scale: 0.98 }}
            className={`flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 ${active
                    ? 'bg-blue-600 shadow-lg shadow-blue-500/30 text-white'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                }`}
        >
            <Icon className="w-5 h-5" />
            <span className="font-medium">{label}</span>
        </motion.div>
    </Link>
);

const Layout = ({ children }) => {
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const location = useLocation();
    const navigate = useNavigate();
    const user = JSON.parse(localStorage.getItem('user') || '{}');

    const handleLogout = () => {
        if (window.confirm('Are you sure you want to log out?')) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            navigate('/');
        }
    };

    const navItems = [
        { icon: Home, label: 'Dashboard', path: '/dashboard' },
        { icon: MessageSquare, label: 'Chat', path: '/chat' },
        { icon: Video, label: 'Video Call', path: '/video' },
    ];

    if (user.role === 'admin') {
        navItems.push({ icon: Settings, label: 'Admin Panel', path: '/admin' });
    }

    return (
        <div className="min-h-screen bg-slate-900 text-white flex">
            {/* Mobile Menu Overlay */}
            <AnimatePresence>
                {isMobileMenuOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setIsMobileMenuOpen(false)}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden"
                    />
                )}
            </AnimatePresence>

            {/* Sidebar Navigation */}
            <motion.aside
                className={`fixed md:static inset-y-0 left-0 z-50 w-64 bg-slate-800/50 backdrop-blur-xl border-r border-slate-700/50 transform ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
                    } md:translate-x-0 transition-transform duration-300 ease-in-out flex flex-col`}
            >
                <div className="p-6 flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                            <span className="font-bold text-lg">E</span>
                        </div>
                        <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-400">Escrawl</h1>
                    </div>
                    <button onClick={() => setIsMobileMenuOpen(false)} className="md:hidden text-slate-400 hover:text-white">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <nav className="flex-1 px-4 py-4 space-y-2 overflow-y-auto">
                    {navItems.map((item) => (
                        <SidebarItem
                            key={item.path}
                            icon={item.icon}
                            label={item.label}
                            path={item.path}
                            active={location.pathname === item.path}
                            onClick={() => setIsMobileMenuOpen(false)}
                        />
                    ))}
                </nav>

                <div className="p-4 border-t border-slate-700/50">
                    <Link to="/dashboard">
                        <div className="flex items-center space-x-3 px-4 py-3 mb-2 rounded-xl bg-slate-800/80 border border-slate-700/50">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-xs font-bold text-white shadow-inner">
                                {user.username ? user.username[0].toUpperCase() : <User className="w-4 h-4" />}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">{user.username || 'Guest'}</p>
                                <p className="text-xs text-slate-400 truncate capitalize">{user.role || 'Visitor'}</p>
                            </div>
                        </div>
                    </Link>

                    <button
                        onClick={handleLogout}
                        className="w-full flex items-center space-x-3 px-4 py-2 text-red-400 hover:bg-red-500/10 hover:text-red-300 rounded-lg transition"
                    >
                        <LogOut className="w-5 h-5" />
                        <span className="font-medium">Sign Out</span>
                    </button>
                </div>
            </motion.aside>

            {/* Mobile Header */}
            <div className="md:hidden fixed top-0 left-0 right-0 z-30 bg-slate-900/80 backdrop-blur-md border-b border-slate-800 p-4 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                    <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                        <span className="font-bold text-sm">E</span>
                    </div>
                    <span className="font-bold text-lg">Escrawl</span>
                </div>
                <button onClick={() => setIsMobileMenuOpen(true)} className="text-white p-2">
                    <Menu className="w-6 h-6" />
                </button>
            </div>

            {/* Main Content Area */}
            <main className="flex-1 overflow-x-hidden overflow-y-auto bg-slate-900 relative pt-16 md:pt-0">
                {children}
            </main>
        </div>
    );
};

export default Layout;
