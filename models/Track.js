const mongoose = require('mongoose');

const trackSchema = new mongoose.Schema({
    title: {
        type: String,
        required: [true, 'Track title is required'],
        trim: true,
        maxlength: [100, 'Title cannot exceed 100 characters']
    },
    artist: {
        type: String,
        required: [true, 'Artist name is required'],
        trim: true,
        maxlength: [100, 'Artist name cannot exceed 100 characters']
    },
    album: {
        type: String,
        trim: true,
        maxlength: [100, 'Album name cannot exceed 100 characters'],
        default: ''
    },
    duration: {
        type: Number, // duration in seconds
        required: [true, 'Duration is required'],
        min: [1, 'Duration must be at least 1 second']
    },
    genre: {
        type: String,
        required: [true, 'Genre is required'],
        enum: ['pop', 'rock', 'jazz', 'classical', 'electronic', 'hip-hop', 'country', 'folk', 'blues', 'reggae', 'metal', 'indie', 'ambient', 'world'],
        lowercase: true
    },
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
    youtubeId: {
        type: String,
        required: [true, 'YouTube ID is required'],
        match: [/^[a-zA-Z0-9_-]{11}$/, 'Invalid YouTube ID format']
    },
    youtubeUrl: {
        type: String,
        required: [true, 'YouTube URL is required']
    },
    thumbnail: {
        small: String,
        medium: String,
        large: String,
        default: String
    },
    audioQuality: {
        type: String,
        enum: ['low', 'medium', 'high'],
        default: 'medium'
    },
    popularity: {
        type: Number,
        default: 0,
        min: 0
    },
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
    releaseYear: {
        type: Number,
        min: 1900,
        max: new Date().getFullYear() + 1
    },
    language: {
        type: String,
        default: 'english',
        lowercase: true
    },
    isActive: {
        type: Boolean,
        default: true
    },
    addedBy: {
        type: String,
        default: 'system'
    },
    metadata: {
        bpm: Number,
        key: String,
        energy: {
            type: Number,
            min: 0,
            max: 1
        },
        danceability: {
            type: Number,
            min: 0,
            max: 1
        },
        valence: {
            type: Number,
            min: 0,
            max: 1
        }
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Virtual for formatted duration
trackSchema.virtual('formattedDuration').get(function() {
    const minutes = Math.floor(this.duration / 60);
    const seconds = this.duration % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
});

// Virtual for popularity score (based on plays and likes)
trackSchema.virtual('popularityScore').get(function() {
    return (this.playCount * 0.7) + (this.likeCount * 0.3);
});

// Indexes for performance
trackSchema.index({ title: 'text', artist: 'text', album: 'text', tags: 'text' });
trackSchema.index({ genre: 1, mood: 1 });
trackSchema.index({ popularity: -1 });
trackSchema.index({ playCount: -1 });
trackSchema.index({ createdAt: -1 });
trackSchema.index({ youtubeId: 1 }, { unique: true });

// Static method to search tracks
trackSchema.statics.searchTracks = function(query, filters = {}) {
    const searchQuery = { isActive: true, ...filters };
    
    if (query) {
        searchQuery.$text = { $search: query };
    }
    
    return this.find(searchQuery)
        .sort({ popularity: -1, playCount: -1 })
        .select('-__v');
};

// Static method to get tracks by mood
trackSchema.statics.getByMood = function(moods, limit = 20) {
    return this.find({
        mood: { $in: moods },
        isActive: true
    })
    .sort({ popularity: -1 })
    .limit(limit)
    .select('-__v');
};

// Static method to get trending tracks
trackSchema.statics.getTrending = function(limit = 50) {
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    
    return this.find({
        isActive: true,
        createdAt: { $gte: oneWeekAgo }
    })
    .sort({ playCount: -1, popularity: -1 })
    .limit(limit)
    .select('-__v');
};

// Method to increment play count
trackSchema.methods.incrementPlay = function() {
    this.playCount += 1;
    this.popularity = this.popularityScore;
    return this.save();
};

// Method to increment like count
trackSchema.methods.incrementLike = function() {
    this.likeCount += 1;
    this.popularity = this.popularityScore;
    return this.save();
};

// Method to decrement like count
trackSchema.methods.decrementLike = function() {
    this.likeCount = Math.max(0, this.likeCount - 1);
    this.popularity = this.popularityScore;
    return this.save();
};

module.exports = mongoose.model('Track', trackSchema);
