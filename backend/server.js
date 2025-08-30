const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const mongoose = require('mongoose');
require('dotenv').config();

// Railway deployment - v2

// Import routes
const authRoutes = require('./routes/auth');
const companyRoutes = require('./routes/companies');
const messageRoutes = require('./routes/messages');

// Import models
const Message = require('./models/Message');
const User = require('./models/User');

const app = express();
const server = http.createServer(app);

// Socket.IO setup with CORS
const io = socketIo(server, {
  cors: {
    origin: [
      "http://localhost:3000", 
      "http://localhost:3001",
      "https://kallurinaveenkumar.github.io",
      "https://KALLURINAVEENKUMAR.github.io"
    ],
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(cors({
  origin: [
    "http://localhost:3000", 
    "http://localhost:3001",
    "https://kallurinaveenkumar.github.io",
    "https://KALLURINAVEENKUMAR.github.io"
  ],
  credentials: true
}));
app.use(express.json());

// MongoDB connection
const mongoUri = process.env.MONGODB_URI || process.env.DATABASE_URL || 'mongodb://localhost:27017/jobcommunity';
mongoose.connect(mongoUri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('Connected to MongoDB'))
.catch(err => console.error('MongoDB connection error:', err));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/companies', companyRoutes);
app.use('/api/messages', messageRoutes);

// Health check endpoint for deployment platforms
app.get('/api/health', (req, res) => {
  res.status(200).json({ 
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Test route
app.get('/api/test', (req, res) => {
  res.json({ message: 'Backend is running!' });
});

// Socket.IO connection handling
const connectedUsers = new Map();

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);
  
  // Extract user info from query
  const { userId, userName, userRole, companyId } = socket.handshake.query;
  
  // Store user info
  connectedUsers.set(socket.id, {
    userId,
    userName,
    userRole,
    companyId,
    socketId: socket.id
  });

  // Join company room
  socket.on('join-company', ({ companyId, user }) => {
    socket.join(`company_${companyId}`);
    console.log(`User ${user.email} joined company ${companyId}`);
    
    // Broadcast online users in this company
    const companyUsers = Array.from(connectedUsers.values())
      .filter(u => u.companyId === companyId);
    
    io.to(`company_${companyId}`).emit('online-users', companyUsers);
  });

  // Handle sending messages
  socket.on('send-message', async (messageData) => {
    console.log('🔵 Socket received send-message:', messageData);
    try {
      // Save message to database
      const message = new Message({
        text: messageData.text,
        userId: messageData.userId,
        userName: messageData.userName,
        userRole: messageData.userRole,
        companyId: messageData.companyId,
        timestamp: new Date()
      });
      
      await message.save();
      console.log('💾 Message saved to database:', message._id);
      
      // Check if this is a help request from a student about interviews
      const isInterviewHelp = messageData.userRole === 'student' && 
        (messageData.text.toLowerCase().includes('interview') || 
         messageData.text.toLowerCase().includes('help') ||
         messageData.text.toLowerCase().includes('tomorrow') ||
         messageData.text.toLowerCase().includes('guidance'));
      
      // Get the company name for notifications
      const Company = require('./models/Company');
      const company = await Company.findById(messageData.companyId);
      const companyName = company ? company.name : 'Unknown Company';
      
      // If it's an interview help request, find employees of this company
      let employeeNotifications = [];
      if (isInterviewHelp) {
        const User = require('./models/User');
        const companyEmployees = await User.find({ 
          role: 'professional', 
          companyName: { $regex: new RegExp(`^${companyName}$`, 'i') }
        });
        
        // Find connected employees
        employeeNotifications = Array.from(connectedUsers.values())
          .filter(connectedUser => {
            const isEmployee = companyEmployees.some(emp => 
              emp._id.toString() === connectedUser.userId || emp.email === connectedUser.userId
            );
            const isDifferentUser = connectedUser.userId !== messageData.userId;
            return isEmployee && isDifferentUser;
          });
      }
      
      // Broadcast to all users in the company room
      const broadcastMessage = {
        ...messageData,
        id: message._id,
        isInterviewHelp: isInterviewHelp
      };
      
      console.log('📡 Broadcasting message to company room:', `company_${messageData.companyId}`);
      io.to(`company_${messageData.companyId}`).emit('new-message', broadcastMessage);
      
      // Send special notifications to company employees for interview help
      if (isInterviewHelp && employeeNotifications.length > 0) {
        employeeNotifications.forEach(employee => {
          io.to(employee.socketId).emit('interview-help-notification', {
            message: messageData,
            companyName: companyName,
            studentName: messageData.userName,
            type: 'interview-help'
          });
        });
        
        console.log(`🚨 Interview help notification sent to ${employeeNotifications.length} ${companyName} employees`);
      }
      
      console.log(`✅ Message sent in company ${messageData.companyId} by ${messageData.userName}`);
    } catch (error) {
      console.error('Error saving message:', error);
    }
  });

  // Handle editing messages
  socket.on('edit-message', async (data) => {
    console.log('✏️ Socket received edit-message:', data);
    try {
      const { messageId, newText, userId, companyId } = data;
      
      const message = await Message.findById(messageId);
      if (message && message.userId === userId && !message.isDeleted) {
        message.text = newText;
        message.isEdited = true;
        message.editedAt = new Date();
        await message.save();
        
        // Broadcast the edited message
        io.to(`company_${companyId}`).emit('message-edited', {
          messageId: message._id,
          text: message.text,
          isEdited: true,
          editedAt: message.editedAt
        });
        
        console.log(`✅ Message edited: ${messageId}`);
      }
    } catch (error) {
      console.error('Error editing message:', error);
    }
  });

  // Handle deleting messages
  socket.on('delete-message', async (data) => {
    console.log('🗑️ Socket received delete-message:', data);
    try {
      const { messageId, userId, companyId } = data;
      
      const message = await Message.findById(messageId);
      if (message && message.userId === userId) {
        message.isDeleted = true;
        message.deletedAt = new Date();
        await message.save();
        
        // Broadcast the deletion
        io.to(`company_${companyId}`).emit('message-deleted', {
          messageId: message._id
        });
        
        console.log(`✅ Message deleted: ${messageId}`);
      }
    } catch (error) {
      console.error('Error deleting message:', error);
    }
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    const user = connectedUsers.get(socket.id);
    
    if (user) {
      // Remove user from connected users
      connectedUsers.delete(socket.id);
      
      // Update online users in the company room
      if (user.companyId) {
        const companyUsers = Array.from(connectedUsers.values())
          .filter(u => u.companyId === user.companyId);
        
        io.to(`company_${user.companyId}`).emit('online-users', companyUsers);
      }
    }
  });
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Socket.IO server is ready`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});
