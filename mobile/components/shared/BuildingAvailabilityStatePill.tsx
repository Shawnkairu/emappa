import { StyleSheet, Text, View } from "react-native";
import { colors, officialPalette, radius, spacing, typography } from "@emappa/ui";

/** Scenario A §3 / IA §Resident Home — building availability (A0–A6). */
export type BuildingAvailabilityState = "A0" | "A1" | "A2" | "A3" | "A4" | "A5" | "A6";

export const BUILDING_AVAILABILITY_STATE_LABELS: Record<BuildingAvailabilityState, string> = {
  A0: "e.mappa is not active here yet",
  A1: "Owner joined, no project started",
  A2: "Project organizing / DRS",
  A3: "Funding / provider coordination",
  A4: "Installation in progress",
  A5: "Solar installed, your unit not yet connected",
  A6: "Live and connected",
};

type StateVisual = {
  borderColor: string;
  backgroundColor: string;
  textColor: string;
  dotColor: string;
};

const STATE_VISUALS: Record<BuildingAvailabilityState, StateVisual> = {
  A0: {
    borderColor: "rgba(125, 87, 52, 0.22)",
    backgroundColor: officialPalette.scarfOat + "33",
    textColor: colors.muted,
    dotColor: officialPalette.toastedClay,
  },
  A1: {
    borderColor: officialPalette.guitarMaple,
    backgroundColor: officialPalette.guitarMaple + "1A",
    textColor: officialPalette.deepWood,
    dotColor: officialPalette.guitarMaple,
  },
  A2: {
    borderColor: officialPalette.foxOrange,
    backgroundColor: officialPalette.furCream + "55",
    textColor: officialPalette.burntChestnut,
    dotColor: officialPalette.foxOrange,
  },
  A3: {
    borderColor: officialPalette.rustBrown,
    backgroundColor: officialPalette.plushCaramel + "44",
    textColor: officialPalette.espressoShadow,
    dotColor: officialPalette.rustBrown,
  },
  A4: {
    borderColor: officialPalette.softCinnamon,
    backgroundColor: officialPalette.toastedClay + "2A",
    textColor: officialPalette.deepWood,
    dotColor: officialPalette.softCinnamon,
  },
  A5: {
    borderColor: colors.amber,
    backgroundColor: colors.amber + "18",
    textColor: officialPalette.burntChestnut,
    dotColor: colors.amber,
  },
  A6: {
    borderColor: colors.green,
    backgroundColor: colors.green + "14",
    textColor: colors.green,
    dotColor: colors.green,
  },
};

export type BuildingAvailabilityStatePillProps = {
  state: BuildingAvailabilityState;
  /** Override IA copy when a parent already surfaces context (e.g. cockpit queue row). */
  label?: string;
  showIcon?: boolean;
};

export function BuildingAvailabilityStatePill({
  state,
  label,
  showIcon = true,
}: BuildingAvailabilityStatePillProps) {
  const visual = STATE_VISUALS[state];
  const displayLabel = label ?? BUILDING_AVAILABILITY_STATE_LABELS[state];

  return (
    <View
      accessibilityRole="text"
      style={[
        styles.pill,
        {
          borderColor: visual.borderColor,
          backgroundColor: visual.backgroundColor,
        },
      ]}
    >
      {showIcon ? <View style={[styles.dot, { backgroundColor: visual.dotColor }]} /> : null}
      <Text style={[styles.label, { color: visual.textColor }]} numberOfLines={2}>
        {displayLabel}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    maxWidth: "100%",
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    flexShrink: 0,
  },
  label: {
    flexShrink: 1,
    fontSize: typography.micro,
    fontWeight: "600",
    letterSpacing: 0.2,
    lineHeight: 16,
  },
});
