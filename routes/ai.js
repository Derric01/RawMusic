const express = require('express');
const {
    generatePlaylist,
    getAIHistory,
    regeneratePlaylist,
    ratePlaylist,
    getAIAnalytics,
    generateValidation,
    ratingValidation
} = require('../controllers/aiController');
const { protect, aiRateLimit } = require('../middleware/auth');

const router = express.Router();

// All AI routes require authentication
router.use(protect);

// AI playlist generation
router.post('/generate', aiRateLimit, generateValidation, generatePlaylist);

// AI request management
router.get('/history', getAIHistory);
router.post('/regenerate/:requestId', aiRateLimit, regeneratePlaylist);
router.post('/rate/:requestId', ratingValidation, ratePlaylist);

// AI analytics and insights
router.get('/analytics', getAIAnalytics);

module.exports = router;
