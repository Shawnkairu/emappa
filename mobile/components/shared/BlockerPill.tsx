import { StyleSheet, Text, View } from "react-native";
import { colors, officialPalette, radius, spacing, typography } from "@emappa/ui";

export type BlockerSeverity = "critical" | "warning" | "info";

export type BlockerPillProps = {
  label: string;
  severity?: BlockerSeverity;
  owner?: string;
};

const SEVERITY_STYLES: Record<BlockerSeverity, { border: string; bg: string; text: string }> = {
  critical: { border: colors.red + "55", bg: colors.red + "12", text: colors.red },
  warning: { border: colors.amber + "55", bg: colors.amber + "16", text: officialPalette.burntChestnut },
  info: { border: "rgba(125, 87, 52, 0.2)", bg: officialPalette.scarfOat + "44", text: colors.muted },
};

export function BlockerPill({ label, severity = "warning", owner }: BlockerPillProps) {
  const visual = SEVERITY_STYLES[severity];

  return (
    <View style={[styles.pill, { borderColor: visual.border, backgroundColor: visual.bg }]}>
      <Text style={[styles.label, { color: visual.text }]} numberOfLines={2}>
        {label}
      </Text>
      {owner ? <Text style={styles.owner}>{owner}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    alignSelf: "flex-start",
    gap: 2,
    borderWidth: 1,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    maxWidth: "100%",
  },
  label: { fontSize: typography.micro, fontWeight: "800", lineHeight: 14 },
  owner: { color: colors.muted, fontSize: 10, fontWeight: "600" },
});
