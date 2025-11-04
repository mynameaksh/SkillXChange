const express = require('express');
const router = express.Router();
const Profile = require('../models/Profile');
const auth = require('../middleware/auth');
const { 
    calculateMatchScore, 
    calculateAvailabilityMatch, 
    calculateLanguageMatch 
} = require('../utils/matchingAlgorithm');

// Get potential matches for the authenticated user
router.get('/', auth, async (req, res) => {
    try {
        // Get user's profile
        const userProfile = await Profile.findOne({ user: req.user._id }).populate('user', 'name');
        if (!userProfile) {
            return res.status(404).json({ error: 'Please complete your profile first' });
        }

        // Get all other profiles
        const allProfiles = await Profile.find({ 
            user: { $ne: req.user._id },
            completionStatus: { $gte: 80 } // Only consider profiles that are mostly complete
        }).populate('user', 'name');

        // Calculate matches
        const matches = allProfiles.map(profile => {
            // Calculate teaching match (what I can teach vs what they want to learn)
            const teachingScore = calculateMatchScore(
                userProfile.skillsToTeach,
                profile.skillsToLearn,
                'teach'
            );

            // Calculate learning match (what I want to learn vs what they can teach)
            const learningScore = calculateMatchScore(
                userProfile.skillsToLearn,
                profile.skillsToTeach,
                'learn'
            );

            // Calculate availability match
            const availabilityScore = calculateAvailabilityMatch(
                userProfile.availability,
                profile.availability
            );

            // Calculate language match
            const languageScore = calculateLanguageMatch(
                userProfile.languages,
                profile.languages
            );

            // Calculate total match score (weighted average)
            const totalScore = (
                (teachingScore * 0.35) + 
                (learningScore * 0.35) + 
                (availabilityScore * 0.2) + 
                (languageScore * 0.1)
            ) * 100;

            return {
                profile: {
                    id: profile._id,
                    userName: profile.user.name,
                    skillsToTeach: profile.skillsToTeach,
                    skillsToLearn: profile.skillsToLearn,
                    languages: profile.languages,
                    availability: profile.availability,
                    location: profile.location
                },
                matchDetails: {
                    totalScore: Math.round(totalScore),
                    teachingCompatibility: Math.round(teachingScore * 100),
                    learningCompatibility: Math.round(learningScore * 100),
                    availabilityMatch: Math.round(availabilityScore * 100),
                    languageMatch: Math.round(languageScore * 100)
                }
            };
        });

        // Sort matches by total score
        matches.sort((a, b) => b.matchDetails.totalScore - a.matchDetails.totalScore);

        res.json(matches);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get specific match details
router.get('/:profileId', auth, async (req, res) => {
    try {
        // Get user's profile
        const userProfile = await Profile.findOne({ user: req.user._id });
        if (!userProfile) {
            return res.status(404).json({ error: 'Please complete your profile first' });
        }

        // Get matched profile
        const matchProfile = await Profile.findById(req.params.profileId)
            .populate('user', 'name');
        
        if (!matchProfile) {
            return res.status(404).json({ error: 'Match profile not found' });
        }

        // Calculate detailed match scores
        const teachingScore = calculateMatchScore(
            userProfile.skillsToTeach,
            matchProfile.skillsToLearn,
            'teach'
        );
        const learningScore = calculateMatchScore(
            userProfile.skillsToLearn,
            matchProfile.skillsToTeach,
            'learn'
        );
        const availabilityScore = calculateAvailabilityMatch(
            userProfile.availability,
            matchProfile.availability
        );
        const languageScore = calculateLanguageMatch(
            userProfile.languages,
            matchProfile.languages
        );

        const totalScore = (
            (teachingScore * 0.35) + 
            (learningScore * 0.35) + 
            (availabilityScore * 0.2) + 
            (languageScore * 0.1)
        ) * 100;

        res.json({
            profile: {
                id: matchProfile._id,
                userName: matchProfile.user.name,
                introduction: matchProfile.introduction,
                skillsToTeach: matchProfile.skillsToTeach,
                skillsToLearn: matchProfile.skillsToLearn,
                languages: matchProfile.languages,
                availability: matchProfile.availability,
                location: matchProfile.location,
                socialLinks: matchProfile.socialLinks
            },
            matchDetails: {
                totalScore: Math.round(totalScore),
                teachingCompatibility: Math.round(teachingScore * 100),
                learningCompatibility: Math.round(learningScore * 100),
                availabilityMatch: Math.round(availabilityScore * 100),
                languageMatch: Math.round(languageScore * 100)
            }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;