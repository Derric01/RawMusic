const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Track = require('../models/Track');

// Load environment variables
dotenv.config();

// Sample tracks from YouTube Audio Library
const sampleTracks = [
    {
        title: "Summer Vibes",
        artist: "Audio Library",
        album: "Summer Collection",
        duration: 180,
        genre: "pop",
        mood: ["happy", "uplifting"],
        tags: ["summer", "upbeat", "positive"],
        youtubeId: "dQw4w9WgXcQ",
        youtubeUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
        thumbnail: {
            default: "https://i.ytimg.com/vi/dQw4w9WgXcQ/default.jpg",
            medium: "https://i.ytimg.com/vi/dQw4w9WgXcQ/mqdefault.jpg",
            large: "https://i.ytimg.com/vi/dQw4w9WgXcQ/maxresdefault.jpg"
        },
        popularity: 95,
        releaseYear: 2023,
        metadata: {
            energy: 0.8,
            danceability: 0.9,
            valence: 0.9
        }
    },
    {
        title: "Midnight Jazz",
        artist: "Audio Library",
        album: "Jazz Essentials",
        duration: 240,
        genre: "jazz",
        mood: ["calm", "romantic"],
        tags: ["midnight", "smooth", "saxophone"],
        youtubeId: "mCdA4bJAGGk",
        youtubeUrl: "https://www.youtube.com/watch?v=mCdA4bJAGGk",
        thumbnail: {
            default: "https://i.ytimg.com/vi/mCdA4bJAGGk/default.jpg",
            medium: "https://i.ytimg.com/vi/mCdA4bJAGGk/mqdefault.jpg",
            large: "https://i.ytimg.com/vi/mCdA4bJAGGk/maxresdefault.jpg"
        },
        popularity: 78,
        releaseYear: 2022,
        metadata: {
            energy: 0.3,
            danceability: 0.4,
            valence: 0.6
        }
    },
    {
        title: "Electronic Pulse",
        artist: "Digital Sounds",
        album: "Synthwave",
        duration: 195,
        genre: "electronic",
        mood: ["energetic", "motivational"],
        tags: ["synthwave", "retro", "80s"],
        youtubeId: "ZbZSe6N_BXs",
        youtubeUrl: "https://www.youtube.com/watch?v=ZbZSe6N_BXs",
        thumbnail: {
            default: "https://i.ytimg.com/vi/ZbZSe6N_BXs/default.jpg",
            medium: "https://i.ytimg.com/vi/ZbZSe6N_BXs/mqdefault.jpg",
            large: "https://i.ytimg.com/vi/ZbZSe6N_BXs/maxresdefault.jpg"
        },
        popularity: 88,
        releaseYear: 2023,
        metadata: {
            energy: 0.9,
            danceability: 0.8,
            valence: 0.7
        }
    },
    {
        title: "Peaceful Morning",
        artist: "Nature Sounds",
        album: "Relaxation",
        duration: 300,
        genre: "ambient",
        mood: ["peaceful", "relaxing"],
        tags: ["morning", "nature", "meditation"],
        youtubeId: "hFZFjoX2cGg",
        youtubeUrl: "https://www.youtube.com/watch?v=hFZFjoX2cGg",
        thumbnail: {
            default: "https://i.ytimg.com/vi/hFZFjoX2cGg/default.jpg",
            medium: "https://i.ytimg.com/vi/hFZFjoX2cGg/mqdefault.jpg",
            large: "https://i.ytimg.com/vi/hFZFjoX2cGg/maxresdefault.jpg"
        },
        popularity: 65,
        releaseYear: 2023,
        metadata: {
            energy: 0.2,
            danceability: 0.1,
            valence: 0.8
        }
    },
    {
        title: "Rock Anthem",
        artist: "Electric Guitar",
        album: "Power Chords",
        duration: 210,
        genre: "rock",
        mood: ["energetic", "motivational"],
        tags: ["guitar", "drums", "powerful"],
        youtubeId: "fJ9rUzIMcZQ",
        youtubeUrl: "https://www.youtube.com/watch?v=fJ9rUzIMcZQ",
        thumbnail: {
            default: "https://i.ytimg.com/vi/fJ9rUzIMcZQ/default.jpg",
            medium: "https://i.ytimg.com/vi/fJ9rUzIMcZQ/mqdefault.jpg",
            large: "https://i.ytimg.com/vi/fJ9rUzIMcZQ/maxresdefault.jpg"
        },
        popularity: 92,
        releaseYear: 2023,
        metadata: {
            energy: 0.95,
            danceability: 0.6,
            valence: 0.8
        }
    },
    {
        title: "Classical Serenity",
        artist: "Symphony Orchestra",
        album: "Classical Masters",
        duration: 420,
        genre: "classical",
        mood: ["peaceful", "nostalgic"],
        tags: ["orchestra", "strings", "timeless"],
        youtubeId: "BaW_jenozKc",
        youtubeUrl: "https://www.youtube.com/watch?v=BaW_jenozKc",
        thumbnail: {
            default: "https://i.ytimg.com/vi/BaW_jenozKc/default.jpg",
            medium: "https://i.ytimg.com/vi/BaW_jenozKc/mqdefault.jpg",
            large: "https://i.ytimg.com/vi/BaW_jenozKc/maxresdefault.jpg"
        },
        popularity: 71,
        releaseYear: 2022,
        metadata: {
            energy: 0.4,
            danceability: 0.2,
            valence: 0.7
        }
    },
    {
        title: "Hip Hop Beats",
        artist: "Urban Collective",
        album: "Street Sounds",
        duration: 165,
        genre: "hip-hop",
        mood: ["energetic", "uplifting"],
        tags: ["beats", "urban", "rhythm"],
        youtubeId: "YQHsXMglC9A",
        youtubeUrl: "https://www.youtube.com/watch?v=YQHsXMglC9A",
        thumbnail: {
            default: "https://i.ytimg.com/vi/YQHsXMglC9A/default.jpg",
            medium: "https://i.ytimg.com/vi/YQHsXMglC9A/mqdefault.jpg",
            large: "https://i.ytimg.com/vi/YQHsXMglC9A/maxresdefault.jpg"
        },
        popularity: 85,
        releaseYear: 2023,
        metadata: {
            energy: 0.85,
            danceability: 0.9,
            valence: 0.75
        }
    },
    {
        title: "Country Roads",
        artist: "Acoustic Folk",
        album: "Rural Stories",
        duration: 225,
        genre: "country",
        mood: ["nostalgic", "peaceful"],
        tags: ["acoustic", "folk", "storytelling"],
        youtubeId: "1vrEljMfXYo",
        youtubeUrl: "https://www.youtube.com/watch?v=1vrEljMfXYo",
        thumbnail: {
            default: "https://i.ytimg.com/vi/1vrEljMfXYo/default.jpg",
            medium: "https://i.ytimg.com/vi/1vrEljMfXYo/mqdefault.jpg",
            large: "https://i.ytimg.com/vi/1vrEljMfXYo/maxresdefault.jpg"
        },
        popularity: 68,
        releaseYear: 2022,
        metadata: {
            energy: 0.5,
            danceability: 0.4,
            valence: 0.6
        }
    },
    {
        title: "Reggae Sunshine",
        artist: "Island Vibes",
        album: "Tropical Beats",
        duration: 190,
        genre: "reggae",
        mood: ["happy", "relaxing"],
        tags: ["sunshine", "tropical", "island"],
        youtubeId: "ehbK2y8bFrI",
        youtubeUrl: "https://www.youtube.com/watch?v=ehbK2y8bFrI",
        thumbnail: {
            default: "https://i.ytimg.com/vi/ehbK2y8bFrI/default.jpg",
            medium: "https://i.ytimg.com/vi/ehbK2y8bFrI/mqdefault.jpg",
            large: "https://i.ytimg.com/vi/ehbK2y8bFrI/maxresdefault.jpg"
        },
        popularity: 76,
        releaseYear: 2023,
        metadata: {
            energy: 0.6,
            danceability: 0.8,
            valence: 0.9
        }
    },
    {
        title: "Melancholic Blues",
        artist: "Blues Masters",
        album: "Emotional Journey",
        duration: 270,
        genre: "blues",
        mood: ["melancholic", "sad"],
        tags: ["guitar", "emotional", "soulful"],
        youtubeId: "VM3uXu1Dq4c",
        youtubeUrl: "https://www.youtube.com/watch?v=VM3uXu1Dq4c",
        thumbnail: {
            default: "https://i.ytimg.com/vi/VM3uXu1Dq4c/default.jpg",
            medium: "https://i.ytimg.com/vi/VM3uXu1Dq4c/mqdefault.jpg",
            large: "https://i.ytimg.com/vi/VM3uXu1Dq4c/maxresdefault.jpg"
        },
        popularity: 58,
        releaseYear: 2022,
        metadata: {
            energy: 0.3,
            danceability: 0.3,
            valence: 0.2
        }
    }
];

// Connect to MongoDB
const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/rawmusic');
        console.log('✅ Connected to MongoDB for seeding');
    } catch (error) {
        console.error('❌ MongoDB connection error:', error);
        process.exit(1);
    }
};

// Seed function
const seedTracks = async () => {
    try {
        await connectDB();

        // Clear existing tracks
        console.log('🗑️  Clearing existing tracks...');
        await Track.deleteMany({});

        // Add sample tracks
        console.log('📀 Adding sample tracks...');
        const createdTracks = await Track.insertMany(sampleTracks);

        console.log(`✅ Successfully seeded ${createdTracks.length} tracks!`);
        
        // Display summary
        const genreCounts = {};
        createdTracks.forEach(track => {
            genreCounts[track.genre] = (genreCounts[track.genre] || 0) + 1;
        });

        console.log('\n📊 Genre Distribution:');
        Object.entries(genreCounts).forEach(([genre, count]) => {
            console.log(`   ${genre}: ${count} tracks`);
        });

        console.log('\n🎵 Sample tracks added to your Raw Music database!');
        console.log('You can now start the server and test the API endpoints.');

    } catch (error) {
        console.error('❌ Error seeding database:', error);
    } finally {
        await mongoose.connection.close();
        console.log('👋 Database connection closed');
        process.exit(0);
    }
};

// Run seeder
if (require.main === module) {
    seedTracks();
}

module.exports = { seedTracks, sampleTracks };
