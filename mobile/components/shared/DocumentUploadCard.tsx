import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors, officialPalette, radius, shadows, spacing, typography } from "@emappa/ui";

export type DocumentUploadStatus = "empty" | "uploaded" | "verified" | "rejected";

export type DocumentUploadCardProps = {
  title: string;
  description?: string;
  status?: DocumentUploadStatus;
  fileName?: string;
  onPress?: () => void;
};

const STATUS_COPY: Record<DocumentUploadStatus, string> = {
  empty: "Tap to upload",
  uploaded: "Uploaded — pending review",
  verified: "Verified",
  rejected: "Rejected — re-upload required",
};

export function DocumentUploadCard({
  title,
  description,
  status = "empty",
  fileName,
  onPress,
}: DocumentUploadCardProps) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
    >
      <Text style={styles.title}>{title}</Text>
      {description ? <Text style={styles.description}>{description}</Text> : null}
      <View style={styles.statusRow}>
        <Text style={styles.status}>{STATUS_COPY[status]}</Text>
        {fileName ? <Text style={styles.fileName}>{fileName}</Text> : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    ...shadows.card,
    gap: spacing.xs,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: "dashed",
    backgroundColor: colors.white,
    padding: spacing.md,
  },
  cardPressed: { opacity: 0.92, backgroundColor: officialPalette.furCream + "55" },
  title: { color: colors.text, fontSize: typography.body, fontWeight: "800" },
  description: { color: colors.muted, fontSize: typography.small, lineHeight: 18 },
  statusRow: { gap: 2, marginTop: spacing.xs },
  status: { color: officialPalette.foxOrange, fontSize: typography.small, fontWeight: "800" },
  fileName: { color: colors.muted, fontSize: typography.micro },
});
