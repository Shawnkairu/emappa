import type { ReactNode } from "react";
import { Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View, type ViewStyle } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { colors, Label, Pill, PrimaryButton, typography } from "@emappa/ui";
import type { HomeownerSnapshot } from "./homeownerSnapshot";
import { useHomeownerSnapshot } from "./homeownerSnapshot";

export function HomeownerEmbeddedFrame({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: (snapshot: HomeownerSnapshot, refetch: () => void) => ReactNode;
}) {
  const { data, error, isLoading, refetch } = useHomeownerSnapshot();

  return (
    <View style={styles.screen}>
      <SafeAreaView style={styles.safe}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
          <Text style={styles.kicker}>Homeowner</Text>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>{subtitle}</Text>
          <View style={styles.stack}>
            {isLoading ? (
              <EmbeddedLoadingCard />
            ) : error ? (
              <EmbeddedErrorCard message={error.message} onRetry={refetch} />
            ) : !data ? (
              <EmbeddedErrorCard message="No homeowner data was returned." onRetry={refetch} />
            ) : !data.building ? (
              <NoBuildingCard />
            ) : (
              children(data, refetch)
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

export function EmbeddedWhiteCard({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  return <View style={[styles.whiteCard, style]}>{children}</View>;
}

export function EmbeddedIconBadge({ name }: { name: keyof typeof Ionicons.glyphMap }) {
  return (
    <View style={styles.iconBadge}>
      <Ionicons name={name} color={colors.orangeDeep} size={20} />
    </View>
  );
}

export function EmbeddedRow({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <View style={styles.row}>
      <View style={{ flex: 1 }}>
        <Text style={styles.rowLabel}>{label}</Text>
        {note ? <Text style={styles.rowNote}>{note}</Text> : null}
      </View>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

export function EmbeddedInfoRows({ rows }: { rows: Array<[string, string]> }) {
  return (
    <View style={{ marginTop: 12 }}>
      {rows.map(([label, value]) => (
        <EmbeddedRow key={label} label={label} value={value} />
      ))}
    </View>
  );
}

function EmbeddedLoadingCard() {
  return (
    <EmbeddedWhiteCard>
      <EmbeddedIconBadge name="sync-outline" />
      <Text style={styles.cardTitle}>Preparing homeowner data</Text>
      <Text style={styles.bodyText}>Fetching roof, energy, income, and readiness.</Text>
    </EmbeddedWhiteCard>
  );
}

function EmbeddedErrorCard({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <EmbeddedWhiteCard>
      <EmbeddedIconBadge name="warning-outline" />
      <Text style={styles.cardTitle}>Homeowner data unavailable</Text>
      <Text style={styles.bodyText}>{message}</Text>
      <PrimaryButton onPress={onRetry}>Retry</PrimaryButton>
    </EmbeddedWhiteCard>
  );
}

function NoBuildingCard() {
  const router = useRouter();
  return (
    <EmbeddedWhiteCard>
      <EmbeddedIconBadge name="home-outline" />
      <Text style={styles.cardTitle}>No roof yet</Text>
      <Text style={styles.bodyText}>Add a home before this screen can load.</Text>
      <PrimaryButton onPress={() => router.push("/(homeowner)/_embedded/start-project")}>Start</PrimaryButton>
    </EmbeddedWhiteCard>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.white },
  safe: { flex: 1 },
  scroll: { paddingHorizontal: 20, paddingTop: 18, paddingBottom: 36 },
  kicker: {
    color: colors.orangeDeep,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  title: {
    color: colors.text,
    fontSize: typography.hero + 8,
    fontWeight: "800",
    letterSpacing: -1.1,
    lineHeight: typography.hero + 14,
    marginTop: 8,
  },
  subtitle: { color: colors.muted, fontSize: typography.body, lineHeight: 22, marginTop: 4 },
  stack: { gap: 16, marginTop: 18 },
  whiteCard: {
    gap: 10,
    borderColor: "rgba(150, 90, 53, 0.14)",
    borderRadius: 28,
    borderWidth: 1,
    backgroundColor: colors.white,
    padding: 16,
    boxShadow: "0 8px 16px rgba(87, 54, 27, 0.06)",
    elevation: 2,
  },
  iconBadge: {
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: `${colors.orangeDeep}12`,
    borderRadius: 14,
    height: 40,
    justifyContent: "center",
    width: 40,
  },
  cardTitle: { color: colors.text, fontSize: typography.title, fontWeight: "800", letterSpacing: -0.4 },
  bodyText: { color: colors.muted, fontSize: typography.small, lineHeight: 20, fontWeight: "600" },
  row: {
    alignItems: "flex-start",
    borderTopColor: colors.border,
    borderTopWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    gap: 12,
    paddingVertical: 10,
  },
  rowLabel: { color: colors.text, fontSize: 13, fontWeight: "800" },
  rowNote: { color: colors.muted, fontSize: 12, fontWeight: "600", lineHeight: 17, marginTop: 3 },
  rowValue: { color: colors.orangeDeep, fontSize: 12, fontWeight: "800", textAlign: "right" },
});
