const mongoose = require('mongoose');

const playlistSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Playlist name is required'],
        trim: true,
        maxlength: [100, 'Playlist name cannot exceed 100 characters']
    },
    description: {
        type: String,
        maxlength: [500, 'Description cannot exceed 500 characters'],
        default: ''
    },
    owner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'Playlist owner is required']
    },
    tracks: [{
        track: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Track',
            required: true
        },
        addedAt: {
            type: Date,
            default: Date.now
        },
        addedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        }
    }],
    coverImage: {
        type: String,
        default: ''
    },
    isPublic: {
        type: Boolean,
        default: false
    },
    isAIGenerated: {
        type: Boolean,
        default: false
    },
    aiPrompt: {
        type: String,
        default: ''
    },
    aiGeneratedAt: {
        type: Date
    },
    genre: [{
        type: String,
        enum: ['pop', 'rock', 'jazz', 'classical', 'electronic', 'hip-hop', 'country', 'folk', 'blues', 'reggae', 'metal', 'indie', 'ambient', 'world'],
        lowercase: true
    }],
    mood: [{
        type: String,
        enum: ['happy', 'sad', 'energetic', 'calm', 'romantic', 'angry', 'nostalgic', 'peaceful', 'uplifting', 'melancholic', 'relaxing', 'motivational'],
        lowercase: true
    }],
    tags: [{
        type: String,
        lowercase: true,
        trim: true
    }],
    followers: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    playCount: {
        type: Number,
        default: 0,
        min: 0
    },
    likeCount: {
        type: Number,
        default: 0,
        min: 0
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Virtual for total duration
playlistSchema.virtual('totalDuration').get(function() {
    if (!this.populated('tracks.track')) return 0;
    
    return this.tracks.reduce((total, item) => {
        return total + (item.track?.duration || 0);
    }, 0);
});

// Virtual for formatted total duration
playlistSchema.virtual('formattedDuration').get(function() {
    const totalSeconds = this.totalDuration;
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    
    if (hours > 0) {
        return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
});

// Virtual for track count
playlistSchema.virtual('trackCount').get(function() {
    return this.tracks.length;
});

// Virtual for follower count
playlistSchema.virtual('followerCount').get(function() {
    return this.followers.length;
});

// Indexes for performance
playlistSchema.index({ owner: 1, name: 1 });
playlistSchema.index({ isPublic: 1, playCount: -1 });
playlistSchema.index({ genre: 1, mood: 1 });
playlistSchema.index({ isAIGenerated: 1, aiGeneratedAt: -1 });
playlistSchema.index({ name: 'text', description: 'text', tags: 'text' });

// Static method to get public playlists
playlistSchema.statics.getPublicPlaylists = function(limit = 20, skip = 0) {
    return this.find({ isPublic: true, isActive: true })
        .populate('owner', 'username profilePicture')
        .populate('tracks.track', 'title artist duration thumbnail')
        .sort({ playCount: -1, createdAt: -1 })
        .limit(limit)
        .skip(skip)
        .select('-__v');
};

// Static method to get AI-generated playlists
playlistSchema.statics.getAIPlaylists = function(limit = 20) {
    return this.find({ 
        isAIGenerated: true, 
        isPublic: true, 
        isActive: true 
    })
    .populate('owner', 'username profilePicture')
    .populate('tracks.track', 'title artist duration thumbnail')
    .sort({ aiGeneratedAt: -1 })
    .limit(limit)
    .select('-__v');
};

// Static method to search playlists
playlistSchema.statics.searchPlaylists = function(query, filters = {}) {
    const searchQuery = { 
        isPublic: true, 
        isActive: true, 
        ...filters 
    };
    
    if (query) {
        searchQuery.$text = { $search: query };
    }
    
    return this.find(searchQuery)
        .populate('owner', 'username profilePicture')
        .populate('tracks.track', 'title artist duration thumbnail')
        .sort({ playCount: -1 })
        .select('-__v');
};

// Method to add track to playlist
playlistSchema.methods.addTrack = function(trackId, userId) {
    // Check if track already exists
    const existingTrack = this.tracks.find(
        item => item.track.toString() === trackId.toString()
    );
    
    if (existingTrack) {
        throw new Error('Track already exists in playlist');
    }
    
    this.tracks.push({
        track: trackId,
        addedBy: userId,
        addedAt: new Date()
    });
    
    return this.save();
};

// Method to remove track from playlist
playlistSchema.methods.removeTrack = function(trackId) {
    this.tracks = this.tracks.filter(
        item => item.track.toString() !== trackId.toString()
    );
    
    return this.save();
};

// Method to reorder tracks
playlistSchema.methods.reorderTracks = function(trackOrder) {
    const reorderedTracks = [];
    
    trackOrder.forEach(trackId => {
        const track = this.tracks.find(
            item => item.track.toString() === trackId.toString()
        );
        if (track) {
            reorderedTracks.push(track);
        }
    });
    
    this.tracks = reorderedTracks;
    return this.save();
};

// Method to increment play count
playlistSchema.methods.incrementPlay = function() {
    this.playCount += 1;
    return this.save();
};

// Method to toggle follow
playlistSchema.methods.toggleFollow = function(userId) {
    const index = this.followers.indexOf(userId);
    if (index > -1) {
        this.followers.splice(index, 1);
        return false; // unfollowed
    } else {
        this.followers.push(userId);
        return true; // followed
    }
};

// Pre-save middleware to extract genres and moods from tracks
playlistSchema.pre('save', async function(next) {
    if (this.isModified('tracks') && this.tracks.length > 0) {
        try {
            await this.populate('tracks.track', 'genre mood');
            
            const genres = new Set();
            const moods = new Set();
            
            this.tracks.forEach(item => {
                if (item.track && item.track.genre) {
                    genres.add(item.track.genre);
                }
                if (item.track && item.track.mood) {
                    item.track.mood.forEach(mood => moods.add(mood));
                }
            });
            
            this.genre = Array.from(genres);
            this.mood = Array.from(moods);
        } catch (error) {
            console.error('Error populating tracks:', error);
        }
    }
    next();
});

module.exports = mongoose.model('Playlist', playlistSchema);
