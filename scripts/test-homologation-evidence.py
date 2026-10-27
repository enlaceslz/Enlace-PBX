#!/usr/bin/env python3
"""Tests for homologation evidence status validator."""
import unittest
from pathlib import Path
from importlib.machinery import SourceFileLoader

ROOT = Path(__file__).resolve().parent
module = SourceFileLoader("evidence", str(ROOT / "validate-homologation-evidence.py")).load_module()
TEMPLATE = (ROOT.parent / "docs/TERMO-EVIDENCIAS-HOMOLOGACAO.md").read_text()


class EvidenceTests(unittest.TestCase):
    def test_default_template_is_not_approved(self):
        self.assertFalse(module.validate(TEMPLATE))

    def test_all_statuses_are_explicit(self):
        self.assertEqual(len(module.EXPECTED), 21)
        self.assertFalse(module.validate(TEMPLATE.replace("NÃO EXECUTADO", "REPROVADO")))

    def test_approved_without_evidence_rejected(self):
        altered = TEMPLATE.replace("| NÃO EXECUTADO |", "| APROVADO |", 1)
        with self.assertRaises(ValueError):
            module.validate(altered)

    def test_invalid_status_rejected(self):
        with self.assertRaises(ValueError):
            module.validate(TEMPLATE.replace("| NÃO EXECUTADO |", "| CONCLUIDO |", 1))

    def test_missing_row_rejected(self):
        line = next(line for line in TEMPLATE.splitlines() if line.startswith("| INF-01 |"))
        with self.assertRaises(ValueError):
            module.validate(TEMPLATE.replace(line, ""))

    def test_each_telephony_row_is_required(self):
        line = next(line for line in TEMPLATE.splitlines() if line.startswith("| TEL-07 |"))
        with self.assertRaises(ValueError):
            module.validate(TEMPLATE.replace(line, ""))

    def test_duplicate_row_rejected(self):
        line = next(line for line in TEMPLATE.splitlines() if line.startswith("| INF-01 |"))
        with self.assertRaises(ValueError):
            module.validate(TEMPLATE + "\n" + line)


if __name__ == "__main__":
    unittest.main()
