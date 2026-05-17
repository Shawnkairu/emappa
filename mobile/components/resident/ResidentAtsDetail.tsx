import { StyleSheet, Text, View } from "react-native";
import type { ProjectedBuilding } from "@emappa/shared";
import { PaletteCard, colors, spacing, typography } from "@emappa/ui";
import {
  APARTMENT_ATS_STATE_LABELS,
  type ApartmentAtsState,
  LiveSupplyIndicator,
  SyntheticBadge,
} from "../shared";
import { deriveApartmentAtsState } from "./residentHomeState";

const ATS_STEP_ORDER: ApartmentAtsState[] = [
  "not_mapped",
  "mapped_not_cleared",
  "capacity_cleared",
  "ats_scheduled",
  "ats_installed_unverified",
  "activated",
  "suspended",
];

const ATS_STEP_DETAILS: Record<ApartmentAtsState, string> = {
  not_mapped: "Unit and PAYG meter not confidently mapped.",
  mapped_not_cleared: "Apartment known; pledge and join the capacity queue.",
  capacity_cleared: "Fits current phase capacity — complete load profile and prepare for ATS scheduling.",
  ats_scheduled: "Electrician visit scheduled or pending confirmation.",
  ats_installed_unverified: "Hardware present; switching test and sign-off incomplete.",
  activated: "Verified switching — buy or top up usable solar tokens.",
  suspended: "Paused for safety, tamper, or maintenance; KPLC fallback remains.",
};

/** Scenario A §2.1 — apartment ATS state machine for resident unit. */
export function ResidentAtsDetail({ building }: { building: ProjectedBuilding }) {
  const current = deriveApartmentAtsState(building);
  const workflow = building.roleViews.resident.atsActivation;
  const currentIndex = ATS_STEP_ORDER.indexOf(current);

  return (
    <View style={styles.wrap}>
      <SyntheticBadge label="ATS path · apartment-level switching" mode="projected" source="pilot" />
      <LiveSupplyIndicator
        atsState={current}
        supply={current === "activated" ? "solar" : "kplc"}
      />
      <PaletteCard style={styles.hero}>
        <Text style={styles.eyebrow}>Current state</Text>
        <Text style={styles.state}>{APARTMENT_ATS_STATE_LABELS[current]}</Text>
        <Text style={styles.detail}>{workflow?.detail ?? ATS_STEP_DETAILS[current]}</Text>
      </PaletteCard>
      {ATS_STEP_ORDER.map((step, index) => {
        const active = step === current;
        const complete = currentIndex > index && current !== "suspended";
        return (
          <View key={step} style={[styles.step, active && styles.stepActive, complete && styles.stepComplete]}>
            <Text style={styles.stepIndex}>{index + 1}</Text>
            <View style={styles.stepBody}>
              <Text style={styles.stepLabel}>{APARTMENT_ATS_STATE_LABELS[step]}</Text>
              <Text style={styles.stepDetail}>{ATS_STEP_DETAILS[step]}</Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.sm },
  hero: { gap: spacing.xs, marginBottom: spacing.sm },
  eyebrow: { color: colors.muted, fontSize: typography.micro, fontWeight: "800", textTransform: "uppercase" },
  state: { color: colors.text, fontSize: typography.title, fontWeight: "800" },
  detail: { color: colors.muted, fontSize: typography.small, lineHeight: 20 },
  step: {
    borderColor: colors.border,
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.md,
    padding: spacing.md,
  },
  stepActive: { borderColor: colors.orangeDeep, backgroundColor: `${colors.orangeDeep}12` },
  stepComplete: { opacity: 0.72 },
  stepIndex: { color: colors.muted, fontSize: typography.small, fontWeight: "800", width: 20 },
  stepBody: { flex: 1, gap: 4 },
  stepLabel: { color: colors.text, fontSize: typography.small, fontWeight: "800" },
  stepDetail: { color: colors.muted, fontSize: typography.micro, lineHeight: 17 },
});
