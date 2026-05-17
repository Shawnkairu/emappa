import type { ReactNode } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { colors, officialPalette, spacing, typography } from "@emappa/ui";

/** CR-8 — explicit loading / empty / error / populated states (no silent mock fallback). */
export type ScreenPhase = "loading" | "empty" | "error" | "populated";

export type ScreenStateProps = {
  phase: ScreenPhase;
  loadingMessage?: string;
  emptyTitle?: string;
  emptyMessage?: string;
  errorTitle?: string;
  errorMessage?: string;
  onRetry?: () => void;
  children?: ReactNode;
};

export function ScreenState({
  phase,
  loadingMessage = "Loading…",
  emptyTitle = "Nothing here yet",
  emptyMessage,
  errorTitle = "Could not load",
  errorMessage,
  onRetry,
  children,
}: ScreenStateProps) {
  if (phase === "loading") {
    return (
      <View style={styles.center} accessibilityRole="progressbar">
        <ActivityIndicator color={officialPalette.foxOrange} />
        <Text style={styles.message}>{loadingMessage}</Text>
      </View>
    );
  }

  if (phase === "empty") {
    return (
      <View style={styles.center}>
        <Text style={styles.title}>{emptyTitle}</Text>
        {emptyMessage ? <Text style={styles.message}>{emptyMessage}</Text> : null}
      </View>
    );
  }

  if (phase === "error") {
    return (
      <View style={styles.center}>
        <Text style={styles.title}>{errorTitle}</Text>
        {errorMessage ? <Text style={styles.message}>{errorMessage}</Text> : null}
        {onRetry ? (
          <Pressable style={styles.retry} onPress={onRetry} accessibilityRole="button">
            <Text style={styles.retryText}>Retry</Text>
          </Pressable>
        ) : null}
      </View>
    );
  }

  return <>{children}</>;
}

const styles = StyleSheet.create({
  center: {
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    padding: spacing.lg,
    minHeight: 160,
  },
  title: { color: colors.text, fontSize: typography.body, fontWeight: "800", textAlign: "center" },
  message: { color: colors.muted, fontSize: typography.small, lineHeight: 20, textAlign: "center" },
  retry: {
    marginTop: spacing.sm,
    borderRadius: 999,
    backgroundColor: officialPalette.furCream,
    borderWidth: 1,
    borderColor: "rgba(125, 87, 52, 0.2)",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  retryText: { color: colors.text, fontSize: typography.small, fontWeight: "800" },
});
