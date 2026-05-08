const express = require('express');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 8080;

// Middleware
app.use(cors());
app.use(express.json());

// Serve static files from frontend folder
app.use(express.static(path.join(__dirname, '..', 'frontend')));

// API endpoint for news - FETCHES REAL, FRESH NEWS EVERY TIME
app.get('/api/news', async (req, res) => {
    try {
        const { location, genre, keyword, page = 1, pageSize = 10 } = req.query;
        
        // Build search query from all fields
        const searchTerms = [];
        if (location && location.trim()) searchTerms.push(location.trim());
        if (genre && genre.trim()) searchTerms.push(genre.trim());
        if (keyword && keyword.trim()) searchTerms.push(keyword.trim());
        
        const query = searchTerms.join(' ');
        
        if (!query) {
            return res.json({ articles: [], totalResults: 0 });
        }
        
        console.log(`[NewsAPI] Searching for: "${query}"`); // Logs to Render console
        
        const apiKey = process.env.API_KEY;
        
        // IMPORTANT: sortBy=publishedAt ensures LATEST news first
        const url = `https://newsapi.org/v2/everything?q=${encodeURIComponent(query)}&sortBy=publishedAt&pageSize=${pageSize}&page=${page}&apiKey=${apiKey}&language=en`;
        
        const response = await fetch(url);
        const data = await response.json();
        
        if (data.status === 'error') {
            console.error('[NewsAPI] Error:', data.message);
            return res.json({ articles: [], totalResults: 0, error: data.message });
        }
        
        // Return fresh, relevant articles
        res.json({
            articles: data.articles || [],
            totalResults: data.totalResults || 0,
            status: 'ok'
        });
        
    } catch (error) {
        console.error('[Server] Error:', error);
        res.status(500).json({ articles: [], totalResults: 0, error: 'Failed to fetch news' });
    }
});

// Catch-all route for frontend
app.use((req, res) => {
    res.sendFile(path.join(__dirname, '..', 'frontend', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});