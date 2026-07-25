PDFMINT v1.1.1 — PDF PREVIEW FIX
================================

This version fixes the PDF upload/preview problem.

CAUSE
The homepage accidentally loaded script.js twice:
1. Once before the PDF workspace HTML existed.
2. Again after the workspace and PDF libraries loaded.

The first copy attached an incomplete upload handler, and the second copy then
failed because the same JavaScript constants had already been declared.

FIX
• Removed the early script.js include.
• Kept one script include at the very end of the page.
• Updated it to script.js?v=111 to prevent browser caching.
• All v1.1 browser tools remain included.
• Company name remains Northstar Ridge Limited.

DEPLOYMENT
Replace the existing files in the GitHub repository with all files from this
folder, commit the change, wait for Sevalla to redeploy, then hard-refresh the
homepage once.
