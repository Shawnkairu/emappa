import { StyleSheet, Text, View } from "react-native";
import { colors, officialPalette, radius, spacing, typography } from "@emappa/ui";

/** IA §Universal Rules — pilot / non-production disclosure on home screens. */
export type PilotBannerProps = {
  title?: string;
  message?: string;
  compact?: boolean;
};

export function PilotBanner({
  title = "Pilot mode",
  message = "Pledges are non-binding until cash rails are live. Energy may use synthetic data until settlement is verified. No money is charged in pilot. No guaranteed returns.",
  compact = false,
}: PilotBannerProps) {
  return (
    <View
      accessibilityLabel={`${title}. ${message}`}
      style={[styles.banner, compact && styles.bannerCompact]}
    >
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    gap: spacing.xs,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: `${officialPalette.foxOrange}40`,
    backgroundColor: `${officialPalette.furCream}88`,
    padding: spacing.md,
  },
  bannerCompact: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    gap: 4,
  },
  title: {
    color: colors.text,
    fontSize: typography.body,
    fontWeight: "800",
  },
  message: {
    color: colors.muted,
    fontSize: typography.small,
    lineHeight: 19,
  },
});
