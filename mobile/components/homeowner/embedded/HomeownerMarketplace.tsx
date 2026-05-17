import { Linking, Text } from "react-native";
import { Label, PrimaryButton } from "@emappa/ui";
import { EmbeddedWhiteCard, HomeownerEmbeddedFrame } from "../homeownerEmbeddedUi";
import { formatPercent, type HomeownerSnapshot } from "../homeownerSnapshot";

export function HomeownerMarketplaceScreen() {
  return (
    <HomeownerEmbeddedFrame title="Shares" subtitle="Cashflow share buy-back — payout record, not array ownership.">
      {(snapshot) => <MarketplaceBody snapshot={snapshot} />}
    </HomeownerEmbeddedFrame>
  );
}

function MarketplaceBody({ snapshot }: { snapshot: HomeownerSnapshot }) {
  const ownedShare = ownershipPercent(snapshot.ownership);

  return (
    <EmbeddedWhiteCard>
      <Label>Cashflow shares</Label>
      <Text style={{ color: "#2a1a12", fontSize: 17, fontWeight: "800" }}>
        {formatPercent(Math.max(0, 1 - ownedShare))} outside homeowner record
      </Text>
      <Text style={{ color: "#7a6558", fontSize: 13, lineHeight: 19, fontWeight: "600" }}>
        This is a payout record, not solar array ownership. Transfers need backend support.
      </Text>
      <PrimaryButton onPress={() => Linking.openURL("mailto:support@emappa.test?subject=Homeowner%20share%20buyback")}>
        Contact support
      </PrimaryButton>
    </EmbeddedWhiteCard>
  );
}

function ownershipPercent(positions: HomeownerSnapshot["ownership"]) {
  return Math.min(
    1,
    positions.reduce((total, position) => {
      if (typeof position.shareFraction === "number") {
        return total + position.shareFraction;
      }
      if (typeof position.percentage === "number") {
        return total + (position.percentage > 1 ? position.percentage / 100 : position.percentage);
      }
      return total;
    }, 0),
  );
}
