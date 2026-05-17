import { ScrollView, StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import { AppMark, spacing } from "@emappa/ui";
import { PilotBanner } from "../../../components/PilotBanner";
import { ResidentTokenPurchase } from "../../../components/resident/ResidentTokenPurchase";
import { ResidentPrimaryButton, ResidentScreenFrame } from "../../../components/resident/ResidentScaffold";

export default function ResidentTokenPurchaseRoute() {
  const router = useRouter();

  return (
    <ResidentScreenFrame section="Resident" title="Buy tokens" subtitle="Real-money purchase post-activation — Scenario A §5.">
      {(building, refetch) => (
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.header}>
            <ResidentPrimaryButton onPress={() => router.back()} accessibilityLabel="Go back">
              Back
            </ResidentPrimaryButton>
            <AppMark size={40} />
          </View>
          <PilotBanner compact />
          <ResidentTokenPurchase building={building} onPurchased={refetch} />
        </ScrollView>
      )}
    </ResidentScreenFrame>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: spacing.xl, gap: spacing.md },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: spacing.md },
});
