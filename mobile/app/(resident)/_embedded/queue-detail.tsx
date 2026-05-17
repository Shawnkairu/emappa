import { ScrollView, StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import { AppMark, spacing } from "@emappa/ui";
import { PilotBanner } from "../../../components/PilotBanner";
import { ResidentPrimaryButton, ResidentScreenFrame } from "../../../components/resident/ResidentScaffold";
import { ResidentQueueDetail } from "../../../components/resident/ResidentQueueDetail";

export default function ResidentQueueDetailRoute() {
  const router = useRouter();

  return (
    <ResidentScreenFrame
      section="Resident"
      title="Capacity queue"
      subtitle="Queue position and Scenario A §6.3 priority factors."
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
          <ResidentQueueDetail building={building} />
        </ScrollView>
      )}
    </ResidentScreenFrame>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: spacing.xl, gap: spacing.md },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: spacing.md },
});
