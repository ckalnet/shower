# Technology Stack

## Core Technologies

### Frontend
- **HTML5** - Semantic markup with form inputs
- **Vanilla JavaScript (ES6+)** - No frameworks or build tools
- **CSS3** - Grid layout, flexbox, modern styling
- **SVG** - Dynamic tile layout visualization

### Backend (Optional)
- **Node.js** - Runtime for API server
- **Express** - Minimal web framework
- **OpenAI API** - GPT-4o-mini for tile specification extraction

## Architecture

- Single-page application (SPA) with optional backend
- Class-based JavaScript architecture (`TileLayoutVisualizer` class)
- Event-driven UI updates (auto-calculate on input change)
- Progressive enhancement: works standalone or with AI backend

### Frontend
- Pattern matching fallback for tile import
- Auto-detects backend availability
- Graceful degradation if API unavailable

### Backend
- Secure API proxy for OpenAI
- Single endpoint: `/api/parse-tile`
- CORS enabled for local development

## Development

### Frontend Only
```bash
# Open directly in browser
start index.html
```

### With Backend (AI-Powered)
```bash
# Install dependencies
npm install

# Configure .env with OPENAI_API_KEY
cp .env.example .env

# Start server
npm start
```

### File Structure
- `index.html` - Main page with form inputs
- `script.js` - Core application logic
- `styles.css` - All styling and visual design
- `server.js` - Backend API proxy (optional)
- `package.json` - Node.js dependencies

## Browser Compatibility

Modern browsers with ES6+ support required (Chrome, Firefox, Safari, Edge).
