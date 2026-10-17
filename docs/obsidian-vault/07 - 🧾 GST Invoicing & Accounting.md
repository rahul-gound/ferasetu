# 🧾 GST Invoicing & Accounting

> **Subsystem Completion:** `90%`  
> **Status:** 🟢 Production Ready  
> **Primary Path:** `backend/src/services/pdf/`, `backend/src/services/gst.ts`  
> **Parent:** [[00 - 🗺️ System Architecture Overview]] | **Progress:** [[01 - 📊 Progress & Completion Matrix]]

---

## 1. Compliance Mandates
FeraSetu adheres strictly to Indian Goods and Services Tax (GST) specifications for both B2C local receipts and B2B taxable invoices.

## 2. Tax Computation Model
- **Intra-State Supply (Seller State == Buyer State):**
  - CGST: `TaxRate / 2`
  - SGST: `TaxRate / 2`
- **Inter-State Supply (Seller State != Buyer State):**
  - IGST: `TaxRate`
- **Exempt / Composition Scheme:**
  - Automated detection of composition levy declarations for small kiranas.

## 3. PDF Vector Invoicing
- Uses vector PDF generation (avoiding heavy headless browser instances).
- Includes dynamic QR codes for UPI payments and invoice verification.
- Output file size strictly under 100KB for instant WhatsApp sharing over 2G/3G connections.
