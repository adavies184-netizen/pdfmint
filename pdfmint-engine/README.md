# PDFMint Engine — Sevalla-ready v1.0.1

## Sevalla H1 requirement

Set:

```text
WEB_CONCURRENCY=1
```

The 0.3 GB RAM plan should not run two Python workers while LibreOffice is
starting.

## Environment variables

```text
MAX_UPLOAD_BYTES=104857600
JOB_TIMEOUT_SECONDS=180
ALLOWED_ORIGINS=https://pdfmint-j6ewx.kinsta.page
WEB_CONCURRENCY=1
```

## Deployment

- Dockerfile path: `pdfmint-engine/Dockerfile`
- Docker context: `pdfmint-engine`
- Health endpoint: `/v1/health`

## Diagnostics

DOC jobs now log LibreOffice's command, exit code, stdout, stderr, output
existence and output size. Each request also receives a reference such as
`PM-8A12BC34`.
