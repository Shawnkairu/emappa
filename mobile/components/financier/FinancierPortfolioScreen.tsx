import {
  BuildingSnapshotCard,
  CashflowWaterfallCard,
  DealPipelineCard,
  FinancierScreenShell,
  RecoveryBandCard,
  StatusRail,
  formatKesShort,
} from "./FinancierShared";
import { useRouter } from "expo-router";
import { Pressable, View } from "react-native";
import { SystemProjectImmersiveHero } from "../energy/SystemImmersiveOverview";
import { PilotBanner } from "../PilotBanner";

export function FinancierPortfolioScreen() {
  const router = useRouter();

  return (
    <FinancierScreenShell
      section="Portfolio"
      title="Positions"
      subtitle="Exposure, recovery band, and named deals."
      actions={["Exposure", "Range", "Deals"]}
      hideChrome
      hero={({ primary }) => ({
        label: "Total committed",
        value: formatKesShort(primary.roleViews.financier.committedCapitalKes),
        sub: `${formatKesShort(primary.roleViews.financier.monthlyRecoveryKes)} projected monthly recovery.`,
      })}
    >
      {({ primary, projects }) => {
        const drs = primary.drs;
        const drsProgress = drs.score <= 1 ? drs.score : drs.score / 100;
        const fv = primary.roleViews.financier;

        return (
          <>
            <PilotBanner title="Pilot mode" message="Pledges and recovery curves are simulated until live settlement data is trusted." />
            <View style={{ marginHorizontal: -20, marginTop: 4 }}>
              <SystemProjectImmersiveHero
                siteName={primary.project.name}
                weatherHint="Named deal · capital pulse"
                ringLabel={`Escrow and milestones follow DRS/LBRS until live monetized kWh backs recovery curves.`}
                ringProgress={drsProgress}
                ringCenterHint="DRS"
                statusLine={drs.label ?? drs.decision}
                primaryCtaHint="Deal room & pledge gates"
                callouts={[
                  { label: "DRS", value: `${Math.round(drsProgress * 100)}` },
                  { label: "Funded", value: formatKesShort(fv.committedCapitalKes) },
                  { label: "Gap", value: formatKesShort(fv.remainingCapitalKes) },
                  { label: "Deals", value: `${projects.length}` },
                ]}
                summaryCards={[
                  { label: "Committed", value: formatKesShort(fv.committedCapitalKes), hint: "Named building", icon: "briefcase-outline" },
                  { label: "Recovery", value: formatKesShort(fv.monthlyRecoveryKes), hint: "Projected", icon: "trending-up-outline" },
                  { label: "Progress", value: `${Math.round(fv.fundingProgress * 100)}%`, hint: "Capital stack", icon: "pie-chart-outline" },
                ]}
              />
            </View>
            <BuildingSnapshotCard building={primary} />
            <StatusRail
              items={[
                { label: "Exposure", value: formatKesShort(primary.roleViews.financier.committedCapitalKes), note: "Named deal.", tone: "neutral" },
                { label: "Recovery", value: formatKesShort(primary.roleViews.financier.monthlyRecoveryKes), note: "Projected monthly.", tone: "good" },
                { label: "Open", value: formatKesShort(primary.roleViews.financier.remainingCapitalKes), note: "Unfunded.", tone: "neutral" },
              ]}
            />
            <StatusRail
              items={[
                {
                  label: "KYC / escrow",
                  value: fv.kycEscrow?.status.replace(/_/g, " ") ?? "prototype",
                  note: fv.kycEscrow?.detail ?? "Pilot capital status only.",
                  tone: "warn",
                },
                {
                  label: "Go-live signoff",
                  value: fv.goLiveSignoff?.status.replace(/_/g, " ") ?? "pending",
                  note: fv.goLiveSignoff?.evidenceLabel ?? "LBRS signoff grid",
                  tone: fv.goLiveSignoff?.status === "ready" ? "good" : "warn",
                },
              ]}
            />
            <DealPipelineCard projects={projects} />
            <CashflowWaterfallCard building={primary} />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Open payback scenarios and tranche release"
              onPress={() => router.push("/(financier)/_embedded/payback-scenarios")}
            >
              <RecoveryBandCard building={primary} />
            </Pressable>
        </>
        );
      }}
    </FinancierScreenShell>
  );
}
