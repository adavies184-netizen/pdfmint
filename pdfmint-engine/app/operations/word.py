from __future__ import annotations

import logging
import os
import shutil
import subprocess
import tempfile
from pathlib import Path
from typing import Iterable

import fitz
from docx import Document
from docx.enum.section import WD_SECTION
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.shared import Pt

from ..settings import JOB_TIMEOUT_SECONDS

logger = logging.getLogger("pdfmint.word")


def _anchor_picture_to_page(inline_shape) -> None:
    """Turn python-docx's inline picture into an exact page-positioned anchor."""
    inline = inline_shape._inline
    inline.tag = qn("wp:anchor")
    inline.set("distT", "0")
    inline.set("distB", "0")
    inline.set("distL", "0")
    inline.set("distR", "0")
    inline.set("simplePos", "0")
    inline.set("relativeHeight", "0")
    inline.set("behindDoc", "0")
    inline.set("locked", "1")
    inline.set("layoutInCell", "1")
    inline.set("allowOverlap", "1")

    simple_position = OxmlElement("wp:simplePos")
    simple_position.set("x", "0")
    simple_position.set("y", "0")

    horizontal = OxmlElement("wp:positionH")
    horizontal.set("relativeFrom", "page")
    horizontal_offset = OxmlElement("wp:posOffset")
    horizontal_offset.text = "0"
    horizontal.append(horizontal_offset)

    vertical = OxmlElement("wp:positionV")
    vertical.set("relativeFrom", "page")
    vertical_offset = OxmlElement("wp:posOffset")
    vertical_offset.text = "0"
    vertical.append(vertical_offset)

    wrap_none = OxmlElement("wp:wrapNone")
    inline.insert(0, simple_position)
    inline.insert(1, horizontal)
    inline.insert(2, vertical)
    effect_extent_index = next(
        (index for index, child in enumerate(inline) if child.tag == qn("wp:effectExtent")),
        3,
    )
    inline.insert(effect_extent_index + 1, wrap_none)


def pdf_to_docx(pdf_path: Path, output_path: Path) -> Path:
    """Create a fidelity-first Word document from the rendered PDF pages.

    PDF is a fixed-layout format. Reconstructing its drawing operators as Word
    paragraphs and shapes loses rules, signatures and exact positioning. Each
    source page is therefore rendered and placed edge-to-edge on an identically
    sized Word page so DOCX and the downstream DOC export preserve appearance.
    """
    source = fitz.open(str(pdf_path))
    if source.page_count < 1:
        source.close()
        raise RuntimeError("The PDF does not contain any pages.")

    document = Document()

    with tempfile.TemporaryDirectory(prefix="pdfmint-word-pages-") as temp_dir:
        try:
            for page_index, page in enumerate(source):
                if page_index == 0:
                    section = document.sections[0]
                    paragraph = document.add_paragraph()
                else:
                    section = document.add_section(WD_SECTION.NEW_PAGE)
                    paragraph = document.paragraphs[-1]

                page_width = float(page.rect.width)
                page_height = float(page.rect.height)
                section.page_width = Pt(page_width)
                section.page_height = Pt(page_height)
                section.top_margin = Pt(0)
                section.bottom_margin = Pt(0)
                section.left_margin = Pt(0)
                section.right_margin = Pt(0)
                section.header_distance = Pt(0)
                section.footer_distance = Pt(0)

                paragraph.paragraph_format.space_before = Pt(0)
                paragraph.paragraph_format.space_after = Pt(0)

                image_path = Path(temp_dir) / f"page-{page_index + 1}.png"
                pixmap = page.get_pixmap(matrix=fitz.Matrix(2.5, 2.5), alpha=False)
                pixmap.save(str(image_path))
                picture = paragraph.add_run().add_picture(
                    str(image_path),
                    width=Pt(page_width),
                    height=Pt(page_height),
                )
                _anchor_picture_to_page(picture)

            document.save(str(output_path))
        finally:
            source.close()

    if not output_path.exists() or output_path.stat().st_size == 0:
        raise RuntimeError("DOCX conversion did not produce a valid file.")

    logger.info(
        "Fidelity-first DOCX created path=%s size_bytes=%s",
        output_path,
        output_path.stat().st_size,
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
