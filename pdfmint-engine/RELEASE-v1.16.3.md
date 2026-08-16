# PDFMint Engine v1.16.3

## Restore native Word conversion

- Restores the established `pdf2docx` conversion pipeline used by engine
  v1.16.0.
- Produces ordinary Word paragraphs, runs, tables and drawing objects where
  the converter can reconstruct them, instead of a fixed page background with
  positioned text boxes.
- Prioritises normal Word selection, editing, reflow and copy/paste behaviour
  over pixel-perfect PDF positioning.
- Keeps the existing LibreOffice DOC export fallback sequence unchanged.

This release removes the hybrid Word-export implementation introduced in
v1.16.2. PDF layout may vary more than in v1.16.2, but the resulting DOCX and
DOC files behave as reconstructed Word documents rather than page facsimiles.
