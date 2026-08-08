from __future__ import annotations
import os, re, shutil, subprocess
from pathlib import Path
import fitz
from pptx import Presentation
from pptx.util import Inches
from ..settings import JOB_TIMEOUT_SECONDS

def pdf_to_pptx(pdf_path: Path, output_path: Path) -> Path:
    doc = fitz.open(pdf_path)
    try:
        if doc.page_count < 1:
            raise RuntimeError("The PDF contains no pages.")
        prs = Presentation()
        ratio = doc[0].rect.width / doc[0].rect.height
        prs.slide_height = Inches(7.5)
        prs.slide_width = int(prs.slide_height * ratio)
        blank = prs.slide_layouts[6]
        # Reuse the default first slide as blank by deleting it cleanly.
        if prs.slides:
            slide_id = prs.slides._sldIdLst[0]
            prs.part.drop_rel(slide_id.rId)
            del prs.slides._sldIdLst[0]
        image_dir = output_path.parent / "ppt-pages"
        image_dir.mkdir(exist_ok=True)
        for i, page in enumerate(doc):
            pix = page.get_pixmap(matrix=fitz.Matrix(2, 2), alpha=False)
            image = image_dir / f"page-{i+1}.jpg"
            pix.save(str(image), jpg_quality=88)
            slide = prs.slides.add_slide(blank)
            slide.shapes.add_picture(str(image), 0, 0, width=prs.slide_width, height=prs.slide_height)
        prs.save(output_path)
    finally:
        doc.close()
    if not output_path.exists() or output_path.stat().st_size == 0:
        raise RuntimeError("PPTX conversion did not produce a valid file.")
    return output_path

def pptx_to_ppt(pptx_path: Path, output_dir: Path) -> Path:
    output = output_dir / f"{pptx_path.stem}.ppt"
    attempts = ["ppt", 'ppt:"MS PowerPoint 97"', 'ppt:"MS PowerPoint 95"']
    errors = []
    for convert_to in attempts:
        profile = output_dir / ("lo-impress-" + re.sub(r"[^a-z0-9]+", "-", convert_to.lower()).strip("-"))
        shutil.rmtree(profile, ignore_errors=True)
        profile.mkdir(parents=True, exist_ok=True)
        result = subprocess.run([
            "soffice","--headless","--invisible","--nologo","--nodefault",
            "--nolockcheck","--nofirststartwizard","--norestore",
            f"-env:UserInstallation=file://{profile}",
            "--convert-to",convert_to,"--outdir",str(output_dir),str(pptx_path)
        ], capture_output=True, text=True, timeout=JOB_TIMEOUT_SECONDS, check=False,
           env={**os.environ,"HOME":str(profile),"SAL_USE_VCLPLUGIN":"svp"})
        if result.returncode == 0 and output.exists() and output.stat().st_size > 0:
            return output
        errors.append((result.stderr or result.stdout or "No PPT produced.")[:400])
    raise RuntimeError("LibreOffice PPT conversion failed. " + " | ".join(errors))

def pdf_to_ppt(pdf_path: Path, output_dir: Path, base_name: str) -> Path:
    pptx = output_dir / f"{base_name}.pptx"
    pdf_to_pptx(pdf_path, pptx)
    return pptx_to_ppt(pptx, output_dir)
