const express = require('express');
const router = express.Router();
const Session = require('../models/Session');
const Profile = require('../models/Profile');
const Message = require('../models/Message');
const ChatRoom = require('../models/ChatRoom');
const VideoRoom = require('../models/VideoRoom');
const auth = require('../middleware/auth');

// Get user's dashboard overview
router.get('/overview', auth, async (req, res) => {
    try {
        const userId = req.user._id;
        
        // Get user's profile completion
        const profile = await Profile.findOne({ user: userId });
        const profileCompletion = profile ? profile.completionStatus : 0;

        // Get upcoming sessions
        const upcomingSessions = await Session.find({
            $or: [
                { 'teacher.user': userId },
                { 'learner.user': userId }
            ],
            status: 'scheduled',
            scheduledTime: { $gte: new Date() }
        })
        .sort({ scheduledTime: 1 })
        .limit(5)
        .populate('teacher.user', 'name')
        .populate('learner.user', 'name');

        // Get recent sessions
        const recentSessions = await Session.find({
            $or: [
                { 'teacher.user': userId },
                { 'learner.user': userId }
            ],
            status: { $in: ['completed', 'cancelled'] }
        })
        .sort({ updatedAt: -1 })
        .limit(5)
        .populate('teacher.user', 'name')
        .populate('learner.user', 'name');

        // Get active chats
        const activeChats = await ChatRoom.find({
            participants: userId,
            isActive: true
        })
        .sort({ lastMessageTimestamp: -1 })
        .limit(5)
        .populate('participants', 'name')
        .populate('lastMessage');

        // Get unread messages count
        const unreadMessages = await Message.countDocuments({
            receiver: userId,
            read: false
        });

        // Get teaching stats
        const teachingStats = await Session.aggregate([
            {
                $match: {
                    'teacher.user': userId,
                    status: 'completed'
                }
            },
            {
                $group: {
                    _id: null,
                    totalSessions: { $sum: 1 },
                    averageRating: { $avg: '$feedback.fromLearner.rating' },
                    totalHours: { $sum: '$duration' }
                }
            }
        ]);

        // Get learning stats
        const learningStats = await Session.aggregate([
            {
                $match: {
                    'learner.user': userId,
                    status: 'completed'
                }
            },
            {
                $group: {
                    _id: null,
                    totalSessions: { $sum: 1 },
                    averageRating: { $avg: '$feedback.fromTeacher.rating' },
                    totalHours: { $sum: '$duration' }
                }
            }
        ]);

        // Format stats
        const formatStats = (stats) => {
            if (stats.length === 0) {
                return {
                    totalSessions: 0,
                    averageRating: 0,
                    totalHours: 0
                };
            }
            return {
                totalSessions: stats[0].totalSessions,
                averageRating: Math.round(stats[0].averageRating * 10) / 10,
                totalHours: Math.round(stats[0].totalHours / 60)
            };
        };

        res.json({
            profileCompletion,
            upcomingSessions,
            recentSessions,
            activeChats,
            unreadMessages,
            stats: {
                teaching: formatStats(teachingStats),
                learning: formatStats(learningStats)
            }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get teaching statistics
router.get('/stats/teaching', auth, async (req, res) => {
    try {
        const userId = req.user._id;
        const { timeRange = 'all' } = req.query;

        let dateFilter = {};
        const now = new Date();

        switch (timeRange) {
            case 'week':
                dateFilter = { 
                    $gte: new Date(now.setDate(now.getDate() - 7))
                };
                break;
            case 'month':
                dateFilter = {
                    $gte: new Date(now.setMonth(now.getMonth() - 1))
                };
                break;
            case 'year':
                dateFilter = {
                    $gte: new Date(now.setFullYear(now.getFullYear() - 1))
                };
                break;
        }

        const stats = await Session.aggregate([
            {
                $match: {
                    'teacher.user': userId,
                    status: 'completed',
                    ...(timeRange !== 'all' && { scheduledTime: dateFilter })
                }
            },
            {
                $group: {
                    _id: {
                        $dateToString: { 
                            format: "%Y-%m", 
                            date: "$scheduledTime" 
                        }
                    },
                    sessions: { $sum: 1 },
                    totalHours: { $sum: '$duration' },
                    averageRating: { $avg: '$feedback.fromLearner.rating' },
                    skills: { $push: '$teacher.skills' }
                }
            },
            { $sort: { _id: 1 } }
        ]);

        // Process skills data
        const skillStats = stats.reduce((acc, month) => {
            month.skills.flat().forEach(skill => {
                if (!acc[skill.name]) {
                    acc[skill.name] = 0;
                }
                acc[skill.name]++;
            });
            return acc;
        }, {});

        res.json({
            monthlyStats: stats.map(month => ({
                month: month._id,
                sessions: month.sessions,
                hours: Math.round(month.totalHours / 60),
                averageRating: Math.round(month.averageRating * 10) / 10
            })),
            skillStats: Object.entries(skillStats)
                .map(([skill, count]) => ({ skill, count }))
                .sort((a, b) => b.count - a.count)
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get learning statistics
router.get('/stats/learning', auth, async (req, res) => {
    try {
        const userId = req.user._id;
        const { timeRange = 'all' } = req.query;

        let dateFilter = {};
        const now = new Date();

        switch (timeRange) {
            case 'week':
                dateFilter = { 
                    $gte: new Date(now.setDate(now.getDate() - 7))
                };
                break;
            case 'month':
                dateFilter = {
                    $gte: new Date(now.setMonth(now.getMonth() - 1))
                };
                break;
            case 'year':
                dateFilter = {
                    $gte: new Date(now.setFullYear(now.getFullYear() - 1))
                };
                break;
        }

        const stats = await Session.aggregate([
            {
                $match: {
                    'learner.user': userId,
                    status: 'completed',
                    ...(timeRange !== 'all' && { scheduledTime: dateFilter })
                }
            },
            {
                $group: {
                    _id: {
                        $dateToString: { 
                            format: "%Y-%m", 
                            date: "$scheduledTime" 
                        }
                    },
                    sessions: { $sum: 1 },
                    totalHours: { $sum: '$duration' },
                    averageRating: { $avg: '$feedback.fromTeacher.rating' },
                    skills: { $push: '$learner.skills' }
                }
            },
            { $sort: { _id: 1 } }
        ]);

        // Process skills data
        const skillStats = stats.reduce((acc, month) => {
            month.skills.flat().forEach(skill => {
                if (!acc[skill.name]) {
                    acc[skill.name] = 0;
                }
                acc[skill.name]++;
            });
            return acc;
        }, {});

        res.json({
            monthlyStats: stats.map(month => ({
                month: month._id,
                sessions: month.sessions,
                hours: Math.round(month.totalHours / 60),
                averageRating: Math.round(month.averageRating * 10) / 10
            })),
            skillStats: Object.entries(skillStats)
                .map(([skill, count]) => ({ skill, count }))
                .sort((a, b) => b.count - a.count)
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get upcoming schedule
router.get('/schedule', auth, async (req, res) => {
    try {
        const userId = req.user._id;
        const { startDate, endDate } = req.query;

        const query = {
            $or: [
                { 'teacher.user': userId },
                { 'learner.user': userId }
            ],
            status: 'scheduled'
        };

        if (startDate && endDate) {
            query.scheduledTime = {
                $gte: new Date(startDate),
                $lte: new Date(endDate)
            };
        }

        const sessions = await Session.find(query)
            .sort({ scheduledTime: 1 })
            .populate('teacher.user', 'name')
            .populate('learner.user', 'name');

        res.json(sessions);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;