import { StyleSheet, Text, View } from "react-native";
import { colors, officialPalette, radius, spacing, typography } from "@emappa/ui";

export type DeploymentPhase = {
  key: string;
  label: string;
  complete?: boolean;
  current?: boolean;
};

export type DeploymentProgressBarProps = {
  phases: DeploymentPhase[];
  percent: number;
  label?: string;
};

export function DeploymentProgressBar({ phases, percent, label }: DeploymentProgressBarProps) {
  const clamped = Math.max(0, Math.min(100, percent));

  return (
    <View style={styles.wrap}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${clamped}%` }]} />
      </View>
      <Text style={styles.percent}>{clamped}% deployment readiness</Text>
      <View style={styles.phases}>
        {phases.map((phase) => (
          <View key={phase.key} style={styles.phaseRow}>
            <View
              style={[
                styles.phaseDot,
                phase.complete && styles.phaseDotComplete,
                phase.current && styles.phaseDotCurrent,
              ]}
            />
            <Text
              style={[
                styles.phaseLabel,
                phase.current && styles.phaseLabelCurrent,
                phase.complete && styles.phaseLabelComplete,
              ]}
            >
              {phase.label}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.sm },
  label: { color: colors.muted, fontSize: typography.micro, fontWeight: "700", textTransform: "uppercase" },
  track: {
    height: 10,
    borderRadius: radius.pill,
    backgroundColor: officialPalette.scarfOat,
    overflow: "hidden",
  },
  fill: { height: "100%", borderRadius: radius.pill, backgroundColor: officialPalette.foxOrange },
  percent: { color: colors.text, fontSize: typography.small, fontWeight: "700" },
  phases: { gap: spacing.xs, marginTop: spacing.xs },
  phaseRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  phaseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: officialPalette.scarfOat,
    borderWidth: 1,
    borderColor: "rgba(125, 87, 52, 0.2)",
  },
  phaseDotCurrent: { backgroundColor: officialPalette.foxOrange, borderColor: officialPalette.foxOrange },
  phaseDotComplete: { backgroundColor: colors.green, borderColor: colors.green },
  phaseLabel: { color: colors.muted, fontSize: typography.small },
  phaseLabelCurrent: { color: colors.text, fontWeight: "700" },
  phaseLabelComplete: { color: colors.text },
});
