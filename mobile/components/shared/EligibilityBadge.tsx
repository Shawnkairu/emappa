import { StyleSheet, Text, View } from "react-native";
import { colors, officialPalette, radius, spacing, typography } from "@emappa/ui";

/** Scenario F §7 / IA §Financier Discover — project eligibility (5 states). */
export type EligibilityState =
  | "invest_now"
  | "watch_only"
  | "documents_needed"
  | "limit_reached"
  | "restricted_jurisdiction";

export const ELIGIBILITY_STATE_LABELS: Record<EligibilityState, string> = {
  invest_now: "Invest now",
  watch_only: "Watch only",
  documents_needed: "Documents needed",
  limit_reached: "Limit reached",
  restricted_jurisdiction: "Restricted jurisdiction",
};

type StateVisual = {
  borderColor: string;
  backgroundColor: string;
  textColor: string;
  dotColor: string;
};

const STATE_VISUALS: Record<EligibilityState, StateVisual> = {
  invest_now: {
    borderColor: colors.green,
    backgroundColor: colors.green + "14",
    textColor: colors.green,
    dotColor: colors.green,
  },
  watch_only: {
    borderColor: "rgba(125, 87, 52, 0.22)",
    backgroundColor: officialPalette.scarfOat + "33",
    textColor: colors.muted,
    dotColor: officialPalette.toastedClay,
  },
  documents_needed: {
    borderColor: colors.amber,
    backgroundColor: colors.amber + "18",
    textColor: officialPalette.burntChestnut,
    dotColor: colors.amber,
  },
  limit_reached: {
    borderColor: officialPalette.rustBrown,
    backgroundColor: officialPalette.plushCaramel + "44",
    textColor: officialPalette.espressoShadow,
    dotColor: officialPalette.rustBrown,
  },
  restricted_jurisdiction: {
    borderColor: colors.red,
    backgroundColor: colors.red + "12",
    textColor: colors.red,
    dotColor: colors.red,
  },
};

export type EligibilityBadgeProps = {
  eligibility: EligibilityState;
  /** Override IA label when parent surfaces fuller context (e.g. deal card row). */
  label?: string;
  showIcon?: boolean;
};

export function EligibilityBadge({
  eligibility,
  label,
  showIcon = true,
}: EligibilityBadgeProps) {
  const visual = STATE_VISUALS[eligibility];
  const displayLabel = label ?? ELIGIBILITY_STATE_LABELS[eligibility];

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
