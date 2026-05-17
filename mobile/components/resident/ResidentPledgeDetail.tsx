import { useCallback, useRef, useState } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";
import type { ProjectedBuilding } from "@emappa/shared";
import { colors, spacing, typography } from "@emappa/ui";
import { useApi } from "../../lib/api";
import { useApiData } from "../../lib/useApiData";
import { PilotBanner } from "../PilotBanner";
import { PledgeHistoryList } from "./PledgeHistoryList";
import { commitResidentPrepaid, getResidentPrepaidHistory } from "./ResidentApi";
import { ResidentPrimaryButton } from "./ResidentScaffold";
import { canEditPledge } from "./residentHomeState";
import { formatKes } from "./residentUtils";

export function ResidentPledgeDetail({ building }: { building: ProjectedBuilding }) {
  const api = useApi();
  const apiRef = useRef(api);
  apiRef.current = api;
  const editable = canEditPledge(building);
  const [amount, setAmount] = useState("1000");
  const [status, setStatus] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const load = useCallback(
    () => getResidentPrepaidHistory(apiRef.current, building.project.id),
    [building.project.id],
  );
  const { data: history, refetch } = useApiData(load, [building.project.id]);

  async function adjustPledge() {
    if (!editable) return;
    const amountKes = Number(amount);
    if (!Number.isFinite(amountKes) || amountKes <= 0) {
      setActionError("Enter a pledge amount greater than 0 KES.");
      return;
    }
    setIsSubmitting(true);
    setActionError(null);
    try {
      const result = await commitResidentPrepaid(apiRef.current, building.project.id, amountKes);
      setStatus(`${formatKes(result.commitment.amountKes)} pledge ${result.commitment.status}.`);
      refetch();
    } catch (cause) {
      setActionError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <View style={styles.wrap}>
      <PilotBanner compact />
      <Text style={styles.body}>
        Scenario A §5 — pledges are non-binding demand signals. No money is charged in pilot. Edit or increase before
        activation; cancel by pledging zero through support until cancel API ships.
      </Text>
      {editable ? (
        <View style={styles.editRow}>
          <Text style={styles.label}>Adjust pledge (KES)</Text>
          <TextInput
            value={amount}
            onChangeText={setAmount}
            keyboardType="numeric"
            placeholder="1000"
            placeholderTextColor={colors.dim}
            accessibilityLabel="Pledge amount in KES"
            style={styles.input}
          />
          <ResidentPrimaryButton
            onPress={adjustPledge}
            accessibilityLabel={isSubmitting ? "Updating pledge" : "Update pledge amount"}
          >
            {isSubmitting ? "Saving…" : "Update pledge"}
          </ResidentPrimaryButton>
        </View>
      ) : (
        <Text style={styles.locked}>Post-activation: use Buy tokens for real-money purchases. Pledges are frozen.</Text>
      )}
      <StatusText message={status} tone="success" />
      <StatusText message={actionError} tone="error" />
      <PledgeHistoryList history={history ?? []} />
    </View>
  );
}

function StatusText({ message, tone }: { message: string | null; tone: "success" | "error" }) {
  if (!message) return null;
  return <Text style={tone === "error" ? styles.error : styles.success}>{message}</Text>;
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.md },
  body: { color: colors.muted, fontSize: typography.small, lineHeight: 21 },
  editRow: { gap: spacing.sm },
  label: { color: colors.muted, fontSize: typography.micro, fontWeight: "800", textTransform: "uppercase" },
  input: {
    borderColor: colors.border,
    borderRadius: 14,
    borderWidth: 1,
    color: colors.text,
    fontSize: typography.body,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  locked: { color: colors.muted, fontSize: typography.small, lineHeight: 20 },
  error: { color: colors.red, fontSize: typography.small },
  success: { color: colors.green, fontSize: typography.small },
});
