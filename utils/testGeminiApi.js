const { GoogleGenerativeAI } = require('@google/generative-ai');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Initialize Gemini API
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function testGeminiAPI() {
    try {
        console.log('🧠 Testing Gemini API connection...');
        
        // For text-only input, use the gemini-pro model
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
        
        const prompt = `
        Generate a playlist based on this mood: "relaxing summer sunset by the beach".
        Return a JSON array with the following format:
        [
            {
                "mood": ["relaxing", "peaceful", "calm"],
                "genres": ["ambient", "acoustic", "chill"],
                "themes": ["summer", "beach", "sunset", "ocean"]
            }
        ]
        Only return the JSON, nothing else.
        `;
        
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();
        
        console.log('✅ Gemini API Response:');
        console.log(text);
        
        try {
            // Try to parse as JSON
            const parsed = JSON.parse(text);
            console.log('✅ Successfully parsed JSON response');
            console.log('✅ Gemini API connection test successful!');
        } catch (parseError) {
            console.log('⚠️ Response is not valid JSON, but API connection works');
            console.log('⚠️ You may need to adjust your prompts for proper JSON responses');
        }
        
    } catch (error) {
        console.error('❌ Gemini API Test Failed:', error.message);
        console.error('Make sure your GEMINI_API_KEY is correct in the .env file');
        
        if (error.message.includes('invalid API key')) {
            console.error('❌ Invalid API key. Please check your API key in the .env file.');
        } else if (error.message.includes('network')) {
            console.error('❌ Network error. Please check your internet connection.');
        }
    }
}

// Run test
testGeminiAPI();
