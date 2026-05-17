import { Text, View } from "react-native";
import { Label, Pill } from "@emappa/ui";
import { EmbeddedIconBadge, EmbeddedRow, EmbeddedWhiteCard, HomeownerEmbeddedFrame } from "../homeownerEmbeddedUi";
import { formatKes, formatKwh, sumEnergy, type HomeownerSnapshot } from "../homeownerSnapshot";

export function HomeownerCompareBillScreen() {
  return (
    <HomeownerEmbeddedFrame title="Compare bill" subtitle="Current grid spend vs e.mappa projection — estimates until live metering.">
      {(snapshot) => <CompareBillBody snapshot={snapshot} />}
    </HomeownerEmbeddedFrame>
  );
}

function CompareBillBody({ snapshot }: { snapshot: HomeownerSnapshot }) {
  const generation = sumEnergy(snapshot.energy?.generation_kwh);
  const load = sumEnergy(snapshot.energy?.load_kwh);
  const isLive = snapshot.building!.stage === "live";
  const gridTariff = 28;
  const solarTariff = 22;
  const monthlyLoadKwh = Math.max(load * 30, 320);
  const projectedSolarKwh = Math.max(generation * 30, monthlyLoadKwh * 0.62);
  const gridBill = monthlyLoadKwh * gridTariff;
  const emappaBill = projectedSolarKwh * solarTariff + (monthlyLoadKwh - projectedSolarKwh) * gridTariff;
  const savings = Math.max(0, gridBill - emappaBill);

  return (
    <>
      <EmbeddedWhiteCard>
        <EmbeddedIconBadge name="stats-chart-outline" />
        <Text style={{ color: "#2a1a12", fontSize: 17, fontWeight: "800" }}>Monthly comparison</Text>
        <Text style={{ color: "#7a6558", fontSize: 13, lineHeight: 19, fontWeight: "600" }}>
          {isLive ? "Uses today's measured load where available." : "Pre-live projection from load profile — labeled estimate."}
        </Text>
        <Pill tone={isLive ? "good" : "warn"}>{isLive ? "Measured context" : "Projected estimate"}</Pill>
      </EmbeddedWhiteCard>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
        <BillColumn title="Current grid" amount={gridBill} detail={`${formatKwh(monthlyLoadKwh)} @ KSh ${gridTariff}/kWh`} tone="bad" />
        <BillColumn
          title="e.mappa projection"
          amount={emappaBill}
          detail={`${formatKwh(projectedSolarKwh)} solar @ KSh ${solarTariff}/kWh`}
          tone="good"
        />
      </View>
      <EmbeddedWhiteCard>
        <Label>Breakdown</Label>
        <EmbeddedRow label="Grid-only bill" value={formatKes(gridBill)} note="KPLC reference tariff" />
        <EmbeddedRow label="Projected e.mappa" value={formatKes(emappaBill)} note="Solar + grid fallback mix" />
        <EmbeddedRow label="Estimated savings" value={formatKes(savings)} note="Not a payout — avoided grid cost" />
        <EmbeddedRow label="Coverage" value={`${Math.round((projectedSolarKwh / monthlyLoadKwh) * 100)}%`} note="Solar share of monthly load" />
      </EmbeddedWhiteCard>
      <EmbeddedWhiteCard>
        <Label>Comparison rule</Label>
        <Text style={{ color: "#7a6558", fontSize: 13, lineHeight: 19, fontWeight: "600" }}>
          No settlement or payout claim from this view. Cash comparisons wait for wallet and settlement rows after go-live.
        </Text>
      </EmbeddedWhiteCard>
    </>
  );
}

function BillColumn({
  title,
  amount,
  detail,
  tone,
}: {
  title: string;
  amount: number;
  detail: string;
  tone: "good" | "bad";
}) {
  return (
    <EmbeddedWhiteCard style={{ width: "48%", minHeight: 140 }}>
      <Label>{title}</Label>
      <Text style={{ color: tone === "good" ? "#15803d" : "#b45309", fontSize: 22, fontWeight: "900", letterSpacing: -0.5 }}>
        {formatKes(amount)}
      </Text>
      <Text style={{ color: "#7a6558", fontSize: 12, fontWeight: "600", lineHeight: 17 }}>{detail}</Text>
    </EmbeddedWhiteCard>
  );
}
