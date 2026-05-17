import { PrimaryButton } from "@emappa/ui";
import { BuildingOwnerBriefCard, BuildingOwnerIntroCard, BuildingOwnerProfileCard, BuildingOwnerScreenShell } from "./BuildingOwnerShared";

export function BuildingOwnerAccountScreen() {
  return (
    <BuildingOwnerScreenShell
      section="Profile"
      title="Owner settings"
      subtitle="Identity, access, notifications. Private to this owner session."
      actions={["Edit details", "Manage access", "Sign out"]}
      hero={(building) => ({
        label: "Signed in as",
        value: "Primary owner",
        sub: `${building.project.name} · verified session`,
        tone: "good",
        status: "verified",
      })}
    >
      {(building) => (
        <>
          <BuildingOwnerProfileCard building={building} />
          <BuildingOwnerBriefCard
            eyebrow="Owner identity"
            title="Verified once, used everywhere."
            body="Owner identity is the signature of record for terms, inspections, and approvals."
            rows={[
              { label: "Role", value: "building owner", note: "One signer of record per building operator account.", tone: "good" },
              { label: "Contacts", value: "masked", note: "Electrician and financier routes messages without exposing personal phones on-screen.", tone: "neutral" },
            ]}
          />
          <BuildingOwnerIntroCard
            eyebrow="Account"
            title="Actions"
            detail="Edit profile, delegate access, and session controls for this demo owner surface."
          >
            <PrimaryButton>Manage notification cadence</PrimaryButton>
          </BuildingOwnerIntroCard>
        </>
      )}
    </BuildingOwnerScreenShell>
  );
}
