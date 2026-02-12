const mongoose = require('mongoose');
const User = require('../models/User');
require('dotenv').config();

const createAdminUsers = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/animeverse');
    console.log('Connected to MongoDB');

    // Create admin user
    const adminExists = await User.findOne({ email: 'admin@animeverse.com' });
    if (!adminExists) {
      const admin = await User.create({
        username: 'admin',
        email: 'admin@animeverse.com',
        password: 'admin123',
        role: 'admin'
      });
      console.log('Admin user created:', admin.username);
    } else {
      console.log('Admin user already exists');
    }

    // Create moderator user
    const moderatorExists = await User.findOne({ email: 'moderator@animeverse.com' });
    if (!moderatorExists) {
      const moderator = await User.create({
        username: 'moderator',
        email: 'moderator@animeverse.com',
        password: 'moderator123',
        role: 'moderator'
      });
      console.log('Moderator user created:', moderator.username);
    } else {
      console.log('Moderator user already exists');
    }

    console.log('\n=== Login Credentials ===');
    console.log('Admin:');
    console.log('  Email: admin@animeverse.com');
    console.log('  Password: admin123');
    console.log('\nModerator:');
    console.log('  Email: moderator@animeverse.com');
    console.log('  Password: moderator123');

  } catch (error) {
    console.error('Error creating admin users:', error);
  } finally {
    await mongoose.disconnect();
  }
};

createAdminUsers();
