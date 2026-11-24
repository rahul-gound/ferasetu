# 📱 UI-7 Mobile Experience is Essential Quality Gate

> **Status:** 🟢 Mandatory Pre-Push Quality Standard  
> **Parent:** [[00 - 🗺️ System Architecture Overview]] | **Matrix:** [[01 - 📊 Progress & Completion Matrix]]  
> **Source Document:** `ui-7-test.md`

---

## 1. Executive Directive
FeraSetu must deliver a professional, comfortable, and fully functional mobile experience.

> *"A merchant should be able to operate their business from a phone without fighting the interface. A customer should be able to browse and purchase comfortably. FeraSetu must feel intentionally designed on every screen size."*

---

## 2. Mandatory Viewports
- **Compact Mobile:** 320 × 568, 360 × 800, 390 × 844, 430 × 932
- **Tablet / Split View:** 768 × 1024, 1024 × 768
- **Laptop & Desktop:** 1366 × 768, 1440 × 900
- **Accessibility:** 200% browser zoom reflow test.

---

## 3. Core Mobile Invariants
1. **Zero Horizontal Overflow:** Page containers never exceed viewport width (`overflow-x-hidden`).
2. **Touch Target Standard:** Minimum 44 × 44px (48 × 48px preferred) in the natural thumb zone.
3. **Card-in-Card Prevention:** Use whitespace, subtle tint shifts, and typography hierarchy to separate content.
4. **Forms on Mobile:** Inputs prevent iOS auto-zoom (`font-size: 16px`).
5. **No Cluttered Steps:** Streamlined vertical single-view workflows (e.g. Add Product modal) without forcing users through 5 separate tabs.
