import { motion } from 'framer-motion';
import { MessageSquare, Monitor, FileText, Settings, User } from 'lucide-react';
import { Link } from 'react-router-dom';

const Dashboard = () => {
    const user = JSON.parse(localStorage.getItem('user') || '{}');

    const cards = [
        { title: 'Secure Chat', icon: MessageSquare, link: '/chat', desc: 'End-to-end encrypted messaging with file sharing.', color: 'from-blue-500 to-cyan-500' },
        { title: 'Video Meeting', icon: Monitor, link: '/video', desc: 'High-quality P2P video calls with screen sharing.', color: 'from-purple-500 to-pink-500' },
    ];

    if (user.role === 'admin') {
        cards.push({ title: 'Admin Panel', icon: Settings, link: '/admin', desc: 'Manage users and system settings.', color: 'from-orange-500 to-red-500' });
    }

    return (
        <div className="p-8">
            <header className="mb-10">
                <h1 className="text-3xl font-bold text-white mb-2">Welcome back, {user.username || 'User'}!</h1>
                <p className="text-slate-400">Here's an overview of your secure workspace.</p>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {cards.map((card, index) => (
                    <Link key={index} to={card.link}>
                        <motion.div
                            whileHover={{ scale: 1.05, y: -5 }}
                            whileTap={{ scale: 0.95 }}
                            className={`p-6 rounded-2xl bg-gradient-to-br ${card.color} shadow-lg cursor-pointer h-full border border-white/10 backdrop-blur-sm relative overflow-hidden group`}
                        >
                            <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors duration-300" />
                            <card.icon className="w-12 h-12 text-white mb-4 relative z-10" />
                            <h2 className="text-xl font-bold text-white mb-2 relative z-10">{card.title}</h2>
                            <p className="text-white/80 text-sm relative z-10">{card.desc}</p>
                        </motion.div>
                    </Link>
                ))}
            </div>

            <div className="mt-12">
                <h2 className="text-2xl font-bold mb-6 text-slate-300">Recent Activity</h2>
                <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
                    <p className="text-slate-400 italic">No recent activity found.</p>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
