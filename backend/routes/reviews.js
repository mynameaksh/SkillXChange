const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Review = require('../models/Review');
const Session = require('../models/Session');
const User = require('../models/User');

// Create a new review
router.post('/:sessionId', auth, async (req, res) => {
    try {
        const session = await Session.findById(req.params.sessionId);
        if (!session) {
            return res.status(404).json({ message: 'Session not found' });
        }

        // Verify user was part of the session
        const isTeacher = session.teacher.toString() === req.user.id;
        const isLearner = session.learner.toString() === req.user.id;
        if (!isTeacher && !isLearner) {
            return res.status(403).json({ message: 'Not authorized to review this session' });
        }

        // Determine reviewer role and reviewee
        const role = isTeacher ? 'teacher' : 'learner';
        const reviewee = isTeacher ? session.learner : session.teacher;

        // Check if review already exists
        const existingReview = await Review.findOne({
            session: session._id,
            reviewer: req.user.id
        });

        if (existingReview) {
            return res.status(400).json({ message: 'Review already submitted' });
        }

        const review = new Review({
            session: session._id,
            reviewer: req.user.id,
            reviewee: reviewee,
            role,
            ...req.body
        });

        await review.save();

        // Update session review status
        if (isTeacher) {
            session.teacherReviewSubmitted = true;
        } else {
            session.learnerReviewSubmitted = true;
        }
        await session.save();

        res.status(201).json(review);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Get reviews for a user (as reviewee)
router.get('/user/:userId', async (req, res) => {
    try {
        const { role, status = 'published', page = 1, limit = 10 } = req.query;
        
        const query = {
            reviewee: req.params.userId,
            status
        };
        
        if (role) {
            query.role = role;
        }

        const reviews = await Review.find(query)
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(limit)
            .populate('reviewer', 'name')
            .populate('session', 'date duration');

        const total = await Review.countDocuments(query);

        res.json({
            reviews,
            totalPages: Math.ceil(total / limit),
            currentPage: page
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Get user's rating summary
router.get('/summary/:userId', async (req, res) => {
    try {
        const { role } = req.query;
        if (!role) {
            return res.status(400).json({ message: 'Role parameter is required' });
        }

        const [ratings, skillRatings] = await Promise.all([
            Review.calculateUserRatings(req.params.userId, role),
            Review.calculateUserSkillRatings(req.params.userId, role)
        ]);

        res.json({
            ratings,
            skillRatings
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Update review (only for the reviewer)
router.patch('/:reviewId', auth, async (req, res) => {
    try {
        const review = await Review.findById(req.params.reviewId);
        if (!review) {
            return res.status(404).json({ message: 'Review not found' });
        }

        if (review.reviewer.toString() !== req.user.id) {
            return res.status(403).json({ message: 'Not authorized to update this review' });
        }

        // Only allow updating specific fields
        const allowedUpdates = ['ratings', 'skills', 'comment', 'learningOutcome', 'improvementSuggestions', 'isPublic'];
        const updates = Object.keys(req.body);
        const isValidOperation = updates.every(update => allowedUpdates.includes(update));

        if (!isValidOperation) {
            return res.status(400).json({ message: 'Invalid updates' });
        }

        updates.forEach(update => review[update] = req.body[update]);
        await review.save();

        res.json(review);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Add response to review (only for reviewee)
router.post('/:reviewId/response', auth, async (req, res) => {
    try {
        const review = await Review.findById(req.params.reviewId);
        if (!review) {
            return res.status(404).json({ message: 'Review not found' });
        }

        if (review.reviewee.toString() !== req.user.id) {
            return res.status(403).json({ message: 'Not authorized to respond to this review' });
        }

        review.response = {
            content: req.body.content,
            createdAt: new Date()
        };

        await review.save();
        res.json(review);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Report a review
router.post('/:reviewId/report', auth, async (req, res) => {
    try {
        const review = await Review.findById(req.params.reviewId);
        if (!review) {
            return res.status(404).json({ message: 'Review not found' });
        }

        review.status = 'reported';
        review.report = {
            reason: req.body.reason,
            description: req.body.description,
            reportedAt: new Date(),
            status: 'pending'
        };

        await review.save();
        res.json(review);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Get session reviews (both teacher and learner reviews)
router.get('/session/:sessionId', auth, async (req, res) => {
    try {
        const session = await Session.findById(req.params.sessionId);
        if (!session) {
            return res.status(404).json({ message: 'Session not found' });
        }

        // Verify user was part of the session
        if (![session.teacher.toString(), session.learner.toString()].includes(req.user.id)) {
            return res.status(403).json({ message: 'Not authorized to view these reviews' });
        }

        const reviews = await Review.find({ session: session._id })
            .populate('reviewer', 'name')
            .populate('reviewee', 'name');

        res.json(reviews);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;