import { StyleSheet, Text, View } from "react-native";
import { colors, officialPalette, radius, spacing, typography } from "@emappa/ui";
import { SyntheticBadge } from "./SyntheticBadge";

export type EnergyFlowSegment = {
  key: string;
  label: string;
  kwh: number;
  color: string;
};

export type EnergyFlowChartProps = {
  title?: string;
  segments: EnergyFlowSegment[];
  synthetic?: boolean;
};

export function EnergyFlowChart({
  title = "Energy flow",
  segments,
  synthetic = true,
}: EnergyFlowChartProps) {
  const total = segments.reduce((sum, s) => sum + Math.max(0, s.kwh), 0) || 1;

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title}>{title}</Text>
        {synthetic ? <SyntheticBadge mode="mixed" /> : null}
      </View>
      <View style={styles.stack}>
        {segments.map((segment) => (
          <View
            key={segment.key}
            style={[
              styles.segment,
              {
                flex: Math.max(0.08, segment.kwh / total),
                backgroundColor: segment.color,
              },
            ]}
          />
        ))}
      </View>
      <View style={styles.legend}>
        {segments.map((segment) => (
          <View key={segment.key} style={styles.legendRow}>
            <View style={[styles.swatch, { backgroundColor: segment.color }]} />
            <Text style={styles.legendLabel}>{segment.label}</Text>
            <Text style={styles.legendValue}>{segment.kwh.toFixed(1)} kWh</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.sm },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.sm },
  title: { color: colors.text, fontSize: typography.body, fontWeight: "800" },
  stack: {
    flexDirection: "row",
    height: 14,
    borderRadius: radius.pill,
    overflow: "hidden",
    backgroundColor: officialPalette.scarfOat,
  },
  segment: { minWidth: 8 },
  legend: { gap: spacing.xs },
  legendRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  swatch: { width: 10, height: 10, borderRadius: 5 },
  legendLabel: { flex: 1, color: colors.text, fontSize: typography.small, fontWeight: "600" },
  legendValue: { color: colors.muted, fontSize: typography.small, fontWeight: "700" },
});
