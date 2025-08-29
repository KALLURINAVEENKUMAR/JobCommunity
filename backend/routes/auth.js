const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Company = require('../models/Company');

const router = express.Router();

// Register
router.post('/register', async (req, res) => {
  try {
    const { email, password, confirmPassword, role, companyName, college, cgpa, skills } = req.body;

    // Validation
    if (!email || !password || !role) {
      return res.status(400).json({ message: 'Email, password, and role are required' });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ message: 'Passwords do not match' });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Create user data object
    const userData = {
      email,
      password,
      name: email.split('@')[0], // Default name from email
      role
    };

    // Add role-specific fields
    if (role === 'professional') {
      if (!companyName) {
        return res.status(400).json({ message: 'Company name is required for professionals' });
      }
      userData.companyName = companyName;
      
      // Auto-create company if it doesn't exist
      try {
        const existingCompany = await Company.findOne({ 
          name: { $regex: new RegExp(`^${companyName}$`, 'i') } 
        });
        
        if (!existingCompany) {
          const newCompany = new Company({
            name: companyName,
            description: `Professional discussion room for ${companyName}. Connect with colleagues and job seekers interested in ${companyName}.`,
            memberCount: 1
          });
          await newCompany.save();
          console.log(`✅ Auto-created company: ${companyName}`);
        } else {
          // Increment member count
          existingCompany.memberCount += 1;
          await existingCompany.save();
          console.log(`✅ Updated member count for ${companyName}: ${existingCompany.memberCount}`);
        }
      } catch (companyError) {
        console.error('Error creating/updating company:', companyError);
        // Continue with user creation even if company creation fails
      }
    } else if (role === 'student') {
      if (!college || !cgpa) {
        return res.status(400).json({ message: 'College and CGPA are required for students' });
      }
      userData.college = college;
      userData.cgpa = parseFloat(cgpa);
      userData.skills = skills ? skills.split(',').map(skill => skill.trim()) : [];
    }

    // Create user
    const user = new User(userData);
    await user.save();

    // Generate JWT token
    const token = jwt.sign(
      { userId: user._id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Return user data (excluding password)
    const userResponse = {
      id: user._id,
      email: user.email,
      name: user.name,
      role: user.role,
      ...(user.role === 'professional' ? { companyName: user.companyName } : {
        college: user.college,
        cgpa: user.cgpa,
        skills: user.skills
      }),
      token
    };

    res.status(201).json({ message: 'User registered successfully', user: userResponse });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Server error during registration' });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: 'Invalid email or password' });
    }

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid email or password' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user._id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Return user data (excluding password)
    const userResponse = {
      id: user._id,
      email: user.email,
      name: user.name,
      role: user.role,
      ...(user.role === 'professional' ? { companyName: user.companyName } : {
        college: user.college,
        cgpa: user.cgpa,
        skills: user.skills
      }),
      token
    };

    res.json({ message: 'Login successful', user: userResponse });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error during login' });
  }
});

module.exports = router;
