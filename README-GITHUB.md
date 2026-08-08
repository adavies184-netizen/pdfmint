# PDFMint repository structure

Extract this ZIP and upload its contents to the root of the PDFMint GitHub
repository.

```text
PDFMint repository
├── index.html
├── editor.html
├── script.js
├── styles.css
├── config.js
├── landing pages and legal pages...
└── pdfmint-engine/
    ├── Dockerfile
    ├── requirements.txt
    ├── docker-compose.yml
    └── app/
```

Do not upload the outer ZIP as one file. Upload or commit the extracted files
and folders.

The website and engine can use the same GitHub repository. For the Sevalla
Engine Application, set the root directory / Docker context to:

```text
pdfmint-engine
```

After Sevalla provides the engine URL, update `config.js`:

```javascript
window.PDFMINT_CONFIG = {
  engineBaseUrl: "https://YOUR-SEVALLA-ENGINE-DOMAIN"
};
```


## v3.9.2 low-memory DOC update

Set the Sevalla engine environment variable:

```text
WEB_CONCURRENCY=1
```

Redeploy only the PDFMint Engine application. The normal PDFMint website does
not need redeploying for this engine-only update.


## v3.9.3 DOC export fallback

This is an engine-only update. Replace the existing `pdfmint-engine` folder in
GitHub and redeploy only the PDFMint Engine application.

The normal PDFMint website does not need redeploying.


## PDFMint v3.9.4 — Word export loading bar

Website update:
- DOCX displays an initial 6-second estimate.
- DOC displays an initial 10-second estimate.
- The loading bar keeps moving smoothly during server processing.
- The timer and loading animation stop immediately when the download is ready.
- DOC and DOCX show distinct conversion-stage messages.

The PDFMint Engine does not need redeploying for this version.


## PDFMint v3.9.5 — simplified Word progress

Customer-facing changes:
- One clean loading bar.
- One short status line.
- No countdown numbers, page counts, engine stages or technical information.
- DOCX displays: “Usually ready in a few seconds”.
- DOC displays: “Usually ready in around 10 seconds”.
- Near completion, the message changes to “Nearly ready…”.
- The bar stops below 100% until the actual download response is received.

This is a website-only update. The PDFMint Engine does not need redeploying.


## PDFMint v3.9.6 — Contact page
- Added `contact.html`.
- Added Contact Us to the Company footer links across the site.
- Added a fully responsive PDFMint-styled contact form.
- Current form validates inputs and shows a success state in the browser.
- No email backend is wired in this version.


## PDFMint v3.9.7 — XLSX / XLS conversion

- Enabled XLSX and XLS in the editor download format selector.
- Added `pdf-to-xlsx` to PDFMint Engine.
- Added `pdf-to-xls` to PDFMint Engine.
- XLSX uses PyMuPDF + openpyxl for fast, basic row/column extraction.
- XLS uses XLSX output + LibreOffice Calc conversion.
- Each PDF page becomes a worksheet.
- Added simple loading estimates for XLSX/XLS.
- Header Contact Us links now point to `contact.html`.

This release changes BOTH the website and `pdfmint-engine`; deploy both.


## PDFMint v3.9.8 — XLSX/XLS selector fix

- Correctly enabled the XLSX and XLS options in the Done/export popup.
- Removed the disabled/“SOON” state for both formats.
- Both options now route to:
  - `pdf-to-xlsx`
  - `pdf-to-xls`
- Backend engine code from v3.9.7 is unchanged.

Deploy the normal PDFMint website again.
The engine only needs redeploying if v3.9.7 engine changes were not already deployed.


## PDFMint v4.0.1 — PPT/PPTX from stable v3.9.8

Built directly from the user-confirmed stable v3.9.8 baseline.

- Existing PDF/DOC/DOCX/JPG/PNG/TXT/XLS/XLSX logic left intact.
- PPTX enabled and routed through PDFMint Engine.
- PPT enabled and routed through PDFMint Engine.
- PDF → PPTX uses PyMuPDF + python-pptx.
- PDF → PPT uses generated PPTX + LibreOffice Impress.
- config.js points to the live Sevalla engine URL.

Deploy BOTH the normal PDFMint application and pdfmint-engine.


## PDFMint v4.0.2 — PPT silent retry + lower memory

Reliability changes:
- Legacy PPT gets one silent retry after ~2.2 seconds for transient 503/timeouts.
- The customer continues to see the normal loading bar during the retry.
- Other formats are not retried automatically.

PPT memory reductions:
- PDF pages render at 1.5x instead of 2x.
- JPEG quality reduced from 88 to 82 (small visual difference, lower memory/file size).
- PyMuPDF pixmaps are explicitly released after each page.
- Python garbage collection runs before LibreOffice Impress starts.
- LibreOffice uses a smaller Java heap hint and disables synchronous printer detection.

This patch changes BOTH:
1. normal PDFMint frontend
2. pdfmint-engine


## PDFMint v4.0.3 — landing CTA + editor tool routing

- Edit PDF: Add Text is pre-selected.
- Sign PDF: “Upload to sign”; Sign pre-selected.
- Rotate PDF: “Upload to rotate”; no tool selected.
- Merge PDF: “Upload to merge”; no tool selected.
- Split PDF: “Upload to split”; no tool selected.
- Crop PDF: “Upload to crop”; no tool selected.
- Add Watermark: “Upload to watermark”; no tool selected.
- Add Image to PDF: button unchanged; no tool selected.
- Compress Image: “Upload to compress”; no tool selected.
- Compress PDF: “Upload to compress”; no tool selected.
- Delete PDF Pages: button unchanged; no tool selected.

Routing now explicitly supports `data-landing-tool="none"` and opens editor.html
without a tool query, so the editor toolbar remains unselected.

Frontend-only update. PDFMint Engine unchanged.


## PDFMint v4.0.4 — shared upload CTA + footer cleanup

- Fixed the shared landing-page upload button so the actual visible CTA now changes per page:
  - Sign PDF → Upload to sign
  - Rotate PDF → Upload to rotate
  - Merge PDF → Upload to merge
  - Split PDF → Upload to split
  - Crop PDF → Upload to crop
  - Add Watermark → Upload to watermark
  - Compress Image/PDF → Upload to compress
- Removed the company postal address from the footer across the site.
- Footer contact details are now limited to:
  - Northstar Ridge Limited
  - support@pdfmint.com

Frontend-only update. PDFMint Engine unchanged.


## PDFMint v4.0.5 — footer repair, OCR CTA, header order

- Rebuilt the footer with valid markup.
- Removed duplicate Contact Us.
- Footer company contact now shows only Northstar Ridge Limited and support@pdfmint.com.
- Removed postal address.
- OCR upload button now says “Upload PDF for OCR”.
- Header order is now PDF Editor, PDF Converter, Forms.
- Mobile menu order matches desktop.

Frontend-only update. PDFMint Engine unchanged.


## PDFMint v4.0.6 — header dropdown isolation fix

- Kept menu order: PDF Editor → PDF Converter → Forms.
- Added clear spacing between Editor and Converter triggers.
- Each dropdown is now isolated to its own parent.
- Opening one dropdown automatically closes the other.
- Clicking outside closes any open dropdown.
- Existing footer, OCR CTA, conversion logic and engine are unchanged.

Frontend-only update.
