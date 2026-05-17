import { StyleSheet, Text, View } from "react-native";
import { colors, officialPalette, shadows, spacing, typography } from "@emappa/ui";

export interface TokenBalanceHeroProps {
  eyebrow?: string;
  title?: string;
  subtitle?: string;
  /** Cash balance (KES) — IA dual KES + kWh hero. */
  kesLabel?: string;
  kesValue?: string;
  /** Energy allocation (kWh). */
  kwhLabel?: string;
  kwhValue?: string;
  /** @deprecated Use kwhLabel/kwhValue — kept for existing callers. */
  tokenLabel?: string;
  /** @deprecated Use kwhValue. */
  tokenValue?: string;
  disabled?: boolean;
}

export function TokenBalanceHero({
  eyebrow = "e.mappa token",
  title = "Prepaid solar allocation",
  subtitle = "Track readiness, ownership, and payout state before any allocation goes live.",
  kesLabel = "Pledged balance",
  kesValue = "KSh 0",
  kwhLabel,
  kwhValue,
  tokenLabel = "Available allocation",
  tokenValue = "0 kWh",
  disabled = false,
}: TokenBalanceHeroProps) {
  const energyLabel = kwhLabel ?? tokenLabel;
  const energyValue = kwhValue ?? tokenValue;
  return (
    <View style={styles.card}>
      <View style={styles.topRow}>
        <View style={styles.eyebrowPill}>
          <View style={styles.dot} />
          <Text style={styles.eyebrow}>{eyebrow}</Text>
        </View>
        <Text style={styles.status}>{disabled ? "pre-live" : "cash gated"}</Text>
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>
      <View style={styles.balanceRow}>
        <View style={styles.balanceCell}>
          <Text style={styles.tokenLabel}>{kesLabel}</Text>
          <Text style={styles.tokenValue}>{disabled ? "—" : kesValue}</Text>
        </View>
        <View style={styles.balanceDivider} />
        <View style={styles.balanceCell}>
          <Text style={styles.tokenLabel}>{energyLabel}</Text>
          <Text style={styles.tokenValue}>{disabled ? "—" : energyValue}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    ...shadows.card,
    gap: spacing.md,
    overflow: "hidden",
    borderRadius: 32,
    borderWidth: 1,
    borderColor: "rgba(118, 73, 39, 0.18)",
    backgroundColor: colors.white,
    padding: 22,
  },
  topRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  eyebrowPill: {
    alignItems: "center",
    alignSelf: "flex-start",
    flexDirection: "row",
    gap: 7,
    borderRadius: 999,
    backgroundColor: "rgba(255, 255, 255, 0.62)",
    borderColor: "rgba(118, 73, 39, 0.12)",
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 999,
    backgroundColor: colors.green,
  },
  eyebrow: {
    color: officialPalette.burntChestnut,
    fontSize: typography.micro,
    fontWeight: "700",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  status: {
    color: colors.dim,
    fontSize: typography.micro,
    fontWeight: "800",
    letterSpacing: 0.7,
    textTransform: "uppercase",
  },
  title: {
    color: colors.text,
    fontSize: 31,
    fontWeight: "800",
    letterSpacing: -0.9,
    lineHeight: 36,
  },
  subtitle: {
    color: colors.muted,
    fontSize: 15,
    lineHeight: 22,
  },
  balanceRow: {
    flexDirection: "row",
    alignItems: "stretch",
    gap: spacing.sm,
    borderRadius: 24,
    backgroundColor: "rgba(255, 255, 255, 0.72)",
    borderColor: "rgba(118, 73, 39, 0.12)",
    borderWidth: 1,
    padding: 14,
  },
  balanceCell: { flex: 1, gap: 3 },
  balanceDivider: {
    width: 1,
    backgroundColor: "rgba(118, 73, 39, 0.12)",
    marginVertical: 2,
  },
  tokenLabel: {
    color: colors.muted,
    fontSize: typography.micro,
    fontWeight: "700",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  tokenValue: {
    color: colors.text,
    fontSize: 24,
    fontWeight: "800",
    letterSpacing: -0.5,
    marginTop: 3,
  },
});
