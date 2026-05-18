import type { ProjectedBuilding } from "@emappa/shared";
import type { ApartmentAtsState, SupplySource } from "../shared/LiveSupplyIndicator";
import {
  canResidentBuyTokens,
  deriveBuildingAvailabilityState,
  deriveCapacityQueueStatus,
} from "./residentHomeState";

/** Scenario A §2.1 — ordered progression for the apartment ATS machine UI. */
export const APARTMENT_ATS_STATE_ORDER: ApartmentAtsState[] = [
  "not_mapped",
  "mapped_not_cleared",
  "capacity_cleared",
  "ats_scheduled",
  "ats_installed_unverified",
  "activated",
];

export const APARTMENT_ATS_STATE_COPY: Record<
  ApartmentAtsState,
  { meaning: string; action: string }
> = {
  not_mapped: {
    meaning: "Your unit and PAYG meter are not confidently mapped to the building solar path.",
    action: "Confirm unit, meter details, and permission for inspection.",
  },
  mapped_not_cleared: {
    meaning: "Your apartment is known, but the system may not have enough capacity for this phase.",
    action: "Pledge interest and join the capacity queue.",
  },
  capacity_cleared: {
    meaning: "Your apartment fits within available e.mappa capacity for this activation phase.",
    action: "Complete load profile and prepare for ATS scheduling.",
  },
  ats_scheduled: {
    meaning: "An electrician visit is scheduled or pending for your apartment ATS.",
    action: "Confirm appointment and access for the visit.",
  },
  ats_installed_unverified: {
    meaning: "Hardware exists at your apartment but switching test or signoff is incomplete.",
    action: "Wait for verification or resolve the listed blocker.",
  },
  activated: {
    meaning: "ATS switching is verified; your apartment can receive prepaid e.mappa solar supply.",
    action: "Buy or top up usable tokens when capacity and balance allow.",
  },
  suspended: {
    meaning: "Your apartment was active but is paused for safety, tamper, non-payment, or maintenance.",
    action: "Resolve the issue; KPLC fallback remains available.",
  },
};

/** Map projected building + queue/DRS signals to Scenario A §2.1 UI states (pilot-derived). */
export function deriveApartmentAtsState(building: ProjectedBuilding): ApartmentAtsState {
  const workflow = building.roleViews.resident.atsActivation;
  if (workflow?.status === "blocked") {
    return "suspended";
  }

  const availability = deriveBuildingAvailabilityState(building);
  const queue = deriveCapacityQueueStatus(building);

  if (availability === "A6" && canResidentBuyTokens(building)) {
    return "activated";
  }
  if (availability === "A5" || workflow?.status === "in_review") {
    return "ats_installed_unverified";
  }
  if (availability === "A4" || building.project.stage === "install" || building.project.stage === "verification") {
    return "ats_scheduled";
  }
  if (queue === "capacity_cleared" || queue === "activated") {
    return "capacity_cleared";
  }
  if (availability === "A0" || availability === "A1") {
    return "not_mapped";
  }
  return "mapped_not_cleared";
}

export function deriveSupplySource(building: ProjectedBuilding, atsState: ApartmentAtsState): SupplySource {
  if (atsState === "activated" && canResidentBuyTokens(building)) {
    return "solar";
  }
  if (atsState === "suspended") {
    return "kplc";
  }
  return "kplc";
}

export function atsStateIndex(state: ApartmentAtsState) {
  if (state === "suspended") {
    return APARTMENT_ATS_STATE_ORDER.length;
  }
  const idx = APARTMENT_ATS_STATE_ORDER.indexOf(state);
  return idx >= 0 ? idx : 0;
}
