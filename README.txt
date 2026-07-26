PDFMINT v1.4.2 — EDITOR RUNTIME FIX

This fixes the remaining reason the desktop editor did not open.

CAUSE
The redesigned HTML removed several old inspector controls, but script.js still
accessed those missing elements during page load. JavaScript stopped before the
homepage upload handler could run.

FIXED
- Removed all required references to deleted inspector controls.
- Rebuilt updateEditorUi so every layout element is checked safely.
- Corrected the Add Text helper message container.
- Preserved the Done button wording after download.
- Updated script cache version to v142.

DEPLOYMENT
Replace all repository files with this package, commit, wait for Sevalla to
redeploy, and hard-refresh the page.
