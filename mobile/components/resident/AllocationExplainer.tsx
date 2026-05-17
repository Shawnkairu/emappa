import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { colors, spacing, typography } from "@emappa/ui";

export type AllocationExplainerProps = {
  visible: boolean;
  onClose: () => void;
};

/** Scenario A — prepaid solar allocation vs grid fallback (no guaranteed savings). */
export function AllocationExplainer({ visible, onClose }: AllocationExplainerProps) {
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={(event) => event.stopPropagation()}>
          <Text style={styles.title}>How allocation works</Text>
          <Text style={styles.body}>
            Confirmed prepaid balance maps to monetized solar first. Grid fallback stays outside your pledge wallet and is
            never paid out to stakeholders.
          </Text>
          <Text style={styles.body}>
            Projections use load-profile estimates and may be synthetic until live metering is verified. Ranges are shown;
            returns are not guaranteed.
          </Text>
          <Pressable style={styles.close} onPress={onClose} accessibilityRole="button">
            <Text style={styles.closeText}>Close</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(45, 28, 18, 0.45)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: spacing.lg,
    gap: spacing.md,
  },
  title: { color: colors.text, fontSize: typography.title, fontWeight: "800" },
  body: { color: colors.muted, fontSize: typography.small, lineHeight: 21 },
  close: {
    alignSelf: "flex-start",
    borderRadius: 999,
    backgroundColor: colors.panelSoft,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  closeText: { color: colors.text, fontSize: typography.small, fontWeight: "800" },
});
