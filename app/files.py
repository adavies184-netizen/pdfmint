
from __future__ import annotations

import shutil
import tempfile
from pathlib import Path
from fastapi import HTTPException, UploadFile

from .settings import MAX_UPLOAD_BYTES


async def save_uploaded_pdf(upload: UploadFile, directory: Path) -> Path:
    destination = directory / "input.pdf"
    total = 0

    with destination.open("wb") as output:
        while chunk := await upload.read(1024 * 1024):
            total += len(chunk)
            if total > MAX_UPLOAD_BYTES:
                raise HTTPException(
                    status_code=413,
                    detail=f"File exceeds the {MAX_UPLOAD_BYTES // (1024 * 1024)} MB limit."
                )
            output.write(chunk)

    await upload.close()

    with destination.open("rb") as handle:
        if handle.read(5) != b"%PDF-":
            raise HTTPException(status_code=415, detail="The uploaded file is not a valid PDF.")

    return destination


async def save_uploaded_file(upload: UploadFile, directory: Path) -> Path:
    """Save a converter upload while preserving its safe extension."""
    original = Path(upload.filename or "upload.bin").name
    destination = directory / f"input{Path(original).suffix.lower()}"
    total = 0
    with destination.open("wb") as output:
        while chunk := await upload.read(1024 * 1024):
            total += len(chunk)
            if total > MAX_UPLOAD_BYTES:
                raise HTTPException(
                    status_code=413,
                    detail=f"File exceeds the {MAX_UPLOAD_BYTES // (1024 * 1024)} MB limit."
                )
            output.write(chunk)
    await upload.close()
    if not total:
        raise HTTPException(status_code=415, detail="The uploaded file is empty.")
    return destination


def create_download_copy(source: Path, filename: str) -> tuple[Path, Path]:
    persistent_dir = Path(tempfile.mkdtemp(prefix="pdfmint-download-"))
    destination = persistent_dir / filename
    shutil.copy2(source, destination)
    return destination, persistent_dir
