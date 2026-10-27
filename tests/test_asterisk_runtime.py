"""Regression checks for the read-only Asterisk runtime preflight."""
import importlib.util
import pathlib
import unittest
from unittest.mock import patch

SCRIPT = pathlib.Path(__file__).resolve().parents[1] / "scripts" / "check-asterisk-runtime.py"
spec = importlib.util.spec_from_file_location("asterisk_runtime", SCRIPT)
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

PROPERTIES = "User=asterisk\nGroup=asterisk\nMainPID=1234\nNRestarts=0\n"
LISTENERS = (
    "State Recv-Q Send-Q Local Address:Port Peer Address:Port\n"
    "LISTEN 0 128 127.0.0.1:5038 0.0.0.0:*\n"
    "LISTEN 0 128 127.0.0.1:8088 0.0.0.0:*\n"
)


class RuntimePreflightTests(unittest.TestCase):
    def check(self, active=True, properties=PROPERTIES, listeners=LISTENERS, cli=True):
        return dict(module.evaluate(active, properties, listeners, cli))

    def test_stable_service(self):
        first = (True, PROPERTIES)
        self.assertTrue(module.stable(first, first))

    def test_pid_change_is_unstable(self):
        self.assertFalse(module.stable(
            (True, PROPERTIES),
            (True, PROPERTIES.replace("MainPID=1234", "MainPID=5678")),
        ))

    def test_restart_counter_change_is_unstable(self):
        self.assertFalse(module.stable(
            (True, PROPERTIES),
            (True, PROPERTIES.replace("NRestarts=0", "NRestarts=1")),
        ))

    def test_missing_restart_counter_fails_closed(self):
        self.assertFalse(module.stable(
            (True, PROPERTIES.replace("NRestarts=0\n", "")),
            (True, PROPERTIES.replace("NRestarts=0\\n", "")),
        ))

    def test_service_drops_during_observation(self):
        self.assertFalse(module.stable((True, PROPERTIES), (False, PROPERTIES)))

    def test_cli_failure_after_observation_blocks_preflight(self):
        responses = [
            (True, ""),
            (True, PROPERTIES),
            (True, LISTENERS),
            (True, "System uptime: 1 hour"),
            (True, ""),
            (True, PROPERTIES),
            (False, ""),
            (True, LISTENERS),
        ]
        with patch.object(module, "run", side_effect=responses), patch.object(module.time, "sleep"):
            self.assertEqual(module.main(), 1)

    def test_cli_success_after_observation_allows_preflight(self):
        responses = [
            (True, ""),
            (True, PROPERTIES),
            (True, LISTENERS),
            (True, "System uptime: 1 hour"),
            (True, ""),
            (True, PROPERTIES),
            (True, "System uptime: 1 hour"),
            (True, LISTENERS),
        ]
        with patch.object(module, "run", side_effect=responses), patch.object(module.time, "sleep"):
            self.assertEqual(module.main(), 0)

    def test_similar_ipv4_prefix_is_not_loopback(self):
        listeners = LISTENERS.replace("127.0.0.1:5038", "127.0.0.1:5038")
        listeners += "LISTEN 0 128 127.0.0.1:5038 0.0.0.0:*\\n"
        self.assertTrue(self.check(listeners=listeners)["tcp-5038-loopback-only"])

    def test_nonstandard_loopback_address_is_rejected_by_policy(self):
        listeners = LISTENERS.replace("127.0.0.1:5038", "127.0.0.2:5038")
        self.assertFalse(self.check(listeners=listeners)["tcp-5038-loopback-only"])

    def test_malformed_listen_line_fails_closed(self):
        listeners = LISTENERS + "LISTEN malformed\\n"
        findings = self.check(listeners=listeners)
        self.assertFalse(findings["tcp-5038-loopback-only"])
        self.assertFalse(findings["tcp-8088-loopback-only"])

    def test_ipv6_loopback_is_not_accepted_by_ipv4_policy(self):
        listeners = LISTENERS.replace("127.0.0.1:8088", "[::1]:8088")
        self.assertFalse(self.check(listeners=listeners)["tcp-8088-loopback-only"])

    def test_ipv6_wildcard_ami_is_rejected(self):
        listeners = LISTENERS + "LISTEN 0 128 [::]:5038 [::]:*\\n"
        self.assertFalse(self.check(listeners=listeners)["tcp-5038-loopback-only"])

    def test_network_exposure_after_observation_blocks_preflight(self):
        exposed = LISTENERS.replace("127.0.0.1:5038", "0.0.0.0:5038")
        responses = [
            (True, ""), (True, PROPERTIES), (True, LISTENERS),
            (True, "System uptime: 1 hour"),
            (True, ""), (True, PROPERTIES),
            (True, "System uptime: 1 hour"), (True, exposed),
        ]
        with patch.object(module, "run", side_effect=responses), patch.object(module.time, "sleep"):
            self.assertEqual(module.main(), 1)

    def test_empty_restart_counter_fails_closed(self):
        properties = PROPERTIES.replace("NRestarts=0", "NRestarts=")
        self.assertFalse(module.stable((True, properties), (True, properties)))

    def test_non_numeric_restart_counter_fails_closed(self):
        properties = PROPERTIES.replace("NRestarts=0", "NRestarts=unknown")
        self.assertFalse(module.stable((True, properties), (True, properties)))

    def test_healthy_loopback(self):
        self.assertTrue(all(self.check().values()))

    def test_service_inactive(self):
        self.assertFalse(self.check(active=False)["service-active"])

    def test_wrong_service_user(self):
        self.assertFalse(self.check(properties=PROPERTIES.replace("User=asterisk", "User=root"))["service-user"])

    def test_missing_pid(self):
        self.assertFalse(self.check(properties=PROPERTIES.replace("MainPID=1234", "MainPID=0"))["service-pid"])

    def test_cli_failure(self):
        self.assertFalse(self.check(cli=False)["asterisk-cli"])

    def test_missing_listener(self):
        self.assertFalse(self.check(listeners="")["tcp-5038-loopback-only"])

    def test_public_ami_listener(self):
        self.assertFalse(self.check(listeners=LISTENERS.replace("127.0.0.1:5038", "0.0.0.0:5038"))["tcp-5038-loopback-only"])

    def test_ipv6_wildcard_ari_listener(self):
        self.assertFalse(self.check(listeners=LISTENERS.replace("127.0.0.1:8088", "[::]:8088"))["tcp-8088-loopback-only"])

    def test_mixed_safe_and_unsafe_listeners(self):
        self.assertFalse(self.check(listeners=LISTENERS + "LISTEN 0 128 10.0.0.2:5038 0.0.0.0:*\n")["tcp-5038-loopback-only"])


if __name__ == "__main__":
    unittest.main()
