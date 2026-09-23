from __future__ import annotations

import tempfile
import unittest
import zipfile
from pathlib import Path
from xml.etree import ElementTree as ET

from app.operations.word import pdf_to_docx


W = "{http://schemas.openxmlformats.org/wordprocessingml/2006/main}"
V = "{urn:schemas-microsoft-com:vml}"
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
        vectors = [
            node
            for node in root.iter(V + "shape")
            if node.get("id", "").startswith("pdfbreeze_vector_")
        ]
        self.assertEqual(21, len(vectors))
        self.assertGreaterEqual(len(list(root.iter(V + "textbox"))), 5)
        self.assertEqual(0, len(list(root.iter(W + "drawing"))))

    def test_mixed_form_preserves_geometry_controls_and_positioned_text(self) -> None:
        root = convert_and_read("form-conversion-test.pdf")
        identifiers = [node.get("id", "") for node in root.iter()]
        self.assertEqual(26, sum(value.startswith("pdfbreeze_vector_") for value in identifiers))
        self.assertEqual(6, sum(value.startswith("pdfbreeze_widget_") for value in identifiers))
        self.assertEqual(33, sum(value.startswith("pdfbreeze_text_") for value in identifiers))
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

