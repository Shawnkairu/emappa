import { StyleSheet, Text, View } from "react-native";
import { colors, officialPalette, radius, spacing, typography } from "@emappa/ui";

/** IA §Financier Energy / Scenario F §13 — meter & settlement data quality (5 states). */
export type DataQualityState =
  | "verified"
  | "estimated"
  | "missing"
  | "disputed"
  | "conservative";

export const DATA_QUALITY_STATE_LABELS: Record<DataQualityState, string> = {
  verified: "Verified",
  estimated: "Estimated",
  missing: "Missing",
  disputed: "Disputed",
  conservative: "Conservative",
};

type StateVisual = {
  borderColor: string;
  backgroundColor: string;
  textColor: string;
  dotColor: string;
};

const STATE_VISUALS: Record<DataQualityState, StateVisual> = {
  verified: {
    borderColor: colors.green,
    backgroundColor: colors.green + "14",
    textColor: colors.green,
    dotColor: colors.green,
  },
  estimated: {
    borderColor: colors.amber,
    backgroundColor: colors.amber + "18",
    textColor: officialPalette.burntChestnut,
    dotColor: colors.amber,
  },
  missing: {
    borderColor: "rgba(125, 87, 52, 0.22)",
    backgroundColor: officialPalette.scarfOat + "33",
    textColor: colors.muted,
    dotColor: officialPalette.toastedClay,
  },
  disputed: {
    borderColor: colors.red,
    backgroundColor: colors.red + "12",
    textColor: colors.red,
    dotColor: colors.red,
  },
  conservative: {
    borderColor: officialPalette.rustBrown,
    backgroundColor: officialPalette.plushCaramel + "44",
    textColor: officialPalette.espressoShadow,
    dotColor: officialPalette.foxOrange,
  },
};

export type DataQualityBadgeProps = {
  quality: DataQualityState;
  /** Override IA label when parent surfaces fuller context (e.g. settlement row). */
  label?: string;
  showIcon?: boolean;
};

export function DataQualityBadge({ quality, label, showIcon = true }: DataQualityBadgeProps) {
  const visual = STATE_VISUALS[quality];
  const displayLabel = label ?? DATA_QUALITY_STATE_LABELS[quality];

  return (
    <View
      accessibilityRole="text"
      style={[
        styles.badge,
        {
          borderColor: visual.borderColor,
          backgroundColor: visual.backgroundColor,
        },
      ]}
    >
      {showIcon ? <View style={[styles.dot, { backgroundColor: visual.dotColor }]} /> : null}
      <Text style={[styles.label, { color: visual.textColor }]} numberOfLines={1}>
        {displayLabel}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    borderWidth: 1,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    maxWidth: "100%",
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    flexShrink: 0,
  },
  label: {
    flexShrink: 1,
    fontSize: typography.micro,
    fontWeight: "700",
    letterSpacing: 0.35,
    lineHeight: 14,
  },
});
