"""Runtime behaviour of the 1.21 engine changes.

Run from pdfmint-engine/:  python -m unittest tests.test_engine_runtime
(needs the engine requirements, e.g. inside the engine container).
"""
import asyncio
import threading
import time
import unittest
from pathlib import Path
from unittest import mock

import httpx

from app import admin, http_client, main
from app.operations import process
from app.registry import OperationResult


class JobConcurrencyTests(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        main._job_slots = asyncio.Semaphore(1)
        main._jobs_waiting = 0

    async def test_conversion_does_not_block_event_loop(self):
        started = threading.Event()

        def slow_job(*_):
            started.set()
            time.sleep(0.4)
            return OperationResult(Path("x"), "x", "text/plain")

        with mock.patch.object(main, "execute_operation", slow_job):
            job = asyncio.create_task(main._run_operation("pdf-to-docx", Path("in"), Path("."), "doc"))
            await asyncio.to_thread(started.wait, 2)
            # While the conversion runs, the loop must still answer other requests quickly.
            before = time.monotonic()
            main.health()
            await asyncio.sleep(0)
            self.assertLess(time.monotonic() - before, 0.1)
            self.assertFalse(job.done())
            await job

    async def test_jobs_run_one_at_a_time(self):
        running = 0
        peak = 0
        lock = threading.Lock()

        def job(*_):
            nonlocal running, peak
            with lock:
                running += 1
                peak = max(peak, running)
            time.sleep(0.05)
            with lock:
                running -= 1
            return OperationResult(Path("x"), "x", "text/plain")

        with mock.patch.object(main, "execute_operation", job):
            await asyncio.gather(*(main._run_operation("pdf-to-docx", Path("in"), Path("."), "d") for _ in range(4)))
        self.assertEqual(peak, 1)

    async def test_queue_limit_returns_busy(self):
        release = threading.Event()

        def blocking_job(*_):
            release.wait(2)
            return OperationResult(Path("x"), "x", "text/plain")

        with mock.patch.object(main, "execute_operation", blocking_job), mock.patch.object(main, "JOB_QUEUE_LIMIT", 1):
            first = asyncio.create_task(main._run_operation("pdf-to-docx", Path("in"), Path("."), "d"))
            await asyncio.sleep(0.05)
            second = asyncio.create_task(main._run_operation("pdf-to-docx", Path("in"), Path("."), "d"))
            await asyncio.sleep(0.05)
            with self.assertRaises(Exception) as caught:
                await main._run_operation("pdf-to-docx", Path("in"), Path("."), "d")
            self.assertEqual(getattr(caught.exception, "status_code", None), 503)
            release.set()
            await asyncio.gather(first, second)


class CustomerMessageTests(unittest.TestCase):
    def test_tool_output_is_not_shown_to_customers(self):
        message = main._customer_message("pdf-to-doc", "PM-1", RuntimeError("soffice: /tmp/pdfmint-job-x/input.docx failed"))
        self.assertNotIn("/tmp", message)
        self.assertIn("PM-1", message)

    def test_validation_messages_are_kept(self):
        message = main._customer_message("docx-to-doc", "PM-2", ValueError("This converter accepts: .docx."))
        self.assertIn("This converter accepts: .docx.", message)


class SiteSettingCacheTests(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        self.calls = 0

        def handler(request: httpx.Request) -> httpx.Response:
            self.calls += 1
            return httpx.Response(200, json=[{"enabled": False}])

        http_client._client = httpx.AsyncClient(transport=httpx.MockTransport(handler))
        admin._setting_cache.clear()
        self.patches = [
            mock.patch.object(admin, "SUPABASE_URL", "https://example.supabase.co"),
            mock.patch.object(admin, "SUPABASE_SERVICE_ROLE_KEY", "service"),
            mock.patch("app.supabase.SUPABASE_URL", "https://example.supabase.co"),
            mock.patch("app.supabase.SUPABASE_SERVICE_ROLE_KEY", "service"),
        ]
        for patch in self.patches:
            patch.start()

    async def asyncTearDown(self):
        for patch in self.patches:
            patch.stop()
        await http_client.close_http()

    async def test_public_settings_are_cached(self):
        self.assertEqual(await admin.payment_wall_setting(), {"style": "standard"})
        self.assertEqual(await admin.payment_wall_setting(), {"style": "standard"})
        self.assertEqual(await admin.cookie_consent_setting(), {"enabled": False})
        self.assertEqual(self.calls, 2)  # one per setting, not one per page view

    async def test_missing_row_keeps_safe_defaults(self):
        http_client._client = httpx.AsyncClient(transport=httpx.MockTransport(lambda r: httpx.Response(200, json=[])))
        self.assertEqual(await admin.payment_wall_setting(), {"style": "zendocs"})
        self.assertEqual(await admin.cookie_consent_setting(), {"enabled": True})

    async def test_database_errors_are_not_cached(self):
        http_client._client = httpx.AsyncClient(transport=httpx.MockTransport(lambda r: httpx.Response(500)))
        self.assertEqual(await admin.payment_wall_setting(), {"style": "zendocs"})
        self.assertNotIn(admin.PAYMENT_WALL_SETTING_KEY, admin._setting_cache)


class SofficeCommandTests(unittest.TestCase):
    def test_shared_profile_added_when_missing(self):
        command = process._soffice_command(["soffice", "--headless", "--convert-to", "pdf", "in.docx"])
        self.assertTrue(any(part.startswith("-env:UserInstallation=") for part in command))
        self.assertIn("--norestore", command)
        self.assertEqual(command[-1], "in.docx")

    def test_caller_profile_is_respected(self):
        command = process._soffice_command(["soffice", "-env:UserInstallation=file:///tmp/own", "in.docx"])
        self.assertEqual(sum(part.startswith("-env:UserInstallation=") for part in command), 1)

    def test_other_tools_untouched(self):
        with mock.patch("subprocess.run") as run:
            process.run(["gs", "-v"], capture_output=True)
        run.assert_called_once_with(["gs", "-v"], capture_output=True)


if __name__ == "__main__":
    unittest.main()
