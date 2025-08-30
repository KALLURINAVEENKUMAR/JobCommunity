import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { login, loginStart, loginFailure } from '../features/auth/userSlice';
import { useNavigate } from 'react-router-dom';
import ThemeToggle from '../components/ThemeToggle';
import ApiService from '../utils/apiService';

const Login = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { loading } = useSelector(state => state.user);
  // const { isDarkMode } = useTheme();
  
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    keepLoggedIn: false
  });
  const [validationErrors, setValidationErrors] = useState({});

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    // Clear validation error when user starts typing
    if (validationErrors[name]) {
      setValidationErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateForm = () => {
    const errors = {};
    
    if (!formData.email) {
      errors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      errors.email = 'Email format is invalid';
    }
    
    if (!formData.password) {
      errors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      errors.password = 'Password must be at least 6 characters';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    console.log('Login attempt with:', { email: formData.email, keepLoggedIn: formData.keepLoggedIn });
    
    dispatch(loginStart());
    
    try {
      const data = await ApiService.login({
        email: formData.email,
        password: formData.password
      });
      
      console.log('Login successful:', data);
        
      // Ensure the user object has a token
      const userWithToken = {
        ...data.user,
        token: data.token || data.user.token
      };
      
      dispatch(login({ user: userWithToken, keepLoggedIn: formData.keepLoggedIn }));
      window.showToast?.('Login successful! Welcome back! 🎉', 'success');
      navigate('/companies');
      
    } catch (error) {
      console.error('Login error:', error);
      dispatch(loginFailure(error.message || 'Login failed'));
      setValidationErrors({ general: error.message || 'Login failed' });
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 transition-colors duration-300">
      <ThemeToggle />
      
      <div className="w-full max-w-md">
        <div className="modern-form">
          <form onSubmit={handleSubmit}>
            <p className="modern-title">Login</p>
            <p className="modern-message">Welcome back! Please sign in to your account.</p>
            
            <label className="modern-label">
              <input
                className="modern-input"
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
              />
              <span>Email</span>
            </label>
            {validationErrors.email && (
              <p className="modern-error">{validationErrors.email}</p>
            )}
            
            <label className="modern-label">
              <input
                className="modern-input"
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                required
              />
              <span>Password</span>
            </label>
            {validationErrors.password && (
              <p className="modern-error">{validationErrors.password}</p>
            )}

            {/* Keep me logged in checkbox */}
            <div className="flex items-center justify-between mb-6">
              <label className="flex items-center cursor-pointer group">
                <div className="relative">
                  <input
                    type="checkbox"
                    name="keepLoggedIn"
                    checked={formData.keepLoggedIn}
                    onChange={handleChange}
                    className="sr-only"
                  />
                  <div className={`w-5 h-5 rounded border-2 transition-all duration-200 flex items-center justify-center ${
                    formData.keepLoggedIn
                      ? 'bg-gradient-to-r from-blue-500 to-purple-600 border-blue-500 scale-105'
                      : 'border-gray-300 dark:border-gray-600 hover:border-blue-400 dark:hover:border-blue-500'
                  }`}>
                    {formData.keepLoggedIn && (
                      <svg className="w-3 h-3 text-white animate-in zoom-in-50 duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path>
                      </svg>
                    )}
                  </div>
                </div>
                <span className="ml-3 text-sm font-medium text-gray-700 dark:text-gray-300 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors duration-200">
                  Keep me logged in
                </span>
              </label>
              <button
                type="button"
                className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-500 dark:hover:text-blue-300 transition-colors duration-200"
                onClick={() => {/* Add forgot password functionality later */}}
              >
                Forgot password?
              </button>
            </div>

            {validationErrors.general && (
              <div className="modern-error-box">
                <p>{validationErrors.general}</p>
              </div>
            )}
            
            <button 
              type="submit" 
              className="modern-submit"
              disabled={loading}
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
            
            <p className="modern-signin">
              Don't have an account? 
              <button 
                type="button"
                onClick={() => navigate('/signup')}
                className="modern-link"
              >
                Sign up
              </button>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;
