# Quick Start Guide

## Option 1: Frontend Only (No Setup Required)

Just open `index.html` in your browser. The tile import will use pattern matching.

## Option 2: With AI-Powered Parsing (Recommended)

### Step 1: Install Node.js
If you don't have Node.js, download it from [nodejs.org](https://nodejs.org)

### Step 2: Install Dependencies
```bash
npm install
```

### Step 3: Get OpenAI API Key
1. Go to [platform.openai.com/api-keys](https://platform.openai.com/api-keys)
2. Create a new API key
3. Copy it

### Step 4: Configure Environment
```bash
# Copy the example file
cp .env.example .env

# Edit .env and add your API key
# OPENAI_API_KEY=sk-your-key-here
```

### Step 5: Start the Server
```bash
npm start
```

### Step 6: Open the App
Visit `http://localhost:3000` in your browser

## Testing the Tile Import

Copy any example from `EXAMPLE_TILE_DATA.txt` and paste into the import section.

## Troubleshooting

**"API key not configured"** - Make sure your `.env` file has `OPENAI_API_KEY=sk-...`

**"Cannot find module"** - Run `npm install` first

**Port already in use** - Change `PORT=3000` to another port in `.env`
