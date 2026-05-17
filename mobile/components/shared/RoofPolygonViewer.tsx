import { StyleSheet, Text, View } from "react-native";
import { colors, officialPalette, radius, shadows, spacing, typography } from "@emappa/ui";

export type RoofPolygonPoint = { x: number; y: number };

export type RoofPolygonViewerProps = {
  title?: string;
  areaSqm?: number;
  confidenceLabel?: string;
  points?: RoofPolygonPoint[];
};

const DEFAULT_POINTS: RoofPolygonPoint[] = [
  { x: 0.18, y: 0.28 },
  { x: 0.72, y: 0.22 },
  { x: 0.82, y: 0.62 },
  { x: 0.24, y: 0.7 },
];

export function RoofPolygonViewer({
  title = "Roof polygon",
  areaSqm,
  confidenceLabel,
  points = DEFAULT_POINTS,
}: RoofPolygonViewerProps) {
  return (
    <View style={styles.card}>
      <View style={styles.canvas}>
        <View style={styles.satellite} />
        {points.map((point, index) => (
          <View
            key={index}
            style={[
              styles.vertex,
              { left: `${point.x * 100}%`, top: `${point.y * 100}%` },
            ]}
          />
        ))}
        <View style={styles.polygonOutline} />
      </View>
      <Text style={styles.title}>{title}</Text>
      {areaSqm != null ? <Text style={styles.meta}>{areaSqm.toLocaleString()} sqm traced</Text> : null}
      {confidenceLabel ? <Text style={styles.confidence}>{confidenceLabel}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    ...shadows.card,
    gap: spacing.sm,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    padding: spacing.md,
  },
  canvas: {
    minHeight: 180,
    borderRadius: radius.md,
    overflow: "hidden",
    backgroundColor: officialPalette.scarfOat + "55",
  },
  satellite: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: officialPalette.guitarMaple + "22",
  },
  polygonOutline: {
    position: "absolute",
    top: "22%",
    right: "18%",
    bottom: "22%",
    left: "18%",
    borderWidth: 2,
    borderColor: officialPalette.foxOrange,
    borderStyle: "dashed",
    borderRadius: 18,
    backgroundColor: `${officialPalette.foxOrange}14`,
  },
  vertex: {
    position: "absolute",
    width: 10,
    height: 10,
    marginLeft: -5,
    marginTop: -5,
    borderRadius: 5,
    backgroundColor: officialPalette.foxOrange,
    borderWidth: 2,
    borderColor: colors.white,
  },
  title: { color: colors.text, fontSize: typography.body, fontWeight: "800" },
  meta: { color: colors.muted, fontSize: typography.small },
  confidence: { color: officialPalette.burntChestnut, fontSize: typography.micro, fontWeight: "700" },
});
