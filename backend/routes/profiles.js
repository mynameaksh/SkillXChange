const express = require('express');
const router = express.Router();
const Profile = require('../models/Profile');
const User = require('../models/User');
const auth = require('../middleware/auth');

// Create or update profile
router.post('/', auth, async (req, res) => {
  try {
    const {
      introduction,
      skillsToLearn,
      skillsToTeach,
      availability,
      location,
      languages,
      socialLinks
    } = req.body;

    // Use authenticated user's ID
    const userId = req.user._id;

    // Validate skills format
    const validateSkills = (skills) => {
      if (!Array.isArray(skills)) return false;
      return skills.every(skill => 
        skill.name && 
        skill.proficiencyLevel &&
        ['beginner', 'intermediate', 'advanced'].includes(skill.proficiencyLevel)
      );
    };

    if (skillsToLearn && !validateSkills(skillsToLearn)) {
      return res.status(400).json({ error: 'Invalid skills to learn format' });
    }

    if (skillsToTeach && !validateSkills(skillsToTeach)) {
      return res.status(400).json({ error: 'Invalid skills to teach format' });
    }

    // Create or update profile
    const profileData = {
      user: userId,
      introduction,
      skillsToLearn,
      skillsToTeach,
      availability,
      location,
      languages,
      socialLinks
    };

    let profile = await Profile.findOne({ user: userId });
    if (profile) {
      // Update existing profile
      profile = await Profile.findOneAndUpdate(
        { user: userId },
        { $set: profileData },
        { new: true, runValidators: true }
      );
    } else {
      // Create new profile
      profile = await Profile.create(profileData);
    }

    // Update user's profileCompleted status based on completion percentage
    await User.findByIdAndUpdate(userId, { 
      profileCompleted: profile.completionStatus >= 80 
    });

    res.json({
      profile,
      message: 'Profile updated successfully'
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Get profile by user ID
router.get('/:userId', auth, async (req, res) => {
  try {
    const profile = await Profile.findOne({ user: req.params.userId });
    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }
    res.json(profile);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

module.exports = router;