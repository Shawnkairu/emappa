import { Text, View, type DimensionValue } from "react-native";
import { Label } from "@emappa/ui";
import { DeploymentProgressBar } from "../../shared";
import { EmbeddedIconBadge, EmbeddedRow, EmbeddedWhiteCard, HomeownerEmbeddedFrame } from "../homeownerEmbeddedUi";
import { deploymentProgress, formatStage, readinessLabel, type HomeownerSnapshot } from "../homeownerSnapshot";

export function HomeownerDeploymentDetailScreen() {
  return (
    <HomeownerEmbeddedFrame title="Deployment" subtitle="Milestones from qualifying through go-live — all DRS-gated.">
      {(snapshot) => <DeploymentDetailBody snapshot={snapshot} />}
    </HomeownerEmbeddedFrame>
  );
}

function DeploymentDetailBody({ snapshot }: { snapshot: HomeownerSnapshot }) {
  const building = snapshot.building!;
  const { stages, current, phases, percent } = deploymentProgress(building.stage);
  const progress = `${Math.max(8, ((current + 1) / stages.length) * 100)}%` as DimensionValue;

  return (
    <>
      <EmbeddedWhiteCard>
        <DeploymentProgressBar label="Deployment path" phases={phases} percent={percent} />
      </EmbeddedWhiteCard>
      <EmbeddedWhiteCard>
        <EmbeddedIconBadge name="construct-outline" />
        <Text style={{ color: "#2a1a12", fontSize: 17, fontWeight: "800" }}>{formatStage(building.stage)}</Text>
        <Text style={{ color: "#7a6558", fontSize: 13, lineHeight: 19, fontWeight: "600" }}>
          Funding, supplier lock, electrician scheduling, and go-live follow readiness approval — not pledge totals alone.
        </Text>
        <View style={{ height: 10, backgroundColor: "rgba(150,90,53,0.12)", borderRadius: 999, marginTop: 8 }}>
          <View style={{ height: 10, width: progress, borderRadius: 999, backgroundColor: "#c45c26" }} />
        </View>
        {stages.map((stage, index) => (
          <EmbeddedRow
            key={stage}
            label={formatStage(stage)}
            value={index <= current ? "Reached" : "Pending"}
            note={stage === "live" ? "LBRS must be 100% before tokens activate." : `DRS: ${readinessLabel(snapshot.drs)}`}
          />
        ))}
      </EmbeddedWhiteCard>
      <EmbeddedWhiteCard>
        <Label>Pre-live gates</Label>
        <EmbeddedRow
          label="Roof record"
          value={building.roofAreaM2 && building.roofAreaM2 > 0 ? "Captured" : "Missing"}
          note="Site feasibility input"
        />
        <EmbeddedRow
          label="Prepaid signal"
          value={(building.prepaidCommittedKes ?? 0) > 0 ? "Committed" : "Pending"}
          note="Demand readiness for single-home path"
        />
        <EmbeddedRow label="DRS decision" value={snapshot.drs?.decision ?? "Pending"} note="Hard blocker on deployment movement" />
      </EmbeddedWhiteCard>
    </>
  );
}
