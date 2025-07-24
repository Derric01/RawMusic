const express = require('express');
const {
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
} = require('../controllers/authController');
const { protect } = require('../middleware/auth');

const router = express.Router();

// Public routes
router.post('/signup', signupValidation, signup);
router.post('/login', loginValidation, login);

// Protected routes
router.use(protect); // All routes below this middleware are protected

router.post('/logout', logout);
router.get('/me', getMe);
router.put('/profile', profileValidation, updateProfile);
router.put('/password', passwordValidation, changePassword);

module.exports = router;
