# Project Structure

## File Organization

```
/
├── index.html          # Main HTML page with input forms
├── script.js           # Application logic and tile calculations
├── styles.css          # All styling and visual design
```

## Code Organization

### script.js

- **TileLayoutVisualizer class** - Main application controller
  - `init()` - Setup and event binding
  - `bindEvents()` - Attach input listeners
  - `generate()` - Main calculation entry point
  - `calculateTileLayout()` - Core tile grid algorithm with pattern support
  - `renderWallLayout()` - Generate HTML output for each wall
  - `renderTileGrid()` - Create SVG visualizations
  - `toFractionalInches()` - Convert decimals to fractional display

### index.html

- Input sections for shower dimensions, tile settings, and pattern selection
- Results container dynamically populated by JavaScript
- Checkbox for ledger board installation mode

### styles.css

- Grid-based responsive layout
- Card-style sections with shadows
- SVG tile styling (full tiles vs cut tiles)
- Color-coded information boxes (info, warning, success)

## Key Conventions

- All measurements in inches (decimal internally, fractional for display)
- Tile numbering: bottom-to-top, left-to-right installation sequence
- Ledger board mode: bottom row tiles prefixed with "L"
- Wall wrapping: side walls align tile grids with back wall edges
- Grout spacing included in all calculations
