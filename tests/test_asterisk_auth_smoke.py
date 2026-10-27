#!/usr/bin/env python3
"""Local protocol regression tests for the read-only AMI/ARI smoke checker."""
import importlib.util
import pathlib
import os
from unittest.mock import patch
import socket
import threading
import unittest
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

SCRIPT = pathlib.Path(__file__).resolve().parents[1] / "scripts" / "check-asterisk-auth.py"
spec = importlib.util.spec_from_file_location("asterisk_auth_smoke", SCRIPT)
smoke = importlib.util.module_from_spec(spec)
spec.loader.exec_module(smoke)


class AuthSmokeTests(unittest.TestCase):
    def test_invalid_timeout_is_rejected_before_network(self):
        credentials = {
            "ASTERISK_SMOKE_TIMEOUT": "invalid",
            "ASTERISK_AMI_USER": "ami",
            "ASTERISK_AMI_PASSWORD": "A" * 32,
            "ASTERISK_ARI_USER": "ari",
            "ASTERISK_ARI_PASSWORD": "B" * 32,
        }
        with patch.dict(os.environ, credentials), patch.object(smoke, "check_ami") as ami:
            with self.assertRaisesRegex(ValueError, "must be numeric"):
                smoke.main()
            ami.assert_not_called()

    def test_rejects_shared_ami_ari_credentials_before_network(self):
        credentials = {
            "ASTERISK_AMI_USER": "shared",
            "ASTERISK_AMI_PASSWORD": "A" * 32,
            "ASTERISK_ARI_USER": "shared",
            "ASTERISK_ARI_PASSWORD": "A" * 32,
        }
        with patch.dict(os.environ, credentials), patch.object(smoke, "check_ami") as ami:
            with self.assertRaisesRegex(ValueError, "distinct"):
                smoke.main()
            ami.assert_not_called()

    def test_ami_accepts_success_and_logs_off(self):
        listener = socket.socket()
        listener.bind(("127.0.0.1", 0))
        listener.listen(1)
        port = listener.getsockname()[1]
        received = []
        def serve():
            try:
                client, _ = listener.accept()
                with client:
                    client.settimeout(3)
                    client.sendall(b"Asterisk Call Manager/6.0\r\n")
                    request = b""
                    while b"\r\n\r\n" not in request:
                        request += client.recv(4096)
                    received.append(request)
                    client.sendall(b"Response: Success\r\nMessage: Authentication accepted\r\n\r\n")
                    received.append(client.recv(4096))
            finally:
                listener.close()
        thread = threading.Thread(target=serve, daemon=True)
        thread.start()
        smoke.check_ami("127.0.0.1", port, "user", "password", 3)
        thread.join(timeout=3)
        self.assertIn(b"Action: Login", received[0])
        self.assertIn(b"Action: Logoff", received[1])

    def test_ami_rejects_authentication_failure(self):
        listener = socket.socket()
        listener.bind(("127.0.0.1", 0))
        listener.listen(1)
        port = listener.getsockname()[1]
        def serve():
            try:
                client, _ = listener.accept()
                with client:
                    client.settimeout(3)
                    client.sendall(b"Asterisk Call Manager/6.0\r\n")
                    client.recv(4096)
                    client.sendall(b"Response: Error\r\nMessage: Authentication failed\r\n\r\n")
            finally:
                listener.close()
        thread = threading.Thread(target=serve, daemon=True)
        thread.start()
        with self.assertRaisesRegex(RuntimeError, "rejected"):
            smoke.check_ami("127.0.0.1", port, "user", "wrong", 3)
        thread.join(timeout=3)

    def test_ari_accepts_200_and_rejects_401(self):
        class Handler(BaseHTTPRequestHandler):
            status = 200
            def do_GET(self):
                self.server.last_path = self.path
                self.server.last_authorization = self.headers.get("Authorization")
                self.send_response(self.status)
                self.end_headers()
                self.wfile.write(b"{}")
            def log_message(self, *_):
                pass
        server = ThreadingHTTPServer(("127.0.0.1", 0), Handler)
        thread = threading.Thread(target=server.serve_forever, daemon=True)
        thread.start()
        try:
            smoke.check_ari("127.0.0.1", server.server_port, "user", "secret", 3)
            self.assertEqual(server.last_path, "/ari/asterisk/info")
            self.assertTrue(server.last_authorization.startswith("Basic "))
            Handler.status = 401
            with self.assertRaisesRegex(RuntimeError, "HTTP 401"):
                smoke.check_ari("127.0.0.1", server.server_port, "user", "bad", 3)
        finally:
            server.shutdown()
            server.server_close()
            thread.join(timeout=3)


if __name__ == "__main__":
    unittest.main()
