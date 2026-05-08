import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import fetch from "node-fetch";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

const app = express();
const PORT = 8080;
const API_KEY = process.env.API_KEY;
const __dirname = path.dirname(fileURLToPath(import.meta.url));

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "../frontend")));

app.get("/news", async (req, res) => {
  try {
    const { location, genre, keyword } = req.query;
    let searchQuery = "";
    if (location) searchQuery += location + " ";
    if (genre)    searchQuery += genre + " ";
    if (keyword)  searchQuery += keyword;
    if (!searchQuery.trim()) searchQuery = "latest";
    const url = `https://newsapi.org/v2/everything?q=${encodeURIComponent(searchQuery)}&language=en&sortBy=publishedAt&pageSize=10&apiKey=${API_KEY}`;
    console.log("Fetching:", url);
    const response = await fetch(url);
    const data = await response.json();
    if (data.status !== "ok") {
      return res.status(400).json({ success: false, error: data.message });
    }
    res.json({ success: true, totalResults: data.totalResults, articles: data.articles });
  } catch (error) {
    console.error("SERVER ERROR:", error.message);
    res.status(500).json({ success: false, error: "Failed to fetch news" });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
