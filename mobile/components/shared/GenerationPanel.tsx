import { StyleSheet, Text, View } from "react-native";
import { generationVisibilityForRole, type ProjectedBuilding } from "@emappa/shared";
import { colors, spacing, typography } from "@emappa/ui";
import { SyntheticBadge } from "./SyntheticBadge";

export type GenerationPanelProps = {
  building: ProjectedBuilding;
  shareOwnershipPct?: number;
  alwaysVisible?: boolean;
};

export function GenerationPanel({ building, shareOwnershipPct = 0, alwaysVisible = false }: GenerationPanelProps) {
  const visibility = alwaysVisible
    ? generationVisibilityForRole("homeowner")
    : generationVisibilityForRole("resident", { shareOwnershipPct });

  if (!visibility.visible) {
    return (
      <View style={styles.gated}>
        <Text style={styles.eyebrow}>Generation</Text>
        <Text style={styles.title}>Buy a share to see live generation</Text>
        <Text style={styles.body}>
          Generation visibility is gated by share ownership. Energy flow still reflects your prepaid allocation; array-level
          detail appears once you hold a provider-side share on this building.
        </Text>
      </View>
    );
  }

  const todayGen = building.energy.E_gen / 30;
  const monthGen = building.energy.E_gen;
  const retained = building.roleViews.provider.retainedOwnership;

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.eyebrow}>Generation</Text>
        <SyntheticBadge mode="projected" source="pilot" />
      </View>
      <Text style={styles.title}>Array generation & retained share</Text>
      <Text style={styles.body}>
        Today (building prorated): {todayGen.toFixed(1)} kWh · 30-day: {monthGen.toFixed(0)} kWh · Retained pool:{" "}
        {Math.round(retained * 100)}%
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.sm,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    padding: 18,
    marginBottom: spacing.lg,
  },
  gated: {
    gap: spacing.sm,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    padding: 18,
    marginBottom: spacing.lg,
  },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.sm },
  eyebrow: {
    color: colors.muted,
    fontSize: typography.micro,
    fontWeight: "800",
    letterSpacing: 0.75,
    textTransform: "uppercase",
  },
  title: { color: colors.text, fontSize: typography.title, fontWeight: "800", letterSpacing: -0.4 },
  body: { color: colors.muted, fontSize: typography.small, lineHeight: 20 },
});
