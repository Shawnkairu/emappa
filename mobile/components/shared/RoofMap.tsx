import { StyleSheet, Text, View } from "react-native";
import { colors, officialPalette, shadows, spacing, typography } from "@emappa/ui";

/** Scenarios B/C §6 — roof footprint over satellite-style placeholder. */
export type RoofMapProps = {
  title?: string;
  usableAreaSqm?: number;
  panelCount?: number;
  /** When true, draws a traced polygon overlay on the satellite block. */
  showPolygon?: boolean;
};

export function RoofMap({
  title = "Roof map",
  usableAreaSqm = 0,
  panelCount = 0,
  showPolygon = true,
}: RoofMapProps) {
  return (
    <View style={styles.card}>
      <View style={styles.satellite}>
        <View style={styles.satelliteGrid} />
        {showPolygon ? (
          <View style={styles.polygon}>
            <View style={styles.polygonInner} />
          </View>
        ) : null}
        <View style={styles.panelGrid}>
          {Array.from({ length: 6 }).map((_, index) => (
            <View key={index} style={styles.panel} />
          ))}
        </View>
      </View>
      <View style={styles.copy}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.detail}>
          {usableAreaSqm.toLocaleString()} sqm usable · {panelCount.toLocaleString()} panels
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    ...shadows.card,
    gap: spacing.md,
    borderRadius: 24,
    borderColor: colors.border,
    borderWidth: 1,
    backgroundColor: colors.white,
    padding: spacing.md,
  },
  satellite: {
    minHeight: 150,
    overflow: "hidden",
    borderRadius: 22,
    backgroundColor: officialPalette.scarfOat + "66",
  },
  satelliteGrid: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.35,
    backgroundColor: officialPalette.guitarMaple + "22",
  },
  polygon: {
    position: "absolute",
    top: 22,
    right: 28,
    bottom: 22,
    left: 28,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: officialPalette.foxOrange,
    borderStyle: "dashed",
    backgroundColor: `${officialPalette.foxOrange}18`,
  },
  polygonInner: {
    flex: 1,
    margin: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: `${officialPalette.foxOrange}55`,
  },
  panelGrid: {
    flex: 1,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
    alignContent: "center",
    justifyContent: "center",
    padding: 28,
  },
  panel: {
    width: 42,
    height: 28,
    borderRadius: 8,
    backgroundColor: `${officialPalette.foxOrange}44`,
  },
  copy: { gap: 4 },
  title: {
    color: colors.text,
    fontSize: typography.body,
    fontWeight: "800",
  },
  detail: {
    color: colors.muted,
    fontSize: typography.small,
  },
});
