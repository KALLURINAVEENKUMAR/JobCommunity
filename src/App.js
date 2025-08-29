import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { useEffect } from 'react';
import { logout, initializeAuth } from './features/auth/userSlice';
import { ThemeProvider } from './contexts/ThemeContext';
import Signup from './pages/Signup';
import Login from './pages/Login';
import CompanyList from './pages/CompanyList';
import ChatRoom from './pages/ChatRoom';
import './App.css';
import './styles/modern-form.css';

function App() {
  const { isAuthenticated } = useSelector(state => state.user);
  const dispatch = useDispatch();

  // Check if the user's session is still valid on app startup and load persistent sessions
  useEffect(() => {
    const keepLoggedIn = localStorage.getItem('keepLoggedIn') === 'true';
    const userData = localStorage.getItem('userData');
    
    // If user is not authenticated but has userData and keepLoggedIn was checked, restore the session
    if (!isAuthenticated && userData && keepLoggedIn) {
      try {
        const parsedUser = JSON.parse(userData);
        const tokenCreationTime = parsedUser.token ? 
          parseInt(parsedUser.token.split('_')[2]) : Date.now(); // Extract timestamp from demo token
        
        const thirtyDaysInMs = 30 * 24 * 60 * 60 * 1000;
        const isTokenExpired = Date.now() - tokenCreationTime > thirtyDaysInMs;

        if (!isTokenExpired) {
          // Restore the user session
          dispatch(initializeAuth({ user: parsedUser, keepLoggedIn }));
        } else {
          console.log('Token expired, clearing data...');
          dispatch(logout());
        }
      } catch (error) {
        console.error('Error checking token validity:', error);
        dispatch(logout());
      }
    }
    
    // If user is authenticated but keepLoggedIn is false, don't logout immediately
    // Let them continue their current session, but don't persist it on browser restart
  }, [isAuthenticated, dispatch]);

  // Handle browser close for non-persistent sessions
  useEffect(() => {
    const handleBeforeUnload = () => {
      const keepLoggedIn = localStorage.getItem('keepLoggedIn') === 'true';
      if (isAuthenticated && !keepLoggedIn) {
        // Clear session data for non-persistent logins
        localStorage.removeItem('userData');
        localStorage.removeItem('keepLoggedIn');
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [isAuthenticated]);

  return (
    <ThemeProvider>
      <Router>
        <Routes>
          <Route path="/" element={isAuthenticated ? <Navigate to="/companies" /> : <Navigate to="/login" />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/login" element={<Login />} />
          <Route path="/companies" element={<CompanyList />} />
          <Route path="/chat/:companyId" element={<ChatRoom />} />
        </Routes>
      </Router>
    </ThemeProvider>
  );
}

export default App;
