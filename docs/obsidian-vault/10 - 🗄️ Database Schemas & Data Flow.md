# 🗄️ Database Schemas & Data Flow

> **Subsystem Completion:** `93%`  
> **Status:** 🟢 Production Ready  
> **Primary Path:** `worker/migrations/`, `backend/src/models/`  
> **Parent:** [[00 - 🗺️ System Architecture Overview]] | **Progress:** [[01 - 📊 Progress & Completion Matrix]]

---

## 1. Dual-Database Design

```mermaid
erDiagram
    MERCHANT ||--o{ STORE : owns
    STORE ||--o{ PRODUCT : contains
    STORE ||--o{ ORDER : receives
    ORDER ||--|{ ORDER_ITEM : details
    ORDER ||--o| INVOICE : generates
    STORE ||--o| BRANDING : customizes
    MERCHANT ||--o{ AI_PURCHASE : purchases
    MERCHANT ||--o{ AI_USAGE_LOG : consumes
```

## 2. Core Entities

| Entity | Primary Storage | Key Attributes |
| :--- | :--- | :--- |
| **Merchants** | Appwrite / Core DB / D1 | `id`, `email`, `phone`, `plan_id` (`free` \| `business` \| `pro`), `ai_credits_balance`, `ferasetu_ai_limit`, `website_ai_limit`, `ferasetu_ai_enabled`, `website_ai_enabled`, `created_at` |
| **Stores** | D1 Edge SQL | `id`, `merchant_id`, `subdomain`, `custom_domain`, `currency`, `region` |
| **Products** | D1 Edge SQL | `id`, `store_id`, `name`, `price`, `stock`, `hsn_code`, `image_url` |
| **Orders** | Core DB / D1 Replica | `id`, `store_id`, `customer_phone`, `total_amount`, `status`, `payment_id` |
| **Invoices** | Core DB | `id`, `order_id`, `invoice_number`, `cgst`, `sgst`, `igst`, `pdf_url` |
| **Website Drafts** | D1 Edge SQL | `id`, `organization_id`, `user_id`, `draft_data`, `version`, `updated_at` |
| **Website Versions** | D1 Edge SQL | `id`, `organization_id`, `version_number`, `snapshot_data`, `published_at` |
| **Website Connections** | D1 Edge SQL | `id`, `organization_id`, `connection_type`, `config_json`, `secrets_encrypted` |
| **Announcements & Updates** | D1 Edge SQL / Core DB | `id`, `title`, `content`, `category`, `badge_label`, `action_url`, `is_pinned`, `target_plan`, `is_active`, `created_at` |
| **AI Credit Purchases** | D1 Edge SQL / Core DB | `id`, `user_id`, `credits`, `amount`, `currency`, `scope`, `payment_id`, `status`, `created_at` |
| **AI Usage Logs** | D1 Edge SQL / Core DB | `id`, `user_id`, `model`, `prompt_tokens`, `completion_tokens`, `credits_used`, `usage_type`, `created_at` |
| **Gift Cards** | D1 Edge SQL / Core DB | `id`, `user_id`, `code`, `initial_value`, `balance`, `currency`, `recipient_email`, `recipient_name`, `status`, `expires_at`, `created_at` |
| **Gift Card Transactions**| D1 Edge SQL / Core DB | `id`, `gift_card_id`, `order_id`, `amount`, `note`, `created_at` |
| **Discounts** | D1 Edge SQL | `id`, `organization_id`, `title`, `discount_type`, `value_type`, `value_minor`, `code`, `is_automatic`, `minimum_subtotal_minor`, `minimum_quantity`, `max_discount_minor`, `customer_eligibility`, `usage_limit_total`, `usage_limit_per_customer`, `usage_count`, `applies_to`, `combines_with_product`, `combines_with_order`, `combines_with_shipping`, `starts_at`, `expires_at`, `status` |
| **Discount Codes** | D1 Edge SQL | `id`, `discount_id`, `organization_id`, `code`, `usage_count`, `usage_limit`, `is_active`, `created_at` |
| **Discount Redemptions** | D1 Edge SQL | `id`, `discount_id`, `discount_code_id`, `order_id`, `organization_id`, `customer_id`, `customer_phone`, `customer_email`, `discount_amount_minor`, `redeemed_at` |

## 3. Migration Files
- `worker/migrations/`: SQL migration files for Cloudflare D1 (0001 through 0022).
  - `0019_unified_website_builder.sql`: Website drafts, immutable versions, connections vault, and media asset staging flags.
  - `0020_custom_storefront_domains.sql`: Custom domains, automated DNS verification, SSL status tracking.
  - `0022_discounts_engine.sql`: Complete D1 tables for promotional discounts, bulk coupon codes, and atomic checkout order redemption logs.
- `backend/src/models/`: TypeScript interfaces and Mongoose/SQL query definitions.

