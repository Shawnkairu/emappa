export type SizingWarningCode = "oversized" | "under_batteried" | "under_loaded" | "low_production";

export type SizingWarning = {
  code: SizingWarningCode;
  title: string;
  body: string;
};

export function homeownerSizingWarnings(input: {
  generationKwh: number;
  loadKwh: number;
  isLive: boolean;
  eGen?: number;
  eSold?: number;
  eWaste?: number;
}): SizingWarning[] {
  const warnings: SizingWarning[] = [];
  const generation = Math.max(0, input.generationKwh);
  const load = Math.max(0, input.loadKwh);
  const matched = Math.min(generation, load);
  const utilizationToday = generation > 0 ? matched / generation : 0;
  const coverage = load > 0 ? matched / load : 0;

  const eGen = input.eGen ?? generation;
  const eSold = input.eSold ?? matched;
  const eWaste = input.eWaste ?? Math.max(0, eGen - eSold);
  const utilizationPeriod = eGen > 0 ? eSold / eGen : utilizationToday;
  const wasteRatio = eGen > 0 ? eWaste / eGen : 0;

  if (generation > load * 1.2 || wasteRatio > 0.22) {
    warnings.push({
      code: "oversized",
      title: "System may be oversized",
      body: "Excess generation risks waste, weaker utilization, and slower payback unless export or third-party demand is enabled.",
    });
  }

  if (load > generation * 1.35 && coverage < 0.55) {
    warnings.push({
      code: "under_batteried",
      title: "Storage may be undersized",
      body: "Home load is outpacing matched solar — battery capacity or evening coverage may be insufficient for your profile.",
    });
  }

  if (input.isLive && utilizationPeriod < 0.42) {
    warnings.push({
      code: "under_loaded",
      title: "Low utilization risk",
      body: "Monetized solar is a small share of generation. Check load profile confidence and whether the array matches actual demand.",
    });
  }

  if (input.isLive && generation > 0 && generation < load * 0.45) {
    warnings.push({
      code: "low_production",
      title: "Production below expectation",
      body: "Today's array output is well under home use — review shading, inverter health, or weather before assuming sizing is correct.",
    });
  }

  return warnings;
}
