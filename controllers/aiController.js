const { GoogleGenerativeAI } = require('@google/generative-ai');
const { validationResult, body } = require('express-validator');
const AIRequest = require('../models/AIRequest');
const Track = require('../models/Track');
const Playlist = require('../models/Playlist');
const User = require('../models/User');

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// @desc    Generate AI playlist based on prompt
// @route   POST /api/ai/generate
// @access  Private
const generatePlaylist = async (req, res, next) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                status: 'error',
                message: 'Validation failed',
                errors: errors.array()
            });
        }

        const { prompt, playlistName, savePlaylist = true } = req.body;
        const startTime = Date.now();

        // Create AI request record
        const aiRequest = await AIRequest.create({
            user: req.user._id,
            prompt: prompt.trim(),
            requestType: 'playlist_generation'
        });

        await aiRequest.updateStatus('processing');

        try {
            // Get the generative model
            const model = genAI.getGenerativeModel({ model: "gemini-pro" });

            // Create enhanced prompt for better music recommendations
            const enhancedPrompt = `
You are a music expert AI. Based on the user's request: "${prompt}", please analyze and extract:

1. MOOD/EMOTION keywords (choose from: happy, sad, energetic, calm, romantic, angry, nostalgic, peaceful, uplifting, melancholic, relaxing, motivational)
2. GENRE preferences (choose from: pop, rock, jazz, classical, electronic, hip-hop, country, folk, blues, reggae, metal, indie, ambient, world)
3. Additional descriptive keywords or themes

Respond in this EXACT JSON format:
{
  "moods": ["mood1", "mood2"],
  "genres": ["genre1", "genre2"],
  "keywords": ["keyword1", "keyword2", "keyword3"],
  "playlistTitle": "Creative playlist name based on the prompt",
  "description": "Brief description of the playlist vibe"
}

Be creative but stay within the provided mood and genre options. Extract 1-3 moods, 1-3 genres, and 3-5 keywords.
`;

            const result = await model.generateContent(enhancedPrompt);
            const response = await result.response;
            const text = response.text();

            // Parse Gemini response
            let geminiData;
            try {
                // Clean the response (remove markdown formatting if present)
                const cleanedText = text.replace(/```json\n?|```\n?/g, '').trim();
                geminiData = JSON.parse(cleanedText);
            } catch (parseError) {
                console.error('Failed to parse Gemini response:', text);
                throw new Error('Failed to parse AI response');
            }

            // Validate extracted data
            const moods = Array.isArray(geminiData.moods) ? geminiData.moods : [];
            const genres = Array.isArray(geminiData.genres) ? geminiData.genres : [];
            const keywords = Array.isArray(geminiData.keywords) ? geminiData.keywords : [];

            // Update AI request with extracted data
            aiRequest.extractedMoods = moods;
            aiRequest.extractedGenres = genres;
            aiRequest.extractedKeywords = keywords;
            aiRequest.geminiResponse = geminiData;
            await aiRequest.save();

            // Build search query for tracks
            const searchCriteria = {
                isActive: true,
                $or: []
            };

            // Add mood criteria
            if (moods.length > 0) {
                searchCriteria.$or.push({ mood: { $in: moods } });
            }

            // Add genre criteria
            if (genres.length > 0) {
                searchCriteria.$or.push({ genre: { $in: genres } });
            }

            // Add keyword search in tags, title, or artist
            if (keywords.length > 0) {
                const keywordRegex = keywords.map(keyword => new RegExp(keyword, 'i'));
                searchCriteria.$or.push(
                    { tags: { $in: keywordRegex } },
                    { title: { $in: keywordRegex } },
                    { artist: { $in: keywordRegex } }
                );
            }

            // If no criteria matched, fall back to popularity
            if (searchCriteria.$or.length === 0) {
                delete searchCriteria.$or;
            }

            // Find matching tracks
            let tracks = await Track.find(searchCriteria)
                .sort({ popularity: -1, playCount: -1 })
                .limit(50)
                .select('-__v');

            // If not enough tracks found, get popular tracks as fallback
            if (tracks.length < 10) {
                const fallbackTracks = await Track.find({ isActive: true })
                    .sort({ popularity: -1 })
                    .limit(20 - tracks.length)
                    .select('-__v');
                
                tracks = [...tracks, ...fallbackTracks];
            }

            // Shuffle and limit to 15-20 tracks
            const shuffledTracks = tracks.sort(() => Math.random() - 0.5).slice(0, 20);

            // Update AI request with generated tracks
            aiRequest.generatedTracks = shuffledTracks.map(track => track._id);
            await aiRequest.updateStatus('completed');

            const processingTime = Date.now() - startTime;

            // Create playlist if requested
            let playlist = null;
            if (savePlaylist && shuffledTracks.length > 0) {
                const finalPlaylistName = playlistName || geminiData.playlistTitle || `AI Playlist - ${new Date().toLocaleDateString()}`;
                
                playlist = await Playlist.create({
                    name: finalPlaylistName,
                    description: geminiData.description || `Generated from prompt: "${prompt}"`,
                    owner: req.user._id,
                    tracks: shuffledTracks.map(track => ({
                        track: track._id,
                        addedBy: req.user._id
                    })),
                    isAIGenerated: true,
                    aiPrompt: prompt,
                    aiGeneratedAt: new Date(),
                    isPublic: false
                });

                // Add playlist to user's playlists
                const user = await User.findById(req.user._id);
                user.playlists.push(playlist._id);
                await user.save();

                aiRequest.generatedPlaylist = playlist._id;
                await aiRequest.save();

                // Populate playlist for response
                await playlist.populate('tracks.track', 'title artist duration thumbnail genre mood');
            }

            res.json({
                status: 'success',
                message: 'Playlist generated successfully!',
                data: {
                    tracks: shuffledTracks,
                    playlist,
                    aiAnalysis: {
                        extractedMoods: moods,
                        extractedGenres: genres,
                        extractedKeywords: keywords,
                        playlistTitle: geminiData.playlistTitle,
                        description: geminiData.description
                    },
                    processingTime: `${processingTime}ms`,
                    requestId: aiRequest._id
                }
            });

        } catch (aiError) {
            console.error('AI Generation Error:', aiError);
            await aiRequest.updateStatus('failed', aiError.message);

            return res.status(500).json({
                status: 'error',
                message: 'Failed to generate AI playlist',
                error: process.env.NODE_ENV === 'development' ? aiError.message : 'AI service unavailable'
            });
        }

    } catch (error) {
        next(error);
    }
};

// @desc    Get user's AI request history
// @route   GET /api/ai/history
// @access  Private
const getAIHistory = async (req, res, next) => {
    try {
        const { page = 1, limit = 20 } = req.query;
        const skip = (page - 1) * limit;
        const limitNum = Math.min(parseInt(limit), 50);

        const history = await AIRequest.getUserHistory(req.user._id, limitNum, skip);
        const total = await AIRequest.countDocuments({ user: req.user._id });

        res.json({
            status: 'success',
            data: {
                history,
                pagination: {
                    currentPage: parseInt(page),
                    totalPages: Math.ceil(total / limitNum),
                    totalRequests: total,
                    limit: limitNum
                }
            }
        });

    } catch (error) {
        next(error);
    }
};

// @desc    Regenerate playlist from previous request
// @route   POST /api/ai/regenerate/:requestId
// @access  Private
const regeneratePlaylist = async (req, res, next) => {
    try {
        const { requestId } = req.params;
        const { saveAsNew = true } = req.body;

        const originalRequest = await AIRequest.findOne({
            _id: requestId,
            user: req.user._id
        });

        if (!originalRequest) {
            return res.status(404).json({
                status: 'error',
                message: 'AI request not found'
            });
        }

        // Mark original request as used
        await originalRequest.markAsUsed();

        // Use the original prompt to generate new playlist
        req.body = {
            prompt: originalRequest.prompt,
            savePlaylist: saveAsNew
        };

        // Call the generate function
        return generatePlaylist(req, res, next);

    } catch (error) {
        next(error);
    }
};

// @desc    Rate AI-generated playlist
// @route   POST /api/ai/rate/:requestId
// @access  Private
const ratePlaylist = async (req, res, next) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                status: 'error',
                message: 'Validation failed',
                errors: errors.array()
            });
        }

        const { requestId } = req.params;  
        const { rating, feedback } = req.body;

        const aiRequest = await AIRequest.findOne({
            _id: requestId,
            user: req.user._id
        });

        if (!aiRequest) {
            return res.status(404).json({
                status: 'error',
                message: 'AI request not found'
            });
        }

        await aiRequest.rateSatisfaction(rating, feedback);

        res.json({
            status: 'success',
            message: 'Rating submitted successfully',
            data: {
                rating,
                feedback
            }
        });

    } catch (error) {
        next(error);
    }
};

// @desc    Get AI analytics and popular prompts
// @route   GET /api/ai/analytics
// @access  Private
const getAIAnalytics = async (req, res, next) => {
    try {
        const [popularPrompts, moodGenreAnalytics, successfulRequests] = await Promise.all([
            AIRequest.getPopularPrompts(10),
            AIRequest.getMoodGenreAnalytics(),
            AIRequest.getSuccessfulRequests(100)
        ]);

        const userStats = await AIRequest.aggregate([
            { $match: { user: req.user._id } },
            {
                $group: {
                    _id: null,
                    totalRequests: { $sum: 1 },
                    successfulRequests: {
                        $sum: {
                            $cond: [{ $eq: ['$status', 'completed'] }, 1, 0]
                        }
                    },
                    averageRating: { $avg: '$satisfaction.rating' },
                    totalTracksGenerated: { $sum: { $size: '$generatedTracks' } }
                }
            }
        ]);

        res.json({
            status: 'success',
            data: {
                userStats: userStats[0] || {
                    totalRequests: 0,
                    successfulRequests: 0,
                    averageRating: null,
                    totalTracksGenerated: 0
                },
                popularPrompts,
                moodGenreAnalytics: moodGenreAnalytics[0] || { moodAnalytics: [], genreAnalytics: [] },
                recentSuccessful: successfulRequests.slice(0, 10)
            }
        });

    } catch (error) {
        next(error);
    }
};

// Validation rules
const generateValidation = [
    body('prompt')
        .trim()
        .isLength({ min: 3, max: 500 })
        .withMessage('Prompt must be between 3 and 500 characters'),
    body('playlistName')
        .optional()
        .trim()
        .isLength({ max: 100 })
        .withMessage('Playlist name cannot exceed 100 characters'),
    body('savePlaylist')
        .optional()
        .isBoolean()
        .withMessage('savePlaylist must be a boolean')
];

const ratingValidation = [
    body('rating')
        .isInt({ min: 1, max: 5 })
        .withMessage('Rating must be between 1 and 5'),
    body('feedback')
        .optional()
        .trim()
        .isLength({ max: 1000 })
        .withMessage('Feedback cannot exceed 1000 characters')
];

module.exports = {
    generatePlaylist,
    getAIHistory,
    regeneratePlaylist,
    ratePlaylist,
    getAIAnalytics,
    generateValidation,
    ratingValidation
};
