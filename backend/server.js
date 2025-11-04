const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const SocketManager = require('./utils/socketManager');
const WebRTCManager = require('./utils/webrtcManager');

const app = express();
const server = http.createServer(app);

// Enable CORS for all routes
const cors = require('cors');
app.use(cors({
    origin: process.env.CLIENT_URL || 'http://localhost:3000',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// Initialize Socket.IO with two namespaces
const io = new Server(server, {
    cors: {
        origin: process.env.CLIENT_URL || 'http://localhost:3000',
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
        credentials: true,
        allowedHeaders: ['Content-Type', 'Authorization']
    }
});

// Create separate namespace for WebRTC
const webrtcIo = io.of('/webrtc');

// Middleware for parsing JSON
app.use(express.json());

// MongoDB Connection
mongoose.connect('mongodb://localhost:27017/skillbarter', {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => {
    console.log('Connected to MongoDB');
}).catch((err) => {
    console.error('MongoDB connection error:', err);
});

// Routes
app.use('/api/users', require('./routes/users'));
app.use('/api/profiles', require('./routes/profiles'));
app.use('/api/matches', require('./routes/matches'));
app.use('/api/chat', require('./routes/chat'));
app.use('/api/sessions', require('./routes/sessions'));
app.use('/api/video', require('./routes/video'));
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/reviews', require('./routes/reviews'));

// Initialize Socket.IO managers
const socketManager = new SocketManager(io);
socketManager.initialize();

// Initialize WebRTC manager
const webrtcManager = new WebRTCManager(webrtcIo);
webrtcIo.on('connection', (socket) => webrtcManager.handleConnection(socket));const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});