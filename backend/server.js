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

// Your API endpoint for news
app.get('/api/news', async (req, res) => {
    try {
        const { location, topic, keywords } = req.query;
        
        let query = '';
        if (location) query += location + ' ';
        if (topic) query += topic + ' ';
        if (keywords) query += keywords;
        
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

// ✅ FIXED: Using app.use instead of app.get for catch-all
app.use((req, res) => {
    res.sendFile(path.join(__dirname, '..', 'frontend', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});