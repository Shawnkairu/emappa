# Build Backlog — IA_SPEC.md v3.0 vs Repo Reality

> Generated 2026-05-16 by walking [docs/IA_SPEC.md](IA_SPEC.md) top-to-bottom and grepping the repo for every named artifact. Each row: spec source → intended target → current state → action.

## Status legend
- **MISSING** — no implementation found
- **PARTIAL** — file/component exists but lacks fields/states/flows the spec requires
- **STALE** — exists but diverges from spec (wrong fields, wrong flow, wrong gate, wrong naming)
- **EXISTS** — matches spec (omitted from backlog unless context useful)

## Tally
- Total artifacts checked: 312
- MISSING: **205** (was 207 — 2 rows reclassified to EXISTS post-rename adoption: DRSProgressCard + TokenBalanceHero now exist at canonical paths)
- PARTIAL: 73
- STALE: **14** (was 18 — 4 resolved 2026-05-16 in P0 mechanical renames)
- EXISTS: **20** (was 14 — 4 from renames + 2 reclassified)

> **Granularity note.** MISSING.md currently aggregates ~227 IA_SPEC named artifacts into ~38 grouped rows for operational readability. BUILD_PLAN.md cuts the same backlog into ~390 task IDs (P0.0.1 ... P9.1.24) for assignment. The two are consistent but not 1:1; treat BUILD_PLAN task IDs as the unit of work assignment, and MISSING.md as the rollup tally for burndown reporting.

> **2026-05-16 update.** Four STALE rows landed as part of [BUILD_PLAN.md §P0.1](BUILD_PLAN.md#p01-structural-cleanup-stale-rows-from-missingmd-naming-structural-drift): `DrsCard → mobile/components/shared/DRSProgressCard.tsx` (P0.1.8), `TokenHero → mobile/components/shared/TokenBalanceHero.tsx` (P0.1.9, also renamed in `website/src/portal/PortalWidgets.tsx`), `(auth)/verify-phone.tsx → verify-otp.tsx` (P0.1.10, with 3 importers updated + RoleTabs admin hidden-tab cleanup), `(admin)/home.tsx` deleted (P0.1.4). **`installer/ → electrician/`** done **2026-05-17** (P0.1.5). `owner/ → building-owner/` remains P0.1.6.

---

## Resident (mobile + website)

### Routes & screens
| Spec | Target | Status | Notes |
|---|---|---|---|
| IA §Resident · Home (A0–A6 pre/live branch) | `mobile/app/(resident)/home.tsx` | PARTIAL | File exists; renders generic resident home. Missing 7-state `BuildingAvailabilityStatePill`, capacity queue pill, branched pre-live vs live hero, A5 mutex with buy-tokens. |
| IA §Resident · Energy (24h chart + share-gated generation) | `mobile/app/(resident)/energy.tsx` | PARTIAL | Exists; lacks `EnergyTodayChart` (stacked area), share-gated `GenerationPanel`, `SyntheticBadge`, `AllocationExplainer` modal. |
| IA §Resident · Wallet (3 segmented sections) | `mobile/app/(resident)/wallet.tsx` | PARTIAL | Exists; needs Pledges/Tokens/Ownership segmented control per §10, pre-activation edit/cancel gating per §5, ownership empty-state. |
| IA §Resident · Profile (account+building+load+settings) | `mobile/app/(resident)/profile.tsx` | PARTIAL | Exists; missing embedded Building & Unit Profile, Load Profile L1/L2/L3 editor, notification toggles. |
| IA §Resident · Web parity (home/energy/wallet/profile) | `website/src/screens/stakeholders/resident/{home,energy,wallet,profile}.tsx` | PARTIAL | All four files exist; same gaps as mobile counterparts (IA-U10 parity). |
| IA §Resident embedded · pledge-detail | `mobile/app/(resident)/_embedded/pledge-detail.tsx` | MISSING | No `_embedded` folder for resident. |
| IA §Resident embedded · queue-detail | `mobile/app/(resident)/_embedded/queue-detail.tsx` | MISSING | Required for §6.3 priority factors. |
| IA §Resident embedded · ats-detail | `mobile/app/(resident)/_embedded/ats-detail.tsx` | MISSING | 8-state ATS machine per §2.1. |
| IA §Resident embedded · marketplace | `mobile/app/(resident)/_embedded/marketplace.tsx` | MISSING | Ownership marketplace per §8.6. |
| IA §Resident embedded · load-profile-edit | `mobile/app/(resident)/_embedded/load-profile-edit.tsx` | MISSING | L2/L3 capture per §7. |
| IA §Resident embedded · drs-detail | `mobile/app/(resident)/_embedded/drs-detail.tsx` | MISSING | Building-level DRS view for resident. |
| IA §Resident embedded · token-purchase | `mobile/app/(resident)/_embedded/token-purchase.tsx` | MISSING | Post-activation real-money flow §5. |
| IA §Resident embedded · alert-detail | `mobile/app/(resident)/_embedded/alert-detail.tsx` | MISSING | Incident/fallback detail. |

### Components
| Component | Used by | Target file | Status |
|---|---|---|---|
| BuildingAvailabilityStatePill (A0–A6) | Resident Home, Cockpit DRS queue | `mobile/components/resident/BuildingAvailabilityStatePill.tsx` | MISSING |
| CapacityQueueStatusPill (7 states) | Resident Home, Cockpit | `mobile/components/resident/CapacityQueueStatusPill.tsx` | MISSING |
| PledgeBalanceCard | Resident Home/Wallet | `mobile/components/resident/PledgeBalanceCard.tsx` | MISSING |
| TokenBalanceHero (KES+kWh) | Resident Home (live), Homeowner Home (live) | `mobile/components/shared/TokenBalanceHero.tsx` | **EXISTS** (renamed 2026-05-16 P0.1.9) — needs adoption in role homes per P1/P2 |
| LoadProfileConfidenceMeter (L1/L2/L3) | Resident Home/Profile | `mobile/components/resident/LoadProfileConfidenceMeter.tsx` | MISSING |
| DRSProgressCard | Resident Home, BO Home | `mobile/components/shared/DRSProgressCard.tsx` | **EXISTS** (renamed 2026-05-16 P0.1.8) — needs adoption in role homes per P1/P2/P3 |
| SystemHealthIndicator | Multi-role live screens | `mobile/components/shared/SystemHealthIndicator.tsx` | MISSING |
| LiveSupplyIndicator (ATS, solar vs KPLC) | Resident/BO Home (live) | `mobile/components/shared/LiveSupplyIndicator.tsx` | MISSING |
| AllocationExplainer modal | Resident Energy | `mobile/components/resident/AllocationExplainer.tsx` | MISSING |
| PledgeHistoryList | Resident Wallet | `mobile/components/resident/PledgeHistoryList.tsx` | MISSING |
| OwnershipPositionCard | Resident/Homeowner/BO Wallet | `mobile/components/shared/OwnershipPositionCard.tsx` | MISSING |
| OwnershipMarketplaceCard (embedded) | Resident Wallet | `mobile/components/resident/OwnershipMarketplaceCard.tsx` | MISSING |

### Onboarding
| Step (Scenario A §4) | Target | Status |
|---|---|---|
| 1 Welcome | `mobile/app/(onboard)/welcome.tsx` | EXISTS |
| 2 Email/OTP | `mobile/app/(auth)/login.tsx` + `verify-otp.tsx` | EXISTS (renamed 2026-05-16 P0.1.10) |
| 3 Verify OTP | `(auth)/verify-otp.tsx` | EXISTS (renamed 2026-05-16 P0.1.10) |
| 4 Role select | `(auth)/role-select.tsx` | EXISTS |
| 5 Find building | `mobile/app/(onboard)/resident/index.tsx` | PARTIAL — needs unit number, owner invite code, manual address fallback per §4 |
| 6 Confirm building | `(onboard)/resident/confirm.tsx` | EXISTS |
| 7 Load profile L1 | not present | MISSING — no appliance checklist / daytime-evening split / receipt photo |
| 8 Capacity check | not present | MISSING — must surface queue position projection |
| 9 Pledge/buy decision | `(onboard)/resident/first-pledge.tsx` | PARTIAL — branching by activation state per §5 not verified |

### Backend endpoints required
| Endpoint | Target | Status |
|---|---|---|
| `POST /me/onboarding-complete` | `backend/app/api/me.py` | EXISTS |
| `POST /me/select-role` | `backend/app/api/me.py` | EXISTS |
| `POST /me/join-building` | `backend/app/api/me.py` | EXISTS |
| `POST /prepaid/commit` (pledge + token) | `backend/app/api/prepaid.py` | EXISTS — verify split between pledge (non-binding) and token (real money) per §5 |
| `GET /prepaid/{building}/balance` | `backend/app/api/prepaid.py` | EXISTS |
| `POST /residents/{id}/load-profile` (L1/L2/L3 capture) | MISSING | No endpoint for load profile capture/edit |
| `GET /residents/{id}/queue-position` | MISSING | No capacity-queue endpoint; queue/priority logic absent |
| `POST /residents/{id}/queue-request` | MISSING | Join capacity queue flow |
| `GET /residents/{id}/ats-state` | MISSING | 8-state ATS machine §2.1 not exposed |

---

## Homeowner (mobile + website)

### Routes & screens
| Spec | Target | Status | Notes |
|---|---|---|---|
| IA §Homeowner · Home (adaptive ProjectHero/TokenBalanceHero) | `mobile/app/(homeowner)/home.tsx` | PARTIAL | Exists; needs `project.stage`-driven hero swap + secondary card + action rail per §7.1 |
| IA §Homeowner · Energy | `mobile/app/(homeowner)/energy.tsx` | PARTIAL | Lacks always-on `GenerationPanel`, `OwnershipRingChart` (<100%), `SystemSizingExplainer`, `ConsumptionTimeline`, oversize/under-battery warnings §15 |
| IA §Homeowner · Wallet (3 streams) | `mobile/app/(homeowner)/wallet.tsx` | PARTIAL | Must enforce zero host-royalty for homeowner §3, §11.1 self-payment rule. Verify. |
| IA §Homeowner · Profile (property+roof+account) | `mobile/app/(homeowner)/profile.tsx` | PARTIAL | Needs roof-source/confidence badge, retrace CTA, DB/meter photo grid |
| Web parity | `website/src/screens/stakeholders/homeowner/{home,energy,wallet,profile}.tsx` | PARTIAL | All four exist; mirror gaps |
| Embedded · pledge-detail | `(homeowner)/_embedded/pledge-detail.tsx` | MISSING |
| Embedded · drs-detail | `(homeowner)/_embedded/drs.tsx` | EXISTS — verify Scenario C §8 coverage (property authority, site, load+sizing, capital, hardware, legal) |
| Embedded · lbrs-detail | `(homeowner)/_embedded/lbrs-detail.tsx` | MISSING — no LBRS embedded route for homeowner |
| Embedded · deployment-timeline | `(homeowner)/_embedded/deployment.tsx` | EXISTS |
| Embedded · terms-approval | `(homeowner)/_embedded/approve-terms.tsx` | EXISTS |
| Embedded · compare-bill | `(homeowner)/_embedded/compare-bill.tsx` (rename from `compare-today.tsx` per P2.2.6) | PARTIAL — needs rename + grid vs e.mappa projection logic |
| Embedded · roof-detail | `(homeowner)/_embedded/roof-detail.tsx` | EXISTS |
| Embedded · system-health | `(homeowner)/_embedded/system-health.tsx` | MISSING — live dashboard per §7.3 |
| Embedded · ownership-detail | `(homeowner)/_embedded/ownership-detail.tsx` | MISSING |
| Embedded · energy-detail (daily/weekly/monthly + CSV) | `(homeowner)/_embedded/energy-detail.tsx` | MISSING |
| Embedded · alert-detail | `(homeowner)/_embedded/alert-detail.tsx` | MISSING |
| Embedded · marketplace-buyback | `(homeowner)/_embedded/marketplace.tsx` (buyback variant) | PARTIAL — `marketplace.tsx` exists; buy-back per §15 unverified |

### Components
| Component | Target file | Status |
|---|---|---|
| ProjectHero (DRS+blockers+timeline) | `mobile/components/ProjectHero.tsx` | EXISTS — verify includes blocker pills + timeline phases |
| TokenBalanceHero (tokens+solar coverage) | `mobile/components/shared/TokenBalanceHero.tsx` (renamed P0.1.9) | EXISTS — verify "disabled pre-live" copy gate per §7.1 |
| DeploymentProgressBar | `mobile/components/shared/DeploymentProgressBar.tsx` | MISSING |
| BlockerPill | `mobile/components/shared/BlockerPill.tsx` | MISSING |
| OwnershipRingChart (share-split) | `mobile/components/shared/OwnershipRingChart.tsx` | MISSING |
| SystemSizingExplainer modal | `mobile/components/homeowner/SystemSizingExplainer.tsx` | MISSING |
| ConsumptionTimeline | `mobile/components/homeowner/ConsumptionTimeline.tsx` | MISSING |
| CashflowLedger | `mobile/components/shared/CashflowLedger.tsx` | MISSING |

### Onboarding (Scenario C §6)
| Step | Target | Status |
|---|---|---|
| 1 Welcome | `(onboard)/welcome.tsx` | EXISTS (shared) |
| 2 Email/OTP + 3 Verify | shared with resident | PARTIAL |
| 4 Property location (single-family/maisonette/etc.) | `(onboard)/homeowner/address.tsx` | PARTIAL — verify property-type picker covers Scenario C §6 list |
| 5 Authority verification (title/lease/ID/consent) | MISSING — no `authority.tsx` step | MISSING |
| 6 Utility & meter context (KPLC type, meter#, DB photos) | MISSING | MISSING |
| 7 Fast load profile L1 (KES, appliances, daytime/evening) | `(onboard)/homeowner/first-pledge.tsx` | PARTIAL — file is "first-pledge"; spec is load profile |
| 8 Site preview (roof photos, shading, WiFi, access) | MISSING | MISSING |
| 9 Readiness summary | MISSING | MISSING |
| 10 Deployment decision (initiate DRS toggle) | MISSING | MISSING — currently no explicit "Initiate project" gate |
| Roof capture (3-tier waterfall) | `(onboard)/homeowner/roof-capture.tsx` | PARTIAL — verify Microsoft footprint / owner-traced / manual sqm fallback chain |
| Terms preview | `(onboard)/homeowner/terms.tsx` | EXISTS |
| Web parity | `website/src/onboard/homeowner/*` | PARTIAL — same gaps as mobile |

### Backend endpoints required
| Endpoint | Target | Status |
|---|---|---|
| `POST /buildings` (single_family kind) | `backend/app/api/buildings.py` | EXISTS — kind constraint enforced in model |
| `GET /buildings/{id}/roof/suggest` | `backend/app/api/buildings.py` | EXISTS |
| `POST /buildings/{id}/roof` (owner-traced/typed) | `backend/app/api/buildings.py` | EXISTS |
| `POST /homeowner/{id}/authority-docs` (title/lease upload) | MISSING |
| `POST /homeowner/{id}/utility-context` (KPLC meter/photos) | MISSING |
| `POST /homeowner/{id}/site-preview` (photos, access notes) | MISSING |
| `POST /homeowner/{id}/initiate-project` (DRS start) | MISSING |
| `GET /homeowner/{id}/lbrs` (LBRS view per §10) | MISSING |

---

## Building Owner (mobile + website)

### Routes & screens
| Spec | Target | Status | Notes |
|---|---|---|---|
| IA §Building Owner · Home | `mobile/app/(building-owner)/home.tsx` | PARTIAL | Needs `no-building yet` empty + pre-live (DRS card, demand summary, capacity estimate, host royalty education) + live (system health, animated building diagram, royalty earned) |
| IA §Building Owner · Energy | `mobile/app/(building-owner)/energy.tsx` | PARTIAL | Needs share-gated GenerationPanel; "you own the rooftop not the panels" empty copy |
| IA §Building Owner · Wallet | `mobile/app/(building-owner)/wallet.tsx` | PARTIAL | Pre-live education vs live host-royalty separation per §5 not verified; ownership separation per §6 |
| IA §Building Owner · Profile | `mobile/app/(building-owner)/profile.tsx` | PARTIAL | Building docs upload, payout account, KYC verification missing |
| Web parity | `website/src/screens/stakeholders/building-owner/*` | PARTIAL — all four screens exist; gaps mirror mobile |
| Embedded · drs-detail (6 components) | `(building-owner)/_embedded/drs.tsx` | PARTIAL — verify 6 components per §3 + history chart |
| Embedded · bill-comparison | `(building-owner)/_embedded/compare-bill.tsx` (rename from `compare-today.tsx` per P3.2.2) | PARTIAL — needs rename + grid vs e.mappa projection logic |
| Embedded · resident-roster | `(building-owner)/_embedded/resident-roster.tsx` | EXISTS |
| Embedded · terms-approval | `(building-owner)/_embedded/approve-terms.tsx` | EXISTS |
| Embedded · roof-detail | `(building-owner)/_embedded/roof-detail.tsx` | MISSING |
| Embedded · deployment-timeline | `(building-owner)/_embedded/deployment.tsx` | EXISTS |
| Embedded · settlement-detail | `(building-owner)/_embedded/settlement-detail.tsx` | MISSING |
| Embedded · asset-detail | `(building-owner)/_embedded/asset-detail.tsx` | MISSING |
| Embedded · energy-detail | `(building-owner)/_embedded/energy-detail.tsx` | MISSING |
| Embedded · incident-detail | `(building-owner)/_embedded/incident-detail.tsx` | MISSING |

### Components
| Component | Target | Status |
|---|---|---|
| HostRoyaltyCard (pre-live edu / live earned) | `mobile/components/building-owner/HostRoyaltyCard.tsx` | MISSING |
| OwnershipCard | `mobile/components/OwnershipCard.tsx` | EXISTS |
| EnergyTodayCard (live KPI strip) | `mobile/components/building-owner/EnergyTodayCard.tsx` | MISSING |
| AnimatedBuildingDiagram (roof→inverter→batt→ATS→apts) | `mobile/components/building-owner/AnimatedBuildingDiagram.tsx` | MISSING |

### Onboarding (Scenario B §3)
| Step | Target | Status |
|---|---|---|
| 1–4 Welcome/Email/OTP/Role/Building location | `(onboard)/building-owner/index.tsx` | PARTIAL — verify auto-geocode + occupancy estimate |
| 5 Ownership/authority verification | MISSING — no doc upload step |
| 6 Initial building profile (apts, roof access, DB location) | PARTIAL — likely in index.tsx |
| 7 Roof capture (3-tier waterfall) | `(onboard)/building-owner/roof.tsx` | PARTIAL — verify Microsoft footprint suggest → traced → manual sqm |
| 8 Terms preview | `(onboard)/building-owner/terms.tsx` | EXISTS |
| Web parity | `website/src/onboard/building-owner/BuildingOwnerWebOnboarding.tsx` | PARTIAL — single file; spec wants per-step screens |

### Backend endpoints required
| Endpoint | Target | Status |
|---|---|---|
| `POST /buildings` | EXISTS |
| `POST /building-owner/{id}/authority-docs` | MISSING |
| `POST /building-owner/{id}/payout-account` | MISSING |
| `GET /building-owner/{id}/host-royalty` | MISSING — host royalty pool computation absent |
| `GET /settlement/{building}/owner-statement` | MISSING — owner-specific settlement view |

---

## Provider (mobile + website)

### Routes & screens
| Spec | Target | Status | Notes |
|---|---|---|---|
| IA §Provider · Discover | `mobile/app/(provider)/discover.tsx` | PARTIAL | High-fidelity Airbnb card (BOM gap, inventory match %, projected income range) not verified |
| IA §Provider · Projects | `mobile/app/(provider)/projects.tsx` | PARTIAL | Grouping by stage + per-stage status card per §13; presence of action buttons unverified |
| IA §Provider · Generation (share-gated) | `mobile/app/(provider)/generation.tsx` | PARTIAL | Must show retained-claim language §15.1; never "generation decreases" |
| IA §Provider · Wallet | `mobile/app/(provider)/wallet.tsx` | PARTIAL | 7-section wallet (cash sales / usage-linked / buy-downs / predicted / pipeline / disputes / scaling) unverified |
| IA §Provider · Profile | `mobile/app/(provider)/profile.tsx` | PARTIAL | Inventory catalog, quote templates, warranties, ratings per §13 |
| Web parity | `website/src/screens/stakeholders/provider/*` | PARTIAL |
| Embedded · project-detail | `(provider)/project-detail.tsx` | MISSING |
| Embedded · quote-builder | `(provider)/quote-builder.tsx` | MISSING |
| Embedded · quote-request-detail | `(provider)/quote-request-detail.tsx` | MISSING |
| Embedded · delivery-tracker | `(provider)/delivery-tracker.tsx` | MISSING |
| Embedded · warranty-ticket | `(provider)/warranty-ticket.tsx` | MISSING |
| Embedded · settlement-detail | `(provider)/settlement-detail.tsx` | MISSING |
| Embedded · buydown-detail | `(provider)/buydown-detail.tsx` | MISSING |
| Embedded · asset-detail | `(provider)/asset-detail.tsx` | MISSING |
| Embedded · inventory-add | `(provider)/inventory.tsx` | PARTIAL |

### Components
| Component | Target | Status |
|---|---|---|
| ProjectCard (Airbnb-style) | `mobile/components/ProjectCard.tsx` | EXISTS — verify fields per spec |
| FilterBar (stage/region/equipment/deal-size/business-type) | `mobile/components/shared/FilterBar.tsx` | MISSING |
| ProjectStatusCard | `mobile/components/shared/ProjectStatusCard.tsx` | MISSING |
| ProjectTimeline | `mobile/components/shared/ProjectTimeline.tsx` | MISSING |
| DeliveryTracker | `mobile/components/provider/DeliveryTracker.tsx` | MISSING |
| BOMMatchCard | `mobile/components/provider/BOMMatchCard.tsx` | MISSING |
| GenerationChart | `mobile/components/shared/GenerationChart.tsx` | MISSING |
| OwnershipBreakdown (ring) | `mobile/components/shared/OwnershipBreakdown.tsx` | MISSING |
| RetainedClaimCard | `mobile/components/provider/RetainedClaimCard.tsx` | MISSING |
| PerformanceMetrics | `mobile/components/provider/PerformanceMetrics.tsx` | MISSING |
| CashSalesLedger | `mobile/components/provider/CashSalesLedger.tsx` | MISSING |
| UsageLedgerBreakdown | `mobile/components/provider/UsageLedgerBreakdown.tsx` | MISSING |
| ShareBuydownTracker | `mobile/components/provider/ShareBuydownTracker.tsx` | MISSING |
| PredictedIncomeScenarios | `mobile/components/provider/PredictedIncomeScenarios.tsx` | MISSING |
| QuoteBuilder | `mobile/components/provider/QuoteBuilder.tsx` | MISSING |
| InventoryCatalog | `mobile/components/provider/InventoryCatalog.tsx` | MISSING |
| RatingsSummary | `mobile/components/shared/RatingsSummary.tsx` | MISSING |

### Onboarding (Scenario E §5)
| Step | Target | Status |
|---|---|---|
| 1–4 Welcome/Email/OTP/Role fork (panels/infra/both) | `(onboard)/provider/index.tsx` | PARTIAL — verify `businessType` fork copy |
| 5 Business verification path | MISSING |
| 6 Individual verification path | MISSING |
| 7 Inventory snapshot | `(onboard)/provider/inventory.tsx` | EXISTS |
| 8 Compatibility pre-check | MISSING |
| 9 Inventory earning model scenarios | MISSING |
| 10 Training/standards module | MISSING |
| 11 Verification decision (8 outcomes per §5) | MISSING — no decision state machine |

### Backend endpoints required
| Endpoint | Target | Status |
|---|---|---|
| `GET /providers/{id}/inventory` | EXISTS |
| `POST /providers/{id}/inventory` | EXISTS |
| `GET /providers/{id}/orders` | EXISTS |
| `GET /providers/{id}/quote-requests` | EXISTS |
| `POST /providers/{id}/quote` (submit quote) | MISSING |
| `POST /providers/{id}/verification` (8-decision flow) | MISSING |
| `POST /providers/{id}/eaas-offer` | MISSING |
| `POST /providers/{id}/buydown-offer` | MISSING |
| `POST /providers/{id}/warranty-ticket` | MISSING |
| `GET /providers/{id}/settlement` | MISSING |

---

## Electrician (mobile + website)

### Routes & screens
| Spec | Target | Status | Notes |
|---|---|---|---|
| IA §Electrician · Discover | `mobile/app/(electrician)/discover.tsx` | PARTIAL | Job-style card needs scope/crew/urgency fields per §9 |
| IA §Electrician · Projects (task board) | `mobile/app/(electrician)/projects.tsx` | PARTIAL | Naming: registry id `jobs` vs route basename `projects` (IA-U10); task board fidelity still partial |
| IA §Electrician · Wallet (8 sections) | `mobile/app/(electrician)/wallet.tsx` | PARTIAL | DRS payout, milestone payouts, LBRS payout, labor-as-capital, household requests, maintenance reserve, disputes, history — most missing |
| IA §Electrician · Profile | `mobile/app/(electrician)/profile.tsx` | PARTIAL | Tier, crew depth, ratings, full §4 onboarding still partial; compliance block embedded (P0.1.2) |
| Web parity | `website/src/screens/stakeholders/electrician/*` | PARTIAL |
| ~~`jobs-inbox.tsx` route~~ | extra | **DONE** — consolidated per P0.1.1 |
| ~~`compliance.tsx` tab~~ | extra | **DONE P0.1.2** — inlined in Profile; route removed |
| Embedded · project-detail | MISSING |
| Embedded · task-detail | MISSING |
| Embedded · test-detail (LBRS) | MISSING |
| Embedded · evidence-upload (camera-first) | MISSING |
| Embedded · signoff-request | MISSING |
| Embedded · signoff-refuse | MISSING |
| Embedded · household-request-detail | MISSING |
| Embedded · milestone-detail | MISSING |
| Embedded · claim-detail (labor-as-capital) | MISSING |

### Components
| Component | Target | Status |
|---|---|---|
| TaskBoard (DRS/installation/LBRS) | `mobile/components/electrician/TaskBoard.tsx` | MISSING |
| SignoffGrid (5 signoff types) | `mobile/components/electrician/SignoffGrid.tsx` | MISSING |
| EvidenceGallery | `mobile/components/electrician/EvidenceGallery.tsx` | MISSING |
| CameraCapture (offline + serial scan) | `mobile/components/electrician/CameraCapture.tsx` | MISSING |
| MilestonePayoutCard | `mobile/components/electrician/MilestonePayoutCard.tsx` | MISSING |
| LaborCapitalClaimCard | `mobile/components/shared/LaborCapitalClaimCard.tsx` | MISSING |
| HouseholdRequestCard | `mobile/components/electrician/HouseholdRequestCard.tsx` | MISSING |
| CertificationCard | `mobile/components/electrician/CertificationCard.tsx` | MISSING |
| CrewCard | `mobile/components/electrician/CrewCard.tsx` | MISSING |
| DocumentUploadCard | `mobile/components/shared/DocumentUploadCard.tsx` | MISSING |

### Onboarding (Scenario D §4)
| Step | Target | Status |
|---|---|---|
| 1–4 Welcome/Email/OTP/Role | `(onboard)/electrician/index.tsx` | PARTIAL |
| 5 Identity (ID/liveness/emergency) | MISSING |
| 6 Experience profile (history/photos/tags) | MISSING |
| 7 Credentials/documents | MISSING |
| 8 Background & references | MISSING |
| 9 e.mappa Certification Training (8 modules) | `(onboard)/electrician/cert.tsx` | PARTIAL — likely a stub; 8 modules not enumerated |
| 10 Practice test (7 scenarios, 80%/100% safety) | MISSING |
| 11 Certification decision (8 outcomes) | MISSING |

### Backend endpoints required
| Endpoint | Target | Status |
|---|---|---|
| `GET /electricians/{id}/jobs` | EXISTS |
| `GET /electricians/{id}/certifications` | EXISTS |
| `POST /electricians/{id}/certifications` | EXISTS |
| `POST /electricians/{id}/training-progress` | MISSING |
| `POST /electricians/{id}/practice-test` (auto-grade) | MISSING |
| `POST /electricians/{id}/task-signoff` | MISSING |
| `POST /electricians/{id}/lbrs-test` (per-test pass/fail+evidence) | MISSING |
| `POST /electricians/{id}/evidence` (photo+meta) | MISSING |
| `POST /electricians/{id}/household-request` | MISSING |
| `POST /electricians/{id}/labor-as-capital-claim` | MISSING |
| `GET /electricians/{id}/wallet` | EXISTS — verify it returns all 8 wallet sections |

---

## Financier (mobile + website)

### Routes & screens
| Spec | Target | Status | Notes |
|---|---|---|---|
| IA §Financier · Discover | `mobile/app/(financier)/discover.tsx` | PARTIAL | Deal-oriented card (capital raised/gap, instrument, eligibility) per §7 — many fields likely missing |
| IA §Financier · Project Status (route `portfolio`) | `mobile/app/(financier)/portfolio.tsx` | PARTIAL | 10-state grouping (Watchlisted→Exited) per §12 unverified |
| IA §Financier · Energy Generation | `mobile/app/(financier)/generation.tsx` | PARTIAL | E_gen/E_sold/E_grid/E_waste/utilization, data-quality badge, claim card |
| IA §Financier · Wallet (10 sections) | `mobile/app/(financier)/wallet.tsx` | PARTIAL | Available/Pending/Escrowed/Deployed/Cashflow/Projected/Payback/Fees/Risk/Statements — most sections missing |
| IA §Financier · Profile | `mobile/app/(financier)/profile.tsx` | PARTIAL | KYC/KYB, eligibility tier, jurisdiction, risk profile, compliance, payout, tax |
| Web parity | `website/src/screens/stakeholders/financier/*` | PARTIAL |
| `tranche-release.tsx` route | extra | STALE — not in spec; likely belongs inside portfolio detail |
| Embedded · project-detail (deal room) | MISSING |
| Embedded · drs-detail | MISSING |
| Embedded · lbrs-detail | MISSING |
| Embedded · statement-detail | MISSING |
| Embedded · claim-detail | MISSING |
| Embedded · payback-scenarios | MISSING |
| Embedded · buyout-flow | MISSING |
| Embedded · incident-detail | MISSING |
| Embedded · dispute-flow | MISSING |

### Components
| Component | Target | Status |
|---|---|---|
| EligibilityBadge | `mobile/components/financier/EligibilityBadge.tsx` | MISSING |
| EscrowStatusCard | `mobile/components/financier/EscrowStatusCard.tsx` | MISSING |
| ReleaseSchedule | `mobile/components/financier/ReleaseSchedule.tsx` | MISSING |
| EnergyFlowChart | `mobile/components/shared/EnergyFlowChart.tsx` | MISSING |
| UtilizationTrend | `mobile/components/financier/UtilizationTrend.tsx` | MISSING |
| DataQualityBadge (verified/estimated/missing/disputed/conservative) | `mobile/components/shared/DataQualityBadge.tsx` | MISSING |
| ClaimPerformanceCard | `mobile/components/financier/ClaimPerformanceCard.tsx` | MISSING |
| BalanceSummary | `mobile/components/financier/BalanceSummary.tsx` | MISSING |
| CashflowTimeline | `mobile/components/financier/CashflowTimeline.tsx` | MISSING |
| PaybackTracker | `mobile/components/financier/PaybackTracker.tsx` | MISSING (PaybackCard exists — verify rename/fields) |
| ProjectionScenarios | `mobile/components/financier/ProjectionScenarios.tsx` | MISSING |
| RiskAlertList | `mobile/components/financier/RiskAlertList.tsx` | MISSING |
| SettlementStatement | `mobile/components/shared/SettlementStatement.tsx` | MISSING |
| IdentityCard | `mobile/components/financier/IdentityCard.tsx` | PARTIAL — referenced once |
| KYCStatusBadge | `mobile/components/shared/KYCStatusBadge.tsx` | MISSING |
| RiskProfileSummary | `mobile/components/financier/RiskProfileSummary.tsx` | MISSING |
| EligibilityTierBadge | `mobile/components/financier/EligibilityTierBadge.tsx` | MISSING |
| PayoutAccountCard | `mobile/components/shared/PayoutAccountCard.tsx` | MISSING |
| ComplianceStatusIndicator | `mobile/components/shared/ComplianceStatusIndicator.tsx` | MISSING |

### Onboarding (Scenario F §5)
| Step | Target | Status |
|---|---|---|
| 1–4 Welcome/Email/OTP/Role | `(onboard)/financier/index.tsx` | PARTIAL — single file; spec wants 15 steps |
| 5 Account type (7 options) | MISSING |
| 6 Identity verification (individual + entity paths) | MISSING |
| 7 Investor eligibility classification | MISSING |
| 8 Risk profile & suitability | MISSING |
| 9 Regulatory disclosures (acceptance gate) | MISSING |
| 10 Jurisdiction gating | MISSING |
| 11 Payment rail setup | MISSING |
| 12 Investment limits | MISSING |
| 13 Education module | MISSING |
| 14 Access decision (8 outcomes) | MISSING |

### Backend endpoints required
| Endpoint | Target | Status |
|---|---|---|
| `GET /financiers/{id}/portfolio` | EXISTS |
| `POST /financiers/{id}/pledge-capital` | EXISTS |
| `POST /financiers/{id}/kyc-submit` | MISSING |
| `POST /financiers/{id}/eligibility-questionnaire` | MISSING |
| `POST /financiers/{id}/risk-profile` | MISSING |
| `GET /financiers/{id}/eligible-offerings` (jurisdiction-filtered) | MISSING |
| `POST /financiers/{id}/escrow` | MISSING |
| `POST /financiers/{id}/buyout` | MISSING |
| `POST /financiers/{id}/withdraw` (pre-DRS refund) | MISSING |
| `GET /financiers/{id}/payback` | MISSING |
| `GET /financiers/{id}/statements` | MISSING |

---

## Admin Mobile (read-only triage)

### Routes & screens
| Spec | Target | Status | Notes |
|---|---|---|---|
| IA §Admin · Alerts (read-only) | `mobile/app/(admin)/alerts.tsx` | PARTIAL | Exists; severity grouping, owner-on-call, "Open in Cockpit" deep-link unverified |
| IA §Admin · Projects (read-only) | `mobile/app/(admin)/projects.tsx` | PARTIAL | Phase grouping per spec; verify read-only enforcement |
| IA §Admin · Profile | `mobile/app/(admin)/profile.tsx` | PARTIAL | JWT scope summary missing |
| ~~Extra route: `(admin)/home.tsx`~~ | **DONE 2026-05-16** (P0.1.4) — deleted; admin now has exactly 3 tabs (Alerts/Projects/Profile) |
| AlertRow | `mobile/components/admin/AlertRow.tsx` | MISSING |
| AlertDetailReadOnly | `mobile/components/admin/AlertDetailReadOnly.tsx` | MISSING |
| ProjectRowAdmin | `mobile/components/admin/ProjectRowAdmin.tsx` | MISSING |
| ProjectDetailReadOnly | `mobile/components/admin/ProjectDetailReadOnly.tsx` | MISSING |

---

## Cockpit (web)

> Cockpit currently has only `App.tsx`, `BuildingDetail.tsx`, `StressTest.jsx`, two small components. **No `pages/` directory beyond BuildingDetail.tsx; no operational dashboards, no ops queues, no AI-native surfaces, no RBAC console, no audit viewer.** Effectively the entire Cockpit spec (§Universal Rules, §4 operational dashboards, §7 ops queues, §5 AI-native surfaces) is MISSING.

### Operational dashboards
| Surface | Target | Status |
|---|---|---|
| Cockpit · Command (default landing) | `cockpit/src/pages/Command.tsx` | MISSING |
| Cockpit · Stress Test | `cockpit/src/stress-test/StressTest.jsx` | EXISTS — needs spec alignment with AI-native §6 + "Promote to production proposal" |
| Cockpit · Settlement Monitor | `cockpit/src/pages/SettlementMonitor.tsx` | MISSING |
| Cockpit · Alerts | `cockpit/src/pages/Alerts.tsx` | MISSING — `App.tsx` references "Alerts" copy but no dedicated route |

### Dashboard components
| Component | Target | Status |
|---|---|---|
| CommandKPITile | `cockpit/src/components/CommandKPITile.tsx` | MISSING |
| AlertsPanel | `cockpit/src/components/AlertsPanel.tsx` | MISSING |
| QueueBacklogPanel | `cockpit/src/components/QueueBacklogPanel.tsx` | MISSING |
| SettlementSummaryStrip | `cockpit/src/components/SettlementSummaryStrip.tsx` | MISSING |
| AgentActivityRibbon | `cockpit/src/components/AgentActivityRibbon.tsx` | MISSING |
| WaterfallView | `cockpit/src/components/WaterfallView.tsx` | MISSING |
| SolvencyInvariantStrip | `cockpit/src/components/SolvencyInvariantStrip.tsx` | MISSING |
| SettlementProjectPicker | `cockpit/src/components/SettlementProjectPicker.tsx` | MISSING |
| AlertsTable | `cockpit/src/components/AlertsTable.tsx` | MISSING |
| AlertDetailDrawer | `cockpit/src/components/AlertDetailDrawer.tsx` | MISSING |
| RemediationStatusPill | `cockpit/src/components/RemediationStatusPill.tsx` | MISSING |

### Ops decision queues (all 7 MISSING)
| Queue | Target | Components | Status |
|---|---|---|---|
| DRS Queue | `cockpit/src/pages/DRSQueue.tsx` | DRSQueueTable, DRSGateCard, DRSBlockerList | MISSING |
| LBRS Queue | `cockpit/src/pages/LBRSQueue.tsx` | LBRSQueueTable, LBRSTestRow, ATSApartmentGrid, SettlementDryRunPanel | MISSING |
| Provider Verification Queue | `cockpit/src/pages/ProviderVerification.tsx` | ProviderVerificationTable, ProviderVerificationDecisionForm, DocumentReviewerPane | MISSING |
| Electrician Certification Queue | `cockpit/src/pages/ElectricianCertification.tsx` | ElectricianCertificationTable, CertificationTierAssignmentForm, TrainingModuleScoreGrid | MISSING |
| Financier Eligibility Queue | `cockpit/src/pages/FinancierEligibility.tsx` | FinancierEligibilityTable, EligibilityDecisionForm, JurisdictionGateBadge, InvestorLimitsEditor | MISSING |
| Authority/Identity Doc Review Queue | `cockpit/src/pages/DocReview.tsx` | DocReviewQueueTable, DocumentViewer, AuthorityDecisionForm | MISSING |
| Counterparties Directory | `cockpit/src/pages/Counterparties.tsx` | CounterpartiesTabs, CounterpartyProfileDrawer | MISSING |

### Per-building drill-down (BuildingDetail.tsx tabs)
| Tab | Components | Status |
|---|---|---|
| Overview | BuildingOverviewHero, OpsEventsFeed | MISSING tab impl + components |
| Energy | EnergyTimeline, ApartmentHeatmap, TelemetryStrip | MISSING |
| Pledges | PledgeLedger, CapacityQueueGrid | MISSING |
| DRS | DRSComponentGrid, DRSScoreSparkline | MISSING |
| LBRS | LBRSTestGrid, ATSTestMatrix, EvidenceCarousel | MISSING |
| Ops | WorkOrderList, IncidentLog, MaintenanceReserveCard | MISSING |
| Settlement | WaterfallView, PayoutRegister, ConservativeSettleLog | MISSING |
| Roof | RoofPolygonViewer, ArrayLayoutOverlay, RoofEvidencePhotos | MISSING |
| Stakeholders (optional) | (links to Counterparties) | MISSING |
| Note: `cockpit/src/pages/BuildingDetail.tsx` exists as monolithic file — needs split into 8+1 tab structure |

### AI-native cockpit surfaces (all MISSING)
| Surface | Target | Components | Status |
|---|---|---|---|
| Query Layer UI | `cockpit/src/pages/QueryLayer.tsx` | QueryInput, AnswerWithCitations, ToolCallTrace | MISSING |
| Agent Panels (5 agents) | `cockpit/src/pages/agents/*.tsx` | AgentPanelHeader, AgentActionQueue, AgentActionDecisionForm, AgentHealthCard | MISSING — only `backend/app/agents/drs_agent.py` exists; no UI |
| Audit Log Viewer | `cockpit/src/pages/AuditLog.tsx` | AuditTable, AuditDiffDrawer | MISSING — audit model exists at `backend/app/models/audit.py` but no UI |
| Eval Harness UI | `cockpit/src/pages/EvalHarness.tsx` | AgentEvalPicker, EvalScorecardGrid, EvalRegressionChart | MISSING |
| Permission/RBAC Console | `cockpit/src/pages/RBAC.tsx` | RBACUserTable, RBACAgentTable, PermissionGrantForm, EffectivePermissionInspector | MISSING |

### Universal Cockpit Rules enforcement
| Rule | Enforcement target | Status |
|---|---|---|
| CR-1 admin role isolation | `cockpit/src/App.tsx` guard | PARTIAL — gates by `user.role === 'admin'` for project fetch; no hard reject at App boundary |
| CR-2 every mutation audited (reason required) | backend audit table + middleware + UI primitive | PARTIAL — `models/audit.py` + `repos/audit.py` exist; no enforcement middleware; no UI primitive |
| CR-3 PII masking + view claim | UI primitive + JWT scope | MISSING |
| CR-4 agent-action attribution | UI panel + audit linkage | MISSING |
| CR-5 conservative-by-default banner | UI primitive + service flag | PARTIAL — `services/consistency.py` exists; no UI banner |
| CR-6 critical-gate override discipline | DRS/LBRS form constraints | MISSING — no UI; DRS service exists but no override workflow |
| CR-7 RBAC-scoped queues | queue filter middleware | MISSING |
| CR-8 no silent fallback (loading/empty/error states) | every surface | PARTIAL — many surfaces silently fallback to mock |
| CR-9 deep-linkable everywhere | React Router setup | MISSING — App.tsx uses local view state, not routes |

### Admin role visibility (§8.5 five gates)
| Gate | Target | Status |
|---|---|---|
| 1 Role-select UI lists 6 public roles only | `(auth)/role-select.tsx` + `website/src/screens/PublicSite.tsx` | EXISTS — verify "admin" absent |
| 2 Backend rejects `role='admin'` on `/me/*` | `backend/app/api/me.py` | EXISTS — confirmed via grep |
| 3 Seed allowlist `EMAPPA_ADMIN_EMAILS` | `backend/scripts/seed.py`, `grant_admin.py` | EXISTS |
| 4 JWT scope `require_admin` | `backend/app/middleware/jwt.py` | EXISTS |
| 5 Cockpit App-level guard | `cockpit/src/App.tsx` | PARTIAL — gates data fetch on `role === 'admin'`; no hard render-reject if non-admin holds a session |

---

## Cross-Cutting

### Shared components catalog (§Components Catalog, 30 entries)
Most already enumerated above. Remaining cross-role universals:

| Component | Used by | Target | Status |
|---|---|---|---|
| PilotBanner | All home screens | `mobile/components/PilotBanner.tsx` | EXISTS |
| SyntheticBadge | Energy screens pre-live | `mobile/components/SyntheticBadge.tsx` | EXISTS |
| RoofMap | Onboarding + embedded | `mobile/components/RoofMap.tsx` | EXISTS — verify polygon-over-satellite per Scenario B/C §6 |
| PortfolioRow (Robinhood-style) | Wallet screens | `mobile/components/PortfolioRow.tsx` | EXISTS |
| ProjectCard (Airbnb-style) | Discover screens | `mobile/components/ProjectCard.tsx` | EXISTS — verify role-variant props for provider/electrician/financier |
| ProjectHero | Homeowner/BO Home | `mobile/components/ProjectHero.tsx` | EXISTS |
| EnergyTodayChart | Resident/Homeowner/BO Energy | `mobile/components/EnergyTodayChart.tsx` | EXISTS |
| OwnershipCard | Wallet screens | `mobile/components/OwnershipCard.tsx` | EXISTS |
| MetricCard | utility | `mobile/components/MetricCard.tsx` | EXISTS |
| DRSProgressCard | Project hero | `mobile/components/shared/DRSProgressCard.tsx` (renamed P0.1.8) | EXISTS — adopt in role homes per P1.1.1/P2.1.1/P3.1.1 |

### Backend API endpoints — gap roll-up
| Domain | MISSING endpoints |
|---|---|
| Resident | load-profile capture, queue position, queue-request, ats-state |
| Homeowner | authority-docs, utility-context, site-preview, initiate-project, LBRS view |
| Building Owner | authority-docs, payout-account, host-royalty, owner settlement statement |
| Provider | submit-quote, verification 8-decision, EaaS offer, buy-down offer, warranty-ticket, settlement |
| Electrician | training-progress, practice-test, task-signoff, lbrs-test, evidence, household-request, labor-as-capital |
| Financier | kyc-submit, eligibility-questionnaire, risk-profile, eligible-offerings (jurisdiction-filtered), escrow, buyout, withdraw, payback, statements |
| Admin/Cockpit | alerts, incidents, queue endpoints (DRS/LBRS/provider/electrician/financier/doc/counterparties), audit-log query, rbac, agent-action queue, eval, stress promote, settlement hold |

### Database tables (per imported-specs data models)
| Table | Source | Status |
|---|---|---|
| `audit_log` (actor, action, before, after, reason, agent_attribution) | AI-native §4, CR-2 | PARTIAL — `models/audit.py` exists; verify all required columns |
| `building` (kind, roof_polygon, roof_source, roof_confidence) | Scenarios B/C | EXISTS |
| `apartment_ats_state` (8 states) | Scenario A §2.1 | MISSING |
| `capacity_queue` (interested→activated) | Scenario A §6.2 | MISSING |
| `load_profile` (L1/L2/L3 + confidence + appliances) | Scenario A §7 | MISSING |
| `pledge` (non-binding pre-activation) | Scenario A §5 | PARTIAL — prepaid commit conflates pledge+purchase |
| `token_purchase` (real money post-activation) | Scenario A §5 | PARTIAL |
| `host_royalty_payout` | Scenario B §5/§6 | MISSING |
| `homeowner_authority` (title/lease/ID + status) | Scenario C §6 | MISSING |
| `provider_verification` (8-decision) | Scenario E §5 + §11 SupplierBusinessVerification | MISSING |
| `provider_inventory_sku` (catalog) | Scenario E §13 | EXISTS — `models/inventory.py` |
| `provider_quote` (line-item, validity, VAT, deposit) | Scenario E §11 | MISSING |
| `eaas_contract` (lease/EaaS terms) | Scenario E §16 | MISSING |
| `share_buydown` (asset, %, proceeds) | Scenario E §15.1 | MISSING |
| `electrician_profile` (tier, crew, ratings) | Scenario D §11 | PARTIAL — `models/certification.py` exists |
| `training_progress` (module scores) | Scenario D §6 | MISSING |
| `lbrs_test_result` (per-test pass/fail, evidence, signoff) | Installation §8 + Scenario D §18 | PARTIAL — `services/lbrs.py` exists; persistence schema unverified |
| `signoff` (task/workstream/safety/crew/ops) | Scenario D §19 | MISSING |
| `labor_as_capital_claim` (KES→pool %) | Scenario D §22.1 | MISSING |
| `household_request` (electrician household work) | Scenario D §21 | MISSING |
| `financier_profile` (KYC/KYB, tier, jurisdiction, limits) | Scenario F §27 | PARTIAL — `models/financier.py` exists; verify fields |
| `eligibility_evidence` | Scenario F §5 | MISSING |
| `escrow` (held funds, release conditions) | Scenario F §9 | MISSING |
| `buyout_offer` (claim, price, terms) | Scenario F §19 | MISSING |
| `alert` / `incident` (severity, owner, status, source) | AI-native §6 | MISSING |
| `rbac_claim` / `admin_allowlist` | IA v2 §8.5 | PARTIAL — env var only; no DB-side claim model |
| `agent_action` (proposed, accepted/rejected, audit-linked) | AI-native §4 | MISSING |
| `agent_eval_run` | AI-native §9 Phase 4 | MISSING |

### CI gates
| Gate | Target | Status |
|---|---|---|
| Block role='admin' in public roleset list | shared test | MISSING — no enforcement test located |
| Block "buy tokens" CTA pre-activation | UI test | MISSING |
| Block DRS<100% installation transitions | backend test | PARTIAL — `services/drs.py` exists, test coverage unverified |
| Block LBRS<100% go-live transitions | backend test | PARTIAL — `services/lbrs.py` exists |
| Settlement solvency invariant Σpayout ≤ Σinflow | backend test | PARTIAL — `services/consistency.py` exists |
| No `E_waste` payout (monetized-only) | backend test | PARTIAL — `services/settlement.py` enforces; verify test |
| Homeowner wallet never shows host-royalty line | UI test | MISSING |
| Labor-as-capital is opt-in, not default | UI/backend test | MISSING |
| Discover hides ineligible projects (Financier) | UI/backend test | MISSING |
| No-guarantee language on projected returns | UI test | MISSING |

---

## Naming/structural drift (STALE)

| Current | Spec | Action | Status |
|---|---|---|---|
| ~~`(electrician)/jobs.tsx` + `jobs-inbox.tsx`~~ | `(electrician)/projects.tsx` | Rename + consolidate | **DONE 2026-05-16** (P0.1.1) |
| ~~`(electrician)/compliance.tsx` (tab)~~ | embedded inside Profile per IA-U7 | Move into Profile | **DONE 2026-05-16** (P0.1.2) |
| `(financier)/tranche-release.tsx` (tab/route) | embedded inside portfolio detail | Move into Project Status detail | Pending (P0.1.3) |
| ~~`(admin)/home.tsx` (4th tab)~~ | only 3 tabs (Alerts/Projects/Profile) | Remove | **DONE 2026-05-16** (P0.1.4) |
| ~~`mobile/components/installer/*` (whole folder)~~ | role is "Electrician" not "Installer" per §Role Naming | Rename folder + components | **DONE 2026-05-17** (P0.1.5) → `mobile/components/electrician/`; `Installer*` → `Electrician*`; deleted unused checklist/job-detail/maintenance scaffolds (P5 replacements) |
| `mobile/components/owner/*` | role is "Building Owner" | Rename for clarity | Pending (P0.1.6) — folder will be replaced by P3 components |
| `mobile/components/proposed-flow/*` | sandbox; not in spec | Either promote/delete | Pending (P0.1.7) |
| ~~`mobile/components/DrsCard.tsx`~~ | spec name `DRSProgressCard` | Rename | **DONE 2026-05-16** → `mobile/components/shared/DRSProgressCard.tsx` (P0.1.8) |
| ~~`mobile/components/TokenHero.tsx`~~ | spec name `TokenBalanceHero` | Rename or alias | **DONE 2026-05-16** → `mobile/components/shared/TokenBalanceHero.tsx` + `website/src/portal/PortalWidgets.tsx` web mirror also renamed (P0.1.9) |
| ~~`(auth)/verify-phone.tsx`~~ | spec uses email OTP for pilot | Rename to `verify-otp.tsx` | **DONE 2026-05-16** (P0.1.10) |
| `website/src/onboard/homeowner/HomeownerOnboarding.tsx` (monolithic) | per-step screens (10 steps) | Split per spec | Pending (P0.1.11) |
| `website/src/onboard/building-owner/BuildingOwnerWebOnboarding.tsx` | per-step screens (8 steps) | Split per spec | Pending (P0.1.12) |
| `website/src/onboard/contributor/ContributorWebOnboarding.tsx` | spec splits into Provider + Electrician + Financier | Split | Pending (P0.1.13) |

---

**END BACKLOG** — Re-run this audit after each sprint by re-grepping the component list and route table.
