import { StyleSheet, Text, View } from "react-native";
import { colors, officialPalette, spacing, typography } from "@emappa/ui";

export type LoadProfileLevel = "L1" | "L2" | "L3";

const LEVEL_COPY: Record<LoadProfileLevel, { label: string; detail: string }> = {
  L1: { label: "Fast estimate", detail: "Appliance checklist + receipt photo." },
  L2: { label: "Improved", detail: "Daytime/evening split captured." },
  L3: { label: "High confidence", detail: "Verified against meter evidence." },
};

export function LoadProfileConfidenceMeter({ level = "L1" }: { level?: LoadProfileLevel }) {
  const copy = LEVEL_COPY[level];
  const fill = level === "L3" ? 1 : level === "L2" ? 0.66 : 0.33;

  return (
    <View style={styles.wrap}>
      <View style={styles.header}>
        <Text style={styles.title}>Load profile · {level}</Text>
        <Text style={styles.confidence}>{copy.label}</Text>
      </View>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${fill * 100}%` }]} />
      </View>
      <Text style={styles.detail}>{copy.detail}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.sm },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  title: { color: colors.text, fontSize: typography.small, fontWeight: "800" },
  confidence: { color: officialPalette.burntChestnut, fontSize: typography.micro, fontWeight: "800", textTransform: "uppercase" },
  track: { height: 8, borderRadius: 999, backgroundColor: colors.panelSoft, overflow: "hidden" },
  fill: { height: 8, borderRadius: 999, backgroundColor: officialPalette.foxOrange },
  detail: { color: colors.muted, fontSize: typography.micro, lineHeight: 17 },
});
