const express = require('express');
const axios = require('axios');
const cors = require('cors'); 
const cheerio = require('cheerio');
const { GoogleGenerativeAI } = require("@google/generative-ai");

const app = express();
// PASTE YOUR KEY FROM GOOGLE AI STUDIO HERE
const genAI = new GoogleGenerativeAI("AIzaSyAZlA5h70Ogf8YbLw3A7yZ66eTtlDAczfM"); 

app.use(cors()); 
app.use(express.json());

app.get('/', (req, res) => res.send("OK"));

app.post('/api/analyze', async (req, res) => {
    try {
        const { input } = req.body;
        let contentToAnalyze = input;

        if (input.trim().startsWith('http')) {
            const webpage = await axios.get(input, { headers: { 'User-Agent': 'Mozilla/5.0' } });
            const $ = cheerio.load(webpage.data);
            let scrapedText = "";
            $('p').each((i, el) => { scrapedText += $(el).text() + " "; });
            contentToAnalyze = scrapedText.substring(0, 8000);
        }

        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const prompt = `Fact-check this: "${contentToAnalyze}". 
        Return ONLY a JSON object: {"score": 0-100, "verdict": "string", "summary": "string", "citations": ["source"]}`;

        const result = await model.generateContent(prompt);
        let text = result.response.text();
        
        // This part cleans the AI response to prevent "Server processing failed"
        const cleanJson = text.substring(text.indexOf('{'), text.lastIndexOf('}') + 1);
        res.json(JSON.parse(cleanJson));

    } catch (error) {
        console.error("Detailed Error:", error);
        res.status(500).json({ score: 0, verdict: "Error", summary: "AI failed to respond. Check API Key.", citations: [] });
    }
});

app.listen(3000, () => console.log('🚀 SERVER ACTIVE AT http://localhost:3000'));