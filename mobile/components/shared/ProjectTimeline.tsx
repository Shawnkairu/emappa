import { StyleSheet, Text, View } from "react-native";
import { colors, officialPalette, radius, spacing, typography } from "@emappa/ui";

export type TimelineStep = {
  key: string;
  label: string;
  status: "complete" | "current" | "upcoming" | "blocked";
  detail?: string;
};

export type ProjectTimelineProps = {
  steps: TimelineStep[];
  title?: string;
};

const STATUS_COLORS: Record<TimelineStep["status"], string> = {
  complete: colors.green,
  current: officialPalette.foxOrange,
  upcoming: officialPalette.scarfOat,
  blocked: colors.red,
};

export function ProjectTimeline({ steps, title }: ProjectTimelineProps) {
  return (
    <View style={styles.wrap}>
      {title ? <Text style={styles.title}>{title}</Text> : null}
      {steps.map((step, index) => (
        <View key={step.key} style={styles.step}>
          <View style={styles.rail}>
            <View style={[styles.dot, { backgroundColor: STATUS_COLORS[step.status] }]} />
            {index < steps.length - 1 ? <View style={styles.line} /> : null}
          </View>
          <View style={styles.copy}>
            <Text style={styles.label}>{step.label}</Text>
            {step.detail ? <Text style={styles.detail}>{step.detail}</Text> : null}
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.sm },
  title: { color: colors.text, fontSize: typography.body, fontWeight: "800" },
  step: { flexDirection: "row", gap: spacing.sm },
  rail: { alignItems: "center", width: 16 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  line: { flex: 1, width: 2, backgroundColor: "rgba(125, 87, 52, 0.14)", marginVertical: 4 },
  copy: { flex: 1, paddingBottom: spacing.sm, gap: 2 },
  label: { color: colors.text, fontSize: typography.small, fontWeight: "700" },
  detail: { color: colors.muted, fontSize: typography.micro, lineHeight: 16 },
});
