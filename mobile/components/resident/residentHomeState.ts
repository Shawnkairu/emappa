import type { ProjectedBuilding } from "@emappa/shared";
import type { BuildingAvailabilityState } from "../shared/BuildingAvailabilityStatePill";
import type { CapacityQueueStatus } from "../shared/CapacityQueueStatusPill";

/** Scenario A §3 — map project + ATS workflow to A0–A6 (never A5 and buy-tokens together). */
export function deriveBuildingAvailabilityState(building: ProjectedBuilding): BuildingAvailabilityState {
  const stage = building.project.stage;
  const atsReady = building.roleViews.resident.atsActivation?.status === "ready";

  if (stage === "live") {
    return atsReady ? "A6" : "A5";
  }
  if (stage === "install" || stage === "verification") {
    return "A4";
  }
  if (stage === "funding" || stage === "supplier") {
    return "A3";
  }
  if (stage === "review" || stage === "inspection" || stage === "lead") {
    return "A2";
  }
  if (stage === "pre_onboarding") {
    return "A1";
  }
  return "A0";
}

/** Scenario A §6.2 — normalize API/mock queue status to the 7-state pill contract. */
export function deriveCapacityQueueStatus(building: ProjectedBuilding): CapacityQueueStatus {
  const raw = building.roleViews.resident.capacityQueue?.status ?? "interested";
  const map: Record<string, CapacityQueueStatus> = {
    interested: "interested",
    pledged: "pledged",
    capacity_review: "capacity_review",
    capacity_cleared: "capacity_cleared",
    queued: "queued",
    waitlisted: "waitlisted",
    activated: "activated",
  };
  return map[raw] ?? "interested";
}

export function isResidentLive(building: ProjectedBuilding) {
  return deriveBuildingAvailabilityState(building) === "A6";
}

/** Scenario A §5 — real-money token purchase only post-activation; mutex with A5 pledge path. */
export function canResidentBuyTokens(building: ProjectedBuilding) {
  if (deriveBuildingAvailabilityState(building) !== "A6") {
    return false;
  }
  const queue = deriveCapacityQueueStatus(building);
  return queue === "activated" || queue === "capacity_cleared";
}

export function canEditPledge(building: ProjectedBuilding) {
  return !isResidentLive(building);
}
