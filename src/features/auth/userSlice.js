import { createSlice } from '@reduxjs/toolkit';

// Helper functions for localStorage
const saveToLocalStorage = (user, keepLoggedIn) => {
  if (keepLoggedIn) {
    localStorage.setItem('userData', JSON.stringify(user));
    localStorage.setItem('keepLoggedIn', 'true');
  } else {
    // Don't remove data immediately - let it persist for current session
    // Only clear the keepLoggedIn flag so it won't persist across browser restarts
    localStorage.removeItem('keepLoggedIn');
  }
};

const loadFromLocalStorage = () => {
  try {
    const keepLoggedIn = localStorage.getItem('keepLoggedIn') === 'true';
    const userData = localStorage.getItem('userData');
    
    if (keepLoggedIn && userData) {
      return JSON.parse(userData);
    }
  } catch (error) {
    console.error('Error loading user data from localStorage:', error);
    localStorage.removeItem('userData');
    localStorage.removeItem('keepLoggedIn');
  }
  return null;
};

// Load persisted user data
const persistedUser = loadFromLocalStorage();

const initialState = {
  user: persistedUser,
  isAuthenticated: !!persistedUser,
  loading: false,
  error: null,
};

const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {
    loginStart(state) {
      state.loading = true;
      state.error = null;
    },
    login(state, action) {
      const { user, keepLoggedIn = false } = action.payload;
      state.user = user;
      state.isAuthenticated = true;
      state.loading = false;
      state.error = null;
      
      // Always save to localStorage for current session, but set persistence based on keepLoggedIn
      localStorage.setItem('userData', JSON.stringify(user));
      saveToLocalStorage(user, keepLoggedIn);
    },
    loginFailure(state, action) {
      state.loading = false;
      state.error = action.payload;
      state.user = null;
      state.isAuthenticated = false;
    },
    logout(state) {
      state.user = null;
      state.isAuthenticated = false;
      state.loading = false;
      state.error = null;
      
      // Clear localStorage
      localStorage.removeItem('userData');
      localStorage.removeItem('keepLoggedIn');
    },
    clearError(state) {
      state.error = null;
    },
    initializeAuth(state, action) {
      const { user, keepLoggedIn } = action.payload;
      state.user = user;
      state.isAuthenticated = true;
      state.loading = false;
      state.error = null;
      
      // Save to localStorage for current session
      saveToLocalStorage(user, keepLoggedIn);
    },
  },
});

export const { loginStart, login, loginFailure, logout, clearError, initializeAuth } = userSlice.actions;
export default userSlice.reducer;
