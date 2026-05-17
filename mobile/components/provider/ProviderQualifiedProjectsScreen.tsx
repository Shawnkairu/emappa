import { Text, View } from "react-native";
import { GlassCard, Label, Pill, colors } from "@emappa/ui";
import { useEffect, useState } from "react";
import { getRoleHome } from "@emappa/api-client";
import type { ProjectedBuilding } from "@emappa/shared";
import { BuildingPulse, KillSwitchBanner, SettlementWaterfall } from "../design-handoff";
import { ResidentRuleCard } from "../resident/ResidentShared";
import { ProposedPageChrome } from "../shared/ProposedPageChrome";

const MOCK_PROJECTS = [
  { name: "Riverside Apartments", units: 38, score: 78, capacity: "64 kW", residents: "84%", tone: "good" as const },
  { name: "Tatu Heights", units: 56, score: 62, capacity: "92 kW", residents: "54%", tone: "warn" as const },
  { name: "Highridge Court", units: 24, score: 84, capacity: "38 kW", residents: "91%", tone: "good" as const },
  { name: "Brookside Suites", units: 42, score: 58, capacity: "70 kW", residents: "38%", tone: "bad" as const },
];

export function ProviderQualifiedProjectsScreen() {
  const [building, setBuilding] = useState<ProjectedBuilding | null>(null);

  useEffect(() => {
    getRoleHome("provider").then((h) => setBuilding(h.primary));
  }, []);

  return (
    <ProposedPageChrome
      section="Projects"
      workspace="provider workspace"
      title="Qualified Projects"
      subtitle="DRS-cleared buildings looking for provider capacity. Each card shows demand, readiness, and the capacity needed."
      actions={["Filter by DRS", "Sort by demand", "Refresh"]}
      hero={{
        label: "Open opportunities",
        value: "4",
        sub: "Buildings with DRS ≥ 65 and verified resident demand.",
        status: "qualified",
        statusTone: "good",
      }}
    >
      {building ? (
        <>
          <BuildingPulse role="provider" building={building} />
          <KillSwitchBanner building={building} />
        </>
      ) : null}
      <GlassCard>
        <Label>Marketplace</Label>
        <Text style={{ color: colors.text, fontSize: 17, fontWeight: "600", marginTop: 6 }}>Buildings looking for capacity</Text>
        <View style={{ marginTop: 10 }}>
          {MOCK_PROJECTS.map((p, i) => (
            <View
              key={p.name}
              style={{
                flexDirection: "row",
                gap: 10,
                paddingVertical: 11,
                borderTopWidth: i === 0 ? 0 : 1,
                borderTopColor: colors.border,
                alignItems: "center",
              }}
            >
              <View
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 10,
                  backgroundColor: colors.panelSoft,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Text style={{ fontSize: 14, fontWeight: "700", color: colors.text }}>{p.name.slice(0, 1)}</Text>
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={{ color: colors.text, fontSize: 12.5, fontWeight: "600" }}>{p.name}</Text>
                <Text style={{ color: colors.muted, fontSize: 10.5, marginTop: 2 }}>
                  {p.units} units · capacity needed {p.capacity} · {p.residents} residents joined
                </Text>
              </View>
              <Pill tone={p.tone}>DRS {p.score}</Pill>
            </View>
          ))}
        </View>
      </GlassCard>
      <ResidentRuleCard
        eyebrow="Selection rule"
        title="Qualify before you commit."
        body="Provider commitment is binding. Spend the time on a project's demand and gates before committing capacity."
        rows={[
          { label: "Demand floor", value: "60% min", note: "Below this, deployment is blocked.", tone: "warn" },
          { label: "Owner access", value: "required", note: "Inspection, roof, meter-room access must be confirmed.", tone: "neutral" },
          { label: "Settlement", value: "monetized", note: "Provider payout = sold kWh × pool share. No payout from waste.", tone: "good" },
        ]}
      />
      {building ? <SettlementWaterfall role="provider" building={building} /> : null}
    </ProposedPageChrome>
  );
}
