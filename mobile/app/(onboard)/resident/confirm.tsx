import { Text } from "react-native";
import { useRouter } from "expo-router";
import { GlassCard } from "@emappa/ui";
import { ActionButton, OnboardShell, useRequiredParams, styles } from "../_shared";

export default function ResidentConfirmBuildingScreen() {
  const router = useRouter();
  const { buildingId, name, address, kind, unitCount, unitNumber, manualFallback, inviteCode } = useRequiredParams<{
    buildingId: string;
    name: string;
    address: string;
    kind: string;
    unitCount: string;
    unitNumber: string;
    manualFallback?: string;
    inviteCode?: string;
  }>(["buildingId", "name", "address", "kind", "unitCount", "unitNumber"]);

  const isManual = manualFallback === "true" || !buildingId;

  return (
    <OnboardShell
      eyebrow="Resident"
      title="Confirm your building"
      footer={
        <>
          <ActionButton
            onPress={() => {
              if (buildingId) {
                router.push({
                  pathname: "/(onboard)/resident/load-profile",
                  params: {
                    buildingId,
                    unitNumber,
                    name,
                    address,
                    kind,
                    unitCount,
                    ...(inviteCode ? { inviteCode } : {}),
                  },
                });
                return;
              }
              router.push({
                pathname: "/(onboard)/resident/load-profile",
                params: {
                  buildingId: "",
                  unitNumber,
                  name,
                  address,
                  kind,
                  unitCount,
                  manualFallback: "true",
                },
              });
            }}
            accessibilityLabel="Confirm this is my building"
          >
            This is my building
          </ActionButton>
          <ActionButton onPress={() => router.replace("/(onboard)/resident")} variant="secondary" accessibilityLabel="Go back, wrong building">
            Wrong building
          </ActionButton>
        </>
      }
    >
      <GlassCard>
        <Text style={styles.cardTitle}>{name}</Text>
        <Text style={styles.helper}>{address}</Text>
        <Text style={styles.helper}>
          Unit {unitNumber}
          {inviteCode ? ` · invite ${inviteCode}` : ""}
        </Text>
        <Text style={styles.helper}>
          {kind.replace("_", " ")} · {unitCount === "—" ? "units unknown" : `${Number(unitCount).toLocaleString()} units`}
        </Text>
        <Text style={styles.helper}>
          {isManual
            ? "Manual fallback recorded. e.mappa will classify whether this building is not found, organizing, or live once owner data exists."
            : "Confirm this is the building where your apartment will participate. Non-participating units remain on KPLC only."}
        </Text>
      </GlassCard>
    </OnboardShell>
  );
}
