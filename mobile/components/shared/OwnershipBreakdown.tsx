import { OwnershipRingChart, type OwnershipRingChartProps } from "./OwnershipRingChart";
import { StyleSheet, Text, View } from "react-native";
import { colors, spacing, typography } from "@emappa/ui";

export type OwnershipBreakdownProps = OwnershipRingChartProps & {
  title?: string;
  footnote?: string;
};

export function OwnershipBreakdown({
  title = "Ownership split",
  footnote,
  ...ringProps
}: OwnershipBreakdownProps) {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>{title}</Text>
      <OwnershipRingChart {...ringProps} />
      {footnote ? <Text style={styles.footnote}>{footnote}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.md },
  title: { color: colors.text, fontSize: typography.body, fontWeight: "800" },
  footnote: { color: colors.muted, fontSize: typography.small, lineHeight: 18 },
});
