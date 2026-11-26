# FeraSetu — Abandoned & Deferred Pages Registry (`abandant-page.md`)

> **Document Status:** Active Canonical Reference  
> **Purpose:** Maintains a persistent inventory of optional, deferred, and enterprise-grade modules that have been removed from standard navigation and production Cloudflare edge deployment to streamline cognitive load, reduce bundle overhead, and maintain laser focus on the core shopkeeper experience.

---

## 1. Architectural Principles & Rationales

1. **Hick's Law & Cognitive Simplicity:** Over 95% of independent shopkeepers operate a single physical store or boutique. Exposing multi-godown transfers, warehouse locations, and multi-node reorder thresholds in primary navigation creates decision fatigue and unneeded complexity.
2. **Lean Cloudflare Deployment:** Keeping large enterprise modules feature-flagged or lazily decoupled ensures minimum JavaScript payload delivered from Cloudflare Pages, achieving sub-second Largest Contentful Paint (LCP) and instant interactivity.
3. **Zero Loss of Engineering Work:** Code for deferred pages remains fully preserved in the repository (`frontend/src/pages/`), maintained with type safety, and ready for instant reactivation when platform scale or enterprise tier requirements demand it.

---

## 2. Registry of Deferred Modules

### Module 1: Inventory & Locations (Multi-Store Godown Management)

| Property | Details |
| :--- | :--- |
| **Module Name** | Inventory & Locations Studio |
| **Primary Route** | `/inventory-and-locations` |
| **Legacy Aliases** | `/inventory-locations` |
| **Primary Component** | `frontend/src/pages/InventoryLocationsPage.tsx` (~2,044 lines) |
| **Auxiliary Routes** | `/transfers` (`frontend/src/pages/TransfersPage.tsx`), `/transfers/new` (`frontend/src/pages/CreateTransferPage.tsx`) |
| **Auxiliary Components** | `frontend/src/components/transfers/SidekickCopilotBar.tsx`<br>`frontend/src/components/transfers/BarcodeScannerModal.tsx`<br>`frontend/src/components/dashboard/QuickStockModal.tsx` |
| **Backend & APIs** | `/transfers/locations`, `/transfers`, `/transfers/:id/status`, `/transfers/:id/receive`, `/transfers/ai-sidekick` in `frontend/src/services/api.ts` |
| **Current Behavior** | Removed from navigation drawer in `Layout.tsx`. In `App.tsx`, routed conditionally via `VITE_ENABLE_INVENTORY_LOCATIONS`. If disabled (default), gracefully redirects to `/products` (Products & Stock). |

#### Why It Was Deferred
- Standard merchants track inventory directly on the **Products & Stock** page (`/products`), which includes stock count, low-stock warnings, variants, and CSV bulk import.
- The multi-location page introduces concepts (Main Warehouse vs. Front Till, Inter-godown Transfers, In-transit Logistics) that are irrelevant to single-location retailers and create confusion.
- Removing this page from default deployment saves significant chunk size on Cloudflare Pages.

---

## 3. Scale Triggers (When to Re-Enable)

Re-enable this module when any of the following business milestones are reached:

1. **Multi-Location Retail Chain Demand:** When merchants with 2+ physical stores or separate godown facilities request unified inventory pooling.
2. **Enterprise / Pro Plus Tier Launch:** When launching a dedicated tier for regional distributors, FMCG wholesalers, or multi-outlet franchisees.
3. **Hardware Barcode Integration:** When deploying hardware handheld scanner support for large warehouse audits.

---

## 4. How to Re-Activate When Scaling

Follow these 3 quick steps to restore the Inventory & Locations module to active navigation and deployment:

### Step 1: Enable the Environment Variable
In your `.env` (or in Cloudflare Pages / Worker environment variables):
```env
VITE_ENABLE_INVENTORY_LOCATIONS="true"
```

### Step 2: Restore the Navigation Item in `frontend/src/components/Layout.tsx`
1. Re-add `Warehouse` to the `lucide-react` import:
   ```tsx
   import {
     // ...
     Warehouse,
   } from 'lucide-react';
   ```
2. In `toolsNavItems`, re-insert the navigation entry:
   ```tsx
   const toolsNavItems: NavItem[] = useMemo(() => [
     { path: '/inventory-and-locations', icon: <Warehouse size={17} />, label: 'Inventory & Locations' },
     { path: '/domains', icon: <Globe size={17} />, label: 'Domains & DNS' },
     { path: '/dashboard/discounts', icon: <Tag size={17} />, label: 'Discounts & Coupons' },
   ], []);
   ```

### Step 3: Verify in `frontend/src/App.tsx`
`App.tsx` is already configured to detect `VITE_ENABLE_INVENTORY_LOCATIONS`:
```tsx
const ENABLE_INVENTORY_LOCATIONS = import.meta.env.VITE_ENABLE_INVENTORY_LOCATIONS === 'true';
const InventoryLocationsPage = ENABLE_INVENTORY_LOCATIONS
  ? lazy(() => import('./pages/InventoryLocationsPage'))
  : null;
```
When `VITE_ENABLE_INVENTORY_LOCATIONS="true"`, `InventoryLocationsPage` will be dynamically imported and rendered at `/inventory-and-locations`.

### Step 4: Verify Integration Hub Link
In `frontend/src/pages/IntegrationsPage.tsx`, update the card button to link back to `/inventory-and-locations` if desired.

---

## 5. Maintenance & Compatibility Invariant
Even while deferred:
- The component file `frontend/src/pages/InventoryLocationsPage.tsx` must NOT be deleted.
- Any breaking changes to global shared contexts (`AuthContext`, `api.ts`, `SEO.tsx`) must be kept backward-compatible so that re-enabling this page requires zero refactoring.
