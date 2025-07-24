const express = require('express');
const {
    getTracks,
    getTrack,
    searchTracks,
    getTrendingTracks,
    getTracksByMood,
    toggleLike,
    recordPlay,
    getLikedTracks,
    getRecommendations
} = require('../controllers/trackController');
const { protect, optionalAuth } = require('../middleware/auth');

const router = express.Router();

// Public routes (with optional auth for enhanced features)
router.get('/', optionalAuth, getTracks);
router.get('/search', optionalAuth, searchTracks);
router.get('/trending', getTrendingTracks);
router.get('/mood/:mood', getTracksByMood);
router.get('/:id', optionalAuth, getTrack);

// Routes that can benefit from auth but don't require it
router.post('/:id/play', optionalAuth, recordPlay);

// Protected routes
router.use(protect); // All routes below require authentication

router.get('/user/liked', getLikedTracks);
router.get('/user/recommendations', getRecommendations);
router.post('/:id/like', toggleLike);

module.exports = router;
