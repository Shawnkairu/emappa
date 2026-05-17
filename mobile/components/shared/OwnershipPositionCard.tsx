import { StyleSheet, Text, View } from "react-native";
import { colors, officialPalette, radius, shadows, spacing, typography } from "@emappa/ui";

export type OwnershipPositionCardProps = {
  title: string;
  sharePct: number;
  valueKes?: string;
  poolLabel?: string;
  detail?: string;
  buyBackAvailable?: boolean;
};

export function OwnershipPositionCard({
  title,
  sharePct,
  valueKes,
  poolLabel,
  detail,
  buyBackAvailable = false,
}: OwnershipPositionCardProps) {
  const clamped = Math.max(0, Math.min(100, sharePct));

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title}>{title}</Text>
        {poolLabel ? <Text style={styles.pool}>{poolLabel}</Text> : null}
      </View>
      <View style={styles.metrics}>
        <Text style={styles.share}>{clamped.toFixed(1)}%</Text>
        <Text style={styles.shareCaption}>of pool</Text>
      </View>
      {valueKes ? <Text style={styles.value}>{valueKes}</Text> : null}
      {detail ? <Text style={styles.detail}>{detail}</Text> : null}
      {buyBackAvailable ? (
        <View style={styles.buyBack}>
          <Text style={styles.buyBackText}>Buy-back available at published valuation</Text>
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
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: spacing.sm },
  title: { flex: 1, color: colors.text, fontSize: typography.body, fontWeight: "800" },
  pool: {
    color: officialPalette.burntChestnut,
    fontSize: typography.micro,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  metrics: { flexDirection: "row", alignItems: "flex-end", gap: spacing.xs },
  share: { color: colors.text, fontSize: 32, fontWeight: "800", letterSpacing: -1 },
  shareCaption: { color: colors.muted, fontSize: typography.small, marginBottom: 6 },
  value: { color: officialPalette.espressoShadow, fontSize: typography.body, fontWeight: "700" },
  detail: { color: colors.muted, fontSize: typography.small, lineHeight: 18 },
  buyBack: {
    marginTop: spacing.xs,
    borderRadius: radius.sm,
    backgroundColor: officialPalette.furCream + "88",
    padding: spacing.sm,
  },
  buyBackText: { color: officialPalette.burntChestnut, fontSize: typography.micro, fontWeight: "700" },
});
