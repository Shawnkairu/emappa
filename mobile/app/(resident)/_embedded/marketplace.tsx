import { ScrollView, StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import { AppMark, spacing } from "@emappa/ui";
import { PilotBanner } from "../../../components/PilotBanner";
import { OwnershipMarketplaceCard } from "../../../components/resident/OwnershipMarketplaceCard";
import { ResidentPrimaryButton, ResidentScreenFrame } from "../../../components/resident/ResidentScaffold";

export default function ResidentMarketplaceRoute() {
  const router = useRouter();

  return (
    <ResidentScreenFrame
      section="Resident"
      title="Ownership marketplace"
      subtitle="Valuation basis, risk disclosure, and share pools — Scenario A §8.6."
    >
      {(building) => (
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.header}>
            <ResidentPrimaryButton onPress={() => router.back()} accessibilityLabel="Go back">
              Back
            </ResidentPrimaryButton>
            <AppMark size={40} />
          </View>
          <PilotBanner compact />
          <OwnershipMarketplaceCard building={building} />
        </ScrollView>
      )}
    </ResidentScreenFrame>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: spacing.xl, gap: spacing.md },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: spacing.md },
});

