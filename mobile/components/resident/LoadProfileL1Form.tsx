import type { ReactElement } from "react";
import { StyleSheet, Text } from "react-native";
import { GlassCard, colors } from "@emappa/ui";
import {
  APPLIANCE_OPTIONS,
  type ApplianceId,
  type DaytimePattern,
  type LoadProfileL1Data,
} from "./loadProfileTypes";

type SharedFieldProps = {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  keyboardType?: "default" | "number-pad";
};

type SharedChoiceProps<T extends string> = {
  label: string;
  value: T;
  options: Array<{ label: string; value: T; detail?: string }>;
  onChange: (value: T) => void;
};

type SharedMultiProps<T extends string> = {
  label: string;
  values: T[];
  options: Array<{ label: string; value: T }>;
  onChange: (values: T[]) => void;
};

export function LoadProfileL1Form({
  data,
  onChange,
  TextField,
  ChoiceGroup,
  MultiChoiceGroup,
}: {
  data: LoadProfileL1Data;
  onChange: (patch: Partial<LoadProfileL1Data>) => void;
  TextField: (props: SharedFieldProps) => ReactElement;
  ChoiceGroup: <T extends string>(props: SharedChoiceProps<T>) => ReactElement;
  MultiChoiceGroup: <T extends string>(props: SharedMultiProps<T>) => ReactElement;
}) {
  return (
    <>
      <GlassCard>
        <TextField
          label="Current KPLC spend (KES / month)"
          value={data.monthlyKes > 0 ? String(data.monthlyKes) : ""}
          onChangeText={(value) => onChange({ monthlyKes: Number(value.replace(/\D/g, "")) || 0 })}
          placeholder="e.g. 4500"
          keyboardType="number-pad"
        />
        <TextField
          label="People in your unit"
          value={data.peopleInUnit > 0 ? String(data.peopleInUnit) : ""}
          onChangeText={(value) => onChange({ peopleInUnit: Number(value.replace(/\D/g, "")) || 0 })}
          placeholder="e.g. 3"
          keyboardType="number-pad"
        />
        <Text style={styles.helper}>
          Scenario A §7 — fast estimate only. Improves capacity fit and queue priority; not an engineering audit.
        </Text>
      </GlassCard>

      <GlassCard>
        <MultiChoiceGroup<ApplianceId>
          label="Major appliances"
          values={data.appliances}
          options={APPLIANCE_OPTIONS}
          onChange={(appliances) => onChange({ appliances })}
        />
      </GlassCard>

      <GlassCard>
        <ChoiceGroup<DaytimePattern>
          label="When do you use most power?"
          value={data.daytimePattern}
          onChange={(daytimePattern) => onChange({ daytimePattern })}
          options={[
            { label: "Mostly daytime", value: "mostly_day", detail: "Office hours, laundry midday." },
            { label: "Balanced", value: "balanced", detail: "Spread across day and evening." },
            { label: "Mostly evening", value: "mostly_evening", detail: "Cooking and AC after work." },
          ]}
        />
      </GlassCard>

      <GlassCard>
        <ChoiceGroup<"later" | "skip">
          label="KPLC receipt photo (optional)"
          value={data.receiptDeferred ? "later" : "skip"}
          onChange={(choice) => onChange({ receiptDeferred: choice === "later" })}
          options={[
            { label: "Add in Profile later", value: "later", detail: "Raises confidence to L2 without blocking onboarding." },
            { label: "Skip for now", value: "skip" },
          ]}
        />
      </GlassCard>
    </>
  );
}

export function validateLoadProfileL1(data: LoadProfileL1Data): string | null {
  if (!Number.isFinite(data.monthlyKes) || data.monthlyKes <= 0) {
    return "Enter your approximate monthly KPLC spend in KES.";
  }
  if (!Number.isFinite(data.peopleInUnit) || data.peopleInUnit <= 0) {
    return "Enter how many people live in your unit.";
  }
  if (data.appliances.length === 0) {
    return "Select at least one major appliance category.";
  }
  return null;
}

const styles = StyleSheet.create({
  helper: { color: colors.muted, fontSize: 13, lineHeight: 20, marginTop: 10 },
});
