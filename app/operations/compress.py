from __future__ import annotations

import logging
import shutil
import subprocess
from pathlib import Path

from ..settings import JOB_TIMEOUT_SECONDS

logger = logging.getLogger("pdfbreeze.netpress")


TARGET_REDUCTIONS = {
    "light": 0.10,
    "standard": 0.25,
    "high": 0.50,
}

# Ghostscript presets produce different reductions depending on the PDF. Trying
# the neighbouring profiles lets us select the result closest to the reduction
# the customer chose instead of treating a preset name as a fixed percentage.
CANDIDATE_PRESETS = {
    "light": ("/printer", "/ebook"),
    "standard": ("/printer", "/ebook", "/screen"),
    "high": ("/ebook", "/screen"),
}


def compress_pdf(
    pdf_path: Path,
    output_path: Path,
    level: str,
) -> Path:
    target_reduction = TARGET_REDUCTIONS.get(level)
    presets = CANDIDATE_PRESETS.get(level)
    if target_reduction is None or not presets:
        raise ValueError(f"Unsupported compression level: {level}")

    ghostscript = shutil.which("gs")
    if not ghostscript:
        raise RuntimeError("Ghostscript is not available.")

    input_size = pdf_path.stat().st_size
    target_size = round(input_size * (1 - target_reduction))
    candidates: list[tuple[int, Path, str]] = []
    failures: list[str] = []

    for index, preset in enumerate(presets):
        candidate = output_path.with_name(
            f"{output_path.stem}-candidate-{index}{output_path.suffix}"
        )
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
            f"-sOutputFile={candidate}",
            str(pdf_path),
        ]

        logger.info(
            "Compress PDF level=%s target=%s preset=%s input_bytes=%s",
            level,
            target_reduction,
            preset,
            input_size,
        )
        try:
            result = subprocess.run(
                command,
                capture_output=True,
                text=True,
                timeout=JOB_TIMEOUT_SECONDS,
                check=False,
            )
        except subprocess.TimeoutExpired:
            failures.append(f"{preset}: timed out")
            candidate.unlink(missing_ok=True)
            continue
        if result.returncode == 0 and candidate.exists() and candidate.stat().st_size:
            size = candidate.stat().st_size
            if size < input_size:
                candidates.append((size, candidate, preset))
            else:
                candidate.unlink(missing_ok=True)
        else:
            details = (result.stderr or result.stdout or "No output produced.").strip()
            failures.append(f"{preset}: {details[:240]}")
            candidate.unlink(missing_ok=True)

    if candidates:
        selected_size, selected_path, selected_preset = min(
            candidates,
            key=lambda item: abs(item[0] - target_size),
        )
        shutil.move(selected_path, output_path)
        for _, candidate, _ in candidates:
            if candidate != selected_path:
                candidate.unlink(missing_ok=True)
        logger.info(
            "Compression target selected level=%s preset=%s target_bytes=%s output_bytes=%s",
            level,
            selected_preset,
            target_size,
            selected_size,
        )
    else:
        logger.info("No candidate reduced the PDF; returning original bytes.")
        shutil.copy2(pdf_path, output_path)
        if failures:
            logger.warning("Ghostscript candidate failures: %s", "; ".join(failures))

    logger.info(
        "Compress PDF complete level=%s output_bytes=%s",
        level,
        output_path.stat().st_size,
    )
    return output_path
