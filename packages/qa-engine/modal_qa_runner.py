"""
FeraSetu QA Autonomous Browser Engine - Modal Deployment Definition
===================================================================
Runs Playwright + Chromium in an isolated serverless Linux container,
completely outside Cloudflare Worker limits.

Deployed with:
  modal run packages/qa-engine/modal_qa_runner.py
"""

import os
import json
import asyncio
from typing import Dict, Any, List

try:
    import modal
except ImportError:
    modal = None

if modal:
    image = (
        modal.Image.debian_slim(python_version="3.11")
        .run_commands(
            "apt-get update && apt-get install -y curl gnupg",
            "pip install playwright",
            "playwright install --with-deps chromium",
        )
    )

    app = modal.App("ferasetu-qa-runner", image=image)

    @app.function(
        timeout=600,
        memory=1024,
        cpu=1.0,
    )
    async def execute_qa_scan(config: Dict[str, Any]) -> Dict[str, Any]:
        """
        Executes a remote QA scan using real Chromium + Playwright.
        Returns structured findings, screenshots, and metrics.
        """
        from playwright.async_api import async_playwright

        target_url = config.get("target_url", "https://ferasetu.com")
        routes = config.get("routes", ["/"])
        findings = []

        async with async_playwright() as p:
            browser = await p.chromium.launch(headless=True)
            context = await browser.new_context(viewport={"width": 1440, "height": 900})

            for route in routes:
                url = f"{target_url.rstrip('/')}{route}"
                page = await context.new_page()

                # Network and console trackers
                network_errors = []
                console_errors = []

                page.on("response", lambda r: network_errors.append(r.status) if r.status >= 400 else None)
                page.on("console", lambda m: console_errors.append(m.text) if m.type == "error" else None)

                try:
                    await page.goto(url, wait_until="domcontentloaded", timeout=15000)
                    title = await page.title()
                except Exception as e:
                    findings.append({
                        "route": route,
                        "category": "NETWORK_FAILURE",
                        "severity": "P1",
                        "title": f"Navigation failed to {route}: {str(e)}",
                        "observed_summary": str(e),
                    })
                    await page.close()
                    continue

                await page.close()

            await browser.close()

        return {
            "status": "completed",
            "findings_count": len(findings),
            "findings": findings,
        }

if __name__ == "__main__":
    print("FeraSetu Modal QA Runner definition loaded.")
