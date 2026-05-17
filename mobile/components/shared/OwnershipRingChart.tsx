import { StyleSheet, Text, View } from "react-native";
import Svg, { Circle } from "react-native-svg";
import { colors, officialPalette, spacing, typography } from "@emappa/ui";

export type OwnershipSegment = {
  key: string;
  label: string;
  pct: number;
  color: string;
};

export type OwnershipRingChartProps = {
  segments: OwnershipSegment[];
  centerLabel?: string;
  centerValue?: string;
  size?: number;
};

export function OwnershipRingChart({
  segments,
  centerLabel = "Your share",
  centerValue,
  size = 120,
}: OwnershipRingChartProps) {
  const stroke = 12;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const total = segments.reduce((sum, s) => sum + Math.max(0, s.pct), 0) || 1;
  let offset = 0;

  return (
    <View style={styles.wrap}>
      <Svg width={size} height={size}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={officialPalette.scarfOat}
          strokeWidth={stroke}
          fill="none"
        />
        {segments.map((segment) => {
          const arc = (Math.max(0, segment.pct) / total) * circumference;
          const dash = `${arc} ${circumference - arc}`;
          const rotation = (offset / circumference) * 360 - 90;
          offset += arc;
          return (
            <Circle
              key={segment.key}
              cx={size / 2}
              cy={size / 2}
              r={radius}
              stroke={segment.color}
              strokeWidth={stroke}
              strokeDasharray={dash}
              strokeLinecap="butt"
              fill="none"
              rotation={rotation}
              origin={`${size / 2}, ${size / 2}`}
            />
          );
        })}
      </Svg>
      <View style={[styles.center, { width: size, height: size }]}>
        {centerValue ? <Text style={styles.centerValue}>{centerValue}</Text> : null}
        <Text style={styles.centerLabel}>{centerLabel}</Text>
      </View>
      <View style={styles.legend}>
        {segments.map((segment) => (
          <View key={segment.key} style={styles.legendRow}>
            <View style={[styles.swatch, { backgroundColor: segment.color }]} />
            <Text style={styles.legendLabel}>{segment.label}</Text>
            <Text style={styles.legendPct}>{segment.pct.toFixed(1)}%</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: "center", gap: spacing.md },
  center: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.sm,
  },
  centerValue: { color: colors.text, fontSize: 20, fontWeight: "800", letterSpacing: -0.5 },
  centerLabel: { color: colors.muted, fontSize: typography.micro, fontWeight: "700", textAlign: "center" },
  legend: { alignSelf: "stretch", gap: spacing.xs },
  legendRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  swatch: { width: 10, height: 10, borderRadius: 5 },
  legendLabel: { flex: 1, color: colors.text, fontSize: typography.small, fontWeight: "600" },
  legendPct: { color: colors.muted, fontSize: typography.small, fontWeight: "700" },
});
