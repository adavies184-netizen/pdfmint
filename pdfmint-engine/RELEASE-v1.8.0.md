# PDFMint Engine v1.8.0

Adds `dwg-to-dxf`, `dxf-to-dwg`, `rar-to-zip`, `zip-to-rar` and
`7z-to-zip`. CAD conversion uses GNU LibreDWG. Archive extraction uses 7-Zip,
and ZIP-to-RAR writes a genuine uncompressed RAR 5 archive rather than
renaming a ZIP file.

Deploy this engine before the matching PDFMint Site v5.0.0 package. The health
endpoint must report version `1.8.0`, `7zip: true`, `libredwg: true`, and all
five new operations before the site is deployed.
