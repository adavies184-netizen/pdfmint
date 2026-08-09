from __future__ import annotations

import shutil
import subprocess
import zipfile
from pathlib import Path

from .powerpoint import pdf_to_ppt
from .spreadsheet import pdf_to_xlsx
from .word import pdf_to_doc, pdf_to_docx


ROUTES: dict[str, tuple[set[str], str]] = {
    "pages-to-doc": ({".pages"}, "doc"),
    "pages-to-docx": ({".pages"}, "docx"),
    "hwp-to-docx": ({".hwp", ".hwpx"}, "docx"),
    "wps-to-word": ({".wps"}, "docx"),
    "odt-to-word": ({".odt"}, "docx"),
    "odt-to-doc": ({".odt"}, "doc"),
    "csv-to-excel": ({".csv"}, "xlsx"),
    "numbers-to-xlsx": ({".numbers"}, "xlsx"),
    "docx-to-doc": ({".docx"}, "doc"),
    "key-to-ppt": ({".key"}, "ppt"),
    "pptx-to-ppt": ({".pptx"}, "ppt"),
    "xlsx-to-csv": ({".xlsx"}, "csv"),
}


def _run(args: list[str], timeout: int = 300) -> None:
    result = subprocess.run(args, capture_output=True, text=True, timeout=timeout)
    if result.returncode:
        detail = (result.stderr or result.stdout or "Conversion command failed.").strip()
        raise RuntimeError(detail[-1200:])


def _soffice(input_path: Path, workspace: Path, base_name: str, target: str) -> Path:
    before = set(workspace.iterdir())
    _run(["soffice", "--headless", "--convert-to", target, "--outdir", str(workspace), str(input_path)])
    preferred = workspace / f"{input_path.stem}.{target}"
    candidates = [path for path in workspace.glob(f"*.{target}") if path not in before]
    source = preferred if preferred.exists() else (candidates[0] if candidates else None)
    if not source:
        raise RuntimeError(f"LibreOffice did not create a {target.upper()} file.")
    output = workspace / f"{base_name}.{target}"
    if source != output:
        shutil.move(str(source), str(output))
    return output


def _iwork_preview(input_path: Path, workspace: Path) -> Path:
    try:
        with zipfile.ZipFile(input_path) as archive:
            preview = next((name for name in archive.namelist() if name.lower().endswith("preview.pdf")), None)
            if not preview:
                preview = next((name for name in archive.namelist() if name.lower().endswith("preview-web.pdf")), None)
            if not preview:
                raise RuntimeError("No PDF preview was found in this Apple iWork file.")
            destination = workspace / "iwork-preview.pdf"
            with archive.open(preview) as source, destination.open("wb") as output:
                shutil.copyfileobj(source, output)
            return destination
    except zipfile.BadZipFile as exc:
        raise RuntimeError("The uploaded Apple iWork document is not a supported package.") from exc


def convert_office_document(operation: str, input_path: Path, workspace: Path, base_name: str) -> Path:
    allowed, target = ROUTES[operation]
    if input_path.suffix.lower() not in allowed:
        raise ValueError(f"This converter accepts: {', '.join(sorted(allowed))}.")

    if operation.startswith("pages-to-"):
        preview = _iwork_preview(input_path, workspace)
        if target == "docx":
            output = workspace / f"{base_name}.docx"
            pdf_to_docx(preview, output)
            return output
        return pdf_to_doc(preview, workspace, base_name)

    if operation == "numbers-to-xlsx":
        preview = _iwork_preview(input_path, workspace)
        output = workspace / f"{base_name}.xlsx"
        pdf_to_xlsx(preview, output)
        return output

    if operation == "key-to-ppt":
        preview = _iwork_preview(input_path, workspace)
        return pdf_to_ppt(preview, workspace, base_name)

    return _soffice(input_path, workspace, base_name, target)
