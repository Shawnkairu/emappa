import { Text, View } from "react-native";
import { radius, shadows, spacing, typography } from "@emappa/ui";
import {
  colors,
  GlassCard,
  ElectricianBrief,
  ElectricianScaffold,
  Label,
  Pill,
  StatusDot,
} from "./ElectricianShared";

const JOBS = [
  { name: "Riverside Apartments", stage: "Install", next: "Signoff", pill: "site", tone: "good" as const, ready: true },
  { name: "Highridge Court", stage: "Survey", next: "Access", pill: "queue", tone: "neutral" as const, ready: true },
  { name: "Tatu Heights", stage: "Lead", next: "License", pill: "hold", tone: "warn" as const, ready: false },
  { name: "Brookside Suites", stage: "Inspect", next: "Photos", pill: "today", tone: "neutral" as const, ready: true },
];

export function ElectricianJobsInboxScreen() {
  return (
    <ElectricianScaffold
      section="Jobs"
      title="Job Queue"
      subtitle="Pick the next site."
      actions={["Accept job", "Lead card", "Profile"]}
      hero={() => ({
        label: "Queue",
        value: `${JOBS.length}`,
        sub: "One site active",
        tone: "good",
      })}
    >
      {() => (
        <>
          <GlassCard>
            <Label>Jobs</Label>
            <Text style={{ color: colors.text, fontSize: typography.title, fontWeight: "800", letterSpacing: -0.5, marginTop: 6 }}>
              By urgency
            </Text>
            <View style={{ gap: spacing.sm, marginTop: spacing.lg }}>
              {JOBS.map((job) => (
                <View
                  key={job.name}
                  style={{
                    borderWidth: 1,
                    borderColor: colors.border,
                    borderRadius: radius.lg,
                    backgroundColor: colors.white,
                    padding: spacing.md,
                    ...shadows.soft,
                  }}
                >
                  <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.md }}>
                    <StatusDot complete={job.ready} />
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={{ color: colors.text, fontSize: typography.body, fontWeight: "800" }}>{job.name}</Text>
                      <Text style={{ color: colors.muted, fontSize: typography.small, marginTop: 3 }}>
                        {job.stage} · {job.next}
                      </Text>
                    </View>
                    <Pill tone={job.tone}>{job.pill}</Pill>
                  </View>
                </View>
              ))}
            </View>
          </GlassCard>

          <ElectricianBrief
            eyebrow="Accept rule"
            title="Only dispatch ready crews."
            body="Lead, access, monitoring."
            rows={[
              { label: "Lead", value: "1/4", note: "Certified lead required.", tone: "warn" },
              { label: "Access", value: "2/4", note: "Roof + meter room.", tone: "warn" },
              { label: "Monitoring", value: "1 live", note: "Telemetry online.", tone: "good" },
            ]}
          />
        </>
      )}
    </ElectricianScaffold>
  );
}
