import { useState, useEffect } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Shield, Trash2, Plus, X, Search, CheckCircle } from 'lucide-react';
import { API_URL } from '../config';

const AdminPanel = () => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [showAddModal, setShowAddModal] = useState(false);
    const [newUser, setNewUser] = useState({ username: '', password: '', role: 'user' });
    const [notification, setNotification] = useState(null);

    const fetchUsers = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get(`${API_URL}/api/users`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setUsers(res.data);
        } catch (err) {
            console.error('Error fetching users', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    const handleDelete = async (id) => {
        if (window.confirm('Are you sure you want to delete this user?')) {
            try {
                const token = localStorage.getItem('token');
                await axios.delete(`${API_URL}/api/users/${id}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setUsers(users.filter(u => u._id !== id));
                showNotification('User deleted successfully', 'success');
            } catch (err) {
                showNotification('Failed to delete user', 'error');
            }
        }
    };

    const handleAddUser = async (e) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem('token');
            await axios.post(`${API_URL}/api/users`, newUser, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setShowAddModal(false);
            setNewUser({ username: '', password: '', role: 'user' });
            fetchUsers();
            showNotification('User created successfully', 'success');
        } catch (err) {
            showNotification('Failed to create user', 'error');
        }
    };

    const showNotification = (message, type) => {
        setNotification({ message, type });
        setTimeout(() => setNotification(null), 3000);
    };

    const filteredUsers = users.filter(user =>
        user.username.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="p-8 relative overflow-hidden">
            {/* Background decoration */}
            <div className="absolute top-0 right-0 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl -z-10" />
            <div className="absolute bottom-0 left-0 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl -z-10" />

            {/* Notification */}
            <AnimatePresence>
                {notification && (
                    <motion.div
                        initial={{ opacity: 0, y: -50 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -50 }}
                        className={`fixed top-4 right-4 z-50 px-6 py-3 rounded-xl shadow-2xl flex items-center space-x-2 ${notification.type === 'success' ? 'bg-green-500/90' : 'bg-red-500/90'
                            } backdrop-blur-md`}
                    >
                        {notification.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <X className="w-5 h-5" />}
                        <span className="font-medium">{notification.message}</span>
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="max-w-6xl mx-auto">
                <header className="flex justify-between items-center mb-10">
                    <div>
                        <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-teal-400 to-emerald-400">Admin Panel</h1>
                        <p className="text-slate-400 mt-2">Manage users and permissions securely</p>
                    </div>
                    <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setShowAddModal(true)}
                        className="flex items-center space-x-2 px-6 py-3 bg-teal-600 rounded-xl hover:bg-teal-700 transition shadow-lg shadow-teal-500/30 text-white"
                    >
                        <Plus className="w-5 h-5" />
                        <span className="font-semibold">Add User</span>
                    </motion.button>
                </header>

                {/* Filters */}
                <div className="mb-8 flex items-center space-x-4 bg-slate-800/50 p-2 rounded-xl border border-slate-700 backdrop-blur-sm w-full max-w-md">
                    <Search className="w-5 h-5 text-slate-400 ml-2" />
                    <input
                        type="text"
                        placeholder="Search users..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="bg-transparent border-none outline-none text-white placeholder-slate-400 flex-1 px-2"
                    />
                </div>
            </div>

            {/* Users Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <AnimatePresence>
                    {loading ? (
                        <div className="col-span-full text-center py-20">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-500 mx-auto mb-4"></div>
                            <p className="text-slate-400">Loading users...</p>
                        </div>
                    ) : (
                        filteredUsers.map((user) => (
                            <motion.div
                                key={user._id}
                                layout
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.9 }}
                                className="bg-slate-800/40 backdrop-blur-md border border-slate-700/50 rounded-2xl p-6 group hover:border-teal-500/50 transition-all duration-300 relative overflow-hidden"
                            >
                                <div className="absolute inset-0 bg-gradient-to-br from-teal-600/5 to-emerald-600/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                                <div className="flex justify-between items-start mb-4 relative z-10 index-10">
                                    <div className="w-12 h-12 rounded-full bg-slate-700/50 flex items-center justify-center text-teal-400 font-bold text-xl uppercase">
                                        {user.username[0]}
                                    </div>
                                    {user.role === 'admin' && (
                                        <span className="px-3 py-1 bg-emerald-500/20 text-emerald-300 text-xs font-bold rounded-full border border-emerald-500/30 flex items-center gap-1">
                                            <Shield className="w-3 h-3" /> Admin
                                        </span>
                                    )}
                                </div>

                                <h3 className="text-xl font-bold text-white mb-1 relative z-10">{user.username}</h3>
                                <p className="text-slate-400 text-sm mb-2 relative z-10">ID: {user._id.slice(-6)}</p>

                                <div className="mb-4 relative z-10">
                                    {user.email ? (
                                        <span className="flex items-center gap-1.5 text-teal-400 text-xs font-medium bg-teal-500/10 px-2 py-1 rounded-md border border-teal-500/20 w-fit">
                                            <CheckCircle className="w-3 h-3" /> {user.email}
                                        </span>
                                    ) : (
                                        <span className="flex items-center gap-1.5 text-amber-400 text-xs font-medium bg-amber-500/10 px-2 py-1 rounded-md border border-amber-500/20 w-fit">
                                            <Shield className="w-3 h-3" /> Verification Pending
                                        </span>
                                    )}
                                </div>

                                <div className="flex justify-between items-center pt-4 border-t border-slate-700/50 relative z-10">
                                    <span className="text-slate-500 text-xs">
                                        {user.isVerified ? 'Verified Account' : 'Action Required'}
                                    </span>
                                    {/* Prevent deleting Super Admin OR self */}
                                    {user.username !== 'vikash@escrawl' && (
                                        <button
                                            onClick={() => handleDelete(user._id)}
                                            className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors group-hover:text-red-300"
                                            title="Delete User"
                                        >
                                            <Trash2 className="w-5 h-5" />
                                        </button>
                                    )}
                                </div>
                            </motion.div>
                        ))
                    )}
                </AnimatePresence>
            </div>

            {/* Add User Modal */}
            <AnimatePresence>
                {showAddModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            className="bg-slate-900 border border-slate-700 rounded-2xl p-8 max-w-md w-full shadow-2xl relative"
                        >
                            <button
                                onClick={() => setShowAddModal(false)}
                                className="absolute top-4 right-4 text-slate-400 hover:text-white"
                            >
                                <X className="w-6 h-6" />
                            </button>

                            <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                                <User className="w-6 h-6 text-teal-500" />
                                Create New User
                            </h2>

                            <form onSubmit={handleAddUser} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-1">Username</label>
                                    <input
                                        type="text"
                                        required
                                        value={newUser.username}
                                        onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
                                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 focus:ring-2 focus:ring-teal-500 outline-none transition text-white"
                                        placeholder="Enter username"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-1">Password</label>
                                    <input
                                        type="password"
                                        required
                                        value={newUser.password}
                                        onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 focus:ring-2 focus:ring-teal-500 outline-none transition text-white"
                                        placeholder="Enter secure password"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-1">Role</label>
                                    <select
                                        value={newUser.role}
                                        onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 focus:ring-2 focus:ring-teal-500 outline-none transition text-white"
                                    >
                                        <option value="user">User</option>
                                        <option value="admin">Admin</option>
                                    </select>
                                </div>

                                <button
                                    type="submit"
                                    className="w-full bg-teal-600 hover:bg-teal-700 text-white font-bold py-3 rounded-xl transition shadow-lg shadow-teal-500/20 mt-4"
                                >
                                    Create User
                                </button>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default AdminPanel;
