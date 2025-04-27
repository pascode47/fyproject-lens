const mongoose = require('mongoose');
require('dotenv').config();

// Import the Programme model
const { Programme } = require('../models');

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch((err) => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });

// Define the programmes to seed
const programmes = [
  { abbreviation: 'BSc CS', fullName: 'Bachelor of Science in Computer Science', discipline: 'Computer Science' },
  { abbreviation: 'BSc IS', fullName: 'Bachelor of Science in Information Systems', discipline: 'Computer Science' },
  { abbreviation: 'BSc SE', fullName: 'Bachelor of Science in Software Engineering', discipline: 'Computer Science' },
  { abbreviation: 'BSc IT', fullName: 'Bachelor of Science in Information Technology', discipline: 'Information Technology' },
  { abbreviation: 'BSc NS', fullName: 'Bachelor of Science in Network Security', discipline: 'Information Technology' },
  { abbreviation: 'BSc CE', fullName: 'Bachelor of Science in Computer Engineering', discipline: 'Engineering' },
  { abbreviation: 'BSc EE', fullName: 'Bachelor of Science in Electrical Engineering', discipline: 'Engineering' }
];

// Seed the database
const seedDatabase = async () => {
  try {
    // Clear existing programmes
    await Programme.deleteMany({});
    console.log('Cleared existing programmes');

    // Insert new programmes
    const result = await Programme.insertMany(programmes);
    console.log(`Seeded ${result.length} programmes`);

    // Log the created programmes
    console.log('Created programmes:');
    result.forEach(prog => {
      console.log(`- ${prog.abbreviation}: ${prog._id}`);
    });

    // Disconnect from MongoDB
    mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  } catch (error) {
    console.error('Error seeding database:', error);
    mongoose.disconnect();
    process.exit(1);
  }
};

// Run the seed function
seedDatabase();
