
from __future__ import annotations

import os
import subprocess
from pathlib import Path
from pdf2docx import Converter

from ..settings import JOB_TIMEOUT_SECONDS


def pdf_to_docx(pdf_path: Path, output_path: Path) -> Path:
    converter = Converter(str(pdf_path))
    try:
        converter.convert(str(output_path), start=0, end=None)
    finally:
        converter.close()

    if not output_path.exists() or output_path.stat().st_size == 0:
        raise RuntimeError("DOCX conversion did not produce a valid file.")
    return output_path


def docx_to_doc(docx_path: Path, output_dir: Path) -> Path:
    libreoffice_home = output_dir / "libreoffice-home"
    libreoffice_home.mkdir(parents=True, exist_ok=True)

    result = subprocess.run(
        [
            "soffice",
            "--headless",
            "--nologo",
            "--nodefault",
            "--nolockcheck",
            "--nofirststartwizard",
            "--convert-to",
            'doc:"MS Word 97"',
            "--outdir",
            str(output_dir),
            str(docx_path),
        ],
        capture_output=True,
        text=True,
        timeout=JOB_TIMEOUT_SECONDS,
        check=False,
        env={**os.environ, "HOME": str(libreoffice_home)},
    )

    doc_path = output_dir / f"{docx_path.stem}.doc"
    if result.returncode != 0 or not doc_path.exists():
        details = (result.stderr or result.stdout or "LibreOffice failed.").strip()
        raise RuntimeError(details[:1000])
    return doc_path


def pdf_to_doc(pdf_path: Path, output_dir: Path, base_name: str) -> Path:
    docx_path = output_dir / f"{base_name}.docx"
    pdf_to_docx(pdf_path, docx_path)
    return docx_to_doc(docx_path, output_dir)
