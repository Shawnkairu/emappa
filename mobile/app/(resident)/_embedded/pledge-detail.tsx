import { ScrollView, StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import { AppMark, spacing } from "@emappa/ui";
import { PilotBanner } from "../../../components/PilotBanner";
import { ResidentPledgeDetail } from "../../../components/resident/ResidentPledgeDetail";
import { ResidentPrimaryButton, ResidentScreenFrame } from "../../../components/resident/ResidentScaffold";

export default function ResidentPledgeDetailRoute() {
  const router = useRouter();

  return (
    <ResidentScreenFrame section="Resident" title="Pledge detail" subtitle="Edit or review non-binding pledges — Scenario A §5.">
      {(building) => (
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.header}>
            <ResidentPrimaryButton onPress={() => router.back()} accessibilityLabel="Go back">
              Back
            </ResidentPrimaryButton>
            <AppMark size={40} />
          </View>
          <PilotBanner compact />
          <ResidentPledgeDetail building={building} />
        </ScrollView>
      )}
    </ResidentScreenFrame>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: spacing.xl, gap: spacing.md },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: spacing.md },
});
