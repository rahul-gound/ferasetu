"""
FeraSetu Cloudflare DNS Automation & Verification Module
Automates the provisioning of merchant DKIM, SPF, and DMARC DNS records
via the Cloudflare v4 REST API and verifies DNS propagation.
"""

import os
import re
import json
import logging
import urllib.request
import urllib.error
from typing import Dict, Any, List, Optional
from config import Config
from security import SecurityManager

logger = logging.getLogger("ferasetu_smtp.cloudflare_dns")

class CloudflareDNSError(Exception):
    pass

class CloudflareDNSManager:
    """Automates Cloudflare DNS record creation and verification for merchant domains."""

    CLOUDFLARE_API_BASE = "https://api.cloudflare.com/client/v4"
    CLOUDFLARE_DOH_URL = "https://cloudflare-dns.com/dns-query"

    @classmethod
    def is_configured(cls) -> bool:
        """Checks if server-side Cloudflare API credentials are configured."""
        return bool(Config.CLOUDFLARE_API_TOKEN and Config.CLOUDFLARE_ZONE_ID)

    @classmethod
    def _api_request(
        cls,
        method: str,
        path: str,
        payload: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Performs an authenticated request to the Cloudflare API."""
        if not cls.is_configured():
            raise CloudflareDNSError("Cloudflare API credentials (CLOUDFLARE_API_TOKEN, CLOUDFLARE_ZONE_ID) not configured")

        url = f"{cls.CLOUDFLARE_API_BASE}/zones/{Config.CLOUDFLARE_ZONE_ID}/{path.lstrip('/')}"
        headers = {
            "Authorization": f"Bearer {Config.CLOUDFLARE_API_TOKEN}",
            "Content-Type": "application/json"
        }

        data = json.dumps(payload).encode("utf-8") if payload else None
        req = urllib.request.Request(url, data=data, headers=headers, method=method)

        try:
            with urllib.request.urlopen(req, timeout=15) as resp:
                body = resp.read().decode("utf-8")
                result = json.loads(body)
                if not result.get("success", False):
                    errors = result.get("errors", [])
                    raise CloudflareDNSError(f"Cloudflare API error: {errors}")
                return result
        except urllib.error.HTTPError as e:
            err_body = e.read().decode("utf-8") if e.fp else str(e)
            logger.error("Cloudflare API HTTP error [%d]: %s", e.code, SecurityManager.safe_redact(err_body))
            raise CloudflareDNSError(f"Cloudflare API HTTP {e.code}: {err_body}")
        except Exception as e:
            logger.error("Cloudflare API connection error: %s", str(e))
            raise CloudflareDNSError(f"Cloudflare API request failed: {str(e)}")

    @classmethod
    def provision_merchant_dns(
        cls,
        merchant_domain: str,
        dkim_public_key: str,
        selector: str = "fs1"
    ) -> Dict[str, Any]:
        """
        Provisions required DNS records for a merchant domain:
        1. DKIM TXT record at `<selector>._domainkey.<merchant_domain>`
        2. SPF TXT record at `<merchant_domain>`
        3. Optional explicit DMARC TXT record at `_dmarc.<merchant_domain>`
        """
        dkim_name = f"{selector}._domainkey.{merchant_domain}"
        dkim_content = f"v=DKIM1; k=rsa; p={dkim_public_key}"

        spf_name = merchant_domain
        spf_content = f"v=spf1 include:_spf.{Config.ROOT_DOMAIN} ~all"

        dmarc_name = f"_dmarc.{merchant_domain}"
        dmarc_content = f"v=DMARC1; p=reject; rua=mailto:dmarc-reports@{Config.ROOT_DOMAIN}; aspf=r; adkim=r"

        records_to_manage = [
            {"type": "TXT", "name": dkim_name, "content": dkim_content, "ttl": 3600, "purpose": "DKIM Public Key"},
            {"type": "TXT", "name": spf_name, "content": spf_content, "ttl": 3600, "purpose": "SPF Policy"},
            {"type": "TXT", "name": dmarc_name, "content": dmarc_content, "ttl": 3600, "purpose": "DMARC Subdomain Override"}
        ]

        if not cls.is_configured():
            logger.info("Cloudflare credentials not set; returning DNS records for automated external provisioning")
            return {
                "provisioned": False,
                "reason": "Cloudflare credentials not configured in environment",
                "records": records_to_manage
            }

        provisioned_results = []
        for rec in records_to_manage:
            try:
                # 1. Check existing record
                query_path = f"dns_records?type={rec['type']}&name={rec['name']}"
                existing = cls._api_request("GET", query_path)
                match = existing.get("result", [])

                if match:
                    record_id = match[0]["id"]
                    if match[0].get("content") != rec["content"]:
                        # Update record
                        update_path = f"dns_records/{record_id}"
                        update_payload = {
                            "type": rec["type"],
                            "name": rec["name"],
                            "content": rec["content"],
                            "ttl": rec["ttl"]
                        }
                        res = cls._api_request("PUT", update_path, update_payload)
                        provisioned_results.append({"name": rec["name"], "status": "UPDATED", "id": record_id})
                    else:
                        provisioned_results.append({"name": rec["name"], "status": "ALREADY_EXISTS", "id": record_id})
                else:
                    # Create new record
                    create_payload = {
                        "type": rec["type"],
                        "name": rec["name"],
                        "content": rec["content"],
                        "ttl": rec["ttl"]
                    }
                    res = cls._api_request("POST", "dns_records", create_payload)
                    rec_id = res.get("result", {}).get("id", "created")
                    provisioned_results.append({"name": rec["name"], "status": "CREATED", "id": rec_id})

            except Exception as e:
                logger.error("Failed to provision DNS record %s: %s", rec["name"], str(e))
                provisioned_results.append({"name": rec["name"], "status": "ERROR", "error": str(e)})

        return {
            "provisioned": True,
            "results": provisioned_results,
            "records": records_to_manage
        }

    @classmethod
    def verify_dns_records(
        cls,
        merchant_domain: str,
        selector: str = "fs1",
        expected_dkim_pubkey: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Verifies DNS propagation for the merchant DKIM public key using Cloudflare DoH.
        Does not require raw UDP port 53.
        """
        dkim_name = f"{selector}._domainkey.{merchant_domain}"
        query_url = f"{cls.CLOUDFLARE_DOH_URL}?name={urllib.parse.quote(dkim_name)}&type=TXT"

        req = urllib.request.Request(
            query_url,
            headers={"Accept": "application/dns-json", "User-Agent": "FeraSetu-SMTP-Verifier/1.0"}
        )

        try:
            with urllib.request.urlopen(req, timeout=10) as resp:
                data = json.loads(resp.read().decode("utf-8"))
                answers = data.get("Answer", [])

                for ans in answers:
                    val = ans.get("data", "").strip('"')
                    if "v=DKIM1" in val or "k=rsa" in val:
                        if expected_dkim_pubkey and expected_dkim_pubkey not in val:
                            return {
                                "verified": False,
                                "status": "DKIM_KEY_MISMATCH",
                                "record": dkim_name,
                                "details": "Published DKIM key does not match local key"
                            }
                        return {
                            "verified": True,
                            "status": "VERIFIED",
                            "record": dkim_name,
                            "details": f"DKIM TXT verified on {dkim_name}"
                        }

                return {
                    "verified": False,
                    "status": "PENDING_PROPAGATION",
                    "record": dkim_name,
                    "details": f"DKIM TXT record not found yet for {dkim_name}"
                }

        except Exception as e:
            logger.warning("DNS DoH verification error for %s: %s", dkim_name, str(e))
            return {
                "verified": False,
                "status": "LOOKUP_FAILED",
                "record": dkim_name,
                "details": f"DNS resolution failed: {str(e)}"
            }
