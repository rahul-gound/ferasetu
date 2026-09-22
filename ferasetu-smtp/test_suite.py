"""
Comprehensive Automated Test Suite for FeraSetu SMTP Service
Verifies all 14 production requirements:
1. Hostname generation format (shopname-city-district-state-uniqueid.ferasetu.com)
2. DNS-safe normalization and label length enforcement (<= 63 chars)
3. Unique collision-safe suffix generation
4. SPF generation and centralized policy architecture
5. DKIM 2048-bit keypair generation and DNS record formatting
6. DMARC policy inheritance and explicit override
7. Merchant sender authorization against canonical domain
8. Cloudflare DNS provisioning logic and payload generation
9. DNS verification checks (Cloudflare DoH)
10. Postfix loopback handoff (port 25, code 250)
11. Queue state transitions (QUEUED -> POSTFIX_QUEUED -> DEFERRED -> FAILED)
12. Duplicate-send prevention (Idempotency)
13. Invalid sender / cross-merchant mismatch rejection
14. CRLF header injection protection
"""

import os
import sys
import time
import shutil
import tempfile
import unittest
from email.message import EmailMessage

# Ensure module path is loaded
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, CURRENT_DIR)

from config import Config

# Configure test environment paths before loading application modules
TEST_DIR = tempfile.mkdtemp(prefix="ferasetu_smtp_test_")
Config.DATA_DIR = TEST_DIR
Config.DB_PATH = os.path.join(TEST_DIR, "test_queue.db")
Config.KEYS_DIR = os.path.join(TEST_DIR, "dkim_keys")
Config.API_KEY = "test-secret-key-123"
Config.ENV = "testing"
Config.IS_PRODUCTION = False
Config.ROOT_DOMAIN = "ferasetu.com"
Config.USE_POSTFIX_TRANSPORT = True
Config.POSTFIX_HOST = "127.0.0.1"
Config.POSTFIX_PORT = 12025
Config.ALLOW_SIMULATED_DELIVERY = False

# Now import modules
from security import (
    SecurityManager,
    UnauthorizedError,
    HeaderInjectionError,
    RateLimitExceededError
)
from merchant import MerchantManager, UnauthorizedSenderDomainError, MerchantError
from dkim_signer import DKIMSigner
from deliverability import DeliverabilityCompliance
from reputation import (
    ReputationManager,
    SenderSuspendedError,
    AddressSuppressedError,
    WarmupLimitExceededError
)
from queue_manager import QueueManager
from delivery import OutboundDispatcher
from cloudflare_dns import CloudflareDNSManager

# Mock SMTP handler to verify real Postfix protocol interactions
try:
    from aiosmtpd.controller import Controller
    from aiosmtpd.smtp import SMTP, Session, Envelope

    class MockPostfixHandler:
        def __init__(self):
            self.received_envelopes = []

        async def handle_DATA(self, server: SMTP, session: Session, envelope: Envelope) -> str:
            self.received_envelopes.append(envelope)
            return "250 2.0.0 Ok: queued as MOCK_POSTFIX_QUEUE_ID_12345"

except ImportError:
    Controller = None
    MockPostfixHandler = None


class FeraSetuSmtpTestSuite(unittest.TestCase):
    smtp_controller = None
    mock_handler = None

    @classmethod
    def setUpClass(cls):
        os.makedirs(Config.DATA_DIR, exist_ok=True)
        os.makedirs(Config.KEYS_DIR, exist_ok=True)
        QueueManager.init_queue()
        ReputationManager.init_schema()
        MerchantManager.init_schema()
        MerchantManager.get_or_create_dkim_key(Config.ROOT_DOMAIN, selector="fs1")

        # Start a local SMTP server on loopback to test actual Postfix transport
        if Controller and MockPostfixHandler:
            cls.mock_handler = MockPostfixHandler()
            cls.smtp_controller = Controller(cls.mock_handler, hostname="127.0.0.1", port=12025)
            cls.smtp_controller.start()

    @classmethod
    def tearDownClass(cls):
        if cls.smtp_controller:
            cls.smtp_controller.stop()
        shutil.rmtree(TEST_DIR, ignore_errors=True)

    # 1. Hostname generation format
    def test_01_canonical_hostname_generation(self):
        """Verify canonical domain format: shopname-city-district-state-uniqueid.ferasetu.com."""
        domain = MerchantManager.generate_canonical_merchant_domain(
            shop_name="My Store",
            city="Mumbai",
            district="Andheri",
            state="MH",
            unique_id="1"
        )
        self.assertEqual(domain, "my-store-mumbai-andheri-mh-1.ferasetu.com")

        # Test storefront URL alignment
        storefront_url = f"https://{domain}"
        self.assertEqual(storefront_url, "https://my-store-mumbai-andheri-mh-1.ferasetu.com")

    # 2. DNS-safe normalization and label length limits
    def test_02_dns_safe_normalization_and_label_length(self):
        """Verify special characters are stripped and DNS label <= 63 chars (RFC 1035)."""
        slug = MerchantManager.generate_canonical_merchant_slug(
            shop_name="Rajesh's Super & Organic Groceries (Store #42)!!",
            city="South Delhi",
            district="Connaught Place",
            state="New Delhi",
            unique_id="99"
        )
        # Guarantees lowercase alphanumeric with single hyphens
        self.assertTrue(bool(MerchantManager.SUBDOMAIN_PATTERN.match(slug)))
        # Guarantees RFC 1035 label limit
        self.assertLessEqual(len(slug), 63)
        self.assertGreaterEqual(len(slug), 3)
        self.assertFalse(slug.startswith("-"))
        self.assertFalse(slug.endswith("-"))

        # Test extreme case with 200 character shop name
        extreme_slug = MerchantManager.generate_canonical_merchant_slug(
            shop_name="a" * 200,
            city="b" * 50,
            district="c" * 50,
            state="d" * 20,
            unique_id="x" * 20
        )
        self.assertLessEqual(len(extreme_slug), 63)
        self.assertTrue(bool(MerchantManager.SUBDOMAIN_PATTERN.match(extreme_slug)))

    # 3. Unique collision-safe suffix generation
    def test_03_unique_collision_safe_suffix(self):
        """Verify deterministic collision-safe suffix prevents duplicate hostnames."""
        domain_1 = MerchantManager.generate_canonical_merchant_domain(
            shop_name="Kirana", city="Pune", district="Haveli", state="MH", unique_id="101"
        )
        domain_2 = MerchantManager.generate_canonical_merchant_domain(
            shop_name="Kirana", city="Pune", district="Haveli", state="MH", unique_id="102"
        )
        self.assertNotEqual(domain_1, domain_2)
        self.assertTrue(domain_1.endswith("-101.ferasetu.com"))
        self.assertTrue(domain_2.endswith("-102.ferasetu.com"))

    # 4. SPF generation and centralized policy
    def test_04_spf_generation_and_centralized_strategy(self):
        """Verify centralized SPF include record to prevent conflicting records."""
        domain = "my-store-mumbai-andheri-mh-1.ferasetu.com"
        dns_info = MerchantManager.generate_dns_records(domain)
        spf_records = [r for r in dns_info["records"] if r["type"] == "TXT" and "v=spf1" in r["content"]]
        
        self.assertEqual(len(spf_records), 1)
        self.assertEqual(spf_records[0]["name"], domain)
        self.assertIn("include:_spf.ferasetu.com", spf_records[0]["content"])
        self.assertTrue(spf_records[0]["content"].endswith("~all"))

    # 5. DKIM 2048-bit keypair generation and DNS record
    def test_05_dkim_generation_and_dns_record(self):
        """Verify 2048-bit RSA DKIM keypair generation and DNS TXT formatting."""
        domain = "shop-dkim-test.ferasetu.com"
        private_pem, public_b64 = MerchantManager.get_or_create_dkim_key(domain)
        
        self.assertIn("BEGIN RSA PRIVATE KEY", private_pem)
        self.assertGreater(len(public_b64), 100)

        dns_info = MerchantManager.generate_dns_records(domain)
        dkim_record = [r for r in dns_info["records"] if "._domainkey" in r["name"]][0]
        
        self.assertEqual(dkim_record["name"], f"fs1._domainkey.{domain}")
        self.assertIn("v=DKIM1; k=rsa; p=", dkim_record["content"])
        self.assertIn(public_b64, dkim_record["content"])

    # 6. DMARC handling and policy inheritance
    def test_06_dmarc_handling_and_policy(self):
        """Verify DMARC record generation and policy alignment."""
        domain = "my-shop-pune-mh-1.ferasetu.com"
        dns_info = MerchantManager.generate_dns_records(domain)
        dmarc_record = [r for r in dns_info["records"] if r["name"].startswith("_dmarc.")][0]
        
        self.assertEqual(dmarc_record["name"], f"_dmarc.{domain}")
        self.assertIn("v=DMARC1; p=reject", dmarc_record["content"])
        self.assertIn("aspf=r; adkim=r", dmarc_record["content"])
        # Ensure not confused with domainkey
        self.assertNotIn("_domainkey", dmarc_record["name"])

    # 7. Merchant sender authorization
    def test_07_merchant_sender_authorization(self):
        """Verify sender authorization against canonical domain and registered identities."""
        canonical_domain = "fresh-mart-surat-gj-1.ferasetu.com"
        merchant_id = "merchant_surat_01"

        # Register identity in SQLite
        MerchantManager.save_merchant_identity(
            merchant_id=merchant_id,
            canonical_domain=canonical_domain,
            shop_name="Fresh Mart",
            city="Surat",
            district="Surat",
            state="GJ",
            unique_id="1"
        )

        # Authorized sender
        local, dom = MerchantManager.validate_sender_authorization(
            merchant_id, f"noreply@{canonical_domain}"
        )
        self.assertEqual(local, "noreply")
        self.assertEqual(dom, canonical_domain)

    # 8. Cloudflare DNS provisioning logic
    def test_08_cloudflare_dns_provisioning_logic(self):
        """Verify Cloudflare payload generation and credentials fallback."""
        domain = "cf-test-shop.ferasetu.com"
        _, pubkey = MerchantManager.get_or_create_dkim_key(domain)

        # Without credentials configured, should safely return prepared records without crashing
        res = CloudflareDNSManager.provision_merchant_dns(domain, pubkey, selector="fs1")
        self.assertIn("records", res)
        self.assertEqual(len(res["records"]), 3)
        self.assertEqual(res["records"][0]["type"], "TXT")

    # 9. DNS verification checks (Cloudflare DoH)
    def test_09_dns_verification_checks(self):
        """Verify DNS verification handler returns structured status."""
        domain = "nonexistent-test-verify-shop.ferasetu.com"
        res = CloudflareDNSManager.verify_dns_records(domain, selector="fs1")
        self.assertIn("verified", res)
        self.assertIn("status", res)
        # Nonexistent domain should return PENDING_PROPAGATION or LOOKUP_FAILED
        self.assertFalse(res["verified"])

    # 10. Postfix loopback handoff (code 250)
    def test_10_actual_postfix_loopback_handoff(self):
        """Verify OutboundDispatcher hands signed MIME to Postfix on 127.0.0.1:25 and returns POSTFIX_QUEUED."""
        msg_id = "<test_handoff_001@shopname-mumbai-mh-1.ferasetu.com>"
        from_email = "noreply@shopname-mumbai-mh-1.ferasetu.com"
        to_email = "buyer@example.com"

        mime_msg, _ = DeliverabilityCompliance.build_transactional_mime(
            merchant_id="shopname-mumbai-mh-1",
            from_email=from_email,
            to_email=to_email,
            subject="Order Handoff Test",
            text_content="Order confirmed."
        )
        signed_mime = DKIMSigner.sign_message(mime_msg.as_bytes(), domain="shopname-mumbai-mh-1.ferasetu.com")

        QueueManager.enqueue(
            message_id=msg_id,
            merchant_id="shopname-mumbai-mh-1",
            from_email=from_email,
            to_email=to_email,
            subject="Order Handoff Test",
            raw_mime=signed_mime
        )

        if self.smtp_controller is None:
            from unittest.mock import patch, MagicMock
            with patch("smtplib.SMTP") as mock_smtp:
                instance = mock_smtp.return_value.__enter__.return_value
                instance.sendmail.return_value = {}
                result = OutboundDispatcher.dispatch_message(
                    message_id=msg_id,
                    merchant_id="shopname-mumbai-mh-1",
                    from_email=from_email,
                    to_email=to_email,
                    raw_mime=signed_mime
                )
        else:
            result = OutboundDispatcher.dispatch_message(
                message_id=msg_id,
                merchant_id="shopname-mumbai-mh-1",
                from_email=from_email,
                to_email=to_email,
                raw_mime=signed_mime
            )

        self.assertTrue(result.success)
        self.assertEqual(result.status_code, 250)
        self.assertEqual(result.queue_status, QueueManager.STATE_POSTFIX_QUEUED)

        # Check queue status is accurately recorded as POSTFIX_QUEUED (not DELIVERED)
        status = QueueManager.get_status(msg_id)
        self.assertEqual(status["status"], QueueManager.STATE_POSTFIX_QUEUED)

    # 11. Queue state transitions (QUEUED -> POSTFIX_QUEUED -> DEFERRED -> FAILED)
    def test_11_queue_state_transitions(self):
        """Verify queue transitions through QUEUED, DEFERRED, and FAILED states."""
        msg_id = "<test_trans_001@shop-1.ferasetu.com>"
        QueueManager.enqueue(
            message_id=msg_id,
            merchant_id="shop-1",
            from_email="noreply@shop-1.ferasetu.com",
            to_email="customer@example.com",
            subject="State Transition Test",
            raw_mime=b"raw"
        )
        self.assertEqual(QueueManager.get_status(msg_id)["status"], QueueManager.STATE_QUEUED)

        # Transient failure transitions to DEFERRED
        QueueManager.mark_failure(msg_id, "Connection timeout 421", is_permanent=False)
        self.assertEqual(QueueManager.get_status(msg_id)["status"], QueueManager.STATE_DEFERRED)

        # Hard failure transitions to FAILED
        QueueManager.mark_failure(msg_id, "Permanent 550 User unknown", is_permanent=True)
        self.assertEqual(QueueManager.get_status(msg_id)["status"], QueueManager.STATE_FAILED)

    # 12. Duplicate-send prevention (Idempotency)
    def test_12_duplicate_send_prevention_idempotency(self):
        """Verify identical idempotencyKey returns duplicate=True and does not re-queue."""
        idemp_key = "idemp_order_12345"
        res1 = QueueManager.enqueue(
            message_id="<msg_id_first@shop-1.ferasetu.com>",
            merchant_id="shop-1",
            from_email="noreply@shop-1.ferasetu.com",
            to_email="test@example.com",
            subject="Test 1",
            raw_mime=b"test",
            idempotency_key=idemp_key
        )
        self.assertFalse(res1["duplicate"])

        res2 = QueueManager.enqueue(
            message_id="<msg_id_second@shop-1.ferasetu.com>",
            merchant_id="shop-1",
            from_email="noreply@shop-1.ferasetu.com",
            to_email="test@example.com",
            subject="Test 2",
            raw_mime=b"test",
            idempotency_key=idemp_key
        )
        self.assertTrue(res2["duplicate"])
        self.assertEqual(res2["message_id"], "<msg_id_first@shop-1.ferasetu.com>")

    # 13. Invalid sender / cross-merchant mismatch rejection
    def test_13_invalid_sender_rejection(self):
        """Verify cross-merchant forgery and external domains are strictly blocked."""
        with self.assertRaises(UnauthorizedSenderDomainError):
            MerchantManager.validate_sender_authorization("merchant_a", "noreply@merchant-b.ferasetu.com")

        with self.assertRaises(UnauthorizedSenderDomainError):
            MerchantManager.validate_sender_authorization("merchant_a", "spammer@evil.com")

        with self.assertRaises(MerchantError):
            MerchantManager.validate_sender_authorization("merchant_a", "invalid-email-no-at-sign")

    # 14. CRLF header injection protection
    def test_14_header_injection_protection(self):
        """Verify CRLF characters and encoded linebreaks in headers are blocked."""
        with self.assertRaises(HeaderInjectionError):
            SecurityManager.validate_no_header_injection("subject", "Order Confirmation\r\nBcc: attacker@evil.com")

        with self.assertRaises(HeaderInjectionError):
            SecurityManager.validate_no_header_injection("from", "noreply@shop.com%0d%0aSubject:Injected")

        with self.assertRaises(HeaderInjectionError):
            SecurityManager.validate_no_header_injection("to", "victim@example.com\nCc: evil@example.com")


    # 15. Oracle SMTP Relay Dispatch over Port 587
    def test_15_oracle_smtp_relay_dispatch(self):
        """Verify OutboundDispatcher routes to SMTP_RELAY_HOST on port 587 with TLS and authentication."""
        from unittest.mock import patch, MagicMock

        msg_id = "<relay_test_001@shop-1.ferasetu.com>"
        from_email = "noreply@shop-1.ferasetu.com"
        to_email = "customer@example.com"
        raw_mime = b"From: noreply@shop-1.ferasetu.com\r\nTo: customer@example.com\r\n\r\nHello"

        # Temporarily enable relay configuration
        orig_host = Config.SMTP_RELAY_HOST
        orig_port = Config.SMTP_RELAY_PORT
        orig_user = Config.SMTP_RELAY_USERNAME
        orig_pass = Config.SMTP_RELAY_PASSWORD
        orig_tls = Config.SMTP_RELAY_TLS

        Config.SMTP_RELAY_HOST = "mail.ferasetu.com"
        Config.SMTP_RELAY_PORT = 587
        Config.SMTP_RELAY_USERNAME = "ferasetu_relay"
        Config.SMTP_RELAY_PASSWORD = "test-relay-password"
        Config.SMTP_RELAY_TLS = True

        try:
            with patch("smtplib.SMTP") as mock_smtp:
                instance = mock_smtp.return_value.__enter__.return_value
                instance.sendmail.return_value = {}

                result = OutboundDispatcher.dispatch_message(
                    message_id=msg_id,
                    merchant_id="shop-1",
                    from_email=from_email,
                    to_email=to_email,
                    raw_mime=raw_mime
                )

                # Verify connection parameters
                mock_smtp.assert_called_once_with("mail.ferasetu.com", 587, timeout=30)
                instance.starttls.assert_called_once()
                instance.login.assert_called_once_with("ferasetu_relay", "test-relay-password")
                instance.sendmail.assert_called_once_with(from_email, [to_email], raw_mime)

                self.assertTrue(result.success)
                self.assertEqual(result.status_code, 250)
                self.assertIn("Accepted by upstream relay", result.message)

        finally:
            Config.SMTP_RELAY_HOST = orig_host
            Config.SMTP_RELAY_PORT = orig_port
            Config.SMTP_RELAY_USERNAME = orig_user
            Config.SMTP_RELAY_PASSWORD = orig_pass
            Config.SMTP_RELAY_TLS = orig_tls

    # 16. Platform send accepted
    def test_16_platform_send_accepted(self):
        """Verify platform email with scope=PLATFORM is authorized and queued."""
        from_email = "no-reply@ferasetu.com"
        local_part, domain = MerchantManager.validate_sender_authorization(
            tenant_id_or_merchant_id=Config.PLATFORM_TENANT_ID,
            sender_email=from_email,
            scope="PLATFORM"
        )
        self.assertEqual(domain, "ferasetu.com")
        self.assertEqual(local_part, "no-reply")

        mime_msg, msg_id = DeliverabilityCompliance.build_transactional_mime(
            merchant_id=Config.PLATFORM_TENANT_ID,
            from_email=from_email,
            to_email="admin@example.com",
            subject="Platform System Notification",
            text_content="Platform alert.",
            scope="PLATFORM",
            tenant_id=Config.PLATFORM_TENANT_ID,
            priority="CRITICAL"
        )
        signed_mime = DKIMSigner.sign_message(mime_msg.as_bytes(), domain=domain, selector="fs1")
        self.assertIn(b"DKIM-Signature:", signed_mime)
        self.assertIn(b"d=ferasetu.com", signed_mime)

        q_res = QueueManager.enqueue(
            message_id=msg_id,
            merchant_id=Config.PLATFORM_TENANT_ID,
            from_email=from_email,
            to_email="admin@example.com",
            subject="Platform System Notification",
            raw_mime=signed_mime,
            scope="PLATFORM",
            tenant_id=Config.PLATFORM_TENANT_ID,
            priority="CRITICAL"
        )
        self.assertFalse(q_res["duplicate"])
        status = QueueManager.get_status(msg_id, requester_tenant_id=Config.PLATFORM_TENANT_ID)
        self.assertEqual(status["scope"], "PLATFORM")
        self.assertEqual(status["tenant_id"], Config.PLATFORM_TENANT_ID)
        self.assertEqual(status["priority"], 1)
        self.assertEqual(status["priority_name"], "CRITICAL")

    # 17. Merchant send accepted
    def test_17_merchant_send_accepted(self):
        """Verify merchant canonical domain send with scope=MERCHANT is authorized and queued."""
        canonical_domain = "fresh-mart-delhi-dl-1.ferasetu.com"
        merchant_id = "merchant_delhi_101"
        MerchantManager.save_merchant_identity(
            merchant_id=merchant_id,
            canonical_domain=canonical_domain,
            shop_name="Fresh Mart",
            city="Delhi",
            district="Central",
            state="DL",
            unique_id="1"
        )

        from_email = f"orders@{canonical_domain}"
        local_part, domain = MerchantManager.validate_sender_authorization(
            tenant_id_or_merchant_id=merchant_id,
            sender_email=from_email,
            scope="MERCHANT",
            merchant_id=merchant_id
        )
        self.assertEqual(domain, canonical_domain)

        mime_msg, msg_id = DeliverabilityCompliance.build_transactional_mime(
            merchant_id=merchant_id,
            from_email=from_email,
            to_email="buyer@example.com",
            subject="Order Shipped",
            text_content="Your package is on the way.",
            scope="MERCHANT",
            tenant_id=merchant_id,
            priority="NORMAL"
        )
        signed_mime = DKIMSigner.sign_message(mime_msg.as_bytes(), domain=domain, selector="fs1")
        q_res = QueueManager.enqueue(
            message_id=msg_id,
            merchant_id=merchant_id,
            from_email=from_email,
            to_email="buyer@example.com",
            subject="Order Shipped",
            raw_mime=signed_mime,
            scope="MERCHANT",
            tenant_id=merchant_id,
            priority="NORMAL"
        )
        self.assertFalse(q_res["duplicate"])
        status = QueueManager.get_status(msg_id, requester_tenant_id=merchant_id)
        self.assertEqual(status["scope"], "MERCHANT")
        self.assertEqual(status["tenant_id"], merchant_id)
        self.assertEqual(status["priority_name"], "NORMAL")

    # 18. Unauthorized merchant sender rejected
    def test_18_unauthorized_merchant_sender_rejected(self):
        """Verify merchant attempting to send from an unassociated domain or platform domain is rejected."""
        merchant_id = "merchant_rogue_99"
        # Attempt to impersonate platform from merchant scope
        with self.assertRaises(UnauthorizedSenderDomainError):
            MerchantManager.validate_sender_authorization(
                tenant_id_or_merchant_id=merchant_id,
                sender_email="support@ferasetu.com",
                scope="MERCHANT",
                merchant_id=merchant_id
            )

        # Attempt to send from random external domain
        with self.assertRaises(UnauthorizedSenderDomainError):
            MerchantManager.validate_sender_authorization(
                tenant_id_or_merchant_id=merchant_id,
                sender_email="admin@phishing-attack.com",
                scope="MERCHANT",
                merchant_id=merchant_id
            )

    # 19. Unverified custom domain rejected
    def test_19_unverified_custom_domain_rejected(self):
        """Verify merchant attempting to send from an unverified custom domain is rejected."""
        merchant_id = "merchant_custom_pending"
        custom_domain = "unverified-brand.org"
        MerchantManager.register_custom_domain(merchant_id=merchant_id, domain=custom_domain)

        with self.assertRaises(UnauthorizedSenderDomainError) as ctx:
            MerchantManager.validate_sender_authorization(
                tenant_id_or_merchant_id=merchant_id,
                sender_email=f"noreply@{custom_domain}",
                scope="MERCHANT",
                merchant_id=merchant_id
            )
        self.assertIn("verification", str(ctx.exception).lower())

    # 20. Verified custom domain accepted
    def test_20_verified_custom_domain_accepted(self):
        """Verify merchant sender on a verified custom domain is authorized."""
        merchant_id = "merchant_custom_verified"
        custom_domain = "superstore.in"
        MerchantManager.register_custom_domain(merchant_id=merchant_id, domain=custom_domain)
        MerchantManager.verify_custom_domain(merchant_id=merchant_id, domain=custom_domain, force_verified=True)

        local, domain = MerchantManager.validate_sender_authorization(
            tenant_id_or_merchant_id=merchant_id,
            sender_email=f"contact@{custom_domain}",
            scope="MERCHANT",
            merchant_id=merchant_id
        )
        self.assertEqual(domain, custom_domain)
        self.assertEqual(local, "contact")

    # 21. Platform mail does not consume merchant quota
    def test_21_platform_mail_does_not_consume_merchant_quota(self):
        """Verify platform send/delivery updates platform reputation without modifying merchant metrics."""
        merchant_id = "merchant_isolated_quota"
        # Check initial merchant state
        m_initial = ReputationManager.get_merchant_status(merchant_id)
        p_initial = ReputationManager.get_platform_status()

        # Record platform send and delivery
        ReputationManager.record_email_sent(Config.PLATFORM_TENANT_ID, scope="PLATFORM")
        ReputationManager.record_delivered(Config.PLATFORM_TENANT_ID, scope="PLATFORM")

        m_after = ReputationManager.get_merchant_status(merchant_id)
        p_after = ReputationManager.get_platform_status()

        # Merchant total_sent must remain unchanged
        self.assertEqual(m_after["total_sent"], m_initial["total_sent"])
        # Platform total_sent must have incremented
        self.assertEqual(p_after["total_sent"], p_initial["total_sent"] + 1)
        self.assertEqual(p_after["total_delivered"], p_initial["total_delivered"] + 1)

    # 22. Merchant A cannot send as Merchant B
    def test_22_merchant_a_cannot_send_as_merchant_b(self):
        """Verify Merchant A cannot send using Merchant B's canonical or custom domain."""
        merchant_b_domain = "store-b-pune-mh-2.ferasetu.com"
        MerchantManager.save_merchant_identity(
            merchant_id="merchant_b",
            canonical_domain=merchant_b_domain,
            shop_name="Store B",
            city="Pune",
            district="Pune",
            state="MH",
            unique_id="2"
        )

        with self.assertRaises(UnauthorizedSenderDomainError):
            MerchantManager.validate_sender_authorization(
                tenant_id_or_merchant_id="merchant_a",
                sender_email=f"noreply@{merchant_b_domain}",
                scope="MERCHANT",
                merchant_id="merchant_a"
            )

    # 23. Merchant A cannot inspect Merchant B status
    def test_23_merchant_a_cannot_inspect_merchant_b_status(self):
        """Verify tenant isolation on message status queries."""
        msg_id = "<tenant_iso_msg_001@store-b.ferasetu.com>"
        QueueManager.enqueue(
            message_id=msg_id,
            merchant_id="merchant_b",
            from_email="orders@store-b.ferasetu.com",
            to_email="cust@example.com",
            subject="Secret Order",
            raw_mime=b"raw",
            scope="MERCHANT",
            tenant_id="merchant_b"
        )

        # Merchant A requesting Merchant B's message gets None
        status_a = QueueManager.get_status(msg_id, requester_tenant_id="merchant_a")
        self.assertIsNone(status_a)

        # Merchant B requesting their own message gets the status dict
        status_b = QueueManager.get_status(msg_id, requester_tenant_id="merchant_b")
        self.assertIsNotNone(status_b)
        self.assertEqual(status_b["tenant_id"], "merchant_b")

    # 24. Duplicate idempotency key does not duplicate email & key isolation
    def test_24_duplicate_idempotency_key_and_tenant_isolation(self):
        """Verify idempotency key prevents duplicates within tenant and allows across tenants."""
        idemp_key = "order_invoice_txn_9999"
        msg_1 = "<idemp_test_m1@store-1.ferasetu.com>"
        r1 = QueueManager.enqueue(
            message_id=msg_1,
            merchant_id="merchant_1",
            from_email="orders@store-1.ferasetu.com",
            to_email="user1@example.com",
            subject="Invoice",
            raw_mime=b"raw1",
            idempotency_key=idemp_key,
            scope="MERCHANT",
            tenant_id="merchant_1"
        )
        self.assertFalse(r1["duplicate"])

        # Repeat for same tenant -> duplicate=True
        r1_dup = QueueManager.enqueue(
            message_id="<idemp_test_m1_dup@store-1.ferasetu.com>",
            merchant_id="merchant_1",
            from_email="orders@store-1.ferasetu.com",
            to_email="user1@example.com",
            subject="Invoice",
            raw_mime=b"raw1",
            idempotency_key=idemp_key,
            scope="MERCHANT",
            tenant_id="merchant_1"
        )
        self.assertTrue(r1_dup["duplicate"])
        self.assertEqual(r1_dup["message_id"], msg_1)

        # Same key for a different tenant -> NOT a duplicate (tenant-scoped idempotency)
        r2 = QueueManager.enqueue(
            message_id="<idemp_test_m2@store-2.ferasetu.com>",
            merchant_id="merchant_2",
            from_email="orders@store-2.ferasetu.com",
            to_email="user2@example.com",
            subject="Invoice",
            raw_mime=b"raw2",
            idempotency_key=idemp_key,
            scope="MERCHANT",
            tenant_id="merchant_2"
        )
        self.assertFalse(r2["duplicate"])

    # 25. Arbitrary dangerous headers rejected
    def test_25_arbitrary_dangerous_headers_rejected(self):
        """Verify forbidden headers like Return-Path, DKIM-Signature, Received, etc. are rejected."""
        forbidden_attempts = [
            {"Return-Path": "<attacker@evil.com>"},
            {"Received": "from evil.com"},
            {"DKIM-Signature": "v=1; a=rsa-sha256; ..."},
            {"X-FeraSetu-Scope": "PLATFORM"},
            {"Bcc": "spy@evil.com"},
            {"Content-Length": "99999"}
        ]
        for bad_header in forbidden_attempts:
            with self.assertRaises(HeaderInjectionError):
                SecurityManager.validate_custom_headers(bad_header)

    # 26. Postfix cannot be used as open relay
    def test_26_postfix_cannot_be_used_as_open_relay(self):
        """Verify Postfix configuration restricts relaying and limits network exposure."""
        main_cf_path = os.path.join(CURRENT_DIR, "postfix", "main.cf")
        entrypoint_path = os.path.join(CURRENT_DIR, "postfix", "entrypoint.sh")

        with open(main_cf_path, "r") as f:
            main_cf = f.read()

        # Check loopback interface binding
        self.assertIn("inet_interfaces = 127.0.0.1", main_cf)
        self.assertIn("mynetworks = 127.0.0.0/8 [::1]/128", main_cf)

        # Check anti-relay restrictions
        self.assertIn("smtpd_client_restrictions = permit_mynetworks, reject", main_cf)
        self.assertIn("smtpd_relay_restrictions = permit_mynetworks, reject", main_cf)
        self.assertIn("smtpd_recipient_restrictions = permit_mynetworks, reject", main_cf)
        self.assertIn("smtpd_data_restrictions = reject_unauth_pipelining", main_cf)
        self.assertIn("relay_domains =", main_cf)

        with open(entrypoint_path, "r") as f:
            entrypoint = f.read()
        self.assertIn("smtpd_relay_restrictions", entrypoint)
        self.assertIn("permit_mynetworks, reject", entrypoint)

    # 27. DKIM signing works for platform
    def test_27_dkim_signing_platform(self):
        """Verify DKIM signature header for platform domain uses ferasetu.com and selector fs1."""
        raw_msg = b"From: no-reply@ferasetu.com\r\nTo: user@example.com\r\nSubject: Test\r\n\r\nBody text"
        signed = DKIMSigner.sign_message(raw_msg, domain="ferasetu.com", selector="fs1")
        self.assertIn(b"DKIM-Signature:", signed)
        self.assertIn(b"d=ferasetu.com", signed)
        self.assertIn(b"s=fs1", signed)
        self.assertTrue(DKIMSigner.verify_dkim(signed))

    # 28. DKIM signing works for merchant canonical domain
    def test_28_dkim_signing_merchant_canonical_domain(self):
        """Verify canonical subdomains sign with root organizational domain ferasetu.com."""
        canonical_sub = "testshop-surat-gj-1.ferasetu.com"
        raw_msg = f"From: noreply@{canonical_sub}\r\nTo: customer@example.com\r\nSubject: Order\r\n\r\nOrder details".encode("utf-8")
        signed = DKIMSigner.sign_message(raw_msg, domain=canonical_sub, selector="fs1")
        self.assertIn(b"DKIM-Signature:", signed)
        self.assertIn(b"d=ferasetu.com", signed)
        self.assertIn(b"s=fs1", signed)
        self.assertTrue(DKIMSigner.verify_dkim(signed))

    # 29. DKIM signing works for merchant custom domain
    def test_29_dkim_signing_merchant_custom_domain(self):
        """Verify verified custom domain generates dedicated DKIM key and signs with custom domain."""
        custom_dom = "store.indiabrands.com"
        MerchantManager.register_custom_domain("merchant_brand_1", custom_dom)
        raw_msg = f"From: sales@{custom_dom}\r\nTo: buyer@example.com\r\nSubject: Sale\r\n\r\nSpecial discount".encode("utf-8")
        signed = DKIMSigner.sign_message(raw_msg, domain=custom_dom, selector="fs1")
        self.assertIn(b"DKIM-Signature:", signed)
        self.assertIn(b"d=store.indiabrands.com", signed)
        self.assertIn(b"s=fs1", signed)
        self.assertTrue(DKIMSigner.verify_dkim(signed))

    # 30. Bounce webhook updates correct tenant reputation and suppression list
    def test_30_bounce_webhook_tenant_isolation(self):
        """Verify bounce webhook updates tenant-specific reputation and suppression."""
        bounced_email = "invalid-user@destination.com"
        merchant_id = "merchant_bounce_test"

        # Merchant bounce
        ReputationManager.record_event(
            tenant_id=merchant_id,
            recipient_email=bounced_email,
            event_type="hard_bounce",
            details="550 Mailbox not found",
            scope="MERCHANT"
        )
        # Verify suppressed for this merchant
        self.assertTrue(ReputationManager.is_suppressed(bounced_email, tenant_id=merchant_id))
        # Verify NOT suppressed for platform
        self.assertFalse(ReputationManager.is_suppressed(bounced_email, tenant_id=Config.PLATFORM_TENANT_ID))
        # Verify NOT suppressed for another merchant
        self.assertFalse(ReputationManager.is_suppressed(bounced_email, tenant_id="merchant_other"))

        m_status = ReputationManager.get_merchant_status(merchant_id)
        self.assertEqual(m_status["total_bounced"], 1)

        p_status = ReputationManager.get_platform_status()
        self.assertEqual(p_status["total_bounced"], 0)

    # 31. Queue retry works and priority queueing orders CRITICAL before NORMAL
    def test_31_priority_queueing_order(self):
        """Verify priority queueing fetches CRITICAL priority messages before NORMAL priority."""
        msg_norm = f"<norm_pri_{int(time.time()*1000)}@ferasetu.com>"
        msg_crit = f"<crit_pri_{int(time.time()*1000)}@ferasetu.com>"

        # Enqueue NORMAL first
        QueueManager.enqueue(
            message_id=msg_norm,
            merchant_id=Config.PLATFORM_TENANT_ID,
            from_email="newsletter@ferasetu.com",
            to_email="user@example.com",
            subject="Monthly Digest",
            raw_mime=b"normal mail",
            scope="PLATFORM",
            tenant_id=Config.PLATFORM_TENANT_ID,
            priority="NORMAL"
        )

        # Enqueue CRITICAL after
        QueueManager.enqueue(
            message_id=msg_crit,
            merchant_id=Config.PLATFORM_TENANT_ID,
            from_email="security@ferasetu.com",
            to_email="user@example.com",
            subject="Security Alert",
            raw_mime=b"critical mail",
            scope="PLATFORM",
            tenant_id=Config.PLATFORM_TENANT_ID,
            priority="CRITICAL"
        )

        pending = QueueManager.fetch_pending_batch(limit=20)
        pending_ids = [m["id"] for m in pending]
        self.assertIn(msg_crit, pending_ids)
        self.assertIn(msg_norm, pending_ids)

        crit_idx = pending_ids.index(msg_crit)
        norm_idx = pending_ids.index(msg_norm)
        # CRITICAL must appear BEFORE NORMAL
        self.assertLess(crit_idx, norm_idx)

    # 32. Temporary SMTP failure (421/451) is retried with backoff
    def test_32_temporary_smtp_failure_retry_backoff(self):
        """Verify transient SMTP failure sets DEFERRED and schedules next retry in future."""
        msg_id = f"<temp_fail_{int(time.time()*1000)}@shop-temp.ferasetu.com>"
        QueueManager.enqueue(
            message_id=msg_id,
            merchant_id="shop_temp",
            from_email="noreply@shop-temp.ferasetu.com",
            to_email="user@example.com",
            subject="Temporary Failure Test",
            raw_mime=b"raw",
            scope="MERCHANT",
            tenant_id="shop_temp"
        )

        initial_status = QueueManager.get_status(msg_id)
        self.assertEqual(initial_status["status"], QueueManager.STATE_QUEUED)
        self.assertEqual(initial_status["retry_count"], 0)

        # Mark transient failure (421 Service Unavailable)
        before_time = int(time.time())
        QueueManager.mark_failure(msg_id, "421 Service not available, closing transmission channel", is_permanent=False)

        deferred_status = QueueManager.get_status(msg_id)
        self.assertEqual(deferred_status["status"], QueueManager.STATE_DEFERRED)
        self.assertEqual(deferred_status["retry_count"], 1)
        # Next retry should be set into the future (at least 30s)
        self.assertGreater(deferred_status["next_retry_at"], before_time + 30)

    # 33. Permanent SMTP failure (550) is surfaced correctly and hard bounced
    def test_33_permanent_smtp_failure_hard_bounce(self):
        """Verify permanent SMTP failure (550) immediately sets FAILED state and suppresses address."""
        msg_id = f"<perm_fail_{int(time.time()*1000)}@shop-perm.ferasetu.com>"
        bad_recipient = f"nonexistent_{int(time.time())}@domain-not-found.invalid"
        tenant = "shop_perm_1"

        QueueManager.enqueue(
            message_id=msg_id,
            merchant_id=tenant,
            from_email="noreply@shop-perm.ferasetu.com",
            to_email=bad_recipient,
            subject="Permanent Failure Test",
            raw_mime=b"raw",
            scope="MERCHANT",
            tenant_id=tenant
        )

        # Mark permanent failure (550 No such user)
        QueueManager.mark_failure(msg_id, "550 5.1.1 User unknown", is_permanent=True)

        failed_status = QueueManager.get_status(msg_id)
        self.assertEqual(failed_status["status"], QueueManager.STATE_FAILED)

        # Record event in reputation manager to verify hard bounce suppression
        ReputationManager.record_event(
            tenant_id=tenant,
            recipient_email=bad_recipient,
            event_type="hard_bounce",
            details="550 5.1.1 User unknown",
            scope="MERCHANT"
        )
        self.assertTrue(ReputationManager.is_suppressed(bad_recipient, tenant_id=tenant))

    # 34. Deliverability audit endpoint is protected by API key authentication
    def test_34_deliverability_audit_auth_protection(self):
        """Verify /v1/deliverability/audit rejects unauthenticated requests with 401 and succeeds with valid key."""
        from fastapi.testclient import TestClient
        from modal_app import api
        
        client = TestClient(api)
        # Without auth header -> 401
        res_unauth = client.get("/v1/deliverability/audit")
        self.assertEqual(res_unauth.status_code, 401)

        # With valid auth header -> 200
        res_auth = client.get("/v1/deliverability/audit", headers={"Authorization": f"Bearer {Config.API_KEY}"})
        self.assertEqual(res_auth.status_code, 200)
        data = res_auth.json()
        self.assertIn("deliverabilityStatus", data)
        self.assertIn("queueMetrics", data)

    # 35. In-memory DKIM key caching eliminates disk read overhead
    def test_35_dkim_key_caching_performance(self):
        """Verify repeated calls to get_or_create_dkim_key hit in-memory cache."""
        domain = "cache-test.ferasetu.com"
        MerchantManager._dkim_key_cache.pop(f"{domain}:fs1", None)
        
        # First call: populates cache
        pem1, pub1 = MerchantManager.get_or_create_dkim_key(domain, selector="fs1")
        self.assertIn(f"{domain}:fs1", MerchantManager._dkim_key_cache)

        # Second call: hits cache directly
        pem2, pub2 = MerchantManager.get_or_create_dkim_key(domain, selector="fs1")
        self.assertEqual(pem1, pem2)
        self.assertEqual(pub1, pub2)


if __name__ == "__main__":
    unittest.main(verbosity=2)
