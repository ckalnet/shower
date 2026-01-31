import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { GoogleGenerativeAI } from '@google/generative-ai';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static('.'));

// Parse tile details using Gemini
app.post('/api/parse-tile', async (req, res) => {
    const { text } = req.body;

    if (!text || text.trim().length === 0) {
        return res.status(400).json({ error: 'No text provided' });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        return res.status(500).json({ error: 'Gemini API key not configured' });
    }

    try {
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ 
            model: "gemini-flash-latest",
            generationConfig: {
                responseMimeType: "application/json"
            }
        });

        const prompt = `You are a tile specification extractor. Extract tile information from product descriptions and return ONLY valid JSON with these fields:
- width: tile width in inches (number)
- height: tile height in inches (number)
- price: price as a number (no currency symbol)
- priceUnit: pricing unit (e.g., "per sq ft", "per piece", "per box")
- name: product name (string)
- material: tile material (e.g., "Ceramic", "Porcelain", "Marble", "Glass")
- finish: surface finish (e.g., "Glossy", "Matte", "Polished")

If a field cannot be determined, set it to null.

Input text:
${text}`;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const textResponse = response.text();
        
        const parsedResult = JSON.parse(textResponse);

        // Validate we got at least dimensions
        if (!parsedResult.width || !parsedResult.height) {
            return res.status(400).json({
                error: 'Could not extract tile dimensions from the provided text'
            });
        }

        res.json(parsedResult);

    } catch (error) {
        console.error('Error parsing tile details:', error);
        res.status(500).json({ 
            error: 'Internal server error',
            message: error.message 
        });
    }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'ok',
        hasApiKey: !!process.env.GEMINI_API_KEY
    });
});

app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`📊 API endpoint: http://localhost:${PORT}/api/parse-tile`);
    console.log(`🔑 Gemini API key: ${process.env.GEMINI_API_KEY ? '✓ Configured' : '✗ Missing'}`);
});
