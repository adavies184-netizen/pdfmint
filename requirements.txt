from __future__ import annotations

import logging
import os
import subprocess
from pathlib import Path

from pdf2docx import Converter

from ..settings import JOB_TIMEOUT_SECONDS

logger = logging.getLogger("pdfmint.word")


def pdf_to_docx(pdf_path: Path, output_path: Path) -> Path:
    converter = Converter(str(pdf_path))
    try:
        converter.convert(str(output_path), start=0, end=None)
    finally:
        converter.close()

    if not output_path.exists() or output_path.stat().st_size == 0:
        raise RuntimeError("DOCX conversion did not produce a valid file.")

    logger.info(
        "DOCX created path=%s size_bytes=%s",
        output_path,
        output_path.stat().st_size,
    )
    return output_path


def docx_to_doc(docx_path: Path, output_dir: Path) -> Path:
    libreoffice_home = output_dir / "libreoffice-home"
    libreoffice_home.mkdir(parents=True, exist_ok=True)

    command = [
        "soffice",
        "--headless",
        "--invisible",
        "--nologo",
        "--nodefault",
        "--nolockcheck",
        "--nofirststartwizard",
        "--norestore",
        f"-env:UserInstallation=file://{libreoffice_home}",
        "--convert-to",
        'doc:"MS Word 97"',
        "--outdir",
        str(output_dir),
        str(docx_path),
    ]

    logger.info("========== DOC CONVERSION START ==========")
    logger.info("Input DOCX: %s", docx_path)
    logger.info("Input size bytes: %s", docx_path.stat().st_size if docx_path.exists() else -1)
    logger.info("Output directory: %s", output_dir)
    logger.info("Command: %s", " ".join(command))

    result = subprocess.run(
        command,
        capture_output=True,
        text=True,
        timeout=JOB_TIMEOUT_SECONDS,
        check=False,
        env={
            **os.environ,
            "HOME": str(libreoffice_home),
            "SAL_USE_VCLPLUGIN": "svp",
            "JAVA_TOOL_OPTIONS": "-Xms16m -Xmx64m",
        },
    )

    doc_path = output_dir / f"{docx_path.stem}.doc"

    logger.info("LibreOffice exit code: %s", result.returncode)
    logger.info("LibreOffice stdout: %s", (result.stdout or "").strip()[:4000])
    logger.info("LibreOffice stderr: %s", (result.stderr or "").strip()[:4000])
    logger.info("Output exists: %s", doc_path.exists())
    logger.info("Output size bytes: %s", doc_path.stat().st_size if doc_path.exists() else -1)
    logger.info("========== DOC CONVERSION END ==========")

    if result.returncode != 0 or not doc_path.exists() or doc_path.stat().st_size == 0:
        details = (
            result.stderr
            or result.stdout
            or "LibreOffice did not create the DOC file."
        ).strip()
        raise RuntimeError(
            "LibreOffice DOC conversion failed. "
            f"Exit code {result.returncode}. {details[:1200]}"
        )

    return doc_path


def pdf_to_doc(pdf_path: Path, output_dir: Path, base_name: str) -> Path:
    docx_path = output_dir / f"{base_name}.docx"
    pdf_to_docx(pdf_path, docx_path)
    return docx_to_doc(docx_path, output_dir)
