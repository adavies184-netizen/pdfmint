# PDFMint Engine v1.8.1

Corrects the GNU LibreDWG source archive used by the Docker build. The earlier
v1.8.0 Dockerfile requested an unpublished `0.13.4` release archive and failed
with curl exit code 22. This release pins the available official GNU 0.13.3
source archive and retries transient download failures.
