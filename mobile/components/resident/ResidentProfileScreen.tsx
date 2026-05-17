import { useState } from "react";
import { Linking, StyleSheet, Switch, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { PaletteCard, colors, officialPalette, spacing, typography } from "@emappa/ui";
import type { ProjectedBuilding } from "@emappa/shared";
import { LiveSupplyIndicator, PilotBanner } from "../shared";
import { ProfileEssentials } from "../ProfileEssentials";
import { LoadProfileConfidenceMeter } from "./LoadProfileConfidenceMeter";
import { ResidentInfoCard, ResidentMetricGrid, ResidentPrimaryButton, ResidentScreenFrame } from "./ResidentScaffold";
import { deriveCapacityQueueStatus, isResidentLive } from "./residentHomeState";
import { ROLE_TINT } from "./residentTint";

export function ResidentProfileScreen() {
  return (
    <ResidentScreenFrame section="Profile" title="Profile" subtitle="Building membership, load profile, and notifications.">
      {(building, refetch) => <ResidentProfileBody building={building} refetch={refetch} />}
    </ResidentScreenFrame>
  );
}

function ResidentProfileBody({ building, refetch }: { building: ProjectedBuilding; refetch: () => void }) {
  const router = useRouter();
  const trustReady = building.project.prepaidCommittedKes > 0 && building.drs.reasons.length === 0;
        const live = isResidentLive(building);
        const queue = deriveCapacityQueueStatus(building);
        const [notifyAts, setNotifyAts] = useState(true);
        const [notifyCapacity, setNotifyCapacity] = useState(true);
        const [notifyDrs, setNotifyDrs] = useState(true);
        const [notifyTokens, setNotifyTokens] = useState(live);
        const [notifyFaults, setNotifyFaults] = useState(true);

        return (
          <>
            <PilotBanner compact />
            <PaletteCard borderRadius={34} padding={20} style={{ ...styles.trustCard, backgroundColor: ROLE_TINT.bg }}>
              <View style={styles.profileRow}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{(building.project.name.trim().slice(0, 1) || "?").toUpperCase()}</Text>
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>V</Text>
                  </View>
                </View>
                <View style={styles.profileStats}>
                  <ProfileStat value={`${building.project.units}`} label="Homes" />
                  <ProfileStat value={building.project.stage} label="Stage" />
                  <ProfileStat value={trustReady ? "Verified" : "Review"} label="Access" />
                </View>
              </View>
              <Text style={styles.name}>{building.project.name}</Text>
              <Text style={styles.location}>{building.project.locationBand}</Text>
            </PaletteCard>

            <ResidentInfoCard eyebrow="Building & unit" title="Membership" detail="Unit and meter mapping stay scoped to your apartment.">
              <View style={styles.rows}>
                <ProfileRow label="Building" value={building.project.name} />
                <ProfileRow label="Band" value={building.project.locationBand} />
                <ProfileRow label="Unit" value="Pilot unit (confirm in onboarding)" />
                <ProfileRow label="Capacity" value={queue.replace(/_/g, " ")} />
              </View>
              {live ? (
                <LiveSupplyIndicator atsState="activated" supply="solar" />
              ) : (
                <LiveSupplyIndicator atsState="not_mapped" supply="kplc" />
              )}
            </ResidentInfoCard>

            <ResidentInfoCard eyebrow="Load profile" title="Estimate confidence" detail="Improve L1 → L3 to strengthen queue priority (Scenario A §7).">
              <LoadProfileConfidenceMeter level="L1" />
              <ResidentPrimaryButton
                onPress={() => router.push("/(resident)/_embedded/load-profile-edit")}
                accessibilityLabel="Edit load profile"
              >
                Edit load profile
              </ResidentPrimaryButton>
            </ResidentInfoCard>

            <ResidentInfoCard eyebrow="Notifications" title="Alerts you can control" detail="Pilot toggles — delivery rails wire with backend preferences.">
              <NotificationToggle label="ATS activation ready" value={notifyAts} onChange={setNotifyAts} />
              <NotificationToggle label="Pledge capacity cleared" value={notifyCapacity} onChange={setNotifyCapacity} />
              <NotificationToggle label="DRS milestone alerts" value={notifyDrs} onChange={setNotifyDrs} />
              <NotificationToggle label="Token low balance" value={notifyTokens} onChange={setNotifyTokens} />
              <NotificationToggle label="System fault alerts" value={notifyFaults} onChange={setNotifyFaults} />
            </ResidentInfoCard>

            <ResidentMetricGrid
              items={[
                { label: "Access", value: "Scoped", detail: "Resident-only.", tone: "good" },
                { label: "Privacy", value: "Averaged", detail: "No private counterparty finance.", tone: "good" },
                {
                  label: "Settlement",
                  value: building.drs.reasons.length === 0 ? "Trusted" : "Review",
                  detail: building.drs.reasons[0] ?? "No visible blocker.",
                  tone: building.drs.reasons.length === 0 ? "good" : "warn",
                },
                { label: "Building", value: `${building.project.units}`, detail: "Resident building." },
              ]}
            />

            <ResidentInfoCard eyebrow="Account" title="Need help?" detail="Support receives the building name and resident role.">
              <View style={{ gap: spacing.sm }}>
                <ResidentPrimaryButton
                  onPress={() =>
                    Linking.openURL(
                      `mailto:support@emappa.test?subject=${encodeURIComponent(`Resident support - ${building.project.name}`)}`,
                    )
                  }
                  accessibilityLabel="Email support about this building"
                >
                  Email support
                </ResidentPrimaryButton>
                <ResidentPrimaryButton onPress={refetch} accessibilityLabel="Refresh resident profile">
                  Refresh profile
                </ResidentPrimaryButton>
              </View>
            </ResidentInfoCard>

            <ProfileEssentials
              roleLabel="Resident"
              accountRows={[{ label: "Building", value: building.project.name, note: building.project.locationBand }]}
              supportSubject={`Resident support - ${building.project.name}`}
            />
          </>
        );
}

function ProfileStat({ value, label }: { value: string; label: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function ProfileRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

function NotificationToggle({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <View style={styles.toggleRow}>
      <Text style={styles.toggleLabel}>{label}</Text>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ false: colors.panelSoft, true: officialPalette.foxOrange }}
        accessibilityLabel={label}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  trustCard: { marginBottom: spacing.lg },
  profileRow: { flexDirection: "row", gap: spacing.lg },
  avatar: {
    alignItems: "center",
    backgroundColor: officialPalette.furCream,
    borderColor: "rgba(118, 73, 39, 0.12)",
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth * 2,
    height: 108,
    justifyContent: "center",
    width: 108,
  },
  avatarText: { color: officialPalette.burntChestnut, fontSize: 42, fontWeight: "800" },
  badge: {
    alignItems: "center",
    backgroundColor: officialPalette.foxOrange,
    borderColor: colors.white,
    borderRadius: 999,
    borderWidth: 3,
    bottom: 4,
    height: 34,
    justifyContent: "center",
    position: "absolute",
    right: 4,
    width: 34,
  },
  badgeText: { color: colors.white, fontSize: 16, fontWeight: "800" },
  profileStats: { flex: 1, justifyContent: "center" },
  stat: { borderBottomColor: colors.border, borderBottomWidth: StyleSheet.hairlineWidth, paddingVertical: 8 },
  statValue: { color: colors.text, fontSize: typography.title, fontWeight: "800", letterSpacing: -0.45 },
  statLabel: { color: colors.muted, fontSize: typography.micro, fontWeight: "700", marginTop: 2 },
  name: { color: colors.text, fontSize: typography.title + 4, fontWeight: "800", letterSpacing: -0.65, marginTop: 18 },
  location: { color: colors.muted, fontSize: typography.small, fontWeight: "700", marginTop: 4 },
  rows: { gap: spacing.sm, marginBottom: spacing.md },
  row: { flexDirection: "row", justifyContent: "space-between", gap: spacing.md },
  rowLabel: { color: colors.muted, fontSize: typography.micro, fontWeight: "800", textTransform: "uppercase" },
  rowValue: { color: colors.text, fontSize: typography.small, fontWeight: "700", flexShrink: 1, textAlign: "right" },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: spacing.sm,
    borderTopColor: colors.border,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  toggleLabel: { color: colors.text, fontSize: typography.small, fontWeight: "700", flex: 1, paddingRight: spacing.md },
});
