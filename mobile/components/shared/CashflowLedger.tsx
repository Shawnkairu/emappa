import { StyleSheet, Text, View } from "react-native";
import { colors, spacing, typography } from "@emappa/ui";

export type CashflowLedgerRow = {
  id: string;
  label: string;
  amount: string;
  note?: string;
  tone?: "in" | "out" | "neutral";
};

export type CashflowLedgerProps = {
  title?: string;
  rows: CashflowLedgerRow[];
  footer?: string;
};

export function CashflowLedger({ title, rows, footer }: CashflowLedgerProps) {
  return (
    <View style={styles.card}>
      {title ? <Text style={styles.title}>{title}</Text> : null}
      {rows.map((row) => (
        <View key={row.id} style={styles.row}>
          <View style={styles.copy}>
            <Text style={styles.label}>{row.label}</Text>
            {row.note ? <Text style={styles.note}>{row.note}</Text> : null}
          </View>
          <Text
            style={[
              styles.amount,
              row.tone === "in" && styles.amountIn,
              row.tone === "out" && styles.amountOut,
            ]}
          >
            {row.amount}
          </Text>
        </View>
      ))}
      {footer ? <Text style={styles.footer}>{footer}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.sm },
  title: { color: colors.text, fontSize: typography.body, fontWeight: "800" },
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: spacing.md,
    paddingVertical: spacing.xs,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  copy: { flex: 1, gap: 2 },
  label: { color: colors.text, fontSize: typography.small, fontWeight: "600" },
  note: { color: colors.muted, fontSize: typography.micro, lineHeight: 15 },
  amount: { color: colors.text, fontSize: typography.small, fontWeight: "800" },
  amountIn: { color: colors.green },
  amountOut: { color: colors.red },
  footer: { color: colors.muted, fontSize: typography.micro, lineHeight: 16, marginTop: spacing.xs },
});
