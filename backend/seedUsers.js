require('dotenv').config();

const mongoose = require('mongoose');

const bcrypt = require('bcryptjs');

const connectDB = require('./config/db');

const User = require('./models/User');

/*
 * ==========================================
 * Seed Demo Users
 * ==========================================
 * Creates the three role accounts used to
 * explore the platform:
 *   admin  → admin@krishibandhu.com  / Admin123
 *   farmer → farmer@krishibandhu.com / Farmer123
 *   trader → trader@krishibandhu.com / Trader123
 *
 * Idempotent — re-running will not create
 * duplicates.
 */

const USERS = [
  {
    name: 'Nagpur Admin',
    email: 'admin@krishibandhu.com',
    phone: '9890000001',
    password: 'Admin123',
    role: 'admin',
    location: {
      city: 'Nagpur',
      district: 'Nagpur',
      state: 'Maharashtra',
    },
    isActive: true,
    isVerified: true,
  },
  {
    name: 'Ramesh Patil',
    email: 'farmer@krishibandhu.com',
    phone: '9890000002',
    password: 'Farmer123',
    role: 'farmer',
    location: {
      city: 'Wardha',
      district: 'Wardha',
      state: 'Maharashtra',
    },
    isActive: true,
    isVerified: true,
  },
  {
    name: 'Sunil Traders',
    email: 'trader@krishibandhu.com',
    phone: '9890000003',
    password: 'Trader123',
    role: 'trader',
    location: {
      city: 'Nagpur',
      district: 'Nagpur',
      state: 'Maharashtra',
    },
    isActive: true,
    isVerified: true,
  },
];

const seedUsers = async () => {
  try {
    await connectDB();

    console.log('');
    console.log('👤 Seeding Demo Users');
    console.log('--------------------------------');

    let addedCount = 0;

    for (const data of USERS) {
      const exists = await User.findOne({
        email: data.email,
      });

      if (exists) {
        console.log(`  ⏭  Skipped (exists): ${data.email}`);
        continue;
      }

      const hashedPassword = await bcrypt.hash(
        data.password,
        10,
      );

      await User.create({
        ...data,
        password: hashedPassword,
      });

      console.log(`  ✅ Created: ${data.email} (${data.role})`);
      addedCount += 1;
    }

    console.log('--------------------------------');
    console.log(`🎉 User seeding completed! Created: ${addedCount}`);
  } catch (error) {
    console.error('❌ User seeding failed:', error.message);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
  }
};

seedUsers();