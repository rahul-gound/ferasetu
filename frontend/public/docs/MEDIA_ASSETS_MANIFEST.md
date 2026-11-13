# 📸 FeraSetu Documentation Media Assets Manifest

This directory (`frontend/public/docs/`) hosts all screenshots, mockups, and video walkthroughs displayed across the official `/docs` documentation portal.

---

## 🖼️ Image Assets Needed (Screenshots & Mockups)

| Filename | Resolution | Aspect Ratio | Target Section | Description |
| :--- | :--- | :--- | :--- | :--- |
| `docs-quickstart-dashboard.png` | 1920x1080 | 16:9 | Store Setup in Under 2 Minutes | Desktop screenshot of Merchant Dashboard showing "Good morning" banner, Store Open status badge, Live Store link, and "Add Product" button. |
| `docs-whatsapp-checkout-flow.png` | 1080x1920 | 9:16 (Dual) | WhatsApp 1-Click Ordering | Side-by-side mobile capture showing Storefront Floating Cart drawer on the left and the resulting auto-formatted WhatsApp order message on the right. |
| `docs-upi-settlement-ledger.png` | 1920x1080 | 16:9 | Payments & 0% Commission | Screenshot of `/payments` studio displaying 0% Platform Commission guarantee pill, Total Captured metrics, and the ICICI/Bank of Baroda settlement ledger. |
| `docs-domain-dns-records.png` | 1920x1080 | 16:9 | Custom Domains & DNS Sync | Screenshot of `/domains` Diagnostics tab displaying the CNAME record verification status, green TLS 1.3 badge, and 5-node global latency radar. |
| `docs-inventory-sku-register.png` | 1920x1080 | 16:9 | Multi-Location Inventory & SKU Register | Screenshot of the Products SKU Register showing Emerald (in stock), Amber (low stock), and Rose (out of stock) status badges with quick stock buttons. |
| `docs-order-otp-modal.png` | 1920x1080 | 16:9 | Order Lifecycle & Delivery OTP | Screenshot of `EnterDeliveryCodeModal` open over the Orders list with 4-digit input fields, verified checkmark, and Complete Delivery CTA. |
| `docs-tax-invoice-sample.png` | 1200x1600 | Portrait Document | Order Lifecycle & Delivery OTP | Full sample of a generated tax invoice showing CGST/SGST/IGST breakdown, HSN codes, merchant GSTIN, customer details, and invoice QR. |
| `docs-ferasetu-ai-copilot.png` | 1920x1080 | 16:9 | FeraSetu AI Copilot | Screenshot of `ContextualAiAssistantPanel` on dashboard with prompt chips like "What should I restock today?" and live inventory answers. |
| `docs-thermal-printer-setup.png` | 1920x1080 | 16:9 | REST API, Webhooks & Hardware | Screenshot of the `PrinterStatusModal` showing Web Serial/Bluetooth pairing options and thermal paper 58mm/80mm test print layout. |

---

## 🎥 Video Walkthroughs Needed

| Filename | Resolution / Duration | Target Section | Content & Action Required |
| :--- | :--- | :--- | :--- |
| `docs-quickstart-walkthrough.mp4` | 1080p, 60–90s | Store Setup in Under 2 Minutes | Fast screen recording demonstrating entering store name, choosing domain handle, adding 1 product with image & price, and previewing live on mobile. |
| `docs-whatsapp-live-demo.mp4` | 1080x1920 (9:16), 30–45s | WhatsApp 1-Click Ordering | Real-time demonstration of a shopper browsing a category, tapping items to cart, clicking "Order via WhatsApp", and sending the order to merchant chat. |
| `docs-upi-qr-payment.mp4` | 1080p, 40s | Payments & 0% Commission | Step-by-step video generating a dynamic order payment QR code in the Orders dashboard and scanning it with a phone UPI app for instant settlement. |
| `docs-barcode-scanner-demo.mp4` | 1080p, 30s | Multi-Location Inventory & SKU Register | Demonstrating the integrated barcode scanner scanning a retail product barcode and instantly highlighting the SKU on screen. |

---

## 💡 How to Add Media
Drop the files directly into this directory (`frontend/public/docs/<filename>`). The `/docs` viewer will immediately load and display them.
