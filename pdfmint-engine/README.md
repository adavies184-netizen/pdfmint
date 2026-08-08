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
