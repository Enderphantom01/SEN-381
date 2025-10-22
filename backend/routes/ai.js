const express = require('express');
const router = express.Router();

// GET Gemini API key (secured endpoint)
router.get('/gemini-key', (req, res) => {
    try {
        const apiKey = process.env.GEMINI_API_KEY;
        
        console.log('🔑 Request for Gemini API key received');
        console.log('🔑 API Key available:', !!apiKey);
        console.log('🔑 API Key (first 10 chars):', apiKey ? apiKey.substring(0, 10) + '...' : 'NULL');
        
        if (!apiKey) {
            console.error('❌ GEMINI_API_KEY not found in environment variables');
            return res.status(500).json({
                error: 'API key not configured',
                message: 'Gemini API key is not set in environment variables'
            });
        }

        // Return the API key
        res.json({
            apiKey: apiKey,
            status: 'success'
        });
        
        console.log('✅ Gemini API key sent successfully');
        
    } catch (error) {
        console.error('❌ Error retrieving Gemini API key:', error);
        res.status(500).json({
            error: 'Internal server error',
            message: 'Failed to retrieve API key'
        });
    }
});

module.exports = router;