
from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Callable

from .operations.word import pdf_to_doc, pdf_to_docx
from .operations.spreadsheet import pdf_to_xls, pdf_to_xlsx
from .operations.powerpoint import pdf_to_ppt, pdf_to_pptx
from .operations.compress import compress_pdf
from .operations.ocr import create_searchable_pdf, ocr_pdf_to_docx, ocr_pdf_to_txt
from .operations.image_conversions import ROUTES as IMAGE_ROUTES, convert_image_route


@dataclass(frozen=True)
class OperationResult:
    path: Path
    filename: str
    media_type: str


def run_pdf_to_docx(pdf_path: Path, workspace: Path, base_name: str) -> OperationResult:
    output = workspace / f"{base_name}.docx"
    pdf_to_docx(pdf_path, output)
    return OperationResult(
        path=output,
        filename=output.name,
        media_type=(
            "application/vnd.openxmlformats-officedocument."
            "wordprocessingml.document"
        ),
    )


def run_pdf_to_doc(pdf_path: Path, workspace: Path, base_name: str) -> OperationResult:
    output = pdf_to_doc(pdf_path, workspace, base_name)
    return OperationResult(
        path=output,
        filename=output.name,
        media_type="application/msword",
    )




def run_pdf_to_xlsx(pdf_path: Path, workspace: Path, base_name: str) -> OperationResult:
    output = workspace / f"{base_name}.xlsx"
    pdf_to_xlsx(pdf_path, output)
    return OperationResult(
        path=output,
        filename=output.name,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    )


def run_pdf_to_xls(pdf_path: Path, workspace: Path, base_name: str) -> OperationResult:
    output = pdf_to_xls(pdf_path, workspace, base_name)
    return OperationResult(
        path=output,
        filename=output.name,
        media_type="application/vnd.ms-excel",
    )




def run_pdf_to_pptx(pdf_path: Path, workspace: Path, base_name: str) -> OperationResult:
    output = workspace / f"{base_name}.pptx"
    pdf_to_pptx(pdf_path, output)
    return OperationResult(
        path=output,
        filename=output.name,
        media_type="application/vnd.openxmlformats-officedocument.presentationml.presentation",
    )


def run_pdf_to_ppt(pdf_path: Path, workspace: Path, base_name: str) -> OperationResult:
    output = pdf_to_ppt(pdf_path, workspace, base_name)
    return OperationResult(
        path=output,
        filename=output.name,
        media_type="application/vnd.ms-powerpoint",
    )




def run_compress_pdf_light(
    pdf_path: Path,
    workspace: Path,
    base_name: str,
) -> OperationResult:
    output = workspace / f"{base_name}-compressed.pdf"
    compress_pdf(pdf_path, output, "light")
    return OperationResult(
        path=output,
        filename=output.name,
        media_type="application/pdf",
    )


def run_compress_pdf_standard(
    pdf_path: Path,
    workspace: Path,
    base_name: str,
) -> OperationResult:
    output = workspace / f"{base_name}-compressed.pdf"
    compress_pdf(pdf_path, output, "standard")
    return OperationResult(
        path=output,
        filename=output.name,
        media_type="application/pdf",
    )


def run_compress_pdf_high(
    pdf_path: Path,
    workspace: Path,
    base_name: str,
) -> OperationResult:
    output = workspace / f"{base_name}-compressed.pdf"
    compress_pdf(pdf_path, output, "high")
    return OperationResult(
        path=output,
        filename=output.name,
        media_type="application/pdf",
    )


def run_ocr_pdf(pdf_path: Path, workspace: Path, base_name: str) -> OperationResult:
    output = workspace / f"{base_name}-searchable.pdf"
    create_searchable_pdf(pdf_path, output)
    return OperationResult(output, output.name, "application/pdf")


def run_ocr_docx(pdf_path: Path, workspace: Path, base_name: str) -> OperationResult:
    output = workspace / f"{base_name}-ocr.docx"
    ocr_pdf_to_docx(pdf_path, output, workspace)
    return OperationResult(
        output,
        output.name,
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    )


def run_ocr_txt(pdf_path: Path, workspace: Path, base_name: str) -> OperationResult:
    output = workspace / f"{base_name}-ocr.txt"
    ocr_pdf_to_txt(pdf_path, output, workspace)
    return OperationResult(output, output.name, "text/plain; charset=utf-8")


MEDIA_TYPES = {
    ".jpg": "image/jpeg", ".png": "image/png", ".gif": "image/gif",
    ".svg": "image/svg+xml", ".eps": "application/postscript",
    ".ico": "image/x-icon", ".dxf": "image/vnd.dxf", ".zip": "application/zip",
    ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
}


def make_image_handler(operation: str):
    def handler(input_path: Path, workspace: Path, base_name: str) -> OperationResult:
        output, suffix = convert_image_route(operation, input_path, workspace, base_name)
        return OperationResult(output, output.name, MEDIA_TYPES.get(suffix, "application/octet-stream"))
    return handler


OPERATIONS: dict[str, Callable[[Path, Path, str], OperationResult]] = {
    "pdf-to-docx": run_pdf_to_docx,
    "pdf-to-doc": run_pdf_to_doc,
    "pdf-to-xlsx": run_pdf_to_xlsx,
    "pdf-to-xls": run_pdf_to_xls,
    "pdf-to-pptx": run_pdf_to_pptx,
    "pdf-to-ppt": run_pdf_to_ppt,
    "compress-pdf-light": run_compress_pdf_light,
    "compress-pdf-standard": run_compress_pdf_standard,
    "compress-pdf-high": run_compress_pdf_high,
    "ocr-pdf": run_ocr_pdf,
    "ocr-docx": run_ocr_docx,
    "ocr-txt": run_ocr_txt,
}

for image_operation in IMAGE_ROUTES:
    OPERATIONS[image_operation] = make_image_handler(image_operation)


def execute_operation(
    operation: str,
    pdf_path: Path,
    workspace: Path,
    base_name: str,
) -> OperationResult:
    handler = OPERATIONS.get(operation)
    if not handler:
        raise ValueError(f"Unsupported operation: {operation}")
    return handler(pdf_path, workspace, base_name)
