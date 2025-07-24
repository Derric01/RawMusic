const User = require('../models/User');
const Track = require('../models/Track');
const Playlist = require('../models/Playlist');
const AIRequest = require('../models/AIRequest');

// @desc    Get user profile and stats
// @route   GET /api/user/profile/:userId?
// @access  Public (for public profiles) / Private (for own profile)
const getUserProfile = async (req, res, next) => {
    try {
        const userId = req.params.userId || req.user._id;
        const isOwnProfile = req.user && req.user._id.toString() === userId.toString();

        const user = await User.findById(userId)
            .select(isOwnProfile ? '-password' : 'username profilePicture bio preferences.favoriteGenres stats joinedDate')
            .populate('likedTracks', 'title artist thumbnail')
            .populate({
                path: 'playlists',
                match: isOwnProfile ? {} : { isPublic: true },
                select: 'name trackCount isPublic createdAt coverImage',
                populate: {
                    path: 'tracks.track',
                    select: 'title artist thumbnail'
                }
            });

        if (!user) {
            return res.status(404).json({
                status: 'error',
                message: 'User not found'
            });
        }

        // Get additional stats for own profile
        let additionalStats = {};
        if (isOwnProfile) {
            const [totalPlaylists, totalLikedTracks, aiRequestsCount] = await Promise.all([
                Playlist.countDocuments({ owner: userId, isActive: true }),
                user.likedTracks.length,
                AIRequest.countDocuments({ user: userId, status: 'completed' })
            ]);

            additionalStats = {
                totalPlaylists,
                totalLikedTracks,
                aiPlaylistsGenerated: aiRequestsCount,
                recentListening: user.recentListening,
                topGenres: user.topGenres
            };
        }

        res.json({
            status: 'success',
            data: {
                user,
                isOwnProfile,
                ...additionalStats
            }
        });

    } catch (error) {
        next(error);
    }
};

// @desc    Get user's listening history
// @route   GET /api/user/history
// @access  Private
const getListeningHistory = async (req, res, next) => {
    try {
        const { page = 1, limit = 50 } = req.query;
        const skip = (page - 1) * limit;
        const limitNum = Math.min(parseInt(limit), 100);

        const user = await User.findById(req.user._id)
            .populate({
                path: 'listeningHistory.track',
                select: 'title artist album duration thumbnail genre',
                match: { isActive: true }
            });

        // Filter out inactive tracks and paginate
        const validHistory = user.listeningHistory
            .filter(entry => entry.track)
            .slice(skip, skip + limitNum);

        const totalHistory = user.listeningHistory.filter(entry => entry.track).length;

        res.json({
            status: 'success',
            data: {
                history: validHistory,
                pagination: {
                    currentPage: parseInt(page),
                    totalPages: Math.ceil(totalHistory / limitNum),
                    totalTracks: totalHistory,
                    limit: limitNum
                }
            }
        });

    } catch (error) {
        next(error);
    }
};

// @desc    Get user's detailed stats
// @route   GET /api/user/stats
// @access  Private
const getUserStats = async (req, res, next) => {
    try {
        const user = await User.findById(req.user._id)
            .populate('listeningHistory.track', 'genre mood duration');

        // Calculate detailed statistics
        const stats = {
            overview: {
                totalListeningTime: user.stats.totalListeningTime,
                totalTracks: user.stats.totalTracks,
                memberSince: user.stats.joinedDate
            },
            genres: {},
            moods: {},
            daily: {},
            monthly: {}
        };

        // Analyze listening history
        user.listeningHistory.forEach(entry => {
            if (entry.track) {
                const track = entry.track;
                const playedAt = entry.playedAt;
                
                // Genre stats
                if (track.genre) {
                    stats.genres[track.genre] = (stats.genres[track.genre] || 0) + 1;
                }

                // Mood stats
                if (track.mood && track.mood.length > 0) {
                    track.mood.forEach(mood => {
                        stats.moods[mood] = (stats.moods[mood] || 0) + 1;
                    });
                }

                // Daily stats (last 30 days)
                const dayKey = playedAt.toISOString().split('T')[0];
                stats.daily[dayKey] = (stats.daily[dayKey] || 0) + 1;

                // Monthly stats (last 12 months)
                const monthKey = `${playedAt.getFullYear()}-${(playedAt.getMonth() + 1).toString().padStart(2, '0')}`;
                stats.monthly[monthKey] = (stats.monthly[monthKey] || 0) + 1;
            }
        });

        // Sort and limit genre/mood stats
        stats.topGenres = Object.entries(stats.genres)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 5)
            .map(([genre, count]) => ({ genre, count }));

        stats.topMoods = Object.entries(stats.moods)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 5)
            .map(([mood, count]) => ({ mood, count }));

        // Get recent activity (last 7 days)
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        const recentActivity = Object.entries(stats.daily)
            .filter(([date]) => new Date(date) >= sevenDaysAgo)
            .sort(([a], [b]) => new Date(b) - new Date(a))
            .map(([date, count]) => ({ date, count }));

        // Calculate additional metrics
        const totalPlaylistsCreated = await Playlist.countDocuments({ 
            owner: req.user._id, 
            isActive: true 
        });

        const totalAIRequests = await AIRequest.countDocuments({ 
            user: req.user._id 
        });

        const likedTracksCount = user.likedTracks.length;

        res.json({
            status: 'success',
            data: {
                stats: {
                    ...stats.overview,
                    totalPlaylistsCreated,
                    totalAIRequests,
                    likedTracksCount
                },
                topGenres: stats.topGenres,
                topMoods: stats.topMoods,
                recentActivity,
                monthlyListening: Object.entries(stats.monthly)
                    .sort(([a], [b]) => new Date(b + '-01') - new Date(a + '-01'))
                    .slice(0, 12)
                    .map(([month, count]) => ({ month, count }))
            }
        });

    } catch (error) {
        next(error);
    }
};

// @desc    Clear user's listening history
// @route   DELETE /api/user/history
// @access  Private
const clearListeningHistory = async (req, res, next) => {
    try {
        const user = await User.findById(req.user._id);
        user.listeningHistory = [];
        await user.save();

        res.json({
            status: 'success',
            message: 'Listening history cleared successfully'
        });

    } catch (error) {
        next(error);
    }
};

// @desc    Get user's recommendations based on activity
// @route   GET /api/user/recommendations
// @access  Private
const getUserRecommendations = async (req, res, next) => {
    try {
        const { type = 'all', limit = 20 } = req.query;
        const limitNum = Math.min(parseInt(limit), 50);

        const user = await User.findById(req.user._id)
            .populate('listeningHistory.track', 'genre mood')
            .populate('likedTracks', 'genre mood');

        const recommendations = {
            tracks: [],
            playlists: []
        };

        // Analyze user preferences from listening history and liked tracks
        const genrePreferences = {};
        const moodPreferences = {};

        // Analyze listening history
        user.listeningHistory.forEach(entry => {
            if (entry.track) {
                if (entry.track.genre) {
                    genrePreferences[entry.track.genre] = (genrePreferences[entry.track.genre] || 0) + 1;
                }
                if (entry.track.mood) {
                    entry.track.mood.forEach(mood => {
                        moodPreferences[mood] = (moodPreferences[mood] || 0) + 1;
                    });
                }
            }
        });

        // Analyze liked tracks (give more weight)
        user.likedTracks.forEach(track => {
            if (track.genre) {
                genrePreferences[track.genre] = (genrePreferences[track.genre] || 0) + 2;
            }
            if (track.mood) {
                track.mood.forEach(mood => {
                    moodPreferences[mood] = (moodPreferences[mood] || 0) + 2;
                });
            }
        });

        // Get top preferences
        const topGenres = Object.entries(genrePreferences)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 3)
            .map(([genre]) => genre);

        const topMoods = Object.entries(moodPreferences)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 3)
            .map(([mood]) => mood);

        // Get tracks user hasn't interacted with
        const userTrackIds = [
            ...user.listeningHistory.map(entry => entry.track?._id).filter(Boolean),
            ...user.likedTracks.map(track => track._id)
        ];

        // Recommend tracks
        if (type === 'all' || type === 'tracks') {
            const recommendedTracks = await Track.find({
                _id: { $nin: userTrackIds },
                isActive: true,
                $or: [
                    { genre: { $in: topGenres } },
                    { mood: { $in: topMoods } }
                ]
            })
            .sort({ popularity: -1 })
            .limit(limitNum)
            .select('-__v');

            recommendations.tracks = recommendedTracks;
        }

        // Recommend public playlists
        if (type === 'all' || type === 'playlists') {
            const userPlaylistIds = user.playlists || [];
            
            const recommendedPlaylists = await Playlist.find({
                _id: { $nin: userPlaylistIds },
                owner: { $ne: req.user._id },
                isPublic: true,
                isActive: true,
                $or: [
                    { genre: { $in: topGenres } },
                    { mood: { $in: topMoods } }
                ]
            })
            .populate('owner', 'username profilePicture')
            .populate('tracks.track', 'title artist thumbnail')
            .sort({ playCount: -1, followerCount: -1 })
            .limit(Math.floor(limitNum / 2))
            .select('-__v');

            recommendations.playlists = recommendedPlaylists;
        }

        res.json({
            status: 'success',
            data: {
                recommendations,
                basedOn: {
                    topGenres,
                    topMoods,
                    totalInteractions: user.listeningHistory.length + user.likedTracks.length
                }
            }
        });

    } catch (error) {
        next(error);
    }
};

// @desc    Export user data (GDPR compliance)
// @route   GET /api/user/export
// @access  Private
const exportUserData = async (req, res, next) => {
    try {
        const user = await User.findById(req.user._id)
            .populate('likedTracks', 'title artist album')
            .populate('playlists', 'name description createdAt')
            .populate('listeningHistory.track', 'title artist');

        const aiRequests = await AIRequest.find({ user: req.user._id })
            .select('prompt status createdAt extractedMoods extractedGenres')
            .populate('generatedPlaylist', 'name');

        const exportData = {
            profile: {
                username: user.username,
                email: user.email,
                bio: user.bio,
                joinDate: user.createdAt,
                preferences: user.preferences,
                stats: user.stats
            },
            likedTracks: user.likedTracks,
            playlists: user.playlists,
            listeningHistory: user.listeningHistory,
            aiRequests,
            exportDate: new Date().toISOString()
        };

        res.json({
            status: 'success',
            data: exportData
        });

    } catch (error) {
        next(error);
    }
};

module.exports = {
    getUserProfile,
    getListeningHistory,
    getUserStats,
    clearListeningHistory,
    getUserRecommendations,
    exportUserData
};
