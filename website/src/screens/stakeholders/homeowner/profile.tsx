import { PortalKpiBar, PortalLedger, PortalPanel, PortalWorkflow } from "../../../components/PortalPrimitives";
import { ProfileBlocks, pct } from "../../../portal/PortalWidgets";
import type { PortalScreenProps } from "../../../portal/types";

export default function HomeownerProfile({ project, user }: PortalScreenProps) {
  const profile = user.profile ?? {};
  const propertyType = textFromProfile(profile, ["propertyType", "property_type"]) ?? "single_family";
  const roofSource = textFromProfile(profile, ["roofSource", "roofCaptureMode", "roof_source"]) ?? "owner_typed";
  const roofAreaM2 = numberFromProfile(profile, ["roofAreaM2", "roofArea", "roof_area_m2"]) ?? Math.round(project.project.energy.arrayKw * 8);
  const roofConfidence = numberFromProfile(profile, ["roofConfidence", "roof_confidence"]) ?? project.drs.components.installationReadiness / 100;
  const authorityDoc = textFromProfile(profile, ["authorityDoc", "authority_doc"]) ?? "pending document review";
  const meterNumber = textFromProfile(profile, ["meterNumber", "meter_number"]) ?? "meter pending";
  const accessNotes = textFromProfile(profile, ["accessNotes", "access_notes"]) ?? "roof access notes pending";
  const equipmentLocation = textFromProfile(profile, ["equipmentLocation", "equipment_location"]) ?? "DB / inverter location pending";
  const authorityStatus = authorityDoc.includes("pending") ? "Pending verification" : "Submitted";
  const roofSourceLabel = roofSource.replace(/_/g, " ");

  return (
    <ProfileBlocks
      user={user}
      roleLabel="Homeowner"
      extra={(
        <>
          <PortalKpiBar items={[
            { label: "Authority", value: authorityStatus, detail: "property control" },
            { label: "Roof confidence", value: pct(roofConfidence), detail: roofSourceLabel },
            { label: "Retained share", value: pct(project.roleViews.provider.retainedOwnership), detail: "homeowner position" },
          ]} />
          <div className="portal-two-col">
            <PortalPanel eyebrow="Property & roof" title="Single-family home profile">
              <PortalLedger rows={[
                { label: "Address", value: project.project.locationBand, note: "property address" },
                { label: "GPS pin", value: "Captured from property onboarding", note: "editable during roof review" },
                { label: "Property type", value: propertyType.replace(/_/g, " "), note: "homeowner role requires single-family/small compound" },
                { label: "Authority verification", value: authorityStatus, note: authorityDoc },
                { label: "Roof area", value: `${Math.round(roofAreaM2).toLocaleString()} sqm`, note: roofSourceLabel },
                { label: "Roof confidence", value: pct(roofConfidence), note: "used by readiness gates" },
              ]} />
            </PortalPanel>
            <PortalPanel eyebrow="Roof thumbnail" title="Roof polygon and evidence">
              <div className="roof-map-placeholder" aria-label="Roof polygon thumbnail">
                <span>{Math.round(roofAreaM2).toLocaleString()} sqm</span>
                <small>{roofSourceLabel} · {pct(roofConfidence)} confidence</small>
              </div>
              <PortalWorkflow steps={[
                { label: "Auto-suggest", detail: "Use footprint suggestion when available.", status: roofSource === "microsoft_footprints" ? "current" : "available" },
                { label: "Owner trace", detail: "Retrace the usable roof polygon over satellite imagery.", status: roofSource === "owner_traced" ? "current" : "fallback" },
                { label: "Manual sqm", detail: "Type usable roof area when map data is unavailable.", status: roofSource === "owner_typed" ? "current" : "fallback" },
              ]} />
            </PortalPanel>
          </div>
          <PortalPanel eyebrow="Evidence and access" title="Meter, DB, and site notes">
            <PortalLedger rows={[
              { label: "Meter photos", value: meterNumber, note: "KPLC / PAYG reference" },
              { label: "DB photos", value: equipmentLocation, note: "distribution board / inverter context" },
              { label: "Access notes", value: accessNotes, note: "roof, ladder, gate, or caretaker details" },
              { label: "Edit roof", value: "Roof edit", note: "three-tier waterfall: auto-suggest / owner-traced / manual sqm" },
              { label: "DRS status", value: project.drs.label, note: `${project.drs.score}/100` },
            ]} />
          </PortalPanel>
        </>
      )}
    />
  );
}

function textFromProfile(profile: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = profile[key];
    if (typeof value === "string" && value.trim()) return value;
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
