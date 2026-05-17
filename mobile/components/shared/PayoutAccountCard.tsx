import { StyleSheet, Text, View } from "react-native";
import { colors, officialPalette, radius, shadows, spacing, typography } from "@emappa/ui";

export type PayoutAccountStatus = "not_set" | "pending" | "verified" | "restricted";

export const PAYOUT_ACCOUNT_STATUS_LABELS: Record<PayoutAccountStatus, string> = {
  not_set: "Not set up",
  pending: "Pending verification",
  verified: "Verified",
  restricted: "Restricted",
};

export type PayoutAccountCardProps = {
  railLabel?: string;
  maskedAccount?: string;
  status: PayoutAccountStatus;
  ctaLabel?: string;
  footnote?: string;
};

export function PayoutAccountCard({
  railLabel = "M-Pesa",
  maskedAccount,
  status,
  ctaLabel,
  footnote,
}: PayoutAccountCardProps) {
  return (
    <View style={styles.card}>
      <Text style={styles.eyebrow}>Payout account</Text>
      <Text style={styles.rail}>{railLabel}</Text>
      <Text style={styles.account}>{maskedAccount ?? "—"}</Text>
      <View style={styles.statusPill}>
        <Text style={styles.statusText}>{PAYOUT_ACCOUNT_STATUS_LABELS[status]}</Text>
      </View>
      {ctaLabel && status === "not_set" ? <Text style={styles.cta}>{ctaLabel}</Text> : null}
      {footnote ? <Text style={styles.footnote}>{footnote}</Text> : null}
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
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  rail: { color: colors.text, fontSize: typography.body, fontWeight: "800" },
  account: { color: officialPalette.espressoShadow, fontSize: typography.small, fontWeight: "700" },
  statusPill: {
    alignSelf: "flex-start",
    marginTop: spacing.xs,
    borderRadius: radius.sm,
    backgroundColor: officialPalette.furCream,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  statusText: { color: officialPalette.burntChestnut, fontSize: typography.micro, fontWeight: "800" },
  cta: { color: officialPalette.foxOrange, fontSize: typography.small, fontWeight: "800", marginTop: spacing.xs },
  footnote: { color: colors.muted, fontSize: typography.micro, lineHeight: 16, marginTop: spacing.xs },
});
