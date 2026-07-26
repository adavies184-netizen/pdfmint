PDFMINT v3.0.1 — CHARACTER-PRECISION TEXT HIGHLIGHT

Built from the working v3.0 text-engine version.

IMPROVEMENTS
- Selection geometry is now generated per character instead of per word.
- A single letter can be selected consistently.
- Character widths use Canvas text measurement and are normalised to the exact
  width reported by the PDF, improving proportional-font accuracy.
- Spaces remain in reading order so dragging through a sentence behaves
  naturally, but spaces are not treated as visible character targets.
- Highlight height is calculated from font ascent, descent and the PDF baseline.
- Equal padding is applied above and below the glyph area.
- The previous additional vertical shrinking has been removed.
- Existing tools and export behaviour remain intact.

JavaScript syntax and character-engine integration checks passed.
