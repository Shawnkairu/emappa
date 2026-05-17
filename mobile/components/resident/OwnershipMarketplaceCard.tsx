import { StyleSheet, Text, View } from "react-native";
import type { ProjectedBuilding } from "@emappa/shared";
import { PaletteCard, colors, spacing, typography } from "@emappa/ui";
import { ResidentPrimaryButton } from "./ResidentScaffold";
import {
  deriveBuildingAvailabilityState,
  deriveCapacityQueueStatus,
  isResidentLive,
} from "./residentHomeState";
import { formatKes, formatPercent, residentView } from "./residentUtils";

export type OwnershipMarketplacePhase = "education" | "funding_open" | "waitlisted" | "live";

export type OwnershipMarketplaceCardProps = {
  building: ProjectedBuilding;
  onBrowse?: () => void;
};

/** Scenario A §8.6 — ownership marketplace states with valuation basis and risk disclosure. */
export function OwnershipMarketplaceCard({ building, onBrowse }: OwnershipMarketplaceCardProps) {
  const phase = deriveOwnershipMarketplacePhase(building);
  const view = residentView(building);
  const hasShares = view.ownedProviderShare > 0;

  if (phase === "education") {
    return (
      <PaletteCard style={styles.card}>
        <Text style={styles.title}>Ownership opens after terms approve</Text>
        <Text style={styles.body}>
          Consumption tokens and investment shares stay separate. Shares earn only from monetized prepaid solar — not from
          pledges, wasted generation, or curtailed energy.
        </Text>
        <Text style={styles.basis}>Valuation anchor (pilot): depreciated cost basis, with projected income shown as a range.</Text>
      </PaletteCard>
    );
  }

  if (phase === "waitlisted") {
    return (
      <PaletteCard style={styles.card}>
        <Text style={styles.title}>Ownership does not guarantee a service slot</Text>
        <Text style={styles.body}>
          You are waitlisted for capacity. Buying shares may still be permitted, but ownership does not bypass the capacity
          queue or ATS activation.
        </Text>
        {onBrowse ? (
          <ResidentPrimaryButton onPress={onBrowse} accessibilityLabel="Review ownership marketplace risks">
            Review marketplace risks
          </ResidentPrimaryButton>
        ) : null}
      </PaletteCard>
    );
  }

  if (phase === "live" && hasShares) {
    return (
      <PaletteCard style={styles.card}>
        <Text style={styles.title}>Your marketplace position</Text>
        <Text style={styles.metric}>{formatPercent(view.ownedProviderShare)} provider pool</Text>
        <Text style={styles.body}>
          Payouts flow only from monetized prepaid solar sold on your building. No guaranteed returns.
        </Text>
        {onBrowse ? (
          <ResidentPrimaryButton onPress={onBrowse} accessibilityLabel="View ownership cashflow">
            View cashflow
          </ResidentPrimaryButton>
        ) : null}
      </PaletteCard>
    );
  }

  return (
    <PaletteCard style={styles.card}>
      <Text style={styles.title}>Share marketplace</Text>
      <Text style={styles.body}>
        Array and infrastructure pools show cost-basis valuation, projected income range, and risk disclosure. Returns are not
        guaranteed.
      </Text>
      <View style={styles.facts}>
        <Text style={styles.fact}>Example buy-in from {formatKes(9000)} on a resident-buyable slice.</Text>
        <Text style={styles.fact}>Settlement: monetized solar only (Scenario A §8.5).</Text>
      </View>
      {onBrowse ? (
        <ResidentPrimaryButton onPress={onBrowse} accessibilityLabel="Browse ownership marketplace">
          Browse marketplace
        </ResidentPrimaryButton>
      ) : null}
    </PaletteCard>
  );
}

export function deriveOwnershipMarketplacePhase(building: ProjectedBuilding): OwnershipMarketplacePhase {
  const queue = deriveCapacityQueueStatus(building);
  if (queue === "waitlisted") {
    return "waitlisted";
  }
  if (isResidentLive(building)) {
    return "live";
  }
  const availability = deriveBuildingAvailabilityState(building);
  if (availability === "A3" || availability === "A4" || (availability === "A2" && building.drs.score >= 55)) {
    return "funding_open";
  }
  return "education";
}

const styles = StyleSheet.create({
  card: { gap: spacing.md, marginBottom: spacing.lg },
  title: { color: colors.text, fontSize: typography.title, fontWeight: "800" },
  metric: { color: colors.text, fontSize: typography.hero, fontWeight: "800", letterSpacing: -0.5 },
  body: { color: colors.muted, fontSize: typography.small, lineHeight: 20 },
  basis: { color: colors.muted, fontSize: typography.micro, lineHeight: 17 },
  facts: { gap: spacing.xs },
  fact: { color: colors.text, fontSize: typography.small, lineHeight: 19 },
});
