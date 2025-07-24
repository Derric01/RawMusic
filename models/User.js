const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { getRandomAvatar } = require('../utils/avatarHelper');

const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: [true, 'Username is required'],
        unique: true,
        trim: true,
        minlength: [3, 'Username must be at least 3 characters'],
        maxlength: [20, 'Username cannot exceed 20 characters']
    },
    email: {
        type: String,
        required: [true, 'Email is required'],
        unique: true,
        lowercase: true,
        match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
    },
    password: {
        type: String,
        required: [true, 'Password is required'],
        minlength: [6, 'Password must be at least 6 characters']
    },
    profilePicture: {
        type: String,
        default: function() {
            return this.username ? getRandomAvatar(this.username) : '';
        }
    },
    bio: {
        type: String,
        maxlength: [200, 'Bio cannot exceed 200 characters'],
        default: ''
    },
    likedTracks: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Track'
    }],
    playlists: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Playlist'
    }],
    listeningHistory: [{
        track: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Track'
        },
        playedAt: {
            type: Date,
            default: Date.now
        },
        duration: {
            type: Number, // seconds listened
            default: 0
        }
    }],
    preferences: {
        favoriteGenres: [{
            type: String,
            enum: ['pop', 'rock', 'jazz', 'classical', 'electronic', 'hip-hop', 'country', 'folk', 'blues', 'reggae', 'metal', 'indie', 'ambient', 'world']
        }],
        theme: {
            type: String,
            enum: ['light', 'dark', 'system'],
            default: 'system'
        }
    },
    stats: {
        totalListeningTime: {
            type: Number,
            default: 0 // in seconds
        },
        totalTracks: {
            type: Number,
            default: 0
        },
        joinedDate: {
            type: Date,
            default: Date.now
        }
    },
    isVerified: {
        type: Boolean,
        default: false
    },
    lastActive: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Virtual for recent listening history (last 20 tracks)
userSchema.virtual('recentListening').get(function() {
    return this.listeningHistory
        .sort((a, b) => b.playedAt - a.playedAt)
        .slice(0, 20);
});

// Virtual for top genres based on listening history
userSchema.virtual('topGenres').get(function() {
    const genreCount = {};
    
    this.listeningHistory.forEach(entry => {
        if (entry.track && entry.track.genre) {
            genreCount[entry.track.genre] = (genreCount[entry.track.genre] || 0) + 1;
        }
    });
    
    return Object.entries(genreCount)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([genre, count]) => ({ genre, count }));
});

// Index for performance
userSchema.index({ email: 1, username: 1 });
userSchema.index({ 'listeningHistory.playedAt': -1 });

// Hash password before saving
userSchema.pre('save', async function(next) {
    if (!this.isModified('password')) return next();
    
    try {
        const salt = await bcrypt.genSalt(12);
        this.password = await bcrypt.hash(this.password, salt);
        next();
    } catch (error) {
        next(error);
    }
});

// Update lastActive on save
userSchema.pre('save', function(next) {
    this.lastActive = new Date();
    next();
});

// Method to compare password
userSchema.methods.comparePassword = async function(candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
};

// Method to add to listening history
userSchema.methods.addToHistory = function(trackId, duration = 0) {
    // Remove if already exists to avoid duplicates
    this.listeningHistory = this.listeningHistory.filter(
        entry => entry.track.toString() !== trackId.toString()
    );
    
    // Add to beginning
    this.listeningHistory.unshift({
        track: trackId,
        playedAt: new Date(),
        duration
    });
    
    // Keep only last 50 entries
    this.listeningHistory = this.listeningHistory.slice(0, 50);
    
    // Update stats
    this.stats.totalListeningTime += duration;
    this.stats.totalTracks += 1;
};

// Method to toggle like
userSchema.methods.toggleLike = function(trackId) {
    const index = this.likedTracks.indexOf(trackId);
    if (index > -1) {
        this.likedTracks.splice(index, 1);
        return false; // unliked
    } else {
        this.likedTracks.push(trackId);
        return true; // liked
    }
};

// Remove password from JSON output
userSchema.methods.toJSON = function() {
    const userObject = this.toObject();
    delete userObject.password;
    return userObject;
};

module.exports = mongoose.model('User', userSchema);
