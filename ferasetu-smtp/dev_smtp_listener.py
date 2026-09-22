"""
=============================================================================
PROTOTYPE / DEVELOPMENT ONLY — NOT FOR PRODUCTION INTERNET DELIVERY
=============================================================================

This module provides an in-memory/local SMTP submission server using `aiosmtpd`
for local development, end-to-end unit tests, and staging debugging.

PRODUCTION NOTICE:
Do NOT deploy this listener as the public production inbound/outbound MTA on Modal.
As documented in PRODUCTION-FEASIBILITY.md:
1. Modal's raw TCP ingress (modal.forward) only allocates dynamic, random ports.
2. Cloud egress IP addresses do not have Forward-Confirmed Reverse DNS (FCrDNS/PTR) records.
3. In production, use modal_app.py (FastAPI HTTPS gateway) with an authenticated relay.
=============================================================================
"""

import asyncio
import logging
from aiosmtpd.controller import Controller
from aiosmtpd.smtp import SMTP, Session, Envelope

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("ferasetu_smtp.dev_listener")

class DevSMTPHandler:
    """Handles SMTP submissions for local development and integration testing."""

    async def handle_DATA(self, server: SMTP, session: Session, envelope: Envelope) -> str:
        logger.info("[DEV SMTP] Received message from: %s to: %s", envelope.mail_from, envelope.rcpt_tos)
        logger.info("[DEV SMTP] Data length: %d bytes", len(envelope.content))
        
        # Safe debug inspection of headers
        try:
            lines = envelope.content.decode("utf-8", errors="ignore").splitlines()
            headers = [line for line in lines[:20] if ":" in line]
            logger.info("[DEV SMTP] Sample headers:\n  %s", "\n  ".join(headers))
        except Exception:
            pass

        return "250 2.0.0 OK: message queued in dev simulator"

def run_dev_server(host: str = "127.0.0.1", port: int = 1025):
    """Starts the development SMTP listener."""
    handler = DevSMTPHandler()
    controller = Controller(handler, hostname=host, port=port)
    controller.start()
    logger.info("=== Dev SMTP Server listening on %s:%d ===", host, port)
    logger.info("NOTE: This is a PROTOTYPE listener for local testing only.")
    return controller

if __name__ == "__main__":
    controller = run_dev_server()
    try:
        asyncio.get_event_loop().run_forever()
    except KeyboardInterrupt:
        controller.stop()
        logger.info("Dev SMTP server stopped.")
