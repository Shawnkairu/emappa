import { Text, View } from "react-native";
import { typography } from "@emappa/ui";
import {
  colors,
  ElectricianActionList,
  ElectricianMetricCard,
  ElectricianScaffold,
  Label,
  Pill,
  GlassCard,
} from "./ElectricianShared";

export function ElectricianEarningsScreen() {
  return (
    <ElectricianScaffold
      section="Pay"
      title="Job Pay"
      subtitle="Proof unlocks payout."
      actions={["Capture proof", "Service ticket", "Profile"]}
      hero={(building) => ({
        label: "Closeout",
        value: building.roleViews.electrician.checklistComplete === building.roleViews.electrician.checklistTotal ? "Ready" : "Pending",
        sub: "Payout follows approved work",
        tone: building.roleViews.electrician.checklistComplete === building.roleViews.electrician.checklistTotal ? "good" : "warn",
      })}
    >
      {(building) => {
        const view = building.roleViews.electrician;
        const complete = view.checklistComplete === view.checklistTotal;

        return (
          <>
            <GlassCard>
              <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 14 }}>
                <View style={{ flex: 1 }}>
                  <Label>Current job</Label>
                  <Text style={{ color: colors.text, fontSize: typography.title, fontWeight: "800", letterSpacing: -0.5, marginTop: 6 }}>
                    {building.project.name}
                  </Text>
                  <Text style={{ color: colors.muted, fontSize: typography.small, lineHeight: 19, marginTop: 6 }}>
                    Approved proof releases the job payout.
                  </Text>
                </View>
                <Pill tone={complete ? "good" : "warn"}>{complete ? "payable" : "proof"}</Pill>
              </View>
            </GlassCard>

            <View style={{ flexDirection: "row", gap: 12 }}>
              <View style={{ flex: 1 }}>
                <ElectricianMetricCard label="Estimate" value="KES 84k" detail="Current scope." />
              </View>
              <View style={{ flex: 1 }}>
                <ElectricianMetricCard label="Proof" value={`${view.checklistComplete}/${view.checklistTotal}`} detail="Closeout." />
              </View>
            </View>

            <ElectricianActionList
              eyebrow="Payout gates"
              title="What unlocks pay"
              items={[
                { label: "Site proof", detail: "Photos and readings attached.", status: complete ? "done" : "open", tone: complete ? "good" : "warn" },
                { label: "Ops approval", detail: "Internal signoff.", status: complete ? "ready" : "wait", tone: complete ? "good" : "neutral" },
                { label: "Service hold", detail: view.maintenanceTickets === 0 ? "No open tickets." : "Resolve service tickets.", status: view.maintenanceTickets === 0 ? "clear" : "hold", tone: view.maintenanceTickets === 0 ? "good" : "warn" },
              ]}
            />
          </>
        );
      }}
    </ElectricianScaffold>
  );
}
