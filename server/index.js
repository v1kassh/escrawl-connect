const express = require('express');
const mongoose = require('mongoose');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const multer = require('multer');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('./models/User');

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: '*', // Allow all origins for dev
        methods: ['GET', 'POST', 'DELETE']
    }
});

// Security Middleware
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');

app.use(cors()); // CORS must be first
app.options('*', cors()); // Enable pre-flight for all routes

// Set Security Headers
app.use(helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" }, // Allow resource loading
    contentSecurityPolicy: false, // Disable strict CSP for dev flexibility
}));

// Prevent NoSQL Injection
app.use(mongoSanitize());

// Rate Limiting (General)
// Rate Limiting (General)
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1000, // Increased limit for dev: 1000 requests per window
    standardHeaders: true,
    legacyHeaders: false,
    message: "Too many requests, please try again later."
});
// app.use('/api/', limiter); // Disabled for Dev Testing

// Middleware
app.use(express.json({ limit: '10kb' })); // Body limit
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Database Connection
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/escrawl_connect';
console.log('Connecting to MongoDB:', MONGO_URI.includes('localhost') ? 'Using Local Fallback (Check ENV)' : 'Using Provided URI');

mongoose.connect(MONGO_URI, {
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
})
    .then(() => console.log('✅ MongoDB Connected'))
    .catch(err => console.error('❌ MongoDB Connection Error:', err));

// Auth Middleware
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) {
        console.log('[Auth] No token provided');
        return res.sendStatus(401);
    }

    jwt.verify(token, process.env.JWT_SECRET || 'secret', (err, user) => {
        if (err) {
            console.error('[Auth] Token verification failed:', err.message);
            return res.sendStatus(403);
        }
        req.user = user;
        next();
    });
};

// Routes

// Health Check
app.get('/api/health', (req, res) => {
    const dbStatus = mongoose.connection.readyState;
    const statusMap = { 0: 'Disconnected', 1: 'Connected', 2: 'Connecting', 3: 'Disconnecting' };
    res.json({
        server: 'Running',
        database: statusMap[dbStatus] || 'Unknown',
        env_mongo_set: !!process.env.MONGO_URI // true/false check
    });
});

// Auth: Login
app.post('/api/auth/login', async (req, res) => {
    const { username, password } = req.body;
    console.log(`[Login Attempt] Username: ${username}`);
    try {
        const user = await User.findOne({ username });
        if (!user) {
            console.log('[Login Fail] User not found');
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            console.log('[Login Fail] Password incorrect');
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        // Bypass verification for Super Admin
        let isVerified = user.isVerified;
        if (user.username === 'vikash@escrawl') {
            isVerified = true;
        }

        const payload = { userId: user._id, role: user.role, username: user.username };
        const token = jwt.sign(payload, process.env.JWT_SECRET || 'secret', { expiresIn: '1h' });

        res.json({ token, user: { username: user.username, role: user.role, isVerified } });
    } catch (err) {
        console.error('Login Error:', err);
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

// Get Current User Profile (Role/Details)
app.get('/api/auth/me', authenticateToken, async (req, res) => {
    try {
        const user = await User.findById(req.user.userId).select('-password'); // efficient
        if (!user) return res.status(404).json({ message: 'User not found' });
        res.json(user);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

// Email Transporter Setup
const nodemailer = require('nodemailer');
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        // Remove spaces from App Password if present (common copy-paste issue)
        pass: process.env.EMAIL_PASS ? process.env.EMAIL_PASS.replace(/\s+/g, '') : ''
    },
    // Enable debug output
    debug: true,
    logger: true
});


// Send OTP for Verification
app.post('/api/auth/send-otp', async (req, res) => {
    const { username, email } = req.body;
    try {
        const user = await User.findOne({ username });
        if (!user) return res.status(404).json({ message: 'User not found' });

        // Check if email already verified by another user
        const existingEmail = await User.findOne({ email });
        if (existingEmail && existingEmail.username !== username) {
            return res.status(400).json({ message: 'Email already in use' });
        }

        // Generate OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 mins

        // Save OTP to DB FIRST
        user.otp = otp;
        user.otpExpires = otpExpires;
        await user.save();

        console.log(`[DEBUG] OTP for ${username} (${email}): ${otp}`); // Always log for debugging

        // Send Email
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: email,
            subject: 'Your Verification Code - Escrawl Connect',
            text: `Your verification code is: ${otp}`
        };

        if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
            transporter.sendMail(mailOptions, (error, info) => {
                if (error) {
                    console.error('Email error (using console fallback):', error.message);
                    // Do NOT return error to client, allow them to use console OTP if in dev
                    return res.json({ message: 'OTP generated (check server console if email fails)' });
                }
                console.log('Email sent: ' + info.response);
                res.json({ message: 'OTP sent to email' });
            });
        } else {
            console.log(`[DEV MODE] Email credentials missing. OTP: ${otp}`);
            res.json({ message: 'OTP generated (check server console)' });
        }

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

// Verify OTP
app.post('/api/auth/verify-otp', async (req, res) => {
    const { username, email, otp } = req.body;
    try {
        const user = await User.findOne({ username });
        if (!user) return res.status(404).json({ message: 'User not found' });

        if (user.otp !== otp || user.otpExpires < Date.now()) {
            return res.status(400).json({ message: 'Invalid or expired OTP' });
        }

        user.email = email;
        user.isVerified = true;
        user.otp = undefined;
        user.otpExpires = undefined;
        await user.save();

        res.json({ message: 'Email verified successfully', isVerified: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

// Admin: Get All Users
app.get('/api/users', authenticateToken, async (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ message: 'Access denied' });
    try {
        const users = await User.find({}, '-password'); // Exclude password field
        res.json(users);
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
});

// Admin: Create User
app.post('/api/users', authenticateToken, async (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ message: 'Access denied' });
    try {
        const { username, password, role } = req.body;
        const existingUser = await User.findOne({ username });
        if (existingUser) return res.status(400).json({ message: 'User already exists' });

        const newUser = new User({ username, password, role });
        await newUser.save();
        res.status(201).json({ message: 'User created successfully', user: { username, role } });
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
});

const Message = require('./models/Message');

// Admin: Delete User
app.delete('/api/users/:id', authenticateToken, async (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ message: 'Access denied' });
    try {
        const userToDelete = await User.findById(req.params.id);
        if (!userToDelete) return res.status(404).json({ message: 'User not found' });

        // Protect Super Admin
        if (userToDelete.username === 'vikash@escrawl') {
            return res.status(403).json({ message: 'Cannot delete Super Admin' });
        }

        await User.findByIdAndDelete(req.params.id);
        res.json({ message: 'User deleted successfully' });
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
});

// Admin/Super Admin: Delete Message (Hierarchy Based)
app.delete('/api/messages/:id', authenticateToken, async (req, res) => {
    // Basic role check
    if (req.user.role !== 'admin' && req.user.role !== 'super_admin') {
        return res.status(403).json({ message: 'Access denied' });
    }

    try {
        const message = await Message.findById(req.params.id);
        if (!message) return res.status(404).json({ message: 'Message not found' });

        // Hierarchy Logic
        // 1. Super Admin can delete ANYTHING.
        if (req.user.role === 'super_admin') {
            await Message.findByIdAndDelete(req.params.id);
            io.to(message.roomId).emit('message-deleted', message._id);
            return res.json({ message: 'Message deleted successfully (Super Admin)' });
        }

        // 2. Admin Logic
        if (req.user.role === 'admin') {
            // Find the author of the message to check their role
            const author = await User.findOne({ username: message.user });

            // If author not found (deleted user?), allow delete.
            // If author is Super Admin, DENY.
            // If author is Admin, DENY (Admins cannot delete other Admins' messages, usually).

            if (author) {
                if (author.role === 'super_admin') {
                    return res.status(403).json({ message: 'Admins cannot delete Super Admin messages' });
                }
                if (author.role === 'admin' && author.username !== req.user.username) {
                    // Optional: Allow deleting own messages, but not other admins?
                    // User said "all the messages can be deleted by super admin".
                    // Implied: Admin might be restricted against superiors.
                    // Let's protect Admin messages from other Admins to be safe/hierarchical.
                    return res.status(403).json({ message: 'Admins cannot delete other Admin messages' });
                }
            }

            // If author is User (or not found), Admin can delete.
            await Message.findByIdAndDelete(req.params.id);
            io.to(message.roomId).emit('message-deleted', message._id);
            res.json({ message: 'Message deleted successfully' });
        }

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

// Chat: Get Messages
// Chat: Get Messages (Secured)
app.get('/api/messages/:roomId', authenticateToken, async (req, res) => {
    try {
        const { roomId } = req.params;
        const channel = await Channel.findOne({ name: roomId });

        if (!channel) return res.status(404).json({ message: 'Channel not found' });

        // Check access permissions
        const isSuperAdmin = req.user.role === 'super_admin';
        const isMember = channel.members.includes(req.user.userId);
        const isGlobalChannel = ['General', 'Random'].includes(channel.name);

        // If not Super Admin AND not a member AND not global -> specific denial
        if (!isSuperAdmin && !isMember && !isGlobalChannel) {
            return res.status(403).json({ message: 'Access denied: You are not a member of this group' });
        }

        const messages = await Message.find({ roomId }).sort({ createdAt: 1 }).limit(100);
        res.json(messages);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

const Channel = require('./models/Channel');

// Ensure Default Channels Exist
const seedChannels = async () => {
    try {
        const defaults = [
            { name: 'General', type: 'public', description: 'General discussion for everyone' },
            { name: 'Announcements', type: 'announcement', description: 'Official announcements' },
            { name: 'Random', type: 'public', description: 'Random off-topic chat' }
        ];

        for (const channel of defaults) {
            const exists = await Channel.findOne({ name: channel.name });
            if (!exists) {
                await new Channel(channel).save();
                console.log(`✅ Created default channel: ${channel.name}`);
            }
        }
    } catch (err) {
        console.error('Error seeding channels:', err);
    }
};
const seedAdmin = async () => {
    try {
        const User = require('./models/User'); // Ensure User model is loaded
        const count = await User.countDocuments();
        if (count === 0) {
            console.log('🌱 Seeding initial Super Admin...');
            const admin = new User({
                username: 'vikash@escrawl',
                password: 'admin123_change_me', // Default password
                role: 'super_admin',
                isVerified: true,
                email: 'admin@escrawl.com'
            });
            await admin.save();
            console.log('✅ Super Admin created: vikash@escrawl / admin123_change_me');
        }
    } catch (err) {
        console.error('Error seeding admin:', err);
    }
};

mongoose.connection.once('open', async () => {
    await seedAdmin();
    await seedChannels();
});

// Channels Routes

// Get All Channels
// Get All Channels
app.get('/api/channels', authenticateToken, async (req, res) => {
    try {
        // Super/Admins see all public/announcement channels
        // Regular users must be in allowedRoles
        const isSuper = req.user.role === 'super_admin';

        let query = {};
        if (!isSuper) {
            // Strict Membership: Only see groups you are in.
            // EXCEPTION: 'General' and 'Random' are open to everyone as per request.
            query = {
                $or: [
                    { members: req.user.userId },
                    { name: { $in: ['General', 'Random'] } }
                ]
            };
        }

        const channels = await Channel.find(query).sort({ name: 1 });
        res.json(channels);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

// SUPER ADMIN: System Reset (Clear all channels, create defaults)
app.delete('/api/admin/reset-system', authenticateToken, async (req, res) => {
    if (req.user.role !== 'admin' && req.user.role !== 'super_admin') {
        return res.status(403).json({ message: 'Only admins can perform system reset' });
    }

    try {
        console.log(`System Reset triggered by ${req.user.username}`);

        // 1. Delete ALL channels
        await Channel.deleteMany({});

        // 2. Create General (Public)
        const general = await Channel.create({
            name: 'General',
            type: 'public',
            description: 'General discussion for everyone',
            allowedRoles: ['user', 'admin', 'super_admin'],
            postingRoles: ['user', 'admin', 'super_admin']
        });

        // 3. Create Announcements (Admin Only Posting)
        const announcements = await Channel.create({
            name: 'Announcements',
            type: 'announcement',
            description: 'Official announcements',
            allowedRoles: ['user', 'admin', 'super_admin'],
            postingRoles: ['admin', 'super_admin']
        });

        // Notify all clients via Socket.IO
        io.emit('system-reset', { generalId: general._id });

        res.json({ message: 'System reset complete', channels: [general, announcements] });
    } catch (err) {
        console.error('Reset failed:', err);
        res.status(500).json({ message: 'Reset failed' });
    }
});

// SUPER ADMIN: Create New User (Admin/User)
app.post('/api/admin/users', authenticateToken, async (req, res) => {
    if (req.user.role !== 'super_admin') {
        return res.status(403).json({ message: 'Only Super Admins can create users manually' });
    }

    try {
        const { username, password, role } = req.body;

        if (!username || !password || !role) {
            return res.status(400).json({ message: 'All fields are required' });
        }

        const existingUser = await User.findOne({ username });
        if (existingUser) {
            return res.status(400).json({ message: 'Username already exists' });
        }

        const newUser = new User({
            username,
            password, // Hashed by pre-save hook
            role,
            isVerified: true // Auto-verify manually created users
        });

        await newUser.save();
        res.status(201).json({ message: `User ${username} created as ${role}`, user: { username, role } });

    } catch (err) {
        console.error('Create User Failed:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

// Get Verified Users (for adding to groups)
app.get('/api/users/verified', authenticateToken, async (req, res) => {
    try {
        const users = await User.find({ isVerified: true }, 'username _id').sort({ username: 1 });
        res.json(users);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

// Admin: Create Channel (Group/Announcement)
app.post('/api/channels', authenticateToken, async (req, res) => {
    if (req.user.role !== 'admin' && req.user.role !== 'super_admin') {
        return res.status(403).json({ message: 'Only admins can create channels' });
    }

    try {
        const { name, type, description, members, allowedRoles, postingRoles } = req.body;

        const existing = await Channel.findOne({ name });
        if (existing) return res.status(400).json({ message: 'Channel name already exists' });

        const newChannel = new Channel({
            name,
            type,
            description,
            creator: req.user.userId,
            members: [...new Set([...(members || []), req.user.userId])], // Auto-add creator
            allowedRoles: allowedRoles || ['user', 'admin'],
            postingRoles: postingRoles || ['user', 'admin']
        });

        await newChannel.save();
        res.status(201).json(newChannel);
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
});

// Admin: Update Channel (Manage Settings)
app.put('/api/channels/:id', authenticateToken, async (req, res) => {
    if (req.user.role !== 'admin' && req.user.role !== 'super_admin') {
        return res.status(403).json({ message: 'Only admins can manage channels' });
    }

    try {
        const { id } = req.params;
        const { name, description, allowedRoles, postingRoles, members } = req.body;

        // Fetch original channel to compare members
        const originalChannel = await Channel.findById(id);
        if (!originalChannel) return res.status(404).json({ message: 'Channel not found' });

        const updatedChannel = await Channel.findByIdAndUpdate(
            id,
            { name, description, allowedRoles, postingRoles, members },
            { new: true } // Return the updated document
        );

        // Detect new members
        if (members && members.length > originalChannel.members.length) {
            const oldMemberSet = new Set(originalChannel.members.map(m => m.toString()));
            const newMemberIds = members.filter(m => !oldMemberSet.has(m));

            if (newMemberIds.length > 0) {
                const newUsers = await User.find({ _id: { $in: newMemberIds } });
                for (const user of newUsers) {
                    const systemMsg = new Message({
                        roomId: updatedChannel.name, // Using name as roomId based on existing logic
                        user: 'System',
                        text: `${user.username} was added to the group by ${req.user.username}`,
                        type: 'system'
                    });
                    await systemMsg.save();
                    io.to(updatedChannel.name).emit('receive-message', systemMsg);
                }
            }
        }

        // Detect removed members
        if (members && members.length < originalChannel.members.length) {
            const newMemberSet = new Set(members.map(m => m.toString()));
            const removedMemberIds = originalChannel.members.filter(m => !newMemberSet.has(m.toString()));

            if (removedMemberIds.length > 0) {
                const removedUsers = await User.find({ _id: { $in: removedMemberIds } });
                for (const user of removedUsers) {
                    const systemMsg = new Message({
                        roomId: updatedChannel.name,
                        user: 'System',
                        text: `${user.username} was removed from the group by ${req.user.username}`,
                        type: 'system'
                    });
                    await systemMsg.save();
                    io.to(updatedChannel.name).emit('receive-message', systemMsg);
                }
            }
        }

        if (!updatedChannel) return res.status(404).json({ message: 'Channel not found' });

        // Notify all clients about the channel update
        // We need 'io' instance here. server/index.js has 'io' in scope.
        // Assuming this route is defined where 'io' is available (it is in main index.js).
        // However, 'io' is defined before routes. Yes.
        // But need to make sure we emit to everyone or just members?
        // Public/Announcement: Everyone. Private: Members.
        // For simplicity, emit 'channel-update' global or to specific room if we had a "global" room.
        // Let's emit to everyone for now, and client filters if they have it.
        // Or better, since we don't have global room joined by all, we can use io.emit (broadcast to all)

        // Wait, io is a const. We can use it.
        // Let's emit the updated channel.
        // IMPORTANT: We need to access 'io' variable. It is defined at line 17.
        // This route is inside 'server/index.js' main scope, so 'io' is accessible.

        io.emit('channel-updated', updatedChannel);

        res.json(updatedChannel);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

// Admin: Delete Channel (Single Group)
app.delete('/api/channels/:id', authenticateToken, async (req, res) => {
    if (req.user.role !== 'admin' && req.user.role !== 'super_admin') {
        return res.status(403).json({ message: 'Only admins can delete channels' });
    }

    try {
        const { id } = req.params;
        const channel = await Channel.findById(id);

        if (!channel) {
            return res.status(404).json({ message: 'Channel not found' });
        }

        // Prevent deletion of default system channels if desired, but request says allow delete one by one.
        // Assuming General and Announcements should ideally be protected, but user asked specifically to delete groups.
        // Let's add partial protection or just allow it as per "delete groups... one by one".
        // If "General" is deleted, system might be unstable if frontend assumes it exists.
        // For now, allow deletion as requested.

        await Channel.findByIdAndDelete(id);

        // Notify clients
        io.emit('channel-deleted', id);

        res.json({ message: 'Channel deleted successfully', channelId: id });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

// Download Conversation (Existing)
app.get('/api/conversations/:roomId/download', async (req, res) => {
    const { roomId } = req.params;
    try {
        const messages = await Message.find({ roomId }).sort({ createdAt: 1 });
        // ... (rest of the detailed implementation)
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename=conversation-${roomId}.json`);
        res.send(JSON.stringify(messages, null, 2));
    } catch (err) {
        res.status(500).json({ message: 'Error downloading conversation' });
    }
});

// Socket.IO Middleware
io.use((socket, next) => {
    const token = socket.handshake.auth.token || socket.handshake.headers?.authorization?.split(' ')[1];

    if (!token) {
        return next(new Error('Authentication error: No token provided'));
    }

    jwt.verify(token, process.env.JWT_SECRET || 'secret', (err, decoded) => {
        if (err) {
            return next(new Error('Authentication error: Invalid token'));
        }
        socket.user = decoded; // Attach user to socket
        next();
    });
});

// Socket.IO Logic
io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    socket.on('join-room', (roomId, user) => {
        socket.join(roomId);
        // Store user info in socket for identification?
        socket.data.user = user;
        socket.data.roomId = roomId;
        io.to(roomId).emit('notification', { text: `${user.username || 'Someone'} joined ${roomId}` });
    });

    socket.on('leave-room', (roomId) => {
        socket.leave(roomId);
        // Try to retrieve user name if stored, else generic
        const username = socket.data?.user?.username || 'Someone';
        io.to(roomId).emit('notification', { text: `${username} left the meeting` });
    });

    // Real-time Chat Persistence
    socket.on('send-message', async (data) => {
        try {
            // Check permissions
            const channel = await Channel.findOne({ name: data.roomId });
            if (!channel) {
                console.error('Channel not found:', data.roomId);
                return;
            }

            // Check if user is allowed to post
            // For public/announcement, check postingRoles. For private, check members.
            const userRole = socket.user?.role || 'user'; // socket.user set in middleware
            const userId = socket.user?.userId;

            let canPost = false;
            if (channel.type === 'private') {
                canPost = channel.members.includes(userId);
            } else {
                canPost = channel.postingRoles.includes(userRole);
            }

            // Override: Super Admin can always post
            // Admin can also post generally, but let's stick to Super Admin being absolute.
            // Actually, usually Admins can post in Announcements too.
            if (userRole === 'super_admin' || userRole === 'admin') {
                canPost = true;
            }

            if (!canPost) {
                console.warn(`User ${data.user} (role: ${userRole}) attempted to post in ${data.roomId} without permission.`);
                return; // Silently fail or emit error back to sender? Silent for now to avoid complexity in client.
            }

            // Determine initial status based on connected users
            const connectedUsers = io.sockets.adapter.rooms.get(data.roomId)?.size || 0;
            const initialStatus = connectedUsers > 1 ? 'delivered' : 'sent';

            const newMessage = new Message({
                roomId: data.roomId,
                user: data.user,
                text: data.text,
                type: data.type || 'text',
                fileUrl: data.fileUrl,
                fileName: data.fileName,
                status: initialStatus,
                readBy: initialStatus === 'delivered' ? [] : []
            });
            await newMessage.save();
            io.to(data.roomId).emit('receive-message', newMessage);
        } catch (err) {
            console.error('Error saving message:', err);
        }
    });

    socket.on('mark-room-read', async ({ roomId, username }) => {
        try {
            // Update all messages in room sent by others that are not yet read by this user
            // Simplified: Mark status 'read' if not already. Also track in readBy.
            /* 
               For group chats: A simplified model is "Blue Tick" if ANYONE reads it? 
               Or strictly if *everyone* reads it? 
               The request implies 1-on-1 style ("blue tick for read"). 
               Let's assume: If user marks read, update status to 'read'.
            */
            await Message.updateMany(
                { roomId, user: { $ne: username }, status: { $ne: 'read' } },
                { $set: { status: 'read' }, $addToSet: { readBy: username } }
            );

            // Notify room that messages were read
            io.to(roomId).emit('messages-read', { roomId, readBy: username });
        } catch (err) {
            console.error('Error marking messages as read:', err);
        }
    });

    // WebRTC Signaling
    socket.on('offer', (payload) => {
        io.to(payload.target).emit('offer', payload);
    });

    socket.on('answer', (payload) => {
        io.to(payload.target).emit('answer', payload);
    });

    socket.on('ice-candidate', (payload) => {
        io.to(payload.target).emit('ice-candidate', payload);
    });

    // Typing Indicators
    socket.on('typing', (data) => {
        socket.to(data.roomId).emit('typing', data.username);
    });

    socket.on('stop-typing', (data) => {
        socket.to(data.roomId).emit('stop-typing', data.username);
    });

    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
    });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});
