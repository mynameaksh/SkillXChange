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
            const token = socket.handshake.auth.token?.replace('Bearer ', '');
            
            if (!token) {
                return next(new Error('Authentication error'));
            }

            const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
            const user = await User.findById(decoded.id);
            
            if (!user) {
                return next(new Error('User not found'));
            }

            socket.user = user;
            next();
        } catch (error) {
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
                    const { roomId, content, type = 'text' } = data;

                    const room = await ChatRoom.findById(roomId);
                    if (!room) {
                        throw new Error('Chat room not found');
                    }

                    // Verify sender is part of the room
                    if (!room.participants.includes(socket.user._id)) {
                        throw new Error('Not authorized to send messages in this room');
                    }

                    // Get receiver
                    const receiver = room.participants.find(
                        p => p.toString() !== socket.user._id.toString()
                    );

                    // Create and save message
                    const message = await Message.create({
                        sender: socket.user._id,
                        receiver,
                        content,
                        type
                    });
                    await message.populate('sender', 'name');

                    // Update chat room's last message
                    room.lastMessage = message._id;
                    room.lastMessageTimestamp = message.createdAt;
                    await room.save();

                    // Emit message to room
                    this.io.to(receiver.toString()).emit('message:receive', {
                        message,
                        roomId
                    });

                    // Emit successful send confirmation
                    socket.emit('message:sent', {
                        message,
                        roomId
                    });
                } catch (error) {
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