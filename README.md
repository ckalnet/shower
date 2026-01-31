# Shower Tile Layout Visualizer

A web-based tool for planning and visualizing tile layouts in shower installations with AI-powered tile import.

## Features

- Visual tile layout generation with SVG rendering
- Multiple tile patterns (brick/running bond, 1/3 offset, straight stack)
- AI-powered tile detail extraction from product descriptions
- Automatic cut tile calculations with precise measurements
- Ledger board installation support
- Material estimation with 10% waste factor
- Real-time updates on input changes

## Quick Start (Frontend Only)

Simply open `index.html` in a browser. The app works with pattern matching fallback.

## Backend Setup (For AI-Powered Parsing)

### Prerequisites

- Node.js 18+ installed
- OpenAI API key ([get one here](https://platform.openai.com/api-keys))

### Installation

1. Install dependencies:
```bash
npm install
```

2. Create `.env` file:
```bash
cp .env.example .env
```

3. Add your OpenAI API key to `.env`:
```
OPENAI_API_KEY=sk-your-key-here
PORT=3000
```

### Running the Server

```bash
npm start
```

Server runs at `http://localhost:3000`

### Development Mode (Auto-restart)

```bash
npm run dev
```

## Usage

1. Open `http://localhost:3000` in your browser
2. Paste tile product details from Lowe's, Home Depot, etc. into the import section
3. Click "Import Tile Details" - AI extracts dimensions, price, material, finish
4. Enter shower dimensions
5. Click "Generate Layout" to see your tile plan

## Architecture

- Frontend: Vanilla JavaScript (ES6+), HTML5, CSS3
- Backend: Node.js + Express (optional, for AI parsing)
- AI: OpenAI GPT-4o-mini for tile specification extraction
