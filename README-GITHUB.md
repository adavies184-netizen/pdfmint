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
