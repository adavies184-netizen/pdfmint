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
