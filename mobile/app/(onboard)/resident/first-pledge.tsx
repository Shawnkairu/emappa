import { useCallback, useRef, useState } from "react";
import { Text, View } from "react-native";
import type { ProjectedBuilding } from "@emappa/shared";
import { GlassCard } from "@emappa/ui";
import { ResidentTokenPurchase } from "../../../components/resident/ResidentTokenPurchase";
import { canResidentBuyTokens } from "../../../components/resident/residentHomeState";
import { useApi } from "../../../lib/api";
import { useApiData } from "../../../lib/useApiData";
import { PilotBanner } from "../../../components/PilotBanner";
import {
  ActionButton,
  OnboardShell,
  PledgeStep,
  StatusText,
  styles,
  useFinishOnboarding,
  useRequiredParams,
  type CompleteBody,
} from "../_shared";

export default function ResidentFirstPledgeScreen() {
  const params = useRequiredParams<{
    buildingId: string;
    unitNumber: string;
    name?: string;
    address?: string;
    kind?: string;
    unitCount?: string;
    manualFallback?: string;
    inviteCode?: string;
    loadProfile?: string;
  }>(["buildingId", "unitNumber"]);

  const completeBody = buildCompleteBody(params);
  const isManual = params.manualFallback === "true" || !params.buildingId;

  if (isManual) {
    return <PledgeStep role="resident" destination="/(resident)/home" buildingId="" completeBody={completeBody} />;
  }

  return <ResidentActivationBranch buildingId={params.buildingId} completeBody={completeBody} />;
}

function buildCompleteBody(params: {
  unitNumber: string;
  loadProfile?: string;
  inviteCode?: string;
  manualFallback?: string;
  name?: string;
  address?: string;
}): CompleteBody {
  let parsedLoad: Record<string, unknown> | undefined;
  if (params.loadProfile) {
    try {
      parsedLoad = JSON.parse(params.loadProfile) as Record<string, unknown>;
    } catch {
      parsedLoad = undefined;
    }
  }

  return {
    profile: {
      unitNumber: params.unitNumber,
      ...(params.inviteCode ? { inviteCode: params.inviteCode } : {}),
      ...(params.manualFallback === "true"
        ? { manualFallback: true, buildingName: params.name, buildingAddress: params.address }
        : {}),
      ...(parsedLoad ? { loadProfile: parsedLoad } : {}),
    },
  };
}

function ResidentActivationBranch({
  buildingId,
  completeBody,
}: {
  buildingId: string;
  completeBody: CompleteBody;
}) {
  const api = useApi();
  const apiRef = useRef(api);
  apiRef.current = api;
  const load = useCallback(async () => apiRef.current.getProject(buildingId) as Promise<ProjectedBuilding>, [buildingId]);
  const { data: building, error, isLoading } = useApiData(load, [buildingId]);

  if (isLoading) {
    return (
      <OnboardShell eyebrow="Resident" title="Pledge or buy">
        <Text style={styles.helper}>Checking whether your apartment can buy tokens yet…</Text>
      </OnboardShell>
    );
  }

  if (error || !building) {
    return (
      <OnboardShell eyebrow="Resident" title="Pledge solar tokens">
        <StatusText status={error?.message ?? "Building unavailable"} tone="error" />
        <PledgeStep role="resident" destination="/(resident)/home" buildingId={buildingId} completeBody={completeBody} />
      </OnboardShell>
    );
  }

  if (canResidentBuyTokens(building)) {
    return <ResidentBuyTokensOnboard building={building} completeBody={completeBody} />;
  }

  return <PledgeStep role="resident" destination="/(resident)/home" buildingId={buildingId} completeBody={completeBody} />;
}

function ResidentBuyTokensOnboard({
  building,
  completeBody,
}: {
  building: ProjectedBuilding;
  completeBody: CompleteBody;
}) {
  const { finish, isSubmitting, error } = useFinishOnboarding("resident", "/(resident)/home");
  const [purchased, setPurchased] = useState(false);

  return (
    <OnboardShell
      eyebrow="Resident"
      title="Buy solar tokens"
      footer={
        <View style={{ gap: 10 }}>
          <ActionButton
            onPress={() => finish(completeBody)}
            variant="secondary"
            disabled={isSubmitting}
            accessibilityLabel="Skip token purchase for now"
          >
            {isSubmitting ? "Finishing…" : "Skip for now"}
          </ActionButton>
        </View>
      }
    >
      <PilotBanner
        title="Apartment live"
        message="ATS verified — purchases unlock usable supply. Settlement follows monetized consumption only."
      />
      <GlassCard>
        <ResidentTokenPurchase
          building={building}
          onPurchased={() => {
            setPurchased(true);
            void finish(completeBody);
          }}
        />
      </GlassCard>
      {purchased ? <StatusText status="Purchase recorded. Opening home…" tone="success" /> : null}
      <StatusText status={error} tone="error" />
    </OnboardShell>
  );
}
