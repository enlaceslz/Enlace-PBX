#!/usr/bin/env python3
"""Read-only AMI/ARI authentication smoke test for a local Asterisk instance.

Credentials are taken from environment variables and never printed.
This tool does not originate calls or change Asterisk configuration.
"""
import base64
import http.client
import os
import socket
import sys


def require(name):
    value = os.environ.get(name, "")
    if not value:
        raise ValueError(f"Missing required environment variable: {name}")
    return value


def check_ami(host, port, username, password, timeout):
    with socket.create_connection((host, port), timeout=timeout) as conn:
        conn.settimeout(timeout)
        banner = conn.recv(4096)
        if b"Asterisk Call Manager" not in banner:
            raise RuntimeError("AMI did not return the expected greeting")
        message = (
            f"Action: Login\r\nUsername: {username}\r\n"
            f"Secret: {password}\r\nEvents: off\r\n\r\n"
        )
        conn.sendall(message.encode("utf-8"))
        response = b""
        while b"\r\n\r\n" not in response and len(response) < 16384:
            chunk = conn.recv(4096)
            if not chunk:
                break
            response += chunk
        fields = {}
        for line in response.decode("utf-8", errors="replace").splitlines():
            if ": " in line:
                key, value = line.split(": ", 1)
                fields[key.lower()] = value
        if fields.get("response", "").lower() != "success":
            raise RuntimeError("AMI authentication rejected")
        conn.sendall(b"Action: Logoff\r\n\r\n")


def check_ari(host, port, username, password, timeout):
    conn = http.client.HTTPConnection(host, port, timeout=timeout)
    token = base64.b64encode(f"{username}:{password}".encode()).decode("ascii")
    try:
        conn.request("GET", "/ari/asterisk/info", headers={
            "Authorization": "Basic " + token,
            "Accept": "application/json",
        })
        response = conn.getresponse()
        response.read(1024)
        if response.status != 200:
            raise RuntimeError(f"ARI authentication/readiness failed (HTTP {response.status})")
    finally:
        conn.close()


def main():
    host = os.environ.get("ASTERISK_SMOKE_HOST", "127.0.0.1")
    if host not in ("127.0.0.1", "::1", "localhost"):
        raise ValueError("Only loopback Asterisk endpoints are permitted")
    timeout = float(os.environ.get("ASTERISK_SMOKE_TIMEOUT", "5"))
    if not 0 < timeout <= 30:
        raise ValueError("ASTERISK_SMOKE_TIMEOUT must be between 0 and 30 seconds")
    ami_user = require("ASTERISK_AMI_USER")
    ami_password = require("ASTERISK_AMI_PASSWORD")
    ari_user = require("ASTERISK_ARI_USER")
    ari_password = require("ASTERISK_ARI_PASSWORD")
    for value in (ami_user, ami_password, ari_user, ari_password):
        if "\r" in value or "\n" in value:
            raise ValueError("Credentials must not contain line breaks")
    check_ami(host, 5038, ami_user, ami_password, timeout)
    print("PASS: AMI login and logoff")
    check_ari(host, 8088, ari_user, ari_password, timeout)
    print("PASS: ARI authenticated information endpoint")
    print("NOTE: SIP, RTP, WebRTC and outbound calls were not tested")


if __name__ == "__main__":
    try:
        main()
    except (OSError, ValueError, RuntimeError) as exc:
        print(f"FAIL: Asterisk authentication smoke test: {exc}", file=sys.stderr)
        sys.exit(1)
