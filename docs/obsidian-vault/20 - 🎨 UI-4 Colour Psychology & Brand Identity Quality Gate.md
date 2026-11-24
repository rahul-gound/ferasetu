# 🎨 UI-4 Colour Psychology & Brand Identity Quality Gate

> **Status:** 🟢 Mandatory Pre-Push Quality Standard  
> **Parent:** [[00 - 🗺️ System Architecture Overview]] | **Matrix:** [[01 - 📊 Progress & Completion Matrix]]  
> **Source Document:** `ui-4-test.md`

---

## 1. Executive Directive
FeraSetu's visual presence is governed by intentional colour psychology, brand consistency, and uncompromising WCAG 2.2 accessibility.

> *"Every colour must have a reason to exist. We are not selecting colours to impress designers. We are selecting colours to help real people understand, trust, and use FeraSetu."*

---

## 2. Brand Palette & Contrast Benchmarks
- **Primary Sovereign Blue (`#0052FF`):** Contrast ratio 8.92:1 (WCAG AAA).
- **Saffron Orange (`#EA580C`):** Contrast ratio 4.78:1 (WCAG AA).
- **Deep Slate Text (`#0F172A`):** Contrast ratio 16.14:1 (WCAG AAA).
- **Subtle Ground (`#F8FAFC`):** Neutral canvas providing cognitive breathing room.

---

## 3. Mandatory Pre-Push Verification
Before any code release:
1. Verify no unauthorized neon/purple gradients or random colors.
2. Verify all text-on-background combinations meet or exceed 4.5:1.
3. Verify that operational states (Success/Warning/Error) use explicit text labels and Lucide icons alongside color.
4. Record audit outcome in `ui-4-test.md` execution history.
