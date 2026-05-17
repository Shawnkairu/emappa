import { StyleSheet, Text, View } from "react-native";
import type { ProjectedBuilding } from "@emappa/shared";
import { PaletteCard, colors, officialPalette, spacing, typography } from "@emappa/ui";
import { CapacityQueueStatusPill, SyntheticBadge } from "../shared";
import { deriveCapacityQueueStatus, deriveBuildingAvailabilityState } from "./residentHomeState";
import { ResidentMetricGrid } from "./ResidentScaffold";
import { formatPercent } from "./residentUtils";

type PriorityFactorId = "timestamp" | "load_fit" | "confidence" | "access" | "equity";

const FACTOR_COPY: Record<PriorityFactorId, { title: string; why: string }> = {
  timestamp: {
    title: "Timestamp",
    why: "Primary tie-breaker — first-come, first-served fairness.",
  },
  load_fit: {
    title: "Load fit",
    why: "Residents whose load fits phase capacity and improves utilization can clear sooner.",
  },
  confidence: {
    title: "Load-profile confidence",
    why: "Verified or high-confidence estimates rank above vague estimates.",
  },
  access: {
    title: "Owner / inspection readiness",
    why: "Units that can be accessed and wired safely may move faster.",
  },
  equity: {
    title: "Equity guardrail",
    why: "Reserve slots for smaller basic loads — not only high-income households.",
  },
};

/** Scenario A §6.3 — capacity queue position and priority factors (pilot-derived). */
export function ResidentQueueDetail({ building }: { building: ProjectedBuilding }) {
  const queue = building.roleViews.resident.capacityQueue;
  const queueStatus = deriveCapacityQueueStatus(building);
  const availability = deriveBuildingAvailabilityState(building);
  const view = building.roleViews.resident;
  const factors = derivePriorityFactors(building);

  return (
    <View style={styles.wrap}>
      <SyntheticBadge label="Pilot queue · illustrative priority until P1.6.4 API" mode="projected" source="pilot" />
      <View style={styles.pillRow}>
        <CapacityQueueStatusPill status={queueStatus} />
      </View>
      <PaletteCard style={styles.hero}>
        <Text style={styles.eyebrow}>Your position</Text>
        <Text style={styles.position}>{queue?.position != null ? `#${queue.position}` : "—"}</Text>
        <Text style={styles.detail}>
          {queue?.detail ?? "Current system capacity may not fit every apartment in this phase."}
        </Text>
      </PaletteCard>
      <ResidentMetricGrid
        items={[
          {
            label: "Building",
            value: availability,
            detail: `${building.project.name} · ${building.project.units} units`,
            tone: availability === "A6" ? "good" : "warn",
          },
          {
            label: "Load fit",
            value: formatPercent(view.solarCoverage),
            detail: `${view.monthlySolarKwh.toFixed(0)} kWh/mo estimated path`,
            tone: view.solarCoverage >= 0.5 ? "good" : "warn",
          },
          {
            label: "DRS",
            value: String(building.drs.score),
            detail: building.drs.reasons[0] ?? "Readiness evidence",
            tone: building.drs.score >= 60 ? "good" : "warn",
          },
          {
            label: "ATS",
            value: view.atsActivation?.status ?? "pending",
            detail: view.atsActivation?.detail ?? "Apartment switching not verified yet.",
            tone: view.atsActivation?.status === "ready" ? "good" : "neutral",
          },
        ]}
      />
      <Text style={styles.sectionTitle}>Priority factors</Text>
      <Text style={styles.sectionLead}>
        First-come, first-served is the default, tempered by technical fit so early residents do not consume all capacity
        with poor timing or oversized loads.
      </Text>
      {factors.map((factor) => (
        <PaletteCard key={factor.id} style={styles.factorCard}>
          <View style={styles.factorHeader}>
            <Text style={styles.factorTitle}>{FACTOR_COPY[factor.id].title}</Text>
            <Text style={styles.factorScore}>{factor.scoreLabel}</Text>
          </View>
          <View style={styles.factorTrack}>
            <View style={[styles.factorFill, { width: `${factor.score * 100}%` }]} />
          </View>
          <Text style={styles.factorWhy}>{FACTOR_COPY[factor.id].why}</Text>
          <Text style={styles.factorNote}>{factor.note}</Text>
        </PaletteCard>
      ))}
    </View>
  );
}

function derivePriorityFactors(building: ProjectedBuilding) {
  const queue = building.roleViews.resident.capacityQueue;
  const view = building.roleViews.resident;
  const position = queue?.position ?? 12;
  const timestampScore = Math.max(0.15, 1 - position / 20);
  const loadFitScore = Math.min(1, Math.max(0.2, view.solarCoverage));
  const confidenceScore = Math.min(1, building.drs.components.loadProfile / 100);
  const atsStatus = view.atsActivation?.status;
  const accessScore = atsStatus === "ready" ? 0.95 : atsStatus === "in_review" ? 0.65 : 0.35;
  const equityScore = 0.7;

  return [
    {
      id: "timestamp" as const,
      score: timestampScore,
      scoreLabel: position <= 5 ? "Early" : position <= 12 ? "Mid" : "Later",
      note: `Joined queue evidence · position ${position}.`,
    },
    {
      id: "load_fit" as const,
      score: loadFitScore,
      scoreLabel: loadFitScore >= 0.6 ? "Strong fit" : "Review",
      note: `${view.monthlySolarKwh.toFixed(0)} kWh/mo vs phase capacity.`,
    },
    {
      id: "confidence" as const,
      score: confidenceScore,
      scoreLabel: confidenceScore >= 0.7 ? "L2+" : "L1",
      note: "Improve with appliance checklist and receipt photo.",
    },
    {
      id: "access" as const,
      score: accessScore,
      scoreLabel: view.atsActivation?.status === "ready" ? "Ready" : "Pending access",
      note: view.atsActivation?.detail ?? "Owner permission and safe wiring still required.",
    },
    {
      id: "equity" as const,
      score: equityScore,
      scoreLabel: "Guardrail on",
      note: "Smaller basic loads may reserve capacity slots in later phases.",
    },
  ];
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.md },
  pillRow: { marginBottom: spacing.xs },
  hero: { gap: spacing.xs, marginBottom: spacing.sm },
  eyebrow: {
    color: colors.muted,
    fontSize: typography.micro,
    fontWeight: "800",
    letterSpacing: 0.7,
    textTransform: "uppercase",
  },
  position: { color: colors.text, fontSize: 40, fontWeight: "800", letterSpacing: -1 },
  detail: { color: colors.muted, fontSize: typography.small, lineHeight: 20 },
  sectionTitle: { color: colors.text, fontSize: typography.title, fontWeight: "800", marginTop: spacing.sm },
  sectionLead: { color: colors.muted, fontSize: typography.small, lineHeight: 20 },
  factorCard: { gap: spacing.sm },
  factorHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: spacing.md },
  factorTitle: { color: colors.text, fontSize: typography.small, fontWeight: "800", flex: 1 },
  factorScore: {
    color: officialPalette.burntChestnut,
    fontSize: typography.micro,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  factorTrack: { height: 8, borderRadius: 999, backgroundColor: colors.panelSoft, overflow: "hidden" },
  factorFill: { height: 8, borderRadius: 999, backgroundColor: officialPalette.foxOrange },
  factorWhy: { color: colors.muted, fontSize: typography.micro, lineHeight: 17 },
  factorNote: { color: colors.text, fontSize: typography.small, lineHeight: 19 },
});
