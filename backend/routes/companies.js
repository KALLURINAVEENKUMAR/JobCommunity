const express = require('express');
const Company = require('../models/Company');

const router = express.Router();

// Get all companies
router.get('/', async (req, res) => {
  try {
    const companies = await Company.find().sort({ createdAt: -1 });
    
    // Transform to match frontend format
    const formattedCompanies = companies.map(company => ({
      id: company._id,
      name: company.name,
      description: company.description,
      memberCount: company.memberCount
    }));

    res.json(formattedCompanies);
  } catch (error) {
    console.error('Error fetching companies:', error);
    res.status(500).json({ message: 'Server error fetching companies' });
  }
});

// Add new company
router.post('/', async (req, res) => {
  try {
    const { name, description } = req.body;

    if (!name) {
      return res.status(400).json({ message: 'Company name is required' });
    }

    // Check if company already exists
    const existingCompany = await Company.findOne({ name });
    if (existingCompany) {
      return res.status(400).json({ message: 'Company already exists' });
    }

    const company = new Company({
      name,
      description: description || `Discussion forum for ${name}`,
      memberCount: 1
    });

    await company.save();

    const formattedCompany = {
      id: company._id,
      name: company.name,
      description: company.description,
      memberCount: company.memberCount
    };

    res.status(201).json(formattedCompany);
  } catch (error) {
    console.error('Error creating company:', error);
    res.status(500).json({ message: 'Server error creating company' });
  }
});

// Seed initial companies (for development)
router.post('/seed', async (req, res) => {
  try {
    const defaultCompanies = [
      { name: 'Google', description: 'Tech giant focusing on search and cloud services', memberCount: 245 },
      { name: 'Microsoft', description: 'Software and cloud computing company', memberCount: 180 },
      { name: 'Amazon', description: 'E-commerce and cloud computing platform', memberCount: 320 },
      { name: 'Apple', description: 'Consumer electronics and software company', memberCount: 156 },
      { name: 'Meta', description: 'Social media and virtual reality company', memberCount: 89 },
      { name: 'Netflix', description: 'Streaming entertainment service', memberCount: 67 },
      { name: 'Tesla', description: 'Electric vehicles and clean energy', memberCount: 123 },
      { name: 'Spotify', description: 'Music streaming platform', memberCount: 45 }
    ];

    // Only seed if no companies exist
    const existingCount = await Company.countDocuments();
    if (existingCount === 0) {
      await Company.insertMany(defaultCompanies);
      res.json({ message: 'Companies seeded successfully' });
    } else {
      res.json({ message: 'Companies already exist, skipping seed' });
    }
  } catch (error) {
    console.error('Error seeding companies:', error);
    res.status(500).json({ message: 'Server error seeding companies' });
  }
});

module.exports = router;
