const { validationResult, body } = require('express-validator');
const Playlist = require('../models/Playlist');
const Track = require('../models/Track');
const User = require('../models/User');

// @desc    Get user's playlists
// @route   GET /api/playlists
// @access  Private
const getUserPlaylists = async (req, res, next) => {
    try {
        const { page = 1, limit = 20, includePublic = false } = req.query;
        const skip = (page - 1) * limit;
        const limitNum = Math.min(parseInt(limit), 50);

        // Build query
        const query = { owner: req.user._id, isActive: true };
        if (!includePublic) {
            query.isPublic = { $in: [true, false] }; // Get all playlists
        }

        const playlists = await Playlist.find(query)
            .populate('tracks.track', 'title artist duration thumbnail')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limitNum)
            .select('-__v');

        const total = await Playlist.countDocuments(query);

        res.json({
            status: 'success',
            data: {
                playlists,
                pagination: {
                    currentPage: parseInt(page),
                    totalPages: Math.ceil(total / limitNum),
                    totalPlaylists: total,
                    limit: limitNum
                }
            }
        });

    } catch (error) {
        next(error);
    }
};

// @desc    Get public playlists
// @route   GET /api/playlists/public
// @access  Public
const getPublicPlaylists = async (req, res, next) => {
    try {
        const { page = 1, limit = 20 } = req.query;
        const skip = (page - 1) * limit;
        const limitNum = Math.min(parseInt(limit), 50);

        const playlists = await Playlist.getPublicPlaylists(limitNum, skip);
        const total = await Playlist.countDocuments({ isPublic: true, isActive: true });

        res.json({
            status: 'success',
            data: {
                playlists,
                pagination: {
                    currentPage: parseInt(page),
                    totalPages: Math.ceil(total / limitNum),
                    totalPlaylists: total,
                    limit: limitNum
                }
            }
        });

    } catch (error) {
        next(error);
    }
};

// @desc    Get single playlist
// @route   GET /api/playlists/:id
// @access  Public (if public) / Private (if owned)
const getPlaylist = async (req, res, next) => {
    try {
        const playlist = await Playlist.findById(req.params.id)
            .populate('owner', 'username profilePicture')
            .populate('tracks.track', 'title artist album duration thumbnail genre mood')
            .populate('tracks.addedBy', 'username')
            .select('-__v');

        if (!playlist || !playlist.isActive) {
            return res.status(404).json({
                status: 'error',
                message: 'Playlist not found'
            });
        }

        // Check if user can access this playlist
        const canAccess = playlist.isPublic || 
                         (req.user && playlist.owner._id.toString() === req.user._id.toString());

        if (!canAccess) {
            return res.status(403).json({
                status: 'error',
                message: 'Access denied. This playlist is private.'
            });
        }

        // Check if user follows this playlist (if authenticated)
        let isFollowing = false;
        if (req.user) {
            isFollowing = playlist.followers.includes(req.user._id);
        }

        res.json({
            status: 'success',
            data: {
                playlist,
                isFollowing,
                isOwner: req.user ? playlist.owner._id.toString() === req.user._id.toString() : false
            }
        });

    } catch (error) {
        next(error);
    }
};

// @desc    Create new playlist
// @route   POST /api/playlists
// @access  Private
const createPlaylist = async (req, res, next) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                status: 'error',
                message: 'Validation failed',
                errors: errors.array()
            });
        }

        const { name, description, isPublic = false, trackIds = [] } = req.body;

        // Validate track IDs if provided
        let validTracks = [];
        if (trackIds.length > 0) {
            validTracks = await Track.find({
                _id: { $in: trackIds },
                isActive: true
            }).select('_id');

            if (validTracks.length !== trackIds.length) {
                return res.status(400).json({
                    status: 'error',
                    message: 'Some tracks were not found or are inactive'
                });
            }
        }

        // Create playlist
        const playlist = await Playlist.create({
            name,
            description,
            owner: req.user._id,
            isPublic,
            tracks: validTracks.map(track => ({
                track: track._id,
                addedBy: req.user._id
            }))
        });

        // Add playlist to user's playlists
        const user = await User.findById(req.user._id);
        user.playlists.push(playlist._id);
        await user.save();

        // Populate the created playlist
        await playlist.populate([
            { path: 'tracks.track', select: 'title artist duration thumbnail' },
            { path: 'owner', select: 'username profilePicture' }
        ]);

        res.status(201).json({
            status: 'success',
            message: 'Playlist created successfully',
            data: {
                playlist
            }
        });

    } catch (error) {
        next(error);
    }
};

// @desc    Update playlist
// @route   PUT /api/playlists/:id
// @access  Private (owner only)
const updatePlaylist = async (req, res, next) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                status: 'error',
                message: 'Validation failed',
                errors: errors.array()
            });
        }

        const playlist = await Playlist.findById(req.params.id);

        if (!playlist || !playlist.isActive) {
            return res.status(404).json({
                status: 'error',
                message: 'Playlist not found'
            });
        }

        // Check ownership
        if (playlist.owner.toString() !== req.user._id.toString()) {
            return res.status(403).json({
                status: 'error',
                message: 'Access denied. You can only edit your own playlists.'
            });
        }

        const { name, description, isPublic, coverImage } = req.body;

        // Update fields
        if (name !== undefined) playlist.name = name;
        if (description !== undefined) playlist.description = description;
        if (isPublic !== undefined) playlist.isPublic = isPublic;
        if (coverImage !== undefined) playlist.coverImage = coverImage;

        await playlist.save();

        // Populate updated playlist
        await playlist.populate([
            { path: 'tracks.track', select: 'title artist duration thumbnail' },
            { path: 'owner', select: 'username profilePicture' }
        ]);

        res.json({
            status: 'success',
            message: 'Playlist updated successfully',
            data: {
                playlist
            }
        });

    } catch (error) {
        next(error);
    }
};

// @desc    Delete playlist
// @route   DELETE /api/playlists/:id
// @access  Private (owner only)
const deletePlaylist = async (req, res, next) => {
    try {
        const playlist = await Playlist.findById(req.params.id);

        if (!playlist || !playlist.isActive) {
            return res.status(404).json({
                status: 'error',
                message: 'Playlist not found'
            });
        }

        // Check ownership
        if (playlist.owner.toString() !== req.user._id.toString()) {
            return res.status(403).json({
                status: 'error',
                message: 'Access denied. You can only delete your own playlists.'
            });
        }

        // Soft delete (mark as inactive)
        playlist.isActive = false;
        await playlist.save();

        // Remove from user's playlists
        const user = await User.findById(req.user._id);
        user.playlists.pull(playlist._id);
        await user.save();

        res.json({
            status: 'success',
            message: 'Playlist deleted successfully'
        });

    } catch (error) {
        next(error);
    }
};

// @desc    Add track to playlist
// @route   POST /api/playlists/:id/tracks
// @access  Private (owner only)
const addTrackToPlaylist = async (req, res, next) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                status: 'error',
                message: 'Validation failed',
                errors: errors.array()
            });
        }

        const { trackId } = req.body;
        const playlist = await Playlist.findById(req.params.id);

        if (!playlist || !playlist.isActive) {
            return res.status(404).json({
                status: 'error',
                message: 'Playlist not found'
            });
        }

        // Check ownership
        if (playlist.owner.toString() !== req.user._id.toString()) {
            return res.status(403).json({
                status: 'error',
                message: 'Access denied. You can only modify your own playlists.'
            });
        }

        // Validate track
        const track = await Track.findById(trackId);
        if (!track || !track.isActive) {
            return res.status(404).json({
                status: 'error',
                message: 'Track not found'
            });
        }

        try {
            await playlist.addTrack(trackId, req.user._id);
        } catch (error) {
            if (error.message === 'Track already exists in playlist') {
                return res.status(400).json({
                    status: 'error',
                    message: 'Track is already in this playlist'
                });
            }
            throw error;
        }

        // Populate updated playlist
        await playlist.populate('tracks.track', 'title artist duration thumbnail');

        res.json({
            status: 'success',
            message: 'Track added to playlist successfully',
            data: {
                playlist: {
                    _id: playlist._id,
                    name: playlist.name,
                    trackCount: playlist.trackCount,
                    tracks: playlist.tracks
                }
            }
        });

    } catch (error) {
        next(error);
    }
};

// @desc    Remove track from playlist
// @route   DELETE /api/playlists/:id/tracks/:trackId
// @access  Private (owner only)
const removeTrackFromPlaylist = async (req, res, next) => {
    try {
        const { trackId } = req.params;
        const playlist = await Playlist.findById(req.params.id);

        if (!playlist || !playlist.isActive) {
            return res.status(404).json({
                status: 'error',
                message: 'Playlist not found'
            });
        }

        // Check ownership
        if (playlist.owner.toString() !== req.user._id.toString()) {
            return res.status(403).json({
                status: 'error',
                message: 'Access denied. You can only modify your own playlists.'
            });
        }

        await playlist.removeTrack(trackId);

        res.json({
            status: 'success',
            message: 'Track removed from playlist successfully',
            data: {
                playlist: {
                    _id: playlist._id,
                    name: playlist.name,
                    trackCount: playlist.trackCount
                }
            }
        });

    } catch (error) {
        next(error);
    }
};

// @desc    Toggle follow playlist
// @route   POST /api/playlists/:id/follow
// @access  Private
const toggleFollowPlaylist = async (req, res, next) => {
    try {
        const playlist = await Playlist.findById(req.params.id);

        if (!playlist || !playlist.isActive || !playlist.isPublic) {
            return res.status(404).json({
                status: 'error',
                message: 'Playlist not found or not public'
            });
        }

        // Can't follow own playlist
        if (playlist.owner.toString() === req.user._id.toString()) {
            return res.status(400).json({
                status: 'error',
                message: 'You cannot follow your own playlist'
            });
        }

        const isFollowing = playlist.toggleFollow(req.user._id);
        await playlist.save();

        res.json({
            status: 'success',
            message: isFollowing ? 'Playlist followed' : 'Playlist unfollowed',
            data: {
                isFollowing,
                followerCount: playlist.followerCount
            }
        });

    } catch (error) {
        next(error);
    }
};

// Validation rules
const createPlaylistValidation = [
    body('name')
        .trim()
        .isLength({ min: 1, max: 100 })
        .withMessage('Playlist name must be between 1 and 100 characters'),
    body('description')
        .optional()
        .trim()
        .isLength({ max: 500 })
        .withMessage('Description cannot exceed 500 characters'),
    body('isPublic')
        .optional()
        .isBoolean()
        .withMessage('isPublic must be a boolean'),
    body('trackIds')
        .optional()
        .isArray()
        .withMessage('trackIds must be an array')
];

const updatePlaylistValidation = [
    body('name')
        .optional()
        .trim()
        .isLength({ min: 1, max: 100 })
        .withMessage('Playlist name must be between 1 and 100 characters'),
    body('description')
        .optional()
        .trim()
        .isLength({ max: 500 })
        .withMessage('Description cannot exceed 500 characters'),
    body('isPublic')
        .optional()
        .isBoolean()
        .withMessage('isPublic must be a boolean')
];

const addTrackValidation = [
    body('trackId')
        .isMongoId()
        .withMessage('Valid track ID is required')
];

module.exports = {
    getUserPlaylists,
    getPublicPlaylists,
    getPlaylist,
    createPlaylist,
    updatePlaylist,
    deletePlaylist,
    addTrackToPlaylist,
    removeTrackFromPlaylist,
    toggleFollowPlaylist,
    createPlaylistValidation,
    updatePlaylistValidation,
    addTrackValidation
};
