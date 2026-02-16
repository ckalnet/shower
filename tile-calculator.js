/**
 * Tile Layout Calculator - Core calculation logic extracted for testing
 * This module can be used both in browser (via import) and Node.js (for testing)
 */

/**
 * Convert decimal inches to fractional notation (rounded to nearest 1/8")
 * @param {number} decimalInches - Value in decimal inches
 * @returns {string} Formatted string like '3 1/2"' or '1/8"'
 */
export function toFractionalInches(decimalInches) {
    if (decimalInches < 0) {
        return '-' + toFractionalInches(Math.abs(decimalInches));
    }

    const eighths = Math.round(decimalInches * 8);
    const wholeInches = Math.floor(eighths / 8);
    const remainderEighths = eighths % 8;

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

/**
 * Calculate tile layout for a single wall
 * @param {number} wallWidth - Wall width in inches
 * @param {number} wallHeight - Wall height in inches
 * @param {number} tileWidth - Tile width in inches
 * @param {number} tileHeight - Tile height in inches
 * @param {number} groutSpacing - Grout spacing in inches
 * @param {string} pattern - 'brick-50', 'brick-33', or 'straight'
 * @param {object|null} wrapInfo - Info for aligning with adjacent walls
 * @returns {object} Layout object with tiles array and metadata
 */
export function calculateTileLayout(wallWidth, wallHeight, tileWidth, tileHeight, groutSpacing, pattern, wrapInfo) {
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
            startX = wrapInfo.startX - wallWidth;
        } else if (wrapInfo.wrapFromRight) {
            // Right wall wraps from the right edge of the back wall
            startX = wrapInfo.startX + wrapInfo.referenceWidth;
        }
    }

    // Calculate tile grid range needed to cover the wall, accounting for wrap offsets
    const colStart = Math.floor(startX / tileWithGrout.width) - 2;
    const rowStart = Math.floor(startY / tileWithGrout.height) - 2;
    const colEnd = Math.ceil((wallWidth + Math.abs(startX)) / tileWithGrout.width) + 2;
    const rowEnd = Math.ceil((wallHeight + Math.abs(startY)) / tileWithGrout.height) + 2;
    const tilesHorizontal = colEnd - colStart + 1;
    const tilesVertical = rowEnd - rowStart + 1;

    // Generate tile grid
    const tiles = [];
    let fullTiles = 0;
    let cutTiles = 0;

    for (let row = rowStart; row <= rowEnd; row++) {
        for (let col = colStart; col <= colEnd; col++) {
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

/**
 * Parse tile details from text using pattern matching
 * @param {string} text - Product description text
 * @returns {object} Parsed tile data or error
 */
export function parseTileDetailsWithPatternMatching(text) {
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
        // "12 in. W x 24 in. L" or "12 in. W x 24 in. H" (Home Depot format with W/L/H suffixes)
        /(\d+(?:\.\d+)?)\s*(?:"|inch|in\.?)\s*[WLH]?\s*[xX×]\s*(\d+(?:\.\d+)?)\s*(?:"|inch|in\.?)\s*[WLH]?/i,
        // "12" x 24"" or "12 in. x 24 in."
        /(\d+(?:\.\d+)?)\s*(?:"|inch|in\.?)?\s*[xX×]\s*(\d+(?:\.\d+)?)\s*(?:"|inch|in\.?)?/,
        // "12 x 24"
        /(\d+(?:\.\d+)?)\s*[xX×]\s*(\d+(?:\.\d+)?)/,
        // "12-inch x 24-inch"
        /(\d+(?:\.\d+)?)-inch\s*[xX×]\s*(\d+(?:\.\d+)?)-inch/,
        // "Width: 12" and "Height: 24" or "Length: 24" on separate lines
        /(?:width|wide|w)\s*[:\s]\s*(\d+(?:\.\d+)?)\s*(?:"|inch|in\.?)?.*?(?:height|length|long|h|l)\s*[:\s]\s*(\d+(?:\.\d+)?)\s*(?:"|inch|in\.?)?/is,
        // "12in x 24in" (no space/period)
        /(\d+(?:\.\d+)?)in\s*[xX×]\s*(\d+(?:\.\d+)?)in/i
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

/**
 * Calculate layouts for all three walls of a shower
 * @param {object} params - Shower and tile parameters
 * @returns {object} Complete layout data for all walls
 */
export function calculateShowerLayout(params) {
    const {
        showerWidth,
        showerHeight,
        showerDepth,
        tileWidth,
        tileHeight,
        groutSpacing,
        pattern
    } = params;

    // Calculate back wall first (this is the reference wall)
    const backWallLayout = calculateTileLayout(
        showerWidth,
        showerHeight,
        tileWidth,
        tileHeight,
        groutSpacing,
        pattern,
        null
    );

    // Calculate left wall (wraps from left edge of back wall)
    const leftWallLayout = calculateTileLayout(
        showerDepth,
        showerHeight,
        tileWidth,
        tileHeight,
        groutSpacing,
        pattern,
        {
            startX: backWallLayout.startX,
            startY: backWallLayout.startY,
            wrapFromLeft: true,
            referenceWidth: showerWidth
        }
    );

    // Calculate right wall (wraps from right edge of back wall)
    const rightWallLayout = calculateTileLayout(
        showerDepth,
        showerHeight,
        tileWidth,
        tileHeight,
        groutSpacing,
        pattern,
        {
            startX: backWallLayout.startX,
            startY: backWallLayout.startY,
            wrapFromRight: true,
            referenceWidth: showerWidth
        }
    );

    const totalTiles = backWallLayout.totalTiles + leftWallLayout.totalTiles + rightWallLayout.totalTiles;
    const totalFullTiles = backWallLayout.fullTiles + leftWallLayout.fullTiles + rightWallLayout.fullTiles;
    const totalCutTiles = backWallLayout.cutTiles + leftWallLayout.cutTiles + rightWallLayout.cutTiles;

    const cornerPairs = identifyCornerPairs(backWallLayout, leftWallLayout, rightWallLayout);
    const physicalTiles = totalTiles - cornerPairs.length;

    return {
        backWall: backWallLayout,
        leftWall: leftWallLayout,
        rightWall: rightWallLayout,
        totalTiles,
        totalFullTiles,
        totalCutTiles,
        physicalTiles,
        recommendedPurchase: Math.ceil(physicalTiles * 1.10),
        cornerPairs
    };
}

/**
 * Identify tiles that span wall corners (same physical tile on two walls).
 * Due to wall wrapping, tiles at back wall edges and adjacent side wall edges
 * are the same physical tile — their visible widths sum to the full tile width.
 * @param {object} backWallLayout - Back wall layout from calculateTileLayout
 * @param {object} leftWallLayout - Left wall layout from calculateTileLayout
 * @param {object} rightWallLayout - Right wall layout from calculateTileLayout
 * @returns {Array} Array of { backTile, sideTile, walls } pairs
 */
export function identifyCornerPairs(backWallLayout, leftWallLayout, rightWallLayout) {
    const pairs = [];

    const backLeftByRow = new Map();
    const backRightByRow = new Map();

    for (const tile of backWallLayout.tiles) {
        if (tile.cutInfo.left > 0) {
            backLeftByRow.set(tile.row, tile);
        }
        if (tile.cutInfo.right > 0) {
            backRightByRow.set(tile.row, tile);
        }
    }

    // Left wall right-edge cuts pair with back wall left-edge cuts
    for (const tile of leftWallLayout.tiles) {
        if (tile.cutInfo.right > 0 && backLeftByRow.has(tile.row)) {
            pairs.push({
                backTile: backLeftByRow.get(tile.row),
                sideTile: tile,
                walls: ['back', 'left']
            });
        }
    }

    // Right wall left-edge cuts pair with back wall right-edge cuts
    for (const tile of rightWallLayout.tiles) {
        if (tile.cutInfo.left > 0 && backRightByRow.has(tile.row)) {
            pairs.push({
                backTile: backRightByRow.get(tile.row),
                sideTile: tile,
                walls: ['back', 'right']
            });
        }
    }

    return pairs;
}
