import { StyleSheet, Text, View } from "react-native";
import { PaletteCard, Pill, colors, spacing, typography } from "@emappa/ui";
import { PilotBanner } from "../PilotBanner";
import { ROLE_TINT } from "./residentTint";
import { formatKes } from "./residentUtils";
import { ResidentPrimaryButton } from "./ResidentScaffold";

export type PledgeBalanceCardProps = {
  amountKes: number;
  canEdit: boolean;
  onOpenWallet: () => void;
  onEditPledge?: () => void;
};

export function PledgeBalanceCard({ amountKes, canEdit, onOpenWallet, onEditPledge }: PledgeBalanceCardProps) {
  const hasPledge = amountKes > 0;

  return (
    <PaletteCard borderRadius={32} padding={20} style={{ ...styles.card, backgroundColor: ROLE_TINT.bg }}>
      <View style={styles.top}>
        <Text style={styles.eyebrow}>Pledge balance</Text>
        <Pill tone={hasPledge ? "good" : "warn"}>{hasPledge ? "pledged" : "open"}</Pill>
      </View>
      <Text style={styles.amount}>{formatKes(amountKes)}</Text>
      <PilotBanner
        compact
        title="No money charged"
        message="Pledges are non-binding demand signals until capacity and ATS clear. No guaranteed service or returns."
      />
      <View style={styles.actions}>
        {canEdit && onEditPledge ? (
          <ResidentPrimaryButton onPress={onEditPledge} accessibilityLabel="Edit or cancel pledge">
            Edit pledge
          </ResidentPrimaryButton>
        ) : null}
        <ResidentPrimaryButton onPress={onOpenWallet} accessibilityLabel="Open wallet">
          {hasPledge ? "View wallet" : "Make a pledge"}
        </ResidentPrimaryButton>
      </View>
    </PaletteCard>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: spacing.lg, gap: spacing.md },
  top: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.md },
  eyebrow: {
    color: colors.muted,
    fontSize: typography.micro,
    fontWeight: "800",
    letterSpacing: 0.75,
    textTransform: "uppercase",
  },
  amount: {
    color: colors.text,
    fontSize: 42,
    fontWeight: "800",
    letterSpacing: -1.25,
    lineHeight: 48,
  },
  actions: { gap: spacing.sm },
});
