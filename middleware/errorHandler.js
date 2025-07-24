const errorHandler = (err, req, res, next) => {
    let error = { ...err };
    error.message = err.message;

    // Log error for debugging
    console.error(`❌ Error: ${err.message}`.red);
    console.error(err.stack);

    // Mongoose bad ObjectId
    if (err.name === 'CastError') {
        const message = 'Resource not found';
        error = {
            message,
            statusCode: 404
        };
    }

    // Mongoose duplicate key
    if (err.code === 11000) {
        let message = 'Duplicate field value entered';
        
        // Extract field name from error
        const field = Object.keys(err.keyValue)[0];
        if (field === 'email') {
            message = 'Email address is already registered';
        } else if (field === 'username') {
            message = 'Username is already taken';
        } else if (field === 'youtubeId') {
            message = 'Track already exists in database';
        }
        
        error = {
            message,
            statusCode: 400
        };
    }

    // Mongoose validation error
    if (err.name === 'ValidationError') {
        const message = Object.values(err.errors).map(val => val.message).join(', ');
        error = {
            message,
            statusCode: 400
        };
    }

    // JWT errors
    if (err.name === 'JsonWebTokenError') {
        const message = 'Invalid token';
        error = {
            message,
            statusCode: 401
        };
    }

    if (err.name === 'TokenExpiredError') {
        const message = 'Token expired';
        error = {
            message,
            statusCode: 401
        };
    }

    // MongoDB connection errors
    if (err.name === 'MongoNetworkError') {
        const message = 'Database connection error';
        error = {
            message,
            statusCode: 503
        };
    }

    // Rate limiting errors
    if (err.status === 429) {
        const message = 'Too many requests, please try again later';
        error = {
            message,
            statusCode: 429
        };
    }

    // YouTube API errors
    if (err.message && err.message.includes('YouTube')) {
        const message = 'YouTube service temporarily unavailable';
        error = {
            message,
            statusCode: 503
        };
    }

    // Gemini API errors
    if (err.message && err.message.includes('Gemini')) {
        const message = 'AI service temporarily unavailable';
        error = {
            message,
            statusCode: 503
        };
    }

    // Default error response
    const statusCode = error.statusCode || err.statusCode || 500;
    const message = error.message || 'Internal Server Error';

    // Prepare error response
    const errorResponse = {
        status: 'error',
        message: message,
        ...(process.env.NODE_ENV === 'development' && {
            stack: err.stack,
            error: err
        })
    };

    // Add additional error details for development
    if (process.env.NODE_ENV === 'development') {
        errorResponse.timestamp = new Date().toISOString();
        errorResponse.path = req.originalUrl;
        errorResponse.method = req.method;
        
        if (req.user) {
            errorResponse.userId = req.user._id;
        }
    }

    res.status(statusCode).json(errorResponse);
};

// Handle unhandled promise rejections
process.on('unhandledRejection', (err, promise) => {
    console.log(`❌ Unhandled Promise Rejection: ${err.message}`.red);
    console.error(err.stack);
    
    // Close server & exit process
    if (process.env.NODE_ENV === 'production') {
        process.exit(1);
    }
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
    console.log(`❌ Uncaught Exception: ${err.message}`.red);
    console.error(err.stack);
    
    // Close server & exit process
    process.exit(1);
});

module.exports = errorHandler;
