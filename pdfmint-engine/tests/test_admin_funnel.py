import unittest
import ast
from pathlib import Path
from typing import Any


source = Path(__file__).parents[1].joinpath("app", "admin.py").read_text(encoding="utf-8")
tree = ast.parse(source)
selected_nodes = [
    node for node in tree.body
    if (
        isinstance(node, ast.Assign)
        and any(isinstance(target, ast.Name) and target.id == "FUNNEL_STAGES" for target in node.targets)
    ) or (
        isinstance(node, ast.FunctionDef)
        and node.name == "build_funnel_report"
    )
]
namespace = {"Any": Any}
exec(compile(ast.Module(body=selected_nodes, type_ignores=[]), str(Path("app/admin.py")), "exec"), namespace)
build_funnel_report = namespace["build_funnel_report"]


def event(session_id, event_name, event_value="", user_id=None, created_at="2026-09-24T12:00:00+00:00"):
    return {
        "session_id": session_id,
        "user_id": user_id,
        "event_name": event_name,
        "event_value": event_value,
        "landing_page": "edit-pdf",
        "page_path": "/edit-pdf.html",
        "created_at": created_at,
    }


class AdminFunnelTests(unittest.TestCase):
    def test_funnel_counts_unique_sessions_and_tools(self):
        events = [
            event("session-000000000001", "landing_view"),
            event("session-000000000001", "upload_clicked"),
            event("session-000000000001", "editor_opened"),
            event("session-000000000001", "editor_tool_used", "edit"),
            event("session-000000000001", "editor_tool_used", "edit"),
            event("session-000000000001", "download_clicked"),
            event("session-000000000001", "email_entered", user_id="user-1"),
            event("session-000000000002", "landing_view"),
            event("session-000000000002", "upload_clicked"),
        ]

        report = build_funnel_report(events, [{"id": "user-1", "email": "person@example.com"}])

        self.assertEqual(report["stages"][0]["count"], 2)
        self.assertEqual(report["stages"][1]["count"], 2)
        self.assertEqual(report["stages"][2]["count"], 1)
        self.assertEqual(report["stages"][2]["previous_rate"], 50.0)
        self.assertEqual(report["tools"], [{"name": "edit", "sessions": 1}])
        self.assertEqual(report["journeys"][0]["visitor"], "person@example.com")

    def test_empty_funnel_is_safe(self):
        report = build_funnel_report([], [])
        self.assertEqual(len(report["stages"]), 8)
        self.assertTrue(all(stage["count"] == 0 for stage in report["stages"]))
        self.assertEqual(report["tools"], [])
        self.assertEqual(report["journeys"], [])

    def test_later_stages_require_the_previous_stage(self):
        events = [
            event("session-000000000001", "landing_view"),
            event("session-000000000001", "editor_opened"),
        ]
        report = build_funnel_report(events, [])
        counts = {stage["event"]: stage["count"] for stage in report["stages"]}
        self.assertEqual(counts["landing_view"], 1)
        self.assertEqual(counts["upload_clicked"], 0)
        self.assertEqual(counts["editor_opened"], 0)

    def test_email_and_purchase_require_a_real_account(self):
        events = [
            event("session-000000000001", "landing_view"),
            event("session-000000000001", "upload_clicked"),
            event("session-000000000001", "editor_opened"),
            event("session-000000000001", "download_clicked"),
            event("session-000000000001", "email_entered"),
            event("session-000000000001", "purchase_complete"),
        ]
        report = build_funnel_report(events, [])
        counts = {stage["event"]: stage["count"] for stage in report["stages"]}
        self.assertEqual(counts["email_entered"], 0)
        self.assertEqual(counts["purchase_complete"], 0)


if __name__ == "__main__":
    unittest.main()
