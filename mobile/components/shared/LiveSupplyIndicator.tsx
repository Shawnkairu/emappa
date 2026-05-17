import { StyleSheet, Text, View } from "react-native";
import { colors, officialPalette, radius, spacing, typography } from "@emappa/ui";

/** Scenario A §2.1 — ATS apartment state + active supply source. */
export type ApartmentAtsState =
  | "not_mapped"
  | "mapped_not_cleared"
  | "capacity_cleared"
  | "ats_scheduled"
  | "ats_installed_unverified"
  | "activated"
  | "suspended";

export const APARTMENT_ATS_STATE_LABELS: Record<ApartmentAtsState, string> = {
  not_mapped: "Not mapped",
  mapped_not_cleared: "Mapped, not cleared",
  capacity_cleared: "Capacity cleared",
  ats_scheduled: "ATS scheduled",
  ats_installed_unverified: "Installed, unverified",
  activated: "Activated",
  suspended: "Suspended",
};

export type SupplySource = "solar" | "kplc" | "mixed";

export const SUPPLY_SOURCE_LABELS: Record<SupplySource, string> = {
  solar: "e.mappa solar",
  kplc: "KPLC / grid",
  mixed: "Switching",
};

export type LiveSupplyIndicatorProps = {
  atsState: ApartmentAtsState;
  supply: SupplySource;
  atsLabel?: string;
  supplyLabel?: string;
};

export function LiveSupplyIndicator({
  atsState,
  supply,
  atsLabel,
  supplyLabel,
}: LiveSupplyIndicatorProps) {
  const supplyTone =
    supply === "solar" ? colors.green : supply === "kplc" ? colors.muted : officialPalette.foxOrange;

  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <Text style={styles.caption}>ATS</Text>
        <Text style={styles.value}>{atsLabel ?? APARTMENT_ATS_STATE_LABELS[atsState]}</Text>
      </View>
      <View style={styles.divider} />
      <View style={styles.row}>
        <Text style={styles.caption}>Supply now</Text>
        <View style={[styles.supplyPill, { borderColor: `${supplyTone}55`, backgroundColor: `${supplyTone}14` }]}>
          <View style={[styles.supplyDot, { backgroundColor: supplyTone }]} />
          <Text style={[styles.supplyText, { color: supplyTone }]}>
            {supplyLabel ?? SUPPLY_SOURCE_LABELS[supply]}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: "rgba(125, 87, 52, 0.16)",
    backgroundColor: colors.white,
    padding: spacing.sm,
  },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.sm },
  caption: {
    color: colors.muted,
    fontSize: typography.micro,
    fontWeight: "700",
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  value: { color: colors.text, fontSize: typography.small, fontWeight: "700", flexShrink: 1, textAlign: "right" },
  divider: { height: 1, backgroundColor: "rgba(125, 87, 52, 0.1)" },
  supplyPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    borderWidth: 1,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  supplyDot: { width: 6, height: 6, borderRadius: 3 },
  supplyText: { fontSize: typography.micro, fontWeight: "800" },
});
