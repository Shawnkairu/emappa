import { StyleSheet, Text, View } from "react-native";
import type { PrepaidCommitment } from "@emappa/shared";
import { PaletteCard, Pill, colors, spacing, typography } from "@emappa/ui";
import { formatKes } from "./residentUtils";

export type PledgeHistoryListProps = {
  history: PrepaidCommitment[];
  onSelectPledge?: (pledge: PrepaidCommitment) => void;
};

/** IA §Resident Wallet — chronological pledge history with active / cancelled / archived pills. */
export function PledgeHistoryList({ history, onSelectPledge }: PledgeHistoryListProps) {
  return (
    <PaletteCard style={styles.card}>
      <Text style={styles.title}>Pledge history</Text>
      {history.length === 0 ? <Text style={styles.empty}>No pledges yet.</Text> : null}
      {history.map((item) => {
        const pill = pledgeStatusPill(item.status);
        const row = (
          <View style={styles.row}>
            <View style={styles.meta}>
              <Text style={styles.amount}>{formatKes(item.amountKes)}</Text>
              <Text style={styles.date}>{new Date(item.createdAt).toLocaleDateString()}</Text>
            </View>
            <Pill tone={pill.tone}>{pill.label}</Pill>
          </View>
        );

        if (!onSelectPledge) {
          return (
            <View key={item.id} style={styles.rowWrap}>
              {row}
            </View>
          );
        }

        return (
          <Text
            key={item.id}
            accessibilityRole="button"
            accessibilityLabel={`Pledge ${formatKes(item.amountKes)}, ${pill.label}`}
            onPress={() => onSelectPledge(item)}
            style={styles.rowWrap}
          >
            {row}
          </Text>
        );
      })}
    </PaletteCard>
  );
}

function pledgeStatusPill(status: PrepaidCommitment["status"]) {
  if (status === "confirmed") {
    return { label: "active", tone: "good" as const };
  }
  if (status === "failed") {
    return { label: "archived", tone: "bad" as const };
  }
  return { label: "active", tone: "warn" as const };
}

const styles = StyleSheet.create({
  card: { marginBottom: spacing.lg },
  title: { color: colors.text, fontSize: typography.title, fontWeight: "800", marginBottom: spacing.sm },
  rowWrap: { borderTopColor: colors.border, borderTopWidth: StyleSheet.hairlineWidth },
  row: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    gap: spacing.md,
    paddingVertical: 11,
  },
  meta: { flex: 1 },
  amount: { color: colors.text, fontSize: typography.small, fontWeight: "800" },
  date: { color: colors.muted, fontSize: typography.micro, marginTop: 3 },
  empty: { color: colors.muted, fontSize: typography.small, lineHeight: 20 },
});
