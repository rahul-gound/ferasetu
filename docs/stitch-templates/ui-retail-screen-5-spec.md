# UI Test Specification 3 — Payment Rails & Website Builder Template Integration

**Project Title:** FeraSetu Design System  
**Stitch Project ID:** `6894408154411177085`  
**Governing Design Document:** [DESIGN.md](file:///c:/Users/himanshu/OneDrive/fera-shopkeeeper-web-testing-/DESIGN.md)  
**Tactile Button Rule:** [.agents/rules/ferasetu-design-system.md](file:///c:/Users/himanshu/OneDrive/fera-shopkeeeper-web-testing-/.agents/rules/ferasetu-design-system.md)  

---

## 1. Overview & Architectural Intent

This specification documents Screen 5 of the Stitch-generated **FeraSetu Retail Design System** and details the complete integration blueprint for incorporating this 5-screen retail template into the **FeraSetu Website Designer & Website Builder**.

```
┌────────────────────────────────────────────────────────┐
│ Screen 5: Retail - Select Payment Mode                 │
│ ID: 1c43bc7c6b634f7ca979160e112baff1                   │
│ Screenshot: /templates/retail/screen-5-payment-mode.png│
└──────────────────────────┬─────────────────────────────┘
                           │
                           ▼
┌────────────────────────────────────────────────────────┐
│ Website Designer & Builder Architecture Integration     │
│ Component: RetailStorefrontTemplate.tsx                │
│ Registry: THEME_REGISTRY['retail']                     │
│ Pages: WebsiteDesignPage.tsx & WebsiteBuilderPage.tsx  │
└────────────────────────────────────────────────────────┘
```

---

## 2. Screen 5: Retail - Select Payment Mode

- **Screen ID:** `1c43bc7c6b634f7ca979160e112baff1`
- **Render Dimensions:** Mobile Viewport `794px` × `2976px`
- **Local Preview File:** `docs/stitch-templates/screen-5-payment-mode.html`
- **High-Res Screenshot:** `frontend/public/templates/retail/screen-5-payment-mode.png`

### Visual Hierarchy & Anatomy:
1. **Order Summary Card:**
   - Payable Amount: `₹1,648.00`
   - Store Beneficiary: `Sharma Handlooms & Electronics (Direct Settlement)`
   - Guarantee Tag: `0% Platform Toll • 100% Encrypted`

2. **Indian Payment Rails (Jakob's Law Mental Models):**
   - **UPI Instant Transfer (Recommended):**
     - One-click app triggers: `Google Pay`, `PhonePe`, `Paytm`, `CRED`, `BHIM`.
     - Direct UPI VPA QR display option.
     - Reassurance badge: `Direct bank deposit in < 3 seconds`.
   - **Cash on Delivery (COD):**
     - Available for verified pin-codes.
     - SMS/WhatsApp OTP confirmation on order dispatch.
   - **Cards & NetBanking:**
     - RuPay, Visa, Mastercard with 256-bit bank encryption.

3. **Master Tactile Pay CTA:**
   - Tactile 3D button with ambient glow:
     - Text: `"Pay ₹1,648 via UPI"`
     - Inward physical press: `active:translate-y-0.5 active:scale-[0.985]`
     - Shelf shadow: `0 4px 0 0 #003bb5, 0 8px 20px rgba(0, 82, 255, 0.28)`

---

## 3. Website Designer / Builder Integration Architecture

### A. Theme Definition (`frontend/src/storefront/theme/themeDefinitions.ts`)
```typescript
export const RETAIL_THEME: ThemeDefinition = {
  id: 'retail',
  version: 1,
  name: 'Retail Storefront',
  tagline: 'High-conversion Indian retail storefront with verified GSTIN and UPI rails',
  description: 'Built for independent retailers, local grocers, apparel shops, and electronics stores. Features fast pincode dispatch, WhatsApp ordering, and direct bank settlement.',
  idealFor: ['Independent Retail', 'Handlooms & Apparel', 'Electronics & Hardware', 'Kirana & Grocery', 'Local Boutiques'],
  aspectRatio: '4/5',
  colors: {
    primary: '#001428',        // Sovereign Deep Navy
    primaryHover: '#0F2942',
    accent: '#FC6018',         // Saffron Commerce Orange
    accentHover: '#C74507',
    background: '#F8F9FF',     // Canvas porcelain
    surface: '#FFFFFF',
    surfaceElevated: '#EFF4FF',
    text: '#0D1C2F',
    textMuted: '#475569',
    textSubtle: '#74777E',
    border: '#DDE9FF',
    borderSubtle: '#EFF4FF',
    badgeBg: '#0F2942',
    badgeText: '#D1E4FF',
    saleBadgeBg: '#FC6018',
    saleBadgeText: '#FFFFFF',
  },
  // Typography: Hanken Grotesk headings + Manrope body
  typography: {
    fontFamilyHeading: "'Hanken Grotesk', sans-serif",
    fontFamilyBody: "'Manrope', sans-serif",
    headingWeight: '700',
    bodyWeight: '500',
  },
  // ...
};
```

### B. Multi-Screen Viewport Switcher in WebsiteDesignPage
In `WebsiteDesignPage.tsx`, shopkeepers can now preview the template across all 5 customer touchpoints:
1. `Home Storefront`
2. `Catalog & Filters`
3. `Product Detail (PDP)`
4. `Cart & Checkout`
5. `Select Payment Mode`

---

## 4. Verification & Testing Instructions

1. **Stitch Project Assets:**
   - Raw HTML files located in `docs/stitch-templates/*.html`.
   - Screenshots in `frontend/public/templates/retail/*.png`.
2. **Tactile Verification:**
   - All buttons have rounded corners (`rounded-xl` / `14px`).
   - All buttons have 3D bottom bevels (`0 4px 0 0 ...`).
   - All buttons compress inward on click (`active:translate-y-0.5 active:scale-[0.985]`).
3. **Obsidian Vault & Design Links:**
   - Linked in `DESIGN.md`.
   - Synchronized in `docs/obsidian-vault/15 - 🔘 Premium Design & Tactile Button Constitution.md`.
