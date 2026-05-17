import { useRouter } from "expo-router";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import type { ProjectedBuilding } from "@emappa/shared";
import { AppMark, colors, spacing, typography } from "@emappa/ui";
import { DRSProgressCard, PilotBanner } from "../shared";
import { ResidentPrimaryButton, ResidentScreenFrame } from "./ResidentScaffold";
import { canResidentBuyTokens } from "./residentHomeState";

export type ResidentEmbeddedKind =
  | "pledge-detail"
  | "queue-detail"
  | "ats-detail"
  | "marketplace"
  | "load-profile-edit"
  | "drs-detail"
  | "token-purchase"
  | "alert-detail";

const TITLES: Record<ResidentEmbeddedKind, string> = {
  "pledge-detail": "Pledge detail",
  "queue-detail": "Capacity queue",
  "ats-detail": "ATS status",
  marketplace: "Ownership marketplace",
  "load-profile-edit": "Load profile",
  "drs-detail": "Deployment readiness",
  "token-purchase": "Buy tokens",
  "alert-detail": "Alert detail",
};

export function ResidentEmbeddedScreen({ kind }: { kind: ResidentEmbeddedKind }) {
  const router = useRouter();

  return (
    <ResidentScreenFrame section="Resident" title={TITLES[kind]} subtitle="Embedded flow — pilot shell.">
      {(building) => (
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.header}>
            <ResidentPrimaryButton onPress={() => router.back()} accessibilityLabel="Go back">
              Back
            </ResidentPrimaryButton>
            <AppMark size={40} />
          </View>
          <PilotBanner compact />
          <EmbeddedBody kind={kind} building={building} />
        </ScrollView>
      )}
    </ResidentScreenFrame>
  );
}

function EmbeddedBody({ kind, building }: { kind: ResidentEmbeddedKind; building: ProjectedBuilding }) {
  if (kind === "drs-detail") {
    return <DRSProgressCard drs={building.drs} />;
  }

  if (kind === "token-purchase") {
    if (!canResidentBuyTokens(building)) {
      return (
        <Text style={styles.body}>
          Token purchase is blocked until your apartment is activated and capacity-cleared. Pre-activation pledges stay
          non-binding.
        </Text>
      );
    }
    return (
      <Text style={styles.body}>
        Real-money token purchase shell — post-activation only. Amount presets and M-Pesa rails wire with P1.6.2 split
        endpoints. No guaranteed returns.
      </Text>
    );
  }

  if (kind === "pledge-detail") {
    return (
      <Text style={styles.body}>
        Edit or cancel your pledge before activation. No money is charged in pilot. Pledge does not guarantee service.
      </Text>
    );
  }

  if (kind === "queue-detail" || kind === "marketplace") {
    return (
      <Text style={styles.body}>
        Open the dedicated embedded route for {TITLES[kind].toLowerCase()} — this shell remains for legacy deep links.
      </Text>
    );
  }

  return <Text style={styles.body}>{TITLES[kind]} — ATS machine and alerts wire in P1.2 follow-ups.</Text>;
}

const styles = StyleSheet.create({
  content: { paddingBottom: spacing.xl, gap: spacing.md },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: spacing.md },
  body: { color: colors.muted, fontSize: typography.small, lineHeight: 21 },
});
