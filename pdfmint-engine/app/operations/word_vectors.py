from __future__ import annotations

import os
import math
import re
import zipfile
from pathlib import Path

import fitz
from lxml import etree


NS = {
    "w": "http://schemas.openxmlformats.org/wordprocessingml/2006/main",
    "v": "urn:schemas-microsoft-com:vml",
    "o": "urn:schemas-microsoft-com:office:office",
    "w10": "urn:schemas-microsoft-com:office:word",
    "wp": "http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing",
    "a": "http://schemas.openxmlformats.org/drawingml/2006/main",
    "wps": "http://schemas.microsoft.com/office/word/2010/wordprocessingShape",
    "pic": "http://schemas.openxmlformats.org/drawingml/2006/picture",
    "r": "http://schemas.openxmlformats.org/officeDocument/2006/relationships",
}
W = f"{{{NS['w']}}}"
V = f"{{{NS['v']}}}"
O = f"{{{NS['o']}}}"
W10 = f"{{{NS['w10']}}}"
WP = f"{{{NS['wp']}}}"
A = f"{{{NS['a']}}}"
WPS = f"{{{NS['wps']}}}"
PIC = f"{{{NS['pic']}}}"
REL = f"{{{NS['r']}}}"
XML_SPACE = "{http://www.w3.org/XML/1998/namespace}space"


def _xml_text(value: object) -> str:
    """Remove characters forbidden by XML 1.0 while preserving readable text."""
    return "".join(
        character
        for character in str(value)
        if character in "\t\n\r"
        or "\u0020" <= character <= "\ud7ff"
        or "\ue000" <= character <= "\ufffd"
        or "\U00010000" <= character <= "\U0010ffff"
    )


def _rgb(value: tuple[float, float, float] | None, default: str) -> str:
    if value is None:
        return default
    channels = [max(0, min(255, round(component * 255))) for component in value]
    return "#" + "".join(f"{channel:02X}" for channel in channels)


def _integer_rgb(value: int | None, default: str = "000000") -> str:
    if value is None:
        return default
    return f"{int(value) & 0xFFFFFF:06X}"


def _coord(value: float) -> int:
    return round(value * 100)


def _opacity(value: float | None) -> float:
    return max(0.0, min(1.0, 1.0 if value is None else float(value)))


def _point(point: fitz.Point) -> str:
    return f"{_coord(point.x)},{_coord(point.y)}"


def _drawing_path(items: list[tuple]) -> str:
    commands: list[str] = []
    cursor: fitz.Point | None = None
    for item in items:
        kind = item[0]
        if kind == "l":
            start, end = item[1], item[2]
            if cursor is None or abs(cursor.x - start.x) > 0.01 or abs(cursor.y - start.y) > 0.01:
                commands.append(f"m {_point(start)}")
            commands.append(f"l {_point(end)}")
            cursor = end
        elif kind == "re":
            rect = item[1]
            commands.append(
                " ".join(
                    [
                        f"m {_coord(rect.x0)},{_coord(rect.y0)}",
                        f"l {_coord(rect.x1)},{_coord(rect.y0)}",
                        f"l {_coord(rect.x1)},{_coord(rect.y1)}",
                        f"l {_coord(rect.x0)},{_coord(rect.y1)}",
                        "x",
                    ]
                )
            )
            cursor = None
        elif kind == "qu":
            quad = item[1]
            points = [quad.ul, quad.ur, quad.lr, quad.ll]
            commands.append(
                " ".join([f"m {_point(points[0])}"] + [f"l {_point(point)}" for point in points[1:]] + ["x"])
            )
            cursor = None
        elif kind == "c":
            start, control_1, control_2, end = item[1], item[2], item[3], item[4]
            if cursor is None or abs(cursor.x - start.x) > 0.01 or abs(cursor.y - start.y) > 0.01:
                commands.append(f"m {_point(start)}")
            commands.append(f"c {_point(control_1)},{_point(control_2)},{_point(end)}")
            cursor = end
    if not commands:
        return ""
    return " ".join(commands) + " e"


def _shape_style(width: float, height: float, z_index: int) -> str:
    return ";".join(
        [
            "position:absolute",
            "left:0",
            "top:0",
            "margin-left:0pt",
            "margin-top:0pt",
            f"width:{width:.3f}pt",
            f"height:{height:.3f}pt",
            f"z-index:{z_index}",
            "mso-position-horizontal-relative:page",
            "mso-position-vertical-relative:page",
            "mso-wrap-distance-left:0",
            "mso-wrap-distance-top:0",
            "mso-wrap-distance-right:0",
            "mso-wrap-distance-bottom:0",
        ]
    )


def _positioned_style(rect: fitz.Rect, z_index: int, rotation: float = 0.0) -> str:
    values = [
            "position:absolute",
            "left:0",
            "top:0",
            f"margin-left:{rect.x0:.3f}pt",
            f"margin-top:{rect.y0:.3f}pt",
            f"width:{rect.width:.3f}pt",
            f"height:{rect.height:.3f}pt",
            f"z-index:{z_index}",
            "mso-position-horizontal-relative:page",
            "mso-position-vertical-relative:page",
            "mso-wrap-distance-left:0",
            "mso-wrap-distance-top:0",
            "mso-wrap-distance-right:0",
            "mso-wrap-distance-bottom:0",
    ]
    if abs(rotation) > 0.01:
        values.append(f"rotation:{rotation:.3f}")
    return ";".join(values)


def _add_drawing_shape(
    pict: etree._Element,
    drawing: dict,
    page_width: float,
    page_height: float,
    shape_id: int,
) -> bool:
    path = _drawing_path(drawing.get("items", []))
    if not path:
        return False

    stroke = drawing.get("color")
    fill = drawing.get("fill")
    shape = etree.SubElement(pict, V + "shape")
    shape.set("id", f"pdfbreeze_vector_{shape_id}")
    shape.set("coordorigin", "0,0")
    shape.set("coordsize", f"{_coord(page_width)},{_coord(page_height)}")
    shape.set("path", path)
    shape.set("style", _shape_style(page_width, page_height, -251658240 + shape_id))
    shape.set("stroked", "t" if stroke is not None else "f")
    shape.set("filled", "t" if fill is not None else "f")
    shape.set("strokecolor", _rgb(stroke, "#000000"))
    shape.set("fillcolor", _rgb(fill, "#FFFFFF"))
    shape.set("strokeweight", f"{max(0.25, float(drawing.get('width') or 0.5)):.3f}pt")
    shape.set(O + "allowincell", "f")

    stroke_node = etree.SubElement(shape, V + "stroke")
    stroke_node.set("opacity", f"{_opacity(drawing.get('stroke_opacity')):.4f}")
    dashes = drawing.get("dashes")
    if dashes and str(dashes).strip() not in {"[] 0", "[]0"}:
        stroke_node.set("dashstyle", "dash")
    fill_node = etree.SubElement(shape, V + "fill")
    fill_node.set("opacity", f"{_opacity(drawing.get('fill_opacity')):.4f}")
    wrap = etree.SubElement(shape, W10 + "wrap")
    wrap.set("type", "none")
    return True


def _add_widget_shape(pict: etree._Element, widget: fitz.Widget, shape_id: int) -> bool:
    field_type = widget.field_type_string or ""
    value = "" if widget.field_value in (None, "Off") else _xml_text(widget.field_value)
    rect = widget.rect
    if field_type == "Text":
        if not value:
            return False
        shape = etree.SubElement(pict, V + "rect")
        shape.set("stroked", "f")
        shape.set("filled", "f")
        content = value or " "
    elif field_type == "CheckBox":
        shape = etree.SubElement(pict, V + "rect")
        shape.set("stroked", "t")
        shape.set("filled", "t")
        shape.set("strokecolor", "#000000")
        shape.set("fillcolor", "#FFFFFF")
        shape.set("strokeweight", "0.750pt")
        content = "X" if value else " "
    elif field_type == "RadioButton":
        shape = etree.SubElement(pict, V + "oval")
        shape.set("stroked", "t")
        shape.set("filled", "t")
        shape.set("strokecolor", "#000000")
        shape.set("fillcolor", "#FFFFFF")
        shape.set("strokeweight", "0.750pt")
        content = "•" if value else " "
    else:
        return False

    shape.set("id", f"pdfbreeze_widget_{shape_id}")
    shape.set("style", _positioned_style(rect, 251658240 + shape_id))
    shape.set(O + "allowincell", "f")
    textbox = etree.SubElement(shape, V + "textbox")
    textbox.set("inset", "2pt,1pt,2pt,1pt")
    text_content = etree.SubElement(textbox, W + "txbxContent")
    paragraph = etree.SubElement(text_content, W + "p")
    run = etree.SubElement(paragraph, W + "r")
    properties = etree.SubElement(run, W + "rPr")
    size = etree.SubElement(properties, W + "sz")
    size.set(W + "val", "20")
    text = etree.SubElement(run, W + "t")
    text.set(XML_SPACE, "preserve")
    text.text = content
    wrap = etree.SubElement(shape, W10 + "wrap")
    wrap.set("type", "none")
    return True


def _hide_native_text(root: etree._Element) -> None:
    """Keep pdf2docx layout objects but hide its reflowed copy of visible text."""
    for run in root.findall(f".//{W}r"):
        if not run.findall(f".//{W}t"):
            continue
        properties = run.find(W + "rPr")
        if properties is None:
            properties = etree.Element(W + "rPr")
            run.insert(0, properties)
        if properties.find(W + "vanish") is None:
            etree.SubElement(properties, W + "vanish")


def _hide_native_table_formatting(root: etree._Element) -> None:
    """Suppress reflowed table decoration when exact PDF geometry is overlaid."""
    for table in root.findall(f".//{W}tbl"):
        table_properties = table.find(W + "tblPr")
        if table_properties is None:
            table_properties = etree.Element(W + "tblPr")
            table.insert(0, table_properties)
        borders = table_properties.find(W + "tblBorders")
        if borders is None:
            borders = etree.SubElement(table_properties, W + "tblBorders")
        for edge in ("top", "left", "bottom", "right", "insideH", "insideV"):
            node = borders.find(W + edge)
            if node is None:
                node = etree.SubElement(borders, W + edge)
            node.set(W + "val", "nil")
    for cell_properties in root.findall(f".//{W}tcPr"):
        borders = cell_properties.find(W + "tcBorders")
        if borders is not None:
            cell_properties.remove(borders)
        shading = cell_properties.find(W + "shd")
        if shading is not None:
            shading.set(W + "fill", "auto")
            shading.set(W + "val", "clear")


def _remove_small_native_drawings(root: etree._Element) -> None:
    """Remove tiny reflowed vector clips; exact source paths replace them."""
    for drawing in list(root.findall(f".//{W}drawing")):
        extent = drawing.find(f".//{WP}extent")
        if extent is None:
            continue
        width = int(extent.get("cx", "0"))
        height = int(extent.get("cy", "0"))
        if max(width, height) <= 250000:
            parent = drawing.getparent()
            if parent is not None:
                parent.remove(drawing)


def _replace_with_page_skeleton(root: etree._Element, pdf: fitz.Document) -> None:
    """Create one zero-margin Word section per PDF page for exact overlays."""
    body = root.find(W + "body")
    if body is None:
        return
    for child in list(body):
        body.remove(child)

    def section_properties(page: fitz.Page, include_type: bool) -> etree._Element:
        section = etree.Element(W + "sectPr")
        if include_type:
            section_type = etree.SubElement(section, W + "type")
            section_type.set(W + "val", "nextPage")
        size = etree.SubElement(section, W + "pgSz")
        size.set(W + "w", str(round(page.rect.width * 20)))
        size.set(W + "h", str(round(page.rect.height * 20)))
        margins = etree.SubElement(section, W + "pgMar")
        for name in ("top", "right", "bottom", "left", "header", "footer", "gutter"):
            margins.set(W + name, "0")
        return section

    for page_index, page in enumerate(pdf):
        paragraph = etree.SubElement(body, W + "p")
        if page_index < len(pdf) - 1:
            properties = etree.SubElement(paragraph, W + "pPr")
            properties.append(section_properties(page, include_type=True))
    body.append(section_properties(pdf[-1], include_type=False))


_BULLET_START = re.compile(r"^\s*(?:[•●▪–—\-\*✓✔]|\d{1,3}[.)]|[a-zA-Z][.)])\s")


def _run_properties(run: etree._Element, span: dict) -> None:
    properties = etree.SubElement(run, W + "rPr")
    font_name = str(span.get("font") or "Arial")
    fonts = etree.SubElement(properties, W + "rFonts")
    fonts.set(W + "ascii", font_name)
    fonts.set(W + "hAnsi", font_name)
    fonts.set(W + "cs", font_name)
    flags = int(span.get("flags") or 0)
    if flags & 16:
        etree.SubElement(properties, W + "b")
    if flags & 2:
        etree.SubElement(properties, W + "i")
    color = etree.SubElement(properties, W + "color")
    color.set(W + "val", _integer_rgb(span.get("color")))
    half_points = max(2, round(float(span.get("size") or 10.0) * 2))
    size = etree.SubElement(properties, W + "sz")
    size.set(W + "val", str(half_points))
    size_cs = etree.SubElement(properties, W + "szCs")
    size_cs.set(W + "val", str(half_points))


def _line_text(line: dict) -> str:
    return "".join(str(span.get("text") or "") for span in line.get("spans", []))


def _block_paragraphs(lines: list[dict], block_rect: fitz.Rect) -> list[list[dict]]:
    """Group a block's lines into paragraphs: a line that ends short of the block's
    right edge, a list item, or a bigger gap starts a new paragraph."""
    paragraphs: list[list[dict]] = []
    previous = None
    for line in lines:
        rect = fitz.Rect(line["bbox"])
        text = _line_text(line)
        new_paragraph = previous is None
        if previous is not None:
            prev_rect = fitz.Rect(previous["bbox"])
            height = max(prev_rect.height, rect.height, 1.0)
            gap = rect.y0 - prev_rect.y1
            prev_text = _line_text(previous).rstrip()
            short = prev_rect.x1 < block_rect.x1 - max(18.0, block_rect.width * 0.18)
            new_paragraph = (
                gap > height * 0.6
                or _BULLET_START.match(text) is not None
                or short
                or prev_text.endswith(":")
            )
        if new_paragraph:
            paragraphs.append([line])
        else:
            paragraphs[-1].append(line)
        previous = line
    return paragraphs


def _alignment(paragraph_lines: list[dict], block_rect: fitz.Rect) -> str | None:
    if len(paragraph_lines) == 0:
        return None
    centred = all(
        abs((fitz.Rect(l["bbox"]).x0 + fitz.Rect(l["bbox"]).x1) / 2 - (block_rect.x0 + block_rect.x1) / 2) < 2.5
        for l in paragraph_lines
    )
    lefts = {round(fitz.Rect(l["bbox"]).x0) for l in paragraph_lines}
    if centred and (len(lefts) > 1 or fitz.Rect(paragraph_lines[0]["bbox"]).x0 > block_rect.x0 + 2):
        return "center"
    rights = [fitz.Rect(l["bbox"]).x1 for l in paragraph_lines]
    if len(paragraph_lines) > 1 and max(rights) - min(rights) < 2.0 and len(lefts) > 1:
        return "right"
    return None


def _add_text_paragraphs(text_content: etree._Element, paragraphs: list[list[dict]], block_rect: fitz.Rect) -> None:
    for index, lines in enumerate(paragraphs):
        paragraph = etree.SubElement(text_content, W + "p")
        properties = etree.SubElement(paragraph, W + "pPr")
        spacing = etree.SubElement(properties, W + "spacing")
        spacing.set(W + "before", "0")
        # Space after = the PDF's gap to the next paragraph.
        after = 0.0
        if index + 1 < len(paragraphs):
            after = max(0.0, fitz.Rect(paragraphs[index + 1][0]["bbox"]).y0 - fitz.Rect(lines[-1]["bbox"]).y1)
        spacing.set(W + "after", str(round(after * 20)))
        # Line spacing = the PDF's baseline-to-baseline distance when the paragraph has several lines.
        if len(lines) > 1:
            pitches = [fitz.Rect(b["bbox"]).y1 - fitz.Rect(a["bbox"]).y1 for a, b in zip(lines, lines[1:])]
            pitch = sorted(pitches)[len(pitches) // 2]
            spacing.set(W + "line", str(max(120, round(pitch * 20))))
            spacing.set(W + "lineRule", "exact")
        else:
            spacing.set(W + "line", "240")
            spacing.set(W + "lineRule", "auto")
        justification = _alignment(lines, block_rect)
        if justification:
            jc = etree.SubElement(properties, W + "jc")
            jc.set(W + "val", justification)
        for line_index, line in enumerate(lines):
            spans = [span for span in line.get("spans", []) if span.get("text")]
            if line_index > 0 and spans:
                # Join wrapped lines with a space (no space after a broken word).
                previous_text = _line_text(lines[line_index - 1])
                if not previous_text.endswith(("-", " ")) and not spans[0]["text"].startswith(" "):
                    spans = [{**spans[0], "text": " " + spans[0]["text"]}] + spans[1:]
            for span in spans:
                run = etree.SubElement(paragraph, W + "r")
                _run_properties(run, span)
                text = etree.SubElement(run, W + "t")
                text.set(XML_SPACE, "preserve")
                text.text = _xml_text(span["text"])


def _add_block_text_box(run: etree._Element, rect: fitz.Rect, paragraphs: list[list[dict]], block_rect: fitz.Rect, text_id: int) -> None:
    """One editable Word text box per PDF text block (DrawingML: Word and LibreOffice
    both keep its width and grow its height to fit the text)."""
    emu = 12700
    drawing = etree.SubElement(run, W + "drawing")
    anchor = etree.SubElement(drawing, WP + "anchor")
    for key in ("distT", "distB", "distL", "distR"):
        anchor.set(key, "0")
    anchor.set("simplePos", "0")
    anchor.set("relativeHeight", str(251000000 + text_id))
    anchor.set("behindDoc", "0")
    anchor.set("locked", "0")
    anchor.set("layoutInCell", "1")
    anchor.set("allowOverlap", "1")
    simple_position = etree.SubElement(anchor, WP + "simplePos")
    simple_position.set("x", "0")
    simple_position.set("y", "0")
    horizontal = etree.SubElement(anchor, WP + "positionH")
    horizontal.set("relativeFrom", "page")
    etree.SubElement(horizontal, WP + "posOffset").text = str(round(rect.x0 * emu))
    vertical = etree.SubElement(anchor, WP + "positionV")
    vertical.set("relativeFrom", "page")
    etree.SubElement(vertical, WP + "posOffset").text = str(round(rect.y0 * emu))
    extent = etree.SubElement(anchor, WP + "extent")
    extent.set("cx", str(round(rect.width * emu)))
    extent.set("cy", str(round(rect.height * emu)))
    effect = etree.SubElement(anchor, WP + "effectExtent")
    for key in ("l", "t", "r", "b"):
        effect.set(key, "0")
    etree.SubElement(anchor, WP + "wrapNone")
    doc_properties = etree.SubElement(anchor, WP + "docPr")
    doc_properties.set("id", str(20000 + text_id))
    doc_properties.set("name", f"PDFBreeze text {text_id}")
    etree.SubElement(anchor, WP + "cNvGraphicFramePr")
    graphic = etree.SubElement(anchor, A + "graphic")
    graphic_data = etree.SubElement(graphic, A + "graphicData")
    graphic_data.set("uri", NS["wps"])
    word_shape = etree.SubElement(graphic_data, WPS + "wsp")
    non_visual = etree.SubElement(word_shape, WPS + "cNvSpPr")
    non_visual.set("txBox", "1")
    shape_properties = etree.SubElement(word_shape, WPS + "spPr")
    transform = etree.SubElement(shape_properties, A + "xfrm")
    offset = etree.SubElement(transform, A + "off")
    offset.set("x", "0")
    offset.set("y", "0")
    shape_extent = etree.SubElement(transform, A + "ext")
    shape_extent.set("cx", str(round(rect.width * emu)))
    shape_extent.set("cy", str(round(rect.height * emu)))
    geometry = etree.SubElement(shape_properties, A + "prstGeom")
    geometry.set("prst", "rect")
    etree.SubElement(geometry, A + "avLst")
    etree.SubElement(shape_properties, A + "noFill")
    line = etree.SubElement(shape_properties, A + "ln")
    etree.SubElement(line, A + "noFill")
    textbox = etree.SubElement(word_shape, WPS + "txbx")
    text_content = etree.SubElement(textbox, W + "txbxContent")
    _add_text_paragraphs(text_content, paragraphs, block_rect)
    body_properties = etree.SubElement(word_shape, WPS + "bodyPr")
    # A one-line block never wraps (the stand-in font can be a little wider than the PDF's).
    single_line = len(paragraphs) == 1 and len(paragraphs[0]) == 1
    body_properties.set("wrap", "none" if single_line else "square")
    for key in ("lIns", "tIns", "rIns", "bIns"):
        body_properties.set(key, "0")
    etree.SubElement(body_properties, A + "spAutoFit")


def _add_positioned_text(pict: etree._Element, page: fitz.Page, first_id: int, colours: "_TextColours | None" = None) -> int:
    """Recreate PDF text as editable, page-positioned Word text boxes: one box per
    text block, with real paragraphs inside (lines re-wrap when edited)."""
    from .pdf2docx_fixes import TYPE3_FONT, _type3_font_info

    text_id = first_id
    run = pict.getparent()
    raw = page.get_text("dict", flags=fitz.TEXTFLAGS_TEXT)
    type3 = None
    for block in raw.get("blocks", []):
        if block.get("type") != 0:
            continue
        horizontal_lines: list[dict] = []
        for line in block.get("lines", []):
            spans = [span for span in line.get("spans", []) if span.get("text")]
            if not spans:
                continue
            for span in spans:
                is_ocr = span.get("font") == "GlyphLessFont"
                if span.get("font") in (TYPE3_FONT, "GlyphLessFont"):
                    if type3 is None:
                        type3 = _type3_font_info(page)
                    if span.get("font") == "GlyphLessFont":
                        span["flags"] = int(span.get("flags") or 0) & ~16
                        span["font"] = "Arial"
                    else:
                        span["font"] = type3[0]
                    if type3[1] and span["font"] != "Arial" or (type3[1] and float(span.get("size") or 0) >= 14):
                        if float(span.get("size") or 0) >= 14:
                            span["flags"] = int(span.get("flags") or 0) | 16
                    # The reported size of Type 3 text is unreliable: size the stand-in font so the
                    # text takes the same width as in the PDF.
                    text_value = str(span.get("text") or "")
                    if text_value.strip():
                        bold = bool(int(span.get("flags") or 0) & 16)
                        serif = span["font"].startswith("Times")
                        font_code = ("tibo" if bold else "tiro") if serif else ("hebo" if bold else "helv")
                        size = float(span.get("size") or 10.0)
                        natural = fitz.get_text_length(text_value, fontname=font_code, fontsize=size)
                        target = fitz.Rect(span["bbox"]).width
                        # Single characters (digits, fractions) are measured unreliably: they take
                        # the size of the rest of their line instead (set below).
                        if natural > 0 and target > 0 and len(text_value.strip()) >= 4:
                            span["size"] = max(4.0, min(size * 1.15, size * target / natural))
                            span["_scaled"] = span["size"] / size
                    if colours is not None:
                        sampled = colours.colour(page.number, span.get("bbox"), scanned=span["font"] == "Arial" and is_ocr)
                        if sampled is not None:
                            span["color"] = sampled
            scaled = sorted(span["_scaled"] for span in spans if "_scaled" in span)
            if scaled:
                factor = scaled[len(scaled) // 2]
                for span in spans:
                    if "_scaled" not in span and span.get("font") in ("Arial", "Times New Roman") and str(span.get("text") or "").strip():
                        span["size"] = max(4.0, float(span.get("size") or 10.0) * factor)
            for span in spans:
                span.pop("_scaled", None)
            line = {**line, "spans": spans}
            direction = line.get("dir") or (1.0, 0.0)
            rotation = math.degrees(math.atan2(float(direction[1]), float(direction[0])))
            if abs(rotation) > 0.01:
                text_id += 1
                rect = fitz.Rect(line.get("bbox") or spans[0].get("bbox"))
                _add_rotated_text_box(run, rect, spans, rotation, text_id)
                continue
            if not _line_text(line).strip():
                continue
            horizontal_lines.append(line)
        if not horizontal_lines:
            continue
        block_rect = fitz.Rect(horizontal_lines[0]["bbox"])
        for line in horizontal_lines[1:]:
            block_rect |= fitz.Rect(line["bbox"])
        # One box per paragraph: a one-line heading never wraps, and a multi-line
        # paragraph re-wraps inside its own box when edited.
        for paragraph in _block_paragraphs(horizontal_lines, block_rect):
            para_rect = fitz.Rect(paragraph[0]["bbox"])
            for line in paragraph[1:]:
                para_rect |= fitz.Rect(line["bbox"])
            width = (block_rect.x1 - para_rect.x0) if len(paragraph) > 1 else para_rect.width
            # Room for the replacement font being a little wider than the PDF's own.
            if len(paragraph) == 1:
                # One line: give it plenty of room (boxes are see-through) so a slightly
                # wider stand-in font never wraps it, whatever opens the file.
                right = min(page.rect.x1 - 4.0, para_rect.x0 + width * 1.35 + 12.0)
                if (_alignment(paragraph, block_rect) or "") == "center":
                    grow = (right - para_rect.x0 - width) / 2
                    box = fitz.Rect(para_rect.x0 - grow, para_rect.y0, para_rect.x1 + grow, para_rect.y1 + 2.0)
                else:
                    box = fitz.Rect(para_rect.x0, para_rect.y0, max(right, para_rect.x1 + 6.0), para_rect.y1 + 2.0)
            else:
                box = fitz.Rect(para_rect.x0, para_rect.y0, para_rect.x0 + width + max(6.0, width * 0.08), para_rect.y1 + 2.0)
            text_id += 1
            _add_block_text_box(run, box, [paragraph], block_rect, text_id)
    return text_id - first_id


def _add_rotated_text_box(
    run: etree._Element,
    source_rect: fitz.Rect,
    spans: list[dict],
    rotation: float,
    text_id: int,
) -> None:
    """Add rotated editable text with DrawingML; Word ignores VML textbox rotation."""
    radians = math.radians(rotation)
    projected = max(source_rect.width, source_rect.height)
    factor = max(abs(math.cos(radians)), abs(math.sin(radians)), 0.01)
    width = projected / factor + 4.0
    height = max(float(span.get("size") or 10.0) for span in spans) * 1.6
    center = fitz.Point(
        (source_rect.x0 + source_rect.x1) / 2,
        (source_rect.y0 + source_rect.y1) / 2,
    )
    x = center.x - width / 2
    y = center.y - height / 2
    emu = 12700

    drawing = etree.SubElement(run, W + "drawing")
    anchor = etree.SubElement(drawing, WP + "anchor")
    for key in ("distT", "distB", "distL", "distR"):
        anchor.set(key, "0")
    anchor.set("simplePos", "0")
    anchor.set("relativeHeight", str(251000000 + text_id))
    anchor.set("behindDoc", "0")
    anchor.set("locked", "0")
    anchor.set("layoutInCell", "1")
    anchor.set("allowOverlap", "1")
    simple_position = etree.SubElement(anchor, WP + "simplePos")
    simple_position.set("x", "0")
    simple_position.set("y", "0")
    horizontal = etree.SubElement(anchor, WP + "positionH")
    horizontal.set("relativeFrom", "page")
    etree.SubElement(horizontal, WP + "posOffset").text = str(round(x * emu))
    vertical = etree.SubElement(anchor, WP + "positionV")
    vertical.set("relativeFrom", "page")
    etree.SubElement(vertical, WP + "posOffset").text = str(round(y * emu))
    extent = etree.SubElement(anchor, WP + "extent")
    extent.set("cx", str(round(width * emu)))
    extent.set("cy", str(round(height * emu)))
    effect = etree.SubElement(anchor, WP + "effectExtent")
    for key in ("l", "t", "r", "b"):
        effect.set(key, "0")
    etree.SubElement(anchor, WP + "wrapNone")
    doc_properties = etree.SubElement(anchor, WP + "docPr")
    doc_properties.set("id", str(10000 + text_id))
    doc_properties.set("name", f"PDFBreeze rotated text {text_id}")
    etree.SubElement(anchor, WP + "cNvGraphicFramePr")
    graphic = etree.SubElement(anchor, A + "graphic")
    graphic_data = etree.SubElement(graphic, A + "graphicData")
    graphic_data.set("uri", NS["wps"])
    word_shape = etree.SubElement(graphic_data, WPS + "wsp")
    non_visual = etree.SubElement(word_shape, WPS + "cNvSpPr")
    non_visual.set("txBox", "1")
    shape_properties = etree.SubElement(word_shape, WPS + "spPr")
    transform = etree.SubElement(shape_properties, A + "xfrm")
    transform.set("rot", str(round(rotation * 60000)))
    offset = etree.SubElement(transform, A + "off")
    offset.set("x", "0")
    offset.set("y", "0")
    shape_extent = etree.SubElement(transform, A + "ext")
    shape_extent.set("cx", str(round(width * emu)))
    shape_extent.set("cy", str(round(height * emu)))
    geometry = etree.SubElement(shape_properties, A + "prstGeom")
    geometry.set("prst", "rect")
    etree.SubElement(geometry, A + "avLst")
    etree.SubElement(shape_properties, A + "noFill")
    line = etree.SubElement(shape_properties, A + "ln")
    etree.SubElement(line, A + "noFill")
    textbox = etree.SubElement(word_shape, WPS + "txbx")
    text_content = etree.SubElement(textbox, W + "txbxContent")
    paragraph = etree.SubElement(text_content, W + "p")
    for span in spans:
        text_run = etree.SubElement(paragraph, W + "r")
        properties = etree.SubElement(text_run, W + "rPr")
        font_name = str(span.get("font") or "Arial")
        fonts = etree.SubElement(properties, W + "rFonts")
        fonts.set(W + "ascii", font_name)
        fonts.set(W + "hAnsi", font_name)
        flags = int(span.get("flags") or 0)
        if flags & 16:
            etree.SubElement(properties, W + "b")
        if flags & 2:
            etree.SubElement(properties, W + "i")
        color = etree.SubElement(properties, W + "color")
        color.set(W + "val", _integer_rgb(span.get("color")))
        half_points = max(2, round(float(span.get("size") or 10.0) * 2))
        size = etree.SubElement(properties, W + "sz")
        size.set(W + "val", str(half_points))
        text = etree.SubElement(text_run, W + "t")
        text.set(XML_SPACE, "preserve")
        text.text = _xml_text(span["text"])
    body_properties = etree.SubElement(word_shape, WPS + "bodyPr")
    body_properties.set("wrap", "none")
    for key in ("lIns", "tIns", "rIns", "bIns"):
        body_properties.set(key, "0")


def _crop_payload(pdf: fitz.Document, xref: int, crop: tuple[float, float, float, float]) -> tuple[bytes, str] | None:
    """The visible part of a picture (fractions of its width/height)."""
    try:
        info = pdf.extract_image(xref)
        pix = fitz.Pixmap(pdf, xref)
        if pix.colorspace and pix.colorspace.n > 3:
            pix = fitz.Pixmap(fitz.csRGB, pix)
        if info.get("smask") and not pix.alpha:
            pix = fitz.Pixmap(pix, fitz.Pixmap(pdf, info["smask"]))
        w, h = pix.width, pix.height
        box = fitz.IRect(int(crop[0] * w), int(crop[1] * h), max(int(crop[0] * w) + 1, int(round(crop[2] * w))), max(int(crop[1] * h) + 1, int(round(crop[3] * h))))
        cut = fitz.Pixmap(pix.colorspace, box, pix.alpha)
        cut.copy(pix, box)
        if pix.alpha:
            return cut.tobytes("png"), "png"
        return cut.tobytes("jpeg", jpg_quality=88), "jpeg"
    except Exception:
        return None


def _image_payload(pdf: fitz.Document, xref: int, crop: tuple[float, float, float, float] | None = None) -> tuple[bytes, str] | None:
    """The picture's own bytes (JPEG/PNG kept as-is); PNG with transparency when it has a soft mask."""
    if crop is not None:
        cropped = _crop_payload(pdf, xref, crop)
        if cropped is not None:
            return cropped
    try:
        info = pdf.extract_image(xref)
    except Exception:
        return None
    if not info or not info.get("image"):
        return None
    if info.get("smask"):
        try:
            base = fitz.Pixmap(pdf, xref)
            if base.alpha:
                base = fitz.Pixmap(base, 0)
            if base.colorspace and base.colorspace.n > 3:
                base = fitz.Pixmap(fitz.csRGB, base)
            mask = fitz.Pixmap(pdf, info["smask"])
            combined = fitz.Pixmap(base, mask)
            return combined.tobytes("png"), "png"
        except Exception:
            pass
    ext = str(info.get("ext") or "png").lower()
    if ext in ("jpeg", "jpg") and info.get("colorspace", 3) in (1, 3):
        return info["image"], "jpeg"
    if ext == "png":
        return info["image"], "png"
    try:
        pix = fitz.Pixmap(pdf, xref)
        if pix.colorspace and pix.colorspace.n > 3:
            pix = fitz.Pixmap(fitz.csRGB, pix)
        return pix.tobytes("png"), "png"
    except Exception:
        return None


def _add_picture(run: etree._Element, rect: fitz.Rect, rel_id: str, picture_id: int, layer: int = 5000) -> None:
    """A picture anchored to the page at the PDF position, behind the text."""
    emu = 12700
    drawing = etree.SubElement(run, W + "drawing")
    anchor = etree.SubElement(drawing, WP + "anchor")
    for key in ("distT", "distB", "distL", "distR"):
        anchor.set(key, "0")
    anchor.set("simplePos", "0")
    # Stacking: page background (100) < shapes (2000+) < pictures (5000+) < text boxes.
    anchor.set("relativeHeight", str(layer + picture_id))
    anchor.set("behindDoc", "1")
    anchor.set("locked", "0")
    anchor.set("layoutInCell", "1")
    anchor.set("allowOverlap", "1")
    simple_position = etree.SubElement(anchor, WP + "simplePos")
    simple_position.set("x", "0")
    simple_position.set("y", "0")
    horizontal = etree.SubElement(anchor, WP + "positionH")
    horizontal.set("relativeFrom", "page")
    etree.SubElement(horizontal, WP + "posOffset").text = str(round(rect.x0 * emu))
    vertical = etree.SubElement(anchor, WP + "positionV")
    vertical.set("relativeFrom", "page")
    etree.SubElement(vertical, WP + "posOffset").text = str(round(rect.y0 * emu))
    extent = etree.SubElement(anchor, WP + "extent")
    extent.set("cx", str(max(1, round(rect.width * emu))))
    extent.set("cy", str(max(1, round(rect.height * emu))))
    effect = etree.SubElement(anchor, WP + "effectExtent")
    for key in ("l", "t", "r", "b"):
        effect.set(key, "0")
    etree.SubElement(anchor, WP + "wrapNone")
    doc_properties = etree.SubElement(anchor, WP + "docPr")
    doc_properties.set("id", str(40000 + picture_id))
    doc_properties.set("name", f"Picture {picture_id}")
    etree.SubElement(anchor, WP + "cNvGraphicFramePr")
    graphic = etree.SubElement(anchor, A + "graphic")
    graphic_data = etree.SubElement(graphic, A + "graphicData")
    graphic_data.set("uri", NS["pic"])
    picture = etree.SubElement(graphic_data, PIC + "pic")
    nv = etree.SubElement(picture, PIC + "nvPicPr")
    c_nv = etree.SubElement(nv, PIC + "cNvPr")
    c_nv.set("id", str(40000 + picture_id))
    c_nv.set("name", f"Picture {picture_id}")
    etree.SubElement(nv, PIC + "cNvPicPr")
    fill = etree.SubElement(picture, PIC + "blipFill")
    blip = etree.SubElement(fill, A + "blip")
    blip.set(REL + "embed", rel_id)
    stretch = etree.SubElement(fill, A + "stretch")
    etree.SubElement(stretch, A + "fillRect")
    sp = etree.SubElement(picture, PIC + "spPr")
    xfrm = etree.SubElement(sp, A + "xfrm")
    off = etree.SubElement(xfrm, A + "off")
    off.set("x", "0")
    off.set("y", "0")
    ext = etree.SubElement(xfrm, A + "ext")
    ext.set("cx", str(max(1, round(rect.width * emu))))
    ext.set("cy", str(max(1, round(rect.height * emu))))
    geometry = etree.SubElement(sp, A + "prstGeom")
    geometry.set("prst", "rect")
    etree.SubElement(geometry, A + "avLst")


def _shape_backgrounds(pdf: fitz.Document, pages: set[int], dpi: int = 150) -> dict[int, tuple[bytes, str]]:
    """For exact layout: each page's coloured shapes, lines and charts as one picture.

    Text and photos are removed from a copy of the page first (they're added on top as
    editable text boxes and separate pictures). One background picture looks the same
    in Word and LibreOffice and is far lighter than thousands of drawn shapes."""
    backgrounds: dict[int, tuple[bytes, str]] = {}
    if not pages:
        return backgrounds
    copy = fitz.open(stream=pdf.tobytes(garbage=0), filetype="pdf")
    try:
        for index in sorted(pages):
            page = copy[index]
            page.add_redact_annot(page.rect)
            page.apply_redactions(images=fitz.PDF_REDACT_IMAGE_REMOVE, graphics=fitz.PDF_REDACT_LINE_ART_NONE, text=fitz.PDF_REDACT_TEXT_REMOVE)
            pix = page.get_pixmap(dpi=dpi, alpha=False)
            # Nothing left but white paper: no background needed.
            if pix.is_unicolor and pix.pixel(0, 0) == (255, 255, 255):
                continue
            backgrounds[index] = (pix.tobytes("jpeg", jpg_quality=82), "jpeg")
            pix = None
    finally:
        copy.close()
    return backgrounds


class _TextColours:
    """Real colours for text whose font doesn't report one (Type 3 fonts are reported as
    black): compare the page rendered with and without its text, and take the colour of
    the pixels that changed inside each span."""

    def __init__(self, pdf: fitz.Document, dpi: int = 96):
        self.pdf = pdf
        self.dpi = dpi
        self.copy: fitz.Document | None = None
        self.cache: dict[int, tuple] = {}

    def _arrays(self, index: int):
        if index not in self.cache:
            import numpy as np
            if self.copy is None:
                self.copy = fitz.open(stream=self.pdf.tobytes(garbage=0), filetype="pdf")
            original = self.pdf[index].get_pixmap(dpi=self.dpi, alpha=False)
            blank = self.copy[index]
            blank.add_redact_annot(blank.rect)
            blank.apply_redactions(images=fitz.PDF_REDACT_IMAGE_NONE, graphics=fitz.PDF_REDACT_LINE_ART_NONE, text=fitz.PDF_REDACT_TEXT_REMOVE)
            no_text = blank.get_pixmap(dpi=self.dpi, alpha=False)
            to_array = lambda pix: np.frombuffer(pix.samples, dtype=np.uint8).reshape(pix.height, pix.width, pix.n)[:, :, :3].astype(np.int16)
            self.cache.clear()  # one page at a time keeps memory low
            self.cache[index] = (to_array(original), to_array(no_text))
        return self.cache[index]

    def _bare(self, index: int):
        """Page with text and pictures removed (to see which part of each picture shows)."""
        key = ("bare", index)
        if key not in self.cache:
            import numpy as np
            copy = fitz.open(stream=self.pdf.tobytes(garbage=0), filetype="pdf")
            try:
                page = copy[index]
                page.add_redact_annot(page.rect)
                page.apply_redactions(images=fitz.PDF_REDACT_IMAGE_REMOVE, graphics=fitz.PDF_REDACT_LINE_ART_NONE, text=fitz.PDF_REDACT_TEXT_REMOVE)
                pix = page.get_pixmap(dpi=self.dpi, alpha=False)
                self.cache[key] = np.frombuffer(pix.samples, dtype=np.uint8).reshape(pix.height, pix.width, pix.n)[:, :, :3].astype(np.int16)
            finally:
                copy.close()
        return self.cache[key]

    def visible_rect(self, index: int, bbox: fitz.Rect) -> fitz.Rect | None:
        """The part of a picture that actually shows on the page (pictures are often
        cropped by a rounded card or frame)."""
        import numpy as np
        _original, no_text = self._arrays(index)
        bare = self._bare(index)
        scale = self.dpi / 72.0
        x0, y0 = int(max(0, bbox.x0 * scale)), int(max(0, bbox.y0 * scale))
        x1, y1 = int(min(no_text.shape[1], bbox.x1 * scale + 1)), int(min(no_text.shape[0], bbox.y1 * scale + 1))
        if x1 - x0 < 2 or y1 - y0 < 2:
            return None
        changed = np.abs(no_text[y0:y1, x0:x1] - bare[y0:y1, x0:x1]).sum(axis=2) > 24
        rows, cols = np.where(changed.any(axis=1))[0], np.where(changed.any(axis=0))[0]
        if not len(rows) or not len(cols):
            return None
        return fitz.Rect((x0 + cols[0]) / scale, (y0 + rows[0]) / scale, (x0 + cols[-1] + 1) / scale, (y0 + rows[-1] + 1) / scale) & bbox

    def colour(self, index: int, bbox, scanned: bool = False) -> int | None:
        import numpy as np
        original, no_text = self._arrays(index)
        scale = self.dpi / 72.0
        x0, y0, x1, y1 = (int(max(0, v * scale)) for v in bbox)
        x1, y1 = min(original.shape[1], max(x1, x0 + 1)), min(original.shape[0], max(y1, y0 + 1))
        a, b = original[y0:y1, x0:x1], no_text[y0:y1, x0:x1]
        if a.size == 0:
            return None
        changed = np.abs(a - b).sum(axis=2) > 90
        if changed.sum() < 3:
            # Invisible (OCR) text over a scan: the letters are in the picture itself, so
            # take the pixels that stand out from the paper around them.
            paper = np.median(a.reshape(-1, 3), axis=0)
            contrast = np.abs(a - paper).sum(axis=2)
            changed = contrast > 120
            if changed.sum() < 3:
                return None
            pixels = a[changed]
            # Scanned letters are blurred at the edges: their true colour is in the darkest
            # part of each stroke. Near-grey ink is printed black.
            cut = 85 if scanned else 60
            core = pixels[contrast[changed] >= np.percentile(contrast[changed], cut)]
            r, g, bl = (int(np.median(core[:, i])) for i in range(3))
            if scanned and max(r, g, bl) - min(r, g, bl) < 40 and (r + g + bl) / 3 < 170:
                r = g = bl = 0x1A
            return (r << 16) | (g << 8) | bl
        pixels = a[changed]
        # Anti-aliased edges are blends; the most changed pixels are the glyph cores.
        strength = np.abs(a - b).sum(axis=2)[changed]
        core = pixels[strength >= np.percentile(strength, 60)]
        r, g, bl = (int(np.median(core[:, i])) for i in range(3))
        return (r << 16) | (g << 8) | bl

    def close(self) -> None:
        if self.copy is not None:
            self.copy.close()
            self.copy = None
        self.cache.clear()


def _hidden_text_rects(page: fitz.Page) -> list[fitz.Rect]:
    """Where invisible text (an OCR layer) sits on the page."""
    try:
        return [fitz.Rect(s["bbox"]) for s in page.get_texttrace() if s.get("type") == 3 and s.get("font") != "Unnamed-T3"]
    except Exception:
        return []


def _erase_text_from_scan(pdf: fitz.Document, xref: int, placed: fitz.Rect, words: list[fitz.Rect]) -> tuple[bytes, str] | None:
    """The scan with its lettering painted over in the paper colour around each word,
    so the editable text placed on top doesn't show twice. Logos, signatures and
    pictures elsewhere on the scan stay."""
    try:
        import numpy as np
        pix = fitz.Pixmap(pdf, xref)
        if pix.alpha:
            pix = fitz.Pixmap(pix, 0)
        if not pix.colorspace or pix.colorspace.n != 3:
            pix = fitz.Pixmap(fitz.csRGB, pix)
        img = np.frombuffer(pix.samples, dtype=np.uint8).reshape(pix.height, pix.width, 3).copy()
        sx, sy = pix.width / placed.width, pix.height / placed.height
        for word in words:
            r = word & placed
            if r.is_empty:
                continue
            x0 = max(0, int((r.x0 - placed.x0) * sx) - 2)
            y0 = max(0, int((r.y0 - placed.y0) * sy) - 2)
            x1 = min(pix.width, int((r.x1 - placed.x0) * sx) + 3)
            y1 = min(pix.height, int((r.y1 - placed.y0) * sy) + 3)
            if x1 <= x0 or y1 <= y0:
                continue
            ring = np.concatenate([
                img[max(0, y0 - 3):y0, x0:x1].reshape(-1, 3),
                img[y1:min(pix.height, y1 + 3), x0:x1].reshape(-1, 3),
                img[y0:y1, max(0, x0 - 3):x0].reshape(-1, 3),
                img[y0:y1, x1:min(pix.width, x1 + 3)].reshape(-1, 3),
            ])
            colour = np.median(ring, axis=0) if len(ring) else np.array([255, 255, 255])
            img[y0:y1, x0:x1] = colour.astype(np.uint8)
        out = fitz.Pixmap(fitz.csRGB, pix.width, pix.height, img.tobytes(), False)
        return out.tobytes("jpeg", jpg_quality=85), "jpeg"
    except Exception:
        return None


def _add_drawing_shape_dml(run: etree._Element, drawing: dict, page_rect: fitz.Rect, shape_id: int) -> bool:
    """A PDF line/rule/shape as an editable Word shape (DrawingML), drawn the same way
    by Word and LibreOffice."""
    emu = 12700
    commands: list[tuple[str, list[fitz.Point]]] = []
    cursor = None
    for item in drawing.get("items", []):
        kind = item[0]
        if kind == "l":
            start, end = item[1], item[2]
            if cursor is None or abs(cursor.x - start.x) > 0.01 or abs(cursor.y - start.y) > 0.01:
                commands.append(("moveTo", [start]))
            commands.append(("lnTo", [end]))
            cursor = end
        elif kind == "re":
            r = item[1]
            commands += [("moveTo", [fitz.Point(r.x0, r.y0)]), ("lnTo", [fitz.Point(r.x1, r.y0)]), ("lnTo", [fitz.Point(r.x1, r.y1)]), ("lnTo", [fitz.Point(r.x0, r.y1)]), ("close", [])]
            cursor = None
        elif kind == "qu":
            q = item[1]
            commands += [("moveTo", [q.ul]), ("lnTo", [q.ur]), ("lnTo", [q.lr]), ("lnTo", [q.ll]), ("close", [])]
            cursor = None
        elif kind == "c":
            start = item[1]
            if cursor is None or abs(cursor.x - start.x) > 0.01 or abs(cursor.y - start.y) > 0.01:
                commands.append(("moveTo", [start]))
            commands.append(("cubicBezTo", [item[2], item[3], item[4]]))
            cursor = item[4]
    if not commands:
        return False
    if drawing.get("closePath") and commands[-1][0] != "close":
        commands.append(("close", []))
    stroke, fill = drawing.get("color"), drawing.get("fill")
    width, height = page_rect.width, page_rect.height
    drawing_node = etree.SubElement(run, W + "drawing")
    anchor = etree.SubElement(drawing_node, WP + "anchor")
    for key in ("distT", "distB", "distL", "distR"):
        anchor.set(key, "0")
    anchor.set("simplePos", "0")
    anchor.set("relativeHeight", str(2000 + shape_id))
    anchor.set("behindDoc", "1")
    anchor.set("locked", "0")
    anchor.set("layoutInCell", "1")
    anchor.set("allowOverlap", "1")
    simple = etree.SubElement(anchor, WP + "simplePos")
    simple.set("x", "0")
    simple.set("y", "0")
    ph = etree.SubElement(anchor, WP + "positionH")
    ph.set("relativeFrom", "page")
    etree.SubElement(ph, WP + "posOffset").text = "0"
    pv = etree.SubElement(anchor, WP + "positionV")
    pv.set("relativeFrom", "page")
    etree.SubElement(pv, WP + "posOffset").text = "0"
    extent = etree.SubElement(anchor, WP + "extent")
    extent.set("cx", str(round(width * emu)))
    extent.set("cy", str(round(height * emu)))
    effect = etree.SubElement(anchor, WP + "effectExtent")
    for key in ("l", "t", "r", "b"):
        effect.set(key, "0")
    etree.SubElement(anchor, WP + "wrapNone")
    doc_pr = etree.SubElement(anchor, WP + "docPr")
    doc_pr.set("id", str(60000 + shape_id))
    doc_pr.set("name", f"pdfbreeze_vector_{shape_id}")
    etree.SubElement(anchor, WP + "cNvGraphicFramePr")
    graphic = etree.SubElement(anchor, A + "graphic")
    data = etree.SubElement(graphic, A + "graphicData")
    data.set("uri", NS["wps"])
    wsp = etree.SubElement(data, WPS + "wsp")
    etree.SubElement(wsp, WPS + "cNvSpPr")
    sp = etree.SubElement(wsp, WPS + "spPr")
    xfrm = etree.SubElement(sp, A + "xfrm")
    off = etree.SubElement(xfrm, A + "off")
    off.set("x", "0")
    off.set("y", "0")
    ext = etree.SubElement(xfrm, A + "ext")
    ext.set("cx", str(round(width * emu)))
    ext.set("cy", str(round(height * emu)))
    geom = etree.SubElement(sp, A + "custGeom")
    for tag in ("avLst", "gdLst", "ahLst", "cxnLst"):
        etree.SubElement(geom, A + tag)
    rect = etree.SubElement(geom, A + "rect")
    for key, value in (("l", "l"), ("t", "t"), ("r", "r"), ("b", "b")):
        rect.set(key, value)
    path_list = etree.SubElement(geom, A + "pathLst")
    path = etree.SubElement(path_list, A + "path")
    path.set("w", str(round(width * emu)))
    path.set("h", str(round(height * emu)))
    if fill is None:
        path.set("fill", "none")
    for command, points in commands:
        node = etree.SubElement(path, A + command)
        for point in points:
            pt = etree.SubElement(node, A + "pt")
            pt.set("x", str(round((point.x - page_rect.x0) * emu)))
            pt.set("y", str(round((point.y - page_rect.y0) * emu)))
    def solid(parent, colour, opacity):
        fill_node = etree.SubElement(parent, A + "solidFill")
        clr = etree.SubElement(fill_node, A + "srgbClr")
        clr.set("val", _rgb(colour, "#000000").lstrip("#"))
        if opacity < 0.999:
            alpha = etree.SubElement(clr, A + "alpha")
            alpha.set("val", str(round(opacity * 100000)))
    if fill is not None:
        solid(sp, fill, _opacity(drawing.get("fill_opacity")))
    else:
        etree.SubElement(sp, A + "noFill")
    line = etree.SubElement(sp, A + "ln")
    line.set("w", str(round(max(0.25, float(drawing.get("width") or 0.5)) * emu)))
    if stroke is not None:
        solid(line, stroke, _opacity(drawing.get("stroke_opacity")))
    else:
        etree.SubElement(line, A + "noFill")
    body = etree.SubElement(wsp, WPS + "bodyPr")
    return True


def parsed_table_bboxes(layout: dict) -> list[list[fitz.Rect]]:
    """Return table regions that pdf2docx already emitted as native Word tables."""
    result: list[list[fitz.Rect]] = []
    for page in layout.get("pages", []):
        page_tables: list[fitz.Rect] = []

        def visit(value: object) -> None:
            if isinstance(value, dict):
                if isinstance(value.get("rows"), list) and value.get("bbox"):
                    page_tables.append(fitz.Rect(value["bbox"]))
                for child in value.values():
                    visit(child)
            elif isinstance(value, list):
                for child in value:
                    visit(child)

        visit(page.get("sections", []))
        result.append(page_tables)
    return result


def _inside_region(rect: fitz.Rect, region: fitz.Rect, tolerance: float = 1.5) -> bool:
    expanded = fitz.Rect(
        region.x0 - tolerance,
        region.y0 - tolerance,
        region.x1 + tolerance,
        region.y1 + tolerance,
    )
    return expanded.contains(rect)


def _is_existing_table_geometry(drawing: dict, table_regions: list[fitz.Rect]) -> bool:
    rect = fitz.Rect(drawing.get("rect") or (0, 0, 0, 0))
    return any(_inside_region(rect, region) for region in table_regions)


def _is_control_appearance(drawing: dict, widgets: list[fitz.Widget]) -> bool:
    rect = fitz.Rect(drawing.get("rect") or (0, 0, 0, 0))
    for widget in widgets:
        if (widget.field_type_string or "") not in {"CheckBox", "RadioButton"}:
            continue
        if _inside_region(rect, widget.rect, tolerance=2.0):
            return True
    return False


def _page_anchor_paragraphs(root: etree._Element, page_count: int) -> list[etree._Element]:
    body = root.find(W + "body")
    if body is None:
        return []
    paragraphs = [child for child in body if child.tag == W + "p"]
    if not paragraphs:
        paragraph = etree.Element(W + "p")
        body.insert(0, paragraph)
        paragraphs = [paragraph]

    anchors = [paragraphs[0]]
    next_is_page = False
    for paragraph in paragraphs:
        if next_is_page and len(anchors) < page_count:
            anchors.append(paragraph)
            next_is_page = False
        sect = paragraph.find(f".//{W}sectPr")
        if sect is None:
            continue
        section_type = sect.find(W + "type")
        value = section_type.get(W + "val", "nextPage") if section_type is not None else "nextPage"
        if value == "nextPage":
            next_is_page = True

    while len(anchors) < page_count:
        anchors.append(paragraphs[-1])
    return anchors[:page_count]


def preserve_pdf_vectors(
    pdf_path: Path,
    docx_path: Path,
    table_regions_by_page: list[list[fitz.Rect]],
    position_text: bool = False,
) -> dict[str, int]:
    """Add only PDF geometry not already represented by native Word tables."""
    pdf = fitz.open(pdf_path)
    with zipfile.ZipFile(docx_path, "r") as source:
        document_xml = source.read("word/document.xml")
        root = etree.fromstring(document_xml)
        if position_text:
            # Exact layout: one Word page per PDF page; pictures, shapes and text are
            # placed at their PDF positions, so nothing drifts onto the wrong page.
            _replace_with_page_skeleton(root, pdf)
        anchors = _page_anchor_paragraphs(root, len(pdf))
        rels_xml = etree.fromstring(source.read("word/_rels/document.xml.rels"))
        content_types = etree.fromstring(source.read("[Content_Types].xml"))
        if position_text:
            for rel in list(rels_xml):
                if str(rel.get("Target") or "").startswith("media/"):
                    rels_xml.remove(rel)
        new_media: dict[str, bytes] = {}
        picture_rels: dict[object, str] = {}
        picture_count = 0
        colours = _TextColours(pdf) if position_text else None
        backgrounds: dict[int, tuple[bytes, str]] = {}
        if position_text:
            # Pages with coloured fills or heavy artwork get one background picture; pages
            # with just lines and rules (forms, writing sheets) keep them as editable shapes.
            def needs_background(page: fitz.Page) -> bool:
                drawings = page.get_drawings()
                if not drawings:
                    return False
                if len(drawings) > 300:
                    return True
                for drawing in drawings:
                    fill = drawing.get("fill")
                    if fill is not None and tuple(round(c, 2) for c in fill) != (1.0, 1.0, 1.0):
                        rect = fitz.Rect(drawing.get("rect") or (0, 0, 0, 0))
                        if rect.width > 3 and rect.height > 3:  # thin filled bars are just rules
                            return True
                return False
            backgrounds = _shape_backgrounds(pdf, {i for i, page in enumerate(pdf) if needs_background(page)})
        shape_count = 0
        skipped_table_shapes = 0
        skipped_control_appearances = 0
        widget_count = 0
        text_box_count = 0
        pages_with_vectors = 0

        for page_index, page in enumerate(pdf):
            drawings = page.get_drawings()
            widgets = list(page.widgets() or [])
            table_regions = (
                table_regions_by_page[page_index]
                if page_index < len(table_regions_by_page)
                else []
            )
            drawings_to_add = []
            for drawing in drawings:
                if not position_text and _is_existing_table_geometry(drawing, table_regions):
                    skipped_table_shapes += 1
                    continue
                if _is_control_appearance(drawing, widgets):
                    skipped_control_appearances += 1
                    continue
                drawings_to_add.append(drawing)
            if not drawings_to_add and not widgets and not position_text:
                continue
            anchor = anchors[page_index]
            run = etree.SubElement(anchor, W + "r")
            if position_text and page_index in backgrounds:
                data, kind = backgrounds[page_index]
                name = f"media/pdfbreeze_page{page_index + 1}.{'jpeg' if kind == 'jpeg' else 'png'}"
                rel_id = f"rIdPdfBreezePage{page_index + 1}"
                rel = etree.SubElement(rels_xml, "{http://schemas.openxmlformats.org/package/2006/relationships}Relationship")
                rel.set("Id", rel_id)
                rel.set("Type", "http://schemas.openxmlformats.org/officeDocument/2006/relationships/image")
                rel.set("Target", name)
                new_media["word/" + name] = data
                picture_count += 1
                _add_picture(run, page.rect, rel_id, picture_count, layer=100)
                drawings_to_add = []  # drawn into the background picture
            if position_text:
                hidden_words = _hidden_text_rects(page)
                for info in page.get_image_info(xrefs=True):
                    xref = int(info.get("xref") or 0)
                    full = fitz.Rect(info.get("bbox"))
                    rect = full & page.rect
                    if xref <= 0 or rect.is_empty or rect.width < 1 or rect.height < 1:
                        continue
                    key: object = xref
                    crop = None
                    words_on_it = [w for w in hidden_words if w.intersects(full)]
                    visible = colours.visible_rect(page_index, rect) if (colours is not None and not words_on_it) else None
                    a, b, c, d, *_ = tuple(info.get("transform") or (1, 0, 0, 1, 0, 0))
                    upright = abs(b) < 1e-3 and abs(c) < 1e-3 and a > 0 and d > 0
                    if visible is not None and upright and (visible.width < full.width - 2 or visible.height < full.height - 2):
                        crop = ((visible.x0 - full.x0) / full.width, (visible.y0 - full.y0) / full.height,
                                (visible.x1 - full.x0) / full.width, (visible.y1 - full.y0) / full.height)
                        rect = visible
                        key = (xref, tuple(round(v, 3) for v in crop))
                    if words_on_it:
                        key = ("erased", xref, page_index)
                    if key not in picture_rels:
                        payload = _erase_text_from_scan(pdf, xref, full, words_on_it) if words_on_it else None
                        payload = payload or _image_payload(pdf, xref, crop)
                        if payload is None:
                            continue
                        data, kind = payload
                        number = len(picture_rels) + 1
                        name = f"media/pdfbreeze_img{number}.{'jpeg' if kind == 'jpeg' else 'png'}"
                        rel_id = f"rIdPdfBreezeImg{number}"
                        rel = etree.SubElement(rels_xml, "{http://schemas.openxmlformats.org/package/2006/relationships}Relationship")
                        rel.set("Id", rel_id)
                        rel.set("Type", "http://schemas.openxmlformats.org/officeDocument/2006/relationships/image")
                        rel.set("Target", name)
                        new_media["word/" + name] = data
                        picture_rels[key] = rel_id
                    picture_count += 1
                    _add_picture(run, rect, picture_rels[key], picture_count)
                if len(run):
                    run = etree.SubElement(anchor, W + "r")  # shapes and text in their own run
            pict = etree.SubElement(run, W + "pict")
            shapes_before_page = shape_count
            widgets_before_page = widget_count
            text_boxes_before_page = text_box_count
            for drawing in drawings_to_add:
                shape_count += 1
                # Exact layout uses modern Word shapes (shown the same by Word and LibreOffice).
                added = (
                    _add_drawing_shape_dml(run, drawing, page.rect, shape_count)
                    if position_text
                    else _add_drawing_shape(pict, drawing, page.rect.width, page.rect.height, shape_count)
                )
                if not added:
                    shape_count -= 1
            for widget in widgets:
                widget_count += 1
                if not _add_widget_shape(pict, widget, widget_count):
                    widget_count -= 1
            if position_text:
                text_box_count += _add_positioned_text(pict, page, text_box_count, colours)
            if (
                shape_count > shapes_before_page
                or widget_count > widgets_before_page
                or text_box_count > text_boxes_before_page
            ):
                pages_with_vectors += 1
            else:
                anchor.remove(run)

        if colours is not None:
            colours.close()
        replacement_xml = etree.tostring(
            root,
            xml_declaration=True,
            encoding="UTF-8",
            standalone="yes",
        )
        if new_media:
            ct_ns = "{http://schemas.openxmlformats.org/package/2006/content-types}"
            have = {d.get("Extension", "").lower() for d in content_types.findall(ct_ns + "Default")}
            for extension, mime in (("png", "image/png"), ("jpeg", "image/jpeg")):
                if extension not in have:
                    default = etree.SubElement(content_types, ct_ns + "Default")
                    default.set("Extension", extension)
                    default.set("ContentType", mime)
        replaced = {
            "word/document.xml": replacement_xml,
            "word/_rels/document.xml.rels": etree.tostring(rels_xml, xml_declaration=True, encoding="UTF-8", standalone="yes"),
            "[Content_Types].xml": etree.tostring(content_types, xml_declaration=True, encoding="UTF-8", standalone="yes"),
        }
        temp_path = docx_path.with_suffix(docx_path.suffix + ".vectors.tmp")
        with zipfile.ZipFile(temp_path, "w", compression=zipfile.ZIP_DEFLATED) as target:
            for item in source.infolist():
                if position_text and item.filename.startswith("word/media/"):
                    continue  # the reflowed layout's pictures aren't used in exact layout
                payload = replaced.get(item.filename) or source.read(item.filename)
                target.writestr(item, payload)
            for name, data in new_media.items():
                target.writestr(name, data)

    os.replace(temp_path, docx_path)
    return {
        "shapes": shape_count,
        "widgets": widget_count,
        "pages_with_vectors": pages_with_vectors,
        "skipped_table_shapes": skipped_table_shapes,
        "skipped_control_appearances": skipped_control_appearances,
        "positioned_text_boxes": text_box_count,
    }


def pdf2docx_layout_settings(pdf_path: Path) -> dict[str, bool | float]:
    """Avoid stream-table false positives on geometry-dense forms.

    Lattice-table parsing remains enabled, so tables with real borders can still
    become native Word tables. Stream tables remain enabled for ordinary text
    and borderless-table documents.
    """
    pdf = fitz.open(pdf_path)
    page_count = max(1, len(pdf))
    drawing_count = 0
    widget_count = 0
    for page in pdf:
        drawing_count += len(page.get_drawings())
        widget_count += sum(1 for _ in (page.widgets() or []))
    geometry_dense = widget_count > 0 or drawing_count / page_count >= 10
    settings: dict[str, bool | float] = {"parse_stream_table": not geometry_dense}
    # pdf2docx re-draws areas of vector artwork as pictures at 4x (288 dpi) and keeps them for
    # every page until the end, so long, drawing-heavy documents (brochures, guides) ran the
    # engine out of memory. 2.5x (~180 dpi) uses under 40% of that and still prints sharply.
    if geometry_dense and page_count >= 6:
        settings["clip_image_res_ratio"] = 2.5
    return settings


def needs_positioned_text(pdf_path: Path, table_regions_by_page: list[list[fitz.Rect]] | None = None) -> bool:
    """Exact layout (one Word page per PDF page, text in boxes at their PDF positions)
    for documents the flowing conversion gets wrong; flowing Word text otherwise.

    Exact layout: forms, rotated text, Type 3 fonts (Chrome / web-made PDFs), scans with a
    recognised-text layer, side-by-side text columns, and pages with lots of drawing that
    isn't a table the converter has already rebuilt as a real Word table."""
    pdf = fitz.open(pdf_path)
    try:
        regions = table_regions_by_page or []
        for index, page in enumerate(pdf):
            if any(True for _ in (page.widgets() or [])):
                return True
            if any(font[2] == "Type3" for font in page.get_fonts()):
                return True
            try:
                if any(s.get("type") == 3 for s in page.get_texttrace()):
                    return True  # invisible text = an OCR layer over a scan
            except Exception:
                pass
            tables = regions[index] if index < len(regions) else []
            in_table = lambda rect: any(_inside_region(rect, region, tolerance=3.0) for region in tables)
            lines = []
            for block in page.get_text("dict", flags=fitz.TEXTFLAGS_TEXT).get("blocks", []):
                if block.get("type") != 0:
                    continue
                for line in block.get("lines", []):
                    if abs(float(line.get("dir", (1.0, 0.0))[1])) > 0.01:
                        return True
                    rect = fitz.Rect(line["bbox"])
                    if rect.width >= page.rect.width * 0.25 and not in_table(rect):
                        lines.append(rect)
            # Side-by-side columns of running text: several pairs of long lines at the same height.
            pairs = 0
            for i, left in enumerate(lines):
                for right in lines[i + 1:]:
                    overlap = min(left.y1, right.y1) - max(left.y0, right.y0)
                    apart = left.x1 <= right.x0 + 2 or right.x1 <= left.x0 + 2
                    if apart and overlap > 0.5 * min(left.height, right.height):
                        pairs += 1
                        break
            if pairs >= 6:
                return True
            drawings = [d for d in page.get_drawings() if not in_table(fitz.Rect(d.get("rect") or (0, 0, 0, 0)))]
            if len(drawings) >= 10:
                return True
        return False
    finally:
        pdf.close()
