import ast
import unittest
from pathlib import Path
from typing import Any


source = Path(__file__).parents[1].joinpath("app", "billing.py").read_text(encoding="utf-8")
tree = ast.parse(source)
selected = [
    node for node in tree.body
    if isinstance(node, ast.FunctionDef) and node.name == "_stripe_field"
]
namespace = {"Any": Any}
exec(compile(ast.Module(body=selected, type_ignores=[]), "app/billing.py", "exec"), namespace)
stripe_field = namespace["_stripe_field"]


class FakeStripeObject:
    def __init__(self, **values):
        self._values = values

    def __getitem__(self, key):
        if key not in self._values:
            raise KeyError(key)
        return self._values[key]


class StripeObjectCompatibilityTests(unittest.TestCase):
    def test_reads_stripe_object_without_get_method(self):
        subscription = FakeStripeObject(id="sub_123", status="active")
        self.assertEqual(stripe_field(subscription, "id"), "sub_123")
        self.assertEqual(stripe_field(subscription, "status"), "active")
        self.assertEqual(stripe_field(subscription, "missing", "fallback"), "fallback")

    def test_reads_plain_dictionary(self):
        self.assertEqual(stripe_field({"status": "trialing"}, "status"), "trialing")
        self.assertIsNone(stripe_field({}, "status"))


if __name__ == "__main__":
    unittest.main()
