require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const socketIO = require('socket.io');
const connectDB = require('./config/db');
const { initWebSocket } = require('./websocket');

const app = express();
const server = http.createServer(app);
const io = socketIO(server, {
  cors: { origin: true, credentials: true },
  transports: ['websocket', 'polling']
});

// Connect DB
connectDB();

// Initialize WebSocket
initWebSocket(io);

// Middleware
// Allow all origins for development (including file:// protocol and all localhost variants)
app.use(cors({ 
  origin: true,
  credentials: true 
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded files with proper headers for download
app.use('/uploads', (req, res, next) => {
  // Set headers to allow download
  res.setHeader('Content-Disposition', 'attachment');
  next();
}, express.static('uploads'));

// Routes
app.use('/api/auth',        require('./routes/auth'));
app.use('/api/users',       require('./routes/users'));
app.use('/api/departments', require('./routes/departments'));
app.use('/api/projects',    require('./routes/projects'));
app.use('/api/tasks',       require('./routes/tasks'));
app.use('/api/documents',   require('./routes/documents'));
app.use('/api/attendance',  require('./routes/attendance'));
app.use('/api/security',    require('./routes/security'));
app.use('/api/chat',        require('./routes/chat'));
app.use('/api/dashboard',   require('./routes/dashboard'));

// Health check
app.get('/api/health', (req, res) => res.json({ status: 'OK', timestamp: new Date() }));

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({ message: err.message || 'Server Error' });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`💬 WebSocket ready for real-time chat`);
});
