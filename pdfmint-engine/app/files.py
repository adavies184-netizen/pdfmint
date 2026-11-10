from __future__ import annotations

from pathlib import Path

from fastapi import HTTPException, UploadFile

from .settings import MAX_UPLOAD_BYTES

CHUNK_BYTES = 1024 * 1024


async def _stream_to_disk(upload: UploadFile, destination: Path) -> int:
    """Copy the upload to disk in 1 MB chunks, enforcing the size limit."""
    total = 0
    try:
        with destination.open("wb") as output:
            while chunk := await upload.read(CHUNK_BYTES):
                total += len(chunk)
                if total > MAX_UPLOAD_BYTES:
                    raise HTTPException(
                        status_code=413,
                        detail=f"File exceeds the {MAX_UPLOAD_BYTES // (1024 * 1024)} MB limit.",
                    )
                output.write(chunk)
    finally:
        await upload.close()
    return total


async def save_uploaded_pdf(upload: UploadFile, directory: Path) -> Path:
    destination = directory / "input.pdf"
    await _stream_to_disk(upload, destination)
    with destination.open("rb") as handle:
        if handle.read(5) != b"%PDF-":
            raise HTTPException(status_code=415, detail="The uploaded file is not a valid PDF.")
    return destination


async def save_uploaded_file(upload: UploadFile, directory: Path) -> Path:
    """Save a converter upload while preserving its (lower-cased) extension."""
    original = Path(upload.filename or "upload.bin").name
    destination = directory / f"input{Path(original).suffix.lower()}"
    if not await _stream_to_disk(upload, destination):
        raise HTTPException(status_code=415, detail="The uploaded file is empty.")
    return destination
