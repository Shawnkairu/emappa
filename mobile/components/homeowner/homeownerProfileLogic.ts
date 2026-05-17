export type RoofSource = "microsoft_footprints" | "owner_traced" | "owner_typed" | null | undefined;

export type SiteEvidencePhoto = {
  id: string;
  label: string;
  group: "db" | "meter";
  status: "captured" | "missing" | "review";
  detail: string;
};

type BuildingEvidenceInput = {
  id: string;
  lat?: number;
  lon?: number;
  stage: string;
  roofAreaM2?: number | null;
  roofSource?: RoofSource;
  roofConfidence?: number | null;
};

export function roofSourceLabel(source: RoofSource) {
  if (source === "microsoft_footprints") {
    return "Microsoft footprint";
  }
  if (source === "owner_traced") {
    return "Owner traced";
  }
  if (source === "owner_typed") {
    return "Manual sqm";
  }
  return "Not captured";
}

export function roofSourceTone(source: RoofSource): "good" | "warn" | "bad" | "neutral" {
  if (source === "microsoft_footprints" || source === "owner_traced") {
    return "good";
  }
  if (source === "owner_typed") {
    return "warn";
  }
  return "bad";
}

export function roofConfidenceLabel(confidence: number | null | undefined) {
  if (confidence === null || confidence === undefined || Number.isNaN(confidence)) {
    return "Unknown";
  }
  const normalized = confidence > 1 ? confidence / 100 : confidence;
  return `${Math.round(Math.max(0, Math.min(1, normalized)) * 100)}% confidence`;
}

export function roofConfidenceTone(confidence: number | null | undefined): "good" | "warn" | "bad" | "neutral" {
  if (confidence === null || confidence === undefined) {
    return "neutral";
  }
  const normalized = confidence > 1 ? confidence / 100 : confidence;
  if (normalized >= 0.75) {
    return "good";
  }
  if (normalized >= 0.6) {
    return "warn";
  }
  return "bad";
}

export function canRetraceRoof(source: RoofSource) {
  return source === "microsoft_footprints" || source === "owner_traced" || !source;
}

export function retraceDetail(source: RoofSource) {
  if (source === "microsoft_footprints") {
    return "Tap corners on the satellite tile if the auto footprint is off.";
  }
  if (source === "owner_traced") {
    return "Redraw the roof polygon after shade or extension changes.";
  }
  return "Trace the roof on satellite imagery before manual sqm fallback.";
}

export function retraceHref(building: Pick<BuildingEvidenceInput, "id" | "lat" | "lon">) {
  const lat = building.lat ?? 0;
  const lon = building.lon ?? 0;
  return `/(onboard)/homeowner/roof-capture?buildingId=${encodeURIComponent(building.id)}&lat=${lat}&lon=${lon}`;
}

export function homeownerSiteEvidencePhotos(building: BuildingEvidenceInput): SiteEvidencePhoto[] {
  const hasRoof = Boolean(building.roofAreaM2 && building.roofAreaM2 > 0);
  const confidence =
    building.roofConfidence === null || building.roofConfidence === undefined
      ? 0
      : building.roofConfidence > 1
        ? building.roofConfidence / 100
        : building.roofConfidence;
  const pastQualifying = ["qualifying", "funding", "installing", "live"].includes(building.stage);
  const pastFunding = ["funding", "installing", "live"].includes(building.stage);
  const pastInstall = ["installing", "live"].includes(building.stage);

  const dbMain: SiteEvidencePhoto["status"] = pastQualifying && hasRoof ? "captured" : hasRoof ? "review" : "missing";
  const dbLabels: SiteEvidencePhoto["status"] = pastFunding ? "captured" : pastQualifying ? "review" : "missing";
  const meterFace: SiteEvidencePhoto["status"] =
    confidence >= 0.6 && hasRoof ? "captured" : pastQualifying ? "review" : "missing";
  const meterArea: SiteEvidencePhoto["status"] = pastInstall ? "captured" : pastFunding ? "review" : "missing";

  return [
    {
      id: "db-main",
      label: "Main DB",
      group: "db",
      status: dbMain,
      detail: "Distribution board and incomer context for electrician scheduling.",
    },
    {
      id: "db-labels",
      label: "DB labels",
      group: "db",
      status: dbLabels,
      detail: "Breaker labels and solar tie-in space before LBRS.",
    },
    {
      id: "meter-face",
      label: "Meter face",
      group: "meter",
      status: meterFace,
      detail: "KPLC meter number readable for utility reconciliation.",
    },
    {
      id: "meter-area",
      label: "Meter area",
      group: "meter",
      status: meterArea,
      detail: "Meter room access, conduit route, and anti-islanding context.",
    },
  ];
}

export function photoStatusTone(status: SiteEvidencePhoto["status"]): "good" | "warn" | "bad" | "neutral" {
  if (status === "captured") {
    return "good";
  }
  if (status === "review") {
    return "warn";
  }
  return "bad";
}

export function photoStatusLabel(status: SiteEvidencePhoto["status"]) {
  if (status === "captured") {
    return "On file";
  }
  if (status === "review") {
    return "Review";
  }
  return "Missing";
}
