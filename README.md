# 🎵 Raw Music Backend API

<div align="center">

![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)
![Express](https://img.shields.io/badge/Express-4.18+-blue.svg)
![MongoDB](https://img.shields.io/badge/MongoDB-6.0+-green.svg)
![License](https://img.shields.io/badge/License-MIT-yellow.svg)

**A powerful, scalable backend for the Raw Music streaming platform that leverages YouTube Audio Library content and Google Gemini AI for intelligent playlist generation.**

</div>

## 🚀 Core Features

### 🔐 Authentication & Security
- **JWT-based Authentication** with HTTP-only cookies and refresh tokens
- **bcrypt Password Hashing** with salt rounds for maximum security
- **Rate Limiting** to prevent API abuse
- **CORS Configuration** for secure cross-origin requests
- **Helmet Security Headers** for additional protection
- **Input Validation** with express-validator

### 🎧 Music & Streaming
- **YouTube Audio Library Integration** for free, legal audio streaming
- **Real-time Audio Metadata** fetching and caching
- **Advanced Search & Filtering** by genre, mood, artist, and keywords
- **Listening History Tracking** with duration and timestamp analytics
- **Track Popularity Analytics** based on user interactions

### 🤖 AI-Powered Features
- **Google Gemini AI Integration** for intelligent playlist generation
- **Mood-Based Recommendations** using natural language processing
- **Smart Keyword Extraction** from user prompts
- **Contextual Music Suggestions** based on listening patterns
- **AI Request History** tracking for user insights

### 👤 User Management
- **Comprehensive User Profiles** with customizable avatars and bios
- **Playlist Creation & Management** with privacy controls
- **Social Features** including likes, follows, and sharing
- **Listening Statistics** and personalized insights
- **Preference Learning** for improved recommendations

## 🛠️ Technology Stack

### Backend Core
```
Node.js (v18+)           → Runtime environment
Express.js (v4.18+)      → Web application framework
MongoDB (v6.0+)          → NoSQL database
Mongoose (v8.0+)         → ODM for MongoDB
```

### Authentication & Security
```
JSON Web Tokens (JWT)    → Stateless authentication
bcryptjs                 → Password hashing
helmet                   → Security headers
express-rate-limit       → API rate limiting
cors                     → Cross-origin resource sharing
express-validator        → Request validation
cookie-parser            → Cookie handling
```

### External APIs & Services
```
Google Gemini AI         → Advanced language model for playlist generation
YouTube Data API v3      → Audio library access and metadata
Google APIs Client       → Authentication and API management
```

### Development & Deployment
```
nodemon                  → Development auto-restart
dotenv                   → Environment variable management
Railway/Render Ready     → Cloud deployment optimization
```

## 📊 Database Architecture

### Collections Overview
```
users        → User accounts, preferences, and statistics
tracks       → Music metadata and YouTube references  
playlists    → User-created and AI-generated playlists
airequests   → AI generation history and analytics
```

### Frontend Technology Stack (Next.js)
```
Next.js 15.4+           → React framework with SSR/SSG
React 18+               → Frontend UI library
TypeScript              → Type-safe development
Tailwind CSS            → Utility-first CSS framework
Radix UI                → Accessible component primitives
Framer Motion           → Animation library
Zustand                 → State management
React Query             → Server state management
React Hook Form         → Form handling
Zod                     → Schema validation
```

## 🔧 Getting Started

### Prerequisites

Before setting up the backend, ensure you have:

- **Node.js** (v18.0.0 or higher) - [Download here](https://nodejs.org/)
- **MongoDB** (v6.0+) - Local installation or [MongoDB Atlas](https://www.mongodb.com/atlas)
- **Google Cloud Console Account** for API access
- **Git** for version control

### Required API Keys

1. **Google Gemini API Key**
   - Visit [Google AI Studio](https://makersuite.google.com/app/apikey)
   - Create a new API key
   - Save for environment variables

2. **YouTube Data API Key**
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Enable YouTube Data API v3
   - Create credentials (API Key)
   - Save for environment variables

### Installation Steps

1. **Clone the Repository**
   ```bash
   git clone <repository-url>
   cd raw-music/backend
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Environment Configuration**
   ```bash
   # Copy the example environment file
   cp .env.example .env
   
   # Edit .env with your configuration
   nano .env  # or use your preferred editor
   ```

4. **Environment Variables Setup**
   Create a `.env` file with the following variables:
   ```env
   # Server Configuration
   PORT=5000
   NODE_ENV=development
   
   # Database
   MONGODB_URI=mongodb://localhost:27017/rawmusic
   # OR for MongoDB Atlas:
   # MONGODB_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/rawmusic
   
   # JWT Configuration
   JWT_SECRET=your-super-secret-jwt-key-minimum-32-characters
   JWT_REFRESH_SECRET=your-refresh-token-secret-key
   JWT_EXPIRE=15m
   JWT_REFRESH_EXPIRE=7d
   
   # Google APIs
   GEMINI_API_KEY=your-gemini-api-key
   YOUTUBE_API_KEY=your-youtube-data-api-key
   
   # CORS Configuration
   FRONTEND_URL=http://localhost:3000
   
   # Rate Limiting
   RATE_LIMIT_WINDOW_MS=900000
   RATE_LIMIT_MAX_REQUESTS=100
   ```

5. **Database Seeding**
   ```bash
   # Populate database with sample tracks from YouTube Audio Library
   npm run seed
   ```

6. **Start Development Server**
   ```bash
   # Start with hot reload
   npm run dev
   
   # Or start in production mode
   npm start
   ```

### Quick Start Commands
```bash
# Full setup in one go
git clone <repo> && cd raw-music/backend
npm install
cp .env.example .env
# Edit .env with your keys
npm run seed
npm run dev
```

## 📝 API Documentation

### Authentication Routes

| Method | Endpoint        | Description               | Auth Required |
|--------|-----------------|---------------------------|---------------|
| POST   | /api/auth/register | Register new user      | No            |
| POST   | /api/auth/login    | Login user             | No            |
| GET    | /api/auth/me       | Get current user       | Yes           |
| POST   | /api/auth/logout   | Logout user            | Yes           |

### Tracks Routes

| Method | Endpoint        | Description               | Auth Required |
|--------|-----------------|---------------------------|---------------|
| GET    | /api/tracks     | Get all tracks (paginated)| No            |
| GET    | /api/tracks/:id | Get track details         | No            |
| GET    | /api/tracks/search | Search tracks          | No            |
| POST   | /api/tracks/like/:id | Like/unlike track    | Yes           |

### Playlist Routes

| Method | Endpoint        | Description               | Auth Required |
|--------|-----------------|---------------------------|---------------|
| GET    | /api/playlists     | Get user playlists     | Yes           |
| POST   | /api/playlists     | Create playlist        | Yes           |
| GET    | /api/playlists/:id | Get playlist details   | Conditional   |
| PUT    | /api/playlists/:id | Update playlist        | Yes           |
| DELETE | /api/playlists/:id | Delete playlist        | Yes           |
| PUT    | /api/playlists/:id/tracks | Add/remove tracks | Yes         |

### AI Routes

| Method | Endpoint        | Description               | Auth Required |
|--------|-----------------|---------------------------|---------------|
| POST   | /api/ai/generate | Generate AI playlist     | Yes           |
| GET    | /api/ai/history  | Get generation history   | Yes           |

### User Routes

| Method | Endpoint        | Description               | Auth Required |
|--------|-----------------|---------------------------|---------------|
| GET    | /api/user/profile | Get user profile        | Yes           |
| PUT    | /api/user/profile | Update profile          | Yes           |
| GET    | /api/user/history | Get listening history   | Yes           |

## 📊 Database Schema

### User Model
- Authentication details
- Profile information
- Liked tracks
- Playlists
- Listening history
- Stats and preferences

### Track Model
- Audio metadata
- YouTube references
- Genre and mood tags
- Popularity metrics

### Playlist Model
- Name and description
- Track references
- AI generation data (if applicable)
- Privacy settings

### AIRequest Model
- User prompts
- Generated playlist references
- Keyword extraction data
- Processing statistics

## 🔒 Security Features

- **JWT with HTTP-only cookies** for secure authentication
- **Password hashing with bcrypt** using salt rounds
- **Rate limiting** for API endpoints to prevent abuse
- **CORS configuration** for secure cross-origin requests
- **Helmet for HTTP security headers** and additional protection
- **Input validation** with express-validator for all endpoints
- **Environment variables** for all sensitive configuration

### 🚨 Security Notice

**NEVER commit sensitive data to version control!**

✅ **Safe practices:**
- All API keys are stored in `.env` file (excluded from Git)
- Database credentials use environment variables
- JWT secrets are environment-specific
- Production and development use different configurations

❌ **Avoid these security risks:**
- Hardcoding API keys in source code
- Committing `.env` files to Git
- Using default JWT secrets in production
- Exposing sensitive configuration in client-side code

### Environment Variables Security Checklist

- [ ] `.env` file is in `.gitignore`
- [ ] API keys are not hardcoded anywhere
- [ ] Database credentials use environment variables
- [ ] JWT secrets are strong and unique
- [ ] Production environment uses different secrets
- [ ] Rate limiting is properly configured

## 💻 Development

```bash
# Run in development mode with hot reload
npm run dev

# Run in production mode
npm start

# Seed database with sample tracks
npm run seed
```

## 🧪 Testing & Development

### Available Scripts
```bash
# Development with hot reload
npm run dev

# Production mode
npm start

# Seed database with sample data
npm run seed

# Run tests (when implemented)
npm test

# Test coverage
npm run test:coverage
```

### Common Development Tasks

#### Adding New Routes
```javascript
// 1. Create controller in /controllers
// 2. Add route in /routes
// 3. Apply middleware if needed
// 4. Update API documentation below
```

#### Database Operations
```bash
# Connect to local MongoDB
mongosh rawmusic

# View collections
show collections

# Clear all data (development only!)
db.dropDatabase()
```

## 🐛 Troubleshooting

### Common Issues

#### Port Already in Use (EADDRINUSE)
```bash
# Find process using port 5000
netstat -ano | findstr :5000
# Kill the process (Windows)
taskkill /PID <process-id> /F

# Or use a different port in .env
PORT=5001
```

#### MongoDB Connection Issues
```bash
# Check MongoDB service status (Windows)
sc query MongoDB

# Start MongoDB service
net start MongoDB

# For MongoDB Atlas, verify:
# - Connection string format
# - Network access whitelist
# - Database user permissions
```

#### Mongoose Schema Index Warnings
```
# If you see "Duplicate schema index" warnings:
# Check for duplicate index definitions in models
# Remove either schema field {index: true} or schema.index() call
```

#### API Key Issues
```bash
# Verify API keys are working:
curl -X GET "https://generativelanguage.googleapis.com/v1/models?key=YOUR_GEMINI_KEY"
curl -X GET "https://www.googleapis.com/youtube/v3/search?key=YOUR_YOUTUBE_KEY&q=test"
```

### Debug Mode
```bash
# Enable debug logging
DEBUG=app:* npm run dev

# MongoDB debug mode
MONGODB_DEBUG=true npm run dev
```

## 📋 Developer Handoff Guide

### For New Developers

#### Quick Overview
This backend serves a music streaming platform with these core functionalities:
1. **User Authentication** - JWT-based with refresh tokens
2. **Music Streaming** - YouTube Audio Library integration
3. **AI Playlists** - Google Gemini AI for intelligent curation
4. **Social Features** - Likes, playlists, sharing

#### Code Structure
```
backend/
├── config/          # Database and external service configurations
├── controllers/     # Route handlers and business logic
├── middleware/      # Authentication, validation, error handling
├── models/          # MongoDB schemas and data models
├── routes/          # API endpoint definitions
├── utils/           # Helper functions and utilities
└── server.js        # Application entry point
```

#### Key Files to Understand
1. **`server.js`** - App initialization and middleware setup
2. **`models/User.js`** - User schema with authentication methods
3. **`models/Track.js`** - Music track metadata schema
4. **`controllers/authController.js`** - Authentication logic
5. **`controllers/aiController.js`** - Gemini AI integration

#### Development Workflow
1. Create feature branch: `git checkout -b feature/new-feature`
2. Make changes and test locally
3. Run linting: `npm run lint` (if configured)
4. Commit with descriptive messages
5. Push and create pull request

#### Testing Strategy
- Unit tests for utility functions
- Integration tests for API endpoints
- E2E tests for user workflows
- Performance testing for AI generation

#### Next Steps for Development
1. **Implement Missing Features**
   - Social following system
   - Advanced recommendation engine
   - Real-time chat/comments
   - Music upload functionality

2. **Performance Optimizations**
   - Redis caching layer
   - Database query optimization
   - CDN integration for static assets
   - API response compression

3. **Security Enhancements**
   - OAuth integration (Google, Spotify)
   - Two-factor authentication
   - Enhanced rate limiting
   - API key rotation system

4. **Monitoring & Analytics**
   - Error tracking (Sentry)
   - Performance monitoring
   - User analytics
   - API usage metrics

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

---

<div align="center">

**Built with ❤️ for the Raw Music Platform**

[Documentation](docs/) • [API Reference](#-api-documentation) • [Contributing](CONTRIBUTING.md) • [Issues](issues/)

</div>

## � Deployment

### Railway Deployment (Recommended)

1. **Connect Repository**
   ```bash
   # Install Railway CLI
   npm install -g @railway/cli
   
   # Login and deploy
   railway login
   railway link
   railway up
   ```

2. **Environment Variables**
   Set these in Railway dashboard:
   ```
   NODE_ENV=production
   MONGODB_URI=<your-mongodb-atlas-uri>
   JWT_SECRET=<secure-production-secret>
   GEMINI_API_KEY=<your-api-key>
   YOUTUBE_API_KEY=<your-api-key>
   FRONTEND_URL=<your-frontend-domain>
   ```

### Alternative Deployment Platforms

#### Render
```bash
# Build Command: npm install
# Start Command: npm start
```

#### Heroku
```bash
heroku create raw-music-api
heroku config:set NODE_ENV=production
heroku config:set MONGODB_URI=<uri>
# ... set other environment variables
git push heroku main
```

### Production Checklist

- [ ] Environment variables configured
- [ ] MongoDB Atlas connection tested
- [ ] API keys validated
- [ ] CORS origins updated for production
- [ ] Rate limits configured appropriately
- [ ] Error logging implemented
- [ ] Health check endpoint responding
- [ ] SSL/HTTPS enabled

## 💻 Development Guidelines

### Code Standards
```javascript
// Use async/await instead of callbacks
const getUser = async (id) => {
  try {
    const user = await User.findById(id);
    return user;
  } catch (error) {
    throw new APIError('User not found', 404);
  }
};

// Consistent error handling
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};
```

### API Response Format
```javascript
// Success Response
{
  "success": true,
  "data": {
    // response data
  },
  "message": "Operation completed successfully"
}

// Error Response
{
  "success": false,
  "error": {
    "message": "Error description",
    "code": "ERROR_CODE",
    "details": {}
  }
}
```

### Database Best Practices
- Use indexes for frequently queried fields
- Implement proper validation schemas
- Use transactions for multi-document operations
- Optimize aggregation pipelines
- Implement soft deletes where appropriate

### Performance Optimization
- Implement Redis caching for frequent queries
- Use MongoDB aggregation for complex queries
- Implement pagination for large datasets
- Optimize API response sizes
- Use compression middleware

## 📄 License

MIT License
