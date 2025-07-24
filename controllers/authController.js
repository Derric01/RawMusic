const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const { generateToken, setTokenCookie, clearTokenCookie } = require('../utils/generateToken');
const { getUserAvatar, getRandomAvatar } = require('../utils/avatarHelper');

// @desc    Register user
// @route   POST /api/auth/signup
// @access  Public
const signup = async (req, res, next) => {
    try {
        // Check for validation errors
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                status: 'error',
                message: 'Validation failed',
                errors: errors.array()
            });
        }

        const { username, email, password } = req.body;

        // Check if user already exists
        const existingUser = await User.findOne({
            $or: [{ email }, { username }]
        });

        if (existingUser) {
            const field = existingUser.email === email ? 'email' : 'username';
            return res.status(400).json({
                status: 'error',
                message: `User with this ${field} already exists`
            });
        }

        // Create user
        const user = await User.create({
            username,
            email,
            password
            // No need to set profilePicture here, it's handled by the User model default
        });

        // Generate token
        const token = generateToken(user._id);

        // Set cookie
        setTokenCookie(res, token);

        // Remove password from output
        user.password = undefined;

        res.status(201).json({
            status: 'success',
            message: 'User registered successfully',
            data: {
                user,
                token
            }
        });

    } catch (error) {
        next(error);
    }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
const login = async (req, res, next) => {
    try {
        // Check for validation errors
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                status: 'error',
                message: 'Validation failed',
                errors: errors.array()
            });
        }

        const { email, password } = req.body;

        // Check for user
        const user = await User.findOne({ email })
            .select('+password')
            .populate('likedTracks', 'title artist thumbnail')
            .populate('playlists', 'name trackCount');

        if (!user) {
            return res.status(401).json({
                status: 'error',
                message: 'Invalid email or password'
            });
        }

        // Check password
        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            return res.status(401).json({
                status: 'error',
                message: 'Invalid email or password'
            });
        }

        // Update last active
        user.lastActive = new Date();
        await user.save();

        // Generate token
        const token = generateToken(user._id);

        // Set cookie
        setTokenCookie(res, token);

        // Remove password from output
        user.password = undefined;

        res.json({
            status: 'success',
            message: 'Login successful',
            data: {
                user,
                token
            }
        });

    } catch (error) {
        next(error);
    }
};

// @desc    Logout user
// @route   POST /api/auth/logout
// @access  Private
const logout = async (req, res, next) => {
    try {
        // Clear cookie
        clearTokenCookie(res);

        res.json({
            status: 'success',
            message: 'Logout successful'
        });

    } catch (error) {
        next(error);
    }
};

// @desc    Get current user
// @route   GET /api/auth/me
// @access  Private
const getMe = async (req, res, next) => {
    try {
        const user = await User.findById(req.user._id)
            .populate('likedTracks', 'title artist thumbnail duration')
            .populate({
                path: 'playlists',
                select: 'name trackCount totalDuration isPublic createdAt',
                populate: {
                    path: 'tracks.track',
                    select: 'title artist thumbnail'
                }
            });
            
        // Ensure user always has a profile picture
        if (!user.profilePicture) {
            user.profilePicture = getUserAvatar(user);
            await user.save();
        }

        res.json({
            status: 'success',
            data: {
                user
            }
        });

    } catch (error) {
        next(error);
    }
};

// @desc    Update user profile
// @route   PUT /api/auth/profile
// @access  Private
const updateProfile = async (req, res, next) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                status: 'error',
                message: 'Validation failed',
                errors: errors.array()
            });
        }

        const { username, bio, profilePicture, favoriteGenres, theme } = req.body;

        // Build update object
        const updateFields = {};
        if (username) updateFields.username = username;
        if (bio !== undefined) updateFields.bio = bio;
        if (profilePicture !== undefined) {
            updateFields.profilePicture = profilePicture;
        } else if (profilePicture === null || profilePicture === '') {
            // If user is clearing their profile picture, assign a random avatar
            updateFields.profilePicture = getRandomAvatar(username || req.user.username);
        }
        if (theme) updateFields['preferences.theme'] = theme;
        if (favoriteGenres) updateFields['preferences.favoriteGenres'] = favoriteGenres;

        // Check if username is already taken (if being updated)
        if (username) {
            const existingUser = await User.findOne({
                username,
                _id: { $ne: req.user._id }
            });

            if (existingUser) {
                return res.status(400).json({
                    status: 'error',
                    message: 'Username is already taken'
                });
            }
        }

        const user = await User.findByIdAndUpdate(
            req.user._id,
            updateFields,
            {
                new: true,
                runValidators: true
            }
        ).select('-password');

        res.json({
            status: 'success',
            message: 'Profile updated successfully',
            data: {
                user
            }
        });

    } catch (error) {
        next(error);
    }
};

// @desc    Change password
// @route   PUT /api/auth/password
// @access  Private
const changePassword = async (req, res, next) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                status: 'error',
                message: 'Validation failed',
                errors: errors.array()
            });
        }

        const { currentPassword, newPassword } = req.body;

        // Get user with password
        const user = await User.findById(req.user._id).select('+password');

        // Check current password
        const isMatch = await user.comparePassword(currentPassword);
        if (!isMatch) {
            return res.status(400).json({
                status: 'error',
                message: 'Current password is incorrect'
            });
        }

        // Update password
        user.password = newPassword;
        await user.save();

        res.json({
            status: 'success',
            message: 'Password changed successfully'
        });

    } catch (error) {
        next(error);
    }
};

// Validation rules
const signupValidation = [
    body('username')
        .trim()
        .isLength({ min: 3, max: 20 })
        .withMessage('Username must be between 3 and 20 characters')
        .matches(/^[a-zA-Z0-9_]+$/)
        .withMessage('Username can only contain letters, numbers, and underscores'),
    body('email')
        .isEmail()
        .normalizeEmail()
        .withMessage('Please provide a valid email'),
    body('password')
        .isLength({ min: 6 })
        .withMessage('Password must be at least 6 characters long')
];

const loginValidation = [
    body('email')
        .isEmail()
        .normalizeEmail()
        .withMessage('Please provide a valid email'),
    body('password')
        .notEmpty()
        .withMessage('Password is required')
];

const profileValidation = [
    body('username')
        .optional()
        .trim()
        .isLength({ min: 3, max: 20 })
        .withMessage('Username must be between 3 and 20 characters')
        .matches(/^[a-zA-Z0-9_]+$/)
        .withMessage('Username can only contain letters, numbers, and underscores'),
    body('bio')
        .optional()
        .isLength({ max: 200 })
        .withMessage('Bio cannot exceed 200 characters'),
    body('favoriteGenres')
        .optional()
        .isArray()
        .withMessage('Favorite genres must be an array'),
    body('theme')
        .optional()
        .isIn(['light', 'dark', 'system'])
        .withMessage('Theme must be light, dark, or system')
];

const passwordValidation = [
    body('currentPassword')
        .notEmpty()
        .withMessage('Current password is required'),
    body('newPassword')
        .isLength({ min: 6 })
        .withMessage('New password must be at least 6 characters long')
];

module.exports = {
    signup,
    login,
    logout,
    getMe,
    updateProfile,
    changePassword,
    signupValidation,
    loginValidation,
    profileValidation,
    passwordValidation
};
