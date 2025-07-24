const express = require('express');
const {
    getUserProfile,
    getListeningHistory,
    getUserStats,
    clearListeningHistory,
    getUserRecommendations,
    exportUserData
} = require('../controllers/userController');
const { protect, optionalAuth } = require('../middleware/auth');

const router = express.Router();

// Public routes (for viewing other users' profiles)
router.get('/profile/:userId', optionalAuth, getUserProfile);

// Protected routes
router.use(protect); // All routes below require authentication

// Own profile and stats
router.get('/profile', getUserProfile); // Get own profile
router.get('/stats', getUserStats);
router.get('/history', getListeningHistory);
router.delete('/history', clearListeningHistory);

// Recommendations and insights
router.get('/recommendations', getUserRecommendations);

// Data export (GDPR compliance)
router.get('/export', exportUserData);

module.exports = router;
