const { google } = require('googleapis');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Initialize YouTube API
const youtube = google.youtube({
    version: 'v3',
    auth: process.env.YOUTUBE_API_KEY
});

async function testYouTubeAPI() {
    try {
        console.log('🎵 Testing YouTube Data API connection...');
        
        // Test search function (light query that won't use many quota points)
        const searchParams = {
            part: 'snippet',
            q: 'royalty free music',
            type: 'video',
            videoCategoryId: '10', // Music category
            videoLicense: 'creativeCommon', // Only CC licensed
            maxResults: 3
        };
        
        const searchResponse = await youtube.search.list(searchParams);
        
        if (searchResponse.data && searchResponse.data.items) {
            console.log(`✅ Successfully retrieved ${searchResponse.data.items.length} videos`);
            
            // Display basic info about the videos
            searchResponse.data.items.forEach((item, index) => {
                console.log(`\nVideo ${index + 1}:`);
                console.log(`Title: ${item.snippet.title}`);
                console.log(`Channel: ${item.snippet.channelTitle}`);
                console.log(`Video ID: ${item.id.videoId}`);
                console.log(`Thumbnail: ${item.snippet.thumbnails.default.url}`);
            });
            
            console.log('\n✅ YouTube API connection test successful!');
        } else {
            console.log('⚠️ Received response but no items found');
        }
        
    } catch (error) {
        console.error('❌ YouTube API Test Failed:', error.message);
        
        if (error.code === 403) {
            console.error('❌ API key error. Please check your YOUTUBE_API_KEY in the .env file.');
        } else if (error.code === 400) {
            console.error('❌ Invalid request parameters.');
        } else if (error.code === 404) {
            console.error('❌ Resource not found.');
        } else {
            console.error('❌ Detail:', error);
        }
    }
}

// Run test
testYouTubeAPI();
