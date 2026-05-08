const express = require('express');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 8080;

// Middleware
app.use(cors());
app.use(express.json());

// Serve static files from the current directory (where HTML/CSS/JS files are)
app.use(express.static(__dirname));

// Your API endpoint for news
app.get('/api/news', async (req, res) => {
    try {
        const { location, topic, keywords } = req.query;
        
        // Build your search query
        let query = '';
        if (location) query += location + ' ';
        if (topic) query += topic + ' ';
        if (keywords) query += keywords;
        
        // Call your news API (example using NewsAPI or similar)
        const apiKey = process.env.API_KEY;
        const url = `https://newsapi.org/v2/everything?q=${encodeURIComponent(query)}&apiKey=${apiKey}`;
        
        const response = await fetch(url);
        const data = await response.json();
        
        res.json(data);
    } catch (error) {
        console.error('API Error:', error);
        res.status(500).json({ error: 'Failed to fetch news' });
    }
});

// For any other route, serve your main HTML file
// Change 'index.html' to whatever your main HTML file is named
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Start server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});