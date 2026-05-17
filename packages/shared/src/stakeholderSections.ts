import type { Role, PublicRole } from "./types";

// Canonical section registry. Matches docs/IA_SPEC.md §1–6 exactly.
// Mobile and website portals must render these sections in this order.

export type StakeholderSectionRole = Role;

export interface StakeholderSection {
  id: string;
  label: string;
  detail: string;
  mobileRoute?: string;
  webRoute?: string;
  webAnchor?: string;
  webOnly?: boolean;
}

export const stakeholderSections = {
  resident: [
    section("home", "Home", "Token balance and pledge CTA", "/(resident)/home", { webRoute: "/portal/resident/home" }),
    section("energy", "Energy", "Usage and (when shares > 0) generation", "/(resident)/energy", { webRoute: "/portal/resident/energy" }),
    section("wallet", "Wallet", "Pledged total, ownership earnings, savings", "/(resident)/wallet", { webRoute: "/portal/resident/wallet" }),
    section("profile", "Profile", "Account, settings, support, logout", "/(resident)/profile", { webRoute: "/portal/resident/profile" }),
  ],
  homeowner: [
    section("home", "Home", "Adaptive: DRS/LBRS readiness pre-live; live supply + health post-LBRS", "/(homeowner)/home", { webRoute: "/portal/homeowner/home" }),
    section("energy", "Energy", "Projected until live; then measured generation, E_sold, grid fallback — no host royalty on your own roof", "/(homeowner)/energy", { webRoute: "/portal/homeowner/energy" }),
    section("wallet", "Wallet", "Consumption tokens, project contributions, ownership (external monetization only) — segmented", "/(homeowner)/wallet", { webRoute: "/portal/homeowner/wallet" }),
    section("profile", "Profile", "Property, meters, documents, support, logout", "/(homeowner)/profile", { webRoute: "/portal/homeowner/profile" }),
  ],
  building_owner: [
    section("home", "Home", "DRS/LBRS, blockers, demand — not default infra buyer; site access role", "/(building-owner)/home", { webRoute: "/portal/building-owner/home" }),
    section("energy", "Energy", "Synthetic until live; then building load, E_sold, waste, KPLC fallback", "/(building-owner)/energy", { webRoute: "/portal/building-owner/energy" }),
    section("wallet", "Wallet", "Host royalty only after monetized prepaid solar; optional share earnings separate", "/(building-owner)/wallet", { webRoute: "/portal/building-owner/wallet" }),
    section("profile", "Profile", "Documents, payout, permissions, support", "/(building-owner)/profile", { webRoute: "/portal/building-owner/profile" }),
  ],
  provider: [
    section("discover", "Discover", "Projects needing hardware, panels, or EaaS", "/(provider)/discover", { webRoute: "/portal/provider/discover" }),
    section("projects", "Projects", "Current project status, DRS/LBRS gates, quote/BOM commitments, and delivery proof", "/(provider)/projects", { webRoute: "/portal/provider/projects" }),
    section("generation", "Energy generation", "E_gen vs E_sold, utilization, retained provider claim", "/(provider)/generation", { webRoute: "/portal/provider/generation" }),
    section("wallet", "Wallet", "Sale, EaaS, provider pool, share buy-down — separate ledgers", "/(provider)/wallet", { webRoute: "/portal/provider/wallet" }),
    section("profile", "Profile", "Verification, catalog, warranties, payout", "/(provider)/profile", { webRoute: "/portal/provider/profile" }),
  ],
  electrician: [
    section("discover", "Discover", "Nearby projects, DRS blockers, funding, crew fit", "/(electrician)/discover", { webRoute: "/portal/electrician/discover" }),
    section(
      "jobs",
      "Projects",
      "DRS tasks, install, LBRS, signoff, maintenance",
      "/(electrician)/projects",
      { webRoute: "/portal/electrician/jobs" },
    ),
    section("wallet", "Wallet", "Milestones, labor-as-capital, holds, statements", "/(electrician)/wallet", { webRoute: "/portal/electrician/wallet" }),
    section("profile", "Profile", "Certification tier, crew, safety, embedded compliance checklist, training refreshers", "/(electrician)/profile", { webRoute: "/portal/electrician/profile" }),
  ],
  financier: [
    section("discover", "Discover", "Eligible deals, capital gap, risk badges, payback ranges (not guarantees)", "/(financier)/discover", { webRoute: "/portal/financier/discover" }),
    section("portfolio", "Project status", "Escrow, milestones, DRS/LBRS, live health", "/(financier)/portfolio", { webRoute: "/portal/financier/portfolio" }),
    section("generation", "Energy generation", "E_gen vs E_sold, utilization, data quality — payout basis is monetized kWh", "/(financier)/generation", { webRoute: "/portal/financier/generation" }),
    section("wallet", "Wallet", "Deployed principal, cashflow, fees, reserves, tax placeholders", "/(financier)/wallet", { webRoute: "/portal/financier/wallet" }),
    section("profile", "Profile", "KYC/KYB, eligibility, limits, disclosures, agreements", "/(financier)/profile", { webRoute: "/portal/financier/profile" }),
  ],
  // Admin lives primarily in cockpit. Mobile admin is a thin read-only surface.
  // Per docs/IA_SPEC.md §8.5, admin is never publicly selectable.
  admin: [
    section("alerts", "Alerts", "Operational alerts feed", "/(admin)/alerts"),
    section("projects", "Projects", "Read-only portfolio scan", "/(admin)/projects"),
    section("profile", "Profile", "Account, settings, support, logout", "/(admin)/profile"),
  ],
} as const satisfies Record<StakeholderSectionRole, readonly StakeholderSection[]>;

// Public roles only — admin excluded by design (see IA_SPEC §8.5).
export const stakeholderPortalRoles = [
  "resident",
  "homeowner",
  "building_owner",
  "provider",
  "financier",
  "electrician",
] as const satisfies readonly PublicRole[];

export type StakeholderPortalRole = (typeof stakeholderPortalRoles)[number];

export function getStakeholderSections(role: StakeholderSectionRole): readonly StakeholderSection[] {
  return stakeholderSections[role];
}

export function getMobileSections(role: StakeholderSectionRole): readonly StakeholderSection[] {
  return stakeholderSections[role].filter((item) => item.mobileRoute && !item.webOnly);
}

export function getWebSections(role: StakeholderPortalRole): readonly StakeholderSection[] {
  return stakeholderSections[role].filter((item) => item.webRoute || item.webAnchor);
}

export interface StakeholderSectionAuditResult {
  ok: boolean;
  issues: string[];
}

export function auditStakeholderSectionParity(): StakeholderSectionAuditResult {
  const issues: string[] = [];

  for (const [role, sections] of Object.entries(stakeholderSections) as [StakeholderSectionRole, readonly StakeholderSection[]][]) {
    const ids = new Set<string>();

    if (role !== "admin" && sections.length > 5) {
      issues.push(`${role}: ${sections.length} tabs exceeds the 5-tab cap from IA_SPEC §1`);
    }

    for (const item of sections) {
      if (ids.has(item.id)) {
        issues.push(`${role}: duplicate section id "${item.id}"`);
      }
      ids.add(item.id);
    }

    if (role === "admin") {
      continue;
    }

    for (const item of sections) {
      if (!item.mobileRoute || item.webOnly) {
        continue;
      }

      if (!item.webRoute && !item.webAnchor) {
        issues.push(`${role}: mobile section "${item.id}" has no web route or anchor`);
      }
    }
  }

  return { ok: issues.length === 0, issues };
}

function section(
  id: string,
  label: string,
  detail: string,
  mobileRoute: string | undefined,
  options: Pick<StakeholderSection, "webRoute" | "webAnchor" | "webOnly"> = {},
): StakeholderSection {
  return {
    id,
    label,
    detail,
    mobileRoute,
    webRoute: options.webRoute,
    webAnchor: options.webAnchor ?? id,
    webOnly: options.webOnly,
  };
}
