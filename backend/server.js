const express = require('express');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 8080;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'frontend')));

// Simple working search endpoint
app.get('/api/news', async (req, res) => {
    try {
        const { location, genre, keyword, page = 1, pageSize = 15 } = req.query;
        
        // Build search query
        let searchQuery = '';
        if (location) searchQuery += location + ' ';
        if (genre) searchQuery += genre + ' ';
        if (keyword) searchQuery += keyword;
        searchQuery = searchQuery.trim();
        
        if (!searchQuery) {
            return res.json({ articles: [] });
        }
        
        console.log(`Searching: "${searchQuery}"`);
        
        const apiKey = process.env.API_KEY;
        const url = `https://newsapi.org/v2/everything?q=${encodeURIComponent(searchQuery)}&language=en&sortBy=publishedAt&pageSize=${pageSize}&page=${page}&apiKey=${apiKey}`;
        
        const response = await fetch(url);
        const data = await response.json();
        
        if (data.status === 'error') {
            return res.json({ articles: [], error: data.message });
        }
        
        res.json({
            articles: data.articles || [],
            hasMore: data.articles && data.articles.length === pageSize
        });
        
    } catch (error) {
        console.error('Error:', error);
        res.json({ articles: [], error: 'Failed to fetch' });
    }
});

app.use((req, res) => {
    res.sendFile(path.join(__dirname, '..', 'frontend', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});