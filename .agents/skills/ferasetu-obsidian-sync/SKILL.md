---
name: ferasetu-obsidian-sync
description: >-
  Maintains, consults, and synchronizes the FeraSetu Architecture & Progress Vault in Obsidian.
  Use to optimize token consumption by reading modular architectural notes instead of rescanning
  entire directories, and track granular completion percentages and deliverables across all subsystems.
---

# FeraSetu Obsidian Architecture & Progress Sync Runbook

This skill governs the bidirectional synchronization between the FeraSetu codebase and the Obsidian Architecture Vault (`docs/obsidian-vault/`).

---

## 1. Token-Saving Architectural Lookup (Consult First)

To drastically reduce token usage and avoid redundant large-repo scans:
1. **Never perform blind full-repo searches** for architectural patterns or system boundaries.
2. **Consult the Obsidian Vault first:**
   - System Overview: `docs/obsidian-vault/00 - 🗺️ System Architecture Overview.md`
   - Progress & Completion: `docs/obsidian-vault/01 - 📊 Progress & Completion Matrix.md`
   - Edge Worker & D1: `docs/obsidian-vault/02 - ⚡ Edge Tier (Cloudflare Workers & D1).md`
   - Core API & Express: `docs/obsidian-vault/03 - 🖥️ Core API & Business Logic (Node.js & Express).md`
   - Frontend & UI: `docs/obsidian-vault/04 - 🎨 Frontend & Design System (React 19 & Tailwind).md`
   - Fera AI & Sarvam: `docs/obsidian-vault/05 - 🤖 Fera AI & Sarvam Intelligence.md`
   - Billing & Pricing: `docs/obsidian-vault/06 - 💳 Payments, Billing & Multi-Region Pricing.md`
   - GST Invoicing: `docs/obsidian-vault/07 - 🧾 GST Invoicing & Accounting.md`
   - Subdomains & DNS: `docs/obsidian-vault/08 - 🌐 Subdomains, Custom Domains & DNS.md`
   - QA & Tests: `docs/obsidian-vault/09 - 🧪 QA, Testing & Control Plane.md`
   - DB Schemas: `docs/obsidian-vault/10 - 🗄️ Database Schemas & Data Flow.md`
3. Read the relevant note using `view_file` (typically <100 lines / ~500 tokens).
4. Jump directly to the exact source files listed in the note's entrypoint table.

---

## 2. Progress & Completion Reporting ("Tell Which Work Is Done How Much")

When reporting status to the user or completing work:
1. Reference the current completion percentages from `01 - 📊 Progress & Completion Matrix.md`:
   - Edge Gateway & D1: **92%**
   - Core API & Express: **90%**
   - Frontend & UI/UX: **88%**
   - Fera AI Engine: **85%**
   - Pricing & Billing: **95%**
   - GST & Compliance: **90%**
   - Custom Domains & DNS: **88%**
   - QA & Verification: **92%**
   - Database Schemas: **90%**
   - **Global Platform:** **90%**
2. Break down the response into:
   - **Work Completed (% and checklist items):** What is done and verified.
   - **In Progress / Remaining:** What remains to reach 100%.

---

## 3. Mandatory Obsidian Synchronization On Code Changes

Whenever an agent creates, modifies, or deletes:
- A route in `worker/` or `backend/src/routes/`
- A database schema in `worker/migrations/` or `backend/src/models/`
- A pricing tier or plan in `config/plans.ts` or `backend/src/config/pricing.ts`
- A major frontend component, builder AST node, or page in `frontend/src/`
- A test suite in `tests/`

**You must immediately:**
1. Update the corresponding note in `docs/obsidian-vault/`.
2. Update `docs/obsidian-vault/01 - 📊 Progress & Completion Matrix.md` with:
   - Revised completion percentage if changed.
   - Checked-off checklist items `[x]` or new backlog items `[ ]`.
   - Updated `Last Synchronized` date.
