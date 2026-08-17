# PDFBreeze next editor working copy

This folder is an isolated working copy of the authoritative PDFBreeze v5.6.55 site snapshot.

## Routes

- `editor.html` remains the unchanged current PDFBreeze editor.
- `editor-next.html` is the new EmbedPDF-based editor preview.

## Boundaries

- The existing editor and upload flow are not redirected to `editor-next.html`.
- Add `?editor=next` to an existing PDF tool landing page to test its normal upload handoff with the preview. For example, `edit-pdf.html?editor=next` stores the selected PDF in the existing IndexedDB transfer area and opens `editor-next.html`.
- Without that explicit preview query parameter, every existing upload continues to open `editor.html`.
- `edit-pdf.html` has a preview-specific cache version for `script.js` so the opt-in handoff is available immediately after deployment.
- The preview is marked `noindex,nofollow` and is not linked from the public site.
- Production has not been modified or deployed.
- `config.js` remains byte-for-byte identical to the authoritative v5.6.55 file.
- PDFium text editing is intentionally not included yet. It will be connected only after the EmbedPDF toolbar and shared document-state flow are complete.

## Current preview files

- `editor-next.html`
- `embedpdf-poc.css`
- `embedpdf-poc.js`

The `embedpdf-poc.*` filenames are retained temporarily to keep this first transplant identical to the proven standalone test. They can be renamed after the main-site integration is verified.

## Hybrid toolbar revision 2

- Documents open at 100% and return to the top of page one after the initial layout is ready.
- The separate filename/status strip has been removed.
- The open filename now appears at the far right of the PDFBreeze tools row.
- The row now includes the original editor's Add Text, Edit Text, Sign, Image, Draw, Highlight, Link, Note, Stamp, Watermark, Crop, Line and Manage tools.
- Edit Text is an intentional placeholder until PDFium is integrated. Watermark, Crop and Manage are also displayed as later integration points; supported EmbedPDF tools are connected now.

## Hybrid toolbar revision 3

- The hidden status region now remains visually hidden when its message changes, removing lines such as `Draw selected` from between the toolbars.
- EmbedPDF's word-based View, Annotate, Shapes, Insert, Form and Redact mode tabs are removed from its visible main toolbar because the PDFBreeze toolbar now selects those modes.
- EmbedPDF's compact document, sidebar, zoom, pan, pointer, search and comment controls remain available.
- Contextual EmbedPDF tool options remain visible only when the corresponding PDFBreeze tool is selected.
- The post-layout viewport reset that could leave the document outside the visible preview was removed. The viewer now sets 100% zoom and navigates to the top of page one through EmbedPDF's zoom and scroll APIs only.

## Hybrid toolbar revision 4

- All programmatic zoom and scroll calls after layout have been removed because they could desynchronise EmbedPDF's page renderer, leaving a grey workspace or an unpainted white page and frozen zoom controls.
- The initial zoom is now supplied only through EmbedPDF's supported `zoom.defaultZoomLevel: 1` configuration.
- EmbedPDF retains full ownership of page layout, rendering, scrolling and subsequent zoom changes.
