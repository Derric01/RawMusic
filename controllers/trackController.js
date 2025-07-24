const { validationResult } = require('express-validator');
const Track = require('../models/Track');
const User = require('../models/User');

// @desc    Get all tracks with filtering and pagination
// @route   GET /api/tracks
// @access  Public
const getTracks = async (req, res, next) => {
    try {
        const {
            page = 1,
            limit = 20,
            genre,
            mood,
            search,
            sortBy = 'popularity',
            sortOrder = 'desc'
        } = req.query;

        // Build filter object
        const filter = { isActive: true };

        if (genre) {
            filter.genre = { $in: genre.split(',') };
        }

        if (mood) {
            filter.mood = { $in: mood.split(',') };
        }

        if (search) {
            filter.$text = { $search: search };
        }

        // Build sort object
        const sortObj = {};
        const validSortFields = ['popularity', 'playCount', 'createdAt', 'title', 'artist'];
        const sortField = validSortFields.includes(sortBy) ? sortBy : 'popularity';
        sortObj[sortField] = sortOrder === 'asc' ? 1 : -1;

        // Calculate pagination
        const skip = (page - 1) * limit;
        const limitNum = Math.min(parseInt(limit), 100); // Max 100 tracks per request

        // Execute query
        const tracks = await Track.find(filter)
            .sort(sortObj)
            .skip(skip)
            .limit(limitNum)
            .select('-__v');

        // Get total count for pagination
        const total = await Track.countDocuments(filter);

        // Calculate pagination info
        const totalPages = Math.ceil(total / limitNum);
        const hasNextPage = page < totalPages;
        const hasPrevPage = page > 1;

        res.json({
            status: 'success',
            data: {
                tracks,
                pagination: {
                    currentPage: parseInt(page),
                    totalPages,
                    totalTracks: total,
                    hasNextPage,
                    hasPrevPage,
                    limit: limitNum
                }
            }
        });

    } catch (error) {
        next(error);
    }
};

// @desc    Get single track
// @route   GET /api/tracks/:id
// @access  Public
const getTrack = async (req, res, next) => {
    try {
        const track = await Track.findById(req.params.id).select('-__v');

        if (!track || !track.isActive) {
            return res.status(404).json({
                status: 'error',
                message: 'Track not found'
            });
        }

        res.json({
            status: 'success',
            data: {
                track
            }
        });

    } catch (error) {
        next(error);
    }
};

// @desc    Search tracks
// @route   GET /api/tracks/search
// @access  Public
const searchTracks = async (req, res, next) => {
    try {
        const { q, limit = 20, page = 1 } = req.query;

        if (!q || q.trim().length < 2) {
            return res.status(400).json({
                status: 'error',
                message: 'Search query must be at least 2 characters long'
            });
        }

        const skip = (page - 1) * limit;
        const limitNum = Math.min(parseInt(limit), 50);

        // Search tracks using text index
        const tracks = await Track.find({
            $text: { $search: q },
            isActive: true
        })
        .sort({ score: { $meta: 'textScore' }, popularity: -1 })
        .skip(skip)
        .limit(limitNum)
        .select('-__v');

        const total = await Track.countDocuments({
            $text: { $search: q },
            isActive: true
        });

        res.json({
            status: 'success',
            data: {
                tracks,
                pagination: {
                    currentPage: parseInt(page),
                    totalPages: Math.ceil(total / limitNum),
                    totalTracks: total,
                    query: q
                }
            }
        });

    } catch (error) {
        next(error);
    }
};

// @desc    Get trending tracks
// @route   GET /api/tracks/trending
// @access  Public
const getTrendingTracks = async (req, res, next) => {
    try {
        const { limit = 50 } = req.query;
        const limitNum = Math.min(parseInt(limit), 100);

        const tracks = await Track.getTrending(limitNum);

        res.json({
            status: 'success',
            data: {
                tracks
            }
        });

    } catch (error) {
        next(error);
    }
};

// @desc    Get tracks by mood
// @route   GET /api/tracks/mood/:mood
// @access  Public
const getTracksByMood = async (req, res, next) => {
    try {
        const { mood } = req.params;
        const { limit = 20 } = req.query;

        const validMoods = ['happy', 'sad', 'energetic', 'calm', 'romantic', 'angry', 'nostalgic', 'peaceful', 'uplifting', 'melancholic', 'relaxing', 'motivational'];

        if (!validMoods.includes(mood.toLowerCase())) {
            return res.status(400).json({
                status: 'error',
                message: 'Invalid mood specified'
            });
        }

        const tracks = await Track.getByMood([mood.toLowerCase()], parseInt(limit));

        res.json({
            status: 'success',
            data: {
                tracks,
                mood: mood.toLowerCase()
            }
        });

    } catch (error) {
        next(error);
    }
};

// @desc    Toggle like track
// @route   POST /api/tracks/:id/like
// @access  Private
const toggleLike = async (req, res, next) => {
    try {
        const track = await Track.findById(req.params.id);

        if (!track || !track.isActive) {
            return res.status(404).json({
                status: 'error',
                message: 'Track not found'
            });
        }

        const user = await User.findById(req.user._id);
        const isLiked = user.toggleLike(track._id);

        // Update track like count
        if (isLiked) {
            await track.incrementLike();
        } else {
            await track.decrementLike();
        }

        await user.save();

        res.json({
            status: 'success',
            message: isLiked ? 'Track liked' : 'Track unliked',
            data: {
                isLiked,
                likeCount: track.likeCount
            }
        });

    } catch (error) {
        next(error);
    }
};

// @desc    Record track play
// @route   POST /api/tracks/:id/play
// @access  Private (optional - can work without auth)
const recordPlay = async (req, res, next) => {
    try {
        const { duration = 0 } = req.body;
        const track = await Track.findById(req.params.id);

        if (!track || !track.isActive) {
            return res.status(404).json({
                status: 'error',
                message: 'Track not found'
            });
        }

        // Increment play count
        await track.incrementPlay();

        // Add to user's listening history if authenticated
        if (req.user) {
            const user = await User.findById(req.user._id);
            user.addToHistory(track._id, duration);
            await user.save();
        }

        res.json({
            status: 'success',
            message: 'Play recorded',
            data: {
                playCount: track.playCount
            }
        });

    } catch (error) {
        next(error);
    }
};

// @desc    Get user's liked tracks
// @route   GET /api/tracks/liked
// @access  Private
const getLikedTracks = async (req, res, next) => {
    try {
        const { page = 1, limit = 20 } = req.query;
        const skip = (page - 1) * limit;
        const limitNum = Math.min(parseInt(limit), 100);

        const user = await User.findById(req.user._id)
            .populate({
                path: 'likedTracks',
                match: { isActive: true },
                options: {
                    skip: skip,
                    limit: limitNum,
                    sort: { createdAt: -1 }
                },
                select: '-__v'
            });

        const totalLiked = await User.findById(req.user._id).then(u => u.likedTracks.length);

        res.json({
            status: 'success',
            data: {
                tracks: user.likedTracks,
                pagination: {
                    currentPage: parseInt(page),
                    totalPages: Math.ceil(totalLiked / limitNum),
                    totalTracks: totalLiked,
                    limit: limitNum
                }
            }
        });

    } catch (error) {
        next(error);
    }
};

// @desc    Get track recommendations based on user's listening history
// @route   GET /api/tracks/recommendations
// @access  Private
const getRecommendations = async (req, res, next) => {
    try {
        const { limit = 20 } = req.query;
        const limitNum = Math.min(parseInt(limit), 50);

        const user = await User.findById(req.user._id)
            .populate('listeningHistory.track', 'genre mood tags');

        // Extract user's favorite genres and moods from listening history
        const genreCounts = {};
        const moodCounts = {};

        user.listeningHistory.forEach(entry => {
            if (entry.track) {
                // Count genres
                if (entry.track.genre) {
                    genreCounts[entry.track.genre] = (genreCounts[entry.track.genre] || 0) + 1;
                }
                // Count moods
                if (entry.track.mood) {
                    entry.track.mood.forEach(mood => {
                        moodCounts[mood] = (moodCounts[mood] || 0) + 1;
                    });
                }
            }
        });

        // Get top genres and moods
        const topGenres = Object.entries(genreCounts)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 3)
            .map(([genre]) => genre);

        const topMoods = Object.entries(moodCounts)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 3)
            .map(([mood]) => mood);

        // Find tracks that match user's preferences but aren't in their history
        const listenedTrackIds = user.listeningHistory.map(entry => entry.track?._id).filter(Boolean);

        const recommendations = await Track.find({
            _id: { $nin: [...listenedTrackIds, ...user.likedTracks] },
            isActive: true,
            $or: [
                { genre: { $in: topGenres } },
                { mood: { $in: topMoods } }
            ]
        })
        .sort({ popularity: -1 })
        .limit(limitNum)
        .select('-__v');

        res.json({
            status: 'success',
            data: {
                tracks: recommendations,
                basedOn: {
                    genres: topGenres,
                    moods: topMoods
                }
            }
        });

    } catch (error) {
        next(error);
    }
};

module.exports = {
    getTracks,
    getTrack,
    searchTracks,
    getTrendingTracks,
    getTracksByMood,
    toggleLike,
    recordPlay,
    getLikedTracks,
    getRecommendations
};
