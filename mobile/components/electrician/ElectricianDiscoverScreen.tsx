import { useRouter } from "expo-router";
import { Pressable, Text, View } from "react-native";
import { radius, shadows, spacing, typography } from "@emappa/ui";
import {
  colors,
  GlassCard,
  ElectricianFieldRow,
  ElectricianScaffold,
  Label,
  Pill,
} from "./ElectricianShared";

export function ElectricianDiscoverScreen() {
  const router = useRouter();

  return (
    <ElectricianScaffold
      section="Discover"
      title="Nearby"
      subtitle="DRS readiness, crew fit, and funding signals before dispatch."
      actions={["Projects", "Crew queue", "Compliance"]}
      hero={(building) => {
        const drs = building.drs;
        const drsProgress = drs.score <= 1 ? drs.score : drs.score / 100;
        return {
          label: building.project.name,
          value: `${Math.round(drsProgress * 100)}`,
          sub: "DRS roll-up",
          tone: building.drs.decision === "deployment_ready" ? "good" : building.drs.decision === "review" ? "warn" : "bad",
        };
      }}
    >
      {(building) => (
        <>
          <GlassCard>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
              <View style={{ flex: 1 }}>
                <Label>Eligibility pulse</Label>
                <Text
                  style={{ color: colors.text, fontSize: typography.title, fontWeight: "800", letterSpacing: -0.5, marginTop: 8 }}
                >
                  Blockers before LBRS test
                </Text>
              </View>
              <Pressable
                accessibilityRole="button"
                onPress={() => router.push("/(electrician)/projects")}
                style={{ flexShrink: 0 }}
              >
                <Pill tone="good">Open Projects</Pill>
              </Pressable>
            </View>
            <View style={{ gap: 10, marginTop: spacing.lg }}>
              {[
                ["DRS gate", building.drs.label ?? building.drs.decision, "Readiness before prepaid settlement payouts."],
                ["Site scope", building.project.locationBand, "Named building envelope only."],
                [
                  "Crew readiness",
                  building.roleViews.electrician.certified ? "Licensed lead assigned" : "Lead gap",
                  "Dispatch requires certified electrician lead.",
                ],
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
                    <Text style={{ color: colors.text, fontSize: typography.small, fontWeight: "600" }}>{value}</Text>
                  </View>
                  <Text style={{ color: colors.muted, fontSize: typography.small, lineHeight: 18, marginTop: 5 }}>{note}</Text>
                </ElectricianFieldRow>
              ))}
            </View>
          </GlassCard>

          <GlassCard>
            <Label>Adjacent sites (mock)</Label>
            <Text style={{ color: colors.muted, fontSize: typography.small, marginTop: 8, marginBottom: spacing.md }}>
              Pilot placeholders — proximity and backlog only.
            </Text>
            {["Lagoon Annex", "Kileleshwa Annex"].map((name) => (
              <View
                key={name}
                style={{
                  borderWidth: 1,
                  borderColor: colors.border,
                  borderRadius: radius.md,
                  backgroundColor: colors.white,
                  padding: spacing.md,
                  marginBottom: spacing.sm,
                  ...shadows.soft,
                }}
              >
                <Text style={{ color: colors.text, fontWeight: "800" }}>{name}</Text>
                <Text style={{ color: colors.muted, fontSize: typography.small, marginTop: 4 }}>DRS incomplete · Funding signal</Text>
              </View>
            ))}
          </GlassCard>
        </>
      )}
    </ElectricianScaffold>
  );
}
