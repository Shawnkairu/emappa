import { Text, View } from "react-native";
import { GlassCard, Label, PrimaryButton, colors, typography } from "@emappa/ui";
import { SettlementWaterfall } from "../design-handoff";
import { useEffect, useState } from "react";
import { getRoleHome } from "@emappa/api-client";
import type { ProjectedBuilding } from "@emappa/shared";
import { BuildingPulse, KillSwitchBanner } from "../design-handoff";
import { ResidentRuleCard } from "../resident/ResidentShared";
import { ProposedPageChrome } from "../shared/ProposedPageChrome";

export function ProviderCommitCapacityScreen() {
  const [building, setBuilding] = useState<ProjectedBuilding | null>(null);

  useEffect(() => {
    getRoleHome("provider").then((h) => setBuilding(h.primary));
  }, []);

  return (
    <ProposedPageChrome
      section="Commit"
      workspace="provider workspace"
      title="Commit Capacity"
      subtitle="Reserve panel capacity to a named building. Commit is binding once accepted by the building owner."
      actions={["Reserve", "Cancel", "Open project"]}
      hero={{
        label: "Reserving for",
        value: building?.project.name ?? "…",
        sub: building
          ? `${building.project.units} units · DRS ${building.drs.score} · Capacity request sized to demand.`
          : "Loading project…",
        status: "pending owner approval",
        statusTone: "warn",
      }}
    >
      {building ? (
        <>
          <BuildingPulse role="provider" building={building} />
          <KillSwitchBanner building={building} />
        </>
      ) : null}
      <GlassCard>
        <Label>Capacity terms</Label>
        <Text style={{ color: colors.text, fontSize: 17, fontWeight: "600", marginTop: 6 }}>What you are committing</Text>
        {[
          { k: "Panel capacity reserved", p: "64 kW", h: "Sized to building demand. Edit only with owner approval." },
          { k: "Battery sized", p: "80 kWh", h: "Smooths daily allocation; not part of the payout basis." },
          { k: "Operating window", p: "3 years rolling", h: "Auto-renews unless both parties opt out at term end." },
        ].map((row) => (
          <View key={row.k} style={{ marginTop: 12 }}>
            <Text style={{ color: colors.text, fontSize: 12, fontWeight: "600", marginBottom: 5 }}>{row.k}</Text>
            <View style={{ padding: 11, borderRadius: 10, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.white }}>
              <Text style={{ color: colors.muted, fontSize: typography.small }}>{row.p}</Text>
            </View>
            <Text style={{ color: colors.muted, fontSize: 11, marginTop: 4, lineHeight: 16 }}>{row.h}</Text>
          </View>
        ))}
        <View style={{ marginTop: 14, alignSelf: "stretch" }}>
          <PrimaryButton>Reserve capacity</PrimaryButton>
        </View>
      </GlassCard>
      <ResidentRuleCard
        eyebrow="What you accept"
        title="Three non-negotiables."
        body="These are the product settlement rules. They are not negotiated per deal."
        rows={[
          { label: "Payout basis", value: "monetized solar", note: "No payout from generated, wasted, curtailed, or free-exported energy.", tone: "good" },
          { label: "Demand-first", value: "always", note: "Capacity is sized to prepaid resident demand, not to fill the roof.", tone: "good" },
          { label: "Reserve cut", value: "10% off the top", note: "Risk buffer paid before any provider payout.", tone: "neutral" },
        ]}
      />
      {building ? <SettlementWaterfall role="provider" building={building} /> : null}
    </ProposedPageChrome>
  );
}
