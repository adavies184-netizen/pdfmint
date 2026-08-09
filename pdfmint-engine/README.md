# PDFMint Engine — Sevalla-ready v1.0.2

## Sevalla H1 setting

```text
WEB_CONCURRENCY=1
```

## Environment variables

```text
MAX_UPLOAD_BYTES=104857600
JOB_TIMEOUT_SECONDS=180
ALLOWED_ORIGINS=https://pdfmint-j6ewx.kinsta.page
WEB_CONCURRENCY=1
```

## DOC export behaviour

PDFMint now tries multiple LibreOffice DOC export modes automatically:

1. `doc`
2. `doc:"MS Word 97"`
3. `doc:"MS Word 95"`
4. `doc:"Office Open XML Text"`

Each attempt uses a clean LibreOffice profile. The first attempt that creates a
valid `.doc` file is returned to the customer. Logs record which filter worked.

## Deployment

- Dockerfile path: `pdfmint-engine/Dockerfile`
- Docker context: `pdfmint-engine`
- Health endpoint: `/v1/health`


## Spreadsheet conversion — v1.1

Current spreadsheet operations:

- `pdf-to-xlsx`
- `pdf-to-xls`

The first version intentionally prioritises speed and basic data extraction.
PyMuPDF extracts text positions, PDFMint groups them into simple rows and
columns, and openpyxl creates the XLSX workbook. Each PDF page is written to a
separate worksheet.

XLS is produced from the generated XLSX using LibreOffice Calc.

This is not intended to reproduce complex spreadsheet formatting or advanced
table structures. It is a basic, fast conversion for ordinary tabular PDFs.

## OCR operations — v1.2

The engine exposes three OCR jobs through `POST /v1/jobs`:

- `ocr-docx` — searchable OCR followed by editable DOCX reconstruction
- `ocr-pdf` — PDF with a selectable and searchable text layer
- `ocr-txt` — UTF-8 plain text extracted from the OCR result

The container installs OCRmyPDF, Tesseract English data, QPDF, Ghostscript,
Unpaper and recommended font support. Deploy the engine before the matching
site package so the OCR health checks and operations are available.

## Image conversions - v1.3

The engine now exposes all 24 image-category routes used by the converter
directory. These cover raster image formats, HEIC/AVIF, SVG/EPS, image OCR to
DOCX/XLSX, and Word/HTML rendering to JPG. Multi-page Word or HTML input is
returned as a ZIP containing one JPG per page.

Deploy this engine release before the matching v4.5 site package. After the
deployment completes, `/v1/health` should report version `1.3.0` and include
the image conversion operations.
