const express = require('express');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 8080;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'frontend')));

// ============================================
// PRODUCTION-GRADE SEARCH PIPELINE
// ============================================

// 1. QUERY VALIDATION — Reject truly nonsense searches
function isValidQuery(query) {
    if (!query || query.trim().length < 2) return false;
    
    const lowerQuery = query.toLowerCase();
    const hasVowel = /[aeiou]/i.test(lowerQuery);
    const isRepeatedChar = /^(.)\1+$/.test(lowerQuery.replace(/\s/g, ''));
    const hasLetter = /[a-z]/i.test(lowerQuery);
    
    if ((!hasVowel && lowerQuery.length > 5) || isRepeatedChar) return false;
    if (!hasLetter) return false;
    
    return true;
}

// 2. QUERY ENHANCEMENT — Add context for better results
function enhanceQuery(location, genre, keyword) {
    const parts = [];
    if (location && location.trim()) parts.push(location.trim());
    if (genre && genre.trim()) parts.push(genre.trim());
    if (keyword && keyword.trim()) parts.push(keyword.trim());
    
    let query = parts.join(' ');
    
    const contextualMap = {
        'fashion': ['style', 'designer', 'collection', 'runway'],
        'tech': ['software', 'app', 'digital', 'innovation'],
        'business': ['market', 'economy', 'finance', 'stock'],
        'sports': ['game', 'match', 'tournament', 'league'],
        'health': ['wellness', 'medical', 'fitness', 'research'],
        'education': ['school', 'university', 'student', 'learning']
    };
    
    for (const [topic, keywords] of Object.entries(contextualMap)) {
        if (query.toLowerCase().includes(topic)) {
            query = `${query} ${keywords.slice(0, 2).join(' ')}`;
            break;
        }
    }
    
    return query;
}

// 3. SMART ENDPOINT SELECTION
function selectEndpoint(location, genre, keyword, query) {
    const hasKeyword = keyword && keyword.trim().length > 0;
    const hasSpecificQuery = query.split(' ').length >= 3;
    
    if (hasKeyword || hasSpecificQuery) {
        return { type: 'everything', sortBy: 'relevancy' };
    }
    return { type: 'top-headlines', sortBy: 'publishedAt' };
}

// 4. QUALITY FILTERING
function isQualityArticle(article, searchTerms) {
    const title = (article.title || '').toLowerCase();
    
    const junkPatterns = [
        '1080p', '720p', 'web-dl', 'webdl', 'bluray', 'x264', 'x265',
        'hdtv', 'dvdrip', 'brrip', ' proper', ' repack', 'predvd',
        'watch now', 'free download', 'streaming'
    ];
    for (const pattern of junkPatterns) {
        if (title.includes(pattern)) return false;
    }
    
    if (title.length < 15) return false;
    
    const searchLower = searchTerms.toLowerCase();
    const termsInTitle = searchTerms.split(' ').filter(term => 
        term.length > 2 && title.includes(term.toLowerCase())
    ).length;
    
    return termsInTitle >= 1;
}

// 5. RELEVANCE SCORING
function scoreArticle(article, searchTerms) {
    let score = 50;
    const title = (article.title || '').toLowerCase();
    const description = (article.description || '').toLowerCase();
    const searchLower = searchTerms.toLowerCase();
    
    const searchWords = searchTerms.toLowerCase().split(' ');
    for (const word of searchWords) {
        if (word.length > 2) {
            if (title.includes(word)) score += 15;
            if (description.includes(word)) score += 5;
        }
    }
    
    if (title.includes(searchLower)) score += 30;
    if (article.urlToImage) score += 10;
    
    if (article.publishedAt) {
        const daysOld = (Date.now() - new Date(article.publishedAt)) / (1000 * 60 * 60 * 24);
        if (daysOld < 1) score += 20;
        else if (daysOld < 3) score += 10;
        else if (daysOld > 7) score -= 10;
    }
    
    return Math.min(100, Math.max(0, score));
}

// 6. DEDUPLICATION
function deduplicateArticles(articles) {
    const seen = new Map();
    for (const article of articles) {
        const key = `${article.source?.name || ''}|${article.title || ''}`;
        if (!seen.has(key) || seen.get(key).score < (article.score || 0)) {
            seen.set(key, article);
        }
    }
    return Array.from(seen.values());
}

// ============================================
// MAIN API ENDPOINT
// ============================================
app.get('/api/news', async (req, res) => {
    try {
        let { location, genre, keyword, page = 1, pageSize = 12 } = req.query;
        page = parseInt(page);
        pageSize = Math.min(parseInt(pageSize), 20);
        
        let rawQuery = [location, genre, keyword].filter(Boolean).join(' ');
        
        if (!isValidQuery(rawQuery)) {
            return res.json({
                articles: [],
                totalResults: 0,
                hasMore: false,
                error: 'Please enter a more specific search (2+ letters, real words)',
                invalidQuery: true
            });
        }
        
        const enhancedQuery = enhanceQuery(location, genre, keyword);
        const endpoint = selectEndpoint(location, genre, keyword, enhancedQuery);
        
        console.log(`[API] Query: "${rawQuery}" → ${endpoint.type}`);
        
        const apiKey = process.env.API_KEY;
        let url;
        
        if (endpoint.type === 'top-headlines') {
            const countryMap = {
                'india': 'in', 'usa': 'us', 'uk': 'gb', 'canada': 'ca',
                'australia': 'au', 'germany': 'de', 'france': 'fr', 'japan': 'jp'
            };
            const country = countryMap[location?.toLowerCase()] || '';
            
            if (country && genre) {
                url = `https://newsapi.org/v2/top-headlines?country=${country}&category=${genre}&pageSize=${pageSize}&page=${page}&apiKey=${apiKey}`;
            } else if (country) {
                url = `https://newsapi.org/v2/top-headlines?country=${country}&pageSize=${pageSize}&page=${page}&apiKey=${apiKey}`;
            } else {
                url = `https://newsapi.org/v2/everything?q=${encodeURIComponent(enhancedQuery)}&language=en&sortBy=relevancy&pageSize=${pageSize}&page=${page}&apiKey=${apiKey}`;
            }
        } else {
            url = `https://newsapi.org/v2/everything?q=${encodeURIComponent(enhancedQuery)}&language=en&sortBy=relevancy&pageSize=${pageSize}&page=${page}&apiKey=${apiKey}`;
        }
        
        const response = await fetch(url);
        const data = await response.json();
        
        if (data.status === 'error') {
            if (data.code === 'rateLimited') {
                return res.json({ articles: [], totalResults: 0, error: 'Daily limit reached. Try tomorrow.', rateLimited: true });
            }
            return res.json({ articles: [], totalResults: 0, error: data.message });
        }
        
        let articles = data.articles || [];
        articles = articles.filter(article => isQualityArticle(article, rawQuery));
        articles = articles.map(article => ({
            ...article,
            score: scoreArticle(article, rawQuery)
        }));
        articles = articles.filter(article => article.score >= 40);
        articles.sort((a, b) => b.score - a.score);
        articles = deduplicateArticles(articles);
        
        const hasMore = articles.length === pageSize && (data.totalResults || 0) > page * pageSize;
        
        console.log(`[API] Returned ${articles.length} quality articles`);
        
        res.json({
            articles: articles,
            totalResults: articles.length,
            hasMore: hasMore,
            currentPage: page,
            originalQuery: rawQuery,
            usingTopHeadlines: endpoint.type === 'top-headlines',
            status: 'ok'
        });
        
    } catch (error) {
        console.error('[Server] Error:', error);
        res.status(500).json({ articles: [], totalResults: 0, error: 'Failed to fetch news' });
    }
});

app.use((req, res) => {
    res.sendFile(path.join(__dirname, '..', 'frontend', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});