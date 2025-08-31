import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { useEffect } from 'react';
import { logout, initializeAuth } from './features/auth/userSlice';
import { ThemeProvider } from './contexts/ThemeContext';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Signup from './pages/Signup';
import Login from './pages/Login';
import CompanyList from './pages/CompanyList';
import ChatRoom from './pages/ChatRoom';
import GroupManagement from './pages/GroupManagement';
import './App.css';
import './styles/modern-form.css';

function App() {
  const { isAuthenticated } = useSelector(state => state.user);
  const dispatch = useDispatch();

  // Check if the user's session is still valid on app startup and load persistent sessions
  useEffect(() => {
    const keepLoggedIn = localStorage.getItem('keepLoggedIn') === 'true';
    const userData = localStorage.getItem('userData');
    
    // If user is not authenticated but has userData, restore the session
    if (!isAuthenticated && userData) {
      try {
        const parsedUser = JSON.parse(userData);
        const tokenCreationTime = parsedUser.token ? 
          parseInt(parsedUser.token.split('_')[2]) : Date.now(); // Extract timestamp from demo token
        
        const thirtyDaysInMs = 30 * 24 * 60 * 60 * 1000;
        const isTokenExpired = Date.now() - tokenCreationTime > thirtyDaysInMs;

        if (!isTokenExpired) {
          // Restore the user session
          dispatch(initializeAuth({ user: parsedUser, keepLoggedIn }));
          console.log('Session restored from localStorage');
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

  // Handle browser close for non-persistent sessions (modified to fix login persistence)
  useEffect(() => {
    const handleBeforeUnload = () => {
      const keepLoggedIn = localStorage.getItem('keepLoggedIn') === 'true';
      // Only clear data if explicitly NOT keeping logged in and user closes browser
      // Don't clear on page refresh - this was causing the login issue
      if (isAuthenticated && !keepLoggedIn && performance.navigation?.type === 0) {
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
          <Route path="/groups" element={<GroupManagement />} />
          <Route path="/chat/group/:groupId" element={<ChatRoom />} />
        </Routes>
        <ToastContainer
          position="top-right"
          autoClose={5000}
          hideProgressBar={false}
          newestOnTop={false}
          closeOnClick
          rtl={false}
          pauseOnFocusLoss
          draggable
          pauseOnHover
          theme="light"
        />
      </Router>
    </ThemeProvider>
  );
}

export default App;
