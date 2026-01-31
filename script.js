class TileLayoutVisualizer {
    constructor() {
        this.storageKey = 'showerTileLayoutInputs';
        this.defaults = {
            showerWidth: 36,
            showerHeight: 96,
            showerDepth: 36,
            tileWidth: 3,
            tileHeight: 6,
            groutSpacing: 0.125,
            tilePattern: 'brick-50',
            useLedgerBoard: false
        };
        this.init();
    }

    init() {
        this.loadFromStorage();
        this.bindEvents();
        // Auto-generate on page load with saved/default values
        setTimeout(() => this.generate(), 100);
    }

    bindEvents() {
        document.getElementById('calculate').addEventListener('click', () => this.generate());
        document.getElementById('resetDefaults').addEventListener('click', () => this.resetToDefaults());
        document.getElementById('importTile').addEventListener('click', () => this.importTileDetails());
        document.getElementById('clearImport').addEventListener('click', () => this.clearImport());

        // Auto-update on input change and save to storage
        const inputs = document.querySelectorAll('input, select');
        inputs.forEach(input => {
            input.addEventListener('change', () => {
                this.saveToStorage();
                this.generate();
            });
        });
    }

    loadFromStorage() {
        try {
            const saved = localStorage.getItem(this.storageKey);
            const values = saved ? JSON.parse(saved) : this.defaults;
            
            // Apply values to inputs
            Object.keys(values).forEach(key => {
                const element = document.getElementById(key);
                if (element) {
                    if (element.type === 'checkbox') {
                        element.checked = values[key];
                    } else {
                        element.value = values[key];
                    }
                }
            });
        } catch (e) {
            console.error('Error loading from storage:', e);
            this.applyDefaults();
        }
    }

    saveToStorage() {
        try {
            const values = {};
            Object.keys(this.defaults).forEach(key => {
                const element = document.getElementById(key);
                if (element) {
                    values[key] = element.type === 'checkbox' ? element.checked : element.value;
                }
            });
            localStorage.setItem(this.storageKey, JSON.stringify(values));
        } catch (e) {
            console.error('Error saving to storage:', e);
        }
    }

    applyDefaults() {
        Object.keys(this.defaults).forEach(key => {
            const element = document.getElementById(key);
            if (element) {
                if (element.type === 'checkbox') {
                    element.checked = this.defaults[key];
                } else {
                    element.value = this.defaults[key];
                }
            }
        });
    }

    resetToDefaults() {
        if (confirm('Reset all inputs to default values?')) {
            this.applyDefaults();
            this.saveToStorage();
            this.generate();
        }
    }

    clearImport() {
        document.getElementById('tileImportText').value = '';
        document.getElementById('importStatus').textContent = '';
        document.getElementById('importStatus').className = 'import-status';
        document.getElementById('tileInfoDisplay').classList.remove('visible');
    }

    async importTileDetails() {
        const importText = document.getElementById('tileImportText').value.trim();
        const statusDiv = document.getElementById('importStatus');
        const infoDisplay = document.getElementById('tileInfoDisplay');

        if (!importText) {
            statusDiv.textContent = 'Please paste tile product details first.';
            statusDiv.className = 'import-status error';
            return;
        }

        statusDiv.textContent = 'Analyzing tile details with AI...';
        statusDiv.className = 'import-status loading';

        try {
            const tileData = await this.parseTileDetailsWithLLM(importText);

            if (tileData.error) {
                statusDiv.textContent = tileData.error;
                statusDiv.className = 'import-status error';
                return;
            }

            // Update form fields
            if (tileData.width) {
                document.getElementById('tileWidth').value = tileData.width;
            }
            if (tileData.height) {
                document.getElementById('tileHeight').value = tileData.height;
            }

            // Display extracted info
            let infoHTML = '<h4>Extracted Tile Information:</h4>';
            if (tileData.name) infoHTML += `<p><strong>Product:</strong> ${tileData.name}</p>`;
            if (tileData.width && tileData.height) {
                infoHTML += `<p><strong>Dimensions:</strong> ${tileData.width}" × ${tileData.height}"</p>`;
            }
            if (tileData.price) infoHTML += `<p><strong>Price:</strong> $${tileData.price}</p>`;
            if (tileData.priceUnit) infoHTML += `<p><strong>Unit:</strong> ${tileData.priceUnit}</p>`;
            if (tileData.material) infoHTML += `<p><strong>Material:</strong> ${tileData.material}</p>`;
            if (tileData.finish) infoHTML += `<p><strong>Finish:</strong> ${tileData.finish}</p>`;

            infoDisplay.innerHTML = infoHTML;
            infoDisplay.classList.add('visible');

            statusDiv.textContent = 'Tile details imported successfully!';
            statusDiv.className = 'import-status success';

            // Save and regenerate
            this.saveToStorage();
            this.generate();

        } catch (error) {
            console.error('Import error:', error);
            statusDiv.textContent = 'Error parsing tile details. Please try again or enter manually.';
            statusDiv.className = 'import-status error';
        }
    }

    async parseTileDetailsWithLLM(text) {
        // Try backend API first, fall back to pattern matching
        try {
            const apiUrl = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
                ? 'http://localhost:3000/api/parse-tile'
                : '/api/parse-tile';

            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ text })
            });

            if (response.ok) {
                const data = await response.json();
                return data;
            }

            // If API fails, fall back to pattern matching
            console.warn('API unavailable, using pattern matching fallback');
            return this.parseTileDetailsWithPatternMatching(text);

        } catch (error) {
            console.warn('API error, using pattern matching fallback:', error);
            return this.parseTileDetailsWithPatternMatching(text);
        }
    }

    parseTileDetailsWithPatternMatching(text) {
        const result = {
            width: null,
            height: null,
            price: null,
            priceUnit: null,
            name: null,
            material: null,
            finish: null
        };

        // Try to extract dimensions (various formats)
        const dimensionPatterns = [
            /(\d+(?:\.\d+)?)\s*(?:"|inch|in)?\s*[xX×]\s*(\d+(?:\.\d+)?)\s*(?:"|inch|in)?/,
            /(\d+(?:\.\d+)?)\s*[xX×]\s*(\d+(?:\.\d+)?)/,
            /(\d+(?:\.\d+)?)-inch\s*[xX×]\s*(\d+(?:\.\d+)?)-inch/
        ];

        for (const pattern of dimensionPatterns) {
            const match = text.match(pattern);
            if (match) {
                result.width = parseFloat(match[1]);
                result.height = parseFloat(match[2]);
                break;
            }
        }

        // Extract price
        const priceMatch = text.match(/\$\s*(\d+(?:\.\d{2})?)/);
        if (priceMatch) {
            result.price = parseFloat(priceMatch[1]);
        }

        // Extract price unit
        if (text.match(/per\s+(?:sq\.?\s*ft|square\s+foot)/i)) {
            result.priceUnit = 'per sq ft';
        } else if (text.match(/per\s+(?:piece|tile|each)/i)) {
            result.priceUnit = 'per piece';
        } else if (text.match(/per\s+box/i)) {
            result.priceUnit = 'per box';
        }

        // Extract material
        const materials = ['ceramic', 'porcelain', 'glass', 'marble', 'granite', 'travertine', 'slate'];
        for (const material of materials) {
            if (text.toLowerCase().includes(material)) {
                result.material = material.charAt(0).toUpperCase() + material.slice(1);
                break;
            }
        }

        // Extract finish
        const finishes = ['glossy', 'matte', 'polished', 'honed', 'textured', 'glazed'];
        for (const finish of finishes) {
            if (text.toLowerCase().includes(finish)) {
                result.finish = finish.charAt(0).toUpperCase() + finish.slice(1);
                break;
            }
        }

        // Try to extract product name
        const lines = text.split('\n').filter(line => line.trim());
        if (lines.length > 0) {
            const titleLine = lines[0].trim();
            if (titleLine.length < 100) {
                result.name = titleLine;
            }
        }

        // Validate we got at least dimensions
        if (!result.width || !result.height) {
            return {
                error: 'Could not extract tile dimensions. Please ensure the text includes dimensions like "3 x 6 inches".'
            };
        }

        return result;
    }

    generate() {
        const showerWidth = parseFloat(document.getElementById('showerWidth').value) || 0;
        const showerHeight = parseFloat(document.getElementById('showerHeight').value) || 0;
        const showerDepth = parseFloat(document.getElementById('showerDepth').value) || 0;
        const tileWidth = parseFloat(document.getElementById('tileWidth').value) || 0;
        const tileHeight = parseFloat(document.getElementById('tileHeight').value) || 0;
        const groutSpacing = parseFloat(document.getElementById('groutSpacing').value) || 0;
        const pattern = document.getElementById('tilePattern').value;

        if (showerWidth <= 0 || showerHeight <= 0 || showerDepth <= 0) {
            this.showError('Please enter valid shower dimensions.');
            return;
        }

        if (tileWidth <= 0 || tileHeight <= 0) {
            this.showError('Please enter valid tile dimensions.');
            return;
        }

        const results = document.getElementById('results');
        results.innerHTML = '';

        // Calculate layout for each wall
        const walls = [
            { name: 'Back Wall', width: showerWidth, height: showerHeight },
            { name: 'Left Wall', width: showerDepth, height: showerHeight },
            { name: 'Right Wall', width: showerDepth, height: showerHeight }
        ];

        let totalTiles = 0;
        let totalFullTiles = 0;
        let totalCutTiles = 0;

        const patternName = this.getPatternName(pattern);

        const headerDiv = document.createElement('div');
        headerDiv.className = 'pattern-info';
        headerDiv.innerHTML = `<strong>Selected Pattern:</strong> ${patternName}`;
        results.appendChild(headerDiv);

        // Calculate back wall first (this is the reference wall)
        const backWallLayout = this.calculateTileLayout(
            walls[0].width,
            walls[0].height,
            tileWidth,
            tileHeight,
            groutSpacing,
            pattern,
            null // Back wall has no offset
        );

        totalTiles += backWallLayout.totalTiles;
        totalFullTiles += backWallLayout.fullTiles;
        totalCutTiles += backWallLayout.cutTiles;

        this.renderWallLayout(results, walls[0], backWallLayout, tileWidth, tileHeight, groutSpacing, 0);

        // Calculate left wall (wraps from left edge of back wall)
        const leftWallLayout = this.calculateTileLayout(
            walls[1].width,
            walls[1].height,
            tileWidth,
            tileHeight,
            groutSpacing,
            pattern,
            {
                startX: backWallLayout.startX,
                startY: backWallLayout.startY,
                wrapFromLeft: true,
                referenceWidth: walls[0].width
            }
        );

        totalTiles += leftWallLayout.totalTiles;
        totalFullTiles += leftWallLayout.fullTiles;
        totalCutTiles += leftWallLayout.cutTiles;

        this.renderWallLayout(results, walls[1], leftWallLayout, tileWidth, tileHeight, groutSpacing, 1);

        // Calculate right wall (wraps from right edge of back wall)
        const rightWallLayout = this.calculateTileLayout(
            walls[2].width,
            walls[2].height,
            tileWidth,
            tileHeight,
            groutSpacing,
            pattern,
            {
                startX: backWallLayout.startX,
                startY: backWallLayout.startY,
                wrapFromRight: true,
                referenceWidth: walls[0].width
            }
        );

        totalTiles += rightWallLayout.totalTiles;
        totalFullTiles += rightWallLayout.fullTiles;
        totalCutTiles += rightWallLayout.cutTiles;

        this.renderWallLayout(results, walls[2], rightWallLayout, tileWidth, tileHeight, groutSpacing, 2);

        // Add summary
        const summaryDiv = document.createElement('div');
        summaryDiv.className = 'summary';
        summaryDiv.innerHTML = `
            <h3>Overall Summary</h3>
            <p><strong>Total Tiles Needed:</strong> ${totalTiles}</p>
            <p><strong>Full Tiles:</strong> ${totalFullTiles}</p>
            <p><strong>Cut Tiles:</strong> ${totalCutTiles}</p>
            <p><strong>Recommended Purchase:</strong> ${Math.ceil(totalTiles * 1.10)} tiles (includes 10% waste)</p>
            <p><strong>Tile Size:</strong> ${this.toFractionalInches(tileWidth)} × ${this.toFractionalInches(tileHeight)}</p>
            <p><strong>Grout Spacing:</strong> ${this.toFractionalInches(groutSpacing)}</p>
        `;
        results.insertBefore(summaryDiv, results.firstChild);
    }

    getPatternName(pattern) {
        const patterns = {
            'brick-50': 'Brick/Running Bond (50% offset) - Most Common Professional Pattern',
            'brick-33': '1/3 Offset Pattern - Modern Look',
            'straight': 'Straight Stack - Clean Linear Look'
        };
        return patterns[pattern] || pattern;
    }

    formatFraction(decimal) {
        const fractions = {
            0.0625: '1/16"',
            0.125: '1/8"',
            0.1875: '3/16"',
            0.25: '1/4"',
            0.3125: '5/16"',
            0.375: '3/8"'
        };
        return fractions[decimal] || decimal + '"';
    }

    toFractionalInches(decimalInches) {
        // Round to nearest 1/8"
        const eighths = Math.round(decimalInches * 8);
        const wholeInches = Math.floor(eighths / 8);
        const remainderEighths = eighths % 8;

        // Simplify the fraction
        let numerator = remainderEighths;
        let denominator = 8;

        if (numerator === 0) {
            return wholeInches + '"';
        }

        // Simplify fraction
        if (numerator % 4 === 0) {
            numerator /= 4;
            denominator /= 4;
        } else if (numerator % 2 === 0) {
            numerator /= 2;
            denominator /= 2;
        }

        const fractionPart = numerator + '/' + denominator;

        if (wholeInches === 0) {
            return fractionPart + '"';
        } else {
            return wholeInches + ' ' + fractionPart + '"';
        }
    }

    calculateTileLayout(wallWidth, wallHeight, tileWidth, tileHeight, groutSpacing, pattern, wrapInfo) {
        // Account for grout spacing in tile placement
        const tileWithGrout = {
            width: tileWidth + groutSpacing,
            height: tileHeight + groutSpacing
        };

        let startX, startY;

        if (!wrapInfo) {
            // Back wall - center the layout to minimize edge cuts
            const tilesHorizontal = Math.ceil(wallWidth / tileWithGrout.width);
            const tilesVertical = Math.ceil(wallHeight / tileWithGrout.height);
            const totalLayoutWidth = tilesHorizontal * tileWithGrout.width - groutSpacing;
            const totalLayoutHeight = tilesVertical * tileWithGrout.height - groutSpacing;
            startX = (totalLayoutWidth - wallWidth) / 2;
            startY = (totalLayoutHeight - wallHeight) / 2;
        } else {
            // Side walls - use the same vertical offset as back wall
            startY = wrapInfo.startY;

            if (wrapInfo.wrapFromLeft) {
                // Left wall wraps from the left edge of the back wall
                // The left wall's right edge should align with the back wall's left edge
                // In tile grid coordinates: leftWallRight = backWallLeft
                // backWallLeft is at tileGridX = wrapInfo.startX
                // leftWallRight is at wall-local x = wallWidth
                // Formula: tileGridX = wallLocalX + startX
                // So: wrapInfo.startX = wallWidth + startX_left
                startX = wrapInfo.startX - wallWidth;
            } else if (wrapInfo.wrapFromRight) {
                // Right wall wraps from the right edge of the back wall
                // The right wall's left edge should align with the back wall's right edge
                // backWallRight is at tileGridX = wrapInfo.startX + wrapInfo.referenceWidth
                // rightWallLeft is at wall-local x = 0
                // So: wrapInfo.startX + wrapInfo.referenceWidth = 0 + startX_right
                startX = wrapInfo.startX + wrapInfo.referenceWidth;
            }
        }

        // Calculate how many tiles we need (with extra buffer for wrapped walls)
        const tilesHorizontal = Math.ceil((wallWidth + Math.abs(startX)) / tileWithGrout.width) + 3;
        const tilesVertical = Math.ceil((wallHeight + Math.abs(startY)) / tileWithGrout.height) + 3;

        // Generate tile grid
        const tiles = [];
        let fullTiles = 0;
        let cutTiles = 0;

        for (let row = -2; row < tilesVertical; row++) {
            for (let col = -2; col < tilesHorizontal; col++) {
                let offsetX = 0;

                // Apply pattern offset
                if (pattern === 'brick-50' && row % 2 === 1) {
                    offsetX = tileWithGrout.width / 2;
                } else if (pattern === 'brick-33' && row % 3 !== 0) {
                    offsetX = (tileWithGrout.width / 3) * (row % 3);
                }

                const x = col * tileWithGrout.width + offsetX - startX;
                const y = row * tileWithGrout.height - startY;

                // Calculate actual tile dimensions (accounting for wall boundaries)
                const tileRight = x + tileWidth;
                const tileBottom = y + tileHeight;

                // Skip tiles that are completely outside the wall
                if (x >= wallWidth || y >= wallHeight || tileRight <= 0 || tileBottom <= 0) {
                    continue;
                }

                // Calculate visible portion of tile
                const visibleLeft = Math.max(0, x);
                const visibleTop = Math.max(0, y);
                const visibleRight = Math.min(wallWidth, tileRight);
                const visibleBottom = Math.min(wallHeight, tileBottom);

                const visibleWidth = visibleRight - visibleLeft;
                const visibleHeight = visibleBottom - visibleTop;

                // Determine if tile needs cutting
                const cutLeft = x < 0;
                const cutRight = tileRight > wallWidth;
                const cutTop = y < 0;
                const cutBottom = tileBottom > wallHeight;
                const isCut = cutLeft || cutRight || cutTop || cutBottom;

                if (isCut) {
                    cutTiles++;
                } else {
                    fullTiles++;
                }

                tiles.push({
                    x: visibleLeft,
                    y: visibleTop,
                    width: visibleWidth,
                    height: visibleHeight,
                    fullWidth: tileWidth,
                    fullHeight: tileHeight,
                    isCut,
                    cutInfo: {
                        left: cutLeft ? Math.abs(x) : 0,
                        right: cutRight ? (tileRight - wallWidth) : 0,
                        top: cutTop ? Math.abs(y) : 0,
                        bottom: cutBottom ? (tileBottom - wallHeight) : 0
                    },
                    row,
                    col
                });
            }
        }

        return {
            tiles,
            tilesHorizontal,
            tilesVertical,
            totalTiles: tiles.length,
            fullTiles,
            cutTiles,
            wallWidth,
            wallHeight,
            startX,
            startY
        };
    }

    renderWallLayout(container, wall, layout, tileWidth, tileHeight, groutSpacing, wallIndex) {
        const wallDiv = document.createElement('div');
        wallDiv.className = 'wall-detail';

        // Sort tiles from bottom to top, left to right for proper numbering
        // Higher y values = closer to bottom, so sort descending by y, then ascending by x
        const sortedTiles = [...layout.tiles].sort((a, b) => {
            // First sort by row (bottom to top = higher y first)
            if (Math.abs(a.y - b.y) > 0.01) {
                return b.y - a.y; // Descending y (bottom first)
            }
            // Then sort by column (left to right)
            return a.x - b.x; // Ascending x (left first)
        });

        // Check if using ledger board
        const useLedgerBoard = document.getElementById('useLedgerBoard')?.checked || false;

        // Assign installation numbers
        if (useLedgerBoard && sortedTiles.length > 0) {
            // Find the bottom row y-value
            const bottomRowY = sortedTiles[0].y;

            // Separate bottom row from rest
            const bottomRowTiles = sortedTiles.filter(t => Math.abs(t.y - bottomRowY) < 0.01);
            const upperTiles = sortedTiles.filter(t => Math.abs(t.y - bottomRowY) >= 0.01);

            // Number upper tiles starting from 1
            upperTiles.forEach((tile, idx) => {
                tile.installNumber = idx + 1;
            });

            // Number bottom row tiles (installed last) with L prefix
            bottomRowTiles.forEach((tile, idx) => {
                tile.installNumber = 'L' + (idx + 1);
            });
        } else {
            sortedTiles.forEach((tile, idx) => {
                tile.installNumber = idx + 1;
            });
        }

        const cutTilesList = sortedTiles
            .filter(t => t.isCut)
            .map((t) => {
                const cuts = [];
                if (t.cutInfo.left > 0) cuts.push(`left: ${this.toFractionalInches(t.cutInfo.left)}`);
                if (t.cutInfo.right > 0) cuts.push(`right: ${this.toFractionalInches(t.cutInfo.right)}`);
                if (t.cutInfo.top > 0) cuts.push(`top: ${this.toFractionalInches(t.cutInfo.top)}`);
                if (t.cutInfo.bottom > 0) cuts.push(`bottom: ${this.toFractionalInches(t.cutInfo.bottom)}`);
                return `Tile #${t.installNumber}: ${this.toFractionalInches(t.width)} × ${this.toFractionalInches(t.height)} (cut ${cuts.join(', ')})`;
            });

        const ledgerNote = useLedgerBoard ?
            '<p style="font-style: italic; color: #666; margin-top: 8px;">Note: Tiles marked "L" are bottom row tiles installed after ledger board removal.</p>' : '';

        wallDiv.innerHTML = `
            <h3>${wall.name}</h3>
            <div class="wall-info">
                <p><strong>Dimensions:</strong> ${this.toFractionalInches(wall.width)} × ${this.toFractionalInches(wall.height)}</p>
                <p><strong>Total Tiles:</strong> ${layout.totalTiles} (${layout.fullTiles} full, ${layout.cutTiles} cut)</p>
                ${ledgerNote}
            </div>
            <div class="tile-grid" id="wall-grid-${wallIndex}"></div>
            ${cutTilesList.length > 0 ? `
                <div class="cuts">
                    <strong>Cut Tiles (${cutTilesList.length}):</strong>
                    <ul>
                        ${cutTilesList.map(c => `<li>${c}</li>`).join('')}
                    </ul>
                </div>
            ` : '<div class="pattern-info">No cuts needed - all full tiles!</div>'}
        `;

        container.appendChild(wallDiv);

        // Render the visual tile grid
        this.renderTileGrid(`wall-grid-${wallIndex}`, layout, groutSpacing);
    }

    renderTileGrid(containerId, layout, groutSpacing) {
        const container = document.getElementById(containerId);
        if (!container) return;

        // Calculate scale to fit nicely
        const maxWidth = 600;
        const maxHeight = 500;

        const scaleX = maxWidth / layout.wallWidth;
        const scaleY = maxHeight / layout.wallHeight;
        const scale = Math.min(scaleX, scaleY, 2); // Cap at 2x to prevent tiny tiles from being too large

        const svgWidth = layout.wallWidth * scale + 100;
        const svgHeight = layout.wallHeight * scale + 100;

        // Create SVG
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('width', svgWidth);
        svg.setAttribute('height', svgHeight);
        svg.setAttribute('viewBox', `0 0 ${svgWidth} ${svgHeight}`);

        const offsetX = 50;
        const offsetY = 50;

        // Draw wall boundary
        const wallRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        wallRect.setAttribute('x', offsetX);
        wallRect.setAttribute('y', offsetY);
        wallRect.setAttribute('width', layout.wallWidth * scale);
        wallRect.setAttribute('height', layout.wallHeight * scale);
        wallRect.setAttribute('fill', 'none');
        wallRect.setAttribute('stroke', '#333');
        wallRect.setAttribute('stroke-width', '2');
        svg.appendChild(wallRect);

        // Draw each tile
        layout.tiles.forEach((tile) => {
            const tileRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
            tileRect.setAttribute('x', offsetX + tile.x * scale);
            tileRect.setAttribute('y', offsetY + tile.y * scale);
            tileRect.setAttribute('width', tile.width * scale);
            tileRect.setAttribute('height', tile.height * scale);
            tileRect.setAttribute('class', tile.isCut ? 'tile tile-cut' : 'tile tile-full');
            tileRect.setAttribute('stroke', '#666');
            tileRect.setAttribute('stroke-width', groutSpacing * scale * 2);

            svg.appendChild(tileRect);

            // Add tile number for small grids (use installNumber if available)
            if (layout.totalTiles <= 100 && tile.width * scale > 20 && tile.height * scale > 20) {
                const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
                text.setAttribute('x', offsetX + tile.x * scale + (tile.width * scale) / 2);
                text.setAttribute('y', offsetY + tile.y * scale + (tile.height * scale) / 2);
                text.setAttribute('text-anchor', 'middle');
                text.setAttribute('dominant-baseline', 'middle');
                text.setAttribute('font-size', Math.min(10, tile.height * scale / 3));
                text.setAttribute('fill', '#333');
                text.setAttribute('font-weight', 'bold');
                text.textContent = tile.installNumber || '?';
                svg.appendChild(text);
            }
        });

        // Add dimension labels
        this.addDimensionLabels(svg, offsetX, offsetY, layout.wallWidth * scale, layout.wallHeight * scale, layout.wallWidth, layout.wallHeight);

        // Add legend
        this.addLegend(svg, svgWidth, svgHeight);

        container.appendChild(svg);
    }

    addDimensionLabels(svg, offsetX, offsetY, displayWidth, displayHeight, actualWidth, actualHeight) {
        // Top dimension
        const topLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        topLine.setAttribute('x1', offsetX);
        topLine.setAttribute('y1', offsetY - 20);
        topLine.setAttribute('x2', offsetX + displayWidth);
        topLine.setAttribute('y2', offsetY - 20);
        topLine.setAttribute('stroke', '#666');
        topLine.setAttribute('stroke-width', '1');
        topLine.setAttribute('marker-start', 'url(#arrowstart)');
        topLine.setAttribute('marker-end', 'url(#arrowend)');
        svg.appendChild(topLine);

        const topText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        topText.setAttribute('x', offsetX + displayWidth / 2);
        topText.setAttribute('y', offsetY - 25);
        topText.setAttribute('text-anchor', 'middle');
        topText.setAttribute('font-size', '12');
        topText.setAttribute('fill', '#333');
        topText.textContent = this.toFractionalInches(actualWidth);
        svg.appendChild(topText);

        // Left dimension
        const leftLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        leftLine.setAttribute('x1', offsetX - 20);
        leftLine.setAttribute('y1', offsetY);
        leftLine.setAttribute('x2', offsetX - 20);
        leftLine.setAttribute('y2', offsetY + displayHeight);
        leftLine.setAttribute('stroke', '#666');
        leftLine.setAttribute('stroke-width', '1');
        svg.appendChild(leftLine);

        const leftText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        leftText.setAttribute('x', offsetX - 25);
        leftText.setAttribute('y', offsetY + displayHeight / 2);
        leftText.setAttribute('text-anchor', 'middle');
        leftText.setAttribute('font-size', '12');
        leftText.setAttribute('fill', '#333');
        leftText.setAttribute('transform', `rotate(-90, ${offsetX - 25}, ${offsetY + displayHeight / 2})`);
        leftText.textContent = this.toFractionalInches(actualHeight);
        svg.appendChild(leftText);
    }

    addLegend(svg, svgWidth, svgHeight) {
        const legendY = svgHeight - 50;
        const legendX = 10;

        // Full tile
        const fullRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        fullRect.setAttribute('x', legendX);
        fullRect.setAttribute('y', legendY);
        fullRect.setAttribute('width', 20);
        fullRect.setAttribute('height', 15);
        fullRect.setAttribute('class', 'tile tile-full');
        svg.appendChild(fullRect);

        const fullText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        fullText.setAttribute('x', legendX + 25);
        fullText.setAttribute('y', legendY + 11);
        fullText.setAttribute('font-size', '11');
        fullText.setAttribute('fill', '#333');
        fullText.textContent = 'Full Tile';
        svg.appendChild(fullText);

        // Cut tile
        const cutRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        cutRect.setAttribute('x', legendX + 90);
        cutRect.setAttribute('y', legendY);
        cutRect.setAttribute('width', 20);
        cutRect.setAttribute('height', 15);
        cutRect.setAttribute('class', 'tile tile-cut');
        svg.appendChild(cutRect);

        const cutText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        cutText.setAttribute('x', legendX + 115);
        cutText.setAttribute('y', legendY + 11);
        cutText.setAttribute('font-size', '11');
        cutText.setAttribute('fill', '#333');
        cutText.textContent = 'Cut Tile';
        svg.appendChild(cutText);
    }

    showError(message) {
        const results = document.getElementById('results');
        results.innerHTML = `<div class="error">${message}</div>`;
    }
}

// Initialize when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new TileLayoutVisualizer();
});
