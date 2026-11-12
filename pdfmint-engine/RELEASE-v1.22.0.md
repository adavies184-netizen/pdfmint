# PDFBreeze Engine v1.22.0

- **A heavy conversion can no longer restart the engine.** On Kubernetes an
  out-of-memory kill takes down the whole container, so v1.21.0's separate
  conversion process wasn't enough: converting a 20-page, graphics-heavy PDF to
  Word restarted the engine and the customer got a bare 503. The engine now
  watches the container's memory while a conversion runs (20 checks a second,
  negligible CPU) and stops just that conversion at 85% of the limit. The
  customer gets the usual "needs more memory" message and the engine stays up.
  Optional settings: `MEMORY_GUARD_FRACTION`, `MEMORY_GUARD_LIMIT_MB`,
  `MEMORY_GUARD_DISABLED`.
- **PDF to Word uses far less memory on long, drawing-heavy documents**
  (6+ pages): vector artwork is redrawn at ~180 dpi instead of 288 dpi, under
  40% of the memory.
