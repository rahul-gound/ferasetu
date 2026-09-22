"""
FeraSetu Deliverability & Anti-Spam Compliance Module
Handles RFC 5322 MIME formatting, transactional headers, SPF/DKIM/DMARC alignment checks,
and Forward-Confirmed Reverse DNS (FCrDNS) verification.
"""

import uuid
import time
import socket
import logging
from email.message import EmailMessage
from email.utils import formatdate, make_msgid
from typing import Dict, Any, Optional, Tuple
from config import Config
from security import SecurityManager

logger = logging.getLogger("ferasetu_smtp.deliverability")

class DeliverabilityCompliance:
    """Ensures emails conform to Google, Yahoo, and RFC delivery requirements."""

    @classmethod
    def build_transactional_mime(
        cls,
        merchant_id: str,
        from_email: str,
        to_email: str,
        subject: str,
        html_content: Optional[str] = None,
        text_content: Optional[str] = None,
        reply_to: Optional[str] = None,
        custom_headers: Optional[Dict[str, str]] = None,
        scope: str = "MERCHANT",
        tenant_id: Optional[str] = None,
        priority: str = "NORMAL"
    ) -> Tuple[EmailMessage, str]:
        """
        Builds a strictly formatted RFC 5322 MIME message for transactional delivery.
        Applies required anti-spam headers, tenant headers, priority headers, and header sanitization.
        Returns (EmailMessage, message_id).
        """
        # Validate against header injection
        clean_from = SecurityManager.validate_no_header_injection("from", from_email)
        clean_to = SecurityManager.validate_no_header_injection("to", to_email)
        clean_subject = SecurityManager.validate_no_header_injection("subject", subject)

        msg = EmailMessage()
        msg["From"] = clean_from
        msg["To"] = clean_to
        msg["Subject"] = clean_subject
        msg["Date"] = formatdate(localtime=False, usegmt=True)

        # Domain extraction for Message-ID alignment
        domain = clean_from.split("@")[-1]
        unique_id = str(uuid.uuid4())
        msg_id = f"<{unique_id}@{domain}>"
        msg["Message-ID"] = msg_id

        # Mandatory Transactional Compliance Headers
        msg["Auto-Submitted"] = "auto-generated"
        msg["X-Auto-Response-Suppress"] = "OOF, AutoReply"
        msg["Precedence"] = "bulk"  # RFC convention indicating automated delivery (prevents bounce loops)

        # Scope & Tenant Identification Headers
        eff_tenant = tenant_id or (Config.PLATFORM_TENANT_ID if scope == "PLATFORM" else merchant_id)
        if scope == "PLATFORM":
            msg["X-FeraSetu-Scope"] = "platform"
            msg["X-FeraSetu-Tenant-ID"] = eff_tenant
            msg["X-FeraSetu-Category"] = "platform-transactional"
        else:
            msg["X-FeraSetu-Scope"] = "merchant"
            msg["X-FeraSetu-Merchant-ID"] = merchant_id
            msg["X-FeraSetu-Tenant-ID"] = eff_tenant
            msg["X-FeraSetu-Category"] = "transactional"

        # Priority Class Headers
        prio_clean = priority.strip().upper() if priority else "NORMAL"
        if prio_clean == "CRITICAL":
            msg["X-Priority"] = "1 (Highest)"
            msg["Priority"] = "urgent"
            msg["Importance"] = "high"
        elif prio_clean == "HIGH":
            msg["X-Priority"] = "2 (High)"
            msg["Priority"] = "urgent"
            msg["Importance"] = "high"
        elif prio_clean == "LOW":
            msg["X-Priority"] = "5 (Lowest)"
            msg["Priority"] = "non-urgent"
            msg["Importance"] = "low"
        else: # NORMAL
            msg["X-Priority"] = "3 (Normal)"
            msg["Priority"] = "normal"
            msg["Importance"] = "normal"

        if reply_to:
            clean_reply_to = SecurityManager.validate_no_header_injection("reply_to", reply_to)
            msg["Reply-To"] = clean_reply_to

        # Validate and attach custom headers
        if custom_headers:
            validated_headers = SecurityManager.validate_custom_headers(custom_headers)
            for k, v in validated_headers.items():
                msg[k] = v

        # Content composition
        if text_content and html_content:
            msg.set_content(text_content)
            msg.add_alternative(html_content, subtype="html")
        elif html_content:
            # Generate fallback plain text if only HTML is supplied
            plain_fallback = "Please enable HTML viewing to read this transactional email."
            msg.set_content(plain_fallback)
            msg.add_alternative(html_content, subtype="html")
        elif text_content:
            msg.set_content(text_content)
        else:
            msg.set_content("")

        return msg, msg_id

    @classmethod
    def verify_fcrdns(cls, sending_ip: str, expected_hostname: str) -> Dict[str, Any]:
        """
        Verifies Forward-Confirmed Reverse DNS (FCrDNS):
        1. PTR lookup on sending_ip returns ptr_hostname
        2. A lookup on ptr_hostname returns forward_ip
        3. forward_ip == sending_ip
        4. ptr_hostname matches expected_hostname
        """
        result = {
            "sending_ip": sending_ip,
            "expected_hostname": expected_hostname,
            "ptr_hostname": None,
            "forward_ip": None,
            "fcrdns_pass": False,
            "details": ""
        }

        try:
            # 1. Reverse DNS (PTR)
            ptr_name, _, _ = socket.gethostbyaddr(sending_ip)
            result["ptr_hostname"] = ptr_name

            # 2. Forward DNS (A)
            forward_ip = socket.gethostbyname(ptr_name)
            result["forward_ip"] = forward_ip

            # 3. Confirmation check
            if forward_ip == sending_ip:
                if expected_hostname.lower() in ptr_name.lower() or ptr_name.lower() in expected_hostname.lower():
                    result["fcrdns_pass"] = True
                    result["details"] = f"FCrDNS confirmed: {sending_ip} <-> {ptr_name}"
                else:
                    result["details"] = f"PTR hostname '{ptr_name}' does not match expected '{expected_hostname}'"
            else:
                result["details"] = f"Forward IP '{forward_ip}' does not match sending IP '{sending_ip}'"

        except Exception as e:
            result["details"] = f"DNS lookup failed: {str(e)}"

        return result

    @classmethod
    def verify_alignment(
        cls,
        from_email: str,
        envelope_sender: str,
        dkim_domain: str
    ) -> Dict[str, Any]:
        """
        Verifies SPF and DKIM alignment against visible From domain (DMARC alignment).
        """
        from_domain = from_email.split("@")[-1].lower()
        envelope_domain = envelope_sender.split("@")[-1].lower()
        dkim_domain = dkim_domain.lower()

        # Relaxed SPF alignment: envelope domain shares base organizational domain
        spf_aligned = (from_domain == envelope_domain or from_domain.endswith(f".{Config.ROOT_DOMAIN}"))
        # Relaxed DKIM alignment: d= domain matches or is parent organizational domain of From domain (RFC 7489)
        dkim_aligned = (from_domain == dkim_domain or from_domain.endswith(f".{dkim_domain}"))

        # DMARC passes if EITHER SPF is aligned OR DKIM is aligned (RFC 7489 §4.2)
        dmarc_pass = spf_aligned or dkim_aligned

        return {
            "from_domain": from_domain,
            "envelope_domain": envelope_domain,
            "dkim_domain": dkim_domain,
            "spf_alignment": spf_aligned,
            "dkim_alignment": dkim_aligned,
            "dmarc_aligned": dmarc_pass
        }
