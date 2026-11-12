"""Fixes for pdf2docx 0.5.8 text extraction, applied once before converting.

1. Type 3 fonts (Chrome / Skia "Save as PDF", many web-to-PDF tools) are reported
   by MuPDF's text trace with render type 3, the same value as invisible text.
   pdf2docx treats type-3 spans as *hidden* (e.g. an OCR layer) and drops every
   text block that touches one, so most of the visible text disappeared from the
   Word file. Real invisible text uses ordinary fonts (e.g. OCR "GlyphLessFont"),
   so only non-Type-3 spans are treated as hidden now.

2. In those same PDFs every space is its own span (the font changes between the
   word and the space). pdf2docx deletes spans that are only whitespace, so words
   ran together ("Loweryourblood"). Whitespace-only spans are now merged into the
   preceding span on the same line, keeping the space.

3. MuPDF names every Type 3 font "Unnamed-T3", which Word doesn't have, so it swapped
   in a random font and pages overflowed. The real names are in the PDF's font
   descriptors (e.g. "Inter-Regular"); Type 3 text now uses Arial (or Times New Roman
   for serif families), and large text is bold when the page has a bold Type 3 font.
"""
from __future__ import annotations

import logging

_APPLIED = False
TYPE3_FONT = "Unnamed-T3"  # MuPDF's name for Type 3 fonts


def _merge_space_spans(blocks: list[dict]) -> None:
    for block in blocks:
        for line in block.get("lines", []) or []:
            spans = line.get("spans") or []
            merged: list[dict] = []
            for span in spans:
                chars = span.get("chars") or []
                text = "".join(c.get("c", "") for c in chars)
                if chars and not text.strip() and merged and merged[-1].get("chars"):
                    previous = merged[-1]
                    previous["chars"] = list(previous["chars"]) + list(chars)
                    x0, y0, x1, y1 = previous["bbox"]
                    sx0, sy0, sx1, sy1 = span["bbox"]
                    previous["bbox"] = (min(x0, sx0), min(y0, sy0), max(x1, sx1), max(y1, sy1))
                    continue
                merged.append(span)
            line["spans"] = merged


_SERIF_HINTS = ("serif", "times", "georgia", "garamond", "merriweather", "playfair", "lora", "baskerville", "cambria", "book")
_BOLD_HINTS = ("bold", "semibold", "demibold", "black", "heavy", "extrabold")


def _type3_font_info(page) -> tuple[str, bool]:
    """(replacement family, page has a bold Type 3 font) from the font descriptors."""
    names: list[str] = []
    doc = page.parent
    try:
        for xref, _ext, kind, *_rest in page.get_fonts():
            if kind != "Type3":
                continue
            descriptor = doc.xref_get_key(xref, "FontDescriptor")
            if descriptor[0] == "xref":
                name = doc.xref_get_key(int(descriptor[1].split()[0]), "FontName")
                if name[0] == "name":
                    names.append(name[1].lstrip("/").split("+")[-1].lower())
    except Exception:  # never let a font lookup break a conversion
        pass
    serif = bool(names) and all(any(h in n for h in _SERIF_HINTS) and "sans" not in n for n in names)
    bold = any(any(h in n for h in _BOLD_HINTS) for n in names)
    return ("Times New Roman" if serif else "Arial"), bold


def _rename_type3(blocks: list[dict], family: str, has_bold: bool) -> None:
    for block in blocks:
        for line in block.get("lines", []) or []:
            for span in line.get("spans") or []:
                if span.get("font") == TYPE3_FONT:
                    span["font"] = family
                    if has_bold and float(span.get("size") or 0) >= 14:
                        span["flags"] = int(span.get("flags") or 0) | 16


def apply() -> None:
    global _APPLIED
    if _APPLIED:
        return
    from pdf2docx.page import RawPageFitz as raw_module
    from pdf2docx.common.algorithm import get_area
    from pdf2docx.common.constants import FACTOR_A_HALF as half

    def _preprocess_text(self, **settings):
        ocr = settings.get("ocr", 0)
        if ocr == 1:
            raise SystemExit("OCR feature is planned but not implemented yet.")
        raw = self.page_engine.get_text("rawdict", flags=64)
        text_blocks = raw.get("blocks", [])
        try:
            spans = self.page_engine.get_texttrace()
        except SystemError:
            logging.warning("Ignore hidden text checking due to UnicodeDecodeError in upstream library.")
            spans = []
        if spans:
            if ocr == 2:
                hidden = [s for s in spans if s["type"] != 3]
            else:
                # Type 3 glyphs are reported as type 3 but are visible.
                hidden = [s for s in spans if s["type"] == 3 and s.get("font") != TYPE3_FONT]
            if hidden:
                def area(bbox):
                    x0, y0, x1, y1 = bbox
                    return max(1e-6, (x1 - x0) * (y1 - y0))
                kept = []
                for block in text_blocks:
                    drop = False
                    for line in block.get("lines", []):
                        for span in line.get("spans", []):
                            for h in hidden:
                                if span["font"] == h["font"] and get_area(span["bbox"], h["bbox"]) / area(span["bbox"]) >= half:
                                    drop = True
                                    break
                            if drop:
                                break
                        if drop:
                            break
                    if not drop:
                        kept.append(block)
                text_blocks = kept
        _merge_space_spans(text_blocks)
        if any(span.get("font") == TYPE3_FONT for b in text_blocks for l in b.get("lines", []) or [] for span in l.get("spans") or []):
            family, has_bold = _type3_font_info(self.page_engine)
            _rename_type3(text_blocks, family, has_bold)
        return text_blocks

    raw_module.RawPageFitz._preprocess_text = _preprocess_text
    _APPLIED = True
