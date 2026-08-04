PDFMint v3.4.1 — Note Tool

- Click Note, then click anywhere on the PDF to place a sticky note.
- The yellow note opens immediately for typing.
- Click elsewhere on the PDF to collapse it into a red-headed pushpin.
- Hover over the pushpin to reveal the note.
- Click the pushpin to reopen and edit it.
- The first click away from an open note collapses it without placing another.
- Note creation and text changes are included in undo/redo.
- Exported PDFs contain standard PDF text annotations with a PushPin icon where supported.

PDFMint v3.4.2 fix:
- Enabled pointer events on the annotation layer while Note mode is active.
- Clicking the PDF preview now reaches the note-placement handler.

PDFMint v3.4.3:
- Collapsed note pins can now be repositioned by clicking, holding and dragging.
- A movement threshold prevents normal clicks from accidentally becoming drags.
- Clicking without dragging still opens the note.
- Pin movement is included in undo/redo.


PDFMint v3.5.0 — PDF Editor landing pages

- Edit PDF: edit-pdf.html
- Sign PDF: sign-pdf.html
- Rotate PDF: rotate-pdf.html
- Merge PDF: merge-pdf.html
- Split PDF: split-pdf.html
- Crop PDF: crop-pdf.html
- Add watermark: add-watermark.html
- Add image to PDF: add-image-to-pdf.html
- Compress image: compress-image.html
- Compress PDF: compress-pdf.html
- Delete pages: delete-pdf-pages.html
- OCR PDF: ocr-pdf.html

All desktop dropdown, mobile dropdown and footer links have been connected.


PDFMint v3.5.1 — PDF Converter landing pages

- PDF to Word: pdf-to-word.html
- PDF to PPTX: pdf-to-pptx.html
- PDF to Excel: pdf-to-excel.html
- PDF to JPG: pdf-to-jpg.html
- PDF to PNG: pdf-to-png.html
- Word to PDF: word-to-pdf.html
- PPTX to PDF: pptx-to-pdf.html
- Excel to PDF: excel-to-pdf.html
- JPG to PDF: jpg-to-pdf.html
- PNG to PDF: png-to-pdf.html

All desktop dropdown, mobile dropdown, homepage converter cards and footer links have been connected.


PDFMint v3.6.0 — Shared editor routing

- Every SEO landing page remains unique.
- Uploading from any landing page stores the PDF temporarily in IndexedDB.
- The user is redirected to one shared editor:
  editor.html?tool=<tool>
- The shared editor retrieves the PDF and opens the relevant tool where available.

Examples:
- sign-pdf.html -> editor.html?tool=sign
- edit-pdf.html -> editor.html?tool=edit
- add-image-to-pdf.html -> editor.html?tool=image
- merge-pdf.html -> editor.html?tool=merge
- pdf-to-word.html -> editor.html?tool=pdf-to-word

Only one editor implementation now needs to be maintained.


PDFMint v3.7.0 — PDF, JPG, PNG and TXT export

Available formats:
- PDF: downloads the completed edited PDF.
- JPG: downloads one JPG for a one-page PDF. Multi-page PDFs download as one ZIP containing one JPG per page.
- PNG: downloads one PNG for a one-page PDF. Multi-page PDFs download as one ZIP containing one PNG per page.
- TXT: extracts text from the completed edited PDF and downloads one UTF-8 TXT file.

All conversions start from the final edited PDF, so placed text, signatures, images, drawings, highlights and other flattened visual changes are present in JPG and PNG exports.


PDFMint v3.7.1 — Local JSZip and 300 DPI image export

Changes:
- JSZip is now bundled locally at vendor/jszip.min.js.
- The editor no longer depends on the jsDelivr CDN for multi-page image ZIP downloads.
- JPG and PNG pages are rendered at a 300 DPI-equivalent scale.
- A 40-million-pixel safety cap protects phones and lower-memory devices from oversized canvas failures on unusually large PDF pages.
- Standard A4 and Letter pages export at approximately 2480 × 3508 pixels and 2550 × 3300 pixels respectively.
