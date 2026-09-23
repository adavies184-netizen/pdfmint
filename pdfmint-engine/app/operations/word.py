from __future__ import annotations

import logging
import os
import shutil
import subprocess
from pathlib import Path
from typing import Iterable

from pdf2docx import Converter

from ..settings import JOB_TIMEOUT_SECONDS
from .word_vectors import (
    parsed_table_bboxes,
    needs_positioned_text,
    pdf2docx_layout_settings,
    preserve_pdf_vectors,
)

logger = logging.getLogger("pdfmint.word")


def pdf_to_docx(pdf_path: Path, output_path: Path) -> Path:
    converter = Converter(str(pdf_path))
    try:
        settings = converter.default_settings
        settings.update(pdf2docx_layout_settings(pdf_path))
        converter.parse(start=0, end=None, **settings)
        table_regions = parsed_table_bboxes(converter.store())
        converter.make_docx(str(output_path), **settings)
    finally:
        converter.close()

    if not output_path.exists() or output_path.stat().st_size == 0:
        raise RuntimeError("DOCX conversion did not produce a valid file.")

    vector_result = preserve_pdf_vectors(
        pdf_path,
        output_path,
        table_regions,
        position_text=needs_positioned_text(pdf_path),
    )

    logger.info(
        "DOCX created path=%s size_bytes=%s vector_shapes=%s form_widgets=%s "
        "vector_pages=%s skipped_table_shapes=%s skipped_control_appearances=%s "
        "positioned_text_boxes=%s",
        output_path,
        output_path.stat().st_size,
        vector_result["shapes"],
        vector_result["widgets"],
        vector_result["pages_with_vectors"],
        vector_result["skipped_table_shapes"],
        vector_result["skipped_control_appearances"],
        vector_result["positioned_text_boxes"],
    )
    return output_path


def _remove_old_doc_output(doc_path: Path) -> None:
    try:
        if doc_path.exists():
            doc_path.unlink()
    except OSError:
        logger.warning("Could not remove previous DOC output: %s", doc_path)


def _run_libreoffice_export(
    docx_path: Path,
    output_dir: Path,
    libreoffice_home: Path,
    convert_to: str,
) -> tuple[subprocess.CompletedProcess[str], Path]:
    doc_path = output_dir / f"{docx_path.stem}.doc"
    _remove_old_doc_output(doc_path)

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
        convert_to,
        "--outdir",
        str(output_dir),
        str(docx_path),
    ]

    logger.info("LibreOffice attempt convert_to=%s", convert_to)
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

    logger.info("LibreOffice exit code: %s", result.returncode)
    logger.info("LibreOffice stdout: %s", (result.stdout or "").strip()[:4000])
    logger.info("LibreOffice stderr: %s", (result.stderr or "").strip()[:4000])
    logger.info("Output exists: %s", doc_path.exists())
    logger.info("Output size bytes: %s", doc_path.stat().st_size if doc_path.exists() else -1)

    return result, doc_path


def _candidate_doc_filters() -> Iterable[str]:
    yield "doc"
    yield 'doc:"MS Word 97"'
    yield 'doc:"MS Word 95"'
    yield 'doc:"Office Open XML Text"'


def docx_to_doc(docx_path: Path, output_dir: Path) -> Path:
    libreoffice_home = output_dir / "libreoffice-home"
    libreoffice_home.mkdir(parents=True, exist_ok=True)

    logger.info("========== DOC CONVERSION START ==========")
    logger.info("Input DOCX: %s", docx_path)
    logger.info("Input size bytes: %s", docx_path.stat().st_size if docx_path.exists() else -1)
    logger.info("Output directory: %s", output_dir)

    failures: list[str] = []

    for convert_to in _candidate_doc_filters():
        attempt_slug = (
            convert_to.replace('"', "")
            .replace(":", "-")
            .replace(" ", "-")
            .lower()
        )
        attempt_home = libreoffice_home / attempt_slug
        if attempt_home.exists():
            shutil.rmtree(attempt_home, ignore_errors=True)
        attempt_home.mkdir(parents=True, exist_ok=True)

        try:
            result, doc_path = _run_libreoffice_export(
                docx_path=docx_path,
                output_dir=output_dir,
                libreoffice_home=attempt_home,
                convert_to=convert_to,
            )
        except subprocess.TimeoutExpired:
            logger.exception("LibreOffice timed out for convert_to=%s", convert_to)
            failures.append(f"{convert_to}: timed out")
            continue

        if doc_path.exists() and doc_path.stat().st_size > 0 and result.returncode == 0:
            logger.info("DOC export succeeded with convert_to=%s", convert_to)
            logger.info("========== DOC CONVERSION END ==========")
            return doc_path

        details = (result.stderr or result.stdout or "No DOC output was produced.").strip()
        failures.append(f"{convert_to}: exit={result.returncode}; {details[:600]}")

    logger.info("========== DOC CONVERSION END ==========")
    raise RuntimeError(
        "LibreOffice could not export DOC using any supported filter. "
        + " | ".join(failures)
    )


def pdf_to_doc(pdf_path: Path, output_dir: Path, base_name: str) -> Path:
    docx_path = output_dir / f"{base_name}.docx"
    pdf_to_docx(pdf_path, docx_path)
    return docx_to_doc(docx_path, output_dir)
