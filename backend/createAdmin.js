
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('./models/User');

dotenv.config();

async function createAdmin() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);

    const existingAdmin = await User.findOne({ username: 'admin' });

    if (existingAdmin) {
      console.log('Admin account already exists. No changes made.');
    } else {
      await User.create({
        username: 'admin',
        password: 'admin123',
        role: 'admin',
        name: 'Exam Controller',
        email: 'examcell@college.edu',
        refId: 'ADMIN01',
      });

      console.log('Admin account created successfully.');
    }
  } catch (error) {
    console.error('Admin creation failed:', error.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
}

createAdmin();
