import { StyleSheet, Text, View } from "react-native";
import { colors, officialPalette, spacing, typography } from "@emappa/ui";

export type RatingsSummaryProps = {
  average: number;
  count: number;
  label?: string;
};

export function RatingsSummary({ average, count, label = "Ratings" }: RatingsSummaryProps) {
  const clamped = Math.max(0, Math.min(5, average));
  const fullStars = Math.floor(clamped);
  const hasHalf = clamped - fullStars >= 0.5;

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.row}>
        <Text style={styles.average}>{clamped.toFixed(1)}</Text>
        <View style={styles.stars}>
          {Array.from({ length: 5 }).map((_, index) => (
            <Text
              key={index}
              style={[
                styles.star,
                index < fullStars && styles.starFull,
                index === fullStars && hasHalf && styles.starHalf,
              ]}
            >
              ★
            </Text>
          ))}
        </View>
        <Text style={styles.count}>{count.toLocaleString()} reviews</Text>
      </View>
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
  row: { flexDirection: "row", alignItems: "center", gap: spacing.sm, flexWrap: "wrap" },
  average: { color: colors.text, fontSize: 24, fontWeight: "800", letterSpacing: -0.5 },
  stars: { flexDirection: "row" },
  star: { color: officialPalette.scarfOat, fontSize: 16 },
  starFull: { color: officialPalette.foxOrange },
  starHalf: { color: officialPalette.softCinnamon },
  count: { color: colors.muted, fontSize: typography.small, fontWeight: "600" },
});
