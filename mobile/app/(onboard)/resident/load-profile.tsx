import { useState } from "react";
import { useRouter } from "expo-router";
import { LoadProfileL1Form, validateLoadProfileL1 } from "../../../components/resident/LoadProfileL1Form";
import { loadProfileToProfilePayload, type LoadProfileL1Data } from "../../../components/resident/loadProfileTypes";
import {
  ActionButton,
  ChoiceGroup,
  MultiChoiceGroup,
  OnboardShell,
  StatusText,
  TextField,
  useRequiredParams,
} from "../_shared";

const INITIAL: LoadProfileL1Data = {
  monthlyKes: 0,
  peopleInUnit: 0,
  appliances: [],
  daytimePattern: "balanced",
  receiptDeferred: true,
};

export default function ResidentLoadProfileScreen() {
  const router = useRouter();
  const params = useRequiredParams<{
    buildingId: string;
    unitNumber: string;
    name: string;
    address: string;
    kind: string;
    unitCount: string;
    manualFallback?: string;
    inviteCode?: string;
  }>(["buildingId", "unitNumber", "name", "address", "kind", "unitCount"]);

  const [data, setData] = useState<LoadProfileL1Data>(INITIAL);
  const [error, setError] = useState<string | null>(null);

  function continueNext() {
    const validation = validateLoadProfileL1(data);
    if (validation) {
      setError(validation);
      return;
    }
    setError(null);
    router.push({
      pathname: "/(onboard)/resident/capacity-check",
      params: {
        ...params,
        loadProfile: JSON.stringify(loadProfileToProfilePayload(data).loadProfile),
      },
    });
  }

  return (
    <OnboardShell
      eyebrow="Resident"
      title="Fast load estimate"
      footer={
        <ActionButton onPress={continueNext} accessibilityLabel="Continue to capacity check">
          Continue
        </ActionButton>
      }
    >
      <LoadProfileL1Form
        data={data}
        onChange={(patch) => setData((current) => ({ ...current, ...patch }))}
        TextField={TextField}
        ChoiceGroup={ChoiceGroup}
        MultiChoiceGroup={MultiChoiceGroup}
      />
      <StatusText status={error} tone="error" />
    </OnboardShell>
  );
}
