import { Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Label, Pill, PrimaryButton } from "@emappa/ui";
import { BlockerPill, DRSProgressCard } from "../../shared";
import { homeownerDrsSections } from "../homeownerDrsSections";
import {
  EmbeddedIconBadge,
  EmbeddedRow,
  EmbeddedWhiteCard,
  HomeownerEmbeddedFrame,
} from "../homeownerEmbeddedUi";
import { readinessLabel, type HomeownerSnapshot } from "../homeownerSnapshot";

export function HomeownerDrsDetailScreen() {
  return (
    <HomeownerEmbeddedFrame title="Readiness" subtitle="Scenario C §8 — property, site, load, capital, hardware, and legal gates.">
      {(snapshot) => <DrsDetailBody snapshot={snapshot} />}
    </HomeownerEmbeddedFrame>
  );
}

function DrsDetailBody({ snapshot }: { snapshot: HomeownerSnapshot }) {
  const router = useRouter();

  if (!snapshot.drs) {
    return (
      <EmbeddedWhiteCard>
        <EmbeddedIconBadge name="shield-checkmark-outline" />
        <Text style={{ color: "#2a1a12", fontSize: 17, fontWeight: "800" }}>No readiness yet</Text>
        <Text style={{ color: "#7a6558" }}>No DRS result was returned for this property.</Text>
      </EmbeddedWhiteCard>
    );
  }

  const sections = homeownerDrsSections(snapshot.drs);

  return (
    <>
      <DRSProgressCard drs={{ ...snapshot.drs, label: readinessLabel(snapshot.drs) }} />
      <EmbeddedWhiteCard>
        <Label>DRS categories</Label>
        <Text style={{ color: "#7a6558", fontSize: 13, lineHeight: 19, fontWeight: "600" }}>
          Critical gates block funding, supplier lock, scheduling, and go-live regardless of display score.
        </Text>
        {sections.map((section) => (
          <View key={section.id} style={{ borderTopWidth: 1, borderTopColor: "rgba(150,90,53,0.12)", paddingTop: 12, marginTop: 8, gap: 6 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
              <Text style={{ color: "#2a1a12", fontSize: 14, fontWeight: "800", flex: 1 }}>{section.title}</Text>
              <Pill tone={section.status === "ready" ? "good" : section.status === "review" ? "warn" : "bad"}>
                {section.scorePct}%
              </Pill>
            </View>
            {section.checks.map((check) => (
              <Text key={check} style={{ color: "#7a6558", fontSize: 12, fontWeight: "600", lineHeight: 17 }}>
                · {check}
              </Text>
            ))}
            {section.critical ? <Text style={{ color: "#b45309", fontSize: 11, fontWeight: "700" }}>Critical gate</Text> : null}
          </View>
        ))}
      </EmbeddedWhiteCard>
      {snapshot.drs.reasons.length > 0 ? (
        <EmbeddedWhiteCard>
          <Label>Open blockers</Label>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {snapshot.drs.reasons.map((reason) => (
              <BlockerPill key={reason} label={reason} severity="warning" />
            ))}
          </View>
          <PrimaryButton onPress={() => router.push("/(homeowner)/_embedded/blocker-detail")}>Blocker resolution</PrimaryButton>
        </EmbeddedWhiteCard>
      ) : (
        <EmbeddedWhiteCard>
          <EmbeddedRow label="Blockers" value="None" note="All critical gates reported clear." />
        </EmbeddedWhiteCard>
      )}
    </>
  );
}
