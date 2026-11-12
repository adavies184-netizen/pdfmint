from __future__ import annotations

import asyncio
import json
import logging
import os
import shutil
import signal
import subprocess
import sys
import tempfile
import time
import uuid
from contextlib import asynccontextmanager
from functools import lru_cache
from pathlib import Path

from fastapi import FastAPI, File, Form, Header, HTTPException, Query, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from starlette.background import BackgroundTask

from .admin import (
    AdminDeleteRequest,
    CookieConsentSettingRequest,
    EditorLayoutSettingRequest,
    PaymentWallSettingRequest,
    ProviderSelectionRequest,
    admin_cookie_consent_setting,
    admin_cookie_consent_stats,
    admin_editor_layout_setting,
    admin_funnel,
    admin_visitors,
    admin_overview,
    admin_payment_wall_setting,
    cookie_consent_setting,
    delete_admin_documents,
    delete_admin_members,
    editor_layout_setting,
    payment_wall_setting,
    select_payment_provider,
    update_cookie_consent_setting,
    update_editor_layout_setting,
    update_payment_wall_setting,
)
from .analytics import AnalyticsEventRequest, CookieConsentEventRequest, PresencePing, record_presence, store_analytics_event, store_cookie_consent_event
from .billing import (
    CheckoutRequest,
    ConsentEvidenceRequest,
    ManageSubscriptionRequest,
    WelcomeEmailRequest,
    checkout_public_config,
    create_checkout,
    manage_subscription,
    record_consent_evidence,
    send_welcome_email,
    stripe_webhook,
)
from .files import save_uploaded_file, save_uploaded_pdf
from .http_client import close_http
from .memory_guard import guard_threshold_bytes, memory_used_bytes
from .results import OperationResult
from .settings import ALLOWED_ORIGINS, JOB_CONCURRENCY, JOB_HARD_TIMEOUT_SECONDS, JOB_QUEUE_LIMIT
from .support import SupportMessageRequest, send_support_message


logger = logging.getLogger("pdfmint.engine")
ENGINE_VERSION = "1.26.0"
APP_ROOT = Path(__file__).resolve().parents[1]


def _load_operation_names() -> frozenset[str]:
    """Ask a worker process for the operation list so the web server never has
    to import the conversion libraries itself (saves a lot of memory)."""
    completed = subprocess.run(
        [sys.executable, "-m", "app.worker", "--list"],
        cwd=str(APP_ROOT), capture_output=True, text=True, timeout=180, check=True,
    )
    return frozenset(json.loads(completed.stdout.strip().splitlines()[-1]))


OPERATIONS = _load_operation_names()

REQUIRED_TOOLS = {
    "libreoffice": ("soffice",),
    "tesseract": ("tesseract",),
    "ocrmypdf": ("ocrmypdf",),
    "ebook_convert": ("ebook-convert",),
    "pstoedit": ("pstoedit",),
    "ffmpeg": ("ffmpeg",),
    "7zip": ("7z",),
    "libredwg": ("dwg2dxf", "dxf2dwg"),
}

# Each conversion runs in its own child process (app/worker.py), so a long or
# memory-hungry LibreOffice/OCR job never freezes or kills checkout, the Stripe
# webhook, admin or health checks. The semaphore caps how many run at once
# (memory is the engine's tightest resource).
_job_slots = asyncio.Semaphore(JOB_CONCURRENCY)
_jobs_waiting = 0


@asynccontextmanager
async def lifespan(_: FastAPI):
    yield
    await close_http()


app = FastAPI(
    title="PDFBreeze Engine",
    version=ENGINE_VERSION,
    docs_url="/docs",
    redoc_url=None,
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["Content-Disposition"],
    max_age=86400,
)


@lru_cache(maxsize=1)
def _tool_checks() -> dict[str, bool]:
    # Installed tools only change with a new image, so check them once.
    return {
        name: all(shutil.which(binary) is not None for binary in binaries)
        for name, binaries in REQUIRED_TOOLS.items()
    }


@app.get("/v1/health")
def health() -> dict:
    tools = _tool_checks()
    return {
        "status": "ok" if all(tools.values()) else "degraded",
        "service": "pdfmint-engine",
        "version": ENGINE_VERSION,
        "checks": {**tools, "operations": sorted(OPERATIONS)},
        "jobs": {"concurrency": JOB_CONCURRENCY, "waiting": _jobs_waiting},
    }


@app.get("/v1/capabilities")
def capabilities() -> dict:
    return {
        "service": "pdfmint-engine",
        "version": ENGINE_VERSION,
        "operations": sorted(OPERATIONS),
        "planned": ["merge-pdf", "split-pdf", "rotate-pdf", "watermark-pdf"],
    }


@app.post("/v1/billing/checkout")
async def billing_checkout(payload: CheckoutRequest, authorization: str | None = Header(default=None)):
    return await create_checkout(payload, authorization)


@app.get("/v1/billing/config")
async def billing_public_config(
    mode: str | None = Query(default=None, pattern="^(sandbox|live)$"),
    authorization: str | None = Header(default=None),
):
    return await checkout_public_config(mode, authorization)


@app.post("/v1/billing/stripe-webhook")
async def billing_stripe_webhook(request: Request, stripe_signature: str | None = Header(default=None, alias="Stripe-Signature")):
    return await stripe_webhook(request, stripe_signature)


@app.post("/v1/billing/welcome-email")
async def billing_welcome_email(payload: WelcomeEmailRequest, authorization: str | None = Header(default=None)):
    return await send_welcome_email(payload, authorization)


@app.post("/v1/billing/manage-subscription")
async def billing_manage_subscription(payload: ManageSubscriptionRequest, authorization: str | None = Header(default=None)):
    return await manage_subscription(payload, authorization)


@app.post("/v1/billing/consent-evidence")
async def billing_consent_evidence(payload: ConsentEvidenceRequest, request: Request, authorization: str | None = Header(default=None)):
    return await record_consent_evidence(payload, request, authorization)


@app.get("/v1/admin/overview")
async def admin_dashboard_overview(
    authorization: str | None = Header(default=None),
    day: str | None = Query(default=None, pattern=r"^\d{4}-\d{2}-\d{2}$"),
):
    return await admin_overview(authorization, day)


@app.get("/v1/admin/funnel")
async def admin_conversion_funnel(
    authorization: str | None = Header(default=None),
    days: int = Query(default=7, ge=1, le=90),
    landing_page: str | None = Query(default=None, max_length=120),
    day: str | None = Query(default=None, pattern=r"^\d{4}-\d{2}-\d{2}$"),
    start: str | None = Query(default=None, pattern=r"^\d{4}-\d{2}-\d{2}$"),
    end: str | None = Query(default=None, pattern=r"^\d{4}-\d{2}-\d{2}$"),
):
    return await admin_funnel(authorization, days, landing_page, day, start, end)


@app.post("/v1/admin/payment-provider")
async def admin_payment_provider(payload: ProviderSelectionRequest, authorization: str | None = Header(default=None)):
    return await select_payment_provider(payload, authorization)


@app.get("/v1/site/cookie-consent")
async def website_cookie_consent_setting():
    return await cookie_consent_setting()


@app.post("/v1/site/cookie-consent/event")
async def website_cookie_consent_event(payload: CookieConsentEventRequest, request: Request):
    return await store_cookie_consent_event(payload, request)


@app.get("/v1/admin/cookie-consent")
async def get_admin_cookie_consent_setting(authorization: str | None = Header(default=None)):
    return await admin_cookie_consent_setting(authorization)


@app.get("/v1/admin/cookie-consent/stats")
async def get_admin_cookie_consent_stats(authorization: str | None = Header(default=None)):
    return await admin_cookie_consent_stats(authorization)


@app.post("/v1/admin/cookie-consent")
async def set_admin_cookie_consent_setting(payload: CookieConsentSettingRequest, authorization: str | None = Header(default=None)):
    return await update_cookie_consent_setting(payload, authorization)


@app.get("/v1/site/payment-wall")
async def website_payment_wall_setting():
    return await payment_wall_setting()


@app.get("/v1/admin/payment-wall")
async def get_admin_payment_wall_setting(authorization: str | None = Header(default=None)):
    return await admin_payment_wall_setting(authorization)


@app.post("/v1/admin/payment-wall")
async def set_admin_payment_wall_setting(payload: PaymentWallSettingRequest, authorization: str | None = Header(default=None)):
    return await update_payment_wall_setting(payload, authorization)


@app.get("/v1/site/editor-layout")
async def website_editor_layout_setting():
    return await editor_layout_setting()


@app.get("/v1/admin/editor-layout")
async def get_admin_editor_layout_setting(authorization: str | None = Header(default=None)):
    return await admin_editor_layout_setting(authorization)


@app.post("/v1/admin/editor-layout")
async def set_admin_editor_layout_setting(payload: EditorLayoutSettingRequest, authorization: str | None = Header(default=None)):
    return await update_editor_layout_setting(payload, authorization)


@app.delete("/v1/admin/documents")
async def admin_delete_documents(payload: AdminDeleteRequest, authorization: str | None = Header(default=None)):
    return await delete_admin_documents(payload, authorization)


@app.delete("/v1/admin/members")
async def admin_delete_members(payload: AdminDeleteRequest, authorization: str | None = Header(default=None)):
    return await delete_admin_members(payload, authorization)


@app.post("/v1/support/message")
async def website_support_message(payload: SupportMessageRequest):
    return await send_support_message(payload)


@app.post("/v1/analytics/ping")
async def website_presence_ping(payload: PresencePing, request: Request):
    return record_presence(payload, request)


@app.get("/v1/admin/visitors")
async def admin_live_visitors(authorization: str | None = Header(default=None)):
    return await admin_visitors(authorization)


@app.post("/v1/analytics/events")
async def website_analytics_event(
    payload: AnalyticsEventRequest,
    request: Request,
    authorization: str | None = Header(default=None),
):
    return await store_analytics_event(payload, request, authorization)


def _customer_message(operation: str, job_id: str, exc: Exception) -> str:
    """Message shown to the customer. ValueError is reserved for our own
    customer-readable messages (wrong file type, unsafe archive, ...); raw tool
    output (LibreOffice/Ghostscript stderr, server paths) stays in the logs."""
    label = operation.replace("-", " ").upper()
    if isinstance(exc, ConversionOutOfMemory):
        return (
            f"{label} could not be completed because this file needs more memory than the converter has. "
            f"Try a smaller file or fewer pages. Reference: {job_id}."
        )
    if isinstance(exc, ValueError) and str(exc):
        return f"{label} could not be completed. {str(exc)[:300]} Reference: {job_id}."
    return f"{label} could not be completed. Please check the file and try again. Reference: {job_id}."


class ConversionOutOfMemory(Exception):
    """The conversion process was killed by the system (normally out of memory)."""


def _kill_process_group(process: asyncio.subprocess.Process) -> None:
    try:
        os.killpg(process.pid, signal.SIGKILL)  # includes soffice/gs children
    except (ProcessLookupError, PermissionError):
        pass


async def _execute_isolated(
    operation: str,
    input_path: Path,
    workspace: Path,
    base_name: str,
    *,
    module: str = "app.worker",
) -> OperationResult:
    """Run the conversion in a child process (see app/worker.py)."""
    result_file = workspace / ".pdfmint-result.json"
    process = await asyncio.create_subprocess_exec(
        sys.executable, "-m", module, operation, str(input_path), str(workspace), base_name, str(result_file),
        cwd=str(APP_ROOT),
        start_new_session=True,
    )
    over_memory = False
    threshold = guard_threshold_bytes()

    async def _watch_memory() -> None:
        # Kill the conversion before the container reaches its memory limit: on Kubernetes
        # an out-of-memory kill takes the whole engine down, not just this process.
        nonlocal over_memory
        while process.returncode is None:
            used = memory_used_bytes()
            if used is not None and used >= threshold:
                over_memory = True
                logger.error("Stopping %s: container memory %s MB reached the guard limit of %s MB",
                             operation, used // 1048576, threshold // 1048576)
                _kill_process_group(process)
                return
            await asyncio.sleep(0.05)

    watcher = asyncio.create_task(_watch_memory()) if threshold else None
    try:
        await asyncio.wait_for(process.wait(), timeout=JOB_HARD_TIMEOUT_SECONDS)
    except asyncio.TimeoutError:
        _kill_process_group(process)
        await process.wait()
        raise subprocess.TimeoutExpired(operation, JOB_HARD_TIMEOUT_SECONDS)
    except asyncio.CancelledError:  # client went away / server shutting down
        _kill_process_group(process)
        raise
    finally:
        if watcher:
            watcher.cancel()
        _kill_process_group(process)  # tidy up anything the worker left behind

    if over_memory:
        raise ConversionOutOfMemory()
    if process.returncode in (-signal.SIGKILL, 137) or not result_file.is_file():
        logger.error("Conversion process for %s ended without a result (exit %s); likely out of memory",
                     operation, process.returncode)
        raise ConversionOutOfMemory()
    payload = json.loads(result_file.read_text(encoding="utf-8"))
    result_file.unlink(missing_ok=True)
    if payload.get("ok"):
        return OperationResult(Path(payload["path"]), payload["filename"], payload["media_type"])
    kind = payload.get("kind")
    if kind == "timeout":
        raise subprocess.TimeoutExpired(operation, JOB_HARD_TIMEOUT_SECONDS)
    if kind == "memory":
        raise ConversionOutOfMemory()
    if kind == "value":
        raise ValueError(payload.get("message") or "")
    raise RuntimeError(payload.get("message") or "Conversion failed.")


_execute = _execute_isolated


async def _run_operation(operation: str, input_path: Path, workspace: Path, base_name: str):
    global _jobs_waiting
    if _job_slots.locked() and _jobs_waiting >= JOB_QUEUE_LIMIT:
        raise HTTPException(status_code=503, detail="PDFBreeze is busy right now. Please try again in a minute.")
    _jobs_waiting += 1
    try:
        await _job_slots.acquire()
    finally:
        _jobs_waiting -= 1
    try:
        return await _execute(operation, input_path, workspace, base_name)
    finally:
        _job_slots.release()


@app.post("/v1/jobs")
async def create_job(
    file: UploadFile = File(...),
    operation: str = Form(...),
):
    if operation not in OPERATIONS:
        raise HTTPException(status_code=400, detail=f"Unsupported operation '{operation}'.")

    job_id = f"PM-{uuid.uuid4().hex[:8].upper()}"
    started_at = time.monotonic()
    original_name = Path(file.filename or "document.pdf").name
    base_name = Path(original_name).stem or "document"
    logger.info("JOB START id=%s operation=%s filename=%s", job_id, operation, original_name)

    workspace = Path(tempfile.mkdtemp(prefix=f"pdfmint-job-{job_id.lower()}-"))
    try:
        if operation.startswith(("pdf-to-", "compress-pdf", "ocr-")):
            input_path = await save_uploaded_pdf(file, workspace)
        else:
            input_path = await save_uploaded_file(file, workspace)

        try:
            result = await _run_operation(operation, input_path, workspace, base_name)
        except HTTPException:
            raise
        except subprocess.TimeoutExpired as exc:
            logger.exception("JOB TIMEOUT id=%s operation=%s", job_id, operation)
            raise HTTPException(status_code=504, detail=f"Conversion timed out. Reference: {job_id}") from exc
        except Exception as exc:
            logger.exception("JOB FAILED id=%s operation=%s error=%s", job_id, operation, exc)
            raise HTTPException(status_code=422, detail=_customer_message(operation, job_id, exc)) from exc

        if not result.path.is_file():
            logger.error("JOB FAILED id=%s operation=%s missing output %s", job_id, operation, result.path)
            raise HTTPException(status_code=422, detail=_customer_message(operation, job_id, RuntimeError()))

        logger.info(
            "JOB COMPLETE id=%s operation=%s duration_seconds=%.2f output_bytes=%s",
            job_id,
            operation,
            time.monotonic() - started_at,
            result.path.stat().st_size,
        )
    except BaseException:
        shutil.rmtree(workspace, ignore_errors=True)
        raise

    # Serve straight from the job folder (no extra copy) and delete it once sent.
    return FileResponse(
        path=result.path,
        filename=result.filename,
        media_type=result.media_type,
        background=BackgroundTask(shutil.rmtree, workspace, ignore_errors=True),
    )
