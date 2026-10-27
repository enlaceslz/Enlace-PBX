"""Static regression checks for Asterisk AMI/ARI privilege review.

This is an audit guard, not a proof of least privilege. Runtime authorization
must be demonstrated in a controlled Asterisk lab before production.
"""
import pathlib
import re
import unittest

ROOT = pathlib.Path(__file__).resolve().parents[1]
RECONCILER = ROOT / "scripts" / "reconcile-asterisk-config.py"


class PrivilegeAuditTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.source = RECONCILER.read_text(encoding="utf-8")

    def test_ami_is_restricted_to_loopback(self):
        self.assertIn('"bindaddr": "127.0.0.1"', self.source)
        self.assertIn('"permit = 127.0.0.1/255.255.255.255', self.source)

    def test_ari_http_is_restricted_to_loopback(self):
        self.assertIn('"bindaddr": "127.0.0.1", "bindport": "8088"', self.source)

    def test_distinct_ami_ari_accounts_are_enforced(self):
        self.assertIn("ami == ari or ami_user == ari_user", self.source)

    def test_ami_write_privileges_remain_explicitly_audited(self):
        self.assertRegex(self.source, r'write = [^"\\n]*originate')
        evidence = (ROOT / "docs" / "EVIDENCIAS_HOMOLOGACAO_DEBIAN12.md").read_text(encoding="utf-8")
        self.assertIn("menor privilégio", evidence)
        self.assertIn("BLOQUEADO", evidence)


if __name__ == "__main__":
    unittest.main()
