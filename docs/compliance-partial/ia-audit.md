# IA audit — IA-U5, IA-U6, IA-U10

**Workspace:** `/Users/shawnkairu/emappa`  
**Date:** 2026-05-15  
**Scope:** Information architecture / UX truthfulness called out in `docs/SPEC_COMPLIANCE_CHECKLIST.md` as IA-U5 (non-working controls), IA-U6 (pilot vs silent fake metrics), IA-U10 (mobile vs web parity).  
**Note:** This file is a partial compliance artifact only. **`docs/SPEC_COMPLIANCE_CHECKLIST.md` was not modified** per task instructions.

---

## Methodology

1. **Programmatic section parity** — Located `auditStakeholderSectionParity()` in `packages/shared/src/stakeholderSections.ts`. It validates duplicate section IDs, a five-tab cap for non-admin roles (per IA_SPEC), and that every mobile primary section has a `webRoute` or `webAnchor`. It is bundled into the shared audit entrypoint (`packages/shared/src/audit.ts`).
2. **Runnable audit** — Confirmed `npm run audit:shared` compiles `audit.ts` and runs Node on the output. **Result (2026-05-15):** demo project consistency passed; **stakeholder section parity audit passed** (no issues emitted).
3. **Manual surface comparison** — Cross-checked `getWebSections` consumers (`website/src/App.tsx` `screenLoaders` keys) vs `mobile/app/(role)/` route files and `getMobileSections` usage (`mobile/components/RoleTabs.tsx`). Full interaction QA was **not** performed.
4. **Placeholder / stub grep** — Searched `website/src` and `mobile` for empty `onPress={() => {}}`, broad `TODO`/`FIXME` in stakeholder TSX trees, and `alert(` / `Alert.alert` placeholders. Matches were sparse; samples below are **illustrative**, not an exhaustive Pass for IA-U5.

---

## IA-U10 — Mobile vs website screens, order, data sources

### What passes programmatically

- Registry order and IDs in `stakeholderSections` align with how the **website** builds tabs via `getWebSections()` and `screenLoaders` — each loader object’s keys match the canonical section `id`s for that role (no stray tab IDs).
- **Mobile** tab chrome is driven by `getMobileSections(role)` in `RoleTabs.tsx`; extra file routes are mostly hidden via `href: null` (`qualified-projects`, `_embedded/*`, etc.), which is consistent with “primary IA tabs + secondary stacks.”

### Gaps and nuances (still Partial vs checklist wording “same screens, … data sources”)

| Topic | Finding |
| --- | --- |
| **Data orchestration** | Web portals aggregate via `loadPortalData` in `website/src/App.tsx`; many mobile stacks call `getRoleHome` or narrower helpers per screen (`FinancierShared`, `ProviderShared`, resident APIs). **Same underlying mock/API models are not guaranteed per navigation event**, so “same data sources” remains only partially true even when layouts match. |
| **Electrician compliance** | Web ships `website/src/screens/stakeholders/electrician/compliance.tsx` but it is **not** a portal tab; it is composed inside **Profile** (`ElectricianComplianceContent` in `electrician/profile.tsx`). Mobile aligns as of **P0.1.2**: compliance is inlined on **`ElectricianProfileScreen`** (`ElectricianComplianceEmbedded`); **`(electrician)/compliance.tsx` removed**. Component folder renamed **P0.1.5** (`mobile/components/electrician/`). |
| **Immersive / chart stacks** | Resident **Energy** on web stacks `ImmersiveEnergyHero` + `EnergyTodayChart`; mobile uses `SystemEnergyImmersiveHero` + API-fed hourly series + cards. Visual and data paths differ even when narratives align. |

### Recommended checklist updates (IA-U10)

- Split “screen parity” into explicit rows: **(a)** primary tab IDs/order (Pass when `auditStakeholderSectionParity` passes), **(b)** secondary/hidden route mapping (manual), **(c)** **data-fetch parity** (web `loadPortalData` vs mobile per-screen fetches — currently Partial).
- Known routing exceptions ~~(electrician compliance: web profile-only vs mobile hidden route)~~ **resolved on mobile P0.1.2**; web still mounts `electrician/compliance.tsx` as a composed module inside profile (acceptable IA-U10 variance vs path strings only).

---

## IA-U6 — Pilot vs silent fake metrics

### Labeling / banners

| Surface | Observation |
| --- | --- |
| **Web portal shell** | `website/src/portal/PortalShell.tsx` renders `<PilotBanner />` in the top bar for **every** portal tab, so Discover/Inventory/etc. inherit a baseline pilot disclaimer without duplicating it on each screen. |
| **Mobile financier Discover** | `FinancierDealsScreen` (`mobile/components/financier/FinancierDealsScreen.tsx`) uses `FinancierScreenShell` **without** a `PilotBanner`, unlike provider flows (`ProviderDashboard` wraps `PilotBanner`). **Web** financier Discover still gets the shell banner; **mobile** Discover is comparatively banner-light at the screen level. |
| **Provider Discover** | Mobile `ProviderDashboard` includes `PilotBanner` (`ProviderShared.tsx`). Web `provider/discover.tsx` relies on **portal shell** banner + immersive hero — acceptable if shell stays mandatory on web-only stakeholder sessions. |
| **Provider inventory / financier portfolio (demo fallbacks)** | `website/src/screens/stakeholders/provider/inventory.tsx` and `financier/portfolio.tsx` wrap content with explicit `<PilotBanner>...</PilotBanner>` copy — good alignment with “no silent pilot.” |
| **Resident Energy** | Web `resident/energy.tsx` uses `EnergyTodayChart`, whose head always includes `SyntheticBadge` in `website/src/portal/PortalWidgets.tsx` — synthetic labeling is present, though the badge does not currently distinguish API-fed `today` vs projection fallbacks. Mobile `ResidentEnergyScreen.tsx` passes `synthetic` into `ResidentInfoCard` and uses immersive copy such as `weatherHint="Pilot · synthetic curve"` on the hero — partial labeling scattered rather than one persistent banner (differs from web shell). |

### Synthetic chart semantics

- `EnergyTodayChart` renders **schematic** bar heights (sin-wave styled) while still printing numeric KPIs from blended API/project fields. That is honest about “not raw meter UI” **only if** users read the badge and chart footnotes; consider tightening IA-U6 criteria to **“badge + chart caption when geometry is illustrative.”**

### Recommended checklist updates (IA-U6)

- Require **either** top-of-screen `PilotBanner` **or** an equally prominent pilot strip on **mobile financier Discover** (and any other role shell that lacks provider-style banners).
- For `EnergyTodayChart`, add a criterion: **toggle or qualify `SyntheticBadge`** when `today` is non-null / trusted vs projected-only.
- Keep PD-3 (wallet/pledge banners) separate but cross-link: shell banner on web ≠ automatic coverage for immersive-only mobile routes.

---

## IA-U5 — Non-working controls

### Grep summary

- No matches for empty `onPress={() => {}}` in sampled stakeholder paths.
- No `TODO` / `FIXME` hits under `website/src/screens/stakeholders` or `mobile/app`.
- No `alert(` / `Alert.alert(` hits in the same stakeholder slices (spot check).

### Samples that still behave like “chrome without behavior”

These are **not** proven violations without UX testing, but they fit the spirit of IA-U5 reviews:

1. **Decorative filter rows** — `website/src/screens/stakeholders/provider/discover.tsx` includes a `.filter-bar` row (`Stage`, `Region`, …) implemented as **non-interactive spans**. Financier Discover uses a similar read-only “filter” strip (`financier/discover.tsx`). Users may perceive filters without affordances.
2. **Marketing “COMING SOON”** — `website/src/MarketingPage.tsx` contains a documented coming-soon region; ensure no stakeholder-safe portal depends on those blocks for operational claims.

### Recommended checklist updates (IA-U5)

- Promote from “grep spot-check” to a short **manual audit script**: per role, log controls that look actionable (filters, pills, secondary CTAs) and verify `onClick`/`onPress` + routing or intentional disabled state with `aria-disabled`.
- Add an explicit rule: **read-only “filters” must not use filter chip/button styling** unless disabled semantics are exposed.

---

## Audit command reference

```bash
npm run audit:shared
```

Expected stdout ends with: `Stakeholder section parity audit passed.`

---

## Related source pointers

- `packages/shared/src/stakeholderSections.ts` — `getWebSections`, `getMobileSections`, `auditStakeholderSectionParity`
- `website/src/App.tsx` — `screenLoaders`, `getWebSections`
- `mobile/components/RoleTabs.tsx` — `getMobileSections`, hidden routes
- `website/src/portal/PortalShell.tsx`, `website/src/portal/PortalWidgets.tsx` — `PilotBanner`, `SyntheticBadge`, `EnergyTodayChart`
