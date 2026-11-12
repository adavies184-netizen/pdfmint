"""Stop a conversion before the container runs out of memory.

On Kubernetes (Sevalla), when a container goes over its memory limit the whole
container is killed (memory.oom.group), not just the biggest process. Running each
conversion in its own process therefore isn't enough on its own: a single heavy
conversion still restarted the engine (and every other request got a 503).

While a conversion runs, the engine polls the container's unreclaimable memory
(anonymous + shared memory, from the cgroup) and kills the conversion's process
group once it passes MEMORY_GUARD_FRACTION (default 85%) of the limit. Reading two small cgroup
files twenty times a second costs next to nothing.

Settings (environment variables, all optional):
  MEMORY_GUARD_LIMIT_MB   use this limit instead of the one read from the cgroup
  MEMORY_GUARD_FRACTION   share of the limit a conversion may push usage to (default 0.85)
  MEMORY_GUARD_DISABLED   set to 1 to switch the guard off
"""
from __future__ import annotations

import os
from pathlib import Path

_UNLIMITED = 1 << 60  # cgroup v1 reports "no limit" as a huge number

_V2 = Path("/sys/fs/cgroup")
_V1 = Path("/sys/fs/cgroup/memory")


def _read_int(path: Path) -> int | None:
    try:
        text = path.read_text().strip()
    except OSError:
        return None
    if not text or text == "max":
        return None
    try:
        return int(text)
    except ValueError:
        return None


def _stat(path: Path) -> dict[str, int]:
    values: dict[str, int] = {}
    try:
        for line in path.read_text().splitlines():
            key, _, value = line.partition(" ")
            if value.strip().isdigit():
                values[key] = int(value)
    except OSError:
        pass
    return values


def memory_limit_bytes() -> int | None:
    """The container's memory limit, or None when there is no usable limit."""
    if os.getenv("MEMORY_GUARD_DISABLED", "").strip() in {"1", "true", "yes"}:
        return None
    override = os.getenv("MEMORY_GUARD_LIMIT_MB", "").strip()
    if override:
        try:
            return int(float(override) * 1024 * 1024)
        except ValueError:
            pass
    for candidate in (_V2 / "memory.max", _V1 / "memory.limit_in_bytes"):
        value = _read_int(candidate)
        if value and value < _UNLIMITED:
            return value
    return None


def memory_used_bytes() -> int | None:
    """Unreclaimable memory in use by the container (page cache is left out,
    because the kernel frees that before it would ever kill anything)."""
    stats = _stat(_V2 / "memory.stat")
    if "anon" in stats:
        return stats.get("anon", 0) + stats.get("shmem", 0)
    stats = _stat(_V1 / "memory.stat")
    if "total_rss" in stats:
        return stats.get("total_rss", 0) + stats.get("total_shmem", 0)
    # Fallback: the whole usage figure (includes cache, so it errs on the safe side).
    return _read_int(_V2 / "memory.current") or _read_int(_V1 / "memory.usage_in_bytes")


def guard_threshold_bytes() -> int | None:
    limit = memory_limit_bytes()
    if not limit:
        return None
    try:
        fraction = float(os.getenv("MEMORY_GUARD_FRACTION", "0.85"))
    except ValueError:
        fraction = 0.85
    fraction = min(max(fraction, 0.5), 0.97)
    return int(limit * fraction)
