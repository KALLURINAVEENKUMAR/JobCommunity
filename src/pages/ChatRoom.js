import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { setMessages, addMessage, editMessage, deleteMessage, clearMessages } from '../features/chat/chatSlice';
import { setCompanies } from '../features/company/companySlice';
import { io } from 'socket.io-client';
import { toast } from 'react-toastify';
import UserProfile from '../components/UserProfile';
import ApiService from '../utils/apiService';

const ChatRoom = () => {
  const { companyId } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { user, isAuthenticated } = useSelector(state => state.user);
  const { messages } = useSelector(state => state.chat);
  const { companies } = useSelector(state => state.company);
  // const { theme } = useTheme();
  
  const [newMessage, setNewMessage] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingMessageId, setEditingMessageId] = useState(null);
  const [editingText, setEditingText] = useState('');
  const [showUserProfile, setShowUserProfile] = useState(false);
  // const [showClearTooltip, setShowClearTooltip] = useState(false);
  const [showClearPopup, setShowClearPopup] = useState(false);
  const [showNotificationPopup, setShowNotificationPopup] = useState(false);
  const [showOtherUserProfile, setShowOtherUserProfile] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  
  // User tagging states
  const [showUserSuggestions, setShowUserSuggestions] = useState(false);
  const [userSuggestions, setUserSuggestions] = useState([]);
  const [allUsers, setAllUsers] = useState([]); // All users in the database
  
  // Reply states
  const [replyingTo, setReplyingTo] = useState(null);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(0);
  
  const messagesEndRef = useRef(null);
  const socketRef = useRef(null);
  const messageInputRef = useRef(null);
  const localMessageIds = useRef(new Set()); // Track locally sent messages to prevent duplicates

  const currentCompany = companies.find(c => 
    c.id === parseInt(companyId) || 
    c._id === companyId || 
    c.id === companyId
  );

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    // Load companies first, then messages and socket
    const initializeChat = async () => {
      setIsLoading(true);
      
      try {
        // Load companies if not already loaded
        let currentCompanies = companies;
        if (companies.length === 0) {
          currentCompanies = await loadCompanies();
        }
        
        // Find the company for this chat
        const company = currentCompanies.find(c => 
          c.id === companyId || 
          c._id === companyId || 
          c.id === parseInt(companyId)
        );
        
        if (!company) {
          console.error('Company not found:', companyId);
          setIsLoading(false);
          return;
        }
        
        // Load messages and initialize socket
        await loadMessages();
        initializeSocket();
      } catch (error) {
        console.error('Error initializing chat:', error);
      }
      
      setIsLoading(false);
    };

    initializeChat();

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [isAuthenticated, navigate, companyId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Clear local message tracking when changing companies
  useEffect(() => {
    localMessageIds.current.clear();
  }, [companyId]);

  // Save messages to localStorage whenever they change (for frontend-only companies)
  useEffect(() => {
    if (messages.length > 0) {
      saveMessagesToLocalStorage(messages);
    }
  }, [messages, companyId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Handle mention detection
  const handleMentionDetection = (inputValue, cursorPosition) => {
    const textBeforeCursor = inputValue.substring(0, cursorPosition);
    const mentionMatch = textBeforeCursor.match(/@(\w*)$/);
    
    if (mentionMatch) {
      const query = mentionMatch[1].toLowerCase();
      
      // Filter users based on query
      const filtered = allUsers.filter(user => 
        user.name.toLowerCase().includes(query) || 
        user.email.toLowerCase().includes(query)
      );
      setUserSuggestions(filtered.slice(0, 10)); // Limit to 10 suggestions
      setShowUserSuggestions(true);
      setSelectedSuggestionIndex(0); // Reset selection to first item
    } else {
      setShowUserSuggestions(false);
      setUserSuggestions([]);
      setSelectedSuggestionIndex(0);
    }
  };

  // Handle user selection from mention suggestions
  const handleUserMention = (selectedUser) => {
    console.log('handleUserMention called with:', selectedUser);
    
    const messageInput = messageInputRef.current;
    const currentValue = newMessage; // Use state value instead of input value
    const cursorPosition = messageInput.selectionStart;
    
    console.log('Current message value:', currentValue);
    console.log('Cursor position:', cursorPosition);
    
    // Find the @ position
    const textBeforeCursor = currentValue.substring(0, cursorPosition);
    const mentionMatch = textBeforeCursor.match(/@(\w*)$/);
    
    console.log('Text before cursor:', textBeforeCursor);
    console.log('Mention match:', mentionMatch);
    
    if (mentionMatch) {
      const mentionStart = cursorPosition - mentionMatch[0].length;
      const beforeMention = currentValue.substring(0, mentionStart);
      const afterCursor = currentValue.substring(cursorPosition);
      
      const mentionText = `@${selectedUser.name} `;
      const newValue = beforeMention + mentionText + afterCursor;
      const newCursorPos = mentionStart + mentionText.length;
      
      console.log('New message value:', newValue);
      
      // Update the state instead of directly changing input value
      setNewMessage(newValue);
      
      // Set cursor position after state update
      setTimeout(() => {
        messageInput.focus();
        messageInput.setSelectionRange(newCursorPos, newCursorPos);
      }, 0);
      
      setShowUserSuggestions(false);
      setUserSuggestions([]);
      setSelectedSuggestionIndex(0);
    } else {
      console.log('No mention match found, adding mention at end');
      // If no @ found, just add the mention at the current position
      const mentionText = `@${selectedUser.name} `;
      const beforeCursor = currentValue.substring(0, cursorPosition);
      const afterCursor = currentValue.substring(cursorPosition);
      const newValue = beforeCursor + mentionText + afterCursor;
      
      setNewMessage(newValue);
      
      setTimeout(() => {
        messageInput.focus();
        messageInput.setSelectionRange(cursorPosition + mentionText.length, cursorPosition + mentionText.length);
      }, 0);
      
      setShowUserSuggestions(false);
      setUserSuggestions([]);
      setSelectedSuggestionIndex(0);
    }
  };

  // Load all users for mentions from database
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        if (user && user.token) {
          const users = await ApiService.getAllUsers(user.token);
          setAllUsers(users);
          console.log(`✅ Loaded ${users.length} users for mentions`);
        }
      } catch (error) {
        console.error('Failed to fetch users for mentions:', error);
        // Fallback to empty array if API fails
        setAllUsers([]);
        toast.error('Failed to load users for mentions');
      }
    };

    fetchUsers();
  }, [user]);

  // Render message text with highlighted mentions
  const renderMessageWithMentions = (text) => {
    const mentionRegex = /@(\w+(?:\s+\w+)*)/g;
    const parts = [];
    let lastIndex = 0;
    let match;

    while ((match = mentionRegex.exec(text)) !== null) {
      // Add text before mention
      if (match.index > lastIndex) {
        parts.push(text.slice(lastIndex, match.index));
      }
      
      // Add mention with highlighting
      const mentionedName = match[1];
      const isCurrentUser = user?.name && user.name.toLowerCase() === mentionedName.toLowerCase();
      
      parts.push(
        <span 
          key={match.index}
          className={`inline-block px-2 py-1 mx-0.5 rounded-md text-sm font-medium cursor-pointer transition-all duration-200 hover:scale-105 shadow-sm ${
            isCurrentUser 
              ? 'bg-blue-600 text-white shadow-md ring-1 ring-blue-500' 
              : 'bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-900/60 ring-1 ring-blue-300 dark:ring-blue-700'
          }`}
          title={isCurrentUser ? "That's you!" : `Mentioned: ${mentionedName}`}
          onClick={() => {
            if (!isCurrentUser) {
              // Could add profile viewing functionality here
              console.log(`Clicked on mention: ${mentionedName}`);
            }
          }}
        >
          @{mentionedName}
        </span>
      );
      
      lastIndex = match.index + match[0].length;
    }
    
    // Add remaining text
    if (lastIndex < text.length) {
      parts.push(text.slice(lastIndex));
    }
    
    return parts.length > 1 ? parts : text;
  };

  const initializeSocket = () => {
    // Disconnect any existing socket first
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }

    console.log('🔌 Initializing new socket connection');
    
    // Connect to backend Socket.IO server
    const socketUrl = process.env.REACT_APP_SOCKET_URL || 'http://localhost:5000';
    socketRef.current = io(socketUrl, {
      query: {
        userId: user?.id || user?.email,
        userName: user?.name || user?.email,
        userRole: user?.role,
        companyId: companyId
      }
    });

    socketRef.current.on('connect', () => {
      setIsConnected(true);
      console.log('Connected to Socket.IO server');
      
      // Join the company room
      socketRef.current.emit('join-company', {
        companyId: companyId,
        user: user
      });
    });

    socketRef.current.on('disconnect', () => {
      setIsConnected(false);
    });

    // Listen for new messages
    socketRef.current.on('new-message', (message) => {
      console.log('📨 Received new message:', message);
      
      // Check if this message was already added locally to prevent duplicates
      if (localMessageIds.current.has(message.id)) {
        console.log('🔄 Skipping duplicate message:', message.id);
        return;
      }
      
      dispatch(addMessage(message));
      
      // Show notification if message is from another user
      if (message.userId !== (user?.id || user?.email)) {
        // Check if current user is mentioned
        const isUserMentioned = message.mentions && message.mentions.some(mention => 
          mention.userEmail === user?.email || mention.userName.toLowerCase() === user?.name?.toLowerCase()
        );
        
        if (isUserMentioned) {
          // Special notification for mentions
          toast.success(`🏷️ ${message.userName} mentioned you in ${message.companyName || 'chat'}!`, {
            duration: 6000,
            position: 'top-right'
          });
        } else if (message.isInterviewHelp && user?.role === 'professional') {
          // Special notification for interview help
          showInterviewHelpNotification(message);
        } else {
          // Regular notification
          showNotification(message);
        }
      }
    });

    // Listen for special interview help notifications
    socketRef.current.on('interview-help-notification', (data) => {
      showInterviewHelpNotification(data.message, data.companyName, data.studentName);
    });

    // Listen for message edits
    socketRef.current.on('message-edited', (data) => {
      console.log('📝 Message edited:', data);
      dispatch(editMessage({
        messageId: data.messageId,
        text: data.text,
        editedAt: data.editedAt
      }));
    });

    // Listen for message deletions
    socketRef.current.on('message-deleted', (data) => {
      console.log('🗑️ Message deleted:', data);
      dispatch(deleteMessage(data.messageId));
    });

    // Listen for online users updates
    socketRef.current.on('online-users', (users) => {
      setOnlineUsers(users);
    });

    socketRef.current.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      setIsConnected(false);
    });
  };

  const loadCompanies = async () => {
    try {
      const companies = await ApiService.getCompanies();
      dispatch(setCompanies(companies));
      return companies; // Return companies for use in initialization
    } catch (error) {
      console.error('Error loading companies:', error);
      // Fallback to mock data
      const mockCompanies = [
        { id: 1, name: 'Google', memberCount: 245, description: 'Tech giant focusing on search and cloud services' },
        { id: 2, name: 'Microsoft', memberCount: 180, description: 'Software and cloud computing company' },
        { id: 3, name: 'Amazon', memberCount: 320, description: 'E-commerce and cloud computing platform' },
        { id: 4, name: 'Apple', memberCount: 156, description: 'Consumer electronics and software company' }
      ];
      dispatch(setCompanies(mockCompanies));
      return mockCompanies;
    }
  };

  // Helper function to save messages to localStorage for frontend-only companies
  const saveMessagesToLocalStorage = (messages) => {
    try {
      const localStorageKey = `messages_${companyId}`;
      localStorage.setItem(localStorageKey, JSON.stringify(messages));
      console.log(`💾 Saved ${messages.length} messages to localStorage for company ${companyId}`);
    } catch (error) {
      console.error('Failed to save messages to localStorage:', error);
    }
  };

  const loadMessages = async () => {
    try {
      const messagesData = await ApiService.getMessages(companyId);
      dispatch(setMessages(messagesData));
      return;
    } catch (error) {
      console.error('Failed to load messages from API:', error);
    }
    
    // Fallback: Load messages from localStorage for frontend-only companies
    const localStorageKey = `messages_${companyId}`;
    const savedMessages = localStorage.getItem(localStorageKey);
    
    if (savedMessages) {
      try {
        const parsedMessages = JSON.parse(savedMessages);
        console.log(`📱 Loaded ${parsedMessages.length} messages from localStorage for company ${companyId}`);
        dispatch(setMessages(parsedMessages));
        return;
      } catch (parseError) {
        console.error('Failed to parse saved messages:', parseError);
      }
    }
    
    // If no saved messages, load welcome message
    const mockMessages = [
      {
        id: 1,
        text: `Welcome to the discussion room! 🎉`,
        userId: 'system',
        userName: 'System',
        userRole: 'system',
        timestamp: Date.now() - 3600000,
        companyId: companyId
      }
    ];
    dispatch(setMessages(mockMessages));
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    
    if (!newMessage.trim()) return;

    // Parse mentions from the message
    const mentionRegex = /@(\w+(?:\s+\w+)*)/g;
    const mentions = [];
    let match;
    
    while ((match = mentionRegex.exec(newMessage)) !== null) {
      const mentionedName = match[1];
      const mentionedUser = allUsers.find(user => 
        user.name.toLowerCase() === mentionedName.toLowerCase()
      );
      if (mentionedUser) {
        mentions.push({
          userId: mentionedUser.id,
          userName: mentionedUser.name,
          userEmail: mentionedUser.email
        });
      }
    }

    const messageData = {
      id: Date.now(),
      text: newMessage.trim(),
      userId: user?.id || user?.email,
      userName: user?.name || user?.email,
      userRole: user?.role,
      userEmail: user?.email,
      companyName: user?.companyName,
      college: user?.college,
      timestamp: Date.now(),
      companyId: companyId, // Keep as original format from URL
      mentions: mentions, // Add mentions to message data
      replyTo: replyingTo ? {
        messageId: replyingTo.id,
        text: replyingTo.text,
        userName: replyingTo.userName,
        userId: replyingTo.userId
      } : null
    };

    try {
      // Send to backend API first
      await ApiService.sendMessage(messageData);

      console.log('📤 Sending message via API:', messageData);
      if (mentions.length > 0) {
        console.log('👥 Message contains mentions:', mentions);
      }
      console.log('✅ API success, emitting via socket');
      // Only emit via socket - don't add to local state
      // Socket.IO will broadcast the message back to all clients including sender
      if (socketRef.current) {
        socketRef.current.emit('send-message', messageData);
      }
    } catch (error) {
      console.error('❌ API error, using fallback for frontend-only company:', error);
      // Fallback for when backend is not available
      // Track this message ID to prevent duplicates when it comes back via socket
      localMessageIds.current.add(messageData.id);
      
      dispatch(addMessage(messageData));
      if (socketRef.current) {
        socketRef.current.emit('send-message', messageData);
      }
    }
    
    setNewMessage('');
    setShowUserSuggestions(false);
    setReplyingTo(null); // Clear reply after sending
    setSelectedSuggestionIndex(0);
  };

  const startEditMessage = (messageId, currentText) => {
    setEditingMessageId(messageId);
    setEditingText(currentText);
  };

  const cancelEdit = () => {
    setEditingMessageId(null);
    setEditingText('');
  };

  const saveEdit = async (messageId) => {
    if (!editingText.trim()) return;

    try {
      // Call API to edit message
      await ApiService.editMessage(messageId, {
        text: editingText.trim(),
        userId: user?.id || user?.email
      });

      // Emit via socket for real-time updates
      if (socketRef.current) {
        socketRef.current.emit('edit-message', {
          messageId,
          newText: editingText.trim(),
          userId: user?.id || user?.email,
          companyId: companyId
        });
      }
      cancelEdit();
    } catch (error) {
      console.error('Failed to edit message:', error);
      alert('Failed to edit message. Please try again.');
    }
  };

  const deleteMessageHandler = async (messageId) => {
    if (!window.confirm('Are you sure you want to delete this message?')) return;

    try {
      // Call API to delete message
      await ApiService.deleteMessage(messageId);
      
      // Emit via socket for real-time updates
      if (socketRef.current) {
        socketRef.current.emit('delete-message', {
          messageId,
          userId: user?.id || user?.email,
          companyId: companyId
        });
      }
    } catch (error) {
      console.error('Failed to delete message:', error);
      alert('Failed to delete message. Please try again.');
    }
  };

  const clearChatHandler = () => {
    setShowClearPopup(true);
  };

  const confirmClearChat = () => {
    dispatch(clearMessages());
    setShowClearPopup(false);
  };

  const cancelClearChat = () => {
    setShowClearPopup(false);
  };

  const showNotification = (message) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(`New message in ${currentCompany?.name}`, {
        body: `${message.userName}: ${message.text}`,
        icon: '/logo192.png',
        badge: '/logo192.png'
      });
    }
  };

  const showInterviewHelpNotification = (message, companyName, studentName) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      // Special notification for interview help requests
      const notification = new Notification(`🚨 Interview Help Request - ${companyName || currentCompany?.name}`, {
        body: `${studentName || message.userName} needs interview guidance:\n"${message.text}"`,
        icon: '/logo192.png',
        badge: '/logo192.png',
        tag: 'interview-help',
        requireInteraction: true, // Keep notification visible until user interacts
      });

      // Play a sound (if available)
      try {
        const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmIcBjiS2/LNeysFJYTO8dLQASoHJZO/8dPUASv/I5O+8dPRAZQ==');
        audio.play().catch(() => {});
      } catch (e) {}

      // Auto-close after 10 seconds
      setTimeout(() => {
        notification.close();
      }, 10000);
    }
  };

  const requestNotificationPermission = () => {
    setShowNotificationPopup(true);
  };

  const confirmEnableNotifications = () => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().then(permission => {
        if (permission === 'granted') {
          new Notification('Notifications enabled!', {
            body: 'You will now receive chat notifications.',
            icon: '/logo192.png'
          });
        }
      });
    }
    setShowNotificationPopup(false);
  };

  const cancelNotifications = () => {
    setShowNotificationPopup(false);
  };

  const handleUserProfileClick = (message) => {
    // Don't show profile for own messages or system messages
    if (message.userId === user?.id || message.userId === user?.email || message.userRole === 'system') {
      return;
    }
    
    // Create user object from message data
    const messageUser = {
      id: message.userId,
      name: message.userName,
      email: message.userEmail || `${message.userName}@unknown.com`,
      role: message.userRole,
      companyName: message.companyName,
      college: message.college
    };
    
    setSelectedUser(messageUser);
    setShowOtherUserProfile(true);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // const getRoleColor = (role) => {
  //   switch (role) {
  //     case 'professional': return 'text-blue-600';
  //     case 'student': return 'text-green-600';
  //     case 'system': return 'text-gray-500';
  //     default: return 'text-gray-800';
  //   }
  // };

  // const getRoleBadge = (role) => {
  //   switch (role) {
  //     case 'professional': return 'bg-blue-100 text-blue-800';
  //     case 'student': return 'bg-green-100 text-green-800';
  //     default: return 'bg-gray-100 text-gray-800';
  //   }
  // };

  const getDisplayName = (user) => {
    if (!user) return '';
    
    const userName = user.name || user.email?.split('@')[0] || 'User';
    
    if (user.role === 'professional') {
      const companyName = user.companyName || 'Company';
      return `professional at ${companyName}`;
    } else if (user.role === 'student') {
      const collegeName = user.college || 'College';
      const prefix = user.cgpa ? 'student' : 'fresher';
      return `${prefix} from ${collegeName}`;
    }
    
    return userName;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-gradient-to-r from-blue-500 to-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-300 animate-pulse">Loading chat room...</p>
        </div>
      </div>
    );
  }

  if (!currentCompany) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center">
        <div className="text-center bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700">
          <div className="text-6xl mb-4">🏢</div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">Company not found</h2>
          <p className="text-gray-600 dark:text-gray-300 mb-6">The discussion room you're looking for doesn't exist.</p>
          <button
            onClick={() => navigate('/companies')}
            className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white px-6 py-3 rounded-lg font-medium transition-all duration-200 transform hover:scale-105 shadow-lg"
          >
            ← Back to Companies
          </button>
        </div>
      </div>
    );
  }

  // Swipe and Reply Functions
  const handleSwipeStart = (messageId, e) => {
    const touch = e.touches[0];
    const message = e.currentTarget;
    message.startX = touch.clientX;
    message.startTime = Date.now();
  };

  const handleSwipeMove = (messageId, e) => {
    const touch = e.touches[0];
    const message = e.currentTarget;
    if (!message.startX) return;

    const diffX = touch.clientX - message.startX;
    const maxSwipe = 80;
    
    if (diffX > 0 && diffX <= maxSwipe) {
      message.style.transform = `translateX(${diffX}px)`;
      message.style.backgroundColor = diffX > 40 ? 'rgba(59, 130, 246, 0.1)' : 'transparent';
    }
  };

  const handleSwipeEnd = (message, e) => {
    const touch = e.changedTouches[0];
    const messageElement = e.currentTarget;
    if (!messageElement.startX) return;

    const diffX = touch.clientX - messageElement.startX;
    const timeDiff = Date.now() - messageElement.startTime;
    
    // Reset transform
    messageElement.style.transform = 'translateX(0)';
    messageElement.style.backgroundColor = 'transparent';
    
    // If swiped right more than 60px and quickly (under 300ms)
    if (diffX > 60 && timeDiff < 300) {
      setReplyingTo(message);
      messageInputRef.current?.focus();
    }
    
    // Clean up
    delete messageElement.startX;
    delete messageElement.startTime;
  };

  const cancelReply = () => {
    setReplyingTo(null);
  };

  const isOwnMessage = (message) => {
    return message.userId === user?.id || message.userId === user?.email;
  };

  return (
    <div className="h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg shadow-lg border-b border-gray-200/50 dark:border-gray-700/50 flex-shrink-0">
        <div className="w-full px-3 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-3 sm:py-6">
            <div className="flex items-center min-w-0 flex-1">
              <button
                onClick={() => navigate('/companies')}
                className="mr-2 sm:mr-4 p-1.5 sm:p-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-all duration-200 flex-shrink-0"
              >
                <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path>
                </svg>
              </button>
              <div className="min-w-0 flex-1">
                <h1 className="text-base sm:text-xl lg:text-2xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 dark:from-blue-400 dark:via-purple-400 dark:to-indigo-400 bg-clip-text text-transparent truncate">
                  {currentCompany.name} Discussion Room
                </h1>
                <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 mt-1 truncate">
                  {user?.role === 'student' 
                    ? `Ask ${currentCompany.name} employees for interview help and guidance`
                    : `Help job seekers and share insights about ${currentCompany.name}`
                  }
                </p>
                <div className="flex items-center space-x-3 sm:space-x-6 text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-2">
                  <div className="flex items-center space-x-1 sm:space-x-2">
                    <div className="flex -space-x-1">
                      {onlineUsers.slice(0, 3).map((user, index) => (
                        <div 
                          key={index} 
                          className="w-4 h-4 sm:w-6 sm:h-6 rounded-full bg-gradient-to-r from-blue-400 to-purple-500 border-2 border-white dark:border-gray-800 flex items-center justify-center text-xs font-medium text-white"
                        >
                          {(user.firstName || user.name)?.charAt(0).toUpperCase() || 'U'}
                        </div>
                      ))}
                    </div>
                    <span className="font-medium">{onlineUsers.length} online</span>
                  </div>
                  <div className={`flex items-center space-x-1 sm:space-x-2 px-2 py-1 rounded-full transition-all ${
                    isConnected 
                      ? 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300' 
                      : 'bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300'
                  }`}>
                    <div className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full animate-pulse ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
                    <span className="font-medium text-xs">{isConnected ? 'Connected' : 'Disconnected'}</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-1 sm:space-x-3 ml-2">
              <button
                onClick={clearChatHandler}
                className="flex items-center space-x-1 text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 text-xs sm:text-sm p-2 sm:p-3 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-all duration-200 group"
                title="Clear Chat"
              >
                <svg className="w-3 h-3 sm:w-4 sm:h-4 group-hover:scale-110 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                </svg>
                <span className="hidden sm:inline">Clear</span>
              </button>
              <button
                onClick={requestNotificationPermission}
                className="flex items-center space-x-1 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 text-xs sm:text-sm p-2 sm:p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-all duration-200 group"
                title="Enable Notifications"
              >
                <svg className="w-3 h-3 sm:w-4 sm:h-4 group-hover:scale-110 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-5 5-5-5h5zM5.868 14.756a7.986 7.986 0 0 1 1.555-9.902M18.132 14.756a7.986 7.986 0 0 0-1.555-9.902M12 2.5a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-1 0V3a.5.5 0 0 1 .5-.5zM7.05 4.343a.5.5 0 0 1 .707 0l.707.707a.5.5 0 1 1-.707.707l-.707-.707a.5.5 0 0 1 0-.707zM16.95 4.343a.5.5 0 0 1 0 .707l-.707.707a.5.5 0 1 1-.707-.707l.707-.707a.5.5 0 0 1 .707 0z"/>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-5 5-5-5h5zM15 17h5l-5 5-5-5h5z"/>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12a3 3 0 016 0c0 1.657-.895 3-2 3s-2-1.343-2-3z"/>
                </svg>
                <span className="hidden sm:inline">Notify</span>
              </button>
              <div className="flex items-center space-x-2 sm:space-x-3 pl-2 sm:pl-3 border-l border-gray-200 dark:border-gray-700">
                <button
                  onClick={() => setShowUserProfile(true)}
                  className="flex items-center space-x-2 sm:space-x-3 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-all duration-200 group"
                  title="View Profile"
                >
                  <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center text-white font-medium text-xs sm:text-sm flex-shrink-0 group-hover:scale-110 transition-transform duration-200">
                    {(user?.firstName || user?.name || user?.email)?.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-xs sm:text-sm font-medium text-gray-900 dark:text-gray-100 hidden md:inline truncate max-w-32 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                    {getDisplayName(user)}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-hidden bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 min-h-0">
        <div className="h-full w-full px-2 sm:px-4 lg:px-8">
          <div className="h-full flex flex-col">
            {/* Messages List */}
            <div className="flex-1 overflow-y-auto py-3 sm:py-6 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600 scroll-smooth"
                 style={{ maxHeight: 'calc(100vh - 200px)' }}>
              <div className="min-h-full space-y-2 sm:space-y-3">
              {messages.map((message) => {
                const isInterviewHelp = message.userRole === 'student' && 
                  (message.text.toLowerCase().includes('interview') || 
                   message.text.toLowerCase().includes('help') ||
                   message.text.toLowerCase().includes('tomorrow') ||
                   message.text.toLowerCase().includes('guidance'));
                
                const isOwn = isOwnMessage(message);
                
                return (
                  <div 
                    key={message.id} 
                    className={`flex mb-2 sm:mb-3 px-2 sm:px-4 ${isOwn ? 'justify-end' : 'justify-start'}`}
                    onTouchStart={(e) => handleSwipeStart(message.id, e)}
                    onTouchMove={(e) => handleSwipeMove(message.id, e)}
                    onTouchEnd={(e) => handleSwipeEnd(message, e)}
                  >
                    <div className={`max-w-xs sm:max-w-md lg:max-w-lg xl:max-w-xl rounded-2xl px-3 sm:px-4 py-2 sm:py-3 shadow-md transition-all duration-200 transform hover:scale-105 ${
                      isOwn 
                        ? 'bg-blue-500 text-white ml-8 sm:ml-16 rounded-br-md' 
                        : 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 mr-8 sm:mr-16 rounded-bl-md border border-gray-200 dark:border-gray-600'
                    } ${isInterviewHelp && !isOwn ? 'border-l-4 border-amber-400 bg-gradient-to-r from-amber-50/50 to-yellow-50/50 dark:from-amber-900/20 dark:to-yellow-900/20' : ''}`}>
                    
                    {/* Reply indicator */}
                    {message.replyTo && (
                      <div className={`mb-2 pb-2 border-l-2 pl-3 text-xs opacity-70 ${
                        isOwn ? 'border-white/50' : 'border-gray-400 dark:border-gray-500'
                      }`}>
                        <div className="font-medium">{message.replyTo.userName}</div>
                        <div className="truncate">{message.replyTo.text}</div>
                      </div>
                    )}
                    
                    {/* User name for other's messages */}
                    {!isOwn && (
                      <div className="flex items-center mb-1">
                        <button
                          onClick={() => handleUserProfileClick(message)}
                          className={`font-semibold text-xs truncate transition-colors duration-200 hover:underline ${
                            message.userRole === 'professional' ? 'text-blue-600 dark:text-blue-400' :
                            message.userRole === 'student' ? 'text-green-600 dark:text-green-400' : 
                            'text-gray-500 dark:text-gray-400'
                          } ${message.userRole === 'system' ? 'cursor-default' : 'cursor-pointer'}`}
                          disabled={message.userRole === 'system'}
                        >
                          {message.userName}
                        </button>
                        {message.userRole !== 'system' && (
                          <span className={`ml-2 px-2 py-0.5 text-xs rounded-full font-medium ${
                            message.userRole === 'professional' 
                              ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300' 
                              : 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300'
                          }`}>
                            {message.userRole}
                          </span>
                        )}
                        {isInterviewHelp && (
                          <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-gradient-to-r from-amber-400 to-orange-500 text-white font-bold">
                            🚨 Help
                          </span>
                        )}
                      </div>
                    )}
                    
                    {/* Message content */}
                    {editingMessageId === message.id ? (
                      <div className="w-full">
                        <input
                          type="text"
                          value={editingText}
                          onChange={(e) => setEditingText(e.target.value)}
                          onKeyPress={(e) => e.key === 'Enter' && saveEdit(message.id)}
                          className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                          autoFocus
                        />
                        <div className="flex space-x-2 mt-2">
                          <button
                            onClick={() => saveEdit(message.id)}
                            className="text-xs bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded-lg transition-colors"
                          >
                            Save
                          </button>
                          <button
                            onClick={cancelEdit}
                            className="text-xs bg-gray-500 hover:bg-gray-600 text-white px-3 py-1 rounded-lg transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <div className={`text-sm leading-relaxed ${isOwn ? 'text-white' : ''}`}>
                          {renderMessageWithMentions(message.text)}
                        </div>
                        <div className={`flex items-center justify-between mt-1 text-xs ${
                          isOwn ? 'text-white/70' : 'text-gray-500 dark:text-gray-400'
                        }`}>
                          <span>{formatTime(message.timestamp)}</span>
                          <div className="flex items-center space-x-1">
                            {message.isEdited && (
                              <span className={`${isOwn ? 'text-white/70' : 'text-gray-500'}`}>
                                ✏️ edited
                              </span>
                            )}
                            {/* Edit/Delete buttons for own messages */}
                            {isOwn && message.userRole !== 'system' && (
                              <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity ml-2">
                                <button
                                  onClick={() => startEditMessage(message.id, message.text)}
                                  className="text-white/70 hover:text-white p-1 rounded transition-colors"
                                  title="Edit message"
                                >
                                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                                  </svg>
                                </button>
                                <button
                                  onClick={() => deleteMessageHandler(message.id)}
                                  className="text-white/70 hover:text-white p-1 rounded transition-colors"
                                  title="Delete message"
                                >
                                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                                  </svg>
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {/* Interview Help Call-to-Action for professionals */}
                    {isInterviewHelp && !isOwn && user?.role === 'professional' && (
                      <div className="mt-3 bg-blue-50/80 dark:bg-blue-900/20 p-3 rounded-lg border border-blue-200/50 dark:border-blue-800/50">
                        <div className="flex items-start space-x-2">
                          <div className="text-lg">💡</div>
                          <div>
                            <p className="text-xs font-medium text-blue-900 dark:text-blue-100 mb-1">
                              <strong>Quick Response Opportunity:</strong>
                            </p>
                            <p className="text-xs text-blue-800 dark:text-blue-200">
                              Share your {currentCompany?.name} experience or offer guidance!
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
              </div>
            </div>

            {/* Message Input Area */}
            <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg border-t border-gray-200/50 dark:border-gray-700/50 p-3 sm:p-6 shadow-lg flex-shrink-0">
              
              {/* Reply Preview */}
              {replyingTo && (
                <div className="mb-3 bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500 p-3 rounded-r-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="text-xs font-medium text-blue-700 dark:text-blue-300 mb-1">
                        Replying to {replyingTo.userName}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400 truncate">
                        {replyingTo.text}
                      </div>
                    </div>
                    <button
                      onClick={cancelReply}
                      className="ml-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                      </svg>
                    </button>
                  </div>
                </div>
              )}

              {/* Message Input Form */}
              <form onSubmit={sendMessage} className="flex space-x-2 sm:space-x-4">
                <div className="flex-1 relative">
                  <input
                    ref={messageInputRef}
                    type="text"
                    value={newMessage}
                    onChange={(e) => {
                      const newValue = e.target.value;
                      setNewMessage(newValue);
                      handleMentionDetection(newValue, e.target.selectionStart);
                    }}
                    onKeyDown={(e) => {
                      if (showUserSuggestions && userSuggestions.length > 0) {
                        switch (e.key) {
                          case 'ArrowUp':
                            e.preventDefault();
                            setSelectedSuggestionIndex(prev => 
                              prev > 0 ? prev - 1 : userSuggestions.length - 1
                            );
                            break;
                          case 'ArrowDown':
                            e.preventDefault();
                            setSelectedSuggestionIndex(prev => 
                              prev < userSuggestions.length - 1 ? prev + 1 : 0
                            );
                            break;
                          case 'Enter':
                            e.preventDefault();
                            if (userSuggestions[selectedSuggestionIndex]) {
                              handleUserMention(userSuggestions[selectedSuggestionIndex]);
                            }
                            break;
                          case 'Escape':
                            setShowUserSuggestions(false);
                            setUserSuggestions([]);
                            setSelectedSuggestionIndex(0);
                            break;
                          default:
                            // Reset selection when typing
                            setSelectedSuggestionIndex(0);
                            break;
                        }
                      }
                    }}
                    onSelect={(e) => {
                      // Handle cursor position changes for mention detection
                      handleMentionDetection(e.target.value, e.target.selectionStart);
                    }}
                    placeholder={
                      isConnected 
                        ? user?.role === 'student' 
                          ? "Ask for interview help, share experiences... (Use @ to mention someone)" 
                          : "Share insights, help candidates... (Use @ to mention someone)" 
                        : "Connecting..."
                    }
                    disabled={!isConnected}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-xl sm:rounded-2xl px-3 sm:px-6 py-2.5 sm:py-4 pr-8 sm:pr-12 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 dark:disabled:bg-gray-700 bg-white/90 dark:bg-gray-700/90 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 backdrop-blur-sm transition-all duration-200 shadow-lg hover:shadow-xl text-sm sm:text-base"
                  />
                  
                  {/* User Suggestions Dropdown for Mentions - Slack Style */}
                  {showUserSuggestions && userSuggestions.length > 0 && (
                    <div className="absolute bottom-full left-0 right-0 mb-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-xl max-h-60 overflow-y-auto z-50 backdrop-blur-sm">
                      <div className="p-2 border-b border-gray-100 dark:border-gray-700">
                        <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                          People you can mention
                        </div>
                      </div>
                      {userSuggestions.map((suggestedUser, index) => (
                        <button
                          key={suggestedUser.id}
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            console.log('Clicking on user:', suggestedUser.name);
                            handleUserMention(suggestedUser);
                          }}
                          onMouseDown={(e) => {
                            e.preventDefault(); // Prevent input blur
                          }}
                          className={`w-full text-left px-3 py-2 flex items-center space-x-3 transition-colors duration-150 group ${
                            index === selectedSuggestionIndex 
                              ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-200' 
                              : 'hover:bg-blue-50 dark:hover:bg-blue-900/20'
                          }`}
                        >
                          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center text-white text-sm font-semibold shadow-sm">
                            {suggestedUser.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-gray-900 dark:text-gray-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                              {suggestedUser.name}
                            </div>
                            <div className="text-sm text-gray-500 dark:text-gray-400 truncate">
                              @{suggestedUser.name.toLowerCase().replace(/\s+/g, '')} • {suggestedUser.email}
                            </div>
                          </div>
                          <div className="text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path>
                            </svg>
                          </div>
                        </button>
                      ))}
                      <div className="p-2 border-t border-gray-100 dark:border-gray-700">
                        <div className="text-xs text-gray-400 dark:text-gray-500">
                          Type to search or use ↑↓ to navigate
                        </div>
                      </div>
                    </div>
                  )}
                  <div className="absolute right-2 sm:right-4 top-1/2 transform -translate-y-1/2">
                    <svg className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z"></path>
                    </svg>
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={!newMessage.trim() || !isConnected}
                  className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed text-white px-4 sm:px-8 py-2.5 sm:py-4 rounded-xl sm:rounded-2xl font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200 transform hover:scale-105 disabled:transform-none shadow-lg hover:shadow-xl disabled:shadow-none text-sm sm:text-base"
                >
                  <span className="flex items-center space-x-1 sm:space-x-2">
                    <span>Send</span>
                    <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"></path>
                    </svg>
                  </span>
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>

      {/* User Profile Modal */}
      <UserProfile 
        isOpen={showUserProfile} 
        onClose={() => setShowUserProfile(false)} 
      />

      {/* Clear Chat Confirmation Popup */}
      {showClearPopup && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4">
          <div className="relative w-full max-w-md mx-auto">
            <div className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-xl shadow-2xl rounded-2xl border border-gray-200/50 dark:border-gray-700/50 overflow-hidden">
              {/* Header */}
              <div className="bg-gradient-to-r from-red-500 via-red-600 to-red-700 p-6 relative">
                <div className="absolute inset-0 bg-gradient-to-r from-red-500/90 via-red-600/90 to-red-700/90"></div>
                <div className="relative flex items-center justify-center">
                  <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-white border-2 border-white/30">
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                    </svg>
                  </div>
                </div>
                <h3 className="text-xl font-bold text-white text-center mt-4">Clear Chat</h3>
              </div>
              
              {/* Content */}
              <div className="p-6">
                <p className="text-gray-700 dark:text-gray-300 text-center text-lg mb-2">
                  Are you sure you want to clear all messages?
                </p>
                <p className="text-gray-500 dark:text-gray-400 text-center text-sm">
                  This will only clear the chat for you. Other users will still see all messages.
                </p>
              </div>
              
              {/* Footer */}
              <div className="px-6 py-4 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-200 dark:border-gray-700">
                <div className="flex space-x-3">
                  <button
                    onClick={confirmClearChat}
                    className="flex-1 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-semibold py-3 px-4 rounded-lg transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800"
                  >
                    🗑️ Clear Chat
                  </button>
                  <button
                    onClick={cancelClearChat}
                    className="flex-1 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 font-semibold py-3 px-4 rounded-lg transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800"
                  >
                    ✕ Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Enable Notifications Popup */}
      {showNotificationPopup && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4">
          <div className="relative w-full max-w-md mx-auto">
            <div className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-xl shadow-2xl rounded-2xl border border-gray-200/50 dark:border-gray-700/50 overflow-hidden">
              {/* Header */}
              <div className="bg-gradient-to-r from-blue-500 via-blue-600 to-indigo-600 p-6 relative">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500/90 via-blue-600/90 to-indigo-600/90"></div>
                <div className="relative flex items-center justify-center">
                  <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-white border-2 border-white/30">
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-5 5-5-5h5z"/>
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.73 21a2 2 0 01-3.46 0"/>
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9z"/>
                    </svg>
                  </div>
                </div>
                <h3 className="text-xl font-bold text-white text-center mt-4">Enable Notifications</h3>
              </div>
              
              {/* Content */}
              <div className="p-6">
                <p className="text-gray-700 dark:text-gray-300 text-center text-lg mb-2">
                  Get notified when new messages arrive?
                </p>
                <p className="text-gray-500 dark:text-gray-400 text-center text-sm">
                  You'll receive browser notifications for new chat messages even when you're not actively viewing the chat.
                </p>
              </div>
              
              {/* Footer */}
              <div className="px-6 py-4 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-200 dark:border-gray-700">
                <div className="flex space-x-3">
                  <button
                    onClick={confirmEnableNotifications}
                    className="flex-1 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold py-3 px-4 rounded-lg transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800"
                  >
                    🔔 Enable Notifications
                  </button>
                  <button
                    onClick={cancelNotifications}
                    className="flex-1 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 font-semibold py-3 px-4 rounded-lg transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800"
                  >
                    ✕ Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Other User Profile Modal */}
      {showOtherUserProfile && selectedUser && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4">
          <div className="relative w-full max-w-md mx-auto">
            <div className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-xl shadow-2xl rounded-2xl border border-gray-200/50 dark:border-gray-700/50 overflow-hidden">
              {/* Header with gradient */}
              <div className={`p-6 relative ${
                selectedUser.role === 'professional' 
                  ? 'bg-gradient-to-r from-blue-500 via-blue-600 to-indigo-600' 
                  : 'bg-gradient-to-r from-green-500 via-green-600 to-emerald-600'
              }`}>
                <div className={`absolute inset-0 ${
                  selectedUser.role === 'professional' 
                    ? 'bg-gradient-to-r from-blue-500/90 via-blue-600/90 to-indigo-600/90' 
                    : 'bg-gradient-to-r from-green-500/90 via-green-600/90 to-emerald-600/90'
                }`}></div>
                <div className="relative flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-white font-bold text-2xl border-2 border-white/30">
                      {(selectedUser?.firstName || selectedUser?.name || selectedUser?.email)?.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-white">User Profile</h3>
                      <p className="text-white/80 text-sm">{getDisplayName(selectedUser)}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowOtherUserProfile(false)}
                    className="p-2 rounded-full bg-white/20 hover:bg-white/30 text-white transition-all duration-200 hover:scale-110"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                    </svg>
                  </button>
                </div>
              </div>
              
              {/* Content */}
              <div className="p-6 space-y-6">
                <div className="grid gap-4">
                  <div className="group">
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Name</label>
                    <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600">
                      <p className="text-gray-900 dark:text-gray-100 font-medium">{selectedUser.name || selectedUser.email}</p>
                    </div>
                  </div>
                  
                  <div className="group">
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Role</label>
                    <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                        selectedUser.role === 'professional' 
                          ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300' 
                          : 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                      }`}>
                        {selectedUser.role === 'professional' ? '👔 Professional' : '🎓 Student'}
                      </span>
                    </div>
                  </div>
                  
                  {selectedUser.role === 'professional' && selectedUser.companyName && (
                    <div className="group">
                      <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Company</label>
                      <div className="p-3 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-lg border border-blue-200 dark:border-blue-700">
                        <p className="text-blue-900 dark:text-blue-100 font-medium">{selectedUser.companyName}</p>
                      </div>
                    </div>
                  )}
                  
                  {selectedUser.role === 'student' && selectedUser.college && (
                    <div className="group">
                      <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">College</label>
                      <div className="p-3 bg-gradient-to-r from-green-50 to-teal-50 dark:from-green-900/20 dark:to-teal-900/20 rounded-lg border border-green-200 dark:border-green-700">
                        <p className="text-green-900 dark:text-green-100 font-medium">{selectedUser.college}</p>
                      </div>
                    </div>
                  )}

                  {/* Connection Status */}
                  <div className="group">
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Status</label>
                    <div className="p-3 bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-900/20 dark:to-yellow-900/20 rounded-lg border border-amber-200 dark:border-amber-700">
                      <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                        <p className="text-amber-900 dark:text-amber-100 font-medium">Active in this chat</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Footer */}
              <div className="px-6 py-4 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={() => setShowOtherUserProfile(false)}
                  className="w-full bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 font-semibold py-3 px-4 rounded-lg transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800"
                >
                  ✕ Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatRoom;
