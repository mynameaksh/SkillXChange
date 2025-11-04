const mongoose = require('mongoose');

const skillSchema = new mongoose.Schema({
    name: { type: String, required: true, trim: true },
    proficiencyLevel: { type: String, enum: ['beginner', 'intermediate', 'advanced'], required: true },
    yearsOfExperience: { type: Number, min: 0, default: 0 }
}, { _id: false });

const sessionSchema = new mongoose.Schema({
    teacher: {
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        skills: { type: [skillSchema], default: [] }
    },
    learner: {
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        skills: { type: [skillSchema], default: [] }
    },
    scheduledTime: {
        type: Date,
        required: true
    },
    duration: {
        type: Number, // Duration in minutes
        required: true,
        default: 60
    },
    status: {
        type: String,
        enum: ['scheduled', 'in-progress', 'completed', 'cancelled'],
        default: 'scheduled'
    },
    teacherReviewSubmitted: {
        type: Boolean,
        default: false
    },
    learnerReviewSubmitted: {
        type: Boolean,
        default: false
    },
    chatRoom: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ChatRoom'
    },
    notes: {
        type: String,
        trim: true
    },
    cancellationReason: {
        type: String,
        trim: true
    },
    reminders: [{
        type: {
            type: String,
            enum: ['24h', '1h', '15min'],
            required: true
        },
        sent: {
            type: Boolean,
            default: false
        },
        sentAt: Date
    }]
}, {
    timestamps: true
});

// Index for efficient queries
sessionSchema.index({ 'teacher.user': 1, status: 1 });
sessionSchema.index({ 'learner.user': 1, status: 1 });
sessionSchema.index({ scheduledTime: 1, status: 1 });

// Method to check if session can be cancelled
sessionSchema.methods.canBeCancelled = function() {
    if (this.status === 'completed' || this.status === 'cancelled') {
        return false;
    }
    return true;
};

// Method to check if review can be submitted
sessionSchema.methods.canSubmitReview = function(userId) {
    if (this.status !== 'completed') {
        return false;
    }

    const isTeacher = this.teacher.user.toString() === userId.toString();
    const isLearner = this.learner.user.toString() === userId.toString();

    if (!isTeacher && !isLearner) {
        return false;
    }

    if (isTeacher && this.teacherReviewSubmitted) {
        return false;
    }

    if (isLearner && this.learnerReviewSubmitted) {
        return false;
    }

    return true;
};

// Backward-compatible alias used by routes
sessionSchema.methods.canProvideFeedback = function(userId) {
    return this.canSubmitReview(userId);
};

// Calculate time until session
sessionSchema.methods.getTimeUntilSession = function() {
    return this.scheduledTime.getTime() - new Date().getTime();
};

// Check if session is upcoming
sessionSchema.methods.isUpcoming = function() {
    return this.status === 'scheduled' && this.scheduledTime > new Date();
};

module.exports = mongoose.model('Session', sessionSchema);