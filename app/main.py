
from __future__ import annotations

import shutil
import subprocess
import tempfile
import logging
import time
import uuid
from pathlib import Path

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from starlette.background import BackgroundTask

from .files import create_download_copy, save_uploaded_pdf
from .registry import OPERATIONS, execute_operation
from .settings import ALLOWED_ORIGINS


logger = logging.getLogger("pdfmint.engine")

app = FastAPI(
    title="PDFMint Engine",
    version="1.2.0",
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
        "tesseract": shutil.which("tesseract") is not None,
        "ocrmypdf": shutil.which("ocrmypdf") is not None,
        "operations": sorted(OPERATIONS.keys()),
    }
    return {
        "status": "ok" if checks["libreoffice"] and checks["tesseract"] and checks["ocrmypdf"] else "degraded",
        "service": "pdfmint-engine",
        "checks": checks,
    }


@app.get("/v1/capabilities")
def capabilities() -> dict:
    return {
        "operations": sorted(OPERATIONS.keys()),
        "planned": [
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

    job_id = f"PM-{uuid.uuid4().hex[:8].upper()}"
    started_at = time.monotonic()
    original_name = Path(file.filename or "document.pdf").name
    base_name = Path(original_name).stem or "document"

    logger.info(
        "JOB START id=%s operation=%s filename=%s",
        job_id,
        operation,
        original_name,
    )

    with tempfile.TemporaryDirectory(prefix=f"pdfmint-job-{job_id.lower()}-") as temporary_name:
        workspace = Path(temporary_name)
        pdf_path = await save_uploaded_pdf(file, workspace)

        try:
            result = execute_operation(operation, pdf_path, workspace, base_name)
        except subprocess.TimeoutExpired as exc:
            logger.exception("JOB TIMEOUT id=%s operation=%s", job_id, operation)
            raise HTTPException(
                status_code=504,
                detail=f"Conversion timed out. Reference: {job_id}"
            ) from exc
        except Exception as exc:
            logger.exception(
                "JOB FAILED id=%s operation=%s error=%s",
                job_id,
                operation,
                exc,
            )
            raise HTTPException(
                status_code=422,
                detail=(
                    f"{operation.replace('-', ' ').upper()} could not be completed. "
                    f"Reference: {job_id}. {exc}"
                )
            ) from exc

        download_path, download_dir = create_download_copy(
            result.path,
            result.filename,
        )

        logger.info(
            "JOB COMPLETE id=%s operation=%s duration_seconds=%.2f output_bytes=%s",
            job_id,
            operation,
            time.monotonic() - started_at,
            download_path.stat().st_size,
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
