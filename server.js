const express = require('express');
const axios = require('axios');
const cors = require('cors'); 
const cheerio = require('cheerio');
const { GoogleGenerativeAI } = require("@google/generative-ai");

const app = express();
// Uses the key you added in Render's "Environment Variables" tab
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY); 

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
        const prompt = `Fact-check this: "${contentToAnalyze}". Return ONLY a JSON object: {"score": 0-100, "verdict": "string", "summary": "string", "citations": ["source"]}`;

        const result = await model.generateContent(prompt);
        let text = result.response.text();
        
        // This cleans the AI response to ensure it is valid JSON
        const cleanJson = text.substring(text.indexOf('{'), text.lastIndexOf('}') + 1);
        res.json(JSON.parse(cleanJson));

    } catch (error) {
        console.error(error);
        res.status(500).json({ score: 0, verdict: "Error", summary: "Server processing failed. Check API Key." });
    }
});

// MANDATORY: Use process.env.PORT for Render deployment
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 SERVER ACTIVE ON PORT ${PORT}`));