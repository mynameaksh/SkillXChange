const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
    session: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Session',
        required: true
    },
    reviewer: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    reviewee: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    role: {
        type: String,
        enum: ['teacher', 'learner'],
        required: true
    },
    ratings: {
        overall: {
            type: Number,
            required: true,
            min: 1,
            max: 5
        },
        knowledge: {
            type: Number,
            required: true,
            min: 1,
            max: 5
        },
        communication: {
            type: Number,
            required: true,
            min: 1,
            max: 5
        },
        punctuality: {
            type: Number,
            required: true,
            min: 1,
            max: 5
        },
        methodology: {
            type: Number,
            required: true,
            min: 1,
            max: 5
        }
    },
    skills: [{
        name: {
            type: String,
            required: true
        },
        rating: {
            type: Number,
            required: true,
            min: 1,
            max: 5
        },
        feedback: String
    }],
    comment: {
        type: String,
        required: true,
        trim: true,
        maxlength: 1000
    },
    learningOutcome: {
        type: String,
        trim: true,
        maxlength: 500
    },
    improvementSuggestions: {
        type: String,
        trim: true,
        maxlength: 500
    },
    status: {
        type: String,
        enum: ['pending', 'published', 'reported', 'removed'],
        default: 'pending'
    },
    isPublic: {
        type: Boolean,
        default: true
    },
    response: {
        content: {
            type: String,
            trim: true,
            maxlength: 500
        },
        createdAt: Date
    },
    report: {
        reason: String,
        description: String,
        reportedAt: Date,
        status: {
            type: String,
            enum: ['pending', 'reviewed', 'resolved'],
            default: 'pending'
        }
    }
}, {
    timestamps: true
});

// Index for efficient queries
reviewSchema.index({ session: 1, reviewer: 1 }, { unique: true });
reviewSchema.index({ reviewee: 1, status: 1 });
reviewSchema.index({ reviewee: 1, role: 1 });

// Calculate average ratings
reviewSchema.methods.calculateAverageRatings = function() {
    const ratings = this.ratings;
    return {
        average: Object.values(ratings).reduce((a, b) => a + b, 0) / Object.keys(ratings).length,
        ...ratings
    };
};

// Static method to calculate user's average ratings
reviewSchema.statics.calculateUserRatings = async function(userId, role) {
    const aggregation = await this.aggregate([
        {
            $match: {
                reviewee: mongoose.Types.ObjectId(userId),
                role: role,
                status: 'published'
            }
        },
        {
            $group: {
                _id: null,
                overallAvg: { $avg: '$ratings.overall' },
                knowledgeAvg: { $avg: '$ratings.knowledge' },
                communicationAvg: { $avg: '$ratings.communication' },
                punctualityAvg: { $avg: '$ratings.punctuality' },
                methodologyAvg: { $avg: '$ratings.methodology' },
                totalReviews: { $sum: 1 }
            }
        }
    ]);

    if (aggregation.length === 0) {
        return {
            overall: 0,
            knowledge: 0,
            communication: 0,
            punctuality: 0,
            methodology: 0,
            totalReviews: 0
        };
    }

    const result = aggregation[0];
    delete result._id;

    return {
        overall: Math.round(result.overallAvg * 10) / 10,
        knowledge: Math.round(result.knowledgeAvg * 10) / 10,
        communication: Math.round(result.communicationAvg * 10) / 10,
        punctuality: Math.round(result.punctualityAvg * 10) / 10,
        methodology: Math.round(result.methodologyAvg * 10) / 10,
        totalReviews: result.totalReviews
    };
};

// Calculate skill ratings for a user
reviewSchema.statics.calculateUserSkillRatings = async function(userId, role) {
    const aggregation = await this.aggregate([
        {
            $match: {
                reviewee: mongoose.Types.ObjectId(userId),
                role: role,
                status: 'published'
            }
        },
        {
            $unwind: '$skills'
        },
        {
            $group: {
                _id: '$skills.name',
                averageRating: { $avg: '$skills.rating' },
                totalRatings: { $sum: 1 },
                feedback: { $push: '$skills.feedback' }
            }
        }
    ]);

    return aggregation.map(skill => ({
        name: skill._id,
        rating: Math.round(skill.averageRating * 10) / 10,
        totalRatings: skill.totalRatings,
        feedback: skill.feedback.filter(f => f) // Remove null/empty feedback
    }));
};

module.exports = mongoose.model('Review', reviewSchema);