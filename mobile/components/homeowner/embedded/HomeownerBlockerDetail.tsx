import { Linking, Text, View } from "react-native";
import { Label, Pill, PrimaryButton } from "@emappa/ui";
import { BlockerPill } from "../../shared";
import { EmbeddedIconBadge, EmbeddedRow, EmbeddedWhiteCard, HomeownerEmbeddedFrame } from "../homeownerEmbeddedUi";
import type { HomeownerSnapshot } from "../homeownerSnapshot";

export function HomeownerBlockerDetailScreen() {
  return (
    <HomeownerEmbeddedFrame title="Blockers" subtitle="What is blocking deployment and who can help resolve it.">
      {(snapshot) => <BlockerDetailBody snapshot={snapshot} />}
    </HomeownerEmbeddedFrame>
  );
}

function BlockerDetailBody({ snapshot }: { snapshot: HomeownerSnapshot }) {
  const blockers = snapshot.drs?.reasons ?? [];

  if (blockers.length === 0) {
    return (
      <EmbeddedWhiteCard>
        <EmbeddedIconBadge name="checkmark-circle-outline" />
        <Text style={{ color: "#2a1a12", fontSize: 17, fontWeight: "800" }}>No active blockers</Text>
        <Text style={{ color: "#7a6558" }}>DRS returned no open blockers. Funding and scheduling can proceed when other gates clear.</Text>
      </EmbeddedWhiteCard>
    );
  }

  return (
    <>
      <EmbeddedWhiteCard>
        <Label>Open blockers</Label>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {blockers.map((reason) => (
            <BlockerPill key={reason} label={reason} severity="warning" />
          ))}
        </View>
      </EmbeddedWhiteCard>
      {blockers.map((reason, index) => (
        <EmbeddedWhiteCard key={reason}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <Text style={{ color: "#2a1a12", fontSize: 15, fontWeight: "800", flex: 1 }}>{reason}</Text>
            <Pill tone="warn">Open</Pill>
          </View>
          <EmbeddedRow label="Owner" value={blockerOwner(reason)} note="Primary resolver for this gate" />
          <EmbeddedRow label="Your action" value={homeownerAction(reason)} note="Steps you can take now" />
          <EmbeddedRow label="ETA" value={index === 0 ? "1–3 days" : "3–7 days"} note="Pilot estimate — not a commitment" />
        </EmbeddedWhiteCard>
      ))}
      <EmbeddedWhiteCard>
        <Label>Need help?</Label>
        <Text style={{ color: "#7a6558", fontSize: 13, lineHeight: 19, fontWeight: "600" }}>
          e.mappa ops can coordinate electrician, provider, and financier stakeholders without exposing private counterpart finances.
        </Text>
        <PrimaryButton onPress={() => Linking.openURL("mailto:support@emappa.test?subject=Homeowner%20DRS%20blocker")}>
          Contact support
        </PrimaryButton>
      </EmbeddedWhiteCard>
    </>
  );
}

function blockerOwner(reason: string) {
  const lower = reason.toLowerCase();
  if (lower.includes("electrician") || lower.includes("labor")) {
    return "Vetted electrician";
  }
  if (lower.includes("capital") || lower.includes("fund")) {
    return "Financier / capital desk";
  }
  if (lower.includes("roof") || lower.includes("site")) {
    return "You (site owner)";
  }
  if (lower.includes("legal") || lower.includes("utility")) {
    return "Compliance desk";
  }
  return "e.mappa ops";
}

function homeownerAction(reason: string) {
  const lower = reason.toLowerCase();
  if (lower.includes("roof") || lower.includes("site")) {
    return "Upload roof / DB evidence";
  }
  if (lower.includes("load") || lower.includes("sizing")) {
    return "Complete load profile";
  }
  if (lower.includes("authority") || lower.includes("title")) {
    return "Upload authority docs";
  }
  return "Review checklist item";
}
