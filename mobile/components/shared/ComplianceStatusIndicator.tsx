import { StyleSheet, Text, View } from "react-native";
import { colors, officialPalette, radius, spacing, typography } from "@emappa/ui";

/** Scenario F §698 — compliance visibility (4 states). */
export type ComplianceStatusState = "verified" | "limited" | "restricted" | "documents_needed";

export const COMPLIANCE_STATUS_LABELS: Record<ComplianceStatusState, string> = {
  verified: "Verified",
  limited: "Limited",
  restricted: "Restricted",
  documents_needed: "Documents needed",
};

type StateVisual = { border: string; bg: string; text: string; dot: string };

const STATE_VISUALS: Record<ComplianceStatusState, StateVisual> = {
  verified: { border: colors.green + "40", bg: colors.green + "12", text: colors.green, dot: colors.green },
  limited: { border: colors.amber + "45", bg: colors.amber + "16", text: officialPalette.burntChestnut, dot: colors.amber },
  restricted: { border: colors.red + "40", bg: colors.red + "10", text: colors.red, dot: colors.red },
  documents_needed: {
    border: officialPalette.rustBrown + "55",
    bg: officialPalette.plushCaramel + "44",
    text: officialPalette.espressoShadow,
    dot: officialPalette.rustBrown,
  },
};

export type ComplianceStatusIndicatorProps = {
  status: ComplianceStatusState;
  label?: string;
  detail?: string;
};

export function ComplianceStatusIndicator({ status, label, detail }: ComplianceStatusIndicatorProps) {
  const visual = STATE_VISUALS[status];

  return (
    <View style={[styles.row, { borderColor: visual.border, backgroundColor: visual.bg }]}>
      <View style={[styles.dot, { backgroundColor: visual.dot }]} />
      <View style={styles.copy}>
        <Text style={[styles.label, { color: visual.text }]}>{label ?? COMPLIANCE_STATUS_LABELS[status]}</Text>
        {detail ? <Text style={styles.detail}>{detail}</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.sm,
  },
  dot: { width: 10, height: 10, borderRadius: 5, marginTop: 3 },
  copy: { flex: 1, gap: 2 },
  label: { fontSize: typography.small, fontWeight: "800" },
  detail: { color: colors.muted, fontSize: typography.micro, lineHeight: 16 },
});
