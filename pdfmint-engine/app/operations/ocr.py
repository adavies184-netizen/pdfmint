from __future__ import annotations

import logging
import subprocess
from pathlib import Path

import fitz

from ..settings import JOB_TIMEOUT_SECONDS
from .word import pdf_to_docx
from . import process

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
    result = process.run(
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


# Editor "Make text editable": one page, light on memory and CPU.
# The page is rendered once at a capped size (big screenshots are shrunk) and read by Tesseract
# directly - no deskew/rotation/optimisation passes. Output: the page picture plus an invisible
# text layer, as a one-page PDF the same size as the original page.
EDITOR_OCR_MAX_PIXELS = 9_000_000
EDITOR_OCR_MAX_SIDE = 4200
EDITOR_OCR_DPI = 300


def ocr_single_page(pdf_path: Path, output_path: Path, workspace: Path) -> Path:
    document = fitz.open(pdf_path)
    try:
        if document.page_count < 1:
            raise ValueError("The page is empty.")
        page = document[0]
        width_pt, height_pt = page.rect.width, page.rect.height
        zoom = EDITOR_OCR_DPI / 72
        zoom = min(zoom, (EDITOR_OCR_MAX_PIXELS / max(1.0, width_pt * height_pt)) ** 0.5)
        zoom = min(zoom, EDITOR_OCR_MAX_SIDE / max(width_pt, height_pt))
        zoom = max(zoom, 0.5)
        pixmap = page.get_pixmap(matrix=fitz.Matrix(zoom, zoom), alpha=False)
        image_path = workspace / "page.png"
        pixmap.save(image_path)
        pixel_width = pixmap.width
        pixmap = None
    finally:
        document.close()
    dpi = max(10, round(pixel_width / (width_pt / 72)))
    base = workspace / "page-ocr"
    command = ["tesseract", str(image_path), str(base), "-l", "eng", "--dpi", str(dpi), "pdf"]
    logger.info("Editor OCR command: %s (zoom %.2f)", " ".join(command), zoom)
    result = process.run(command, capture_output=True, text=True, timeout=min(JOB_TIMEOUT_SECONDS, 120), check=False)
    produced = base.with_suffix(".pdf")
    if result.returncode != 0 or not produced.exists() or produced.stat().st_size == 0:
        details = (result.stderr or result.stdout or "Tesseract did not produce an output.").strip()
        raise RuntimeError(details[:1800])
    produced.replace(output_path)
    return output_path
