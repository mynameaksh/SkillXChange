const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Message = require('../models/Message');
const ChatRoom = require('../models/ChatRoom');

class SocketManager {
    constructor(io) {
        this.io = io;
        this.userSockets = new Map(); // userId -> socketId
        this.socketUsers = new Map(); // socketId -> userId
    }

    async authenticateSocket(socket, next) {
        try {
            console.log('Authenticating socket...');
            const token = socket.handshake.auth.token?.replace('Bearer ', '');
            console.log('Token:', token);
            
            if (!token) {
                console.log('Authentication error: No token provided');
                return next(new Error('Authentication error'));
            }

            const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
            console.log('Decoded token:', decoded);
            const user = await User.findById(decoded.id);
            
            if (!user) {
                console.log('Authentication error: User not found');
                return next(new Error('User not found'));
            }

            console.log('Socket authenticated successfully for user:', user.email);
            socket.user = user;
            next();
        } catch (error) {
            console.log('Authentication error:', error.message);
            next(new Error('Authentication error'));
        }
    }

    async handleConnection(socket) {
        try {
            // Store socket mapping
            this.userSockets.set(socket.user._id.toString(), socket.id);
            this.socketUsers.set(socket.id, socket.user._id.toString());

            // Join user's room
            socket.join(socket.user._id.toString());

            // Send online status to relevant users
            const rooms = await ChatRoom.find({ participants: socket.user._id });
            rooms.forEach(room => {
                const otherUser = room.participants.find(
                    p => p.toString() !== socket.user._id.toString()
                );
                if (otherUser) {
                    this.io.to(otherUser.toString()).emit('user:online', {
                        userId: socket.user._id
                    });
                }
            });

            // Handle private messages
            socket.on('message:send', async (data) => {
                try {
                    console.log('Received message:send event with data:', data);
                    const { roomId, content, type = 'text' } = data;

                    const room = await ChatRoom.findById(roomId);
                    if (!room) {
                        console.log('Message error: Chat room not found');
                        throw new Error('Chat room not found');
                    }

                    // Verify sender is part of the room
                    if (!room.participants.includes(socket.user._id)) {
                        console.log('Message error: User not authorized to send messages in this room');
                        throw new Error('Not authorized to send messages in this room');
                    }

                    // Get receiver
                    const receiver = room.participants.find(
                        p => p.toString() !== socket.user._id.toString()
                    );
                    console.log('Receiver:', receiver);

                    // Create and save message
                    const message = await Message.create({
                        sender: socket.user._id,
                        receiver,
                        content,
                        type
                    });
                    await message.populate('sender', 'name');
                    console.log('Saved message:', message);

                    // Update chat room's last message
                    room.lastMessage = message._id;
                    room.lastMessageTimestamp = message.createdAt;
                    await room.save();

                    // Emit message to room
                    console.log(`Emitting message:receive to room: ${receiver.toString()}`);
                    this.io.to(receiver.toString()).emit('message:receive', {
                        message,
                        roomId
                    });

                    // Emit successful send confirmation
                    console.log(`Emitting message:sent to socket: ${socket.id}`);
                    socket.emit('message:sent', {
                        message,
                        roomId
                    });
                } catch (error) {
                    console.log('Message error:', error.message);
                    socket.emit('message:error', {
                        error: error.message
                    });
                }
            });

            // Handle typing status
            socket.on('typing:start', async (data) => {
                const { roomId } = data;
                const room = await ChatRoom.findById(roomId);
                if (room && room.participants.includes(socket.user._id)) {
                    const receiver = room.participants.find(
                        p => p.toString() !== socket.user._id.toString()
                    );
                    this.io.to(receiver.toString()).emit('typing:start', {
                        userId: socket.user._id,
                        roomId
                    });
                }
            });

            socket.on('typing:stop', async (data) => {
                const { roomId } = data;
                const room = await ChatRoom.findById(roomId);
                if (room && room.participants.includes(socket.user._id)) {
                    const receiver = room.participants.find(
                        p => p.toString() !== socket.user._id.toString()
                    );
                    this.io.to(receiver.toString()).emit('typing:stop', {
                        userId: socket.user._id,
                        roomId
                    });
                }
            });

            // Handle disconnection
            socket.on('disconnect', () => {
                const userId = this.socketUsers.get(socket.id);
                if (userId) {
                    this.userSockets.delete(userId);
                    this.socketUsers.delete(socket.id);

                    // Notify relevant users about offline status
                    this.io.emit('user:offline', {
                        userId: socket.user._id
                    });
                }
            });

        } catch (error) {
            console.error('Socket connection error:', error);
        }
    }

    initialize() {
        this.io.use((socket, next) => this.authenticateSocket(socket, next));
        this.io.on('connection', (socket) => this.handleConnection(socket));
    }
}

module.exports = SocketManager;