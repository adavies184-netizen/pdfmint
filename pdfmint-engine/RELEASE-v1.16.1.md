# PDFMint Engine v1.16.1

## PDF to Word fidelity

- Replaces reconstructive PDF-to-DOCX conversion with a fixed-layout,
  fidelity-first export using the existing open-source PyMuPDF and python-docx
  dependencies.
- Preserves PDF text, rules, drawings, signatures and their exact page
  positions in DOCX.
- The existing LibreOffice DOC stage consumes the corrected DOCX, so DOC and
  DOCX now share the same visual source.

The Word pages are intentionally image-backed. This prioritises an accurate
visual result over editing individual PDF elements inside Word.
