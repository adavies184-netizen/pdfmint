from __future__ import annotations

import shutil
import struct
import subprocess
import zlib
import zipfile
from pathlib import Path, PurePosixPath


ROUTES: dict[str, tuple[set[str], str]] = {
    "dwg-to-dxf": ({".dwg"}, "dxf"),
    "dxf-to-dwg": ({".dxf"}, "dwg"),
    "rar-to-zip": ({".rar"}, "zip"),
    "zip-to-rar": ({".zip"}, "rar"),
    "7z-to-zip": ({".7z"}, "zip"),
}


def _run(args: list[str], *, cwd: Path | None = None) -> None:
    result = subprocess.run(args, cwd=cwd, capture_output=True, text=True, timeout=600)
    if result.returncode:
        detail = (result.stderr or result.stdout or "Conversion failed.").strip()
        raise RuntimeError(detail[-1600:])


def _safe_name(name: str) -> str:
    normalized = name.replace("\\", "/")
    path = PurePosixPath(normalized)
    if path.is_absolute() or not normalized or any(part in {"", ".", ".."} for part in path.parts):
        raise ValueError("The archive contains an unsafe file path.")
    return normalized


def _zip_entries(input_path: Path, workspace: Path) -> list[tuple[str, Path]]:
    extracted = workspace / "zip-input"
    extracted.mkdir()
    entries: list[tuple[str, Path]] = []
    total = 0
    with zipfile.ZipFile(input_path) as archive:
        for item in archive.infolist():
            name = _safe_name(item.filename)
            if item.is_dir():
                continue
            total += item.file_size
            if total > 500 * 1024 * 1024:
                raise ValueError("The expanded archive is larger than 500 MB.")
            target = extracted.joinpath(*PurePosixPath(name).parts)
            target.parent.mkdir(parents=True, exist_ok=True)
            with archive.open(item) as source, target.open("wb") as destination:
                shutil.copyfileobj(source, destination)
            entries.append((name, target))
    if not entries:
        raise ValueError("The ZIP archive does not contain any files.")
    return entries


def _vint(value: int) -> bytes:
    result = bytearray()
    while True:
        byte = value & 0x7F
        value >>= 7
        result.append(byte | (0x80 if value else 0))
        if not value:
            return bytes(result)


def _rar_block(block_type: int, flags: int, specific: bytes, data: bytes = b"") -> bytes:
    header = _vint(block_type) + _vint(flags)
    if flags & 0x02:
        header += _vint(len(data))
    header += specific
    size = _vint(len(header))
    crc = zlib.crc32(size + header) & 0xFFFFFFFF
    return struct.pack("<I", crc) + size + header + data


def _create_rar5(entries: list[tuple[str, Path]], output: Path) -> None:
    with output.open("wb") as archive:
        archive.write(b"Rar!\x1a\x07\x01\x00")
        archive.write(_rar_block(1, 0, _vint(0)))
        for name, path in entries:
            data = path.read_bytes()
            encoded_name = name.encode("utf-8")
            # File flags: CRC32 present. Compression info: RAR 5.0, store method.
            specific = (
                _vint(0x04)
                + _vint(len(data))
                + _vint(0)
                + struct.pack("<I", zlib.crc32(data) & 0xFFFFFFFF)
                + _vint(0)
                + _vint(1)
                + _vint(len(encoded_name))
                + encoded_name
            )
            archive.write(_rar_block(2, 0x02, specific, data))
        archive.write(_rar_block(5, 0, _vint(0)))


def _archive_to_zip(input_path: Path, workspace: Path, output: Path) -> None:
    listing = subprocess.run(
        ["7z", "l", "-slt", str(input_path)], capture_output=True, text=True, timeout=120
    )
    if listing.returncode:
        raise RuntimeError((listing.stderr or listing.stdout or "The archive could not be read.")[-1600:])
    for line in listing.stdout.splitlines():
        if line.startswith("Path = "):
            listed_name = line[7:].strip()
            if listed_name and listed_name != input_path.name:
                _safe_name(listed_name)
    extracted = workspace / "archive-input"
    extracted.mkdir()
    _run(["7z", "x", "-y", f"-o{extracted}", str(input_path)])
    files = [path for path in extracted.rglob("*") if path.is_file()]
    if not files:
        raise ValueError("The archive does not contain any files.")
    with zipfile.ZipFile(output, "w", compression=zipfile.ZIP_DEFLATED, compresslevel=6) as archive:
        for path in files:
            archive.write(path, path.relative_to(extracted).as_posix())


def _convert_cad(operation: str, input_path: Path, workspace: Path, base_name: str) -> Path:
    target = workspace / f"{base_name}.{'dxf' if operation == 'dwg-to-dxf' else 'dwg'}"
    command = "dwg2dxf" if operation == "dwg-to-dxf" else "dxf2dwg"
    _run([command, "-y", "-o", str(target), str(input_path)], cwd=workspace)
    if not target.exists():
        # Some LibreDWG releases ignore -o and write beside the input filename.
        candidate = workspace / f"{input_path.stem}{target.suffix}"
        if candidate.exists():
            candidate.replace(target)
    return target


def convert_archive_cad(operation: str, input_path: Path, workspace: Path, base_name: str) -> Path:
    allowed, target_suffix = ROUTES[operation]
    if input_path.suffix.lower() not in allowed:
        raise ValueError(f"This converter accepts: {', '.join(sorted(allowed))}.")
    output = workspace / f"{base_name}.{target_suffix}"
    if operation in {"dwg-to-dxf", "dxf-to-dwg"}:
        output = _convert_cad(operation, input_path, workspace, base_name)
    elif operation in {"rar-to-zip", "7z-to-zip"}:
        _archive_to_zip(input_path, workspace, output)
    elif operation == "zip-to-rar":
        _create_rar5(_zip_entries(input_path, workspace), output)
    else:
        raise ValueError(f"Unsupported archive/CAD conversion: {operation}")
    if not output.exists() or not output.stat().st_size:
        raise RuntimeError("The converted file was not created.")
    return output
