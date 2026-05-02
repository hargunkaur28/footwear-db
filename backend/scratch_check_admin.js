const mongoose = require('mongoose');
require('dotenv').config();
const User = require('./models/User');

async function checkAdmins() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    
    const admins = await User.find({ isAdmin: true });
    const allUsers = await User.find({});
    
    console.log('\n--- SYSTEM USERS ---');
    console.log(`Total users registered: ${allUsers.length}`);
    
    if (admins.length > 0) {
      console.log('\n--- CURRENT ADMINS ---');
      admins.forEach(admin => {
        console.log(`Name: ${admin.name}`);
        console.log(`Email: ${admin.email}`);
        console.log('----------------------');
      });
    } else {
      console.log('\nNo admins found. The next person to register will become the admin!');
      
      if (allUsers.length > 0) {
        console.log('\nWarning: There are users in the database, but none are admins.');
        console.log('The first user is:');
        console.log(`Name: ${allUsers[0].name}, Email: ${allUsers[0].email}`);
      }
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await mongoose.disconnect();
  }
}

checkAdmins();
