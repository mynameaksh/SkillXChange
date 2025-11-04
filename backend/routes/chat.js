const express = require('express');
const router = express.Router();
const Message = require('../models/Message');
const ChatRoom = require('../models/ChatRoom');
const auth = require('../middleware/auth');

// Get all chat rooms for the current user
router.get('/rooms', auth, async (req, res) => {
    try {
        const rooms = await ChatRoom.find({
            participants: req.user._id,
            isActive: true
        })
        .populate('participants', 'name')
        .populate('lastMessage')
        .sort({ lastMessageTimestamp: -1 });

        res.json(rooms);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get or create a chat room with another user
router.post('/rooms', auth, async (req, res) => {
    try {
        const { otherUserId } = req.body;
        
        if (otherUserId === req.user._id.toString()) {
            return res.status(400).json({ error: 'Cannot create chat room with yourself' });
        }

        const room = await ChatRoom.findOrCreateRoom(req.user._id, otherUserId);
        await room.populate('participants', 'name');
        
        res.json(room);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get chat history for a specific room
router.get('/messages/:roomId', auth, async (req, res) => {
    try {
        const room = await ChatRoom.findById(req.params.roomId);
        if (!room) {
            return res.status(404).json({ error: 'Chat room not found' });
        }

        // Verify user is part of the room
        if (!room.participants.includes(req.user._id)) {
            return res.status(403).json({ error: 'Not authorized to access this chat room' });
        }

        const { page = 1, limit = 50 } = req.query;
        const skip = (page - 1) * limit;

        const messages = await Message.find({
            $or: [
                { sender: room.participants[0], receiver: room.participants[1] },
                { sender: room.participants[1], receiver: room.participants[0] }
            ]
        })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .populate('sender', 'name');

        // Mark messages as read
        await Message.updateMany(
            {
                receiver: req.user._id,
                read: false,
                $or: [
                    { sender: room.participants[0] },
                    { sender: room.participants[1] }
                ]
            },
            { read: true }
        );

        res.json(messages.reverse());
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get unread message count
router.get('/unread', auth, async (req, res) => {
    try {
        const count = await Message.countDocuments({
            receiver: req.user._id,
            read: false
        });

        res.json({ count });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;