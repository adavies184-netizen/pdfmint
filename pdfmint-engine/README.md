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
