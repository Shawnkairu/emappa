import { PortalKpiBar, PortalLedger, PortalPanel, PortalWorkflow } from "../../../components/PortalPrimitives";
import { ProfileBlocks, kwh, pct } from "../../../portal/PortalWidgets";
import type { PortalScreenProps } from "../../../portal/types";

export default function ResidentProfile({ project, user, data }: PortalScreenProps) {
  const view = project.roleViews.resident;
  const profile = user.profile ?? {};
  const unitNumber = textFromProfile(profile, ["unitNumber", "unit_number", "apartment", "apartmentNumber"]) ?? "Unit pending";
  const meterId = textFromProfile(profile, ["meterId", "meter_id", "kplcMeter", "kplc_meter"]) ?? "Meter pending";
  const residentStatus = user.buildingId || project.project.id ? "Active" : "Pending verification";
  const atsStatus = view.capacityQueue.status === "activated"
    ? "activated"
    : view.capacityQueue.status === "capacity_cleared"
      ? "capacity-cleared"
      : "scheduled";
  const loadLevel = loadProfileLevel(project.drs.score);
  const householdGridKwh = project.energy.E_grid / project.project.units;
  const estimatedMonthlyKwh = view.monthlySolarKwh + householdGridKwh;
  const dayShare = numberFromProfile(profile, ["daytimeShare", "daytime_share"]) ?? 0.42;
  const eveningShare = Math.max(0, 1 - dayShare);
  const loadEditable = project.project.stage !== "live" || loadLevel.level === "L1";
  const latestPledge = data.prepaidHistory[0];

  return (
    <ProfileBlocks
      user={user}
      roleLabel="Resident"
      extra={(
        <>
          <PortalPanel eyebrow="Building membership" title="Building and unit profile">
            <PortalKpiBar items={[
              { label: "Status", value: residentStatus, detail: latestPledge ? `latest pledge ${latestPledge.status}` : "membership from portal session" },
              { label: "Unit", value: unitNumber, detail: "resident apartment" },
              { label: "Meter", value: meterId, detail: "KPLC / PAYG reference" },
            ]} />
            <PortalLedger rows={[
              { label: "Building", value: project.project.name, note: project.project.locationBand },
              { label: "Address", value: project.project.locationBand, note: "building membership" },
              { label: "ATS state", value: atsStatus, note: view.capacityQueue.detail },
              { label: "Roof detail", value: project.project.energy.arrayKw > 0 ? `${project.project.energy.arrayKw} kW array` : "Pending survey", note: "building-wide thumbnail source" },
              { label: "Edit meter details", value: project.project.stage === "live" ? "Locked" : "Available", note: "manual entries before activation" },
              { label: "Leave building", value: project.project.stage === "live" ? "Contact support" : "Available before activation", note: "membership change flow" },
            ]} />
          </PortalPanel>

          <PortalPanel eyebrow="Load profile" title={`${loadLevel.label} confidence demand estimate`}>
            <PortalKpiBar items={[
              { label: "Level", value: loadLevel.level, detail: loadLevel.detail },
              { label: "Monthly load", value: kwh(estimatedMonthlyKwh), detail: "solar allocation + grid fallback" },
              { label: "Editable", value: loadEditable ? "Yes" : "Locked", detail: loadEditable ? "pre-activation or L1" : "post-activation lock" },
            ]} />
            <PortalWorkflow
              steps={[
                { label: "Daytime use", detail: `${pct(dayShare)} of expected load.`, status: kwh(estimatedMonthlyKwh * dayShare) },
                { label: "Evening use", detail: `${pct(eveningShare)} of expected load.`, status: kwh(estimatedMonthlyKwh * eveningShare) },
                { label: "Improve estimate", detail: loadEditable ? "Open L2/L3 capture from the load profile edit flow." : "Contact support for post-activation changes.", status: loadLevel.cta },
              ]}
            />
          </PortalPanel>

          <PortalPanel eyebrow="Notifications" title="Resident energy alerts">
            <PortalLedger rows={[
              { label: "ATS activation ready", value: "On", note: "email notification" },
              { label: "Pledge capacity cleared", value: "On", note: "wallet and queue update" },
              { label: "DRS milestone alerts", value: "On", note: "deployment readiness changes" },
              { label: "Token low balance", value: project.project.stage === "live" ? "On" : "Armed at go-live", note: "post-activation only" },
              { label: "System fault alerts", value: "On", note: "fallback and outage notices" },
              { label: "Language", value: "English", note: "Swahili planned" },
            ]} />
          </PortalPanel>
        </>
      )}
    />
  );
}

function loadProfileLevel(drsScore: number) {
  if (drsScore >= 85) return { level: "L3", label: "High", detail: "receipt and appliance detail verified", cta: "Current" };
  if (drsScore >= 65) return { level: "L2", label: "Medium", detail: "appliance detail captured", cta: "Optional update" };
  return { level: "L1", label: "Low", detail: "fast estimate only", cta: "Edit load profile" };
}

function textFromProfile(profile: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = profile[key];
    if (typeof value === "string" && value.trim()) return value;
    if (typeof value === "number") return String(value);
  }
  return null;
}

function numberFromProfile(profile: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = profile[key];
    if (typeof value === "number" && Number.isFinite(value)) return value;
  }
  return null;
}
