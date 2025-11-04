const express = require('express');
const router = express.Router();
const Session = require('../models/Session');
const ChatRoom = require('../models/ChatRoom');
const auth = require('../middleware/auth');

// Schedule a new session
router.post('/', auth, async (req, res) => {
    try {
        const {
            teacherId,
            teacherSkills,
            learnerSkills,
            scheduledTime,
            duration,
            notes
        } = req.body;

        // Validate scheduled time
        const sessionTime = new Date(scheduledTime);
        if (sessionTime < new Date()) {
            return res.status(400).json({ error: 'Cannot schedule sessions in the past' });
        }

        // Check for scheduling conflicts
        const conflictingSession = await Session.findOne({
            $or: [
                { 'teacher.user': teacherId },
                { 'learner.user': req.user._id }
            ],
            status: 'scheduled',
            scheduledTime: {
                $lt: new Date(sessionTime.getTime() + (duration * 60 * 1000)),
                $gt: new Date(sessionTime.getTime() - (duration * 60 * 1000))
            }
        });

        if (conflictingSession) {
            return res.status(400).json({ error: 'Time slot conflicts with another session' });
        }

        // Create or get chat room
        const chatRoom = await ChatRoom.findOrCreateRoom(req.user._id, teacherId);

        // Create session with reminders
        const session = await Session.create({
            teacher: {
                user: teacherId,
                skills: teacherSkills
            },
            learner: {
                user: req.user._id,
                skills: learnerSkills
            },
            scheduledTime: sessionTime,
            duration,
            notes,
            chatRoom: chatRoom._id,
            reminders: [
                { type: '24h' },
                { type: '1h' },
                { type: '15min' }
            ]
        });

        await session.populate([
            { path: 'teacher.user', select: 'name' },
            { path: 'learner.user', select: 'name' }
        ]);

        res.status(201).json(session);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// Get user's sessions (as teacher or learner)
router.get('/', auth, async (req, res) => {
    try {
        const { status, role, page = 1, limit = 10 } = req.query;
        const skip = (page - 1) * limit;

        let query = {
            $or: [
                { 'teacher.user': req.user._id },
                { 'learner.user': req.user._id }
            ]
        };

        // Add status filter if provided
        if (status) {
            query.status = status;
        }

        // Add role filter if provided
        if (role === 'teacher') {
            query = { 'teacher.user': req.user._id };
        } else if (role === 'learner') {
            query = { 'learner.user': req.user._id };
        }

        const sessions = await Session.find(query)
            .sort({ scheduledTime: -1 })
            .skip(skip)
            .limit(parseInt(limit))
            .populate('teacher.user', 'name')
            .populate('learner.user', 'name');

        const total = await Session.countDocuments(query);

        res.json({
            sessions,
            total,
            pages: Math.ceil(total / limit)
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get specific session details
router.get('/:sessionId', auth, async (req, res) => {
    try {
        const session = await Session.findById(req.params.sessionId)
            .populate('teacher.user', 'name')
            .populate('learner.user', 'name')
            .populate('chatRoom');

        if (!session) {
            return res.status(404).json({ error: 'Session not found' });
        }

        // Check if user is part of the session
        if (session.teacher.user._id.toString() !== req.user._id.toString() &&
            session.learner.user._id.toString() !== req.user._id.toString()) {
            return res.status(403).json({ error: 'Not authorized to view this session' });
        }

        res.json(session);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Update session status
router.patch('/:sessionId/status', auth, async (req, res) => {
    try {
        const { status, cancellationReason } = req.body;
        const session = await Session.findById(req.params.sessionId);

        if (!session) {
            return res.status(404).json({ error: 'Session not found' });
        }

        // Verify user is part of the session
        if (session.teacher.user.toString() !== req.user._id.toString() &&
            session.learner.user.toString() !== req.user._id.toString()) {
            return res.status(403).json({ error: 'Not authorized to update this session' });
        }

        // Handle status updates
        if (status === 'cancelled') {
            if (!session.canBeCancelled()) {
                return res.status(400).json({ error: 'Session cannot be cancelled' });
            }
            session.cancellationReason = cancellationReason;
        } else if (status === 'completed') {
            if (session.status !== 'ongoing') {
                return res.status(400).json({ error: 'Only ongoing sessions can be marked as completed' });
            }
        }

        session.status = status;
        await session.save();
        
        await session.populate([
            { path: 'teacher.user', select: 'name' },
            { path: 'learner.user', select: 'name' }
        ]);

        res.json(session);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// Provide session feedback
router.post('/:sessionId/feedback', auth, async (req, res) => {
    try {
        const { rating, comment } = req.body;
        const session = await Session.findById(req.params.sessionId);

        if (!session) {
            return res.status(404).json({ error: 'Session not found' });
        }

        if (!session.canProvideFeedback(req.user._id)) {
            return res.status(400).json({ error: 'Cannot provide feedback for this session' });
        }

        const isTeacher = session.teacher.user.toString() === req.user._id.toString();
        const feedbackField = isTeacher ? 'fromTeacher' : 'fromLearner';

        session.feedback[feedbackField] = {
            rating,
            comment,
            providedAt: new Date()
        };

        await session.save();
        
        await session.populate([
            { path: 'teacher.user', select: 'name' },
            { path: 'learner.user', select: 'name' }
        ]);

        res.json(session);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

module.exports = router;