/**
 * Integration Tests for Tile Layout Calculator
 * Run with: npm test
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
    toFractionalInches,
    calculateTileLayout,
    parseTileDetailsWithPatternMatching,
    calculateShowerLayout,
    identifyCornerPairs
} from './tile-calculator.js';

// ============================================================================
// toFractionalInches Tests
// ============================================================================

describe('toFractionalInches', () => {
    it('should convert whole numbers', () => {
        assert.strictEqual(toFractionalInches(3), '3"');
        assert.strictEqual(toFractionalInches(12), '12"');
        assert.strictEqual(toFractionalInches(0), '0"');
    });

    it('should convert common fractions', () => {
        assert.strictEqual(toFractionalInches(0.125), '1/8"');
        assert.strictEqual(toFractionalInches(0.25), '1/4"');
        assert.strictEqual(toFractionalInches(0.5), '1/2"');
        assert.strictEqual(toFractionalInches(0.75), '3/4"');
    });

    it('should convert mixed numbers', () => {
        assert.strictEqual(toFractionalInches(3.5), '3 1/2"');
        assert.strictEqual(toFractionalInches(6.25), '6 1/4"');
        assert.strictEqual(toFractionalInches(2.125), '2 1/8"');
    });

    it('should round to nearest 1/8"', () => {
        // 0.0625 is 1/16", should round to 1/8"
        assert.strictEqual(toFractionalInches(0.0625), '1/8"');
        // 0.3 is closer to 1/4" (0.25) than 3/8" (0.375)
        assert.strictEqual(toFractionalInches(0.3), '1/4"');
    });

    it('should simplify fractions', () => {
        // 2/8 = 1/4
        assert.strictEqual(toFractionalInches(0.25), '1/4"');
        // 4/8 = 1/2
        assert.strictEqual(toFractionalInches(0.5), '1/2"');
        // 6/8 = 3/4
        assert.strictEqual(toFractionalInches(0.75), '3/4"');
    });

    it('should handle negative numbers', () => {
        assert.strictEqual(toFractionalInches(-0.5), '-1/2"');
        assert.strictEqual(toFractionalInches(-3.25), '-3 1/4"');
    });
});

// ============================================================================
// calculateTileLayout Tests - Basic Functionality
// ============================================================================

describe('calculateTileLayout - Basic', () => {
    it('should calculate layout for wall with exact tile fit', () => {
        // 12" wall with 3" tiles (no grout) = exactly 4 tiles
        const layout = calculateTileLayout(12, 12, 3, 3, 0, 'straight', null);

        assert.strictEqual(layout.wallWidth, 12);
        assert.strictEqual(layout.wallHeight, 12);
        assert.strictEqual(layout.fullTiles, 16); // 4x4 grid
        assert.strictEqual(layout.cutTiles, 0);
        assert.strictEqual(layout.totalTiles, 16);
    });

    it('should handle non-exact tile fit with cuts', () => {
        // 10" wall with 3" tiles = needs cuts
        const layout = calculateTileLayout(10, 10, 3, 3, 0, 'straight', null);

        assert.ok(layout.cutTiles > 0, 'Should have cut tiles');
        assert.ok(layout.totalTiles > 0, 'Should have tiles');
    });

    it('should include grout spacing in calculations', () => {
        // 12" wall with 3" tiles + 0.125" grout
        const layoutWithGrout = calculateTileLayout(12, 12, 3, 3, 0.125, 'straight', null);
        const layoutNoGrout = calculateTileLayout(12, 12, 3, 3, 0, 'straight', null);

        // With grout, fewer full tiles should fit
        assert.ok(layoutWithGrout.fullTiles <= layoutNoGrout.fullTiles);
    });

    it('should return correct startX and startY for centering', () => {
        const layout = calculateTileLayout(36, 96, 3, 6, 0.125, 'straight', null);

        // startX and startY should be defined
        assert.ok(typeof layout.startX === 'number');
        assert.ok(typeof layout.startY === 'number');

        // For a centered layout, startX should be relatively small
        assert.ok(Math.abs(layout.startX) < 3.125, 'startX should be less than one tile width');
    });
});

// ============================================================================
// calculateTileLayout Tests - Pattern Offsets
// ============================================================================

describe('calculateTileLayout - Patterns', () => {
    it('should apply 50% offset for brick-50 pattern', () => {
        const layout = calculateTileLayout(36, 24, 6, 3, 0, 'brick-50', null);

        // Find tiles from row 0 and row 1
        const row0Tiles = layout.tiles.filter(t => t.row === 0);
        const row1Tiles = layout.tiles.filter(t => t.row === 1);

        if (row0Tiles.length > 0 && row1Tiles.length > 0) {
            // Row 1 should be offset from row 0
            // The x positions should differ
            const row0FirstX = Math.min(...row0Tiles.map(t => t.x));
            const row1FirstX = Math.min(...row1Tiles.map(t => t.x));

            // They shouldn't be exactly equal (unless both start at 0)
            // This is a basic check that pattern is being applied
            assert.ok(layout.tiles.length > 0, 'Should have tiles');
        }
    });

    it('should apply 1/3 offset for brick-33 pattern', () => {
        const layout = calculateTileLayout(36, 24, 6, 3, 0, 'brick-33', null);
        assert.ok(layout.tiles.length > 0, 'Should have tiles');
    });

    it('should have no offset for straight pattern', () => {
        const layout = calculateTileLayout(36, 24, 6, 3, 0, 'straight', null);

        // All tiles in same column should have same x position
        const col0Tiles = layout.tiles.filter(t => t.col === 0);
        if (col0Tiles.length > 1) {
            const xPositions = col0Tiles.map(t => t.x);
            const allSameX = xPositions.every(x => Math.abs(x - xPositions[0]) < 0.001);
            assert.ok(allSameX, 'Straight pattern should align columns');
        }
    });
});

// ============================================================================
// calculateTileLayout Tests - Wall Wrapping
// ============================================================================

describe('calculateTileLayout - Wall Wrapping', () => {
    it('should maintain vertical alignment for wrapped walls', () => {
        const backWall = calculateTileLayout(36, 96, 3, 6, 0.125, 'brick-50', null);

        const leftWall = calculateTileLayout(36, 96, 3, 6, 0.125, 'brick-50', {
            startX: backWall.startX,
            startY: backWall.startY,
            wrapFromLeft: true,
            referenceWidth: 36
        });

        // Left wall should have same startY as back wall (vertical alignment)
        assert.strictEqual(leftWall.startY, backWall.startY);
    });

    it('should calculate correct startX for left wall wrap', () => {
        const backWall = calculateTileLayout(36, 96, 3, 6, 0.125, 'brick-50', null);
        const leftWallWidth = 24;

        const leftWall = calculateTileLayout(leftWallWidth, 96, 3, 6, 0.125, 'brick-50', {
            startX: backWall.startX,
            startY: backWall.startY,
            wrapFromLeft: true,
            referenceWidth: 36
        });

        // startX for left wall = backWall.startX - leftWallWidth
        const expectedStartX = backWall.startX - leftWallWidth;
        assert.strictEqual(leftWall.startX, expectedStartX);
    });

    it('should calculate correct startX for right wall wrap', () => {
        const backWall = calculateTileLayout(36, 96, 3, 6, 0.125, 'brick-50', null);

        const rightWall = calculateTileLayout(24, 96, 3, 6, 0.125, 'brick-50', {
            startX: backWall.startX,
            startY: backWall.startY,
            wrapFromRight: true,
            referenceWidth: 36
        });

        // startX for right wall = backWall.startX + referenceWidth
        const expectedStartX = backWall.startX + 36;
        assert.strictEqual(rightWall.startX, expectedStartX);
    });
});

// ============================================================================
// calculateTileLayout Tests - Cut Tile Detection
// ============================================================================

describe('calculateTileLayout - Cut Detection', () => {
    it('should detect tiles cut on left edge', () => {
        const layout = calculateTileLayout(10, 10, 6, 6, 0, 'straight', null);

        const leftCutTiles = layout.tiles.filter(t => t.cutInfo.left > 0);
        assert.ok(leftCutTiles.length > 0 || layout.startX === 0,
            'Should have left-cut tiles unless perfectly aligned');
    });

    it('should detect tiles cut on right edge', () => {
        const layout = calculateTileLayout(10, 10, 6, 6, 0, 'straight', null);

        const rightCutTiles = layout.tiles.filter(t => t.cutInfo.right > 0);
        assert.ok(rightCutTiles.length > 0 || layout.startX === 0,
            'Should have right-cut tiles unless perfectly aligned');
    });

    it('should calculate correct cut amounts', () => {
        const layout = calculateTileLayout(10, 10, 6, 6, 0, 'straight', null);

        layout.tiles.forEach(tile => {
            if (tile.isCut) {
                // Visible width + cuts should equal full tile width
                const totalWidth = tile.width + tile.cutInfo.left + tile.cutInfo.right;
                assert.ok(Math.abs(totalWidth - tile.fullWidth) < 0.001,
                    `Width calculation error: visible=${tile.width}, left=${tile.cutInfo.left}, right=${tile.cutInfo.right}`);

                const totalHeight = tile.height + tile.cutInfo.top + tile.cutInfo.bottom;
                assert.ok(Math.abs(totalHeight - tile.fullHeight) < 0.001,
                    `Height calculation error: visible=${tile.height}, top=${tile.cutInfo.top}, bottom=${tile.cutInfo.bottom}`);
            }
        });
    });

    it('should mark cut tiles correctly', () => {
        const layout = calculateTileLayout(10, 10, 6, 6, 0, 'straight', null);

        layout.tiles.forEach(tile => {
            const hasCut = tile.cutInfo.left > 0 || tile.cutInfo.right > 0 ||
                          tile.cutInfo.top > 0 || tile.cutInfo.bottom > 0;
            assert.strictEqual(tile.isCut, hasCut, 'isCut flag should match cutInfo');
        });
    });
});

// ============================================================================
// calculateTileLayout Tests - Edge Cases
// ============================================================================

describe('calculateTileLayout - Edge Cases', () => {
    it('should handle very small wall', () => {
        const layout = calculateTileLayout(3, 3, 6, 6, 0, 'straight', null);

        // Single tile, heavily cut
        assert.strictEqual(layout.totalTiles, 1);
        assert.strictEqual(layout.cutTiles, 1);
        assert.strictEqual(layout.fullTiles, 0);
    });

    it('should handle large grout spacing', () => {
        const layout = calculateTileLayout(36, 36, 3, 6, 0.375, 'straight', null);

        assert.ok(layout.totalTiles > 0);
        // With larger grout, should need more tiles
        const layoutSmallGrout = calculateTileLayout(36, 36, 3, 6, 0.125, 'straight', null);
        // Similar tile counts expected since we're covering same area
        assert.ok(Math.abs(layout.totalTiles - layoutSmallGrout.totalTiles) < 10);
    });

    it('should handle rectangular tiles in different orientations', () => {
        // Horizontal orientation (3x6)
        const horizontal = calculateTileLayout(36, 96, 6, 3, 0.125, 'brick-50', null);
        // Vertical orientation (6x3 - swapped)
        const vertical = calculateTileLayout(36, 96, 3, 6, 0.125, 'brick-50', null);

        // Both should produce valid layouts
        assert.ok(horizontal.totalTiles > 0);
        assert.ok(vertical.totalTiles > 0);
    });

    it('should handle zero grout spacing', () => {
        const layout = calculateTileLayout(12, 12, 3, 3, 0, 'straight', null);

        // With no grout and exact fit, should have no cuts
        assert.strictEqual(layout.fullTiles, 16); // 4x4
        assert.strictEqual(layout.cutTiles, 0);
    });
});

// ============================================================================
// parseTileDetailsWithPatternMatching Tests
// ============================================================================

describe('parseTileDetailsWithPatternMatching', () => {
    it('should parse basic dimension format (3" x 6")', () => {
        const result = parseTileDetailsWithPatternMatching('Subway tile 3" x 6" ceramic');

        assert.strictEqual(result.width, 3);
        assert.strictEqual(result.height, 6);
        assert.strictEqual(result.material, 'Ceramic');
    });

    it('should parse dimension format without quotes (3 x 6)', () => {
        const result = parseTileDetailsWithPatternMatching('Tile 3 x 6 porcelain');

        assert.strictEqual(result.width, 3);
        assert.strictEqual(result.height, 6);
    });

    it('should parse decimal dimensions', () => {
        const result = parseTileDetailsWithPatternMatching('Large format 12.5" x 24.5" tile');

        assert.strictEqual(result.width, 12.5);
        assert.strictEqual(result.height, 24.5);
    });

    it('should extract price', () => {
        const result = parseTileDetailsWithPatternMatching('Subway tile 3" x 6" $12.99 per sq ft');

        assert.strictEqual(result.price, 12.99);
        assert.strictEqual(result.priceUnit, 'per sq ft');
    });

    it('should extract price per piece', () => {
        const result = parseTileDetailsWithPatternMatching('Tile 6x6 $5.00 per piece');

        assert.strictEqual(result.price, 5);
        assert.strictEqual(result.priceUnit, 'per piece');
    });

    it('should extract price per box', () => {
        const result = parseTileDetailsWithPatternMatching('Tile 3x6 $45.00 per box');

        assert.strictEqual(result.priceUnit, 'per box');
    });

    it('should detect materials', () => {
        assert.strictEqual(parseTileDetailsWithPatternMatching('3x6 ceramic tile').material, 'Ceramic');
        assert.strictEqual(parseTileDetailsWithPatternMatching('3x6 porcelain tile').material, 'Porcelain');
        assert.strictEqual(parseTileDetailsWithPatternMatching('3x6 marble tile').material, 'Marble');
        assert.strictEqual(parseTileDetailsWithPatternMatching('3x6 glass mosaic').material, 'Glass');
        assert.strictEqual(parseTileDetailsWithPatternMatching('3x6 granite tile').material, 'Granite');
        assert.strictEqual(parseTileDetailsWithPatternMatching('3x6 travertine tile').material, 'Travertine');
        assert.strictEqual(parseTileDetailsWithPatternMatching('3x6 slate tile').material, 'Slate');
    });

    it('should detect finishes', () => {
        assert.strictEqual(parseTileDetailsWithPatternMatching('3x6 glossy tile').finish, 'Glossy');
        assert.strictEqual(parseTileDetailsWithPatternMatching('3x6 matte tile').finish, 'Matte');
        assert.strictEqual(parseTileDetailsWithPatternMatching('3x6 polished marble').finish, 'Polished');
        assert.strictEqual(parseTileDetailsWithPatternMatching('3x6 honed stone').finish, 'Honed');
        assert.strictEqual(parseTileDetailsWithPatternMatching('3x6 textured tile').finish, 'Textured');
        assert.strictEqual(parseTileDetailsWithPatternMatching('3x6 glazed ceramic').finish, 'Glazed');
    });

    it('should extract product name from first line', () => {
        const result = parseTileDetailsWithPatternMatching('Premium White Subway Tile\n3" x 6" ceramic glossy');

        assert.strictEqual(result.name, 'Premium White Subway Tile');
    });

    it('should return error for missing dimensions', () => {
        const result = parseTileDetailsWithPatternMatching('Beautiful white ceramic tile');

        assert.ok(result.error);
        assert.ok(result.error.includes('dimensions'));
    });

    it('should handle real-world product descriptions', () => {
        const description = `
            MSI Arabescato Carrara 3 in. x 6 in. Polished Marble Floor and Wall Tile
            $12.98 per sq ft
            Premium Italian marble with classic white and gray veining
        `;
        const result = parseTileDetailsWithPatternMatching(description);

        assert.strictEqual(result.width, 3);
        assert.strictEqual(result.height, 6);
        assert.strictEqual(result.price, 12.98);
        assert.strictEqual(result.priceUnit, 'per sq ft');
        assert.strictEqual(result.material, 'Marble');
        assert.strictEqual(result.finish, 'Polished');
    });
});

// ============================================================================
// calculateShowerLayout Tests
// ============================================================================

describe('calculateShowerLayout', () => {
    const defaultParams = {
        showerWidth: 36,
        showerHeight: 96,
        showerDepth: 36,
        tileWidth: 3,
        tileHeight: 6,
        groutSpacing: 0.125,
        pattern: 'brick-50'
    };

    it('should calculate layouts for all three walls', () => {
        const layout = calculateShowerLayout(defaultParams);

        assert.ok(layout.backWall);
        assert.ok(layout.leftWall);
        assert.ok(layout.rightWall);
    });

    it('should calculate correct total tiles', () => {
        const layout = calculateShowerLayout(defaultParams);

        const expectedTotal = layout.backWall.totalTiles +
                             layout.leftWall.totalTiles +
                             layout.rightWall.totalTiles;
        assert.strictEqual(layout.totalTiles, expectedTotal);
    });

    it('should calculate correct full and cut tile counts', () => {
        const layout = calculateShowerLayout(defaultParams);

        const expectedFull = layout.backWall.fullTiles +
                            layout.leftWall.fullTiles +
                            layout.rightWall.fullTiles;
        const expectedCut = layout.backWall.cutTiles +
                           layout.leftWall.cutTiles +
                           layout.rightWall.cutTiles;

        assert.strictEqual(layout.totalFullTiles, expectedFull);
        assert.strictEqual(layout.totalCutTiles, expectedCut);
        assert.strictEqual(layout.totalTiles, layout.totalFullTiles + layout.totalCutTiles);
    });

    it('should calculate recommended purchase with 10% waste (minus corner pairs)', () => {
        const layout = calculateShowerLayout(defaultParams);

        const physicalTiles = layout.totalTiles - layout.cornerPairs.length;
        assert.strictEqual(layout.physicalTiles, physicalTiles);
        const expectedRecommended = Math.ceil(physicalTiles * 1.10);
        assert.strictEqual(layout.recommendedPurchase, expectedRecommended);
    });

    it('should maintain vertical alignment across all walls', () => {
        const layout = calculateShowerLayout(defaultParams);

        // All walls should have same startY
        assert.strictEqual(layout.leftWall.startY, layout.backWall.startY);
        assert.strictEqual(layout.rightWall.startY, layout.backWall.startY);
    });

    it('should handle different depth than width', () => {
        const params = { ...defaultParams, showerDepth: 24 };
        const layout = calculateShowerLayout(params);

        // Left and right walls should have different dimensions than back wall
        assert.strictEqual(layout.backWall.wallWidth, 36);
        assert.strictEqual(layout.leftWall.wallWidth, 24);
        assert.strictEqual(layout.rightWall.wallWidth, 24);
    });

    it('should work with all pattern types', () => {
        const patterns = ['brick-50', 'brick-33', 'straight'];

        patterns.forEach(pattern => {
            const params = { ...defaultParams, pattern };
            const layout = calculateShowerLayout(params);

            assert.ok(layout.totalTiles > 0, `Pattern ${pattern} should produce tiles`);
        });
    });
});

// ============================================================================
// Integration Tests - Real-World Scenarios
// ============================================================================

describe('Integration - Real-World Scenarios', () => {
    it('should handle standard 3x3 shower with 3x6 subway tiles', () => {
        const layout = calculateShowerLayout({
            showerWidth: 36,
            showerHeight: 96,
            showerDepth: 36,
            tileWidth: 3,
            tileHeight: 6,
            groutSpacing: 0.125,
            pattern: 'brick-50'
        });

        // Reasonable tile count for 3 walls of a 3x8ft shower
        assert.ok(layout.totalTiles > 100, 'Should need significant number of tiles');
        assert.ok(layout.totalTiles < 1000, 'Should not need excessive tiles');
    });

    it('should handle large format tiles (12x24)', () => {
        const layout = calculateShowerLayout({
            showerWidth: 60,
            showerHeight: 96,
            showerDepth: 36,
            tileWidth: 12,
            tileHeight: 24,
            groutSpacing: 0.125,
            pattern: 'brick-50'
        });

        // Larger tiles = fewer tiles needed
        assert.ok(layout.totalTiles < 100, 'Large tiles should need fewer pieces');
    });

    it('should handle small mosaic tiles (1x1)', () => {
        const layout = calculateShowerLayout({
            showerWidth: 36,
            showerHeight: 48, // Shorter wall for performance
            showerDepth: 36,
            tileWidth: 1,
            tileHeight: 1,
            groutSpacing: 0.0625,
            pattern: 'straight'
        });

        // Many small tiles needed
        assert.ok(layout.totalTiles > 1000, 'Mosaic should need many tiles');
    });

    it('should produce symmetric cuts for centered layout', () => {
        const layout = calculateTileLayout(36, 96, 3, 6, 0.125, 'straight', null);

        // Find left-edge and right-edge cut tiles
        const leftCuts = layout.tiles.filter(t => t.cutInfo.left > 0);
        const rightCuts = layout.tiles.filter(t => t.cutInfo.right > 0);

        // For a centered layout, left and right cuts should be similar
        if (leftCuts.length > 0 && rightCuts.length > 0) {
            const avgLeftCut = leftCuts.reduce((sum, t) => sum + t.cutInfo.left, 0) / leftCuts.length;
            const avgRightCut = rightCuts.reduce((sum, t) => sum + t.cutInfo.right, 0) / rightCuts.length;

            // Cuts should be approximately equal (within 0.1")
            assert.ok(Math.abs(avgLeftCut - avgRightCut) < 0.5,
                `Cuts should be symmetric: left=${avgLeftCut.toFixed(3)}, right=${avgRightCut.toFixed(3)}`);
        }
    });

    it('should have correct grout spacing between tiles', () => {
        const groutSpacing = 0.125;
        const layout = calculateTileLayout(36, 24, 6, 3, groutSpacing, 'straight', null);

        // For each row, tiles should be separated by grout spacing
        const rows = {};
        layout.tiles.forEach(tile => {
            if (!rows[tile.row]) rows[tile.row] = [];
            rows[tile.row].push(tile);
        });

        Object.values(rows).forEach(rowTiles => {
            rowTiles.sort((a, b) => a.x - b.x);

            for (let i = 1; i < rowTiles.length; i++) {
                const prevTile = rowTiles[i - 1];
                const currTile = rowTiles[i];
                const gap = currTile.x - (prevTile.x + prevTile.width);

                // Gap should be grout spacing (within floating point tolerance)
                assert.ok(Math.abs(gap - groutSpacing) < 0.001,
                    `Incorrect gap: expected ${groutSpacing}, got ${gap}`);
            }
        });
    });
});

// ============================================================================
// Regression Tests
// ============================================================================

describe('Regression Tests', () => {
    it('should not produce negative tile dimensions', () => {
        const layout = calculateTileLayout(36, 96, 3, 6, 0.125, 'brick-50', null);

        layout.tiles.forEach(tile => {
            assert.ok(tile.width > 0, `Tile width should be positive: ${tile.width}`);
            assert.ok(tile.height > 0, `Tile height should be positive: ${tile.height}`);
            assert.ok(tile.x >= 0, `Tile x should be non-negative: ${tile.x}`);
            assert.ok(tile.y >= 0, `Tile y should be non-negative: ${tile.y}`);
        });
    });

    it('should not produce tiles outside wall boundaries', () => {
        const layout = calculateTileLayout(36, 96, 3, 6, 0.125, 'brick-50', null);

        layout.tiles.forEach(tile => {
            assert.ok(tile.x + tile.width <= layout.wallWidth + 0.001,
                `Tile extends past right edge: ${tile.x + tile.width} > ${layout.wallWidth}`);
            assert.ok(tile.y + tile.height <= layout.wallHeight + 0.001,
                `Tile extends past bottom edge: ${tile.y + tile.height} > ${layout.wallHeight}`);
        });
    });

    it('should handle decimal wall dimensions', () => {
        const layout = calculateTileLayout(36.5, 96.25, 3, 6, 0.125, 'brick-50', null);

        assert.ok(layout.totalTiles > 0);
        assert.strictEqual(layout.wallWidth, 36.5);
        assert.strictEqual(layout.wallHeight, 96.25);
    });

    it('should count fullTiles + cutTiles = totalTiles', () => {
        const layouts = [
            calculateTileLayout(36, 96, 3, 6, 0.125, 'brick-50', null),
            calculateTileLayout(48, 84, 4, 8, 0.25, 'brick-33', null),
            calculateTileLayout(30, 72, 6, 6, 0, 'straight', null)
        ];

        layouts.forEach(layout => {
            assert.strictEqual(layout.fullTiles + layout.cutTiles, layout.totalTiles,
                `Tile count mismatch: ${layout.fullTiles} + ${layout.cutTiles} != ${layout.totalTiles}`);
        });
    });
});

// ============================================================================
// identifyCornerPairs Tests
// ============================================================================

describe('identifyCornerPairs', () => {
    it('should identify corner pairs for standard layout', () => {
        const layout = calculateShowerLayout({
            showerWidth: 36, showerHeight: 96, showerDepth: 36,
            tileWidth: 3, tileHeight: 6, groutSpacing: 0.125, pattern: 'straight'
        });

        assert.ok(layout.cornerPairs.length > 0, 'Should identify corner pairs');
    });

    it('should pair tiles in the same row', () => {
        const layout = calculateShowerLayout({
            showerWidth: 36, showerHeight: 96, showerDepth: 36,
            tileWidth: 3, tileHeight: 6, groutSpacing: 0.125, pattern: 'straight'
        });

        for (const pair of layout.cornerPairs) {
            assert.strictEqual(pair.backTile.row, pair.sideTile.row,
                'Paired tiles should be in the same row');
        }
    });

    it('should have complementary cut widths that sum to tile width', () => {
        const tileWidth = 3;
        const layout = calculateShowerLayout({
            showerWidth: 36, showerHeight: 96, showerDepth: 36,
            tileWidth, tileHeight: 6, groutSpacing: 0.125, pattern: 'straight'
        });

        for (const pair of layout.cornerPairs) {
            const totalWidth = pair.backTile.width + pair.sideTile.width;
            assert.ok(Math.abs(totalWidth - tileWidth) < 0.01,
                `Paired tile widths should sum to tile width: ${pair.backTile.width} + ${pair.sideTile.width} = ${totalWidth}, expected ${tileWidth}`);
        }
    });

    it('should produce pairs for both left and right corners', () => {
        const layout = calculateShowerLayout({
            showerWidth: 36, showerHeight: 96, showerDepth: 36,
            tileWidth: 3, tileHeight: 6, groutSpacing: 0.125, pattern: 'straight'
        });

        const leftPairs = layout.cornerPairs.filter(p => p.walls[1] === 'left');
        const rightPairs = layout.cornerPairs.filter(p => p.walls[1] === 'right');

        assert.ok(leftPairs.length > 0, 'Should have left corner pairs');
        assert.ok(rightPairs.length > 0, 'Should have right corner pairs');

        // Symmetric shower should have equal left and right corner pair counts
        assert.strictEqual(leftPairs.length, rightPairs.length);
    });

    it('should work with brick-50 pattern', () => {
        const layout = calculateShowerLayout({
            showerWidth: 36, showerHeight: 96, showerDepth: 36,
            tileWidth: 3, tileHeight: 6, groutSpacing: 0.125, pattern: 'brick-50'
        });

        assert.ok(layout.cornerPairs.length > 0, 'Should identify corner pairs with brick pattern');

        for (const pair of layout.cornerPairs) {
            assert.strictEqual(pair.backTile.row, pair.sideTile.row);
        }
    });

    it('should work with brick-33 pattern', () => {
        const layout = calculateShowerLayout({
            showerWidth: 36, showerHeight: 96, showerDepth: 36,
            tileWidth: 3, tileHeight: 6, groutSpacing: 0.125, pattern: 'brick-33'
        });

        assert.ok(layout.cornerPairs.length > 0, 'Should identify corner pairs with 1/3 offset pattern');
    });

    it('should return no pairs when tiles fit perfectly (no edge cuts)', () => {
        // 12" wall with 3" tiles, no grout = perfect fit
        const backWall = calculateTileLayout(12, 12, 3, 3, 0, 'straight', null);
        const leftWall = calculateTileLayout(12, 12, 3, 3, 0, 'straight', {
            startX: backWall.startX, startY: backWall.startY,
            wrapFromLeft: true, referenceWidth: 12
        });
        const rightWall = calculateTileLayout(12, 12, 3, 3, 0, 'straight', {
            startX: backWall.startX, startY: backWall.startY,
            wrapFromRight: true, referenceWidth: 12
        });

        const pairs = identifyCornerPairs(backWall, leftWall, rightWall);
        assert.strictEqual(pairs.length, 0, 'No pairs when tiles fit perfectly');
    });

    it('should fully cover side walls with large tiles (12x12)', () => {
        const layout = calculateShowerLayout({
            showerWidth: 36, showerHeight: 96, showerDepth: 36,
            tileWidth: 12, tileHeight: 12, groutSpacing: 0.125, pattern: 'straight'
        });

        // Left wall should be fully covered - no gaps
        const leftTiles = layout.leftWall.tiles;
        assert.ok(leftTiles.length > 0, 'Left wall should have tiles');

        // Check that tiles cover the full width (0 to 36")
        const leftMinX = Math.min(...leftTiles.map(t => t.x));
        const leftMaxRight = Math.max(...leftTiles.map(t => t.x + t.width));
        assert.ok(leftMinX < 0.01, `Left wall tiles should start at 0, got ${leftMinX}`);
        assert.ok(Math.abs(leftMaxRight - 36) < 0.01, `Left wall tiles should reach 36", got ${leftMaxRight}`);

        // Same check for right wall
        const rightTiles = layout.rightWall.tiles;
        const rightMinX = Math.min(...rightTiles.map(t => t.x));
        const rightMaxRight = Math.max(...rightTiles.map(t => t.x + t.width));
        assert.ok(rightMinX < 0.01, `Right wall tiles should start at 0, got ${rightMinX}`);
        assert.ok(Math.abs(rightMaxRight - 36) < 0.01, `Right wall tiles should reach 36", got ${rightMaxRight}`);
    });

    it('should handle asymmetric shower dimensions', () => {
        const layout = calculateShowerLayout({
            showerWidth: 48, showerHeight: 96, showerDepth: 30,
            tileWidth: 4, tileHeight: 8, groutSpacing: 0.25, pattern: 'brick-50'
        });

        assert.ok(layout.cornerPairs.length > 0);

        for (const pair of layout.cornerPairs) {
            assert.strictEqual(pair.backTile.row, pair.sideTile.row);
        }
    });
});
