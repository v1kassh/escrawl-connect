import { useState, useEffect, useRef } from 'react';
import { Send, FileText, User, Smile, Image as ImageIcon, X, Plus, Hash, Volume2, Shield, Settings, Check, CheckCheck, AlertCircle, Info, Loader, UserPlus, Trash2, UserMinus, ArrowDown, Calendar, Menu, ArrowLeft, LayoutDashboard, LogOut, AlertTriangle, Lock } from 'lucide-react';
import { io } from 'socket.io-client';
import axios from 'axios';
import EmojiPicker from 'emoji-picker-react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { API_URL } from '../config';

const socket = io(API_URL, {
    transports: ['websocket', 'polling'],
    reconnectionattempts: 5,
    reconnectiondelay: 1000,
    auth: (cb) => {
        const token = localStorage.getItem('token');
        cb({ token });
    }
});

const Chat = () => {
    const navigate = useNavigate();
    const [message, setMessage] = useState('');
    const [messages, setMessages] = useState([]);
    const [typingUsers, setTypingUsers] = useState([]);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);

    // Super Admin: User Creation State
    const [showCreateUser, setShowCreateUser] = useState(false);
    const [newUserData, setNewUserData] = useState({ username: '', password: '', role: 'user' });

    // Channel States
    const [channels, setChannels] = useState([]);
    const [currentChannel, setCurrentChannel] = useState(null);
    const [showCreateChannel, setShowCreateChannel] = useState(false);
    const [newChannelData, setNewChannelData] = useState({ name: '', type: 'public', description: '', members: [] });
    const [verifiedUsers, setVerifiedUsers] = useState([]); // List of users to add

    // Manage Channel State
    const [showManageChannel, setShowManageChannel] = useState(false);
    const [manageChannelData, setManageChannelData] = useState({ name: '', description: '', allowedRoles: [], postingRoles: [] });

    // UI States
    const [isLoading, setIsLoading] = useState(false);
    const [toasts, setToasts] = useState([]);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false); // Mobile sidebar toggle
    const [unreadCounts, setUnreadCounts] = useState({}); // Stores unread messages per channel
    const [selectedMessage, setSelectedMessage] = useState(null); // Message Info Modal
    const [activeMessageId, setActiveMessageId] = useState(null); // Mobile: Tap to show actions
    const [confirmDialog, setConfirmDialog] = useState({
        isOpen: false,
        title: '',
        message: '',
        confirmText: 'Confirm',
        cancelText: 'Cancel',
        type: 'danger',
        onConfirm: null
    });

    const addToast = (message, type = 'info') => {
        const id = Date.now();
        setToasts(prev => [...prev, { id, message, type }]);
        setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3000);
    };

    const messagesEndRef = useRef(null);
    const fileInputRef = useRef(null);
    const typingTimeoutRef = useRef(null);

    const [user, setUser] = useState(JSON.parse(localStorage.getItem('user') || '{}'));
    const token = localStorage.getItem('token');

    // Refresh user profile on mount to get latest role
    useEffect(() => {
        if (!token) return;
        axios.get(`${API_URL}/api/auth/me`, {
            headers: { Authorization: `Bearer ${token}` }
        })
            .then(res => {
                const updatedUser = res.data;
                // Merge with existing to keep token or other client-side fields if any, generally backend is source of truth
                const newState = { ...user, ...updatedUser };
                setUser(newState);
                localStorage.setItem('user', JSON.stringify(newState)); // Update local storage too
                // Debugging: Notify user of their detected role
                console.log('User Role Updated:', newState.role);
                addToast(`Role detected: ${newState.role}`, 'info');
            })
            .catch(err => console.error('Failed to refresh user profile', err));
    }, [token]);

    const isAdmin = user.role === 'admin' || user.role === 'super_admin';
    const isSuperAdmin = user.role === 'super_admin';

    // Socket Listeners for Updates & System Reset
    useEffect(() => {
        const handleChannelUpdate = (updatedChannel) => {
            // Check if current user is still authorized (Robust ID check)
            const userId = user._id || user.userId || user.id;
            const isMember = (userId && updatedChannel.members.some(m => String(m) === String(userId))) || user.role === 'super_admin';

            if (!isMember) {
                // Remove from list if previously present
                setChannels(prev => prev.filter(c => c._id !== updatedChannel._id));
                // If currently viewing this channel, kick them out
                if (currentChannel?._id === updatedChannel._id) {
                    addToast(`You have been removed from "${updatedChannel.name}"`, 'error');
                    setCurrentChannel(null); // Or switch to default
                }
            } else {
                // Add or Update in list
                setChannels(prev => {
                    const exists = prev.find(c => c._id === updatedChannel._id);
                    if (exists) {
                        return prev.map(c => c._id === updatedChannel._id ? updatedChannel : c);
                    }
                    // If not in list loop, add it (newly added member)
                    return [...prev, updatedChannel];
                });

                // If this is the current channel, update the view
                if (currentChannel?._id === updatedChannel._id) {
                    setCurrentChannel(updatedChannel);
                    addToast(`Channel "${updatedChannel.name}" updated`, 'info');
                }
            }
        };

        const handleSystemReset = () => {
            addToast('System has been reset by administrator', 'error');
            // Re-fetch channels
            axios.get(`${API_URL}/api/channels`, {
                headers: { Authorization: `Bearer ${token}` }
            }).then(res => {
                setChannels(res.data);
                if (res.data.length > 0) setCurrentChannel(res.data[0]);
            }).catch(err => console.error('Failed to refetch after reset', err));
        };

        const handleChannelDeleted = (channelId) => {
            setChannels(prev => prev.filter(c => c._id !== channelId));
            if (currentChannel?._id === channelId) {
                addToast('Current channel was deleted', 'error');
                // Switch to default/first available or empty
                axios.get(`${API_URL}/api/channels`, {
                    headers: { Authorization: `Bearer ${token}` }
                }).then(res => {
                    const available = res.data;
                    if (available.length > 0) setCurrentChannel(available[0]);
                    else setCurrentChannel(null);
                });
            } else {
                addToast('A channel was deleted', 'info');
            }
        };

        socket.on('channel-updated', handleChannelUpdate);
        socket.on('system-reset', handleSystemReset);
        socket.on('channel-deleted', handleChannelDeleted);

        return () => {
            socket.off('channel-updated', handleChannelUpdate);
            socket.off('system-reset', handleSystemReset);
            socket.off('channel-deleted', handleChannelDeleted);
        };
    }, [currentChannel?._id, token, user]); // Added user to dependencies to fix stale closure
    useEffect(() => {
        const fetchChannels = async () => {
            try {
                const res = await axios.get(`${API_URL}/api/channels`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setChannels(res.data);
                setChannels(res.data);
                // No auto-select, allow user to choose
                if (window.innerWidth < 1024) {
                    setIsSidebarOpen(true);
                }
            } catch (err) {
                console.error('Failed to fetch channels', err);
            }
        };
        fetchChannels();
    }, [token]);

    // Join all channels for notifications
    useEffect(() => {
        if (channels.length > 0 && user.username) {
            channels.forEach(channel => {
                socket.emit('join-room', channel.name, user);
            });
        }
    }, [channels, user]);

    useEffect(() => {
        if (!currentChannel) return;

        const roomId = currentChannel.name;
        // socket.emit('join-room', roomId, user); // Handled globally now

        const fetchMessages = async () => {
            try {
                const res = await axios.get(`${API_URL}/api/messages/${encodeURIComponent(roomId)}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setMessages(res.data);
                // Clear unreads for this channel
                setUnreadCounts(prev => {
                    const newCounts = { ...prev };
                    delete newCounts[roomId];
                    return newCounts;
                });
            } catch (err) {
                console.error('Failed to fetch messages', err);
            }
        };
        fetchMessages();

        const handleReceiveMessage = (data) => {
            if (data.roomId === currentChannel?.name) {
                setMessages((prev) => [...prev, data]);
            } else {
                // Increment unread count for other channels
                setUnreadCounts(prev => ({
                    ...prev,
                    [data.roomId]: (prev[data.roomId] || 0) + 1
                }));
                addToast(`New message in #${data.roomId}`, 'info');
            }
        };

        socket.on('receive-message', handleReceiveMessage);

        // Handle Read Receipts
        socket.on('messages-read', ({ roomId, readBy }) => {
            if (roomId === currentChannel?.name) {
                setMessages(prev => prev.map(msg =>
                    msg.user !== readBy ? { ...msg, status: 'read' } : msg
                ));
            }
        });

        socket.on('message-deleted', (messageId) => {
            setMessages((prev) => prev.filter(msg => msg._id !== messageId));
        });

        socket.on('typing', (username) => {
            setTypingUsers((prev) => {
                if (!prev.includes(username)) return [...prev, username];
                return prev;
            });
        });

        socket.on('stop-typing', (username) => {
            setTypingUsers((prev) => prev.filter((u) => u !== username));
        });

        // Auto-mark as read when viewing channel
        if (messages.some(m => m.user !== user.username && m.status !== 'read')) {
            socket.emit('mark-room-read', { roomId: currentChannel.name, username: user.username });
        }

        return () => {
            socket.off('receive-message', handleReceiveMessage);
            socket.off('messages-read');
            socket.off('message-deleted');
            socket.off('typing');
            socket.off('stop-typing');
            // Do NOT leave room, so we keep getting notifications
        };
    }, [currentChannel, token, user, messages]); // Added messages to deps to trigger mark-read

    const handleDeleteChannel = (e, channelId, channelName) => {
        e.stopPropagation();
        setConfirmDialog({
            isOpen: true,
            title: 'Delete Channel',
            message: `Are you sure you want to delete "${channelName}"? This action cannot be undone.`,
            type: 'danger',
            confirmText: 'Delete',
            onConfirm: async () => {
                try {
                    await axios.delete(`${API_URL}/api/channels/${channelId}`, {
                        headers: { Authorization: `Bearer ${token}` }
                    });
                    addToast(`Channel "${channelName}" deleted`, 'success');
                } catch (err) {
                    addToast(err.response?.data?.message || 'Failed to delete channel', 'error');
                }
            }
        });
    };

    const handleResetSystem = () => {
        setConfirmDialog({
            isOpen: true,
            title: 'System Reset',
            message: 'WARNING: This will delete ALL channels and reset the system to defaults. This cannot be undone.',
            type: 'danger',
            confirmText: 'Reset System',
            onConfirm: async () => {
                try {
                    await axios.delete(`${API_URL}/api/admin/reset-system`, {
                        headers: { Authorization: `Bearer ${token}` }
                    });
                } catch (err) {
                    addToast(err.response?.data?.message || 'Reset failed', 'error');
                }
            }
        });
    };

    const handleCreateUser = async (e) => {
        e.preventDefault();
        if (isLoading) return;
        setIsLoading(true);
        try {
            await axios.post(`${API_URL}/api/admin/users`, newUserData, {
                headers: { Authorization: `Bearer ${token}` }
            });
            addToast(`User ${newUserData.username} created successfully`, 'success');
            setShowCreateUser(false);
            setNewUserData({ username: '', password: '', role: 'user' });
        } catch (err) {
            addToast(err.response?.data?.message || 'Failed to create user', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const createChannel = async (e) => {
        e.preventDefault();
        if (isLoading) return;
        setIsLoading(true);
        try {
            // Need to check if user wants to fetch verified users first? 
            // Better to fetch when opening modal.
            const res = await axios.post(`${API_URL}/api/channels`, newChannelData, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setChannels([...channels, res.data]);
            setShowCreateChannel(false);
            setNewChannelData({ name: '', type: 'public', description: '', members: [] });
            addToast(`Channel "${res.data.name}" created successfully`, 'success');
        } catch (err) {
            addToast(err.response?.data?.message || 'Failed to create channel', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const fetchVerifiedUsers = async () => {
        try {
            const res = await axios.get(`${API_URL}/api/users/verified`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setVerifiedUsers(res.data);
        } catch (err) {
            console.error('Failed to fetch users', err);
        }
    };

    const handleUpdateChannel = async (e) => {
        e.preventDefault();
        if (isLoading) return;
        setIsLoading(true);
        try {
            const res = await axios.put(`${API_URL}/api/channels/${currentChannel._id}`, manageChannelData, {
                headers: { Authorization: `Bearer ${token}` }
            });
            // Update channels list locally
            setChannels(channels.map(c => c._id === currentChannel._id ? res.data : c));
            setCurrentChannel(res.data);
            setShowManageChannel(false);
            addToast(`Channel settings saved`, 'success');
        } catch (err) {
            addToast(err.response?.data?.message || 'Failed to update channel', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const openManageChannel = () => {
        // Fetch users to allow adding/removing
        fetchVerifiedUsers();
        setManageChannelData({
            name: currentChannel.name,
            description: currentChannel.description,
            allowedRoles: currentChannel.allowedRoles || ['user', 'admin'],
            postingRoles: currentChannel.postingRoles || ['user', 'admin'],
            members: currentChannel.members || []
        });
        setShowManageChannel(true);
    };

    const deleteMessage = (messageId) => {
        setConfirmDialog({
            isOpen: true,
            title: 'Delete Message',
            message: 'Are you sure you want to delete this message? This action is permanent.',
            type: 'danger',
            confirmText: 'Delete',
            onConfirm: async () => {
                try {
                    await axios.delete(`${API_URL}/api/messages/${messageId}`, {
                        headers: { Authorization: `Bearer ${token}` }
                    });
                    addToast('Message deleted', 'success');
                } catch (err) {
                    addToast('Failed to delete message', 'error');
                }
            }
        });
    };

    const handleLogout = () => {
        setConfirmDialog({
            isOpen: true,
            title: 'Sign Out',
            message: 'Are you sure you want to sign out?',
            type: 'warning',
            confirmText: 'Sign Out',
            onConfirm: () => {
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                navigate('/login');
            }
        });
    };

    const handleTyping = (e) => {
        setMessage(e.target.value);
        if (!currentChannel) return;

        socket.emit('typing', { roomId: currentChannel.name, username: user.username });

        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

        typingTimeoutRef.current = setTimeout(() => {
            socket.emit('stop-typing', { roomId: currentChannel.name, username: user.username });
        }, 1000);
    };

    const sendMessage = (e) => {
        e.preventDefault();
        if (message.trim() && currentChannel) {
            const msgData = {
                roomId: currentChannel.name,
                user: user.username || 'Anonymous',
                text: message,
                type: 'text'
            };

            socket.emit('send-message', msgData);
            socket.emit('stop-typing', { roomId: currentChannel.name, username: user.username });
            setMessage('');
            setShowEmojiPicker(false);
        }
    };

    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file || !currentChannel) return;

        const formData = new FormData();
        formData.append('file', file);

        try {
            const res = await axios.post(`${API_URL}/api/upload`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            const msgData = {
                roomId: currentChannel.name,
                user: user.username || 'Anonymous',
                text: `Shared a file: ${file.name}`,
                type: 'file',
                fileUrl: `${API_URL}${res.data.path}`,
                fileName: file.name
            };
            socket.emit('send-message', msgData);
        } catch (err) {
            console.error('File upload failed', err);
        }
    };

    const onEmojiClick = (emojiObject) => {
        setMessage((prev) => prev + emojiObject.emoji);
    };

    // Check if a file is an image
    const isImage = (fileName) => {
        return /\.(jpg|jpeg|png|gif|webp)$/i.test(fileName);
    };

    // Determine if input should be disabled
    const isInputDisabled = (currentChannel?.type === 'announcement' && !isAdmin) ||
        (currentChannel?.postingRoles && !currentChannel.postingRoles.includes('user') && !isAdmin);

    const [showScrollButton, setShowScrollButton] = useState(false);
    const chatContainerRef = useRef(null);

    // Smart Scroll Logic
    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        setShowScrollButton(false);
    };

    const handleScroll = () => {
        if (!chatContainerRef.current) return;
        const { scrollTop, scrollHeight, clientHeight } = chatContainerRef.current;
        const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
        setShowScrollButton(!isNearBottom);
    };

    useEffect(() => {
        // Auto-scroll only if near bottom or if new message is from me
        if (!chatContainerRef.current) return;

        const { scrollTop, scrollHeight, clientHeight } = chatContainerRef.current;
        const isNearBottom = scrollHeight - scrollTop - clientHeight < 150;
        const lastMessage = messages[messages.length - 1];
        const isMe = lastMessage?.user === user.username;

        if (isNearBottom || isMe) {
            scrollToBottom();
        }
    }, [messages, typingUsers]);

    // Esc Key Handler
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                if (selectedMessage) { setSelectedMessage(null); return; }
                if (showCreateChannel) { setShowCreateChannel(false); return; }
                if (showManageChannel) { setShowManageChannel(false); return; }
                if (confirmDialog.isOpen) { setConfirmDialog(prev => ({ ...prev, isOpen: false })); return; }

                if (currentChannel) {
                    setCurrentChannel(null);
                    if (window.innerWidth < 1024) setIsSidebarOpen(true);
                }
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [currentChannel, selectedMessage, showCreateChannel, showManageChannel, confirmDialog.isOpen]);

    return (
        <div className="flex h-screen bg-slate-900 text-white font-sans overflow-hidden">
            {/* Mobile Sidebar Overlay */}
            {isSidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/60 z-[90] lg:hidden backdrop-blur-sm"
                    onClick={() => setIsSidebarOpen(false)}
                />
            )}

            {/* Sidebar with Channels */}
            <div className={`
                fixed inset-y-0 left-0 z-[100] w-72 bg-slate-950 border-r border-slate-800 p-6 flex flex-col transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0
                ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
            `}>
                <div className="flex flex-col gap-4 mb-6">
                    <button
                        onClick={() => navigate('/dashboard')}
                        className="flex items-center gap-3 text-slate-400 hover:text-white transition-colors w-full p-2 hover:bg-slate-800 rounded-lg group"
                    >
                        <LayoutDashboard className="w-5 h-5 group-hover:text-teal-400 transition-colors" />
                        <span className="font-medium">Back to Dashboard</span>
                    </button>

                    <div className="flex justify-between items-center">
                        <h2 className="text-xl font-bold text-teal-400 flex items-center gap-2">
                            <Hash className="w-5 h-5" /> Channels
                        </h2>
                        {isAdmin && (
                            <div className="flex gap-1">
                                {isSuperAdmin && (
                                    <button
                                        onClick={handleResetSystem}
                                        className="p-1 hover:bg-slate-800 rounded text-red-400 hover:text-red-300 transition"
                                        title="Reset System"
                                    >
                                        <Shield className="w-5 h-5" />
                                    </button>
                                )}
                                {isSuperAdmin && (
                                    <button
                                        onClick={() => setShowCreateUser(true)}
                                        className="p-1 hover:bg-slate-800 rounded text-blue-400 hover:text-blue-300 transition"
                                        title="Create New User"
                                    >
                                        <UserPlus className="w-5 h-5" />
                                    </button>
                                )}
                                <button
                                    onClick={() => { setShowCreateChannel(true); fetchVerifiedUsers(); setIsSidebarOpen(false); }}
                                    className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white transition"
                                    title="Create Channel"
                                >
                                    <Plus className="w-5 h-5" />
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                <ul className="space-y-2 mb-8 flex-1 overflow-y-auto custom-scrollbar">
                    {channels.map(channel => (
                        <li
                            key={channel._id}
                            onClick={() => {
                                if (navigator.vibrate) navigator.vibrate(10);
                                setCurrentChannel(channel);
                                setIsSidebarOpen(false);
                            }}
                            className={`p-3 rounded-xl cursor-pointer transition-all flex items-center justify-between gap-2 group/item ${currentChannel?._id === channel._id
                                ? 'bg-teal-900/20 text-teal-300 border-l-4 border-teal-500 font-medium shadow-sm'
                                : 'text-slate-400 hover:bg-slate-800/50 active:bg-slate-800'
                                }`}
                        >
                            <div className="flex items-center gap-2 truncate">
                                {channel.type === 'announcement' ? <Volume2 className="w-4 h-4 flex-shrink-0" /> : <Hash className="w-4 h-4 flex-shrink-0" />}
                                <span className="truncate">{channel.name}</span>
                            </div>
                            {unreadCounts[channel.name] > 0 && (
                                <div className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center shadow-sm animate-pulse">
                                    {unreadCounts[channel.name]}
                                </div>
                            )}
                        </li>
                    ))}
                </ul>

                <h2 className="text-xl font-bold mb-4 text-emerald-400 flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> Online
                </h2>
                <ul className="space-y-3 overflow-y-auto pr-2 custom-scrollbar max-h-48">
                    <li className="flex items-center space-x-3 text-slate-300 p-2 bg-slate-800/30 rounded-lg">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-teal-500 to-emerald-500 flex items-center justify-center text-xs font-bold text-white shadow-lg">
                            {user.username?.[0]?.toUpperCase()}
                        </div>
                        <div className="flex-1 flex justify-between items-center group/profile">
                            <span className="font-medium truncate max-w-[100px]">{user.username} (You)</span>
                            <button
                                onClick={handleLogout}
                                className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors opacity-0 group-hover/profile:opacity-100 focus:opacity-100"
                                title="Sign Out"
                            >
                                <LogOut className="w-4 h-4" />
                            </button>
                        </div>
                    </li>
                    {/* Mock online users - REMOVED */}
                </ul>
            </div>

            {/* Main Chat */}
            <div className="flex-1 flex flex-col bg-slate-900/50 relative h-full w-full">
                {!currentChannel ? (
                    <div className="flex flex-col items-center justify-center h-full text-slate-500 p-8 text-center animate-in fade-in duration-500">
                        <div className="w-24 h-24 bg-slate-800/50 rounded-full flex items-center justify-center mb-6 shadow-xl ring-1 ring-slate-700/50">
                            <Hash className="w-10 h-10 text-teal-500/50" />
                        </div>
                        <h2 className="text-2xl font-bold text-white mb-2">Welcome to Escrawl Chat</h2>
                        <p className="max-w-md text-slate-400 mb-8">Select a channel from the sidebar to start messaging securely.</p>
                        <button
                            onClick={() => setIsSidebarOpen(true)}
                            className="lg:hidden px-6 py-3 bg-teal-600 hover:bg-teal-500 text-white rounded-xl font-medium transition shadow-lg shadow-teal-500/20 active:scale-95"
                        >
                            Open Channels
                        </button>
                    </div>
                ) : (
                    <>
                        {/* Header */}
                        <div className="px-4 py-3 md:px-6 md:py-4 border-b border-slate-800 bg-slate-900/95 backdrop-blur-md flex justify-between items-center sticky top-0 z-50 shadow-md">
                            <div className="flex items-center gap-3">
                                {/* Mobile Menu / Back Button */}
                                <button
                                    className="lg:hidden p-2 -ml-2 text-slate-400 hover:text-white transition-all active:scale-90 active:bg-slate-800 rounded-full"
                                    onClick={() => {
                                        if (navigator.vibrate) navigator.vibrate(15);
                                        setIsSidebarOpen(true);
                                    }}
                                >
                                    <ArrowLeft className="w-6 h-6" />
                                </button>

                                <div>
                                    <h2 className="text-base md:text-lg font-bold text-white flex items-center gap-2 overflow-hidden max-w-[180px] md:max-w-none">
                                        {currentChannel?.type === 'announcement' ? <Volume2 className="text-orange-400 w-4 h-4 md:w-5 md:h-5 flex-shrink-0" /> : <Hash className="text-teal-500 w-4 h-4 md:w-5 md:h-5 flex-shrink-0" />}
                                        <span className="truncate">{currentChannel?.name || 'Select a channel'}</span>
                                    </h2>
                                    <p className="text-[10px] md:text-xs text-slate-400 truncate max-w-[180px] md:max-w-none">{currentChannel?.description || 'Welcome to the chat'}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                {isAdmin && currentChannel?.type !== 'private' && (
                                    <button
                                        onClick={openManageChannel}
                                        className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-white transition shadow-sm"
                                        title="Channel Settings"
                                    >
                                        <Settings className="w-5 h-5" />
                                    </button>
                                )}
                                {/* Download button removed as per instructions, if it needs to be re-added, it should be placed here */}
                                <button
                                    onClick={() => {
                                        setCurrentChannel(null);
                                        if (window.innerWidth < 1024) setIsSidebarOpen(true);
                                    }}
                                    className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-colors"
                                    title="Close Chat (Esc)"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                        </div>

                        {/* Messages List */}
                        <div
                            ref={chatContainerRef}
                            onScroll={handleScroll}
                            className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar scroll-smooth relative"
                        >
                            {messages.map((msg, idx) => {
                                const isMe = msg.user === user.username;
                                const prevMsg = messages[idx - 1];
                                const showAvatar = !prevMsg || prevMsg.user !== msg.user || prevMsg.type === 'system';

                                // Date Separator Logic
                                const msgDate = new Date(msg.createdAt).toDateString();
                                const prevDate = prevMsg ? new Date(prevMsg.createdAt).toDateString() : null;
                                const showDate = msgDate !== prevDate;

                                return (
                                    <div key={msg._id || idx}>
                                        {showDate && (
                                            <div className="flex justify-center my-6 relative z-10 opacity-90 pointer-events-none">
                                                <div className="bg-slate-800/90 backdrop-blur-md text-slate-400 text-[10px] font-bold px-3 py-1 rounded-full shadow-sm border border-slate-700/50 flex items-center gap-1.5">
                                                    <Calendar className="w-3 h-3" />
                                                    {new Date(msg.createdAt).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })}
                                                </div>
                                            </div>
                                        )}

                                        {msg.type === 'system' ? (
                                            <div className="flex justify-center my-4 opacity-75">
                                                <div className="bg-slate-800/50 text-slate-400 text-xs px-3 py-1 rounded-full border border-slate-700/50 flex items-center gap-2 shadow-sm">
                                                    <Info className="w-3 h-3 text-teal-500" />
                                                    <span>{msg.text}</span>
                                                </div>
                                            </div>
                                        ) : (
                                            <motion.div
                                                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                                className={`flex items-end space-x-2 ${isMe ? 'justify-end' : 'justify-start'}`}
                                            >
                                                {/* Avatar */}
                                                <div className={`w-8 h-8 flex-shrink-0 flex items-center justify-center rounded-full text-xs font-bold shadow-md ${isMe ? 'bg-gradient-to-br from-teal-500 to-emerald-500 text-white' : 'bg-slate-700 text-slate-300'
                                                    } ${!showAvatar ? 'opacity-0' : 'opacity-100'}`}>
                                                    {msg.user[0]?.toUpperCase()}
                                                </div>

                                                <div
                                                    onClick={() => {
                                                        if (navigator.vibrate) navigator.vibrate(5);
                                                        setActiveMessageId(activeMessageId === msg._id ? null : msg._id);
                                                    }}
                                                    className={`max-w-[75%] md:max-w-md p-4 rounded-2xl shadow-lg relative group transition-all hover:shadow-xl cursor-default active:scale-[0.98] duration-100 ${isMe
                                                        ? 'bg-gradient-to-br from-teal-600 to-emerald-600 text-white rounded-br-sm'
                                                        : 'bg-slate-800 border border-slate-700 text-slate-200 rounded-bl-sm'
                                                        }`}>
                                                    {/* Message Actions (Delete & Info) */}
                                                    {(isAdmin || isMe) && msg._id && (
                                                        <div className={`absolute -top-2 -right-2 flex gap-1 transition-opacity z-10 ${activeMessageId === msg._id ? 'opacity-100 scale-100' : 'opacity-0 scale-0 group-hover:opacity-100 group-hover:scale-100'}`}>
                                                            {/* Info Button */}
                                                            {isMe && (
                                                                <button
                                                                    onClick={(e) => { e.stopPropagation(); setSelectedMessage(msg); }}
                                                                    className="bg-slate-700 text-slate-300 hover:text-white p-1.5 rounded-full shadow-lg transition-transform delay-75"
                                                                    title="Message Info"
                                                                >
                                                                    <Info className="w-3 h-3" />
                                                                </button>
                                                            )}
                                                            {/* Delete Button */}
                                                            {isAdmin && (
                                                                <button
                                                                    onClick={(e) => { e.stopPropagation(); deleteMessage(msg._id); }}
                                                                    className="bg-red-500 text-white p-1.5 rounded-full shadow-lg transition-transform"
                                                                    title="Delete Message"
                                                                >
                                                                    <X className="w-3 h-3" />
                                                                </button>
                                                            )}
                                                        </div>
                                                    )}

                                                    {/* Sender Name (only if not me) */}
                                                    {!isMe && showAvatar && (
                                                        <div className="flex items-center gap-1 mb-1">
                                                            <p className="text-xs font-bold text-teal-400 pointer-events-none select-none">{msg.user}</p>
                                                            {/* Could add 'Admin' badge here if we had msg.userRole */}
                                                        </div>
                                                    )}

                                                    {/* content */}
                                                    {msg.type === 'file' ? (
                                                        <div className="space-y-2">
                                                            {isImage(msg.fileName) && (
                                                                <div className="rounded-lg overflow-hidden border border-white/10 max-h-60 max-w-full">
                                                                    <img src={msg.fileUrl} alt="Shared" className="w-full h-full object-cover" />
                                                                </div>
                                                            )}
                                                            <div className="flex items-center space-x-3 bg-black/20 p-3 rounded-xl mt-1 backdrop-blur-sm">
                                                                <div className="p-2 bg-white/10 rounded-lg">
                                                                    {isImage(msg.fileName) ? <ImageIcon className="w-5 h-5" /> : <FileText className="w-5 h-5" />}
                                                                </div>
                                                                <div className="min-w-0 flex-1">
                                                                    <p className="text-sm font-medium truncate opacity-90">{msg.fileName}</p>
                                                                    <a
                                                                        href={msg.fileUrl}
                                                                        target="_blank"
                                                                        rel="noopener noreferrer"
                                                                        className="text-xs opacity-75 hover:opacity-100 hover:underline mt-0.5 inline-block"
                                                                    >
                                                                        Download
                                                                    </a>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <p className="leading-relaxed whitespace-pre-wrap break-words text-sm md:text-base">{msg.text}</p>
                                                    )}

                                                    {/* Timestamp & Status Logic */}
                                                    <div className={`flex items-center gap-1 mt-1.5 justify-end`}>
                                                        <span className={`text-[10px] font-medium ${isMe ? 'text-emerald-100/70' : 'text-slate-500'}`}>
                                                            {new Date(msg.createdAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                        </span>
                                                        {isMe && (
                                                            msg.status === 'read' ? (
                                                                <CheckCheck className="w-3 h-3 text-blue-300" />
                                                            ) : msg.status === 'delivered' ? (
                                                                <CheckCheck className="w-3 h-3 text-emerald-200/70" />
                                                            ) : (
                                                                <Check className="w-3 h-3 text-emerald-200/50" />
                                                            )
                                                        )}
                                                    </div>
                                                </div>
                                            </motion.div>
                                        )}
                                    </div>
                                );
                            })}

                            {/* Typing Indicator */}
                            <AnimatePresence>
                                {typingUsers.length > 0 && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: 10 }}
                                        className="flex items-center space-x-2 pl-12"
                                    >
                                        <div className="bg-slate-800 px-4 py-2 rounded-full rounded-bl-sm border border-slate-700 flex items-center space-x-1">
                                            <span className="text-xs text-slate-400 italic">
                                                {typingUsers.join(', ')} is typing
                                            </span>
                                            <span className="flex space-x-1">
                                                <span className="w-1 h-1 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                                <span className="w-1 h-1 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                                <span className="w-1 h-1 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                                            </span>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                            <div ref={messagesEndRef} />

                            {/* Scroll to Bottom Button */}
                            <AnimatePresence>
                                {showScrollButton && (
                                    <motion.button
                                        initial={{ opacity: 0, scale: 0.8 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.8 }}
                                        onClick={scrollToBottom}
                                        className="sticky bottom-4 left-1/2 -translate-x-1/2 bg-slate-800/90 text-teal-400 p-2 rounded-full shadow-xl border border-teal-500/30 hover:bg-slate-700 transition flex items-center gap-2 backdrop-blur-md group z-20"
                                    >
                                        <ArrowDown className="w-4 h-4 group-hover:animate-bounce" />
                                        {unreadCounts[currentChannel?.name] > 0 && (
                                            <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                                                {unreadCounts[currentChannel?.name]}
                                            </span>
                                        )}
                                    </motion.button>
                                )}
                            </AnimatePresence>
                        </div>

                        {/* Input Area */}
                        {
                            isInputDisabled ? (
                                <div className="p-4 bg-slate-900 border-t border-slate-800 text-center text-slate-500 text-sm flex items-center justify-center gap-2">
                                    {currentChannel?.type === 'announcement' ? <Volume2 className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                                    Only administrators can send messages in this channel.
                                </div>
                            ) : (
                                <div className="p-4 bg-slate-900 border-t border-slate-800 relative z-30">
                                    {/* Emoji Picker Popover */}
                                    <AnimatePresence>
                                        {showEmojiPicker && (
                                            <motion.div
                                                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                                                className="absolute bottom-24 left-4 shadow-2xl rounded-2xl overflow-hidden border border-slate-700 z-50"
                                            >
                                                <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm -z-10" />
                                                <EmojiPicker
                                                    theme="dark"
                                                    onEmojiClick={onEmojiClick}
                                                    width={320}
                                                    height={400}
                                                    previewConfig={{ showPreview: false }}
                                                />
                                            </motion.div>
                                        )}
                                    </AnimatePresence>

                                    <form onSubmit={sendMessage} className="flex items-end space-x-3 max-w-4xl mx-auto bg-slate-800/50 p-2 rounded-2xl border border-slate-700 backdrop-blur-sm focus-within:border-teal-500/50 focus-within:ring-1 focus-within:ring-teal-500/20 transition-all">
                                        <input
                                            type="file"
                                            ref={fileInputRef}
                                            className="hidden"
                                            onChange={handleFileUpload}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => fileInputRef.current.click()}
                                            className="p-3 text-slate-400 hover:text-teal-400 hover:bg-slate-700/50 rounded-xl transition-colors"
                                            title="Attach File"
                                        >
                                            <FileText className="w-5 h-5" />
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                                            className={`p-3 rounded-xl transition-colors ${showEmojiPicker ? 'text-yellow-400 bg-yellow-400/10' : 'text-slate-400 hover:text-yellow-400 hover:bg-slate-700/50'}`}
                                            title="Insert Emoji"
                                        >
                                            <Smile className="w-5 h-5" />
                                        </button>

                                        <div className="flex-1">
                                            <input
                                                type="text"
                                                value={message}
                                                onChange={handleTyping}
                                                placeholder="Type a message..."
                                                className="w-full bg-transparent text-white px-2 py-3 focus:outline-none placeholder:text-slate-500"
                                            />
                                        </div>

                                        <button
                                            type="submit"
                                            disabled={!message.trim()}
                                            className="p-3 bg-gradient-to-r from-teal-600 to-emerald-600 rounded-xl hover:shadow-lg hover:shadow-teal-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-white transform active:scale-95"
                                        >
                                            <Send className="w-5 h-5" />
                                        </button>
                                    </form>

                                    <div className="text-center mt-2">
                                        <p className="text-[10px] text-slate-600">Press Enter to send • 🔒 End-to-end Encrypted</p>
                                    </div>
                                </div>
                            )
                        }
                    </>
                )}
            </div>

            {/* Create Channel Modal */}
            <AnimatePresence>
                {showCreateChannel && (
                    <div className="fixed inset-0 bg-black/50 backdrop-blur-md z-[150] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="bg-slate-900 border border-slate-700 p-8 rounded-2xl w-full max-w-2xl shadow-2xl relative max-h-[90vh] overflow-y-auto custom-scrollbar"
                        >
                            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-teal-500 to-blue-500" />
                            <button
                                onClick={() => setShowCreateChannel(false)}
                                className="absolute top-4 right-4 text-slate-400 hover:text-white transition bg-slate-800 p-1 rounded-full"
                            >
                                <X className="w-5 h-5" />
                            </button>

                            <div className="flex items-center gap-3 mb-6">
                                <div className="bg-teal-500/20 p-3 rounded-xl">
                                    <Plus className="w-6 h-6 text-teal-400" />
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold text-white">Create New Channel</h2>
                                    <p className="text-sm text-slate-400">Set up a new space for collaboration</p>
                                </div>
                            </div>

                            <form onSubmit={createChannel} className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {/* Left Column: Basic Info */}
                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-sm font-medium text-slate-300 mb-1.5">Channel Name</label>
                                            <div className="relative">
                                                <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                                                <input
                                                    type="text"
                                                    className="w-full bg-slate-800/50 border border-slate-700 rounded-xl py-2.5 pl-10 pr-4 text-white focus:ring-2 focus:ring-teal-500 outline-none transition"
                                                    placeholder="e.g. project-alpha"
                                                    value={newChannelData.name}
                                                    onChange={e => setNewChannelData({ ...newChannelData, name: e.target.value })}
                                                    required
                                                />
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-slate-300 mb-1.5">Description</label>
                                            <textarea
                                                className="w-full bg-slate-800/50 border border-slate-700 rounded-xl p-3 text-white focus:ring-2 focus:ring-teal-500 outline-none transition min-h-[80px]"
                                                placeholder="What's this channel about?"
                                                value={newChannelData.description}
                                                onChange={e => setNewChannelData({ ...newChannelData, description: e.target.value })}
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-slate-300 mb-1.5">Channel Type</label>
                                            <div className="grid grid-cols-1 gap-2">
                                                {['public', 'private', 'announcement'].map(type => (
                                                    <label
                                                        key={type}
                                                        className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${newChannelData.type === type
                                                            ? 'bg-teal-500/10 border-teal-500/50 shadow-sm'
                                                            : 'bg-slate-800/30 border-slate-700 hover:border-slate-600'}`}
                                                    >
                                                        <input
                                                            type="radio"
                                                            name="channelType"
                                                            value={type}
                                                            checked={newChannelData.type === type}
                                                            onChange={e => setNewChannelData({ ...newChannelData, type: e.target.value })}
                                                            className="hidden"
                                                        />
                                                        <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${newChannelData.type === type ? 'border-teal-500' : 'border-slate-500'}`}>
                                                            {newChannelData.type === type && <div className="w-2 h-2 rounded-full bg-teal-500" />}
                                                        </div>
                                                        <div>
                                                            <span className="block text-sm font-medium capitalize text-white">{type} Group</span>
                                                            <span className="block text-xs text-slate-400">
                                                                {type === 'public' && 'Anyone can join and post'}
                                                                {type === 'private' && 'Invite only'}
                                                                {type === 'announcement' && 'Admins post, others read'}
                                                            </span>
                                                        </div>
                                                    </label>
                                                ))}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Right Column: Members */}
                                    <div className="space-y-2 flex flex-col h-full">
                                        <label className="block text-sm font-medium text-slate-300">Add Members</label>
                                        <div className="flex-1 bg-slate-800/30 border border-slate-700 rounded-xl p-2 overflow-hidden flex flex-col">
                                            <div className="p-2 border-b border-slate-700/50 mb-2">
                                                <input type="text" placeholder="Search users..." className="w-full bg-transparent text-sm outline-none text-white placeholder-slate-500" />
                                            </div>
                                            <div className="flex-1 overflow-y-auto custom-scrollbar space-y-1 p-1">
                                                {verifiedUsers.length === 0 ? (
                                                    <div className="text-center py-8 text-slate-500 text-sm">No verified users found</div>
                                                ) : (
                                                    verifiedUsers.filter(u => u.username !== user.username).map(u => (
                                                        <label key={u._id} className="flex items-center gap-3 p-2 hover:bg-slate-700/50 rounded-lg cursor-pointer transition select-none group">
                                                            <div className={`w-4 h-4 rounded border flex items-center justify-center transition ${newChannelData.members?.includes(u._id) ? 'bg-teal-500 border-teal-500' : 'border-slate-600 group-hover:border-slate-500'}`}>
                                                                {newChannelData.members?.includes(u._id) && <Check className="w-3 h-3 text-white" />}
                                                            </div>
                                                            <input
                                                                type="checkbox"
                                                                className="hidden"
                                                                checked={newChannelData.members?.includes(u._id)}
                                                                onChange={e => {
                                                                    const checked = e.target.checked;
                                                                    setNewChannelData(prev => ({
                                                                        ...prev,
                                                                        members: checked ? [...(prev.members || []), u._id] : (prev.members || []).filter(id => id !== u._id)
                                                                    }));
                                                                }}
                                                            />
                                                            <div className="flex items-center gap-2">
                                                                <div className="w-6 h-6 rounded-full bg-slate-700 flex items-center justify-center text-xs text-slate-300 font-bold">
                                                                    {u.username[0].toUpperCase()}
                                                                </div>
                                                                <span className="text-sm text-slate-300">{u.username}</span>
                                                            </div>
                                                        </label>
                                                    ))
                                                )}
                                            </div>
                                            <div className="p-2 border-t border-slate-700/50 mt-2 text-xs text-slate-500 text-center">
                                                {newChannelData.members?.length || 0} users selected
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="pt-4 border-t border-slate-700/50 flex justify-end gap-3">
                                    <button type="button" onClick={() => setShowCreateChannel(false)} className="px-4 py-2 text-slate-400 hover:text-white transition">Cancel</button>
                                    <button
                                        type="submit"
                                        disabled={isLoading}
                                        className="px-6 py-2 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white font-bold rounded-xl shadow-lg shadow-teal-900/20 disabled:opacity-50 transition-all transform hover:scale-[1.02]"
                                    >
                                        {isLoading ? <Loader className="w-5 h-5 animate-spin mx-auto" /> : 'Create Channel'}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )
                }
            </AnimatePresence >

            {/* Create User Modal (Super Admin) */}
            < AnimatePresence >
                {showCreateUser && (
                    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[150] p-4">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-slate-900 border border-slate-700 rounded-2xl p-6 w-[95%] max-w-4xl shadow-2xl overflow-y-auto max-h-[90vh] custom-scrollbar"
                        >
                            <button
                                onClick={() => setShowCreateUser(false)}
                                className="absolute top-4 right-4 text-slate-400 hover:text-white"
                            >
                                <X className="w-5 h-5" />
                            </button>
                            <h2 className="text-xl font-bold mb-4 text-blue-400">Create New User</h2>
                            <form onSubmit={handleCreateUser} className="space-y-4">
                                <div>
                                    <label className="block text-sm text-slate-400 mb-1">Username</label>
                                    <input
                                        type="text"
                                        className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-white focus:ring-2 focus:ring-blue-500 outline-none"
                                        placeholder="Enter username"
                                        value={newUserData.username}
                                        onChange={e => setNewUserData({ ...newUserData, username: e.target.value })}
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm text-slate-400 mb-1">Password</label>
                                    <input
                                        type="password"
                                        className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-white focus:ring-2 focus:ring-blue-500 outline-none"
                                        placeholder="Enter password"
                                        value={newUserData.password}
                                        onChange={e => setNewUserData({ ...newUserData, password: e.target.value })}
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm text-slate-400 mb-1">Role</label>
                                    <select
                                        className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-white focus:ring-2 focus:ring-blue-500 outline-none"
                                        value={newUserData.role}
                                        onChange={e => setNewUserData({ ...newUserData, role: e.target.value })}
                                    >
                                        <option value="user">User</option>
                                        <option value="admin">Admin</option>
                                    </select>
                                </div>
                                <button
                                    type="submit"
                                    disabled={isLoading}
                                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 rounded-lg mt-2 flex items-center justify-center disabled:opacity-50"
                                >
                                    {isLoading ? <Loader className="w-5 h-5 animate-spin" /> : 'Create User'}
                                </button>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence >

            {/* Message Info Modal */}
            < AnimatePresence >
                {selectedMessage && (
                    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[150] p-4">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-slate-900 border border-slate-700 rounded-2xl p-6 w-[95%] max-w-md shadow-2xl relative overflow-hidden"
                        >
                            <button
                                onClick={() => setSelectedMessage(null)}
                                className="absolute top-4 right-4 text-slate-400 hover:text-white transition"
                            >
                                <X className="w-5 h-5" />
                            </button>

                            <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                                <Info className="w-5 h-5 text-teal-400" /> Message Info
                            </h3>

                            {/* Message Preview */}
                            <div className="bg-slate-800/50 p-4 rounded-xl mb-6 border border-slate-700/50">
                                <p className="text-slate-300 text-sm italic line-clamp-3">
                                    "{selectedMessage.text || (selectedMessage.type === 'file' ? `File: ${selectedMessage.fileName}` : 'Media')}"
                                </p>
                                <div className="flex justify-end mt-2 items-center gap-1.5">
                                    <span className="text-[10px] text-slate-500">
                                        {new Date(selectedMessage.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                    {selectedMessage.status === 'read' ? (
                                        <CheckCheck className="w-3 h-3 text-blue-400" />
                                    ) : selectedMessage.status === 'delivered' ? (
                                        <CheckCheck className="w-3 h-3 text-emerald-200/50" />
                                    ) : (
                                        <Check className="w-3 h-3 text-slate-500" />
                                    )}
                                </div>
                            </div>

                            <div className="space-y-6">
                                {/* Read By Section */}
                                <div>
                                    <h4 className="text-sm font-bold text-blue-400 mb-3 flex items-center gap-2">
                                        <CheckCheck className="w-4 h-4" /> Read By
                                    </h4>
                                    <div className="bg-slate-800/30 rounded-xl overflow-hidden max-h-40 overflow-y-auto custom-scrollbar">
                                        {selectedMessage.readBy && selectedMessage.readBy.length > 0 ? (
                                            <ul className="divide-y divide-slate-800/50">
                                                {selectedMessage.readBy.map((username, idx) => (
                                                    <li key={idx} className="p-3 flex items-center gap-3 hover:bg-slate-800/50 transition">
                                                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center text-xs font-bold text-white shadow-sm">
                                                            {username[0]?.toUpperCase()}
                                                        </div>
                                                        <span className="text-sm font-medium text-slate-300">{username}</span>
                                                        {/* Could add 'time' here if backend provided it */}
                                                    </li>
                                                ))}
                                            </ul>
                                        ) : (
                                            <p className="p-4 text-xs text-slate-500 text-center italic">Not read by anyone yet</p>
                                        )}
                                    </div>
                                </div>

                                {/* Delivered To Section (Conceptual - showing placeholder or existing logic) */}
                                <div>
                                    <h4 className="text-sm font-bold text-slate-400 mb-3 flex items-center gap-2">
                                        <CheckCheck className="w-4 h-4" /> Delivered To
                                    </h4>
                                    <p className="text-xs text-slate-500 pl-1">
                                        {selectedMessage.status === 'delivered' || selectedMessage.status === 'read'
                                            ? 'Delivered to room'
                                            : 'Sent to server'}
                                    </p>
                                </div>
                            </div>

                        </motion.div>
                    </div>
                )}
            </AnimatePresence >

            {/* Manage Channel Modal */}
            < AnimatePresence >
                {showManageChannel && (
                    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            className="bg-slate-900 border border-slate-700 rounded-2xl p-6 max-w-4xl w-full shadow-2xl relative max-h-[90vh] overflow-y-auto custom-scrollbar"
                        >
                            <button
                                onClick={() => setShowManageChannel(false)}
                                className="absolute top-4 right-4 text-slate-400 hover:text-white"
                            >
                                <X className="w-5 h-5" />
                            </button>
                            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                                <Settings className="w-5 h-5 text-teal-500" /> Manage Channel
                            </h2>
                            <form onSubmit={handleUpdateChannel} className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {/* Left Column: Settings */}
                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-sm text-slate-400 mb-1">Name</label>
                                            <input
                                                type="text"
                                                required
                                                className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-white focus:ring-2 focus:ring-teal-500 outline-none"
                                                value={manageChannelData.name}
                                                onChange={e => setManageChannelData({ ...manageChannelData, name: e.target.value })}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm text-slate-400 mb-1">Description</label>
                                            <textarea
                                                className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-white focus:ring-2 focus:ring-teal-500 outline-none min-h-[80px]"
                                                value={manageChannelData.description}
                                                onChange={e => setManageChannelData({ ...manageChannelData, description: e.target.value })}
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm text-slate-400 mb-1">Who can access? (View/Join)</label>
                                            <select
                                                className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-white focus:ring-2 focus:ring-teal-500 outline-none"
                                                value={manageChannelData.allowedRoles?.includes('user') ? 'all' : 'admin'}
                                                onChange={e => {
                                                    const val = e.target.value;
                                                    const roles = val === 'admin' ? ['admin'] : ['user', 'admin'];
                                                    setManageChannelData({ ...manageChannelData, allowedRoles: roles });
                                                }}
                                            >
                                                <option value="all">All Users</option>
                                                <option value="admin">Admins Only</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-sm text-slate-400 mb-1">Who can post messages?</label>
                                            <select
                                                className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-white focus:ring-2 focus:ring-teal-500 outline-none"
                                                value={manageChannelData.postingRoles?.includes('user') ? 'all' : 'admin'}
                                                onChange={e => {
                                                    const val = e.target.value;
                                                    const roles = val === 'admin' ? ['admin'] : ['user', 'admin'];
                                                    setManageChannelData({ ...manageChannelData, postingRoles: roles });
                                                }}
                                            >
                                                <option value="all">All Users</option>
                                                <option value="admin">Admins Only</option>
                                            </select>
                                        </div>
                                    </div>

                                    {/* Right Column: Members */}
                                    <div className="space-y-2 flex flex-col h-full">
                                        <label className="block text-sm font-medium text-slate-300">Manage Members ({manageChannelData.members?.length || 0})</label>
                                        <div className="flex-1 bg-slate-800/50 border border-slate-700 rounded-xl p-2 custom-scrollbar overflow-y-auto min-h-[300px] max-h-[400px] space-y-1">
                                            {verifiedUsers.length === 0 ? (
                                                <p className="text-xs text-slate-500 p-4 text-center">No users available.</p>
                                            ) : (
                                                verifiedUsers.filter(u => u.username !== user.username).map(u => {
                                                    const isMember = manageChannelData.members?.includes(u._id);
                                                    return (
                                                        <div key={u._id} className="flex items-center justify-between p-2 hover:bg-slate-700/30 rounded-lg transition group border border-transparent hover:border-slate-700/50">
                                                            <div className="flex items-center gap-3">
                                                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shadow-sm transition-colors ${isMember ? 'bg-teal-900/50 text-teal-400 ring-1 ring-teal-500/50' : 'bg-slate-700 text-slate-400'}`}>
                                                                    {u.username[0].toUpperCase()}
                                                                </div>
                                                                <div className="flex flex-col">
                                                                    <span className={`text-sm font-medium ${isMember ? 'text-teal-400' : 'text-slate-300'}`}>{u.username}</span>
                                                                    <span className="text-[10px] text-slate-500">{isMember ? 'Member' : 'Not in group'}</span>
                                                                </div>
                                                            </div>

                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    if (isMember) {
                                                                        // Remove
                                                                        setManageChannelData(prev => ({
                                                                            ...prev,
                                                                            members: (prev.members || []).filter(id => id !== u._id)
                                                                        }));
                                                                    } else {
                                                                        // Add
                                                                        setManageChannelData(prev => ({
                                                                            ...prev,
                                                                            members: [...(prev.members || []), u._id]
                                                                        }));
                                                                    }
                                                                }}
                                                                className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 text-xs font-bold shadow-sm ${isMember
                                                                    ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20 hover:border-red-500/40'
                                                                    : 'bg-teal-500/10 text-teal-400 hover:bg-teal-500/20 border border-teal-500/20 hover:border-teal-500/40'
                                                                    }`}
                                                            >
                                                                {isMember ? (
                                                                    <>
                                                                        <UserMinus className="w-3.5 h-3.5" /> Remove
                                                                    </>
                                                                ) : (
                                                                    <>
                                                                        <UserPlus className="w-3.5 h-3.5" /> Add
                                                                    </>
                                                                )}
                                                            </button>
                                                        </div>
                                                    );
                                                })
                                            )}
                                        </div>
                                        <p className="text-xs text-slate-500 px-1">
                                            Members added here will have access based on component visibility rules.
                                        </p>
                                    </div>
                                </div>

                                <div className="pt-4 border-t border-slate-700/50 flex flex-col gap-4">
                                    <button type="submit" className="w-full bg-teal-600 hover:bg-teal-700 text-white font-bold py-2.5 rounded-xl shadow-lg shadow-teal-900/20 transition transform active:scale-[0.99]">
                                        Save Changes
                                    </button>

                                    {/* Delete Group Button inside Manage Channel */}
                                    <div className="pt-4 border-t border-slate-700/50">
                                        <button
                                            type="button"
                                            onClick={(e) => handleDeleteChannel(e, currentChannel._id, currentChannel.name)}
                                            className="w-full bg-red-500/10 hover:bg-red-500/20 border border-red-500/50 text-red-500 hover:text-red-400 font-bold py-2 rounded-lg flex items-center justify-center gap-2 transition"
                                        >
                                            <Trash2 className="w-4 h-4" /> Delete Group
                                        </button>
                                        <p className="text-xs text-red-400/70 text-center mt-2">Warning: This action cannot be undone.</p>
                                    </div>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence >
            {/* Confirmation Modal */}
            <AnimatePresence>
                {confirmDialog.isOpen && (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-slate-900 border border-slate-700 p-6 rounded-2xl w-full max-w-sm shadow-2xl relative overflow-hidden"
                        >
                            <div className={`absolute top-0 left-0 w-full h-1 ${confirmDialog.type === 'danger' ? 'bg-red-500' : 'bg-yellow-500'}`} />

                            <div className="flex items-start gap-4 mb-4">
                                <div className={`p-3 rounded-full ${confirmDialog.type === 'danger' ? 'bg-red-500/10 text-red-500' : 'bg-yellow-500/10 text-yellow-500'}`}>
                                    <AlertTriangle className="w-6 h-6" />
                                </div>
                                <div className="flex-1">
                                    <h3 className="text-lg font-bold text-white mb-1">{confirmDialog.title}</h3>
                                    <p className="text-slate-400 text-sm leading-relaxed">{confirmDialog.message}</p>
                                </div>
                            </div>

                            <div className="flex justify-end gap-3 mt-6">
                                <button
                                    onClick={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}
                                    className="px-4 py-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors text-sm font-medium"
                                >
                                    {confirmDialog.cancelText || 'Cancel'}
                                </button>
                                <button
                                    onClick={() => {
                                        if (confirmDialog.onConfirm) confirmDialog.onConfirm();
                                        setConfirmDialog(prev => ({ ...prev, isOpen: false }));
                                    }}
                                    className={`px-4 py-2 rounded-lg text-white text-sm font-medium shadow-lg transition-all active:scale-95 ${confirmDialog.type === 'danger'
                                        ? 'bg-red-600 hover:bg-red-500 shadow-red-500/20'
                                        : 'bg-yellow-600 hover:bg-yellow-500 shadow-yellow-500/20'
                                        }`}
                                >
                                    {confirmDialog.confirmText}
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Toasts */}
            < div className="fixed top-4 right-4 z-[250] flex flex-col gap-2" >
                <AnimatePresence mode="popLayout">
                    {toasts.map(toast => (
                        <motion.div
                            key={toast.id}
                            initial={{ opacity: 0, x: 20, scale: 0.9 }}
                            animate={{ opacity: 1, x: 0, scale: 1 }}
                            exit={{ opacity: 0, x: 20, scale: 0.9 }}
                            layout
                            className={`flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg border backdrop-blur-md ${toast.type === 'error' ? 'bg-red-500/10 border-red-500/20 text-red-200' :
                                toast.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-200' :
                                    'bg-slate-800/90 border-slate-700 text-slate-200'
                                }`}
                        >
                            {toast.type === 'error' ? <AlertCircle className="w-5 h-5 text-red-400" /> :
                                toast.type === 'success' ? <Check className="w-5 h-5 text-emerald-400" /> :
                                    <Info className="w-5 h-5 text-blue-400" />}
                            <span className="text-sm font-medium">{toast.message}</span>
                            <button
                                onClick={() => setToasts(prev => prev.filter(t => t.id !== toast.id))}
                                className="p-1 hover:bg-white/10 rounded-full transition-colors"
                            >
                                <X className="w-4 h-4 opacity-50" />
                            </button>
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div >
        </div >
    );
};

export default Chat;
