import React, { useState } from 'react';
import { useDispatch } from 'react-redux';
import { login } from '../features/auth/userSlice';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';
import ThemeToggle from '../components/ThemeToggle';

const Signup = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  // const { isDarkMode } = useTheme();
  
  const [role, setRole] = useState('');
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    // Professional fields
    companyName: '',
    // Student fields
    college: '',
    cgpa: '',
    skills: ''
  });
  const [errors, setErrors] = useState({});

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    // Name validations
    if (!formData.firstName) {
      newErrors.firstName = 'First name is required';
    }

    if (!formData.lastName) {
      newErrors.lastName = 'Last name is required';
    }

    // Common validations
    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    // Role-specific validations
    if (role === 'professional') {
      if (!formData.companyName) {
        newErrors.companyName = 'Company name is required';
      }
    } else if (role === 'student') {
      if (!formData.college) {
        newErrors.college = 'College name is required';
      }
      if (!formData.cgpa) {
        newErrors.cgpa = 'CGPA is required';
      } else if (isNaN(formData.cgpa) || formData.cgpa < 0 || formData.cgpa > 10) {
        newErrors.cgpa = 'CGPA must be a number between 0 and 10';
      }
      if (!formData.skills) {
        newErrors.skills = 'Skills are required';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!role) {
      setErrors({ role: 'Please select a role' });
      return;
    }

    if (validateForm()) {
      try {
        // Prepare user data for API
        const userData = {
          email: formData.email,
          password: formData.password,
          confirmPassword: formData.confirmPassword,
          role: role,
          ...(role === 'professional' ? { 
            companyName: formData.companyName 
          } : {
            college: formData.college,
            cgpa: formData.cgpa,
            skills: formData.skills
          })
        };

        const response = await fetch('http://localhost:5000/api/auth/register', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(userData),
        });

        const data = await response.json();

        if (response.ok) {
          // Registration successful, login user automatically
          // Generate a token for the user
          const userWithToken = {
            ...data.user,
            token: `demo_token_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
          };
          
          dispatch(login({ user: userWithToken, keepLoggedIn: true }));
          window.showToast?.('Account created successfully! Welcome! 🎉', 'success');
          navigate('/companies');
        } else {
          setErrors({ general: data.message || 'Registration failed' });
        }
      } catch (error) {
        console.error('Registration error:', error);
        console.log('Backend not available, creating demo account...');
        
        // Create a demo user when backend is not available
        const demoUser = {
          id: Date.now(),
          email: formData.email,
          role: role,
          token: `demo_token_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          ...(role === 'professional' ? { 
            companyName: formData.companyName,
            name: formData.email.split('@')[0]
          } : {
            college: formData.college,
            cgpa: formData.cgpa,
            skills: formData.skills.split(',').map(skill => skill.trim()),
            name: formData.email.split('@')[0]
          })
        };

        dispatch(login({ user: demoUser, keepLoggedIn: true }));
        window.showToast?.('Demo account created! You can explore the app. 🚀', 'success');
        navigate('/companies');
      }
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 transition-colors duration-300">
      <ThemeToggle />
      
      <div className="w-full max-w-md">
        <div className="modern-form">
          <form onSubmit={handleSubmit}>
            <p className="modern-title">Register</p>
            <p className="modern-message">Signup now and get full access to our app.</p>
            
            <div className="modern-flex">
              <label className="modern-label">
                <input
                  className="modern-input"
                  type="text"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleInputChange}
                  required
                />
                <span>Firstname</span>
              </label>

              <label className="modern-label">
                <input
                  className="modern-input"
                  type="text"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleInputChange}
                  required
                />
                <span>Lastname</span>
              </label>
            </div>
            
            {(errors.firstName || errors.lastName) && (
              <div className="modern-error-box">
                {errors.firstName && <p>{errors.firstName}</p>}
                {errors.lastName && <p>{errors.lastName}</p>}
              </div>
            )}
            
            <label className="modern-label">
              <input
                className="modern-input"
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                required
              />
              <span>Email</span>
            </label>
            {errors.email && <p className="modern-error">{errors.email}</p>}
            
            <label className="modern-label">
              <input
                className="modern-input"
                type="password"
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                required
              />
              <span>Password</span>
            </label>
            {errors.password && <p className="modern-error">{errors.password}</p>}
            
            <label className="modern-label">
              <input
                className="modern-input"
                type="password"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleInputChange}
                required
              />
              <span>Confirm password</span>
            </label>
            {errors.confirmPassword && <p className="modern-error">{errors.confirmPassword}</p>}

            {/* Role Selection */}
            <div className="modern-role-section">
              <p className="modern-role-label">I am a:</p>
              <div className="modern-radio-group">
                <label className="modern-radio">
                  <input
                    type="radio"
                    name="role"
                    value="professional"
                    checked={role === 'professional'}
                    onChange={(e) => setRole(e.target.value)}
                  />
                  <span>Professional</span>
                </label>
                <label className="modern-radio">
                  <input
                    type="radio"
                    name="role"
                    value="student"
                    checked={role === 'student'}
                    onChange={(e) => setRole(e.target.value)}
                  />
                  <span>Student/Fresher</span>
                </label>
              </div>
              {errors.role && <p className="modern-error">{errors.role}</p>}
            </div>

            {/* Professional fields */}
            {role === 'professional' && (
              <label className="modern-label">
                <input
                  className="modern-input"
                  type="text"
                  name="companyName"
                  value={formData.companyName}
                  onChange={handleInputChange}
                  required
                />
                <span>Company Name</span>
              </label>
            )}
            {role === 'professional' && errors.companyName && (
              <p className="modern-error">{errors.companyName}</p>
            )}

            {/* Student fields */}
            {role === 'student' && (
              <>
                <label className="modern-label">
                  <input
                    className="modern-input"
                    type="text"
                    name="college"
                    value={formData.college}
                    onChange={handleInputChange}
                    required
                  />
                  <span>College Name</span>
                </label>
                {errors.college && <p className="modern-error">{errors.college}</p>}

                <label className="modern-label">
                  <input
                    className="modern-input"
                    type="number"
                    name="cgpa"
                    value={formData.cgpa}
                    onChange={handleInputChange}
                    step="0.01"
                    min="0"
                    max="10"
                    required
                  />
                  <span>CGPA</span>
                </label>
                {errors.cgpa && <p className="modern-error">{errors.cgpa}</p>}

                <label className="modern-label">
                  <input
                    className="modern-input"
                    type="text"
                    name="skills"
                    value={formData.skills}
                    onChange={handleInputChange}
                    required
                  />
                  <span>Skills (comma-separated)</span>
                </label>
                {errors.skills && <p className="modern-error">{errors.skills}</p>}
              </>
            )}

            {errors.general && (
              <div className="modern-error-box">
                <p>{errors.general}</p>
              </div>
            )}
            
            <button type="submit" className="modern-submit">
              Submit
            </button>
            
            <p className="modern-signin">
              Already have an account? 
              <button 
                type="button"
                onClick={() => navigate('/login')}
                className="modern-link"
              >
                Signin
              </button>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Signup;
