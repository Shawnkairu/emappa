import { Pressable, StyleSheet, Text, View } from "react-native";
import { generationVisibilityForRole } from "@emappa/shared";
import { colors, officialPalette, spacing, typography } from "@emappa/ui";
import { EnergyFlowChart, type EnergyFlowSegment } from "./EnergyFlowChart";
import { GenerationChart } from "./GenerationChart";
import { SyntheticBadge, type SyntheticMode } from "./SyntheticBadge";

export type GenerationPanelProps = {
  todayKwh: number;
  periodKwh?: number;
  retainedSharePct: number;
  hourlyGeneration?: number[];
  syntheticMode?: SyntheticMode;
  alwaysVisible?: boolean;
  hasShares?: boolean;
  onOwnershipPress?: () => void;
};

export function GenerationPanel({
  todayKwh,
  periodKwh,
  retainedSharePct,
  hourlyGeneration = [],
  syntheticMode = "mixed",
  alwaysVisible = false,
  hasShares = true,
  onOwnershipPress,
}: GenerationPanelProps) {
  const visibility = alwaysVisible
    ? generationVisibilityForRole("homeowner")
    : generationVisibilityForRole("resident", { shareOwnershipPct: hasShares ? 1 : 0 });

  if (!visibility.visible) {
    return (
      <View style={styles.card}>
        <Text style={styles.eyebrow}>Generation</Text>
        <Text style={styles.title}>Buy a share to see live generation</Text>
        <Text style={styles.body}>
          Generation visibility is gated by share ownership. Energy flow above still reflects your prepaid allocation; array-level
          detail appears once you hold a provider-side share.
        </Text>
      </View>
    );
  }

  const monthKwh = periodKwh ?? todayKwh * 30;
  const segments: EnergyFlowSegment[] = [
    { key: "gen", label: "Today generation", kwh: todayKwh, color: officialPalette.foxOrange },
    { key: "month", label: "30-day generation", kwh: monthKwh, color: officialPalette.rustBrown },
    { key: "sold", label: "Monetized (today)", kwh: Math.min(todayKwh, monthKwh / 30), color: officialPalette.softCinnamon },
  ];

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.headerCopy}>
          <Text style={styles.eyebrow}>Generation</Text>
          <Text style={styles.title}>Array generation & retained share</Text>
        </View>
        <SyntheticBadge mode={syntheticMode} />
      </View>

      {hourlyGeneration.length > 0 ? (
        <GenerationChart title="24h profile" values={hourlyGeneration} synthetic={syntheticMode !== "mixed"} />
      ) : null}

      <EnergyFlowChart title="Settlement basis" segments={segments} synthetic />

      <View style={styles.ledger}>
        <LedgerRow label="Today generation" value={`${todayKwh.toFixed(1)} kWh`} note="home rooftop path" />
        <LedgerRow label="30-day generation" value={`${monthKwh.toFixed(0)} kWh`} note="pilot series" />
        <LedgerRow
          label="Retained share"
          value={`${Math.round(retainedSharePct * 100)}%`}
          note={alwaysVisible ? "homeowner rooftop visibility" : "share-gated view"}
        />
      </View>

      {onOwnershipPress ? (
        <Pressable accessibilityRole="button" onPress={onOwnershipPress} style={styles.link}>
          <Text style={styles.linkText}>View ownership split</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function LedgerRow({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <View style={styles.ledgerRow}>
      <View style={styles.ledgerCopy}>
        <Text style={styles.ledgerLabel}>{label}</Text>
        <Text style={styles.ledgerNote}>{note}</Text>
      </View>
      <Text style={styles.ledgerValue}>{value}</Text>
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
  headerCopy: { flex: 1, gap: 4 },
  eyebrow: {
    color: colors.orangeDeep,
    fontSize: typography.micro,
    fontWeight: "800",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  title: { color: colors.text, fontSize: typography.body, fontWeight: "800", letterSpacing: -0.3 },
  body: { color: colors.muted, fontSize: typography.small, lineHeight: 20 },
  ledger: { gap: spacing.sm },
  ledgerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.sm },
  ledgerCopy: { flex: 1, gap: 2 },
  ledgerLabel: { color: colors.text, fontSize: typography.small, fontWeight: "700" },
  ledgerNote: { color: colors.muted, fontSize: typography.micro, lineHeight: 16 },
  ledgerValue: { color: colors.text, fontSize: typography.small, fontWeight: "800" },
  link: { alignSelf: "flex-start", paddingVertical: 4 },
  linkText: { color: colors.orangeDeep, fontSize: typography.small, fontWeight: "800" },
});
