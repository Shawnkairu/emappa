import { useRef, useState } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";
import type { ProjectedBuilding } from "@emappa/shared";
import { colors, spacing, typography } from "@emappa/ui";
import { useApi } from "../../lib/api";
import { PilotBanner } from "../PilotBanner";
import { commitResidentPrepaid } from "./ResidentApi";
import { ResidentPrimaryButton } from "./ResidentScaffold";
import { canResidentBuyTokens } from "./residentHomeState";
import { formatKes } from "./residentUtils";

/** Scenario A §5 — real-money token purchase (post-activation only). Pilot uses prepaid commit endpoint. */
export function ResidentTokenPurchase({
  building,
  onPurchased,
}: {
  building: ProjectedBuilding;
  onPurchased?: () => void;
}) {
  const api = useApi();
  const apiRef = useRef(api);
  apiRef.current = api;
  const allowed = canResidentBuyTokens(building);
  const [amount, setAmount] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!allowed) {
    return (
      <Text style={styles.blocked}>
        Token purchase is blocked until your apartment is activated and capacity-cleared. Pre-activation pledges stay
        non-binding and do not unlock supply.
      </Text>
    );
  }

  async function purchase() {
    const amountKes = Number(amount);
    if (!Number.isFinite(amountKes) || amountKes <= 0) {
      setError("Enter an amount greater than 0 KES.");
      return;
    }
    setIsSubmitting(true);
    setError(null);
    try {
      const result = await commitResidentPrepaid(apiRef.current, building.project.id, amountKes);
      setStatus(`${formatKes(result.commitment.amountKes)} recorded — pilot ledger only until M-Pesa rails ship.`);
      onPurchased?.();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <View style={styles.wrap}>
      <PilotBanner compact />
      <Text style={styles.body}>
        Buy or top up usable solar tokens after ATS verification. Settlement follows monetized consumption only — no
        payout from wasted or curtailed energy.
      </Text>
      <Text style={styles.label}>Amount (KES)</Text>
      <TextInput
        value={amount}
        onChangeText={setAmount}
        keyboardType="numeric"
        placeholder="e.g. 2000"
        placeholderTextColor={colors.dim}
        accessibilityLabel="Token purchase amount in KES"
        style={styles.input}
      />
      <View style={styles.presets}>
        {[500, 1000, 2000, 5000].map((preset) => (
          <Text
            key={preset}
            accessibilityRole="button"
            accessibilityLabel={`Preset ${formatKes(preset)}`}
            onPress={() => setAmount(String(preset))}
            style={styles.preset}
          >
            {formatKes(preset)}
          </Text>
        ))}
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {status ? <Text style={styles.success}>{status}</Text> : null}
      <ResidentPrimaryButton
        onPress={purchase}
        accessibilityLabel={isSubmitting ? "Processing token purchase" : "Confirm token purchase"}
      >
        {isSubmitting ? "Processing…" : "Confirm purchase"}
      </ResidentPrimaryButton>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.md },
  body: { color: colors.muted, fontSize: typography.small, lineHeight: 21 },
  blocked: { color: colors.muted, fontSize: typography.small, lineHeight: 21 },
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
  presets: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  preset: {
    borderColor: colors.border,
    borderRadius: 999,
    borderWidth: 1,
    color: colors.orangeDeep,
    fontSize: typography.small,
    fontWeight: "800",
    overflow: "hidden",
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  error: { color: colors.red, fontSize: typography.small },
  success: { color: colors.green, fontSize: typography.small },
});
