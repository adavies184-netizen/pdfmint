from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path


@dataclass(frozen=True)
class OperationResult:
    path: Path
    filename: str
    media_type: str
