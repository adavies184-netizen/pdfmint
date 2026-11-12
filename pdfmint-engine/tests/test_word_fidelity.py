from __future__ import annotations

import tempfile
import unittest
import zipfile
from pathlib import Path
from xml.etree import ElementTree as ET

from app.operations.word import pdf_to_docx


W = "{http://schemas.openxmlformats.org/wordprocessingml/2006/main}"
V = "{urn:schemas-microsoft-com:vml}"
WP = "{http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing}"
WPS = "{http://schemas.microsoft.com/office/word/2010/wordprocessingShape}"
FIXTURES = Path(__file__).parent / "fixtures"


def convert_and_read(name: str) -> ET.Element:
    with tempfile.TemporaryDirectory() as temporary_directory:
        output = Path(temporary_directory) / f"{Path(name).stem}.docx"
        pdf_to_docx(FIXTURES / name, output)
        with zipfile.ZipFile(output) as archive:
            assert archive.testzip() is None
            return ET.fromstring(archive.read("word/document.xml"))


class WordFidelityTests(unittest.TestCase):
    def test_writing_sheet_restores_all_vector_rules_as_editable_shapes(self) -> None:
        root = convert_and_read("writing-sheet.pdf")
        # Every ruled line is its own editable Word shape (DrawingML, shown by Word and LibreOffice).
        vectors = [node for node in root.iter(WP + "docPr") if node.get("name", "").startswith("pdfbreeze_vector_")]
        self.assertEqual(21, len(vectors))
        # Text sits in editable text boxes at its PDF position.
        self.assertGreaterEqual(len(list(root.iter(WPS + "txbx"))), 5)
        text = "".join(node.text or "" for node in root.iter(W + "t"))
        self.assertIn("Writing Sheet", text)

    def test_mixed_form_preserves_geometry_controls_and_positioned_text(self) -> None:
        root = convert_and_read("form-conversion-test.pdf")
        identifiers = [node.get("id", "") for node in root.iter()]
        self.assertEqual(6, sum(value.startswith("pdfbreeze_widget_") for value in identifiers))
        # Coloured panels and boxes are kept (as a background picture or as shapes).
        names = [node.get("name", "") for node in root.iter(WP + "docPr")]
        self.assertTrue(any(name.startswith(("Picture", "pdfbreeze_vector_")) for name in names))
        self.assertGreaterEqual(len(list(root.iter(WPS + "txbx"))), 20)
        text = "".join(node.text or "" for node in root.iter(W + "t"))
        self.assertIn("Form Conversion Test", text)
        # One Word page per PDF page.
        self.assertEqual(1, len(list(root.iter(W + "sectPr"))))

    def test_lodger_tables_are_not_duplicated_by_vector_overlay(self) -> None:
        root = convert_and_read("scotlodgerent.pdf")
        identifiers = [node.get("id", "") for node in root.iter()]
        self.assertEqual(0, sum(value.startswith("pdfbreeze_vector_") for value in identifiers))
        self.assertEqual(2, len(list(root.iter(W + "tbl"))))
        text = "".join(node.text or "" for node in root.iter(W + "t"))
        self.assertIn("Lodger", text)


if __name__ == "__main__":
    unittest.main()

