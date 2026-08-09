from __future__ import annotations

import gzip
import shutil
import subprocess
import zipfile
from pathlib import Path

import fitz
from PIL import Image

from .spreadsheet import pdf_to_xlsx, pdf_to_xls
from .word import pdf_to_docx


FORMATS = {
    "azw3", "mobi", "epub", "html", "bmp", "png", "jpg", "jpeg", "tiff",
    "gif", "webp", "dxf", "dwg", "svg", "svgz", "eps", "psd", "txt",
    "md", "docx", "rtf", "xlsx", "xls", "csv",
}


def _run(args: list[str], cwd: Path | None = None) -> None:
    subprocess.run(args, cwd=cwd, check=True, capture_output=True, text=True, timeout=300)


def _archive(paths: list[Path], output: Path) -> Path:
    archive = output.with_suffix(".zip")
    with zipfile.ZipFile(archive, "w", zipfile.ZIP_DEFLATED) as bundle:
        for path in paths:
            bundle.write(path, path.name)
    return archive


def _render_pages(pdf: Path, workspace: Path, extension: str) -> list[Path]:
    document = fitz.open(pdf)
    outputs: list[Path] = []
    for number, page in enumerate(document, 1):
        pixmap = page.get_pixmap(matrix=fitz.Matrix(2, 2), alpha=False)
        png = workspace / f"page-{number}.png"
        pixmap.save(png)
        if extension == "png":
            outputs.append(png)
            continue
        target = workspace / f"page-{number}.{extension}"
        with Image.open(png) as image:
            if extension in {"jpg", "jpeg", "bmp"}:
                image = image.convert("RGB")
            image.save(target, format={"jpg": "JPEG", "jpeg": "JPEG", "bmp": "BMP", "webp": "WEBP"}[extension], quality=92)
        outputs.append(target)
    document.close()
    return outputs


def _multipage_image(pdf: Path, output: Path, target: str, workspace: Path) -> Path:
    pages = _render_pages(pdf, workspace, "png")
    images = [Image.open(path).convert("RGB") for path in pages]
    try:
        if target == "tiff":
            images[0].save(output, format="TIFF", save_all=True, append_images=images[1:], compression="tiff_deflate")
        else:
            palette = [image.convert("P", palette=Image.Palette.ADAPTIVE) for image in images]
            palette[0].save(output, format="GIF", save_all=True, append_images=palette[1:], duration=900, loop=0)
    finally:
        for image in images:
            image.close()
    return output


def _svg_pages(pdf: Path, workspace: Path, compressed: bool = False) -> list[Path]:
    document = fitz.open(pdf)
    outputs: list[Path] = []
    for number, page in enumerate(document, 1):
        svg = page.get_svg_image(text_as_path=False).encode("utf-8")
        suffix = "svgz" if compressed else "svg"
        output = workspace / f"page-{number}.{suffix}"
        if compressed:
            with gzip.open(output, "wb") as stream:
                stream.write(svg)
        else:
            output.write_bytes(svg)
        outputs.append(output)
    document.close()
    return outputs


def _eps_pages(pdf: Path, workspace: Path) -> list[Path]:
    document = fitz.open(pdf)
    outputs: list[Path] = []
    for number in range(document.page_count):
        single = workspace / f"source-{number + 1}.pdf"
        selected = fitz.open()
        selected.insert_pdf(document, from_page=number, to_page=number)
        selected.save(single)
        selected.close()
        output = workspace / f"page-{number + 1}.eps"
        _run(["pdftops", "-eps", str(single), str(output)])
        outputs.append(output)
    document.close()
    return outputs


def _cad(pdf: Path, output: Path, workspace: Path) -> Path:
    eps = _eps_pages(pdf, workspace)[0]
    _run(["pstoedit", "-f", "dxf:-polyaslines", str(eps), str(output)])
    return output


def _rtf(pdf: Path, output: Path, workspace: Path, base: str) -> Path:
    docx = workspace / f"{base}.docx"
    pdf_to_docx(pdf, docx)
    _run(["soffice", "--headless", "--convert-to", "rtf", "--outdir", str(workspace), str(docx)])
    generated = workspace / f"{base}.rtf"
    if generated != output:
        shutil.move(generated, output)
    return output


def convert_pdf_output(pdf: Path, workspace: Path, base: str, target: str) -> Path:
    if target not in FORMATS:
        raise ValueError(f"Unsupported PDF output format: {target}")
    output = workspace / f"{base}.{target}"
    if target in {"jpg", "jpeg", "png", "bmp", "webp"}:
        pages = _render_pages(pdf, workspace, "jpg" if target == "jpeg" else target)
        if len(pages) == 1:
            shutil.move(pages[0], output)
            return output
        return _archive(pages, output)
    if target in {"tiff", "gif"}:
        return _multipage_image(pdf, output, target, workspace)
    if target in {"svg", "svgz"}:
        pages = _svg_pages(pdf, workspace, target == "svgz")
        if len(pages) == 1:
            shutil.move(pages[0], output)
            return output
        return _archive(pages, output)
    if target == "eps":
        pages = _eps_pages(pdf, workspace)
        if len(pages) == 1:
            shutil.move(pages[0], output)
            return output
        return _archive(pages, output)
    if target in {"dxf", "dwg"}:
        return _cad(pdf, output, workspace)
    if target == "psd":
        png = _render_pages(pdf, workspace, "png")[0]
        _run(["convert", str(png), str(output)])
        return output
    if target in {"txt", "md"}:
        text = "\n\n".join(page.get_text("text") for page in fitz.open(pdf))
        output.write_text(text, encoding="utf-8")
        return output
    if target == "html":
        document = fitz.open(pdf)
        pages = "\n".join(f'<section class="pdf-page">{page.get_text("html")}</section>' for page in document)
        document.close()
        output.write_text(f'<!doctype html><html><head><meta charset="utf-8"><title>{base}</title></head><body>{pages}</body></html>', encoding="utf-8")
        return output
    if target == "docx":
        pdf_to_docx(pdf, output)
        return output
    if target == "rtf":
        return _rtf(pdf, output, workspace, base)
    if target == "xlsx":
        pdf_to_xlsx(pdf, output)
        return output
    if target == "xls":
        return pdf_to_xls(pdf, workspace, base)
    if target == "csv":
        xlsx = workspace / f"{base}.xlsx"
        pdf_to_xlsx(pdf, xlsx)
        _run(["soffice", "--headless", "--convert-to", "csv", "--outdir", str(workspace), str(xlsx)])
        return workspace / f"{base}.csv"
    if target in {"epub", "mobi", "azw3"}:
        _run(["ebook-convert", str(pdf), str(output)])
        return output
    raise ValueError(f"PDF to {target.upper()} is not available.")
