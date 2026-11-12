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
        self.assertEqual(report["payment_walls"][0]["conversion_rate"], 0)

    def test_payment_wall_conversion_is_split_by_design(self):
        events = [
            event("session-000000000001", "landing_view"),
            event("session-000000000001", "email_entered", user_id="user-1"),
            event("session-000000000001", "payment_plan_viewed", "standard"),
            event("session-000000000001", "payment_card_viewed", "standard"),
            event("session-000000000001", "purchase_complete", "full", user_id="user-1"),
            event("session-000000000002", "landing_view"),
            event("session-000000000002", "email_entered", user_id="user-2"),
            event("session-000000000002", "payment_plan_viewed", "zendocs"),
            event("session-000000000002", "payment_card_viewed", "zendocs"),
            event("session-000000000003", "landing_view"),
            event("session-000000000003", "email_entered", user_id="user-3"),
            event("session-000000000003", "payment_plan_viewed", "standard"),
        ]

        report = build_funnel_report(events, [])
        walls = {item["style"]: item for item in report["payment_walls"]}

        self.assertEqual(walls["standard"]["members"], 2)
        self.assertEqual(walls["standard"]["reached_card"], 1)
        self.assertEqual(walls["standard"]["payments"], 1)
        self.assertEqual(walls["standard"]["conversion_rate"], 50.0)
        self.assertEqual(walls["zendocs"]["members"], 1)
        self.assertEqual(walls["zendocs"]["reached_card"], 1)
        self.assertEqual(walls["zendocs"]["payments"], 0)
        self.assertEqual(walls["zendocs"]["conversion_rate"], 0.0)

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


class DailyAndCampaignTests(unittest.TestCase):
    def setUp(self):
        from datetime import date, datetime, timedelta, timezone
        from zoneinfo import ZoneInfo
        names = {"UTM_FIELDS", "BREAKDOWN_STAGES", "REPORTING_TIMEZONE"}
        nodes = [
            node for node in tree.body
            if (isinstance(node, ast.Assign) and any(isinstance(t, ast.Name) and t.id in names for t in node.targets))
            or (isinstance(node, ast.FunctionDef) and node.name in {"build_daily_and_campaigns", "_parsed_datetime"})
        ]
        ns = {"Any": Any, "datetime": datetime, "timedelta": timedelta, "timezone": timezone, "ZoneInfo": ZoneInfo, "calendar_date": date}
        exec(compile(ast.Module(body=nodes, type_ignores=[]), "admin.py", "exec"), ns)
        self.build = ns["build_daily_and_campaigns"]
        self.datetime, self.timezone = datetime, timezone

    def test_days_and_campaigns(self):
        ad = {"utm_source": "google", "utm_medium": "cpc", "utm_campaign": "pdf-to-word", "utm_content": "ag1", "utm_term": "pdf to word"}
        events = [
            {**event("a", "landing_view", created_at="2026-11-10T09:00:00+00:00"), **ad},
            event("a", "payment_plan_viewed", created_at="2026-11-10T09:05:00+00:00"),
            event("a", "purchase_complete", user_id="u1", created_at="2026-11-11T09:05:00+00:00"),
            event("b", "landing_view", created_at="2026-11-11T09:00:00+00:00"),
            event("b", "purchase_complete", created_at="2026-11-11T09:01:00+00:00"),
        ]
        since = self.datetime(2026, 11, 10, tzinfo=self.timezone.utc)
        before = self.datetime(2026, 11, 12, tzinfo=self.timezone.utc)
        report = self.build(events, since, before)
        days = {row["date"]: row for row in report["daily"]}
        self.assertEqual(list(days), ["2026-11-11", "2026-11-10"])
        self.assertEqual((days["2026-11-10"]["visits"], days["2026-11-10"]["paywall"], days["2026-11-10"]["sales"]), (1, 1, 1))
        self.assertEqual((days["2026-11-11"]["visits"], days["2026-11-11"]["sales"]), (1, 0))
        google = next(row for row in report["campaigns"] if row["source"] == "google")
        self.assertEqual((google["campaign"], google["ad_group"], google["keyword"], google["sales"]), ("pdf-to-word", "ag1", "pdf to word", 1))
        direct = next(row for row in report["campaigns"] if row["source"] == "(direct)")
        self.assertEqual(direct["visits"], 1)


if __name__ == "__main__":
    unittest.main()
