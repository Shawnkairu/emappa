export type DaytimePattern = "mostly_day" | "balanced" | "mostly_evening";

export type ApplianceId =
  | "fridge"
  | "water_heater"
  | "ac"
  | "cooker"
  | "lights"
  | "washing_machine";

export const APPLIANCE_OPTIONS: Array<{ label: string; value: ApplianceId }> = [
  { label: "Refrigerator", value: "fridge" },
  { label: "Water heater / geyser", value: "water_heater" },
  { label: "Air conditioning", value: "ac" },
  { label: "Electric cooker", value: "cooker" },
  { label: "Lighting load", value: "lights" },
  { label: "Washing machine", value: "washing_machine" },
];

export type LoadProfileL1Data = {
  monthlyKes: number;
  peopleInUnit: number;
  appliances: ApplianceId[];
  daytimePattern: DaytimePattern;
  receiptDeferred: boolean;
};

export function loadProfileToProfilePayload(data: LoadProfileL1Data) {
  return {
    loadProfile: {
      level: "L1" as const,
      monthlyKes: data.monthlyKes,
      peopleInUnit: data.peopleInUnit,
      appliances: data.appliances,
      daytimePattern: data.daytimePattern,
      receiptDeferred: data.receiptDeferred,
    },
  };
}
