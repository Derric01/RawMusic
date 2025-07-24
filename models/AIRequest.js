const mongoose = require('mongoose');

const aiRequestSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'User is required for AI request']
    },
    prompt: {
        type: String,
        required: [true, 'Prompt is required'],
        trim: true,
        maxlength: [500, 'Prompt cannot exceed 500 characters']
    },
    normalizedPrompt: {
        type: String,
        trim: true
    },
    extractedKeywords: [{
        type: String,
        lowercase: true,
        trim: true
    }],
    extractedMoods: [{
        type: String,
        enum: ['happy', 'sad', 'energetic', 'calm', 'romantic', 'angry', 'nostalgic', 'peaceful', 'uplifting', 'melancholic', 'relaxing', 'motivational'],
        lowercase: true
    }],
    extractedGenres: [{
        type: String,
        enum: ['pop', 'rock', 'jazz', 'classical', 'electronic', 'hip-hop', 'country', 'folk', 'blues', 'reggae', 'metal', 'indie', 'ambient', 'world'],
        lowercase: true
    }],
    geminiResponse: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    },
    generatedTracks: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Track'
    }],
    generatedPlaylist: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Playlist'
    },
    requestType: {
        type: String,
        enum: ['playlist_generation', 'track_recommendation', 'mood_analysis'],
        default: 'playlist_generation'
    },
    status: {
        type: String,
        enum: ['pending', 'processing', 'completed', 'failed'],
        default: 'pending'
    },
    processingTime: {
        type: Number, // in milliseconds
        default: 0
    },
    errorMessage: {
        type: String,
        default: ''
    },
    satisfaction: {
        rating: {
            type: Number,
            min: 1,
            max: 5
        },
        feedback: {
            type: String,
            maxlength: [1000, 'Feedback cannot exceed 1000 characters']
        },
        ratedAt: {
            type: Date
        }
    },
    isBookmarked: {
        type: Boolean,
        default: false
    },
    usageCount: {
        type: Number,
        default: 1,
        min: 1
    },
    lastUsed: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Virtual for formatted processing time
aiRequestSchema.virtual('formattedProcessingTime').get(function() {
    if (this.processingTime < 1000) {
        return `${this.processingTime}ms`;
    }
    return `${(this.processingTime / 1000).toFixed(2)}s`;
});

// Virtual for success rate
aiRequestSchema.virtual('isSuccessful').get(function() {
    return this.status === 'completed' && this.generatedTracks.length > 0;
});

// Indexes for performance
aiRequestSchema.index({ user: 1, createdAt: -1 });
aiRequestSchema.index({ status: 1, createdAt: -1 });
aiRequestSchema.index({ extractedMoods: 1, extractedGenres: 1 });
aiRequestSchema.index({ isBookmarked: 1, user: 1 });
aiRequestSchema.index({ prompt: 'text', normalizedPrompt: 'text', extractedKeywords: 'text' });

// Static method to get user's AI history
aiRequestSchema.statics.getUserHistory = function(userId, limit = 20, skip = 0) {
    return this.find({ user: userId })
        .populate('generatedPlaylist', 'name trackCount')
        .populate('generatedTracks', 'title artist')
        .sort({ createdAt: -1 })
        .limit(limit)
        .skip(skip)
        .select('-geminiResponse -__v');
};

// Static method to get successful requests
aiRequestSchema.statics.getSuccessfulRequests = function(limit = 100) {
    return this.find({ 
        status: 'completed',
        'generatedTracks.0': { $exists: true }
    })
    .populate('user', 'username')
    .populate('generatedPlaylist', 'name playCount')
    .sort({ createdAt: -1 })
    .limit(limit)
    .select('-geminiResponse -__v');
};

// Static method to get popular prompts
aiRequestSchema.statics.getPopularPrompts = function(limit = 10) {
    return this.aggregate([
        {
            $match: { 
                status: 'completed',
                'generatedTracks.0': { $exists: true }
            }
        },
        {
            $group: {
                _id: '$normalizedPrompt',
                count: { $sum: '$usageCount' },
                averageRating: { $avg: '$satisfaction.rating' },
                lastUsed: { $max: '$lastUsed' },
                originalPrompt: { $first: '$prompt' }
            }
        },
        {
            $sort: { count: -1, lastUsed: -1 }
        },
        {
            $limit: limit
        }
    ]);
};

// Static method to get mood/genre analytics
aiRequestSchema.statics.getMoodGenreAnalytics = function() {
    return this.aggregate([
        {
            $match: { 
                status: 'completed',
                'generatedTracks.0': { $exists: true }
            }
        },
        {
            $facet: {
                moodAnalytics: [
                    { $unwind: '$extractedMoods' },
                    {
                        $group: {
                            _id: '$extractedMoods',
                            count: { $sum: 1 },
                            averageRating: { $avg: '$satisfaction.rating' }
                        }
                    },
                    { $sort: { count: -1 } }
                ],
                genreAnalytics: [
                    { $unwind: '$extractedGenres' },
                    {
                        $group: {
                            _id: '$extractedGenres',
                            count: { $sum: 1 },
                            averageRating: { $avg: '$satisfaction.rating' }
                        }
                    },
                    { $sort: { count: -1 } }
                ]
            }
        }
    ]);
};

// Method to mark as used
aiRequestSchema.methods.markAsUsed = function() {
    this.usageCount += 1;
    this.lastUsed = new Date();
    return this.save();
};

// Method to rate the AI request
aiRequestSchema.methods.rateSatisfaction = function(rating, feedback = '') {
    this.satisfaction = {
        rating,
        feedback,
        ratedAt: new Date()
    };
    return this.save();
};

// Method to normalize prompt for similarity matching
aiRequestSchema.methods.normalizePrompt = function() {
    const normalized = this.prompt
        .toLowerCase()
        .replace(/[^\w\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    
    this.normalizedPrompt = normalized;
    return normalized;
};

// Pre-save middleware to normalize prompt
aiRequestSchema.pre('save', function(next) {
    if (this.isModified('prompt')) {
        this.normalizePrompt();
    }
    next();
});

// Method to update status with timing
aiRequestSchema.methods.updateStatus = function(status, errorMessage = '') {
    const now = Date.now();
    
    if (status === 'processing' && this.status === 'pending') {
        this.processingStartTime = now;
    }
    
    if (status === 'completed' || status === 'failed') {
        if (this.processingStartTime) {
            this.processingTime = now - this.processingStartTime;
        }
    }
    
    this.status = status;
    if (errorMessage) {
        this.errorMessage = errorMessage;
    }
    
    return this.save();
};

module.exports = mongoose.model('AIRequest', aiRequestSchema);
