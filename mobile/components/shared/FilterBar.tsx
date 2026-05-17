import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { colors, officialPalette, radius, spacing, typography } from "@emappa/ui";

export type FilterOption = {
  key: string;
  label: string;
};

export type FilterBarProps = {
  options: FilterOption[];
  selectedKey?: string;
  onSelect?: (key: string) => void;
  label?: string;
};

export function FilterBar({ options, selectedKey, onSelect, label }: FilterBarProps) {
  return (
    <View style={styles.wrap}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {options.map((option) => {
          const active = option.key === selectedKey;
          return (
            <Pressable
              key={option.key}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              onPress={() => onSelect?.(option.key)}
              style={[styles.chip, active && styles.chipActive]}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>{option.label}</Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.xs },
  label: {
    color: colors.muted,
    fontSize: typography.micro,
    fontWeight: "700",
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  row: { gap: spacing.xs, paddingRight: spacing.sm },
  chip: {
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: "rgba(125, 87, 52, 0.18)",
    backgroundColor: colors.white,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  chipActive: {
    borderColor: officialPalette.foxOrange,
    backgroundColor: officialPalette.furCream,
  },
  chipText: { color: colors.muted, fontSize: typography.small, fontWeight: "700" },
  chipTextActive: { color: officialPalette.espressoShadow },
});
