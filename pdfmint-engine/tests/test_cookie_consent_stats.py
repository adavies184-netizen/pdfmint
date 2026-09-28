import ast
import unittest
from pathlib import Path
from typing import Any


source = Path(__file__).parents[1].joinpath("app", "admin.py").read_text(encoding="utf-8")
tree = ast.parse(source)
selected = [
    node for node in tree.body
    if isinstance(node, ast.FunctionDef) and node.name == "build_cookie_consent_report"
]
namespace = {"Any": Any}
exec(compile(ast.Module(body=selected, type_ignores=[]), "app/admin.py", "exec"), namespace)
build_cookie_consent_report = namespace["build_cookie_consent_report"]


class CookieConsentStatsTests(unittest.TestCase):
    def test_counts_unique_rows_and_latest_choices(self):
        report = build_cookie_consent_report([
            {"banner_shown": True, "accepted_all": True, "settings_opened": False, "rejected_all": False, "preferences_saved": False, "statistics": True, "marketing": True},
            {"banner_shown": True, "accepted_all": False, "settings_opened": True, "rejected_all": False, "preferences_saved": True, "statistics": False, "marketing": True},
            {"banner_shown": True, "accepted_all": False, "settings_opened": True, "rejected_all": True, "preferences_saved": False, "statistics": False, "marketing": False},
            {"banner_shown": True, "accepted_all": False, "settings_opened": True, "rejected_all": False, "preferences_saved": False, "statistics": None, "marketing": None},
        ])

        self.assertEqual(report["visitors"], 4)
        self.assertEqual(report["decided"], 3)
        self.assertEqual(report["actions"]["accepted_all"], {"count": 1, "percentage": 25.0})
        self.assertEqual(report["actions"]["opened_settings"], {"count": 3, "percentage": 75.0})
        self.assertEqual(report["categories"]["necessary"]["off"], 0)
        self.assertEqual(report["categories"]["statistics"]["off"], 2)
        self.assertEqual(report["categories"]["marketing"]["on"], 2)

    def test_empty_report_is_safe(self):
        report = build_cookie_consent_report([])
        self.assertEqual(report["visitors"], 0)
        self.assertEqual(report["categories"]["marketing"]["off_percentage"], 0)


if __name__ == "__main__":
    unittest.main()
