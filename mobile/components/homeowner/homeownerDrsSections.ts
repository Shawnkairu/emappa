import type { DrsResult } from "@emappa/shared";

/** Scenario C §8 DRS categories for homeowner embedded detail. */
export type HomeownerDrsSection = {
  id: string;
  title: string;
  critical: boolean;
  scorePct: number;
  status: "ready" | "review" | "blocked";
  checks: string[];
};

const SECTION_DEFS: Array<{ id: string; title: string; critical: boolean; keywords: string[] }> = [
  { id: "property_authority", title: "Property authority", critical: true, keywords: ["authority", "title", "lease", "identity", "permission", "owner"] },
  { id: "site_feasibility", title: "Site feasibility", critical: true, keywords: ["site", "roof", "feasibility", "inspection", "meter", "cable"] },
  { id: "load_sizing", title: "Load profile & sizing", critical: true, keywords: ["load", "sizing", "demand", "utilization", "profile"] },
  { id: "stakeholders", title: "Stakeholder readiness", critical: true, keywords: ["electrician", "stakeholder", "provider", "financier", "installer"] },
  { id: "capital", title: "Capital & electrician payment", critical: true, keywords: ["capital", "prepaid", "payment", "fund", "labor"] },
  { id: "hardware", title: "Hardware procurement", critical: true, keywords: ["hardware", "procurement", "bom", "supplier", "installation"] },
  { id: "legal", title: "Legal & utility discipline", critical: true, keywords: ["legal", "export", "anti-islanding", "permit", "utility", "compliance"] },
];

function scoreTone(value: number): HomeownerDrsSection["status"] {
  if (value >= 0.75) {
    return "ready";
  }
  if (value >= 0.45) {
    return "review";
  }
  return "blocked";
}

function componentScore(drs: DrsResult, keys: Array<keyof DrsResult["components"]>) {
  const values = keys.map((key) => drs.components[key] ?? 0);
  const raw = values.reduce((sum, value) => sum + value, 0) / Math.max(1, values.length);
  return raw > 1 ? raw / 100 : raw;
}

function checklistForSection(drs: DrsResult, keywords: string[]) {
  return drs.checklist
    .filter((item) => keywords.some((word) => item.category.toLowerCase().includes(word) || item.label.toLowerCase().includes(word)))
    .map((item) => item.label);
}

function reasonsForSection(drs: DrsResult, keywords: string[]) {
  return drs.reasons.filter((reason) => keywords.some((word) => reason.toLowerCase().includes(word)));
}

export function homeownerDrsSections(drs: DrsResult): HomeownerDrsSection[] {
  const componentMap: Record<string, number> = {
    property_authority: componentScore(drs, ["loadProfile"]),
    site_feasibility: componentScore(drs, ["installationReadiness"]),
    load_sizing: componentScore(drs, ["demandCoverage", "loadProfile"]),
    stakeholders: componentScore(drs, ["electricianReadiness", "installerReadiness"]),
    capital: componentScore(drs, ["capitalAlignment", "prepaidCommitment"]),
    hardware: componentScore(drs, ["installationReadiness"]),
    legal: componentScore(drs, ["capitalAlignment"]),
  };

  return SECTION_DEFS.map((section) => {
    const ratio = componentMap[section.id] ?? 0;
    const checklist = checklistForSection(drs, section.keywords);
    const blockers = reasonsForSection(drs, section.keywords);
    const checks = [...new Set([...checklist, ...blockers])].slice(0, 4);

    return {
      id: section.id,
      title: section.title,
      critical: section.critical,
      scorePct: Math.round(ratio * 100),
      status: blockers.length > 0 ? "blocked" : scoreTone(ratio),
      checks: checks.length > 0 ? checks : ["No open items returned for this category."],
    };
  });
}
