"""Regression checks for the read-only Asterisk runtime preflight."""
import importlib.util
import pathlib
import unittest

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
