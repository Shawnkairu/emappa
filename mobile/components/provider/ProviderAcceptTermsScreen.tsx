import { Text, View } from "react-native";
import { GlassCard, Label, PrimaryButton, colors } from "@emappa/ui";
import { SettlementWaterfall } from "../design-handoff";
import { useEffect, useState } from "react";
import { getRoleHome } from "@emappa/api-client";
import type { ProjectedBuilding } from "@emappa/shared";
import { ResidentRuleCard } from "../resident/ResidentShared";
import { ProposedPageChrome } from "../shared/ProposedPageChrome";

export function ProviderAcceptTermsScreen() {
  const [building, setBuilding] = useState<ProjectedBuilding | null>(null);

  useEffect(() => {
    getRoleHome("provider").then((h) => setBuilding(h.primary));
  }, []);

  return (
    <ProposedPageChrome
      section="Terms"
      workspace="provider workspace"
      title="Accept Payout Terms"
      subtitle="Review the monetized-kWh payout terms for this named building. Sign once; live for the operating window."
      actions={["Accept all", "Request changes", "Open contract"]}
      hero={{
        label: "For",
        value: building?.project.name ?? "…",
        sub: "After accepting, the provider lock window opens for BOM proof.",
        status: "awaiting signature",
        statusTone: "warn",
      }}
    >
      <ResidentRuleCard
        eyebrow="Term sheet"
        title="What you are signing."
        body="All numbers are taken from the deal room. Anonymized benchmarks visible; counterparty private rates are not."
        rows={[
          { label: "Pool share", value: "74% retained", note: "26% sold to residents in the resident pool. Future cashflows only.", tone: "good" },
          { label: "Monetized basis", value: "sold kWh × tariff", note: "Pool divided across provider stakes times monetized solar. Recorded per period.", tone: "good" },
          { label: "Reserve", value: "10%", note: "Off the top, before any payout.", tone: "neutral" },
          { label: "Owner royalty", value: "15% of pool", note: "After reserve and financier recovery.", tone: "neutral" },
          { label: "Settlement cadence", value: "monthly", note: "Period closes on the last day; payout settles within 5 business days.", tone: "good" },
        ]}
      />
      {building ? <SettlementWaterfall role="provider" building={building} /> : null}
      <GlassCard>
        <Label>Signature</Label>
        <Text style={{ color: colors.text, fontSize: 17, fontWeight: "600", marginTop: 6 }}>One signer per provider account</Text>
        <Text style={{ color: colors.muted, fontSize: 13, lineHeight: 20, marginTop: 8 }}>
          e.mappa records signature versions. Future amendments require a new signature.
        </Text>
        <View style={{ marginTop: 14, alignSelf: "stretch" }}>
          <PrimaryButton>Accept and sign</PrimaryButton>
        </View>
      </GlassCard>
    </ProposedPageChrome>
  );
}
