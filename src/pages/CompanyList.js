import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { setCompanies } from '../features/company/companySlice';
import { logout } from '../features/auth/userSlice';
import { useNavigate } from 'react-router-dom';
import ThemeToggle from '../components/ThemeToggle';
import UserProfile from '../components/UserProfile';
import ApiService from '../utils/apiService';

const CompanyList = () => {
  const { companies } = useSelector(state => state.company);
  const { user, isAuthenticated } = useSelector(state => state.user);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  // const { isDarkMode } = useTheme();
  
  const [showAddCompany, setShowAddCompany] = useState(false);
  const [newCompanyName, setNewCompanyName] = useState('');
  const [showProfile, setShowProfile] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const getDisplayName = (user) => {
    if (!user) return 'User';
    
    if (user.role === 'professional') {
      const companyName = user.companyName || 'Company';
      return `professional at ${companyName}`;
    } else if (user.role === 'student') {
      const collegeName = user.college || 'College';
      const prefix = user.cgpa ? 'student' : 'fresher';
      return `${prefix} from ${collegeName}`;
    }
    
    return user.name || user.email?.split('@')[0] || 'User';
  };

  // Helper function to sort companies alphabetically
  const sortCompaniesAlphabetically = (companiesArray) => {
    return [...companiesArray].sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()));
  };

  // Helper function to capitalize company names properly
  const capitalizeCompanyName = (name) => {
    return name.trim()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  };

  useEffect(() => {
    // Redirect to login if not authenticated
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    // Load companies from API
    const fetchCompanies = async () => {
      try {
        const companiesData = await ApiService.getCompanies();
        // Ensure all company names are properly capitalized
        const capitalizedCompanies = companiesData.map(company => ({
          ...company,
          name: capitalizeCompanyName(company.name)
        }));
        dispatch(setCompanies(sortCompaniesAlphabetically(capitalizedCompanies)));
      } catch (error) {
        console.error('Failed to fetch companies:', error);
        // If no companies exist, try seeding them first
        try {
          await ApiService.seedCompanies();
          const companiesData = await ApiService.getCompanies();
          const capitalizedCompanies = companiesData.map(company => ({
            ...company,
            name: capitalizeCompanyName(company.name)
          }));
          dispatch(setCompanies(sortCompaniesAlphabetically(capitalizedCompanies)));
        } catch (seedError) {
          console.error('Failed to seed companies:', seedError);
          // Fallback to minimal mock data if API fails
          const mockCompanies = [
            { id: 1, name: 'Sample Company', memberCount: 0, description: 'Example company for demonstration' }
          ];
          dispatch(setCompanies(sortCompaniesAlphabetically(mockCompanies)));
        }
      }
    };

    fetchCompanies();
  }, [isAuthenticated, navigate, dispatch]);

  const handleAddCompany = async () => {
    if (newCompanyName.trim()) {
      const capitalizedName = capitalizeCompanyName(newCompanyName);
      
      // Check if company already exists (case-insensitive)
      const existingCompany = companies.find(company => 
        company.name.toLowerCase() === capitalizedName.toLowerCase()
      );
      
      if (existingCompany) {
        // Show user-friendly message and auto-search for the existing company
        window.showToast?.(`Company "${capitalizedName}" already exists! We've searched it for you below.`, 'info');
        setSearchTerm(capitalizedName);
        setNewCompanyName('');
        setShowAddCompany(false);
        return;
      }
      
      try {
        
        const newCompany = await ApiService.createCompany({
          name: capitalizedName,
          description: `Discussion forum for ${capitalizedName}`
        });

        dispatch(setCompanies(sortCompaniesAlphabetically([...companies, newCompany])));
        setNewCompanyName('');
        setShowAddCompany(false);
        
        // Navigate to the new company's chat room
        navigate(`/chat/${newCompany.id}`);
      } catch (error) {
        console.error('Error creating company:', error);
        alert('Failed to create company. Please try again.');
      }
    }
  };

  const handleCompanyClick = (companyId) => {
    navigate(`/chat/${companyId}`);
  };

  const handleLogoutClick = () => {
    setShowLogoutConfirm(true);
  };

  const handleConfirmLogout = () => {
    dispatch(logout());
    setShowLogoutConfirm(false);
  };

  const handleCancelLogout = () => {
    setShowLogoutConfirm(false);
  };

  const filteredCompanies = companies.filter(company =>
    company.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div 
      className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-gray-900 dark:via-slate-900 dark:to-indigo-950 transition-colors duration-300 relative overflow-hidden"
      style={{ 
        overscrollBehavior: 'none',
        touchAction: 'pan-x pan-y'
      }}
    >
      {/* Enhanced background with animated patterns */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-purple-500/5 to-indigo-500/10 dark:from-blue-400/10 dark:via-purple-400/10 dark:to-indigo-400/15"></div>
      
      <ThemeToggle />
      
      {/* Enhanced Fixed Header */}
      <div className="fixed top-0 left-0 right-0 z-40 bg-gradient-to-r from-white/95 via-blue-50/90 to-purple-50/95 dark:from-gray-800/95 dark:via-gray-850/90 dark:to-gray-900/95 backdrop-blur-xl shadow-xl border-b border-blue-200/60 dark:border-gray-700/60">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 via-purple-500/5 to-indigo-500/5 dark:from-blue-400/10 dark:via-purple-400/10 dark:to-indigo-400/10"></div>
        
        <div className="w-full px-3 sm:px-6 lg:px-8 relative z-10">
          <div className="flex justify-between items-center py-4 sm:py-6">
            <div className="flex items-center space-x-2 sm:space-x-4 min-w-0 flex-1">
              <div className="flex items-center space-x-2 sm:space-x-3 min-w-0">
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center flex-shrink-0">
                  <svg className="w-4 h-4 sm:w-6 sm:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
                <div className="min-w-0">
                  <h1 className="text-lg sm:text-2xl lg:text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent truncate">
                    Navinity
                  </h1>
                  <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-1 truncate">
                    Connect with professionals and discover career opportunities
                  </p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-1 sm:space-x-4 ml-2">
              <div className="hidden md:flex items-center space-x-3 px-2 sm:px-4 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
                <div className="w-6 h-6 sm:w-8 sm:h-8 bg-gradient-to-r from-green-400 to-blue-500 rounded-full flex items-center justify-center">
                  <span className="text-white font-semibold text-xs sm:text-sm">
                    {(user?.name || user?.email || 'U').charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="flex flex-col">
                  <span className="text-xs sm:text-sm font-medium text-gray-900 dark:text-gray-100">
                    Welcome back, {user?.name || user?.email?.split('@')[0] || 'User'}!
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-32">
                    {getDisplayName(user)}
                  </span>
                </div>
              </div>
              
              <button
                onClick={() => setShowProfile(true)}
                className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white px-3 sm:px-6 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all duration-200 transform hover:scale-105 shadow-lg"
              >
                <span className="hidden sm:inline">Profile</span>
                <span className="sm:hidden">👤</span>
              </button>
              
              <button
                onClick={handleLogoutClick}
                className="text-gray-500 hover:text-red-500 dark:text-gray-400 dark:hover:text-red-400 transition-colors duration-200 p-1.5 sm:p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                title="Logout"
              >
                <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content with top padding to account for fixed header */}
      <div className="pt-24 sm:pt-28 w-full px-3 sm:px-6 lg:px-8">
        
        {/* Search Section with Improved Spacing */}
        <div className="flex flex-col items-center mb-12 py-8">
          {/* Search Bar Container */}
          <div className="w-full max-w-2xl mb-6">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <svg className="h-6 w-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                type="text"
                placeholder="Search companies..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-6 py-4 text-lg border border-gray-300 dark:border-gray-600 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 transition-all duration-300 shadow-lg hover:shadow-xl"
              />
            </div>
          </div>
          
          {/* Add Company Button */}
          <button
            onClick={() => setShowAddCompany(true)}
            className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white px-8 py-4 rounded-xl font-semibold flex items-center transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl"
          >
            <svg className="w-6 h-6 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
            </svg>
            Add New Company
          </button>
        </div>

        {/* Companies Grid with Better Spacing */}
        <div className="px-3 sm:px-6 lg:px-8 pb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredCompanies.map((company) => (
            <div
              key={company.id}
              onClick={() => handleCompanyClick(company.id)}
              className="group bg-white dark:bg-gray-800 rounded-xl shadow-lg hover:shadow-xl dark:shadow-gray-900/50 transition-all duration-300 cursor-pointer border border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600 transform hover:scale-105"
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center shadow-lg">
                      <span className="text-white font-bold text-lg">
                        {company.name.charAt(0)}
                      </span>
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                      {company.name}
                    </h3>
                  </div>
                </div>
                
                <div className="flex items-center text-sm text-gray-500 dark:text-gray-400 mb-4">
                  <div className="flex items-center">
                    <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></div>
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    {company.memberCount > 0 ? `${company.memberCount} members online` : 'New community - Be the first to join!'}
                  </div>
                </div>
                
                <p className="text-gray-600 dark:text-gray-300 text-sm mb-6 leading-relaxed">
                  {company.description}
                </p>
                
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gradient-to-r from-green-100 to-emerald-100 text-green-800 dark:from-green-900/50 dark:to-emerald-900/50 dark:text-green-300">
                    <div className="w-1.5 h-1.5 bg-green-500 rounded-full mr-2"></div>
                    Active Now
                  </span>
                  <button className="inline-flex items-center text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 text-sm font-semibold group-hover:text-blue-700 transition-colors">
                    Join Discussion 
                    <svg className="ml-1 w-4 h-4 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {filteredCompanies.length === 0 && (
          <div className="text-center py-16">
            <div className="mx-auto w-24 h-24 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800 rounded-full flex items-center justify-center mb-6">
              <svg className="w-12 h-12 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-4m-5 0H9m0 0H7m2 0v-6a2 2 0 012-2h2a2 2 0 012 2v6m-6 0v-4" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">No companies found</h3>
            <p className="text-gray-500 dark:text-gray-400 mb-6 max-w-md mx-auto">
              {searchTerm ? 'Try adjusting your search terms to find the companies you\'re looking for' : 'Get started by adding your first company to build the community'}
            </p>
            {!searchTerm && (
              <button
                onClick={() => setShowAddCompany(true)}
                className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-medium rounded-lg transition-all duration-200 transform hover:scale-105 shadow-lg"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                </svg>
                Add Your First Company
              </button>
            )}
          </div>
        )}
        </div>
      </div>

      {/* Add Company Modal */}
      {showAddCompany && (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-75 backdrop-blur-sm overflow-y-auto h-full w-full z-50 flex items-center justify-center">
          <div className="relative p-6 border border-gray-200 dark:border-gray-700 w-full max-w-md shadow-2xl rounded-2xl bg-white dark:bg-gray-800 mx-4">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">Add New Company</h3>
              <button
                onClick={() => {
                  setShowAddCompany(false);
                  setNewCompanyName('');
                }}
                className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 transition-colors p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="mb-6">
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Company Name
              </label>
              <input
                type="text"
                value={newCompanyName}
                onChange={(e) => setNewCompanyName(e.target.value)}
                placeholder="Enter company name..."
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 transition-all duration-200"
                onKeyPress={(e) => e.key === 'Enter' && handleAddCompany()}
                autoFocus
              />
              {newCompanyName.trim() && (
                <div className="mt-2">
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Will be displayed as: <span className="font-semibold text-gray-700 dark:text-gray-300">{capitalizeCompanyName(newCompanyName)}</span>
                  </p>
                  {(() => {
                    const capitalizedName = capitalizeCompanyName(newCompanyName);
                    const existingCompany = companies.find(company => 
                      company.name.toLowerCase() === capitalizedName.toLowerCase()
                    );
                    
                    if (existingCompany) {
                      return (
                        <p className="text-sm text-red-600 dark:text-red-400 mt-1 flex items-center">
                          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.963-.833-2.732 0L4.082 15.5c-.77.833.192 2.5 1.732 2.5z" />
                          </svg>
                          This company already exists! Use search to find it.
                        </p>
                      );
                    }
                    return null;
                  })()}
                </div>
              )}
            </div>
            
            <div className="flex space-x-3">
              <button
                onClick={handleAddCompany}
                disabled={!newCompanyName.trim() || (() => {
                  const capitalizedName = capitalizeCompanyName(newCompanyName);
                  return companies.some(company => 
                    company.name.toLowerCase() === capitalizedName.toLowerCase()
                  );
                })()}
                className="flex-1 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 disabled:from-gray-300 disabled:to-gray-400 text-white py-3 px-4 rounded-lg font-medium transition-all duration-200 transform hover:scale-105 disabled:transform-none disabled:cursor-not-allowed shadow-lg disabled:shadow-none"
              >
                Add & Join
              </button>
              <button
                onClick={() => {
                  setShowAddCompany(false);
                  setNewCompanyName('');
                }}
                className="px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 font-medium transition-all duration-200"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Logout Confirmation Modal */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-75 backdrop-blur-sm overflow-y-auto h-full w-full z-50 flex items-center justify-center">
          <div className="relative p-6 border border-gray-200 dark:border-gray-700 w-full max-w-md shadow-2xl rounded-2xl bg-white dark:bg-gray-800 mx-4">
            <div className="flex items-center justify-center mb-6">
              <div className="w-16 h-16 bg-gradient-to-br from-red-100 to-red-200 dark:from-red-900/50 dark:to-red-800/50 rounded-full flex items-center justify-center mb-4">
                <svg className="w-8 h-8 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </div>
            </div>
            
            <div className="text-center mb-6">
              <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                Confirm Logout
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Are you sure you want to logout? You will need to sign in again to access your account.
              </p>
            </div>
            
            <div className="flex space-x-3">
              <button
                onClick={handleCancelLogout}
                className="flex-1 px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 font-medium transition-all duration-200"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmLogout}
                className="flex-1 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white py-3 px-4 rounded-lg font-medium transition-all duration-200 transform hover:scale-105 shadow-lg"
              >
                Yes, Logout
              </button>
            </div>
          </div>
        </div>
      )}

      {/* User Profile Modal */}
      <UserProfile 
        isOpen={showProfile} 
        onClose={() => setShowProfile(false)} 
      />
    </div>
  );
};

export default CompanyList;
