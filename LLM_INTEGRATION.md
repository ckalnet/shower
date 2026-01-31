# LLM Integration Guide

## Current Implementation

The tile import feature currently uses **pattern matching** to extract tile specifications from pasted text. This works well for common formats but has limitations.

## Upgrading to Real LLM Integration

To use a real LLM API (OpenAI, Anthropic Claude, etc.), replace the `parseTileDetailsWithLLM` method in `script.js`.

### Option 1: OpenAI API

```javascript
async parseTileDetailsWithLLM(text) {
    const apiKey = 'YOUR_OPENAI_API_KEY'; // Store securely!
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
            model: 'gpt-4',
            messages: [{
                role: 'system',
                content: 'Extract tile specifications from product descriptions. Return JSON with: width (inches), height (inches), price (number), priceUnit (string), name (string), material (string), finish (string).'
            }, {
                role: 'user',
                content: text
            }],
            response_format: { type: 'json_object' }
        })
    });

    const data = await response.json();
    return JSON.parse(data.choices[0].message.content);
}
```

### Option 2: Anthropic Claude API

```javascript
async parseTileDetailsWithLLM(text) {
    const apiKey = 'YOUR_ANTHROPIC_API_KEY';
    
    const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
            model: 'claude-3-sonnet-20240229',
            max_tokens: 1024,
            messages: [{
                role: 'user',
                content: `Extract tile specifications from this product description and return as JSON with fields: width (inches), height (inches), price (number), priceUnit, name, material, finish.\n\n${text}`
            }]
        })
    });

    const data = await response.json();
    return JSON.parse(data.content[0].text);
}
```

### Option 3: Backend Proxy (Recommended for Production)

For security, **never expose API keys in client-side code**. Instead, create a backend endpoint:

```javascript
async parseTileDetailsWithLLM(text) {
    const response = await fetch('/api/parse-tile', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ text })
    });

    if (!response.ok) {
        throw new Error('Failed to parse tile details');
    }

    return await response.json();
}
```

Then create a backend endpoint (Node.js example):

```javascript
// server.js
app.post('/api/parse-tile', async (req, res) => {
    const { text } = req.body;
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
        },
        body: JSON.stringify({
            model: 'gpt-4',
            messages: [{
                role: 'system',
                content: 'Extract tile specifications and return JSON...'
            }, {
                role: 'user',
                content: text
            }]
        })
    });

    const data = await response.json();
    res.json(JSON.parse(data.choices[0].message.content));
});
```

## Testing the Feature

Try pasting these example product descriptions:

### Example 1: Lowe's Format
```
Style Selections Leonia Silver 3-in x 6-in Glossy Ceramic Subway Wall Tile
$1.29 per sq ft
Ceramic tile with a glossy finish
Dimensions: 3" x 6"
```

### Example 2: Home Depot Format
```
MSI Carrara White 3 in. x 6 in. Polished Marble Subway Tile
Model# THDW1-SH-CAR36P
$12.98 per piece
Material: Marble
Finish: Polished
Size: 3 x 6 inches
```

## Current Pattern Matching Capabilities

The fallback pattern matching can extract:
- Dimensions in formats: `3" x 6"`, `3 x 6`, `3-inch x 6-inch`
- Prices: `$12.99`
- Materials: ceramic, porcelain, glass, marble, granite, travertine, slate
- Finishes: glossy, matte, polished, honed, textured, glazed
- Price units: per sq ft, per piece, per box

## Future Enhancements

- Support for metric conversions (cm to inches)
- Extract coverage area per box
- Parse quantity per box
- Identify recommended grout spacing
- Extract color/style information
- Support for multiple tile sizes in one product
