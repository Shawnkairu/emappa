import { StyleSheet, Text, View } from "react-native";
import { colors, officialPalette, spacing, typography } from "@emappa/ui";
import type { SizingWarning } from "./homeownerSizingWarnings";

export function SizingWarningList({ warnings }: { warnings: SizingWarning[] }) {
  if (!warnings.length) {
    return null;
  }

  return (
    <View style={styles.stack}>
      {warnings.map((warning) => (
        <View key={warning.code} style={styles.card}>
          <Text style={styles.title}>{warning.title}</Text>
          <Text style={styles.body}>{warning.body}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  stack: { gap: spacing.sm },
  card: {
    gap: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: `${officialPalette.rustBrown}44`,
    backgroundColor: `${officialPalette.furCream}88`,
    padding: 14,
  },
  title: { color: colors.text, fontSize: typography.small, fontWeight: "800" },
  body: { color: colors.muted, fontSize: typography.small, lineHeight: 18 },
});
