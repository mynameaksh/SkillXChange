const calculateMatchScore = (userSkills, otherUserSkills, type) => {
    let score = 0;
    const skillMap = new Map();

    // Create a map of skills for faster lookup
    userSkills.forEach(skill => {
        skillMap.set(skill.name.toLowerCase(), {
            proficiency: skill.proficiencyLevel,
            experience: skill.yearsOfExperience
        });
    });

    // Calculate match score
    otherUserSkills.forEach(skill => {
        const userSkill = skillMap.get(skill.name.toLowerCase());
        if (userSkill) {
            // Base score for matching skill
            score += 1;

            // Proficiency level bonus
            const proficiencyLevels = ['beginner', 'intermediate', 'advanced'];
            const skillLevel = proficiencyLevels.indexOf(skill.proficiencyLevel);
            const userLevel = proficiencyLevels.indexOf(userSkill.proficiency);

            // For teaching: prefer higher proficiency teaching lower
            // For learning: prefer lower proficiency learning from higher
            if (type === 'teach' && skillLevel > userLevel) {
                score += 0.5;
            } else if (type === 'learn' && skillLevel < userLevel) {
                score += 0.5;
            }

            // Experience bonus
            if (Math.abs(skill.yearsOfExperience - userSkill.experience) <= 2) {
                score += 0.3;
            }
        }
    });

    return score;
};

const calculateAvailabilityMatch = (userAvail, otherAvail) => {
    if (!userAvail || !otherAvail) return 0;

    let score = 0;
    
    // Check weekdays overlap
    const commonDays = userAvail.weekdays.filter(day => 
        otherAvail.weekdays.includes(day)
    );
    score += (commonDays.length / 7) * 0.5;

    // Check time preferences overlap
    const commonTimes = userAvail.preferredTime.filter(time =>
        otherAvail.preferredTime.includes(time)
    );
    score += (commonTimes.length / 4) * 0.5;

    return score;
};

const calculateLanguageMatch = (userLangs, otherLangs) => {
    if (!userLangs || !otherLangs) return 0;
    
    const commonLangs = userLangs.filter(lang => 
        otherLangs.includes(lang)
    );
    return commonLangs.length > 0 ? 1 : 0;
};

module.exports = {
    calculateMatchScore,
    calculateAvailabilityMatch,
    calculateLanguageMatch
};