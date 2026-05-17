import { StyleSheet, Text, View } from "react-native";
import type { ProjectedBuilding } from "@emappa/shared";
import { PaletteCard, Pill, colors, spacing, typography } from "@emappa/ui";
import { deriveBuildingAvailabilityState } from "./residentHomeState";

type ResidentAlert = {
  id: string;
  title: string;
  detail: string;
  severity: "info" | "warn" | "critical";
  owner: string;
  eta: string;
};

function deriveResidentAlerts(building: ProjectedBuilding): ResidentAlert[] {
  const alerts: ResidentAlert[] = [];
  const availability = deriveBuildingAvailabilityState(building);

  if (availability === "A5") {
    alerts.push({
      id: "ats-pending",
      title: "Apartment not on e.mappa supply",
      detail: "Building solar exists but your unit ATS path is not verified yet. KPLC fallback remains available.",
      severity: "warn",
      owner: "Electrician queue",
      eta: "When ATS visit completes",
    });
  }

  for (const [index, reason] of building.drs.reasons.entries()) {
    alerts.push({
      id: `drs-${index}`,
      title: "DRS blocker",
      detail: reason,
      severity: "info",
      owner: "Building owner + e.mappa ops",
      eta: "Clears when evidence uploads",
    });
  }

  const ats = building.roleViews.resident.atsActivation;
  if (ats?.status === "blocked") {
    alerts.push({
      id: "ats-blocked",
      title: "ATS activation blocked",
      detail: ats.detail,
      severity: "critical",
      owner: "Electrician",
      eta: "Resolve blocker to resume",
    });
  }

  if (alerts.length === 0) {
    alerts.push({
      id: "none",
      title: "No open incidents",
      detail: "Fallback is KPLC when solar tokens are unavailable. You will be notified when ATS or capacity status changes.",
      severity: "info",
      owner: "e.mappa monitoring",
      eta: "—",
    });
  }

  return alerts;
}

export function ResidentAlertDetail({ building }: { building: ProjectedBuilding }) {
  const alerts = deriveResidentAlerts(building);

  return (
    <View style={styles.wrap}>
      {alerts.map((alert) => (
        <PaletteCard key={alert.id} style={styles.card}>
          <View style={styles.header}>
            <Text style={styles.title}>{alert.title}</Text>
            <Pill tone={alert.severity === "critical" ? "bad" : alert.severity === "warn" ? "warn" : "neutral"}>
              {alert.severity}
            </Pill>
          </View>
          <Text style={styles.detail}>{alert.detail}</Text>
          <Text style={styles.meta}>Owner: {alert.owner}</Text>
          <Text style={styles.meta}>ETA: {alert.eta}</Text>
        </PaletteCard>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.md },
  card: { gap: spacing.sm },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.md },
  title: { color: colors.text, fontSize: typography.body, fontWeight: "800", flex: 1 },
  detail: { color: colors.muted, fontSize: typography.small, lineHeight: 20 },
  meta: { color: colors.dim, fontSize: typography.micro },
});
