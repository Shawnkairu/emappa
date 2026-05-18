import { useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { ProjectedBuilding } from "@emappa/shared";
import { colors, spacing, typography } from "@emappa/ui";
import {
  BuildingAvailabilityStatePill,
  CapacityQueueStatusPill,
  DRSProgressCard,
  LiveSupplyIndicator,
  PilotBanner,
  TokenBalanceHero,
} from "../shared";
import { PledgeBalanceCard } from "./PledgeBalanceCard";
import { ResidentMetricGrid, ResidentPrimaryButton, ResidentScreenFrame } from "./ResidentScaffold";
import { TokenPurchaseCTA } from "./TokenPurchaseCTA";
import {
  canResidentBuyTokens,
  canEditPledge,
  deriveBuildingAvailabilityState,
  deriveCapacityQueueStatus,
  isResidentLive,
} from "./residentHomeState";
import { deriveApartmentAtsState, deriveSupplySource } from "./residentAtsState";
import { formatKes, formatKwh, formatPercent, residentView } from "./residentUtils";

export function ResidentHomeScreen() {
  return (
    <ResidentScreenFrame
      section="Home"
      title="Today"
      subtitle="Building availability, capacity queue, and your apartment path to prepaid solar."
    >
      {(building) => <ResidentHomeContent building={building} />}
    </ResidentScreenFrame>
  );
}

function ResidentHomeContent({ building }: { building: ProjectedBuilding }) {
  const router = useRouter();
  const view = residentView(building);
  const availability = deriveBuildingAvailabilityState(building);
  const queueStatus = deriveCapacityQueueStatus(building);
  const live = isResidentLive(building);
  const showBuyTokens = canResidentBuyTokens(building);
  const queue = building.roleViews.resident.capacityQueue;
  const estimatedKwh = Math.round(view.monthlySolarKwh / 30);
  const atsState = deriveApartmentAtsState(building);
  const supply = deriveSupplySource(building, atsState);

  return (
    <>
      <PilotBanner compact />

      <View style={styles.pillRow}>
        <BuildingAvailabilityStatePill state={availability} />
        <CapacityQueueStatusPill status={queueStatus} />
      </View>

      {live ? (
        <>
          <TokenBalanceHero
            kesValue={formatKes(view.prepaidBalanceKes)}
            kwhValue={formatKwh(estimatedKwh)}
            subtitle="Usable solar tokens only after capacity clearance and ATS verification at your PAYG meter."
            disabled={false}
          />
          <Pressable
            onPress={() => router.push("/(resident)/_embedded/ats-detail")}
            accessibilityRole="button"
            accessibilityLabel="View ATS status and activation path"
          >
            <LiveSupplyIndicator atsState={atsState} supply={supply} />
          </Pressable>
          {showBuyTokens ? <TokenPurchaseCTA /> : null}
        </>
      ) : (
        <>
          <PledgeBalanceCard
            amountKes={view.prepaidBalanceKes}
            canEdit={canEditPledge(building)}
            onOpenWallet={() => router.push("/(resident)/wallet")}
            onEditPledge={() => router.push("/(resident)/_embedded/pledge-detail")}
          />
          {availability === "A5" ? (
            <View style={styles.a5Note}>
              <Text style={styles.a5Title}>Solar is on the building; your unit is not connected yet</Text>
              <Text style={styles.a5Detail}>
                Complete ATS activation steps before buying tokens. Token purchase stays hidden until your apartment is
                capacity-cleared and verified.
              </Text>
              <ResidentPrimaryButton
                onPress={() => router.push("/(resident)/_embedded/ats-detail")}
                accessibilityLabel="View ATS activation steps"
              >
                View ATS status
              </ResidentPrimaryButton>
            </View>
          ) : null}
          {!live && availability !== "A5" ? (
            <ResidentPrimaryButton
              onPress={() => router.push("/(resident)/_embedded/ats-detail")}
              accessibilityLabel="View apartment ATS path"
            >
              View ATS path
            </ResidentPrimaryButton>
          ) : null}
          <ResidentPrimaryButton
            onPress={() => router.push("/(resident)/wallet")}
            accessibilityLabel="Open wallet and pledges"
          >
            Open wallet
          </ResidentPrimaryButton>
        </>
      )}

      <View style={styles.drsWrap}>
        <DRSProgressCard drs={building.drs} />
        <ResidentPrimaryButton
          onPress={() => router.push("/(resident)/_embedded/drs-detail")}
          accessibilityLabel="View deployment readiness detail"
        >
          View DRS detail
        </ResidentPrimaryButton>
      </View>

      <Pressable
        onPress={() => router.push("/(resident)/_embedded/queue-detail")}
        accessibilityRole="button"
        accessibilityLabel="View capacity queue detail and priority factors"
      >
        <ResidentMetricGrid
          items={[
            {
              label: "Queue",
              value: queue?.position != null ? `#${queue.position}` : "—",
              detail: queue?.detail ?? "Tap for priority factors (§6.3).",
              tone: queueStatus === "activated" || queueStatus === "capacity_cleared" ? "good" : "warn",
            },
          {
            label: "Coverage",
            value: formatPercent(view.solarCoverage),
            detail: `${formatKwh(view.monthlySolarKwh)} monetized solar path.`,
            tone: view.solarCoverage > 0 ? "good" : "warn",
          },
          {
            label: "Savings",
            value: formatKes(view.savingsKes),
            detail: "Vs grid-only (range, not guaranteed).",
            tone: view.savingsKes > 0 ? "good" : "neutral",
          },
          {
            label: "DRS",
            value: String(building.drs.score),
            detail: building.drs.reasons[0] ?? "No visible blocker.",
            tone: building.drs.reasons.length === 0 ? "good" : "warn",
          },
        ]}
        />
      </Pressable>
    </>
  );
}

const styles = StyleSheet.create({
  pillRow: { gap: spacing.sm, marginBottom: spacing.lg },
  drsWrap: { gap: spacing.sm, marginBottom: spacing.lg },
  a5Note: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: `${colors.amber}55`,
    backgroundColor: `${colors.amber}12`,
    padding: spacing.md,
    marginBottom: spacing.md,
    gap: spacing.xs,
  },
  a5Title: { color: colors.text, fontSize: typography.small, fontWeight: "800", lineHeight: 20 },
  a5Detail: { color: colors.muted, fontSize: typography.small, lineHeight: 19 },
});
