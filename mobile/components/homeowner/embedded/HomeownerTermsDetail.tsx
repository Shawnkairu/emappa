import { Text } from "react-native";
import { Label } from "@emappa/ui";
import { EmbeddedIconBadge, EmbeddedInfoRows, EmbeddedWhiteCard, HomeownerEmbeddedFrame } from "../homeownerEmbeddedUi";
import { formatKes, formatStage, readinessLabel, type HomeownerSnapshot } from "../homeownerSnapshot";

export function HomeownerTermsDetailScreen() {
  return (
    <HomeownerEmbeddedFrame title="Terms" subtitle="Read-only homeowner terms — roof permission, payout basis, and prepaid rules.">
      {(snapshot) => <TermsDetailBody snapshot={snapshot} />}
    </HomeownerEmbeddedFrame>
  );
}

function TermsDetailBody({ snapshot }: { snapshot: HomeownerSnapshot }) {
  const building = snapshot.building!;

  return (
    <>
      <EmbeddedWhiteCard>
        <EmbeddedIconBadge name="document-text-outline" />
        <Text style={{ color: "#2a1a12", fontSize: 17, fontWeight: "800" }}>Roof permission rules</Text>
        <Text style={{ color: "#7a6558", fontSize: 13, lineHeight: 19, fontWeight: "600" }}>
          You grant site access; the provider owns the array. Approval does not bypass DRS or LBRS gates.
        </Text>
        <EmbeddedInfoRows
          rows={[
            ["Roof control", "You grant access; provider owns the array."],
            ["Host royalty", "Zero on your own roof — savings only from self-consumption."],
            ["Payout basis", "Monetized solar only — not generated, wasted, or curtailed energy."],
            ["Ownership", "External monetization only (export, trading, third-party loads)."],
            ["Prepaid rule", "No prepaid cash → no solar allocation or stakeholder payout."],
            ["Current stage", formatStage(building.stage)],
            ["DRS", readinessLabel(snapshot.drs)],
            ["Pledged signal", formatKes(building.prepaidCommittedKes ?? snapshot.balance?.confirmedTotalKes ?? 0)],
          ]}
        />
      </EmbeddedWhiteCard>
      <EmbeddedWhiteCard>
        <Label>Activation boundary</Label>
        <Text style={{ color: "#7a6558", fontSize: 13, lineHeight: 19, fontWeight: "600" }}>
          Tokens become usable only after LBRS is 100% and switching/metering are verified. Pre-live funds are project
          contributions, not deliverable kWh.
        </Text>
      </EmbeddedWhiteCard>
    </>
  );
}
