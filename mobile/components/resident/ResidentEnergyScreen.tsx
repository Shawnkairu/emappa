import { useCallback, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { generationVisibilityForRole, type ProjectedBuilding } from "@emappa/shared";
import { PaletteCard, Pill, colors, officialPalette, spacing, typography } from "@emappa/ui";
import { useApi } from "../../lib/api";
import { useApiData } from "../../lib/useApiData";
import { EnergyTodayChart } from "../EnergyTodayChart";
import { GenerationPanel, PilotBanner, ScreenState, SyntheticBadge } from "../shared";
import { getResidentEnergyToday } from "./ResidentApi";
import { AllocationExplainer } from "./AllocationExplainer";
import { ResidentInfoCard, ResidentMetricGrid, ResidentPrimaryButton, ResidentScreenFrame } from "./ResidentScaffold";
import { ROLE_TINT } from "./residentTint";
import { canResidentBuyTokens } from "./residentHomeState";
import { formatKes, formatKwh, formatPercent, residentView } from "./residentUtils";

export function ResidentEnergyScreen() {
  return (
    <ResidentScreenFrame section="Energy" title="Energy" subtitle="Today's flow and share-gated generation." headerMode="default">
      {(building) => <ResidentEnergyPanels building={building} />}
    </ResidentScreenFrame>
  );
}

function ResidentEnergyPanels({ building }: { building: ProjectedBuilding }) {
  const api = useApi();
  const apiRef = useRef(api);
  apiRef.current = api;
  const [explainerOpen, setExplainerOpen] = useState(false);
  const load = useCallback(() => getResidentEnergyToday(apiRef.current, building.project.id), [building.project.id]);
  const { data, error, isLoading, refetch } = useApiData(load, [building.project.id]);
  const view = residentView(building);
  const householdGridKwh = building.energy.E_grid / building.project.units;
  const householdBatteryKwh = building.energy.E_battery_used / building.project.units;
  const hasShares = generationVisibilityForRole("resident", { shareOwnershipPct: view.ownedProviderShare }).visible;
  const live = canResidentBuyTokens(building) || building.project.stage === "live";

  const phase = isLoading ? "loading" : error ? "error" : "populated";

  return (
    <ScreenState
      phase={phase}
      loadingMessage="Loading energy data…"
      errorTitle="Energy data unavailable"
      errorMessage={error?.message}
      onRetry={refetch}
    >
      {data ? (
        <ResidentEnergyBody
          building={building}
          view={view}
          data={data}
          hasShares={hasShares}
          live={live}
          householdGridKwh={householdGridKwh}
          householdBatteryKwh={householdBatteryKwh}
          onRefresh={refetch}
          onOpenExplainer={() => setExplainerOpen(true)}
        />
      ) : null}
      <AllocationExplainer visible={explainerOpen} onClose={() => setExplainerOpen(false)} />
    </ScreenState>
  );
}

function ResidentEnergyBody({
  building,
  view,
  data,
  hasShares,
  live,
  householdGridKwh,
  householdBatteryKwh,
  onRefresh,
  onOpenExplainer,
}: {
  building: ProjectedBuilding;
  view: ReturnType<typeof residentView>;
  data: { generation_kwh: number[]; load_kwh: number[] };
  hasShares: boolean;
  live: boolean;
  householdGridKwh: number;
  householdBatteryKwh: number;
  onRefresh: () => void;
  onOpenExplainer: () => void;
}) {
  const points = (data.generation_kwh ?? []).map((value, index) => ({
    label: formatHour(index),
    value: value + (data.load_kwh[index] ?? 0) * 0.15,
  }));
  const todaySolarKwh = sum(data.generation_kwh ?? []);
  const todayLoadKwh = sum(data.load_kwh ?? []);

  return (
    <>
      <View style={styles.syntheticRow}>
        <PilotBanner compact title="Pilot energy" message="Hourly curves may be synthetic until live settlement is verified." />
        <SyntheticBadge mode={live ? "mixed" : "projected"} source="pilot API" />
      </View>

      <EnergyTodayChart title="Energy today (solar + load)" points={points} unit="kWh" />

      <Pressable onPress={onOpenExplainer} accessibilityRole="button" accessibilityLabel="How allocation works">
        <Text style={styles.explainerLink}>How allocation works</Text>
      </Pressable>

      <EnergyFlowCard
        coverage={view.solarCoverage}
        soldSolar={formatKwh(view.monthlySolarKwh)}
        battery={formatKwh(householdBatteryKwh)}
        grid={formatKwh(householdGridKwh)}
      />

      <GenerationPanel building={building} shareOwnershipPct={hasShares ? view.ownedProviderShare || 1 : 0} />

      <ResidentMetricGrid
        items={[
          {
            label: "Produced",
            value: formatKwh(todaySolarKwh),
            detail: "Today's solar curve.",
            tone: todaySolarKwh > 0 ? "good" : "warn",
          },
          {
            label: "Load",
            value: formatKwh(todayLoadKwh),
            detail: "Household demand.",
          },
          {
            label: "Coverage",
            value: formatPercent(view.solarCoverage),
            detail: "Prepaid solar share.",
            tone: view.solarCoverage > 0 ? "good" : "neutral",
          },
          {
            label: "Saved",
            value: formatKes(view.savingsKes),
            detail: "Vs grid-only (range).",
            tone: view.savingsKes > 0 ? "good" : "neutral",
          },
        ]}
      />

      <ResidentInfoCard eyebrow="Truth" title="Generated is not always allocated." detail="Resident credit follows sold prepaid solar only." synthetic>
        <ResidentPrimaryButton onPress={onRefresh} accessibilityLabel="Refresh today's energy data">
          Refresh energy
        </ResidentPrimaryButton>
      </ResidentInfoCard>
    </>
  );
}

function formatHour(index: number) {
  return `${String(index).padStart(2, "0")}:00`;
}

function sum(values: number[]) {
  return values.reduce((total, value) => total + value, 0);
}

function EnergyFlowCard({
  coverage,
  soldSolar,
  battery,
  grid,
}: {
  coverage: number;
  soldSolar: string;
  battery: string;
  grid: string;
}) {
  return (
    <PaletteCard borderRadius={34} padding={20} style={{ ...styles.flowCard, backgroundColor: ROLE_TINT.bg }}>
      <View style={styles.flowHeader}>
        <View>
          <Text style={styles.eyebrow}>Monthly source map</Text>
          <Text style={styles.coverage}>{formatPercent(coverage)}</Text>
          <Text style={styles.caption}>solar cover</Text>
        </View>
        <Pill tone={coverage > 0 ? "good" : "warn"}>{coverage > 0 ? "active" : "prepaid needed"}</Pill>
      </View>
      <View style={styles.flowGraphic}>
        <FlowNode label="Solar" value={soldSolar} accent={officialPalette.foxOrange} />
        <View style={styles.flowLine} />
        <View style={styles.homeNode}>
          <Text style={styles.homeIcon}>H</Text>
          <Text style={styles.homeLabel}>Home</Text>
        </View>
        <View style={styles.flowLine} />
        <View style={styles.bottomNodes}>
          <FlowNode label="Battery" value={battery} accent={colors.green} />
          <FlowNode label="Grid" value={grid} accent={colors.amber} />
        </View>
      </View>
    </PaletteCard>
  );
}

function FlowNode({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <View style={styles.nodeWrap}>
      <View style={[styles.node, { borderColor: accent }]}>
        <View style={[styles.nodeDot, { backgroundColor: accent }]} />
      </View>
      <Text style={styles.nodeLabel}>{label}</Text>
      <Text style={styles.nodeValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  syntheticRow: { gap: spacing.sm, marginBottom: spacing.md },
  explainerLink: {
    color: officialPalette.foxOrange,
    fontSize: typography.small,
    fontWeight: "800",
    marginBottom: spacing.md,
  },
  flowCard: { marginBottom: spacing.lg },
  flowHeader: { alignItems: "flex-start", flexDirection: "row", justifyContent: "space-between", gap: spacing.md },
  eyebrow: {
    color: colors.muted,
    fontSize: typography.micro,
    fontWeight: "800",
    letterSpacing: 0.75,
    textTransform: "uppercase",
  },
  coverage: {
    color: colors.text,
    fontSize: 46,
    fontWeight: "800",
    letterSpacing: -1.35,
    lineHeight: 52,
    marginTop: 4,
  },
  caption: { color: colors.muted, fontSize: typography.micro, fontWeight: "700", marginTop: 2 },
  flowGraphic: { alignItems: "center", marginTop: 18 },
  flowLine: { backgroundColor: "rgba(150, 90, 53, 0.22)", height: 26, width: 2 },
  bottomNodes: { flexDirection: "row", gap: 40 },
  nodeWrap: { alignItems: "center", minWidth: 96 },
  node: {
    alignItems: "center",
    backgroundColor: colors.white,
    borderRadius: 999,
    borderWidth: 2,
    height: 58,
    justifyContent: "center",
    width: 58,
  },
  nodeDot: { borderRadius: 999, height: 18, width: 18 },
  nodeLabel: { color: colors.text, fontSize: typography.small, fontWeight: "800", marginTop: 8 },
  nodeValue: { color: colors.muted, fontSize: typography.micro, marginTop: 2 },
  homeNode: {
    alignItems: "center",
    backgroundColor: officialPalette.foxOrange,
    borderRadius: 999,
    height: 92,
    justifyContent: "center",
    width: 92,
  },
  homeIcon: { color: colors.white, fontSize: 31, fontWeight: "800", lineHeight: 34 },
  homeLabel: { color: colors.white, fontSize: typography.micro, fontWeight: "800", marginTop: 2, textTransform: "uppercase" },
});
