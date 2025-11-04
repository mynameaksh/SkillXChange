const mongoose = require('mongoose');

const chatRoomSchema = new mongoose.Schema({
    participants: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    }],
    lastMessage: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Message'
    },
    lastMessageTimestamp: {
        type: Date
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

// Ensure participants array always has exactly 2 users
chatRoomSchema.pre('save', function(next) {
    if (this.participants.length !== 2) {
        next(new Error('Chat room must have exactly 2 participants'));
    } else {
        next();
    }
});

// Create compound index for efficient chat room queries
chatRoomSchema.index({ participants: 1 });

// Method to find or create a chat room between two users
chatRoomSchema.statics.findOrCreateRoom = async function(user1Id, user2Id) {
    let room = await this.findOne({
        participants: { $all: [user1Id, user2Id] }
    });

    if (!room) {
        room = await this.create({
            participants: [user1Id, user2Id]
        });
    }

    return room;
};

module.exports = mongoose.model('ChatRoom', chatRoomSchema);