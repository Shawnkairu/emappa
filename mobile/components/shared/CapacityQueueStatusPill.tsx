import { StyleSheet, Text, View } from "react-native";
import { colors, officialPalette, radius, spacing, typography } from "@emappa/ui";

/** Scenario A §6.2 / IA §Resident Home — capacity queue status (7 states). */
export type CapacityQueueStatus =
  | "interested"
  | "pledged"
  | "capacity_review"
  | "capacity_cleared"
  | "queued"
  | "waitlisted"
  | "activated";

export const CAPACITY_QUEUE_STATUS_LABELS: Record<CapacityQueueStatus, string> = {
  interested: "Complete your load estimate to improve your place in line.",
  pledged: "Your pledge helps qualify the building. No money charged.",
  capacity_review: "We are checking whether current system capacity can serve your apartment.",
  capacity_cleared:
    "Your apartment fits the current phase. ATS activation can be scheduled when installation is ready.",
  queued: "You are in the queue. We will notify you when capacity opens.",
  waitlisted: "Current capacity is full. Your demand may help justify expansion.",
  activated: "Your apartment is connected. Buy solar tokens to start using e.mappa.",
};

type StateVisual = {
  borderColor: string;
  backgroundColor: string;
  textColor: string;
  dotColor: string;
};

const STATE_VISUALS: Record<CapacityQueueStatus, StateVisual> = {
  interested: {
    borderColor: "rgba(125, 87, 52, 0.22)",
    backgroundColor: officialPalette.scarfOat + "33",
    textColor: colors.muted,
    dotColor: officialPalette.toastedClay,
  },
  pledged: {
    borderColor: officialPalette.guitarMaple,
    backgroundColor: officialPalette.furCream + "55",
    textColor: officialPalette.deepWood,
    dotColor: officialPalette.guitarMaple,
  },
  capacity_review: {
    borderColor: colors.amber,
    backgroundColor: colors.amber + "18",
    textColor: officialPalette.burntChestnut,
    dotColor: colors.amber,
  },
  capacity_cleared: {
    borderColor: officialPalette.foxOrange,
    backgroundColor: officialPalette.plushCaramel + "44",
    textColor: officialPalette.espressoShadow,
    dotColor: officialPalette.foxOrange,
  },
  queued: {
    borderColor: officialPalette.softCinnamon,
    backgroundColor: officialPalette.toastedClay + "2A",
    textColor: officialPalette.deepWood,
    dotColor: officialPalette.softCinnamon,
  },
  waitlisted: {
    borderColor: officialPalette.rustBrown,
    backgroundColor: officialPalette.plushCaramel + "33",
    textColor: officialPalette.burntChestnut,
    dotColor: officialPalette.rustBrown,
  },
  activated: {
    borderColor: colors.green,
    backgroundColor: colors.green + "14",
    textColor: colors.green,
    dotColor: colors.green,
  },
};

export type CapacityQueueStatusPillProps = {
  status: CapacityQueueStatus;
  /** Override IA copy when a parent already surfaces context (e.g. cockpit queue row). */
  label?: string;
  showIcon?: boolean;
};

export function CapacityQueueStatusPill({
  status,
  label,
  showIcon = true,
}: CapacityQueueStatusPillProps) {
  const visual = STATE_VISUALS[status];
  const displayLabel = label ?? CAPACITY_QUEUE_STATUS_LABELS[status];

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
      <Text style={[styles.label, { color: visual.textColor }]} numberOfLines={3}>
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
