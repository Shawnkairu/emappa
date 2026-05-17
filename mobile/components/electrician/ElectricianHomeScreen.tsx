import { Text, View } from "react-native";
import { spacing, typography } from "@emappa/ui";
import { SystemProjectImmersiveHero } from "../energy/SystemImmersiveOverview";
import {
  colors,
  ElectricianBrief,
  ElectricianFieldRow,
  ElectricianMetricCard,
  ElectricianScaffold,
  StatusOrb,
  Label,
  Pill,
  GlassCard,
} from "./ElectricianShared";

export function ElectricianHomeScreen() {
  return (
    <ElectricianScaffold
      immersive
      section="Home"
      title="Today"
      subtitle="One site. One next step."
      actions={["Capture proof", "Crew queue", "Lead card"]}
      hero={(building) => ({
        label: building.project.name,
        value: `${building.roleViews.electrician.checklistComplete}/${building.roleViews.electrician.checklistTotal}`,
        sub: "Checklist complete",
        tone:
          building.roleViews.electrician.checklistComplete === building.roleViews.electrician.checklistTotal
            ? "good"
            : building.roleViews.electrician.certified
              ? "warn"
              : "bad",
      })}
    >
      {(building) => {
        const view = building.roleViews.electrician;
        const drs = building.drs;
        const drsInput = building.project.drs;
        const drsProgress = drs.score <= 1 ? drs.score : drs.score / 100;

        return (
          <>
            <View style={{ marginHorizontal: -spacing.lg, marginTop: spacing.sm }}>
              <SystemProjectImmersiveHero
                siteName={building.project.name}
                weatherHint="Field proof · crew queue"
                ringLabel="LBRS and DRS must clear before token settlements pay job rows."
                ringProgress={drsProgress}
                ringCenterHint="DRS"
                statusLine={drs.label ?? drs.decision}
                primaryCtaHint="Checklist & photo proof"
                callouts={[
                  { label: "DRS", value: `${Math.round(drsProgress * 100)}` },
                  { label: "Checklist", value: `${view.checklistComplete}/${view.checklistTotal}` },
                  { label: "Lead", value: view.certified ? "Certified" : "Open" },
                  { label: "Tickets", value: String(view.maintenanceTickets) },
                ]}
                summaryCards={[
                  { label: "Electrician", value: String(drs.components.installerReadiness), hint: "DRS component", icon: "construct-outline" },
                  { label: "Proof rows", value: `${view.checklistComplete}/${view.checklistTotal}`, hint: "Job checklist", icon: "clipboard-outline" },
                  { label: "Tickets", value: String(view.maintenanceTickets), hint: "Service queue", icon: "warning-outline" },
                ]}
              />
            </View>
            <ElectricianBrief
              eyebrow="Active job"
              title={building.project.name}
              body={building.project.locationBand}
              rows={[
                {
                  label: "Lead",
                  value: view.certified ? "Ready" : "Blocked",
                  note: "Certified lead required.",
                  tone: view.certified ? "good" : "bad",
                },
                {
                  label: "Proof",
                  value: `${view.checklistComplete}/${view.checklistTotal}`,
                  note: "Photos, readings, connectivity.",
                  tone: view.checklistComplete === view.checklistTotal ? "good" : "warn",
                },
                {
                  label: "DRS",
                  value: building.drs.label,
                  note: "Readiness gate.",
                  tone: building.drs.decision === "deployment_ready" ? "good" : building.drs.decision === "review" ? "warn" : "bad",
                },
              ]}
            />

            <GlassCard>
              <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 14 }}>
                <View style={{ flex: 1 }}>
                  <Label>Crew board</Label>
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
                    Field board
                  </Text>
                  <Text style={{ color: colors.muted, fontSize: typography.small, lineHeight: 19, marginTop: 7 }}>
                    Task-first closeout.
                  </Text>
                </View>
                <Pill tone={drsInput.monitoringConnectivityResolved && drsInput.settlementDataTrusted ? "good" : "warn"}>
                  {drsInput.monitoringConnectivityResolved && drsInput.settlementDataTrusted ? "stable" : "watch"}
                </Pill>
              </View>
              <View style={{ gap: 10, marginTop: 16 }}>
                {[
                  ["Site", building.project.locationBand, "Named building."],
                  [
                    "Next",
                    drsInput.solarApartmentCapacityFitVerified &&
                      drsInput.apartmentAtsMeterMappingVerified &&
                      drsInput.atsKplcSwitchingVerified
                      ? "Connectivity"
                      : "ATS path proof",
                    "Capacity fit, ATS map, switching test.",
                  ],
                  ["Risk", view.maintenanceTickets === 0 ? "Clear" : `${view.maintenanceTickets} ticket`, "Service stays visible."],
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

            <View style={{ flexDirection: "row", gap: 12 }}>
              <View style={{ flex: 1 }}>
                <ElectricianMetricCard
                  label="Readiness"
                  value={`${building.drs.components.installerReadiness}`}
                  detail="Electrician readiness gate."
                />
              </View>
              <View style={{ flex: 1 }}>
                <ElectricianMetricCard
                  label="Service"
                  value={`${view.maintenanceTickets}`}
                  detail="Open tickets."
                />
              </View>
            </View>

            <GlassCard>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 16 }}>
                <StatusOrb tone={view.certified ? "good" : "bad"} />
                <View style={{ flex: 1 }}>
                  <Label>Dispatch</Label>
                  <Text style={{ color: colors.text, fontSize: typography.title, fontWeight: "800", letterSpacing: -0.5, marginTop: 5 }}>
                    {view.certified ? "Crew can move." : "Lead missing."}
                  </Text>
                  <Text style={{ color: colors.muted, fontSize: typography.small, lineHeight: 19, marginTop: 5 }}>
                    License clears the schedule.
                  </Text>
                </View>
              </View>
            </GlassCard>
          </>
        );
      }}
    </ElectricianScaffold>
  );
}
