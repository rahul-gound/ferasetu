"""
FeraSetu Outbound Delivery Dispatcher
Handles transmission via Postfix MTA daemon on loopback port 25,
safe logging, response code interpretation, granular state tracking (POSTFIX_QUEUED, DEFERRED, FAILED),
and error reporting.
"""

import smtplib
import ssl
import logging
from typing import Dict, Any, Optional
from config import Config
from security import SecurityManager
from queue_manager import QueueManager
from reputation import ReputationManager

logger = logging.getLogger("ferasetu_smtp.delivery")

class DeliveryResult:
    def __init__(
        self,
        success: bool,
        message: str,
        status_code: int = 0,
        is_permanent_error: bool = False,
        queue_status: str = "POSTFIX_QUEUED"
    ):
        self.success = success
        self.message = message
        self.status_code = status_code
        self.is_permanent_error = is_permanent_error
        self.queue_status = queue_status

class TransportRouter:
    """
    Abstracts transport resolution by identity scope and tenant.
    Allows routing platform and merchant emails to dedicated transports in the future
    without altering public APIs or calling conventions.
    """
    @classmethod
    def get_transport_type(cls, scope: str = "MERCHANT", tenant_id: Optional[str] = None) -> str:
        # Currently both route to the shared infrastructure (RELAY_587 or POSTFIX_25),
        # but the decision point is decoupled here for future dedicated transports.
        if Config.SMTP_RELAY_HOST:
            return "ORACLE_RELAY_587"
        elif Config.USE_POSTFIX_TRANSPORT:
            return "POSTFIX_LOOPBACK_25"
        return "NONE"

class OutboundDispatcher:
    """Dispatches queued messages to the Postfix SMTP transport."""

    @classmethod
    def dispatch_message(
        cls,
        message_id: str,
        merchant_id: str,
        from_email: str,
        to_email: str,
        raw_mime: bytes,
        scope: str = "MERCHANT",
        tenant_id: Optional[str] = None
    ) -> DeliveryResult:
        """
        Sends raw signed MIME bytes through Postfix MTA on loopback port 25 or configured relay.
        Does not report DELIVERED when the message only reached Postfix queue;
        records accurate state POSTFIX_QUEUED upon code 250 acceptance.
        """
        redacted_to = SecurityManager.safe_redact_email(to_email)
        eff_tenant = tenant_id or (Config.PLATFORM_TENANT_ID if scope == "PLATFORM" else merchant_id)
        transport_type = TransportRouter.get_transport_type(scope, eff_tenant)

        logger.info("Attempting delivery for message %s [%s/%s] to %s via %s",
                    message_id, scope, eff_tenant, redacted_to, transport_type)

        # 1. Check for development-only simulated delivery flag
        if Config.ALLOW_SIMULATED_DELIVERY:
            if Config.IS_PRODUCTION:
                err = "PRODUCTION ERROR: Simulated delivery is strictly forbidden in production."
                logger.critical(err)
                raise RuntimeError(err)
            
            logger.warning("ALLOW_SIMULATED_DELIVERY is active (dev opt-in); simulating delivery for message %s", message_id)
            QueueManager.mark_postfix_queued(message_id, "Simulated delivery (dev opt-in)")
            ReputationManager.record_email_sent(tenant_id=eff_tenant, scope=scope)
            return DeliveryResult(True, "Simulated delivery (dev opt-in)", status_code=250, queue_status=QueueManager.STATE_POSTFIX_QUEUED)

        # 2. Outbound Transport Dispatch
        try:
            if transport_type == "ORACLE_RELAY_587":
                logger.info("Routing outbound mail for message %s through configured relay: %s:%d (TLS=%s)",
                            message_id, Config.SMTP_RELAY_HOST, Config.SMTP_RELAY_PORT, Config.SMTP_RELAY_TLS)
                result = cls._send_via_relay(from_email, to_email, raw_mime)
            elif transport_type == "POSTFIX_LOOPBACK_25":
                if Config.IS_PRODUCTION:
                    logger.warning("SMTP_RELAY_HOST is not configured in production; falling back to local Postfix on %s:%d. "
                                   "Deliverability may fail destination PTR/rDNS checks.",
                                   Config.POSTFIX_HOST, Config.POSTFIX_PORT)
                result = cls._send_via_postfix(from_email, to_email, raw_mime)
            else:
                result = DeliveryResult(
                    False,
                    "No valid outbound transport configured (SMTP_RELAY_HOST empty and USE_POSTFIX_TRANSPORT=false)",
                    status_code=500,
                    is_permanent_error=True,
                    queue_status=QueueManager.STATE_FAILED
                )

            if result.success:
                QueueManager.mark_postfix_queued(message_id, result.message)
                ReputationManager.record_email_sent(tenant_id=eff_tenant, scope=scope)
                logger.info("Message %s successfully queued to MTA (code %d): %s", message_id, result.status_code, result.message)
            else:
                QueueManager.mark_failure(message_id, result.message, is_permanent=result.is_permanent_error)
                if result.is_permanent_error:
                    ReputationManager.record_bounce(
                        tenant_id=eff_tenant,
                        recipient_email=to_email,
                        is_hard_bounce=True,
                        details=result.message,
                        scope=scope
                    )
                logger.warning("Message %s failed delivery: %s (code %d, state=%s)", message_id, result.message, result.status_code, result.queue_status)

            return result

        except Exception as e:
            err_msg = f"Unexpected delivery exception: {str(e)}"
            logger.error("Message %s delivery error: %s", message_id, err_msg)
            QueueManager.mark_failure(message_id, err_msg, is_permanent=False)
            return DeliveryResult(False, err_msg, status_code=500, is_permanent_error=False, queue_status=QueueManager.STATE_DEFERRED)

    @classmethod
    def _send_via_postfix(cls, from_email: str, to_email: str, raw_mime: bytes) -> DeliveryResult:
        """
        Transmits mail to local Postfix MTA instance on port 25.
        Verifies that Postfix accepts and queues the message.
        """
        try:
            with smtplib.SMTP(Config.POSTFIX_HOST, Config.POSTFIX_PORT, timeout=15) as server:
                server.ehlo(Config.SERVICE_HOSTNAME)
                refused = server.sendmail(from_email, [to_email], raw_mime)
                if refused:
                    err_msg = f"Postfix refused recipient: {refused}"
                    return DeliveryResult(False, err_msg, status_code=550, is_permanent_error=True, queue_status=QueueManager.STATE_FAILED)
                
                return DeliveryResult(
                    True,
                    "Accepted by Postfix MTA on loopback (code 250)",
                    status_code=250,
                    queue_status=QueueManager.STATE_POSTFIX_QUEUED
                )

        except smtplib.SMTPRecipientsRefused as e:
            return DeliveryResult(False, f"Postfix Recipient Refused: {str(e)}", status_code=550, is_permanent_error=True, queue_status=QueueManager.STATE_FAILED)
        except smtplib.SMTPSenderRefused as e:
            return DeliveryResult(False, f"Postfix Sender Refused: {str(e)}", status_code=e.smtp_code, is_permanent_error=True, queue_status=QueueManager.STATE_FAILED)
        except (smtplib.SMTPConnectError, smtplib.SMTPServerDisconnected, TimeoutError, ConnectionRefusedError, OSError) as e:
            return DeliveryResult(False, f"Postfix connection/delivery error: {str(e)}", status_code=451, is_permanent_error=False, queue_status=QueueManager.STATE_DEFERRED)
        except smtplib.SMTPResponseException as e:
            is_perm = e.smtp_code >= 500
            err_text = e.smtp_error.decode("utf-8", errors="ignore") if isinstance(e.smtp_error, bytes) else str(e.smtp_error)
            status_state = QueueManager.STATE_FAILED if is_perm else QueueManager.STATE_DEFERRED
            return DeliveryResult(False, f"Postfix SMTP error {e.smtp_code}: {err_text}", status_code=e.smtp_code, is_permanent_error=is_perm, queue_status=status_state)
        except Exception as e:
            return DeliveryResult(False, f"Postfix unexpected error: {str(e)}", status_code=500, is_permanent_error=False, queue_status=QueueManager.STATE_DEFERRED)

    @classmethod
    def _send_via_relay(cls, from_email: str, to_email: str, raw_mime: bytes) -> DeliveryResult:
        """Transmits mail via authenticated upstream relay (Modal -> Oracle:587)."""
        if not Config.SMTP_RELAY_USERNAME or not Config.SMTP_RELAY_PASSWORD:
            err = "Missing SMTP relay credentials (SMTP_RELAY_USERNAME or SMTP_RELAY_PASSWORD not set)"
            logger.error(err)
            return DeliveryResult(False, err, status_code=535, is_permanent_error=True, queue_status=QueueManager.STATE_FAILED)

        context = ssl.create_default_context()
        if not Config.SMTP_RELAY_VERIFY_CERT:
            context.check_hostname = False
            context.verify_mode = ssl.CERT_NONE

        try:
            with smtplib.SMTP(Config.SMTP_RELAY_HOST, Config.SMTP_RELAY_PORT, timeout=30) as server:
                server.ehlo(Config.SERVICE_HOSTNAME)
                if Config.SMTP_RELAY_TLS:
                    server.starttls(context=context)
                    server.ehlo(Config.SERVICE_HOSTNAME)

                server.login(Config.SMTP_RELAY_USERNAME, Config.SMTP_RELAY_PASSWORD)
                refused = server.sendmail(from_email, [to_email], raw_mime)
                if refused:
                    err_msg = f"Relay refused recipient: {refused}"
                    return DeliveryResult(False, err_msg, status_code=550, is_permanent_error=True, queue_status=QueueManager.STATE_FAILED)

                return DeliveryResult(
                    True,
                    f"Accepted by upstream relay {Config.SMTP_RELAY_HOST}:{Config.SMTP_RELAY_PORT} (code 250)",
                    status_code=250,
                    queue_status=QueueManager.STATE_POSTFIX_QUEUED
                )

        except smtplib.SMTPAuthenticationError as e:
            err_msg = e.smtp_error.decode("utf-8", errors="ignore") if isinstance(e.smtp_error, bytes) else str(e.smtp_error)
            logger.error("Relay SMTP authentication error: %s (code %d)", err_msg, e.smtp_code)
            return DeliveryResult(False, f"Relay Authentication Error: {err_msg}", status_code=e.smtp_code, is_permanent_error=False, queue_status=QueueManager.STATE_DEFERRED)
        except smtplib.SMTPRecipientsRefused as e:
            return DeliveryResult(False, f"Recipient Refused by relay: {str(e)}", status_code=550, is_permanent_error=True, queue_status=QueueManager.STATE_FAILED)
        except smtplib.SMTPSenderRefused as e:
            return DeliveryResult(False, f"Sender Refused by relay: {str(e)}", status_code=e.smtp_code, is_permanent_error=True, queue_status=QueueManager.STATE_FAILED)
        except (smtplib.SMTPConnectError, smtplib.SMTPServerDisconnected, TimeoutError, ConnectionRefusedError, OSError) as e:
            logger.warning("Transient connection failure reaching relay %s:%d: %s", Config.SMTP_RELAY_HOST, Config.SMTP_RELAY_PORT, str(e))
            return DeliveryResult(False, f"Transient relay network error: {str(e)}", status_code=421, is_permanent_error=False, queue_status=QueueManager.STATE_DEFERRED)
        except smtplib.SMTPResponseException as e:
            is_perm = e.smtp_code >= 500
            err_text = e.smtp_error.decode("utf-8", errors="ignore") if isinstance(e.smtp_error, bytes) else str(e.smtp_error)
            status_state = QueueManager.STATE_FAILED if is_perm else QueueManager.STATE_DEFERRED
            return DeliveryResult(False, f"Relay SMTP error {e.smtp_code}: {err_text}", status_code=e.smtp_code, is_permanent_error=is_perm, queue_status=status_state)
        except Exception as e:
            logger.error("Unexpected relay exception: %s", str(e))
            return DeliveryResult(False, f"Unexpected relay error: {str(e)}", status_code=500, is_permanent_error=False, queue_status=QueueManager.STATE_DEFERRED)
