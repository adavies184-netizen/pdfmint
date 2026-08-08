from __future__ import annotations

import logging
import subprocess
from pathlib import Path

import fitz

from ..settings import JOB_TIMEOUT_SECONDS
from .word import pdf_to_docx

logger = logging.getLogger("pdfmint.ocr")


def create_searchable_pdf(pdf_path: Path, output_path: Path) -> Path:
    command = [
        "ocrmypdf",
        "--skip-text",
        "--rotate-pages",
        "--deskew",
        "--optimize", "1",
        "--output-type", "pdf",
        "--language", "eng",
        str(pdf_path),
        str(output_path),
    ]
    logger.info("OCR command: %s", " ".join(command))
    result = subprocess.run(
        command,
        capture_output=True,
        text=True,
        timeout=JOB_TIMEOUT_SECONDS,
        check=False,
    )
    if result.returncode not in (0, 6):
        details = (result.stderr or result.stdout or "OCR did not produce an output.").strip()
        raise RuntimeError(details[:1800])
    if not output_path.exists() or output_path.stat().st_size == 0:
        raise RuntimeError("OCR did not produce a searchable PDF.")
    return output_path


def searchable_pdf_to_txt(searchable_pdf: Path, output_path: Path) -> Path:
    document = fitz.open(searchable_pdf)
    try:
        pages = [page.get_text("text").strip() for page in document]
    finally:
        document.close()
    output_path.write_text("\n\n".join(page for page in pages if page), encoding="utf-8")
    if not output_path.exists():
        raise RuntimeError("OCR text extraction did not produce a TXT file.")
    return output_path


def ocr_pdf_to_docx(pdf_path: Path, output_path: Path, workspace: Path) -> Path:
    searchable_pdf = workspace / f"{output_path.stem}-searchable.pdf"
    create_searchable_pdf(pdf_path, searchable_pdf)
    return pdf_to_docx(searchable_pdf, output_path)


def ocr_pdf_to_txt(pdf_path: Path, output_path: Path, workspace: Path) -> Path:
    searchable_pdf = workspace / f"{output_path.stem}-searchable.pdf"
    create_searchable_pdf(pdf_path, searchable_pdf)
    return searchable_pdf_to_txt(searchable_pdf, output_path)
