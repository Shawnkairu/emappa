import { useCallback, useRef } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import type { ProjectedBuilding } from "@emappa/shared";
import { GlassCard, colors, typography } from "@emappa/ui";
import { ResidentQueueDetail } from "../../../components/resident/ResidentQueueDetail";
import { useApi } from "../../../lib/api";
import { useApiData } from "../../../lib/useApiData";
import { ActionButton, OnboardShell, StatusText, useRequiredParams } from "../_shared";

export default function ResidentCapacityCheckScreen() {
  const router = useRouter();
  const api = useApi();
  const apiRef = useRef(api);
  apiRef.current = api;
  const params = useRequiredParams<{
    buildingId: string;
    unitNumber: string;
    name: string;
    address: string;
    kind: string;
    unitCount: string;
    manualFallback?: string;
    inviteCode?: string;
    loadProfile?: string;
  }>(["buildingId", "unitNumber", "name", "address", "kind", "unitCount"]);

  const isManual = params.manualFallback === "true" || !params.buildingId;
  const load = useCallback(async () => {
    if (!params.buildingId) return null;
    return apiRef.current.getProject(params.buildingId) as Promise<ProjectedBuilding>;
  }, [params.buildingId]);
  const { data: building, error, isLoading } = useApiData(load, [params.buildingId]);

  function continueNext() {
    router.push({
      pathname: "/(onboard)/resident/first-pledge",
      params,
    });
  }

  return (
    <OnboardShell
      eyebrow="Resident"
      title="Capacity check"
      footer={
        <ActionButton
          onPress={continueNext}
          disabled={isLoading}
          accessibilityLabel="Continue to pledge or buy decision"
        >
          Continue
        </ActionButton>
      }
    >
      <GlassCard>
        <Text style={styles.helper}>
          Scenario A §6 — current system capacity may not fit every apartment in this phase. Queue position uses load
          fit, confidence, and fairness guardrails.
        </Text>
      </GlassCard>

      {isManual ? (
        <GlassCard>
          <Text style={styles.title}>Demand signal recorded</Text>
          <Text style={styles.helper}>
            Without a matched building project yet, e.mappa stores your load estimate for owner outreach. You can pledge
            interest when the building enrolls.
          </Text>
        </GlassCard>
      ) : null}

      {!isManual && isLoading ? <Text style={styles.helper}>Loading capacity projection…</Text> : null}
      {!isManual && error ? <StatusText status={error.message} tone="error" /> : null}
      {!isManual && building ? (
        <View style={styles.queue}>
          <ResidentQueueDetail building={building} />
        </View>
      ) : null}
    </OnboardShell>
  );
}

const styles = StyleSheet.create({
  helper: { color: colors.muted, fontSize: typography.small, lineHeight: 20 },
  title: { color: colors.text, fontSize: typography.title, fontWeight: "800", marginBottom: 8 },
  queue: { marginTop: 8 },
});
