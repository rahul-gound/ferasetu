# UI Test Specification 2 — Retail PDP & Cart Checkout

**Project Title:** FeraSetu Design System  
**Stitch Project ID:** `6894408154411177085`  
**Governing Design Document:** [DESIGN.md](file:///c:/Users/himanshu/OneDrive/fera-shopkeeeper-web-testing-/DESIGN.md)  
**Tactile Button Rule:** [.agents/rules/ferasetu-design-system.md](file:///c:/Users/himanshu/OneDrive/fera-shopkeeeper-web-testing-/.agents/rules/ferasetu-design-system.md)  

---

## 1. Overview & Architectural Intent

This specification documents Screens 3 and 4 of the Stitch-generated **FeraSetu Retail Design System**:
1. **Screen 3: Product Detail (PDP)** — High-trust single-product presentation with transparent fabric specs, Indian chest sizing guide, and dual direct-purchase rails.
2. **Screen 4: Cart & Checkout** — Frictionless cart management, transparent fee ledger (0% platform toll), and tactile quantity controls.

```
┌────────────────────────────────────────────────────────┐
│ Screen 3: Retail - Product Detail (PDP)                │
│ ID: 516552b83c954e60ba0af7bc0c573ec2                   │
│ Screenshot: /templates/retail/screen-3-product-detail.png│
└──────────────────────────┬─────────────────────────────┘
                           │
                           ▼
┌────────────────────────────────────────────────────────┐
│ Screen 4: Retail - Cart & Checkout                     │
│ ID: 112f966813864d128d6d8a650dc77aec                   │
│ Screenshot: /templates/retail/screen-4-cart-checkout.png│
└────────────────────────────────────────────────────────┘
```

---

## 2. Screen 3: Retail - Product Detail (PDP)

- **Screen ID:** `516552b83c954e60ba0af7bc0c573ec2`
- **Render Dimensions:** Mobile Viewport `780px` × `4854px`
- **Local Preview File:** `docs/stitch-templates/screen-3-product-detail.html`
- **High-Res Screenshot:** `frontend/public/templates/retail/screen-3-product-detail.png`

### Visual Hierarchy & Anatomy:
1. **Header Navigation:**
   - Back arrow button with rounded tactile press.
   - Store name breadcrumb (`Sharma Handlooms`).
   - Quick action icons: Share to WhatsApp, Wishlist toggle, Mini-cart indicator with badge.

2. **Hero Visual Carousel:**
   - 4-image progressive carousel with edge preview indicators.
   - Zoom lens capability on tap.
   - Certified Authentic Handloom label overlay.

3. **Product Title & Price Block:**
   - Title: `Pure Handloom Indigo Cotton Kurta (Festive Edition)`.
   - Price: `₹899` (Special Festive Price) with `₹1,499` MRP strikethrough (`40% OFF`).
   - Tax note: `Inclusive of all taxes (GST 5%)`.

4. **Indian Sizing Specs & Fit Assistant:**
   - Sizing chips: `S (38")`, `M (40")`, `L (42")`, `XL (44")`, `XXL (46")`.
   - In-modal Chest Measurement Table with inch-to-cm switch.
   - Low inventory indicator for selected size: `"Only 2 units remaining in Size L"`.

5. **Merchant Direct Actions (Dual Rails):**
   - **Primary Action:** Tactile Orange `"Add to Cart"` button.
   - **Secondary Direct Rail:** Tactile Emerald `"Order via WhatsApp"` button with automatic message:
     *"Namaste Sharma Ji, I want to order Pure Handloom Indigo Cotton Kurta in Size L."*

---

## 3. Screen 4: Retail - Cart & Checkout

- **Screen ID:** `112f966813864d128d6d8a650dc77aec`
- **Render Dimensions:** Mobile Viewport `794px` × `4264px`
- **Local Preview File:** `docs/stitch-templates/screen-4-cart-checkout.html`
- **High-Res Screenshot:** `frontend/public/templates/retail/screen-4-cart-checkout.png`

### Visual Hierarchy & Anatomy:
1. **Cart Item Ledger:**
   - Item 1: *Pure Cotton Handloom Kurta (Size L, Indigo)* — `₹899`
   - Item 2: *Philips LED Smart Bulb 10W (Pack of 2)* — `₹749`
   - Tactile Stepper: `[-] 1 [+]` rounded pills with physical press feel.

2. **Transparent Fee Ledger (Loss Aversion Architecture):**
   - Item Total: `₹1,648.00`
   - Delivery Fee: `FREE` (Local pincode dispatch threshold met)
   - Aggregator Platform Fee: `₹0.00` (*Saved ₹82.40 on FeraSetu*)
   - Total Payable: `₹1,648.00`

3. **Delivery Address Module:**
   - House / Shop Number, Street Name, Landmark.
   - GPS Pin locator: `"Use current location"`.
   - Contact phone number with instant OTP login verification.

4. **Sticky Bottom Checkout CTA:**
   - Tactile 3D Button: `"Select Payment Mode • ₹1,648"`
   - Subtext: `Direct Settlement • 100% Encrypted UPI Rails`

---

## 4. Tactile Stepper & Quantity Controls

```css
/* Quantity Stepper Pills in Screen 4 */
.cart-stepper-btn {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  background-color: #f8f9ff;
  border: 1px solid #dde9ff;
  color: #001428;
  font-weight: 700;
  box-shadow: 0 2px 0 0 #c3c6ce, 0 3px 6px rgba(0, 0, 0, 0.04);
  transition: all 140ms cubic-bezier(0.16, 1, 0.3, 1);
}

.cart-stepper-btn:hover {
  background-color: #eff4ff;
  transform: translateY(-1px);
}

.cart-stepper-btn:active {
  transform: translateY(1.5px) scale(0.97);
  box-shadow: 0 0 0 0 #c3c6ce, inset 0 2px 3px rgba(0, 0, 0, 0.12);
}
```

---

## 5. Verification & Integration Checklist

- [x] Screen 3 (PDP) and Screen 4 (Cart & Checkout) retrieved and unwrapped.
- [x] Dual-rail direct commerce (Add to Cart + WhatsApp Draft) verified.
- [x] Tactile stepper buttons and 0% platform commission ledger validated.
- [x] Linked in `DESIGN.md`.
