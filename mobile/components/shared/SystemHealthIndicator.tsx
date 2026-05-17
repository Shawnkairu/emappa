import { StyleSheet, Text, View } from "react-native";
import { colors, officialPalette, radius, spacing, typography } from "@emappa/ui";

/** AI-native §6 / IA §Home live — system health (3 states). */
export type SystemHealthState = "healthy" | "warning" | "error";

export const SYSTEM_HEALTH_STATE_LABELS: Record<SystemHealthState, string> = {
  healthy: "System healthy",
  warning: "Needs attention",
  error: "Fault detected",
};

type StateVisual = { dotColor: string; textColor: string; borderColor: string; backgroundColor: string };

const STATE_VISUALS: Record<SystemHealthState, StateVisual> = {
  healthy: {
    dotColor: colors.green,
    textColor: colors.green,
    borderColor: colors.green + "30",
    backgroundColor: colors.green + "12",
  },
  warning: {
    dotColor: colors.amber,
    textColor: officialPalette.burntChestnut,
    borderColor: colors.amber + "40",
    backgroundColor: colors.amber + "16",
  },
  error: {
    dotColor: colors.red,
    textColor: colors.red,
    borderColor: colors.red + "35",
    backgroundColor: colors.red + "10",
  },
};

export type SystemHealthIndicatorProps = {
  state: SystemHealthState;
  label?: string;
  detail?: string;
};

export function SystemHealthIndicator({ state, label, detail }: SystemHealthIndicatorProps) {
  const visual = STATE_VISUALS[state];
  const displayLabel = label ?? SYSTEM_HEALTH_STATE_LABELS[state];

  return (
    <View
      style={[
        styles.row,
        { borderColor: visual.borderColor, backgroundColor: visual.backgroundColor },
      ]}
    >
      <View style={[styles.dot, { backgroundColor: visual.dotColor }]} />
      <View style={styles.copy}>
        <Text style={[styles.label, { color: visual.textColor }]}>{displayLabel}</Text>
        {detail ? <Text style={styles.detail}>{detail}</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.sm,
  },
  dot: { width: 10, height: 10, borderRadius: 5, marginTop: 3 },
  copy: { flex: 1, gap: 2 },
  label: { fontSize: typography.small, fontWeight: "800" },
  detail: { color: colors.muted, fontSize: typography.micro, lineHeight: 16 },
});
