const express = require('express');
const {
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
} = require('../controllers/playlistController');
const { protect, optionalAuth } = require('../middleware/auth');

const router = express.Router();

// Public routes
router.get('/public', getPublicPlaylists);

// Routes with optional auth for enhanced features
router.get('/:id', optionalAuth, getPlaylist);

// Protected routes
router.use(protect); // All routes below require authentication

router.get('/', getUserPlaylists);
router.post('/', createPlaylistValidation, createPlaylist);
router.put('/:id', updatePlaylistValidation, updatePlaylist);
router.delete('/:id', deletePlaylist);

// Track management within playlists
router.post('/:id/tracks', addTrackValidation, addTrackToPlaylist);
router.delete('/:id/tracks/:trackId', removeTrackFromPlaylist);

// Social features
router.post('/:id/follow', toggleFollowPlaylist);

module.exports = router;
