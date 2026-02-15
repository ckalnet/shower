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

/**
 * Extract product info from URL (fallback when page fetch fails)
 * Works with Home Depot, Lowe's, and similar URLs that contain product details
 */
function extractInfoFromUrl(url) {
    try {
        const urlObj = new URL(url);
        const path = decodeURIComponent(urlObj.pathname);

        // Convert URL path to readable text
        // e.g., "Carrara-White-Marble-Look-Polished-Porcelain-Tile-12-in-x-24-in"
        // becomes "Carrara White Marble Look Polished Porcelain Tile 12 in x 24 in"
        const text = path
            .replace(/\//g, ' ')
            .replace(/-/g, ' ')
            .replace(/_/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();

        return text;
    } catch (e) {
        return null;
    }
}

/**
 * Fetch a URL with browser-like headers
 */
async function fetchUrl(url) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    try {
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.9',
                'Cache-Control': 'no-cache',
            },
            redirect: 'follow',
            signal: controller.signal,
        });

        clearTimeout(timeout);

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const html = await response.text();

        // If we got very little content, the site probably blocked us
        if (html.length < 500) {
            throw new Error('Page content too short - site may be blocking requests');
        }

        // Extract text content from HTML
        const textContent = html
            .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, ' ')
            .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, ' ')
            .replace(/<[^>]+>/g, ' ')
            .replace(/&nbsp;/g, ' ')
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&quot;/g, '"')
            .replace(/&#39;/g, "'")
            .replace(/\s+/g, ' ')
            .trim();

        // Check if extracted content is meaningful (need enough text to extract tile specs)
        if (textContent.length < 200) {
            throw new Error('Extracted content too short - site may be blocking requests');
        }

        return textContent;
    } catch (error) {
        clearTimeout(timeout);
        throw error;
    }
}

// Parse tile details using Gemini LLM - accepts text or URL
app.post('/api/parse-tile', async (req, res) => {
    const { text, url } = req.body;

    if ((!text || text.trim().length === 0) && (!url || url.trim().length === 0)) {
        return res.status(400).json({ error: 'No text or URL provided' });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        return res.status(500).json({ error: 'Gemini API key not configured' });
    }

    try {
        let content = text;

        // If URL provided, try to fetch the page content
        if (url && url.trim().length > 0) {
            console.log(`Fetching URL: ${url}`);
            try {
                content = await fetchUrl(url.trim());
                console.log(`Fetched ${content.length} characters from URL`);
            } catch (fetchError) {
                console.warn('URL fetch failed:', fetchError.message);
                // Fall back to extracting info from URL itself
                const urlInfo = extractInfoFromUrl(url.trim());
                if (urlInfo) {
                    console.log('Using URL path as fallback:', urlInfo);
                    content = urlInfo;
                } else {
                    return res.status(400).json({
                        error: `Could not fetch URL. Try copying and pasting the product details instead.`
                    });
                }
            }
        }

        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({
            model: "gemini-flash-latest",
            generationConfig: {
                responseMimeType: "application/json"
            }
        });

        const prompt = `You are a tile specification extractor. Extract tile information from the following product page content or description.

Return ONLY valid JSON with these fields:
- width: tile width in inches (number). Convert from cm/mm if needed (1 inch = 2.54 cm)
- height: tile height in inches (number). Convert from cm/mm if needed
- price: price as a number (no currency symbol)
- priceUnit: pricing unit (e.g., "per sq ft", "per piece", "per box", "per case")
- name: product name (string)
- material: tile material (e.g., "Ceramic", "Porcelain", "Marble", "Glass", "Natural Stone")
- finish: surface finish (e.g., "Glossy", "Matte", "Polished", "Honed", "Textured")
- color: primary color or color description
- coverage: square footage per box/case if mentioned (number)

If a field cannot be determined from the content, set it to null.

Content to analyze:
${content.substring(0, 15000)}`;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const textResponse = response.text();

        const parsedResult = JSON.parse(textResponse);

        // Validate we got at least dimensions
        if (!parsedResult.width || !parsedResult.height) {
            return res.status(400).json({
                error: 'Could not extract tile dimensions from the content'
            });
        }

        res.json(parsedResult);

    } catch (error) {
        console.error('Error parsing tile details:', error);
        res.status(500).json({
            error: 'Failed to extract tile details',
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
