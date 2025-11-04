const mongoose = require('mongoose');

const skillSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  proficiencyLevel: {
    type: String,
    enum: ['beginner', 'intermediate', 'advanced'],
    required: true
  },
  yearsOfExperience: {
    type: Number,
    min: 0,
    default: 0
  }
}, { _id: false });

const profileSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  introduction: {
    type: String,
    required: [true, 'Please provide an introduction'],
    trim: true,
    maxLength: [500, 'Introduction cannot be more than 500 characters']
  },
  skillsToTeach: [skillSchema],
  skillsToLearn: [skillSchema],
  availability: {
    weekdays: {
      type: [String],
      enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
      default: []
    },
    preferredTime: {
      type: [String],
      enum: ['morning', 'afternoon', 'evening', 'night'],
      default: []
    }
  },
  location: {
    type: String,
    trim: true,
    required: [true, 'Please provide your location']
  },
  languages: {
    type: [String],
    required: [true, 'Please specify at least one language'],
    default: ['English']
  },
  socialLinks: {
    linkedin: { type: String, trim: true },
    github: { type: String, trim: true },
    website: { type: String, trim: true }
  },
  completionStatus: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  }
}, {
  timestamps: true
});

// Calculate profile completion status
profileSchema.methods.calculateCompletionStatus = function() {
  let completionScore = 0;
  const fields = {
    introduction: 15,
    skillsToTeach: 20,
    skillsToLearn: 20,
    availability: 15,
    location: 10,
    languages: 10,
    socialLinks: 10
  };

  if (this.introduction) completionScore += fields.introduction;
  if (this.skillsToTeach.length > 0) completionScore += fields.skillsToTeach;
  if (this.skillsToLearn.length > 0) completionScore += fields.skillsToLearn;
  if (this.availability.weekdays.length > 0 && this.availability.preferredTime.length > 0) {
    completionScore += fields.availability;
  }
  if (this.location) completionScore += fields.location;
  if (this.languages.length > 0) completionScore += fields.languages;
  
  const socialLinksProvided = Object.values(this.socialLinks).filter(link => link).length;
  completionScore += (socialLinksProvided / 3) * fields.socialLinks;

  this.completionStatus = Math.min(100, completionScore);
  return this.completionStatus;
};

// Pre-save middleware to calculate completion status
profileSchema.pre('save', function(next) {
  this.calculateCompletionStatus();
  next();
});

module.exports = mongoose.model('Profile', profileSchema);