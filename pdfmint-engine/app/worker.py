"""Runs one conversion in its own short-lived process.

Usage (internal): python -m app.worker <operation> <input> <workspace> <base_name> <result.json>
                  python -m app.worker --list   (prints the operation names as JSON)

Keeping conversions out of the web server process means:
- if a conversion runs out of memory, only this process is killed; the engine,
  checkout and the Stripe webhook keep running;
- all memory used by the conversion is returned to the system when it exits
  (a long-lived Python process otherwise keeps growing job after job);
- a stuck conversion can be stopped by killing the process;
- the heavy conversion libraries (PyMuPDF, pdf2docx/OpenCV, Pillow, ...) are
  only ever loaded here, never in the always-running web server.
"""
from __future__ import annotations

import json
import logging
import subprocess
import sys
from pathlib import Path


def main(argv: list[str]) -> int:
    if argv == ["--list"]:
        from .registry import OPERATIONS

        print(json.dumps(sorted(OPERATIONS)))
        return 0
    operation, input_path, workspace, base_name, result_file = argv
    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(name)s %(message)s")
    try:
        from .registry import execute_operation

        result = execute_operation(operation, Path(input_path), Path(workspace), base_name)
        payload = {"ok": True, "path": str(result.path), "filename": result.filename, "media_type": result.media_type}
    except subprocess.TimeoutExpired:
        logging.getLogger("pdfmint.worker").exception("Conversion timed out: %s", operation)
        payload = {"ok": False, "kind": "timeout"}
    except ValueError as exc:  # our own customer-readable validation messages
        payload = {"ok": False, "kind": "value", "message": str(exc)}
    except MemoryError:
        payload = {"ok": False, "kind": "memory"}
    except Exception as exc:
        logging.getLogger("pdfmint.worker").exception("Conversion failed: %s", operation)
        payload = {"ok": False, "kind": "error", "message": str(exc)[:2000]}
    Path(result_file).write_text(json.dumps(payload), encoding="utf-8")
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
