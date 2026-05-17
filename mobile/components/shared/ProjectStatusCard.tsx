import { StyleSheet, Text, View } from "react-native";
import { colors, officialPalette, radius, shadows, spacing, typography } from "@emappa/ui";
import { BlockerPill, type BlockerPillProps } from "./BlockerPill";

export type ProjectStatusCardProps = {
  projectName: string;
  stageLabel: string;
  readinessPct?: number;
  location?: string;
  blockers?: BlockerPillProps[];
  actionLabel?: string;
};

export function ProjectStatusCard({
  projectName,
  stageLabel,
  readinessPct,
  location,
  blockers = [],
}: ProjectStatusCardProps) {
  const pct = readinessPct == null ? null : Math.max(0, Math.min(100, readinessPct));

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.name}>{projectName}</Text>
        <View style={styles.stagePill}>
          <Text style={styles.stageText}>{stageLabel}</Text>
        </View>
      </View>
      {location ? <Text style={styles.location}>{location}</Text> : null}
      {pct != null ? (
        <View style={styles.progress}>
          <View style={styles.track}>
            <View style={[styles.fill, { width: `${pct}%` }]} />
          </View>
          <Text style={styles.pct}>{pct}% DRS</Text>
        </View>
      ) : null}
      {blockers.length > 0 ? (
        <View style={styles.blockers}>
          {blockers.slice(0, 3).map((blocker, index) => (
            <BlockerPill key={`${blocker.label}-${index}`} {...blocker} />
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    ...shadows.card,
    gap: spacing.sm,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    padding: spacing.md,
  },
  header: { flexDirection: "row", justifyContent: "space-between", gap: spacing.sm },
  name: { flex: 1, color: colors.text, fontSize: typography.body, fontWeight: "800" },
  stagePill: {
    borderRadius: radius.sm,
    backgroundColor: officialPalette.furCream,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  stageText: { color: officialPalette.burntChestnut, fontSize: typography.micro, fontWeight: "800" },
  location: { color: colors.muted, fontSize: typography.small },
  progress: { gap: spacing.xs },
  track: { height: 8, borderRadius: 999, backgroundColor: officialPalette.scarfOat, overflow: "hidden" },
  fill: { height: "100%", backgroundColor: officialPalette.foxOrange },
  pct: { color: colors.muted, fontSize: typography.micro, fontWeight: "700" },
  blockers: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs },
});
