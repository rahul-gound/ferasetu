# UI Test Specification 1 — Retail Local Storefront Home & Catalog

**Project Title:** FeraSetu Design System  
**Stitch Project ID:** `6894408154411177085`  
**Governing Design Document:** [DESIGN.md](file:///c:/Users/himanshu/OneDrive/fera-shopkeeeper-web-testing-/DESIGN.md)  
**Tactile Button Rule:** [.agents/rules/ferasetu-design-system.md](file:///c:/Users/himanshu/OneDrive/fera-shopkeeeper-web-testing-/.agents/rules/ferasetu-design-system.md)  

---

## 1. Overview & Architectural Intent

This specification documents Screens 1 and 2 of the Stitch-generated **FeraSetu Retail Design System**, engineered specifically for independent retail shopkeepers, bodegas, kirana stores, and local commerce businesses.

The interface pairs Google Stitch's high-craft visual tokens (Hanken Grotesk + Manrope typography, crisp Indian retail commerce rails, and high-contrast color depth) with FeraSetu's tactile button physics (3D shelf depth, inward `:active` press, and 0% commission direct-to-merchant guarantees).

```
┌────────────────────────────────────────────────────────┐
│ Screen 1: Retail - Local Storefront Home               │
│ ID: d71b6d95dd764895939859c4d73e8106                   │
│ Screenshot: /templates/retail/screen-1-retail-home.png │
└──────────────────────────┬─────────────────────────────┘
                           │
                           ▼
┌────────────────────────────────────────────────────────┐
│ Screen 2: Retail - Product Catalog & Filters           │
│ ID: 7e630f2d9dc749ce8b365a80346e8f12                   │
│ Screenshot: /templates/retail/screen-2-product-catalog.png│
└────────────────────────────────────────────────────────┘
```

---

## 2. Shared Design Tokens (Screens 1 & 2)

| Token Category | Token Key | Hex Value / CSS Spec | Usage & Intent |
| :--- | :--- | :--- | :--- |
| **Canvas Background** | `background` | `#F8F9FF` | Soft cool porcelain ground; zero glare under direct sunlight. |
| **Surface Lowest** | `surface-container-lowest` | `#FFFFFF` | Crisp white cards and elevation planes. |
| **Surface Low** | `surface-container-low` | `#EFF4FF` | Soft tint for merchant trust badges and pill indicators. |
| **Surface High** | `surface-container-high` | `#DDE9FF` | Subtle active states, pill chip backgrounds, and divider fills. |
| **Primary Navy** | `primary` | `#001428` | Deep Sovereign Navy for top headings and high-contrast labels. |
| **Primary Container** | `primary-container` | `#0F2942` | Hero badges and elevated dark elements. |
| **Accent Orange** | `secondary` | `#FC6018` / `#A83900` | Saffron Commerce Orange for primary CTAs and discount tags. |
| **Tertiary Green** | `on-tertiary-container` | `#0C5216` / `#5B9D57` | Verified GSTIN trust badge and instant UPI confirmation. |
| **Display Font** | `font-display` | `'Hanken Grotesk', sans-serif` | Weight 600–800, tight tracking (`-0.02em`) for banners. |
| **Body Font** | `font-sans` | `'Manrope', sans-serif` | Weight 400–600, optimal tabular numerals for Indian currency (`₹`). |
| **Iconography** | `font-icon` | `Material Symbols Outlined` / `lucide-react` | Sized 18–20px, stroke width 1.75px. |

---

## 3. Screen 1: Retail - Local Storefront Home

- **Screen ID:** `d71b6d95dd764895939859c4d73e8106`
- **Render Dimensions:** Mobile Viewport `780px` × `3868px` (Responsive scale down to `390px` iPhone/Android)
- **Local Preview File:** `docs/stitch-templates/screen-1-retail-home.html`
- **High-Res Screenshot:** `frontend/public/templates/retail/screen-1-retail-home.png`

### Visual Hierarchy & Layout Sections:
1. **Top Pincode & Delivery Strip:**
   - Displays real-time store open status: `"Open Today • 9:00 AM – 9:30 PM"`.
   - Local delivery selector: `"Delivering to: 110001 (Connaught Place, New Delhi)"` with 1-tap change modal.
   - Pincode dispatch badge: `"Fast Local Dispatch in 24 Hrs"`.

2. **Merchant Brand Identity Card:**
   - Verified GSTIN Badge: `"Sharma Handlooms & Electronics • GSTIN Verified • 12 Years in Business"`.
   - Store rating: `4.9 ★ (840+ verified local ratings)`.
   - 1-Tap Direct Action: Green `"Chat on WhatsApp"` button with pre-filled greeting.

3. **Curated Category Carousel:**
   - Horizontal pill scroll with icons:
     - `Pure Cotton Kurtas`
     - `Home Electronics & LEDs`
     - `Handloom Bed Linens`
     - `Kitchen Appliances`
     - `Daily Essentials`

4. **Local Bestsellers 2-Column Grid:**
   - High-density cards featuring product photography, rating, instant discount percentage (`30% OFF`), MRP strike-through (`₹1,299` crossed out to `₹899`), and the tactile rounded `"+ Add"` button.

5. **Direct Bank Settlement & Zero Commission Guarantee:**
   - Shopkeeper reassurance banner: *"Every rupee goes directly to Sharma Handlooms via UPI. 0% aggregator toll."*

---

## 4. Screen 2: Retail - Product Catalog & Filters

- **Screen ID:** `7e630f2d9dc749ce8b365a80346e8f12`
- **Render Dimensions:** Mobile Viewport `780px` × `5468px`
- **Local Preview File:** `docs/stitch-templates/screen-2-product-catalog.html`
- **High-Res Screenshot:** `frontend/public/templates/retail/screen-2-product-catalog.png`

### Visual Hierarchy & Layout Sections:
1. **Faceted Filter & Search Header:**
   - Persistent search bar with auto-suggest for colloquial Hindi/English retail queries (`"Indigo kurta"`, `"10W bulb"`, `"Bedsheet 100% cotton"`).
   - Filter chips: `In Stock Only`, `Under ₹999`, `Cotton Only`, `Same-Day Dispatch`.
   - Sort dropdown: `Popularity`, `Price: Low to High`, `Customer Rating`.

2. **Catalog Product Cards:**
   - Dual-column grid with generous 16px gutter.
   - Image aspect ratio: `4/5` optimized for mobile catalog browsing.
   - Micro-badges: `"Bestseller"`, `"Low Stock (3 left)"`, `"Organic Cotton"`.
   - Pricing display: High-contrast slate `text-[#001428] font-bold tabular-nums` with currency symbol `₹`.

3. **Merchant Assurance Footprint:**
   - Return policy guarantee: *"No questions asked 7-day physical exchange at our shop or via free reverse pickup."*

---

## 5. Tactile Button Physics Implementation (Screens 1 & 2)

All primary and secondary CTA buttons in Screens 1 & 2 adhere to the **FeraSetu Tactile Button Constitution**:

```css
/* Primary Orange Tactile Action Button */
.btn-tactile-primary {
  background-color: #fc6018;
  color: #ffffff;
  border-radius: 14px; /* rounded-xl */
  font-weight: 700;
  box-shadow: 0 4px 0 0 #c74507, 0 8px 18px rgba(252, 96, 24, 0.28);
  transition: all 160ms cubic-bezier(0.16, 1, 0.3, 1);
}

.btn-tactile-primary:hover {
  transform: translateY(-1.5px);
  box-shadow: 0 5px 0 0 #c74507, 0 12px 22px rgba(252, 96, 24, 0.36);
}

.btn-tactile-primary:active {
  transform: translateY(2px) scale(0.985);
  box-shadow: 0 1px 0 0 #c74507, inset 0 2px 4px rgba(0, 0, 0, 0.2);
}
```

---

## 6. Verification & Integration Checklist

- [x] Stitch Project `6894408154411177085` screens 1 & 2 retrieved.
- [x] Raw HTML extracted and unwrapped in `docs/stitch-templates/`.
- [x] High-resolution PNGs stored in `frontend/public/templates/retail/`.
- [x] Documented in `ui-1-test.md` and linked in `DESIGN.md`.
- [x] Tactile 3D shelf shadows and active press verified.
