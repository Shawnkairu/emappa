import { Text, View } from "react-native";
import type { ProjectedBuilding } from "@emappa/shared";
import { typography } from "@emappa/ui";
import {
  colors,
  ElectricianBrief,
  ElectricianFieldRow,
  ElectricianMetricCard,
  Label,
  Pill,
  GlassCard,
} from "./ElectricianShared";

/** Certification, license, dispatch, and field credential checklist — embedded in Profile per IA-U7. */
export function ElectricianComplianceEmbedded({ building }: { building: ProjectedBuilding }) {
  const certified = building.roleViews.electrician.certified;

  return (
    <>
      <View style={{ marginBottom: 8 }}>
        <Label>Certification & compliance</Label>
        <Text style={{ color: colors.muted, fontSize: 13, marginTop: 6, lineHeight: 19 }}>
          Tiers, training, dispatch gate, and LBRS readiness — surfaced here, not as a separate tab.
        </Text>
      </View>

      <ElectricianBrief
        eyebrow="Gate"
        title={certified ? "Crew can be scheduled." : "Lead proof missing."}
        body="One accountable lead."
        rows={[
          {
            label: "License",
            value: certified ? "Verified" : "Missing",
            note: "Current credential.",
            tone: certified ? "good" : "bad",
          },
          {
            label: "DRS",
            value: `${building.drs.components.installerReadiness}`,
            note: "Readiness.",
            tone: building.drs.components.installerReadiness >= 80 ? "good" : "warn",
          },
          {
            label: "Dispatch",
            value: certified ? "Allowed" : "Blocked",
            note: "Schedule gate.",
            tone: certified ? "good" : "bad",
          },
        ]}
      />

      <GlassCard>
        <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 14 }}>
          <View style={{ flex: 1 }}>
            <Label>Certificate</Label>
            <Text
              style={{
                color: colors.text,
                fontSize: typography.title,
                fontWeight: "700",
                letterSpacing: -0.5,
                marginTop: 6,
                lineHeight: typography.title + 4,
              }}
            >
              Field credential
            </Text>
            <Text style={{ color: colors.muted, fontSize: typography.small, lineHeight: 19, marginTop: 7 }}>
              Site-level credential record for this deployment.
            </Text>
          </View>
          <Pill tone={certified ? "good" : "bad"}>{certified ? "valid" : "hold"}</Pill>
        </View>
        <View style={{ gap: 10, marginTop: 16 }}>
          {[
            ["License", certified ? "Verified" : "Missing", "Current credential."],
            ["Assignment", certified ? "Bound" : "Unbound", building.project.name],
            ["Dispatch", certified ? "Open" : "Closed", "Eligibility clears the job."],
          ].map(([label, value, note]) => (
            <ElectricianFieldRow key={label}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12 }}>
                <Text
                  style={{
                    color: colors.muted,
                    fontSize: typography.micro,
                    fontWeight: "600",
                    letterSpacing: 0.65,
                    textTransform: "uppercase",
                  }}
                >
                  {label}
                </Text>
                <Text style={{ color: certified ? colors.green : colors.red, fontSize: typography.small, fontWeight: "600" }}>{value}</Text>
              </View>
              <Text style={{ color: colors.muted, fontSize: typography.small, lineHeight: 18, marginTop: 5 }}>{note}</Text>
            </ElectricianFieldRow>
          ))}
        </View>
      </GlassCard>

      <ElectricianMetricCard label="Scheduling state" value={certified ? "Cleared" : "Hold"} detail="No lead, no schedule." />
    </>
  );
}
