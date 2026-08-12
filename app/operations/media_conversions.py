from __future__ import annotations

import subprocess
from pathlib import Path


ROUTES: dict[str, tuple[set[str], str]] = {
    "video-to-gif": ({".avi", ".m4v", ".mkv", ".mov", ".mp4", ".mpeg", ".mpg", ".webm", ".wmv"}, "gif"),
    "mp4-to-gif": ({".mp4"}, "gif"),
    "mp4-to-mp3": ({".mp4"}, "mp3"),
    "m4a-to-mp3": ({".m4a"}, "mp3"),
    "mov-to-mp4": ({".mov"}, "mp4"),
    "mov-to-mp3": ({".mov"}, "mp3"),
    "mp3-to-wav": ({".mp3"}, "wav"),
    "wav-to-mp3": ({".wav"}, "mp3"),
}


def _run(args: list[str]) -> None:
    result = subprocess.run(args, capture_output=True, text=True, timeout=600)
    if result.returncode:
        detail = (result.stderr or result.stdout or "Media conversion failed.").strip()
        raise RuntimeError(detail[-1600:])


def convert_media(operation: str, input_path: Path, workspace: Path, base_name: str) -> Path:
    allowed, target = ROUTES[operation]
    if input_path.suffix.lower() not in allowed:
        raise ValueError(f"This converter accepts: {', '.join(sorted(allowed))}.")
    output = workspace / f"{base_name}.{target}"
    common = ["ffmpeg", "-y", "-hide_banner", "-loglevel", "error", "-i", str(input_path)]

    if target == "gif":
        _run(common + ["-vf", "fps=12,scale='min(960,iw)':-1:flags=lanczos", "-loop", "0", str(output)])
    elif operation == "mov-to-mp4":
        _run(common + ["-c:v", "libx264", "-preset", "medium", "-crf", "23", "-c:a", "aac", "-b:a", "160k", "-movflags", "+faststart", str(output)])
    elif target == "mp3":
        _run(common + ["-vn", "-c:a", "libmp3lame", "-q:a", "2", str(output)])
    elif target == "wav":
        _run(common + ["-vn", "-c:a", "pcm_s16le", "-ar", "44100", str(output)])
    else:
        raise ValueError(f"Unsupported media target: {target}")
    if not output.exists() or not output.stat().st_size:
        raise RuntimeError("The converted media file was not created.")
    return output
