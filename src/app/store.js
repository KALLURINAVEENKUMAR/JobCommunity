import { configureStore } from '@reduxjs/toolkit';
import userReducer from '../features/auth/userSlice';
import companyReducer from '../features/company/companySlice';
import chatReducer from '../features/chat/chatSlice';

const store = configureStore({
  reducer: {
    user: userReducer,
    company: companyReducer,
    chat: chatReducer,
  },
});

export default store;
