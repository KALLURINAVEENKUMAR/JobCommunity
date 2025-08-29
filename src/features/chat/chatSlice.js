import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  messages: [],
};

const chatSlice = createSlice({
  name: 'chat',
  initialState,
  reducers: {
    setMessages(state, action) {
      state.messages = action.payload;
    },
    addMessage(state, action) {
      state.messages.push(action.payload);
    },
    editMessage(state, action) {
      const { messageId, text, editedAt } = action.payload;
      const messageIndex = state.messages.findIndex(msg => msg.id === messageId);
      if (messageIndex !== -1) {
        state.messages[messageIndex].text = text;
        state.messages[messageIndex].isEdited = true;
        state.messages[messageIndex].editedAt = editedAt;
      }
    },
    deleteMessage(state, action) {
      const messageId = action.payload;
      state.messages = state.messages.filter(msg => msg.id !== messageId);
    },
    clearMessages(state) {
      state.messages = [];
    },
  },
});

export const { setMessages, addMessage, editMessage, deleteMessage, clearMessages } = chatSlice.actions;
export default chatSlice.reducer;
