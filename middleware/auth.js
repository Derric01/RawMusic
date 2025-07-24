const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Protect routes - verify JWT token
const protect = async (req, res, next) => {
    try {
        let token;

        // Check for token in Authorization header
        if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
            token = req.headers.authorization.split(' ')[1];
        }
        // Check for token in cookies
        else if (req.cookies.token) {
            token = req.cookies.token;
        }

        if (!token) {
            return res.status(401).json({
                status: 'error',
                message: 'Access denied. No token provided.'
            });
        }

        try {
            // Verify token
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            
            // Get user from token
            const user = await User.findById(decoded.id)
                .select('-password')
                .populate('likedTracks', 'title artist')
                .populate('playlists', 'name trackCount');

            if (!user) {
                return res.status(401).json({
                    status: 'error',
                    message: 'Token is valid but user no longer exists'
                });
            }

            // Add user to request object
            req.user = user;
            next();

        } catch (error) {
            if (error.name === 'TokenExpiredError') {
                return res.status(401).json({
                    status: 'error',
                    message: 'Token has expired'
                });
            }
            
            return res.status(401).json({
                status: 'error',
                message: 'Invalid token'
            });
        }

    } catch (error) {
        console.error('Auth middleware error:', error);
        return res.status(500).json({
            status: 'error',
            message: 'Server error in authentication'
        });
    }
};

// Optional auth - doesn't fail if no token
const optionalAuth = async (req, res, next) => {
    try {
        let token;

        if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
            token = req.headers.authorization.split(' ')[1];
        } else if (req.cookies.token) {
            token = req.cookies.token;
        }

        if (token) {
            try {
                const decoded = jwt.verify(token, process.env.JWT_SECRET);
                const user = await User.findById(decoded.id)
                    .select('-password')
                    .populate('likedTracks', 'title artist')
                    .populate('playlists', 'name trackCount');

                if (user) {
                    req.user = user;
                }
            } catch (error) {
                // Continue without user if token is invalid
                console.log('Optional auth failed:', error.message);
            }
        }

        next();
    } catch (error) {
        console.error('Optional auth middleware error:', error);
        next();
    }
};

// Admin only access
const adminOnly = (req, res, next) => {
    if (req.user && req.user.role === 'admin') {
        next();
    } else {
        return res.status(403).json({
            status: 'error',
            message: 'Access denied. Admin privileges required.'
        });
    }
};

// Check if user owns resource
const checkOwnership = (resourceModel) => {
    return async (req, res, next) => {
        try {
            const resourceId = req.params.id;
            const resource = await resourceModel.findById(resourceId);

            if (!resource) {
                return res.status(404).json({
                    status: 'error',
                    message: 'Resource not found'
                });
            }

            // Check if user owns the resource
            if (resource.owner && resource.owner.toString() !== req.user._id.toString()) {
                return res.status(403).json({
                    status: 'error',
                    message: 'Access denied. You can only access your own resources.'
                });
            }

            // Add resource to request for use in controller
            req.resource = resource;
            next();

        } catch (error) {
            console.error('Ownership check error:', error);
            return res.status(500).json({
                status: 'error',
                message: 'Server error checking resource ownership'
            });
        }
    };
};

// Rate limiting for AI requests
const aiRateLimit = (req, res, next) => {
    // This could be enhanced with Redis for production
    const now = new Date();
    const oneHour = 60 * 60 * 1000;
    
    if (!req.user.lastAIRequest) {
        req.user.lastAIRequest = now;
        req.user.aiRequestCount = 1;
    } else {
        const timeDiff = now - req.user.lastAIRequest;
        
        if (timeDiff < oneHour) {
            if (req.user.aiRequestCount >= 10) { // 10 requests per hour
                return res.status(429).json({
                    status: 'error',
                    message: 'AI request limit exceeded. Please try again later.',
                    retryAfter: Math.ceil((oneHour - timeDiff) / 1000 / 60) // minutes
                });
            }
            req.user.aiRequestCount += 1;
        } else {
            req.user.lastAIRequest = now;
            req.user.aiRequestCount = 1;
        }
    }
    
    next();
};

module.exports = {
    protect,
    optionalAuth,
    adminOnly,
    checkOwnership,
    aiRateLimit
};
