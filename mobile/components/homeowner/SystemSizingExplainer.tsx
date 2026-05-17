import { useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { colors, officialPalette, PrimaryButton, spacing, typography } from "@emappa/ui";

export type SystemSizingExplainerProps = {
  arrayKw?: number;
  batteryKwh?: number;
  dailyLoadKwh?: number;
  roofAreaM2?: number | null;
};

export function SystemSizingExplainer({ arrayKw, batteryKwh, dailyLoadKwh, roofAreaM2 }: SystemSizingExplainerProps) {
  const [open, setOpen] = useState(false);
  const arrayLabel = arrayKw ? `${arrayKw.toFixed(1)} kW` : "provider-sized array";
  const batteryLabel = batteryKwh ? `${batteryKwh.toFixed(0)} kWh` : "battery bank";
  const loadLabel = dailyLoadKwh ? `${dailyLoadKwh.toFixed(1)} kWh/day` : "your load profile";

  return (
    <>
      <Pressable accessibilityRole="button" onPress={() => setOpen(true)} style={styles.trigger}>
        <Text style={styles.triggerText}>Why this system size?</Text>
      </Pressable>

      <Modal visible={open} animationType="slide" transparent onRequestClose={() => setOpen(false)}>
        <View style={styles.backdrop}>
          <View style={styles.sheet}>
            <Text style={styles.eyebrow}>System sizing</Text>
            <Text style={styles.title}>Sized for self-consumption first</Text>
            <Text style={styles.body}>
              e.mappa sizes {arrayLabel}, {batteryLabel}, and inverter capacity around {loadLabel} — not export hype. Export,
              net metering, and trading proceeds appear only when explicitly enabled.
            </Text>
            {roofAreaM2 ? (
              <Text style={styles.body}>
                Usable roof record: {Math.round(roofAreaM2)} m² — array footprint stays within traced or declared space.
              </Text>
            ) : null}
            <View style={styles.bullets}>
              <Bullet text="Array targets daytime load and battery fill, not maximum nameplate." />
              <Bullet text="Battery bridges evening peaks; grid fallback stays visible and outside the pledge wallet." />
              <Bullet text="Oversizing without external demand increases waste and slows payback." />
            </View>
            <PrimaryButton onPress={() => setOpen(false)}>Close</PrimaryButton>
          </View>
        </View>
      </Modal>
    </>
  );
}

function Bullet({ text }: { text: string }) {
  return (
    <View style={styles.bulletRow}>
      <View style={styles.dot} />
      <Text style={styles.bulletText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  trigger: { alignSelf: "flex-start", paddingVertical: 4 },
  triggerText: { color: colors.orangeDeep, fontSize: typography.small, fontWeight: "800" },
  backdrop: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(44, 28, 18, 0.45)",
    padding: spacing.lg,
  },
  sheet: {
    gap: spacing.md,
    borderRadius: 28,
    backgroundColor: colors.white,
    padding: spacing.lg,
  },
  eyebrow: {
    color: colors.orangeDeep,
    fontSize: typography.micro,
    fontWeight: "800",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  title: { color: colors.text, fontSize: typography.title, fontWeight: "800", letterSpacing: -0.4 },
  body: { color: colors.muted, fontSize: typography.small, lineHeight: 20 },
  bullets: { gap: spacing.sm },
  bulletRow: { flexDirection: "row", alignItems: "flex-start", gap: spacing.sm },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: officialPalette.foxOrange,
    marginTop: 6,
  },
  bulletText: { flex: 1, color: colors.text, fontSize: typography.small, lineHeight: 20 },
});
