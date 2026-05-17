import { Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Label, Pill, PrimaryButton } from "@emappa/ui";
import { SystemHealthIndicator, type SystemHealthState } from "../../shared";
import { EmbeddedIconBadge, EmbeddedRow, EmbeddedWhiteCard, HomeownerEmbeddedFrame } from "../homeownerEmbeddedUi";
import { formatKwh, formatPercent, sumEnergy, type HomeownerSnapshot } from "../homeownerSnapshot";

export function HomeownerSystemHealthScreen() {
  return (
    <HomeownerEmbeddedFrame title="System health" subtitle="Live component dashboard — inverter, battery, Solar DB, ATS, and monitoring.">
      {(snapshot) => <SystemHealthBody snapshot={snapshot} />}
    </HomeownerEmbeddedFrame>
  );
}

function SystemHealthBody({ snapshot }: { snapshot: HomeownerSnapshot }) {
  const router = useRouter();
  const building = snapshot.building!;
  const isLive = building.stage === "live";
  const generation = sumEnergy(snapshot.energy?.generation_kwh);
  const load = sumEnergy(snapshot.energy?.load_kwh);
  const matched = Math.min(generation, load);
  const coverage = load > 0 ? matched / load : 0;
  const overall: SystemHealthState = !isLive ? "warning" : generation > 0 && coverage >= 0.35 ? "healthy" : generation > 0 ? "warning" : "error";

  if (!isLive) {
    return (
      <EmbeddedWhiteCard>
        <EmbeddedIconBadge name="pulse-outline" />
        <Text style={{ color: "#2a1a12", fontSize: 17, fontWeight: "800" }}>Not live yet</Text>
        <Text style={{ color: "#7a6558", fontSize: 13, lineHeight: 19, fontWeight: "600" }}>
          System health activates after LBRS go-live and verified switching. Review deployment progress meanwhile.
        </Text>
        <PrimaryButton onPress={() => router.push("/(homeowner)/_embedded/deployment-detail")}>Deployment timeline</PrimaryButton>
      </EmbeddedWhiteCard>
    );
  }

  const components = buildComponentHealth(generation, load, coverage, snapshot.energy?.irradiance_w_m2 ?? []);

  return (
    <>
      <SystemHealthIndicator
        state={overall}
        detail={`Solar coverage ${formatPercent(coverage)} today · source ${building.dataSource ?? "unreported"}`}
      />
      <EmbeddedWhiteCard>
        <Label>Live components</Label>
        {components.map((component) => (
          <View key={component.id} style={{ borderTopWidth: 1, borderTopColor: "rgba(150,90,53,0.12)", paddingVertical: 10, gap: 4 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <Text style={{ color: "#2a1a12", fontSize: 14, fontWeight: "800" }}>{component.label}</Text>
              <Pill tone={component.tone}>{component.status}</Pill>
            </View>
            <Text style={{ color: "#7a6558", fontSize: 12, fontWeight: "600", lineHeight: 17 }}>{component.detail}</Text>
          </View>
        ))}
      </EmbeddedWhiteCard>
      <EmbeddedWhiteCard>
        <Label>Today's flow</Label>
        <EmbeddedRow label="Generation" value={formatKwh(generation)} note="Provider array" />
        <EmbeddedRow label="Home load" value={formatKwh(load)} note="Measured consumption" />
        <EmbeddedRow label="Matched solar" value={formatKwh(matched)} note="Served home load" />
        <EmbeddedRow label="Grid fallback" value={formatKwh(Math.max(0, load - matched))} note="KPLC when solar insufficient" />
      </EmbeddedWhiteCard>
      {overall !== "healthy" ? (
        <EmbeddedWhiteCard>
          <Label>Diagnostic</Label>
          <Text style={{ color: "#7a6558", fontSize: 13, lineHeight: 19, fontWeight: "600" }}>
            Unexpected production drop may indicate shading, monitoring gaps, or component fault. Contact support with the alert id from your inbox.
          </Text>
          <PrimaryButton onPress={() => router.push("/(homeowner)/profile")}>Contact support</PrimaryButton>
        </EmbeddedWhiteCard>
      ) : null}
    </>
  );
}

function buildComponentHealth(
  generation: number,
  load: number,
  coverage: number,
  irradiance: number[],
) {
  const irradianceAvg = irradiance.length ? irradiance.reduce((a, b) => a + b, 0) / irradiance.length : 0;
  const genOk = generation > 0;
  const loadOk = load > 0;

  return [
    {
      id: "inverter",
      label: "Hybrid inverter",
      status: genOk ? "Online" : "Check",
      tone: genOk ? ("good" as const) : ("warn" as const),
      detail: genOk ? "MPPT producing" : "No generation reported",
    },
    {
      id: "battery",
      label: "Battery / BMS",
      status: coverage >= 0.25 ? "Charging" : "Idle",
      tone: coverage >= 0.25 ? ("good" as const) : ("warn" as const),
      detail: "Time-shift for evening peaks",
    },
    {
      id: "solar_db",
      label: "Solar DB",
      status: genOk && loadOk ? "Protected path" : "Review",
      tone: genOk && loadOk ? ("good" as const) : ("warn" as const),
      detail: "Controlled home supply boundary",
    },
    {
      id: "ats",
      label: "ATS / changeover",
      status: "Armed",
      tone: "good" as const,
      detail: "Grid fallback available when tokens or solar insufficient",
    },
    {
      id: "monitoring",
      label: "Monitoring",
      status: irradianceAvg > 0 ? "Streaming" : "Degraded",
      tone: irradianceAvg > 0 ? ("good" as const) : ("warn" as const),
      detail: `Irradiance ${Math.round(irradianceAvg)} W/m² avg`,
    },
  ];
}
