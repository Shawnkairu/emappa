import { StyleSheet, Text, View } from "react-native";
import { colors, officialPalette, radius, spacing, typography } from "@emappa/ui";

/** IA §Components Catalog / CR-8 — marks projected or mock energy data. */
export type SyntheticMode = "projected" | "simulated" | "mixed";

export const SYNTHETIC_MODE_LABELS: Record<SyntheticMode, string> = {
  projected: "Projected",
  simulated: "Simulated",
  mixed: "Mixed source",
};

export type SyntheticBadgeProps = {
  label?: string;
  mode?: SyntheticMode;
  source?: string;
};

export function SyntheticBadge({
  label,
  mode = "projected",
  source,
}: SyntheticBadgeProps) {
  const displayLabel =
    label ?? (source ? `${source} · ${SYNTHETIC_MODE_LABELS[mode].toLowerCase()}` : SYNTHETIC_MODE_LABELS[mode]);

  return (
    <View accessibilityRole="text" style={styles.badge}>
      <Text style={styles.text} numberOfLines={1}>
        {displayLabel}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: "flex-start",
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: "rgba(125, 87, 52, 0.18)",
    backgroundColor: officialPalette.scarfOat + "55",
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    maxWidth: "100%",
  },
  text: {
    color: colors.muted,
    fontSize: typography.micro,
    fontWeight: "800",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
});
