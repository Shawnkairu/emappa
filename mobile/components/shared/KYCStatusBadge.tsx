import { StyleSheet, Text, View } from "react-native";
import { colors, officialPalette, radius, spacing, typography } from "@emappa/ui";

/** Scenario F §27 / IA §Financier Profile — KYC/KYB verification (6 states). */
export type KYCStatusState =
  | "verified"
  | "pending"
  | "limited"
  | "restricted"
  | "documents_needed"
  | "expired";

export const KYC_STATUS_STATE_LABELS: Record<KYCStatusState, string> = {
  verified: "Verified",
  pending: "Pending review",
  limited: "Limited access",
  restricted: "Restricted",
  documents_needed: "Documents needed",
  expired: "Eligibility expired",
};

type StateVisual = {
  borderColor: string;
  backgroundColor: string;
  textColor: string;
  dotColor: string;
};

const STATE_VISUALS: Record<KYCStatusState, StateVisual> = {
  verified: {
    borderColor: colors.green,
    backgroundColor: colors.green + "14",
    textColor: colors.green,
    dotColor: colors.green,
  },
  pending: {
    borderColor: colors.amber,
    backgroundColor: colors.amber + "18",
    textColor: officialPalette.burntChestnut,
    dotColor: colors.amber,
  },
  limited: {
    borderColor: officialPalette.foxOrange,
    backgroundColor: officialPalette.furCream + "55",
    textColor: officialPalette.burntChestnut,
    dotColor: officialPalette.foxOrange,
  },
  restricted: {
    borderColor: colors.red,
    backgroundColor: colors.red + "12",
    textColor: colors.red,
    dotColor: colors.red,
  },
  documents_needed: {
    borderColor: officialPalette.rustBrown,
    backgroundColor: officialPalette.plushCaramel + "44",
    textColor: officialPalette.espressoShadow,
    dotColor: officialPalette.rustBrown,
  },
  expired: {
    borderColor: "rgba(125, 87, 52, 0.22)",
    backgroundColor: officialPalette.scarfOat + "33",
    textColor: colors.muted,
    dotColor: officialPalette.toastedClay,
  },
};

export type KYCStatusBadgeProps = {
  status: KYCStatusState;
  label?: string;
  showIcon?: boolean;
};

export function KYCStatusBadge({ status, label, showIcon = true }: KYCStatusBadgeProps) {
  const visual = STATE_VISUALS[status];
  const displayLabel = label ?? KYC_STATUS_STATE_LABELS[status];

  return (
    <View
      accessibilityRole="text"
      style={[
        styles.badge,
        { borderColor: visual.borderColor, backgroundColor: visual.backgroundColor },
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
  dot: { width: 6, height: 6, borderRadius: 3, flexShrink: 0 },
  label: {
    flexShrink: 1,
    fontSize: typography.micro,
    fontWeight: "700",
    letterSpacing: 0.35,
    lineHeight: 14,
  },
});
