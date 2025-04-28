// Script to create an admin user
require('dotenv').config();
const mongoose = require('mongoose');
const { User, Programme } = require('../models');

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch((err) => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });

// Admin user details
const adminDetails = {
  name: 'paschal admin', // Updated name
  email: 'pbadmin@udom.com', // Updated email
  password: 'Godslove2755', // Using provided password
  registrationNo: 'T00-00-00000', // Updated registration number
  role: 'admin',
  status: 'active'
};

// Function to create admin user
async function createAdminUser() {
  try {
    // Check if admin user already exists
    const existingAdmin = await User.findOne({ email: adminDetails.email });

    if (existingAdmin) {
      console.log(`Admin user with email ${adminDetails.email} already exists.`);
      process.exit(0);
    }
    
    // Check if we have any programmes in the database
    let programme = await Programme.findOne();
    
    // If no programme exists, create a default one
    if (!programme) {
      programme = await Programme.create({
        abbreviation: 'ADMIN',
        fullName: 'Administrator Programme',
        discipline: 'Administration'
      });
      console.log('Created default programme for admin user');
    }

    // Log details just before creating
    console.log('Admin details before create:', adminDetails);
    
    // Create admin user
    const adminUser = await User.create({
      ...adminDetails,
      programme: programme._id
    });
    
    console.log('Admin user created successfully:');
    console.log(`Name: ${adminUser.name}`);
    console.log(`Email: ${adminUser.email}`);
    console.log(`Role: ${adminUser.role}`);
    console.log(`Status: ${adminUser.status}`);
    
    process.exit(0);
  } catch (error) {
    console.error('Error creating admin user:', error);
    process.exit(1);
  }
}

// Run the function
createAdminUser();
