"""Drop-in replacement for ``subprocess.run`` used by every converter.

LibreOffice keeps a per-profile lock and two ``soffice`` processes sharing one
profile fail or hand work to each other. Calls that start with ``soffice`` are
therefore serialised and, unless the caller already chose a profile, given a
persistent headless profile (re-using it avoids the 1-2 s first-start cost).
Every other tool runs unchanged.
"""
from __future__ import annotations

import os
import subprocess
import tempfile
import threading
from pathlib import Path
from typing import Any, Sequence

_SOFFICE_LOCK = threading.Lock()
_SHARED_PROFILE = Path(tempfile.gettempdir()) / "pdfmint-libreoffice-profile"


def _soffice_command(args: Sequence[str]) -> list[str]:
    command = list(args)
    if not any(str(part).startswith("-env:UserInstallation=") for part in command):
        _SHARED_PROFILE.mkdir(parents=True, exist_ok=True)
        command.insert(1, f"-env:UserInstallation=file://{_SHARED_PROFILE}")
    for flag in ("--norestore", "--nolockcheck"):
        if flag not in command:
            command.insert(1, flag)
    return command


def run(args: Sequence[str], **kwargs: Any) -> subprocess.CompletedProcess:
    if not args or Path(str(args[0])).name not in {"soffice", "libreoffice"}:
        return subprocess.run(list(args), **kwargs)
    env = dict(kwargs.pop("env", None) or os.environ)
    env.setdefault("SAL_USE_VCLPLUGIN", "svp")
    with _SOFFICE_LOCK:
        return subprocess.run(_soffice_command(args), env=env, **kwargs)
