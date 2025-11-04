const mongoose = require('mongoose');

const videoRoomSchema = new mongoose.Schema({
    sessionId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Session',
        required: true
    },
    roomId: {
        type: String,
        required: true,
        unique: true
    },
    status: {
        type: String,
        enum: ['waiting', 'active', 'ended'],
        default: 'waiting'
    },
    participants: [{
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        role: {
            type: String,
            enum: ['teacher', 'learner'],
            required: true
        },
        joined: {
            type: Date
        },
        left: {
            type: Date
        },
        connectionStatus: {
            type: String,
            enum: ['connected', 'disconnected'],
            default: 'disconnected'
        }
    }],
    startTime: {
        type: Date
    },
    endTime: {
        type: Date
    },
    recording: {
        isEnabled: {
            type: Boolean,
            default: false
        },
        url: String,
        startTime: Date,
        endTime: Date
    },
    screenSharing: {
        isActive: {
            type: Boolean,
            default: false
        },
        sharedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        }
    }
}, {
    timestamps: true
});

// Index for efficient queries
videoRoomSchema.index({ sessionId: 1, status: 1 });
videoRoomSchema.index({ roomId: 1 }, { unique: true });

// Method to check if user can join room
videoRoomSchema.methods.canUserJoin = function(userId) {
    const participant = this.participants.find(p => 
        p.userId.toString() === userId.toString()
    );
    return !!participant && this.status !== 'ended';
};

// Method to add participant
videoRoomSchema.methods.addParticipant = function(userId, role) {
    if (!this.participants.find(p => p.userId.toString() === userId.toString())) {
        this.participants.push({
            userId,
            role,
            joined: new Date(),
            connectionStatus: 'connected'
        });
    } else {
        // Update existing participant
        this.participants = this.participants.map(p => {
            if (p.userId.toString() === userId.toString()) {
                return {
                    ...p,
                    joined: new Date(),
                    connectionStatus: 'connected',
                    left: null
                };
            }
            return p;
        });
    }
};

// Method to remove participant
videoRoomSchema.methods.removeParticipant = function(userId) {
    this.participants = this.participants.map(p => {
        if (p.userId.toString() === userId.toString()) {
            return {
                ...p,
                left: new Date(),
                connectionStatus: 'disconnected'
            };
        }
        return p;
    });
};

// Method to check if room is empty
videoRoomSchema.methods.isEmpty = function() {
    return !this.participants.some(p => p.connectionStatus === 'connected');
};

// Method to toggle screen sharing
videoRoomSchema.methods.toggleScreenSharing = function(userId, isActive) {
    this.screenSharing = {
        isActive,
        sharedBy: isActive ? userId : null
    };
};

module.exports = mongoose.model('VideoRoom', videoRoomSchema);