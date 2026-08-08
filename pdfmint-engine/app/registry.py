
from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Callable

from .operations.word import pdf_to_doc, pdf_to_docx
from .operations.spreadsheet import pdf_to_xls, pdf_to_xlsx
from .operations.powerpoint import pdf_to_ppt, pdf_to_pptx


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


OPERATIONS: dict[str, Callable[[Path, Path, str], OperationResult]] = {
    "pdf-to-docx": run_pdf_to_docx,
    "pdf-to-doc": run_pdf_to_doc,
    "pdf-to-xlsx": run_pdf_to_xlsx,
    "pdf-to-xls": run_pdf_to_xls,
    "pdf-to-pptx": run_pdf_to_pptx,
    "pdf-to-ppt": run_pdf_to_ppt,
}


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
