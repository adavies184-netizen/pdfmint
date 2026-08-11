# PDFBreeze repository structure

Extract this ZIP and upload its contents to the root of the PDFBreeze GitHub
repository.

```text
PDFBreeze repository
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

Redeploy only the PDFBreeze Engine application. The normal PDFBreeze website does
not need redeploying for this engine-only update.


## v3.9.3 DOC export fallback

This is an engine-only update. Replace the existing `pdfmint-engine` folder in
GitHub and redeploy only the PDFBreeze Engine application.

The normal PDFBreeze website does not need redeploying.


## PDFBreeze v3.9.4 — Word export loading bar

Website update:
- DOCX displays an initial 6-second estimate.
- DOC displays an initial 10-second estimate.
- The loading bar keeps moving smoothly during server processing.
- The timer and loading animation stop immediately when the download is ready.
- DOC and DOCX show distinct conversion-stage messages.

The PDFBreeze Engine does not need redeploying for this version.


## PDFBreeze v3.9.5 — simplified Word progress

Customer-facing changes:
- One clean loading bar.
- One short status line.
- No countdown numbers, page counts, engine stages or technical information.
- DOCX displays: “Usually ready in a few seconds”.
- DOC displays: “Usually ready in around 10 seconds”.
- Near completion, the message changes to “Nearly ready…”.
- The bar stops below 100% until the actual download response is received.

This is a website-only update. The PDFBreeze Engine does not need redeploying.


## PDFBreeze v3.9.6 — Contact page
- Added `contact.html`.
- Added Contact Us to the Company footer links across the site.
- Added a fully responsive PDFBreeze-styled contact form.
- Current form validates inputs and shows a success state in the browser.
- No email backend is wired in this version.


## PDFBreeze v3.9.7 — XLSX / XLS conversion

- Enabled XLSX and XLS in the editor download format selector.
- Added `pdf-to-xlsx` to PDFBreeze Engine.
- Added `pdf-to-xls` to PDFBreeze Engine.
- XLSX uses PyMuPDF + openpyxl for fast, basic row/column extraction.
- XLS uses XLSX output + LibreOffice Calc conversion.
- Each PDF page becomes a worksheet.
- Added simple loading estimates for XLSX/XLS.
- Header Contact Us links now point to `contact.html`.

This release changes BOTH the website and `pdfmint-engine`; deploy both.


## PDFBreeze v3.9.8 — XLSX/XLS selector fix

- Correctly enabled the XLSX and XLS options in the Done/export popup.
- Removed the disabled/“SOON” state for both formats.
- Both options now route to:
  - `pdf-to-xlsx`
  - `pdf-to-xls`
- Backend engine code from v3.9.7 is unchanged.

Deploy the normal PDFBreeze website again.
The engine only needs redeploying if v3.9.7 engine changes were not already deployed.


## PDFBreeze v4.0.1 — PPT/PPTX from stable v3.9.8

Built directly from the user-confirmed stable v3.9.8 baseline.

- Existing PDF/DOC/DOCX/JPG/PNG/TXT/XLS/XLSX logic left intact.
- PPTX enabled and routed through PDFBreeze Engine.
- PPT enabled and routed through PDFBreeze Engine.
- PDF → PPTX uses PyMuPDF + python-pptx.
- PDF → PPT uses generated PPTX + LibreOffice Impress.
- config.js points to the live Sevalla engine URL.

Deploy BOTH the normal PDFBreeze application and pdfmint-engine.


## PDFBreeze v4.0.2 — PPT silent retry + lower memory

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
1. normal PDFBreeze frontend
2. pdfmint-engine


## PDFBreeze v4.0.3 — landing CTA + editor tool routing

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

Frontend-only update. PDFBreeze Engine unchanged.


## PDFBreeze v4.0.4 — shared upload CTA + footer cleanup

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
  - support@pdfbreeze.net

Frontend-only update. PDFBreeze Engine unchanged.


## PDFBreeze v4.0.5 — footer repair, OCR CTA, header order

- Rebuilt the footer with valid markup.
- Removed duplicate Contact Us.
- Footer company contact now shows only Northstar Ridge Limited and support@pdfbreeze.net.
- Removed postal address.
- OCR upload button now says “Upload PDF for OCR”.
- Header order is now PDF Editor, PDF Converter, Forms.
- Mobile menu order matches desktop.

Frontend-only update. PDFBreeze Engine unchanged.


## PDFBreeze v4.0.6 — header dropdown isolation fix

- Kept menu order: PDF Editor → PDF Converter → Forms.
- Added clear spacing between Editor and Converter triggers.
- Each dropdown is now isolated to its own parent.
- Opening one dropdown automatically closes the other.
- Clicking outside closes any open dropdown.
- Existing footer, OCR CTA, conversion logic and engine are unchanged.

Frontend-only update.


## PDFBreeze v4.0.7 — header hover-state fix

- Desktop PDF Editor and PDF Converter hover states are now isolated.
- Hovering one dropdown only highlights that dropdown.
- The open dropdown remains highlighted green.
- The other dropdown remains in its normal colour.
- Dropdown open/close behaviour from v4.0.6 is unchanged.

Frontend-only update.


## PDFBreeze v4.0.8 — upload picker restored

Root cause fixed:
- The shared upload-label text helper was using `textContent` on the entire upload `<label>`.
- Those labels contain the hidden `<input type="file">`.
- Replacing the label text deleted the nested file input at runtime, so clicking the button no longer opened the native file picker.

Fix:
- Only the visible text node/span is updated.
- The hidden file input is preserved.
- Custom upload labels remain unchanged.
- Homepage/Edit PDF behavior remains unchanged.
- Header/footer/routing/conversions are unchanged.

Frontend-only update. PDFBreeze Engine unchanged.


## PDFBreeze v4.0.9 — Compress PDF workflow

New Compress PDF experience:
- Upload PDF → compression options modal.
- Light: ~10% smaller + estimated output size.
- Standard: ~20% smaller + estimated output size; selected by default and marked Recommended.
- High: ~40% smaller + estimated output size.
- Estimates are calculated from the uploaded file size and clearly presented as estimates.
- Compression uses Ghostscript in PDFBreeze Engine:
  - Light → /printer
  - Standard → /ebook
  - High → /screen
- If a PDF is already optimised and Ghostscript produces a larger file, PDFBreeze retains the original PDF instead.
- A PDFBreeze-themed progress modal appears during compression.
- Completion briefly shows the real before/after size and actual percentage reduction.
- The compressed file is then loaded into the shared editor and the existing export popup opens automatically.
- PDF is selected by default in the export popup; all other existing export formats remain available.

This release changes BOTH:
1. normal PDFBreeze frontend
2. pdfmint-engine

Ghostscript was already present in the engine Docker image, so no new system dependency was required.


## PDFBreeze v4.0.10 — Compress CTA + header hover fix

Compression:
- Fixed the Compress PDF CTA event binding.
- The click is now handled by delegated document-level binding, so modal
  initialisation order cannot leave the CTA inactive.
- Clicking Compress PDF immediately changes the CTA to “Starting…” and opens
  the progress modal before the engine request begins.
- Progress initially displays “Connecting to PDFBreeze Engine…”.
- Any startup/network error now produces a visible PDFBreeze error instead of an
  apparently dead button.

Header:
- Fixed malformed desktop dropdown nesting left by the earlier menu reorder.
- PDF Editor and PDF Converter are now true sibling dropdowns.
- Hovering PDF Converter no longer also highlights PDF Editor.
- Existing menu open/close behaviour and menu order are preserved.

Frontend-only patch relative to v4.0.9.
The v4.0.9 engine already contains the required compression operations, so
the engine does NOT need to be redeployed again if v4.0.9 engine is live.


## PDFBreeze v4.0.11 — working Compress PDF + Compress Image flows

Key reliability change:
- Removed compression CTA control from the huge shared script.
- Compress PDF and Compress Image now each have a dedicated page-level controller
  loaded after the shared site script. Their CTA binding no longer depends on
  shared-editor initialisation order.

Compress PDF:
- Upload → Light / Standard / High popup.
- Standard selected by default.
- Shows percentage estimate + estimated file size.
- CTA immediately opens progress screen.
- Uses existing engine operations:
  - compress-pdf-light
  - compress-pdf-standard
  - compress-pdf-high
- Finished compressed PDF is transferred to editor storage.
- Existing export popup opens automatically with PDF preselected.

Compress Image:
- Same compression popup and progress flow.
- Supports PNG, JPG/JPEG and WEBP upload.
- Compression is browser-side for speed.
- Finished image is wrapped into a temporary PDF solely so the existing
  editor/export system can be reused unchanged.
- Existing export popup opens automatically with PNG preselected.
- Other normal export choices remain available.

Engine:
- No new engine changes versus v4.0.9/v4.0.10.
- If the v4.0.9 engine is already live, only the normal site needs redeployment.
