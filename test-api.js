// Simple test script for the tile parsing API
// Run with: node test-api.js

const testText = `
Style Selections Leonia Silver 3-in x 6-in Glossy Ceramic Subway Wall Tile
$1.29 per sq ft
Ceramic tile with a glossy finish
Perfect for bathroom and kitchen backsplashes
`;

async function testAPI() {
    console.log('🧪 Testing Tile Parsing API...\n');
    console.log('Input text:');
    console.log(testText);
    console.log('\n---\n');

    try {
        const response = await fetch('http://localhost:3000/api/parse-tile', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ text: testText })
        });

        if (!response.ok) {
            const error = await response.json();
            console.error('❌ API Error:', error);
            return;
        }

        const result = await response.json();
        console.log('✅ Success! Extracted data:');
        console.log(JSON.stringify(result, null, 2));

    } catch (error) {
        console.error('❌ Connection Error:', error.message);
        console.log('\n💡 Make sure the server is running: npm start');
    }
}

testAPI();
