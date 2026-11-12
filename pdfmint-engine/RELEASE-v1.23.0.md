# PDFBreeze Engine v1.23.0 — PDF to Word rebuilt for real-world PDFs

Tested locally with the real converter (PyMuPDF 1.26.3 + pdf2docx 0.5.8) on 17 PDFs:
the owner's five edited PDFs (contract, company accounts, 20-page Chrome-made
brochure, OCR'd scanned letter, OCR'd website screenshot), Word/Excel/PowerPoint
exports, Chrome-made invoice/newsletter/CV/form, a raw scan, an OCR'd scan and the
existing test fixtures. All 17: every word present; 16/17 same page count (the
remaining one is a flowing Word document laid out by LibreOffice).

- **Text no longer goes missing from Chrome/web-made PDFs.** Their Type 3 fonts were
  mistaken for invisible text and whole paragraphs were dropped (pdf2docx_fixes.py).
- **Spaces kept** ("Loweryourblood" → "Lower your blood"); Type 3 fonts become
  Arial/Times New Roman (real names read from the font descriptors), sized to the
  PDF's own text width; real colours read from the page (Type 3 text reported as black).
- **Exact layout mode** (designed pages, forms, scans, columns): one Word page per PDF
  page; one editable text box per paragraph (modern Word text boxes, re-wrap when
  edited); photos placed at their exact positions, cropped to what shows on the page;
  coloured shapes/cards as one background picture per page; plain rules as editable
  shapes. Files are far lighter (20-page brochure: 17 MB → 1.8 MB) and look the same in
  Word and LibreOffice. No hidden duplicate text.
- **Smarter mode choice**: Word-style documents and real tables stay flowing Word text
  with real Word tables; exact layout only for Type 3 fonts, OCR text, rotated text,
  form fields, side-by-side text columns, or drawing that isn't a recognised table.
- **Scans**: pages that are just a picture are read with Tesseract first (one page at
  a time), so the Word file has editable text; the scan's own lettering is painted out
  under the editable text so it doesn't show twice.

Memory (peak, per conversion): 120–490 MB on the test set — fits a 1 GB engine.
