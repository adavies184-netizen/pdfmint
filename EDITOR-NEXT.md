# PDFBreeze next editor working copy

This folder is an isolated working copy of the authoritative PDFBreeze v5.6.55 site snapshot.

## Routes

- `editor.html` remains the unchanged current PDFBreeze editor.
- `editor-next.html` is the new EmbedPDF-based editor preview.

## Boundaries

- The existing editor and upload flow are not redirected to `editor-next.html`.
- The preview is marked `noindex,nofollow` and is not linked from the public site.
- Production has not been modified or deployed.
- `config.js` remains byte-for-byte identical to the authoritative v5.6.55 file.
- PDFium text editing is intentionally not included yet. It will be connected only after the EmbedPDF toolbar and shared document-state flow are complete.

## Current preview files

- `editor-next.html`
- `embedpdf-poc.css`
- `embedpdf-poc.js`

The `embedpdf-poc.*` filenames are retained temporarily to keep this first transplant identical to the proven standalone test. They can be renamed after the main-site integration is verified.
