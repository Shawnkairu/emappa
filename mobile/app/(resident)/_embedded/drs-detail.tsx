import { ScrollView, StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import { AppMark, spacing } from "@emappa/ui";
import { DRSProgressCard } from "../../../components/shared";
import { PilotBanner } from "../../../components/PilotBanner";
import { ResidentPrimaryButton, ResidentScreenFrame } from "../../../components/resident/ResidentScaffold";

export default function ResidentDrsDetailRoute() {
  const router = useRouter();

  return (
    <ResidentScreenFrame section="Resident" title="Deployment readiness" subtitle="Building-level DRS progress for residents.">
      {(building) => (
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.header}>
            <ResidentPrimaryButton onPress={() => router.back()} accessibilityLabel="Go back">
              Back
            </ResidentPrimaryButton>
            <AppMark size={40} />
          </View>
          <PilotBanner compact />
          <DRSProgressCard drs={building.drs} />
        </ScrollView>
      )}
    </ResidentScreenFrame>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: spacing.xl, gap: spacing.md },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: spacing.md },
});
