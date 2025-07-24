const getRandomAvatar = (username) => {
    // List of colorful avatar styles
    const styles = [
        'adventurer',
        'adventurer-neutral',
        'avataaars',
        'big-ears',
        'big-ears-neutral',
        'big-smile',
        'bottts',
        'croodles',
        'croodles-neutral',
        'fun-emoji',
        'icons',
        'identicon',
        'initials',
        'lorelei',
        'lorelei-neutral',
        'micah',
        'miniavs',
        'open-peeps',
        'personas',
        'pixel-art',
        'pixel-art-neutral'
    ];

    // Choose a random style for diversity
    const randomStyle = styles[Math.floor(Math.random() * styles.length)];
    
    // Generate a seed based on username for consistency
    const seed = username || Math.random().toString(36).substring(2);
    
    // Create a DiceBear URL (free avatar generation service)
    return `https://api.dicebear.com/7.x/${randomStyle}/svg?seed=${seed}&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf`;
};

// Get Gravatar URL based on user email
const getGravatarUrl = (email, size = 200) => {
    if (!email) return null;
    
    const crypto = require('crypto');
    const hash = crypto.createHash('md5').update(email.toLowerCase().trim()).digest('hex');
    return `https://www.gravatar.com/avatar/${hash}?s=${size}&d=mp`;
};

// Get appropriate avatar URL based on user preferences
const getUserAvatar = (user) => {
    // If user has a custom profile picture, use it
    if (user.profilePicture && user.profilePicture.trim() !== '') {
        return user.profilePicture;
    }
    
    // Try Gravatar first if user has email
    if (user.email) {
        return getGravatarUrl(user.email);
    }
    
    // Fallback to random generated avatar
    return getRandomAvatar(user.username);
};

module.exports = {
    getRandomAvatar,
    getGravatarUrl,
    getUserAvatar
};
