import { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors, spacing, typography } from "@emappa/ui";

export type ConsumptionPeriod = "daily" | "weekly" | "monthly";

export type ConsumptionPeriodStats = {
  kwh: number;
  savingsKes: number;
  coverage: number;
  tokenBurnKes?: number;
};

export type ConsumptionTimelineProps = {
  daily: ConsumptionPeriodStats;
  weekly: ConsumptionPeriodStats;
  monthly: ConsumptionPeriodStats;
  onDetailPress?: () => void;
};

const PERIODS: ConsumptionPeriod[] = ["daily", "weekly", "monthly"];

export function ConsumptionTimeline({ daily, weekly, monthly, onDetailPress }: ConsumptionTimelineProps) {
  const [period, setPeriod] = useState<ConsumptionPeriod>("daily");
  const stats = useMemo(() => {
    if (period === "weekly") return weekly;
    if (period === "monthly") return monthly;
    return daily;
  }, [daily, monthly, period, weekly]);

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View>
          <Text style={styles.eyebrow}>Consumption</Text>
          <Text style={styles.title}>Timeline</Text>
        </View>
        {onDetailPress ? (
          <Pressable accessibilityRole="button" onPress={onDetailPress}>
            <Text style={styles.detailLink}>30-day detail</Text>
          </Pressable>
        ) : null}
      </View>

      <View style={styles.segmentRow}>
        {PERIODS.map((key) => (
          <Pressable
            key={key}
            accessibilityRole="button"
            accessibilityState={{ selected: period === key }}
            onPress={() => setPeriod(key)}
            style={[styles.segment, period === key ? styles.segmentActive : null]}
          >
            <Text style={[styles.segmentText, period === key ? styles.segmentTextActive : null]}>
              {key === "daily" ? "Daily" : key === "weekly" ? "Weekly" : "Monthly"}
            </Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.metrics}>
        <Metric label="Consumed" value={`${stats.kwh.toFixed(1)} kWh`} />
        <Metric label="Savings vs grid" value={`KSh ${Math.round(stats.savingsKes).toLocaleString()}`} />
        <Metric label="Solar coverage" value={`${Math.round(stats.coverage * 100)}%`} />
        {typeof stats.tokenBurnKes === "number" ? (
          <Metric label="Token burn" value={`KSh ${Math.round(stats.tokenBurnKes).toLocaleString()}`} />
        ) : null}
      </View>
    </View>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metric}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.md,
    borderColor: "rgba(150, 90, 53, 0.14)",
    borderRadius: 28,
    borderWidth: 1,
    backgroundColor: colors.white,
    padding: 16,
  },
  header: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: spacing.sm },
  eyebrow: {
    color: colors.orangeDeep,
    fontSize: typography.micro,
    fontWeight: "800",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  title: { color: colors.text, fontSize: typography.body, fontWeight: "800" },
  detailLink: { color: colors.orangeDeep, fontSize: typography.small, fontWeight: "800" },
  segmentRow: { flexDirection: "row", gap: 8 },
  segment: {
    flex: 1,
    alignItems: "center",
    borderRadius: 999,
    borderWidth: 1,
    borderColor: `${colors.orangeDeep}30`,
    paddingVertical: 8,
  },
  segmentActive: { backgroundColor: `${colors.orangeDeep}12`, borderColor: colors.orangeDeep },
  segmentText: { color: colors.muted, fontSize: 12, fontWeight: "700" },
  segmentTextActive: { color: colors.orangeDeep },
  metrics: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  metric: { width: "47%", gap: 4 },
  metricLabel: { color: colors.muted, fontSize: 11, fontWeight: "800", textTransform: "uppercase", letterSpacing: 0.6 },
  metricValue: { color: colors.text, fontSize: 17, fontWeight: "800", letterSpacing: -0.3 },
});
