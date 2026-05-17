import { View } from "react-native";
import { ProfileEssentials } from "../ProfileEssentials";
import { ElectricianComplianceEmbedded } from "./ElectricianCertificationScreen";
import { ElectricianMetricCard, ElectricianScaffold, ElectricianTrustCard } from "./ElectricianShared";

export function ElectricianProfileScreen() {
  return (
    <ElectricianScaffold
      section="Profile"
      title="Crew Profile"
      subtitle="Credentials, certification, and support — compliance is on this screen."
      actions={["Certification", "Crew queue", "Wallet"]}
      hero={(building) => ({
        label: "Trust score",
        value: building.roleViews.electrician.certified ? "4.9" : "Hold",
        sub: building.roleViews.electrician.certified ? "Verified lead electrician" : "Certification needed",
        tone: building.roleViews.electrician.certified ? "good" : "bad",
      })}
    >
      {(building) => {
        const certified = building.roleViews.electrician.certified;

        return (
          <>
            <ElectricianTrustCard
              name="Amina Otieno"
              role="Lead electrician"
              status={certified ? "verified" : "hold"}
              tone={certified ? "good" : "bad"}
              stats={[
                { label: "rating", value: certified ? "4.9" : "-" },
                { label: "jobs", value: "38" },
                { label: "closeout", value: "96%" },
              ]}
              checks={[
                { label: "Identity", detail: "Account verified.", complete: true },
                { label: "License", detail: certified ? "Current license." : "Upload license.", complete: certified },
                { label: "Current site", detail: building.project.name, complete: certified },
              ]}
            />

            <View style={{ marginTop: 4, marginBottom: 12 }}>
              <ElectricianComplianceEmbedded building={building} />
            </View>

            <View style={{ flexDirection: "row", gap: 12 }}>
              <View style={{ flex: 1 }}>
                <ElectricianMetricCard label="Response" value="18m" detail="Avg field reply." />
              </View>
              <View style={{ flex: 1 }}>
                <ElectricianMetricCard label="Proof" value={`${building.roleViews.electrician.checklistComplete}/${building.roleViews.electrician.checklistTotal}`} detail="Active job." />
              </View>
            </View>

            <ProfileEssentials
              roleLabel="Electrician"
              accountRows={[
                { label: "Certification", value: certified ? "Current" : "Needed", note: "compliance center lives in Profile" },
                { label: "Current project", value: building.project.name, note: building.project.locationBand },
              ]}
              supportSubject={`Electrician support - ${building.project.name}`}
            />
          </>
        );
      }}
    </ElectricianScaffold>
  );
}
