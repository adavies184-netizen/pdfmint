
from __future__ import annotations

import shutil
import subprocess
import tempfile
from pathlib import Path

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from starlette.background import BackgroundTask

from .files import create_download_copy, save_uploaded_pdf
from .registry import OPERATIONS, execute_operation
from .settings import ALLOWED_ORIGINS


app = FastAPI(
    title="PDFMint Engine",
    version="1.0.0",
    docs_url="/docs",
    redoc_url=None,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
    expose_headers=["Content-Disposition"],
)


@app.get("/v1/health")
def health() -> dict:
    checks = {
        "libreoffice": shutil.which("soffice") is not None,
        "operations": sorted(OPERATIONS.keys()),
    }
    return {
        "status": "ok" if checks["libreoffice"] else "degraded",
        "service": "pdfmint-engine",
        "checks": checks,
    }


@app.get("/v1/capabilities")
def capabilities() -> dict:
    return {
        "operations": sorted(OPERATIONS.keys()),
        "planned": [
            "ocr-pdf",
            "compress-pdf",
            "merge-pdf",
            "split-pdf",
            "rotate-pdf",
            "watermark-pdf",
        ],
    }


@app.post("/v1/jobs")
async def create_job(
    file: UploadFile = File(...),
    operation: str = Form(...),
):
    if operation not in OPERATIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported operation '{operation}'."
        )

    original_name = Path(file.filename or "document.pdf").name
    base_name = Path(original_name).stem or "document"

    with tempfile.TemporaryDirectory(prefix="pdfmint-job-") as temporary_name:
        workspace = Path(temporary_name)
        pdf_path = await save_uploaded_pdf(file, workspace)

        try:
            result = execute_operation(operation, pdf_path, workspace, base_name)
        except subprocess.TimeoutExpired as exc:
            raise HTTPException(status_code=504, detail="The conversion timed out.") from exc
        except Exception as exc:
            raise HTTPException(
                status_code=422,
                detail=f"Operation '{operation}' failed: {exc}"
            ) from exc

        download_path, download_dir = create_download_copy(
            result.path,
            result.filename,
        )

        return FileResponse(
            path=download_path,
            filename=result.filename,
            media_type=result.media_type,
            background=BackgroundTask(
                shutil.rmtree,
                download_dir,
                ignore_errors=True,
            ),
        )
