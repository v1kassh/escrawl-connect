const mongoose = require('mongoose');
const User = require('./models/User');
const dotenv = require('dotenv');

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/escrawl_connect';

mongoose.connect(MONGO_URI)
    .then(() => console.log('✅ Connected to MongoDB'))
    .catch(err => console.error('❌ MongoDB Connection Error:', err));

const createAdmin = async () => {
    try {
        const adminExists = await User.findOne({ username: 'admin' });
        if (adminExists) {
            console.log('⚠️ Admin user already exists');
            process.exit(0);
        }

        const newAdmin = new User({
            username: 'admin',
            password: 'password123', // Very basic, should change
            role: 'admin'
        });

        await newAdmin.save();
        console.log('🎉 Admin user created successfully!');
        console.log('Username: admin');
        console.log('Password: password123');
        process.exit(0);
    } catch (err) {
        console.error('❌ Error creating admin:', err);
        process.exit(1);
    }
};

createAdmin();
