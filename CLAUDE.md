# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Shower Tile Layout Visualizer - A full-stack web application for AI-powered tile layout planning with visual SVG rendering. Uses Google Gemini API for parsing tile product descriptions.

**Tech Stack:** Vanilla JavaScript (ES6+), Node.js + Express, Google Gemini API

## Commands

```bash
npm install              # Install dependencies
npm start                # Start production server (port 3000)
npm run dev              # Start server with hot-reload (--watch)
npm test                 # Run all tests (Node.js built-in test runner)
npm run test:watch       # Run tests in watch mode
node test-api.js         # Test the tile parsing API manually
```

**Configuration:** Copy `.env.example` to `.env` and add `GEMINI_API_KEY=your_key`

**Frontend-only mode:** Open `index.html` directly in browser (uses pattern matching fallback, no API needed)

## Architecture

### Dual-Mode Operation
The app operates in two modes:
1. **Primary:** Backend AI parsing via `/api/parse-tile` endpoint (Gemini Flash)
2. **Fallback:** Client-side regex pattern matching when API unavailable

### Code Separation: Browser vs. Testable Logic

There are two parallel implementations of the calculation/parsing logic:

- **`script.js`** — `TileLayoutVisualizer` class for the browser. Contains DOM manipulation, SVG rendering, LocalStorage persistence, and its own copy of `calculateTileLayout()` and `parseTileDetailsWithPatternMatching()`.
- **`tile-calculator.js`** — Pure function exports (`calculateTileLayout`, `parseTileDetailsWithPatternMatching`, `calculateShowerLayout`, `toFractionalInches`). No DOM dependencies. This is the testable module used by `tile-calculator.test.js`.

**Important:** These two files contain duplicated calculation logic. Changes to layout calculations or pattern matching must be made in both files to stay in sync.

### Backend (`server.js`)
- `POST /api/parse-tile` — Accepts `{ text, url }` body. Tries to fetch URL content, falls back to parsing the URL path itself, then sends content to Gemini for extraction.
- `GET /api/health` — Returns `{ status, hasApiKey }`.
- Serves static files from the project root.

### Tile Layout Calculation Engine

**Supported Patterns:** Brick/Running Bond (50% offset), 1/3 Offset, Straight Stack

**Key Calculations:**
- Center alignment on back wall to minimize edge cuts, side walls wrap from back wall edges
- Wall wrapping uses `wrapInfo` parameter: `{ startX, startY, wrapFromLeft/wrapFromRight, referenceWidth }`
- Grout spacing (1/16" to 3/8") added to tile placement grid
- Ledger board support: bottom row tiles get "L" prefix numbering and are installed last
- Material estimation with 10% waste factor

### Key Data Structures

```javascript
// Tile object from calculateTileLayout
{
  x, y,                    // Position (inches, visible portion)
  width, height,           // Visible dimensions
  fullWidth, fullHeight,   // Original tile dimensions
  isCut,                   // Boolean
  cutInfo: { left, right, top, bottom },  // Amount cut from each side
  row, col,                // Grid position
  installNumber            // Installation sequence (or "L1", "L2" for ledger board)
}
```

## Testing

Tests use **Node.js built-in test runner** (`node:test` + `node:assert`), not Jest.

```bash
npm test                 # node --test tile-calculator.test.js
npm run test:watch       # node --test --watch tile-calculator.test.js
```

Tests cover: fractional inch conversion, layout calculations (basic, patterns, wall wrapping, cut detection, edge cases), pattern matching for product descriptions, full shower layout calculations, and real-world regression scenarios.

## Conventions

- All measurements are in decimal inches internally, displayed as fractional inches (rounded to 1/8")
- Tile numbering: bottom-to-top, left-to-right installation sequence
- ES modules throughout (`"type": "module"` in package.json, `import`/`export` syntax)
- No build step, no bundler, no framework
