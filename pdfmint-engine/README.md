# PDFMint Engine — Sevalla-ready

Deploy this folder as a separate Sevalla **Application** while the PDFMint
website remains the main site.

## Sevalla application settings

- Build method: Dockerfile
- Root directory / Docker context: `pdfmint-engine`
- Port: supplied through the `PORT` environment variable
- Health endpoint: `/v1/health`

## Environment variables

```text
MAX_UPLOAD_BYTES=104857600
JOB_TIMEOUT_SECONDS=180
ALLOWED_ORIGINS=https://pdfmint.com,https://www.pdfmint.com
WEB_CONCURRENCY=2
```

During testing, add the temporary Sevalla website domain to `ALLOWED_ORIGINS`.

## Current operations

- `pdf-to-docx`
- `pdf-to-doc`

## Local development

```bash
docker compose up --build
```

Local health check:

```text
http://localhost:8000/v1/health
```
