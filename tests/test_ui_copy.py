import unittest
from pathlib import Path


class InterfaceCopyTests(unittest.TestCase):
    def test_interface_has_no_prohibited_middle_dot(self):
        root = Path(__file__).resolve().parents[1]
        files = [*root.joinpath("templates").rglob("*.html"),
                 *root.joinpath("static/js").rglob("*.js"),
                 *root.joinpath("static/css").rglob("*.css"),
                 root / "DESIGN.md", root / ".impeccable/design.json"]
        offenders = [str(path.relative_to(root)) for path in files
                     if chr(183) in path.read_text(encoding="utf-8")]
        self.assertFalse(offenders, "Use slash separators: " + ", ".join(offenders))
