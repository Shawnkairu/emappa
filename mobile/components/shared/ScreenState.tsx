import type { ReactNode } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
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
});
