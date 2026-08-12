from __future__ import annotations

import logging
import shutil
import subprocess
from pathlib import Path

from ..settings import JOB_TIMEOUT_SECONDS

logger = logging.getLogger("pdfbreeze.netpress")


PRESETS = {
    "light": "/printer",
    "standard": "/ebook",
    "high": "/screen",
}


def compress_pdf(
    pdf_path: Path,
    output_path: Path,
    level: str,
) -> Path:
    preset = PRESETS.get(level)
    if not preset:
        raise ValueError(f"Unsupported compression level: {level}")

    ghostscript = shutil.which("gs")
    if not ghostscript:
        raise RuntimeError("Ghostscript is not available.")

    command = [
        ghostscript,
        "-sDEVICE=pdfwrite",
        "-dCompatibilityLevel=1.6",
        f"-dPDFSETTINGS={preset}",
        "-dNOPAUSE",
        "-dQUIET",
        "-dBATCH",
        "-dSAFER",
        "-dDetectDuplicateImages=true",
        "-dCompressFonts=true",
        "-dSubsetFonts=true",
        "-dAutoRotatePages=/None",
        f"-sOutputFile={output_path}",
        str(pdf_path),
    ]

    logger.info(
        "Compress PDF level=%s preset=%s input_bytes=%s",
        level,
        preset,
        pdf_path.stat().st_size,
    )

    result = subprocess.run(
        command,
        capture_output=True,
        text=True,
        timeout=JOB_TIMEOUT_SECONDS,
        check=False,
    )

    if result.returncode != 0:
        details = (result.stderr or result.stdout or "No output produced.").strip()
        raise RuntimeError(
            f"Ghostscript compression failed with exit code {result.returncode}. "
            f"{details[:800]}"
        )

    if not output_path.exists() or output_path.stat().st_size == 0:
        raise RuntimeError("Compression did not produce a valid PDF.")

    # If Ghostscript makes an already-optimised PDF larger, retain the original.
    if output_path.stat().st_size >= pdf_path.stat().st_size:
        logger.info(
            "Compressed output was not smaller; returning original bytes instead."
        )
        shutil.copy2(pdf_path, output_path)

    logger.info(
        "Compress PDF complete level=%s output_bytes=%s",
        level,
        output_path.stat().st_size,
    )
    return output_path
