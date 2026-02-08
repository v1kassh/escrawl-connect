const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const User = require('./models/User');
const dotenv = require('dotenv');

dotenv.config();

const createSuperAdmin = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/escrawl_connect');

        const username = 'vikash@escrawl';
        const password = 'Vikas@admin';

        // Remove existing user if exists to force update password/role
        const existingUser = await User.findOne({ username });
        if (existingUser) {
            console.log('Existing super admin found, updating...');
            existingUser.password = password; // Will be hashed by pre-save
            existingUser.role = 'super_admin';
            await existingUser.save();
            console.log('✅ Super Admin updated successfully');
        } else {
            const admin = new User({
                username,
                password,
                role: 'super_admin'
            });
            await admin.save();
            console.log('✅ Super Admin created successfully');
        }

    } catch (err) {
        console.error('❌ Error creating super admin:', err);
    } finally {
        mongoose.disconnect();
    }
};

createSuperAdmin();
