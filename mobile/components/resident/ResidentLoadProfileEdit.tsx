import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import type { ProjectedBuilding } from "@emappa/shared";
import { colors, spacing, typography } from "@emappa/ui";
import { ChoiceGroup, MultiChoiceGroup, TextField } from "../../app/(onboard)/_shared";
import { PilotBanner } from "../PilotBanner";
import { LoadProfileConfidenceMeter } from "./LoadProfileConfidenceMeter";
import { LoadProfileL1Form, validateLoadProfileL1 } from "./LoadProfileL1Form";
import { type LoadProfileL1Data } from "./loadProfileTypes";
import { ResidentPrimaryButton } from "./ResidentScaffold";
import { canEditPledge } from "./residentHomeState";

const DEFAULT_L1: LoadProfileL1Data = {
  monthlyKes: 0,
  peopleInUnit: 0,
  appliances: [],
  daytimePattern: "balanced",
  receiptDeferred: true,
};

/** Scenario A §7 — L1 baseline with L2 fields surfaced for post-onboarding edit. */
export function ResidentLoadProfileEdit({ building }: { building: ProjectedBuilding }) {
  const editable = canEditPledge(building);
  const [data, setData] = useState<LoadProfileL1Data>(DEFAULT_L1);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  function save() {
    const validation = validateLoadProfileL1(data);
    if (validation) {
      setError(validation);
      return;
    }
    if (!editable) {
      setError("Load profile is locked after apartment activation unless e.mappa reopens edits.");
      return;
    }
    setError(null);
    setSaved(true);
  }

  return (
    <View style={styles.wrap}>
      <PilotBanner compact />
      <LoadProfileConfidenceMeter level={saved ? "L2" : "L1"} />
      <LoadProfileL1Form
        data={data}
        onChange={(patch) => setData((current) => ({ ...current, ...patch }))}
        TextField={TextField}
        ChoiceGroup={ChoiceGroup}
        MultiChoiceGroup={MultiChoiceGroup}
      />
      <Text style={styles.helper}>
        L2/L3 capture (nameplate photos, electrician visit) wires with POST /residents/{"{id}"}/load-profile when P1.6.3
        lands.
      </Text>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {saved ? <Text style={styles.success}>Load estimate saved for this session.</Text> : null}
      <ResidentPrimaryButton onPress={save} accessibilityLabel="Save load profile">
        {editable ? "Save load profile" : "View only — activation locked"}
      </ResidentPrimaryButton>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.md },
  helper: { color: colors.muted, fontSize: typography.small, lineHeight: 20 },
  error: { color: colors.red, fontSize: typography.small },
  success: { color: colors.green, fontSize: typography.small },
});
