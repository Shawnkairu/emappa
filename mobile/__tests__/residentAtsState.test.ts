import { replaySyntheticScenario } from "@emappa/shared";
import { deriveApartmentAtsState } from "../components/resident/residentAtsState";
import { canResidentBuyTokens, deriveBuildingAvailabilityState } from "../components/resident/residentHomeState";

describe("deriveApartmentAtsState", () => {
  it("maps live settlement demo to activated when buy tokens allowed", () => {
    const building = replaySyntheticScenario({ phase: "settlement" }).project;
    expect(deriveBuildingAvailabilityState(building)).toBe("A6");
    if (canResidentBuyTokens(building)) {
      expect(deriveApartmentAtsState(building)).toBe("activated");
    }
  });

  it("maps ATS mapping failure to suspended when workflow blocked", () => {
    const building = replaySyntheticScenario({
      phase: "settlement",
      failureMode: "ats_mapping_gap",
    }).project;
    const workflow = building.roleViews.resident.atsActivation;
    if (workflow?.status === "blocked") {
      expect(deriveApartmentAtsState(building)).toBe("suspended");
    }
  });
});
