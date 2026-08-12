from __future__ import annotations

import html
import shutil
import subprocess
import zipfile
from pathlib import Path

import markdown
from PIL import Image, ImageSequence
from pillow_heif import register_heif_opener

register_heif_opener()


ROUTES: dict[str, set[str]] = {
    "image-to-pdf": {".avif", ".bmp", ".gif", ".heic", ".heif", ".jfif", ".jpg", ".jpeg", ".png", ".tif", ".tiff", ".webp"},
    "dwg-to-pdf": {".dwg"}, "html-to-pdf": {".html", ".htm"},
    "odt-to-pdf": {".odt"}, "epub-to-pdf": {".epub"}, "pages-to-pdf": {".pages"},
    "hwp-to-pdf": {".hwp", ".hwpx"}, "heic-to-pdf": {".heic", ".heif"},
    "wps-to-pdf": {".wps"}, "csv-to-pdf": {".csv"}, "txt-to-pdf": {".txt"},
    "ppt-to-pdf": {".ppt"}, "tiff-to-pdf": {".tif", ".tiff"}, "ai-to-pdf": {".ai"},
    "rtf-to-pdf": {".rtf"}, "md-to-pdf": {".md", ".markdown"}, "svg-to-pdf": {".svg"},
    "pub-to-pdf": {".pub"}, "dxf-to-pdf": {".dxf"}, "cdr-to-pdf": {".cdr"},
    "powerpoint-to-pdf": {".ppt", ".pptx"},
}


def _run(args: list[str], cwd: Path | None = None, timeout: int = 300) -> None:
    result = subprocess.run(args, cwd=cwd, capture_output=True, text=True, timeout=timeout)
    if result.returncode:
        detail = (result.stderr or result.stdout or "Conversion command failed.").strip()
        raise RuntimeError(detail[-1200:])


def _soffice(input_path: Path, workspace: Path, output: Path) -> Path:
    before = set(workspace.glob("*.pdf"))
    _run(["soffice", "--headless", "--convert-to", "pdf", "--outdir", str(workspace), str(input_path)])
    created = [path for path in workspace.glob("*.pdf") if path not in before]
    candidate = workspace / f"{input_path.stem}.pdf"
    source = candidate if candidate.exists() else (created[0] if created else None)
    if not source:
        raise RuntimeError("LibreOffice did not create a PDF for this file.")
    if source != output:
        shutil.move(str(source), str(output))
    return output


def _flatten(frame: Image.Image) -> Image.Image:
    rgba = frame.convert("RGBA")
    background = Image.new("RGB", rgba.size, "white")
    background.paste(rgba, mask=rgba.getchannel("A"))
    return background


def _image_pdf(input_path: Path, output: Path) -> Path:
    with Image.open(input_path) as opened:
        frames = [_flatten(frame.copy()) for frame in ImageSequence.Iterator(opened)]
    if not frames:
        raise RuntimeError("No readable image was found.")
    frames[0].save(output, "PDF", resolution=150, save_all=True, append_images=frames[1:])
    return output


def _pages_pdf(input_path: Path, workspace: Path, output: Path) -> Path:
    with zipfile.ZipFile(input_path) as archive:
        names = archive.namelist()
        preview = next((name for name in names if name.lower().endswith("preview.pdf")), None)
        if preview:
            with archive.open(preview) as source, output.open("wb") as destination:
                shutil.copyfileobj(source, destination)
            return output
    raise RuntimeError("This Pages file does not contain a PDF preview. Export it from Pages with preview enabled and try again.")


def _text_pdf(input_path: Path, workspace: Path, output: Path, is_markdown: bool) -> Path:
    source = input_path.read_text(encoding="utf-8", errors="replace")
    body = markdown.markdown(source, extensions=["tables", "fenced_code"]) if is_markdown else f"<pre>{html.escape(source)}</pre>"
    document = workspace / "document.html"
    document.write_text(
        "<!doctype html><html><head><meta charset='utf-8'><style>body{font-family:Arial,sans-serif;margin:36px;line-height:1.5}pre{white-space:pre-wrap;font:14px/1.5 Arial,sans-serif}table{border-collapse:collapse}td,th{border:1px solid #bbb;padding:6px}</style></head><body>"
        + body + "</body></html>", encoding="utf-8"
    )
    return _soffice(document, workspace, output)


def convert_to_pdf(operation: str, input_path: Path, workspace: Path, base_name: str) -> Path:
    allowed = ROUTES[operation]
    suffix = input_path.suffix.lower()
    if suffix not in allowed:
        raise ValueError(f"This converter accepts: {', '.join(sorted(allowed))}.")
    output = workspace / f"{base_name}.pdf"

    if operation in {"image-to-pdf", "heic-to-pdf", "tiff-to-pdf"}:
        return _image_pdf(input_path, output)
    if operation == "svg-to-pdf":
        _run(["rsvg-convert", "-f", "pdf", "-o", str(output), str(input_path)])
        return output
    if operation == "ai-to-pdf":
        _run(["gs", "-dSAFER", "-dBATCH", "-dNOPAUSE", "-sDEVICE=pdfwrite", f"-sOutputFile={output}", str(input_path)])
        return output
    if operation == "epub-to-pdf":
        _run(["ebook-convert", str(input_path), str(output)])
        return output
    if operation == "pages-to-pdf":
        return _pages_pdf(input_path, workspace, output)
    if operation == "txt-to-pdf":
        return _text_pdf(input_path, workspace, output, False)
    if operation == "md-to-pdf":
        return _text_pdf(input_path, workspace, output, True)
    return _soffice(input_path, workspace, output)
