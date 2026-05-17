import { StyleSheet, Text, View } from "react-native";
import { colors, officialPalette, radius, shadows, spacing, typography } from "@emappa/ui";

export type LaborCapitalClaimCardProps = {
  laborValueKes: string;
  poolSharePct: number;
  expectedPayoutKes?: string;
  status?: "draft" | "submitted" | "approved" | "paid";
  disclosure?: string;
};

const STATUS_LABELS = {
  draft: "Draft opt-in",
  submitted: "Submitted for review",
  approved: "Approved — payout pending monetized solar",
  paid: "Paid from settlement",
};

export function LaborCapitalClaimCard({
  laborValueKes,
  poolSharePct,
  expectedPayoutKes,
  status = "draft",
  disclosure = "Labor-as-capital is explicit opt-in. Payouts follow monetized solar only — no guaranteed return.",
}: LaborCapitalClaimCardProps) {
  return (
    <View style={styles.card}>
      <Text style={styles.eyebrow}>Labor-as-capital</Text>
      <Text style={styles.value}>{laborValueKes}</Text>
      <Text style={styles.share}>{poolSharePct.toFixed(1)}% of labor pool</Text>
      {expectedPayoutKes ? <Text style={styles.expected}>Expected: {expectedPayoutKes}</Text> : null}
      <View style={styles.statusPill}>
        <Text style={styles.statusText}>{STATUS_LABELS[status]}</Text>
      </View>
      <Text style={styles.disclosure}>{disclosure}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    ...shadows.card,
    gap: spacing.xs,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    padding: spacing.md,
  },
  eyebrow: {
    color: colors.muted,
    fontSize: typography.micro,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  value: { color: colors.text, fontSize: 24, fontWeight: "800", letterSpacing: -0.5 },
  share: { color: officialPalette.burntChestnut, fontSize: typography.small, fontWeight: "700" },
  expected: { color: colors.text, fontSize: typography.small, fontWeight: "700" },
  statusPill: {
    alignSelf: "flex-start",
    marginTop: spacing.xs,
    borderRadius: radius.sm,
    backgroundColor: officialPalette.furCream,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  statusText: { color: officialPalette.espressoShadow, fontSize: typography.micro, fontWeight: "800" },
  disclosure: { color: colors.muted, fontSize: typography.micro, lineHeight: 16, marginTop: spacing.sm },
});
