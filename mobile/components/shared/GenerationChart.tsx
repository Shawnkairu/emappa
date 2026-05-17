import { StyleSheet, Text, View } from "react-native";
import { colors, officialPalette, spacing, typography } from "@emappa/ui";
import { SyntheticBadge } from "./SyntheticBadge";

export type GenerationChartProps = {
  title?: string;
  values: number[];
  unitLabel?: string;
  synthetic?: boolean;
};

export function GenerationChart({
  title = "Generation",
  values,
  unitLabel = "kWh",
  synthetic = true,
}: GenerationChartProps) {
  const max = Math.max(...values, 1);

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title}>{title}</Text>
        {synthetic ? <SyntheticBadge mode="projected" /> : null}
      </View>
      <View style={styles.bars} accessibilityLabel={`${title} chart`}>
        {values.map((value, index) => (
          <View key={index} style={styles.barWrap}>
            <View style={[styles.bar, { height: `${Math.max(8, (value / max) * 100)}%` }]} />
          </View>
        ))}
      </View>
      <Text style={styles.caption}>24h profile · {unitLabel}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.sm },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.sm },
  title: { color: colors.text, fontSize: typography.body, fontWeight: "800" },
  bars: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 3,
    height: 120,
    borderRadius: 16,
    backgroundColor: officialPalette.scarfOat + "44",
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
  },
  barWrap: { flex: 1, height: "100%", justifyContent: "flex-end" },
  bar: {
    width: "100%",
    borderRadius: 4,
    backgroundColor: officialPalette.foxOrange,
    minHeight: 8,
  },
  caption: { color: colors.muted, fontSize: typography.micro, fontWeight: "600" },
});
