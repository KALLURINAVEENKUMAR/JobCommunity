import React, { useState } from 'react';
import { useDispatch } from 'react-redux';
import { login } from '../features/auth/userSlice';
import { useNavigate } from 'react-router-dom';
import ThemeToggle from '../components/ThemeToggle';
import ApiService from '../utils/apiService';

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
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

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
          firstName: formData.firstName,
          lastName: formData.lastName,
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

        const data = await ApiService.register(userData);

        // Registration successful, login user automatically
        // Generate a token for the user
        const userWithToken = {
          ...data.user,
          token: `demo_token_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        };
        
        dispatch(login({ user: userWithToken, keepLoggedIn: true }));
        window.showToast?.('Account created successfully! Welcome! 🎉', 'success');
        navigate('/companies');
      } catch (error) {
        console.error('Registration error:', error);
        setErrors({ general: error.message || 'Registration failed' });
      }
    }
  };

  return (
    <div className="auth-container">
      <ThemeToggle />
      
      <div className="auth-form-wrapper">
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
            
            <label className="modern-label relative">
              <input
                className="modern-input"
                type={showPassword ? "text" : "password"}
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                required
              />
              <span>Password</span>
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
              >
                {showPassword ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
            </label>
            {errors.password && <p className="modern-error">{errors.password}</p>}
            
            <label className="modern-label relative">
              <input
                className="modern-input"
                type={showConfirmPassword ? "text" : "password"}
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleInputChange}
                required
              />
              <span>Confirm password</span>
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
              >
                {showConfirmPassword ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
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
