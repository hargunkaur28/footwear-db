const mongoose = require('mongoose');
require('dotenv').config();
const User = require('./models/User');

async function promoteToAdmin() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    const user = await User.findOneAndUpdate(
      { email: 'shine@test.com' }, 
      { isAdmin: true },
      { new: true }
    );
    if (user) {
      console.log(`✅ Success! ${user.name} (${user.email}) is now an Admin!`);
    } else {
      console.log('User not found.');
    }
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await mongoose.disconnect();
  }
}

promoteToAdmin();
