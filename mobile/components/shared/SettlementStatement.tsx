import { StyleSheet, Text, View } from "react-native";
import { colors, officialPalette, radius, shadows, spacing, typography } from "@emappa/ui";

export type SettlementLine = {
  id: string;
  label: string;
  amount: string;
  pool?: string;
};

export type SettlementStatementProps = {
  periodLabel: string;
  lines: SettlementLine[];
  totalLabel?: string;
  totalAmount?: string;
  conservative?: boolean;
};

export function SettlementStatement({
  periodLabel,
  lines,
  totalLabel = "Net to you",
  totalAmount,
  conservative = false,
}: SettlementStatementProps) {
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.period}>{periodLabel}</Text>
        {conservative ? <Text style={styles.conservative}>Conservative settle</Text> : null}
      </View>
      {lines.map((line) => (
        <View key={line.id} style={styles.row}>
          <View style={styles.copy}>
            <Text style={styles.label}>{line.label}</Text>
            {line.pool ? <Text style={styles.pool}>{line.pool}</Text> : null}
          </View>
          <Text style={styles.amount}>{line.amount}</Text>
        </View>
      ))}
      {totalAmount ? (
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>{totalLabel}</Text>
          <Text style={styles.totalAmount}>{totalAmount}</Text>
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
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: spacing.sm },
  period: { color: colors.text, fontSize: typography.body, fontWeight: "800" },
  conservative: {
    color: officialPalette.burntChestnut,
    fontSize: typography.micro,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: spacing.md,
    paddingVertical: spacing.xs,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  copy: { flex: 1, gap: 2 },
  label: { color: colors.text, fontSize: typography.small, fontWeight: "600" },
  pool: { color: colors.muted, fontSize: typography.micro },
  amount: { color: colors.text, fontSize: typography.small, fontWeight: "800" },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: spacing.xs,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: "rgba(125, 87, 52, 0.12)",
  },
  totalLabel: { color: colors.muted, fontSize: typography.small, fontWeight: "700" },
  totalAmount: { color: colors.text, fontSize: typography.body, fontWeight: "800" },
});
