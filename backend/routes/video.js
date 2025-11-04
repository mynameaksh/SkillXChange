const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const VideoRoom = require('../models/VideoRoom');
const Session = require('../models/Session');
const auth = require('../middleware/auth');

// Create video room for a session
router.post('/', auth, async (req, res) => {
    try {
        const { sessionId } = req.body;

        // Verify session
        const session = await Session.findById(sessionId);
        if (!session) {
            return res.status(404).json({ error: 'Session not found' });
        }

        // Check if user is part of the session
        if (session.teacher.user.toString() !== req.user._id.toString() &&
            session.learner.user.toString() !== req.user._id.toString()) {
            return res.status(403).json({ error: 'Not authorized to create video room for this session' });
        }

        // Check if session is scheduled for now
        const now = new Date();
        const sessionTime = new Date(session.scheduledTime);
        const timeUntilSession = sessionTime.getTime() - now.getTime();
        
        // Only allow creation 5 minutes before scheduled time
        if (timeUntilSession > 5 * 60 * 1000) {
            return res.status(400).json({ 
                error: 'Cannot create video room more than 5 minutes before scheduled time' 
            });
        }

        // Check if room already exists
        let videoRoom = await VideoRoom.findOne({ sessionId });
        if (videoRoom) {
            return res.status(400).json({ error: 'Video room already exists for this session' });
        }

        // Create video room
        videoRoom = await VideoRoom.create({
            sessionId,
            roomId: uuidv4(),
            participants: [
                {
                    userId: session.teacher.user,
                    role: 'teacher'
                },
                {
                    userId: session.learner.user,
                    role: 'learner'
                }
            ]
        });

        // Update session status
        session.status = 'ongoing';
        await session.save();

        await videoRoom.populate('participants.userId', 'name');

        res.status(201).json(videoRoom);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// Get video room details
router.get('/:roomId', auth, async (req, res) => {
    try {
        const videoRoom = await VideoRoom.findOne({ roomId: req.params.roomId })
            .populate('participants.userId', 'name')
            .populate('sessionId');

        if (!videoRoom) {
            return res.status(404).json({ error: 'Video room not found' });
        }

        // Check if user is participant
        if (!videoRoom.canUserJoin(req.user._id)) {
            return res.status(403).json({ error: 'Not authorized to access this video room' });
        }

        res.json(videoRoom);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// End video room
router.post('/:roomId/end', auth, async (req, res) => {
    try {
        const videoRoom = await VideoRoom.findOne({ roomId: req.params.roomId });
        if (!videoRoom) {
            return res.status(404).json({ error: 'Video room not found' });
        }

        // Check if user is participant
        if (!videoRoom.canUserJoin(req.user._id)) {
            return res.status(403).json({ error: 'Not authorized to end this video room' });
        }

        videoRoom.status = 'ended';
        videoRoom.endTime = new Date();
        await videoRoom.save();

        // Update session status
        const session = await Session.findById(videoRoom.sessionId);
        if (session) {
            session.status = 'completed';
            await session.save();
        }

        res.json(videoRoom);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;