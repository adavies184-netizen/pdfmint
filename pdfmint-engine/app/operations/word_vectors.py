from __future__ import annotations

import os
import math
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
}
W = f"{{{NS['w']}}}"
V = f"{{{NS['v']}}}"
O = f"{{{NS['o']}}}"
W10 = f"{{{NS['w10']}}}"
WP = f"{{{NS['wp']}}}"
A = f"{{{NS['a']}}}"
WPS = f"{{{NS['wps']}}}"
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


def _add_positioned_text(pict: etree._Element, page: fitz.Page, first_id: int) -> int:
    """Recreate PDF text as editable, page-positioned Word text boxes."""
    text_id = first_id
    raw = page.get_text("dict", flags=fitz.TEXTFLAGS_TEXT)
    for block in raw.get("blocks", []):
        if block.get("type") != 0:
            continue
        for line in block.get("lines", []):
            spans = [span for span in line.get("spans", []) if span.get("text")]
            if not spans:
                continue
            rect = fitz.Rect(line.get("bbox") or spans[0].get("bbox"))
            rect.x1 += 3.0
            rect.y1 += 2.0
            direction = line.get("dir") or (1.0, 0.0)
            rotation = math.degrees(math.atan2(float(direction[1]), float(direction[0])))
            text_id += 1
            if abs(rotation) > 0.01:
                _add_rotated_text_box(pict.getparent(), rect, spans, rotation, text_id)
                continue
            shape = etree.SubElement(pict, V + "rect")
            shape.set("id", f"pdfbreeze_text_{text_id}")
            shape.set("style", _positioned_style(rect, 251000000 + text_id, rotation))
            shape.set("stroked", "f")
            shape.set("filled", "f")
            shape.set(O + "allowincell", "f")
            textbox = etree.SubElement(shape, V + "textbox")
            textbox.set("inset", "0,0,0,0")
            textbox.set("style", "mso-fit-shape-to-text:t")
            text_content = etree.SubElement(textbox, W + "txbxContent")
            paragraph = etree.SubElement(text_content, W + "p")
            paragraph_properties = etree.SubElement(paragraph, W + "pPr")
            spacing = etree.SubElement(paragraph_properties, W + "spacing")
            spacing.set(W + "before", "0")
            spacing.set(W + "after", "0")
            spacing.set(W + "line", "240")
            spacing.set(W + "lineRule", "auto")
            for span in spans:
                run = etree.SubElement(paragraph, W + "r")
                properties = etree.SubElement(run, W + "rPr")
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
                size_cs = etree.SubElement(properties, W + "szCs")
                size_cs.set(W + "val", str(half_points))
                text = etree.SubElement(run, W + "t")
                text.set(XML_SPACE, "preserve")
                text.text = _xml_text(span["text"])
            wrap = etree.SubElement(shape, W10 + "wrap")
            wrap.set("type", "none")
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
            source_image_count = sum(len(page.get_images(full=True)) for page in pdf)
            if source_image_count == 0:
                _replace_with_page_skeleton(root, pdf)
            else:
                _hide_native_text(root)
                _hide_native_table_formatting(root)
                _remove_small_native_drawings(root)
        anchors = _page_anchor_paragraphs(root, len(pdf))
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
            pict = etree.SubElement(run, W + "pict")
            shapes_before_page = shape_count
            widgets_before_page = widget_count
            text_boxes_before_page = text_box_count
            for drawing in drawings_to_add:
                shape_count += 1
                if not _add_drawing_shape(
                    pict,
                    drawing,
                    page.rect.width,
                    page.rect.height,
                    shape_count,
                ):
                    shape_count -= 1
            for widget in widgets:
                widget_count += 1
                if not _add_widget_shape(pict, widget, widget_count):
                    widget_count -= 1
            if position_text:
                text_box_count += _add_positioned_text(pict, page, text_box_count)
            if (
                shape_count > shapes_before_page
                or widget_count > widgets_before_page
                or text_box_count > text_boxes_before_page
            ):
                pages_with_vectors += 1
            else:
                anchor.remove(run)

        replacement_xml = etree.tostring(
            root,
            xml_declaration=True,
            encoding="UTF-8",
            standalone="yes",
        )
        temp_path = docx_path.with_suffix(docx_path.suffix + ".vectors.tmp")
        with zipfile.ZipFile(temp_path, "w", compression=zipfile.ZIP_DEFLATED) as target:
            for item in source.infolist():
                payload = replacement_xml if item.filename == "word/document.xml" else source.read(item.filename)
                target.writestr(item, payload)

    os.replace(temp_path, docx_path)
    return {
        "shapes": shape_count,
        "widgets": widget_count,
        "pages_with_vectors": pages_with_vectors,
        "skipped_table_shapes": skipped_table_shapes,
        "skipped_control_appearances": skipped_control_appearances,
        "positioned_text_boxes": text_box_count,
    }


def pdf2docx_layout_settings(pdf_path: Path) -> dict[str, bool]:
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
    return {"parse_stream_table": not geometry_dense}


def needs_positioned_text(pdf_path: Path) -> bool:
    """Use exact text placement only for forms and drawing-dense layout pages."""
    pdf = fitz.open(pdf_path)
    page_count = max(1, len(pdf))
    drawing_count = sum(len(page.get_drawings()) for page in pdf)
    widget_count = sum(sum(1 for _ in (page.widgets() or [])) for page in pdf)
    rotated_text = any(
        abs(float(line.get("dir", (1.0, 0.0))[1])) > 0.01
        for page in pdf
        for block in page.get_text("dict", flags=fitz.TEXTFLAGS_TEXT).get("blocks", [])
        if block.get("type") == 0
        for line in block.get("lines", [])
    )
    return widget_count > 0 or drawing_count / page_count >= 10 or rotated_text

